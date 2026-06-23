import { sql } from "@vercel/postgres";
import { randomUUID } from "crypto";
import type {
  Participant,
  Challenge,
  ChallengeWithTricks,
  ChallengeForVoting,
  CurrentVote,
  ParticipantScore,
  SubmissionWithParticipant,
  Trick,
  TrickWithSubmissions,
  VotingTarget,
} from "./types";

let schemaReady: Promise<void> | null = null;

/**
 * Crea las tablas la primera vez que se usa la base de datos.
 * Es idempotente (CREATE TABLE IF NOT EXISTS), así no hace falta
 * un paso de migración separado para un proyecto pequeño como este.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS participants (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          image_url TEXT,
          vote_token TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`
        ALTER TABLE participants
        ADD COLUMN IF NOT EXISTS vote_token TEXT;
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS participants_vote_token_idx
        ON participants (vote_token);
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS challenges (
          id SERIAL PRIMARY KEY,
          week_number INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS tricks (
          id SERIAL PRIMARY KEY,
          challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS submissions (
          id SERIAL PRIMARY KEY,
          trick_id INTEGER NOT NULL REFERENCES tricks(id) ON DELETE CASCADE,
          participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
          video_url TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS votes (
          id SERIAL PRIMARY KEY,
          trick_id INTEGER NOT NULL REFERENCES tricks(id) ON DELETE CASCADE,
          voter_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
          target_participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
          points INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT votes_points_allowed CHECK (points IN (3, 2, 1, -1)),
          CONSTRAINT votes_no_self CHECK (voter_id <> target_participant_id),
          CONSTRAINT votes_unique_slot UNIQUE (trick_id, voter_id, points),
          CONSTRAINT votes_unique_target UNIQUE (trick_id, voter_id, target_participant_id)
        );
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS votes_target_participant_idx
        ON votes (target_participant_id);
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS votes_trick_idx
        ON votes (trick_id);
      `;

      const { rows } = await sql<{ id: number }>`
        SELECT id FROM participants WHERE vote_token IS NULL;
      `;
      for (const participant of rows) {
        await sql`
          UPDATE participants
          SET vote_token = ${randomUUID()}
          WHERE id = ${participant.id} AND vote_token IS NULL;
        `;
      }
    })().catch((err) => {
      // Si falla, permitir reintentar en la siguiente llamada.
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

export async function getParticipants(): Promise<Participant[]> {
  await ensureSchema();
  const { rows } = await sql<Participant>`
    SELECT * FROM participants ORDER BY name ASC;
  `;
  return rows;
}

export async function getParticipantByVoteToken(
  token: string
): Promise<Participant | null> {
  await ensureSchema();

  const cleanToken = token.trim();
  if (!cleanToken) return null;

  const { rows } = await sql<Participant>`
    SELECT *
    FROM participants
    WHERE vote_token = ${cleanToken}
    LIMIT 1;
  `;
  return rows[0] ?? null;
}

export async function getParticipantScores(): Promise<ParticipantScore[]> {
  await ensureSchema();

  const { rows } = await sql<ParticipantScore>`
    SELECT
      p.*,
      COALESCE(videos.video_count, 0)::int AS video_count,
      COALESCE(scores.vote_score, 0)::int AS vote_score,
      COALESCE(scores.positive_points, 0)::int AS positive_points,
      COALESCE(scores.negative_points, 0)::int AS negative_points
    FROM participants p
    LEFT JOIN (
      SELECT participant_id, COUNT(*)::int AS video_count
      FROM submissions
      GROUP BY participant_id
    ) videos ON videos.participant_id = p.id
    LEFT JOIN (
      SELECT
        target_participant_id,
        SUM(points)::int AS vote_score,
        SUM(CASE WHEN points > 0 THEN points ELSE 0 END)::int AS positive_points,
        SUM(CASE WHEN points < 0 THEN points ELSE 0 END)::int AS negative_points
      FROM votes
      GROUP BY target_participant_id
    ) scores ON scores.target_participant_id = p.id
    ORDER BY vote_score DESC, positive_points DESC, p.name ASC;
  `;
  return rows;
}

export async function getChallenges(): Promise<Challenge[]> {
  await ensureSchema();
  const { rows } = await sql<Challenge>`
    SELECT * FROM challenges ORDER BY week_number DESC, id DESC;
  `;
  return rows;
}

/**
 * Devuelve los retos con sus trucos y, en cada truco, los vídeos
 * subidos junto con los datos del participante. Es la consulta que
 * alimenta la portada pública.
 */
export async function getChallengesWithDetails(): Promise<ChallengeWithTricks[]> {
  await ensureSchema();

  const challenges = await getChallenges();
  if (challenges.length === 0) return [];

  const { rows: tricks } = await sql<TrickWithSubmissions>`
    SELECT * FROM tricks ORDER BY id ASC;
  `;

  const { rows: submissions } = await sql<SubmissionWithParticipant>`
    SELECT
      s.*,
      p.name AS participant_name,
      p.image_url AS participant_image,
      COALESCE(scores.vote_score, 0)::int AS vote_score
    FROM submissions s
    JOIN participants p ON p.id = s.participant_id
    LEFT JOIN (
      SELECT
        trick_id,
        target_participant_id,
        SUM(points)::int AS vote_score
      FROM votes
      GROUP BY trick_id, target_participant_id
    ) scores ON scores.trick_id = s.trick_id
      AND scores.target_participant_id = s.participant_id
    ORDER BY s.created_at DESC;
  `;

  const submissionsByTrick = new Map<number, SubmissionWithParticipant[]>();
  for (const sub of submissions) {
    const list = submissionsByTrick.get(sub.trick_id) ?? [];
    list.push(sub);
    submissionsByTrick.set(sub.trick_id, list);
  }

  const tricksByChallenge = new Map<number, TrickWithSubmissions[]>();
  for (const trick of tricks) {
    trick.submissions = submissionsByTrick.get(trick.id) ?? [];
    const list = tricksByChallenge.get(trick.challenge_id) ?? [];
    list.push(trick);
    tricksByChallenge.set(trick.challenge_id, list);
  }

  return challenges.map((challenge) => ({
    ...challenge,
    tricks: tricksByChallenge.get(challenge.id) ?? [],
  }));
}

export async function getChallengesForVoting(
  voterId: number
): Promise<ChallengeForVoting[]> {
  await ensureSchema();

  const challenges = await getChallenges();
  if (challenges.length === 0) return [];

  const { rows: tricks } = await sql<Trick>`
    SELECT * FROM tricks ORDER BY id ASC;
  `;

  const { rows: submissions } = await sql<SubmissionWithParticipant>`
    SELECT
      s.*,
      p.name AS participant_name,
      p.image_url AS participant_image,
      COALESCE(scores.vote_score, 0)::int AS vote_score
    FROM submissions s
    JOIN participants p ON p.id = s.participant_id
    LEFT JOIN (
      SELECT
        trick_id,
        target_participant_id,
        SUM(points)::int AS vote_score
      FROM votes
      GROUP BY trick_id, target_participant_id
    ) scores ON scores.trick_id = s.trick_id
      AND scores.target_participant_id = s.participant_id
    ORDER BY p.name ASC, s.created_at DESC;
  `;

  const { rows: currentVotes } = await sql<
    CurrentVote & { trick_id: number }
  >`
    SELECT trick_id, points, target_participant_id
    FROM votes
    WHERE voter_id = ${voterId};
  `;

  const submissionsByTrick = new Map<number, SubmissionWithParticipant[]>();
  const targetsByTrick = new Map<number, Map<number, VotingTarget>>();
  for (const sub of submissions) {
    const submissionList = submissionsByTrick.get(sub.trick_id) ?? [];
    submissionList.push(sub);
    submissionsByTrick.set(sub.trick_id, submissionList);

    const targetMap = targetsByTrick.get(sub.trick_id) ?? new Map();
    targetMap.set(sub.participant_id, {
      participant_id: sub.participant_id,
      participant_name: sub.participant_name,
      participant_image: sub.participant_image,
    });
    targetsByTrick.set(sub.trick_id, targetMap);
  }

  const currentVotesByTrick = new Map<number, CurrentVote[]>();
  for (const vote of currentVotes) {
    const list = currentVotesByTrick.get(vote.trick_id) ?? [];
    list.push({
      points: vote.points,
      target_participant_id: vote.target_participant_id,
    });
    currentVotesByTrick.set(vote.trick_id, list);
  }

  const tricksByChallenge = new Map<number, ChallengeForVoting["tricks"]>();
  for (const trick of tricks) {
    const targets = Array.from(targetsByTrick.get(trick.id)?.values() ?? [])
      .filter((target) => target.participant_id !== voterId)
      .sort((a, b) => a.participant_name.localeCompare(b.participant_name));

    const list = tricksByChallenge.get(trick.challenge_id) ?? [];
    list.push({
      ...trick,
      submissions: submissionsByTrick.get(trick.id) ?? [],
      targets,
      current_votes: currentVotesByTrick.get(trick.id) ?? [],
    });
    tricksByChallenge.set(trick.challenge_id, list);
  }

  return challenges.map((challenge) => ({
    ...challenge,
    tricks: tricksByChallenge.get(challenge.id) ?? [],
  }));
}

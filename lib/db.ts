import { sql } from "@vercel/postgres";
import type {
  Participant,
  Challenge,
  ChallengeWithTricks,
  SubmissionWithParticipant,
  TrickWithSubmissions,
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
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
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
      p.image_url AS participant_image
    FROM submissions s
    JOIN participants p ON p.id = s.participant_id
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

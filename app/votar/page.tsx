import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  getChallengesForVoting,
  getParticipantByVoteToken,
} from "@/lib/db";
import type { SubmissionWithParticipant } from "@/lib/types";
import { VOTER_COOKIE } from "@/lib/voting";
import VoteForm from "./VoteForm";

export const dynamic = "force-dynamic";

function Avatar({ src, name }: { src: string | null; name: string }) {
  if (src) {
    return (
      <Image
        className="avatar"
        src={src}
        alt={name}
        width={28}
        height={28}
        unoptimized
      />
    );
  }
  return <span className="avatar" aria-hidden />;
}

function SubmissionCard({ sub }: { sub: SubmissionWithParticipant }) {
  return (
    <div className="submission">
      <video src={sub.video_url} controls preload="metadata" playsInline />
      <div className="who">
        <Avatar src={sub.participant_image} name={sub.participant_name} />
        <span className="who-name">{sub.participant_name}</span>
        <span className="score-pill">{sub.vote_score} pts</span>
      </div>
    </div>
  );
}

function PrivateLinkNotice({ tokenError }: { tokenError: boolean }) {
  return (
    <>
      <h1 className="page-title">Votar</h1>
      <div className="card">
        <p className={tokenError ? "feedback err" : "empty"}>
          {tokenError
            ? "Este enlace privado de voto no es válido."
            : "Abre tu enlace privado de participante para activar la votación."}
        </p>
        <p className="muted-link">
          Si ya lo abriste en otro navegador, vuelve a usar tu URL privada.
        </p>
      </div>
    </>
  );
}

export default async function VotingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, cookieStore] = await Promise.all([
    searchParams,
    cookies(),
  ]);
  const token = cookieStore.get(VOTER_COOKIE)?.value;
  const voter = token ? await getParticipantByVoteToken(token) : null;

  if (!voter) {
    return <PrivateLinkNotice tokenError={error === "token"} />;
  }

  const challenges = await getChallengesForVoting(voter.id);

  return (
    <>
      <h1 className="page-title">Votar</h1>
      <p className="page-subtitle">
        Estás votando como <strong>{voter.name}</strong>. En cada truco puedes
        repartir +3, +2, +1 y un -1; no puedes votarte a ti mismo.
      </p>

      {challenges.length === 0 && (
        <div className="card">
          <p className="empty">Todavía no hay retos publicados.</p>
        </div>
      )}

      {challenges.map((challenge) => (
        <section key={challenge.id} className="challenge card">
          <div className="challenge-head">
            <span className="week-badge">Semana {challenge.week_number}</span>
            <h2>{challenge.title}</h2>
          </div>
          {challenge.description && (
            <p className="desc">{challenge.description}</p>
          )}

          {challenge.tricks.length === 0 && (
            <p className="empty">Sin trucos en este reto.</p>
          )}

          {challenge.tricks.map((trick) => (
            <div key={trick.id} className="trick vote-trick">
              <div className="vote-trick-head">
                <div>
                  <p className="trick-name">{trick.name}</p>
                  {trick.description && (
                    <p className="trick-desc">{trick.description}</p>
                  )}
                </div>
                <VoteForm
                  trick={{
                    id: trick.id,
                    targets: trick.targets,
                    current_votes: trick.current_votes,
                  }}
                />
              </div>

              {trick.submissions.length === 0 ? (
                <p className="empty">Nadie ha subido vídeo todavía.</p>
              ) : (
                <div className="submissions">
                  {trick.submissions.map((sub) => (
                    <SubmissionCard key={sub.id} sub={sub} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      ))}

      <p className="muted-link">
        <Link href="/participantes">Ver clasificación</Link>
      </p>
    </>
  );
}

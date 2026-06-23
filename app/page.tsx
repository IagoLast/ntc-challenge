import Image from "next/image";
import { getChallengesWithDetails } from "@/lib/db";
import type { SubmissionWithParticipant } from "@/lib/types";

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
  return (
    <span className="avatar" aria-hidden>
      {/* sin imagen */}
    </span>
  );
}

function SubmissionCard({ sub }: { sub: SubmissionWithParticipant }) {
  return (
    <div className="submission">
      <video src={sub.video_url} controls preload="metadata" playsInline />
      <div className="who">
        <Avatar src={sub.participant_image} name={sub.participant_name} />
        <span className="who-name">{sub.participant_name}</span>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const challenges = await getChallengesWithDetails();

  return (
    <>
      <h1 className="page-title">Retos de la semana 🛹</h1>
      <p className="page-subtitle">
        Cada semana, nuevos trucos. Graba, sube y mira lo que han clavado los demás.
      </p>

      {challenges.length === 0 && (
        <div className="card">
          <p className="empty">
            Todavía no hay retos publicados. Vuelve pronto.
          </p>
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
            <div key={trick.id} className="trick">
              <p className="trick-name">{trick.name}</p>
              {trick.description && (
                <p className="trick-desc">{trick.description}</p>
              )}
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
    </>
  );
}

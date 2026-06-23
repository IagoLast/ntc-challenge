import Image from "next/image";
import { getParticipantScores } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ParticipantsPage() {
  const participants = await getParticipantScores();

  return (
    <>
      <h1 className="page-title">Participantes</h1>
      <p className="page-subtitle">
        Clasificación total por votos del NTC Challenge.
      </p>

      {participants.length === 0 ? (
        <div className="card">
          <p className="empty">Todavía no hay participantes.</p>
        </div>
      ) : (
        <div className="participants-grid">
          {participants.map((p) => (
            <div key={p.id} className="participant card">
              {p.image_url ? (
                <Image
                  className="avatar lg"
                  src={p.image_url}
                  alt={p.name}
                  width={64}
                  height={64}
                  unoptimized
                />
              ) : (
                <span className="avatar lg" aria-hidden />
              )}
              <span className="who-name">{p.name}</span>
              <span className="participant-score">{p.vote_score} pts</span>
              <span className="count-pill">
                +{p.positive_points} / {p.negative_points} · {p.video_count}{" "}
                {p.video_count === 1 ? "vídeo" : "vídeos"}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

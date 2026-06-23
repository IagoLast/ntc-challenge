import Image from "next/image";
import { sql } from "@vercel/postgres";
import { ensureSchema, getParticipants } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getCounts(): Promise<Map<number, number>> {
  await ensureSchema();
  const { rows } = await sql<{ participant_id: number; count: number }>`
    SELECT participant_id, COUNT(*)::int AS count
    FROM submissions
    GROUP BY participant_id;
  `;
  const map = new Map<number, number>();
  for (const r of rows) map.set(r.participant_id, r.count);
  return map;
}

export default async function ParticipantsPage() {
  const [participants, counts] = await Promise.all([
    getParticipants(),
    getCounts(),
  ]);

  return (
    <>
      <h1 className="page-title">Participantes</h1>
      <p className="page-subtitle">Los riders del NTC Challenge.</p>

      {participants.length === 0 ? (
        <div className="card">
          <p className="empty">Todavía no hay participantes.</p>
        </div>
      ) : (
        <div className="participants-grid">
          {participants.map((p) => {
            const count = counts.get(p.id) ?? 0;
            return (
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
                <span className="count-pill">
                  {count} {count === 1 ? "vídeo" : "vídeos"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

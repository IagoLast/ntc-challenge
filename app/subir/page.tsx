import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import {
  ensureSchema,
  getParticipantByVoteToken,
} from "@/lib/db";
import { VOTER_COOKIE } from "@/lib/voting";
import UploadForm from "./UploadForm";

export const dynamic = "force-dynamic";

type UploadTrickRow = {
  id: number;
  name: string;
  week_number: number;
  challenge_title: string;
  current_video_url: string | null;
};

function PrivateLinkNotice({ tokenError }: { tokenError: boolean }) {
  return (
    <>
      <h1 className="page-title">Subir vídeos</h1>
      <div className="card">
        <p className={tokenError ? "feedback err" : "empty"}>
          {tokenError
            ? "Este enlace privado no es válido."
            : "Abre tu enlace privado de participante para subir vídeos."}
        </p>
        <p className="muted-link">
          Ese mismo enlace activa también la votación en este navegador.
        </p>
      </div>
    </>
  );
}

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, cookieStore] = await Promise.all([
    searchParams,
    cookies(),
  ]);
  const token = cookieStore.get(VOTER_COOKIE)?.value;
  const participant = token ? await getParticipantByVoteToken(token) : null;

  if (!participant) {
    return <PrivateLinkNotice tokenError={error === "token"} />;
  }

  await ensureSchema();
  const { rows } = await sql<UploadTrickRow>`
    SELECT
      t.id,
      t.name,
      c.week_number,
      c.title AS challenge_title,
      existing.video_url AS current_video_url
    FROM tricks t
    JOIN challenges c ON c.id = t.challenge_id
    LEFT JOIN LATERAL (
      SELECT s.video_url
      FROM submissions s
      WHERE s.participant_id = ${participant.id}
        AND s.trick_id = t.id
      ORDER BY s.created_at DESC
      LIMIT 1
    ) existing ON true
    ORDER BY c.week_number DESC, t.id ASC;
  `;

  const completed = rows.filter((row) => row.current_video_url).length;

  return (
    <>
      <section className="profile-head card">
        {participant.image_url ? (
          <Image
            className="avatar xl"
            src={participant.image_url}
            alt={participant.name}
            width={96}
            height={96}
            unoptimized
          />
        ) : (
          <span className="avatar xl" aria-hidden />
        )}
        <div>
          <h1 className="page-title">{participant.name}</h1>
          <p className="page-subtitle">
            {completed}/{rows.length} trucos completados
          </p>
          <p className="muted-link">
            <Link href="/votar">Ir a votar</Link>
          </p>
        </div>
      </section>

      <UploadForm
        tricks={rows.map((row) => ({
          id: row.id,
          name: row.name,
          weekNumber: row.week_number,
          challengeTitle: row.challenge_title,
          currentVideoUrl: row.current_video_url,
        }))}
      />
    </>
  );
}

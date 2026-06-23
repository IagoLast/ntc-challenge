"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ensureSchema, getParticipantByVoteToken } from "@/lib/db";
import { VOTER_COOKIE } from "@/lib/voting";

export async function addParticipantSubmission(data: {
  trickId: number;
  videoUrl: string;
}) {
  await ensureSchema();

  const cookieStore = await cookies();
  const token = cookieStore.get(VOTER_COOKIE)?.value;
  const participant = token ? await getParticipantByVoteToken(token) : null;
  if (!participant) {
    throw new Error("Abre tu enlace privado antes de subir vídeos");
  }
  if (!data.videoUrl) throw new Error("Falta el vídeo");
  if (!data.trickId) throw new Error("Selecciona un truco");

  const { rows: tricks } = await sql<{ id: number }>`
    SELECT id FROM tricks WHERE id = ${data.trickId} LIMIT 1;
  `;
  if (!tricks[0]) throw new Error("El truco no existe");

  const { rows: existing } = await sql<{ id: number }>`
    SELECT id
    FROM submissions
    WHERE participant_id = ${participant.id} AND trick_id = ${data.trickId}
    ORDER BY id ASC
    LIMIT 1;
  `;

  if (existing[0]) {
    await sql`
      UPDATE submissions
      SET video_url = ${data.videoUrl}
      WHERE id = ${existing[0].id};
    `;
  } else {
    await sql`
      INSERT INTO submissions (trick_id, participant_id, video_url)
      VALUES (${data.trickId}, ${participant.id}, ${data.videoUrl});
    `;
  }

  revalidatePath("/");
  revalidatePath("/participantes");
  revalidatePath("/subir");
  revalidatePath("/votar");
}

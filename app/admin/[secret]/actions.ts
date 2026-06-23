"use server";

import { sql } from "@vercel/postgres";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { ensureSchema } from "@/lib/db";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "ntc";

function assertSecret(secret: string) {
  if (secret !== ADMIN_SECRET) {
    throw new Error("No autorizado");
  }
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/participantes");
  revalidatePath("/subir");
  revalidatePath("/votar");
}

export async function addParticipant(
  secret: string,
  data: { name: string; imageUrl: string | null }
) {
  assertSecret(secret);
  await ensureSchema();

  const name = data.name.trim();
  if (!name) throw new Error("El nombre es obligatorio");
  const privateToken = randomUUID();

  await sql`
    INSERT INTO participants (name, image_url, vote_token, upload_secret)
    VALUES (${name}, ${data.imageUrl}, ${privateToken}, ${privateToken});
  `;

  revalidateAll();
}

export async function addChallenge(
  secret: string,
  data: {
    weekNumber: number;
    title: string;
    description: string | null;
    tricks: string[];
  }
) {
  assertSecret(secret);
  await ensureSchema();

  const title = data.title.trim();
  if (!title) throw new Error("El título es obligatorio");
  if (!Number.isFinite(data.weekNumber)) {
    throw new Error("El número de semana no es válido");
  }

  const tricks = data.tricks.map((t) => t.trim()).filter(Boolean);
  if (tricks.length === 0) {
    throw new Error("Añade al menos un truco");
  }

  const { rows } = await sql<{ id: number }>`
    INSERT INTO challenges (week_number, title, description)
    VALUES (${data.weekNumber}, ${title}, ${data.description})
    RETURNING id;
  `;
  const challengeId = rows[0].id;

  for (const trick of tricks) {
    await sql`
      INSERT INTO tricks (challenge_id, name)
      VALUES (${challengeId}, ${trick});
    `;
  }

  revalidateAll();
}

export async function addSubmission(
  secret: string,
  data: { participantId: number; trickId: number; videoUrl: string }
) {
  assertSecret(secret);
  await ensureSchema();

  if (!data.videoUrl) throw new Error("Falta el vídeo");
  if (!data.participantId) throw new Error("Selecciona un participante");
  if (!data.trickId) throw new Error("Selecciona un truco");

  await sql`
    INSERT INTO submissions (trick_id, participant_id, video_url)
    VALUES (${data.trickId}, ${data.participantId}, ${data.videoUrl});
  `;

  revalidateAll();
}

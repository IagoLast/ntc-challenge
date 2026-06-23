"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ensureSchema, getParticipantByVoteToken } from "@/lib/db";
import type { VotePoint } from "@/lib/types";
import { VOTER_COOKIE, VOTE_SLOTS } from "@/lib/voting";

export type VoteFormState = {
  type: "idle" | "ok" | "err";
  message: string;
};

function parseId(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value === "") return null;
  const id = Number(value);
  if (!Number.isInteger(id)) {
    throw new Error("Voto no valido");
  }
  return id;
}

function revalidateVotingViews() {
  revalidatePath("/");
  revalidatePath("/participantes");
  revalidatePath("/votar");
}

export async function saveTrickVotes(
  _state: VoteFormState,
  formData: FormData
): Promise<VoteFormState> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(VOTER_COOKIE)?.value;
    if (!token) {
      return {
        type: "err",
        message: "Abre tu enlace privado antes de votar.",
      };
    }

    const voter = await getParticipantByVoteToken(token);
    if (!voter) {
      return {
        type: "err",
        message: "Tu enlace privado ya no es valido.",
      };
    }

    const trickId = parseId(formData.get("trickId"));
    if (!trickId) {
      return { type: "err", message: "Truco no valido." };
    }

    await ensureSchema();

    const { rows: validRows } = await sql<{ participant_id: number }>`
      SELECT DISTINCT participant_id
      FROM submissions
      WHERE trick_id = ${trickId};
    `;
    const validTargets = new Set(
      validRows
        .map((row) => row.participant_id)
        .filter((participantId) => participantId !== voter.id)
    );

    const choices: { points: VotePoint; targetId: number }[] = [];
    const usedTargets = new Set<number>();

    for (const slot of VOTE_SLOTS) {
      const targetId = parseId(formData.get(slot.field));
      if (!targetId) continue;

      if (!validTargets.has(targetId)) {
        return {
          type: "err",
          message: "Solo puedes votar a participantes con video en este truco.",
        };
      }
      if (usedTargets.has(targetId)) {
        return {
          type: "err",
          message: "No repitas rider en la misma papeleta.",
        };
      }

      usedTargets.add(targetId);
      choices.push({ points: slot.points, targetId });
    }

    await sql`
      DELETE FROM votes
      WHERE trick_id = ${trickId} AND voter_id = ${voter.id};
    `;

    for (const choice of choices) {
      await sql`
        INSERT INTO votes (
          trick_id,
          voter_id,
          target_participant_id,
          points
        )
        VALUES (
          ${trickId},
          ${voter.id},
          ${choice.targetId},
          ${choice.points}
        );
      `;
    }

    revalidateVotingViews();

    return {
      type: "ok",
      message:
        choices.length === 0 ? "Votos borrados." : "Votos guardados.",
    };
  } catch (err) {
    return {
      type: "err",
      message: (err as Error).message,
    };
  }
}

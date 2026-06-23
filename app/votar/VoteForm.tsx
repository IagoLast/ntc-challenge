"use client";

import { useActionState } from "react";
import type { TrickForVoting, VotePoint } from "@/lib/types";
import { VOTE_SLOTS } from "@/lib/voting";
import { saveTrickVotes, type VoteFormState } from "./actions";

type VoteFormTrick = Pick<TrickForVoting, "id" | "targets" | "current_votes">;

const initialState: VoteFormState = {
  type: "idle",
  message: "",
};

function getCurrentTargetId(trick: VoteFormTrick, points: VotePoint) {
  return (
    trick.current_votes.find((vote) => vote.points === points)
      ?.target_participant_id ?? ""
  );
}

export default function VoteForm({ trick }: { trick: VoteFormTrick }) {
  const [state, formAction, pending] = useActionState(
    saveTrickVotes,
    initialState
  );
  const canVote = trick.targets.length > 0;

  return (
    <form action={formAction} className="vote-form">
      <input type="hidden" name="trickId" value={trick.id} />
      <div className="vote-slots">
        {VOTE_SLOTS.map((slot) => (
          <label
            key={slot.field}
            className={`vote-slot ${slot.points < 0 ? "negative" : ""}`}
          >
            <span className="vote-slot-meta">
              <strong>{slot.label}</strong>
              <span>{slot.title}</span>
            </span>
            <select
              name={slot.field}
              defaultValue={getCurrentTargetId(trick, slot.points)}
              disabled={!canVote || pending}
            >
              <option value="">Sin asignar</option>
              {trick.targets.map((target) => (
                <option
                  key={`${slot.field}-${target.participant_id}`}
                  value={target.participant_id}
                >
                  {target.participant_name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {!canVote && (
        <p className="empty">
          No hay otros riders con vídeo en este truco.
        </p>
      )}

      <button type="submit" disabled={!canVote || pending}>
        {pending ? "Guardando..." : "Guardar votos"}
      </button>

      {state.type !== "idle" && (
        <p className={`feedback ${state.type}`}>{state.message}</p>
      )}
    </form>
  );
}

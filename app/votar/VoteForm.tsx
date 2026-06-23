"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TrickForVoting, VotePoint } from "@/lib/types";
import { VOTE_SLOTS } from "@/lib/voting";
import { saveTrickVotes, type VoteFormState } from "./actions";

type VoteFormTrick = Pick<
  TrickForVoting,
  "id" | "submissions" | "targets" | "current_votes"
>;

type VoteSelections = Record<string, string>;

const initialState: VoteFormState = {
  type: "idle",
  message: "",
};

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

function buildInitialSelections(trick: VoteFormTrick): VoteSelections {
  const selections: VoteSelections = {};
  for (const slot of VOTE_SLOTS) {
    const currentVote = trick.current_votes.find(
      (vote) => vote.points === slot.points
    );
    selections[slot.field] = currentVote
      ? String(currentVote.target_participant_id)
      : "";
  }
  return selections;
}

function voteButtonLabel(points: VotePoint) {
  return points > 0 ? `▲ ${points}` : `▼ ${Math.abs(points)}`;
}

export default function VoteForm({ trick }: { trick: VoteFormTrick }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveTrickVotes,
    initialState
  );
  const [selections, setSelections] = useState<VoteSelections>(() =>
    buildInitialSelections(trick)
  );
  const validTargetIds = useMemo(
    () => new Set(trick.targets.map((target) => target.participant_id)),
    [trick.targets]
  );
  const canVote = trick.targets.length > 0;

  useEffect(() => {
    if (state.type === "ok") {
      router.refresh();
    }
  }, [router, state.type]);

  function toggleVote(field: string, participantId: number) {
    const participantValue = String(participantId);
    setSelections((current) => {
      const next = { ...current };

      if (next[field] === participantValue) {
        next[field] = "";
        return next;
      }

      for (const slot of VOTE_SLOTS) {
        if (next[slot.field] === participantValue) {
          next[slot.field] = "";
        }
      }

      next[field] = participantValue;
      return next;
    });
  }

  return (
    <form action={formAction} className="vote-form">
      <input type="hidden" name="trickId" value={trick.id} />
      {VOTE_SLOTS.map((slot) => (
        <input
          key={slot.field}
          type="hidden"
          name={slot.field}
          value={selections[slot.field] ?? ""}
        />
      ))}

      {trick.submissions.length === 0 ? (
        <p className="empty">Nadie ha subido vídeo todavía.</p>
      ) : (
        <div className="submissions">
          {trick.submissions.map((sub) => {
            const canVoteSubmission = validTargetIds.has(sub.participant_id);

            return (
              <div key={sub.id} className="submission voting-submission">
                <div className="video-shell">
                  <video
                    src={sub.video_url}
                    controls
                    preload="metadata"
                    playsInline
                  />
                  {canVoteSubmission && (
                    <div
                      className="vote-controls"
                      aria-label={`Votos para ${sub.participant_name}`}
                    >
                      {VOTE_SLOTS.map((slot) => {
                        const selected =
                          selections[slot.field] === String(sub.participant_id);
                        return (
                          <button
                            key={`${sub.id}-${slot.field}`}
                            type="button"
                            className={`vote-arrow ${
                              slot.points < 0 ? "down" : "up"
                            } ${selected ? "selected" : ""}`}
                            aria-pressed={selected}
                            aria-label={`${slot.title}: ${sub.participant_name}`}
                            title={`${slot.title}: ${sub.participant_name}`}
                            disabled={pending}
                            onClick={() =>
                              toggleVote(slot.field, sub.participant_id)
                            }
                          >
                            {voteButtonLabel(slot.points)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="who">
                  <Avatar
                    src={sub.participant_image}
                    name={sub.participant_name}
                  />
                  <span className="who-name">{sub.participant_name}</span>
                  {!canVoteSubmission && (
                    <span className="self-pill">Tú</span>
                  )}
                  <span className="score-pill">{sub.vote_score} pts</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canVote && (
        <div className="vote-save-row">
          <button type="submit" disabled={pending}>
            {pending ? "Guardando..." : "Guardar votos"}
          </button>
          {state.type !== "idle" && (
            <p className={`feedback ${state.type}`}>{state.message}</p>
          )}
        </div>
      )}

      {!canVote && trick.submissions.length > 0 && (
        <p className="empty">No hay otros riders con vídeo en este truco.</p>
      )}
    </form>
  );
}

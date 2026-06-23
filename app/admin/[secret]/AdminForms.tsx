"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { addParticipant, addChallenge, addSubmission } from "./actions";

type TrickOption = {
  id: number;
  label: string;
};

type Props = {
  secret: string;
  participants: { id: number; name: string }[];
  tricks: TrickOption[];
};

async function uploadFile(file: File): Promise<string> {
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/blob/upload",
  });
  return blob.url;
}

type Feedback = { type: "ok" | "err"; msg: string } | null;

function FeedbackMsg({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p className={`feedback ${feedback.type}`}>
      {feedback.type === "ok" ? "✅ " : "⚠️ "}
      {feedback.msg}
    </p>
  );
}

/* --------------------------- Participantes --------------------------- */
function ParticipantForm({ secret }: { secret: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      let imageUrl: string | null = null;
      if (image) imageUrl = await uploadFile(image);
      await addParticipant(secret, { name, imageUrl });
      setFeedback({ type: "ok", msg: `Participante "${name}" añadido.` });
      setName("");
      setImage(null);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setFeedback({ type: "err", msg: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <label>Nombre</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del rider"
        required
      />
      <label>Foto (opcional)</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files?.[0] ?? null)}
      />
      <button type="submit" disabled={busy}>
        {busy ? "Guardando…" : "Añadir participante"}
      </button>
      <FeedbackMsg feedback={feedback} />
    </form>
  );
}

/* ------------------------------ Retos ------------------------------ */
function ChallengeForm({ secret }: { secret: string }) {
  const router = useRouter();
  const [weekNumber, setWeekNumber] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tricks, setTricks] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  function updateTrick(i: number, value: string) {
    setTricks((prev) => prev.map((t, idx) => (idx === i ? value : t)));
  }
  function addTrickRow() {
    setTricks((prev) => [...prev, ""]);
  }
  function removeTrickRow(i: number) {
    setTricks((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      await addChallenge(secret, {
        weekNumber: parseInt(weekNumber, 10),
        title,
        description: description.trim() || null,
        tricks,
      });
      setFeedback({ type: "ok", msg: `Reto "${title}" publicado.` });
      setWeekNumber("");
      setTitle("");
      setDescription("");
      setTricks([""]);
      router.refresh();
    } catch (err) {
      setFeedback({ type: "err", msg: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="row">
        <div>
          <label>Semana nº</label>
          <input
            type="number"
            value={weekNumber}
            onChange={(e) => setWeekNumber(e.target.value)}
            placeholder="1"
            required
          />
        </div>
        <div style={{ flex: 3 }}>
          <label>Título del reto</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Flatground básico"
            required
          />
        </div>
      </div>

      <label>Descripción (opcional)</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Detalles del reto de esta semana…"
      />

      <label>Trucos</label>
      <div className="trick-rows">
        {tricks.map((trick, i) => (
          <div key={i} className="trick-input-row">
            <input
              type="text"
              value={trick}
              onChange={(e) => updateTrick(i, e.target.value)}
              placeholder={`Truco ${i + 1} (ej: Ollie)`}
            />
            {tricks.length > 1 && (
              <button
                type="button"
                className="secondary"
                style={{ marginTop: 0 }}
                onClick={() => removeTrickRow(i)}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="secondary"
        style={{ marginTop: 4 }}
        onClick={addTrickRow}
      >
        + Añadir truco
      </button>

      <div>
        <button type="submit" disabled={busy}>
          {busy ? "Publicando…" : "Publicar reto"}
        </button>
      </div>
      <FeedbackMsg feedback={feedback} />
    </form>
  );
}

/* ---------------------------- Subir vídeo ---------------------------- */
function SubmissionForm({ secret, participants, tricks }: Props) {
  const router = useRouter();
  const [participantId, setParticipantId] = useState("");
  const [trickId, setTrickId] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const disabled = participants.length === 0 || tricks.length === 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!video) {
      setFeedback({ type: "err", msg: "Selecciona un vídeo" });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const videoUrl = await uploadFile(video);
      await addSubmission(secret, {
        participantId: parseInt(participantId, 10),
        trickId: parseInt(trickId, 10),
        videoUrl,
      });
      setFeedback({ type: "ok", msg: "Vídeo subido." });
      setVideo(null);
      (e.target as HTMLFormElement).reset();
      setParticipantId("");
      setTrickId("");
      router.refresh();
    } catch (err) {
      setFeedback({ type: "err", msg: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (disabled) {
    return (
      <p className="empty">
        Necesitas al menos un participante y un reto con trucos antes de subir
        vídeos.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="row">
        <div>
          <label>Participante</label>
          <select
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            required
          >
            <option value="">— Elegir —</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Truco</label>
          <select
            value={trickId}
            onChange={(e) => setTrickId(e.target.value)}
            required
          >
            <option value="">— Elegir —</option>
            {tricks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label>Vídeo</label>
      <input
        type="file"
        accept="video/*"
        onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
        required
      />
      <button type="submit" disabled={busy}>
        {busy ? "Subiendo…" : "Subir vídeo"}
      </button>
      <FeedbackMsg feedback={feedback} />
    </form>
  );
}

export default function AdminForms({ secret, participants, tricks }: Props) {
  return (
    <>
      <section className="admin-section card">
        <h2>➕ Añadir participante</h2>
        <ParticipantForm secret={secret} />
      </section>

      <section className="admin-section card">
        <h2>📅 Publicar reto semanal</h2>
        <ChallengeForm secret={secret} />
      </section>

      <section className="admin-section card">
        <h2>🎥 Subir vídeo de un truco</h2>
        <SubmissionForm
          secret={secret}
          participants={participants}
          tricks={tricks}
        />
      </section>
    </>
  );
}

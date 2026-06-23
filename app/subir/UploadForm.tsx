"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addParticipantSubmission } from "./actions";

type UploadTrick = {
  id: number;
  name: string;
  weekNumber: number;
  challengeTitle: string;
  currentVideoUrl: string | null;
};

type Props = {
  tricks: UploadTrick[];
};

type Feedback = { type: "ok" | "err"; msg: string } | null;

async function uploadFile(file: File): Promise<string> {
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/blob/upload",
  });
  return blob.url;
}

function FeedbackMsg({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return <p className={`feedback ${feedback.type}`}>{feedback.msg}</p>;
}

export default function UploadForm({ tricks }: Props) {
  const router = useRouter();
  const [trickId, setTrickId] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const selectedTrick = tricks.find((trick) => String(trick.id) === trickId);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!video) {
      setFeedback({ type: "err", msg: "Selecciona un vídeo" });
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const videoUrl = await uploadFile(video);
      await addParticipantSubmission({
        trickId: parseInt(trickId, 10),
        videoUrl,
      });
      setFeedback({
        type: "ok",
        msg: selectedTrick?.currentVideoUrl
          ? "Vídeo reemplazado."
          : "Vídeo subido.",
      });
      setVideo(null);
      setTrickId("");
      (event.target as HTMLFormElement).reset();
      router.refresh();
    } catch (error) {
      setFeedback({ type: "err", msg: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (tricks.length === 0) {
    return <p className="empty">Todavía no hay trucos publicados.</p>;
  }

  return (
    <>
      <section className="admin-section card">
        <h2>Subir vídeo</h2>
        <form onSubmit={onSubmit}>
          <label>Truco</label>
          <select
            value={trickId}
            onChange={(event) => setTrickId(event.target.value)}
            required
          >
            <option value="">Elegir truco</option>
            {tricks.map((trick) => (
              <option key={trick.id} value={trick.id}>
                S{trick.weekNumber} · {trick.name}
                {trick.currentVideoUrl ? " · ya subido" : ""}
              </option>
            ))}
          </select>

          <label>Vídeo</label>
          <input
            type="file"
            accept="video/*"
            onChange={(event) => setVideo(event.target.files?.[0] ?? null)}
            required
          />
          <button type="submit" disabled={busy}>
            {busy
              ? "Subiendo..."
              : selectedTrick?.currentVideoUrl
              ? "Reemplazar vídeo"
              : "Subir vídeo"}
          </button>
          <FeedbackMsg feedback={feedback} />
        </form>
      </section>

      <section className="upload-list">
        {tricks.map((trick) => (
          <article key={trick.id} className="upload-item">
            <div>
              <span className="tag">S{trick.weekNumber}</span>
              <h3>{trick.name}</h3>
              <p className="muted-link">{trick.challengeTitle}</p>
            </div>
            {trick.currentVideoUrl ? (
              <a className="progress-pill done" href={trick.currentVideoUrl}>
                Ver vídeo
              </a>
            ) : (
              <span className="progress-pill">Pendiente</span>
            )}
          </article>
        ))}
      </section>
    </>
  );
}

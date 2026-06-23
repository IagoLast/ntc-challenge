import { notFound } from "next/navigation";
import { sql } from "@vercel/postgres";
import { headers } from "next/headers";
import { ensureSchema, getParticipants, getChallenges } from "@/lib/db";
import AdminForms from "./AdminForms";

export const dynamic = "force-dynamic";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "ntc";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  if (secret !== ADMIN_SECRET) {
    notFound();
  }

  await ensureSchema();

  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const forwardedProtocol = headerList.get("x-forwarded-proto");
  const protocol =
    forwardedProtocol ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "";

  const [participants, challenges] = await Promise.all([
    getParticipants(),
    getChallenges(),
  ]);

  // Trucos con etiqueta legible "Semana N · Truco" para el desplegable.
  const { rows: trickRows } = await sql<{
    id: number;
    name: string;
    week_number: number;
  }>`
    SELECT t.id, t.name, c.week_number
    FROM tricks t
    JOIN challenges c ON c.id = t.challenge_id
    ORDER BY c.week_number DESC, t.id ASC;
  `;

  const tricks = trickRows.map((t) => ({
    id: t.id,
    label: `S${t.week_number} · ${t.name}`,
  }));

  return (
    <>
      <h1 className="page-title">Panel NTC 🔒</h1>
      <p className="page-subtitle">
        Solo para ti. No enlaces esta URL en ningún sitio.
      </p>

      <AdminForms
        secret={secret}
        participants={participants.map((p) => ({ id: p.id, name: p.name }))}
        tricks={tricks}
      />

      <section className="admin-section">
        <h2>Estado actual</h2>
        <p className="muted-link">
          {participants.length} participantes · {challenges.length} retos ·{" "}
          {tricks.length} trucos
        </p>
        <div>
          {participants.map((p) => (
            <span key={p.id} className="tag">
              {p.name}
            </span>
          ))}
        </div>
      </section>

      <section className="admin-section card">
        <h2>Enlaces privados de voto</h2>
        <p className="muted-link">
          Envía a cada rider solo su enlace. Al abrirlo se guarda su sesión de
          voto en este navegador.
        </p>
        <div className="private-links">
          {participants.map((p) => {
            const path = p.vote_token ? `/votar/${p.vote_token}` : "";
            const href = path ? `${origin}${path}` : "";
            return (
              <div key={p.id} className="private-link-row">
                <span className="who-name">{p.name}</span>
                {href ? (
                  <a href={path} className="private-link">
                    {href}
                  </a>
                ) : (
                  <span className="empty">Sin token</span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

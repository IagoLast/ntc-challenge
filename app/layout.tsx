import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NTC Challenge",
  description: "Concurso semanal de skate entre amigos. Cada semana, nuevos trucos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <header className="site-header">
          <div className="inner">
            <Link href="/" className="logo">
              <span>
                <span className="mark">NTC</span> Challenge
              </span>
              <span className="sub">Skate · semanal</span>
            </Link>
            <nav className="nav">
              <Link href="/">Retos</Link>
              <Link href="/participantes">Participantes</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}

# 🛹 NTC Challenge

Concurso semanal de skate entre amigos. Cada semana publicas una serie de
trucos (un "reto"), tus colegas graban sus intentos y todo el mundo puede ver
en la web quién ha subido qué vídeo para cada truco.

Hecho con **Next.js** (App Router) y desplegable en **Vercel** usando:

- **Vercel Postgres** (Neon por debajo) como base de datos.
- **Vercel Blob** para guardar los vídeos y las fotos de los participantes.

## Cómo funciona

- **`/`** — Portada pública. Lista los retos por semana, sus trucos y los
  vídeos subidos para cada uno.
- **`/participantes`** — Clasificación total de riders con puntos y vídeos.
- **`/votar/<TOKEN_PRIVADO>`** — Enlace privado de cada participante. Al abrirlo
  guarda una cookie de sesión y redirige a `/votar`.
- **`/votar`** — Papeleta de votos para el participante activo.
- **`/admin/<ADMIN_SECRET>`** — Panel de administración **secreto** (sin login).
  Es una URL que solo conoces tú; desde ahí puedes:
  - Añadir participantes (nombre + foto).
  - Publicar el reto de la semana con su lista de trucos.
  - Subir vídeos asociándolos a un participante y a un truco.
  - Copiar el enlace privado de voto de cada participante.

> El panel no tiene autenticación: su seguridad es que la URL es secreta.
> Pon un `ADMIN_SECRET` largo y difícil de adivinar, y no enlaces esa URL.

## Modelo de datos

```
participants (id, name, image_url, vote_token)
challenges   (id, week_number, title, description)   ← reto semanal
tricks       (id, challenge_id, name, description)   ← trucos del reto
submissions  (id, trick_id, participant_id, video_url)
votes        (id, trick_id, voter_id, target_participant_id, points)
```

Las tablas se crean solas la primera vez que se usa la base de datos
(`CREATE TABLE IF NOT EXISTS`), así que no hace falta migrar a mano.

Cada participante puede votar una vez por truco con una papeleta tipo podio:
`+3`, `+2`, `+1` y `-1`. No puede votarse a sí mismo y solo puede votar a
participantes que hayan subido vídeo para ese truco. La página
`/participantes` muestra la puntuación total acumulada.

## Puesta en marcha en Vercel

1. **Importa el repo** en [vercel.com](https://vercel.com) (New Project).
2. En la pestaña **Storage** del proyecto:
   - Crea una base de datos **Postgres** (Neon). Vercel añadirá la variable
     `POSTGRES_URL` automáticamente.
   - Crea un **Blob Store**. Vercel añadirá `BLOB_READ_WRITE_TOKEN`.
3. En **Settings → Environment Variables** añade tu `ADMIN_SECRET`.
4. **Deploy**. Tu panel estará en `https://tu-proyecto.vercel.app/admin/<ADMIN_SECRET>`.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # y rellena las variables
npm run dev
```

Para que las subidas a Blob funcionen en local necesitas un
`BLOB_READ_WRITE_TOKEN` real (cópialo desde tu Blob Store en Vercel:
`vercel env pull`), y un `POSTGRES_URL` válido (Neon o Vercel Postgres).

Abre <http://localhost:3000>. El panel estará en `/admin/<tu-ADMIN_SECRET>`
(por defecto `/admin/ntc` si no defines la variable).

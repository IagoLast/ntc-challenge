import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

/**
 * Genera tokens para subir ficheros (vídeos e imágenes) directamente
 * desde el navegador a Vercel Blob. Hacerlo desde el cliente evita el
 * límite de ~4.5 MB de los server actions, importante para vídeos.
 *
 * Nota: el panel de admin es secreto (URL no enlazada). Este endpoint
 * no exige auth, en línea con el resto del proyecto.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "video/mp4",
          "video/quicktime",
          "video/webm",
          "video/x-matroska",
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
        ],
        addRandomSuffix: true,
        maximumSizeInBytes: 200 * 1024 * 1024, // 200 MB
      }),
      // No necesitamos hacer nada al completar; guardamos la URL desde
      // el cliente vía server action.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

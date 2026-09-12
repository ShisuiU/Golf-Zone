import { findPhoto } from "@/lib/db";
import { HAS_DATABASE } from "@/lib/db";

/**
 * Sert une photo stockée en base.
 *
 * Les images vivent dans Postgres plutôt que dans un stockage objet : un seul
 * service à administrer pour démarrer. La réponse est mise en cache très
 * longtemps — le contenu d'un identifiant ne change jamais, une nouvelle photo
 * reçoit un nouvel identifiant.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!HAS_DATABASE) return new Response("Not found", { status: 404 });

  const { id } = await context.params;
  const photoId = Number(id);
  if (!Number.isInteger(photoId) || photoId <= 0) {
    return new Response("Not found", { status: 404 });
  }

  const photo = await findPhoto(photoId);
  if (!photo) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(photo.data.byteLength),
    },
  });
}

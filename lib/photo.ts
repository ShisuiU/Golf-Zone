import "server-only";
import { stripMetadata } from "@/lib/exif";

/**
 * Règles de validation des images déposées.
 *
 * Le client compresse déjà l'image avant l'envoi (voir PhotoField), mais ces
 * contrôles sont côté serveur car un client peut toujours envoyer ce qu'il
 * veut : la limite et le type sont vérifiés ici, pas dans le navigateur.
 */
export const MAX_BYTES = 2 * 1024 * 1024; // 2 Mo après compression client
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

/** Signatures de fichier : le champ `type` d'un upload n'est qu'une étiquette. */
const MAGIC: ReadonlyArray<{ mime: string; bytes: number[] }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF", + "WEBP" en 8..11
];

function sniff(buffer: Buffer): string | undefined {
  for (const { mime, bytes } of MAGIC) {
    if (bytes.every((b, i) => buffer[i] === b)) {
      if (mime === "image/webp" && buffer.subarray(8, 12).toString("ascii") !== "WEBP") continue;
      return mime;
    }
  }
  return undefined;
}

export type PhotoCheck =
  | { ok: true; data: Buffer; mime: string }
  | { ok: false; error: string };

export async function validatePhoto(file: File | null): Promise<PhotoCheck> {
  if (!file || file.size === 0) {
    return { ok: false, error: "Ajoutez une photo de votre Golf." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Photo trop lourde (2 Mo maximum après compression)." };
  }

  const data = Buffer.from(await file.arrayBuffer());
  const sniffed = sniff(data);

  // On se fie à la signature du fichier, pas au type annoncé par le client.
  if (!sniffed || !ALLOWED_MIME.includes(sniffed as (typeof ALLOWED_MIME)[number])) {
    return { ok: false, error: "Format non reconnu. Utilisez un JPEG, un PNG ou un WebP." };
  }

  // Le nettoyage vient après la validation : on ne touche qu'à des octets
  // dont on a reconnu le format.
  return { ok: true, data: stripMetadata(data, sniffed), mime: sniffed };
}

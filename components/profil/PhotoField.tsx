"use client";

import { useRef, useState } from "react";

const MAX_EDGE = 1600;
const QUALITY = 0.82;
const MAX_BYTES = 2 * 1024 * 1024; // doit rester aligné sur lib/photo.ts

/**
 * Champ photo avec compression dans le navigateur.
 *
 * Une photo de téléphone pèse 3 à 8 Mo ; l'envoyer telle quelle serait long en
 * 4G et lourd en base. On la redimensionne sur un canvas avant l'envoi, ce qui
 * évite d'installer une bibliothèque de traitement d'image côté serveur.
 * La validation reste faite côté serveur : ceci n'est qu'un confort.
 */
/**
 * Réduit et **réencode systématiquement**, même quand l'image est déjà légère :
 * repasser par un canvas est ce qui efface les métadonnées du téléphone, dont
 * les coordonnées GPS de la prise de vue. Le serveur les retire aussi de son
 * côté — celui-ci n'est qu'un confort, et une économie de bande passante.
 */
async function compress(file: File, maxEdge: number): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  // Un fichier plus lourd après réencodage reste préférable au fichier
  // d'origine, qui, lui, porte encore ses métadonnées.
  if (!blob) return file;

  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

function formatSize(bytes: number): string {
  return bytes >= 1_000_000
    ? `${(bytes / 1_048_576).toFixed(1)} Mo`
    : `${Math.round(bytes / 1024)} Ko`;
}

export function PhotoField({
  error,
  optional,
  name = "photo",
  label,
  maxEdge = MAX_EDGE,
}: {
  error?: string;
  optional?: boolean;
  /** Permet un second champ image dans la même page (la photo de profil). */
  name?: string;
  label?: string;
  maxEdge?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>();
  const [note, setNote] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      const before = file.size;
      const compressed = await compress(file, maxEdge);

      // Remplace le contenu de l'input par la version allégée.
      const transfer = new DataTransfer();
      transfer.items.add(compressed);
      if (inputRef.current) inputRef.current.files = transfer.files;

      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(compressed);
      });
      // Même après compression, une image peut rester trop lourde : le dire
      // ici évite un envoi voué à être refusé par le serveur.
      setNote(
        compressed.size > MAX_BYTES
          ? `${formatSize(compressed.size)} — trop lourde, la limite est de 2 Mo.`
          : compressed.size < before
            ? `${formatSize(before)} → ${formatSize(compressed.size)}`
            : formatSize(compressed.size),
      );
    } catch {
      setNote("Aperçu indisponible, la photo sera envoyée telle quelle.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={name}
        className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted"
      >
        {label ?? (optional ? "Photo (facultatif)" : "Photo")}
      </label>

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:), pas une ressource distante
        <img
          src={preview}
          alt="Aperçu de la photo choisie"
          className="max-h-64 w-full border border-hairline object-cover"
        />
      ) : null}

      <input
        ref={inputRef}
        id={name}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onPick}
        aria-describedby={error ? `${name}-error` : `${name}-hint`}
        aria-invalid={error ? true : undefined}
        className="min-h-[50px] w-full cursor-pointer border border-hairline bg-graphite px-3 py-3 text-sm text-body file:mr-3 file:cursor-pointer file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:font-cond file:text-sm file:font-semibold file:uppercase file:tracking-[0.05em] file:text-ink"
      />

      <p id={`${name}-hint`} className="text-xs text-faint">
        {busy ? "Compression en cours…" : (note ?? "JPEG, PNG ou WebP. Allégée automatiquement.")}
      </p>
      {error ? (
        <p id={`${name}-error`} className="font-mono text-xs text-brand">
          {error}
        </p>
      ) : null}
    </div>
  );
}

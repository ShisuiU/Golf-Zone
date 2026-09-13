import Image from "next/image";

/**
 * Photo de profil, ou pastille d'initiale à défaut : une lettre colorée de
 * façon stable identifie mieux un membre qu'une icône générique.
 */
const TONES = [
  "bg-brand text-graphite",
  "bg-rival text-[#0a1219]",
  "bg-[#a3a3a3] text-graphite",
  "bg-[#c2703d] text-graphite",
];

export function Avatar({
  handle,
  photoId,
  size = 36,
}: {
  handle: string;
  photoId?: number | null;
  size?: number;
}) {
  if (photoId) {
    return (
      <Image
        src={`/photos/${photoId}`}
        alt={`Photo de profil de @${handle}`}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full bg-graphite object-cover"
        unoptimized
      />
    );
  }

  // Somme des codes : la même personne garde toujours la même couleur.
  const tone = TONES[[...handle].reduce((sum, c) => sum + c.charCodeAt(0), 0) % TONES.length];

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-cond font-bold uppercase ${tone}`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {handle.replace(/^@/, "").charAt(0)}
    </span>
  );
}

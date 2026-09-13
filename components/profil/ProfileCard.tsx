import { Avatar } from "@/components/feed/Avatar";
import type { Profile } from "@/lib/db";
import { ageFromBirthYear } from "@/lib/profile";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-impact text-[22px] leading-none text-ink">{value}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-faint">{label}</span>
    </div>
  );
}

/** En-tête de profil : identité, fiche, compteurs. */
export function ProfileCard({ profile }: { profile: Profile }) {
  const joined = new Date(profile.createdAt).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  // Chaque élément n'apparaît que s'il est renseigné : une fiche vide ne doit
  // pas afficher une rangée de tirets.
  const facts = [
    profile.car,
    profile.birthYear ? `${ageFromBirthYear(profile.birthYear)} ans` : null,
    profile.city,
    `Membre depuis ${joined}`,
  ].filter(Boolean) as string[];

  return (
    <section className="panel p-5 lg:p-7">
      <div className="flex items-center gap-4">
        <Avatar handle={profile.handle} photoId={profile.avatarPhotoId} size={64} />
        <div className="min-w-0">
          <h1 className="font-impact text-[24px] leading-tight break-words lg:text-[30px]">
            @{profile.handle}
          </h1>
          <p className="mt-1 font-mono text-[11px] tracking-[0.05em] text-faint">
            {facts[facts.length - 1]}
          </p>
        </div>
      </div>

      {profile.bio ? (
        <p className="mt-5 text-[15px] leading-relaxed break-words whitespace-pre-line text-body">
          {profile.bio}
        </p>
      ) : null}

      {facts.length > 1 ? (
        <ul className="mt-5 flex flex-wrap gap-2">
          {facts.slice(0, -1).map((fact) => (
            <li
              key={fact}
              // Pas de `uppercase` : ce sont les mots du membre, on les laisse
              // tels qu'il les a écrits.
              className="bevel-sm max-w-full break-words bg-graphite-deep px-3 py-1.5 font-cond text-[14px] font-semibold tracking-[0.02em] text-body"
            >
              {fact}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6 flex gap-9 border-t border-hairline pt-5">
        <Stat value={profile.postCount} label={profile.postCount > 1 ? "publications" : "publication"} />
        <Stat
          value={profile.likesReceived}
          label={profile.likesReceived > 1 ? "likes reçus" : "like reçu"}
        />
      </div>
    </section>
  );
}

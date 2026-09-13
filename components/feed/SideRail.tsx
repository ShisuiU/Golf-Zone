import Link from "next/link";
import { Avatar } from "@/components/feed/Avatar";
import type { MemberSummary, User } from "@/lib/db";

/**
 * Colonne latérale du fil, sur grand écran seulement.
 *
 * Sans elle, une colonne de 680 px flotte au milieu de 1440 px de vide : le
 * site a l'air d'un téléphone étiré. Elle ne contient rien qui manquerait sur
 * mobile — le raccourci vers son profil, qui est déjà dans l'en-tête, et les
 * membres, qui ont leur page.
 */
export function SideRail({
  user,
  members,
}: {
  user: User | undefined;
  members: MemberSummary[];
}) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-6 flex flex-col gap-4">
        {user ? (
          <Link
            href="/profil"
            className="flex items-center gap-3 border border-hairline bg-surface p-4 hover:border-hairline-strong hover:text-ink"
          >
            <Avatar handle={user.handle} photoId={user.avatarPhotoId} size={44} />
            <span className="min-w-0">
              <span className="block truncate font-cond text-[16px] font-semibold tracking-[0.02em] text-ink">
                @{user.handle}
              </span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.05em] text-faint">
                Voir mon profil
              </span>
            </span>
          </Link>
        ) : null}

        {members.length > 0 ? (
          <section className="border border-hairline bg-surface p-4">
            <h2 className="mb-3 font-cond text-[13px] font-semibold uppercase tracking-[0.08em] text-faint">
              La communauté
            </h2>
            <ul className="flex flex-col">
              {members.map((member) => (
                <li key={member.id}>
                  <Link
                    href={`/membre/${member.handle}`}
                    className="flex items-center gap-3 py-2 hover:text-ink"
                  >
                    <Avatar handle={member.handle} photoId={member.avatarPhotoId} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-cond text-[15px] font-semibold tracking-[0.02em] text-ink">
                        @{member.handle}
                      </span>
                      {member.car ? (
                        <span className="block truncate text-[12px] text-muted">{member.car}</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/membres"
              className="mt-2 inline-block py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.06em]"
            >
              Tous les membres
            </Link>
          </section>
        ) : null}

        <section className="border border-hairline bg-surface p-4">
          <h2 className="font-cond text-[13px] font-semibold uppercase tracking-[0.08em] text-faint">
            Les duels
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-body">
            Deux Golf face à face, la communauté tranche. Pas encore ouvert.
          </p>
          <Link
            href="/duels"
            className="mt-2 inline-block py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.06em]"
          >
            En savoir plus
          </Link>
        </section>
      </div>
    </aside>
  );
}

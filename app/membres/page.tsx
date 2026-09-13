import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Avatar } from "@/components/feed/Avatar";
import { SiteHeader } from "@/components/SiteHeader";
import { listMembers } from "@/lib/db";
import { ACCOUNTS_ENABLED } from "@/lib/flags";

export const metadata: Metadata = {
  title: "Les membres — Zone Golf",
};

/** Annuaire de la communauté : qui est là, et ce qu'il roule. */
export default async function MembresPage() {
  if (!ACCOUNTS_ENABLED) notFound();
  // La page ne lit ni cookie ni en-tête : sans cela, Next la prérendrait à la
  // construction et l'annuaire resterait figé sur l'état du dernier déploiement.
  await connection();
  const members = await listMembers();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />
      <SiteHeader />

      <main className="relative mx-auto w-full max-w-[900px] px-4 py-6 lg:py-10">
        <h1 className="font-impact text-[26px] leading-tight lg:text-[32px]">Les membres</h1>
        <p className="mt-2 mb-7 text-[15px] leading-relaxed text-body">
          {members.length === 0
            ? "Personne n'est encore inscrit."
            : `${members.length} ${members.length > 1 ? "propriétaires" : "propriétaire"} sur Zone Golf.`}
        </p>

        <ul className="grid gap-3 sm:grid-cols-2">
          {members.map((member) => (
            <li key={member.id}>
              <Link
                href={`/membre/${member.handle}`}
                className="flex h-full items-center gap-4 border border-hairline bg-surface p-4 hover:border-hairline-strong hover:text-ink"
              >
                <Avatar handle={member.handle} photoId={member.avatarPhotoId} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-cond text-[17px] font-semibold tracking-[0.02em] text-ink">
                    @{member.handle}
                  </p>
                  {member.car || member.city ? (
                    <p className="truncate text-[13px] text-muted">
                      {[member.car, member.city].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.05em] text-faint">
                    {member.postCount} pub. · {member.likesReceived} likes
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

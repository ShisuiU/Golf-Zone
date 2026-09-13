import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dismissReport, removeReported } from "@/app/actions/report";
import { Time } from "@/components/feed/Time";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { requireUser } from "@/lib/dal";
import { listOpenReports } from "@/lib/db";
import { ACCOUNTS_ENABLED, isModerator } from "@/lib/flags";

export const metadata: Metadata = {
  title: "Modération — Zone Golf",
  robots: { index: false },
};

/**
 * File des signalements. Réservée aux pseudos listés dans
 * `ZONE_GOLF_MODERATEURS` : pour les autres, la page n'existe pas — un 403
 * confirmerait qu'il y a quelque chose à cette adresse.
 */
export default async function ModerationPage() {
  if (!ACCOUNTS_ENABLED) notFound();
  const user = await requireUser();
  if (!isModerator(user.handle)) notFound();

  const reports = await listOpenReports();

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />
      <SiteHeader />

      <main className="relative mx-auto w-full max-w-[760px] flex flex-1 flex-col px-4 py-6 lg:py-10">
        <h1 className="font-impact text-[26px] leading-tight lg:text-[32px]">Modération</h1>
        <p className="mt-2 mb-7 text-[15px] text-body">
          {reports.length === 0
            ? "Aucun signalement en attente."
            : `${reports.length} signalement${reports.length > 1 ? "s" : ""} à traiter.`}
        </p>

        <ul className="flex flex-col gap-4">
          {reports.map((report) => (
            <li key={report.id} className="surface p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.05em] text-faint">
                {report.commentId ? "Commentaire" : "Publication"} de @{report.author} ·
                signalé par {report.reporter ? `@${report.reporter}` : "un compte supprimé"} ·{" "}
                <Time date={report.createdAt} />
              </p>

              <p className="mt-3 border-l-2 border-brand pl-3 text-[15px] leading-relaxed text-body">
                {report.reason}
              </p>

              <div className="mt-4 flex gap-4 border-t border-hairline pt-4">
                {report.photoId ? (
                  <Image
                    src={`/photos/${report.photoId}`}
                    alt=""
                    width={96}
                    height={96}
                    className="h-24 w-24 shrink-0 bg-graphite object-cover"
                    unoptimized
                  />
                ) : null}
                <p className="min-w-0 flex-1 text-[14px] leading-relaxed whitespace-pre-line text-muted">
                  {report.content?.trim() || "(sans texte)"}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href={`/publication/${report.contextPostId}`}
                  className="inline-flex min-h-[40px] items-center font-cond text-sm font-semibold uppercase tracking-[0.05em] text-body transition-colors duration-150 hover:text-ink"
                >
                  Voir en contexte
                </Link>
                <form action={removeReported}>
                  {report.postId ? (
                    <input type="hidden" name="postId" value={report.postId} />
                  ) : (
                    <input type="hidden" name="commentId" value={report.commentId ?? ""} />
                  )}
                  <button
                    type="submit"
                    className="pressable min-h-[40px] cursor-pointer border border-brand px-4 font-cond text-sm font-bold uppercase tracking-[0.05em] text-brand hover:bg-brand/10"
                  >
                    Supprimer le contenu
                  </button>
                </form>
                <form action={dismissReport}>
                  <input type="hidden" name="id" value={report.id} />
                  <button
                    type="submit"
                    className="pressable min-h-[40px] cursor-pointer px-2 font-cond text-sm font-semibold uppercase tracking-[0.05em] text-muted hover:text-ink"
                  >
                    Laisser en place
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
        <SiteFooter />
      </main>
    </div>
  );
}

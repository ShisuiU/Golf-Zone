import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/feed/Avatar";
import { Time } from "@/components/feed/Time";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { requireUser } from "@/lib/dal";
import { listNotifications, markNotificationsRead } from "@/lib/db";
import { ACCOUNTS_ENABLED } from "@/lib/flags";

export const metadata: Metadata = {
  title: "Notifications — Zone Golf",
};

/** Aperçu du contenu concerné, pour reconnaître la publication d'un coup d'œil. */
function excerpt(caption: string, hasPhoto: boolean): string {
  if (caption.trim()) {
    return caption.length > 60 ? `${caption.slice(0, 60).trimEnd()}…` : caption;
  }
  return hasPhoto ? "votre photo" : "votre publication";
}

export default async function NotificationsPage() {
  if (!ACCOUNTS_ENABLED) notFound();
  const user = await requireUser();
  const notifications = await listNotifications(user.id);

  // Marquer lu après avoir lu la liste : les nouvelles gardent leur pastille
  // sur cet affichage-ci, et ne l'auront plus au suivant.
  if (notifications.some((n) => n.isNew)) await markNotificationsRead(user.id);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />
      <SiteHeader />

      <main id="contenu" tabIndex={-1} className="relative mx-auto w-full max-w-[680px] flex flex-1 flex-col px-4 py-6 lg:py-10">
        <h1 className="mb-6 font-impact text-[26px] leading-tight lg:text-[32px]">Notifications</h1>

        {notifications.length === 0 ? (
          <p className="border border-dashed border-hairline-strong px-4 py-10 text-center text-sm text-muted">
            Rien pour le moment. Les likes et les commentaires sur vos publications arriveront ici.
          </p>
        ) : (
          <ul className="flex flex-col">
            {notifications.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/publication/${n.postId}`}
                  className={`flex items-center gap-3 border-b border-hairline px-3 py-3.5 transition-colors duration-150 hover:bg-surface-2 hover:text-ink ${
                    n.isNew ? "bg-surface" : ""
                  }`}
                >
                  <Avatar handle={n.handle} photoId={n.avatarPhotoId} size={40} />
                  <p className="min-w-0 flex-1 text-[15px] leading-relaxed text-body">
                    <span className="font-cond font-semibold tracking-[0.02em] text-ink">
                      @{n.handle}
                    </span>{" "}
                    {n.kind === "like" ? "a aimé" : "a commenté"}{" "}
                    <span className="text-muted">{excerpt(n.caption, n.photoId !== null)}</span>
                    <Time date={n.createdAt} className="ml-2 font-mono text-[10px] text-muted" />
                  </p>
                  {n.isNew ? (
                    <span
                      aria-label="Non lue"
                      className="h-2 w-2 shrink-0 rounded-full bg-brand"
                    />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <SiteFooter />
      </main>
    </div>
  );
}

import Link from "next/link";
import { LOGIN_HREF, MEMBER_HREF, NAV_LINKS, SITE_NAME, TICKER_ITEMS } from "@/lib/content";
import { getCurrentUser } from "@/lib/dal";
import { ACCOUNTS_ENABLED, CTA_HREF } from "@/lib/flags";

/**
 * Nav + bandeau HUD.
 *
 * Le menu mobile est un <details> : accessible au clavier et fonctionnel
 * sans JavaScript, donc l'en-tête reste un composant serveur — ce qui lui
 * permet aussi de lire la session pour adapter les liens.
 */
/** Cloche des notifications, avec le nombre de non-lues. */
function Bell({ unread }: { unread: number }) {
  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Notifications (${unread} non lues)` : "Notifications"}
      className="relative flex h-11 w-11 items-center justify-center text-body hover:text-ink"
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3a6 6 0 0 0-6 6v3.6L4.5 16h15L18 12.6V9a6 6 0 0 0-6-6ZM9.5 19a2.5 2.5 0 0 0 5 0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {unread > 0 ? (
        <span className="absolute top-1.5 right-1.5 min-w-[17px] rounded-full bg-brand px-1 text-center font-mono text-[10px] leading-[17px] font-bold text-graphite">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

export async function SiteHeader() {
  const user = await getCurrentUser();

  // Sans comptes ouverts, le bouton principal renvoie à la présentation
  // plutôt que vers une inscription qui n'existe pas encore.
  const primary = user
    ? { href: MEMBER_HREF, label: "Mon profil" }
    : { href: CTA_HREF, label: "Poster une photo" };

  return (
    <header className="relative">
      <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4 lg:px-16 lg:py-6">
        <Link href="/" className="flex items-center gap-3 hover:text-ink">
          <span className="font-impact text-lg tracking-[0.01em] text-ink lg:text-[23px]">
            {SITE_NAME.toUpperCase()}
          </span>
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-9 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-cond text-base font-semibold uppercase tracking-[0.07em] text-body hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          {user || !ACCOUNTS_ENABLED ? null : (
            <Link
              href={LOGIN_HREF}
              className="font-cond text-base font-semibold uppercase tracking-[0.07em] text-body hover:text-ink"
            >
              Connexion
            </Link>
          )}
          {user ? <Bell unread={user.unread} /> : null}
          <Link
            href={primary.href}
            className="bevel inline-flex min-h-[46px] items-center bg-brand px-6 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-graphite hover:text-graphite"
          >
            {primary.label}
          </Link>
        </nav>

        {/* Mobile */}
        <div className="flex items-center lg:hidden">
          {user ? <Bell unread={user.unread} /> : null}
        <details className="group relative lg:hidden [&_summary::-webkit-details-marker]:hidden">
          <summary
            aria-label="Ouvrir le menu"
            className="flex h-11 w-11 cursor-pointer items-center justify-center -mr-2.5 list-none"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7H20M4 12H20M4 17H20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-ink group-open:hidden"
              />
              <path
                d="M6 6L18 18M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="hidden text-ink group-open:block"
              />
            </svg>
          </summary>
          <nav className="absolute right-0 z-20 mt-3 flex w-60 flex-col border border-hairline bg-surface p-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-[48px] items-center px-4 font-cond text-base font-semibold uppercase tracking-[0.06em] text-body hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
            {user || !ACCOUNTS_ENABLED ? null : (
              <Link
                href={LOGIN_HREF}
                className="flex min-h-[48px] items-center px-4 font-cond text-base font-semibold uppercase tracking-[0.06em] text-body hover:text-ink"
              >
                Connexion
              </Link>
            )}
            <Link
              href={primary.href}
              className="mt-2 flex min-h-[48px] items-center justify-center bg-brand px-4 font-cond text-base font-bold uppercase tracking-[0.06em] text-graphite hover:text-graphite"
            >
              {primary.label}
            </Link>
          </nav>
        </details>
        </div>
      </div>

      {/* Bandeau d'information — orange = « à venir ». */}
      <div className="flex items-center justify-between gap-6 border-b border-hairline bg-graphite-deep px-5 py-2.5 lg:px-16">
        <div className="flex items-center gap-7">
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand shadow-[0_0_9px_rgba(249,115,22,0.9)]"
            />
            <Link
              href="/duels"
              className="font-mono text-[10px] tracking-[0.05em] text-brand hover:text-brand-soft lg:text-[11px]"
            >
              Duels bientôt disponibles
            </Link>
          </span>
          {TICKER_ITEMS.map((item) => (
            <span key={item} className="hidden font-mono text-[11px] text-faint lg:inline">
              {item}
            </span>
          ))}
        </div>
        <span className="hidden font-mono text-[11px] text-faint lg:inline">
          {user ? `Connecté · @${user.handle}` : "Communauté indépendante de Volkswagen"}
        </span>
      </div>
    </header>
  );
}

import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Avatar } from "@/components/feed/Avatar";
import { MenuDeroulant } from "@/components/MenuDeroulant";
import { LOGIN_HREF, NAV_LINKS, SITE_NAME, TICKER_ITEMS } from "@/lib/content";
import { getCurrentUser } from "@/lib/dal";
import { ACCOUNTS_ENABLED, CTA_HREF, isModerator } from "@/lib/flags";
import type { User } from "@/lib/db";

/**
 * Nav + bandeau HUD.
 *
 * Les deux menus sont des <details> : accessibles au clavier et fonctionnels
 * sans JavaScript, donc l'en-tête reste un composant serveur — ce qui lui
 * permet aussi de lire la session pour adapter les liens. `MenuDeroulant`
 * leur ajoute la fermeture par Échap et par un clic à côté, que le natif
 * n'offre pas.
 */

/** Cloche des notifications, avec le nombre de non-lues. */
function Bell({ unread }: { unread: number }) {
  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Notifications (${unread} non lues)` : "Notifications"}
      className="pressable relative flex h-11 w-11 items-center justify-center text-body hover:text-ink"
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
        <span className="animate-pop absolute top-1.5 right-1.5 min-w-[17px] rounded-full bg-brand px-1 text-center font-mono text-[10px] leading-[17px] font-bold text-graphite">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

const MENU_ITEM =
  "flex min-h-[48px] items-center px-4 font-cond text-base font-semibold uppercase tracking-[0.06em] text-body transition-colors duration-150 hover:bg-surface-2 hover:text-ink";

/** Les entrées du compte, communes au menu de bureau et au menu mobile. */
function AccountLinks({ user }: { user: User }) {
  return (
    <>
      <Link href="/profil" className={MENU_ITEM}>
        Mon profil
      </Link>
      <Link href="/compte" className={MENU_ITEM}>
        Mon compte
      </Link>
      {isModerator(user.handle) ? (
        <Link href="/moderation" className={MENU_ITEM}>
          Modération
        </Link>
      ) : null}
      <form action={logout} className="border-t border-hairline">
        <button type="submit" className={`${MENU_ITEM} w-full cursor-pointer text-left`}>
          Se déconnecter
        </button>
      </form>
    </>
  );
}

/**
 * Menu du compte, sur grand écran.
 *
 * L'avatar est le point d'entrée attendu : c'est là que l'on cherche ses
 * réglages sur n'importe quel site. Auparavant, « Mon compte » n'existait
 * qu'en bas de la page de profil — autant dire nulle part.
 */
function AccountMenu({ user }: { user: User }) {
  return (
    <MenuDeroulant className="group relative [&_summary::-webkit-details-marker]:hidden">
      <summary
        aria-label="Mon compte"
        className="pressable flex cursor-pointer list-none items-center gap-2 rounded-full border border-hairline py-1 pr-3 pl-1 hover:border-hairline-strong"
      >
        <Avatar handle={user.handle} photoId={user.avatarPhotoId} size={32} />
        <span className="max-w-[120px] truncate font-cond text-[15px] font-semibold tracking-[0.02em] text-ink">
          @{user.handle}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          className="shrink-0 text-muted transition-transform duration-150 group-open:rotate-180"
        >
          <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </summary>
      <nav className="animate-rise surface absolute right-0 z-20 mt-3 flex w-56 flex-col p-2">
        <AccountLinks user={user} />
      </nav>
    </MenuDeroulant>
  );
}

export async function SiteHeader() {
  const user = await getCurrentUser();

  // « Le fil » ne mène pas au même endroit selon qui clique : la racine
  // montre le fil à un membre et la présentation du site à un visiteur, qui
  // trouve le fil à `/fil`.
  const liens = NAV_LINKS.map((lien) =>
    lien.href === "/" && !user ? { ...lien, href: "/fil" } : lien,
  );

  return (
    <header className="relative">
      {/* Premier arrêt de tabulation du site. Sans lui, atteindre le contenu
          au clavier demandait huit tabulations, sur chaque page. Invisible
          tant qu'il n'a pas le focus, comme le veut l'usage. */}
      <a
        href="#contenu"
        className="pressable bevel-sm sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-[44px] focus:items-center focus:bg-brand focus:px-4 focus:font-cond focus:text-[15px] focus:font-bold focus:uppercase focus:tracking-[0.06em] focus:text-graphite"
      >
        Aller au contenu
      </a>

      <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4 lg:px-16 lg:py-6">
        {/* `-my-2` : la cible tactile fait 44 px sans grandir l'en-tête. */}
        <Link href="/" className="pressable -my-2 flex min-h-[44px] items-center gap-3 hover:text-ink">
          <span className="font-impact text-lg tracking-[0.01em] text-ink lg:text-[23px]">
            {SITE_NAME.toUpperCase()}
          </span>
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-8 lg:flex">
          {liens.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-[44px] items-center font-cond text-base font-semibold uppercase tracking-[0.07em] text-body transition-colors duration-150 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}

          {user ? (
            <>
              <Bell unread={user.unread} />
              <AccountMenu user={user} />
            </>
          ) : (
            <>
              {ACCOUNTS_ENABLED ? (
                <Link
                  href={LOGIN_HREF}
                  className="flex min-h-[44px] items-center font-cond text-base font-semibold uppercase tracking-[0.07em] text-body transition-colors duration-150 hover:text-ink"
                >
                  Connexion
                </Link>
              ) : null}
              <Link
                href={CTA_HREF}
                className="pressable bevel inline-flex min-h-[46px] items-center bg-brand px-6 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-graphite hover:text-graphite"
              >
                Rejoindre
              </Link>
            </>
          )}
        </nav>

        {/* Mobile */}
        <div className="flex items-center lg:hidden">
          {user ? <Bell unread={user.unread} /> : null}
          <MenuDeroulant className="group relative [&_summary::-webkit-details-marker]:hidden">
            <summary
              aria-label="Ouvrir le menu"
              className="-mr-2.5 flex h-11 w-11 cursor-pointer list-none items-center justify-center"
            >
              {/* Connecté, c'est l'avatar qui ouvre le menu : le même repère
                  que sur grand écran, et une barre de moins à interpréter. */}
              {user ? (
                <span className="group-open:opacity-60">
                  <Avatar handle={user.handle} photoId={user.avatarPhotoId} size={32} />
                </span>
              ) : (
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
              )}
            </summary>
            <nav className="animate-rise surface absolute right-0 z-20 mt-3 flex w-64 flex-col p-2">
              {liens.map((link) => (
                <Link key={link.href} href={link.href} className={MENU_ITEM}>
                  {link.label}
                </Link>
              ))}

              {user ? (
                <span className="mt-2 border-t border-hairline pt-2">
                  <AccountLinks user={user} />
                </span>
              ) : (
                <>
                  {ACCOUNTS_ENABLED ? (
                    <Link href={LOGIN_HREF} className={MENU_ITEM}>
                      Connexion
                    </Link>
                  ) : null}
                  <Link
                    href={CTA_HREF}
                    className="pressable mt-2 flex min-h-[48px] items-center justify-center bg-brand px-4 font-cond text-base font-bold uppercase tracking-[0.06em] text-graphite hover:text-graphite"
                  >
                    Rejoindre
                  </Link>
                </>
              )}
            </nav>
          </MenuDeroulant>
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
              className="-my-1.5 inline-flex min-h-[32px] items-center font-mono text-[10px] tracking-[0.05em] text-brand hover:text-brand-soft lg:text-[11px]"
            >
              Duels bientôt disponibles
            </Link>
          </span>
          {/* Arguments d'accueil : ils s'adressent à un visiteur. Les répéter
              à un membre sur chaque page, c'est du bruit. */}
          {user
            ? null
            : TICKER_ITEMS.map((item) => (
                <span key={item} className="hidden font-mono text-[11px] text-faint lg:inline">
                  {item}
                </span>
              ))}
        </div>
        <span className="hidden font-mono text-[11px] text-faint lg:inline">
          {user ? "Espace membre" : "Communauté indépendante de Volkswagen"}
        </span>
      </div>
    </header>
  );
}

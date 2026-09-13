import { getCurrentUser } from "@/lib/dal";
import { ACCOUNTS_ENABLED } from "@/lib/flags";
import { Landing } from "@/components/accueil/Landing";
import { FeedPage } from "@/components/feed/FeedPage";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

/**
 * La racine du site montre deux choses différentes selon qui regarde.
 *
 * À un membre, son fil : il sait où il est, il vient lire. À un visiteur, ce
 * qu'est Zone Golf : il arrivait jusqu'ici sur un fil de photos sans savoir
 * de quoi il s'agissait. Le fil reste lisible sans compte, à `/fil`.
 *
 * Quand les comptes sont coupés, tout le monde voit le fil : il n'y a pas de
 * session à lire, et une page qui invite à s'inscrire mènerait à un 404.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ avant?: string }>;
}) {
  const user = ACCOUNTS_ENABLED ? await getCurrentUser() : undefined;

  if (user || !ACCOUNTS_ENABLED) {
    return <FeedPage base="/" searchParams={searchParams} />;
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />
      <SiteHeader />

      <main id="contenu" tabIndex={-1} className="relative flex flex-1 flex-col">
        <Landing />

        <div className="mx-auto w-full max-w-[1180px] px-5 lg:px-10">
          <SiteFooter />
        </div>
      </main>
    </div>
  );
}

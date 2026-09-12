import Link from "next/link";
import { Composer } from "@/components/feed/Composer";
import { PostCard } from "@/components/feed/PostCard";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/dal";
import { listFeed, type FeedEntry } from "@/lib/db";
import { LIVE_FEED } from "@/lib/flags";
import { SITE_NAME } from "@/lib/content";

/** Le fil ne doit jamais bloquer la page : la base peut être endormie. */
const FEED_TIMEOUT_MS = 2_500;

async function safeFeed(viewerId: number | null): Promise<FeedEntry[] | "unavailable"> {
  if (!LIVE_FEED) return "unavailable";
  const timeout = new Promise<"timeout">((r) => setTimeout(() => r("timeout"), FEED_TIMEOUT_MS));
  try {
    const result = await Promise.race([listFeed(viewerId), timeout]);
    if (result === "timeout") {
      console.warn("Fil : base trop lente.");
      return "unavailable";
    }
    return result;
  } catch (error) {
    console.error("Fil indisponible :", error);
    return "unavailable";
  }
}

/** Bandeau d'accueil, montré aux visiteurs qui ne sont pas connectés. */
function WelcomeBanner() {
  return (
    <section className="border border-hairline bg-surface p-5 lg:p-7">
      <h1 className="mb-3 font-impact text-[26px] leading-tight lg:text-[32px]">
        La communauté des propriétaires de Golf.
      </h1>
      <p className="mb-5 text-[15px] leading-relaxed text-body">
        Montrez votre voiture, posez vos questions, commentez celles des autres.
        Toutes les générations, de la Mk1 à la Mk8.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/inscription"
          className="bevel-sm inline-flex min-h-[48px] items-center justify-center bg-brand px-6 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-graphite hover:text-graphite"
        >
          Créer mon compte
        </Link>
        <Link
          href="/connexion"
          className="inline-flex min-h-[48px] items-center justify-center border border-hairline-strong px-6 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-ink hover:text-ink"
        >
          Se connecter
        </Link>
      </div>
    </section>
  );
}

function EmptyFeed({ connected }: { connected: boolean }) {
  return (
    <div className="border border-dashed border-hairline-strong px-4 py-12 text-center">
      <p className="font-cond text-lg font-semibold uppercase tracking-[0.04em] text-body">
        Le fil est encore vide
      </p>
      <p className="mt-2 text-sm text-muted">
        {connected
          ? "Publiez la première photo ou posez votre première question."
          : "Les premières publications de la communauté apparaîtront ici."}
      </p>
    </div>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  const feed = await safeFeed(user?.id ?? null);
  const posts = feed === "unavailable" ? [] : feed;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />
      <SiteHeader />

      <main className="relative mx-auto w-full max-w-[680px] px-4 py-6 lg:py-10">
        <div className="flex flex-col gap-5">
          {user ? <Composer handle={user.handle} /> : <WelcomeBanner />}

          {feed === "unavailable" ? (
            <p className="border border-hairline bg-surface px-4 py-6 text-center text-sm text-muted">
              Le fil est momentanément indisponible. Réessayez dans un instant.
            </p>
          ) : posts.length === 0 ? (
            <EmptyFeed connected={Boolean(user)} />
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} viewerHandle={user?.handle ?? null} />
            ))
          )}
        </div>

        <footer className="mt-10 flex flex-col gap-1.5 border-t border-hairline pt-6 text-center">
          <span className="font-mono text-[10px] uppercase text-faint">
            {SITE_NAME} — projet de fans
          </span>
          <span className="font-mono text-[10px] uppercase text-faint">
            Non affilié à Volkswagen AG
          </span>
        </footer>
      </main>
    </div>
  );
}

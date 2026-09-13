import { Suspense } from "react";
import Link from "next/link";
import { Composer } from "@/components/feed/Composer";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { PostCard } from "@/components/feed/PostCard";
import { SideRail } from "@/components/feed/SideRail";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/dal";
import { listFeed, listMembers, type FeedEntry, type MemberSummary, type User } from "@/lib/db";
import { ACCOUNTS_ENABLED, LIVE_FEED } from "@/lib/flags";

/** Le fil ne doit jamais bloquer la page : la base peut être endormie. */
const FEED_TIMEOUT_MS = 2_500;

/**
 * `"closed"` (aucune base configurée) et `"unavailable"` (base injoignable)
 * ne disent pas la même chose au visiteur : le premier est un site pas encore
 * ouvert, le second une panne passagère.
 */
type Page = { posts: FeedEntry[]; more: boolean };
type FeedState = Page | "closed" | "unavailable";

async function safeFeed(viewerId: number | null, before?: number): Promise<FeedState> {
  if (!LIVE_FEED) return "closed";
  const timeout = new Promise<"timeout">((r) => setTimeout(() => r("timeout"), FEED_TIMEOUT_MS));
  try {
    const result = await Promise.race([listFeed(viewerId, before), timeout]);
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

/** Membres de la colonne latérale. Son absence ne doit pas casser le fil. */
async function safeMembers(): Promise<MemberSummary[]> {
  if (!LIVE_FEED) return [];
  try {
    return await listMembers(5);
  } catch {
    return [];
  }
}

/** Bandeau d'accueil, montré aux visiteurs qui ne sont pas connectés. */
function WelcomeBanner() {
  return (
    <section className="surface p-5 lg:p-7">
      <h1 className="mb-3 font-impact text-[26px] leading-tight lg:text-[32px]">
        La communauté des propriétaires de Golf.
      </h1>
      <p className="text-[15px] leading-relaxed text-body">
        Montrez votre voiture, posez vos questions, commentez celles des autres. Toutes les
        générations, de la Mk1 à la Mk8.
      </p>
      {/* Sans comptes ouverts, ces deux liens mèneraient à des pages en 404. */}
      {ACCOUNTS_ENABLED ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/inscription"
            className="pressable bevel-sm inline-flex min-h-[48px] items-center justify-center bg-brand px-6 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-graphite hover:text-graphite"
          >
            Créer mon compte
          </Link>
          <Link
            href="/connexion"
            className="pressable inline-flex min-h-[48px] items-center justify-center border border-hairline-strong px-6 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-ink hover:text-ink"
          >
            Se connecter
          </Link>
        </div>
      ) : null}
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

/**
 * Les publications. Séparées du reste de la page pour pouvoir être mises en
 * attente : l'en-tête, la zone de publication et la colonne latérale
 * s'affichent tout de suite, la silhouette du fil tient la place le temps que
 * la base réponde — elle dort après quelques minutes sans trafic.
 */
async function FeedPosts({
  viewerId,
  viewerHandle,
  cursor,
}: {
  viewerId: number | null;
  viewerHandle: string | null;
  cursor?: number;
}) {
  const feed = await safeFeed(viewerId, cursor);
  const page = typeof feed === "string" ? undefined : feed;
  const posts = page?.posts ?? [];

  if (feed === "closed") {
    return (
      <p className="surface px-4 py-6 text-center text-sm text-muted">Le fil ouvre bientôt.</p>
    );
  }
  if (feed === "unavailable") {
    return (
      <p className="surface px-4 py-6 text-center text-sm text-muted">
        Le fil est momentanément indisponible. Réessayez dans un instant.
      </p>
    );
  }
  if (posts.length === 0) {
    return cursor ? (
      <p className="surface px-4 py-6 text-center text-sm text-muted">Plus rien avant celle-ci.</p>
    ) : (
      <EmptyFeed connected={viewerHandle !== null} />
    );
  }

  return (
    <>
      {posts.map((post, index) => (
        <div
          key={post.id}
          className="animate-rise"
          // Décalage court et plafonné : les premières cartes se posent l'une
          // après l'autre, les suivantes n'attendent pas leur tour — personne
          // ne doit patienter pour lire.
          style={{ animationDelay: `${Math.min(index, 4) * 45}ms` }}
        >
          <PostCard
            post={post}
            viewerHandle={viewerHandle}
            // Un visiteur n'a besoin d'être invité à s'inscrire qu'une fois,
            // pas sur chacune des vingt cartes de la page.
            promptSignup={index === 0}
          />
        </div>
      ))}

      {page?.more ? (
        <Link
          href={`/?avant=${posts[posts.length - 1].id}`}
          className="pressable border border-hairline-strong px-4 py-3.5 text-center font-cond text-sm font-semibold uppercase tracking-[0.06em] text-body hover:text-ink"
        >
          Publications plus anciennes
        </Link>
      ) : null}
    </>
  );
}

/** La colonne latérale attend elle aussi la base : même traitement. */
async function Rail({ user }: { user: User | undefined }) {
  return <SideRail user={user} members={await safeMembers()} />;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ avant?: string }>;
}) {
  const { avant } = await searchParams;
  const before = Number(avant);
  const cursor = Number.isInteger(before) && before > 0 ? before : undefined;

  const user = await getCurrentUser();

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />
      <SiteHeader />

      <main className="relative mx-auto w-full max-w-[1060px] flex flex-1 flex-col px-4 py-6 lg:py-10">
        {/* Un titre, même invisible : sans lui la page n'a pas de niveau 1,
            ce dont dépendent les lecteurs d'écran pour se repérer. */}
        {user ? <h1 className="sr-only">Le fil de Zone Golf</h1> : null}

        <div className="lg:grid lg:grid-cols-[minmax(0,680px)_296px] lg:justify-center lg:gap-7">
          <div className="flex min-w-0 flex-col gap-5">
            {cursor ? null : user ? (
              <Composer handle={user.handle} avatarPhotoId={user.avatarPhotoId} />
            ) : (
              <WelcomeBanner />
            )}

            <Suspense fallback={<FeedSkeleton />}>
              <FeedPosts
                viewerId={user?.id ?? null}
                viewerHandle={user?.handle ?? null}
                cursor={cursor}
              />
            </Suspense>

            {cursor ? (
              <Link href="/" className="py-2 text-center text-sm text-muted underline">
                Revenir en haut du fil
              </Link>
            ) : null}
          </div>

          <Suspense fallback={null}>
            <Rail user={user} />
          </Suspense>
        </div>

        <SiteFooter />
      </main>
    </div>
  );
}

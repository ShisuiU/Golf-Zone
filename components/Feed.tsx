import Image from "next/image";
import Link from "next/link";
import { SAMPLE_POSTS, type SampleEntry } from "@/lib/content";
import { listRecentPosts, type FeedEntry } from "@/lib/db";
import { ACCOUNTS_ENABLED, CTA_HREF, LIVE_FEED } from "@/lib/flags";

function HeartIcon() {
  return (
    <svg width="11" height="10" viewBox="0 0 16 14" fill="none" aria-hidden="true">
      <path
        d="M8 13C8 13 1 9 1 4.5C1 2 3 1 5 1C6.5 1 7.5 2 8 3C8.5 2 9.5 1 11 1C13 1 15 2 15 4.5C15 9 8 13 8 13Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Carte d'un dossier réellement déposé par un membre. */
function LiveCard({ entry }: { entry: FeedEntry }) {
  return (
    <article className="border border-hairline bg-surface transition-colors duration-150 hover:border-brand/55">
      {entry.photoId ? (
        <Image
          src={`/photos/${entry.photoId}`}
          alt={`Golf ${entry.model} de @${entry.handle}`}
          width={400}
          height={300}
          className="h-44 w-full object-cover lg:h-[152px]"
          unoptimized
        />
      ) : (
        <div className="h-44 bg-[linear-gradient(150deg,#2a2f33,#15171a)] lg:h-[152px]" />
      )}
      <div className="p-4">
        <h3 className="mb-2 font-cond text-[17px] font-semibold tracking-[0.03em]">
          @{entry.handle}
        </h3>
        <p className="mb-2 font-mono text-[10px] tracking-[0.05em] text-faint uppercase">
          {entry.model}
        </p>
        {entry.caption ? (
          <p className="text-[13px] leading-relaxed text-muted">
            &laquo;&nbsp;{entry.caption}&nbsp;&raquo;
          </p>
        ) : null}
      </div>
    </article>
  );
}

/** Carte d'exemple, utilisée tant qu'aucune base n'est branchée. */
function SampleCard({ entry }: { entry: SampleEntry }) {
  return (
    <article className="border border-hairline bg-surface transition-colors duration-150 hover:border-brand/55">
      <div className="h-44 bg-[linear-gradient(150deg,#2a2f33,#15171a)] lg:h-[152px]" />
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-cond text-[17px] font-semibold tracking-[0.03em]">{entry.handle}</h3>
          <span className="flex items-center gap-1.5 text-brand">
            <HeartIcon />
            <span className="font-mono text-[11px]">{entry.likes}</span>
          </span>
        </div>
        <p className="mb-2 font-mono text-[10px] tracking-[0.05em] text-faint uppercase">
          {entry.model}
        </p>
        <p className="text-[13px] leading-relaxed text-muted">
          &laquo;&nbsp;{entry.caption}&nbsp;&raquo;
        </p>
      </div>
    </article>
  );
}

/** Au-delà, on préfère afficher les exemples que faire patienter le visiteur. */
const FEED_TIMEOUT_MS = 2_500;

/**
 * Une base lente ou injoignable ne doit pas retarder la landing : Neon endort
 * son calcul, et le réveil peut dépasser la dizaine de secondes. Le feed
 * abandonne donc vite et retombe sur les exemples — les pages membres, elles,
 * laissent le temps au réveil, puisque le visiteur y a cliqué pour agir.
 */
async function safeRecentPosts(): Promise<FeedEntry[]> {
  if (!LIVE_FEED) return [];

  const timeout = new Promise<"timeout">((resolve) =>
    setTimeout(() => resolve("timeout"), FEED_TIMEOUT_MS),
  );

  try {
    const result = await Promise.race([listRecentPosts(4), timeout]);
    if (result === "timeout") {
      console.warn("Fil : base trop lente, repli sur les exemples.");
      return [];
    }
    return result;
  } catch (error) {
    console.error("Fil indisponible, repli sur les exemples :", error);
    return [];
  }
}

/**
 * Dernière case de la grille : une invitation à poster. Elle évite une grille
 * à moitié vide quand la communauté démarre, sans inventer de contenu.
 */
function InviteCard() {
  return (
    <Link
      href={CTA_HREF}
      className="flex min-h-[220px] flex-col items-center justify-center gap-3 border border-dashed border-hairline-strong p-4 text-center hover:border-brand/55 hover:text-ink"
    >
      <span aria-hidden="true" className="font-impact text-3xl text-brand">
        +
      </span>
      <span className="font-cond text-[17px] font-semibold uppercase tracking-[0.04em] text-body">
        Postez votre Golf
      </span>
      <span className="text-[13px] text-muted">Votre photo apparaîtra ici</span>
    </Link>
  );
}

export async function Feed() {
  const live = await safeRecentPosts();
  // Tant que personne n'a déposé, on montre les exemples plutôt qu'une grille
  // vide — mais dès le premier dossier réel, ils disparaissent.
  const showSamples = live.length === 0;

  return (
    <section
      id="fil"
      className="relative border-b border-hairline px-5 py-10 lg:px-16 lg:py-20"
    >
      <div className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="font-impact text-[28px] lg:text-4xl">Le fil</h2>
        <a
          href="#fil"
          className="hidden font-mono text-[11px] tracking-[0.06em] text-brand lg:inline"
        >
          Tout voir →
        </a>
      </div>
      <p className="mb-6 text-sm text-muted lg:mb-10 lg:text-[15px]">
        {showSamples
          ? "Exemples de publications, en attendant les premières photos de la communauté."
          : "Les dernières photos postées par la communauté."}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {showSamples
          ? SAMPLE_POSTS.map((entry) => <SampleCard key={entry.handle} entry={entry} />)
          : live.map((entry) => <LiveCard key={entry.id} entry={entry} />)}
        {!showSamples && ACCOUNTS_ENABLED && live.length < 4 ? <InviteCard /> : null}
      </div>

      <a
        href="#fil"
        className="mt-4 flex min-h-[48px] items-center justify-center border border-brand/35 font-mono text-[11px] tracking-[0.05em] text-brand lg:hidden"
      >
        Tout voir →
      </a>
    </section>
  );
}

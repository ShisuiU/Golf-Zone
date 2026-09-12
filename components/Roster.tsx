import Image from "next/image";
import { ROSTER, type RosterEntry } from "@/lib/content";
import { listRecentDossiers, type FeedEntry } from "@/lib/db";
import { LIVE_FEED } from "@/lib/flags";

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
          Dossier #{entry.id} · {entry.model}
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
function SampleCard({ entry }: { entry: RosterEntry }) {
  return (
    <article className="border border-hairline bg-surface transition-colors duration-150 hover:border-brand/55">
      <div className="h-44 bg-[linear-gradient(150deg,#2a2f33,#15171a)] lg:h-[152px]" />
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-cond text-[17px] font-semibold tracking-[0.03em]">{entry.handle}</h3>
          <span className="flex items-center gap-1.5 text-brand">
            <HeartIcon />
            <span className="font-mono text-[11px]">{entry.hype}</span>
          </span>
        </div>
        <p className="mb-2 font-mono text-[10px] tracking-[0.05em] text-faint uppercase">
          {entry.dossier} · {entry.model}
        </p>
        <p className="text-[13px] leading-relaxed text-muted">
          &laquo;&nbsp;{entry.caption}&nbsp;&raquo;
        </p>
      </div>
    </article>
  );
}

export async function Roster() {
  const live = LIVE_FEED ? await listRecentDossiers(4) : [];
  // Tant que personne n'a déposé, on montre les exemples plutôt qu'une grille
  // vide — mais dès le premier dossier réel, ils disparaissent.
  const showSamples = live.length === 0;

  return (
    <section
      id="roster"
      className="relative border-b border-hairline px-5 py-10 lg:px-16 lg:py-20"
    >
      <div className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="font-impact text-[28px] lg:text-4xl">Derniers engagés</h2>
        <a
          href="#roster"
          className="hidden font-mono text-[11px] tracking-[0.06em] text-brand lg:inline"
        >
          Tout le banc →
        </a>
      </div>
      <p className="mb-6 text-sm text-muted lg:mb-10 lg:text-[15px]">
        {showSamples
          ? "Exemples de dossiers, le temps que la communauté remplisse le banc."
          : "Les dossiers les plus récents déposés par la communauté."}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {showSamples
          ? ROSTER.map((entry) => <SampleCard key={entry.dossier} entry={entry} />)
          : live.map((entry) => <LiveCard key={entry.id} entry={entry} />)}
      </div>

      <a
        href="#roster"
        className="mt-4 flex min-h-[48px] items-center justify-center border border-brand/35 font-mono text-[11px] tracking-[0.05em] text-brand lg:hidden"
      >
        Tout le banc →
      </a>
    </section>
  );
}

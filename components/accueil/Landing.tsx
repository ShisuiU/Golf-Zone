import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/feed/Avatar";
import { communityCounts, listMembers, listShowcase, type ShowcaseShot } from "@/lib/db";

/**
 * Les sections de la page d'accueil, montrées aux visiteurs.
 *
 * Jusqu'ici, quelqu'un qui arrivait sur Zone Golf tombait directement sur le
 * fil, avec un encart de trois lignes pour toute explication. Le fil est un
 * outil : il suppose qu'on sait déjà où on est. Cette page raconte le site
 * avant d'y entrer.
 *
 * Les images sont les **vraies publications des membres**, pas des photos de
 * banque d'images ni une maquette dessinée en CSS. Sur un site qui vend une
 * communauté de voitures, c'est la seule illustration honnête — et quand il
 * n'y a encore rien à montrer, la page le dit.
 */
/** Une base endormie ne doit pas faire échouer la page : elle s'affiche sans. */
async function sansCasse<T>(promesse: Promise<T>, repli: T): Promise<T> {
  try {
    return await promesse;
  } catch (error) {
    console.error("Accueil : donnée indisponible :", error);
    return repli;
  }
}

export async function Landing() {
  const [shots, counts, membres] = await Promise.all([
    sansCasse(listShowcase(6), []),
    sansCasse(communityCounts(), { members: 0, posts: 0 }),
    sansCasse(listMembers(8), []),
  ]);

  return (
    <>
      <Hero shot={shots[0]} membres={counts.members} />
      <Mur shots={shots.slice(1)} publications={counts.posts} />
      <CeQuOnFait />
      <Membres membres={membres} total={counts.members} />
      <Duels />
      <Rejoindre />
    </>
  );
}

/* --------------------------------------------------------------------- hero */

/**
 * Split asymétrique : le message à gauche, une vraie voiture à droite. La
 * photo est celle de la dernière publication, donc la page change toute
 * seule à mesure que la communauté publie.
 */
function Hero({ shot, membres }: { shot: ShowcaseShot | undefined; membres: number }) {
  return (
    <section className="mx-auto grid w-full max-w-[1180px] items-center gap-10 px-5 pt-12 pb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:gap-14 lg:px-10 lg:pt-16 lg:pb-20">
      <div className="animate-rise">
        <h1 className="font-impact text-[42px] leading-[1.04] tracking-[-0.01em] text-ink sm:text-[56px] lg:text-[68px]">
          Votre Golf
          <br />
          mérite mieux.
        </h1>
        <p className="mt-6 max-w-[44ch] text-[17px] leading-relaxed text-body lg:text-[19px]">
          Mieux qu&apos;un groupe Facebook : un vrai fil, des questions mécaniques qui trouvent
          réponse, de la Mk1 à la Mk8.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/inscription"
            className="pressable bevel-sm inline-flex min-h-[54px] items-center justify-center bg-brand px-8 font-cond text-[16px] font-bold uppercase tracking-[0.06em] text-graphite hover:text-graphite"
          >
            Rejoindre
          </Link>
          <Link
            href="/fil"
            className="pressable inline-flex min-h-[54px] items-center justify-center border border-hairline-strong px-8 font-cond text-[16px] font-bold uppercase tracking-[0.06em] text-ink hover:border-brand hover:text-ink"
          >
            Voir le fil
          </Link>
        </div>
      </div>

      <div className="animate-rise [animation-delay:90ms]">
        {shot ? (
          <figure className="bevel relative aspect-[4/5] w-full overflow-hidden bg-surface sm:aspect-[5/4] lg:aspect-[4/5]">
            <Image
              src={`/photos/${shot.photoId}`}
              alt={
                shot.model
                  ? `Golf ${shot.model} publiée par @${shot.handle}`
                  : `Voiture publiée par @${shot.handle}`
              }
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 480px"
              className="object-cover"
              unoptimized
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-graphite-deep/95 to-transparent px-5 pt-14 pb-4">
              <span className="font-cond text-[15px] font-semibold tracking-[0.02em] text-ink">
                {shot.car || (shot.model ? `Golf ${shot.model}` : "Sa Golf")}
              </span>
              <span className="ml-2 font-mono text-[11px] text-brand-soft">@{shot.handle}</span>
            </figcaption>
          </figure>
        ) : (
          /* Pas encore une seule photo : on le dit, on n'invente pas d'image. */
          <div className="bevel flex aspect-[4/5] w-full flex-col justify-end bg-surface p-7 sm:aspect-[5/4] lg:aspect-[4/5]">
            <p className="font-impact text-[26px] leading-tight text-ink">
              La première photo
              <br />
              sera peut-être la vôtre.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              {membres > 0
                ? `${membres} propriétaire${membres > 1 ? "s" : ""} déjà inscrit${membres > 1 ? "s" : ""}, aucune photo pour l'instant.`
                : "Personne n'est encore inscrit."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- mur */

/**
 * Le mur : la preuve. Autant de cases que de photos réellement disponibles —
 * une grille avec un trou au milieu, c'est une grille mal planifiée.
 */
function Mur({ shots, publications }: { shots: ShowcaseShot[]; publications: number }) {
  if (shots.length === 0) return null;

  return (
    <section className="border-y border-hairline bg-graphite-deep/60 py-14 lg:py-20">
      <div className="mx-auto w-full max-w-[1180px] px-5 lg:px-10">
        <h2 className="reveal max-w-[18ch] font-impact text-[28px] leading-tight text-ink lg:text-[38px]">
          {publications > 1
            ? `${publications} publications, toutes de vrais propriétaires.`
            : "Les photos viennent des membres, pas d'une banque d'images."}
        </h2>

        <ul className="reveal mt-9 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          {shots.map((shot) => (
            <li key={shot.photoId} className="min-w-0">
              <Link
                href={`/publication/${shot.postId}`}
                className="group relative block aspect-square w-full overflow-hidden bg-surface"
              >
                <Image
                  src={`/photos/${shot.photoId}`}
                  alt={
                    shot.model
                      ? `Golf ${shot.model} de @${shot.handle}`
                      : `Voiture de @${shot.handle}`
                  }
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                  className="object-cover transition-transform duration-300 ease-out-firm group-hover:scale-[1.04]"
                  unoptimized
                />
                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-graphite-deep/90 to-transparent px-3 pt-8 pb-2 font-mono text-[10px] text-ink opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  @{shot.handle}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- ce qu'on fait */

/** Trois usages, en colonne asymétrique : pas trois cartes identiques. */
function CeQuOnFait() {
  const usages = [
    {
      titre: "Vous montrez",
      texte:
        "Une photo, la génération, deux lignes. Les coordonnées GPS de la prise de vue sont retirées avant l'envoi.",
    },
    {
      titre: "Vous demandez",
      texte:
        "Un bruit de distribution, une référence de pièce, un avis sur des jantes. La question se pose sans photo.",
    },
    {
      titre: "Vous suivez",
      texte:
        "Les likes et les commentaires sur vos publications arrivent dans vos notifications. Rien d'autre ne vous écrit.",
    },
  ];

  return (
    <section className="mx-auto w-full max-w-[1180px] px-5 py-14 lg:px-10 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-20">
        <h2 className="reveal font-impact text-[28px] leading-tight text-ink lg:sticky lg:top-16 lg:self-start lg:text-[38px]">
          Ce qu&apos;on y fait
        </h2>

        <dl className="reveal flex flex-col">
          {usages.map((usage) => (
            <div
              key={usage.titre}
              className="border-t border-hairline py-7 first:border-t-0 first:pt-0 lg:py-9"
            >
              <dt className="font-cond text-[20px] font-semibold tracking-[0.01em] text-ink lg:text-[24px]">
                {usage.titre}
              </dt>
              <dd className="mt-2 max-w-[58ch] text-[16px] leading-relaxed text-body">
                {usage.texte}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ membres */

/** Défilement horizontal : une liste de huit lignes serait la solution molle. */
function Membres({
  membres,
  total,
}: {
  membres: { id: number; handle: string; avatarPhotoId: number | null; car: string }[];
  total: number;
}) {
  if (membres.length === 0) return null;

  return (
    <section className="border-y border-hairline bg-graphite-deep/60 py-14 lg:py-20">
      <div className="mx-auto w-full max-w-[1180px] px-5 lg:px-10">
        <h2 className="reveal font-impact text-[28px] leading-tight text-ink lg:text-[38px]">
          {total > 1 ? `${total} propriétaires` : "Le premier propriétaire"}
        </h2>
      </div>

      {/* Débordement volontaire : la rangée continue au-delà de la marge, ce
          qui montre qu'on peut la faire défiler sans avoir à l'écrire. */}
      <ul className="mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 lg:px-10">
        {membres.map((membre) => (
          <li key={membre.id} className="w-[220px] shrink-0 snap-start">
            <Link
              href={`/membre/${membre.handle}`}
              className="card card-link flex h-full flex-col gap-3 p-4 hover:text-ink"
            >
              <Avatar handle={membre.handle} photoId={membre.avatarPhotoId} size={44} />
              <span className="min-w-0">
                <span className="block truncate font-cond text-[16px] font-semibold tracking-[0.02em] text-ink">
                  @{membre.handle}
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-muted">
                  {membre.car || "Voiture non renseignée"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------------- duels */

/** Pleine largeur, un seul message : la section qui annonce sans promettre. */
function Duels() {
  return (
    <section className="mx-auto w-full max-w-[1180px] px-5 py-14 lg:px-10 lg:py-24">
      <div className="reveal bevel bg-surface px-6 py-12 lg:px-16 lg:py-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand">
          Bientôt
        </p>
        <h2 className="mt-4 max-w-[20ch] font-impact text-[28px] leading-tight text-ink lg:text-[42px]">
          Deux Golf. Un vote. Un verdict.
        </h2>
        <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-body">
          Les duels arrivent : deux voitures face à face, une voix par membre. Le règlement
          n&apos;est pas encore figé.
        </p>
        <Link
          href="/duels"
          className="pressable mt-8 inline-flex min-h-[48px] items-center border border-hairline-strong px-6 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-ink hover:border-brand hover:text-ink"
        >
          En savoir plus
        </Link>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- rejoindre */

/** Fermeture. Même libellé qu'en haut : une intention, un mot. */
function Rejoindre() {
  return (
    <section className="border-t border-hairline">
      <div className="mx-auto w-full max-w-[1180px] px-5 py-16 text-center lg:px-10 lg:py-24">
        <h2 className="reveal mx-auto max-w-[14ch] font-impact text-[32px] leading-tight text-ink lg:text-[48px]">
          Gratuit, et sans publicité.
        </h2>
        <p className="reveal mx-auto mt-5 max-w-[46ch] text-[16px] leading-relaxed text-body">
          Vos données ne sont revendues à personne. Le site vit sans annonceur.
        </p>
        <Link
          href="/inscription"
          className="pressable bevel-sm mt-9 inline-flex min-h-[54px] items-center justify-center bg-brand px-9 font-cond text-[16px] font-bold uppercase tracking-[0.06em] text-graphite hover:text-graphite"
        >
          Rejoindre
        </Link>
      </div>
    </section>
  );
}

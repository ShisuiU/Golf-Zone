/**
 * Contenu de la landing page.
 *
 * Tout est statique pour l'instant : c'est volontaire. Quand le feed et les
 * manches passeront en base, ces structures servent de contrat de données
 * (un `RosterEntry` deviendra une ligne de table, `SEASON.label` une saison).
 */

export const SITE_NAME = "Zone Golf";
export const SITE_TAGLINE = "le banc d'essai des Golf";
export const SEASON = { label: "Saison 01", short: "S01" };

/** Aucune manche n'a encore été jouée : rien ici ne doit afficher de résultat. */
export const SEASON_OPEN = false;

/** Cibles des appels à l'action. */
export const SIGNUP_HREF = "/inscription";
export const LOGIN_HREF = "/connexion";
export const MEMBER_HREF = "/garage";

export const NAV_LINKS = [
  { label: "Le banc", href: "#le-banc" },
  { label: "Manches", href: "#manche" },
  { label: "Classement", href: "#classement" },
];

export const TICKER_ITEMS = [
  "Mk1 → Mk8 admises",
  "1 membre = 1 voix",
];

export type RosterEntry = {
  handle: string;
  dossier: string;
  model: string;
  caption: string;
  hype: number;
};

/** Exemples de dossiers, le temps que le feed soit alimenté par la communauté. */
export const ROSTER: RosterEntry[] = [
  {
    handle: "@teo_gti",
    dossier: "Dossier #042",
    model: "Mk7 GTI",
    caption: "Première sortie après le kit suspension.",
    hype: 128,
  },
  {
    handle: "@s.nowak",
    dossier: "Dossier #041",
    model: "Mk2 GTI",
    caption: "36 ans, jantes d'origine restaurées.",
    hype: 96,
  },
  {
    handle: "@lina.r",
    dossier: "Dossier #040",
    model: "Mk8 R",
    caption: "Livraison du jour, zéro km.",
    hype: 74,
  },
  {
    handle: "@m.costa",
    dossier: "Dossier #039",
    model: "Mk1 Cabriolet",
    caption: "Moteur remonté à la main, 1986.",
    hype: 201,
  },
];

export const PROTOCOLE = [
  {
    step: "01",
    title: "Engagement",
    body: "Vous inscrivez une photo de votre Golf dans la manche en cours.",
  },
  {
    step: "02",
    title: "Confrontation",
    body: "Le banc met deux dossiers face à face, sans distinction de génération.",
  },
  {
    step: "03",
    title: "Verdict",
    body: "Le vote reste ouvert un temps limité, puis le résultat est publié.",
  },
];

export const REGLEMENT = [
  "Art. 1 — Toutes générations admises",
  "Art. 2 — 1 membre = 1 voix",
  "Art. 3 — On célèbre, on ne rabaisse pas",
  "Art. 4 — Zéro publicité sur le banc",
];

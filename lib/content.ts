/**
 * Contenu de la page d'accueil.
 *
 * Le ton est celui d'un réseau social ordinaire : on poste des photos, on
 * suit un fil. Les duels sont une fonctionnalité à venir, pas le sujet
 * principal du site.
 */

export const SITE_NAME = "Zone Golf";
export const SITE_TAGLINE = "la communauté photo des Golf";

export const NAV_LINKS = [
  { label: "Le fil", href: "#fil" },
  { label: "Comment ça marche", href: "#comment" },
  { label: "Duels", href: "#duels" },
];

/** Cibles des appels à l'action. */
export const SIGNUP_HREF = "/inscription";
export const LOGIN_HREF = "/connexion";
export const MEMBER_HREF = "/profil";

export const TICKER_ITEMS = ["Toutes générations, Mk1 à Mk8", "Gratuit et sans publicité"];

export type SampleEntry = {
  handle: string;
  model: string;
  caption: string;
  likes: number;
};

/** Exemples affichés tant que personne n'a encore publié. */
export const SAMPLE_POSTS: SampleEntry[] = [
  {
    handle: "@teo_gti",
    model: "Mk7 GTI",
    caption: "Première sortie après le kit suspension.",
    likes: 128,
  },
  {
    handle: "@s.nowak",
    model: "Mk2 GTI",
    caption: "36 ans, jantes d'origine restaurées.",
    likes: 96,
  },
  {
    handle: "@lina.r",
    model: "Mk8 R",
    caption: "Livraison du jour, zéro km.",
    likes: 74,
  },
  {
    handle: "@m.costa",
    model: "Mk1 Cabriolet",
    caption: "Moteur remonté à la main, 1986.",
    likes: 201,
  },
];

/** Comment utiliser le site — le partage, pas les duels. */
export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Créez votre compte",
    body: "Un pseudo, un e-mail, et c'est fait. Gratuit, sans publicité.",
  },
  {
    step: "02",
    title: "Postez vos photos",
    body: "Votre Golf, sa génération, quelques mots. Les photos sont allégées automatiquement.",
  },
  {
    step: "03",
    title: "Suivez le fil",
    body: "Découvrez les Golf des autres membres, de la Mk1 restaurée à la Mk8 sortie d'usine.",
  },
];

/** Règles de la communauté, en français courant. */
export const RULES = [
  "Toutes les générations sont les bienvenues",
  "On commente les voitures, jamais les personnes",
  "Vos photos restent les vôtres",
  "Aucune publicité",
];

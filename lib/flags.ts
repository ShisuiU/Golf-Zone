/**
 * Interrupteurs de fonctionnalités.
 *
 * Tout ce qui est communautaire (comptes, dépôt de dossiers, feed réel) a
 * besoin d'une base de données. Sans `DATABASE_URL`, le site tourne en mode
 * vitrine : la landing s'affiche avec ses exemples, et rien n'invite à créer
 * un compte qui ne pourrait pas être conservé.
 *
 * `ZONE_GOLF_ACCOUNTS=off` permet de couper les comptes même quand une base
 * est configurée (mise en maintenance, par exemple).
 */
const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

function readOverride(): boolean | undefined {
  const raw = process.env.ZONE_GOLF_ACCOUNTS?.trim().toLowerCase();
  if (raw === "on" || raw === "true" || raw === "1") return true;
  if (raw === "off" || raw === "false" || raw === "0") return false;
  return undefined;
}

const override = readOverride();

/** Une base reste indispensable : `on` sans `DATABASE_URL` ne suffit pas. */
export const ACCOUNTS_ENABLED = hasDatabase && override !== false;

/** Le feed lit la base plutôt que les exemples codés en dur. */
export const LIVE_FEED = ACCOUNTS_ENABLED;

/**
 * Pseudos des modérateurs, en clair dans la configuration
 * (`ZONE_GOLF_MODERATEURS=shisuigte,autre`).
 *
 * Pas de colonne « administrateur » en base : le jour où l'on donne ce droit
 * depuis le site, il faut une page pour le retirer, une trace de qui l'a
 * donné, et de quoi éviter qu'un compte compromis se l'octroie. Une variable
 * d'environnement se change en une minute et ne se pirate pas depuis le site.
 */
const MODERATORS = new Set(
  (process.env.ZONE_GOLF_MODERATEURS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean),
);

export function isModerator(handle: string | undefined): boolean {
  return handle !== undefined && MODERATORS.has(handle.toLowerCase());
}

/** Y a-t-il seulement quelqu'un pour modérer ? */
export const HAS_MODERATION = MODERATORS.size > 0;

/**
 * Cible des appels à l'action : l'inscription quand les comptes sont ouverts,
 * sinon la section qui explique le fonctionnement — jamais une route en 404.
 */
export const CTA_HREF = "/inscription";

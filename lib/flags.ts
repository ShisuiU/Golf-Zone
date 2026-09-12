/**
 * Interrupteurs de fonctionnalités.
 *
 * Les comptes reposent sur un fichier SQLite local, qui ne survit pas à un
 * hébergement au système de fichiers éphémère (Vercel & co) : chaque instance
 * aurait sa propre base, et les inscriptions disparaîtraient. Ils sont donc
 * coupés en production tant qu'une base gérée n'est pas branchée.
 *
 * `ZONE_GOLF_ACCOUNTS=on` les réactive (utile pour un environnement de test
 * disposant d'un vrai stockage) ; `off` les coupe même en développement.
 */
function readFlag(): boolean {
  const raw = process.env.ZONE_GOLF_ACCOUNTS?.trim().toLowerCase();
  if (raw === "on" || raw === "true" || raw === "1") return true;
  if (raw === "off" || raw === "false" || raw === "0") return false;
  return process.env.NODE_ENV !== "production";
}

export const ACCOUNTS_ENABLED = readFlag();

/**
 * Cible des appels à l'action de la landing : l'inscription quand les comptes
 * sont ouverts, sinon la section qui explique le fonctionnement — jamais un
 * lien vers une route qui répond 404.
 */
export const CTA_HREF = ACCOUNTS_ENABLED ? "/inscription" : "#manche";

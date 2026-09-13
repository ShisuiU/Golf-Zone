import "server-only";
import { headers } from "next/headers";
import {
  clearLoginFailures,
  lockedFor,
  noteQuotaUse,
  quotaWait,
  recordLoginFailure,
} from "@/lib/db";

/**
 * Limitation des tentatives de connexion.
 *
 * Deux compteurs plutôt qu'un : par e-mail, contre l'essai de mots de passe
 * sur un compte précis ; par adresse IP, contre le balayage de plusieurs
 * comptes depuis la même machine. Le second est plus large, car une adresse
 * peut être partagée par tout un immeuble ou une entreprise.
 *
 * Le décompte vit en base : chaque instance serverless a sa propre mémoire, un
 * compteur en RAM ne protégerait rien.
 */
const BY_EMAIL = { threshold: 5, lockMinutes: 15 };
const BY_IP = { threshold: 20, lockMinutes: 15 };

async function clientIp(): Promise<string> {
  const list = await headers();
  // Derrière Vercel, `x-forwarded-for` est renseigné par la plateforme ; la
  // première valeur est le client. En local il n'y a rien : tout le monde
  // partage alors la même clé, ce qui n'a d'effet qu'en développement.
  const forwarded = list.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "inconnue";
}

async function keysFor(email: string): Promise<string[]> {
  return [`email:${email.toLowerCase()}`, `ip:${await clientIp()}`];
}

/** Secondes à attendre avant un nouvel essai, 0 si la voie est libre. */
export async function loginBlockedFor(email: string): Promise<number> {
  return lockedFor(await keysFor(email));
}

export async function noteLoginFailure(email: string): Promise<void> {
  const [emailKey, ipKey] = await keysFor(email);
  await recordLoginFailure(emailKey, BY_EMAIL.threshold, BY_EMAIL.lockMinutes);
  await recordLoginFailure(ipKey, BY_IP.threshold, BY_IP.lockMinutes);
}

export async function noteLoginSuccess(email: string): Promise<void> {
  await clearLoginFailures(await keysFor(email));
}

/* ------------------------------------------------------------------ quotas */

/**
 * Rythme maximal des actions qui coûtent quelque chose au site.
 *
 * Ces chiffres ne gênent personne : dix publications en une heure, c'est déjà
 * beaucoup pour une seule voiture. Ils arrêtent en revanche un script, et
 * c'est le but — une photo pèse jusqu'à 2 Mo et l'hébergement de la base
 * donne 0,5 Go, soit quelques centaines de photos avant saturation. Sans
 * plafond, une seule personne peut remplir la base en une soirée et bloquer
 * tout le monde.
 *
 * Les inscriptions se comptent par adresse IP, faute d'autre repère avant
 * qu'un compte existe. Le plafond est volontairement large : une adresse peut
 * être partagée par tout un immeuble.
 */
export const QUOTAS = {
  publication: { limit: 10, windowMinutes: 60, quoi: "publications" },
  commentaire: { limit: 40, windowMinutes: 60, quoi: "commentaires" },
  inscription: { limit: 5, windowMinutes: 60, quoi: "inscriptions" },
} as const;

type Quota = (typeof QUOTAS)[keyof typeof QUOTAS];

/** Secondes à attendre, 0 si la voie est libre. */
export async function quotaBlockedFor(quota: Quota, sujet: string | number): Promise<number> {
  return quotaWait(`${quota.quoi}:${sujet}`, quota.limit);
}

/** À appeler une fois l'action réellement passée — un refus ne consomme rien. */
export async function noteQuotaAction(quota: Quota, sujet: string | number): Promise<void> {
  await noteQuotaUse(`${quota.quoi}:${sujet}`, quota.windowMinutes);
}

/** L'adresse du client, pour ce qui se compte avant qu'un compte existe. */
export async function currentIp(): Promise<string> {
  return clientIp();
}

/** « 15 minutes », « 40 secondes » — pour l'annoncer sans jargon. */
export function waitLabel(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  }
  return `${seconds} seconde${seconds > 1 ? "s" : ""}`;
}

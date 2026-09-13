import "server-only";
import { headers } from "next/headers";
import { clearLoginFailures, lockedFor, recordLoginFailure } from "@/lib/db";

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

/** « 15 minutes », « 40 secondes » — pour l'annoncer sans jargon. */
export function waitLabel(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  }
  return `${seconds} seconde${seconds > 1 ? "s" : ""}`;
}

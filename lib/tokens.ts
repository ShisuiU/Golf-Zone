import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { dropTokens, insertToken, spendToken, type TokenPurpose } from "@/lib/db";

/**
 * Jetons des liens envoyés par courrier.
 *
 * Même principe que les sessions : le lien porte un jeton aléatoire de 256
 * bits, la base n'en garde que l'empreinte. Une fuite de la base ne permet
 * donc de reprendre aucun compte.
 */

/** Durées de vie. Une réinitialisation est urgente, une confirmation non. */
const LIFETIME_MINUTES: Record<TokenPurpose, number> = {
  reset: 60,
  verify: 60 * 24 * 7,
};

export function digest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Crée un jeton et invalide les précédents du même usage. */
export async function issueToken(userId: number, purpose: TokenPurpose): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + LIFETIME_MINUTES[purpose] * 60_000);

  await dropTokens(userId, purpose);
  await insertToken(digest(token), userId, purpose, expiresAt);
  return token;
}

/** Renvoie l'identifiant du membre si le jeton est valide, et le consomme. */
export async function consumeToken(
  token: string,
  purpose: TokenPurpose,
): Promise<number | undefined> {
  if (!token) return undefined;
  return spendToken(digest(token), purpose);
}

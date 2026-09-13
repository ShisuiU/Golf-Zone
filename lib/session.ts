import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import {
  deleteSessionByHash,
  findUserBySessionToken,
  insertSession,
  type User,
} from "@/lib/db";

const COOKIE_NAME = "zg_session";
const SESSION_DAYS = 30;

/**
 * Le cookie de session est `Secure` partout sauf en développement, où le
 * serveur est en http et où le navigateur ne le renverrait donc jamais.
 *
 * `ZONE_GOLF_COOKIE_NON_SECURISE` lève la même contrainte pour la suite de
 * tests, qui tourne sur une compilation de production servie en http. Chrome
 * et Firefox tolèrent un cookie `Secure` sur `localhost` ; WebKit — le moteur
 * de Safari, donc de tous les navigateurs sur iPhone — le refuse, et sans
 * cette échappatoire aucun scénario connecté n'y était vérifiable. Rien dans
 * une requête ne peut l'activer : il faut l'avoir posée dans l'environnement.
 */
const COOKIE_SECURE =
  process.env.NODE_ENV === "production" && process.env.ZONE_GOLF_COOKIE_NON_SECURISE !== "1";

/**
 * Sessions côté serveur : le cookie ne porte qu'un jeton aléatoire, et seule
 * son empreinte est stockée. Une fuite de la base ne permet donc pas de
 * rejouer une session, et une session reste révocable (ce qu'un JWT n'est pas).
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await insertSession(hashToken(token), userId, expiresAt);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function readSessionUser(): Promise<User | undefined> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return undefined;
  return findUserBySessionToken(hashToken(token));
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) await deleteSessionByHash(hashToken(token));
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };

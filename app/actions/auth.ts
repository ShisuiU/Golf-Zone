"use server";

import { redirect } from "next/navigation";
import {
  createUser,
  emailTaken,
  findUserByEmail,
  handleTaken,
  normalizeEmail,
} from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/session";
import { ACCOUNTS_ENABLED } from "@/lib/flags";
import {
  currentIp,
  loginBlockedFor,
  noteLoginFailure,
  noteLoginSuccess,
  noteQuotaAction,
  quotaBlockedFor,
  QUOTAS,
  waitLabel,
} from "@/lib/throttle";
import { sendVerificationLink } from "@/lib/notify-mail";

export type AuthState = {
  errors?: Record<string, string>;
  /** Valeurs ressaisies dans le formulaire après une erreur (jamais le mot de passe). */
  values?: { email?: string; handle?: string };
};

/**
 * Une Server Action reste appelable par requête directe même si la page qui
 * l'expose répond 404 : la garde doit donc être ici aussi, pas seulement
 * dans les pages.
 */
const ACCOUNTS_OFF: AuthState = {
  errors: { form: "Les comptes ne sont pas encore ouverts." },
};

const HANDLE_RE = /^[a-z0-9](?:[a-z0-9._-]{1,18}[a-z0-9])$/i;
const MIN_PASSWORD = 8;

/** Validation volontairement basique et lisible, pour éviter une dépendance de plus. */
function validateEmail(email: string): string | undefined {
  if (!email) return "Renseignez votre e-mail.";
  // Pas de tentative d'être exhaustif : la vraie validation sera la confirmation par e-mail.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "Cet e-mail ne semble pas valide.";
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) return "Choisissez un mot de passe.";
  if (password.length < MIN_PASSWORD) {
    return `Au moins ${MIN_PASSWORD} caractères.`;
  }
  return undefined;
}

function validateHandle(handle: string): string | undefined {
  if (!handle) return "Choisissez un pseudo.";
  if (!HANDLE_RE.test(handle)) {
    return "3 à 20 caractères : lettres, chiffres, point, tiret ou underscore.";
  }
  return undefined;
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!ACCOUNTS_ENABLED) return ACCOUNTS_OFF;

  const email = String(formData.get("email") ?? "").trim();
  const handle = String(formData.get("handle") ?? "").trim().replace(/^@/, "");
  const password = String(formData.get("password") ?? "");
  const values = { email, handle };

  const errors: Record<string, string> = {};
  const emailError = validateEmail(email);
  const handleError = validateHandle(handle);
  const passwordError = validatePassword(password);
  if (emailError) errors.email = emailError;
  if (handleError) errors.handle = handleError;
  if (passwordError) errors.password = passwordError;

  if (!emailError && (await emailTaken(email))) {
    errors.email = "Un compte existe déjà avec cet e-mail.";
  }
  if (!handleError && (await handleTaken(handle))) {
    errors.handle = "Ce pseudo est déjà pris.";
  }

  if (Object.keys(errors).length > 0) return { errors, values };

  // Rien n'identifie encore la personne : le compteur porte sur l'adresse.
  // Contrôlé après la validation, pour qu'un formulaire mal rempli ne coûte
  // pas une inscription à quelqu'un qui partage la même adresse.
  const ip = await currentIp();
  const attente = await quotaBlockedFor(QUOTAS.inscription, ip);
  if (attente > 0) {
    return {
      errors: {
        form: `Trop d'inscriptions depuis cette connexion. Réessayez dans ${waitLabel(attente)}.`,
      },
      values,
    };
  }

  const user = await createUser({
    email: normalizeEmail(email),
    handle,
    passwordHash: await hashPassword(password),
  });
  await noteQuotaAction(QUOTAS.inscription, ip);
  await createSession(user.id);

  // L'envoi ne doit pas faire échouer l'inscription : le membre peut toujours
  // redemander le lien depuis son compte.
  await sendVerificationLink(user.id, user.email);

  // redirect() lève une exception de contrôle de flux : hors de tout try/catch.
  redirect("/profil");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!ACCOUNTS_ENABLED) return ACCOUNTS_OFF;

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const values = { email };

  if (!email || !password) {
    return { errors: { form: "Renseignez votre e-mail et votre mot de passe." }, values };
  }

  // Le verrou est consulté avant toute vérification : sans cela, essayer des
  // mots de passe resterait gratuit, seule la réponse changerait.
  const wait = await loginBlockedFor(email);
  if (wait > 0) {
    return {
      errors: { form: `Trop de tentatives. Réessayez dans ${waitLabel(wait)}.` },
      values,
    };
  }

  const user = await findUserByEmail(email);
  const ok = user ? await verifyPassword(password, user.password_hash) : false;

  // Un seul message pour « e-mail inconnu » et « mot de passe faux » : sinon la
  // page devient un moyen de vérifier qui est inscrit.
  if (!user || !ok) {
    await noteLoginFailure(email);
    return { errors: { form: "E-mail ou mot de passe incorrect." }, values };
  }

  await noteLoginSuccess(email);
  await createSession(user.id);
  redirect("/profil");
}

export async function logout(): Promise<void> {
  if (!ACCOUNTS_ENABLED) redirect("/");
  await destroySession();
  redirect("/");
}

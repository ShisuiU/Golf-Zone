"use server";

import { redirect } from "next/navigation";
import { findUserByEmail, updatePassword, deleteSessionsOfUser } from "@/lib/db";
import { ACCOUNTS_ENABLED } from "@/lib/flags";
import { MAIL_ENABLED } from "@/lib/mail";
import { sendResetLink } from "@/lib/notify-mail";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { consumeToken } from "@/lib/tokens";

const MIN_PASSWORD = 8;

export type ForgotState = { sent?: boolean; error?: string };

/**
 * Demande de réinitialisation.
 *
 * La réponse est la même que l'adresse existe ou non : autrement, la page
 * dirait qui est inscrit. Le seul cas où l'on parle franchement, c'est quand
 * le site ne sait pas encore envoyer de courrier — laisser croire à un envoi
 * ferait attendre pour rien.
 */
export async function requestReset(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  if (!ACCOUNTS_ENABLED) return { error: "Les comptes ne sont pas ouverts." };
  if (!MAIL_ENABLED) {
    return {
      error:
        "L'envoi d'e-mails n'est pas encore configuré sur le site : la réinitialisation ne peut pas aboutir.",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Renseignez votre e-mail." };

  const user = await findUserByEmail(email);
  if (user) await sendResetLink(user.id, user.email);

  return { sent: true };
}

export type ResetState = {
  errors?: Partial<Record<"password" | "confirm" | "form", string>>;
};

/** Choix du nouveau mot de passe, à l'ouverture du lien reçu. */
export async function resetPassword(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  if (!ACCOUNTS_ENABLED) return { errors: { form: "Les comptes ne sont pas ouverts." } };

  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const errors: ResetState["errors"] = {};
  if (password.length < MIN_PASSWORD) errors.password = `Au moins ${MIN_PASSWORD} caractères.`;
  if (password !== confirm) errors.confirm = "Les deux saisies diffèrent.";
  if (Object.keys(errors).length > 0) return { errors };

  // Le jeton est consommé au moment de la lecture : un lien ne sert qu'une fois.
  const userId = await consumeToken(token, "reset");
  if (!userId) {
    return {
      errors: { form: "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau." },
    };
  }

  await updatePassword(userId, await hashPassword(password));

  // Quiconque tenait une session avec l'ancien mot de passe la perd : c'est le
  // cas d'usage même de la réinitialisation.
  await deleteSessionsOfUser(userId);
  await createSession(userId);

  // redirect() lève une exception de contrôle de flux : hors de tout try/catch.
  redirect("/profil");
}

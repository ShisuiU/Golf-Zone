import "server-only";
import { SITE_NAME } from "@/lib/content";
import { sendMail } from "@/lib/mail";
import { SITE_URL } from "@/lib/site";
import { issueToken } from "@/lib/tokens";

/**
 * Les deux courriers que le site envoie. Le texte est court et sans mise en
 * page : un message transactionnel n'a pas besoin d'être une brochure, et le
 * texte brut passe partout.
 */

export async function sendVerificationLink(userId: number, email: string): Promise<boolean> {
  const token = await issueToken(userId, "verify");
  const link = new URL(`/confirmer/${token}`, SITE_URL).toString();

  return sendMail({
    to: email,
    subject: `Confirmez votre adresse — ${SITE_NAME}`,
    text: [
      `Bienvenue sur ${SITE_NAME}.`,
      "",
      "Confirmez votre adresse en ouvrant ce lien :",
      link,
      "",
      "Le lien est valable une semaine. Si vous n'êtes pas à l'origine de cette",
      "inscription, ignorez ce message.",
    ].join("\n"),
  });
}

export async function sendResetLink(userId: number, email: string): Promise<boolean> {
  const token = await issueToken(userId, "reset");
  const link = new URL(`/reinitialiser/${token}`, SITE_URL).toString();

  return sendMail({
    to: email,
    subject: `Réinitialiser votre mot de passe — ${SITE_NAME}`,
    text: [
      "Vous avez demandé un nouveau mot de passe.",
      "",
      "Choisissez-en un ici :",
      link,
      "",
      "Le lien est valable une heure et ne fonctionne qu'une fois. Si vous n'avez",
      "rien demandé, ignorez ce message : votre mot de passe reste inchangé.",
    ].join("\n"),
  });
}

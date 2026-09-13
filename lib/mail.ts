import "server-only";

/**
 * Envoi de courrier.
 *
 * Un appel HTTP à Resend, sans bibliothèque : l'API tient en une requête, et
 * une dépendance de plus pour ça ne se justifie pas.
 *
 * Tant que `RESEND_API_KEY` et `MAIL_FROM` ne sont pas renseignés, le site le
 * dit franchement au visiteur au lieu de prétendre avoir envoyé un message —
 * un « vérifiez vos e-mails » qui ne mène à rien est pire que rien. En
 * développement, le lien est écrit dans la console du serveur pour pouvoir
 * suivre le parcours de bout en bout.
 */

const API_KEY = process.env.RESEND_API_KEY?.trim();
const FROM = process.env.MAIL_FROM?.trim();

export const MAIL_ENABLED = Boolean(API_KEY && FROM);

type Mail = { to: string; subject: string; text: string };

export async function sendMail({ to, subject, text }: Mail): Promise<boolean> {
  if (!MAIL_ENABLED) {
    console.warn(
      `[courrier non configuré] destinataire : ${to}\nsujet : ${subject}\n${text}`,
    );
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, text }),
      // Un envoi qui traîne ne doit pas retenir la page ouverte devant le membre.
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      console.error("Envoi refusé par Resend :", response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Envoi impossible :", error);
    return false;
  }
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { markEmailVerified } from "@/lib/db";
import { ACCOUNTS_ENABLED } from "@/lib/flags";
import { consumeToken } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "Confirmation — Zone Golf",
  robots: { index: false },
};

/**
 * Confirmation d'adresse. Le jeton est consommé à l'ouverture du lien : il
 * n'y a rien à saisir, donc rien à attendre. Le pire cas est un aperçu
 * automatique par une messagerie qui confirmerait l'adresse à la place du
 * membre — ce qui reste le résultat voulu.
 */
export default async function ConfirmerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!ACCOUNTS_ENABLED) notFound();

  const { token } = await params;
  const userId = await consumeToken(token, "verify");
  if (userId) await markEmailVerified(userId);

  return (
    <PageShell title={userId ? "Adresse confirmée" : "Lien invalide"}>
      {userId ? (
        <p>
          Merci, votre adresse est confirmée. Vous pouvez désormais récupérer votre compte
          si vous perdez votre mot de passe.
        </p>
      ) : (
        <p>
          Ce lien a expiré ou a déjà servi. Vous pouvez en redemander un depuis{" "}
          <Link href="/compte" className="underline">
            votre compte
          </Link>
          .
        </p>
      )}
    </PageShell>
  );
}

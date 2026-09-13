import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResetForm } from "@/components/auth/ResetForm";
import { ACCOUNTS_ENABLED } from "@/lib/flags";

export const metadata: Metadata = {
  title: "Nouveau mot de passe — Zone Golf",
  robots: { index: false },
};

/**
 * Le jeton n'est pas vérifié à l'affichage : le faire ici le consommerait, et
 * un aperçu de lien par une messagerie suffirait à brûler le lien avant que
 * son destinataire n'ait rien saisi. Il est validé à l'envoi du formulaire.
 */
export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  if (!ACCOUNTS_ENABLED) notFound();
  const { token } = await params;

  return (
    <main>
      <div className="panel p-6 lg:p-8">
        <h1 className="mb-2 font-impact text-[26px] lg:text-[30px]">Nouveau mot de passe</h1>
        <p className="mb-7 text-sm leading-relaxed text-muted">
          Choisissez-en un nouveau. Vos autres appareils seront déconnectés.
        </p>
        <ResetForm token={token} />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/connexion" className="underline">
          Revenir à la connexion
        </Link>
      </p>
    </main>
  );
}

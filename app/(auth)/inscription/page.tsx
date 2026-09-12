import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/SignupForm";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Ouvrir mon dossier — Zone Golf",
  description: "Créez votre compte pour déposer vos photos et engager votre Golf.",
};

export default async function InscriptionPage() {
  // Déjà connecté : rien à créer, direction le garage.
  if (await getCurrentUser()) redirect("/garage");

  return (
    <main>
      <div className="panel p-6 lg:p-8">
        <h1 className="mb-2 font-impact text-[26px] lg:text-[30px]">Ouvrir mon dossier</h1>
        <p className="mb-7 text-sm leading-relaxed text-muted">
          Un compte suffit pour déposer vos photos. Les manches 1v1 arrivent ensuite.
        </p>
        <SignupForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Déjà membre ?{" "}
        <Link href="/connexion" className="underline">
          Se connecter
        </Link>
      </p>
    </main>
  );
}

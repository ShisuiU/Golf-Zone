import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Connexion — Zone Golf",
  description: "Connectez-vous pour retrouver votre garage et vos dossiers.",
};

export default async function ConnexionPage() {
  if (await getCurrentUser()) redirect("/garage");

  return (
    <main>
      <div className="panel p-6 lg:p-8">
        <h1 className="mb-2 font-impact text-[26px] lg:text-[30px]">Connexion</h1>
        <p className="mb-7 text-sm leading-relaxed text-muted">
          Retrouvez votre garage et vos dossiers.
        </p>
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="underline">
          Ouvrir mon dossier
        </Link>
      </p>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ForgotForm } from "@/components/auth/ForgotForm";
import { ACCOUNTS_ENABLED } from "@/lib/flags";

export const metadata: Metadata = {
  title: "Mot de passe oublié — Zone Golf",
};

export default function ForgotPage() {
  if (!ACCOUNTS_ENABLED) notFound();

  return (
    <main>
      <div className="panel p-6 lg:p-8">
        <h1 className="mb-2 font-impact text-[26px] lg:text-[30px]">Mot de passe oublié</h1>
        <p className="mb-7 text-sm leading-relaxed text-muted">
          Indiquez votre adresse : vous recevrez un lien pour en choisir un nouveau.
        </p>
        <ForgotForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/connexion" className="underline">
          Revenir à la connexion
        </Link>
      </p>
    </main>
  );
}

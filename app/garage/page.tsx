import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { requireUser } from "@/lib/dal";
import { ACCOUNTS_ENABLED } from "@/lib/flags";
import { SEASON, SITE_NAME } from "@/lib/content";

export const metadata: Metadata = {
  title: "Mon garage — Zone Golf",
};

export default async function GaragePage() {
  if (!ACCOUNTS_ENABLED) notFound();
  const user = await requireUser();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />

      <header className="relative flex items-center justify-between gap-4 border-b border-hairline px-5 py-4 lg:px-16 lg:py-6">
        <Link href="/" className="flex items-center gap-3 hover:text-ink">
          <span className="font-impact text-lg text-ink lg:text-[23px]">
            {SITE_NAME.toUpperCase()}
          </span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="min-h-[44px] cursor-pointer border border-hairline-strong px-4 font-cond text-sm font-semibold uppercase tracking-[0.06em] text-body hover:text-ink"
          >
            Se déconnecter
          </button>
        </form>
      </header>

      <main className="relative mx-auto w-full max-w-[900px] px-5 py-10 lg:py-16">
        <p className="mb-3 font-mono text-[10px] tracking-[0.15em] text-brand">
          Espace membre — {SEASON.label.toLowerCase()}
        </p>
        <h1 className="mb-2 font-impact text-[30px] lg:text-[42px]">Mon garage</h1>
        <p className="mb-10 text-[15px] leading-relaxed text-body">
          Bienvenue <span className="font-cond font-semibold text-ink">@{user.handle}</span>.
          Votre compte est ouvert : il portera vos dossiers et vos engagements en manche.
        </p>

        {/* Rien à lister : l'upload de photos n'existe pas encore. Le dire
            plutôt que d'inventer un garage rempli. */}
        <section className="panel p-6 lg:p-8">
          <h2 className="mb-2 font-cond text-xl font-semibold uppercase tracking-[0.03em]">
            Aucun dossier pour l&apos;instant
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-muted">
            Le dépôt de photos est la prochaine étape du chantier. Dès qu&apos;il sera
            en place, vos Golf apparaîtront ici, prêtes à être engagées.
          </p>
          <div className="flex flex-col gap-3 border border-dashed border-hairline-strong px-4 py-8 text-center">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-faint">
              Emplacement dossier
            </span>
            <span className="font-cond text-lg font-semibold uppercase tracking-[0.04em] text-faint">
              Dépôt bientôt ouvert
            </span>
          </div>
        </section>

        <p className="mt-8 text-sm text-muted">
          <Link href="/" className="underline">
            Retour au banc
          </Link>
        </p>
      </main>
    </div>
  );
}

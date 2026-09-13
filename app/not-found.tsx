import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page introuvable — Zone Golf",
};

/**
 * 404. Pas d'en-tête ici : cette page s'affiche aussi quand les comptes sont
 * coupés, et l'en-tête interroge la session.
 */
export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />

      <main className="relative text-center">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-brand">Erreur 404</p>
        <h1 className="mt-3 font-impact text-[30px] leading-tight lg:text-[42px]">
          Cette page n&apos;existe pas
        </h1>
        <p className="mx-auto mt-4 max-w-[420px] text-[15px] leading-relaxed text-body">
          Le lien est peut-être erroné, ou la publication a été supprimée par son auteur.
        </p>
        <Link
          href="/"
          className="bevel-sm mt-7 inline-flex min-h-[48px] items-center bg-brand px-6 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-graphite hover:text-graphite"
        >
          Retour au fil
        </Link>
      </main>
    </div>
  );
}

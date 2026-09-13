"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Page d'erreur du site. Une panne de base ne doit pas renvoyer un écran nu :
 * le visiteur doit reconnaître où il est et pouvoir repartir.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erreur de rendu :", error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />

      <main className="relative text-center">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-brand">Panne</p>
        <h1 className="mt-3 font-impact text-[30px] leading-tight lg:text-[42px]">
          Quelque chose a lâché
        </h1>
        <p className="mx-auto mt-4 max-w-[420px] text-[15px] leading-relaxed text-body">
          Cette page n&apos;a pas pu s&apos;afficher. C&apos;est probablement passager.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="pressable bevel-sm min-h-[48px] cursor-pointer bg-brand px-6 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-graphite"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="pressable inline-flex min-h-[48px] items-center border border-hairline-strong px-6 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-ink hover:text-ink"
          >
            Retour au fil
          </Link>
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

/** Gabarit des pages de texte : en-tête, colonne de lecture, retour au fil. */
export function PageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />
      <SiteHeader />

      <main id="contenu" tabIndex={-1} className="relative mx-auto w-full max-w-[680px] flex flex-1 flex-col px-4 py-6 lg:py-10">
        <h1 className="mb-7 font-impact text-[26px] leading-tight lg:text-[32px]">{title}</h1>
        <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-body">{children}</div>

        <p className="mt-10 text-center text-sm text-muted">
          <Link href="/" className="underline">
            Retour au fil
          </Link>
        </p>

        <SiteFooter />
      </main>
    </div>
  );
}

/** Titre de section des pages de texte. */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-cond text-lg font-semibold uppercase tracking-[0.03em] text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Les duels — Zone Golf",
  description:
    "Deux Golf face à face, la communauté vote pour sa préférée. Fonctionnalité en préparation.",
};

const STEPS = [
  {
    step: "01",
    title: "Deux photos s'affrontent",
    body: "Deux publications du fil sont mises face à face, sans distinction de génération.",
  },
  {
    step: "02",
    title: "La communauté vote",
    body: "Chaque membre dispose d'une voix. Le vote reste ouvert un temps limité.",
  },
  {
    step: "03",
    title: "Le résultat est publié",
    body: "La photo gagnante est annoncée, et les votes restent visibles.",
  },
];

export default async function DuelsPage() {
  const user = await getCurrentUser();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />
      <SiteHeader />

      <main className="relative mx-auto w-full max-w-[860px] px-5 py-10 lg:py-16">
        <span className="bevel-sm inline-block bg-brand px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.07em] text-graphite">
          En préparation
        </span>
        <h1 className="mt-4 mb-3 font-impact text-[32px] lg:text-[44px]">Les duels</h1>
        <p className="mb-10 max-w-[560px] text-[15px] leading-relaxed text-body lg:text-lg">
          Deux Golf face à face, et c&apos;est la communauté qui tranche. Une
          façon de départager les photos du fil, sans jury ni classement
          imposé.
        </p>

        <ol className="mb-10 grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-5">
          {STEPS.map((item) => (
            <li key={item.step} className="border border-hairline bg-surface p-5 lg:p-6">
              <p className="mb-2.5 font-impact text-[24px] text-brand lg:text-[30px]">
                {item.step}
              </p>
              <h2 className="mb-2 font-cond text-[18px] font-semibold uppercase tracking-[0.03em] lg:text-[20px]">
                {item.title}
              </h2>
              <p className="text-[13px] leading-relaxed text-muted lg:text-sm">{item.body}</p>
            </li>
          ))}
        </ol>

        <section className="panel p-4 lg:p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.07em] text-muted">
              Aperçu d&apos;un duel
            </span>
            <span className="border border-brand/50 px-2 py-1 font-mono text-[9px] font-bold text-brand lg:text-[10px]">
              Pas encore ouvert
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center">
            <div className="flex-1">
              <p className="mb-2 font-cond text-sm font-semibold uppercase tracking-[0.04em] text-body">
                Photo A
              </p>
              <div className="h-28 border border-brand/30 bg-[linear-gradient(150deg,#2e2119,#16191c)] lg:h-32" />
            </div>
            <div className="py-2.5 text-center font-impact text-xl lg:px-5 lg:py-0 lg:text-2xl">
              VS
            </div>
            <div className="flex-1">
              <p className="mb-2 font-cond text-sm font-semibold uppercase tracking-[0.04em] text-body lg:text-right">
                Photo B
              </p>
              <div className="h-28 border border-rival/30 bg-[linear-gradient(210deg,#152530,#16191c)] lg:h-32" />
            </div>
          </div>

          <div className="mt-5 border-t border-hairline pt-4">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-[0.07em] text-muted">Votes</span>
              <span className="font-mono text-[10px] text-faint">— · —</span>
            </div>
            <div className="flex h-2.5 gap-0.5 bg-surface-2">
              <div className="flex-1 bg-[repeating-linear-gradient(90deg,rgba(249,115,22,0.25)_0_6px,transparent_6px_12px)]" />
              <div className="flex-1 bg-[repeating-linear-gradient(90deg,rgba(56,189,248,0.25)_0_6px,transparent_6px_12px)]" />
            </div>
          </div>
        </section>

        <p className="mt-8 text-center text-sm text-muted">
          En attendant,{" "}
          <Link href="/" className="underline">
            {user ? "publiez sur le fil" : "rejoignez la communauté"}
          </Link>{" "}
          : les photos du fil alimenteront les premiers duels.
        </p>
        <SiteFooter />
      </main>
    </div>
  );
}

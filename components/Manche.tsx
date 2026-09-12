import { Button } from "@/components/ui/Button";
import { PROTOCOLE, SEASON, SIGNUP_HREF } from "@/lib/content";

export function Manche() {
  return (
    <section
      id="manche"
      className="relative border-b border-hairline bg-graphite-deep px-5 py-10 lg:px-16 lg:py-22"
    >
      <div className="mb-7 text-center lg:mb-12">
        <span className="bevel inline-block bg-brand px-3 py-1.5 font-mono text-[9px] font-bold tracking-[0.07em] text-graphite lg:text-[10px]">
          Bientôt — {SEASON.label}
        </span>
        <h2 className="mt-4 mb-3.5 font-impact text-[30px] lg:mt-5.5 lg:mb-4 lg:text-[46px]">
          Manche 01 — le 1v1
        </h2>
        <p className="mx-auto max-w-[580px] text-sm leading-relaxed text-body lg:text-[17px]">
          Deux Golf sur le banc, une photo chacune. La communauté vote, le verdict
          tombe, le vainqueur marque au classement.
        </p>
      </div>

      <ol className="mb-6 grid grid-cols-1 gap-3 lg:mb-10 lg:grid-cols-3 lg:gap-5">
        {PROTOCOLE.map((item) => (
          <li
            key={item.step}
            className="border border-hairline bg-surface p-5 lg:p-6.5"
          >
            <p className="mb-2.5 font-impact text-[26px] text-brand lg:mb-3.5 lg:text-[32px]">
              {item.step}
            </p>
            <h3 className="mb-2 font-cond text-[19px] font-semibold uppercase tracking-[0.03em] lg:mb-2.5 lg:text-[21px]">
              {item.title}
            </h3>
            <p className="text-[13px] leading-relaxed text-muted lg:text-sm">
              {item.body}
            </p>
          </li>
        ))}
      </ol>

      {/* Barre remplie = illustration du mécanisme, explicitement étiquetée. */}
      <div className="panel mx-auto max-w-[860px] p-4 lg:p-6.5">
        <div className="mb-3 flex flex-col gap-1 lg:mb-3.5 lg:flex-row lg:items-center lg:justify-between">
          <span className="font-mono text-[9px] tracking-[0.07em] text-muted lg:text-[10px]">
            Exemple de relevé — illustration
          </span>
          <span className="font-mono text-[9px] text-faint lg:text-[10px]">
            Verdict : côté A
          </span>
        </div>
        <div className="flex items-center gap-2.5 lg:gap-3.5">
          <span className="bg-brand px-2 py-1 font-mono text-[10px] font-bold text-graphite lg:text-[11px]">
            A
          </span>
          <div className="flex h-3 flex-1 bg-surface-2 lg:h-3.5">
            <div className="w-[58%] bg-brand" />
            <div className="w-[42%] bg-rival" />
          </div>
          <span className="bg-rival px-2 py-1 font-mono text-[10px] font-bold text-[#0a1219] lg:text-[11px]">
            B
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-4 border-t border-hairline pt-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-[13px] leading-relaxed text-muted lg:text-sm">
            Récompense au vainqueur de chaque manche — nature à définir.
          </p>
          <Button href={SIGNUP_HREF} full className="shrink-0 lg:w-auto">
            M&apos;inscrire à la manche 01
          </Button>
        </div>
      </div>
    </section>
  );
}

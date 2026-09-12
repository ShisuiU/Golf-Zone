import { Button } from "@/components/ui/Button";
import { ACCOUNTS_ENABLED, CTA_HREF } from "@/lib/flags";

/**
 * Les duels arrivent après le partage : la section reste courte et annonce
 * clairement qu'elle n'est pas encore ouverte, sans afficher de faux score.
 */
export function Duels() {
  return (
    <section
      id="duels"
      className="relative border-b border-hairline bg-graphite-deep px-5 py-10 lg:px-16 lg:py-18"
    >
      <div className="mx-auto max-w-[860px]">
        <div className="mb-7 flex flex-col gap-3 lg:mb-9 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="bevel-sm inline-block bg-brand px-3 py-1.5 font-mono text-[9px] font-bold tracking-[0.07em] text-graphite lg:text-[10px]">
              Bientôt
            </span>
            <h2 className="mt-4 font-impact text-[28px] lg:text-[36px]">Les duels</h2>
          </div>
          <p className="max-w-[380px] text-sm leading-relaxed text-body lg:text-right lg:text-[15px]">
            Deux photos face à face, la communauté vote pour sa préférée. Une
            fonctionnalité en préparation — le site reste avant tout un espace
            de partage.
          </p>
        </div>

        <div className="panel p-4 lg:p-6">
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
              <div className="h-24 border border-brand/30 bg-[linear-gradient(150deg,#2e2119,#16191c)] lg:h-28" />
            </div>
            <div className="py-2.5 text-center font-impact text-xl lg:px-5 lg:py-0 lg:text-2xl">
              VS
            </div>
            <div className="flex-1">
              <p className="mb-2 font-cond text-sm font-semibold uppercase tracking-[0.04em] text-body lg:text-right">
                Photo B
              </p>
              <div className="h-24 border border-rival/30 bg-[linear-gradient(210deg,#152530,#16191c)] lg:h-28" />
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
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 text-center lg:mt-7">
          <p className="text-sm text-muted">
            En attendant, postez vos photos : elles pourront participer aux
            premiers duels.
          </p>
          {ACCOUNTS_ENABLED ? (
            <Button href={CTA_HREF} full className="lg:w-auto">
              Poster une photo
            </Button>
          ) : (
            <span className="border border-brand/40 px-5 py-3.5 font-cond text-base font-bold uppercase tracking-[0.06em] text-brand">
              Inscriptions bientôt ouvertes
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

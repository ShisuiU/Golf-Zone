import { Button } from "@/components/ui/Button";
import { SIGNUP_HREF } from "@/lib/content";

/** Emplacement photo d'un camp du duel. Teinté à la couleur du camp. */
function DuelSlot({ side }: { side: "a" | "b" }) {
  const tint =
    side === "a"
      ? "bg-[linear-gradient(150deg,#2e2119,#16191c)] border-brand/30"
      : "bg-[linear-gradient(210deg,#152530,#16191c)] border-rival/30";

  return <div className={`h-24 border lg:h-[122px] ${tint}`} />;
}

function SideTag({ side }: { side: "a" | "b" }) {
  return side === "a" ? (
    <span className="bg-brand px-1.5 py-0.5 font-mono text-[9px] font-bold text-graphite lg:text-[10px]">
      A
    </span>
  ) : (
    <span className="bg-rival px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#0a1219] lg:text-[10px]">
      B
    </span>
  );
}

/** Aperçu du relevé de duel. Aucun résultat : la manche 01 n'est pas ouverte. */
function DuelReadout() {
  return (
    <div className="panel p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between lg:mb-5">
        <span className="font-mono text-[10px] tracking-[0.07em] text-muted">
          Manche 01 — aperçu
        </span>
        <span className="border border-brand/50 px-2 py-1 font-mono text-[9px] font-bold text-brand lg:text-[10px]">
          Bientôt
        </span>
      </div>

      {/* Empilé sur mobile, face à face dès le desktop. */}
      <div className="flex flex-col lg:flex-row lg:items-center">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <SideTag side="a" />
            <span className="font-cond text-sm font-semibold uppercase tracking-[0.04em] text-body lg:text-[15px]">
              Mk7 GTI
            </span>
          </div>
          <DuelSlot side="a" />
        </div>

        <div className="py-2.5 text-center font-impact text-xl lg:px-[18px] lg:py-0 lg:text-[26px]">
          VS
        </div>

        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2 lg:justify-end">
            <SideTag side="b" />
            <span className="font-cond text-sm font-semibold uppercase tracking-[0.04em] text-body lg:order-first lg:text-[15px]">
              Mk2 GTI
            </span>
          </div>
          <DuelSlot side="b" />
        </div>
      </div>

      <div className="mt-5 border-t border-hairline pt-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.07em] text-muted">
            Relevé des votes
          </span>
          <span className="font-mono text-[10px] text-faint">— · —</span>
        </div>
        <div className="flex h-2.5 gap-0.5 bg-surface-2">
          <div className="flex-1 bg-[repeating-linear-gradient(90deg,rgba(249,115,22,0.25)_0_6px,transparent_6px_12px)]" />
          <div className="flex-1 bg-[repeating-linear-gradient(90deg,rgba(56,189,248,0.25)_0_6px,transparent_6px_12px)]" />
        </div>
        <p className="mt-2.5 font-mono text-[10px] text-faint">
          Vote fermé — ouverture à la manche 01
        </p>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="le-banc"
      className="relative flex flex-col gap-10 border-b border-hairline px-5 py-10 lg:flex-row lg:items-center lg:gap-14 lg:px-16 lg:pt-21 lg:pb-20"
    >
      <div className="lg:flex-[1.05]">
        <p className="mb-4 font-mono text-[10px] tracking-[0.15em] text-brand lg:mb-5 lg:text-[11px]">
          Banc d&apos;essai — dossier + duel
        </p>
        <h1 className="mb-5 font-impact text-[38px] leading-[1.08] text-pretty lg:mb-6 lg:text-[62px] lg:leading-[1.06]">
          Documentez.
          <br />
          Engagez.
          <br />
          <span className="text-brand">Départagez.</span>
        </h1>
        <p className="mb-7 max-w-[470px] text-[15px] leading-relaxed text-body lg:mb-8 lg:text-lg">
          Chaque Golf a son dossier technique. Chaque manche a son verdict. Les
          photos montent sur le banc, la communauté tranche.
        </p>
        <div className="mb-5 flex flex-col gap-3 lg:mb-6 lg:flex-row lg:gap-4">
          <Button href={SIGNUP_HREF} full className="lg:w-auto">
            Engager ma Golf
          </Button>
          <Button href="#roster" variant="secondary" full className="lg:w-auto">
            Voir le banc
          </Button>
        </div>
        <p className="font-mono text-[10px] tracking-[0.04em] text-faint lg:text-[11px]">
          GTI · GTD · R · TDI · Cabriolet — toutes finitions admises
        </p>
      </div>

      <div className="lg:flex-1">
        <DuelReadout />
      </div>
    </section>
  );
}

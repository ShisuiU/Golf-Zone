import { REGLEMENT, SEASON } from "@/lib/content";

/** Les trois places sont vides : aucune manche n'a encore été jouée. */
const PODIUM = [
  { rank: "01", leading: true },
  { rank: "02", leading: false },
  { rank: "03", leading: false },
];

export function Classement() {
  return (
    <section
      id="classement"
      className="relative border-b border-hairline px-5 py-10 lg:px-16 lg:py-20"
    >
      <div className="mb-5 flex flex-col gap-3 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="font-impact text-[26px] lg:text-4xl">
          <span className="lg:hidden">Classement — {SEASON.short}</span>
          <span className="hidden lg:inline">Classement — {SEASON.label}</span>
        </h2>
        <span className="self-start border border-white/15 px-2.5 py-1.5 font-mono text-[9px] tracking-[0.05em] text-faint lg:text-[10px]">
          Aperçu — aucune manche jouée
        </span>
      </div>

      <ol className="mb-6 flex flex-col gap-2.5 lg:mb-9 lg:gap-3">
        {PODIUM.map((row) => (
          <li
            key={row.rank}
            className={`flex items-center gap-4 border border-hairline bg-surface px-4.5 py-4 lg:gap-6 lg:px-6 lg:py-5 ${
              row.leading ? "border-l-[3px] border-l-brand" : "border-l-[3px] border-l-[#4a535d]"
            }`}
          >
            <span
              className={`min-w-[38px] font-impact text-2xl lg:min-w-[52px] lg:text-[28px] ${
                row.leading ? "text-brand" : "text-muted"
              }`}
            >
              {row.rank}
            </span>
            <span className="flex-1 font-cond text-[17px] font-semibold uppercase tracking-[0.04em] text-faint lg:text-[19px]">
              Place à prendre
            </span>
            <span className="font-mono text-[11px] text-faint lg:text-xs">— pts</span>
          </li>
        ))}
      </ol>

      <ul className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:gap-3.5">
        {REGLEMENT.map((article) => (
          <li
            key={article}
            className="border border-white/10 px-3 py-2.5 font-mono text-[10px] uppercase text-muted lg:px-3.5 lg:text-[11px]"
          >
            {article}
          </li>
        ))}
      </ul>
    </section>
  );
}

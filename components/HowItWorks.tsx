import { HOW_IT_WORKS, RULES } from "@/lib/content";

export function HowItWorks() {
  return (
    <section
      id="comment"
      className="relative border-b border-hairline px-5 py-10 lg:px-16 lg:py-18"
    >
      <h2 className="mb-7 font-impact text-[28px] lg:mb-10 lg:text-4xl">Comment ça marche</h2>

      <ol className="mb-8 grid grid-cols-1 gap-3 lg:mb-10 lg:grid-cols-3 lg:gap-5">
        {HOW_IT_WORKS.map((item) => (
          <li key={item.step} className="border border-hairline bg-surface p-5 lg:p-6">
            <p className="mb-2.5 font-impact text-[24px] text-brand lg:mb-3 lg:text-[30px]">
              {item.step}
            </p>
            <h3 className="mb-2 font-cond text-[19px] font-semibold uppercase tracking-[0.03em] lg:text-[21px]">
              {item.title}
            </h3>
            <p className="text-[13px] leading-relaxed text-muted lg:text-sm">{item.body}</p>
          </li>
        ))}
      </ol>

      <h3 className="mb-4 font-cond text-lg font-semibold uppercase tracking-[0.04em] text-body">
        Les règles
      </h3>
      <ul className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:gap-3">
        {RULES.map((rule) => (
          <li
            key={rule}
            className="border border-white/10 px-3 py-2.5 text-[13px] text-muted lg:px-3.5"
          >
            {rule}
          </li>
        ))}
      </ul>
    </section>
  );
}

import { Button } from "@/components/ui/Button";
import { SITE_NAME } from "@/lib/content";
import { CTA_HREF } from "@/lib/flags";

export function SiteFooter() {
  return (
    <section className="relative px-5 pt-11 pb-8 text-center lg:px-16 lg:pt-20 lg:pb-11">
      <h2 className="mb-3 font-impact text-[27px] leading-tight text-pretty lg:mb-3.5 lg:text-[40px]">
Rejoignez la communauté.
      </h2>
      <p className="mb-6 text-sm text-muted lg:mb-7.5 lg:text-base">
Créez votre compte et postez votre première photo.
      </p>
      <Button href={CTA_HREF} full className="lg:w-auto lg:px-9">
        Créer mon compte
      </Button>

      <footer className="mt-13 flex flex-col gap-1.5 border-t border-hairline pt-6 lg:mt-19 lg:flex-row lg:items-center lg:justify-between">
        <span className="font-mono text-[10px] uppercase text-faint lg:text-[11px]">
          {SITE_NAME} — projet de fans
        </span>
        <span className="font-mono text-[10px] uppercase text-faint lg:text-[11px]">
          Non affilié à Volkswagen AG
        </span>
      </footer>
    </section>
  );
}

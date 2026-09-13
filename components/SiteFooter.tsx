import Link from "next/link";
import { SITE_NAME } from "@/lib/content";

/** Pied de page commun : la mention d'indépendance et les pages légales. */
export function SiteFooter() {
  // `mt-auto` colle le pied au bas de la fenêtre sur les pages courtes ; le
  // `pt-10` garantit l'écart quand la page, elle, est longue.
  return (
    <footer className="mt-auto pt-10">
      <div className="flex flex-col items-center gap-2 border-t border-hairline pt-6 text-center">
        <p className="font-mono text-[10px] uppercase text-faint">
          {SITE_NAME} — projet de fans · Non affilié à Volkswagen AG
        </p>
        <p className="flex flex-wrap justify-center gap-x-1 gap-y-1 text-[13px] text-muted">
          <Link
            href="/mentions"
            className="inline-flex min-h-[44px] items-center px-3 hover:text-ink"
          >
            Mentions légales
          </Link>
          <Link
            href="/confidentialite"
            className="inline-flex min-h-[44px] items-center px-3 hover:text-ink"
          >
            Confidentialité
          </Link>
          <Link
            href="/membres"
            className="inline-flex min-h-[44px] items-center px-3 hover:text-ink"
          >
            Les membres
          </Link>
        </p>
      </div>
    </footer>
  );
}

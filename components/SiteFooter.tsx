import Link from "next/link";
import { SITE_NAME } from "@/lib/content";

/** Pied de page commun : la mention d'indépendance et les pages légales. */
export function SiteFooter() {
  return (
    <footer className="mt-10 flex flex-col items-center gap-2 border-t border-hairline pt-6 text-center">
      <p className="font-mono text-[10px] uppercase text-faint">
        {SITE_NAME} — projet de fans · Non affilié à Volkswagen AG
      </p>
      <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] text-muted">
        <Link href="/mentions" className="hover:text-ink">
          Mentions légales
        </Link>
        <Link href="/confidentialite" className="hover:text-ink">
          Confidentialité
        </Link>
        <Link href="/membres" className="hover:text-ink">
          Les membres
        </Link>
      </p>
    </footer>
  );
}

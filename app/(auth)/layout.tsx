import Link from "next/link";
import { SITE_NAME } from "@/lib/content";

/** Cadre commun aux pages inscription / connexion : un panneau centré, sans nav. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[520px] flex-col justify-center px-5 py-12">
        <Link href="/" className="mb-8 flex items-center gap-3 self-start hover:text-ink">
          <span className="font-impact text-lg text-ink">{SITE_NAME.toUpperCase()}</span>
        </Link>
        {children}
      </div>
    </div>
  );
}

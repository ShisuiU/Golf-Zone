import { Classement } from "@/components/Classement";
import { Hero } from "@/components/Hero";
import { Manche } from "@/components/Manche";
import { Roster } from "@/components/Roster";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Grille technique : décorative, sous le contenu. */}
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />

      <SiteHeader />
      <main>
        <Hero />
        <div aria-hidden="true" className="livery relative h-2.5 opacity-50" />
        <Roster />
        <Manche />
        <Classement />
        <SiteFooter />
      </main>
    </div>
  );
}

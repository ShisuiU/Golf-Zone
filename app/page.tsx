import { Duels } from "@/components/Duels";
import { Feed } from "@/components/Feed";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default async function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Grille technique : décorative, sous le contenu. */}
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />

      <SiteHeader />
      <main>
        <Hero />
        <div aria-hidden="true" className="livery relative h-2.5 opacity-50" />
        <Feed />
        <HowItWorks />
        <Duels />
        <SiteFooter />
      </main>
    </div>
  );
}

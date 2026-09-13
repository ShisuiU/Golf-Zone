import type { Metadata } from "next";
import { PageShell, Section } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Mentions légales — Zone Golf",
  description: "Éditeur, hébergeur et conditions d'utilisation de Zone Golf.",
};

export default function MentionsPage() {
  return (
    <PageShell title="Mentions légales">
      <Section title="Éditeur">
        <p>
          Zone Golf est un site communautaire non commercial, édité par un particulier.
        </p>
        <p className="border border-hairline bg-surface p-4 font-mono text-[13px] text-muted">
          À compléter : nom de l&apos;éditeur et adresse de contact. La loi impose de
          les publier ; tant qu&apos;ils manquent, cette page est incomplète.
        </p>
      </Section>

      <Section title="Hébergement">
        <p>
          Le site est hébergé par <strong className="text-ink">Vercel Inc.</strong> (
          <a href="https://vercel.com" className="underline">
            vercel.com
          </a>
          ). Les données sont conservées dans une base <strong className="text-ink">Neon</strong>{" "}
          située dans l&apos;Union européenne (région de Francfort).
        </p>
      </Section>

      <Section title="Marques">
        <p>
          Volkswagen et Golf sont des marques déposées de Volkswagen AG. Zone Golf est un
          projet de passionnés, <strong className="text-ink">sans aucun lien</strong> avec
          Volkswagen AG, et n&apos;utilise ni son logo ni ses visuels officiels.
        </p>
      </Section>

      <Section title="Contenus publiés">
        <p>
          Les photos et les textes publiés restent la propriété de leurs auteurs. En les
          publiant, un membre autorise leur affichage sur le site ; il peut les retirer à
          tout moment, et supprimer son compte efface tout ce qu&apos;il a publié.
        </p>
        <p>
          Ne publiez que des photos que vous avez prises ou dont vous avez le droit
          d&apos;usage, et floutez les plaques si vous préférez. Les contenus illicites,
          publicitaires ou visant des personnes sont retirés.
        </p>
      </Section>

      <Section title="Signalement">
        <p>
          Pour signaler un contenu ou demander le retrait d&apos;une photo vous concernant,
          écrivez à l&apos;adresse de contact indiquée ci-dessus.
        </p>
      </Section>
    </PageShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, Section } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Confidentialité — Zone Golf",
  description: "Ce que Zone Golf collecte, pourquoi, et comment tout effacer.",
};

export default function ConfidentialitePage() {
  return (
    <PageShell title="Confidentialité">
      <p>
        Zone Golf ne vit pas de vos données : pas de publicité, pas de revente, pas de
        mesure d&apos;audience, aucun traceur tiers. Voici, précisément, ce que le site
        conserve.
      </p>

      <Section title="Ce qui est collecté">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong className="text-ink">Nécessaire au compte</strong> : votre e-mail, votre
            pseudo et votre mot de passe — ce dernier n&apos;est jamais conservé en clair,
            seule une empreinte calculée avec scrypt l&apos;est.
          </li>
          <li>
            <strong className="text-ink">Facultatif</strong> : photo de profil, bio, voiture,
            ville, année de naissance. Rien de tout cela n&apos;est demandé pour utiliser le
            site.
          </li>
          <li>
            <strong className="text-ink">Ce que vous publiez</strong> : photos, publications,
            commentaires, likes.
          </li>
          <li>
            <strong className="text-ink">Votre adresse IP</strong>, uniquement pour compter les
            connexions ratées et les inscriptions, et empêcher qu&apos;un automate ne sature le
            site. Elle n&apos;est associée à aucun compte, ne sert à rien d&apos;autre, et est
            effacée au plus tard sept jours après le dernier essai.
          </li>
        </ul>
      </Section>

      <Section title="Cookies">
        <p>
          Un seul cookie, <span className="font-mono text-[13px] text-ink">zg_session</span>,
          qui sert uniquement à vous garder connecté pendant 30 jours. Il ne contient qu&apos;un
          jeton aléatoire, pas vos informations. Comme il est strictement nécessaire au
          fonctionnement du site, il n&apos;y a pas de bandeau à cliquer.
        </p>
      </Section>

      <Section title="Où vivent ces données">
        <p>
          Dans une base PostgreSQL hébergée par Neon dans l&apos;Union européenne (région de
          Francfort). Le site lui-même est servi par Vercel. Personne d&apos;autre n&apos;y a
          accès, et aucune donnée n&apos;est transmise à un service tiers.
        </p>
      </Section>

      <Section title="Combien de temps">
        <p>
          Tant que votre compte existe. Une session expire au bout de 30 jours ; changer de
          mot de passe déconnecte tous les appareils. Un ménage quotidien efface les sessions
          périmées, les liens de confirmation déjà utilisés et les compteurs devenus inutiles.
        </p>
      </Section>

      <Section title="Vos droits">
        <p>
          Vous pouvez consulter et corriger votre fiche à tout moment depuis votre{" "}
          <Link href="/profil" className="underline">
            profil
          </Link>
          , supprimer une publication ou un commentaire d&apos;un clic, et{" "}
          <Link href="/compte" className="underline">
            supprimer votre compte
          </Link>{" "}
          — ce qui efface définitivement vos publications, vos photos, vos commentaires et
          vos likes.
        </p>
        <p>
          Pour toute autre demande, l&apos;adresse de contact figure dans les{" "}
          <Link href="/mentions" className="underline">
            mentions légales
          </Link>
          .
        </p>
      </Section>
    </PageShell>
  );
}

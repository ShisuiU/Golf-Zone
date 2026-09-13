import type { Metadata } from "next";
import { FeedPage } from "@/components/feed/FeedPage";

export const metadata: Metadata = {
  title: "Le fil — Zone Golf",
  description: "Les dernières publications des propriétaires de Golf.",
};

/**
 * Le fil, à une adresse à lui.
 *
 * Depuis que la page d'accueil raconte le site aux visiteurs, ceux-ci n'ont
 * plus le fil sous les yeux en arrivant. Cette route le leur rend, sans
 * compte : on peut tout lire avant de décider de s'inscrire.
 */
export default async function FilPage({
  searchParams,
}: {
  searchParams: Promise<{ avant?: string }>;
}) {
  return <FeedPage base="/fil" searchParams={searchParams} />;
}

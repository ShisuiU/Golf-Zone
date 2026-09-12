import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSessionUser } from "@/lib/session";
import type { User } from "@/lib/db";

/**
 * Couche d'accès aux données : tout ce qui a besoin de savoir qui est connecté
 * passe par ici. `cache` mémorise le résultat pour la durée d'un rendu, donc
 * plusieurs composants peuvent interroger la session sans requête en double.
 */
export const getCurrentUser = cache(async (): Promise<User | undefined> => {
  return readSessionUser();
});

/** Pour une page ou une action réservée aux membres : redirige si non connecté. */
export const requireUser = cache(async (): Promise<User> => {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
});

/**
 * Règles d'une publication, partagées par le formulaire et l'action serveur.
 *
 * Ces constantes vivent hors du fichier "use server" : celui-ci ne peut
 * exporter que des fonctions asynchrones.
 */
export const GENERATIONS = ["Mk1", "Mk2", "Mk3", "Mk4", "Mk5", "Mk6", "Mk7", "Mk8"] as const;
export type Generation = (typeof GENERATIONS)[number];

export const MAX_CAPTION = 500;
export const MAX_COMMENT = 300;

export function isGeneration(value: string): value is Generation {
  return (GENERATIONS as readonly string[]).includes(value);
}

/**
 * Règles de la fiche de profil, partagées par le formulaire et le serveur.
 *
 * Tout est facultatif : un membre peut très bien poster sans rien remplir.
 */

export const MAX_BIO = 300;
export const MAX_CAR = 60;
export const MAX_CITY = 60;

/** Bornes de l'année de naissance, pour écarter les saisies absurdes. */
export const MIN_AGE = 13;
export const MAX_AGE = 110;

export function ageFromBirthYear(birthYear: number, today = new Date()): number {
  // Sans la date complète, l'âge est celui atteint dans l'année : c'est la
  // précision qu'on demande à un profil, et on ne collecte pas plus.
  return today.getFullYear() - birthYear;
}

export type ProfileFields = {
  bio: string;
  car: string;
  city: string;
  birthYear: number | null;
};

export type ProfileErrors = Partial<Record<"bio" | "car" | "city" | "birthYear" | "form", string>>;

/**
 * Valide et normalise les champs bruts du formulaire. Renvoie les erreurs
 * plutôt que de lever : la page les réaffiche à côté des champs.
 */
export function readProfileFields(form: {
  bio: string;
  car: string;
  city: string;
  birthYear: string;
}): { fields: ProfileFields; errors: ProfileErrors } {
  const errors: ProfileErrors = {};
  const bio = form.bio.trim();
  const car = form.car.trim();
  const city = form.city.trim();
  const raw = form.birthYear.trim();

  if (bio.length > MAX_BIO) errors.bio = `${MAX_BIO} caractères maximum.`;
  if (car.length > MAX_CAR) errors.car = `${MAX_CAR} caractères maximum.`;
  if (city.length > MAX_CITY) errors.city = `${MAX_CITY} caractères maximum.`;

  let birthYear: number | null = null;
  if (raw !== "") {
    const year = Number(raw);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(year)) {
      errors.birthYear = "Indiquez une année, par exemple 1998.";
    } else if (year > currentYear - MIN_AGE || year < currentYear - MAX_AGE) {
      errors.birthYear = `Année attendue entre ${currentYear - MAX_AGE} et ${currentYear - MIN_AGE}.`;
    } else {
      birthYear = year;
    }
  }

  return { fields: { bio, car, city, birthYear }, errors };
}

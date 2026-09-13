"use server";

import { revalidatePath } from "next/cache";
import { setAvatar, updateProfile } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { ACCOUNTS_ENABLED } from "@/lib/flags";
import { validatePhoto } from "@/lib/photo";
import { readProfileFields, type ProfileErrors } from "@/lib/profile";

export type ProfileState = {
  errors?: ProfileErrors;
  values?: { bio: string; car: string; city: string; birthYear: string };
  ok?: boolean;
};

export async function saveProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  // Comme les autres actions : une requête directe reste possible même quand
  // la page est fermée.
  if (!ACCOUNTS_ENABLED) {
    return { errors: { form: "Les profils ne sont pas encore ouverts." } };
  }

  const user = await requireUser();
  const values = {
    bio: String(formData.get("bio") ?? ""),
    car: String(formData.get("car") ?? ""),
    city: String(formData.get("city") ?? ""),
    birthYear: String(formData.get("birthYear") ?? ""),
  };

  const { fields, errors } = readProfileFields(values);

  // Un champ fichier vide signifie « ne change rien », pas « photo manquante ».
  const file = formData.get("avatar") as File | null;
  const newAvatar = file && file.size > 0 ? await validatePhoto(file) : null;
  if (newAvatar && !newAvatar.ok) errors.avatar = newAvatar.error;

  if (Object.keys(errors).length > 0) return { errors, values };

  try {
    await updateProfile(user.id, fields);
    if (newAvatar?.ok) {
      await setAvatar(user.id, { data: newAvatar.data, mime: newAvatar.mime });
    }
  } catch (error) {
    console.error("Profil non enregistré :", error);
    return { errors: { form: "Enregistrement impossible. Réessayez." }, values };
  }

  // La photo de profil apparaît partout où le membre est cité.
  revalidatePath("/", "layout");
  return { ok: true };
}

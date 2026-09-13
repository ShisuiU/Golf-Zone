"use server";

import { revalidatePath } from "next/cache";
import { updateProfile } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { ACCOUNTS_ENABLED } from "@/lib/flags";
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
  if (Object.keys(errors).length > 0) return { errors, values };

  try {
    await updateProfile(user.id, fields);
  } catch (error) {
    console.error("Profil non enregistré :", error);
    return { errors: { form: "Enregistrement impossible. Réessayez." }, values };
  }

  revalidatePath("/profil");
  revalidatePath(`/membre/${user.handle}`);
  return { ok: true };
}

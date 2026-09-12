"use server";

import { revalidatePath } from "next/cache";
import { createDossier, deleteDossierOwnedBy } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { ACCOUNTS_ENABLED } from "@/lib/flags";
import { validatePhoto } from "@/lib/photo";
import { isGeneration, MAX_CAPTION } from "@/lib/dossier";

export type DossierState = {
  errors?: Record<string, string>;
  values?: { model?: string; caption?: string };
  ok?: boolean;
};

export async function publishDossier(
  _prev: DossierState,
  formData: FormData,
): Promise<DossierState> {
  if (!ACCOUNTS_ENABLED) {
    return { errors: { form: "Le dépôt de dossiers n'est pas encore ouvert." } };
  }

  const user = await requireUser();
  const model = String(formData.get("model") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const values = { model, caption };
  const errors: Record<string, string> = {};

  if (!isGeneration(model)) {
    errors.model = "Choisissez une génération.";
  }
  if (caption.length > MAX_CAPTION) {
    errors.caption = `${MAX_CAPTION} caractères maximum.`;
  }

  const photo = await validatePhoto(formData.get("photo") as File | null);
  if (!photo.ok) errors.photo = photo.error;

  if (Object.keys(errors).length > 0 || !photo.ok) {
    return { errors, values };
  }

  await createDossier({
    userId: user.id,
    model,
    caption,
    photo: { data: photo.data, mime: photo.mime },
  });

  // Le garage et le feed de la landing affichent tous deux ces dossiers.
  revalidatePath("/garage");
  revalidatePath("/");
  return { ok: true };
}

export async function removeDossier(formData: FormData): Promise<void> {
  if (!ACCOUNTS_ENABLED) return;

  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  // La requête filtre sur le propriétaire : un identifiant deviné ne suffit pas.
  await deleteDossierOwnedBy(id, user.id);
  revalidatePath("/garage");
  revalidatePath("/");
}

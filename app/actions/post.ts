"use server";

import { revalidatePath } from "next/cache";
import { createPost, deletePostOwnedBy } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { ACCOUNTS_ENABLED } from "@/lib/flags";
import { validatePhoto } from "@/lib/photo";
import { isGeneration, MAX_CAPTION } from "@/lib/post";

export type PostState = {
  errors?: Record<string, string>;
  values?: { model?: string; caption?: string };
  ok?: boolean;
};

export async function publishPost(
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  if (!ACCOUNTS_ENABLED) {
    return { errors: { form: "Les publications ne sont pas encore ouvertes." } };
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

  await createPost({
    userId: user.id,
    model,
    caption,
    photo: { data: photo.data, mime: photo.mime },
  });

  // Le profil et le fil d'accueil affichent tous deux ces publications.
  revalidatePath("/profil");
  revalidatePath("/");
  return { ok: true };
}

export async function removePost(formData: FormData): Promise<void> {
  if (!ACCOUNTS_ENABLED) return;

  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  // La requête filtre sur le propriétaire : un identifiant deviné ne suffit pas.
  await deletePostOwnedBy(id, user.id);
  revalidatePath("/profil");
  revalidatePath("/");
}

"use server";

import { revalidatePath } from "next/cache";
import { addComment, createPost, deleteCommentOwnedBy, deletePostOwnedBy, toggleLike } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { ACCOUNTS_ENABLED } from "@/lib/flags";
import { validatePhoto } from "@/lib/photo";
import { isGeneration, MAX_CAPTION, MAX_COMMENT } from "@/lib/post";

export type PostState = {
  errors?: Record<string, string>;
  values?: { model?: string; caption?: string };
  ok?: boolean;
};

/**
 * Une Server Action reste appelable par requête directe même si la page qui
 * l'expose répond 404 : la garde doit donc être ici aussi.
 */
const CLOSED: PostState = { errors: { form: "Les publications ne sont pas encore ouvertes." } };

/** Publier une photo ou une question. */
export async function publishPost(_prev: PostState, formData: FormData): Promise<PostState> {
  if (!ACCOUNTS_ENABLED) return CLOSED;

  const user = await requireUser();
  const rawModel = String(formData.get("model") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const values = { model: rawModel, caption };
  const errors: Record<string, string> = {};

  // La génération est facultative : on poste aussi bien une question.
  if (rawModel && !isGeneration(rawModel)) {
    errors.model = "Génération inconnue.";
  }
  if (caption.length > MAX_CAPTION) {
    errors.caption = `${MAX_CAPTION} caractères maximum.`;
  }

  const file = formData.get("photo") as File | null;
  const hasPhoto = Boolean(file && file.size > 0);
  const photo = hasPhoto ? await validatePhoto(file) : null;
  if (photo && !photo.ok) errors.photo = photo.error;

  // Une publication vide n'a rien à montrer.
  if (!hasPhoto && !caption) {
    errors.form = "Écrivez quelque chose ou ajoutez une photo.";
  }

  if (Object.keys(errors).length > 0) return { errors, values };

  await createPost({
    userId: user.id,
    model: rawModel || null,
    caption,
    photo: photo && photo.ok ? { data: photo.data, mime: photo.mime } : undefined,
  });

  revalidatePath("/");
  revalidatePath("/profil");
  return { ok: true };
}

export async function removePost(formData: FormData): Promise<void> {
  if (!ACCOUNTS_ENABLED) return;
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  // La requête filtre sur le propriétaire : un identifiant deviné ne suffit pas.
  await deletePostOwnedBy(id, user.id);
  revalidatePath("/");
  revalidatePath("/profil");
}

/** Aime / n'aime plus. Renvoie l'état pour que le bouton se cale dessus. */
export async function likePost(postId: number): Promise<{ liked: boolean } | null> {
  if (!ACCOUNTS_ENABLED) return null;
  const user = await requireUser();
  if (!Number.isInteger(postId)) return null;

  const liked = await toggleLike(postId, user.id);
  revalidatePath("/");
  revalidatePath("/profil");
  return { liked };
}

export type CommentState = { error?: string };

export async function commentPost(
  _prev: CommentState,
  formData: FormData,
): Promise<CommentState> {
  if (!ACCOUNTS_ENABLED) return { error: "Les commentaires ne sont pas encore ouverts." };

  const user = await requireUser();
  const postId = Number(formData.get("postId"));
  const body = String(formData.get("body") ?? "").trim();

  if (!Number.isInteger(postId)) return { error: "Publication introuvable." };
  if (!body) return { error: "Écrivez votre commentaire." };
  if (body.length > MAX_COMMENT) return { error: `${MAX_COMMENT} caractères maximum.` };

  await addComment(postId, user.id, body);
  revalidatePath("/");
  revalidatePath("/profil");
  return {};
}

export async function removeComment(formData: FormData): Promise<void> {
  if (!ACCOUNTS_ENABLED) return;
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await deleteCommentOwnedBy(id, user.id);
  revalidatePath("/");
  revalidatePath("/profil");
}

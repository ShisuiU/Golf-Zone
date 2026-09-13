"use server";

import { revalidatePath } from "next/cache";
import {
  addReport,
  closeReport,
  deleteCommentAsModerator,
  deletePostAsModerator,
} from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { ACCOUNTS_ENABLED, isModerator } from "@/lib/flags";

export type ReportState = { ok?: boolean; error?: string };

const MAX_REASON = 300;

/**
 * Signaler une publication ou un commentaire. Réservé aux membres : un
 * signalement anonyme ne se recoupe avec rien et invite au harcèlement.
 */
export async function reportContent(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  if (!ACCOUNTS_ENABLED) return { error: "Indisponible." };

  const user = await requireUser();
  const postId = Number(formData.get("postId"));
  const commentId = Number(formData.get("commentId"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) return { error: "Dites en un mot ce qui pose problème." };
  if (reason.length > MAX_REASON) return { error: `${MAX_REASON} caractères maximum.` };

  const target = Number.isInteger(postId) && postId > 0
    ? { postId }
    : Number.isInteger(commentId) && commentId > 0
      ? { commentId }
      : undefined;
  if (!target) return { error: "Contenu introuvable." };

  try {
    await addReport({ reporterId: user.id, reason, ...target });
  } catch (error) {
    console.error("Signalement non enregistré :", error);
    return { error: "Enregistrement impossible. Réessayez." };
  }
  return { ok: true };
}

/** Garde commune aux actions de modération. */
async function requireModerator() {
  const user = await requireUser();
  if (!isModerator(user.handle)) {
    // Une Server Action reste appelable même si la page est cachée.
    throw new Error("Réservé à la modération.");
  }
  return user;
}

export async function dismissReport(formData: FormData): Promise<void> {
  if (!ACCOUNTS_ENABLED) return;
  await requireModerator();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await closeReport(id);
  revalidatePath("/moderation");
}

/** Supprime le contenu signalé. Le signalement se ferme avec lui (cascade). */
export async function removeReported(formData: FormData): Promise<void> {
  if (!ACCOUNTS_ENABLED) return;
  await requireModerator();
  const postId = Number(formData.get("postId"));
  const commentId = Number(formData.get("commentId"));

  if (Number.isInteger(postId) && postId > 0) await deletePostAsModerator(postId);
  else if (Number.isInteger(commentId) && commentId > 0) await deleteCommentAsModerator(commentId);
  else return;

  revalidatePath("/moderation");
  revalidatePath("/", "layout");
}

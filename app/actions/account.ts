"use server";

import { redirect } from "next/navigation";
import { deleteUser, findPasswordHash, updatePassword, deleteSessionsOfUser } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { ACCOUNTS_ENABLED } from "@/lib/flags";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/session";

export type AccountState = {
  errors?: Partial<Record<"current" | "password" | "confirm" | "form", string>>;
  ok?: boolean;
};

const MIN_PASSWORD = 8;

/**
 * Changement de mot de passe. L'ancien est redemandé : sans cela, un appareil
 * resté ouvert suffirait à prendre le compte définitivement.
 */
export async function changePassword(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  if (!ACCOUNTS_ENABLED) return { errors: { form: "Les comptes ne sont pas ouverts." } };

  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const errors: AccountState["errors"] = {};
  if (password.length < MIN_PASSWORD) errors.password = `Au moins ${MIN_PASSWORD} caractères.`;
  if (password !== confirm) errors.confirm = "Les deux saisies diffèrent.";

  const hash = await findPasswordHash(user.id);
  if (!hash || !(await verifyPassword(current, hash))) {
    errors.current = "Mot de passe actuel incorrect.";
  }
  if (Object.keys(errors).length > 0) return { errors };

  await updatePassword(user.id, await hashPassword(password));

  // Toutes les sessions tombent — y compris celle-ci, qu'on rouvre aussitôt :
  // changer son mot de passe doit déconnecter les appareils qu'on ne tient plus.
  await deleteSessionsOfUser(user.id);
  await createSession(user.id);
  return { ok: true };
}

export type DeleteState = { error?: string };

/** Suppression du compte, confirmée par le mot de passe. */
export async function deleteAccount(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  if (!ACCOUNTS_ENABLED) return { error: "Les comptes ne sont pas ouverts." };

  const user = await requireUser();
  const password = String(formData.get("deletePassword") ?? "");
  const confirm = String(formData.get("deleteConfirm") ?? "").trim();

  if (confirm.toUpperCase() !== "SUPPRIMER") {
    return { error: "Écrivez SUPPRIMER pour confirmer." };
  }
  const hash = await findPasswordHash(user.id);
  if (!hash || !(await verifyPassword(password, hash))) {
    return { error: "Mot de passe incorrect." };
  }

  await deleteUser(user.id);
  await destroySession();
  redirect("/");
}

"use client";

import { useActionState, useState } from "react";
import { deleteAccount, type DeleteState } from "@/app/actions/account";
import { Field } from "@/components/auth/Field";

const EMPTY: DeleteState = {};

/**
 * Suppression du compte. Repliée derrière un bouton, puis confirmée par le
 * mot de passe et un mot à recopier : c'est irréversible, et le nombre de
 * gestes doit correspondre à ce que l'action coûte.
 */
export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteAccount, EMPTY);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pressable min-h-[44px] cursor-pointer self-start font-cond text-sm font-semibold uppercase tracking-[0.06em] text-muted hover:text-brand"
      >
        Supprimer mon compte
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5 border border-brand/40 p-5" noValidate>
      <h2 className="font-cond text-lg font-semibold uppercase tracking-[0.03em] text-brand">
        Supprimer mon compte
      </h2>
      <p className="text-[15px] leading-relaxed text-body">
        Vos publications, vos photos, vos commentaires et vos likes seront effacés
        définitivement. Il n&apos;y a pas de retour en arrière.
      </p>

      {/* Noms distincts de ceux du changement de mot de passe : les deux
          formulaires vivent sur la même page, et deux champs de même `id`
          feraient pointer les libellés au mauvais endroit. */}
      <Field
        label="Mot de passe"
        name="deletePassword"
        type="password"
        autoComplete="current-password"
      />
      <Field label="Écrivez SUPPRIMER pour confirmer" name="deleteConfirm" autoComplete="off" />

      {state.error ? <p className="font-mono text-xs text-brand">{state.error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="pressable min-h-[46px] cursor-pointer border border-brand px-6 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-brand hover:bg-brand/10 disabled:opacity-60"
        >
          {pending ? "Suppression…" : "Supprimer définitivement"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="pressable min-h-[46px] cursor-pointer px-2 font-cond text-sm font-semibold uppercase tracking-[0.06em] text-muted hover:text-ink"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

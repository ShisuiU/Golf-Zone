"use client";

import { useActionState } from "react";
import { resendVerification, type VerifyState } from "@/app/actions/account";

const EMPTY: VerifyState = {};

/** Rappel de confirmation d'adresse, montré tant qu'elle ne l'est pas. */
export function VerifyEmail() {
  const [state, formAction, pending] = useActionState(resendVerification, EMPTY);

  if (state.sent) {
    return (
      <p role="status" className="border border-hairline bg-surface p-4 text-[15px] text-body">
        Lien envoyé. Ouvrez-le depuis votre boîte pour confirmer votre adresse.
      </p>
    );
  }

  return (
    <form action={formAction} className="border border-hairline bg-surface p-4">
      <p className="text-[15px] leading-relaxed text-body">
        Votre adresse n&apos;est pas confirmée. Sans elle, vous ne pourrez pas récupérer
        votre compte en cas d&apos;oubli du mot de passe.
      </p>
      {state.error ? (
        <p className="mt-2 font-mono text-xs text-brand">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 min-h-[44px] cursor-pointer border border-hairline-strong px-5 font-cond text-sm font-semibold uppercase tracking-[0.06em] text-ink disabled:opacity-60"
      >
        {pending ? "Envoi…" : "Recevoir le lien de confirmation"}
      </button>
    </form>
  );
}

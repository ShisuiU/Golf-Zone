"use client";

import { useActionState } from "react";
import { resetPassword, type ResetState } from "@/app/actions/password";
import { Field } from "@/components/auth/Field";
import { SubmitButton } from "@/components/auth/SubmitButton";

const EMPTY: ResetState = {};

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, EMPTY);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {/* Le jeton voyage avec le formulaire : il n'est pas dans la session. */}
      <input type="hidden" name="token" value={token} />
      <Field
        label="Nouveau mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="8 caractères minimum."
        error={state.errors?.password}
      />
      <Field
        label="Confirmer"
        name="confirm"
        type="password"
        autoComplete="new-password"
        error={state.errors?.confirm}
      />
      {state.errors?.form ? (
        <p className="border border-brand/40 bg-brand/10 px-3 py-2.5 font-mono text-xs text-brand">
          {state.errors.form}
        </p>
      ) : null}
      <SubmitButton pending={pending} pendingLabel="Enregistrement…">
        Choisir ce mot de passe
      </SubmitButton>
    </form>
  );
}

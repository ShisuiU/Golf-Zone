"use client";

import { useActionState } from "react";
import { signup, type AuthState } from "@/app/actions/auth";
import { Field } from "@/components/auth/Field";
import { SubmitButton } from "@/components/auth/SubmitButton";

const EMPTY: AuthState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, EMPTY);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <Field
        label="Pseudo"
        name="handle"
        autoComplete="username"
        prefix="@"
        hint="C'est le nom affiché sur vos dossiers et dans les duels."
        defaultValue={state.values?.handle}
        error={state.errors?.handle}
      />
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="8 caractères minimum."
        error={state.errors?.password}
      />
      {state.errors?.form ? (
        <p className="border border-brand/40 bg-brand/10 px-3 py-2.5 font-mono text-xs text-brand">
          {state.errors.form}
        </p>
      ) : null}
      <SubmitButton pending={pending} pendingLabel="Création…">
        Ouvrir mon dossier
      </SubmitButton>
    </form>
  );
}

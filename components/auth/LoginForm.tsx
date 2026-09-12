"use client";

import { useActionState } from "react";
import { login, type AuthState } from "@/app/actions/auth";
import { Field } from "@/components/auth/Field";
import { SubmitButton } from "@/components/auth/SubmitButton";

const EMPTY: AuthState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, EMPTY);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
      />
      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
      />
      {state.errors?.form ? (
        <p className="border border-brand/40 bg-brand/10 px-3 py-2.5 font-mono text-xs text-brand">
          {state.errors.form}
        </p>
      ) : null}
      <SubmitButton pending={pending} pendingLabel="Connexion…">
        Entrer sur le banc
      </SubmitButton>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { changePassword, type AccountState } from "@/app/actions/account";
import { Field } from "@/components/auth/Field";

const EMPTY: AccountState = {};

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, EMPTY);

  return (
    <form action={formAction} className="panel flex flex-col gap-5 p-5 lg:p-6" noValidate>
      <h2 className="font-cond text-lg font-semibold uppercase tracking-[0.03em]">
        Changer mon mot de passe
      </h2>

      <Field
        label="Mot de passe actuel"
        name="current"
        type="password"
        autoComplete="current-password"
        error={state.errors?.current}
      />
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

      {state.ok ? (
        <p role="status" className="font-mono text-xs text-brand">
          Mot de passe changé. Vos autres appareils ont été déconnectés.
        </p>
      ) : null}
      {state.errors?.form ? (
        <p className="font-mono text-xs text-brand">{state.errors.form}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="pressable bevel-sm min-h-[46px] cursor-pointer self-start bg-brand px-6 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-graphite disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Changer"}
      </button>
    </form>
  );
}

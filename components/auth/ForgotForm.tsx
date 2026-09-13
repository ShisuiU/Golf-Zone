"use client";

import { useActionState } from "react";
import { requestReset, type ForgotState } from "@/app/actions/password";
import { Field } from "@/components/auth/Field";
import { SubmitButton } from "@/components/auth/SubmitButton";

const EMPTY: ForgotState = {};

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(requestReset, EMPTY);

  if (state.sent) {
    return (
      <p role="status" className="text-[15px] leading-relaxed text-body">
        Si un compte existe avec cette adresse, un lien vient d&apos;y être envoyé. Il est
        valable une heure. Pensez à regarder dans les indésirables.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        hint="Celui de votre compte."
      />
      {state.error ? (
        <p className="border border-brand/40 bg-brand/10 px-3 py-2.5 font-mono text-xs text-brand">
          {state.error}
        </p>
      ) : null}
      <SubmitButton pending={pending} pendingLabel="Envoi…">
        Recevoir un lien
      </SubmitButton>
    </form>
  );
}

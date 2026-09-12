"use client";

import { useActionState } from "react";
import { publishDossier, type DossierState } from "@/app/actions/dossier";
import { PhotoField } from "@/components/garage/PhotoField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { GENERATIONS, MAX_CAPTION } from "@/lib/dossier";

const EMPTY: DossierState = {};

export function DossierForm() {
  const [state, formAction, pending] = useActionState(publishDossier, EMPTY);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <PhotoField error={state.errors?.photo} />

      <div className="flex flex-col gap-2">
        <label
          htmlFor="model"
          className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted"
        >
          Génération
        </label>
        <select
          id="model"
          name="model"
          defaultValue={state.values?.model ?? ""}
          aria-invalid={state.errors?.model ? true : undefined}
          aria-describedby={state.errors?.model ? "model-error" : undefined}
          className="min-h-[50px] w-full cursor-pointer border border-hairline bg-graphite px-3 font-body text-[15px] text-ink outline-none focus:border-brand"
        >
          <option value="">— choisir —</option>
          {GENERATIONS.map((g) => (
            <option key={g} value={g}>
              Golf {g}
            </option>
          ))}
        </select>
        {state.errors?.model ? (
          <p id="model-error" className="font-mono text-xs text-brand">
            {state.errors.model}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="caption"
          className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted"
        >
          Légende
        </label>
        <input
          id="caption"
          name="caption"
          type="text"
          maxLength={MAX_CAPTION}
          defaultValue={state.values?.caption}
          placeholder="Première sortie après le kit suspension."
          aria-invalid={state.errors?.caption ? true : undefined}
          aria-describedby={state.errors?.caption ? "caption-error" : "caption-hint"}
          className="min-h-[50px] w-full border border-hairline bg-graphite px-3 font-body text-[15px] text-ink outline-none placeholder:text-faint focus:border-brand"
        />
        {state.errors?.caption ? (
          <p id="caption-error" className="font-mono text-xs text-brand">
            {state.errors.caption}
          </p>
        ) : (
          <p id="caption-hint" className="text-xs text-faint">
            Facultatif, {MAX_CAPTION} caractères maximum.
          </p>
        )}
      </div>

      {state.errors?.form ? (
        <p className="border border-brand/40 bg-brand/10 px-3 py-2.5 font-mono text-xs text-brand">
          {state.errors.form}
        </p>
      ) : null}

      <SubmitButton pending={pending} pendingLabel="Dépôt en cours…">
        Déposer au banc
      </SubmitButton>
    </form>
  );
}

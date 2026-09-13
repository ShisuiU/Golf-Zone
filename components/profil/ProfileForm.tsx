"use client";

import { useActionState, useState } from "react";
import { saveProfile, type ProfileState } from "@/app/actions/profile";
import { MAX_BIO, MAX_CAR, MAX_CITY, MAX_AGE, MIN_AGE } from "@/lib/profile";
import type { Profile } from "@/lib/db";

const EMPTY: ProfileState = {};

const FIELD =
  "min-h-[48px] w-full border border-hairline bg-graphite px-3 font-body text-[15px] text-ink outline-none placeholder:text-faint focus:border-brand";
const LABEL = "font-mono text-[10px] tracking-[0.1em] uppercase text-muted";

/**
 * Édition de la fiche, repliée par défaut : sur un profil on vient d'abord
 * lire, l'édition est l'exception. Après enregistrement le formulaire reste
 * ouvert avec sa confirmation — refermer d'autorité ferait douter que
 * quelque chose ait été pris en compte.
 */
export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(saveProfile, EMPTY);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[44px] cursor-pointer self-start border border-hairline-strong px-5 font-cond text-sm font-semibold uppercase tracking-[0.06em] text-ink"
      >
        Modifier mon profil
      </button>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <form action={formAction} className="panel flex flex-col gap-5 p-5 lg:p-6" noValidate>
      <h2 className="font-cond text-lg font-semibold uppercase tracking-[0.03em]">
        Modifier mon profil
      </h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="bio" className={LABEL}>
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={MAX_BIO}
          defaultValue={state.values?.bio ?? profile.bio}
          placeholder="Quelques mots sur vous et votre Golf."
          aria-invalid={state.errors?.bio ? true : undefined}
          className={`${FIELD} resize-none py-2.5 leading-relaxed`}
        />
        {state.errors?.bio ? (
          <p className="font-mono text-xs text-brand">{state.errors.bio}</p>
        ) : (
          <p className="text-xs text-faint">Facultatif, {MAX_BIO} caractères maximum.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="car" className={LABEL}>
          Voiture
        </label>
        <input
          id="car"
          name="car"
          type="text"
          maxLength={MAX_CAR}
          defaultValue={state.values?.car ?? profile.car}
          placeholder="Golf 7.5 GTE 2020"
          aria-invalid={state.errors?.car ? true : undefined}
          className={FIELD}
        />
        {state.errors?.car ? (
          <p className="font-mono text-xs text-brand">{state.errors.car}</p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="city" className={LABEL}>
            Ville ou région
          </label>
          <input
            id="city"
            name="city"
            type="text"
            maxLength={MAX_CITY}
            defaultValue={state.values?.city ?? profile.city}
            placeholder="Lyon"
            aria-invalid={state.errors?.city ? true : undefined}
            className={FIELD}
          />
          {state.errors?.city ? (
            <p className="font-mono text-xs text-brand">{state.errors.city}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="birthYear" className={LABEL}>
            Année de naissance
          </label>
          <input
            id="birthYear"
            name="birthYear"
            type="number"
            inputMode="numeric"
            min={currentYear - MAX_AGE}
            max={currentYear - MIN_AGE}
            defaultValue={state.values?.birthYear ?? profile.birthYear ?? ""}
            placeholder="1998"
            aria-invalid={state.errors?.birthYear ? true : undefined}
            className={FIELD}
          />
          {state.errors?.birthYear ? (
            <p className="font-mono text-xs text-brand">{state.errors.birthYear}</p>
          ) : (
            <p className="text-xs text-faint">Sert à afficher votre âge.</p>
          )}
        </div>
      </div>

      {state.ok ? (
        <p role="status" className="border border-hairline bg-graphite-deep px-3 py-2.5 font-mono text-xs text-brand">
          Profil enregistré.
        </p>
      ) : null}

      {state.errors?.form ? (
        <p className="border border-brand/40 bg-brand/10 px-3 py-2.5 font-mono text-xs text-brand">
          {state.errors.form}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bevel-sm min-h-[46px] cursor-pointer bg-brand px-6 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-graphite disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-[46px] cursor-pointer px-2 font-cond text-sm font-semibold uppercase tracking-[0.06em] text-muted hover:text-ink"
        >
          {state.ok ? "Fermer" : "Annuler"}
        </button>
      </div>
    </form>
  );
}

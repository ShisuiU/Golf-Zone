"use client";

import { useActionState, useState } from "react";
import { publishPost, type PostState } from "@/app/actions/post";
import { PhotoField } from "@/components/profil/PhotoField";
import { Avatar } from "@/components/feed/Avatar";
import { GENERATIONS, MAX_CAPTION } from "@/lib/post";

const EMPTY: PostState = {};

/**
 * Zone de publication en tête de fil, à la manière de Facebook : un champ
 * texte replié, qui déploie photo et génération au clic. Le texte seul suffit
 * — beaucoup de messages seront des questions, pas des photos.
 */
export function Composer({
  handle,
  avatarPhotoId,
}: {
  handle: string;
  avatarPhotoId: number | null;
}) {
  const [state, formAction, pending] = useActionState(publishPost, EMPTY);
  const [open, setOpen] = useState(false);

  // Le composeur ne se replie pas tout seul après un envoi. React remet le
  // formulaire à zéro qu'il ait réussi ou échoué : replier là-dessus
  // escamotait « Format non reconnu » avec le reste.
  return (
    <form action={formAction} className="surface p-4">
      <div className="flex items-start gap-3">
        <Avatar handle={handle} photoId={avatarPhotoId} size={40} />
        <textarea
          name="caption"
          rows={open ? 3 : 1}
          maxLength={MAX_CAPTION}
          onFocus={() => setOpen(true)}
          defaultValue={state.values?.caption}
          // Court exprès : replié, le champ ne fait qu'une ligne, et un texte
          // plus long s'y couperait en deux au milieu d'un mot.
          placeholder={open ? "Racontez, demandez, montrez…" : `Quoi de neuf, @${handle} ?`}
          className="min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-relaxed text-ink placeholder:text-faint"
        />
      </div>

      {open ? (
        <div className="animate-rise mt-4 flex flex-col gap-4 border-t border-hairline pt-4">
          <PhotoField error={state.errors?.photo} optional />

          <div className="flex flex-col gap-2">
            <label
              htmlFor="model"
              className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted"
            >
              Génération (facultatif)
            </label>
            <select
              id="model"
              name="model"
              defaultValue={state.values?.model ?? ""}
              className="min-h-[48px] w-full cursor-pointer border border-hairline bg-graphite px-3 text-[15px] text-ink focus:border-brand"
            >
              <option value="">— aucune —</option>
              {GENERATIONS.map((g) => (
                <option key={g} value={g}>
                  Golf {g}
                </option>
              ))}
            </select>
            {state.errors?.model ? (
              <p className="font-mono text-xs text-brand">{state.errors.model}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {state.errors?.caption ? (
        <p className="mt-2 font-mono text-xs text-brand">{state.errors.caption}</p>
      ) : null}
      {state.errors?.form ? (
        <p className="mt-2 font-mono text-xs text-brand">{state.errors.form}</p>
      ) : null}

      {/* Rien à publier tant que rien n'est saisi : le bouton n'apparaît
          qu'une fois la zone dépliée. */}
      {open ? (
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="pressable bevel-sm min-h-[44px] cursor-pointer bg-brand px-6 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-graphite disabled:opacity-60"
          >
            {pending ? "Publication…" : "Publier"}
          </button>
        </div>
      ) : null}
    </form>
  );
}

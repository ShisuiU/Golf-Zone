"use client";

import { useActionState, useState } from "react";
import { editPost, type PostState } from "@/app/actions/post";
import { GENERATIONS, MAX_CAPTION } from "@/lib/post";

const EMPTY: PostState = {};

/**
 * Correction d'une publication, dépliée sur place.
 *
 * Une faute de frappe obligeait jusqu'ici à supprimer et republier, ce qui
 * emportait les likes et les commentaires. La photo ne se change pas ici :
 * remplacer l'image, c'est une autre publication.
 */
export function EditPost({
  postId,
  model,
  caption,
}: {
  postId: number;
  model: string | null;
  caption: string;
}) {
  const [state, formAction, pending] = useActionState(editPost, EMPTY);
  const [open, setOpen] = useState(false);

  if (!open || state.ok) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[40px] cursor-pointer items-center px-2 font-mono text-[11px] uppercase tracking-[0.05em] text-faint transition-colors duration-150 hover:text-brand"
      >
        Modifier
      </button>
    );
  }

  return (
    <form action={formAction} className="animate-rise flex w-full flex-col gap-3 border-t border-hairline pt-3">
      <input type="hidden" name="id" value={postId} />

      <label htmlFor={`caption-${postId}`} className="sr-only">
        Texte de la publication
      </label>
      <textarea
        id={`caption-${postId}`}
        name="caption"
        rows={3}
        maxLength={MAX_CAPTION}
        defaultValue={state.values?.caption ?? caption}
        className="w-full resize-none border border-hairline bg-graphite px-3 py-2.5 text-[15px] leading-relaxed text-ink focus:border-brand"
      />

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={`model-${postId}`} className="sr-only">
          Génération
        </label>
        <select
          id={`model-${postId}`}
          name="model"
          defaultValue={state.values?.model ?? model ?? ""}
          className="min-h-[44px] cursor-pointer border border-hairline bg-graphite px-3 text-[15px] text-ink focus:border-brand"
        >
          <option value="">— aucune génération —</option>
          {GENERATIONS.map((generation) => (
            <option key={generation} value={generation}>
              Golf {generation}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={pending}
          className="pressable bevel-sm min-h-[44px] cursor-pointer bg-brand px-5 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-graphite disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="pressable min-h-[44px] cursor-pointer px-2 font-cond text-sm font-semibold uppercase tracking-[0.06em] text-muted hover:text-ink"
        >
          Annuler
        </button>
      </div>

      {state.errors?.caption ? (
        <p className="font-mono text-xs text-brand">{state.errors.caption}</p>
      ) : null}
      {state.errors?.model ? (
        <p className="font-mono text-xs text-brand">{state.errors.model}</p>
      ) : null}
      {state.errors?.form ? (
        <p className="font-mono text-xs text-brand">{state.errors.form}</p>
      ) : null}
    </form>
  );
}

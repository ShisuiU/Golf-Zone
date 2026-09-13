"use client";

import { useActionState, useState } from "react";
import { reportContent, type ReportState } from "@/app/actions/report";

const EMPTY: ReportState = {};

/**
 * Signalement, replié derrière un lien discret : c'est utile mais rare, et
 * un bouton bien visible sur chaque publication inviterait au réflexe.
 */
export function ReportButton({
  postId,
  commentId,
  small,
}: {
  postId?: number;
  commentId?: number;
  small?: boolean;
}) {
  const [state, formAction, pending] = useActionState(reportContent, EMPTY);
  const [open, setOpen] = useState(false);

  const label = small ? "signaler" : "Signaler";
  const size = small ? "text-[10px]" : "text-[11px] uppercase tracking-[0.05em]";

  if (state.ok) {
    return (
      <span role="status" className={`font-mono ${size} text-faint`}>
        Signalé, merci
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`cursor-pointer font-mono ${size} text-faint hover:text-brand`}
      >
        {label}
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      {postId ? <input type="hidden" name="postId" value={postId} /> : null}
      {commentId ? <input type="hidden" name="commentId" value={commentId} /> : null}
      <input
        name="reason"
        maxLength={300}
        autoFocus
        placeholder="Ce qui pose problème"
        aria-label="Motif du signalement"
        className="min-h-[36px] min-w-0 flex-1 border border-hairline bg-graphite px-2 text-[13px] text-ink outline-none placeholder:text-faint focus:border-brand"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-[36px] cursor-pointer border border-hairline-strong px-3 font-cond text-[13px] font-semibold uppercase tracking-[0.05em] text-ink disabled:opacity-60"
      >
        {pending ? "Envoi…" : "Envoyer"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="min-h-[36px] cursor-pointer px-1 font-mono text-[11px] text-faint hover:text-ink"
      >
        annuler
      </button>
      {state.error ? (
        <p className="w-full font-mono text-[11px] text-brand">{state.error}</p>
      ) : null}
    </form>
  );
}

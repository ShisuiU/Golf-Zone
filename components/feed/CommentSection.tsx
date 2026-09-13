"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { commentPost, removeComment, type CommentState } from "@/app/actions/post";
import { MAX_COMMENT } from "@/lib/post";
import { Avatar } from "@/components/feed/Avatar";
import { timeAgo } from "@/components/feed/timeAgo";
import type { Comment } from "@/lib/db";

const EMPTY: CommentState = {};

type Props = {
  postId: number;
  comments: Comment[];
  viewerHandle: string | null;
};

export function CommentSection({ postId, comments, viewerHandle }: Props) {
  const [state, formAction, pending] = useActionState(commentPost, EMPTY);
  const formRef = useRef<HTMLFormElement>(null);

  // Vider le champ une fois le commentaire accepté.
  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <div className="border-t border-hairline">
      {comments.length > 0 ? (
        <ul className="flex flex-col gap-2.5 px-4 py-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-2.5 text-[14px] leading-relaxed">
              <Avatar handle={comment.handle} photoId={comment.avatarPhotoId} size={26} />
              <p className="min-w-0 flex-1">
              <Link
                href={`/membre/${comment.handle}`}
                className="font-cond font-semibold tracking-[0.02em] text-ink hover:text-brand"
              >
                @{comment.handle}
              </Link>{" "}
              <span className="text-body">{comment.body}</span>{" "}
              <span className="font-mono text-[10px] text-faint">
                {timeAgo(comment.createdAt)}
              </span>
              {viewerHandle === comment.handle ? (
                <form action={removeComment} className="inline">
                  <input type="hidden" name="id" value={comment.id} />
                  <button
                    type="submit"
                    className="ml-2 cursor-pointer font-mono text-[10px] text-faint hover:text-brand"
                  >
                    supprimer
                  </button>
                </form>
              ) : null}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {viewerHandle ? (
        <form ref={formRef} action={formAction} className="flex items-center gap-2 px-4 py-2.5">
          <input type="hidden" name="postId" value={postId} />
          <input
            name="body"
            maxLength={MAX_COMMENT}
            placeholder="Ajouter un commentaire…"
            aria-label="Ajouter un commentaire"
            className="min-h-[44px] flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
          />
          <button
            type="submit"
            disabled={pending}
            className="min-h-[44px] cursor-pointer px-1 font-cond text-sm font-bold uppercase tracking-[0.05em] text-brand disabled:opacity-50"
          >
            {pending ? "…" : "Envoyer"}
          </button>
        </form>
      ) : (
        <p className="px-4 py-3 text-[13px] text-muted">
          <Link href="/inscription" className="underline">
            Créez un compte
          </Link>{" "}
          pour commenter.
        </p>
      )}

      {state.error ? (
        <p className="px-4 pb-3 font-mono text-xs text-brand">{state.error}</p>
      ) : null}
    </div>
  );
}

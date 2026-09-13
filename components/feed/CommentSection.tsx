"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { commentPost, removeComment, type CommentState } from "@/app/actions/post";
import { MAX_COMMENT } from "@/lib/post";
import { Avatar } from "@/components/feed/Avatar";
import { ReportButton } from "@/components/feed/ReportButton";
import { Time } from "@/components/feed/Time";
import type { Comment } from "@/lib/db";

const EMPTY: CommentState = {};

type Props = {
  postId: number;
  comments: Comment[];
  viewerHandle: string | null;
  /** Inviter le visiteur à s'inscrire : une fois par page, pas par carte. */
  promptSignup?: boolean;
};

export function CommentSection({ postId, comments, viewerHandle, promptSignup }: Props) {
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
              <Time date={comment.createdAt} className="font-mono text-[10px] text-faint" />
              {viewerHandle === comment.handle ? (
                <form action={removeComment} className="inline">
                  <input type="hidden" name="id" value={comment.id} />
                  <button
                    type="submit"
                    className="ml-2 inline-flex min-h-[32px] cursor-pointer items-center px-1 font-mono text-[10px] text-faint hover:text-brand"
                  >
                    supprimer
                  </button>
                </form>
              ) : viewerHandle ? (
                <span className="ml-2 inline-block align-baseline">
                  <ReportButton commentId={comment.id} small />
                </span>
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
            required
            maxLength={MAX_COMMENT}
            placeholder="Ajouter un commentaire…"
            aria-label="Ajouter un commentaire"
            className="peer min-h-[44px] flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint"
          />
          {/* Gris tant que le champ est vide : sans cela, vingt cartes
              affichent vingt appels à l'action orange pour rien. Le `peer`
              évite d'en faire un champ contrôlé pour une question de couleur. */}
          <button
            type="submit"
            disabled={pending}
            className="min-h-[44px] cursor-pointer px-2 font-cond text-sm font-bold uppercase tracking-[0.05em] text-brand peer-placeholder-shown:text-faint disabled:opacity-50"
          >
            {pending ? "…" : "Envoyer"}
          </button>
        </form>
      ) : promptSignup ? (
        <p className="px-4 py-3 text-[13px] text-muted">
          <Link href="/inscription" className="underline">
            Créez un compte
          </Link>{" "}
          pour aimer et commenter.
        </p>
      ) : null}

      {state.error ? (
        <p className="px-4 pb-3 font-mono text-xs text-brand">{state.error}</p>
      ) : null}
    </div>
  );
}

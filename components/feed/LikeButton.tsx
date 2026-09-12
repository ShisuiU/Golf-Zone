"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { likePost } from "@/app/actions/post";

type Props = {
  postId: number;
  count: number;
  liked: boolean;
  canInteract: boolean;
};

/**
 * Le compteur bascule immédiatement à l'écran, avant la réponse du serveur :
 * un like qui attend un aller-retour vers la base ne donne pas l'impression
 * d'un réseau social. En cas d'échec, React remet l'état réel.
 */
export function LikeButton({ postId, count, liked, canInteract }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic(
    { count, liked },
    (_current, next: { count: number; liked: boolean }) => next,
  );

  function onClick() {
    if (!canInteract) {
      router.push("/inscription");
      return;
    }
    startTransition(async () => {
      setOptimistic({ liked: !state.liked, count: state.count + (state.liked ? -1 : 1) });
      await likePost(postId);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={state.liked}
      aria-label={state.liked ? "Je n'aime plus" : "J'aime"}
      className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 pr-3 text-sm transition-colors ${
        state.liked ? "text-brand" : "text-muted hover:text-ink"
      }`}
    >
      <svg width="20" height="18" viewBox="0 0 16 14" fill="none" aria-hidden="true">
        <path
          d="M8 13C8 13 1 9 1 4.5C1 2 3 1 5 1C6.5 1 7.5 2 8 3C8.5 2 9.5 1 11 1C13 1 15 2 15 4.5C15 9 8 13 8 13Z"
          fill={state.liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
      <span className="font-mono text-[13px] tabular-nums">{state.count}</span>
    </button>
  );
}

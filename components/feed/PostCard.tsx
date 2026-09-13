import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { removePost } from "@/app/actions/post";
import { Avatar } from "@/components/feed/Avatar";
import { CommentSection } from "@/components/feed/CommentSection";
import { EditPost } from "@/components/feed/EditPost";
import { LikeButton } from "@/components/feed/LikeButton";
import { ReportButton } from "@/components/feed/ReportButton";
import { Time } from "@/components/feed/Time";
import type { FeedEntry } from "@/lib/db";

/** Une publication du fil : en-tête, image éventuelle, actions, commentaires. */
export function PostCard({
  post,
  viewerHandle,
  promptSignup,
}: {
  post: FeedEntry;
  viewerHandle: string | null;
  promptSignup?: boolean;
}) {
  const isMine = viewerHandle === post.handle;

  return (
    <article className="surface">
      <header className="flex flex-wrap items-center gap-3 px-4 py-3">
        <Avatar handle={post.handle} photoId={post.avatarPhotoId} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/membre/${post.handle}`}
            className="font-cond text-[16px] font-semibold tracking-[0.02em] text-ink hover:text-brand"
          >
            @{post.handle}
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-[0.05em] text-faint">
            {post.model ? `Golf ${post.model} · ` : ""}
            {/* `-my-1.5` : de quoi viser au doigt sans écarter les lignes. */}
            <Link
              href={`/publication/${post.id}`}
              className="-my-1.5 inline-flex min-h-[32px] items-center hover:text-brand"
            >
              <Time date={post.createdAt} />
            </Link>
            {/* Une correction se voit : on ne réécrit pas le passé en silence. */}
            {post.editedAt ? <span title="Publication corrigée"> · modifiée</span> : null}
          </p>
        </div>
        {isMine ? (
          <EditPost postId={post.id} model={post.model} caption={post.caption} />
        ) : null}
        {isMine ? (
          <form action={removePost}>
            <input type="hidden" name="id" value={post.id} />
            <button
              type="submit"
              className="inline-flex min-h-[40px] cursor-pointer items-center px-2 font-mono text-[11px] uppercase tracking-[0.05em] text-faint hover:text-brand"
            >
              Supprimer
            </button>
          </form>
        ) : null}
      </header>

      {post.photoId ? (
        // Même nom des deux côtés : en ouvrant le lien permanent, la photo se
        // déplace au lieu de disparaître puis réapparaître ailleurs. C'est le
        // même objet, autant le dire.
        <ViewTransition name={`photo-${post.photoId}`} share="morph" default="none">
          <Image
            src={`/photos/${post.photoId}`}
            alt={post.model ? `Golf ${post.model} de @${post.handle}` : `Photo de @${post.handle}`}
            width={640}
            height={640}
            className="max-h-[70vh] w-full bg-graphite object-cover"
            unoptimized
          />
        </ViewTransition>
      ) : null}

      {post.caption ? (
        <p className="px-4 pt-3 text-[15px] leading-relaxed break-words whitespace-pre-line text-body">
          {post.caption}
        </p>
      ) : null}

      <div className="flex items-center gap-1 px-4 pt-1 pb-1">
        <LikeButton
          postId={post.id}
          count={post.likeCount}
          liked={post.likedByMe}
          canInteract={viewerHandle !== null}
        />
        {post.commentCount > 0 ? (
          <Link
            href={`/publication/${post.id}`}
            className="font-mono text-[13px] text-muted transition-colors duration-150 hover:text-ink"
          >
            {post.commentCount} commentaire{post.commentCount > 1 ? "s" : ""}
          </Link>
        ) : null}
        {/* Signaler la publication d'un autre : la sienne, on la supprime. */}
        {viewerHandle && !isMine ? (
          <span className="ml-auto">
            <ReportButton postId={post.id} />
          </span>
        ) : null}
      </div>

      <CommentSection
        postId={post.id}
        comments={post.comments}
        // Le fil n'en montre que les derniers : le dire, et ouvrir la suite.
        hidden={post.commentCount - post.comments.length}
        viewerHandle={viewerHandle}
        promptSignup={promptSignup}
      />
    </article>
  );
}

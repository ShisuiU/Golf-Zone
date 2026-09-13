import Image from "next/image";
import Link from "next/link";
import { removePost } from "@/app/actions/post";
import { Avatar } from "@/components/feed/Avatar";
import { CommentSection } from "@/components/feed/CommentSection";
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
    <article className="border border-hairline bg-surface">
      <header className="flex items-center gap-3 px-4 py-3">
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
            <Link href={`/publication/${post.id}`} className="inline-block py-0.5 hover:text-brand">
              <Time date={post.createdAt} />
            </Link>
          </p>
        </div>
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
        <Image
          src={`/photos/${post.photoId}`}
          alt={post.model ? `Golf ${post.model} de @${post.handle}` : `Photo de @${post.handle}`}
          width={640}
          height={640}
          className="max-h-[70vh] w-full bg-graphite object-cover"
          unoptimized
        />
      ) : null}

      {post.caption ? (
        <p className="px-4 pt-3 text-[15px] leading-relaxed whitespace-pre-line text-body">
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
        <span className="font-mono text-[13px] text-muted">
          {post.comments.length > 0
            ? `${post.comments.length} commentaire${post.comments.length > 1 ? "s" : ""}`
            : ""}
        </span>
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
        viewerHandle={viewerHandle}
        promptSignup={promptSignup}
      />
    </article>
  );
}

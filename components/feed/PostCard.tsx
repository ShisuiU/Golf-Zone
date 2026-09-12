import Image from "next/image";
import { Avatar } from "@/components/feed/Avatar";
import { CommentSection } from "@/components/feed/CommentSection";
import { LikeButton } from "@/components/feed/LikeButton";
import { timeAgo } from "@/components/feed/timeAgo";
import type { FeedEntry } from "@/lib/db";

/** Une publication du fil : en-tête, image éventuelle, actions, commentaires. */
export function PostCard({
  post,
  viewerHandle,
}: {
  post: FeedEntry;
  viewerHandle: string | null;
}) {
  return (
    <article className="border border-hairline bg-surface">
      <header className="flex items-center gap-3 px-4 py-3">
        <Avatar handle={post.handle} />
        <div className="min-w-0 flex-1">
          <p className="font-cond text-[16px] font-semibold tracking-[0.02em]">@{post.handle}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.05em] text-faint">
            {post.model ? `Golf ${post.model} · ` : ""}
            {timeAgo(post.createdAt)}
          </p>
        </div>
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

      <div className="flex items-center gap-1 px-4 pt-1">
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
      </div>

      <CommentSection
        postId={post.id}
        comments={post.comments}
        viewerHandle={viewerHandle}
      />
    </article>
  );
}

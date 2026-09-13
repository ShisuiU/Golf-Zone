import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/feed/PostCard";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/dal";
import { findPost } from "@/lib/db";
import { ACCOUNTS_ENABLED } from "@/lib/flags";

type Params = { params: Promise<{ id: string }> };

async function load(params: Params["params"], viewerId: number | null) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId) || postId <= 0) return undefined;
  return findPost(postId, viewerId);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  if (!ACCOUNTS_ENABLED) return {};
  const post = await load(params, null);
  if (!post) return { title: "Publication introuvable — Zone Golf" };

  // Le partage d'un lien montre la légende, ou à défaut de quoi il s'agit.
  const summary = post.caption.trim() || `Une Golf ${post.model ?? ""}`.trim();
  return {
    title: `@${post.handle} — Zone Golf`,
    description: summary,
    openGraph: {
      title: `@${post.handle} sur Zone Golf`,
      description: summary,
      images: post.photoId ? [`/photos/${post.photoId}`] : undefined,
    },
  };
}

/** Lien permanent d'une publication : ce que visent notifications et partages. */
export default async function PublicationPage({ params }: Params) {
  if (!ACCOUNTS_ENABLED) notFound();
  const viewer = await getCurrentUser();
  const post = await load(params, viewer?.id ?? null);
  if (!post) notFound();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />
      <SiteHeader />

      <main className="relative mx-auto w-full max-w-[680px] px-4 py-6 lg:py-10">
        <PostCard post={post} viewerHandle={viewer?.handle ?? null} />

        <p className="mt-8 border-t border-hairline pt-6 text-center text-sm text-muted">
          <Link href="/" className="underline">
            Retour au fil
          </Link>
        </p>
      </main>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PostCard } from "@/components/feed/PostCard";
import { ProfileCard } from "@/components/profil/ProfileCard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/dal";
import { findProfile, listPostsOfUser } from "@/lib/db";
import { ACCOUNTS_ENABLED } from "@/lib/flags";

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${decodeURIComponent(handle)} — Zone Golf` };
}

/** Profil public d'un membre : sa fiche et ses publications. */
export default async function MembrePage({ params }: Params) {
  if (!ACCOUNTS_ENABLED) notFound();

  const { handle } = await params;
  const [viewer, profile] = await Promise.all([
    getCurrentUser(),
    findProfile(decodeURIComponent(handle)),
  ]);
  if (!profile) notFound();

  // Sur sa propre fiche, on veut la page qui permet d'éditer et de publier.
  if (viewer?.id === profile.id) redirect("/profil");

  const posts = await listPostsOfUser(profile.id, viewer?.id ?? null);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />
      <SiteHeader />

      <main className="relative mx-auto w-full max-w-[680px] px-4 py-6 lg:py-10">
        <div className="flex flex-col gap-5">
          <ProfileCard profile={profile} />

          <h2 className="mt-2 font-cond text-lg font-semibold uppercase tracking-[0.04em] text-body">
            Publications
          </h2>

          {posts.length === 0 ? (
            <p className="border border-dashed border-hairline-strong px-4 py-10 text-center text-sm text-muted">
              @{profile.handle} n&apos;a encore rien publié.
            </p>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} viewerHandle={viewer?.handle ?? null} />
            ))
          )}

          <p className="mt-4 border-t border-hairline pt-6 text-center text-sm text-muted">
            <Link href="/" className="underline">
              Retour au fil
            </Link>
          </p>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}

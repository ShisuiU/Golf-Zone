import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Composer } from "@/components/feed/Composer";
import { PostCard } from "@/components/feed/PostCard";
import { ProfileCard } from "@/components/profil/ProfileCard";
import { ProfileForm } from "@/components/profil/ProfileForm";
import { SiteHeader } from "@/components/SiteHeader";
import { requireUser } from "@/lib/dal";
import { findProfile, listPostsOfUser } from "@/lib/db";
import { ACCOUNTS_ENABLED } from "@/lib/flags";

export const metadata: Metadata = {
  title: "Mon profil — Zone Golf",
};

export default async function ProfilPage() {
  if (!ACCOUNTS_ENABLED) notFound();
  const user = await requireUser();

  const [profile, posts] = await Promise.all([
    findProfile(user.handle),
    listPostsOfUser(user.id, user.id),
  ]);
  // La session vient d'être validée : sans fiche, c'est la base qui a changé
  // sous nos pieds.
  if (!profile) notFound();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />
      <SiteHeader />

      <main className="relative mx-auto w-full max-w-[680px] px-4 py-6 lg:py-10">
        <div className="flex flex-col gap-5">
          <ProfileCard profile={profile} />
          <ProfileForm profile={profile} />

          <Composer handle={user.handle} avatarPhotoId={profile.avatarPhotoId} />

          <h2 className="mt-2 font-cond text-lg font-semibold uppercase tracking-[0.04em] text-body">
            Mes publications
          </h2>

          {posts.length === 0 ? (
            <div className="border border-dashed border-hairline-strong px-4 py-10 text-center">
              <p className="font-cond text-lg font-semibold uppercase tracking-[0.04em] text-faint">
                Rien de publié pour l&apos;instant
              </p>
              <p className="mt-2 text-sm text-muted">
                Votre première publication apparaîtra ici et sur le fil d&apos;accueil.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} viewerHandle={user.handle} />
            ))
          )}

          <form action={logout} className="mt-4 border-t border-hairline pt-6 text-center">
            <button
              type="submit"
              className="min-h-[44px] cursor-pointer px-4 font-cond text-sm font-semibold uppercase tracking-[0.06em] text-muted hover:text-ink"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

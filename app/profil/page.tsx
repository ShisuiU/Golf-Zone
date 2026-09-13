import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Composer } from "@/components/feed/Composer";
import { PostCard } from "@/components/feed/PostCard";
import { ProfileCard } from "@/components/profil/ProfileCard";
import { ProfileForm } from "@/components/profil/ProfileForm";
import { SiteFooter } from "@/components/SiteFooter";
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
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />
      <SiteHeader />

      <main id="contenu" tabIndex={-1} className="relative mx-auto w-full max-w-[680px] flex flex-1 flex-col px-4 py-6 lg:py-10">
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

          <Link
            href="/compte"
            className="card card-link mt-4 flex items-center justify-between gap-4 p-4"
          >
            <span>
              <span className="block font-cond text-[16px] font-semibold uppercase tracking-[0.04em] text-ink">
                Mon compte
              </span>
              <span className="block text-[13px] text-muted">
                Mot de passe, déconnexion, suppression du compte
              </span>
            </span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
              className="shrink-0 text-faint"
            >
              <path d="M6 3.5L11.5 9L6 14.5" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </Link>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { removePost } from "@/app/actions/post";
import { PostForm } from "@/components/profil/PostForm";
import { requireUser } from "@/lib/dal";
import { listPostsOfUser } from "@/lib/db";
import { ACCOUNTS_ENABLED } from "@/lib/flags";
import { SITE_NAME } from "@/lib/content";

export const metadata: Metadata = {
  title: "Mon profil — Zone Golf",
};

export default async function ProfilPage() {
  if (!ACCOUNTS_ENABLED) notFound();
  const user = await requireUser();
  const posts = await listPostsOfUser(user.id);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />

      <header className="relative flex items-center justify-between gap-4 border-b border-hairline px-5 py-4 lg:px-16 lg:py-6">
        <Link href="/" className="flex items-center gap-3 hover:text-ink">
          <span className="font-impact text-lg text-ink lg:text-[23px]">
            {SITE_NAME.toUpperCase()}
          </span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="min-h-[44px] cursor-pointer border border-hairline-strong px-4 font-cond text-sm font-semibold uppercase tracking-[0.06em] text-body hover:text-ink"
          >
            Se déconnecter
          </button>
        </form>
      </header>

      <main className="relative mx-auto w-full max-w-[900px] px-5 py-10 lg:py-16">
        <h1 className="mb-2 font-impact text-[30px] lg:text-[42px]">@{user.handle}</h1>
        <p className="mb-10 text-[15px] leading-relaxed text-body">
          Vos photos apparaissent sur le fil d&apos;accueil dès que vous les publiez.
        </p>

        <section className="panel mb-10 p-6 lg:p-8">
          <h2 className="mb-6 font-cond text-xl font-semibold uppercase tracking-[0.03em]">
            Poster une photo
          </h2>
          <PostForm />
        </section>

        <section>
          <h2 className="mb-5 font-cond text-xl font-semibold uppercase tracking-[0.03em]">
            Mes photos <span className="font-mono text-sm text-faint">({posts.length})</span>
          </h2>

          {posts.length === 0 ? (
            <div className="flex flex-col gap-3 border border-dashed border-hairline-strong px-4 py-10 text-center">
              <span className="font-cond text-lg font-semibold uppercase tracking-[0.04em] text-faint">
                Aucune photo pour le moment
              </span>
              <span className="text-sm text-muted">
                Publiez la première avec le formulaire ci-dessus.
              </span>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <li key={post.id} className="border border-hairline bg-surface">
                  {post.photoId ? (
                    <Image
                      src={`/photos/${post.photoId}`}
                      alt={`Golf ${post.model} de @${post.handle}`}
                      width={400}
                      height={300}
                      className="h-44 w-full object-cover"
                      unoptimized
                    />
                  ) : null}
                  <div className="p-4">
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.05em] text-faint">
                      {post.model}
                    </p>
                    {post.caption ? (
                      <p className="mb-3 text-[13px] leading-relaxed text-muted">
                        {post.caption}
                      </p>
                    ) : null}
                    <form action={removePost}>
                      <input type="hidden" name="id" value={post.id} />
                      <button
                        type="submit"
                        className="min-h-[40px] cursor-pointer font-mono text-[11px] uppercase tracking-[0.05em] text-faint hover:text-brand"
                      >
                        Supprimer
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-10 text-sm text-muted">
          <Link href="/" className="underline">
            Retour à l&apos;accueil
          </Link>
        </p>
      </main>
    </div>
  );
}

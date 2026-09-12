import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { removeDossier } from "@/app/actions/dossier";
import { DossierForm } from "@/components/garage/DossierForm";
import { requireUser } from "@/lib/dal";
import { listDossiersOfUser } from "@/lib/db";
import { ACCOUNTS_ENABLED } from "@/lib/flags";
import { SEASON, SITE_NAME } from "@/lib/content";

export const metadata: Metadata = {
  title: "Mon garage — Zone Golf",
};

export default async function GaragePage() {
  if (!ACCOUNTS_ENABLED) notFound();
  const user = await requireUser();
  const dossiers = await listDossiersOfUser(user.id);

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
        <p className="mb-3 font-mono text-[10px] tracking-[0.15em] text-brand">
          Espace membre — {SEASON.label.toLowerCase()}
        </p>
        <h1 className="mb-2 font-impact text-[30px] lg:text-[42px]">Mon garage</h1>
        <p className="mb-10 text-[15px] leading-relaxed text-body">
          Bienvenue <span className="font-cond font-semibold text-ink">@{user.handle}</span>.
          Déposez vos Golf ici : elles apparaissent aussitôt sur le banc.
        </p>

        <section className="panel mb-10 p-6 lg:p-8">
          <h2 className="mb-6 font-cond text-xl font-semibold uppercase tracking-[0.03em]">
            Déposer une Golf
          </h2>
          <DossierForm />
        </section>

        <section>
          <h2 className="mb-5 font-cond text-xl font-semibold uppercase tracking-[0.03em]">
            Mes dossiers{" "}
            <span className="font-mono text-sm text-faint">({dossiers.length})</span>
          </h2>

          {dossiers.length === 0 ? (
            <div className="flex flex-col gap-3 border border-dashed border-hairline-strong px-4 py-10 text-center">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-faint">
                Aucun dossier
              </span>
              <span className="font-cond text-lg font-semibold uppercase tracking-[0.04em] text-faint">
                Votre première photo lancera le vôtre
              </span>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dossiers.map((d) => (
                <li key={d.id} className="border border-hairline bg-surface">
                  {d.photoId ? (
                    <Image
                      src={`/photos/${d.photoId}`}
                      alt={`Golf ${d.model} de @${d.handle}`}
                      width={400}
                      height={300}
                      className="h-44 w-full object-cover"
                      unoptimized
                    />
                  ) : null}
                  <div className="p-4">
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.05em] text-faint">
                      Dossier #{d.id} · {d.model}
                    </p>
                    {d.caption ? (
                      <p className="mb-3 text-[13px] leading-relaxed text-muted">
                        &laquo;&nbsp;{d.caption}&nbsp;&raquo;
                      </p>
                    ) : null}
                    <form action={removeDossier}>
                      <input type="hidden" name="id" value={d.id} />
                      <button
                        type="submit"
                        className="min-h-[40px] cursor-pointer font-mono text-[11px] uppercase tracking-[0.05em] text-faint hover:text-brand"
                      >
                        Retirer du banc
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
            Retour au banc
          </Link>
        </p>
      </main>
    </div>
  );
}

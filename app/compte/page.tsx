import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { DeleteAccountForm } from "@/components/compte/DeleteAccountForm";
import { PasswordForm } from "@/components/compte/PasswordForm";
import { VerifyEmail } from "@/components/compte/VerifyEmail";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { requireUser } from "@/lib/dal";
import { isEmailVerified } from "@/lib/db";
import { ACCOUNTS_ENABLED, isModerator } from "@/lib/flags";

export const metadata: Metadata = {
  title: "Mon compte — Zone Golf",
};

export default async function ComptePage() {
  if (!ACCOUNTS_ENABLED) notFound();
  const user = await requireUser();
  const verified = await isEmailVerified(user.id);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div aria-hidden="true" className="tech-grid pointer-events-none absolute inset-0" />
      <SiteHeader />

      <main className="relative mx-auto w-full max-w-[680px] flex flex-1 flex-col px-4 py-6 lg:py-10">
        <h1 className="font-impact text-[26px] leading-tight lg:text-[32px]">Mon compte</h1>
        <p className="mt-2 mb-7 text-[15px] text-body">
          Connecté avec <span className="font-mono text-[13px] text-ink">{user.email}</span>.{" "}
          <Link href="/profil" className="underline">
            Modifier mon profil
          </Link>
        </p>

        <div className="flex flex-col gap-8">
          {verified ? null : <VerifyEmail />}

          {isModerator(user.handle) ? (
            <p className="surface p-4 text-[15px] text-body">
              <Link href="/moderation" className="underline">
                File de modération
              </Link>{" "}
              — les contenus signalés par la communauté.
            </p>
          ) : null}

          <PasswordForm />

          <form action={logout}>
            <button
              type="submit"
              className="pressable min-h-[44px] cursor-pointer border border-hairline-strong px-5 font-cond text-sm font-semibold uppercase tracking-[0.06em] text-ink"
            >
              Se déconnecter
            </button>
          </form>

          <div className="border-t border-hairline pt-8">
            <DeleteAccountForm />
          </div>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}

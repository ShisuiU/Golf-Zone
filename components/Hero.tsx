import { Button } from "@/components/ui/Button";
import { LOGIN_HREF } from "@/lib/content";
import { ACCOUNTS_ENABLED, CTA_HREF } from "@/lib/flags";

/** Aperçu d'une publication, pour montrer tout de suite de quoi le site est fait. */
function PostPreview({
  handle,
  model,
  caption,
  tone,
}: {
  handle: string;
  model: string;
  caption: string;
  tone: "warm" | "cool";
}) {
  const image =
    tone === "warm"
      ? "bg-[linear-gradient(150deg,#2e2119,#16191c)]"
      : "bg-[linear-gradient(210deg,#152530,#16191c)]";

  return (
    <article className="border border-hairline bg-surface">
      <div className={`h-28 lg:h-32 ${image}`} />
      <div className="p-3">
        <p className="font-cond text-[15px] font-semibold tracking-[0.03em]">{handle}</p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.05em] text-faint">
          {model}
        </p>
        <p className="mt-1.5 text-[12px] leading-snug text-muted">{caption}</p>
      </div>
    </article>
  );
}

export function Hero() {
  return (
    <section
      id="accueil"
      className="relative flex flex-col gap-10 border-b border-hairline px-5 py-10 lg:flex-row lg:items-center lg:gap-14 lg:px-16 lg:pt-21 lg:pb-20"
    >
      <div className="lg:flex-[1.05]">
        <p className="mb-4 font-mono text-[10px] tracking-[0.15em] text-brand lg:mb-5 lg:text-[11px]">
          Communauté photo — Golf Mk1 à Mk8
        </p>
        <h1 className="mb-5 font-impact text-[38px] leading-[1.08] text-pretty lg:mb-6 lg:text-[62px] lg:leading-[1.06]">
          Postez votre Golf.
          <br />
          <span className="text-brand">Découvrez les autres.</span>
        </h1>
        <p className="mb-7 max-w-[470px] text-[15px] leading-relaxed text-body lg:mb-8 lg:text-lg">
          Un endroit simple pour partager des photos de sa Golf et voir celles
          de la communauté. Toutes les générations, toutes les finitions.
        </p>
        <div className="mb-5 flex flex-col gap-3 lg:mb-6 lg:flex-row lg:gap-4">
          <Button href={CTA_HREF} full className="lg:w-auto">
            Poster une photo
          </Button>
          <Button href="#fil" variant="secondary" full className="lg:w-auto">
            Voir le fil
          </Button>
        </div>
        <p className="font-mono text-[10px] tracking-[0.04em] text-faint lg:text-[11px]">
          {ACCOUNTS_ENABLED ? (
            <>
              Gratuit ·{" "}
              <a href={LOGIN_HREF} className="underline">
                déjà inscrit ?
              </a>
            </>
          ) : (
            "Gratuit · sans publicité"
          )}
        </p>
      </div>

      {/* Un aperçu du fil plutôt qu'un visuel abstrait : on voit le produit. */}
      <div className="grid grid-cols-2 gap-3 lg:flex-1 lg:gap-4">
        <PostPreview
          handle="@teo_gti"
          model="Mk7 GTI"
          caption="Première sortie après le kit suspension."
          tone="warm"
        />
        <div className="mt-6 lg:mt-8">
          <PostPreview
            handle="@lina.r"
            model="Mk8 R"
            caption="Livraison du jour, zéro km."
            tone="cool"
          />
        </div>
      </div>
    </section>
  );
}

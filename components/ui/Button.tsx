import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  variant?: Variant;
  full?: boolean;
};

const base =
  "inline-flex items-center justify-center font-cond font-bold uppercase tracking-[0.06em] " +
  "min-h-[52px] px-7 text-base transition-transform duration-150 hover:-translate-y-0.5";

const variants: Record<Variant, string> = {
  // Fond plein : le coin biseauté est sûr ici, il n'y a pas de bordure à couper.
  primary: "bevel bg-brand text-graphite hover:text-graphite",
  secondary: "bg-surface text-ink hover:text-ink border border-hairline-strong",
};

export function Button({
  href,
  variant = "primary",
  full,
  className = "",
  ...rest
}: Props) {
  const classes = `${base} ${variants[variant]} ${full ? "w-full" : ""} ${className}`;

  // Les ancres de la même page restent de simples <a> : Link n'apporte rien
  // pour un défilement interne et journaliserait une navigation inutile.
  if (href.startsWith("#")) {
    return <a href={href} className={classes} {...rest} />;
  }

  return <Link href={href} className={classes} {...rest} />;
}

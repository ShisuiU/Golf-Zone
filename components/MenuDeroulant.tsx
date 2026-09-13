"use client";

import { useEffect, useRef } from "react";

/**
 * Un `<details>` qui se referme comme on l'attend d'un menu.
 *
 * Le `<details>` natif a deux qualités qu'on garde : il fonctionne sans
 * JavaScript, et il est accessible au clavier — c'est pour cela que l'en-tête
 * reste un composant serveur. Mais il ne se referme ni avec Échap, ni en
 * cliquant à côté : le panneau recouvre la page, et il fallait retrouver
 * l'avatar pour s'en sortir. Cette enveloppe ajoute les deux, sans rien
 * retirer au comportement de base.
 */
export function MenuDeroulant({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !menu.current?.open) return;
      menu.current.open = false;
      // Rendre le focus au bouton : sinon il reste sur un lien devenu
      // invisible, et la tabulation suivante repart du haut de la page.
      menu.current.querySelector("summary")?.focus();
    };
    const surClic = (e: PointerEvent) => {
      if (menu.current?.open && !menu.current.contains(e.target as Node)) {
        menu.current.open = false;
      }
    };
    document.addEventListener("keydown", surTouche);
    document.addEventListener("pointerdown", surClic);
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.removeEventListener("pointerdown", surClic);
    };
  }, []);

  return (
    <details ref={menu} className={className}>
      {children}
    </details>
  );
}

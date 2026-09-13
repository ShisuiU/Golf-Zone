import { test, expect } from "@playwright/test";
import { closeDb, publish, resetDb, signup } from "./helpers";

/** Ce qui doit tenir sur chaque page, quelle que soit sa taille. */
const PAGES = ["/", "/membres", "/duels", "/mentions", "/confidentialite", "/connexion"];

test.beforeEach(resetDb);
test.afterAll(closeDb);

for (const chemin of PAGES) {
  test(`${chemin} : un seul titre, un pied de page, aucun débordement`, async ({ page }) => {
    await page.goto(chemin);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('footer a[href="/mentions"]')).toHaveCount(1);

    for (const largeur of [390, 1440]) {
      await page.setViewportSize({ width: largeur, height: 900 });
      const debordement = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(debordement, `débordement horizontal à ${largeur}px`).toBe(0);
    }
  });
}

test("le focus clavier reste visible sur tous les champs", async ({ page }) => {
  await signup(page, "clavier");
  await page.goto("/profil");
  await page.click('button:has-text("Modifier mon profil")');

  const sansAnneau: string[] = [];
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const invisible = style.outlineStyle === "none" || style.outlineWidth === "0px";
      return invisible ? `${el.tagName.toLowerCase()}#${el.id || el.getAttribute("name") || "?"}` : null;
    });
    if (info) sansAnneau.push(info);
  }
  expect(sansAnneau, "éléments atteints au clavier sans anneau de focus").toEqual([]);
});

test("le mouvement se coupe quand le système le demande", async ({ browser }) => {
  const page = await (await browser.newContext({ reducedMotion: "reduce" })).newPage();
  await signup(page, "sobre");
  await publish(page, "Une publication.");
  await page.goto("/");

  const mesures = await page.evaluate(() => {
    const carte = document.querySelector("main .animate-rise");
    return {
      animation: carte ? getComputedStyle(carte).animationDuration : null,
      opacite: carte ? getComputedStyle(carte).opacity : null,
    };
  });
  // Chacun des trois moteurs écrit cette durée à sa façon (« 0.01ms »,
  // « 1e-05s », « 0.00001s ») : c'est la valeur qui compte, pas la graphie.
  expect(mesures.animation).toMatch(/^[\d.e-]+m?s$/);
  const secondes = mesures.animation!.endsWith("ms")
    ? Number(mesures.animation!.slice(0, -2)) / 1000
    : Number(mesures.animation!.slice(0, -1));
  expect(secondes).toBeLessThan(0.001);
  // Et surtout : le contenu reste lisible, il n'est pas resté transparent.
  expect(mesures.opacite).toBe("1");
  await expect(page.locator("article")).toHaveCount(1);
  await page.close();
});

test("une page inconnue répond 404 avec la mise en page du site", async ({ page }) => {
  const reponse = await page.goto("/cette-page-nexiste-pas");
  expect(reponse?.status()).toBe(404);
  await expect(page.locator("h1")).toContainText("n'existe pas");
});

test("un contenu long est abrégé, pas poussé hors de l'écran", async ({ page }) => {
  await signup(page, "proprietaire-mk2-16s");
  await page.goto("/profil");
  await page.click('button:has-text("Modifier mon profil")');
  await page.fill("#car", "Golf 2 GTI 16S Édition Spéciale Anniversaire");
  await page.fill("#city", "Saint-Germain-en-Laye");
  await page.click('button:has-text("Enregistrer")');
  await page.waitForSelector("text=Profil enregistré");

  for (const chemin of ["/membres", "/membre/proprietaire-mk2-16s"]) {
    for (const largeur of [320, 390, 768]) {
      await page.setViewportSize({ width: largeur, height: 900 });
      await page.goto(chemin);
      const fautifs = await page.evaluate(() =>
        [...document.querySelectorAll("main *")]
          .filter(
            (e) => {
              const style = getComputedStyle(e);
              // `clientWidth` vaut 0 pour une boîte en ligne — Firefox suit la
              // spécification à la lettre, Chrome non. Sans cette exclusion,
              // chaque lien au fil du texte passerait pour un débordement.
              if (style.display === "inline") return false;
              // Une boîte qui coupe proprement (ellipse) n'est pas fautive.
              return style.overflowX === "visible" && e.scrollWidth > e.clientWidth + 1;
            },
          )
          .map((e) => `${e.tagName.toLowerCase()} « ${(e.textContent ?? "").trim().slice(0, 30)} »`),
      );
      expect(fautifs, `${chemin} à ${largeur}px`).toEqual([]);
    }
  }
});

test("une carte a la même largeur dans le fil et sur son lien permanent", async ({ page }) => {
  await signup(page, "mesure");
  await publish(page, "Une publication pour mesurer la colonne.");

  // 768 : la colonne latérale n'est pas encore là. 1440 : elle l'est.
  for (const largeur of [768, 820, 1440]) {
    await page.setViewportSize({ width: largeur, height: 1000 });
    await page.goto("/");
    const carte = page.locator("article").first();
    const dansLeFil = await carte.evaluate((e) => (e as HTMLElement).offsetWidth);
    await carte.getByRole("link", { name: /il y a|à l'instant/ }).click();
    await page.waitForURL(/\/publication\//);
    // La photo se déplace d'une page à l'autre : mesurée pendant la
    // transition, WebKit renvoie 0. On attend que la carte soit posée.
    const arrivee = page.locator("article").first();
    await expect(arrivee).toBeVisible();
    await expect
      .poll(() => arrivee.evaluate((e) => (e as HTMLElement).offsetWidth))
      .toBeGreaterThan(0);
    const surSaPage = await arrivee.evaluate((e) => (e as HTMLElement).offsetWidth);
    expect(dansLeFil, `largeur de la carte à ${largeur}px`).toBe(surSaPage);
  }
});

test("le clavier atteint le contenu en une tabulation", async ({ page }) => {
  for (const chemin of ["/", "/membres", "/duels"]) {
    await page.goto(chemin);
    await page.keyboard.press("Tab");
    const premier = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return { texte: el?.textContent?.trim(), visible: el ? el.getBoundingClientRect().height > 0 : false };
    });
    expect(premier.texte, `premier arrêt de tabulation sur ${chemin}`).toBe("Aller au contenu");
    // Un lien d'évitement invisible même au focus ne sert personne.
    expect(premier.visible, `l'évitement est visible au focus sur ${chemin}`).toBe(true);

    await page.keyboard.press("Enter");
    await expect(page.locator("main#contenu")).toBeFocused();
  }
});

test("les cibles tactiles font au moins 24 px", async ({ page }) => {
  // WCAG 2.5.8 (AA) : 24×24 px pour toute cible qui n'est pas au fil du texte.
  await signup(page, "doigts");
  await publish(page, "Une publication à commenter du bout du doigt.");
  await page.setViewportSize({ width: 390, height: 844 });

  for (const chemin of ["/", "/membres", "/profil", "/notifications", "/compte"]) {
    await page.goto(chemin);
    const petites = await page.evaluate(() =>
      [...document.querySelectorAll("a, button, summary")]
        .filter((e) => {
          const r = e.getBoundingClientRect();
          // Un élément masqué visuellement (le lien d'évitement tant qu'il
          // n'a pas le focus) mesure 1×1 : ce n'est pas une cible tactile.
          if (r.width <= 1 || r.height <= 1) return false;
          if (getComputedStyle(e).display === "inline") return false;
          return r.height < 24 || r.width < 24;
        })
        .map((e) => {
          const r = e.getBoundingClientRect();
          return `${e.tagName.toLowerCase()} « ${(e.textContent ?? "").trim().slice(0, 24)} » ${Math.round(r.width)}×${Math.round(r.height)}`;
        }),
    );
    expect(petites, `cibles trop petites sur ${chemin}`).toEqual([]);
  }
});

test("une adresse sans espace est coupée, pas poussée hors de l'écran", async ({ page }) => {
  // Un lien de forum collé dans une bio ou une légende n'offre aucune césure
  // naturelle : sans `break-words`, il sort de sa boîte.
  const LIEN =
    "https://www.forum-golf-mk2.example/discussions/restauration-complete-moteur-16-soupapes-2004";

  await signup(page, "colleur");
  await page.goto("/profil");
  await page.click('button:has-text("Modifier mon profil")');
  await page.fill("#bio", `Mon sujet : ${LIEN}`);
  await page.fill("#car", "Golf2GTI16SEditionSpecialeAnniversaireAvecUnNomInterminable");
  await page.click('button:has-text("Enregistrer")');
  await page.waitForSelector("text=Profil enregistré");

  await publish(page, `Voir ici : ${LIEN}`);
  await page.fill("input[name=body]", LIEN);
  await page.click('button:has-text("Envoyer")');
  await expect(page.locator("main")).toContainText("forum-golf-mk2");

  for (const largeur of [320, 390]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    for (const chemin of ["/", "/profil", "/membre/colleur"]) {
      await page.goto(chemin);
      const fautifs = await page.evaluate(() =>
        [...document.querySelectorAll("main *")]
          .filter(
            (e) => {
              const style = getComputedStyle(e);
              // `clientWidth` vaut 0 pour une boîte en ligne — Firefox suit la
              // spécification à la lettre, Chrome non. Sans cette exclusion,
              // chaque lien au fil du texte passerait pour un débordement.
              if (style.display === "inline") return false;
              // Une boîte qui coupe proprement (ellipse) n'est pas fautive.
              return style.overflowX === "visible" && e.scrollWidth > e.clientWidth + 1;
            },
          )
          .map((e) => `${e.tagName.toLowerCase()} ${e.scrollWidth}>${e.clientWidth}`),
      );
      expect(fautifs, `${chemin} à ${largeur}px`).toEqual([]);
    }
  }
});

test("le menu du compte se referme comme on s'y attend", async ({ page }) => {
  await signup(page, "menu");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/membres");

  const ouvert = page.locator("header details[open]");
  const bouton = page.locator("header summary:visible");

  await bouton.click();
  await expect(ouvert).toHaveCount(1);

  // Échap : le panneau recouvre la page, il faut pouvoir en sortir au clavier.
  await page.keyboard.press("Escape");
  await expect(ouvert).toHaveCount(0);
  await expect(bouton).toBeFocused();

  // Un clic à côté ferme aussi — le réflexe de tout le monde. Le panneau
  // occupe le haut à droite : ce coin-là est hors de son emprise.
  await bouton.click();
  await expect(ouvert).toHaveCount(1);
  await page.mouse.click(8, 780);
  await expect(ouvert).toHaveCount(0);
  expect(new URL(page.url()).pathname, "le clic ne devait rien ouvrir").toBe("/membres");

  // Et il ne reste pas ouvert par-dessus la page d'arrivée.
  await bouton.click();
  await page.locator('header details[open] nav a:has-text("Duels")').click();
  await page.waitForURL("**/duels");
  await expect(ouvert).toHaveCount(0);
});

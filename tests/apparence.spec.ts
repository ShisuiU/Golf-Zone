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
  // Chrome exprime 0,01 ms en notation scientifique.
  expect(mesures.animation).toMatch(/^(0\.01ms|1e-05s)$/);
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

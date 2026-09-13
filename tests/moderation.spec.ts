import { test, expect } from "@playwright/test";
import { closeDb, publish, resetDb, signup } from "./helpers";

test.beforeEach(resetDb);
test.afterAll(closeDb);

test("un signalement remonte au modérateur, qui peut supprimer le contenu", async ({ browser }) => {
  const fautif = await browser.newPage();
  await signup(fautif, "fautif");
  await publish(fautif, "Publication qui va être signalée.");
  await fautif.close();

  const temoin = await browser.newPage();
  await signup(temoin, "temoin");
  await temoin.goto("/");
  await temoin.locator('article button:has-text("Signaler")').first().click();
  await temoin.fill("input[name=reason]", "Photo sans rapport avec une Golf.");
  await temoin.locator('form:has(input[name=reason]) button:has-text("Envoyer")').click();
  await expect(temoin.getByText("Signalé, merci")).toBeVisible();

  // Un membre ordinaire ne sait même pas que la page existe.
  await temoin.goto("/moderation");
  await expect(temoin.locator("h1")).toContainText("n'existe pas");
  await temoin.close();

  const moderateur = await browser.newPage();
  await signup(moderateur, "moderateur");
  await moderateur.goto("/moderation");
  await expect(moderateur.locator("main")).toContainText("1 signalement");
  await expect(moderateur.locator("main")).toContainText("Photo sans rapport avec une Golf.");
  await expect(moderateur.locator("main")).toContainText("@fautif", { ignoreCase: true });

  await moderateur.click('button:has-text("Supprimer le contenu")');
  await moderateur.goto("/moderation");
  await expect(moderateur.locator("main")).toContainText("Aucun signalement");
  await moderateur.goto("/");
  await expect(moderateur.locator("article")).toHaveCount(0);
  await moderateur.close();
});

test("on ne peut pas signaler sa propre publication", async ({ page }) => {
  await signup(page, "solitaire");
  await publish(page, "Ma publication.");
  await page.goto("/");
  await expect(page.locator('article button:has-text("Signaler")')).toHaveCount(0);
});

test("le modérateur peut laisser un contenu en place", async ({ browser }) => {
  const auteur = await browser.newPage();
  await signup(auteur, "auteur");
  await publish(auteur, "Publication contestée mais correcte.");
  await auteur.close();

  const temoin = await browser.newPage();
  await signup(temoin, "grincheux");
  await temoin.goto("/");
  await temoin.locator('article button:has-text("Signaler")').first().click();
  await temoin.fill("input[name=reason]", "Je n'aime pas cette couleur.");
  await temoin.locator('form:has(input[name=reason]) button:has-text("Envoyer")').click();
  await expect(temoin.getByText("Signalé, merci")).toBeVisible();
  await temoin.close();

  const moderateur = await browser.newPage();
  await signup(moderateur, "moderateur");
  await moderateur.goto("/moderation");
  await moderateur.click('button:has-text("Laisser en place")');
  await expect(moderateur.locator("main")).toContainText("Aucun signalement");
  await moderateur.goto("/");
  await expect(moderateur.locator("article")).toHaveCount(1);
  await moderateur.close();
});

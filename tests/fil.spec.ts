import { test, expect } from "@playwright/test";
import { closeDb, openAccountMenu, publish, resetDb, signup } from "./helpers";

test.beforeEach(resetDb);
test.afterAll(closeDb);

test("une question sans photo apparaît dans le fil", async ({ page }) => {
  await signup(page, "curieuse");
  await publish(page, "Quelqu'un a déjà changé la pompe à eau sur une 7.5 ?");
  await page.goto("/");
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.locator("article")).toContainText("pompe à eau");
});

test("un membre aime la publication d'un autre, une seule fois", async ({ browser }) => {
  const auteur = await browser.newPage();
  await signup(auteur, "auteure");
  await publish(auteur, "Première sortie après le kit suspension.");

  const lectrice = await browser.newPage();
  await signup(lectrice, "lectrice");
  await lectrice.goto("/");
  const bouton = lectrice.locator("article button[aria-pressed]").first();
  await bouton.click();
  await expect(bouton).toHaveAttribute("aria-pressed", "true");
  await expect(bouton).toContainText("1");

  // Rechargement : le like a bien été enregistré, pas seulement affiché.
  await lectrice.reload();
  await expect(lectrice.locator('article button[aria-pressed="true"]')).toHaveCount(1);

  await bouton.click();
  await expect(bouton).toHaveAttribute("aria-pressed", "false");
  await auteur.close();
  await lectrice.close();
});

test("le fil ne joint que les derniers commentaires et renvoie au reste", async ({ page }) => {
  await signup(page, "bavarde");
  await publish(page, "Publication très commentée.");

  const carte = page.locator("article").first();
  for (let i = 1; i <= 5; i++) {
    await carte.locator("input[name=body]").fill(`Commentaire numéro ${i}`);
    await carte.locator('button:has-text("Envoyer")').click();
    await expect(page.getByText(`Commentaire numéro ${i}`)).toBeVisible();
  }

  await page.goto("/");
  await expect(carte.locator("li")).toHaveCount(3);
  await expect(carte).toContainText("5 commentaires");
  await expect(carte).toContainText("Voir 2 commentaires de plus");
  await expect(carte).toContainText("Commentaire numéro 5");
  await expect(carte).not.toContainText("Commentaire numéro 1");

  await carte.getByText("Voir 2 commentaires de plus").click();
  await page.waitForURL(/\/publication\/\d+/);
  await expect(page.locator("article li")).toHaveCount(5);
});

test("le fil se pagine par curseur", async ({ page }) => {
  await signup(page, "prolifique");
  for (let i = 1; i <= 22; i++) await publish(page, `Publication numéro ${i}`);

  await page.goto("/");
  await expect(page.locator("article")).toHaveCount(20);

  await page.click('a:has-text("Publications plus anciennes")');
  await page.waitForURL(/avant=/);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("article")).toHaveCount(2);
  await expect(page.locator('a:has-text("Publications plus anciennes")')).toHaveCount(0);
  // Pas de doublon d'une page à l'autre.
  await expect(page.getByText("Publication numéro 22")).toHaveCount(0);
});

test("un visiteur lit tout mais doit s'inscrire pour agir", async ({ browser, page }) => {
  const membre = await browser.newPage();
  await signup(membre, "hote");
  await publish(membre, "Bienvenue à tous.");
  await membre.close();

  await page.goto("/");
  await expect(page.locator("article")).toContainText("Bienvenue à tous");
  // L'invitation ne se répète pas sur chaque carte.
  await expect(page.getByText("pour aimer et commenter")).toHaveCount(1);

  await page.locator("article button[aria-pressed]").first().click();
  await page.waitForURL(/\/inscription/);
});

test("l'auteur peut supprimer sa publication, personne d'autre", async ({ browser }) => {
  const auteur = await browser.newPage();
  await signup(auteur, "proprietaire");
  await publish(auteur, "Publication à supprimer.");

  const autre = await browser.newPage();
  await signup(autre, "passante");
  await autre.goto("/");
  await expect(autre.locator('article header button:has-text("Supprimer")')).toHaveCount(0);
  await autre.close();

  await auteur.goto("/");
  await auteur.locator('article header button:has-text("Supprimer")').click();
  await expect(auteur.locator("article")).toHaveCount(0);
  await auteur.close();
});

test("le menu du compte mène au compte et déconnecte", async ({ page }) => {
  await signup(page, "membre");
  await page.goto("/");
  const menu = await openAccountMenu(page);
  await expect(menu).toContainText("Mon compte");
  await menu.getByRole("link", { name: "Mon compte" }).click();
  await expect(page).toHaveURL(/\/compte$/);

  await page.goto("/");
  const encore = await openAccountMenu(page);
  await encore.getByRole("button", { name: "Se déconnecter" }).click();
  await page.waitForURL("/");
  await expect(page.getByRole("link", { name: "Rejoindre" }).first()).toBeVisible();
});

test("l'auteur corrige sa publication sans perdre les réactions", async ({ browser }) => {
  const auteur = await browser.newPage();
  await signup(auteur, "maladroite");
  await publish(auteur, "Premère sortie après le kit suspension.");

  const lectrice = await browser.newPage();
  await signup(lectrice, "attentive");
  await lectrice.goto("/");
  await lectrice.locator("article button[aria-pressed]").first().click();
  await lectrice.locator("article input[name=body]").fill("Belle photo.");
  await lectrice.locator('article button:has-text("Envoyer")').click();
  await expect(lectrice.getByText("Belle photo.")).toBeVisible();
  await lectrice.close();

  await auteur.goto("/");
  await auteur.locator('article button:has-text("Modifier")').click();
  await auteur.locator("article textarea").fill("Première sortie après le kit suspension.");
  await auteur.locator('article select').selectOption("Mk7");
  await auteur.locator('article button:has-text("Enregistrer")').click();
  await expect(auteur.getByText("Première sortie après le kit suspension.")).toBeVisible();

  await auteur.reload();
  const carte = auteur.locator("article").first();
  await expect(carte).toContainText("Première sortie");
  await expect(carte).toContainText("Golf Mk7");
  // La correction est signalée, et rien n'a été perdu au passage.
  await expect(carte).toContainText("modifiée");
  await expect(carte.locator("button[aria-pressed]")).toContainText("1");
  await expect(carte).toContainText("Belle photo.");
  await auteur.close();
});

test("on ne peut pas corriger la publication d'un autre", async ({ browser }) => {
  const auteur = await browser.newPage();
  await signup(auteur, "titulaire");
  await publish(auteur, "Publication protégée.");
  await auteur.close();

  const autre = await browser.newPage();
  await signup(autre, "intruse");
  await autre.goto("/");
  await expect(autre.locator('article button:has-text("Modifier")')).toHaveCount(0);
  await autre.close();
});

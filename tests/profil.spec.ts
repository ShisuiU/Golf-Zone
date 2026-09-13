import { test, expect } from "@playwright/test";
import path from "node:path";
import { closeDb, publish, resetDb, signup } from "./helpers";

const PHOTO = path.join(__dirname, "fixtures", "photo-avec-gps.jpg");

test.beforeEach(resetDb);
test.afterAll(closeDb);

test("la fiche vide n'affiche rien plutôt que des tirets", async ({ page }) => {
  await signup(page, "discrete");
  const fiche = await page.locator("main section").first().innerText();
  expect(fiche).not.toMatch(/null|undefined|—/);
  expect(fiche).toContain("Membre depuis");
});

test("un membre renseigne sa fiche et la retrouve affichée", async ({ page }) => {
  await signup(page, "bricoleuse");
  await page.click('button:has-text("Modifier mon profil")');
  await page.fill("#bio", "Mk7 GTE depuis 2020.");
  await page.fill("#car", "Golf 7.5 GTE 2020");
  await page.fill("#city", "Nantes");
  await page.fill("#birthYear", "1998");
  await page.click('button:has-text("Enregistrer")');
  await expect(page.getByText("Profil enregistré")).toBeVisible();

  await page.reload();
  const fiche = page.locator("main section").first();
  await expect(fiche).toContainText("Mk7 GTE depuis 2020.");
  await expect(fiche).toContainText("Golf 7.5 GTE 2020");
  await expect(fiche).toContainText("Nantes");
  await expect(fiche).toContainText(`${new Date().getFullYear() - 1998} ans`);
});

test("une année de naissance absurde est refusée", async ({ page }) => {
  await signup(page, "intemporelle");
  await page.click('button:has-text("Modifier mon profil")');
  await page.fill("#birthYear", "1200");
  await page.click('button:has-text("Enregistrer")');
  await expect(page.getByText("Année attendue")).toBeVisible();
});

test("changer sa photo de profil remplace l'ancienne et l'efface", async ({ page }) => {
  await signup(page, "poseuse");
  await page.click('button:has-text("Modifier mon profil")');
  await page.setInputFiles("#avatar", PHOTO);
  await page.waitForFunction(() => !document.body.innerText.includes("Compression en cours"));
  await page.click('button:has-text("Enregistrer")');
  await expect(page.getByText("Profil enregistré")).toBeVisible();

  await page.goto("/profil");
  const avant = await page.locator("main img").first().getAttribute("src");
  expect(avant).toMatch(/^\/photos\/\d+$/);

  await page.click('button:has-text("Modifier mon profil")');
  await page.setInputFiles("#avatar", PHOTO);
  await page.waitForFunction(() => !document.body.innerText.includes("Compression en cours"));
  await page.click('button:has-text("Enregistrer")');
  await expect(page.getByText("Profil enregistré")).toBeVisible();

  await page.goto("/profil");
  const apres = await page.locator("main img").first().getAttribute("src");
  expect(apres).not.toBe(avant);
  // L'ancienne ligne est supprimée : `no-store` pour ne pas interroger le
  // cache immuable du navigateur.
  const statut = await page.evaluate(
    (url) => fetch(url, { cache: "no-store" }).then((r) => r.status),
    avant!,
  );
  expect(statut).toBe(404);
});

test("le profil public montre les publications et les compteurs", async ({ browser }) => {
  const auteur = await browser.newPage();
  await signup(auteur, "exposee");
  await publish(auteur, "Ma première publication.");

  const visiteur = await browser.newPage();
  await signup(visiteur, "visiteuse");
  await visiteur.goto("/");
  await visiteur.locator("article button[aria-pressed]").first().click();
  await visiteur.waitForTimeout(500);

  await visiteur.goto("/membre/exposee");
  const fiche = visiteur.locator("main section").first();
  await expect(fiche).toContainText("1");
  await expect(fiche).toContainText("likes reçus");
  await expect(visiteur.locator("article")).toHaveCount(1);
  // Sur le profil d'un autre, ni édition ni suppression.
  await expect(visiteur.locator('button:has-text("Modifier mon profil")')).toHaveCount(0);
  await expect(visiteur.locator('article header button:has-text("Supprimer")')).toHaveCount(0);

  // Sa propre fiche renvoie vers la page qui permet de publier.
  await visiteur.goto("/membre/visiteuse");
  await expect(visiteur).toHaveURL(/\/profil$/);
  await auteur.close();
  await visiteur.close();
});

test("l'annuaire liste les membres avec des compteurs accordés", async ({ browser }) => {
  const un = await browser.newPage();
  await signup(un, "premiere");
  await publish(un, "Une publication.");
  await un.goto("/membres");
  await expect(un.locator("main")).toContainText("@premiere");
  await expect(un.locator("main")).toContainText("1 publication ");
  await expect(un.locator("main")).toContainText("0 like");
  await expect(un.locator("main")).not.toContainText("1 publications");
  await un.close();
});

test("supprimer son compte efface ce qu'il a publié", async ({ page }) => {
  await signup(page, "partante");
  await publish(page, "Publication qui doit disparaître.");

  await page.goto("/compte");
  await page.click('button:has-text("Supprimer mon compte")');
  await page.fill("#deletePassword", "motdepasse-solide-42");
  await page.fill("#deleteConfirm", "SUPPRIMER");
  await page.click('button:has-text("Supprimer définitivement")');
  await page.waitForURL("/");

  await expect(page.locator("article")).toHaveCount(0);
  await page.goto("/membres");
  await expect(page.locator("main")).not.toContainText("@partante");
});

import { test, expect } from "@playwright/test";
import { closeDb, db, login, logout, PASSWORD, resetDb, signup } from "./helpers";

test.beforeEach(resetDb);
test.afterAll(closeDb);

test("un visiteur crée un compte et arrive sur son profil", async ({ page }) => {
  await signup(page, "nouvelle");
  await expect(page).toHaveURL(/\/profil$/);
  await expect(page.locator("h1")).toContainText("@nouvelle");
});

test("le pseudo et l'e-mail ne peuvent pas être repris", async ({ page }) => {
  await signup(page, "occupee");
  await logout(page);

  await page.goto("/inscription");
  await page.fill("#handle", "occupee");
  await page.fill("#email", "autre@example.test");
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await expect(page.getByText("Ce pseudo est déjà pris")).toBeVisible();
});

test("la connexion refuse le mauvais mot de passe sans dire pourquoi", async ({ page }) => {
  await signup(page, "prudente");
  await logout(page);

  await login(page, "prudente", "mauvais-mot-de-passe");
  // Le même message qu'un e-mail inconnu : la page ne doit pas servir
  // d'annuaire des inscrits.
  await expect(page.getByText("E-mail ou mot de passe incorrect")).toBeVisible();
});

test("les tentatives répétées finissent par être bloquées", async ({ page }) => {
  await signup(page, "ciblee");
  await logout(page);

  let blockedAt = 0;
  for (let attempt = 1; attempt <= 7 && !blockedAt; attempt++) {
    await login(page, "ciblee", `essai-${attempt}`);
    await page.waitForSelector("text=/incorrect|Trop de tentatives/");
    if (await page.getByText("Trop de tentatives").isVisible()) blockedAt = attempt;
  }
  expect(blockedAt).toBeGreaterThan(0);
  expect(blockedAt).toBeLessThanOrEqual(6);
  await expect(page.getByText(/Réessayez dans \d+ minute/)).toBeVisible();

  // Le verrou tient même avec le bon mot de passe : c'est tout son intérêt.
  await login(page, "ciblee", PASSWORD);
  await expect(page).toHaveURL(/\/connexion/);
});

test("le lien de réinitialisation ne sert qu'une fois", async ({ page }) => {
  await signup(page, "oublieuse");
  const { rows } = await db().query("SELECT id FROM users WHERE handle = $1", ["oublieuse"]);
  const { createHash, randomBytes } = await import("node:crypto");
  const token = randomBytes(32).toString("base64url");
  await db().query(
    `INSERT INTO tokens (token_hash, user_id, purpose, expires_at)
     VALUES ($1, $2, 'reset', now() + interval '1 hour')`,
    [createHash("sha256").update(token).digest("hex"), rows[0].id],
  );

  await page.goto(`/reinitialiser/${token}`);
  await page.fill("#password", "un-tout-nouveau-mot-de-passe");
  await page.fill("#confirm", "un-tout-nouveau-mot-de-passe");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/profil$/);

  await page.goto(`/reinitialiser/${token}`);
  await page.fill("#password", "encore-un-autre-mot-de-passe");
  await page.fill("#confirm", "encore-un-autre-mot-de-passe");
  await page.click("button[type=submit]");
  await expect(page.getByText(/a expiré ou a déjà servi/)).toBeVisible();
});

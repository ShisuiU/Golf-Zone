import { test, expect } from "@playwright/test";
import { closeDb, db, logout, publish, resetDb, signup, PASSWORD } from "./helpers";

/**
 * Plafonds de rythme.
 *
 * Atteindre dix publications par l'interface prendrait une minute de test
 * pour rien : les tests posent le compteur au plafond en base, puis vérifient
 * que le site refuse et le dit. Ce qui est vérifié de bout en bout, c'est la
 * décision du serveur, pas la façon de compter jusqu'à dix.
 */
test.beforeEach(resetDb);
test.afterAll(closeDb);

/** Place un compteur à son plafond, comme si la personne venait d'y arriver. */
async function saturer(cle: string, atteint: number) {
  await db().query(
    `INSERT INTO rate_limits (key, used, window_end)
     VALUES ($1, $2, now() + interval '60 minutes')
     ON CONFLICT (key) DO UPDATE SET used = $2, window_end = now() + interval '60 minutes'`,
    [cle, atteint],
  );
}

async function idDe(handle: string): Promise<number> {
  const { rows } = await db().query("SELECT id FROM users WHERE handle = $1", [handle]);
  return rows[0].id;
}

test("le compteur monte à chaque publication", async ({ page }) => {
  await signup(page, "compteur");
  await publish(page, "Première publication.");
  await publish(page, "Deuxième publication.");

  const { rows } = await db().query("SELECT used FROM rate_limits WHERE key = $1", [
    `publications:${await idDe("compteur")}`,
  ]);
  expect(rows[0]?.used).toBe(2);
});

test("passé le plafond, publier est refusé et le site le dit", async ({ page }) => {
  await signup(page, "prolixe");
  await saturer(`publications:${await idDe("prolixe")}`, 10);

  await page.goto("/");
  await page.click("textarea[name=caption]");
  await page.fill("textarea[name=caption]", "Une publication de trop.");
  await page.click('form button:has-text("Publier")');

  await expect(page.locator("main")).toContainText("10 publications pour cette heure");
  // Et rien n'est passé en base.
  const { rows } = await db().query("SELECT count(*)::int AS n FROM dossiers");
  expect(rows[0].n).toBe(0);
});

test("un formulaire refusé ne consomme pas le quota", async ({ page }) => {
  await signup(page, "maladroit");
  await page.goto("/");
  await page.click("textarea[name=caption]");
  // Ni texte ni photo : la publication est refusée avant tout décompte.
  await page.click('form button:has-text("Publier")');
  await expect(page.locator("main")).toContainText("Écrivez quelque chose");

  const { rows } = await db().query("SELECT used FROM rate_limits WHERE key = $1", [
    `publications:${await idDe("maladroit")}`,
  ]);
  expect(rows[0], "aucun compteur ne devait être ouvert").toBeUndefined();
});

test("passé le plafond, commenter est refusé", async ({ page }) => {
  await signup(page, "bavard");
  await publish(page, "Une publication à commenter.");
  await saturer(`commentaires:${await idDe("bavard")}`, 40);

  await page.fill("input[name=body]", "Un commentaire de trop.");
  await page.click('button:has-text("Envoyer")');
  await expect(page.locator("main")).toContainText("40 commentaires pour cette heure");
});

test("passé le plafond, l'inscription est refusée depuis la même connexion", async ({ page }) => {
  // La clé dépend de l'adresse vue par le serveur, qui n'est pas la même en
  // local et derrière Vercel : une première inscription la révèle, plutôt que
  // de la deviner.
  await signup(page, "premiere");
  const { rows: cles } = await db().query(
    "SELECT key FROM rate_limits WHERE key LIKE 'inscriptions:%'",
  );
  expect(cles, "l'inscription doit ouvrir un compteur").toHaveLength(1);
  await saturer(cles[0].key, 5);

  // Connecté, /inscription renvoie vers le profil : il faut d'abord sortir.
  await logout(page);
  await page.goto("/inscription");
  await page.fill("#handle", "sixieme");
  await page.fill("#email", "sixieme@example.test");
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");

  await expect(page.locator("main")).toContainText("Trop d'inscriptions");
  // Seule la première est passée.
  const { rows } = await db().query("SELECT count(*)::int AS n FROM users");
  expect(rows[0].n).toBe(1);
});

test("le ménage efface ce qui a expiré, et rien d'autre", async ({ page, request }) => {
  await signup(page, "durable");
  const id = await idDe("durable");

  // Une session périmée, un jeton consommé, un compteur dormant.
  await db().query(
    `INSERT INTO sessions (token_hash, user_id, expires_at)
     VALUES ('perimee', $1, now() - interval '1 day')`,
    [id],
  );
  await db().query(
    `INSERT INTO tokens (token_hash, user_id, purpose, expires_at, used_at)
     VALUES ('consomme', $1, 'verify', now() + interval '1 day', now())`,
    [id],
  );
  await db().query(
    `INSERT INTO rate_limits (key, used, window_end)
     VALUES ('vieux', 3, now() - interval '2 days')`,
  );

  const avant = await db().query("SELECT count(*)::int AS n FROM sessions");
  const reponse = await request.get("/api/entretien");
  expect(reponse.ok()).toBe(true);
  expect(await reponse.json()).toMatchObject({
    efface: { sessions: 1, jetons: 1, quotas: 1 },
  });

  // La session encore valable de « durable » est toujours là.
  const apres = await db().query("SELECT count(*)::int AS n FROM sessions");
  expect(apres.rows[0].n).toBe(avant.rows[0].n - 1);
  await page.goto("/profil");
  await expect(page.locator("main")).toContainText("@durable");
});

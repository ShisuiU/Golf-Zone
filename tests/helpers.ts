import { Pool } from "pg";
import type { Page } from "@playwright/test";

/**
 * Outillage commun aux tests.
 *
 * Les tests parlent à la base directement pour préparer et vérifier l'état :
 * passer uniquement par l'interface rendrait chaque scénario interminable, et
 * masquerait ce que l'on veut réellement contrôler.
 */
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/zonegolf_test";

const BASE = `http://127.0.0.1:${process.env.PORT ?? 3100}`;

let pool: Pool | undefined;
let schemaReady = false;

export function db(): Pool {
  pool ??= new Pool({ connectionString: DATABASE_URL, max: 2 });
  return pool;
}

export async function closeDb() {
  await pool?.end();
  pool = undefined;
}

/**
 * Le schéma appartient à l'application, qui le crée au premier accès. Les
 * tests la sollicitent une fois plutôt que de recopier le DDL ici — une copie
 * finirait par diverger sans que rien ne le signale.
 */
async function waitForSchema() {
  if (schemaReady) return;
  for (let essai = 0; essai < 30; essai++) {
    // Une page qui lit la base répond 200 : le schéma est donc entièrement
    // appliqué. Inspecter une table nommée ferait manquer les suivantes —
    // c'est ce qui est arrivé quand `rate_limits` est apparue, la sonde
    // s'arrêtant à l'existence de `users`.
    const reponse = await fetch(`${BASE}/membres`).catch(() => undefined);
    if (reponse?.ok) {
      schemaReady = true;
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("L'application n'a pas créé le schéma : la base est-elle joignable ?");
}

/** Table rase entre deux scénarios. Le reste part en cascade depuis `users`. */
export async function resetDb() {
  await waitForSchema();
  await db().query("TRUNCATE users CASCADE");
  await db().query("DELETE FROM login_attempts");
  await db().query("DELETE FROM rate_limits");
}

export const PASSWORD = "motdepasse-solide-42";

/** Crée un compte par l'interface, comme le ferait un vrai membre. */
export async function signup(page: Page, handle: string) {
  await page.goto("/inscription");
  await page.fill("#handle", handle);
  await page.fill("#email", `${handle}@example.test`);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((url) => !url.pathname.includes("inscription"));
}

export async function login(page: Page, handle: string, password = PASSWORD) {
  await page.goto("/connexion");
  await page.fill("#email", `${handle}@example.test`);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
}

/** Publie depuis le fil. `photo` est un chemin de fichier. */
export async function publish(page: Page, caption: string, photo?: string) {
  await page.goto("/");
  await page.click("textarea[name=caption]");
  await page.fill("textarea[name=caption]", caption);
  if (photo) {
    await page.setInputFiles("#photo", photo);
    await page.waitForFunction(() => !document.body.innerText.includes("Compression en cours"));
  }
  await page.click('form button:has-text("Publier")');
  await page.waitForSelector(`text=${caption.slice(0, 30)}`);
}

/**
 * Déconnexion par la page du compte. Trois boutons portent ce libellé — les
 * deux menus de l'en-tête et celui-ci — d'où la portée explicite.
 */
export async function logout(page: Page) {
  await page.goto("/compte");
  await page.locator('main button:has-text("Se déconnecter")').click();
  await page.waitForURL("/");
}

/** Le menu du compte, dans l'en-tête — celui des deux qui est visible. */
export async function openAccountMenu(page: Page) {
  await page.locator("header summary:visible").click();
  return page.locator("header details[open] nav");
}

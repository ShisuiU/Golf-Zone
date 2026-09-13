import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout, dans un vrai navigateur.
 *
 * Ils partagent une base de données : un seul ouvrier, et pas de parallélisme
 * à l'intérieur d'un fichier. C'est plus lent qu'une exécution répartie, mais
 * un jeu d'essai commun rend les échecs lisibles — et la suite tient en une
 * poignée de minutes.
 *
 * `CHROMIUM_PATH` sert aux environnements qui fournissent déjà un navigateur
 * (conteneurs de développement) ; sans elle, Playwright utilise celui qu'il a
 * installé lui-même.
 *
 * `NAVIGATEURS=tous` ajoute Firefox et WebKit — le moteur de Safari, donc de
 * tous les navigateurs sur iPhone. Le site s'appuie sur des choses que les
 * trois moteurs n'implémentent pas de la même façon (transitions de vue,
 * menus en `<details>`, biseaux en `clip-path`) : les vérifier sur un seul
 * ne prouve pas grand-chose. Ce n'est pas la valeur par défaut parce que la
 * suite triple de durée ; il faut les installer d'abord :
 *     npx playwright install firefox webkit
 */
const PORT = Number(process.env.PORT ?? 3100);
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/zonegolf_test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Seulement pour Chromium : imposer ce binaire à Firefox ou à
        // WebKit les empêcherait de démarrer.
        launchOptions: process.env.CHROMIUM_PATH
          ? { executablePath: process.env.CHROMIUM_PATH }
          : {},
      },
    },
    ...(process.env.NAVIGATEURS === "tous"
      ? [
          { name: "firefox", use: { ...devices["Desktop Firefox"] } },
          { name: "webkit", use: { ...devices["Desktop Safari"] } },
        ]
      : []),
  ],

  webServer: {
    command: `npm run start -- --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      DATABASE_URL,
      // La file de modération n'existe que pour les pseudos listés ici.
      ZONE_GOLF_MODERATEURS: "moderateur",
    },
  },
});

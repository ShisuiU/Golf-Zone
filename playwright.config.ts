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
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {},
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

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

import { test, expect } from "@playwright/test";
import path from "node:path";
import { closeDb, publish, resetDb, signup } from "./helpers";

const AVEC_GPS = path.join(__dirname, "fixtures", "photo-avec-gps.jpg");

test.beforeEach(resetDb);
test.afterAll(closeDb);

test("la photo publiée ne porte plus les coordonnées de la prise de vue", async ({ page }) => {
  await signup(page, "photographe");
  await publish(page, "Photo prise devant chez moi.", AVEC_GPS);

  const src = await page.locator("article img").first().getAttribute("src");
  expect(src).toMatch(/^\/photos\/\d+$/);

  const servi = await page.evaluate(async (url) => {
    const octets = new Uint8Array(await (await fetch(url)).arrayBuffer());
    const texte = new TextDecoder("latin1").decode(octets);
    return {
      taille: octets.length,
      exif: texte.includes("Exif"),
      gps: texte.includes("\x88\x25"), // pointeur d'IFD GPS
      debut: Array.from(octets.subarray(0, 2)),
      fin: Array.from(octets.subarray(-2)),
    };
  }, src!);

  expect(servi.exif, "aucun bloc EXIF dans l'image servie").toBe(false);
  expect(servi.gps, "aucune IFD GPS dans l'image servie").toBe(false);
  // Et l'image reste un JPEG complet : un nettoyage qui casse le fichier ne
  // vaudrait rien.
  expect(servi.debut).toEqual([0xff, 0xd8]);
  expect(servi.fin).toEqual([0xff, 0xd9]);
  expect(servi.taille).toBeGreaterThan(1000);
});

test("la photo s'affiche à ses vraies dimensions", async ({ page }) => {
  await signup(page, "cadreuse");
  await publish(page, "Une photo au bon format.", AVEC_GPS);
  const dimensions = await page
    .locator("article img")
    .first()
    .evaluate((img: HTMLImageElement) => `${img.naturalWidth}x${img.naturalHeight}`);
  expect(dimensions).toBe("640x420");
});

test("un fichier qui n'est pas une image est refusé", async ({ page }) => {
  await signup(page, "malicieuse");
  await page.goto("/");
  await page.click("textarea[name=caption]");
  await page.setInputFiles("#photo", {
    name: "faux.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("ceci n'est pas une image"),
  });
  await page.click('form button:has-text("Publier")');
  await expect(page.getByText("Format non reconnu")).toBeVisible();
});

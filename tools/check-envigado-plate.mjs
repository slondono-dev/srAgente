import { chromium } from "playwright";

const portalUrl =
  process.env.ENVIGADO_PORTAL_URL ||
  "https://movilidad.envigado.gov.co/portal-servicios/";
const plate = (process.argv[2] || process.env.VEHICLE_PLATE || "")
  .trim()
  .toUpperCase();

if (!/^[A-Z0-9]{5,8}$/.test(plate)) {
  console.error("Usage: node check-envigado-plate.mjs ABC123");
  process.exit(1);
}

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

try {
  await page.goto(portalUrl, { waitUntil: "domcontentloaded" });

  const closeButton = page.getByRole("button", { name: "Close" });
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
  }

  // The portal repeats id="busqueda"; the first one is the main search box.
  const searchInput = page.locator("#busqueda").first();
  await searchInput.waitFor({ state: "visible" });
  await searchInput.fill(plate);

  await Promise.all([
    page.waitForURL(/#\/resultado-home-public\//),
    page.locator("#btnBuscar").first().click(),
  ]);

  const result = page.locator("main p, [ui-view] p").filter({
    hasText: /multa|acuerdo de pago/i,
  });
  const message = (await result.first().innerText()).trim();

  console.log(`${plate}: ${message}`);
  console.log("The browser will remain open. Press Enter to close it.");

  await new Promise((resolve) => process.stdin.once("data", resolve));
} catch (error) {
  console.error(`Unable to complete the query: ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}

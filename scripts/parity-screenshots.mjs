/**
 * Capture full-page screenshots of mirrored routes for visual parity checks.
 * Usage: node scripts/parity-screenshots.mjs [baseUrl]
 * Example: npm run serve & node scripts/parity-screenshots.mjs http://127.0.0.1:3333
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "techrecomm-mirror", "screenshots");
const base =
  process.argv[2]?.replace(/\/$/, "") || "http://127.0.0.1:3333";

const routes = [
  "/",
  "/about-us.html",
  "/meet-the-team.html",
  "/apple-ipad.html",
  "/apple-iphone.html",
  "/apple-iwatch.html",
  "/apple-accessories.html",
  "/samsung-phones.html",
  "/samsung-watches.html",
  "/samsung-tablets.html",
  "/sell-to-us.html",
  "/buy-from-us.html",
  "/grading.html",
  "/contact-us.html",
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const route of routes) {
    const url = base + (route.startsWith("/") ? route : "/" + route);
    const name = route === "/" ? "home" : route.replace(/^\//, "").replace(/\.html$/, "");
    const path = join(OUT, `${name}-desktop.png`);
    try {
      await page.goto(url, { waitUntil: "load", timeout: 45000 });
      await new Promise((r) => setTimeout(r, 2500));
      await page.screenshot({ path, fullPage: true });
      console.log("ok", url, "->", path);
    } catch (e) {
      console.error("fail", url, String(e));
    }
  }

  await page.close();
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

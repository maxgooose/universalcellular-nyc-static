/**
 * Capture full-page screenshots of mirrored routes for visual parity checks.
 * Usage: node scripts/parity-screenshots.mjs [baseUrl]
 * Example: npm run serve & node scripts/parity-screenshots.mjs http://127.0.0.1:3333
 */
import { chromium } from "playwright";
import { mkdirSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = join(__dirname, "..", "techrecomm-mirror", "site");
const OUT = join(__dirname, "..", "techrecomm-mirror", "screenshots");
const base = process.argv[2]?.replace(/\/$/, "") || "http://127.0.0.1:3333";

function firstDirs(parent, count) {
  const p = join(SITE_ROOT, parent);
  if (!existsSync(p)) return [];
  return readdirSync(p, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .slice(0, count)
    .map((e) => `/${parent}/${e.name}/`);
}

const routes = [
  "/",
  "/pages/about-us/",
  "/pages/warranty/",
  "/collections/apple/",
  "/collections/refurbished-iphones/",
  "/blogs/news-and-blogs/",
  "/search/",
  ...firstDirs("products", 2),
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const route of routes) {
    const url = base + route;
    const name =
      route === "/"
        ? "home"
        : route.replace(/^\/|\/$/g, "").replace(/\//g, "-");
    const path = join(OUT, `${name}-desktop.png`);
    try {
      await page.goto(url, { waitUntil: "load", timeout: 45000 });
      await new Promise((r) => setTimeout(r, 2500));
      await page.screenshot({ path, fullPage: true });
      console.log("ok", url, "->", path);
    } catch (e) {
      console.error("fail", url, String(e).slice(0, 200));
    }
  }

  await page.close();
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

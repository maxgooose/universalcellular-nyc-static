/**
 * Load each mirrored page from the LIVE site in headless Chromium and save
 * runtime-requested static assets (lazy JS chunks, fonts, widget files)
 * that the mirror does not have yet, using the shared URL->local mapping.
 * Same-origin runtime imports would otherwise 404 on the static clone.
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, writeFileSync, readdirSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";
import { localRelPathForUrl, BROWSER_UA } from "./urlmap.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = join(__dirname, "..", "techrecomm-mirror", "site");
const BASE = "https://wireless-source.com";

const SKIP_DIRS = new Set(["_cdn", "cdn"]);
const SKIP_RESOURCE_TYPES = new Set(["document", "xhr", "fetch", "websocket"]);

function pageUrls() {
  const urls = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (dir === SITE_ROOT && SKIP_DIRS.has(entry.name)) continue;
        walk(p);
      } else if (entry.name === "index.html") {
        const rel = relative(SITE_ROOT, dir).replace(/\\/g, "/");
        urls.push(rel === "" ? `${BASE}/` : `${BASE}/${rel}/`);
      }
    }
  })(SITE_ROOT);
  return urls;
}

async function main() {
  const urls = pageUrls();
  console.log(`Visiting ${urls.length} live pages for runtime assets.`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: BROWSER_UA });
  let saved = 0;
  const errors = [];

  for (const [i, pageUrl] of urls.entries()) {
    const page = await context.newPage();
    const onResponse = async (response) => {
      try {
        if (response.status() !== 200) return;
        if (SKIP_RESOURCE_TYPES.has(response.request().resourceType())) return;
        const rel = localRelPathForUrl(response.url());
        if (!rel) return;
        const dest = join(SITE_ROOT, ...rel.split("/"));
        if (existsSync(dest)) return;
        const buf = await response.body().catch(() => null);
        if (!buf?.length) return;
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, buf);
        saved++;
      } catch {
        /* ignore individual resource failures */
      }
    };
    page.on("response", onResponse);
    try {
      await page.goto(pageUrl, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await new Promise((r) => setTimeout(r, 1200));
    } catch (e) {
      errors.push({ pageUrl, message: String(e).slice(0, 200) });
    }
    page.off("response", onResponse);
    await page.close();
    if ((i + 1) % 25 === 0) {
      console.log(`  ${i + 1}/${urls.length} pages, ${saved} files saved`);
    }
  }

  await context.close();
  await browser.close();
  console.log(
    JSON.stringify(
      { pagesVisited: urls.length, newFilesWritten: saved, errors: errors.length },
      null,
      2,
    ),
  );
  if (errors.length) console.log("error samples:", errors.slice(0, 5));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Playwright gap-fill (fast): one context, domcontentloaded + short settle.
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, writeFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = join(__dirname, "..", "universalcellular-mirror", "site");

const BASE = "https://universalcellularnyc.com";
const ALLOWED_HOSTS = new Set([
  "universalcellularnyc.com",
  "www.universalcellularnyc.com",
]);

function htmlFilesToPageUrls() {
  const files = readdirSync(SITE_ROOT).filter((f) => f.endsWith(".html"));
  return files.map((f) => {
    if (f === "index.html") return `${BASE}/`;
    const slug = f.replace(/\.html$/i, "");
    return `${BASE}/${slug}/`;
  });
}

function urlToLocalPath(resourceUrl) {
  const u = new URL(resourceUrl);
  let pathname = decodeURIComponent(u.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const segments = pathname.split("/").filter(Boolean);
  return join(SITE_ROOT, ...segments);
}

async function main() {
  const pageUrls = htmlFilesToPageUrls();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const saved = [];
  const errors = [];

  for (const pageUrl of pageUrls) {
    const page = await context.newPage();

    const onResponse = async (response) => {
      const req = response.request();
      const rt = req.resourceType();
      if (
        rt === "document" ||
        rt === "xhr" ||
        rt === "fetch" ||
        rt === "websocket"
      ) {
        return;
      }

      let resUrl;
      try {
        resUrl = response.url();
      } catch {
        return;
      }

      let host;
      try {
        host = new URL(resUrl).hostname;
      } catch {
        return;
      }
      if (!ALLOWED_HOSTS.has(host)) return;
      if (response.status() !== 200) return;

      const localPath = urlToLocalPath(resUrl);
      if (existsSync(localPath)) return;

      const buf = await response.body().catch(() => null);
      if (!buf?.length) return;

      try {
        mkdirSync(dirname(localPath), { recursive: true });
        writeFileSync(localPath, buf);
        saved.push(localPath);
      } catch (e) {
        errors.push({ resUrl, message: String(e) });
      }
    };

    page.on("response", onResponse);

    try {
      await page.goto(pageUrl, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      errors.push({ pageUrl, message: String(e) });
    }

    page.off("response", onResponse);
    await page.close();
  }

  await context.close();
  await browser.close();

  console.log(
    JSON.stringify(
      {
        pagesVisited: pageUrls.length,
        newFilesWritten: saved.length,
        errors: errors.length,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

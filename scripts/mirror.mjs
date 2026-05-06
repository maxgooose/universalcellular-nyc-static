/**
 * Full-domain recursive mirror of universalcellularnyc.com using website-scraper.
 */
import scrape from "website-scraper";
import { rmSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "techrecomm-mirror", "site");

const BASE_HOSTS = new Set([
  "universalcellularnyc.com",
  "www.universalcellularnyc.com",
]);

function allowedUrl(url) {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== "http:" && protocol !== "https:") return false;
    return BASE_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

if (existsSync(ROOT)) {
  rmSync(ROOT, { recursive: true, force: true });
}

console.log("Mirroring to:", ROOT);

await scrape({
  urls: ["https://universalcellularnyc.com/"],
  directory: ROOT,
  recursive: true,
  maxRecursiveDepth: 40,
  requestConcurrency: 6,
  request: {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    },
  },
  urlFilter: allowedUrl,
  // prettifyUrls breaks SVG fragment refs (fill:url(#id) → fill:url(page.html#id))
  prettifyUrls: false,
  ignoreErrors: true,
});

console.log("Mirror complete.");

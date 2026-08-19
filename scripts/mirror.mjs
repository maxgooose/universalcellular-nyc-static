/**
 * Full mirror of the wireless-source.com storefront (English pages only).
 *
 * Seeds every URL found in the Shopify sitemaps (products / pages /
 * collections / blogs) so pages reachable only through pagination are still
 * captured, then lets website-scraper recurse for nav-linked extras
 * (policies, /search, /cart). Crawl is same-origin only; external CDN
 * assets are localized afterwards by scripts/localize.mjs.
 */
import scrape from "website-scraper";
import {
  rmSync,
  existsSync,
  readdirSync,
  renameSync,
  mkdirSync,
  writeFileSync,
} from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { SITE_HOSTS, BROWSER_UA } from "./urlmap.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "techrecomm-mirror", "site");

const ORIGIN = "https://wireless-source.com";
const LOCALE_RE = /^\/(es|pt|tr|zh|fr)(\/|$)/i;
const DENY_RE =
  /^\/(checkouts?|account|admin|password|challenge|apps|services|payments|orders|tools|wpm@|recommendations|browsing_context_suggestions|localization|cdn-cgi|\.well-known|api|cart\/)/i;

export function allowedUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  if (!SITE_HOSTS.has(u.hostname.toLowerCase())) return false;
  const path = u.pathname;
  if (LOCALE_RE.test(path)) return false;
  if (path.startsWith("/cdn/")) return true; // theme assets, any query
  if (DENY_RE.test(path)) return false;
  if (/\.(xml|json|js|atom|oembed|txt)$/i.test(path)) return false;
  if (u.search) return false; // no variants / filters / srsltid / sort params
  return true;
}

async function fetchText(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const decodeXml = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

function extractLocs(xml) {
  return [...(xml ?? "").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    decodeXml(m[1].trim()),
  );
}

async function sitemapSeeds() {
  const seeds = new Set([`${ORIGIN}/`]);
  const index = await fetchText(`${ORIGIN}/sitemap.xml`);
  const children = extractLocs(index).filter((loc) => {
    try {
      const u = new URL(loc);
      return (
        SITE_HOSTS.has(u.hostname) &&
        /^\/sitemap_(products|pages|collections|blogs)_/.test(u.pathname)
      );
    } catch {
      return false;
    }
  });
  for (const child of children) {
    for (const loc of extractLocs(await fetchText(child))) {
      const clean = loc.split("#")[0];
      if (allowedUrl(clean)) seeds.add(clean);
    }
  }
  return [...seeds];
}

/**
 * Some website-scraper filename generators nest everything under a
 * "<hostname>/" directory; if that happened, hoist the tree up one level.
 */
function hoistHostDir() {
  for (const host of SITE_HOSTS) {
    const hostDir = join(ROOT, host);
    if (!existsSync(hostDir) || existsSync(join(ROOT, "index.html"))) continue;
    for (const entry of readdirSync(hostDir)) {
      renameSync(join(hostDir, entry), join(ROOT, entry));
    }
    rmSync(hostDir, { recursive: true, force: true });
  }
}

async function main() {
  const seeds = await sitemapSeeds();
  console.log(`Seeding ${seeds.length} URLs from sitemaps.`);

  if (existsSync(ROOT)) {
    rmSync(ROOT, { recursive: true, force: true });
  }
  console.log("Mirroring to:", ROOT);

  await scrape({
    urls: seeds,
    directory: ROOT,
    recursive: true,
    maxRecursiveDepth: 3,
    filenameGenerator: "bySiteStructure",
    requestConcurrency: 8,
    request: {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    },
    urlFilter: allowedUrl,
    // prettifyUrls breaks SVG fragment refs (fill:url(#id) -> fill:url(page.html#id))
    prettifyUrls: false,
    ignoreErrors: true,
  });

  hoistHostDir();

  // Themed 404 page: served with HTTP 404 status, which the scraper skips
  // (and fetchText rejects) — fetch it directly, accepting the error status.
  try {
    const res = await fetch(`${ORIGIN}/404`, {
      headers: { "User-Agent": BROWSER_UA },
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });
    const notFound = await res.text();
    if (notFound && notFound.includes("<html")) {
      mkdirSync(join(ROOT, "404"), { recursive: true });
      writeFileSync(join(ROOT, "404", "index.html"), notFound);
    }
  } catch {
    console.warn("404 page fetch failed; continuing");
  }
  console.log("Mirror complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

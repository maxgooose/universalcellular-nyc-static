/**
 * Remove third-party analytics / tracking scripts from the mirrored HTML so
 * the clone does not fire the source site's trackers or region-blocking app:
 * Google Tag Manager, Microsoft Clarity, Mailchimp, negate.io, Shopify
 * trekkie/monorail beacons, web-pixels-manager, boostymark region blocker.
 * Purely visual widgets (judge.me reviews) are kept.
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = join(__dirname, "..", "techrecomm-mirror", "site");

const TRACKER_PATTERNS = [
  "googletagmanager.com",
  "sapi.negate.io",
  "chimpstatic.com",
  "clarity.ms",
  "monorail-edge.shopifysvc.com",
  "trekkie",
  "webPixelsManager",
  "web-pixels-manager",
  "/wpm@",
  "/web-pixels@",
  "shopify/monorail",
  "/checkouts/internal/preloads.js",
  "boostymark-regionblock",
  // boostymark inline bootstrap: paints a white full-screen mask for 10s
  // unless the (stripped) external blocker.js defines window.bmExtension
  "bm-preload-mask",
  // Instafeed app: loads their Instagram feed
  "instafeed",
  // judge.me review widget config/scripts (review UI fully removed)
  "jdgm",
];

const BLOCK_COMMENT_RE = [
  /<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->/g,
  /<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->/g,
];

const SCRIPT_RE = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const NOSCRIPT_GTM_RE =
  /<noscript>\s*<iframe[^>]+googletagmanager\.com[\s\S]*?<\/noscript>/gi;
// Head metadata pointing at content the mirror deliberately excludes
// (locale trees, atom feeds) — dead references on the static clone.
const DEAD_META_RE = [
  /<link\b[^>]*\bhreflang=[^>]*>\s*/gi,
  /<link\b[^>]*application\/atom\+xml[^>]*>\s*/gi,
  /<link\b[^>]*application\/json\+oembed[^>]*>\s*/gi,
];

function walkHtml(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(p, acc);
    else if (/\.html$/i.test(entry.name)) acc.push(p);
  }
  return acc;
}

function main() {
  let filesChanged = 0;
  let scriptsRemoved = 0;
  for (const file of walkHtml(SITE_ROOT)) {
    const text = readFileSync(file, "utf8");
    let next = text;
    for (const re of BLOCK_COMMENT_RE) {
      next = next.replace(re, "");
    }
    next = next.replace(NOSCRIPT_GTM_RE, "");
    for (const re of DEAD_META_RE) {
      next = next.replace(re, "");
    }
    next = next.replace(SCRIPT_RE, (tag) => {
      if (TRACKER_PATTERNS.some((p) => tag.includes(p))) {
        scriptsRemoved++;
        return "";
      }
      return tag;
    });
    if (next !== text) {
      writeFileSync(file, next);
      filesChanged++;
    }
  }
  console.log(JSON.stringify({ filesChanged, scriptsRemoved }, null, 2));
}

main();

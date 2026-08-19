/**
 * Remove unwanted content from the mirrored pages.
 *
 * 1. Whole sections (announcement bar, newsletter, review-carousel section)
 *    are removed as `<div id="shopify-section-…">` blocks, matched ONLY by
 *    the id in the chunk's own opening tag — never by strings that may
 *    appear in a section's inline CSS/JS (that over-matched once and
 *    deleted page bodies).
 * 2. Inner widgets (the judge.me photo carousel embedded inside the
 *    homepage body) are cut as balanced <div> blocks with a depth counter.
 * 3. Legacy redirect paths get copies of their target pages so old blog
 *    links keep working on the static clone.
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  copyFileSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = join(__dirname, "..", "techrecomm-mirror", "site");

// Shopify renders sections as <div> or <section> depending on the section.
const SECTION_BOUNDARY = /(?=<(?:div|section) id="shopify-section-)/;
const SECTION_CHUNK_START = /^<(?:div|section) id="shopify-section-/;

/** Sections to drop, matched against the chunk's opening tag id only. */
const REMOVE_SECTION_ID_RES = [
  // judge.me shop-review carousel section ("Let customers speak for us")
  /^<(?:div|section) id="shopify-section-[^"]*__176219794330670c3c"/,
  // newsletter signup bar ("Join now to get early access...")
  /^<(?:div|section) id="shopify-section-[^"]*__1762200659c818d17c"/,
  // announcement bar ("2-day FREE SHIPPING")
  /^<(?:div|section) id="shopify-section-[^"]*__announcement_bar_/,
  // "FREE Earbuds" gift promo — a shared page-template section instance
  // that injected the promo content into every /pages/* info page
  /^<(?:div|section) id="shopify-section-template--[0-9]+__page_g8PUhm"/,
];

/**
 * Section chunks (already verified to start with a section tag) dropped by
 * content near the TOP of the chunk — a section's own style block — never
 * by strings buried deep inside, which is what over-matched page bodies.
 */
const REMOVE_SECTION_FNS = [
  // Instafeed app blocks: their Instagram photo/video feed strip
  (chunk) => chunk.slice(0, 3000).toLowerCase().includes("instafeed"),
];

/** Inner elements to cut as balanced <div> blocks (photo strips in body). */
const INNER_BLOCK_RES = [
  /<div\b[^>]*class="[^"]*jdgm-carousel-wrapper[^"]*"[^>]*>/i,
  // BEAE gallery add-on on the homepage: their UGC photo/video tile strip
  /<div\b[^>]*beae-unique-f7dp9izo[^>]*>/i,
  // review star widgets (theme-native) on product cards and product pages
  /<div\b[^>]*class="rating"[^>]*>/i,
  // "1-Year Warranty / 60-Day Returns / Money-back" features bar
  /<div\b[^>]*class="[^"]*ai-features-bar-[a-z0-9][^"]*"[^>]*>/i,
  // homepage trust-cards row (Free Fast Shipping / 1-Year / 60-Day)
  /<div\b[^>]*beae-unique-wzzk7r9b[^>]*>/i,
  // judge.me medals badge
  /<div\b[^>]*class="[^"]*jdgm-medals[^"]*"[^>]*>/i,
  // homepage trust-card list items (Fast Shipping / Warranty / 60-Day)
  /<div\b[^>]*class="beae-list-item beae-iyf0i685"[^>]*>/i,
  // judge.me carousel header ("Real customer stories" + 4.66 ★ count)
  /<div\b[^>]*class="jdgm-header"[^>]*>/i,
];

/** Flat regex removals (non-div elements, JSON fragments). */
const FLAT_RES = [
  // review-count text next to stars ("(83)")
  /<p class="rating-text[^"]*"[^>]*>[\s\S]*?<\/p>\s*/gi,
  // review aggregate data in product JSON-LD (trailing- then leading-comma forms)
  /"aggregateRating":\s*\{[^{}]*\},/g,
  /,\s*"aggregateRating":\s*\{[^{}]*\}/g,
  // judge.me rating summary span ("4.66 ★ (N)") on the homepage
  /<span class="jdgm-rating-text">[^<]*<span class="jdgm-rating-star">[^<]*<\/span>[^<]*<\/span>/g,
  // header account icon — links Shopify login, which doesn't exist pre-launch
  /<a\b[^>]*href="\/customer_authentication\/redirect"[\s\S]*?<\/a>\s*/g,
];

/** Ordered claim-text neutralizations (longest first). */
const TEXT_PAIRS = [
  [
    "with fast shipping, 1-year warranty and thousands of verified reviews.",
    "with fast shipping and warranty-backed devices.",
  ],
  [
    "Enjoy a 1-year warranty on all techrecomm products, covering parts and labor for mechanical issues.",
    "Warranty coverage details for techrecomm products.",
  ],
  [", and backed by our quality guarantee", ""],
  [
    "warranty and thousands of verified reviews from techrecomm",
    "warranty-backed devices from techrecomm",
  ],
  ["Free 2-Day US Shipping", "Fast US Shipping"],
  ["Free 2-Day US shipping", "fast US shipping"],
  ["Free 2-day shipping", "Fast shipping"],
  ["free 2-day shipping", "fast shipping"],
  ["Free Fast Shipping", "Fast Shipping"],
  ["2-Day Shipping", "Fast Shipping"],
  ["2-day shipping", "fast shipping"],
  ["60-day return policy", "30-day return policy"],
  ["60-Day Returns", "Easy Returns"],
  ["Money-back guarantee", "Hassle-free returns"],
  ["money-back guarantee", "hassle-free returns"],
  ["1-Year Quality Warranty", "Quality Warranty"],
  ["1-Year Warranty", "Warranty Included"],
  ["1-year warranty", "warranty"],
  ["Certified Quality", "Quality Tested"],
  ["Phonecheck", "professional diagnostics"],
  // one blog post links a collection handle that doesn't exist
  ['collections/iphone-12"', 'collections/refurbished-iphone-12-models"'],
];

/** Remove whole <li> blocks that contain a given slug (blog listing cards). */
function removeLiContaining(html, slug) {
  if (!html.includes(slug)) return { out: html, removed: 0 };
  let out = html;
  let removed = 0;
  for (;;) {
    const at = out.indexOf(slug);
    if (at < 0) break;
    const liStart = out.lastIndexOf("<li", at);
    if (liStart < 0) break;
    const tokenRe = /<li\b[^>]*>|<\/li>/gi;
    tokenRe.lastIndex = liStart;
    let depth = 0;
    let end = -1;
    let t;
    while ((t = tokenRe.exec(out)) !== null) {
      depth += t[0][1] === "/" ? -1 : 1;
      if (depth === 0) {
        end = tokenRe.lastIndex;
        break;
      }
    }
    if (end < 0 || end < at) break;
    out = out.slice(0, liStart) + out.slice(end);
    removed++;
  }
  return { out, removed };
}

const REMOVE_CARD_SLUGS = [
  "phonecheck-certified-for-refurbished-iphone",
  // "Reviews" nav item pointing at their old Shopify account page
  "1000000000/account/pages",
];

const LEGACY_COPIES = [
  ["collections/refurbished-ipad/index.html", "collections/ipad/index.html"],
  ["collections/refurbished-ipad/index.html", "collections/ipads/index.html"],
  ["pages/warranty/index.html", "pages/warranty-return-policy/index.html"],
];

/** Remove every element matching openTagRe, walking <div> depth to its close. */
function removeBalancedBlocks(html, openTagRe) {
  let out = html;
  let removed = 0;
  for (;;) {
    const m = out.match(openTagRe);
    if (!m) break;
    const start = m.index;
    const tokenRe = /<div\b[^>]*>|<\/div>/gi;
    tokenRe.lastIndex = start;
    let depth = 0;
    let end = -1;
    let t;
    while ((t = tokenRe.exec(out)) !== null) {
      depth += t[0][1] === "/" ? -1 : 1;
      if (depth === 0) {
        end = tokenRe.lastIndex;
        break;
      }
    }
    if (end < 0) break; // unbalanced markup — leave untouched
    out = out.slice(0, start) + out.slice(end);
    removed++;
  }
  return { out, removed };
}

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
  let sectionsRemoved = 0;
  let innerBlocksRemoved = 0;

  for (const file of walkHtml(SITE_ROOT)) {
    const text = readFileSync(file, "utf8");

    const chunks = text.split(SECTION_BOUNDARY);
    const kept = chunks.filter((chunk) => {
      if (!SECTION_CHUNK_START.test(chunk)) return true;
      if (
        REMOVE_SECTION_ID_RES.some((re) => re.test(chunk)) ||
        REMOVE_SECTION_FNS.some((fn) => fn(chunk))
      ) {
        sectionsRemoved++;
        return false;
      }
      return true;
    });
    let next = kept.join("");

    for (const re of INNER_BLOCK_RES) {
      const r = removeBalancedBlocks(next, re);
      next = r.out;
      innerBlocksRemoved += r.removed;
    }

    for (const re of FLAT_RES) {
      next = next.replace(re, "");
    }
    for (const slug of REMOVE_CARD_SLUGS) {
      next = removeLiContaining(next, slug).out;
    }
    for (const [from, to] of TEXT_PAIRS) {
      if (next.includes(from)) next = next.split(from).join(to);
    }

    if (next !== text) {
      writeFileSync(file, next);
      filesChanged++;
    }
  }

  let legacyCopies = 0;
  for (const [src, dst] of LEGACY_COPIES) {
    const s = join(SITE_ROOT, ...src.split("/"));
    const d = join(SITE_ROOT, ...dst.split("/"));
    if (existsSync(s) && !existsSync(d)) {
      mkdirSync(dirname(d), { recursive: true });
      copyFileSync(s, d);
      legacyCopies++;
    }
  }

  console.log(
    JSON.stringify(
      { filesChanged, sectionsRemoved, innerBlocksRemoved, legacyCopies },
      null,
      2,
    ),
  );
}

main();

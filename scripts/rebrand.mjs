/**
 * Replace every source-company identifier in the mirrored HTML with
 * techrecomm branding / placeholders. Ordered longest-first string pairs
 * (case-sensitive; the site-wide scan confirmed the exact casings that
 * exist). Pairs containing "/" are also applied in their JSON-escaped
 * (\/) form. Social icon list items and domain-verification metas are
 * removed outright. Idempotent — re-running is a no-op.
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = join(__dirname, "..", "techrecomm-mirror", "site");

const STRIP_RES = [
  // header-drawer + footer social icon items (all five are their profiles)
  /<li class="list-social__item">[\s\S]*?<\/li>\s*/g,
  // their domain-ownership verification metas
  /<meta name="facebook-domain-verification"[^>]*>\s*/g,
  /<meta name="google-site-verification"[^>]*>\s*/g,
];

const PAIRS = [
  // brand-named files (before generic brand swaps so renames stay aligned)
  [
    "Wireless_Logo_1000x500_270d7cf6-ec05-44e0-b716-c5f0cc00b8d4",
    "techrecomm-logo-1000x500",
  ],
  // contact placeholders (swap for real details later)
  ["support@wireless-source.com", "admin@techrecomm.com"],
  ["747-216-2969", "+1 (646) 601-6012"],
  // address / legal entity (anchored longest-first; bare "#372231" is
  // never replaced alone to avoid clobbering a same-digits hex color)
  [
    "7320 Reseda Boulevard, Ste 372231, Los Angeles CA 91337, United States",
    "2727 Coney Island Avenue, Ste C5, Brooklyn, NY 11235-5004, United States",
  ],
  [
    "7320 Reseda Blvd #372231, Reseda, CA 91337",
    "2727 Coney Island Ave Ste C5, Brooklyn, NY 11235-5004",
  ],
  [
    "7320 Reseda Blvd<br>#372231<br>Reseda, CA 91337",
    "2727 Coney Island Ave Ste C5<br>Brooklyn, NY 11235-5004",
  ],
  ["7320 Reseda Blvd", "2727 Coney Island Ave Ste C5"],
  ["Reseda, CA 91337", "Brooklyn, NY 11235-5004"],
  ["MK LLC", "Tech Recommerce Solutions Inc"],
  // their Shopify storefront identity (replacement must stay a valid bare
  // number — a leading zero breaks JSON.parse of the features blob)
  ["96035d8538485d5767bbec34094dad54", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
  ["40042004633", "1000000000"],
  // staff names (blog JSON-LD authors / bylines)
  ["Evgenii Misharin", "techrecomm Team"],
  ["Lorenzo Smith", "techrecomm Team"],
  ["Mike Uruk", "techrecomm Team"],
  ["Cathy Lara", "techrecomm Team"],
  // social profile URLs left in JSON-LD sameAs arrays -> empty strings
  ["https://www.facebook.com/WirelessSource", ""],
  ["https://www.pinterest.com/Wireless_Source", ""],
  ["https://www.instagram.com/wireless_source", ""],
  ["https://www.tiktok.com/@wireless.source", ""],
  ["https://www.youtube.com/channel/UCtGzfX9ET7_E3b7zRbue-NA", ""],
  // brand name variants (most specific first; bare hyphen form last also
  // renames logo-file refs and neutralizes myshopify/judge.me/domain URLs)
  ["Wireless-Source", "techrecomm"],
  ["Wireless-source", "techrecomm"],
  ["Wireless Source", "techrecomm"],
  ["WirelessSource", "techrecomm"],
  ["Wireless_Source", "techrecomm"],
  ["wireless_source", "techrecomm"],
  ["wireless.source", "techrecomm"],
  ["wireless-source", "techrecomm"],
];

/** Expand pairs containing "/" with their JSON-escaped (\/) siblings. */
const EXPANDED = PAIRS.flatMap(([from, to]) => {
  const out = [[from, to]];
  if (from.includes("/")) {
    out.push([from.split("/").join("\\/"), to.split("/").join("\\/")]);
  }
  return out;
});

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
  let replacements = 0;
  for (const file of walkHtml(SITE_ROOT)) {
    const text = readFileSync(file, "utf8");
    let next = text;
    for (const re of STRIP_RES) {
      next = next.replace(re, "");
    }
    for (const [from, to] of EXPANDED) {
      if (next.includes(from)) {
        const parts = next.split(from);
        replacements += parts.length - 1;
        next = parts.join(to);
      }
    }
    if (next !== text) {
      writeFileSync(file, next);
      filesChanged++;
    }
  }
  console.log(JSON.stringify({ filesChanged, replacements }, null, 2));
}

main();

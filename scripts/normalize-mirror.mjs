/**
 * Normalize mirrored files for static hosting:
 * - protocol-relative and absolute same-origin URLs -> root-relative /
 * - swap legacy logo filenames -> images/techrecomm-logo.png (single PNG)
 * - rebrand visible copy: Universal Cellular* -> techrecomm
 * - drop Instagram / LinkedIn footer icons (repeater ids from source site)
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
} from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = join(__dirname, "..", "techrecomm-mirror", "site");

const REPLACEMENTS = [
  [/https:\\\/\\\/universalcellularnyc\.com\\\//g, "/"],
  [/https:\/\/universalcellularnyc.com\//g, "/"],
  [/http:\/\/universalcellularnyc.com\//g, "/"],
  [/(["'(])\/\/universalcellularnyc\.com\//g, "$1/"],
];

/** Map mirrored Universal Cellular logo URLs to bundled PNG (longer / specific first). */
const LOGO_PATH_REPLACEMENTS = [
  [
    'srcset="images/Universal-Cellular-NYC-Logo.webp 356w, images/Universal-Cellular-NYC-Logo-300x169.webp 300w"',
    'srcset="images/techrecomm-logo.png 1536w"',
  ],
  [
    "/wp-content\\/uploads\\/2024\\/01\\/cropped-Universal-Cellular-NYC-Logo.webp",
    "/images/techrecomm-logo.png",
  ],
  [
    "/wp-content/uploads/2024/01/cropped-Universal-Cellular-NYC-Logo-270x270.webp",
    "/images/techrecomm-logo.png",
  ],
  [
    "/wp-content/uploads/2024/01/cropped-Universal-Cellular-NYC-Logo-32x32.webp",
    "/images/techrecomm-logo.png",
  ],
  [
    "/wp-content/uploads/2024/01/cropped-Universal-Cellular-NYC-Logo-192x192.webp",
    "/images/techrecomm-logo.png",
  ],
  [
    "/wp-content/uploads/2024/01/cropped-Universal-Cellular-NYC-Logo-180x180.webp",
    "/images/techrecomm-logo.png",
  ],
  [
    "images/cropped-Universal-Cellular-NYC-Logo-32x32.webp",
    "images/techrecomm-logo.png",
  ],
  [
    "images/cropped-Universal-Cellular-NYC-Logo-192x192.webp",
    "images/techrecomm-logo.png",
  ],
  [
    "images/cropped-Universal-Cellular-NYC-Logo-180x180.webp",
    "images/techrecomm-logo.png",
  ],
  ["images/Universal-Cellular-NYC-Logo.webp", "images/techrecomm-logo.png"],
  ["images/techrecomm-logo-draft.png", "images/techrecomm-logo.png"],
  ["/images/techrecomm-logo-draft.png", "/images/techrecomm-logo.png"],
];

/** Longest-first string replaces (HTML, RSS-in-HTML, REST JSON blobs, wp-admin PHP) */
const BRAND_TEXT_REPLACEMENTS = [
  ["Universal Cellular NYC", "techrecomm"],
  ["Universal Cellular Inc.", "techrecomm."],
  ["Universal Cellular Inc", "techrecomm"],
  ["Universal Cellular,", "techrecomm,"],
  ["Universal Cellular is", "techrecomm is"],
  ["Universal Cellular ", "techrecomm "],
  ["Universal Cellular", "techrecomm"],
];

/** Elementor social-icons widget items (footer) */
const SOCIAL_HANDLE_STRIPS = [
  /<span class="elementor-grid-item" role="listitem">\s*<a class="elementor-icon elementor-social-icon elementor-social-icon- elementor-repeater-item-98af2de"[\s\S]*?<\/a>\s*<\/span>\s*/g,
  /<span class="elementor-grid-item" role="listitem">\s*<a class="elementor-icon elementor-social-icon elementor-social-icon- elementor-repeater-item-70ff7bc"[\s\S]*?<\/a>\s*<\/span>\s*/g,
];

function isWpV2PageBlob(filePath) {
  return /[/\\]wp-json[/\\]wp[/\\]v2[/\\]pages[/\\]\d+$/i.test(filePath);
}

function walkFiles(dir, acc = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walkFiles(p, acc);
    else if (/\.(html|css|js|json|php)$/i.test(name.name)) acc.push(p);
    else if (name.isFile() && /^\d+$/.test(name.name) && isWpV2PageBlob(p))
      acc.push(p);
  }
  return acc;
}

function shouldApplyBrand(filePath) {
  return (
    /\.html$/i.test(filePath) ||
    /\.php$/i.test(filePath) ||
    isWpV2PageBlob(filePath)
  );
}

function main() {
  let changed = 0;
  for (const file of walkFiles(SITE_ROOT)) {
    let text = readFileSync(file, "utf8");
    let next = text;
    for (const [re, rep] of REPLACEMENTS) {
      next = next.replace(re, rep);
    }
    for (const [from, to] of LOGO_PATH_REPLACEMENTS) {
      next = next.split(from).join(to);
    }
    if (/\.html$/i.test(file)) {
      next = next
        .split('width="356" height="200" src="images/techrecomm-logo.png"')
        .join('width="356" height="237" src="images/techrecomm-logo.png"');
    }
    if (shouldApplyBrand(file)) {
      for (const [from, to] of BRAND_TEXT_REPLACEMENTS) {
        next = next.split(from).join(to);
      }
    }
    if (/\.html$/i.test(file)) {
      for (const re of SOCIAL_HANDLE_STRIPS) {
        next = next.replace(re, "");
      }
    }
    if (next !== text) {
      writeFileSync(file, next);
      changed++;
    }
  }
  console.log(JSON.stringify({ filesUpdated: changed }, null, 2));
}

main();

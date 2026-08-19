/**
 * Offline audit: resolve relative href/src/url() from mirrored HTML/CSS and report missing files.
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import { dirname, join, normalize } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = join(__dirname, "..", "techrecomm-mirror", "site");

function walkFiles(dir, acc = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walkFiles(p, acc);
    else if (/\.(html|css)$/i.test(name.name)) acc.push(p);
  }
  return acc;
}

function resolveRef(fromFile, raw) {
  const u = raw.trim();
  if (!u || u.startsWith("data:") || u.startsWith("#")) return null;
  if (/^\/\//.test(u)) return null;
  if (/^https?:\/\//i.test(u)) return null;
  if (/^(mailto:|tel:|javascript:)/i.test(u)) return null;
  if (u.includes("${") || u.includes("{{")) return null; // JS/liquid templates
  let clean = u.split("#")[0].split("?")[0];
  if (!clean || clean.length < 2) return null;
  // Static servers URL-decode request paths before file lookup; mirror that.
  try {
    clean = decodeURIComponent(clean);
  } catch {
    /* keep raw */
  }

  if (clean.startsWith("/")) {
    const pathSegs = clean.replace(/\/$/, "").split("/").filter(Boolean);
    if (pathSegs.length === 0) {
      const idx = join(SITE_ROOT, "index.html");
      return idx;
    }
    const asDirIndex = join(SITE_ROOT, ...pathSegs, "index.html");
    if (existsSync(asDirIndex)) return asDirIndex;
    const asFile = join(SITE_ROOT, `${pathSegs.join("/")}.html`);
    if (existsSync(asFile)) return asFile;
    const nested = join(SITE_ROOT, ...pathSegs);
    return nested;
  }

  const abs = normalize(join(dirname(fromFile), clean));
  if (!abs.startsWith(normalize(SITE_ROOT))) return null;
  return abs;
}

// Paths excluded from the mirror by design (locale trees, feeds, auth,
// checkout, Shopify AJAX endpoints) — links to them are expected.
const BY_DESIGN_RE =
  /\/site\/(es|pt|tr|zh|fr|account|checkouts?|customer_authentication|apps|cart\.js|localization|search\b)/i;

function shouldIgnoreTarget(target) {
  if (!target) return true;
  const t = target.replace(/\\/g, "/").toLowerCase();
  return (
    t.includes("/wp-json/") ||
    /\.atom$/i.test(t) ||
    BY_DESIGN_RE.test(t)
  );
}

function extractFromHtml(filePath, text, issues) {
  const attrs =
    /(?:href|src|poster)=["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  let m;
  while ((m = attrs.exec(text)) !== null) {
    const ref = m[1] || m[2];
    if (!ref || ref.length < 2) continue;
    const target = resolveRef(filePath, ref);
    if (shouldIgnoreTarget(target)) continue;
    if (target && !existsSync(target)) {
      issues.push({ file: filePath, ref, resolved: target });
    }
  }
}

function extractFromCss(filePath, text, issues) {
  const re = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const ref = m[1];
    if (!ref || ref.length < 3) continue;
    const target = resolveRef(filePath, ref);
    if (shouldIgnoreTarget(target)) continue;
    if (target && !existsSync(target)) {
      issues.push({ file: filePath, ref, resolved: target });
    }
  }
}

function main() {
  const issues = [];
  for (const filePath of walkFiles(SITE_ROOT)) {
    const text = readFileSync(filePath, "utf8");
    if (filePath.endsWith(".css")) extractFromCss(filePath, text, issues);
    else extractFromHtml(filePath, text, issues);
  }

  const unique = new Map();
  for (const i of issues) {
    const k = i.resolved + "|" + i.ref;
    if (!unique.has(k)) unique.set(k, i);
  }
  const list = [...unique.values()];

  console.log(
    JSON.stringify(
      {
        missingCount: list.length,
        samples: list.slice(0, 25),
      },
      null,
      2,
    ),
  );

  if (list.length > 0) process.exitCode = 1;
}

main();

/**
 * Download missing font files and small plugin images referenced in CSS.
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = join(__dirname, "..", "universalcellular-mirror", "site");
const ORIGIN = "https://universalcellularnyc.com";

const EXTRA_PATHS = [
  "/wp-content/plugins/elementskit-lite/widgets/init/assets/img/arrow.png",
  "/wp-content/plugins/elementskit-lite/widgets/init/assets/img/sort_asc.png",
  "/wp-content/plugins/elementskit-lite/widgets/init/assets/img/sort_desc.png",
  "/wp-content/plugins/elementskit-lite/widgets/init/assets/img/sort_asc_disabled.png",
  "/wp-content/plugins/elementskit-lite/widgets/init/assets/img/cross-out.svg",
];

async function fetchBinary(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MirrorPatch/1.0)",
    },
    redirect: "follow",
  });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

function walkCss(dir, acc = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walkCss(p, acc);
    else if (name.name.endsWith(".css")) acc.push(p);
  }
  return acc;
}

function extractFontPaths(cssText) {
  const out = new Set();
  const re =
    /\/wp-content\/uploads\/elementor\/google-fonts\/fonts\/[a-z0-9._-]+\.woff2/gi;
  let m;
  while ((m = re.exec(cssText)) !== null) {
    out.add(m[0]);
  }
  return out;
}

async function main() {
  const paths = new Set(EXTRA_PATHS);
  for (const cssPath of walkCss(SITE_ROOT)) {
    const text = readFileSync(cssPath, "utf8");
    for (const p of extractFontPaths(text)) paths.add(p);
  }

  let downloaded = 0;
  for (const pathOnly of paths) {
    const local = join(SITE_ROOT, ...pathOnly.split("/").filter(Boolean));
    if (existsSync(local)) continue;
    const buf = await fetchBinary(ORIGIN + pathOnly);
    if (!buf?.length) {
      console.warn("failed", pathOnly);
      continue;
    }
    mkdirSync(dirname(local), { recursive: true });
    writeFileSync(local, buf);
    downloaded++;
  }
  console.log(JSON.stringify({ unique: paths.size, downloaded }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Find absolute same-origin URLs inside mirrored HTML/JSON snippets and download missing files.
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
const SIMPLE_RE = /https:\/\/universalcellularnyc\.com(\/[^&\s"'<>]+)/gi;

function walkFiles(dir, acc = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walkFiles(p, acc);
    else if (/\.(html|css|js)$/i.test(name.name)) acc.push(p);
  }
  return acc;
}

function urlToLocalPath(pathname) {
  let p = pathname;
  if (p.endsWith("/")) p += "index.html";
  const segments = p.split("/").filter(Boolean);
  return join(SITE_ROOT, ...segments);
}

async function fetchBinary(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    redirect: "follow",
  });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const files = walkFiles(SITE_ROOT);
  const paths = new Set();
  for (const file of files) {
    const textRaw = readFileSync(file, "utf8");
    const text = textRaw.replace(/\\\//g, "/");
    let m;
    const re = new RegExp(SIMPLE_RE.source, "gi");
    while ((m = re.exec(text)) !== null) {
      let pathOnly = m[1].split("?")[0];
      if (!pathOnly || pathOnly.startsWith("//")) continue;
      paths.add(pathOnly);
    }
  }

  let downloaded = 0;
  let skipped = 0;
  for (const pathOnly of paths) {
    if (pathOnly.startsWith("/wp-json")) continue;
    const local = urlToLocalPath(pathOnly);
    if (existsSync(local)) {
      skipped++;
      continue;
    }
    const url = ORIGIN + pathOnly;
    const buf = await fetchBinary(url);
    if (!buf?.length) continue;
    mkdirSync(dirname(local), { recursive: true });
    writeFileSync(local, buf);
    downloaded++;
  }

  console.log(
    JSON.stringify(
      {
        uniqueUrlsFound: paths.size,
        alreadyLocal: skipped,
        downloaded,
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

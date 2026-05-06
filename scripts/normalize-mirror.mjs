/**
 * Normalize mirrored files for static hosting:
 * - protocol-relative and absolute same-origin URLs -> root-relative /
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
const SITE_ROOT = join(__dirname, "..", "universalcellular-mirror", "site");

const REPLACEMENTS = [
  [/https:\\\/\\\/universalcellularnyc\.com\\\//g, "/"],
  [/https:\/\/universalcellularnyc.com\//g, "/"],
  [/http:\/\/universalcellularnyc.com\//g, "/"],
  [/(["'(])\/\/universalcellularnyc\.com\//g, "$1/"],
];

function walkFiles(dir, acc = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walkFiles(p, acc);
    else if (/\.(html|css|js|json)$/i.test(name.name)) acc.push(p);
  }
  return acc;
}

function main() {
  let changed = 0;
  for (const file of walkFiles(SITE_ROOT)) {
    let text = readFileSync(file, "utf8");
    let next = text;
    for (const [re, rep] of REPLACEMENTS) {
      next = next.replace(re, rep);
    }
    if (next !== text) {
      writeFileSync(file, next);
      changed++;
    }
  }
  console.log(JSON.stringify({ filesUpdated: changed }, null, 2));
}

main();

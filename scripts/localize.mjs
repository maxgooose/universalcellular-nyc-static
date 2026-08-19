/**
 * Localize absolute URLs left in the mirrored files (inline scripts, JSON
 * blobs, srcset, CSS): download whitelisted-host assets to local paths
 * (see scripts/urlmap.mjs) and rewrite references to root-relative paths.
 * Same-origin page links are rewritten root-relative without downloading.
 *
 * Runs to a fixpoint because downloaded CSS (e.g. Google Fonts) references
 * further assets. References whose download fails are left absolute so the
 * page can still fall back to the live CDN.
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  SITE_HOSTS,
  ALL_HOSTS,
  localRelPathForUrl,
  fetchBinary,
} from "./urlmap.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = join(__dirname, "..", "techrecomm-mirror", "site");

const HOST_ALT = ALL_HOSTS.map((h) => h.replace(/\./g, "\\.")).join("|");
// Matches https://host/..., //host/..., and the JSON-escaped forms
// https:\/\/host\/... — path chars may include \/ and & sequences.
const TOKEN_RE = new RegExp(
  "(?:https?:)?(?:\\\\/\\\\/|//)" +
    "(?:" +
    HOST_ALT +
    ")" +
    "(?:\\\\/|/)" +
    "(?:\\\\/|\\\\u0026|[^\\s\"'<>(){}|^\\\\`])*",
  "gi",
);

/** Strip trailing entity-encoded delimiters and punctuation. */
function cleanupToken(tok) {
  let t = tok;
  for (;;) {
    const next = t
      .replace(/(?:&(?:quot|#0?34|gt|lt|apos|#0?39);?)+$/i, "")
      .replace(/[.,;:!]+$/, "");
    if (next === t) return t;
    t = next;
  }
}

/** Unescape a raw token into a parseable absolute URL. */
function canonicalUrl(tok) {
  let t = tok
    .replace(/\\\//g, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/&amp;/gi, "&")
    .replace(/&#0?38;/g, "&");
  if (t.startsWith("//")) t = "https:" + t;
  return t;
}

function walkFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(p, acc);
    else if (/\.(html|css|js|svg)$/i.test(entry.name)) acc.push(p);
  }
  return acc;
}

async function downloadAll(jobs, concurrency = 8) {
  let ok = 0;
  const failures = [];
  const queue = [...jobs];
  async function worker() {
    for (;;) {
      const job = queue.shift();
      if (!job) return;
      const buf = await fetchBinary(job.url);
      if (buf?.length) {
        mkdirSync(dirname(job.dest), { recursive: true });
        writeFileSync(job.dest, buf);
        ok++;
      } else {
        failures.push(job.url);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { ok, failures };
}

async function pass() {
  const files = walkFiles(SITE_ROOT);
  // token -> { url, relPath|null, isPageLink }
  const tokens = new Map();
  const fileTokens = new Map(); // file -> Set(token)

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    TOKEN_RE.lastIndex = 0;
    let m;
    let set = null;
    while ((m = TOKEN_RE.exec(text)) !== null) {
      const tok = cleanupToken(m[0]);
      if (tok.length < 12) continue;
      if (!set) {
        set = new Set();
        fileTokens.set(file, set);
      }
      set.add(tok);
      if (tokens.has(tok)) continue;
      const url = canonicalUrl(tok);
      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        continue;
      }
      const relPath = localRelPathForUrl(url);
      const isPageLink =
        relPath === null && SITE_HOSTS.has(parsed.hostname.toLowerCase());
      // Directory-base URLs (config values like ".../assets/") must keep
      // their trailing slash and are never downloaded as files.
      const isDirUrl = parsed.pathname.endsWith("/");
      tokens.set(tok, { url, parsed, relPath, isPageLink, isDirUrl });
    }
  }

  // Download assets that do not exist locally yet.
  const jobs = new Map();
  for (const info of tokens.values()) {
    if (!info.relPath) continue;
    const dest = join(SITE_ROOT, ...info.relPath.split("/"));
    info.dest = dest;
    if (info.isDirUrl) continue;
    if (!existsSync(dest) && !jobs.has(dest)) {
      jobs.set(dest, { url: info.url, dest });
    }
  }
  const { ok: downloaded, failures } = await downloadAll([...jobs.values()]);

  // Rewrite references whose local file exists; longest tokens first so a
  // shorter token never corrupts a longer one containing it.
  let filesChanged = 0;
  for (const [file, set] of fileTokens) {
    const ordered = [...set].sort((a, b) => b.length - a.length);
    let text = readFileSync(file, "utf8");
    let next = text;
    for (const tok of ordered) {
      const info = tokens.get(tok);
      if (!info) continue;
      let replacement = null;
      if (info.isPageLink) {
        replacement = info.parsed.pathname + (info.parsed.hash || "");
      } else if (info.relPath && existsSync(info.dest)) {
        const stat = statSync(info.dest);
        if (info.isDirUrl && stat.isDirectory()) {
          replacement = "/" + info.relPath + "/";
        } else if (!info.isDirUrl && stat.isFile()) {
          replacement = "/" + info.relPath;
        }
      }
      if (replacement && next.includes(tok)) {
        next = next.split(tok).join(replacement);
      }
    }
    if (next !== text) {
      writeFileSync(file, next);
      filesChanged++;
    }
  }

  return { tokens: tokens.size, downloaded, failures, filesChanged };
}

async function main() {
  const summary = [];
  for (let i = 1; i <= 5; i++) {
    const r = await pass();
    summary.push({
      pass: i,
      tokensSeen: r.tokens,
      downloaded: r.downloaded,
      downloadFailures: r.failures.length,
      filesChanged: r.filesChanged,
    });
    console.log(JSON.stringify(summary[summary.length - 1]));
    if (r.failures.length) {
      console.log("  failure samples:", r.failures.slice(0, 8));
    }
    if (r.downloaded === 0 && r.filesChanged === 0) break;
  }
  console.log(JSON.stringify({ done: true, passes: summary.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

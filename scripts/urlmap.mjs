/**
 * Shared URL -> local-path mapping for the wireless-source.com mirror.
 * Same-origin /cdn/ assets keep their path; whitelisted external CDNs are
 * re-homed under /_cdn/<name>/. Size-affecting query params (Shopify image
 * renditions) are encoded into the filename so distinct renditions stay
 * distinct files; cache-buster params (?v=) are dropped.
 */
import { createHash } from "crypto";

export const SITE_HOSTS = new Set([
  "wireless-source.com",
  "www.wireless-source.com",
]);

export const EXTERNAL_HOST_DIRS = new Map([
  ["cdn.shopify.com", "_cdn/shopify"],
  ["fonts.gstatic.com", "_cdn/fonts-gstatic"],
  ["fonts.googleapis.com", "_cdn/google-fonts"],
  ["cdn.judge.me", "_cdn/judgeme"],
  ["cdn.beae.com", "_cdn/beae"],
]);

export const ALL_HOSTS = [...SITE_HOSTS, ...EXTERNAL_HOST_DIRS.keys()];

export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Shopify image CDN params that change the served bytes. */
const SIZE_PARAMS = ["width", "height", "crop", "format", "pad_color"];

function sanitizeSegment(seg) {
  return seg.replace(/[<>:"|?*\\]/g, "_");
}

function decodeSafe(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Map an absolute asset URL to a forward-slash relative path under the site
 * root, or null when the URL is not a mirrorable asset (unknown host, or a
 * same-origin page link rather than a /cdn/ asset).
 */
export function localRelPathForUrl(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();

  let baseDir;
  if (SITE_HOSTS.has(host)) {
    if (!u.pathname.startsWith("/cdn/")) return null;
    baseDir = "";
  } else if (EXTERNAL_HOST_DIRS.has(host)) {
    baseDir = EXTERNAL_HOST_DIRS.get(host);
  } else {
    return null;
  }

  const segs = u.pathname
    .split("/")
    .filter(Boolean)
    .map((s) => sanitizeSegment(decodeSafe(s)));
  if (segs.length === 0) return null;

  // Google Fonts stylesheet endpoints are meaningless without their query.
  if (host === "fonts.googleapis.com" && u.search) {
    const hash = createHash("sha1").update(u.search).digest("hex").slice(0, 10);
    const last = segs.pop() || "css";
    segs.push(`${last}-${hash}.css`);
    return [baseDir, ...segs].filter(Boolean).join("/");
  }

  const suffixParts = [];
  for (const key of SIZE_PARAMS) {
    const val = u.searchParams.get(key);
    if (val != null) {
      suffixParts.push(`${key[0]}${val.replace(/[^a-zA-Z0-9.x-]/g, "")}`);
    }
  }
  if (suffixParts.length) {
    let last = segs.pop();
    const dot = last.lastIndexOf(".");
    const stem = dot > 0 ? last.slice(0, dot) : last;
    const ext = dot > 0 ? last.slice(dot) : "";
    segs.push(`${stem}_${suffixParts.join("_")}${ext}`);
  }
  return [baseDir, ...segs].filter(Boolean).join("/");
}

export async function fetchBinary(url, { timeoutMs = 45000 } = {}) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

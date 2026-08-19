/**
 * Generate techrecomm text-wordmark images replacing the source site's logo
 * files, at every rendition the pages reference. Renders on a Chromium
 * canvas so .webp slots get real WebP bytes (canvas.toDataURL) and .png
 * slots real PNG. Deletes the old brand-named logo files afterwards.
 */
import { chromium } from "playwright";
import {
  writeFileSync,
  readdirSync,
  rmSync,
  existsSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE = join(__dirname, "..", "techrecomm-mirror", "site");
const FILES_DIR = join(SITE, "cdn", "shop", "files");
const CDN_FILES_DIR = join(
  SITE,
  "_cdn",
  "shopify",
  "s",
  "files",
  "1",
  "0400",
  "4200",
  "4633",
  "files",
);

// [dir, filename, width, height, kind, format]
const OUTPUTS = [
  [FILES_DIR, "techrecomm-logo_v=1731628778&width=90.webp", 90, 32, "wordmark", "webp"],
  [FILES_DIR, "techrecomm-logo_v=1731628778&width=135.webp", 135, 48, "wordmark", "webp"],
  [FILES_DIR, "techrecomm-logo_v=1731628778&width=180.webp", 180, 64, "wordmark", "webp"],
  [FILES_DIR, "techrecomm-logo_v=1731628778&width=600.webp", 600, 214, "wordmark", "webp"],
  [FILES_DIR, "techrecomm-logo_w90.webp", 90, 32, "wordmark", "webp"],
  [FILES_DIR, "techrecomm-logo_w135.webp", 135, 48, "wordmark", "webp"],
  [FILES_DIR, "techrecomm-logo_w180.webp", 180, 64, "wordmark", "webp"],
  [FILES_DIR, "techrecomm-logo_w500.webp", 500, 179, "wordmark", "webp"],
  [FILES_DIR, "techrecomm-logo_w512.webp", 512, 183, "wordmark", "webp"],
  [FILES_DIR, "techrecomm-logo_w600.webp", 600, 214, "wordmark", "webp"],
  [FILES_DIR, "techrecomm-logo_w1200.webp", 1200, 429, "wordmark", "webp"],
  [FILES_DIR, "logo_transparent_background_2.png", 512, 512, "square", "png"],
  [FILES_DIR, "logo_transparent_background_2_v=1660677235.png", 512, 512, "square", "png"],
  [FILES_DIR, "logo_transparent_background_2_crop=center&height=32&v=1660677235&width=32.png", 32, 32, "favicon", "png"],
  [FILES_DIR, "logo_transparent_background_2_w32_h32_ccenter.png", 32, 32, "favicon", "png"],
  [FILES_DIR, "techrecomm-logo-1000x500.png", 1000, 500, "wordmark", "png"],
  [CDN_FILES_DIR, "techrecomm-logo.webp", 500, 179, "wordmark", "webp"],
  [CDN_FILES_DIR, "techrecomm-logo_2b38e964-257e-4124-8e35-6428ae62c459.webp", 3400, 1214, "banner", "webp"],
];

/** Old brand-named files to delete (after new files are written). */
const OLD_FILE_RE = /wireless-source|Wireless_Logo/;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const [dir, name, w, h, kind, format] of OUTPUTS) {
    const dataUrl = await page.evaluate(
      ([w, h, kind, format]) => {
        const navy = "#0f172a";
        const teal = "#0d9488";
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        const setFont = (px) => {
          ctx.font = `700 ${px}px Arial, Helvetica, sans-serif`;
        };
        ctx.textBaseline = "middle";
        if (kind === "favicon") {
          ctx.fillStyle = navy;
          ctx.beginPath();
          ctx.roundRect(0, 0, w, h, w * 0.19);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          setFont(Math.floor(h * 0.72));
          ctx.textAlign = "center";
          ctx.fillText("t", w / 2, h * 0.56);
        } else {
          const text = "techrecomm";
          const maxW = w * (kind === "banner" ? 0.7 : 0.92);
          let px = Math.floor(h * (kind === "square" ? 0.24 : 0.62));
          setFont(px);
          while (ctx.measureText(text).width > maxW && px > 4) {
            px -= 1;
            setFont(px);
          }
          const wTech = ctx.measureText("tech").width;
          const wAll = ctx.measureText(text).width;
          const x0 = (w - wAll) / 2;
          ctx.textAlign = "left";
          ctx.fillStyle = navy;
          ctx.fillText("tech", x0, h / 2);
          ctx.fillStyle = teal;
          ctx.fillText("recomm", x0 + wTech, h / 2);
        }
        return c.toDataURL(format === "webp" ? "image/webp" : "image/png");
      },
      [w, h, kind, format],
    );
    const buf = Buffer.from(dataUrl.split(",")[1], "base64");
    writeFileSync(join(dir, name), buf);
    console.log("wrote", name, `${w}x${h}`, `${buf.length}b`);
  }

  await browser.close();

  let removed = 0;
  for (const dir of [FILES_DIR, CDN_FILES_DIR]) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (OLD_FILE_RE.test(name)) {
        rmSync(join(dir, name));
        removed++;
      }
    }
  }
  console.log(JSON.stringify({ written: OUTPUTS.length, removedOldFiles: removed }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

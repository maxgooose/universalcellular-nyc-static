/**
 * Convert techrecomm-logo.png from RGB-with-baked-white to RGBA with a
 * luminance-to-alpha pass: alpha = 255 - min(R, G, B). Pure white becomes
 * fully transparent, dark navy / teal letterforms stay fully opaque, and
 * anti-aliased letter edges get partial alpha for clean blending on any
 * background. Idempotent: keeps the first-seen original at
 * images/techrecomm-logo.original.png.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { PNG } from "pngjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(
  __dirname,
  "..",
  "techrecomm-mirror",
  "site",
  "images",
  "techrecomm-logo.png"
);
const BACKUP_PATH = join(
  __dirname,
  "..",
  "techrecomm-mirror",
  "site",
  "images",
  "techrecomm-logo.original.png"
);

if (!existsSync(LOGO_PATH)) {
  throw new Error(`Logo not found at: ${LOGO_PATH}`);
}

if (!existsSync(BACKUP_PATH)) {
  copyFileSync(LOGO_PATH, BACKUP_PATH);
  console.log(`Backed up original -> ${BACKUP_PATH}`);
} else {
  console.log("Backup already exists; using current logo as input.");
}

const inputBuffer = readFileSync(LOGO_PATH);
const png = PNG.sync.read(inputBuffer);

const out = new PNG({ width: png.width, height: png.height, colorType: 6 });
const src = png.data;
const dst = out.data;
const hadAlpha = png.colorType === 6 || png.colorType === 4;

let opaqueIn = 0;
let transparentOut = 0;
let opaqueOut = 0;

for (let i = 0, j = 0; i < src.length; i += 4, j += 4) {
  const r = src[i];
  const g = src[i + 1];
  const b = src[i + 2];
  const aIn = hadAlpha ? src[i + 3] : 255;
  if (aIn === 255) opaqueIn++;

  const removeWhite = 255 - Math.min(r, g, b);
  const aOut = Math.min(aIn, removeWhite);

  dst[j] = r;
  dst[j + 1] = g;
  dst[j + 2] = b;
  dst[j + 3] = aOut;

  if (aOut === 0) transparentOut++;
  else if (aOut === 255) opaqueOut++;
}

const outputBuffer = PNG.sync.write(out);
writeFileSync(LOGO_PATH, outputBuffer);

const totalPixels = png.width * png.height;
console.log(
  JSON.stringify(
    {
      file: LOGO_PATH,
      width: png.width,
      height: png.height,
      totalPixels,
      opaquePixelsInInput: opaqueIn,
      transparentPixelsOut: transparentOut,
      fullyOpaquePixelsOut: opaqueOut,
      bytesIn: inputBuffer.length,
      bytesOut: outputBuffer.length,
    },
    null,
    2
  )
);

# techrecomm – static site

Design and copy are maintained in the static output at [`techrecomm-mirror/site`](techrecomm-mirror/site). The mirror pipeline was originally sourced from **https://universalcellularnyc.com/**; `npm run normalize` applies **techrecomm** branding to scraped HTML.

We reserve the right to copy from universalcellularnyc.com because we also own the domain . 
Both properties fall under the same IP of the parent company. 

## Prerequisites

- Node.js 18+ (uses built-in `fetch`)

## One-shot refresh (recommended order)

```bash
npm install
npm run mirror          # recursive crawl → site/
npm run gap-fill        # Playwright pass for lazy / late assets
npm run fetch:embedded  # URLs inside JSON (Elementor slideshows, etc.)
npm run fetch:missing   # Google Fonts woff2 + plugin images from CSS
npm run normalize       # same-origin URLs → root-relative for static hosting
npm run audit           # must report missingCount: 0
```

## Local preview

Local dev loads [`techrecomm-mirror/serve.json`](techrecomm-mirror/serve.json) (via `serve -c`) so **WordPress-style URLs** map to the corresponding `.html` files. Without that, trailing-slash paths 404 after a fresh mirror (duplicate `slug/index.html` folders are removed). Re-run `npm run serve` after pulling changes.

```bash
npm run serve
# Open http://127.0.0.1:3333/ — if it fails, something else is using port 3333; stop that process or change the port in package.json.
```

## Visual parity (screenshots)

With the server running:

```bash
node scripts/parity-screenshots.mjs http://127.0.0.1:3333
```

PNG files are written to [`techrecomm-mirror/screenshots`](techrecomm-mirror/screenshots).

## Deploy

- **Netlify:** repo root contains [`netlify.toml`](netlify.toml) pointing `publish` at `techrecomm-mirror/site`. Connect the repo and deploy.
- **Vercel / Cloudflare Pages / S3:** set the static root to `techrecomm-mirror/site` and replicate the pretty-URL rules from `netlify.toml` if you need `/about-us/` → `about-us.html`.

Forms and AJAX: see [`docs/FORMS-AND-AJAX.md`](docs/FORMS-AND-AJAX.md).

## Parity checklist (manual)

| Route | Mirrored file |
|-------|----------------|
| Home | `index.html` |
| About / Mission anchor | `about-us.html` (#mission) |
| Apple iPad / iPhone / iWatch / Accessories | `apple-*.html` |
| Samsung Phones / Watches / Tablets | `samsung-*.html` |
| Sell To Us / Buy From Us | `sell-to-us.html`, `buy-from-us.html` |
| Grading & Testing | `grading.html` |

Mobile: resize the browser or re-run `parity-screenshots.mjs` with a smaller viewport if you add that to the script.

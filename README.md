# techrecomm – static site

Design and copy are maintained in the static output at [`techrecomm-mirror/site`](techrecomm-mirror/site).

## Prerequisites

- Node.js 18+ (uses built-in `fetch`)
- `npm install` (website-scraper, playwright, serve)

## One-shot refresh (recommended order)

```bash
npm run build:mirror
# = mirror → localize → gap-fill → localize → strip-trackers → rebrand → wordmark → audit
```

Individual steps:

```bash
npm run mirror          # sitemap-seeded recursive crawl (English pages only) → site/
npm run localize        # download whitelisted CDN assets (_cdn/…) + rewrite absolute URLs root-relative
npm run gap-fill        # Playwright pass against the live site for runtime-loaded JS chunks/fonts
npm run strip-trackers  # remove GTM / Clarity / Mailchimp / negate.io / region-blocker scripts
npm run rebrand         # replace all source-company identity (name/contacts/socials/IDs) with techrecomm placeholders
npm run wordmark        # generate techrecomm wordmark logo/favicon files over the source logo slots
npm run audit           # offline link check; should report missingCount: 0
```

Contact details inserted by `rebrand`: `admin@techrecomm.com`, `+1 (646) 601-6012`, Tech Recommerce Solutions Inc, 2727 Coney Island Ave Ste C5, Brooklyn, NY 11235-5004.

Notes:

- The crawl is same-origin and skips the `/es /pt /tr /zh /fr` locale trees, checkout/account routes, and query-string variants (filters, sorts, `?variant=`).
- External assets live under `site/_cdn/<source>/…` (shopify, fonts-gstatic, google-fonts, judgeme, beae). Shopify image renditions encode their size params into the filename (`logo_w90.webp`).
- Pages are saved with real site structure: `/collections/apple/` → `site/collections/apple/index.html`.
- References whose download failed stay absolute so they fall back to the live CDN; the audit reports anything broken offline.

## Local preview

```bash
npm run serve
# Open http://127.0.0.1:3333/ — if it fails, something else is using port 3333.
```

## Visual parity (screenshots)

With the server running:

```bash
npm run parity            # writes PNGs to techrecomm-mirror/screenshots
node scripts/parity-screenshots.mjs https://wireless-source.com   # same routes on the source site for comparison
```

## Deploy

- **Vercel:** [`vercel.json`](vercel.json) rewrites everything into `techrecomm-mirror/site` with trailing slashes.
- **Netlify / other static hosts:** point the publish root at `techrecomm-mirror/site`; directory-index resolution covers the pretty URLs.

## Customization status

- [x] Full frontend mirrored (217 pages: home, 53 product, 44 collection, 24 static, 89 blog, 5 policy, cart/search shells)
- [ ] Rebrand (logo, name, colors) — replace wireless-source branding with our own
- [ ] Replace catalog content / product data
- [ ] Replace policies & contact details

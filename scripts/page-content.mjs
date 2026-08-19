/**
 * Inject generic page content into info pages whose bodies on the source
 * site were promo shells (the shared earbuds-promo section, now removed).
 * Content is inserted as a theme-styled block before the page's first
 * template section; an id marker keeps it idempotent (re-runs replace).
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = join(__dirname, "..", "techrecomm-mirror", "site");

const MARK_START = '<div id="techrecomm-page-content" class="page-width">';
const MARK_END = "<!-- /techrecomm-page-content -->";

const PAGES = {
  "pages/about-us": {
    title: "About us",
    body: `
<p>techrecomm (Tech Recommerce Solutions Inc) is a Brooklyn-based retailer of certified refurbished electronics — iPhones, iPads, MacBooks, Samsung phones, watches, and accessories.</p>
<p>Every device we sell goes through professional diagnostics, data wiping, and condition grading before it is listed. You see the exact condition tier (Excellent, Very Good, or Fair) and pay a fraction of the new-device price, with warranty coverage included.</p>
<p>Refurbished is also the sustainable choice: extending a device's life keeps it out of the landfill and cuts the footprint of manufacturing a new one.</p>
<p>Questions? Reach us at <a href="mailto:admin@techrecomm.com">admin@techrecomm.com</a> or +1 (646) 601-6012.</p>
<p>Tech Recommerce Solutions Inc<br>2727 Coney Island Ave Ste C5<br>Brooklyn, NY 11235-5004</p>`,
  },
  "pages/warranty": {
    title: "Warranty",
    body: `
<p>Every device purchased from techrecomm includes a [12]-month limited warranty covering functional defects in parts and workmanship under normal use.</p>
<h2>What's covered</h2>
<p>Hardware faults that affect normal operation — battery health below the advertised threshold, screen or camera malfunction, charging or connectivity failures not caused by damage after delivery.</p>
<h2>What's not covered</h2>
<p>Accidental damage (drops, cracks, liquid), cosmetic wear consistent with the listed condition grade, unauthorized repairs or modifications, and software issues unrelated to hardware.</p>
<h2>How to make a claim</h2>
<p>Email <a href="mailto:admin@techrecomm.com">admin@techrecomm.com</a> with your order number and a description of the issue. Our team will arrange diagnosis and, where covered, repair, replacement, or refund per our Refund Policy.</p>
<p>This warranty gives you specific rights; you may have additional rights under local consumer law.</p>`,
  },
};

function inject(html, title, body) {
  // drop any previous injection
  const s = html.indexOf(MARK_START);
  if (s >= 0) {
    const e = html.indexOf(MARK_END, s);
    if (e >= 0) html = html.slice(0, s) + html.slice(e + MARK_END.length);
  }
  const anchor = html.search(/<(?:div|section) id="shopify-section-template--/);
  if (anchor < 0) return null;
  const block = `${MARK_START}
  <h1 class="main-page-title page-title h0" style="margin:4rem 0 1.5rem">${title}</h1>
  <div class="rte" style="max-width:72rem;margin-bottom:4rem">${body}
  </div>
</div>
${MARK_END}
`;
  return html.slice(0, anchor) + block + html.slice(anchor);
}

function main() {
  const results = {};
  for (const [rel, { title, body }] of Object.entries(PAGES)) {
    const file = join(SITE_ROOT, ...rel.split("/"), "index.html");
    if (!existsSync(file)) {
      results[rel] = "MISSING";
      continue;
    }
    const html = readFileSync(file, "utf8");
    const next = inject(html, title, body);
    if (!next) {
      results[rel] = "NO ANCHOR";
      continue;
    }
    writeFileSync(file, next);
    results[rel] = "injected";
  }
  console.log(JSON.stringify(results, null, 2));
}

main();

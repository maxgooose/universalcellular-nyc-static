/**
 * Pre-launch storefront state: show generic stock availability but disable
 * purchasing with a professional notice (payment setup in progress).
 *
 * Injects one idempotent <script id="techrecomm-prelaunch"> snippet before
 * </body> on every page (existing copies are replaced, so edits propagate),
 * and normalizes product JSON-LD availability to InStock. Set ENABLED to
 * false and re-run to strip the snippet once payments go live.
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = join(__dirname, "..", "techrecomm-mirror", "site");

const ENABLED = true;

const SNIPPET = `<script id="techrecomm-prelaunch">
(function () {
  var NOTICE = "Online checkout is temporarily unavailable while we complete our secure payment setup. To place an order, email admin@techrecomm.com.";
  var BUTTON_LABEL = "Ordering Opens Soon";
  function stockCount() {
    var h = 0, p = location.pathname;
    for (var i = 0; i < p.length; i++) h = (h * 31 + p.charCodeAt(i)) >>> 0;
    return 12 + (h % 28);
  }
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }
  ready(function () {
    var style = document.createElement("style");
    style.textContent =
      ".tr-stock{display:flex;align-items:center;gap:.5rem;margin:.8rem 0;font-size:1.4rem;color:#108043}" +
      ".tr-stock .tr-dot{width:.9rem;height:.9rem;border-radius:50%;background:#108043;display:inline-block}" +
      ".tr-prelaunch-note{margin:.9rem 0 0;padding:1rem 1.2rem;border:1px solid #d8d8d8;border-radius:.6rem;background:#f7f7f7;font-size:1.3rem;line-height:1.5;color:#333}" +
      "form[data-type='add-to-cart-form'] button[disabled]{opacity:.55;cursor:not-allowed}";
    document.head.appendChild(style);

    var forms = document.querySelectorAll("form[data-type='add-to-cart-form']");
    forms.forEach(function (form) {
      form.addEventListener("submit", function (e) { e.preventDefault(); });
      var btn = form.querySelector("button[name='add'], button[type='submit']");
      if (btn) {
        btn.disabled = true;
        btn.setAttribute("aria-disabled", "true");
        var label = btn.querySelector("span") || btn;
        label.childNodes.forEach(function (n) {
          if (n.nodeType === 3 && n.textContent.trim()) n.textContent = BUTTON_LABEL;
        });
        if (!label.textContent.trim()) label.textContent = BUTTON_LABEL;
        if (label !== btn && label.textContent.trim() !== BUTTON_LABEL) label.textContent = BUTTON_LABEL;
      }
      if (!form.parentElement.querySelector(".tr-stock")) {
        var stock = document.createElement("div");
        stock.className = "tr-stock";
        stock.innerHTML = "<span class='tr-dot'></span>In stock \\u2014 " + stockCount() + " available \\u00b7 ships in 1\\u20132 business days";
        form.parentElement.insertBefore(stock, form);
      }
      if (!form.parentElement.querySelector(".tr-prelaunch-note")) {
        var note = document.createElement("div");
        note.className = "tr-prelaunch-note";
        note.textContent = NOTICE;
        form.insertAdjacentElement("afterend", note);
      }
    });
  });
})();
</script>`;

const SNIPPET_RE =
  /<script id="techrecomm-prelaunch">[\s\S]*?<\/script>\s*/g;

function walkHtml(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(p, acc);
    else if (/\.html$/i.test(entry.name)) acc.push(p);
  }
  return acc;
}

function main() {
  let injected = 0;
  let stripped = 0;
  let availabilityFixed = 0;
  for (const file of walkHtml(SITE_ROOT)) {
    const text = readFileSync(file, "utf8");
    let next = text.replace(SNIPPET_RE, "");
    if (next !== text) stripped++;

    if (/[/\\]products[/\\]/.test(file)) {
      const fixed = next
        .split("schema.org/OutOfStock").join("schema.org/InStock")
        .split("schema.org\\/OutOfStock").join("schema.org\\/InStock");
      if (fixed !== next) {
        next = fixed;
        availabilityFixed++;
      }
    }

    if (ENABLED && next.includes("</body>")) {
      const idx = next.lastIndexOf("</body>");
      next = next.slice(0, idx) + SNIPPET + "\n" + next.slice(idx);
      injected++;
    }

    if (next !== text) writeFileSync(file, next);
  }
  console.log(
    JSON.stringify(
      { enabled: ENABLED, injected, replacedExisting: stripped, availabilityFixed },
      null,
      2,
    ),
  );
}

main();

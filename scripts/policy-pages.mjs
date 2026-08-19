/**
 * Replace the source site's policy-page copy with generic template text.
 * Keeps each page's theme layout (header/footer/typography) and swaps only
 * the inner content of <div class="shopify-policy__body">. The text below
 * is original boilerplate with [PLACEHOLDERS] — review with legal counsel
 * and fill in real details before launch.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = join(__dirname, "..", "techrecomm-mirror", "site");

const NOTE = "<!-- Generic template content. Review with legal counsel and replace placeholders before launch. -->";
const CONTACT_LINE =
  '<p>Questions? Contact us at <a href="mailto:admin@techrecomm.com">admin@techrecomm.com</a>.</p>';

const BODIES = {
  "policies/terms-of-service": `${NOTE}
<p><em>Last updated: [DATE]</em></p>
<h2>1. Agreement to these terms</h2>
<p>By accessing or purchasing from this website (the "Site"), operated by Tech Recommerce Solutions Inc ("techrecomm", "we", "us"), you agree to these Terms of Service. If you do not agree, please do not use the Site.</p>
<h2>2. Products and pricing</h2>
<p>We sell certified refurbished electronics. Product descriptions, condition grades, and prices are presented as accurately as possible, but we do not warrant that they are error-free. We may correct errors, change prices, or discontinue products at any time, and we may refuse or cancel any order, including orders affected by pricing or listing errors.</p>
<h2>3. Orders and payment</h2>
<p>Your order is an offer to purchase; we accept it when we ship the item. Payment is due at checkout through the payment methods shown. You represent that you are authorized to use the payment method provided.</p>
<h2>4. Shipping</h2>
<p>Shipping timelines and costs are described in our Shipping Policy. Risk of loss passes to you upon delivery to the carrier, except where consumer law provides otherwise.</p>
<h2>5. Returns and refunds</h2>
<p>Returns are governed by our Refund Policy, available on this Site.</p>
<h2>6. Warranty and disclaimers</h2>
<p>Refurbished products are covered by the warranty stated on the product page or warranty page, if any. Except as expressly stated, the Site and products are provided "as is" and we disclaim all other warranties, express or implied, including merchantability and fitness for a particular purpose, to the maximum extent permitted by law. Nothing in these terms limits rights you have under applicable consumer protection law.</p>
<h2>7. Limitation of liability</h2>
<p>To the maximum extent permitted by law, our total liability for any claim arising out of these terms or your purchase is limited to the amount you paid for the product giving rise to the claim. We are not liable for indirect, incidental, or consequential damages.</p>
<h2>8. Acceptable use and intellectual property</h2>
<p>You may not misuse the Site, interfere with its operation, or use it for unlawful purposes. Site content is owned by or licensed to us and may not be reproduced without permission. Product names and logos of third-party manufacturers are trademarks of their respective owners and are used only to identify genuine products.</p>
<h2>9. Governing law</h2>
<p>These terms are governed by the laws of [STATE/JURISDICTION], without regard to conflict-of-law rules. Disputes will be resolved in the courts of [STATE/JURISDICTION] unless applicable law requires otherwise.</p>
<h2>10. Changes</h2>
<p>We may update these terms from time to time; the version posted on the Site at the time of your order applies to that order.</p>
<h2>11. Contact</h2>
<p>Tech Recommerce Solutions Inc<br>2727 Coney Island Ave Ste C5<br>Brooklyn, NY 11235-5004<br><a href="mailto:admin@techrecomm.com">admin@techrecomm.com</a><br>+1 (646) 601-6012</p>`,

  "policies/privacy-policy": `${NOTE}
<p><em>Last updated: [DATE]</em></p>
<h2>1. What we collect</h2>
<p>When you browse or order, we collect the information you provide (name, email, shipping and billing address, phone, order details) and technical data collected automatically (IP address, device and browser information, pages viewed, cookies).</p>
<h2>2. How we use it</h2>
<p>We use this information to process and deliver orders, provide customer support, prevent fraud, operate and improve the Site, and — only if you opt in — send marketing messages you can unsubscribe from at any time.</p>
<h2>3. Sharing</h2>
<p>We do not sell your personal information. We share it only with service providers who help us run the store (payment processing, shipping carriers, hosting, analytics), and where required by law. Service providers may use the information only to provide their services to us.</p>
<h2>4. Cookies</h2>
<p>We use cookies and similar technologies to keep your cart working, remember preferences, and understand Site usage. You can control cookies through your browser settings; disabling them may limit some features.</p>
<h2>5. Data retention</h2>
<p>We keep order records as long as needed for legal, tax, and warranty purposes, and other personal information only as long as necessary for the purposes above.</p>
<h2>6. Your rights</h2>
<p>Depending on where you live, you may have rights to access, correct, delete, or receive a copy of your personal information, and to object to or restrict certain processing. To exercise them, contact us at the address below. You may also have the right to complain to your local data-protection authority.</p>
<h2>7. Children</h2>
<p>The Site is not directed to children under 13, and we do not knowingly collect their information.</p>
<h2>8. Changes</h2>
<p>We may update this policy; material changes will be posted on this page with a new "last updated" date.</p>
<h2>9. Contact</h2>
<p>Tech Recommerce Solutions Inc<br>2727 Coney Island Ave Ste C5<br>Brooklyn, NY 11235-5004<br><a href="mailto:admin@techrecomm.com">admin@techrecomm.com</a></p>`,

  "policies/refund-policy": `${NOTE}
<p><em>Last updated: [DATE]</em></p>
<h2>Return window</h2>
<p>You may return most items within [30] days of delivery. To be eligible, the item must be in the condition you received it, with all included accessories, and not have any new damage, activation locks, or accounts signed in.</p>
<h2>How to start a return</h2>
<p>Email <a href="mailto:admin@techrecomm.com">admin@techrecomm.com</a> with your order number and reason for return. If approved, we will send a return shipping label and instructions. Items sent back without first requesting a return may not be accepted.</p>
<h2>Refunds</h2>
<p>Once we receive and inspect your return, we will notify you of the decision. Approved refunds are issued to your original payment method within [5–10] business days. Your bank or card issuer may need additional time to post it.</p>
<h2>Damaged, defective, or wrong items</h2>
<p>Inspect your order on arrival and contact us immediately if an item is defective, damaged, or not what you ordered — we will make it right with a replacement or refund at no cost to you.</p>
<h2>Exchanges</h2>
<p>The fastest way to exchange is to return the original item and place a new order once the return is accepted.</p>
<h2>Exceptions</h2>
<p>Items marked final sale and gift cards are not returnable. Return shipping for non-defective returns may be deducted from the refund where permitted by law.</p>
${CONTACT_LINE}`,

  "policies/shipping-policy": `${NOTE}
<p><em>Last updated: [DATE]</em></p>
<h2>Processing time</h2>
<p>Orders are processed within [1–2] business days (orders placed on weekends or holidays are processed the next business day). You will receive a confirmation email with tracking once your order ships.</p>
<h2>Delivery estimates</h2>
<p>Standard domestic delivery typically arrives within [2–5] business days after processing, depending on destination and carrier. Delivery dates are estimates, not guarantees.</p>
<h2>Shipping costs</h2>
<p>Shipping costs, including any free-shipping thresholds, are shown at checkout before you pay.</p>
<h2>Address accuracy</h2>
<p>Please make sure your shipping address is correct at checkout. We are not responsible for orders delivered to an incorrectly entered address; contact us as soon as possible if you need a correction before shipment.</p>
<h2>Delays, loss, or damage in transit</h2>
<p>Carrier delays can occasionally occur. If your package is significantly delayed, arrives damaged, or tracking shows delivered but you did not receive it, contact us and we will work with the carrier to resolve it.</p>
${CONTACT_LINE}`,

  "policies/contact-information": `${NOTE}
<p>Tech Recommerce Solutions Inc (techrecomm)</p>
<p>2727 Coney Island Ave Ste C5<br>Brooklyn, NY 11235-5004<br>United States</p>
<p>Email: <a href="mailto:admin@techrecomm.com">admin@techrecomm.com</a><br>Phone: +1 (646) 601-6012</p>
<p>Support hours: Monday–Friday, 9:00 AM – 5:00 PM ET</p>`,
};

/** Replace the inner HTML of <div class="shopify-policy__body"> with newBody. */
function replacePolicyBody(html, newBody) {
  const openRe = /<div class="shopify-policy__body">/;
  const m = html.match(openRe);
  if (!m) return null;
  const start = m.index + m[0].length;
  const tokenRe = /<div\b[^>]*>|<\/div>/gi;
  tokenRe.lastIndex = m.index;
  let depth = 0;
  let closeStart = -1;
  let t;
  while ((t = tokenRe.exec(html)) !== null) {
    depth += t[0][1] === "/" ? -1 : 1;
    if (depth === 0) {
      closeStart = t.index;
      break;
    }
  }
  if (closeStart < 0) return null;
  return html.slice(0, start) + "\n" + newBody + "\n" + html.slice(closeStart);
}

function main() {
  const results = {};
  for (const [rel, body] of Object.entries(BODIES)) {
    const file = join(SITE_ROOT, ...rel.split("/"), "index.html");
    if (!existsSync(file)) {
      results[rel] = "MISSING PAGE";
      continue;
    }
    const html = readFileSync(file, "utf8");
    const next = replacePolicyBody(html, body);
    if (!next) {
      results[rel] = "BODY MARKER NOT FOUND";
      continue;
    }
    if (next !== html) {
      writeFileSync(file, next);
      results[rel] = "replaced";
    } else {
      results[rel] = "unchanged";
    }
  }
  console.log(JSON.stringify(results, null, 2));
}

main();

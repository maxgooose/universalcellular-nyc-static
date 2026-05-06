# Forms and dynamic behavior (static mirror)

This mirror is **static HTML/CSS/JS**. WordPress/Contact Form 7 and Elementor AJAX endpoints
(such as `/wp-admin/admin-ajax.php`) are **not available** on pure static hosting.

## Contact form (`contact-us.html`)

1. **Option A – Form backend service**  
   Replace the CF7 form `action` with a provider endpoint (e.g. [Formspree](https://formspree.io/), [Basin](https://usebasin.com/), or your own API) and align field `name` attributes with that provider.

2. **Option B – Keep WordPress for forms only**  
   Point the form `action` to your live WordPress URL (full `https://…`) if that site stays online.

3. **Option C – Serverless function**  
   On Netlify/Vercel, add a serverless handler and POST the form to `/api/contact`.

## Newsletter (“Subscribe” / Elementor)

Wire the subscription widget to your ESP (Mailchimp, Brevo, etc.) using their embed or API from a small serverless function.

## After deploy

- Submit test messages and verify deliverability and spam settings (honeypot / CAPTCHA).
- Remove or ignore staging keys/nonces copied from WordPress in JS if the browser console shows 404s on `admin-ajax.php`; those calls are expected to fail unless you restore a PHP backend.

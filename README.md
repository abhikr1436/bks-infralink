# BKS Infralink website

Static site — plain HTML, CSS and JS. No build step needed to host it.

## Put it on GitHub Pages
1. Create a new repository (e.g. `bks-infralink`) and upload everything in this folder (keep the `assets` folder and the `.nojekyll` file).
2. Repository **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)`.
3. After a minute the site is live at `https://<your-username>.github.io/bks-infralink/`.

## Before going live
- **Contact details:** open `assets/main.js` and edit the `SITE` block at the top (phone, WhatsApp number, email). Every page reads from it.
- **Forms:** by default the contact and quote forms open the visitor's email app. To receive submissions directly, create a free form at formspree.io (or use `https://formsubmit.co/ajax/your@email`) and paste the URL into `formEndpoint` in the same block.
- **Custom domain:** in Settings → Pages add your domain, and point the DNS records as GitHub shows. Then replace `assets/og.jpg` links with full URLs if you want rich link previews.

## Files
- `index.html` home · `work.html` all drawings with zoom viewer · `services.html` · `about.html`
- `quote.html` quote form · `contact.html` · `privacy.html` · `terms.html` · `404.html`
- `assets/work/` drawings redrawn from the .dwg files (ink and paper versions, 1200 and 2400 px)

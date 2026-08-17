# Device North Star

A static prototype of the Adyen Customer-Area "Device North Star" experience (Fleet Intelligence, Device Studio, Stores/Locations). Built with React (UMD) + Babel-standalone transpiled in the browser and the Bento design system — no build step.

## Run locally

Serve the `app/` folder over HTTP (the `app.jsx` script is fetched, so `file://` won't work):

```bash
cd app
python3 -m http.server 8347
# open http://localhost:8347
```

## Structure

- `app/index.html` — entry point (loads React, Bento, data, and the app)
- `app/app.jsx` — the whole application (transpiled in-browser)
- `app/data.js`, `app/schema.js` — mock data + Device Studio schema
- `app/_ds/` — Bento design-system tokens + bundle
- `app/assets/` — images
- `index.html` (repo root) — redirect to `app/` for GitHub Pages

## Access gate

`app/index.html` includes a lightweight client-side password prompt (`ACCESS_PASSWORD`).
This is a **soft gate for a prototype only** — the password lives in the page source and does not
provide real security. For genuine protection, host behind Cloudflare Access / Netlify or Vercel password protection.

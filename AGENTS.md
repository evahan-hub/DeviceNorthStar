# Device North Star — prototype notes

Static prototype (no build step). Source: `app/index.html` + `app/app.jsx` (Babel in-browser) + `app/data.js`, `app/schema.js`, and the design-system bundle under `app/_ds/`.

## Serving locally
Served by a static server on port 8347, e.g. `python3 -m http.server 8347` from the repo root. App entry: `app/index.html` (client-side password gate; password in `ACCESS_PASSWORD`). Browser preview proxy runs at `http://127.0.0.1:61297/`.

## Keep the design brief in sync (IMPORTANT)
Whenever the prototype changes, also update the presentation/design brief:

`/Users/evah/adyen-main/.local/fleet-core-gpm-presentation.html`

It's a slide deck that embeds the prototype (iframe → `http://127.0.0.1:61297/`) and describes it in three feature slides. Reflect notable prototype changes in the matching slide's "What it does" spec bullets and JTBD "ask" callouts:
- Slide 8 — **Fleet intelligence**
- Slide 9 — **Devices & locations**
- Slide 10 — **Device studio**

Only mirror meaningful feature/flow/behavior changes (new modules, flows, states, renamed CTAs) — not every pixel tweak.

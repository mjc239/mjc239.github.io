# Elizabeth line departures — build & deploy

Two pieces: the **web app** (served by this repo's GitHub Pages site) and an
optional **Cloudflare Worker** (a private CORS proxy, the reliable long-term
option).

## Layout

- `_apps/elizabeth-line/` (this directory) — source. Jekyll ignores
  underscored directories, so none of this ships to the site.
  - `App.jsx` — the app, a single React component.
  - `main.jsx` — entry point that mounts it.
  - `tfl-proxy-worker.js` — the Cloudflare Worker source (deployed to
    Cloudflare, not to Pages; kept here for versioning).
- `apps/elizabeth-line/` — what actually gets served, at
  <https://mjc239.github.io/apps/elizabeth-line/>.
  - `index.html` — static shell (committed, hand-written).
  - `app.js` — the esbuild bundle (committed build output — rebuild and
    re-commit whenever `App.jsx` changes).

## Rebuilding the app

```bash
cd _apps/elizabeth-line
npm install
npm run build          # writes ../../apps/elizabeth-line/app.js
git add ../../apps/elizabeth-line/app.js && git commit
```

To iterate locally:

```bash
npm run watch          # rebuilds on save (unminified)
npm run serve          # serves the repo root at http://localhost:8000
# open http://localhost:8000/apps/elizabeth-line/
```

Pushing to `main` is the deploy — GitHub Pages runs Jekyll, which copies
`apps/` through verbatim.

## Deploying the Worker (recommended)

The app works out of the box via public CORS proxies (CodeTabs is the
default), but those are third parties with changing terms. The Worker is
your own proxy, locked to `api.tfl.gov.uk`, GET-only, and only answering
the origins in its `ALLOWED_ORIGINS` (already set to `mjc239.github.io`
and localhost).

You need a free Cloudflare account. Two ways:

### Option A — dashboard (no tooling)
1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Create Worker**.
2. Name it (e.g. `tfl-proxy`), click **Deploy**, then **Edit code**.
3. Paste the contents of `tfl-proxy-worker.js`. Deploy.
4. Your Worker URL is shown at the top, like `https://tfl-proxy.<you>.workers.dev`.

### Option B — Wrangler CLI
```bash
npm install -g wrangler
wrangler login
# save tfl-proxy-worker.js as src/index.js in a new folder with a wrangler.toml
wrangler deploy
```

### (Optional) Hide your TfL keys server-side
Register at the TfL API portal for an `app_id` / `app_key`, then:
```bash
wrangler secret put TFL_APP_ID
wrangler secret put TFL_APP_KEY
```
(Or add them under the Worker's **Settings → Variables** in the dashboard.)
The Worker appends them to every request, so they never appear in the page
source.

## Pointing the app at your Worker

In the app's **Settings** panel, paste your Worker URL **with a trailing
slash** into the custom proxy field:

```
https://tfl-proxy.<you>.workers.dev/
```

A URL ending in `/` with no `?` is treated as path-style — the app maps
TfL's paths straight onto your Worker. The choice is saved in the browser's
localStorage, so it sticks across visits. To make it the shipped default
for everyone, edit the `PROXIES` list in `App.jsx` and rebuild.

## Notes

- **Rate limits:** anonymous TfL is ~50 req/min. The app polls once a
  minute per open tab, so it's fine; the optional keys give headroom.
- **Cost:** Cloudflare's free tier is 100,000 Worker requests/day — vastly
  more than this needs.

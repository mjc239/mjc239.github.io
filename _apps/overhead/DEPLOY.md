# Overhead — build & deploy

A live tracker for the aircraft passing over West Ealing (W13). Two pieces:
the **web app** (served by this repo's GitHub Pages site) and an optional
**private CORS proxy** (a Cloudflare Worker — the reliable long-term option).
Same layout and tooling as the Elizabeth line app in `_apps/elizabeth-line/`.

## Layout

- `_apps/overhead/` (this directory) — source. Jekyll ignores underscored
  directories, so none of this ships to the site.
  - `OverheadTracker.jsx` — the app, a single self-contained React component
    (all CSS lives in a `<style>` block inside it).
  - `main.jsx` — entry point that mounts it.
  - `overhead-proxy-worker.js` — the CORS proxy as a Cloudflare Worker
    (deployed to Cloudflare, not to Pages; kept here for versioning).
- `apps/overhead/` — what actually gets served, at
  <https://mjc239.github.io/apps/overhead/>.
  - `index.html` — static shell (committed, hand-written).
  - `app.js` — the esbuild bundle (committed build output — rebuild and
    re-commit whenever `OverheadTracker.jsx` changes).

## Rebuilding the app

```bash
cd _apps/overhead
npm install
npm run build          # writes ../../apps/overhead/app.js
git add ../../apps/overhead/app.js && git commit
```

To iterate locally:

```bash
npm run watch          # rebuilds on save (unminified)
npm run serve          # serves the repo root at http://localhost:8000
# open http://localhost:8000/apps/overhead/
```

Pushing to `master` is the deploy — GitHub Pages runs Jekyll, which copies
`apps/` through verbatim.

## Configuration (top of `OverheadTracker.jsx`)

- `HOME_LAT` / `HOME_LON` — set from plus code `GMCG+GP8` (near Kingsley
  Avenue, W13). Rebuild after changing.
- `SEARCH_RADIUS_NM` — search radius in nautical miles (currently 1.5).
- `POLL_MS` — poll interval (currently 12s; airplanes.live allows ~1 req/sec).

## Data sources

- **Positions:** `airplanes.live` — `GET /v2/point/{lat}/{lon}/{radius_nm}`
  (1 req/sec, non-commercial).
- **Enrichment:** `adsbdb.com` (free, no key) — `/v1/aircraft/{hex}` for
  type/operator/photo and `/v1/callsign/{callsign}` for the route. Route
  lookups only resolve for callsigns in their database, so private/military
  flights often show "destination unknown" — that's expected, not a bug; the
  UI handles the nulls.

## CORS — the proxy

The APIs are called from the browser. `adsbdb.com` usually sends permissive
CORS headers, but `airplanes.live` may block browser requests. To handle that
the app routes every request through a **proxy chain** (`PROXY_CHAIN` near the
top of `OverheadTracker.jsx`) — exactly the pattern the Elizabeth line app
uses. Two proxy styles are supported:

- **path-style** (`proxyBase + "/" + host + path`) — our own Worker. The
  upstream host is the first path segment, so one worker fronts both APIs.
- **query-style** (`prefix + encodeURIComponent(fullUrl)`) — public CORS
  proxies. An entry ending in `/` with no `?` is treated as path-style.

Out of the box the chain uses public CORS proxies (CodeTabs, then AllOrigins)
so the app works with no extra setup. For a reliable, locked-down primary,
deploy the Worker below and uncomment its line at the top of `PROXY_CHAIN`.

A `?proxy=` URL parameter overrides the whole chain, e.g.
`/apps/overhead/?proxy=http://localhost:9000/` for local proxy debugging.

### Deploying the Cloudflare Worker

`overhead-proxy-worker.js` is locked to `api.airplanes.live` and
`api.adsbdb.com`, GET-only, and only answers the origins in its
`ALLOWED_ORIGINS` (already `mjc239.github.io` + localhost).

1. Cloudflare dashboard → **Workers & Pages** → **Create Worker** → paste the
   contents of `overhead-proxy-worker.js` → **Deploy**. This gives you
   `https://overhead-proxy.<you>.workers.dev`.
2. In `OverheadTracker.jsx`, uncomment the first `PROXY_CHAIN` entry and set it
   to your worker URL (keep the trailing `/` — that's what marks it
   path-style), then rebuild and commit `app.js`.

## Notes

- **Rate limits:** airplanes.live is ~1 req/sec; the app polls once per 12s
  per open tab, well inside that. The Worker also briefly caches identical
  requests.
- **Cost:** Cloudflare's free tier (100K Worker requests/day) dwarfs this
  app's needs.

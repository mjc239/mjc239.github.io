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
  - `supabase/functions/overhead-proxy/index.ts` — the CORS proxy as a
    Supabase Edge Function (deployed to Supabase, not to Pages; kept here for
    versioning). This is the recommended proxy.
  - `overhead-proxy-worker.js` — the same proxy as a Cloudflare Worker, if you
    ever prefer that instead.
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
CORS headers, but `airplanes.live` both omits them **and** rate-limits/times
out the shared IPs that public CORS proxies run on (so the public fallbacks
below are unreliable for it — you'll see `airplanes.live 408`). The fix is your
own proxy, which gets a dedicated IP and only carries your traffic.

The app routes every request through a **proxy chain** (`PROXY_CHAIN` near the
top of `OverheadTracker.jsx`) — exactly the pattern the Elizabeth line app
uses: your own proxy first, public proxies as automatic fallbacks. Two proxy
styles are supported:

- **path-style** (`proxyBase + "/" + host + path`) — our own proxy. The
  upstream host is the first path segment, so one function fronts both APIs.
- **query-style** (`prefix + encodeURIComponent(fullUrl)`) — public CORS
  proxies. An entry ending in `/` with no `?` is treated as path-style.

A `?proxy=` URL parameter overrides the whole chain, e.g.
`/apps/overhead/?proxy=http://localhost:9000/` for local proxy debugging.

### Deploying the proxy (Supabase Edge Function — recommended)

`supabase/functions/overhead-proxy/index.ts` is locked to `api.airplanes.live`
and `api.adsbdb.com`, GET-only, and only answers the origins in its
`ALLOWED_ORIGINS` (already `mjc239.github.io` + localhost).

**Important:** deploy it with **JWT verification off** — the browser calls it
anonymously and the origin allow-list is what gates access. `supabase/config.toml`
already sets this for CLI deploys; in the dashboard it's the "Verify JWT" toggle.

#### Option A — dashboard (no tooling)
1. Supabase dashboard → your project → **Edge Functions** → **Deploy a new
   function** → **Via Editor**.
2. Name it exactly `overhead-proxy` (the code strips this prefix from incoming
   paths), paste the contents of `supabase/functions/overhead-proxy/index.ts`,
   and deploy.
3. In the function's **Details**, turn **Verify JWT** off.
4. Your function URL is
   `https://<project-ref>.supabase.co/functions/v1/overhead-proxy`.

#### Option B — Supabase CLI
```bash
npm install -g supabase
supabase login
cd _apps/overhead
supabase functions deploy overhead-proxy --project-ref <your-project-ref> --no-verify-jwt
```

Then in `OverheadTracker.jsx`, uncomment the first `PROXY_CHAIN` entry and set
it to `https://<project-ref>.supabase.co/functions/v1/overhead-proxy/` (keep
the trailing `/` — that's what marks it path-style), then rebuild and commit
`app.js`.

### Cloudflare Worker (alternative)

`overhead-proxy-worker.js` is the same proxy for Cloudflare: dashboard →
**Workers & Pages** → **Create Worker** → paste the file → deploy, giving
`https://overhead-proxy.<you>.workers.dev`. Point the first `PROXY_CHAIN` entry
at that instead.

## Notes

- **Rate limits:** airplanes.live is ~1 req/sec; the app polls once per 12s
  per open tab, well inside that.
- **Cost:** both free tiers dwarf this app's needs — Supabase allows 500K
  function invocations/month, Cloudflare 100K Worker requests/day.

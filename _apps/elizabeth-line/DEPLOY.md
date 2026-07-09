# Elizabeth line departures — build & deploy

Two pieces: the **web app** (served by this repo's GitHub Pages site) and an
optional **private CORS proxy** (the reliable long-term option). The proxy
exists in two equivalent flavours — a Supabase Edge Function (recommended if
you already have a Supabase account) and a Cloudflare Worker.

## Layout

- `_apps/elizabeth-line/` (this directory) — source. Jekyll ignores
  underscored directories, so none of this ships to the site.
  - `App.jsx` — the app, a single React component.
  - `main.jsx` — entry point that mounts it.
  - `supabase/functions/tfl-proxy/index.ts` — the CORS proxy as a Supabase
    Edge Function (deployed to Supabase, not to Pages; kept here for
    versioning).
  - `tfl-proxy-worker.js` — the same proxy as a Cloudflare Worker, if you
    ever prefer that instead.
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

## Deploying the proxy (recommended)

The app works out of the box via public CORS proxies (CodeTabs is the
default), but those are third parties with changing terms. Your own proxy
is locked to `api.tfl.gov.uk`, GET-only, and only answers the origins in
its `ALLOWED_ORIGINS` (already set to `mjc239.github.io` and localhost).

### Supabase Edge Function (recommended)

**Important:** the function must be deployed with **JWT verification off** —
the browser calls it anonymously, and the origin allow-list in the code is
what gates access. `supabase/config.toml` already sets this for CLI deploys;
in the dashboard it's the "Verify JWT" toggle.

#### Option A — dashboard (no tooling)
1. Supabase dashboard → your project → **Edge Functions** → **Deploy a new
   function** → **Via Editor**.
2. Name it exactly `tfl-proxy` (the code strips this prefix from incoming
   paths), paste the contents of `supabase/functions/tfl-proxy/index.ts`,
   and deploy.
3. In the function's **Details**, turn **Verify JWT** off.
4. Your function URL is `https://<project-ref>.supabase.co/functions/v1/tfl-proxy`.

#### Option B — Supabase CLI
```bash
npm install -g supabase
supabase login
cd _apps/elizabeth-line
supabase functions deploy tfl-proxy --project-ref <your-project-ref> --no-verify-jwt
```

#### (Optional) Hide your TfL keys server-side
Register at the TfL API portal for an `app_id` / `app_key`, then:
```bash
supabase secrets set TFL_APP_ID=<id> TFL_APP_KEY=<key> --project-ref <your-project-ref>
```
(Or add them under **Edge Functions → Secrets** in the dashboard.)
The function appends them to every request, so they never appear in the
page source.

### Cloudflare Worker (alternative)

`tfl-proxy-worker.js` is the same proxy for Cloudflare: dashboard →
**Workers & Pages** → **Create Worker** → paste the file → deploy, giving
`https://tfl-proxy.<you>.workers.dev`. Optional keys go in as Worker
secrets (`wrangler secret put TFL_APP_ID` / `TFL_APP_KEY`, or
**Settings → Variables** in the dashboard).

## Pointing the app at your proxy

In the app's **Settings** panel, paste your proxy URL **with a trailing
slash** into the custom proxy field:

```
https://<project-ref>.supabase.co/functions/v1/tfl-proxy/
```

(or `https://tfl-proxy.<you>.workers.dev/` for the Cloudflare flavour.)

A URL ending in `/` with no `?` is treated as path-style — the app maps
TfL's paths straight onto your proxy. The choice is saved in the browser's
localStorage, so it sticks across visits. To make it the shipped default
for everyone, put the real URL in the `PROXIES` list in `App.jsx` and
rebuild.

## Notes

- **Rate limits:** anonymous TfL is ~50 req/min. The app polls once a
  minute per open tab, so it's fine; the optional keys give headroom.
- **Cost:** both free tiers dwarf this app's needs — Supabase allows 500K
  function invocations/month, Cloudflare 100K Worker requests/day.

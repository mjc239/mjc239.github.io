/**
 * Overhead CORS proxy — Supabase Edge Function
 * --------------------------------------------
 * Same job as overhead-proxy-worker.js (the Cloudflare version), ported to
 * Deno: adds the CORS headers the ADS-B APIs may omit, so a browser page can
 * call them, and gives airplanes.live a dedicated (not shared-proxy) IP so it
 * stops rate-limiting/timing out.
 *
 * Deliberately NOT an open proxy:
 *   • only proxies the hosts in ALLOWED_HOSTS (can't fetch arbitrary URLs)
 *   • only answers requests from origins listed in ALLOWED_ORIGINS
 *   • only allows GET
 *
 * Must be deployed with JWT verification OFF (see DEPLOY.md) — the browser
 * calls it anonymously. The origin allow-list is what gates access.
 *
 * Usage from the browser (path-style — the upstream host is the first path
 * segment after the function name, so one function fronts both APIs):
 *   https://<ref>.supabase.co/functions/v1/overhead-proxy/api.airplanes.live/v2/point/51.5/-0.32/1.5
 *   https://<ref>.supabase.co/functions/v1/overhead-proxy/api.adsbdb.com/v1/aircraft/4008f3
 * i.e. take any https://<host>/<PATH> and put it after .../overhead-proxy/.
 */

const ALLOWED_ORIGINS = [
  "https://mjc239.github.io",
  "http://localhost:8000",  // for local testing (python -m http.server)
  "http://127.0.0.1:8000",
  "http://localhost:4000",  // for local testing (jekyll serve)
  "http://127.0.0.1:4000",
];

// Only these upstream API hosts may be proxied.
const ALLOWED_HOSTS = new Set([
  "api.airplanes.live",
  "api.adsbdb.com",
]);

function corsHeaders(origin: string): Record<string, string> {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

// ---- Response cache ----
// Everyone watches the same point, so without caching each viewer's poll is a
// separate upstream request and airplanes.live's ~1 req/sec limit (shared,
// since all traffic exits this one function) is hit at ~12 concurrent viewers.
// A short in-memory cache (kept in the warm instance, keyed by upstream URL)
// collapses concurrent identical requests into ~1 upstream fetch per TTL
// window, so upstream load barely rises with audience size. CORS headers are
// NOT cached — they're re-applied per request from the caller's origin.
interface Cached { body: string; status: number; contentType: string; expires: number }
const CACHE = new Map<string, Cached>();
const CACHE_MAX = 500;

// Positions change constantly; aircraft/route reference data is effectively
// static, so it can be held much longer.
function ttlMs(host: string): number {
  return host === "api.airplanes.live" ? 10_000 : 3_600_000;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin") ?? "";
  const cors = corsHeaders(origin);

  // Preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  // Reject unknown origins outright
  if (!cors["Access-Control-Allow-Origin"]) {
    return new Response("Origin not allowed", { status: 403 });
  }

  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  // The first path segment (after the /functions/v1 and /overhead-proxy
  // prefixes, whichever the runtime includes) is the upstream host; the rest
  // is its path.
  const incoming = new URL(request.url);
  const path = incoming.pathname
    .replace(/^\/functions\/v1/, "")
    .replace(/^\/overhead-proxy/, "")
    .replace(/^\/+/, "");
  const slash = path.indexOf("/");
  const host = slash === -1 ? path : path.slice(0, slash);
  const rest = slash === -1 ? "" : path.slice(slash);

  if (!ALLOWED_HOSTS.has(host)) {
    return new Response("Forbidden target", { status: 403, headers: cors });
  }

  const target = new URL(`https://${host}${rest}${incoming.search}`);
  const cacheKey = target.toString();
  const now = Date.now();

  // Serve from cache if fresh.
  const hit = CACHE.get(cacheKey);
  if (hit && hit.expires > now) {
    return new Response(hit.body, {
      status: hit.status,
      headers: { ...cors, "Content-Type": hit.contentType, "X-Overhead-Cache": "hit" },
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: {
        Accept: "application/json",
        // airplanes.live can reject requests with no/blocked User-Agent.
        "User-Agent": "overhead-tracker (+https://mjc239.github.io/apps/overhead/)",
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "upstream_fetch_failed" }),
      { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const body = await upstream.text();
  const contentType = upstream.headers.get("Content-Type") ?? "application/json";

  // Cache successful responses only, so errors/"unknown callsign" still retry.
  if (upstream.status >= 200 && upstream.status < 300) {
    if (CACHE.size >= CACHE_MAX) {
      for (const [k, v] of CACHE) if (v.expires <= now) CACHE.delete(k);
      if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value as string);
    }
    CACHE.set(cacheKey, { body, status: upstream.status, contentType, expires: now + ttlMs(host) });
  }

  return new Response(body, {
    status: upstream.status,
    headers: { ...cors, "Content-Type": contentType, "X-Overhead-Cache": "miss" },
  });
});

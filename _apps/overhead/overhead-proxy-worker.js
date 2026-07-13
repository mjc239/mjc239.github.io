/**
 * Overhead CORS proxy — Cloudflare Worker
 * ---------------------------------------
 * Adds the CORS headers the ADS-B APIs may omit, so a browser page can call
 * them. Same shape as the Elizabeth line app's tfl-proxy-worker.js.
 *
 * Deliberately NOT an open proxy:
 *   • only proxies the API hosts in ALLOWED_HOSTS (can't fetch arbitrary URLs)
 *   • only answers requests from origins you list in ALLOWED_ORIGINS
 *   • only allows GET
 *
 * Usage from the browser (path-style — the upstream host is the first path
 * segment, so the same worker can front more than one API):
 *   https://<your-worker>.workers.dev/api.airplanes.live/v2/point/51.5/-0.32/1.5
 *   https://<your-worker>.workers.dev/api.adsbdb.com/v1/aircraft/4008f3
 *   https://<your-worker>.workers.dev/api.adsbdb.com/v1/callsign/BAW123
 * i.e. take any https://<host>/<PATH> and prefix it with the worker origin.
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

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
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

    // First path segment is the upstream host; the rest is its path.
    const incoming = new URL(request.url);
    const path = incoming.pathname.replace(/^\/+/, "");
    const slash = path.indexOf("/");
    const host = slash === -1 ? path : path.slice(0, slash);
    const rest = slash === -1 ? "" : path.slice(slash);

    if (!ALLOWED_HOSTS.has(host)) {
      return new Response("Forbidden target", { status: 403, headers: cors });
    }

    const target = new URL(`https://${host}${rest}${incoming.search}`);

    let upstream;
    try {
      upstream = await fetch(target.toString(), {
        headers: { Accept: "application/json" },
        // Cache identical requests briefly to ease upstream rate limits
        // (airplanes.live allows ~1 req/sec).
        cf: { cacheTtl: 10, cacheEverything: true },
      });
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "upstream_fetch_failed" }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        ...cors,
        "Content-Type":
          upstream.headers.get("Content-Type") || "application/json",
      },
    });
  },
};

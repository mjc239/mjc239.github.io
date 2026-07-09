/**
 * TfL CORS proxy — Cloudflare Worker
 * ----------------------------------
 * Adds the CORS headers TfL omits, so a browser page can call the API.
 *
 * Deliberately NOT an open proxy:
 *   • only proxies api.tfl.gov.uk (can't be used to fetch arbitrary URLs)
 *   • only answers requests from origins you list in ALLOWED_ORIGINS
 *   • only allows GET
 *
 * Usage from the browser:
 *   https://<your-worker>.workers.dev/StopPoint/Search/Farringdon?modes=elizabeth-line
 *   https://<your-worker>.workers.dev/Journey/JourneyResults/<from>/to/<to>?mode=elizabeth-line
 * i.e. take any https://api.tfl.gov.uk/<PATH> and swap the host for the worker.
 *
 * Optional: set TFL_APP_ID / TFL_APP_KEY as Worker secrets and they'll be
 * appended server-side, so your keys never appear in the page source.
 */

const ALLOWED_ORIGINS = [
  "https://mjc239.github.io",
  "http://localhost:8000",  // for local testing (python -m http.server)
  "http://127.0.0.1:8000",
  "http://localhost:4000",  // for local testing (jekyll serve)
  "http://127.0.0.1:4000",
];

const TFL_BASE = "https://api.tfl.gov.uk";

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
  async fetch(request, env) {
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

    // Rebuild the upstream URL: everything after the worker host maps onto TfL.
    const incoming = new URL(request.url);
    const target = new URL(TFL_BASE + incoming.pathname + incoming.search);

    // Only ever talk to TfL.
    if (target.hostname !== "api.tfl.gov.uk") {
      return new Response("Forbidden target", { status: 403, headers: cors });
    }

    // Attach credentials server-side if configured.
    if (env.TFL_APP_ID) target.searchParams.set("app_id", env.TFL_APP_ID);
    if (env.TFL_APP_KEY) target.searchParams.set("app_key", env.TFL_APP_KEY);

    let upstream;
    try {
      upstream = await fetch(target.toString(), {
        headers: { Accept: "application/json" },
        // Cache identical requests briefly to ease TfL rate limits.
        cf: { cacheTtl: 20, cacheEverything: true },
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

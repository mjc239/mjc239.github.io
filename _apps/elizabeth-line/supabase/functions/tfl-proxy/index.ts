/**
 * TfL CORS proxy — Supabase Edge Function
 * ---------------------------------------
 * Same job as tfl-proxy-worker.js (the Cloudflare version), ported to Deno:
 * adds the CORS headers TfL omits, so a browser page can call the API.
 *
 * Deliberately NOT an open proxy:
 *   • only proxies api.tfl.gov.uk (can't be used to fetch arbitrary URLs)
 *   • only answers requests from origins listed in ALLOWED_ORIGINS
 *   • only allows GET
 *
 * Must be deployed with JWT verification OFF (see DEPLOY.md) — the browser
 * calls it anonymously. The origin allow-list is what gates access.
 *
 * Usage from the browser:
 *   https://<ref>.supabase.co/functions/v1/tfl-proxy/StopPoint/Search/Farringdon?modes=elizabeth-line
 *   https://<ref>.supabase.co/functions/v1/tfl-proxy/Journey/JourneyResults/<from>/to/<to>?mode=elizabeth-line
 * i.e. take any https://api.tfl.gov.uk/<PATH> and put it after .../tfl-proxy.
 *
 * Optional: set TFL_APP_ID / TFL_APP_KEY as function secrets and they'll be
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

function corsHeaders(origin: string): Record<string, string> {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
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

  // Rebuild the upstream URL: everything after the function name maps onto
  // TfL. Depending on how the request reaches the runtime, the pathname may
  // carry the /functions/v1 and /tfl-proxy prefixes — strip whichever appear.
  const incoming = new URL(request.url);
  const path = incoming.pathname
    .replace(/^\/functions\/v1/, "")
    .replace(/^\/tfl-proxy/, "");
  const target = new URL(TFL_BASE + path + incoming.search);

  // Only ever talk to TfL.
  if (target.hostname !== "api.tfl.gov.uk") {
    return new Response("Forbidden target", { status: 403, headers: cors });
  }

  // Attach credentials server-side if configured.
  const appId = Deno.env.get("TFL_APP_ID");
  const appKey = Deno.env.get("TFL_APP_KEY");
  if (appId) target.searchParams.set("app_id", appId);
  if (appKey) target.searchParams.set("app_key", appKey);

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: { Accept: "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "upstream_fetch_failed" }),
      { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      ...cors,
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
});

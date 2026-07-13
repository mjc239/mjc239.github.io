import { useState, useEffect, useRef, useCallback } from "react";

// ---- Your location: West Ealing, W13 ----
// TODO: update to the actual Kingsley Avenue (W13) coordinates. The values
// below are only an approximate West Ealing centre used as a placeholder.
const HOME_LAT = 51.5126;
const HOME_LON = -0.3239;
const SEARCH_RADIUS_NM = 1.5; // airplanes.live takes nautical miles, max 250
const POLL_MS = 12000; // 1 req/sec limit on airplanes.live — 12s is very safe

// ---- Endpoints ----
const POINT_URL = (lat, lon, r) =>
  `https://api.airplanes.live/v2/point/${lat}/${lon}/${r}`;
const CALLSIGN_URL = (cs) => `https://api.adsbdb.com/v1/callsign/${cs}`;
const AIRCRAFT_URL = (hex) => `https://api.adsbdb.com/v1/aircraft/${hex}`;

// ---- CORS proxy chain ----
// airplanes.live (and sometimes adsbdb) don't send browser-friendly CORS
// headers, so requests go through a proxy that adds them — same pattern as the
// Elizabeth line app. Two proxy styles are supported:
//   • path-style:  proxyBase + "/" + host + path + query   (our own Worker)
//   • query-style: prefix + encodeURIComponent(fullUrl)     (public proxies)
// An entry ending in "/" (no "?") is treated as path-style. A ?proxy= URL
// parameter overrides the whole chain (dev/testing hook).
const PROXY_CHAIN = (() => {
  try {
    const override = new URLSearchParams(window.location.search).get("proxy");
    if (override) return [override];
  } catch {}
  return [
    // Your own Cloudflare Worker (see overhead-proxy-worker.js). Deploy it,
    // then uncomment and set your subdomain to make it the primary proxy:
    // "https://overhead-proxy.YOUR-SUBDOMAIN.workers.dev/",
    "https://api.codetabs.com/v1/proxy/?quest=",
    "https://api.allorigins.win/raw?url=",
  ];
})();

const proxied = (proxy, url) => {
  const pathStyle = proxy.endsWith("/") && !proxy.includes("?");
  // path-style keeps the upstream host as the first path segment so the Worker
  // knows which allow-listed API to forward to.
  if (pathStyle) {
    return proxy.replace(/\/$/, "") + "/" + url.replace(/^https?:\/\//, "");
  }
  return `${proxy}${encodeURIComponent(url)}`;
};

// Fetch a URL through the proxy chain: on a network error or proxy-side 5xx,
// quietly fall through to the next proxy. Any real upstream response
// (including 404) is returned as-is.
async function proxyFetch(url, init) {
  let lastErr = null;
  for (const proxy of PROXY_CHAIN) {
    try {
      const res = await fetch(proxied(proxy, url), init);
      if (res.status >= 500) {
        lastErr = new Error(`http-${res.status}`);
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("network");
}

// ---- Geo helpers ----
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Compass bearing from home to aircraft
function bearing(lat1, lon1, lat2, lon2) {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const compass = (deg) => COMPASS[Math.round(deg / 45) % 8];

// Pick the most "overhead" aircraft: closest, weighted so lower planes win.
// score = horizontal distance (km) + altitude penalty. Lower = more overhead.
function scoreOverhead(ac) {
  if (typeof ac.lat !== "number" || typeof ac.lon !== "number") return Infinity;
  const distKm = haversineKm(HOME_LAT, HOME_LON, ac.lat, ac.lon);
  const altFt =
    ac.alt_baro === "ground" ? 0 : typeof ac.alt_baro === "number" ? ac.alt_baro : 40000;
  // 10,000 ft of altitude ≈ 3 km of horizontal distance in "overhead-ness"
  return distKm + (altFt / 10000) * 3;
}

const fmt = (v, suffix = "") =>
  v === null || v === undefined || v === "" ? "—" : `${v}${suffix}`;

export default function OverheadTracker() {
  const [plane, setPlane] = useState(null); // enriched aircraft
  const [status, setStatus] = useState("starting");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [nearbyCount, setNearbyCount] = useState(0);
  const enrichCache = useRef(new Map()); // hex -> aircraft details
  const routeCache = useRef(new Map()); // callsign -> route

  const enrich = useCallback(async (ac) => {
    const hex = ac.hex;
    const callsign = (ac.flight || "").trim();

    // aircraft details (manufacturer, full type, operator, photo) by hex
    let details = enrichCache.current.get(hex) ?? null;
    if (details === null && !enrichCache.current.has(hex)) {
      try {
        const r = await proxyFetch(AIRCRAFT_URL(hex));
        if (r.ok) {
          const j = await r.json();
          details = j?.response?.aircraft ?? null;
        }
      } catch {
        details = null;
      }
      enrichCache.current.set(hex, details);
    }

    // route (origin/destination) by callsign
    let route = callsign ? routeCache.current.get(callsign) ?? null : null;
    if (callsign && route === null && !routeCache.current.has(callsign)) {
      try {
        const r = await proxyFetch(CALLSIGN_URL(callsign));
        if (r.ok) {
          const j = await r.json();
          route = j?.response?.flightroute ?? null;
        }
      } catch {
        route = null;
      }
      routeCache.current.set(callsign, route);
    }

    return { raw: ac, details, route };
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await proxyFetch(POINT_URL(HOME_LAT, HOME_LON, SEARCH_RADIUS_NM));
      if (!res.ok) throw new Error(`airplanes.live ${res.status}`);
      const data = await res.json();
      const list = (data.ac || []).filter(
        (a) => typeof a.lat === "number" && typeof a.lon === "number"
      );
      setNearbyCount(list.length);

      if (list.length === 0) {
        setPlane(null);
        setStatus("clear");
        setLastUpdate(new Date());
        return;
      }

      const best = list.reduce((a, b) =>
        scoreOverhead(a) <= scoreOverhead(b) ? a : b
      );
      const enriched = await enrich(best);
      setPlane(enriched);
      setStatus("tracking");
      setLastUpdate(new Date());
    } catch (e) {
      setStatus(`error: ${e.message}`);
    }
  }, [enrich]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  // ---- Derived display fields ----
  const view = (() => {
    if (!plane) return null;
    const { raw, details, route } = plane;
    const distKm = haversineKm(HOME_LAT, HOME_LON, raw.lat, raw.lon);
    const brg = bearing(HOME_LAT, HOME_LON, raw.lat, raw.lon);
    const altFt = raw.alt_baro === "ground" ? 0 : raw.alt_baro;
    const rate = raw.baro_rate ?? 0;
    const trend = rate > 100 ? "climbing" : rate < -100 ? "descending" : "level";

    const airline =
      route?.airline?.name ||
      details?.registered_owner ||
      "Unknown operator";
    const originName = route?.origin
      ? `${route.origin.iata_code || route.origin.icao_code}`
      : null;
    const destName = route?.destination
      ? `${route.destination.iata_code || route.destination.icao_code}`
      : null;

    const model =
      details?.type ||
      (raw.t ? `type ${raw.t}` : "Unknown aircraft");

    return {
      callsign: (raw.flight || "").trim() || raw.hex?.toUpperCase() || "—",
      airline,
      model,
      icaoType: details?.icao_type || raw.t || "—",
      reg: details?.registration || raw.r || "—",
      origin: originName,
      originCity: route?.origin?.municipality || route?.origin?.name || null,
      dest: destName,
      destCity: route?.destination?.municipality || route?.destination?.name || null,
      altFt,
      trend,
      rate,
      speedKt: raw.gs != null ? Math.round(raw.gs) : null,
      track: raw.track != null ? Math.round(raw.track) : null,
      distKm,
      compass: compass(brg),
      photo: details?.url_photo_thumbnail || null,
      hex: raw.hex,
    };
  })();

  return (
    <div className="ovh-root">
      <style>{css}</style>

      <header className="ovh-head">
        <div className="ovh-brand">
          <span className="ovh-dot" data-live={status === "tracking"} />
          OVERHEAD
        </div>
        <div className="ovh-loc">W13 · WEST EALING · {SEARCH_RADIUS_NM} NM</div>
      </header>

      {view ? (
        <main className="ovh-card" key={view.hex}>
          <div className="ovh-callrow">
            <div className="ovh-callsign">{view.callsign}</div>
            <div className="ovh-reg">{view.reg}</div>
          </div>

          <div className="ovh-airline">{view.airline}</div>

          {view.photo && (
            <img className="ovh-photo" src={view.photo} alt={view.model} />
          )}

          <div className="ovh-route">
            <div className="ovh-port">
              <div className="ovh-code">{fmt(view.origin)}</div>
              <div className="ovh-city">{view.originCity || "origin unknown"}</div>
            </div>
            <div className="ovh-arrow">→</div>
            <div className="ovh-port ovh-right">
              <div className="ovh-code">{fmt(view.dest)}</div>
              <div className="ovh-city">{view.destCity || "destination unknown"}</div>
            </div>
          </div>

          <div className="ovh-model">
            {view.model}
            <span className="ovh-type">{view.icaoType}</span>
          </div>

          <div className="ovh-grid">
            <Metric label="ALT" value={fmt(view.altFt?.toLocaleString?.(), " ft")} />
            <Metric label="TREND" value={view.trend} />
            <Metric label="SPEED" value={fmt(view.speedKt, " kt")} />
            <Metric label="DIST" value={`${view.distKm.toFixed(1)} km`} />
            <Metric label="BEARING" value={`${view.compass} · ${fmt(view.track, "°")}`} />
            <Metric label="V/RATE" value={fmt(view.rate, " fpm")} />
          </div>
        </main>
      ) : (
        <main className="ovh-empty">
          <div className="ovh-empty-big">CLEAR SKIES</div>
          <div className="ovh-empty-sub">
            No aircraft within {SEARCH_RADIUS_NM} nm right now
          </div>
        </main>
      )}

      <footer className="ovh-foot">
        <span>{nearbyCount} in range</span>
        <span>
          {status.startsWith("error") ? status : `updated ${lastUpdate ? lastUpdate.toLocaleTimeString() : "—"}`}
        </span>
      </footer>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="ovh-metric">
      <div className="ovh-metric-label">{label}</div>
      <div className="ovh-metric-value">{value}</div>
    </div>
  );
}

const css = `
.ovh-root {
  --bg: #0b0f14;
  --panel: #121821;
  --line: #1f2a37;
  --amber: #ffb648;
  --amber-dim: #b8822f;
  --text: #dfe7ef;
  --muted: #6b7c8f;
  font-family: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  max-width: 460px;
  margin: 0 auto;
  padding: 18px;
  box-sizing: border-box;
  letter-spacing: 0.02em;
}
.ovh-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
.ovh-brand { font-weight:700; font-size:15px; letter-spacing:0.22em; display:flex; align-items:center; gap:9px; color:var(--amber); }
.ovh-dot { width:8px; height:8px; border-radius:50%; background:var(--muted); }
.ovh-dot[data-live="true"] { background:var(--amber); box-shadow:0 0 10px var(--amber); animation:pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
.ovh-loc { font-size:10px; color:var(--muted); letter-spacing:0.14em; }

.ovh-card { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:20px; flex:1; }
.ovh-callrow { display:flex; justify-content:space-between; align-items:baseline; }
.ovh-callsign { font-size:34px; font-weight:700; letter-spacing:0.05em; color:#fff; }
.ovh-reg { font-size:13px; color:var(--muted); }
.ovh-airline { color:var(--amber); font-size:16px; margin-top:2px; margin-bottom:16px; }

.ovh-photo { width:100%; height:150px; object-fit:cover; border-radius:9px; border:1px solid var(--line); margin-bottom:16px; display:block; filter:saturate(0.9); }

.ovh-route { display:flex; align-items:center; gap:12px; padding:14px 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
.ovh-port { flex:1; }
.ovh-right { text-align:right; }
.ovh-code { font-size:26px; font-weight:700; color:#fff; }
.ovh-city { font-size:11px; color:var(--muted); margin-top:3px; }
.ovh-arrow { color:var(--amber-dim); font-size:20px; }

.ovh-model { margin-top:16px; font-size:15px; color:var(--text); display:flex; justify-content:space-between; align-items:center; }
.ovh-type { font-size:11px; color:var(--muted); border:1px solid var(--line); padding:2px 7px; border-radius:5px; }

.ovh-grid { margin-top:16px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:1px; background:var(--line); border:1px solid var(--line); border-radius:10px; overflow:hidden; }
.ovh-metric { background:var(--panel); padding:12px 10px; }
.ovh-metric-label { font-size:9px; color:var(--muted); letter-spacing:0.16em; }
.ovh-metric-value { font-size:14px; color:var(--text); margin-top:4px; }

.ovh-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:var(--panel); border:1px solid var(--line); border-radius:14px; }
.ovh-empty-big { font-size:22px; letter-spacing:0.24em; color:var(--muted); }
.ovh-empty-sub { font-size:11px; color:var(--muted); margin-top:10px; }

.ovh-foot { display:flex; justify-content:space-between; font-size:10px; color:var(--muted); margin-top:14px; letter-spacing:0.1em; }

@media (prefers-reduced-motion: reduce) { .ovh-dot[data-live="true"] { animation:none; } }
`;

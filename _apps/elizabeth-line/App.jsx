import React, { useState, useEffect, useCallback, useRef } from "react";

// Elizabeth line stations, west → east so the pickers read like the line map.
// IDs are resolved live from TfL at load, so only the NAMES need to be right.
const STATION_NAMES = [
  "Reading", "Twyford", "Maidenhead", "Taplow", "Burnham", "Slough",
  "Langley", "Iver", "West Drayton", "Hayes & Harlington", "Southall",
  "Hanwell", "West Ealing", "Ealing Broadway", "Acton Main Line",
  "Paddington", "Bond Street", "Tottenham Court Road", "Farringdon",
  "Liverpool Street", "Whitechapel", "Canary Wharf", "Custom House",
  "Woolwich", "Abbey Wood", "Stratford", "Maryland", "Forest Gate",
  "Manor Park", "Ilford", "Seven Kings", "Goodmayes", "Chadwell Heath",
  "Romford", "Gidea Park", "Harold Wood", "Brentwood", "Shenfield",
];

// Known-good IDs used as the search hint and as a fast default so the app is
// usable on first paint before name→id resolution finishes.
const SEED = {
  "West Ealing": "910GWEALING",
  "Liverpool Street": "910GLIVSTLL",
};

const TFL = "https://api.tfl.gov.uk";

function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit",
  });
}
function minsUntil(iso) {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

function StationPicker({ label, value, onChange, exclude, stations }) {
  return (
    <label className="picker">
      <span className="picker-label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {stations.map((s) => (
          <option key={s.name} value={s.name} disabled={s.name === exclude}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function App() {
  const [stations] = useState(() =>
    STATION_NAMES.map((name) => ({ name, id: SEED[name] || null }))
  );
  const idCache = useRef({ ...SEED }); // name → resolved Naptan id
  const lineMap = useRef(null); // in-flight/done promise for the line stop list

  const [fromName, setFromName] = useState("Liverpool Street");
  const [toName, setToName] = useState("West Ealing");
  const [journeys, setJourneys] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errMsg, setErrMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [, tick] = useState(0);

  // TfL's API sends no CORS headers, so browser requests must go via a proxy
  // that adds them: our own Supabase function first, public proxies as
  // automatic fallbacks if it's ever down. Two proxy styles are supported:
  //   • path-style:  proxyBase + /<path><query>          (our own proxy)
  //   • query-style: prefix + encodeURIComponent(fullTflUrl)   (public proxies)
  // An entry ending in "/" (no "?") is treated as path-style. A ?proxy= URL
  // parameter overrides the whole chain (dev/testing hook).
  const PROXY_CHAIN = (() => {
    try {
      const override = new URLSearchParams(window.location.search).get("proxy");
      if (override) return [override];
    } catch {}
    return [
      "https://rogsybzffnvpcapycjch.supabase.co/functions/v1/tfl-proxy/",
      "https://api.codetabs.com/v1/proxy/?quest=",
      "https://api.allorigins.win/raw?url=",
    ];
  })();

  const proxied = (proxy, url) => {
    const pathStyle = proxy.endsWith("/") && !proxy.includes("?");
    if (pathStyle) {
      // Strip the TfL base so path + query sit directly after the proxy base.
      return proxy.replace(/\/$/, "") + url.slice(TFL.length);
    }
    return `${proxy}${encodeURIComponent(url)}`;
  };

  // Fetch a TfL URL through the proxy chain: on network failure or a
  // proxy-side 5xx, quietly move to the next proxy. Any real TfL response
  // (including 300/404/429) is returned as-is.
  const tflFetch = async (url) => {
    let lastErr = null;
    for (const proxy of PROXY_CHAIN) {
      try {
        const res = await fetch(proxied(proxy, url));
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
  };

  // Live "X min" counters between fetches.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Primary id source: the line's own stop list, fetched once. These are the
  // canonical Elizabeth line ids, so journey requests can't hit hub
  // ambiguity (which surfaces as 300 disambiguation or 404 no-journey).
  const loadLineMap = useCallback(() => {
    if (!lineMap.current) {
      lineMap.current = (async () => {
        const res = await tflFetch(`${TFL}/Line/elizabeth/StopPoints`);
        if (!res.ok) throw new Error(`line-${res.status}`);
        const stops = await res.json();
        const norm = (s) =>
          s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9 ]/g, " ")
            .replace(/\s+/g, " ").trim();
        for (const name of STATION_NAMES) {
          const n = norm(name);
          const hits = (stops || [])
            .filter((s) => /^910G/.test(s.id) && norm(s.commonName || "").includes(n))
            // Shortest common name = tightest match (avoids e.g. a longer
            // "X via Y" style name shadowing the station itself).
            .sort((x, y) => (x.commonName || "").length - (y.commonName || "").length);
          if (hits[0]) idCache.current[name] = hits[0].id;
        }
      })().catch((e) => {
        lineMap.current = null; // allow a retry on the next poll
        throw e;
      });
    }
    return lineMap.current;
  }, []);

  // Resolve a station name to its Naptan id: line stop list first, then a
  // per-name search as fallback. In the search results prefer a rail-style
  // 910G… id — search can also return hub ids (HUBPAD etc.), which make the
  // Journey API answer 300 "disambiguate" instead of journeys.
  const resolveId = useCallback(async (name) => {
    if (idCache.current[name]) return idCache.current[name];
    try {
      await loadLineMap();
    } catch {}
    if (idCache.current[name]) return idCache.current[name];
    const url =
      `${TFL}/StopPoint/Search/${encodeURIComponent(name)}` +
      `?modes=elizabeth-line`;
    const res = await tflFetch(url);
    if (!res.ok) throw new Error(`search-${res.status}`);
    const data = await res.json();
    const matches = data.matches || [];
    const match = matches.find((m) => /^910G/.test(m.id)) || matches[0];
    if (!match) throw new Error("no-match");
    idCache.current[name] = match.id;
    return match.id;
  }, [loadLineMap]);

  const fetchJourneys = useCallback(async () => {
    setStatus((s) => (journeys.length ? s : "loading"));
    setErrMsg("");
    setFetching(true);
    try {
      const [fromId, toId] = await Promise.all([
        resolveId(fromName),
        resolveId(toName),
      ]);
      const requestJourneys = (a, b, extra = {}) => {
        const params = new URLSearchParams({
          mode: "elizabeth-line",
          journeyPreference: "leastTime",
          timeIs: "departing",
          alternativeWalking: "false",
          ...extra,
        });
        const url = `${TFL}/Journey/JourneyResults/${a}/to/${b}?${params}`;
        return tflFetch(url);
      };
      let effFrom = fromId;
      let effTo = toId;
      let res = await requestJourneys(effFrom, effTo);
      if (res.status === 300) {
        // Ambiguous endpoint (usually a hub id): TfL answers 300 with its
        // suggested precise ids instead of journeys. Adopt them & retry once.
        const d = await res.json().catch(() => null);
        const pick = (disamb, fallback) => {
          const vals = (disamb?.disambiguationOptions || [])
            .map((o) => o.parameterValue)
            .filter(Boolean);
          return vals.find((v) => /^910G/.test(v)) || vals[0] || fallback;
        };
        const newFrom = pick(d?.fromLocationDisambiguation, fromId);
        const newTo = pick(d?.toLocationDisambiguation, toId);
        if (newFrom !== fromId || newTo !== toId) {
          idCache.current[fromName] = newFrom;
          idCache.current[toName] = newTo;
          effFrom = newFrom;
          effTo = newTo;
          res = await requestJourneys(effFrom, effTo);
        }
      }
      if (res.status === 404) {
        // TfL's "no journey found for your inputs" — a real answer (e.g.
        // outside service hours), not a failure. Show the empty state.
        setJourneys([]);
        setStatus("empty");
        setLastUpdated(new Date());
        return;
      }
      if (!res.ok) {
        if (res.status === 429) throw new Error("rate");
        throw new Error(`http-${res.status}`);
      }
      const parseDirect = (data) =>
        (data.journeys || [])
          .map((j) => {
            const railLegs = (j.legs || []).filter(
              (l) => l.mode?.id === "elizabeth-line"
            );
            const first = railLegs[0];
            return {
              start: j.startDateTime,
              arrive: j.arrivalDateTime,
              duration: j.duration,
              platform:
                first?.departurePoint?.platformName &&
                first.departurePoint.platformName !== "null"
                  ? first.departurePoint.platformName
                  : null,
              direct: railLegs.length === 1 && (j.legs || []).length === 1,
            };
          })
          .filter((j) => j.direct);

      const data = await res.json();
      let list = parseDirect(data);

      // TfL returns only ~3 options per call. To fill the board to 6, ask
      // once more for the window just after the last returned departure and
      // merge the batches.
      const allStarts = (data.journeys || [])
        .map((j) => j.startDateTime)
        .filter(Boolean);
      if (list.length > 0 && list.length < 6 && allStarts.length) {
        const latest = allStarts.reduce((a, b) => (a > b ? a : b));
        const next = new Date(new Date(latest).getTime() + 60000);
        const pad = (n) => String(n).padStart(2, "0");
        const res2 = await requestJourneys(effFrom, effTo, {
          date: `${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`,
          time: `${pad(next.getHours())}${pad(next.getMinutes())}`,
        });
        if (res2.ok) {
          const more = parseDirect(await res2.json().catch(() => ({})));
          const seen = new Set(list.map((j) => j.start));
          for (const j of more) if (!seen.has(j.start)) list.push(j);
        }
      }

      list = list
        .sort((a, b) => new Date(a.start) - new Date(b.start))
        .slice(0, 6);

      setJourneys(list);
      setStatus(list.length ? "ok" : "empty");
      setLastUpdated(new Date());
    } catch (e) {
      const msg = e.message || "";
      if (msg === "rate") {
        setErrMsg("TfL is rate-limiting requests right now. Try again in a minute.");
      } else if (msg === "no-match" || msg.startsWith("search-")) {
        setErrMsg("Couldn't look up one of the stations. Try again shortly.");
      } else if (msg.startsWith("http-")) {
        setErrMsg(`TfL returned an error (${msg.replace("http-", "")}). Try again shortly.`);
      } else {
        setErrMsg("Couldn't reach TfL. Check your connection and try again.");
      }
      setStatus("error");
    } finally {
      setFetching(false);
    }
  }, [fromName, toName, resolveId, journeys.length]);

  useEffect(() => {
    fetchJourneys();
    const poll = setInterval(fetchJourneys, 60000);
    return () => clearInterval(poll);
  }, [fetchJourneys]);

  const swap = () => {
    setFromName(toName);
    setToName(fromName);
  };

  return (
    <div className="wrap">
      <style>{css}</style>

      <header className="head">
        <div className="line-tab">Elizabeth line</div>
        <h1>Which train stops for me</h1>
        <p className="sub">Direct trains leaving your station that actually call at your destination.</p>
      </header>

      <section className="controls">
        <StationPicker label="From" value={fromName} onChange={setFromName} exclude={toName} stations={stations} />
        <button className="swap" onClick={swap} aria-label="Swap stations" title="Swap">⇅</button>
        <StationPicker label="To" value={toName} onChange={setToName} exclude={fromName} stations={stations} />
      </section>

      <div className="route-line">
        <span className="dot" /> {fromName}
        <span className="arrow">→</span>
        {toName} <span className="dot end" />
      </div>

      <section className={`board${fetching ? " fetching" : ""}`}>
        {status === "loading" && journeys.length === 0 && (
          <div className="msg wait">
            <span className="spin" aria-hidden="true" /> Checking the line…
          </div>
        )}
        {status === "error" && (
          <div className="msg err">
            {errMsg}
            <button className="retry" onClick={fetchJourneys}>Retry</button>
          </div>
        )}
        {status === "empty" && (
          <div className="msg">
            No direct Elizabeth line trains between these two stations soon. They may not
            share a direct service, or none are running right now.
          </div>
        )}
        {journeys.map((j, i) => {
          const m = minsUntil(j.start);
          const soon = m !== null && m <= 3;
          return (
            <div className={`row${i === 0 ? " next" : ""}`} key={i}>
              <div className="row-main">
                <div className="dep">{fmtTime(j.start)}</div>
                <div className="meta">
                  <div className="leg">
                    arrives {fmtTime(j.arrive)}
                    <span className="dur"> · {j.duration} min</span>
                  </div>
                  {j.platform && <div className="plat">Platform {j.platform}</div>}
                </div>
              </div>
              <div className={`count${soon ? " soon" : ""}`}>
                {m === null ? "—" : m <= 0 ? "due" : `${m} min`}
              </div>
            </div>
          );
        })}
      </section>

      <footer className="foot">
        <span className="updated">
          {fetching && <span className="spin small" aria-label="Updating" />}
          {lastUpdated
            ? `Updated ${lastUpdated.toLocaleTimeString("en-GB", {
                hour: "2-digit", minute: "2-digit", second: "2-digit",
              })}`
            : ""}
        </span>
      </footer>
    </div>
  );
}

const css = `
  * { box-sizing: border-box; }
  .wrap {
    --ink: #0a1a2f; --paper: #f6f4ee; --purple: #6950a1;
    --purple-soft: #efe9f6; --amber: #c8102e; --line: #d8d3c7;
    max-width: 560px; margin: 0 auto; padding: 28px 22px 40px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    color: var(--ink); background: var(--paper); min-height: 100vh;
  }
  .head { margin-bottom: 24px; }
  .line-tab {
    display: inline-block; background: var(--purple); color: #fff;
    font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
    padding: 4px 11px; border-radius: 3px; margin-bottom: 14px;
  }
  h1 {
    font-family: Georgia, serif; font-size: 29px; line-height: 1.1;
    margin: 0 0 6px; font-weight: 700;
  }
  .sub { margin: 0; font-size: 14px; color: #5a5a52; line-height: 1.4; }
  .controls {
    display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px;
    align-items: end; margin-bottom: 14px;
  }
  .picker { display: flex; flex-direction: column; gap: 5px; }
  .picker-label {
    font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; color: #8a857a;
  }
  select {
    appearance: none; -webkit-appearance: none; width: 100%;
    padding: 11px 12px; font-size: 15px; font-family: inherit;
    color: var(--ink); background: #fff; border: 1px solid var(--line);
    border-radius: 8px; cursor: pointer;
  }
  select:focus-visible { outline: 2px solid var(--purple); outline-offset: 1px; }
  .swap {
    height: 44px; width: 44px; border: 1px solid var(--line);
    background: #fff; border-radius: 8px; font-size: 19px;
    color: var(--purple); cursor: pointer;
    transition: background .15s, transform .15s;
  }
  .swap:hover { background: var(--purple-soft); transform: rotate(180deg); }
  .swap:focus-visible { outline: 2px solid var(--purple); outline-offset: 1px; }
  .route-line {
    display: flex; align-items: center; gap: 8px; font-size: 13px;
    font-weight: 600; color: #5a5a52; margin-bottom: 18px; padding-left: 2px;
  }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--purple); flex: none; }
  .dot.end { background: var(--amber); }
  .arrow { color: #b3ad9f; }
  .board { display: flex; flex-direction: column; gap: 8px; min-height: 120px; }
  .board.fetching .row { opacity: 0.55; transition: opacity 0.2s; }
  .spin {
    display: inline-block; width: 16px; height: 16px; flex: none;
    border: 2px solid var(--line); border-top-color: var(--purple);
    border-radius: 50%; animation: elspin 0.8s linear infinite;
    vertical-align: -2px;
  }
  .spin.small { width: 12px; height: 12px; }
  @keyframes elspin { to { transform: rotate(360deg); } }
  .msg.wait {
    display: flex; align-items: center; justify-content: center; gap: 10px;
  }
  .updated { display: inline-flex; align-items: center; gap: 7px; }
  .row {
    display: flex; align-items: center; justify-content: space-between;
    background: #fff; border: 1px solid var(--line); border-radius: 10px;
    padding: 14px 16px;
  }
  .row.next { border-color: var(--purple); box-shadow: 0 0 0 1px var(--purple) inset; }
  .row-main { display: flex; align-items: baseline; gap: 16px; }
  .dep {
    font-family: Georgia, serif; font-size: 26px; font-weight: 700;
    font-variant-numeric: tabular-nums; letter-spacing: -0.01em;
  }
  .meta { font-size: 13px; color: #5a5a52; }
  .leg { font-weight: 500; }
  .dur { color: #9a958a; }
  .plat { font-size: 12px; color: #8a857a; margin-top: 2px; }
  .count {
    font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums;
    color: var(--purple); white-space: nowrap;
  }
  .count.soon { color: var(--amber); }
  .msg {
    background: #fff; border: 1px dashed var(--line); border-radius: 10px;
    padding: 20px 16px; font-size: 14px; color: #5a5a52;
    text-align: center; line-height: 1.5;
  }
  .msg.err { border-color: var(--amber); color: var(--amber); }
  .retry {
    display: block; margin: 10px auto 0; background: var(--purple); color: #fff;
    border: none; border-radius: 6px; padding: 7px 16px; font-size: 13px;
    font-weight: 600; cursor: pointer; font-family: inherit;
  }
  .retry:hover { opacity: 0.9; }
  .foot {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 18px; font-size: 12px; color: #9a958a;
  }
  @media (prefers-reduced-motion: reduce) {
    .swap { transition: none; }
    .swap:hover { transform: none; }
    .spin { animation-duration: 2.4s; }
  }
`;

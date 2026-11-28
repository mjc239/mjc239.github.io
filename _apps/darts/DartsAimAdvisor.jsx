import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  makeLevel, aimValues, dartOutcome, isLegalState, startMatters, visitsToFinish,
  checkoutChance, checkoutRoute,
} from "./engine.js";

const DATA = "data/";
const BLOG_POST = "https://mjc239.github.io/count-visits-not-darts/";
const PRESETS = [501, 170, 100, 61, 50, 40, 32, 2];
const START_LEVEL_AVERAGE = 51; // open on a league player...
const START_SCORE = 40; // ...requiring 40

// Visits worse than the best aim, at each colour stop (equally spaced in the key).
const STOPS = [0, 0.02, 0.05, 0.1, 0.2, 0.5, 1];

const CSS = `
:root {
  /* Layout: controls on the left, the board as the hero on the right; one column on a phone. */
  --bg: #f6f7f4;
  --panel: #ffffff;
  --ink: #16191d;
  --ink-2: #4c5560;
  --ink-3: #7a838d;
  --line: rgba(22, 25, 29, 0.42);
  --hair: rgba(22, 25, 29, 0.12);
  --accent: #c8102e;
  --accent-ink: #ffffff;
  --heat-0: #0e3d7e; --heat-1: #1757ac; --heat-2: #2370cd; --heat-3: #338ced;
  --heat-4: #84b9f3; --heat-5: #cce3fd; --heat-6: #f3f7fc;
  --halo: rgba(246, 247, 244, 0.85);
  --display: "Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif;
  --body: "Barlow", "Segoe UI", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #111417; --panel: #191d21; --ink: #eef1f3; --ink-2: #b4bcc4; --ink-3: #8a939c;
    --line: rgba(238, 241, 243, 0.45); --hair: rgba(238, 241, 243, 0.14);
    --accent: #ff4d5e; --accent-ink: #111417;
    --heat-0: #e3effd; --heat-1: #b6d5f8; --heat-2: #84b9f3; --heat-3: #519ced;
    --heat-4: #1f63b8; --heat-5: #1a3556; --heat-6: #1c2229;
    --halo: rgba(17, 20, 23, 0.85);
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #111417; --panel: #191d21; --ink: #eef1f3; --ink-2: #b4bcc4; --ink-3: #8a939c;
  --line: rgba(238, 241, 243, 0.45); --hair: rgba(238, 241, 243, 0.14);
  --accent: #ff4d5e; --accent-ink: #111417;
  --heat-0: #e3effd; --heat-1: #b6d5f8; --heat-2: #84b9f3; --heat-3: #519ced;
  --heat-4: #1f63b8; --heat-5: #1a3556; --heat-6: #1c2229;
  --halo: rgba(17, 20, 23, 0.85);
  color-scheme: dark;
}
html, body { background: var(--bg); color: var(--ink); }
body { margin: 0; font-family: var(--body); font-size: 15px; line-height: 1.45; }
.daa {
  max-width: 1180px; margin: 0 auto;
  padding-block: 20px 40px;
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));
  display: grid; gap: 20px;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "head" "controls" "board" "readout" "foot";
}
@media (min-width: 900px) {
  .daa {
    grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
    grid-template-areas: "head head" "controls board" "readout board" "foot foot";
    align-items: start; column-gap: 32px;
  }
}
.head { grid-area: head; display: grid; gap: 4px; }
.head h1 {
  font-family: var(--display); font-weight: 700; font-size: clamp(30px, 5vw, 44px);
  line-height: 1; margin: 0; letter-spacing: 0.01em; text-wrap: balance;
}
.head p { margin: 0; color: var(--ink-2); max-width: 62ch; }
.controls, .readout { display: grid; gap: 18px; min-width: 0; }
.controls { grid-area: controls; }
.readout { grid-area: readout; }
.board { grid-area: board; min-width: 0; display: grid; gap: 10px; }
.label {
  font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--ink-3); margin: 0 0 6px;
}
.require { display: flex; align-items: center; gap: 10px; }
.require .word { font-family: var(--display); font-size: 20px; color: var(--ink-2); }
.score {
  font-family: var(--display); font-weight: 700; font-size: 56px; line-height: 1;
  width: 3.2ch; padding: 2px 6px; border: 1px solid var(--hair); border-radius: 6px;
  background: var(--panel); color: var(--ink); font-variant-numeric: tabular-nums; text-align: center;
}
.step {
  width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--hair);
  background: var(--panel); color: var(--ink); font-size: 22px; line-height: 1; cursor: pointer;
}
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.chip {
  font: inherit; font-size: 13px; padding: 4px 10px; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--hair); background: transparent; color: var(--ink-2);
  font-variant-numeric: tabular-nums;
}
.chip[aria-pressed="true"] { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.seg { display: inline-flex; border: 1px solid var(--hair); border-radius: 8px; overflow: hidden; }
.seg button {
  font: inherit; font-family: var(--display); font-size: 22px; font-weight: 600;
  width: 52px; height: 40px; border: 0; background: var(--panel); color: var(--ink-2); cursor: pointer;
}
.seg button + button { border-left: 1px solid var(--hair); }
.seg button[aria-pressed="true"] { background: var(--ink); color: var(--bg); }
.row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.start { font: inherit; font-size: 18px; width: 5ch; padding: 6px 8px; border: 1px solid var(--hair);
  border-radius: 6px; background: var(--panel); color: var(--ink); font-variant-numeric: tabular-nums; }
.hint { font-size: 13px; color: var(--ink-3); margin: 4px 0 0; }
.warn { font-size: 13px; color: var(--accent); margin: 6px 0 0; }
.avg { display: flex; align-items: baseline; gap: 8px; }
.avg b { font-family: var(--display); font-size: 34px; line-height: 1; font-variant-numeric: tabular-nums; }
.avg span { color: var(--ink-2); }
input[type="range"] { width: 100%; accent-color: var(--accent); }
.ticks { display: flex; justify-content: space-between; font-size: 12px; color: var(--ink-3); font-variant-numeric: tabular-nums; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.card { background: var(--panel); border: 1px solid var(--hair); border-radius: 10px; padding: 16px; display: grid; gap: 10px; }
.card h2 { margin: 0; font-family: var(--display); font-size: 26px; font-weight: 700; line-height: 1.05; }
.big { font-family: var(--display); font-size: 40px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
.stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.stat { display: grid; gap: 2px; }
.stat dt { font-size: 12px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.06em; }
.stat dd { margin: 0; font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
.alts { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.alts li { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; border-bottom: 1px solid var(--hair); font-variant-numeric: tabular-nums; }
.alts li:last-child { border-bottom: 0; }
.alts span:last-child { color: var(--ink-2); }
.mine { border-color: var(--ink-3); }
.linkish { font: inherit; font-size: 13px; color: var(--ink-2); background: none; border: 0; padding: 0; text-decoration: underline; cursor: pointer; justify-self: start; }
.svgwrap { position: relative; width: 100%; max-width: 720px; justify-self: center; aspect-ratio: 1 / 1; }
.svgwrap svg { width: 100%; height: 100%; display: block; touch-action: manipulation; cursor: crosshair; }
.loading { position: absolute; inset: 0; display: grid; place-items: center; color: var(--ink-2);
  background: var(--halo); border-radius: 50%; font-family: var(--display); font-size: 20px; }
.key { display: grid; gap: 4px; max-width: 520px; width: 100%; justify-self: center; }
.key .bar { height: 10px; border-radius: 5px; }
.key .ticks span { flex: 1; text-align: center; }
.key .ticks span:first-child { text-align: left; }
.key .ticks span:last-child { text-align: right; }
.key .cap { font-size: 12px; color: var(--ink-3); text-align: center; }
.foot { grid-area: foot; color: var(--ink-2); font-size: 13px; max-width: 75ch; display: grid; gap: 6px; border-top: 1px solid var(--hair); padding-top: 14px; }
.foot p { margin: 0; }
.foot a { color: inherit; }
.tabs { display: flex; gap: 4px; margin-top: 10px; border-bottom: 1px solid var(--hair); }
.tabs button { font: inherit; font-family: var(--display); font-size: 20px; font-weight: 600; padding: 6px 12px;
  border: 0; border-bottom: 3px solid transparent; background: none; color: var(--ink-3); cursor: pointer; margin-bottom: -1px; }
.tabs button[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--accent); }
.seg-words button { font-size: 17px; width: auto; padding: 0 12px; }
.seg-words { flex-wrap: wrap; }
.chart { grid-area: board; min-width: 0; display: grid; gap: 10px; align-content: start; }
@media (min-width: 900px) { .chart { grid-row: 2 / span 2; } }
.chart-head { display: flex; justify-content: space-between; align-items: end; gap: 12px; }
.chart h2 { margin: 0; font-family: var(--display); font-size: 30px; line-height: 1; }
.chart-sub { margin: 4px 0 0; color: var(--ink-2); }
.printbtn { font: inherit; font-weight: 600; padding: 8px 16px; border-radius: 8px; border: 1px solid var(--ink);
  background: var(--ink); color: var(--bg); cursor: pointer; }
.chart-list { list-style: none; margin: 0; padding: 0; columns: 3 230px; column-gap: 24px; }
.chart-list li { break-inside: avoid; }
.crow { width: 100%; display: grid; grid-template-columns: 3ch minmax(0, 1fr) 4ch; gap: 10px; align-items: baseline;
  font: inherit; text-align: left; padding: 3px 4px; border: 0; border-bottom: 1px solid var(--hair);
  background: none; color: var(--ink); cursor: pointer; font-variant-numeric: tabular-nums; }
.crow:hover { background: var(--panel); }
.cs { font-family: var(--display); font-weight: 700; font-size: 18px; text-align: right; }
.cr { display: flex; flex-wrap: wrap; gap: 6px; font-weight: 600; }
.setup { font-weight: 400; color: var(--ink-3); font-size: 13px; }
.cp { text-align: right; color: var(--ink-2); font-size: 13px; }
@media print {
  html:root:not(.print-x):not(.print-y) {
    --bg: #ffffff; --panel: #ffffff; --ink: #000000; --ink-2: #333333; --ink-3: #555555;
    --hair: #cccccc; --accent: #c8102e; color-scheme: light;
  }
  .head p, .tabs, .controls, .foot, .noprint, .chart > .hint { display: none !important; }
  .daa { display: block; padding: 0; max-width: none; }
  .chart-list { columns: 3; font-size: 9pt; }
  .crow { padding: 1px 2px; }
  .cs { font-size: 11pt; }
}
@media (prefers-reduced-motion: no-preference) { .chip, .seg button { transition: background 120ms, color 120ms; } }
`;

// ----------------------------------------------------------------- helpers

const pct = (p) => (p < 0.005 && p > 0 ? "<1%" : `${Math.round(p * 100)}%`);
const visits = (v) => v.toFixed(2);

function prettyName(raw) {
  if (raw === "BULL") return "Bullseye";
  if (raw === "25") return "Outer bull";
  if (raw === "off the board") return "Off the board";
  if (/^\d+$/.test(raw)) return `Single ${raw}`;
  if (raw.startsWith("outside ")) return `Just outside ${raw.slice(8)}`;
  return raw;
}

function shortName(raw) {
  const name = raw.startsWith("outside ") ? raw.slice(8) : raw;
  if (name === "BULL") return "Bull";
  return name;
}

function nearestLevel(levels, average) {
  let k = 0;
  levels.forEach((l, i) => {
    if (Math.abs(l.average - average) < Math.abs(levels[k].average - average)) k = i;
  });
  return k;
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function readRamp() {
  return STOPS.map((_, k) => hexToRgb(cssVar(`--heat-${k}`) || "#888888"));
}

/** Position on the key (0..1) of a loss in visits: stops are equally spaced. */
function keyPosition(loss) {
  if (loss <= 0) return 0;
  if (loss >= STOPS[STOPS.length - 1]) return 1;
  for (let k = 1; k < STOPS.length; k++) {
    if (loss <= STOPS[k]) {
      const f = (loss - STOPS[k - 1]) / (STOPS[k] - STOPS[k - 1]);
      return (k - 1 + f) / (STOPS.length - 1);
    }
  }
  return 1;
}

function rampColour(ramp, t) {
  const x = t * (ramp.length - 1);
  const k = Math.min(ramp.length - 2, Math.floor(x));
  const f = x - k;
  return ramp[k].map((c, i) => Math.round(c + (ramp[k + 1][i] - c) * f));
}

function useColourScheme() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const bump = () => setTick((t) => t + 1);
    mq.addEventListener?.("change", bump);
    const obs = new MutationObserver(bump);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq.removeEventListener?.("change", bump);
      obs.disconnect();
    };
  }, []);
  return tick;
}

// ------------------------------------------------------------------ board

const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const R = { bull: 6.35, outer: 15.9, t0: 99, t1: 107, d0: 162, d1: 170, num: 181 };

function BoardLines() {
  const spokes = [];
  for (let k = 0; k < 20; k++) {
    const a = ((90 - 18 * k - 9) * Math.PI) / 180;
    spokes.push(
      <line key={k} x1={R.outer * Math.cos(a)} y1={-R.outer * Math.sin(a)}
        x2={R.d1 * Math.cos(a)} y2={-R.d1 * Math.sin(a)} />
    );
  }
  return (
    <g fill="none" stroke="var(--line)" strokeWidth="0.7" pointerEvents="none">
      {[R.bull, R.outer, R.t0, R.t1, R.d0, R.d1].map((r) => <circle key={r} r={r} />)}
      {spokes}
    </g>
  );
}

function BoardNumbers() {
  return (
    <g pointerEvents="none" fontFamily="var(--display)" fontWeight="600" fontSize="13"
      textAnchor="middle" dominantBaseline="central">
      {ORDER.map((n, k) => {
        const a = ((90 - 18 * k) * Math.PI) / 180;
        const x = R.num * Math.cos(a);
        const y = -R.num * Math.sin(a);
        return (
          <text key={n} x={x} y={y} fill="var(--ink-2)" stroke="var(--halo)" strokeWidth="3" paintOrder="stroke">{n}</text>
        );
      })}
    </g>
  );
}

function Marker({ x, y, kind }) {
  if (kind === "best") {
    return (
      <g transform={`translate(${x} ${-y})`} pointerEvents="none">
        <circle r="7" fill="none" stroke="var(--halo)" strokeWidth="4" />
        <circle r="7" fill="none" stroke="var(--accent)" strokeWidth="2.2" />
        <circle r="1.6" fill="var(--accent)" />
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${-y})`} pointerEvents="none">
      <circle r="5" fill="none" stroke="var(--halo)" strokeWidth="3.5" />
      <circle r="5" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeDasharray="2.2 1.6" />
    </g>
  );
}

// ------------------------------------------------------------------- app

export function App() {
  const [man, setMan] = useState(null);
  const [pts, setPts] = useState(null);
  const [error, setError] = useState(null);
  const [modelId, setModelId] = useState(null);
  const [levelIdx, setLevelIdx] = useState(null);
  const [levels, setLevels] = useState({}); // "shape/index" -> parsed level
  const [view, setView] = useState("board");
  const [score, setScore] = useState(START_SCORE);
  const [scoreText, setScoreText] = useState(String(START_SCORE));
  const [dart, setDart] = useState(1);
  const [start, setStart] = useState(START_SCORE);
  const [startText, setStartText] = useState(String(START_SCORE));
  const [hover, setHover] = useState(null); // point index under the pointer
  const [pinned, setPinned] = useState(null); // point index tapped
  const scheme = useColourScheme();
  const svgRef = useRef(null);

  // manifest + aiming grid
  useEffect(() => {
    Promise.all([fetch(DATA + "levels.json"), fetch(DATA + "points.json")])
      .then(async ([a, b]) => {
        if (!a.ok || !b.ok) throw new Error("The board data did not load.");
        const m = await a.json();
        const p = await b.json();
        setMan(m);
        setPts(p);
        const first = m.models.find((x) => x.id === m.default_model) || m.models[0];
        setModelId(first.id);
        setLevelIdx(nearestLevel(first.levels, START_LEVEL_AVERAGE));
      })
      .catch((e) => setError(e.message || String(e)));
  }, []);

  const model = man && modelId ? man.models.find((x) => x.id === modelId) : null;
  const mLevels = model ? model.levels : [];
  const keyOf = (k) => `${modelId}/${k}`;

  const fetchLevel = useCallback(
    (k) => {
      const key = `${modelId}/${k}`;
      if (!man || !model || k == null || !mLevels[k] || levels[key] || levels[`pending-${key}`]) return;
      setLevels((L) => ({ ...L, [`pending-${key}`]: true }));
      const file = mLevels[k].file;
      fetch(DATA + file)
        .then((r) => {
          if (!r.ok) throw new Error("A board level did not load.");
          // Hosts that cannot serve binary files get the same bytes as base64 text.
          if (file.endsWith(".b64.txt")) {
            return r.text().then((t) => Uint8Array.from(atob(t.trim()), (c) => c.charCodeAt(0)).buffer);
          }
          return r.arrayBuffer();
        })
        .then((buf) => setLevels((L) => ({ ...L, [key]: makeLevel(buf, man) })))
        .catch((e) => setError(e.message || String(e)));
    },
    [man, model, mLevels, modelId, levels]
  );

  useEffect(() => {
    if (levelIdx == null) return;
    fetchLevel(levelIdx);
  }, [levelIdx, fetchLevel]);

  // warm the neighbouring levels so dragging the slider feels immediate
  useEffect(() => {
    if (levelIdx == null || !levels[keyOf(levelIdx)] || !man) return;
    const t = setTimeout(() => {
      [levelIdx - 1, levelIdx + 1].forEach((k) => k >= 0 && k < mLevels.length && fetchLevel(k));
    }, 300);
    return () => clearTimeout(t);
  }, [levelIdx, levels, man, fetchLevel, mLevels]);

  const L = levelIdx != null ? levels[keyOf(levelIdx)] : null;

  const switchModel = (id) => {
    const next = man.models.find((x) => x.id === id);
    const avg = mLevels[levelIdx] ? mLevels[levelIdx].average : START_LEVEL_AVERAGE;
    setModelId(id);
    setLevelIdx(nearestLevel(next.levels, avg));
    setPinned(null);
  };

  // the checkout chart: built only when it is on screen
  const chart = useMemo(() => {
    if (!L || view !== "chart" || !pts) return null;
    const rows = [];
    for (let u = 170; u >= 2; u--) {
      rows.push({ score: u, ...checkoutRoute(L, u, pts), chance: checkoutChance(L, u) });
    }
    return rows;
  }, [L, view, pts]);

  // grid lookup for the heat image and the pointer
  const grid = useMemo(() => {
    if (!pts) return null;
    const st = pts.stride_mm;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < pts.x.length; i++) {
      minX = Math.min(minX, pts.x[i]); maxX = Math.max(maxX, pts.x[i]);
      minY = Math.min(minY, pts.y[i]); maxY = Math.max(maxY, pts.y[i]);
    }
    const W = Math.round((maxX - minX) / st) + 1;
    const H = Math.round((maxY - minY) / st) + 1;
    const cell = new Int32Array(W * H).fill(-1);
    const ix = new Int32Array(pts.x.length);
    const iy = new Int32Array(pts.x.length);
    for (let i = 0; i < pts.x.length; i++) {
      ix[i] = Math.round((pts.x[i] - minX) / st);
      iy[i] = Math.round((maxY - pts.y[i]) / st);
      cell[iy[i] * W + ix[i]] = i;
    }
    return { st, minX, maxY, W, H, cell, ix, iy };
  }, [pts]);

  const legal = man ? isLegalState(man, score, dart, dart === 1 ? score : start) : false;
  const s = dart === 1 ? score : start;

  const result = useMemo(() => {
    if (!L || !legal) return null;
    const q = aimValues(L, score, dart, s);
    let best = 0;
    for (let i = 1; i < q.length; i++) if (q[i] < q[best]) best = i;
    // best aim within each named target
    const byName = new Map();
    for (let i = 0; i < q.length; i++) {
      const nm = pts.name[i];
      if (!byName.has(nm) || q[i] < q[byName.get(nm)]) byName.set(nm, i);
    }
    const alts = [...byName.entries()]
      .filter(([nm]) => nm !== pts.name[best])
      .map(([nm, i]) => ({ name: prettyName(pts.names[nm]), i, loss: q[i] - q[best] }))
      .sort((a, b) => a.loss - b.loss)
      .slice(0, 5);
    return { q, best, alts };
  }, [L, legal, score, dart, s, pts]);

  // heat image
  const heatUrl = useMemo(() => {
    if (!result || !grid) return null;
    const ramp = readRamp();
    const { W, H, ix, iy } = grid;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d");
    const img = ctx.createImageData(W, H);
    const qb = result.q[result.best];
    for (let i = 0; i < result.q.length; i++) {
      const [r, g, b] = rampColour(ramp, keyPosition(result.q[i] - qb));
      const o = (iy[i] * W + ix[i]) * 4;
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL();
    // scheme: recolour when the theme changes
  }, [result, grid, scheme]);

  const keyGradient = useMemo(() => {
    if (typeof document === "undefined") return "";
    const ramp = readRamp();
    return `linear-gradient(to right, ${ramp.map((c, k) => `rgb(${c.join(",")}) ${(100 * k) / (ramp.length - 1)}%`).join(", ")})`;
  }, [scheme, man]);

  // pointer -> nearest aiming point
  const pointAt = (evt) => {
    if (!grid || !svgRef.current) return null;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const gx = Math.round((p.x - grid.minX) / grid.st);
    const gy = Math.round((p.y - -grid.maxY) / grid.st);
    if (gx < 0 || gy < 0 || gx >= grid.W || gy >= grid.H) return null;
    const i = grid.cell[gy * grid.W + gx];
    return i >= 0 ? i : null;
  };

  // controls
  const setScoreBoth = (v) => {
    const n = Math.max(2, Math.min(501, Math.round(v)));
    setScore(n);
    setScoreText(String(n));
    setPinned(null);
    // keep the visit start sensible
    if (dart === 1 || start < n) {
      setStart(n);
      setStartText(String(n));
    }
  };
  const setDartBoth = (d) => {
    setDart(d);
    setPinned(null);
    if (d === 1) {
      setStart(score);
      setStartText(String(score));
    }
  };

  const showStart = man && startMatters(man, score, dart);
  // when the visit start does not matter, any legal start gives the same advice
  useEffect(() => {
    if (!man || dart === 1 || showStart) return;
    if (!isLegalState(man, score, dart, start)) {
      setStart(score);
      setStartText(String(score));
    }
  }, [man, score, dart, showStart, start]);

  const focus = pinned ?? hover;
  const lvl = mLevels[levelIdx] || null;
  const canPrint = typeof window !== "undefined" && window.self === window.top;

  if (error) {
    return (
      <main className="daa"><style>{CSS}</style>
        <header className="head"><h1>Darts Aim Advisor</h1><p>{error} Reload the page to try again.</p></header>
      </main>
    );
  }

  const bestOut = result && L ? dartOutcome(L, result.best, score) : null;
  const focusOut = result && L && focus != null ? dartOutcome(L, focus, score) : null;
  const here = result && L ? visitsToFinish(L, score, dart, s) : null;

  return (
    <main className="daa">
      <style>{CSS}</style>
      <header className="head">
        <h1>Darts Aim Advisor</h1>
        <p>
          Where should you aim from here? Set your three-dart average and the score you require. The board shows
          what each spot costs you in visits to finish, solved exactly for a player of your standard.
        </p>
        <div className="tabs" role="tablist" aria-label="View">
          <button type="button" role="tab" aria-selected={view === "board"} onClick={() => setView("board")}>Board</button>
          <button type="button" role="tab" aria-selected={view === "chart"} onClick={() => setView("chart")}>Checkout chart</button>
        </div>
      </header>

      <section className="controls" aria-label="Your situation">
        <div>
          <p className="label" id="avg-label">Your three-dart average</p>
          {lvl ? (
            <>
              <div className="avg"><b>{Math.round(lvl.average)}</b><span>{lvl.band}</span></div>
              <input id="avg" type="range" min="0" max={mLevels.length - 1} step="1" value={levelIdx}
                aria-labelledby="avg-label" aria-valuetext={`${Math.round(lvl.average)} average, ${lvl.band}`}
                onChange={(e) => { setLevelIdx(Number(e.target.value)); setPinned(null); }} />
              <div className="ticks">
                <span>{Math.round(mLevels[0].average)}</span>
                <span>{Math.round(mLevels[mLevels.length - 1].average)}</span>
              </div>
            </>
          ) : <p className="hint">Loading…</p>}
        </div>

        {model && (
          <div>
            <p className="label" id="shape-label">Throw shape</p>
            <div className="seg seg-words" role="group" aria-labelledby="shape-label">
              {man.models.map((x) => (
                <button key={x.id} type="button" aria-pressed={x.id === modelId}
                  onClick={() => switchModel(x.id)}>{x.name}</button>
              ))}
            </div>
            <p className="hint">{model.blurb}</p>
          </div>
        )}

        {view === "board" && <>
        <div>
          <p className="label" id="score-label">Score left</p>
          <div className="require">
            <span className="word">You require</span>
            <button type="button" className="step" aria-label="One less" onClick={() => setScoreBoth(score - 1)}>−</button>
            <input id="score" className="score" inputMode="numeric" aria-labelledby="score-label"
              value={scoreText}
              onChange={(e) => {
                setScoreText(e.target.value);
                const n = parseInt(e.target.value, 10);
                if (n >= 2 && n <= 501) setScoreBoth(n);
              }}
              onBlur={() => setScoreText(String(score))} />
            <button type="button" className="step" aria-label="One more" onClick={() => setScoreBoth(score + 1)}>+</button>
          </div>
          <div className="chips" role="group" aria-label="Common scores">
            {PRESETS.map((p) => (
              <button key={p} type="button" className="chip" aria-pressed={score === p}
                onClick={() => setScoreBoth(p)}>{p === 2 ? "2 · the madhouse" : p}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="label" id="dart-label">Dart in hand</p>
          <div className="seg" role="group" aria-labelledby="dart-label">
            {[1, 2, 3].map((d) => (
              <button key={d} type="button" aria-pressed={dart === d} onClick={() => setDartBoth(d)}>{d}</button>
            ))}
          </div>
          {dart > 1 && (
            showStart ? (
              <div style={{ marginTop: 12 }}>
                <label className="label" htmlFor="start" style={{ display: "block" }}>This visit started on</label>
                <div className="row">
                  <input id="start" className="start" inputMode="numeric" value={startText}
                    onChange={(e) => {
                      setStartText(e.target.value);
                      const n = parseInt(e.target.value, 10);
                      if (n >= 2 && n <= 501) { setStart(n); setPinned(null); }
                    }}
                    onBlur={() => setStartText(String(start))} />
                  <span className="hint" style={{ margin: 0 }}>A bust sends you back here.</span>
                </div>
                {!legal && (
                  <p className="warn">
                    {dart === 2 ? "One dart" : "Two darts"} can't take you from {start} to {score}. Change either score.
                  </p>
                )}
              </div>
            ) : (
              <p className="hint">From {score}, {dart === 2 ? "this dart" : "your last dart"} can't bust, so where the visit started doesn't change the advice.</p>
            )
          )}
        </div>
        </>}
      </section>

      {view === "chart" && (
        <section className="chart" aria-label="Checkout chart">
          <div className="chart-head">
            <div>
              <h2>Checkout chart</h2>
              {lvl && <p className="chart-sub">For a {Math.round(lvl.average)} average ({lvl.band}), {model.name.toLowerCase()} throw</p>}
            </div>
            {canPrint && <button type="button" className="printbtn noprint" onClick={() => window.print()}>Print</button>}
          </div>
          <p className="hint">
            <b>Route</b>: where to aim with each dart if it lands where you aim. <b>Finish</b>: your chance of checking
            out this visit, following the advice even after a miss. * means aim just outside the double, so a miss
            drops off the board instead of busting. Tap a score to see it on the board.
          </p>
          {!chart ? <p className="hint">Loading…</p> : (
            <ol className="chart-list">
              {chart.map((r) => (
                <li key={r.score}>
                  <button type="button" className="crow" onClick={() => { setScoreBoth(r.score); setDartBoth(1); setView("board"); }}>
                    <span className="cs">{r.score}</span>
                    <span className="cr">
                      {r.route.map((t, k) => <span key={k} className="tok">{shortName(t.raw)}{t.outside ? "*" : ""}</span>)}
                      {!r.finishes && <span className="setup">set up</span>}
                    </span>
                    <span className="cp">{r.chance > 0 ? pct(r.chance) : "–"}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {view === "board" && <>
      <section className="board" aria-label="Dartboard heat map">
        <div className="svgwrap">
          <svg ref={svgRef} viewBox="-200 -200 400 400" role="img"
            aria-label={result ? `Best aim: ${prettyName(pts.names[pts.name[result.best]])}` : "Dartboard"}
            onPointerMove={(e) => { if (e.pointerType === "mouse") setHover(pointAt(e)); }}
            onPointerLeave={() => setHover(null)}
            onPointerDown={(e) => { const i = pointAt(e); setPinned((p) => (i == null || p === i ? null : i)); }}>
            <circle r="187" fill="var(--panel)" stroke="var(--hair)" />
            {heatUrl && grid && (
              <image href={heatUrl} x={grid.minX - grid.st / 2} y={-grid.maxY - grid.st / 2}
                width={grid.W * grid.st} height={grid.H * grid.st} preserveAspectRatio="none"
                style={{ imageRendering: "auto" }} clipPath="url(#daa-clip)" />
            )}
            <defs><clipPath id="daa-clip"><circle r="186" /></clipPath></defs>
            <BoardLines />
            <BoardNumbers />
            {result && <Marker x={pts.x[result.best]} y={pts.y[result.best]} kind="best" />}
            {result && focus != null && focus !== result.best && <Marker x={pts.x[focus]} y={pts.y[focus]} kind="mine" />}
          </svg>
          {!L && <div className="loading">Loading the board…</div>}
        </div>
        <div className="key" aria-hidden="true">
          <div className="bar" style={{ background: keyGradient }} />
          <div className="ticks">{STOPS.map((v, k) => <span key={k}>{k === 0 ? "Best" : k === STOPS.length - 1 ? "1+" : v}</span>)}</div>
          <div className="cap">Visits worse than the best aim. Hover or tap the board to price any spot.</div>
        </div>
      </section>

      <section className="readout" aria-live="polite">
        {result && bestOut && (
          <div className="card">
            <p className="label" style={{ margin: 0 }}>Best aim</p>
            <h2>{prettyName(pts.names[pts.name[result.best]])}</h2>
            <dl className="stats">
              <div className="stat"><dt>Visits left</dt><dd>{visits(here)}</dd></div>
              <div className="stat"><dt>Check out now</dt><dd>{pct(bestOut.checkout)}</dd></div>
              <div className="stat"><dt>Bust</dt><dd>{pct(bestOut.bust)}</dd></div>
            </dl>
          </div>
        )}
        {result && focus != null && focus !== result.best && focusOut && (
          <div className="card mine">
            <p className="label" style={{ margin: 0 }}>{pinned != null ? "Your aim" : "Pointing at"}</p>
            <h2>{prettyName(pts.names[pts.name[focus]])}</h2>
            <dl className="stats">
              <div className="stat"><dt>Costs you</dt><dd>+{visits(result.q[focus] - result.q[result.best])}</dd></div>
              <div className="stat"><dt>Check out now</dt><dd>{pct(focusOut.checkout)}</dd></div>
              <div className="stat"><dt>Bust</dt><dd>{pct(focusOut.bust)}</dd></div>
            </dl>
            {pinned != null && <button type="button" className="linkish" onClick={() => setPinned(null)}>Clear</button>}
          </div>
        )}
        {result && (
          <div>
            <p className="label">Next best targets</p>
            <ul className="alts">
              {result.alts.map((a) => (
                <li key={a.name}><span>{a.name}</span><span>+{visits(a.loss)} visits</span></li>
              ))}
            </ul>
          </div>
        )}
      </section>
      </>}

      <footer className="foot">
        <p>
          Solved exactly as a Markov decision process over every score, dart and visit start, minimising the
          number of visits to finish. Each standard is a round, unbiased throw whose spread gives that
          three-dart average; real throws are a little more heavy-tailed, which mostly matters at the finish.
        </p>
        <p>
          The method is explained in <a href={BLOG_POST}>Count visits, not darts</a>.
        </p>
      </footer>
    </main>
  );
}

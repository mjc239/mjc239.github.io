// Darts Aim Advisor engine: the value of every aiming point for a state of a
// 501 leg, computed from tables exported by solver/export_tables.py.
// No React; runs in the browser and in plain Node (see test_engine.mjs).
//
// A state is (u, d, s): u is the score left, d the dart in hand (1-3), and s
// the score the visit started on (a bust goes back there). Values count
// visits, the unit a race between two players is run in.

const LAYOUT = ["P", "CO", "V1", "V2tab", "V3tab", "V2low", "V3low"];

/** Parse one level's .bin file into typed arrays, using the manifest's layout. */
export function parseLevel(buffer, man) {
  const n = man.n_points;
  const counts = {
    P: n * man.scores.length,
    CO: n * man.checkout_scores.length,
    V1: 502,
    V2tab: 502,
    V3tab: 502,
    V2low: man.V2low[0] * man.V2low[1],
    V3low: man.V3low[0] * man.V3low[1],
  };
  const out = {};
  let off = 0;
  for (const name of LAYOUT) {
    const isProb = name === "P" || name === "CO";
    const bytes = counts[name] * (isProb ? 2 : 4);
    // slice() copies into a fresh, aligned buffer: the float arrays do not
    // start on a 4-byte boundary in the file.
    const chunk = buffer.slice(off, off + bytes);
    out[name] = isProb ? new Uint16Array(chunk) : new Float32Array(chunk);
    off += bytes;
  }
  if (off !== buffer.byteLength) throw new Error("level file does not match levels.json");
  return out;
}

/** A level plus everything derived from the manifest that every query needs. */
export function makeLevel(buffer, man) {
  const t = parseLevel(buffer, man);
  const coCol = new Map(man.checkout_scores.map((c, k) => [c, k]));
  return { ...t, man, coCol, inv: 1 / man.scale };
}

/** Expected further visits from (u, d, s), not counting a visit already under way. */
export function value(L, u, d, s) {
  const m = L.man;
  if (u === 0) return 0;
  if (d === 1) return L.V1[u];
  if (d === 2) return u >= m.u2_indep ? L.V2tab[u] : L.V2low[s * m.V2low[1] + u];
  return u >= m.u3_indep ? L.V3tab[u] : L.V3low[s * m.V3low[1] + u];
}

/** Visits to finish, counting the visit in progress, under best play from (u, d, s). */
export function visitsToFinish(L, u, d, s) {
  return value(L, u, d, s) + (d > 1 ? 1 : 0);
}

/**
 * Visits to finish (counting the visit in progress) after aiming at each point
 * from (u, d, s) and playing perfectly afterwards. Float64Array, one per point.
 */
export function aimValues(L, u, d, s) {
  const m = L.man;
  const S = m.scores;
  const ns = S.length;
  const nc = m.checkout_scores.length;
  const n = m.n_points;
  // Continuation value for each score that leaves a legal remainder.
  const cols = [];
  const w = [];
  for (let j = 0; j < ns; j++) {
    if (S[j] > u - 2) break; // scores are sorted
    cols.push(j);
    w.push(d === 3 ? L.V1[u - S[j]] : value(L, u - S[j], d + 1, s));
  }
  for (const x of w) if (!Number.isFinite(x)) throw new Error(`no value for a state reached from ${u}/${d}/${s}`);
  const co = L.coCol.has(u) ? L.coCol.get(u) : -1;
  const back = L.V1[s];
  const base = d === 1 ? 1 : 0;
  const shown = d > 1 ? 1 : 0; // count the visit already under way
  const out = new Float64Array(n);
  const P = L.P;
  for (let i = 0; i < n; i++) {
    const row = i * ns;
    let acc = 0;
    let legal = 0;
    for (let k = 0; k < cols.length; k++) {
      const p = P[row + cols[k]] * L.inv;
      acc += p * w[k];
      legal += p;
    }
    const out_ = co >= 0 ? L.CO[i * nc + co] * L.inv : 0;
    out[i] = base + acc + (1 - legal - out_) * back + shown;
  }
  return out;
}

/** What one dart aimed at point i does from score u. */
export function dartOutcome(L, i, u) {
  const m = L.man;
  const S = m.scores;
  const ns = S.length;
  let legal = 0;
  let miss = 0;
  for (let j = 0; j < ns && S[j] <= u - 2; j++) {
    const p = L.P[i * ns + j] * L.inv;
    legal += p;
    if (S[j] === 0) miss = p;
  }
  const checkout = L.coCol.has(u) ? L.CO[i * m.checkout_scores.length + L.coCol.get(u)] * L.inv : 0;
  return { checkout, bust: Math.max(0, 1 - legal - checkout), miss };
}

/** Scores one dart can make, and two darts can make, for checking a visit start. */
function reachable(scores) {
  const one = new Set(scores);
  const two = new Set();
  for (const a of scores) for (const b of scores) two.add(a + b);
  return [one, two];
}

/**
 * Whether (u, d, s) can happen: u >= 2, and with darts already thrown the
 * visit must have started on a score those darts could have come down from.
 */
export function isLegalState(man, u, d, s) {
  if (!(u >= 2 && u <= man.game_start && s >= u && s <= man.game_start)) return false;
  if (d === 1) return s === u;
  const [one, two] = (man._reach ||= reachable(man.scores));
  return (d === 2 ? one : two).has(s - u);
}

/** Does the visit's starting score change the advice at this score and dart? */
export function startMatters(man, u, d) {
  if (d === 1) return false;
  return d === 2 ? u < man.u2_indep : u < man.u3_indep;
}

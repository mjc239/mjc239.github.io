// node test_engine.mjs — checks engine.js against solver/make_fixture.py's numbers.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  makeLevel, aimValues, dartOutcome, isLegalState, startMatters, visitsToFinish,
  policy, checkoutChance, checkoutRoute,
} from "./engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const data = join(here, "..", "..", "apps", "darts", "data");
const man = JSON.parse(readFileSync(join(data, "levels.json"), "utf8"));
const pts = JSON.parse(readFileSync(join(data, "points.json"), "utf8"));
const fixture = JSON.parse(readFileSync(join(here, "test_fixture.json"), "utf8"));
const models = Object.fromEntries(man.models.map((m) => [m.id, m]));

let failures = 0;
const check = (ok, msg) => {
  if (!ok) {
    failures++;
    console.error("FAIL", msg);
  }
};

const cache = new Map();
const level = (model, k) => {
  const key = `${model}/${k}`;
  if (!cache.has(key)) {
    const buf = readFileSync(join(data, models[model].levels[k].file));
    cache.set(key, makeLevel(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), man));
  }
  return cache.get(key);
};
const argmin = (q) => {
  let b = 0;
  for (let i = 1; i < q.length; i++) if (q[i] < q[b]) b = i;
  return b;
};

// 1. the value of every aiming point
let worst = 0;
for (const c of fixture.cases) {
  const L = level(c.model, c.level);
  const q = aimValues(L, c.u, c.d, c.s);
  // The engine also counts a visit already under way (darts 2 and 3); the fixture does not.
  const underWay = c.d > 1 ? 1 : 0;
  c.idx.forEach((i, k) => {
    worst = Math.max(worst, Math.abs(q[i] - underWay - c.q[k]));
  });
  const best = argmin(q);
  const tag = `${c.model}/${c.level} at ${c.u}/${c.d}/${c.s}`;
  check(best === c.best || Math.abs(q[best] - q[c.best]) < 1e-12, `best aim, ${tag}`);
  check(Math.abs(q[best] - visitsToFinish(L, c.u, c.d, c.s)) < 5e-3, `state value, ${tag}`);
  // the stored solver aim is (near) the best on the board the browser sees
  check(policy(L, c.u, c.d, c.s) === c.policy, `stored aim, ${tag}`);
  check(q[c.policy] - q[best] < 2e-3, `stored aim is ${q[c.policy] - q[best]} visits off, ${tag}`);
}
check(worst < 1e-9, `aim values differ from the fixture by ${worst}`);

// 2. checkout chances and routes
let worstChance = 0;
for (const c of fixture.chances) {
  worstChance = Math.max(worstChance, Math.abs(checkoutChance(level(c.model, c.level), c.start) - c.chance));
}
check(worstChance < 1e-9, `checkout chances differ by ${worstChance}`);
for (const r of fixture.routes) {
  const got = checkoutRoute(level(r.model, r.level), r.start, pts);
  const names = got.route.map((x) => x.raw);
  check(JSON.stringify(names) === JSON.stringify(r.route) && got.finishes === r.finishes,
    `route ${r.model}/${r.level} from ${r.start}: ${names} vs ${r.route}`);
}

// 3. sanity: the D1 story from the post, for a county player with a round throw
const round = models.round.levels;
const county = round.findIndex((l) => l.sigma === 10);
const L = level("round", county);
const o1 = dartOutcome(L, argmin(aimValues(L, 2, 1, 2)), 2);
const o3 = dartOutcome(L, argmin(aimValues(L, 2, 3, 2)), 2);
check(o1.bust < 0.25 && o1.checkout > 0.2, `county on 2, dart 1: ${JSON.stringify(o1)}`);
check(o3.checkout > o1.checkout, "the last dart on 2 goes for the double");
check(checkoutChance(L, 169) === 0 && checkoutChance(L, 170) > 0, "169 cannot be finished in a visit; 170 can");

check(isLegalState(man, 2, 3, 4) && !isLegalState(man, 2, 2, 65) && isLegalState(man, 2, 2, 62), "legal states");
check(!isLegalState(man, 100, 2, 123) && isLegalState(man, 100, 3, 123), "23 is two darts, not one");
check(startMatters(man, 40, 3) && !startMatters(man, 70, 3) && startMatters(man, 100, 2), "when the start matters");

console.log(failures ? `${failures} failure(s)`
  : `all good (aim values to ${worst.toExponential(1)}, checkout chances to ${worstChance.toExponential(1)})`);
process.exit(failures ? 1 : 0);

// node test_engine.mjs — checks engine.js against solver/make_fixture.py's numbers.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { makeLevel, aimValues, dartOutcome, isLegalState, startMatters, visitsToFinish } from "./engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const data = join(here, "..", "..", "apps", "darts", "data");
const man = JSON.parse(readFileSync(join(data, "levels.json"), "utf8"));
const fixture = JSON.parse(readFileSync(join(here, "test_fixture.json"), "utf8"));

let failures = 0;
const check = (ok, msg) => {
  if (!ok) {
    failures++;
    console.error("FAIL", msg);
  }
};

const levels = new Map();
const level = (k) => {
  if (!levels.has(k)) {
    const buf = readFileSync(join(data, man.levels[k].file));
    levels.set(k, makeLevel(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), man));
  }
  return levels.get(k);
};

let worst = 0;
for (const c of fixture.cases) {
  const L = level(c.level);
  const q = aimValues(L, c.u, c.d, c.s);
  // The engine also counts a visit already under way (darts 2 and 3); the fixture does not.
  const underWay = c.d > 1 ? 1 : 0;
  c.idx.forEach((i, k) => {
    worst = Math.max(worst, Math.abs(q[i] - underWay - c.q[k]));
  });
  let best = 0;
  for (let i = 1; i < q.length; i++) if (q[i] < q[best]) best = i;
  check(best === c.best || Math.abs(q[best] - q[c.best]) < 1e-12, `best aim at ${c.u}/${c.d}/${c.s}`);
  // the best aim's value is the state's value
  check(Math.abs(q[best] - visitsToFinish(L, c.u, c.d, c.s)) < 5e-3,
    `value of ${c.u}/${c.d}/${c.s}: ${q[best]} vs ${visitsToFinish(L, c.u, c.d, c.s)}`);
}
check(worst < 1e-9, `aim values differ from the fixture by ${worst}`);

// outcomes add up, and the D1 story from the post holds for a county player
const county = man.levels.findIndex((l) => l.sigma === 10);
const L = level(county);
const q2 = aimValues(L, 2, 1, 2);
let b = 0;
for (let i = 1; i < q2.length; i++) if (q2[i] < q2[b]) b = i;
const o = dartOutcome(L, b, 2);
check(o.bust < 0.25 && o.checkout > 0.2, `county on 2, dart 1: ${JSON.stringify(o)}`);
const q3 = aimValues(L, 2, 3, 2);
let b3 = 0;
for (let i = 1; i < q3.length; i++) if (q3[i] < q3[b3]) b3 = i;
check(dartOutcome(L, b3, 2).checkout > o.checkout, "the last dart on 2 goes for the double");

check(isLegalState(man, 2, 3, 4) && !isLegalState(man, 2, 2, 65) && isLegalState(man, 2, 2, 62), "legal states");
check(!isLegalState(man, 100, 2, 100 + 23) && isLegalState(man, 100, 3, 123), "23 is two darts, not one");
check(startMatters(man, 40, 3) && !startMatters(man, 70, 3) && startMatters(man, 100, 2), "when the start matters");

console.log(failures ? `${failures} failure(s)` : `all good (largest difference ${worst.toExponential(1)})`);
process.exit(failures ? 1 : 0);

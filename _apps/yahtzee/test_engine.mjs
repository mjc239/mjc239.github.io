// Sanity + integration tests for the Yahtzee engine.
// Run:  node test_engine.mjs   (from _apps/yahtzee, after values.bin exists)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildEngine, CATEGORY_SHORT, YAHTZEE, CHANCE } from "./engine.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.join(here, "..", "..", "apps", "yahtzee", "values.bin");
const buf = fs.readFileSync(binPath);
const values = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
const engine = buildEngine(values);

let pass = 0, fail = 0;
const approx = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}  ${extra}`); }
}

console.log("== basic ==");
check("table length 1,048,576", values.length === 1 << 20, `got ${values.length}`);
check("V(initial) ~ 254.5877", approx(engine.initialV, 254.5877, 0.01), `got ${engine.initialV}`);
check("252 dice states", engine.NUM_DICE === 252);

console.log("== recommend on opening roll ==");
// fresh game, first roll 1-2-3-4-6 (a small-straight draw): should reroll, not score
{
  const r = engine.recommend(0, 0, false, [1, 2, 3, 4, 6], 1);
  check("opening: mustScore false", r.mustScore === false);
  check("opening: recommends reroll", r.recommendation.action === "reroll",
    JSON.stringify(r.recommendation));
  check("stateEV positive & < initialV+something", r.stateEV > 0);
  console.log(`     -> keep ${r.recommendation.keepFaces || "?"}, ev ${r.stateEV.toFixed(2)}`);
}

console.log("== third roll must score ==");
{
  const r = engine.recommend(0, 0, false, [6, 6, 6, 6, 6], 3);
  check("yahtzee on roll3: mustScore", r.mustScore === true);
  check("recommends scoring Yahtzee (50)", r.recommendation.action === "score" && r.recommendation.cat === YAHTZEE,
    JSON.stringify(r.recommendation));
  const yopt = r.scoreOptions.find((o) => o.cat === YAHTZEE);
  check("yahtzee option worth 50 pts", yopt && yopt.points === 50);
}

console.log("== joker rule ==");
{
  // Yahtzee box already filled (bit 12). Upper 'Sixes' still open. Roll five 6s.
  // Forced Joker tier 1: must go to matching upper (Sixes = category 5).
  const mask = (1 << YAHTZEE);
  const r = engine.recommend(mask, 0, true, [6, 6, 6, 6, 6], 3);
  const legalCats = r.scoreOptions.map((o) => o.cat);
  check("joker tier1: only Sixes legal", legalCats.length === 1 && legalCats[0] === 5,
    `legal=${legalCats.map((c) => CATEGORY_SHORT[c])}`);
  check("joker fill gives +100 (eligible)", r.scoreOptions[0].yahtzeeBonus === 100,
    JSON.stringify(r.scoreOptions[0]));
}
{
  // Yahtzee + Sixes filled, lower boxes open -> tier 2: any open lower, full joker values.
  const mask = (1 << YAHTZEE) | (1 << 5);
  const r = engine.recommend(mask, 0, true, [6, 6, 6, 6, 6], 3);
  const fh = r.scoreOptions.find((o) => o.cat === 8);       // Full House
  check("joker tier2: Full House scores 25", fh && fh.points === 25, JSON.stringify(fh));
  const ls = r.scoreOptions.find((o) => o.cat === 10);      // Large Straight
  check("joker tier2: Large Straight scores 40", ls && ls.points === 40, JSON.stringify(ls));
}

console.log("== full greedy playthrough (follow recommendations) ==");
{
  // deterministic pseudo-random dice
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const rollDie = () => 1 + Math.floor(rnd() * 6);

  let mask = 0, upper = 0, elig = false, banked = 0, turns = 0;
  const ALL = (1 << 13) - 1;
  while (mask !== ALL && turns < 13) {
    let dice = Array.from({ length: 5 }, rollDie);
    let roll = 1, r = engine.recommend(mask, upper, elig, dice, roll);
    // follow reroll advice up to roll 3
    while (r.recommendation.action === "reroll" && roll < 3) {
      // keep the recommended dice, reroll the rest (simulate)
      const keep = r.recommendation.keep.slice();
      const kept = [];
      for (let f = 0; f < 6; f++) for (let k = 0; k < keep[f]; k++) kept.push(f + 1);
      dice = kept.concat(Array.from({ length: 5 - kept.length }, rollDie));
      roll++;
      r = engine.recommend(mask, upper, elig, dice, roll);
    }
    // score the recommended box
    const cat = r.recommendation.cat;
    const opt = r.scoreOptions.find((o) => o.cat === cat);
    banked += opt.reward;
    mask = opt.newMask; upper = opt.newUpper; elig = opt.newElig;
    turns++;
  }
  check("playthrough fills all 13 boxes", mask === ALL, `mask=${mask.toString(2)}`);
  check("playthrough banked a plausible score (150-380)", banked >= 150 && banked <= 380, `banked=${banked}`);
  console.log(`     -> final score ${banked}, ${turns} turns`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

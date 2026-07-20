// Yahtzee optimal-play engine (frontend).
//
// Loads the precomputed state value function V(mask, upper, eligible) and turns
// it into per-turn recommendations by a single-turn lookahead (three roll
// stages over the 252 dice states). Full official rules: upper bonus (+35 at
// 63), extra-Yahtzee bonus (+100), and the forced Joker rule.
//
// The V table is a dense Float32Array indexed as:  mask*128 + upper*2 + elig.

export const NC = 13;
export const ONES = 0, SIXES = 5;
export const THREE_KIND = 6, FOUR_KIND = 7, FULL_HOUSE = 8,
  SM_STRAIGHT = 9, LG_STRAIGHT = 10, CHANCE = 11, YAHTZEE = 12;

export const CATEGORY_NAMES = [
  "Ones", "Twos", "Threes", "Fours", "Fives", "Sixes",
  "Three of a Kind", "Four of a Kind", "Full House",
  "Small Straight", "Large Straight", "Chance", "Yahtzee",
];
export const CATEGORY_SHORT = [
  "1s", "2s", "3s", "4s", "5s", "6s",
  "3-kind", "4-kind", "Full House", "Sm Straight", "Lg Straight", "Chance", "Yahtzee",
];

const UPPER_BONUS = 35, UPPER_THRESHOLD = 63, YAHTZEE_POINTS = 50,
  EXTRA_YAHTZEE_BONUS = 100, FULL_HOUSE_POINTS = 25,
  SM_STRAIGHT_POINTS = 30, LG_STRAIGHT_POINTS = 40;

// ---- combinatorics --------------------------------------------------------
function countVectors(n) {
  const out = [];
  const rec = (prefix, remaining, slots) => {
    if (slots === 1) { out.push([...prefix, remaining]); return; }
    for (let k = 0; k <= remaining; k++) rec([...prefix, k], remaining - k, slots - 1);
  };
  rec([], n, 6);
  return out;
}
function factorial(n) { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; }
function multinomial(counts) {
  const n = counts.reduce((a, b) => a + b, 0);
  let d = 1; for (const c of counts) d *= factorial(c);
  return factorial(n) / d;
}
const keyOf = (v) => v.join(",");

// ---- scoring --------------------------------------------------------------
function totalPips(c) { let s = 0; for (let i = 0; i < 6; i++) s += (i + 1) * c[i]; return s; }
function maxCount(c) { return Math.max(...c); }
function hasRun(c, k) {
  let run = 0;
  for (let i = 0; i < 6; i++) { run = c[i] > 0 ? run + 1 : 0; if (run >= k) return true; }
  return false;
}
function scoreCat(c, cat) {
  if (cat <= SIXES) return (cat + 1) * c[cat];
  if (cat === THREE_KIND) return maxCount(c) >= 3 ? totalPips(c) : 0;
  if (cat === FOUR_KIND) return maxCount(c) >= 4 ? totalPips(c) : 0;
  if (cat === FULL_HOUSE) {
    const s = [...c].sort((a, b) => a - b);
    return ((s[5] === 3 && s[4] === 2) || maxCount(c) === 5) ? FULL_HOUSE_POINTS : 0;
  }
  if (cat === SM_STRAIGHT) return hasRun(c, 4) ? SM_STRAIGHT_POINTS : 0;
  if (cat === LG_STRAIGHT) return hasRun(c, 5) ? LG_STRAIGHT_POINTS : 0;
  if (cat === CHANCE) return totalPips(c);
  if (cat === YAHTZEE) return maxCount(c) === 5 ? YAHTZEE_POINTS : 0;
  return 0;
}

// ---- engine ---------------------------------------------------------------
export function buildEngine(values) {
  const ALL_DICE = countVectors(5);               // 252 count vectors
  const NUM_DICE = ALL_DICE.length;
  const DICE_IDX = new Map(ALL_DICE.map((v, i) => [keyOf(v), i]));
  const DICE_FREQS = ALL_DICE.map(multinomial);   // out of 7776

  // score rows
  const SCORE = ALL_DICE.map((c) => Array.from({ length: NC }, (_, cat) => scoreCat(c, cat)));
  const JSCORE = SCORE.map((row) => {
    const r = row.slice();
    r[SM_STRAIGHT] = SM_STRAIGHT_POINTS;
    r[LG_STRAIGHT] = LG_STRAIGHT_POINTS;
    return r;
  });
  const IS_YAH = ALL_DICE.map((c) => maxCount(c) === 5);
  const YFACE = ALL_DICE.map((c) => (maxCount(c) === 5 ? c.indexOf(5) : -1));

  // reroll outcomes: for each dice index, a list of { keep(count vec), outcomes:[{d,num}] }.
  const rerollCache = {}; for (let n = 0; n <= 5; n++) rerollCache[n] = countVectors(n);
  const KEEPS = ALL_DICE.map((c) => {
    const keeps = [];
    const ranges = c.map((n) => n + 1);
    const idxv = [0, 0, 0, 0, 0, 0];
    while (true) {
      const keep = idxv.slice();
      const kept = keep.reduce((a, b) => a + b, 0);
      const n = 5 - kept;
      const mult = Math.pow(6, kept);
      const outcomes = [];
      for (const rv of rerollCache[n]) {
        const final = keep.map((x, i) => x + rv[i]);
        outcomes.push({ d: DICE_IDX.get(keyOf(final)), num: multinomial(rv) * mult });
      }
      keeps.push({ keep, kept, outcomes });
      // increment mixed-radix idxv over ranges
      let p = 5;
      while (p >= 0) { idxv[p]++; if (idxv[p] < ranges[p]) break; idxv[p] = 0; p--; }
      if (p < 0) break;
    }
    return keeps;
  });

  const V = (mask, upper, elig) => values[mask * 128 + upper * 2 + (elig ? 1 : 0)];
  const isUpperCat = (cat) => cat <= SIXES;

  // Legal categories + base score row + joker flag for one dice index in a mask.
  function legalFor(mask, d) {
    const yfilled = (mask & (1 << YAHTZEE)) !== 0;
    if (IS_YAH[d] && yfilled) {
      const f = YFACE[d];
      let cats;
      if ((mask & (1 << f)) === 0) cats = [f];
      else {
        const openLo = [];
        for (let c = THREE_KIND; c < NC; c++) if ((mask & (1 << c)) === 0) openLo.push(c);
        if (openLo.length) cats = openLo;
        else { cats = []; for (let c = ONES; c <= SIXES; c++) if ((mask & (1 << c)) === 0) cats.push(c); }
      }
      return { cats, base: JSCORE[d], joker: true };
    }
    const cats = [];
    for (let c = 0; c < NC; c++) if ((mask & (1 << c)) === 0) cats.push(c);
    return { cats, base: SCORE[d], joker: false };
  }

  // Apply a scoring choice; returns full breakdown + resulting reduced state.
  function applyScore(mask, upper, elig, d, cat) {
    const { base, joker } = legalFor(mask, d);
    const points = base[cat];
    let reward = points;
    let newUpper = upper, crossedBonus = 0;
    if (isUpperCat(cat)) {
      newUpper = Math.min(upper + points, UPPER_THRESHOLD);
      if (upper < UPPER_THRESHOLD && upper + points >= UPPER_THRESHOLD) { reward += UPPER_BONUS; crossedBonus = UPPER_BONUS; }
    }
    let yahtzeeBonus = 0;
    if (joker && elig) { reward += EXTRA_YAHTZEE_BONUS; yahtzeeBonus = EXTRA_YAHTZEE_BONUS; }
    let newElig = elig;
    if (cat === YAHTZEE && points === YAHTZEE_POINTS) newElig = true;
    const newMask = mask | (1 << cat);
    return { points, reward, crossedBonus, yahtzeeBonus, joker, newMask, newUpper, newElig };
  }

  // Value of "score right now" for every dice state, plus the argmax box.
  function scoreNowValues(mask, upper, elig) {
    const val = new Float64Array(NUM_DICE);
    const box = new Int8Array(NUM_DICE);
    for (let d = 0; d < NUM_DICE; d++) {
      const { cats, base, joker } = legalFor(mask, d);
      let best = -Infinity, bestC = -1;
      for (const c of cats) {
        let reward = base[c];
        let nu = upper;
        if (isUpperCat(c)) {
          nu = Math.min(upper + base[c], UPPER_THRESHOLD);
          if (upper < UPPER_THRESHOLD && upper + base[c] >= UPPER_THRESHOLD) reward += UPPER_BONUS;
        }
        if (joker && elig) reward += EXTRA_YAHTZEE_BONUS;
        let ne = elig || (c === YAHTZEE && base[c] === YAHTZEE_POINTS);
        const v = reward + V(mask | (1 << c), nu, ne);
        if (v > best) { best = v; bestC = c; }
      }
      val[d] = best; box[d] = bestC;
    }
    return { val, box };
  }

  // Best keep for one dice index given the value of each dice state next stage.
  function bestKeep(d, vnext) {
    let best = -Infinity, bestKeepVec = null;
    for (const k of KEEPS[d]) {
      let s = 0;
      for (const o of k.outcomes) s += o.num * vnext[o.d];
      s /= 7776;
      if (s > best) { best = s; bestKeepVec = k.keep; }
    }
    return { ev: best, keep: bestKeepVec };
  }
  function keepStageAll(vnext) {
    const out = new Float64Array(NUM_DICE);
    for (let d = 0; d < NUM_DICE; d++) {
      let best = -Infinity;
      for (const k of KEEPS[d]) {
        let s = 0;
        for (const o of k.outcomes) s += o.num * vnext[o.d];
        if (s > best) best = s;
      }
      out[d] = best / 7776;
    }
    return out;
  }

  const diceToCounts = (dice) => {
    const c = [0, 0, 0, 0, 0, 0];
    for (const die of dice) c[die - 1]++;
    return c;
  };
  const countsToFaces = (c) => {
    const f = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < c[i]; j++) f.push(i + 1);
    return f;
  };

  // Main entry: recommend for a given reduced state, dice roll, and roll number.
  //   dice: array of 5 values 1..6.  roll: 1, 2, or 3.
  // Returns { stateEV, mustScore, recommendation, scoreOptions, rerollAdvice }.
  function recommend(mask, upper, elig, dice, roll) {
    const counts = diceToCounts(dice);
    const d0 = DICE_IDX.get(keyOf(counts));
    const { val: scoreNow, box: bestBox } = scoreNowValues(mask, upper, elig);

    // within-turn values for all dice states, rolls 3,2,1
    const v3 = scoreNow;
    const keep2 = keepStageAll(v3);
    const v2 = new Float64Array(NUM_DICE);
    for (let d = 0; d < NUM_DICE; d++) v2[d] = Math.max(scoreNow[d], keep2[d]);
    const keep1 = keepStageAll(v2);
    const v1 = new Float64Array(NUM_DICE);
    for (let d = 0; d < NUM_DICE; d++) v1[d] = Math.max(scoreNow[d], keep1[d]);

    const stateEV = roll === 1 ? v1[d0] : roll === 2 ? v2[d0] : v3[d0];

    // scoring options for the actual dice (for override / display), ranked
    const { cats } = legalFor(mask, d0);
    const scoreOptions = cats.map((c) => {
      const r = applyScore(mask, upper, elig, d0, c);
      const resultEV = r.reward + V(r.newMask, r.newUpper, r.newElig);
      return { cat: c, points: r.points, reward: r.reward, crossedBonus: r.crossedBonus,
        yahtzeeBonus: r.yahtzeeBonus, joker: r.joker, resultEV,
        newMask: r.newMask, newUpper: r.newUpper, newElig: r.newElig };
    }).sort((a, b) => b.resultEV - a.resultEV);

    const mustScore = roll >= 3;
    let recommendation, rerollAdvice = null;
    const scoreNowEV = scoreNow[d0];

    if (mustScore) {
      recommendation = { action: "score", cat: bestBox[d0], ev: scoreNowEV };
    } else {
      const vnext = roll === 1 ? v2 : v3;
      const bk = bestKeep(d0, vnext);
      rerollAdvice = { keep: bk.keep, keepFaces: countsToFaces(bk.keep),
        rerollCount: 5 - bk.keep.reduce((a, b) => a + b, 0), ev: bk.ev };
      if (bk.ev > scoreNowEV + 1e-9) {
        recommendation = { action: "reroll", keep: bk.keep, keepFaces: countsToFaces(bk.keep),
          rerollCount: rerollAdvice.rerollCount, ev: bk.ev };
      } else {
        recommendation = { action: "score", cat: bestBox[d0], ev: scoreNowEV };
      }
    }
    return { stateEV, mustScore, recommendation, rerollAdvice, scoreOptions, d0 };
  }

  return {
    NUM_DICE, ALL_DICE, V, legalFor, applyScore, recommend,
    diceToCounts, countsToFaces,
    UPPER_THRESHOLD, UPPER_BONUS, YAHTZEE_POINTS, EXTRA_YAHTZEE_BONUS,
    initialV: values[0],
  };
}

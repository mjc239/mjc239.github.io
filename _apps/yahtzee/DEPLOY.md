# Yahtzee Advisor — build & deploy

An optimal-play advisor for a real game of Yahtzee. Enter what you actually
rolled after each roll; it recommends the best move (which dice to keep and
reroll, or which box to score) and shows your **expected final score** from the
current state. You're free to ignore the advice — just enter your next roll, or
pick whichever box you actually used.

Full official rules: upper-section bonus (+35 at 63), the extra-Yahtzee bonus
(+100), and the forced Joker rule. Same layout/tooling as the other apps in
`_apps/`.

## How it works (compute vs memory)

The whole game is solved offline into a **state value function** `V(mask,
upper_total, eligible)` — the expected additional score under optimal play from
each between-turns state. That table is the only thing shipped to the browser
(~4 MB, `apps/yahtzee/values.bin`). At runtime the app does a cheap **single-turn
lookahead** (three roll stages over the 252 dice states) using `V` as the
"score now" values, which is what produces each recommendation in ~a millisecond.

This is the deliberate middle ground: we don't ship the full per-dice policy
(huge memory), and we don't re-solve the game in the browser (huge compute) —
we store `V` and compute the per-turn policy on demand. No backend or network is
needed, so the app works offline.

## Layout

- `_apps/yahtzee/` (this directory) — source. Jekyll ignores underscored dirs.
  - `YahtzeeAdvisor.jsx` — the app (one self-contained React component, CSS in a
    `<style>` block).
  - `engine.js` — the solver runtime: dice/keep/reroll tables + the single-turn
    lookahead over the `V` table. No React; unit-testable in plain Node.
  - `main.jsx` — entry point that fetches `values.bin`, builds the engine, mounts.
  - `solver/generate_values.py` — offline value iteration that writes
    `apps/yahtzee/values.bin`.
- `apps/yahtzee/` — what gets served, at <https://mjc239.github.io/apps/yahtzee/>.
  - `index.html` — static shell (committed, hand-written).
  - `app.js` — esbuild bundle (committed build output).
  - `values.bin` — the precomputed value function (committed data asset).

## Regenerating the value function

Only needed if you change the rules/scoring in `generate_values.py`.

```bash
cd _apps/yahtzee
npm run values          # ~3-5 min; writes ../../apps/yahtzee/values.bin (~4 MB)
```

It prints `V(initial) = 254.5877…` — the optimal expected score under the strict
(forced) Joker rule. (The often-quoted 254.5894 assumes a slightly more
permissive Joker placement; see the math review notes.)

## Rebuilding the app

```bash
cd _apps/yahtzee
npm install
npm run build           # writes ../../apps/yahtzee/app.js
git add ../../apps/yahtzee/app.js && git commit
```

Iterate locally:

```bash
npm run watch           # rebuilds on save (unminified)
npm run serve           # serves the repo root at http://localhost:8000
# open http://localhost:8000/apps/yahtzee/
```

Pushing to `master` is the deploy — GitHub Pages runs Jekyll, which copies
`apps/` through verbatim.

## Data format (`values.bin`)

A dense little-endian `float32` array of length `8192 * 128 = 1,048,576`,
indexed as `mask * 128 + upper_total * 2 + eligible`, where:
- `mask` — 13-bit filled-category bitmask (bit `c` set = category `c` used),
- `upper_total` — running upper-section total capped at 63 (`0..63`),
- `eligible` — `1` iff the Yahtzee box was scored as 50.

Unreachable index combinations are present but simply never queried.

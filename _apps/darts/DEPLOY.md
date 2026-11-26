# Darts Aim Advisor — build & deploy

Where should you aim in a game of 501? Set a three-dart average, the score you
require and the dart in your hand. The board is coloured by what each aiming
spot costs in **visits to finish**, solved exactly for a player of that standard.
It is the interactive companion to the post *Count visits, not darts*.

Same layout and tooling as `_apps/yahtzee`.

## How it works (compute vs memory)

The game is solved offline, once per ability level, by the DartsStrats solver
(`darts.mdp_3turn.ThreeDartMDP`, counting visits). For each level the browser
gets the value tables plus, for every point on a 3.52 mm aiming grid, the
probability of each score. From those it prices **every** aiming point for any
state `(score left, dart in hand, score the visit started on)` with one pass
over the grid: about 2 ms. Nothing is solved in the browser, and there is no
backend.

The exporter checks every level before writing it: the browser's formula, run
on the quantised tables, must reproduce the solver's own values (to within
5e-3 visits; in practice under 4e-4), and its recommended aim must be within
1e-3 visits of the solver's best.

## Layout

- `_apps/darts/` (this directory) — source. Jekyll ignores underscored dirs.
  - `DartsAimAdvisor.jsx` — the app (one React component, CSS in a `<style>` block).
  - `engine.js` — values of every aiming point from the tables. No React; tested in Node.
  - `test_engine.mjs` + `test_fixture.json` — `npm test`; the fixture comes from `solver/make_fixture.py`.
  - `solver/export_tables.py` — solves each level and writes `apps/darts/data/`.
- `apps/darts/` — what gets served, at <https://mjc239.github.io/apps/darts/>.
  - `index.html` — static shell. `app.js` — esbuild bundle (committed build output).
  - `data/levels.json` — the levels (sigma, three-dart average, band) and the file layout.
  - `data/points.json` — the aiming grid in mm and a name for each point.
  - `data/level-NN.bin` — one per level, 1.3 MB, fetched only when chosen.

## Regenerating the tables

Needs a DartsStrats checkout next to this repository (or pass `--darts-repo`)
with its Python requirements installed.

```bash
cd _apps/darts
npm run tables      # ~2 minutes: 14 levels, then the test fixture
npm test
```

The levels are set by `SIGMAS` in `export_tables.py` (throwing standard
deviations in mm; the three-dart averages run from about 28 to 109).

## Rebuilding the app

```bash
cd _apps/darts
npm install
npm run build       # writes ../../apps/darts/app.js
npm run serve       # http://localhost:8000/apps/darts/
```

Pushing to `master` is the deploy.

## Model

A round, unbiased Gaussian throw whose spread gives the stated three-dart
average, the same model as the blog posts. Real throws are more heavy-tailed
(DartsStrats notebooks 21-22); swapping in the Student-t throw is a change to
`export_tables.py` only.

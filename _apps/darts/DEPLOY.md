# Darts Aim Advisor — build & deploy

Where should you aim in a game of 501? Set a three-dart average, the score you
require and the dart in your hand. The board is coloured by what each aiming
spot costs in **visits to finish**, solved exactly for a player of that standard.
It is the interactive companion to the post *Count visits, not darts*.

Two views share the same average and throw-shape controls:

- **Board**: the heat map for one situation (score left, dart in hand, and the
  score the visit started on when that matters). Hover or tap to price any spot.
- **Checkout chart**: 170 down to 2, with the route (where to aim with each dart
  if it lands where you aim) and the real chance of finishing this visit when
  you follow the advice after a miss too. On the live site it has a Print button
  and a print stylesheet; inside an embedded preview the button is hidden.

Four throw shapes, all matched to the same throwing standards:

| Shape | Model | Levels |
| --- | --- | --- |
| Round (default) | round Gaussian, as in the blog posts | 14, averages 28-109 |
| Heavy-tailed | round Student-t, nu = 2.25 (DartsStrats notebook 21), scaled to the same scoring average | 7 |
| Tall | Gaussian, 1.5x the spread up-and-down as side-to-side, same area | 7 |
| Wide | the same, turned 90 degrees | 7 |

The exporter checks the tall and wide files point the right way (a tall group
is better at the side doubles than at D20).

Same layout and tooling as `_apps/yahtzee`.

## How it works (compute vs memory)

The game is solved offline, once per ability level, by the DartsStrats solver
(`darts.mdp_3turn.ThreeDartMDP`, counting visits). For each level the browser
gets the value tables, the solver's best aim for every state, and, for every
point on a 3.52 mm aiming grid, the probability of each score. From those it prices **every** aiming point for any
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
  - `data/levels.json` — the throw shapes, their levels (sigma, three-dart average, band) and the file layout.
  - `data/points.json` — the aiming grid in mm and a name for each point.
  - `data/<shape>-NN.bin` — one per shape and level, 1.4 MB each (47 MB in all), fetched only when chosen.

## Regenerating the tables

Needs a DartsStrats checkout next to this repository (or pass `--darts-repo`)
with its Python requirements installed.

```bash
cd _apps/darts
npm run tables      # ~4 minutes: 35 levels, then the test fixture
npm test
```

The shapes and levels are set by `MODELS`, `SIGMAS` and `ALT_SIGMAS` in
`export_tables.py` (throwing standard deviations in mm). `--models round heavy`
exports only those shapes, for trying things out.

## Rebuilding the app

```bash
cd _apps/darts
npm install
npm run build       # writes ../../apps/darts/app.js
npm run serve       # http://localhost:8000/apps/darts/
```

Pushing to `master` is the deploy.

## Model

Every shape is an unbiased throw (no pull to one side). A pull would not need
new tables: aiming at `a` with a pull `b` lands like aiming at `a + b` without
one (DartsStrats notebook 13), so it is a shift of the board the app could add.

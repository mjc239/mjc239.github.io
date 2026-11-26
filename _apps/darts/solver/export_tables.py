#!/usr/bin/env python
"""
Export the solved 501 game for the Darts Aim Advisor.

For each ability level this solves the real game (three darts a visit, a bust
returns to the score the visit started on, cost = one per visit) with the
DartsStrats solver, and writes everything the browser needs to colour the
board for any state, with no solving in the browser:

    apps/darts/data/levels.json      what the levels are, and the file layout
    apps/darts/data/points.json      the aiming grid (mm) and a name for each point
    apps/darts/data/level-NN.bin     one file per level, little-endian:
        P      uint16[n_points * n_scores]   P(score j | aim i), scaled by 65535
        CO     uint16[n_points * n_checkout] P(checkout on score c | aim i)
        V1     float32[502]                  visits to finish from a visit start
        V2tab  float32[502]                  dart 2, where the visit start no longer matters
        V3tab  float32[502]                  dart 3, likewise
        V2low  float32[182 * 122]            dart 2, by [visit start, score]
        V3low  float32[182 * 62]             dart 3, by [visit start, score]
    The value tables are positive (expected visits) with NaN for unused cells,
    and follow darts.mdp_3turn.ThreeDartMDP exactly.

Before writing, every level is checked: the browser's formula for the value of
each aiming point, run on the *quantised* tables, must reproduce the solver's
own q_values for a sample of states.

Needs a DartsStrats checkout (https://github.com/mjc239/DartsStrats); by default
it looks next to this repository.

    python _apps/darts/solver/export_tables.py
    python _apps/darts/solver/export_tables.py --darts-repo ~/code/DartsStrats
"""
import argparse
import json
import os
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, "..", "..", ".."))

BOARD_PIXELS = 512
POINT_STRIDE = 4       # a 3.52 mm aiming grid
MARGIN_MM = 20.0       # aiming points up to 20 mm outside the double ring, for every level
GAME_START = 501
SCALE = 65535

# Throwing standard deviations (mm). Chosen so the three-dart averages run from
# about 25 to about 105 in steps a player would notice.
SIGMAS = [5.5, 6.5, 7.5, 8.5, 10.0, 11.5, 13.0, 14.5, 16.0, 18.0, 20.0, 23.0, 27.0, 33.0]


def band_name(avg):
    for lo, name in [(95, "World class"), (85, "Tour pro"), (70, "County"),
                     (60, "Super league"), (45, "League"), (35, "Club")]:
        if avg >= lo:
            return name
    return "Pub"


def evaluate_darts(P, CP, S, m):
    """Expected darts to finish from 501 under m's (visit-minimising) policy."""
    darts = np.zeros(GAME_START + 1)
    for s in range(2, GAME_START + 1):
        dist, thrown, back = {s: 1.0}, 0.0, 0.0
        for d in (1, 2, 3):
            nxt = {}
            for u, w in dist.items():
                i = m.policy(u, d, s)
                thrown += w
                j = np.searchsorted(S, u)
                co = CP[i, j] if (j < len(S) and S[j] == u) else 0.0
                valid = S <= u - 2
                back += w * (1.0 - P[i, valid].sum() - co)
                for t, p in zip(S[valid], P[i, valid]):
                    if p > 0:
                        nxt[u - t] = nxt.get(u - t, 0.0) + w * p
            dist = nxt
        back += dist.pop(s, 0.0)
        ends = np.fromiter(dist.keys(), int, len(dist))
        wts = np.fromiter(dist.values(), float, len(dist))
        darts[s] = (thrown + (wts @ darts[ends] if len(ends) else 0.0)) / (1.0 - back)
    return darts[GAME_START]


class Tables:
    """The browser's view of one level, rebuilt from the quantised arrays."""

    def __init__(self, Pq, COq, S, co_scores, V1, V2tab, V3tab, V2low, V3low, u2, u3):
        self.P = Pq.astype(np.float64) / SCALE
        self.CO = COq.astype(np.float64) / SCALE
        self.S, self.co_col = S, {int(c): k for k, c in enumerate(co_scores)}
        self.V1, self.V2tab, self.V3tab = V1, V2tab, V3tab
        self.V2low, self.V3low, self.u2, self.u3 = V2low, V3low, u2, u3

    def value(self, u, d, s):
        if u == 0:
            return 0.0
        if d == 1:
            return self.V1[u]
        if d == 2:
            return self.V2tab[u] if u >= self.u2 else self.V2low[s, u]
        return self.V3tab[u] if u >= self.u3 else self.V3low[s, u]

    def q(self, u, d, s):
        """Expected further visits (counting the current one at dart 1) for every aim."""
        valid = self.S <= u - 2
        nxt = np.array([self.V1[u - t] if d == 3 else self.value(u - t, d + 1, s)
                        for t in self.S[valid]])
        co = self.CO[:, self.co_col[u]] if u in self.co_col else 0.0
        bust = 1.0 - self.P[:, valid].sum(axis=1) - co
        return (1.0 if d == 1 else 0.0) + self.P[:, valid] @ nxt + bust * self.V1[s]


def sample_states(rng, n=60):
    """A spread of legal states, weighted towards the finish where advice changes."""
    states = [(501, 1, 501), (170, 1, 170), (61, 1, 61), (50, 1, 50), (40, 1, 40),
              (2, 1, 2), (2, 2, 2), (2, 3, 2), (2, 3, 4), (32, 2, 52), (16, 3, 76)]
    while len(states) < n:
        d = int(rng.integers(1, 4))
        u = int(rng.choice([rng.integers(2, 62), rng.integers(2, 182), rng.integers(2, 502)]))
        s = u if d == 1 else int(min(501, u + rng.integers(0, 60 * (d - 1) + 1)))
        states.append((u, d, s))
    return states


def export_level(sigma, k, outdir, points_ref, darts_mod, rng):
    transition_arrays, ThreeDartMDP = darts_mod
    t0 = time.perf_counter()
    tr = transition_arrays(BOARD_PIXELS, sigma, margin_mm=MARGIN_MM, point_stride=POINT_STRIDE)
    if points_ref is not None:
        assert np.array_equal(tr["points"], points_ref), "aiming grid changed between levels"
    S0 = tr["allowed_scores"].astype(np.int64)
    order = np.argsort(S0)
    S = S0[order]
    P = np.ascontiguousarray(tr["probs"][:, order])
    CP = np.ascontiguousarray(tr["checkout_probs"][:, order])
    co_scores = S[CP.max(axis=0) > 0]
    CO = CP[:, np.searchsorted(S, co_scores)]

    m = ThreeDartMDP(P, CP, S, GAME_START, dart_cost=0.0, turn_cost=1.0).solve()
    darts = evaluate_darts(P, CP, S, m)
    avg = 3 * GAME_START / darts

    Pq = np.round(P * SCALE).astype("<u2")
    COq = np.round(CO * SCALE).astype("<u2")
    f32 = lambda a: (-np.asarray(a, dtype=np.float64)).astype("<f4")
    V1, V2tab, V3tab, V2low, V3low = map(f32, (m.V1, m.V2tab, m.V3tab, m.V2low, m.V3low))
    V1[0] = 0.0

    # The check: the browser's formula on the quantised tables vs the solver.
    tab = Tables(Pq, COq, S, co_scores, *(a.astype(np.float64) for a in (V1, V2tab, V3tab, V2low, V3low)),
                 m.u2_indep, m.u3_indep)
    worst_value, worst_best = 0.0, 0.0
    for (u, d, s) in sample_states(rng):
        exact = -m.q_values(u, d, s)
        mine = tab.q(u, d, s)
        worst_value = max(worst_value, float(np.max(np.abs(mine - exact))))
        # the aim the browser would recommend must be (near) optimal in exact terms
        worst_best = max(worst_best, float(exact[int(np.argmin(mine))] - exact.min()))
    assert worst_value < 5e-3, f"sigma {sigma}: value error {worst_value}"
    assert worst_best < 1e-3, f"sigma {sigma}: recommended aim off by {worst_best}"

    name = f"level-{k:02d}.bin"
    with open(os.path.join(outdir, name), "wb") as fh:
        for arr in (Pq, COq, V1, V2tab, V3tab, V2low, V3low):
            fh.write(np.ascontiguousarray(arr).tobytes())
    meta = dict(file=name, sigma=sigma, average=round(float(avg), 1), band=band_name(avg),
                visits_501=round(float(-m.V1[GAME_START]), 3),
                bytes=os.path.getsize(os.path.join(outdir, name)))
    print(f"  sigma {sigma:5.1f} mm  avg {avg:6.1f}  visits {meta['visits_501']:6.3f}  "
          f"max |dQ| {worst_value:.1e}  best-aim gap {worst_best:.1e}  "
          f"{meta['bytes'] / 1e6:.2f} MB  {time.perf_counter() - t0:4.1f}s", flush=True)
    shapes = dict(n_points=len(tr["points"]), scores=[int(x) for x in S],
                  checkout_scores=[int(x) for x in co_scores],
                  V2low=list(V2low.shape), V3low=list(V3low.shape),
                  u2_indep=int(m.u2_indep), u3_indep=int(m.u3_indep))
    return meta, shapes, tr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--darts-repo", default=os.path.join(SITE, "..", "DartsStrats"))
    ap.add_argument("--out", default=os.path.join(SITE, "apps", "darts", "data"))
    ap.add_argument("--sigmas", nargs="*", type=float, default=SIGMAS)
    args = ap.parse_args()

    sys.path.insert(0, os.path.abspath(args.darts_repo))
    from darts.mdp_3turn import ThreeDartMDP
    from darts.transitions import transition_arrays
    from darts.utils import aim_description, mm_per_pixel

    os.makedirs(args.out, exist_ok=True)
    rng = np.random.default_rng(0)
    levels, shapes, points = [], None, None
    for k, sigma in enumerate(sorted(args.sigmas, reverse=True)):
        meta, sh, tr = export_level(sigma, k, args.out, points,
                                    (transition_arrays, ThreeDartMDP), rng)
        if shapes is None:
            shapes, points = sh, tr["points"]
        assert sh == shapes, "file layout changed between levels"
        levels.append(meta)

    mmpp = mm_per_pixel(BOARD_PIXELS)
    c = BOARD_PIXELS // 2
    names = [aim_description(p, BOARD_PIXELS) for p in points]
    vocab = sorted(set(names))
    pts = dict(stride_mm=round(POINT_STRIDE * mmpp, 4),
               # x to the right, y towards the 20, in mm from the centre of the bull
               x=[round(float((p[1] - c) * mmpp), 2) for p in points],
               y=[round(float((p[0] - c) * mmpp), 2) for p in points],
               names=vocab, name=[vocab.index(n) for n in names])
    with open(os.path.join(args.out, "points.json"), "w") as fh:
        json.dump(pts, fh, separators=(",", ":"))
    manifest = dict(game_start=GAME_START, board_pixels=BOARD_PIXELS, scale=SCALE,
                    throw="Gaussian, round, aimed without bias", objective="visits",
                    layout=["P", "CO", "V1", "V2tab", "V3tab", "V2low", "V3low"],
                    levels=levels, **shapes)
    with open(os.path.join(args.out, "levels.json"), "w") as fh:
        json.dump(manifest, fh, indent=1)
    print(f"wrote {len(levels)} levels and points.json to {os.path.relpath(args.out)}")


if __name__ == "__main__":
    main()

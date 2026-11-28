#!/usr/bin/env python
"""
Write the fixture that test_engine.mjs checks engine.js against.

Reads the exported files back with numpy (so it also checks the file layout),
and computes, independently of engine.js:
  * the value of every aiming point for a handful of states, with the same
    formula the exporter verified against the solver (a sample is stored);
  * the chance of finishing within one visit, following the stored best aims;
  * the conventional checkout route.

    python _apps/darts/solver/make_fixture.py
"""
import json
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "..", "..", "apps", "darts", "data")
OUT = os.path.join(HERE, "..", "test_fixture.json")

STATES = [(501, 1, 501), (170, 1, 170), (61, 1, 61), (50, 1, 50), (40, 1, 40),
          (2, 1, 2), (2, 2, 2), (2, 3, 2), (2, 3, 4), (32, 2, 52), (16, 3, 76), (121, 2, 141)]
STARTS = [170, 141, 100, 81, 61, 50, 41, 40, 32, 25, 17, 4, 3, 2, 169, 159]
# (shape, level index) pairs to check: a weak and a strong round level, and one of each other shape
PICKS = [("round", 1), ("round", 9), ("heavy", 3), ("tall", 3), ("wide", 5)]


def read_level(man, path):
    raw = open(path, "rb").read()
    off, out = 0, {}
    for a in man["layout"]:
        dt = np.dtype("<" + a["dtype"])
        size = dt.itemsize * int(np.prod(a["shape"]))
        arr = np.frombuffer(raw[off:off + size], dtype=dt).reshape(a["shape"])
        out[a["name"]] = arr.astype(np.float64) if a["dtype"] == "f4" else arr.astype(np.int64)
        off += size
    assert off == len(raw), "file length does not match the manifest"
    out["P"] = out["P"] / man["scale"]
    out["CO"] = out["CO"] / man["scale"]
    return out


class Level:
    def __init__(self, man, L):
        self.man, self.L = man, L
        self.S = np.array(man["scores"])
        self.co_col = {c: k for k, c in enumerate(man["checkout_scores"])}

    def value(self, x, d, s):
        L, m = self.L, self.man
        if x == 0:
            return 0.0
        if d == 1:
            return L["V1"][x]
        if d == 2:
            return L["V2tab"][x] if x >= m["u2_indep"] else L["V2low"][s, x]
        return L["V3tab"][x] if x >= m["u3_indep"] else L["V3low"][s, x]

    def policy(self, u, d, s):
        L, m = self.L, self.man
        if d == 1:
            i = L["pol1"][u]
        elif d == 2:
            i = L["pol2tab"][u] if u >= m["u2_indep"] else L["pol2low"][s, u]
        else:
            i = L["pol3tab"][u] if u >= m["u3_indep"] else L["pol3low"][s, u]
        assert i != 65535, (u, d, s)
        return int(i)

    def q(self, u, d, s):
        L = self.L
        valid = self.S <= u - 2
        nxt = np.array([L["V1"][u - t] if d == 3 else self.value(u - t, d + 1, s) for t in self.S[valid]])
        co = L["CO"][:, self.co_col[u]] if u in self.co_col else 0.0
        bust = 1.0 - L["P"][:, valid].sum(axis=1) - co
        return (1.0 if d == 1 else 0.0) + L["P"][:, valid] @ nxt + bust * L["V1"][s]

    def checkout_chance(self, start):
        L, S = self.L, self.S
        dist, win = {start: 1.0}, 0.0
        for d in (1, 2, 3):
            nxt = {}
            for u, w in dist.items():
                i = self.policy(u, d, start)
                if u in self.co_col:
                    win += w * L["CO"][i, self.co_col[u]]
                for t, p in zip(S, L["P"][i]):
                    if t <= u - 2 and p > 0:
                        nxt[u - t] = nxt.get(u - t, 0.0) + w * p
            dist = nxt
        return win


def target_score(raw):
    outside = raw.startswith("outside ")
    name = raw[8:] if outside else raw
    if name == "BULL":
        return 50, True
    if name == "25":
        return 25, False
    if name[0] == "T":
        return 3 * int(name[1:]), False
    if name[0] == "D":
        return 2 * int(name[1:]), True
    return int(name), False


def route(lv, pts, start):
    out, u = [], start
    for d in (1, 2, 3):
        i = lv.policy(u, d, start)
        raw = pts["names"][pts["name"][i]]
        out.append(raw)
        score, finish = target_score(raw)
        if score == u and finish:
            return out, True
        if score > u - 2:
            break
        u -= score
    return out, False


def main():
    man = json.load(open(os.path.join(DATA, "levels.json")))
    pts = json.load(open(os.path.join(DATA, "points.json")))
    models = {m["id"]: m for m in man["models"]}
    cases, chances, routes = [], [], []
    for mid, k in PICKS:
        meta = models[mid]["levels"][k]
        lv = Level(man, read_level(man, os.path.join(DATA, meta["file"])))
        for (u, d, s) in STATES:
            qs = lv.q(u, d, s)
            idx = list(range(0, man["n_points"], 97)) + [int(np.argmin(qs)), lv.policy(u, d, s)]
            cases.append(dict(model=mid, level=k, u=u, d=d, s=s, best=int(np.argmin(qs)),
                              policy=lv.policy(u, d, s), idx=idx, q=[float(qs[i]) for i in idx]))
        for start in STARTS:
            chances.append(dict(model=mid, level=k, start=start, chance=float(lv.checkout_chance(start))))
            r, fin = route(lv, pts, start)
            routes.append(dict(model=mid, level=k, start=start, route=r, finishes=fin))
    json.dump(dict(cases=cases, chances=chances, routes=routes), open(OUT, "w"))
    print(f"wrote {len(cases)} cases, {len(chances)} checkout chances and {len(routes)} routes "
          f"to {os.path.relpath(OUT)}")


if __name__ == "__main__":
    main()

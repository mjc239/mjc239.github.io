#!/usr/bin/env python
"""
Write the fixture that test_engine.mjs checks engine.js against.

Reads the exported files back with numpy (so it also checks the file layout),
computes the value of every aiming point for a handful of states with the same
formula the exporter verified against the solver, and stores a sample of them.

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


def read_level(man, path):
    n, ns, nc = man["n_points"], len(man["scores"]), len(man["checkout_scores"])
    raw = open(path, "rb").read()
    off, out = 0, {}
    for name, dtype, count in [("P", "<u2", n * ns), ("CO", "<u2", n * nc), ("V1", "<f4", 502),
                               ("V2tab", "<f4", 502), ("V3tab", "<f4", 502),
                               ("V2low", "<f4", int(np.prod(man["V2low"]))),
                               ("V3low", "<f4", int(np.prod(man["V3low"])))]:
        size = np.dtype(dtype).itemsize * count
        out[name] = np.frombuffer(raw[off:off + size], dtype=dtype).astype(np.float64)
        off += size
    assert off == len(raw), "file is longer than the manifest says"
    out["P"] = out["P"].reshape(n, ns) / man["scale"]
    out["CO"] = out["CO"].reshape(n, nc) / man["scale"]
    out["V2low"] = out["V2low"].reshape(man["V2low"])
    out["V3low"] = out["V3low"].reshape(man["V3low"])
    return out


def q(man, L, u, d, s):
    S = np.array(man["scores"])
    co_col = {c: k for k, c in enumerate(man["checkout_scores"])}

    def value(x, dd):
        if x == 0:
            return 0.0
        if dd == 1:
            return L["V1"][x]
        if dd == 2:
            return L["V2tab"][x] if x >= man["u2_indep"] else L["V2low"][s, x]
        return L["V3tab"][x] if x >= man["u3_indep"] else L["V3low"][s, x]

    valid = S <= u - 2
    nxt = np.array([L["V1"][u - t] if d == 3 else value(u - t, d + 1) for t in S[valid]])
    co = L["CO"][:, co_col[u]] if u in co_col else 0.0
    bust = 1.0 - L["P"][:, valid].sum(axis=1) - co
    return (1.0 if d == 1 else 0.0) + L["P"][:, valid] @ nxt + bust * L["V1"][s]


def main():
    man = json.load(open(os.path.join(DATA, "levels.json")))
    cases = []
    for k in (1, 9):  # a weak level and a strong one
        L = read_level(man, os.path.join(DATA, man["levels"][k]["file"]))
        for (u, d, s) in STATES:
            qs = q(man, L, u, d, s)
            idx = list(range(0, man["n_points"], 97)) + [int(np.argmin(qs))]
            cases.append(dict(level=k, u=u, d=d, s=s, best=int(np.argmin(qs)),
                              idx=idx, q=[float(qs[i]) for i in idx]))
    json.dump(dict(cases=cases), open(OUT, "w"))
    print(f"wrote {len(cases)} cases to {os.path.relpath(OUT)}")


if __name__ == "__main__":
    main()

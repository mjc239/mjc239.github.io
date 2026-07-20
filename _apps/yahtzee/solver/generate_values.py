"""Generate the Yahtzee state value function V(filled_mask, upper_total, eligible).

Self-contained: enumerates dice states, keeps and reroll distributions, then runs
backward-induction value iteration over the *reduced* game state under full
official Yahtzee rules (upper bonus, +100 Yahtzee bonus, and the forced Joker
rule). Exports a dense little-endian float32 table to values.bin.

Reduced state = (filled_mask [13 bits], upper_total in [0,63], eligible in {0,1}).
Index layout used by the JS engine:  idx = mask*128 + upper*2 + eligible.

Total expected score from a state = expected sum of immediate rewards along an
optimal play-out, where each immediate reward bundles:
  - the points written in the chosen box,
  - +35 if that fill crosses the upper-section threshold (63),
  - +100 if it is a Joker fill made while eligible (Yahtzee box already scored 50).

V(initial) should come out to ~254.5877 (optimum under the strict/forced Joker
rule; the widely-quoted 254.5894 assumes a slightly more permissive placement).
"""
import os
from math import factorial
from itertools import product

import numpy as np

# ---- categories -----------------------------------------------------------
NC = 13
ONES, TWOS, THREES, FOURS, FIVES, SIXES = range(6)
THREE_KIND, FOUR_KIND, FULL_HOUSE, SM_STRAIGHT, LG_STRAIGHT, CHANCE, YAHTZEE = range(6, 13)
UPPER_BONUS = 35
UPPER_THRESHOLD = 63
YAHTZEE_POINTS = 50
EXTRA_YAHTZEE_BONUS = 100
FULL_HOUSE_POINTS = 25
SM_STRAIGHT_POINTS = 30
LG_STRAIGHT_POINTS = 40

# ---- dice states (count vectors of 5 dice over 6 faces) --------------------
def count_vectors(n):
    """All 6-tuples of non-negative ints summing to n (canonical sorted order)."""
    out = []
    def rec(prefix, remaining, slots):
        if slots == 1:
            out.append(tuple(prefix + [remaining]))
            return
        for k in range(remaining + 1):
            rec(prefix + [k], remaining - k, slots - 1)
    rec([], n, 6)
    return out

ALL_DICE = count_vectors(5)
NUM_DICE = len(ALL_DICE)                       # 252
DICE_IDX = {v: i for i, v in enumerate(ALL_DICE)}

def multinomial(counts):
    n = sum(counts)
    d = 1
    for c in counts:
        d *= factorial(c)
    return factorial(n) // d

# initial-roll numerators (out of 7776)
DICE_FREQS = np.array([multinomial(v) for v in ALL_DICE], dtype=np.float64)
assert DICE_FREQS.sum() == 6 ** 5

# ---- scoring --------------------------------------------------------------
def total_pips(c):
    return sum((i + 1) * n for i, n in enumerate(c))

def has_run(c, k):
    run = 0
    for n in c:
        run = run + 1 if n > 0 else 0
        if run >= k:
            return True
    return False

def score(c, cat):
    if cat <= SIXES:
        return (cat + 1) * c[cat]
    if cat == THREE_KIND:
        return total_pips(c) if max(c) >= 3 else 0
    if cat == FOUR_KIND:
        return total_pips(c) if max(c) >= 4 else 0
    if cat == FULL_HOUSE:
        s = sorted(c)
        return FULL_HOUSE_POINTS if ((s[-1] == 3 and s[-2] == 2) or max(c) == 5) else 0
    if cat == SM_STRAIGHT:
        return SM_STRAIGHT_POINTS if has_run(c, 4) else 0
    if cat == LG_STRAIGHT:
        return LG_STRAIGHT_POINTS if has_run(c, 5) else 0
    if cat == CHANCE:
        return total_pips(c)
    if cat == YAHTZEE:
        return YAHTZEE_POINTS if max(c) == 5 else 0

SCORE = np.array([[score(c, cat) for cat in range(NC)] for c in ALL_DICE], dtype=np.int64)
JSCORE = SCORE.copy()                          # joker: straights always score full
JSCORE[:, SM_STRAIGHT] = SM_STRAIGHT_POINTS
JSCORE[:, LG_STRAIGHT] = LG_STRAIGHT_POINTS
IS_YAH = np.array([max(c) == 5 for c in ALL_DICE])
YFACE = np.array([int(np.argmax(c)) if max(c) == 5 else -1 for c in ALL_DICE])

# ---- reroll transition matrix (flattened (dice,keep) pairs -> final dice) --
def sub_vectors(c):
    return product(*[range(n + 1) for n in c])

def build_reroll_matrix():
    rows = []
    offsets = [0]
    reroll_cache = {n: count_vectors(n) for n in range(6)}
    for d in range(NUM_DICE):
        c = ALL_DICE[d]
        for keep in sub_vectors(c):
            n = 5 - sum(keep)
            row = np.zeros(NUM_DICE, dtype=np.float64)
            mult = 6 ** sum(keep)
            for rv in reroll_cache[n]:
                final = tuple(keep[i] + rv[i] for i in range(6))
                row[DICE_IDX[final]] += multinomial(rv) * mult
            rows.append(row)
        offsets.append(len(rows))
    return np.array(rows, dtype=np.float64), np.array(offsets, dtype=np.int64)

print("building reroll matrix...", flush=True)
REROLL, OFF = build_reroll_matrix()            # REROLL: (num_pairs, 252), sums to 7776 per row
UMASK = np.zeros(NC, dtype=bool); UMASK[: SIXES + 1] = True

def stage_keep(ev):
    """ev: (N,252) value of each dice state at the next sub-stage.
    Returns (N,252): best-keep expected value for each current dice state."""
    flat = (ev @ REROLL.T) / 7776.0            # (N, num_pairs)
    out = np.empty((ev.shape[0], NUM_DICE))
    for d in range(NUM_DICE):
        out[:, d] = flat[:, OFF[d]:OFF[d + 1]].max(axis=1)
    return out

# ---- per-mask legal/scoring tables (forced Joker rule) --------------------
def mask_tables(mask):
    yfilled = bool(mask & (1 << YAHTZEE))
    unused = [c for c in range(NC) if not (mask & (1 << c))]
    open_up = [c for c in range(ONES, SIXES + 1) if not (mask & (1 << c))]
    open_lo = [c for c in range(THREE_KIND, NC) if not (mask & (1 << c))]
    legal = np.zeros((NUM_DICE, NC), dtype=bool)
    base = np.zeros((NUM_DICE, NC), dtype=np.int64)
    isj = np.zeros(NUM_DICE, dtype=bool)
    for d in range(NUM_DICE):
        if IS_YAH[d] and yfilled:
            isj[d] = True
            base[d] = JSCORE[d]
            f = YFACE[d]
            if not (mask & (1 << f)):
                cats = [f]
            elif open_lo:
                cats = open_lo
            else:
                cats = open_up
        else:
            base[d] = SCORE[d]
            cats = unused
        for cat in cats:
            legal[d, cat] = True
    return legal, base, isj

# ---- value iteration (dense over all masks, all upper/eligible rows) -------
# Vtab[mask] -> (64, 2) float64.  Terminal (all filled) contributes zeros.
UPPERS = np.arange(UPPER_THRESHOLD + 1)
Vtab = {}
TERMINAL = np.zeros((UPPER_THRESHOLD + 1, 2), dtype=np.float64)

masks_by_pop = sorted(range(1 << NC), key=lambda m: bin(m).count("1"), reverse=True)
print(f"value iteration over {1 << NC} masks...", flush=True)
for mi, mask in enumerate(masks_by_pop):
    if mask == (1 << NC) - 1:                  # terminal
        Vtab[mask] = TERMINAL.copy()
        continue
    legal, base, isj = mask_tables(mask)
    Vnext = [Vtab.get(mask | (1 << c), TERMINAL) for c in range(NC)]

    # Build the 128 (upper,eligible) rows for this mask in one batch.
    rows = [(u, e) for u in range(UPPER_THRESHOLD + 1) for e in (0, 1)]
    N = len(rows)
    evC = np.empty((N, NUM_DICE))
    for i, (up, el) in enumerate(rows):
        reward = base.astype(np.float64)
        if up < UPPER_THRESHOLD:
            crossed = (up + base) >= UPPER_THRESHOLD
            reward = reward + (crossed & UMASK[None, :]) * float(UPPER_BONUS)
        if el:
            reward = reward + isj[:, None].astype(np.float64) * float(EXTRA_YAHTZEE_BONUS)
        new_upper = np.where(UMASK[None, :], np.minimum(up + base, UPPER_THRESHOLD), up)
        new_elig = np.full((NUM_DICE, NC), el, dtype=np.int64)
        if not el:
            new_elig[:, YAHTZEE] = (base[:, YAHTZEE] == YAHTZEE_POINTS).astype(np.int64)
        Vn = np.zeros((NUM_DICE, NC))
        for c in range(NC):
            Vn[:, c] = Vnext[c][new_upper[:, c], new_elig[:, c]]
        evC[i] = np.where(legal, reward + Vn, -np.inf).max(axis=1)

    evB = stage_keep(evC)
    evA = stage_keep(evB)
    Vvals = (evA @ DICE_FREQS) / 7776.0        # (N,)

    arr = np.zeros((UPPER_THRESHOLD + 1, 2), dtype=np.float64)
    for i, (up, el) in enumerate(rows):
        arr[up, el] = Vvals[i]
    Vtab[mask] = arr
    if mi % 1000 == 0:
        print(f"  {mi}/{1 << NC}", flush=True)

# ---- export dense float32 table -------------------------------------------
out = np.zeros((1 << NC) * 128, dtype=np.float32)
for mask, arr in Vtab.items():
    for up in range(UPPER_THRESHOLD + 1):
        for el in (0, 1):
            out[mask * 128 + up * 2 + el] = arr[up, el]

here = os.path.dirname(os.path.abspath(__file__))
dst = os.path.abspath(os.path.join(here, "..", "..", "..", "apps", "yahtzee", "values.bin"))
out.tofile(dst)
print(f"V(initial) = {out[0]:.6f}")
print(f"wrote {dst}  ({out.nbytes/1e6:.2f} MB, {out.size} float32)")

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  buildEngine, CATEGORY_NAMES, CATEGORY_SHORT, SIXES, YAHTZEE,
} from "./engine.js";

const ALL_MASK = (1 << 13) - 1;

// ---------- dice face (pip layout) ----------
const PIPS = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};
function PipFace({ value }) {
  return (
    <span className="pipgrid">
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={"pip" + (value && PIPS[value].includes(i) ? " on" : "")} />
      ))}
    </span>
  );
}
function Die({ value, onClick, held }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={"die" + (held ? " held" : "") + (onClick ? " tappable" : "")}
      aria-label={value ? `die showing ${value}, tap to remove` : "empty die slot"}
    >
      <PipFace value={value} />
    </button>
  );
}

// ---------- helpers ----------
function upperActualFromCard(card) {
  let s = 0;
  for (let c = 0; c <= SIXES; c++) if (card[c] != null) s += card[c];
  return s;
}
function facesLabel(faces) {
  if (!faces.length) return "nothing";
  return faces.join(", ");
}
// Given the current dice (values by slot) and a keep count-vector (per face
// 1..6), return which dice slots to hold to realise that keep.
function heldPatternFromKeep(dice, keepVec) {
  const empty = [false, false, false, false, false];
  if (!keepVec) return empty;
  const remaining = keepVec.slice();
  return dice.map((v) => {
    if (v != null && remaining[v - 1] > 0) { remaining[v - 1]--; return true; }
    return false;
  });
}

export function App() {
  const [engine, setEngine] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    fetch("values.bin")
      .then((r) => { if (!r.ok) throw new Error(`values.bin ${r.status}`); return r.arrayBuffer(); })
      .then((buf) => setEngine(buildEngine(new Float32Array(buf))))
      .catch((e) => setLoadError(String(e)));
  }, []);

  if (loadError) return <div className="wrap"><Style /><p className="err">Failed to load solver data: {loadError}</p></div>;
  if (!engine) return <div className="wrap"><Style /><p className="loading">Loading solver…</p></div>;
  return <Game engine={engine} />;
}

const emptyCard = () => Array(13).fill(null);

function Game({ engine }) {
  // reduced state
  const [mask, setMask] = useState(0);
  const [elig, setElig] = useState(false);
  // display / bookkeeping
  const [card, setCard] = useState(emptyCard);
  const [banked, setBanked] = useState(0);        // sum of committed rewards (incl. bonuses)
  const [yahtzeeBonuses, setYahtzeeBonuses] = useState(0);
  const [turn, setTurn] = useState(1);
  // per-turn
  const [roll, setRoll] = useState(1);
  const [dice, setDice] = useState([null, null, null, null, null]);
  const [picking, setPicking] = useState(false);  // showing the score-a-box list
  const [heldOverride, setHeldOverride] = useState(null);  // manual keep (null = follow advice)
  const [tab, setTab] = useState("play");

  const upperCapped = Math.min(upperActualFromCard(card), engine.UPPER_THRESHOLD);
  const upperActual = upperActualFromCard(card);
  const gameOver = mask === ALL_MASK;

  const diceComplete = dice.every((d) => d != null);
  const diceValues = diceComplete ? dice.map(Number) : null;
  const diceKey = dice.join(",");

  const advice = useMemo(() => {
    if (!diceValues || gameOver) return null;
    return engine.recommend(mask, upperCapped, elig, diceValues, roll);
  }, [engine, mask, upperCapped, elig, diceValues, roll, gameOver]);

  // Before dice are entered, the expected final from the start of the turn is
  // banked + V(state); once dice are in, it's banked + the roll-conditional EV.
  const stateEV = advice ? advice.stateEV
    : gameOver ? 0 : engine.V(mask, upperCapped, elig);
  const expectedFinal = banked + stateEV;

  // Which dice are being kept. Pre-seeded from the recommended keep when a
  // reroll is advised; the player can tap dice to override. Rerolling keeps
  // exactly these in place and empties the rest for the next roll's entry.
  const recommendedHeld = useMemo(() => {
    if (!diceComplete || !advice || advice.recommendation.action !== "reroll")
      return [false, false, false, false, false];
    return heldPatternFromKeep(dice, advice.recommendation.keep);
  }, [diceComplete, advice, diceKey]);
  const effectiveHeld = heldOverride ?? recommendedHeld;
  const heldCount = effectiveHeld.filter(Boolean).length;

  // Any manual keep-override is cleared whenever the dice change.
  useEffect(() => { setHeldOverride(null); }, [diceKey]);

  const filledCount = dice.filter((d) => d != null).length;
  const typedValue = dice.filter((d) => d != null).join("");

  const compact = (vals) => {
    const n = [null, null, null, null, null];
    vals.slice(0, 5).forEach((v, k) => { n[k] = v; });
    return n;
  };
  const clearDice = () => setDice([null, null, null, null, null]);
  const addDie = (face) => setDice((prev) => {
    const i = prev.indexOf(null);
    if (i === -1) return prev;                      // already 5 dice
    const n = prev.slice(); n[i] = face; return n;
  });
  const removeDie = (i) => setDice((prev) => compact(prev.filter((d, j) => j !== i && d != null)));
  const backspace = () => setDice((prev) => {
    const kept = prev.filter((d) => d != null); kept.pop();
    return compact(kept);
  });
  const onType = (e) => {
    const digits = e.target.value.replace(/[^1-6]/g, "").slice(0, 5).split("").map(Number);
    setDice(compact(digits));
  };
  const toggleHeld = (i) => setHeldOverride((prev) => {
    const base = (prev ?? recommendedHeld).slice();
    base[i] = !base[i];
    return base;
  });
  const canPickHeld = diceComplete && roll < 3 && !!advice;

  // Reroll: keep the held dice (compacted to the front) and empty the rest.
  const doReroll = () => {
    setDice(compact(dice.filter((v, i) => effectiveHeld[i] && v != null)));
    setRoll((r) => r + 1);
    setHeldOverride(null);
    setPicking(false);
  };

  const commitScore = useCallback((cat) => {
    if (!advice) return;
    const opt = advice.scoreOptions.find((o) => o.cat === cat);
    if (!opt) return;
    setCard((prev) => { const n = prev.slice(); n[cat] = opt.points; return n; });
    setBanked((b) => b + opt.reward);
    if (opt.yahtzeeBonus) setYahtzeeBonuses((y) => y + 1);
    setMask(opt.newMask);
    setElig(opt.newElig);
    setTurn((t) => t + 1);
    setRoll(1);
    clearDice();
    setPicking(false);
  }, [advice]);

  const newGame = () => {
    setMask(0); setElig(false); setCard(emptyCard()); setBanked(0);
    setYahtzeeBonuses(0); setTurn(1); setRoll(1); clearDice(); setPicking(false);
  };

  return (
    <div className="wrap">
      <Style />
      <header>
        <h1>🎲 Yahtzee Advisor</h1>
        <p className="sub">Optimal play, full rules. Enter each roll; get the best move and your expected final score.</p>
      </header>

      <nav className="tabs">
        <button type="button" className={"tab" + (tab === "play" ? " active" : "")} onClick={() => setTab("play")}>Play</button>
        <button type="button" className={"tab" + (tab === "how" ? " active" : "")} onClick={() => setTab("how")}>How it works</button>
      </nav>

      {tab === "how" && <HowItWorks initialV={engine.initialV} />}

      {tab === "play" && (<>
      <section className="statbar">
        <Stat label="Score so far" value={banked} />
        <Stat label={gameOver ? "Final score" : "Expected final"} value={gameOver ? banked : expectedFinal.toFixed(1)} big />
        <Stat label="Turn" value={gameOver ? "—" : `${turn} / 13`} />
      </section>

      <section className="upperbar">
        <div className="upperlabel">
          Upper section: <b>{upperActual}</b> / 63
          {upperActual >= 63
            ? <span className="badge good">+35 bonus locked in</span>
            : <span className="muted"> (need {63 - upperActual} more for +35)</span>}
        </div>
        <div className="track"><div className="fill" style={{ width: `${Math.min(100, upperActual / 63 * 100)}%` }} /></div>
        <div className="eligrow">
          {elig
            ? <span className="badge good">Yahtzee bonus active — extra Yahtzees score +100</span>
            : <span className="muted">Yahtzee box not yet scored for 50</span>}
          {yahtzeeBonuses > 0 && <span className="badge">+{yahtzeeBonuses}× Yahtzee bonus earned</span>}
        </div>
      </section>

      {gameOver ? (
        <section className="gameover">
          <h2>Game complete</h2>
          <p className="final">Final score: <b>{banked}</b></p>
          <button className="primary" onClick={newGame}>New game</button>
          <Scorecard card={card} banked={banked} yahtzeeBonuses={yahtzeeBonuses} />
        </section>
      ) : (
        <>
          <section className="turnpanel">
            <div className="rollhead">
              <span className="rollno">Roll {roll} of 3</span>
              {roll < 3 && <span className="muted">— reroll as many times as you like (up to 3 rolls)</span>}
            </div>

            <div className="diceentry">
              <div className="dicerow">
                {dice.map((v, i) => (
                  <Die key={i} value={v} held={canPickHeld && effectiveHeld[i]} onClick={() => removeDie(i)} />
                ))}
              </div>

              {canPickHeld && (
                <div className="keeprow">
                  {effectiveHeld.map((h, i) => (
                    <button key={i} type="button"
                      className={"keeptoggle" + (h ? " on" : "")}
                      onClick={() => toggleHeld(i)}
                      aria-pressed={h}>
                      {h ? "keep" : "reroll"}
                    </button>
                  ))}
                </div>
              )}

              {!diceComplete && (
                <>
                  <div className="palette">
                    {[1, 2, 3, 4, 5, 6].map((f) => (
                      <button key={f} type="button" className="palettedie"
                        onClick={() => addDie(f)} aria-label={`add a ${f}`}>
                        <PipFace value={f} />
                      </button>
                    ))}
                  </div>
                  <div className="entrytools">
                    <input className="typefield" inputMode="numeric" pattern="[1-6]*" maxLength={5}
                      placeholder="or type 66666" value={typedValue} onChange={onType}
                      aria-label="type your five dice" />
                    <button className="ghost small" onClick={backspace} disabled={filledCount === 0}>⌫ undo</button>
                    <button className="ghost small" onClick={clearDice} disabled={filledCount === 0}>clear</button>
                  </div>
                </>
              )}

              <div className="dicehint">
                {!diceComplete
                  ? <span className="muted">Tap a face to add a die (or type the numbers). Tap a placed die to remove it.</span>
                  : <>
                      <span className="muted">
                        {canPickHeld
                          ? "Green = keeping — use the toggles to choose what to reroll. Tap a die to re-enter it."
                          : "Tap a die to re-enter it if needed."}
                      </span>
                      <button className="ghost small" onClick={clearDice}>Clear all</button>
                    </>}
              </div>
            </div>

            {advice && !picking && (
              <RecCard
                advice={advice}
                roll={roll}
                expectedFinal={expectedFinal}
                heldCount={heldCount}
                onReroll={doReroll}
                onScore={() => setPicking(true)}
              />
            )}

            {advice && (picking || advice.mustScore) && (
              <ScoreList
                options={advice.scoreOptions}
                recommendedCat={advice.recommendation.action === "score" ? advice.recommendation.cat : null}
                banked={banked}
                onPick={commitScore}
                onCancel={advice.mustScore ? null : () => setPicking(false)}
              />
            )}
          </section>

          <Scorecard card={card} banked={banked} yahtzeeBonuses={yahtzeeBonuses} />
        </>
      )}

      <footer>
        <button className="ghost small" onClick={newGame}>Restart game</button>
        <span className="muted small">Optimal-play value from the initial state: {engine.initialV.toFixed(2)}</span>
      </footer>
      </>)}
    </div>
  );
}

function HowItWorks({ initialV }) {
  return (
    <section className="explainer">
      <h2>What this is</h2>
      <p>An optimal-play advisor for solitaire Yahtzee. At every point in the game it tells you the
        move that <b>maximises your expected final score</b>, and shows you what that expected score is.</p>

      <h2>Using it</h2>
      <ol>
        <li>Roll your real dice, then enter them. Tap the faces in the palette, or type the numbers.</li>
        <li>You'll see the best move: which dice to <b>keep and reroll</b>, or which <b>box to score</b>,
          along with your expected final score from here.</li>
        <li>Green dice are the ones being kept. Tap the <b>keep / reroll</b> toggles to change them.
          Then <b>Reroll</b> and enter your next roll, or <b>Score a box</b>.</li>
        <li>You never have to follow the advice: enter whatever you actually rolled and pick whichever box
          you actually used. The advice re-computes for your real situation.</li>
      </ol>

      <h2>What "expected final score" means</h2>
      <p>The average total you'd finish with, playing optimally from the current position, across all the
        ways the dice could fall. From the opening roll, optimal play averages
        about <b>{initialV.toFixed(1)}</b> points.</p>

      <h2>How the tool works out the advice</h2>
      <p>Yahtzee is a <a href="https://en.wikipedia.org/wiki/Markov_decision_process" target="_blank" rel="noreferrer">Markov
        decision process</a>, so it can be solved <i>exactly</i> by dynamic programming. Working backwards
        from the end of the game, the solver computes the <b>value</b> of every game state, the best
        expected score achievable from that state onward. A state captures which boxes you've filled, your
        upper-section total, and whether the Yahtzee bonus is live (about a million in all).</p>
      <p>That whole value table is computed once, offline, and shipped with the page (~4&nbsp;MB). When you
        enter a roll, the app runs a fast <b>one-turn lookahead</b>: it weighs every keep-and-reroll across
        your remaining rolls and every box you could fill, scores each against the value table, and picks
        the best. That's why advice is instant and works offline. There's no server.</p>
      <p>It uses the full official rules: the upper-section bonus (+35 at 63), the Yahtzee bonus (+100 per
        extra Yahtzee), and the Joker rule.</p>

      <h2>What the tool does not do</h2>
      <ul>
        <li>It maximises <b>expected score</b>, not your odds of beating a specific target, and not low variance.</li>
        <li>It assumes standard solitaire rules, with no opponents.</li>
      </ul>
    </section>
  );
}

function Stat({ label, value, big }) {
  return (
    <div className={"stat" + (big ? " big" : "")}>
      <div className="statval">{value}</div>
      <div className="statlabel">{label}</div>
    </div>
  );
}

function RecCard({ advice, roll, expectedFinal, heldCount, onReroll, onScore }) {
  const rec = advice.recommendation;
  return (
    <div className="rec">
      <div className="recmain">
        <span className="rectag">Recommended</span>
        {rec.action === "reroll" ? (
          <div className="rectext">
            Keep <b>{facesLabel(rec.keepFaces)}</b>
            {" — reroll the other "}<b>{rec.rerollCount}</b>.
          </div>
        ) : (
          <div className="rectext">
            Score <b>{advice.scoreOptions.find((o) => o.cat === rec.cat)?.points}</b> in{" "}
            <b>{CATEGORY_NAMES[rec.cat]}</b>.
          </div>
        )}
        <div className="recev">Expected final score if you follow this: <b>{expectedFinal.toFixed(1)}</b></div>
      </div>
      {!advice.mustScore && (
        <div className="recactions">
          <button className={rec.action === "reroll" ? "primary" : "ghost"} onClick={onReroll}>
            {heldCount === 5 ? "Reroll — keep all 5 →" : heldCount === 0
              ? "Reroll all 5 →" : `Reroll — keep ${heldCount} →`}
          </button>
          <button className={rec.action === "score" ? "primary" : "ghost"} onClick={onScore}>
            {rec.action === "score" ? "Choose box…" : "Score a box instead…"}
          </button>
        </div>
      )}
    </div>
  );
}

function ScoreList({ options, recommendedCat, banked, onPick, onCancel }) {
  return (
    <div className="scorelist">
      <div className="slhead">
        <span>Pick the box you're scoring{onCancel ? "" : " (must score now)"}:</span>
        {onCancel && <button className="ghost small" onClick={onCancel}>← back</button>}
      </div>
      <ul>
        {options.map((o) => (
          <li key={o.cat}>
            <button className={"scoreopt" + (o.cat === recommendedCat ? " rec" : "")} onClick={() => onPick(o.cat)}>
              <span className="soname">
                {CATEGORY_SHORT[o.cat]}
                {o.cat === recommendedCat && <span className="minitag">best</span>}
                {o.joker && <span className="minitag joker">joker</span>}
              </span>
              <span className="sopts">{o.points} pts{o.crossedBonus ? " +35" : ""}{o.yahtzeeBonus ? " +100" : ""}</span>
              <span className="soev">→ {(banked + o.resultEV).toFixed(1)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="slfoot muted small">"→" shows your expected final score after taking that box.</div>
    </div>
  );
}

function ScoreRow({ card, c }) {
  const filled = card[c] != null;
  return (
    <div className={"scrow" + (filled ? " filled" : "")}>
      <span className="scname">{CATEGORY_NAMES[c]}</span>
      <span className="scval">{filled ? card[c] : "—"}</span>
    </div>
  );
}

function Scorecard({ card, banked, yahtzeeBonuses }) {
  const upperActual = upperActualFromCard(card);
  const gotBonus = upperActual >= 63;
  return (
    <section className="card">
      <h3>Scorecard</h3>
      <div className="cardcols">
        <div className="cardcol">
          <div className="colhead">Upper section</div>
          {[0, 1, 2, 3, 4, 5].map((c) => <ScoreRow key={c} card={card} c={c} />)}
          <div className={"scrow subtotal" + (gotBonus ? " filled" : "")}>
            <span className="scname">Bonus (≥63)</span>
            <span className="scval">{gotBonus ? "+35" : `${upperActual}/63`}</span>
          </div>
        </div>
        <div className="cardcol">
          <div className="colhead">Lower section</div>
          {[6, 7, 8, 9, 10, 11, 12].map((c) => <ScoreRow key={c} card={card} c={c} />)}
          {yahtzeeBonuses > 0 && (
            <div className="scrow subtotal filled">
              <span className="scname">Yahtzee bonus ×{yahtzeeBonuses}</span>
              <span className="scval">+{yahtzeeBonuses * 100}</span>
            </div>
          )}
        </div>
      </div>
      <div className="cardtotal"><span>Total</span><span>{banked}</span></div>
    </section>
  );
}

function Style() {
  return (
    <style>{`
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    .wrap { max-width: 560px; margin: 0 auto; padding: 16px 14px 40px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #e7edf3; background: #0b0f14; min-height: 100vh; }
    header h1 { margin: 4px 0 2px; font-size: 1.5rem; }
    .sub { margin: 0 0 14px; color: #93a1b0; font-size: .82rem; }
    .loading, .err { padding: 40px 0; text-align: center; color: #93a1b0; }
    .err { color: #ff8a8a; }

    .tabs { display: flex; gap: 4px; margin-bottom: 14px; border-bottom: 1px solid #1f2a35; }
    .tab { background: transparent; border: none; border-bottom: 2px solid transparent; border-radius: 0;
      padding: 8px 14px; margin-bottom: -1px; color: #93a1b0; cursor: pointer; font-size: .92rem; }
    .tab:hover { color: #cdd8e2; border-color: transparent; }
    .tab.active { color: #57e2a5; border-bottom-color: #57e2a5; font-weight: 600; }

    .explainer { background: #131a22; border: 1px solid #1f2a35; border-radius: 14px; padding: 14px 18px 18px; margin-bottom: 14px; }
    .explainer h2 { font-size: 1rem; margin: 20px 0 6px; color: #e7edf3; }
    .explainer h2:first-child { margin-top: 4px; }
    .explainer p { margin: 0 0 10px; color: #b9c6d2; font-size: .9rem; line-height: 1.55; }
    .explainer ol, .explainer ul { margin: 0 0 10px; padding-left: 20px; color: #b9c6d2; font-size: .9rem; line-height: 1.55; }
    .explainer li { margin-bottom: 5px; }
    .explainer a { color: #57e2a5; }
    .explainer b { color: #dfe8ef; }

    .statbar { display: flex; gap: 10px; margin-bottom: 12px; }
    .stat { flex: 1; background: #131a22; border: 1px solid #1f2a35; border-radius: 12px;
      padding: 10px 12px; text-align: center; }
    .stat.big { flex: 1.3; background: #10241c; border-color: #1c4a37; }
    .statval { font-size: 1.35rem; font-weight: 700; }
    .stat.big .statval { color: #57e2a5; }
    .statlabel { font-size: .68rem; color: #93a1b0; text-transform: uppercase; letter-spacing: .04em; margin-top: 2px; }

    .upperbar { background: #131a22; border: 1px solid #1f2a35; border-radius: 12px; padding: 10px 12px; margin-bottom: 12px; }
    .upperlabel { font-size: .84rem; }
    .track { height: 7px; background: #1f2a35; border-radius: 6px; margin: 8px 0 6px; overflow: hidden; }
    .fill { height: 100%; background: linear-gradient(90deg,#3a8,#57e2a5); border-radius: 6px; transition: width .3s; }
    .eligrow { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .badge { font-size: .68rem; background: #1f2a35; color: #cfe; padding: 2px 8px; border-radius: 20px; }
    .badge.good { background: #12351f; color: #7fe6a0; }
    .muted { color: #7b8896; font-size: .78rem; }
    .small { font-size: .74rem; }

    .turnpanel { background: #131a22; border: 1px solid #1f2a35; border-radius: 14px; padding: 14px; margin-bottom: 14px; }
    .rollhead { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
    .rollno { font-weight: 700; font-size: 1.05rem; }

    .dicerow { display: flex; gap: 8px; justify-content: center; }
    .diceentry { margin-bottom: 6px; }
    .palette { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 14px; }
    .palettedie { width: 44px; height: 44px; padding: 0; background: #f4f6f8; border: 2px solid #d3dae0;
      border-radius: 10px; cursor: pointer; }
    .palettedie:hover { border-color: #57e2a5; }
    .palettedie:active { transform: scale(0.94); }
    .entrytools { display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap; margin-top: 10px; }
    .typefield { width: 140px; padding: 8px 10px; border-radius: 8px; border: 1px solid #2a3a49;
      background: #0f1720; color: #e7edf3; font: inherit; text-align: center; letter-spacing: .28em; }
    .typefield:focus { outline: none; border-color: #23a06b; }
    .typefield::placeholder { letter-spacing: normal; color: #6b7885; font-size: .82rem; }
    .keeprow { display: flex; gap: 8px; justify-content: center; margin-top: 8px; }
    .keeptoggle { width: 54px; padding: 5px 0; font-size: .58rem; text-transform: uppercase; letter-spacing: .04em;
      border-radius: 8px; border: 1px solid #2a3a49; background: #131c26; color: #8b98a6; cursor: pointer; }
    .keeptoggle:hover { border-color: #3a5163; }
    .keeptoggle.on { background: #12351f; border-color: #23a06b; color: #7fe6a0; font-weight: 700; }
    .dicehint { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; min-height: 24px; margin-top: 10px; }
    .die { width: 54px; height: 54px; background: #f4f6f8; border: 2px solid #d3dae0; border-radius: 11px; padding: 0; cursor: default; }
    .die .pip { width: 8px; height: 8px; }
    .die.tappable { cursor: pointer; }
    .die.tappable:hover { border-color: #57e2a5; }
    .die.held { border-color: #57e2a5; box-shadow: 0 0 0 2px #1c4a37; }
    .pipgrid { display: grid; grid-template-columns: repeat(3,1fr); grid-template-rows: repeat(3,1fr);
      width: 100%; height: 100%; padding: 6px; gap: 2px; }
    .pip { border-radius: 50%; background: transparent; align-self: center; justify-self: center; width: 7px; height: 7px; }
    .pip.on { background: #16202b; }

    .rec { margin-top: 12px; background: #10241c; border: 1px solid #1c4a37; border-radius: 12px; padding: 12px; }
    .rectag { font-size: .66rem; text-transform: uppercase; letter-spacing: .06em; color: #57e2a5; }
    .rectext { font-size: 1.05rem; margin: 4px 0 6px; }
    .recev { font-size: .82rem; color: #b9c6d2; }
    .recactions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }

    button { font: inherit; border-radius: 10px; padding: 9px 14px; border: 1px solid #2a3a49;
      background: #1a2530; color: #e7edf3; cursor: pointer; }
    button:hover { border-color: #3a5163; }
    button.primary { background: #1c8a5a; border-color: #23a06b; color: #fff; font-weight: 600; }
    button.primary:hover { background: #23a06b; }
    button.ghost { background: transparent; }
    .primary { }

    .scorelist { margin-top: 12px; background: #0f1720; border: 1px solid #1f2a35; border-radius: 12px; padding: 10px; }
    .slhead { display: flex; justify-content: space-between; align-items: center; font-size: .86rem; margin-bottom: 8px; }
    .scorelist ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .scoreopt { width: 100%; display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center; text-align: left; }
    .scoreopt.rec { border-color: #23a06b; background: #12281f; }
    .soname { font-weight: 600; }
    .sopts { color: #b9c6d2; font-size: .82rem; }
    .soev { color: #57e2a5; font-weight: 700; font-variant-numeric: tabular-nums; }
    .minitag { font-size: .6rem; margin-left: 6px; padding: 1px 6px; border-radius: 10px; background: #23a06b; color: #fff; text-transform: uppercase; }
    .minitag.joker { background: #7a5cc0; }
    .slfoot { margin-top: 8px; }

    .card { background: #131a22; border: 1px solid #1f2a35; border-radius: 14px; padding: 12px 14px; margin-bottom: 14px; }
    .card h3 { margin: 2px 0 10px; font-size: .95rem; }
    .cardcols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
    .cardcol { display: flex; flex-direction: column; gap: 5px; }
    .colhead { font-size: .66rem; text-transform: uppercase; letter-spacing: .05em; color: #7b8896; margin-bottom: 2px; }
    .scrow { display: flex; justify-content: space-between; align-items: center; gap: 6px; background: #0f1720;
      border: 1px solid #1c2530; border-radius: 8px; padding: 6px 10px; min-height: 34px; }
    .scrow.filled { background: #12281f; border-color: #1c4a37; }
    .scrow.subtotal { background: transparent; border-style: dashed; border-color: #2a3a49; }
    .scrow.subtotal.filled { background: #12281f; border-style: solid; border-color: #1c4a37; }
    .scname { font-size: .76rem; color: #b9c6d2; line-height: 1.15; }
    .scrow.subtotal .scname { color: #9fb0be; }
    .scval { font-weight: 700; font-variant-numeric: tabular-nums; color: #e7edf3; }
    .cardtotal { display: flex; justify-content: space-between; margin-top: 12px; padding-top: 10px;
      border-top: 1px solid #1f2a35; font-weight: 700; font-size: 1.05rem; }
    .cardtotal span:last-child { color: #57e2a5; font-variant-numeric: tabular-nums; }

    .gameover { text-align: center; background: #131a22; border: 1px solid #1f2a35; border-radius: 14px; padding: 20px; margin-bottom: 14px; }
    .gameover .final { font-size: 1.2rem; }
    .gameover .final b { color: #57e2a5; font-size: 1.6rem; }

    footer { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 8px; }
    `}</style>
  );
}

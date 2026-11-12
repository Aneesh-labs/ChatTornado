import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { soundEngine } from "../../../utils/soundEffects";
import HiFiGameShell from "../hiFiSuite/HiFiGameShell";
import { createMancalaState, sowMancalaPit, chooseMancalaAiMove, chooseNimAiMove, checkGomokuWin, chooseGomokuAiMove } from "./megaEngines";
import { getActiveBotTierId } from "../botPersonas";

/* ═══════════════════════════════════════════════════════════════════════════
   21. MANCALA NEXUS v2.0 (Ancient Gem Sowing + Free Extra Turn & Captures)
   ═══════════════════════════════════════════════════════════════════════════ */
export const MancalaNexusGame = ({ onBack, isMuted, onSaveScore }) => {
  const [game, setGame] = useState(() => createMancalaState());
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("mancalanexus_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const playPit = useCallback((idx) => {
    const next = sowMancalaPit(game, idx);
    if (!next) return;
    setGame(next);
    if (next.winner !== null) {
      playFx(next.winner === 0 ? "win" : "boom");
      if (next.winner === 0 && next.pits[6] > highScore) {
        setHighScore(next.pits[6]);
        localStorage.setItem("mancalanexus_highscore", String(next.pits[6]));
        onSaveScore?.("mancalanexus", next.pits[6]);
      }
    } else playFx(next.extraTurn ? "tada" : "coin");
  }, [game, highScore, onSaveScore, playFx]);

  useEffect(() => {
    if (game.turn !== 1 || game.winner !== null) return;
    const t = setTimeout(() => {
      const mv = chooseMancalaAiMove(game, getActiveBotTierId());
      if (mv >= 0) playPit(mv);
    }, 420);
    return () => clearTimeout(t);
  }, [game, playPit]);

  const reset = () => { setGame(createMancalaState()); playFx("whoosh"); };

  return (
    <HiFiGameShell title="Mancala Nexus" badge="v2.0 UPDATED" onBack={onBack} score={game.pits[6]} highScore={highScore} onReset={reset} controlsHint="Tap your bottom pits (0–5) to sow gems counter-clockwise • Land in your right Store for an extra turn!">
      <div className="w-full max-w-lg p-4 rounded-3xl bg-[#071512] border-2 border-emerald-400/35 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="w-16 h-28 rounded-2xl bg-rose-950/50 border border-rose-400/40 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-rose-300">CPU</span>
            <span className="text-2xl font-black text-white">{game.pits[13]}</span>
          </div>
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-6 gap-1.5">
              {[12,11,10,9,8,7].map((idx) => (
                <div key={idx} className="h-12 rounded-xl bg-slate-900 border border-rose-400/25 flex items-center justify-center font-black text-rose-200 text-sm">{game.pits[idx]}</div>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {[0,1,2,3,4,5].map((idx) => (
                <button key={idx} type="button" disabled={game.turn !== 0 || game.pits[idx] === 0} onClick={() => playPit(idx)} className="h-12 rounded-xl bg-emerald-500/20 hover:bg-emerald-400/40 border border-emerald-400/50 flex items-center justify-center font-black text-emerald-100 text-sm disabled:opacity-40 cursor-pointer">
                  {game.pits[idx]}
                </button>
              ))}
            </div>
          </div>
          <div className="w-16 h-28 rounded-2xl bg-emerald-950/60 border border-emerald-400/50 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-emerald-300">YOU</span>
            <span className="text-2xl font-black text-white">{game.pits[6]}</span>
          </div>
        </div>
        {game.winner !== null && (
          <div className="text-center text-sm font-black text-amber-300">
            {game.winner === 0 ? "🏆 You Win!" : game.winner === 1 ? "CPU Wins!" : "Draw!"} ({game.pits[6]} vs {game.pits[13]})
          </div>
        )}
      </div>
    </HiFiGameShell>
  );
};
MancalaNexusGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   22. NIM PILE DUEL v2.0 (XOR Nim-Sum Strategy Duel)
   ═══════════════════════════════════════════════════════════════════════════ */
export const NimCyberGame = ({ onBack, isMuted, onSaveScore }) => {
  const [piles, setPiles] = useState([3, 5, 7]);
  const [turn, setTurn] = useState(0); // 0 human, 1 AI
  const [winner, setWinner] = useState(null);
  const [wins, setWins] = useState(() => Number(localStorage.getItem("nimcyber_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const takeTokens = useCallback((pileIdx, removeCount) => {
    const next = [...piles];
    next[pileIdx] -= removeCount;
    setPiles(next);
    if (next.every((v) => v === 0)) {
      setWinner(turn);
      playFx(turn === 0 ? "win" : "boom");
      if (turn === 0) {
        const sc = wins + 100;
        setWins(sc);
        localStorage.setItem("nimcyber_highscore", String(sc));
        onSaveScore?.("nimcyber", sc);
      }
      return;
    }
    playFx("laser");
    setTurn((t) => (t === 0 ? 1 : 0));
  }, [onSaveScore, piles, playFx, turn, wins]);

  useEffect(() => {
    if (turn !== 1 || winner !== null) return;
    const t = setTimeout(() => {
      const mv = chooseNimAiMove(piles, getActiveBotTierId());
      if (mv) takeTokens(mv.pile, mv.remove);
    }, 350);
    return () => clearTimeout(t);
  }, [piles, takeTokens, turn, winner]);

  const reset = () => { setPiles([3, 5, 7]); setTurn(0); setWinner(null); playFx("whoosh"); };

  return (
    <HiFiGameShell title="Nim Pile Duel" badge="v2.0 UPDATED" onBack={onBack} score={wins} highScore={wins} onReset={reset} controlsHint="Tap any token in a row to remove that token and all tokens to its right • Player taking the last token wins!">
      <div className="p-5 rounded-3xl bg-[#07101f] border-2 border-amber-400/35 w-full max-w-md space-y-3">
        {piles.map((count, pIdx) => (
          <div key={pIdx} className="flex items-center justify-center gap-2 min-h-[42px]">
            {Array.from({ length: count }, (_, idx) => (
              <button key={idx} type="button" disabled={turn !== 0 || winner !== null} onClick={() => takeTokens(pIdx, count - idx)} className="w-8 h-8 rounded-full bg-amber-400 hover:bg-rose-400 border-2 border-white shadow cursor-pointer disabled:opacity-45" />
            ))}
          </div>
        ))}
        {winner !== null && <div className="text-center text-sm font-black text-emerald-300">{winner === 0 ? "🏆 You took the final token!" : "AI Out-XOR'd You!"}</div>}
      </div>
    </HiFiGameShell>
  );
};
NimCyberGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   23. HEX TERRITORY v2.0 (6x6 Staggered Path Connection vs AI)
   ═══════════════════════════════════════════════════════════════════════════ */
export const HexTacticsGame = ({ onBack, isMuted, onSaveScore }) => {
  const N = 6;
  const [board, setBoard] = useState(() => Array.from({ length: N }, () => Array(N).fill(0)));
  const [winner, setWinner] = useState(0);
  const [wins, setWins] = useState(() => Number(localStorage.getItem("hextactics_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const hasPath = (b, player) => {
    const seen = new Set();
    const q = [];
    for (let i = 0; i < N; i++) {
      if (player === 1 && b[0][i] === 1) { q.push([0, i]); seen.add(`0-${i}`); }
      if (player === 2 && b[i][0] === 2) { q.push([i, 0]); seen.add(`${i}-0`); }
    }
    const hexDirs = [[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0]];
    while (q.length > 0) {
      const [r, c] = q.shift();
      if ((player === 1 && r === N - 1) || (player === 2 && c === N - 1)) return true;
      for (const [dr, dc] of hexDirs) {
        const nr = r + dr; const nc = c + dc;
        const k = `${nr}-${nc}`;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N && !seen.has(k) && b[nr][nc] === player) {
          seen.add(k); q.push([nr, nc]);
        }
      }
    }
    return false;
  };

  const playCell = (r, c) => {
    if (winner || board[r][c] !== 0) return;
    const b1 = board.map((row) => [...row]);
    b1[r][c] = 1;
    if (hasPath(b1, 1)) {
      setBoard(b1); setWinner(1); playFx("win");
      const sc = wins + 150; setWins(sc); localStorage.setItem("hextactics_highscore", String(sc)); onSaveScore?.("hextactics", sc);
      return;
    }
    // AI greedy center/bridge response
    const empties = [];
    for (let ir = 0; ir < N; ir++) for (let ic = 0; ic < N; ic++) if (b1[ir][ic] === 0) empties.push([ir, ic]);
    if (empties.length > 0) {
      empties.sort((a, b) => (Math.abs(a[0] - 2.5) + Math.abs(a[1] - 2.5)) - (Math.abs(b[0] - 2.5) + Math.abs(b[1] - 2.5)));
      const [ar, ac] = empties[Math.floor(Math.random() * Math.min(3, empties.length))];
      b1[ar][ac] = 2;
      if (hasPath(b1, 2)) { setBoard(b1); setWinner(2); playFx("boom"); return; }
    }
    setBoard(b1);
    playFx("coin");
  };

  const reset = () => { setBoard(Array.from({ length: N }, () => Array(N).fill(0))); setWinner(0); playFx("whoosh"); };

  return (
    <HiFiGameShell title="Hex Territory" badge="v2.0 UPDATED" onBack={onBack} score={wins} highScore={wins} onReset={reset} controlsHint="Connect Cyan Top ↔ Bottom before Crimson AI connects Left ↔ Right!">
      <div className="p-4 rounded-3xl bg-[#07101f] border-2 border-cyan-400/35 space-y-1.5 overflow-x-auto max-w-full">
        {board.map((row, r) => (
          <div key={r} className="flex gap-1.5" style={{ paddingLeft: `${r * 14}px` }}>
            {row.map((v, c) => (
              <button key={c} type="button" onClick={() => playCell(r, c)} className={`w-9 h-9 rounded-lg border cursor-pointer ${v === 1 ? "bg-cyan-400 border-white" : v === 2 ? "bg-rose-500 border-rose-200" : "bg-slate-900 hover:bg-white/15 border-white/15"}`} />
            ))}
          </div>
        ))}
        {winner > 0 && <div className="text-center pt-2 text-sm font-black text-amber-300">{winner === 1 ? "🏆 Cyan Connected Top-to-Bottom!" : "Crimson Bridged Left-to-Right!"}</div>}
      </div>
    </HiFiGameShell>
  );
};
HexTacticsGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   24. CYBER 21 (BLACKJACK) v2.0
   ═══════════════════════════════════════════════════════════════════════════ */
const drawCard = () => {
  const ranks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
  const suits = ["♠","♥","♦","♣"];
  const r = ranks[Math.floor(Math.random() * ranks.length)];
  const s = suits[Math.floor(Math.random() * suits.length)];
  const val = r === "A" ? 11 : ["J","Q","K"].includes(r) ? 10 : Number(r);
  return { r, s, val, red: s === "♥" || s === "♦" };
};
const handTotal = (hand) => {
  let sum = hand.reduce((a, c) => a + c.val, 0);
  let aces = hand.filter((c) => c.r === "A").length;
  while (sum > 21 && aces > 0) { sum -= 10; aces -= 1; }
  return sum;
};

export const Blackjack21Game = ({ onBack, isMuted, onSaveScore }) => {
  const [chips, setChips] = useState(500);
  const [player, setPlayer] = useState(() => [drawCard(), drawCard()]);
  const [dealer, setDealer] = useState(() => [drawCard(), drawCard()]);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("Hit or Stand");
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("blackjack21_highscore") || 500));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const settle = (pHand, dHand, bet = 50) => {
    const pt = handTotal(pHand);
    const dt = handTotal(dHand);
    let nextChips = chips;
    if (pt > 21) { nextChips -= bet; setMsg("Bust! Dealer Wins"); playFx("boom"); }
    else if (dt > 21 || pt > dt) { nextChips += bet; setMsg("🏆 You Win!"); playFx("win"); }
    else if (pt === dt) { setMsg("Push (Tie)"); playFx("coin"); }
    else { nextChips -= bet; setMsg("Dealer Wins"); playFx("boom"); }
    const clamped = Math.max(50, nextChips);
    setChips(clamped);
    if (clamped > highScore) { setHighScore(clamped); localStorage.setItem("blackjack21_highscore", String(clamped)); onSaveScore?.("blackjack21", clamped); }
    setDone(true);
  };

  const hit = () => {
    if (done) return;
    const next = [...player, drawCard()];
    setPlayer(next);
    playFx("laser");
    if (handTotal(next) > 21) settle(next, dealer);
  };

  const stand = (bet = 50) => {
    if (done) return;
    const d = [...dealer];
    while (handTotal(d) < 17) d.push(drawCard());
    setDealer(d);
    settle(player, d, bet);
  };

  const dealNew = () => { setPlayer([drawCard(), drawCard()]); setDealer([drawCard(), drawCard()]); setDone(false); setMsg("Hit or Stand"); playFx("whoosh"); };

  const renderCard = (c, idx) => (
    <div key={idx} className={`w-14 h-20 rounded-xl bg-white border-2 border-slate-300 flex flex-col items-center justify-center font-black shadow-lg ${c.red ? "text-rose-600" : "text-slate-900"}`}>
      <span className="text-base">{c.r}</span>
      <span className="text-lg">{c.s}</span>
    </div>
  );

  return (
    <HiFiGameShell title="Cyber 21" badge="v2.0 UPDATED" onBack={onBack} score={chips} highScore={highScore} onReset={dealNew} controlsHint="Reach 21 without busting • Dealer stands on 17">
      <div className="p-5 rounded-3xl bg-[#051d14] border-2 border-emerald-400/35 w-full max-w-md space-y-4 text-center">
        <div>
          <div className="text-xs font-bold text-emerald-300 mb-2">Dealer ({done ? handTotal(dealer) : "?"})</div>
          <div className="flex justify-center gap-2">{done ? dealer.map(renderCard) : <>{renderCard(dealer[0], 0)}<div className="w-14 h-20 rounded-xl bg-slate-800 border-2 border-emerald-400/40 flex items-center justify-center text-emerald-300 font-black">?</div></>}</div>
        </div>
        <div>
          <div className="text-xs font-bold text-amber-300 mb-2">You ({handTotal(player)})</div>
          <div className="flex justify-center gap-2">{player.map(renderCard)}</div>
        </div>
        <div className="text-sm font-black text-white">{msg}</div>
        <div className="flex justify-center gap-2">
          {!done ? (
            <>
              <button type="button" onClick={hit} className="px-5 py-2 rounded-xl bg-emerald-400 text-black font-black text-xs cursor-pointer">Hit</button>
              <button type="button" onClick={() => stand(50)} className="px-5 py-2 rounded-xl bg-amber-400 text-black font-black text-xs cursor-pointer">Stand</button>
              <button type="button" onClick={() => { const p2 = [...player, drawCard()]; setPlayer(p2); if (handTotal(p2) > 21) settle(p2, dealer, 100); else { const d = [...dealer]; while (handTotal(d) < 17) d.push(drawCard()); setDealer(d); settle(p2, d, 100); } }} className="px-4 py-2 rounded-xl bg-purple-400 text-black font-black text-xs cursor-pointer">2× Double</button>
            </>
          ) : (
            <button type="button" onClick={dealNew} className="px-6 py-2.5 rounded-xl bg-emerald-400 text-black font-black text-xs cursor-pointer">Deal Next Hand</button>
          )}
        </div>
      </div>
    </HiFiGameShell>
  );
};
Blackjack21Game.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   25. FIVE-IN-A-ROW GOMOKU v2.0 (11x11 Threat-Scoring AI)
   ═══════════════════════════════════════════════════════════════════════════ */
export const GomokuFiveGame = ({ onBack, isMuted, onSaveScore }) => {
  const N = 11;
  const [grid, setGrid] = useState(() => Array.from({ length: N }, () => Array(N).fill(0)));
  const [winner, setWinner] = useState(0);
  const [wins, setWins] = useState(() => Number(localStorage.getItem("gomoku_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const place = (r, c) => {
    if (winner || grid[r][c] !== 0) return;
    const g = grid.map((row) => [...row]);
    g[r][c] = 1;
    const w1 = checkGomokuWin(g, N);
    if (w1) {
      setGrid(g); setWinner(1); playFx("win");
      const sc = wins + 200; setWins(sc); localStorage.setItem("gomoku_highscore", String(sc)); onSaveScore?.("gomoku", sc);
      return;
    }
    const [ar, ac] = chooseGomokuAiMove(g, 2, getActiveBotTierId());
    g[ar][ac] = 2;
    const w2 = checkGomokuWin(g, N);
    if (w2) { setGrid(g); setWinner(2); playFx("boom"); return; }
    setGrid(g);
    playFx("coin");
  };

  const reset = () => { setGrid(Array.from({ length: N }, () => Array(N).fill(0))); setWinner(0); playFx("whoosh"); };

  return (
    <HiFiGameShell title="Five-in-a-Row Gomoku" badge="v2.0 UPDATED" onBack={onBack} score={wins} highScore={wins} onReset={reset} controlsHint="Connect 5 Emerald stones in a row (any angle) on the 11×11 grid against Threat-Scoring AI">
      <div className="grid grid-cols-11 gap-1 p-2.5 rounded-2xl bg-[#07101f] border-2 border-emerald-400/35 w-full max-w-[420px] aspect-square">
        {grid.map((row, r) => row.map((v, c) => (
          <button key={`${r}-${c}`} type="button" onClick={() => place(r, c)} className={`rounded-full border cursor-pointer ${v === 1 ? "bg-emerald-400 border-white" : v === 2 ? "bg-rose-500 border-rose-200" : "bg-slate-900/70 hover:bg-white/15 border-white/10"}`} />
        )))}
      </div>
      {winner > 0 && <div className="text-sm font-black text-amber-300">{winner === 1 ? "🏆 5-in-a-Row Victory!" : "AI Connected 5!"}</div>}
    </HiFiGameShell>
  );
};
GomokuFiveGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { Crown, RotateCcw } from "lucide-react";
import { soundEngine } from "../../../utils/soundEffects";
import HiFiGameShell from "./HiFiGameShell";
import {
  createCheckersState,
  getCheckersLegalMoves,
  applyCheckersMove,
  chooseCheckersAiMove,
  C4_ROWS,
  C4_COLS,
  createConnect4State,
  dropConnect4Disc,
  chooseConnect4AiMove,
  createReversiState,
  getReversiValidMoves,
  countReversiDiscs,
  applyReversiMove,
  chooseReversiAiMove,
  NAVAL_SHIPS,
  createRandomNavalGrid,
  chooseNavalAiTarget,
} from "../hiFiEngines";

/* ═══════════════════════════════════════════════════════════════════════════
   4. CROWN CHECKERS v2.0 (Forced Captures, Multi-Jump & Depth-4 Alpha-Beta)
   ═══════════════════════════════════════════════════════════════════════════ */
export const CheckersV2Game = ({ onBack, isMuted, onSaveScore }) => {
  const [game, setGame] = useState(() => createCheckersState());
  const [mode, setMode] = useState("ai"); // ai | pvp
  const [selected, setSelected] = useState(null);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("crowncheckers_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const legalMoves = useMemo(() => getCheckersLegalMoves(game, game.turn), [game]);
  const movesFromSelected = useMemo(() => {
    const src = game.mustContinueFrom || selected;
    if (!src) return [];
    return legalMoves.filter((m) => m.from[0] === src[0] && m.from[1] === src[1]);
  }, [game.mustContinueFrom, legalMoves, selected]);

  const reset = useCallback((nextMode = mode) => {
    setMode(nextMode);
    setGame(createCheckersState());
    setSelected(null);
    playFx("whoosh");
  }, [mode, playFx]);

  const performMove = useCallback((mv) => {
    const next = applyCheckersMove(game, mv);
    setGame(next);
    setSelected(next.mustContinueFrom || null);
    if (next.winner) {
      playFx(next.winner === "w" ? "win" : "boom");
      if (mode === "ai" && next.winner === "w") {
        const sc = highScore + 150;
        setHighScore(sc);
        localStorage.setItem("crowncheckers_highscore", String(sc));
        onSaveScore?.("crowncheckers", sc);
      }
    } else if (mv.capture) playFx("coin");
    else playFx("laser");
  }, [game, highScore, mode, onSaveScore, playFx]);

  useEffect(() => {
    if (mode !== "ai" || game.turn !== "b" || game.winner) return;
    const t = setTimeout(() => {
      const mv = chooseCheckersAiMove(game, "b", 4);
      if (mv) performMove(mv);
    }, 220);
    return () => clearTimeout(t);
  }, [game, mode, performMove]);

  const handleSqClick = (r, c) => {
    if (game.winner || (mode === "ai" && game.turn === "b")) return;
    const match = movesFromSelected.find((m) => m.to[0] === r && m.to[1] === c);
    if (match) { performMove(match); return; }
    if (game.mustContinueFrom) return;
    const p = game.board[r][c];
    if (p && p.color === game.turn) setSelected([r, c]);
    else setSelected(null);
  };

  return (
    <HiFiGameShell
      title="Crown Checkers"
      badge="v2.0 UPDATED"
      badgeTone="bg-emerald-500/20 border-emerald-400/50 text-emerald-200"
      onBack={onBack}
      score={game.movesCount * 10}
      highScore={highScore}
      onReset={() => reset(mode)}
      controlsHint="Forced capture active • Jumps chain automatically • Kings move in all 4 diagonals"
      extraHeader={
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <button type="button" onClick={() => reset("ai")} className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${mode === "ai" ? "bg-emerald-400 text-black" : "text-white/70"}`}>vs AI</button>
          <button type="button" onClick={() => reset("pvp")} className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${mode === "pvp" ? "bg-emerald-400 text-black" : "text-white/70"}`}>2P Local</button>
        </div>
      }
    >
      <div className="relative w-full max-w-[420px] aspect-square grid grid-cols-8 grid-rows-8 rounded-2xl overflow-hidden border-2 border-emerald-400/35 shadow-2xl">
        {game.board.map((row, r) => row.map((cell, c) => {
          const dark = (r + c) % 2 === 1;
          const isSel = (game.mustContinueFrom || selected)?.[0] === r && (game.mustContinueFrom || selected)?.[1] === c;
          const isTarget = movesFromSelected.some((m) => m.to[0] === r && m.to[1] === c);
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              onClick={() => handleSqClick(r, c)}
              className={`relative flex items-center justify-center cursor-pointer ${
                isSel ? "bg-emerald-500/55" : isTarget ? "bg-amber-400/30" : dark ? "bg-[#061814]" : "bg-emerald-950/30"
              }`}
            >
              {cell && (
                <div className={`w-4/5 h-4/5 rounded-full border-2 flex items-center justify-center shadow-md ${
                  cell.color === "w"
                    ? "bg-gradient-to-br from-emerald-300 to-teal-500 border-white text-slate-950"
                    : "bg-gradient-to-br from-rose-500 to-red-700 border-rose-200 text-white"
                }`}>
                  {cell.king && <Crown className="w-4 h-4" />}
                </div>
              )}
              {isTarget && !cell && <span className="w-3.5 h-3.5 rounded-full bg-amber-300 shadow-[0_0_8px_#fbbf24]" />}
            </button>
          );
        }))}
        {game.winner && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-3">
            <h3 className="text-2xl font-black text-white">{game.winner === "w" ? "Emerald Wins!" : "Crimson Wins!"}</h3>
            <button type="button" onClick={() => reset(mode)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-400 text-black font-black text-sm cursor-pointer">
              <RotateCcw className="h-4 w-4" /> New Match
            </button>
          </div>
        )}
      </div>
    </HiFiGameShell>
  );
};
CheckersV2Game.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   5. QUANTUM CONNECT FOUR (Depth-5 Alpha-Beta Solver + 2P Mode)
   ═══════════════════════════════════════════════════════════════════════════ */
export const ConnectFourGame = ({ onBack, isMuted, onSaveScore }) => {
  const [game, setGame] = useState(() => createConnect4State());
  const [mode, setMode] = useState("ai");
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("connect4_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const reset = useCallback((nextMode = mode) => {
    setMode(nextMode);
    setGame(createConnect4State());
    playFx("whoosh");
  }, [mode, playFx]);

  const dropInCol = useCallback((col) => {
    const next = dropConnect4Disc(game, col);
    if (!next) return;
    setGame(next);
    if (next.winner === 1) {
      playFx("win");
      if (mode === "ai") {
        const sc = highScore + 150;
        setHighScore(sc);
        localStorage.setItem("connect4_highscore", String(sc));
        onSaveScore?.("connect4", sc);
      }
    } else if (next.winner) playFx("boom");
    else playFx("coin");
  }, [game, highScore, mode, onSaveScore, playFx]);

  useEffect(() => {
    if (mode !== "ai" || game.turn !== 2 || game.winner) return;
    const t = setTimeout(() => {
      const col = chooseConnect4AiMove(game, 2, 5);
      if (col >= 0) dropInCol(col);
    }, 200);
    return () => clearTimeout(t);
  }, [dropInCol, game, mode]);

  const isWinCell = (r, c) => Boolean(game.winLine?.some(([wr, wc]) => wr === r && wc === c));

  return (
    <HiFiGameShell
      title="Quantum Connect 4"
      badge="NEW • ALPHA-BETA"
      badgeTone="bg-sky-500/20 border-sky-400/50 text-sky-200"
      onBack={onBack}
      score={game.moves * 15}
      highScore={highScore}
      onReset={() => reset(mode)}
      controlsHint="Tap any column to drop your disc • Connect 4 horizontally, vertically, or diagonally"
      extraHeader={
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <button type="button" onClick={() => reset("ai")} className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${mode === "ai" ? "bg-sky-400 text-black" : "text-white/70"}`}>vs AI</button>
          <button type="button" onClick={() => reset("pvp")} className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${mode === "pvp" ? "bg-sky-400 text-black" : "text-white/70"}`}>2P Local</button>
        </div>
      }
    >
      <div className="relative w-full max-w-[440px] p-3 rounded-3xl bg-sky-950/70 border-2 border-sky-400/35 shadow-2xl">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: C4_ROWS }, (_, r) =>
            Array.from({ length: C4_COLS }, (__, c) => {
              const val = game.grid[r][c];
              const win = isWinCell(r, c);
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  disabled={Boolean(game.winner) || (mode === "ai" && game.turn === 2)}
                  onClick={() => dropInCol(c)}
                  className={`aspect-square rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                    val === 1
                      ? "bg-amber-400 border-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.55)]"
                      : val === 2
                      ? "bg-rose-500 border-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.55)]"
                      : "bg-[#050b16] border-white/10 hover:border-sky-300/50"
                  } ${win ? "ring-4 ring-white scale-105" : ""}`}
                />
              );
            })
          )}
        </div>
        {game.winner !== 0 && (
          <div className="mt-3 flex items-center justify-between px-4 py-3 rounded-2xl bg-black/75 border border-white/15">
            <span className="text-sm font-black text-white">
              {game.winner === "draw" ? "Draw!" : game.winner === 1 ? "Gold Wins!" : mode === "ai" ? "AI Wins!" : "Crimson Wins!"}
            </span>
            <button type="button" onClick={() => reset(mode)} className="px-4 py-1.5 rounded-xl bg-sky-400 text-black font-black text-xs cursor-pointer">
              Play Again
            </button>
          </div>
        )}
      </div>
    </HiFiGameShell>
  );
};
ConnectFourGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   6. ECLIPSE REVERSI / OTHELLO (Corner-Weighted AI + Legal Flip Hints)
   ═══════════════════════════════════════════════════════════════════════════ */
export const ReversiEclipseGame = ({ onBack, isMuted, onSaveScore }) => {
  const [game, setGame] = useState(() => createReversiState());
  const [mode, setMode] = useState("ai");
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("reversi_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const counts = useMemo(() => countReversiDiscs(game.board), [game.board]);
  const validMoves = useMemo(() => getReversiValidMoves(game.board, game.turn), [game.board, game.turn]);

  const reset = useCallback((nextMode = mode) => {
    setMode(nextMode);
    setGame(createReversiState());
    playFx("whoosh");
  }, [mode, playFx]);

  const playMove = useCallback((mv) => {
    const next = applyReversiMove(game, mv);
    setGame(next);
    if (next.winner) {
      playFx(next.winner === 1 ? "win" : "boom");
      const c = countReversiDiscs(next.board);
      if (mode === "ai" && next.winner === 1 && c.dark > highScore) {
        setHighScore(c.dark);
        localStorage.setItem("reversi_highscore", String(c.dark));
        onSaveScore?.("reversi", c.dark);
      }
    } else playFx("coin");
  }, [game, highScore, mode, onSaveScore, playFx]);

  useEffect(() => {
    if (mode !== "ai" || game.turn !== 2 || game.winner) return;
    const t = setTimeout(() => {
      const mv = chooseReversiAiMove(game, 2);
      if (mv) playMove(mv);
    }, 240);
    return () => clearTimeout(t);
  }, [game, mode, playMove]);

  return (
    <HiFiGameShell
      title="Eclipse Reversi"
      badge="NEW • STRATEGY"
      badgeTone="bg-teal-500/20 border-teal-400/50 text-teal-200"
      onBack={onBack}
      score={counts.dark}
      highScore={highScore}
      onReset={() => reset(mode)}
      controlsHint="Numbers on glowing cells show how many enemy discs will flip • Secure corners early!"
      extraHeader={
        <div className="flex gap-2 items-center">
          <span className="text-xs font-bold text-teal-300">Obsidian {counts.dark} : {counts.light} Light</span>
          <button type="button" onClick={() => reset(mode === "ai" ? "pvp" : "ai")} className="px-2.5 py-1 rounded-lg bg-teal-400/20 border border-teal-400/40 text-xs font-bold text-teal-200 cursor-pointer">
            {mode === "ai" ? "vs AI" : "2P Local"}
          </button>
        </div>
      }
    >
      <div className="relative w-full max-w-[420px] aspect-square grid grid-cols-8 grid-rows-8 gap-1 p-2 rounded-2xl bg-[#041b17] border-2 border-teal-400/35 shadow-2xl">
        {game.board.map((row, r) => row.map((v, c) => {
          const hint = (mode === "pvp" || game.turn === 1) ? validMoves.find((m) => m.r === r && m.c === c) : null;
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              onClick={() => hint && playMove(hint)}
              className={`rounded-lg flex items-center justify-center relative transition-colors ${
                hint ? "bg-teal-500/20 hover:bg-teal-400/35 cursor-pointer border border-teal-300/40" : "bg-[#082c25]"
              }`}
            >
              {v !== 0 && (
                <div className={`w-4/5 h-4/5 rounded-full transition-all shadow-md ${
                  v === 1 ? "bg-slate-950 border-2 border-teal-300" : "bg-white border-2 border-slate-300"
                }`} />
              )}
              {hint && !v && <span className="text-xs font-black text-teal-200">+{hint.flips.length}</span>}
            </button>
          );
        }))}
        {game.winner !== 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-3">
            <h3 className="text-2xl font-black text-white">
              {game.winner === "draw" ? "Tie Game!" : game.winner === 1 ? "Obsidian Wins!" : "Light Wins!"}
            </h3>
            <p className="text-xs text-white/75">{counts.dark} vs {counts.light}</p>
            <button type="button" onClick={() => reset(mode)} className="px-6 py-2.5 rounded-xl bg-teal-400 text-black font-black text-sm cursor-pointer">
              Play Again
            </button>
          </div>
        )}
      </div>
    </HiFiGameShell>
  );
};
ReversiEclipseGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   7. AEGIS NAVAL SONAR (Hunt-and-Target Battleship Radar)
   ═══════════════════════════════════════════════════════════════════════════ */
export const NavalSonarGame = ({ onBack, isMuted, onSaveScore }) => {
  const [enemy, setEnemy] = useState(() => createRandomNavalGrid(8));
  const [player, setPlayer] = useState(() => createRandomNavalGrid(8));
  const [winner, setWinner] = useState(null);
  const [shotsFired, setShotsFired] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("navalsonar_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const reset = () => {
    setEnemy(createRandomNavalGrid(8));
    setPlayer(createRandomNavalGrid(8));
    setWinner(null);
    setShotsFired(0);
    playFx("whoosh");
  };

  const countHitsNeeded = NAVAL_SHIPS.reduce((s, sh) => s + sh.len, 0);

  const countTotalHits = (shots) => shots.flat().filter((v) => v === 2).length;

  const fireAtEnemy = (r, c) => {
    if (winner || enemy.shots[r][c] !== 0) return;
    const nextShots = enemy.shots.map((row) => [...row]);
    const isHit = Boolean(enemy.grid[r][c]);
    nextShots[r][c] = isHit ? 2 : 1;
    const nextEnemy = { ...enemy, shots: nextShots };
    setEnemy(nextEnemy);
    setShotsFired((n) => n + 1);
    playFx(isHit ? "coin" : "laser");

    if (countTotalHits(nextShots) >= countHitsNeeded) {
      setWinner("player");
      playFx("win");
      const pts = Math.max(100, 1000 - shotsFired * 12);
      if (pts > highScore) {
        setHighScore(pts);
        localStorage.setItem("navalsonar_highscore", String(pts));
        onSaveScore?.("navalsonar", pts);
      }
      return;
    }

    // AI counter-salvo
    setTimeout(() => {
      setPlayer((prev) => {
        const [ar, ac] = chooseNavalAiTarget(prev.shots);
        const pShots = prev.shots.map((row) => [...row]);
        const pHit = Boolean(prev.grid[ar][ac]);
        pShots[ar][ac] = pHit ? 2 : 1;
        if (countTotalHits(pShots) >= countHitsNeeded) {
          setWinner("ai");
          playFx("boom");
        }
        return { ...prev, shots: pShots };
      });
    }, 150);
  };

  return (
    <HiFiGameShell
      title="Aegis Naval Sonar"
      badge="NEW • RADAR DUEL"
      badgeTone="bg-lime-500/20 border-lime-400/50 text-lime-200"
      onBack={onBack}
      score={countTotalHits(enemy.shots) * 60}
      highScore={highScore}
      onReset={reset}
      controlsHint="Tap Enemy Sonar cells to strike • Orange = Direct Hit • Grey Dot = Splash Miss"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <div className="p-3 rounded-2xl bg-[#04140f] border border-lime-400/35 space-y-2">
          <div className="flex justify-between text-xs font-extrabold text-lime-300">
            <span>ENEMY WATERS (TAP TO FIRE)</span>
            <span>Hits {countTotalHits(enemy.shots)}/{countHitsNeeded}</span>
          </div>
          <div className="grid grid-cols-8 gap-1 aspect-square">
            {enemy.shots.map((row, r) => row.map((v, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => fireAtEnemy(r, c)}
                className={`rounded-md border text-xs font-black flex items-center justify-center cursor-pointer ${
                  v === 2 ? "bg-rose-500/80 border-rose-200 text-white" : v === 1 ? "bg-slate-800 border-white/10 text-white/40" : "bg-lime-950/40 hover:bg-lime-500/25 border-lime-500/25"
                }`}
              >
                {v === 2 ? "✕" : v === 1 ? "•" : ""}
              </button>
            )))}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-[#04101a] border border-cyan-400/30 space-y-2">
          <div className="flex justify-between text-xs font-extrabold text-cyan-300">
            <span>YOUR FLEET SECTOR</span>
            <span>Damage {countTotalHits(player.shots)}/{countHitsNeeded}</span>
          </div>
          <div className="grid grid-cols-8 gap-1 aspect-square">
            {player.grid.map((row, r) => row.map((shipId, c) => {
              const shot = player.shots[r][c];
              return (
                <div
                  key={`${r}-${c}`}
                  className={`rounded-md border text-xs font-black flex items-center justify-center ${
                    shot === 2 ? "bg-rose-600 border-rose-300 text-white" : shipId ? "bg-cyan-500/35 border-cyan-300/60" : shot === 1 ? "bg-slate-800 border-white/10 text-white/35" : "bg-slate-950/60 border-white/10"
                  }`}
                >
                  {shot === 2 ? "💥" : shot === 1 ? "•" : ""}
                </div>
              );
            }))}
          </div>
        </div>
      </div>
      {winner && (
        <div className="px-6 py-4 rounded-2xl bg-black/80 border border-lime-400/40 flex items-center gap-4">
          <span className="text-lg font-black text-white">{winner === "player" ? "🏆 Enemy Fleet Sunk!" : "💥 Your Fleet Lost!"}</span>
          <button type="button" onClick={reset} className="px-4 py-2 rounded-xl bg-lime-400 text-black font-black text-xs cursor-pointer">New Engagement</button>
        </div>
      )}
    </HiFiGameShell>
  );
};
NavalSonarGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { RotateCcw, Undo2 } from "lucide-react";
import { soundEngine } from "../../../utils/soundEffects";
import HiFiGameShell from "../hiFiSuite/HiFiGameShell";
import {
  getRotatedPorts,
  traceCircuitPower,
  computeNonogramClues,
  toggleLightsCell,
  createSolvableLightsBoard,
  createSolvableSlide15,
} from "./megaEngines";

/* ═══════════════════════════════════════════════════════════════════════════
   11. CIRCUIT LINK v2.0 (BFS Power Conduit Rotation Puzzle)
   ═══════════════════════════════════════════════════════════════════════════ */
const makeCircuitBoard = () => {
  const layout = [
    [{ kind: "L", rot: 1 }, { kind: "I", rot: 1 }, { kind: "L", rot: 2 }, { kind: "T", rot: 0 }, { kind: "L", rot: 2 }],
    [{ kind: "I", rot: 0 }, { kind: "L", rot: 1 }, { kind: "T", rot: 2 }, { kind: "I", rot: 0 }, { kind: "I", rot: 0 }],
    [{ kind: "L", rot: 0 }, { kind: "I", rot: 1 }, { kind: "L", rot: 3 }, { kind: "L", rot: 0 }, { kind: "T", rot: 3 }],
    [{ kind: "T", rot: 1 }, { kind: "I", rot: 1 }, { kind: "L", rot: 2 }, { kind: "T", rot: 1 }, { kind: "I", rot: 0 }],
    [{ kind: "L", rot: 0 }, { kind: "I", rot: 1 }, { kind: "I", rot: 1 }, { kind: "I", rot: 1 }, { kind: "L", rot: 3 }],
  ];
  return layout.map((row) => row.map((cell) => ({ ...cell, rot: (cell.rot + Math.floor(Math.random() * 3) + 1) % 4 })));
};

export const CircuitFlowGame = ({ onBack, isMuted, onSaveScore }) => {
  const [grid, setGrid] = useState(() => makeCircuitBoard());
  const [moves, setMoves] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("circuitflow_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const { powered, solved } = useMemo(() => traceCircuitPower(grid), [grid]);

  const rotateTile = (r, c) => {
    if (solved) return;
    setGrid((prev) => prev.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? { ...cell, rot: (cell.rot + 1) % 4 } : cell))));
    setMoves((m) => m + 1);
    playFx("laser");
  };

  useEffect(() => {
    if (solved) {
      playFx("win");
      const pts = Math.max(100, 600 - moves * 10);
      if (pts > highScore) { setHighScore(pts); localStorage.setItem("circuitflow_highscore", String(pts)); onSaveScore?.("circuitflow", pts); }
    }
  }, [highScore, moves, onSaveScore, playFx, solved]);

  const reset = () => { setGrid(makeCircuitBoard()); setMoves(0); playFx("whoosh"); };

  return (
    <HiFiGameShell title="Circuit Link" badge="v2.0 UPDATED" onBack={onBack} score={Math.max(0, 600 - moves * 10)} highScore={highScore} onReset={reset} controlsHint="Tap any conduit tile to rotate 90° and route power from Top-Left Source to Bottom-Right Node">
      <div className="grid grid-cols-5 gap-1.5 p-3 rounded-2xl bg-[#060e1a] border-2 border-cyan-400/35 max-w-[360px] w-full">
        {grid.map((row, r) => row.map((cell, c) => {
          const ports = getRotatedPorts(cell.kind, cell.rot);
          const lit = powered[r][c];
          const wireCol = lit ? "#22d3ee" : "#475569";
          return (
            <button key={`${r}-${c}`} type="button" onClick={() => rotateTile(r, c)} className={`relative aspect-square rounded-xl border cursor-pointer ${r === 0 && c === 0 ? "border-amber-300 bg-amber-500/15" : r === 4 && c === 4 ? "border-emerald-300 bg-emerald-500/15" : "border-white/10 bg-slate-900/80"}`}>
              <svg viewBox="0 0 40 40" className="w-full h-full">
                <circle cx="20" cy="20" r="4" fill={wireCol} />
                {ports.includes(0) && <line x1="20" y1="20" x2="20" y2="0" stroke={wireCol} strokeWidth="6" />}
                {ports.includes(1) && <line x1="20" y1="20" x2="40" y2="20" stroke={wireCol} strokeWidth="6" />}
                {ports.includes(2) && <line x1="20" y1="20" x2="20" y2="40" stroke={wireCol} strokeWidth="6" />}
                {ports.includes(3) && <line x1="20" y1="20" x2="0" y2="20" stroke={wireCol} strokeWidth="6" />}
              </svg>
            </button>
          );
        }))}
      </div>
      {solved && <button type="button" onClick={reset} className="px-5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs cursor-pointer">🏆 Powered in {moves} moves! Next Grid</button>}
    </HiFiGameShell>
  );
};
CircuitFlowGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   12. PICROSS CIPHER (NONOGRAM) v2.0
   ═══════════════════════════════════════════════════════════════════════════ */
const NONO_PATTERNS = [
  [[0,1,1,1,0],[1,0,1,0,1],[1,1,1,1,1],[0,1,1,1,0],[0,1,0,1,0]],
  [[0,0,1,0,0],[0,1,1,1,0],[1,1,1,1,1],[0,1,0,1,0],[1,0,0,0,1]],
  [[1,0,1,0,1],[0,1,1,1,0],[1,1,0,1,1],[0,1,1,1,0],[1,0,1,0,1]],
];

export const NonogramMatrixGame = ({ onBack, isMuted, onSaveScore }) => {
  const [pIdx, setPIdx] = useState(0);
  const solution = NONO_PATTERNS[pIdx % NONO_PATTERNS.length];
  const clues = useMemo(() => computeNonogramClues(solution), [solution]);
  const [grid, setGrid] = useState(() => Array.from({ length: 5 }, () => Array(5).fill(0))); // 0 empty, 1 fill, 2 X
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("nonogram_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const solved = useMemo(
    () => solution.every((row, r) => row.every((val, c) => (val === 1) === (grid[r][c] === 1))),
    [grid, solution]
  );

  useEffect(() => {
    if (solved) {
      playFx("win");
      const next = highScore + 200;
      setHighScore(next);
      localStorage.setItem("nonogram_highscore", String(next));
      onSaveScore?.("nonogram", next);
    }
  }, [highScore, onSaveScore, playFx, solved]);

  const toggleCell = (r, c) => {
    if (solved) return;
    setGrid((prev) => prev.map((row, ri) => row.map((v, ci) => (ri === r && ci === c ? (v + 1) % 3 : v))));
    playFx("coin");
  };

  const nextPuzzle = () => {
    setPIdx((i) => i + 1);
    setGrid(Array.from({ length: 5 }, () => Array(5).fill(0)));
    playFx("whoosh");
  };

  return (
    <HiFiGameShell title="Picross Cipher" badge="v2.0 UPDATED" onBack={onBack} score={highScore} highScore={highScore} onReset={nextPuzzle} controlsHint="Tap to cycle Empty → Filled Pixel → Cross-Out (✕) using row & column run-length clues">
      <div className="p-4 rounded-2xl bg-[#070f1d] border-2 border-indigo-400/35 space-y-2">
        <div className="grid grid-cols-6 gap-1.5 items-end">
          <div />
          {clues.cols.map((col, idx) => (
            <div key={idx} className="text-center text-xs font-extrabold text-cyan-300 leading-tight">{col.join("\n")}</div>
          ))}
        </div>
        {grid.map((row, r) => (
          <div key={r} className="grid grid-cols-6 gap-1.5 items-center">
            <div className="text-right pr-2 text-xs font-extrabold text-amber-300">{clues.rows[r].join(" ")}</div>
            {row.map((v, c) => (
              <button key={c} type="button" onClick={() => toggleCell(r, c)} className={`aspect-square rounded-lg border text-sm font-black cursor-pointer ${v === 1 ? "bg-indigo-400 border-white text-black" : v === 2 ? "bg-slate-900 border-rose-400/40 text-rose-400" : "bg-white/10 border-white/15"}`}>
                {v === 2 ? "✕" : ""}
              </button>
            ))}
          </div>
        ))}
      </div>
      {solved && <button type="button" onClick={nextPuzzle} className="px-5 py-2 rounded-xl bg-indigo-400 text-black font-black text-xs cursor-pointer">🏆 Cipher Decoded! Next Puzzle</button>}
    </HiFiGameShell>
  );
};
NonogramMatrixGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   13. PRISM CASCADE (LIGHTS OUT) v2.0
   ═══════════════════════════════════════════════════════════════════════════ */
export const LightsPrismGame = ({ onBack, isMuted, onSaveScore }) => {
  const [grid, setGrid] = useState(() => createSolvableLightsBoard(5, 6));
  const [moves, setMoves] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("lightsprism_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const solved = useMemo(() => grid.every((row) => row.every((v) => !v)), [grid]);

  useEffect(() => {
    if (solved && moves > 0) {
      playFx("win");
      const pts = Math.max(100, 500 - moves * 15);
      if (pts > highScore) { setHighScore(pts); localStorage.setItem("lightsprism_highscore", String(pts)); onSaveScore?.("lightsprism", pts); }
    }
  }, [highScore, moves, onSaveScore, playFx, solved]);

  const tap = (r, c) => {
    if (solved) return;
    setGrid((prev) => toggleLightsCell(prev, r, c));
    setMoves((m) => m + 1);
    playFx("coin");
  };

  const reset = () => { setGrid(createSolvableLightsBoard(5, 7)); setMoves(0); playFx("whoosh"); };

  return (
    <HiFiGameShell title="Prism Cascade" badge="v2.0 UPDATED" onBack={onBack} score={Math.max(0, 500 - moves * 15)} highScore={highScore} onReset={reset} controlsHint="Tap any cell to toggle it and its 4 orthogonal neighbors • Extinguish all neon cells to clear!">
      <div className="grid grid-cols-5 gap-2 p-3 rounded-2xl bg-[#070f1d] border-2 border-emerald-400/35 w-full max-w-[340px] aspect-square">
        {grid.map((row, r) => row.map((on, c) => (
          <button key={`${r}-${c}`} type="button" onClick={() => tap(r, c)} className={`rounded-xl border transition-all cursor-pointer ${on ? "bg-emerald-400 border-white shadow-[0_0_16px_#34d399]" : "bg-slate-900 border-white/10"}`} />
        )))}
      </div>
      {solved && <button type="button" onClick={reset} className="px-5 py-2 rounded-xl bg-emerald-400 text-black font-black text-xs cursor-pointer">🏆 Blackout in {moves} taps! Next</button>}
    </HiFiGameShell>
  );
};
LightsPrismGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   14. ROYAL KNIGHT'S TOUR v2.0 (6x6 Path Solver Puzzle)
   ═══════════════════════════════════════════════════════════════════════════ */
export const KnightTourGame = ({ onBack, isMuted, onSaveScore }) => {
  const [visited, setVisited] = useState([[0, 0]]);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("knighttour_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const cur = visited[visited.length - 1];
  const isKnightMove = (r, c) => {
    if (visited.some(([vr, vc]) => vr === r && vc === c)) return false;
    const dr = Math.abs(r - cur[0]);
    const dc = Math.abs(c - cur[1]);
    return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
  };

  const stepTo = (r, c) => {
    if (!isKnightMove(r, c)) return;
    const next = [...visited, [r, c]];
    setVisited(next);
    playFx("coin");
    if (next.length === 36) {
      playFx("win");
      const pts = 500;
      if (pts > highScore) { setHighScore(pts); localStorage.setItem("knighttour_highscore", String(pts)); onSaveScore?.("knighttour", pts); }
    }
  };

  const undo = () => { if (visited.length > 1) setVisited((v) => v.slice(0, -1)); };
  const reset = () => { setVisited([[0, 0]]); playFx("whoosh"); };

  return (
    <HiFiGameShell title="Royal Knight's Tour" badge="v2.0 UPDATED" onBack={onBack} score={visited.length * 10} highScore={highScore} onReset={reset} controlsHint="Visit all 36 squares once using legal L-shaped Knight jumps!" extraHeader={<button type="button" onClick={undo} className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"><Undo2 className="w-3.5 h-3.5" /> Undo</button>}>
      <div className="grid grid-cols-6 gap-1.5 p-3 rounded-2xl bg-[#070f1d] border-2 border-amber-400/35 w-full max-w-[360px] aspect-square">
        {Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (__, c) => {
          const stepIdx = visited.findIndex(([vr, vc]) => vr === r && vc === c);
          const isCur = cur[0] === r && cur[1] === c;
          const valid = isKnightMove(r, c);
          return (
            <button key={`${r}-${c}`} type="button" onClick={() => stepTo(r, c)} className={`rounded-lg border text-xs font-black flex items-center justify-center cursor-pointer ${isCur ? "bg-amber-400 border-white text-black" : stepIdx >= 0 ? "bg-emerald-500/35 border-emerald-400/40 text-emerald-200" : valid ? "bg-cyan-500/25 border-cyan-300/60 text-cyan-200" : "bg-slate-900 border-white/10 text-white/30"}`}>
              {isCur ? "♞" : stepIdx >= 0 ? stepIdx + 1 : valid ? "•" : ""}
            </button>
          );
        }))}
      </div>
      {visited.length === 36 && <div className="text-sm font-black text-amber-300">🏆 Complete 36/36 Tour!</div>}
    </HiFiGameShell>
  );
};
KnightTourGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   15. CYBER 15-SLIDE v2.0 (Guaranteed Solvable 4x4 Sliding Tiles)
   ═══════════════════════════════════════════════════════════════════════════ */
export const SlidingCipherGame = ({ onBack, isMuted, onSaveScore }) => {
  const [tiles, setTiles] = useState(() => createSolvableSlide15());
  const [moves, setMoves] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("slidingcipher_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const solved = useMemo(() => tiles.every((v, i) => v === (i === 15 ? 0 : i + 1)), [tiles]);

  const slideIdx = (idx) => {
    if (solved) return;
    const blank = tiles.indexOf(0);
    const r1 = Math.floor(idx / 4); const c1 = idx % 4;
    const r2 = Math.floor(blank / 4); const c2 = blank % 4;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
    const next = [...tiles];
    [next[idx], next[blank]] = [next[blank], next[idx]];
    setTiles(next);
    setMoves((m) => m + 1);
    playFx("laser");
    if (next.every((v, i) => v === (i === 15 ? 0 : i + 1))) {
      playFx("win");
      const pts = Math.max(100, 600 - moves * 4);
      if (pts > highScore) { setHighScore(pts); localStorage.setItem("slidingcipher_highscore", String(pts)); onSaveScore?.("slidingcipher", pts); }
    }
  };

  const reset = () => { setTiles(createSolvableSlide15()); setMoves(0); playFx("whoosh"); };

  return (
    <HiFiGameShell title="Cyber 15-Slide" badge="v2.0 UPDATED" onBack={onBack} score={Math.max(0, 600 - moves * 4)} highScore={highScore} onReset={reset} controlsHint="Tap any tile adjacent to the empty slot to order tiles 1–15 cleanly">
      <div className="grid grid-cols-4 gap-2 p-3 rounded-2xl bg-[#07101f] border-2 border-cyan-400/35 w-full max-w-[340px] aspect-square">
        {tiles.map((v, idx) => (
          <button key={idx} type="button" onClick={() => slideIdx(idx)} className={`rounded-xl border text-xl font-black flex items-center justify-center cursor-pointer transition-colors ${v === 0 ? "bg-black/40 border-white/5" : v === idx + 1 ? "bg-emerald-500/25 border-emerald-400/50 text-emerald-200" : "bg-white/10 hover:bg-white/20 border-white/15 text-white"}`}>
            {v > 0 ? v : ""}
          </button>
        ))}
      </div>
      {solved && <button type="button" onClick={reset} className="px-5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs cursor-pointer"><RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Solved in {moves} moves! Shuffle</button>}
    </HiFiGameShell>
  );
};
SlidingCipherGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

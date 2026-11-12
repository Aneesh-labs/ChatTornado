import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { Flag, Lightbulb, Pencil, RotateCcw } from "lucide-react";
import { soundEngine } from "../../../utils/soundEffects";
import HiFiGameShell from "./HiFiGameShell";
import {
  TETRIS_COLS,
  TETRIS_ROWS,
  TETROMINOES,
  createTetrisState,
  getTetrisGhostRow,
  tryMoveTetris,
  tryRotateTetris,
  holdTetrisPiece,
  lockTetrisPiece,
  hardDropTetris,
  createMinesState,
  revealMineCell,
  toggleMineFlag,
  chordMineCell,
  generateSudokuPuzzle,
  findSudokuConflicts,
} from "../hiFiEngines";

/* ═══════════════════════════════════════════════════════════════════════════
   8. POLYOMINO TETRIS v2.0 (Ghost Piece, Hold Box, Hard Drop & Wall Kicks)
   ═══════════════════════════════════════════════════════════════════════════ */
export const TetrisV2Game = ({ onBack, isMuted, onSaveScore }) => {
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("cybertetris_highscore") || 0));
  const stateRef = useRef(createTetrisState());
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const forceRender = () => setTick((t) => t + 1);

  const reset = useCallback(() => {
    stateRef.current = createTetrisState();
    setPaused(false);
    forceRender();
    playFx("whoosh");
  }, [playFx]);

  const act = useCallback((fn) => {
    const s = stateRef.current;
    if (s.gameOver || paused) return;
    fn(s);
    if (s.gameOver) {
      playFx("boom");
      if (s.score > highScore) {
        setHighScore(s.score);
        localStorage.setItem("cybertetris_highscore", String(s.score));
        onSaveScore?.("cybertetris", s.score);
      }
    }
    forceRender();
  }, [highScore, onSaveScore, paused, playFx]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); act((s) => { if (tryMoveTetris(s, 0, -1)) playFx("laser"); }); }
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); act((s) => { if (tryMoveTetris(s, 0, 1)) playFx("laser"); }); }
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { e.preventDefault(); act((s) => { if (!tryMoveTetris(s, 1, 0)) lockTetrisPiece(s); }); }
      else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === "x") { e.preventDefault(); act((s) => { if (tryRotateTetris(s, 1)) playFx("boing"); }); }
      else if (e.key === "c" || e.key === "C") { e.preventDefault(); act((s) => { if (holdTetrisPiece(s)) playFx("coin"); }); }
      else if (e.code === "Space") { e.preventDefault(); act((s) => { const r = hardDropTetris(s); playFx(r.cleared > 0 ? "tada" : "coin"); }); }
      else if (e.key === "p" || e.key === "P") { setPaused((p) => !p); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, playFx]);

  useEffect(() => {
    const s = stateRef.current;
    if (s.gameOver || paused) return;
    const ms = Math.max(110, 620 - (s.level - 1) * 55);
    const id = setInterval(() => {
      act((st) => {
        if (!tryMoveTetris(st, 1, 0)) {
          const res = lockTetrisPiece(st);
          if (res.cleared > 0) playFx("tada");
          else playFx("coin");
        }
      });
    }, ms);
    return () => clearInterval(id);
  }, [act, paused, playFx, tick]);

  const s = stateRef.current;
  const ghostRow = getTetrisGhostRow(s);

  const renderPreview = (type) => {
    if (!type) return <div className="text-xs text-white/30">Empty</div>;
    const spec = TETROMINOES[type];
    return (
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${spec.shape[0].length}, 14px)` }}>
        {spec.shape.flatMap((row, r) => row.map((v, c) => (
          <div key={`${r}-${c}`} className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: v ? spec.color : "transparent" }} />
        )))}
      </div>
    );
  };

  return (
    <HiFiGameShell
      title="Polyomino Tetris"
      badge="v2.0 UPDATED"
      badgeTone="bg-indigo-500/20 border-indigo-400/50 text-indigo-200"
      onBack={onBack}
      score={s.score}
      highScore={highScore}
      isPaused={paused}
      onTogglePause={() => setPaused((p) => !p)}
      onReset={reset}
      controlsHint="←/→ Move • ↑ Rotate • Space Hard Drop • C Hold Piece"
      extraHeader={<span className="text-xs font-bold text-indigo-300">Lv.{s.level} • {s.lines} Lines</span>}
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        {/* Hold + Next */}
        <div className="flex sm:flex-col gap-3">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 min-w-[96px] flex flex-col items-center gap-2">
            <span className="text-xs font-extrabold text-indigo-300">HOLD (C)</span>
            {renderPreview(s.hold)}
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 min-w-[96px] flex flex-col items-center gap-2">
            <span className="text-xs font-extrabold text-cyan-300">NEXT</span>
            {renderPreview(s.bag[0])}
          </div>
        </div>

        {/* Playfield */}
        <div className="relative p-2 rounded-2xl bg-[#070b15] border-2 border-indigo-500/40 shadow-2xl">
          <div className="grid gap-[1px] bg-white/[0.04]" style={{ gridTemplateColumns: `repeat(${TETRIS_COLS}, minmax(20px, 24px))` }}>
            {Array.from({ length: TETRIS_ROWS }, (_, r) =>
              Array.from({ length: TETRIS_COLS }, (__, c) => {
                let cellColor = s.grid[r][c];
                let isGhost = false;
                if (!cellColor && s.current) {
                  const pr = r - s.current.row;
                  const pc = c - s.current.col;
                  if (s.current.matrix[pr]?.[pc]) cellColor = s.current.color;
                  else {
                    const gr = r - ghostRow;
                    if (s.current.matrix[gr]?.[pc]) isGhost = true;
                  }
                }
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`aspect-square rounded-[3px] ${isGhost ? "border border-white/35 bg-white/10" : ""}`}
                    style={cellColor ? { backgroundColor: cellColor, boxShadow: `0 0 6px ${cellColor}66` } : (!isGhost ? { backgroundColor: "#0a101f" } : undefined)}
                  />
                );
              })
            )}
          </div>
          {paused && !s.gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3">
              <h3 className="text-xl font-black text-white">Paused</h3>
              <button type="button" onClick={() => setPaused(false)} className="px-5 py-2 rounded-xl bg-indigo-400 text-black font-black text-sm cursor-pointer">Resume</button>
            </div>
          )}
          {s.gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3 text-center">
              <h3 className="text-xl font-black text-rose-400">Stack Overflow!</h3>
              <p className="text-xs text-white/75">Score: {s.score} • Lines: {s.lines}</p>
              <button type="button" onClick={reset} className="px-5 py-2 rounded-xl bg-indigo-400 text-black font-black text-sm cursor-pointer">Play Again</button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Touch Controls */}
      <div className="grid grid-cols-5 gap-2 w-full max-w-[340px] md:hidden">
        <button type="button" onClick={() => act((st) => tryMoveTetris(st, 0, -1))} className="h-11 rounded-xl bg-white/10 font-black text-white">◀</button>
        <button type="button" onClick={() => act((st) => tryRotateTetris(st, 1))} className="h-11 rounded-xl bg-white/10 font-black text-white">↻</button>
        <button type="button" onClick={() => act((st) => hardDropTetris(st))} className="h-11 rounded-xl bg-indigo-500/40 font-black text-indigo-200">DROP</button>
        <button type="button" onClick={() => act((st) => holdTetrisPiece(st))} className="h-11 rounded-xl bg-white/10 font-black text-white">HOLD</button>
        <button type="button" onClick={() => act((st) => tryMoveTetris(st, 0, 1))} className="h-11 rounded-xl bg-white/10 font-black text-white">▶</button>
      </div>
    </HiFiGameShell>
  );
};
TetrisV2Game.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   9. TACTICAL MINESWEEPER (Safe First Click + Chording + Flag Mode)
   ═══════════════════════════════════════════════════════════════════════════ */
export const MinesweeperTacticalGame = ({ onBack, isMuted, onSaveScore }) => {
  const [tier, setTier] = useState("9x9");
  const [game, setGame] = useState(() => createMinesState(9, 9, 10));
  const [flagMode, setFlagMode] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("cybermines_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  useEffect(() => {
    if (!game.initialized || game.status !== "playing") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [game.initialized, game.status]);

  const startTier = (t) => {
    setTier(t);
    setElapsed(0);
    if (t === "9x9") setGame(createMinesState(9, 9, 10));
    else if (t === "12x12") setGame(createMinesState(12, 12, 22));
    else setGame(createMinesState(14, 14, 34));
    playFx("whoosh");
  };

  const handleCell = (r, c) => {
    if (game.status !== "playing") return;
    const cell = game.board[r][c];
    let next;
    if (flagMode && !cell.revealed) {
      next = toggleMineFlag(game, r, c);
      playFx("laser");
    } else if (cell.revealed && cell.adj > 0) {
      next = chordMineCell(game, r, c);
    } else {
      next = revealMineCell(game, r, c);
    }
    setGame(next);
    if (next.status === "won") {
      playFx("win");
      const pts = Math.max(150, game.mineCount * 35 - elapsed * 2);
      if (pts > highScore) {
        setHighScore(pts);
        localStorage.setItem("cybermines_highscore", String(pts));
        onSaveScore?.("cybermines", pts);
      }
    } else if (next.status === "lost") {
      playFx("boom");
    } else if (next.revealedCount > game.revealedCount) {
      playFx("coin");
    }
  };

  const numCols = {
    1: "text-cyan-300", 2: "text-emerald-300", 3: "text-rose-400",
    4: "text-indigo-300", 5: "text-amber-300", 6: "text-teal-300", 7: "text-white", 8: "text-slate-300",
  };

  return (
    <HiFiGameShell
      title="Tactical Minesweeper"
      badge="NEW • LOGIC"
      badgeTone="bg-amber-500/20 border-amber-400/50 text-amber-200"
      onBack={onBack}
      score={game.revealedCount * 10}
      highScore={highScore}
      onReset={() => startTier(tier)}
      controlsHint="First click is always safe • Right-click or toggle Flag Mode to mark mines • Click revealed number to Chord"
      extraHeader={
        <div className="flex items-center gap-2">
          {["9x9", "12x12", "14x14"].map((t) => (
            <button key={t} type="button" onClick={() => startTier(t)} className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer ${tier === t ? "bg-amber-400 text-black" : "bg-white/5 text-white/70"}`}>{t}</button>
          ))}
          <button
            type="button"
            onClick={() => setFlagMode((f) => !f)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer border ${flagMode ? "bg-rose-500/30 border-rose-400 text-rose-200" : "bg-white/5 border-white/10 text-white/70"}`}
          >
            <Flag className="w-3.5 h-3.5" /> {flagMode ? "Flag ON" : "Reveal"}
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-6 text-xs font-bold text-white/80">
        <span>Mines Left: <strong className="text-rose-300">{game.mineCount - game.flagsUsed}</strong></span>
        <span>Time: <strong className="text-amber-300">{elapsed}s</strong></span>
      </div>
      <div
        className="grid gap-1 p-2.5 rounded-2xl bg-[#07101c] border-2 border-amber-400/30 max-w-[440px] w-full"
        style={{ gridTemplateColumns: `repeat(${game.cols}, minmax(0, 1fr))` }}
      >
        {game.board.map((row, r) => row.map((cell, c) => (
          <button
            key={`${r}-${c}`}
            type="button"
            onContextMenu={(e) => { e.preventDefault(); setGame((prev) => toggleMineFlag(prev, r, c)); }}
            onClick={() => handleCell(r, c)}
            className={`aspect-square rounded-md text-xs font-black flex items-center justify-center cursor-pointer transition-colors ${
              cell.revealed
                ? cell.mine ? "bg-rose-600 text-white" : "bg-slate-900/90 border border-white/5"
                : cell.flagged ? "bg-rose-500/25 border border-rose-400/60" : "bg-white/10 hover:bg-white/20 border border-white/15"
            }`}
          >
            {cell.revealed ? (cell.mine ? "💣" : cell.adj > 0 ? <span className={numCols[cell.adj]}>{cell.adj}</span> : "") : cell.flagged ? "🚩" : ""}
          </button>
        )))}
      </div>
      {game.status !== "playing" && (
        <div className="px-5 py-3 rounded-2xl bg-black/80 border border-amber-400/40 flex items-center gap-4">
          <span className="text-sm font-black text-white">{game.status === "won" ? `🏆 Sector Cleared in ${elapsed}s!` : "💥 Mine Detonated!"}</span>
          <button type="button" onClick={() => startTier(tier)} className="px-4 py-1.5 rounded-xl bg-amber-400 text-black font-black text-xs cursor-pointer">Retry</button>
        </div>
      )}
    </HiFiGameShell>
  );
};
MinesweeperTacticalGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   10. CHRONO SUDOKU (Pencil Notes, Conflict Highlighter & Smart Hint)
   ═══════════════════════════════════════════════════════════════════════════ */
export const SudokuZenGame = ({ onBack, isMuted, onSaveScore }) => {
  const [diff, setDiff] = useState("tactical");
  const [puzzle, setPuzzle] = useState(() => generateSudokuPuzzle("tactical"));
  const [selected, setSelected] = useState([0, 0]);
  const [noteMode, setNoteMode] = useState(false);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("sudokuzen_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const conflicts = useMemo(() => findSudokuConflicts(puzzle.grid), [puzzle.grid]);
  const solved = useMemo(
    () => conflicts.size === 0 && puzzle.grid.every((row) => row.every((v) => v > 0)),
    [conflicts, puzzle.grid]
  );

  const startDiff = (d) => {
    setDiff(d);
    setPuzzle(generateSudokuPuzzle(d));
    setSelected([0, 0]);
    playFx("whoosh");
  };

  const enterNum = useCallback((num) => {
    const [r, c] = selected;
    if (puzzle.initial[r][c] !== 0 || solved) return;

    setPuzzle((prev) => {
      const grid = prev.grid.map((row) => [...row]);
      const notes = prev.notes.map((row) => row.map((arr) => [...arr]));
      if (noteMode && num > 0) {
        const idx = notes[r][c].indexOf(num);
        if (idx >= 0) notes[r][c].splice(idx, 1);
        else notes[r][c].push(num);
      } else {
        grid[r][c] = num;
        notes[r][c] = [];
      }
      return { ...prev, grid, notes };
    });
    playFx("coin");
  }, [noteMode, playFx, puzzle.initial, selected, solved]);

  useEffect(() => {
    if (solved) {
      playFx("win");
      const pts = diff === "master" ? 400 : diff === "tactical" ? 250 : 150;
      const next = highScore + pts;
      setHighScore(next);
      localStorage.setItem("sudokuzen_highscore", String(next));
      onSaveScore?.("sudokuzen", next);
    }
  }, [diff, highScore, onSaveScore, playFx, solved]);

  const useSmartHint = () => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle.grid[r][c] === 0) {
          setPuzzle((prev) => {
            const grid = prev.grid.map((row) => [...row]);
            grid[r][c] = prev.solution[r][c];
            return { ...prev, grid };
          });
          setSelected([r, c]);
          playFx("tada");
          return;
        }
      }
    }
  };

  return (
    <HiFiGameShell
      title="Chrono Sudoku"
      badge="NEW • 9×9"
      badgeTone="bg-violet-500/20 border-violet-400/50 text-violet-200"
      onBack={onBack}
      score={highScore}
      highScore={highScore}
      onReset={() => startDiff(diff)}
      controlsHint="Tap a cell & pick a digit 1–9 • Conflicts highlight red • Use Pencil mode for candidate notes"
      extraHeader={
        <div className="flex gap-1.5">
          {["casual", "tactical", "master"].map((d) => (
            <button key={d} type="button" onClick={() => startDiff(d)} className={`px-2 py-1 rounded-lg text-xs font-bold capitalize cursor-pointer ${diff === d ? "bg-violet-400 text-black" : "bg-white/5 text-white/70"}`}>{d}</button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-9 w-full max-w-[390px] aspect-square rounded-2xl overflow-hidden border-2 border-violet-400/45 bg-[#090d19]">
        {puzzle.grid.map((row, r) => row.map((val, c) => {
          const isGiven = puzzle.initial[r][c] !== 0;
          const isSel = selected[0] === r && selected[1] === c;
          const isBad = conflicts.has(`${r}-${c}`);
          const borderClasses = `${c % 3 === 2 && c < 8 ? "border-r-2 border-r-violet-400/45" : "border-r border-r-white/10"} ${r % 3 === 2 && r < 8 ? "border-b-2 border-b-violet-400/45" : "border-b border-b-white/10"}`;
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              onClick={() => setSelected([r, c])}
              className={`flex items-center justify-center text-sm font-black cursor-pointer ${borderClasses} ${
                isBad ? "bg-rose-500/35 text-rose-200" : isSel ? "bg-violet-500/40 text-white" : isGiven ? "bg-white/[0.05] text-amber-200" : "bg-transparent text-cyan-300"
              }`}
            >
              {val > 0 ? val : puzzle.notes[r][c].length > 0 ? <span className="text-[10px] text-white/50">{puzzle.notes[r][c].slice(0, 3).join("")}</span> : ""}
            </button>
          );
        }))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 max-w-[400px]">
        {[1,2,3,4,5,6,7,8,9].map((n) => (
          <button key={n} type="button" onClick={() => enterNum(n)} className="w-9 h-10 rounded-xl bg-white/10 hover:bg-violet-500/40 font-black text-white text-sm cursor-pointer">{n}</button>
        ))}
        <button type="button" onClick={() => enterNum(0)} className="px-3 h-10 rounded-xl bg-rose-500/20 text-rose-200 text-xs font-bold cursor-pointer">Clear</button>
        <button type="button" onClick={() => setNoteMode((m) => !m)} className={`px-3 h-10 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer ${noteMode ? "bg-amber-400 text-black border-amber-200" : "bg-white/10 text-white border-white/10"}`}>
          <Pencil className="w-3.5 h-3.5" /> Notes
        </button>
        <button type="button" onClick={useSmartHint} className="px-3 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-1 cursor-pointer">
          <Lightbulb className="w-3.5 h-3.5" /> Hint
        </button>
      </div>
      {solved && (
        <div className="px-5 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-sm font-black text-emerald-200 flex items-center gap-3">
          <span>🏆 Matrix Solved!</span>
          <button type="button" onClick={() => startDiff(diff)} className="px-3 py-1 rounded-lg bg-emerald-400 text-black text-xs cursor-pointer"><RotateCcw className="w-3.5 h-3.5 inline mr-1" />Next</button>
        </div>
      )}
    </HiFiGameShell>
  );
};
SudokuZenGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

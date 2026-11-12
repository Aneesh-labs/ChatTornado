import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  ArrowLeft,
  RotateCcw,
  Undo2,
  Lightbulb,
  Repeat,
  Crown,
  Bot,
  Users,
  Trophy,
  Sparkles,
} from "lucide-react";
import { soundEngine } from "../../utils/soundEffects";
import {
  createInitialChessState,
  getLegalMovesFromSquare,
  applyChessMove,
  undoChessMove,
  chooseBestChessMove,
  evaluateMaterialBalance,
  evaluateBoardScore,
  findKing,
} from "./crownChessEngine";

/** Crisp geometric SVG vector chess piece silhouettes with high contrast in both light/dark squares */
const ChessPieceSvg = ({ code, size = "w-4/5 h-4/5" }) => {
  if (!code) return null;
  const isWhite = code[0] === "w";
  const kind = code[1];

  const fill = isWhite ? "#f8fafc" : "#090f1d";
  const stroke = isWhite ? "#0f172a" : "#38bdf8";
  const accent = isWhite ? "#fbbf24" : "#22d3ee";

  return (
    <svg
      viewBox="0 0 45 45"
      className={`${size} drop-shadow-[0_3px_5px_rgba(0,0,0,0.65)] transition-transform duration-150`}
      aria-label={`${isWhite ? "White" : "Black"} ${kind}`}
    >
      {kind === "P" && (
        <path
          d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
          fill={fill}
          stroke={stroke}
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {kind === "R" && (
        <g fill={fill} stroke={stroke} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" />
          <path d="M34 14l-3 3H14l-3-3" />
          <path d="M31 17v12.5H14V17" />
          <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
          <path d="M11 14h23" />
        </g>
      )}
      {kind === "N" && (
        <g fill={fill} stroke={stroke} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
          <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" />
          <circle cx="15" cy="15.5" r="1.1" fill={accent} stroke="none" />
        </g>
      )}
      {kind === "B" && (
        <g fill={fill} stroke={stroke} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <g fill={fill}>
            <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z" />
            <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
            <circle cx="22.5" cy="8" r="2.6" fill={accent} />
          </g>
          <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke={accent} />
        </g>
      )}
      {kind === "Q" && (
        <g fill={fill} stroke={stroke} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="12" r="2.6" fill={accent} />
          <circle cx="14" cy="9" r="2.6" fill={accent} />
          <circle cx="22.5" cy="8" r="2.8" fill={accent} />
          <circle cx="31" cy="9" r="2.6" fill={accent} />
          <circle cx="39" cy="12" r="2.6" fill={accent} />
          <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" />
          <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
          <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" />
        </g>
      )}
      {kind === "K" && (
        <g fill={fill} stroke={stroke} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.5 11.63V6M20 8h5" stroke={accent} strokeWidth="2.5" />
          <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
          <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" />
          <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" />
        </g>
      )}
    </svg>
  );
};

ChessPieceSvg.propTypes = {
  code: PropTypes.string,
  size: PropTypes.string,
};

const DIFFICULTY_MODES = [
  { id: "novice", label: "Novice AI", desc: "Casual sparring" },
  { id: "club", label: "Club AI", desc: "Balanced tactics" },
  { id: "grandmaster", label: "Grandmaster AI", desc: "Deep lookahead" },
  { id: "pvp", label: "2P Pass & Play", desc: "Local duel" },
];

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

const CrownChessGame = ({ onBack, isMuted = false, onSaveScore }) => {
  const [game, setGame] = useState(() => createInitialChessState());
  const [mode, setMode] = useState("club"); // "novice" | "club" | "grandmaster" | "pvp"
  const [flipped, setFlipped] = useState(false);
  const [selectedSq, setSelectedSq] = useState(null); // [r, c]
  const [hintMove, setHintMove] = useState(null);
  const [pendingPromoMoves, setPendingPromoMoves] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [winsCount, setWinsCount] = useState(() =>
    Number(localStorage.getItem("crownchess_highscore") || 0)
  );

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const savedResultRef = useRef(false);

  const playSound = useCallback((kind) => {
    if (!isMutedRef.current) soundEngine.play(kind);
  }, []);

  const legalMovesForSelected = useMemo(() => {
    if (!selectedSq || game.status === "checkmate" || game.status === "stalemate" || game.status === "draw") {
      return [];
    }
    return getLegalMovesFromSquare(game, selectedSq[0], selectedSq[1]);
  }, [game, selectedSq]);

  const kingInCheckSq = useMemo(() => {
    if (game.status !== "check" && game.status !== "checkmate") return null;
    return findKing(game.board, game.turn);
  }, [game.board, game.status, game.turn]);

  const material = useMemo(() => evaluateMaterialBalance(game.board), [game.board]);
  const whiteEvalCp = useMemo(() => evaluateBoardScore(game.board, "w"), [game.board]);
  const evalBarPct = useMemo(() => {
    if (game.status === "checkmate") return game.winner === "w" ? 100 : 0;
    const clamped = Math.max(-1200, Math.min(1200, whiteEvalCp));
    return Math.round(50 + (clamped / 1200) * 45);
  }, [game.status, game.winner, whiteEvalCp]);

  const resetMatch = useCallback(
    (nextMode = mode) => {
      playSound("whoosh");
      setMode(nextMode);
      setGame(createInitialChessState());
      setSelectedSq(null);
      setHintMove(null);
      setPendingPromoMoves(null);
      setAiThinking(false);
      savedResultRef.current = false;
    },
    [mode, playSound]
  );

  const commitMove = useCallback(
    (mv) => {
      const next = applyChessMove(game, mv);
      setGame(next);
      setSelectedSq(null);
      setHintMove(null);
      setPendingPromoMoves(null);

      if (next.status === "checkmate") {
        playSound(next.winner === "w" ? "win" : "boom");
        if (!savedResultRef.current) {
          savedResultRef.current = true;
          if (mode !== "pvp" && next.winner === "w") {
            const pts = mode === "grandmaster" ? 300 : mode === "club" ? 150 : 75;
            const nextWins = winsCount + pts;
            setWinsCount(nextWins);
            localStorage.setItem("crownchess_highscore", String(nextWins));
            onSaveScore?.("crownchess", nextWins);
          }
        }
      } else if (next.status === "check") {
        playSound("tada");
      } else if (mv.captured) {
        playSound("coin");
      } else {
        playSound("laser");
      }
    },
    [game, mode, onSaveScore, playSound, winsCount]
  );

  // Trigger AI response automatically on Black's turn when playing vs AI
  useEffect(() => {
    if (mode === "pvp") return;
    if (game.turn !== "b") return;
    if (game.status === "checkmate" || game.status === "stalemate" || game.status === "draw") return;

    setAiThinking(true);
    const timer = setTimeout(() => {
      const chosen = chooseBestChessMove(game, mode);
      setAiThinking(false);
      if (chosen) {
        commitMove(chosen);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [commitMove, game, mode]);

  const handleSquareClick = (r, c) => {
    if (aiThinking || pendingPromoMoves) return;
    if (game.status === "checkmate" || game.status === "stalemate" || game.status === "draw") return;
    if (mode !== "pvp" && game.turn === "b") return;

    const clickedPiece = game.board[r][c];

    // If a piece is selected, check if (r, c) is a legal destination
    if (selectedSq) {
      const matchingMoves = legalMovesForSelected.filter(
        (m) => m.to[0] === r && m.to[1] === c
      );
      if (matchingMoves.length > 0) {
        if (matchingMoves.length > 1 && matchingMoves[0].promotion) {
          setPendingPromoMoves(matchingMoves);
        } else {
          commitMove(matchingMoves[0]);
        }
        return;
      }
    }

    // Select own piece (or deselect if clicked same square)
    if (clickedPiece && clickedPiece[0] === game.turn) {
      if (selectedSq && selectedSq[0] === r && selectedSq[1] === c) {
        setSelectedSq(null);
      } else {
        setSelectedSq([r, c]);
      }
    } else {
      setSelectedSq(null);
    }
  };

  const handleUndo = () => {
    if (aiThinking || !game.history.length) return;
    const steps = mode !== "pvp" && game.turn === "w" && game.history.length >= 2 ? 2 : 1;
    setGame((prev) => undoChessMove(prev, steps));
    setSelectedSq(null);
    setHintMove(null);
    setPendingPromoMoves(null);
  };

  const handleHint = () => {
    if (aiThinking || game.status === "checkmate" || game.status === "stalemate" || game.status === "draw") return;
    const best = chooseBestChessMove(game, "club");
    if (best) {
      setHintMove(best);
      setSelectedSq(best.from);
      playSound("coin");
    }
  };

  const movePairs = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < game.history.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: game.history[i]?.san || "",
        black: game.history[i + 1]?.san || "",
      });
    }
    return pairs;
  }, [game.history]);

  const rowOrder = useMemo(
    () => (flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7]),
    [flipped]
  );
  const colOrder = useMemo(
    () => (flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7]),
    [flipped]
  );

  const isFinished = game.status === "checkmate" || game.status === "stalemate" || game.status === "draw";

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full select-none">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/35 text-amber-200 text-xs font-black">
            <Crown className="h-4 w-4 text-amber-300" />
            <span>CROWNFALL CHESS</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {DIFFICULTY_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => resetMatch(m.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  mode === m.id
                    ? "bg-amber-400 text-slate-950"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-bold text-amber-300 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <Trophy className="h-3.5 w-3.5" /> {winsCount}
          </span>
        </div>
      </div>

      {/* Main Layout: Left Board, Right Telemetry & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Chessboard Container */}
        <div className="lg:col-span-7 flex flex-col gap-2.5">
          {/* Top Opponent Strip */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-slate-900/85 border border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-cyan-400/40 flex items-center justify-center">
                {mode === "pvp" ? (
                  <Users className="w-4 h-4 text-cyan-300" />
                ) : (
                  <Bot className="w-4 h-4 text-cyan-300" />
                )}
              </div>
              <div>
                <div className="text-xs font-extrabold text-white">
                  {mode === "pvp" ? "Black Pieces" : `VORTEX-9 (${DIFFICULTY_MODES.find((d) => d.id === mode)?.label})`}
                </div>
                <div className="text-xs text-cyan-300/80 min-h-[16px]">
                  {aiThinking
                    ? "Calculating tactical response..."
                    : game.turn === "b" && !isFinished
                    ? "Black to move"
                    : ""}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {game.captured.b.slice(-6).map((c, idx) => (
                  <div key={idx} className="w-5 h-5">
                    <ChessPieceSvg code={c} size="w-full h-full" />
                  </div>
                ))}
              </div>
              {material.diff < 0 && (
                <span className="text-xs font-black text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-md">
                  +{Math.abs(material.diff)}
                </span>
              )}
            </div>
          </div>

          {/* 8x8 Interactive Board */}
          <div className="relative flex gap-2 items-stretch">
            {/* Live Positional Eval Bar */}
            <div
              className="w-2.5 rounded-full overflow-hidden bg-slate-800 border border-white/15 flex flex-col justify-end shrink-0"
              title={`Advantage: ${whiteEvalCp > 0 ? "White" : "Black"}`}
            >
              <div
                className="w-full bg-gradient-to-t from-amber-300 to-white transition-all duration-300"
                style={{ height: `${evalBarPct}%` }}
              />
            </div>

            <div className="relative flex-1 aspect-square rounded-2xl overflow-hidden border-2 border-amber-400/35 shadow-[0_0_45px_rgba(251,191,36,0.12)] grid grid-cols-8 grid-rows-8">
              {rowOrder.map((r) =>
                colOrder.map((c) => {
                  const isLightSq = (r + c) % 2 === 0;
                  const piece = game.board[r][c];
                  const isSelected = selectedSq && selectedSq[0] === r && selectedSq[1] === c;
                  const legalMatch = legalMovesForSelected.find((m) => m.to[0] === r && m.to[1] === c);
                  const isLastFrom = game.lastMove && game.lastMove.from[0] === r && game.lastMove.from[1] === c;
                  const isLastTo = game.lastMove && game.lastMove.to[0] === r && game.lastMove.to[1] === c;
                  const isKingCheck = kingInCheckSq && kingInCheckSq[0] === r && kingInCheckSq[1] === c;
                  const isHint = hintMove && (
                    (hintMove.from[0] === r && hintMove.from[1] === c) ||
                    (hintMove.to[0] === r && hintMove.to[1] === c)
                  );

                  let sqBg = isLightSq ? "bg-emerald-900/45" : "bg-[#061412]";
                  if (isLastFrom || isLastTo) {
                    sqBg = isLightSq ? "bg-amber-400/30" : "bg-amber-500/25";
                  }
                  if (isSelected) {
                    sqBg = "bg-emerald-400/45 ring-2 ring-inset ring-emerald-200";
                  } else if (isKingCheck) {
                    sqBg = "bg-rose-600/65 ring-2 ring-inset ring-rose-300 animate-pulse";
                  } else if (isHint) {
                    sqBg = "bg-yellow-400/40 ring-2 ring-inset ring-yellow-200";
                  }

                  const showRankLabel = c === colOrder[0];
                  const showFileLabel = r === rowOrder[7];

                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      onClick={() => handleSquareClick(r, c)}
                      className={`relative flex items-center justify-center transition-colors cursor-pointer ${sqBg}`}
                    >
                      {showRankLabel && (
                        <span className="pointer-events-none absolute top-0.5 left-1 text-[10px] font-bold text-white/45">
                          {8 - r}
                        </span>
                      )}
                      {showFileLabel && (
                        <span className="pointer-events-none absolute bottom-0.5 right-1 text-[10px] font-bold text-white/45">
                          {FILES[c]}
                        </span>
                      )}

                      {piece && <ChessPieceSvg code={piece} />}

                      {legalMatch && !piece && (
                        <span className="pointer-events-none w-3.5 h-3.5 rounded-full bg-emerald-300/75 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
                      )}
                      {legalMatch && piece && (
                        <span className="pointer-events-none absolute inset-1 rounded-full border-[3px] border-amber-300/85 shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
                      )}
                    </button>
                  );
                })
              )}

              {/* Pawn Promotion Modal Overlay */}
              {pendingPromoMoves && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                  <div className="rounded-2xl bg-slate-900 border border-amber-400/45 p-4 text-center space-y-3 shadow-2xl">
                    <div className="text-sm font-black text-amber-200 flex items-center justify-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      Choose Promotion Piece
                    </div>
                    <div className="flex gap-2 justify-center">
                      {pendingPromoMoves.map((pm) => (
                        <button
                          key={pm.promotion}
                          type="button"
                          onClick={() => commitMove(pm)}
                          className="w-14 h-14 rounded-xl bg-white/10 hover:bg-amber-400/30 border border-white/20 flex items-center justify-center cursor-pointer"
                        >
                          <ChessPieceSvg code={`${game.turn}${pm.promotion}`} size="w-10 h-10" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Match End Overlay */}
              {isFinished && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-5 text-center gap-3">
                  <Crown className="w-12 h-12 text-amber-300" />
                  <h3 className="text-2xl font-black text-white">
                    {game.status === "checkmate"
                      ? `${game.winner === "w" ? "White" : "Black"} Wins by Checkmate!`
                      : game.status === "stalemate"
                      ? "Draw by Stalemate"
                      : "Draw"}
                  </h3>
                  <p className="text-xs text-white/75">
                    Completed in {game.fullmove} moves • Last move:{" "}
                    <strong className="text-amber-300">{game.lastMove?.san || "—"}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => resetMatch(mode)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Play New Match
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Player Strip */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-slate-900/85 border border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-300/50 flex items-center justify-center">
                <Crown className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-white">
                  White Pieces {mode !== "pvp" ? "(You)" : ""}
                </div>
                <div className="text-xs text-emerald-300/80 min-h-[16px]">
                  {game.turn === "w" && !isFinished
                    ? game.status === "check"
                      ? "Check! Defend your King"
                      : "Your turn — tap a piece"
                    : ""}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {game.captured.w.slice(-6).map((c, idx) => (
                  <div key={idx} className="w-5 h-5">
                    <ChessPieceSvg code={c} size="w-full h-full" />
                  </div>
                ))}
              </div>
              {material.diff > 0 && (
                <span className="text-xs font-black text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md">
                  +{material.diff}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Tactical Tools + Move Notation Log */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={aiThinking || !game.history.length}
              className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-35 cursor-pointer"
            >
              <Undo2 className="w-4 h-4" /> Undo
            </button>
            <button
              type="button"
              onClick={handleHint}
              disabled={aiThinking || isFinished}
              className="px-3 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/35 text-xs font-bold text-amber-200 flex items-center justify-center gap-1.5 disabled:opacity-35 cursor-pointer"
            >
              <Lightbulb className="w-4 h-4" /> Tactical Hint
            </button>
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Repeat className="w-4 h-4" /> Flip Board
            </button>
            <button
              type="button"
              onClick={() => resetMatch(mode)}
              className="px-3 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/35 text-xs font-bold text-rose-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                Algebraic Move Log
              </span>
              <span className="text-xs font-semibold text-white/55">
                Move {game.fullmove}
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1 text-xs">
              {movePairs.length === 0 ? (
                <p className="text-white/45 py-4 text-center">
                  Tap any White piece to highlight legal moves. Supports Castling, En Passant &amp; Promotion.
                </p>
              ) : (
                movePairs.map((pair) => (
                  <div
                    key={pair.num}
                    className="grid grid-cols-12 items-center px-2.5 py-1.5 rounded-lg bg-white/[0.04]"
                  >
                    <span className="col-span-2 text-white/45 font-mono">{pair.num}.</span>
                    <span className="col-span-5 font-bold text-white font-mono">{pair.white}</span>
                    <span className="col-span-5 font-bold text-cyan-300 font-mono">{pair.black}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-950/40 border border-emerald-400/20 p-3.5 text-xs text-emerald-100/80 space-y-1">
            <div className="font-extrabold text-emerald-300">Royal Rules &amp; Clarity Aids</div>
            <p>• Legal moves show emerald dots; captures show gold rings.</p>
            <p>• Castling works by moving your King 2 squares toward a Rook.</p>
            <p>• En Passant &amp; 4-piece Pawn Promotion trigger automatically.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

CrownChessGame.propTypes = {
  onBack: PropTypes.func.isRequired,
  isMuted: PropTypes.bool,
  onSaveScore: PropTypes.func,
};

export default CrownChessGame;

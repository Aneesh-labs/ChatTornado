import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Gamepad2,
    Trophy,
    RotateCcw,
    Volume2,
    VolumeX,
    Sparkles,
    Play,
    Pause,
    ArrowLeft,
    Undo2,
    Shield,
    Bomb,
    Compass,
    Bot,
    Crown,
} from "lucide-react";
import { soundEngine } from "../../utils/soundEffects";
import API from "../../Services/API";
import ArcadeAiCopilotModal from "../../Components/games/ArcadeAiCopilotModal";
import TornadoSurfersGame from "../../Components/games/TornadoSurfersGame";
import VortexBastionGame from "../../Components/games/vortexBastion/VortexBastionGame";
import NeonBladeGame from "../../Components/games/NeonBladeGame";
import NullNorthGame from "../../Components/games/nullNorth/NullNorthGame";
import AfterspaceGame from "../../Components/games/afterspace/AfterspaceGame";
import CrownChessGame from "../../Components/games/CrownChessGame";
import { PhotonPongGame, PrismBreakoutGame, AsteroidsNovaGame } from "../../Components/games/hiFiSuite/ActionClassicsSuite";
import { CheckersV2Game, ConnectFourGame, ReversiEclipseGame, NavalSonarGame } from "../../Components/games/hiFiSuite/BoardStrategySuite";
import { TetrisV2Game, MinesweeperTacticalGame, SudokuZenGame } from "../../Components/games/hiFiSuite/PuzzleLogicSuite";
import { SynthRhythmGame, GravityMergeDropGame } from "../../Components/games/hiFiSuite/RhythmPhysicsSuite";
import {
    SNAKE_GRID,
    queueSnakeDirection,
    spawnFreeCell,
    stepSnakeState,
    createFlappyState,
    stepFlappy,
    createMemoryDeck,
    computeMemoryFinalScore,
    move2048Board,
    hasValid2048Moves,
    hasReachedTile,
    createZombieState,
    fireZombieWeapon,
    triggerZombieBomb,
    stepZombieState,
    createNeonDodgeState,
    stepNeonDodge,
} from "../../Components/games/arcadeEngines";

const saveBackendGameScore = (game, score) => {
    try {
        const token = sessionStorage.getItem("token");
        if (token && score > 0) {
            API.post("/user/game-score", { game, score, token }).catch(() => {});
        }
    } catch (_) {}
};

/* ═══════════════════════════════════════════════════════════════
   1. SUPER SNAKE (Buffered Queue, Canvas Vector, Golden Apples, Swipe)
   ═══════════════════════════════════════════════════════════════ */
const SnakeGame = ({ onBack, isMuted }) => {
    const canvasRef = useRef(null);
    const touchStartRef = useRef(null);
    const savedRunRef = useRef(false);

    const stateRef = useRef({
        snake: [[9, 9], [9, 10], [9, 11]],
        dir: [0, -1],
        dirQueue: [],
        food: [4, 4],
        goldFood: null,
        score: 0,
        applesEaten: 0,
        gameOver: false,
    });

    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("snake_highscore") || 0));
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [portalWalls, setPortalWalls] = useState(false);

    const highScoreRef = useRef(highScore);
    const isMutedRef = useRef(isMuted);
    const portalWallsRef = useRef(portalWalls);
    useEffect(() => { highScoreRef.current = highScore; }, [highScore]);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
    useEffect(() => { portalWallsRef.current = portalWalls; }, [portalWalls]);

    const playAudio = useCallback((type) => {
        if (!isMutedRef.current) soundEngine.play(type);
    }, []);

    const drawSnakeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const S = canvas.width;
        const cell = S / SNAKE_GRID;
        const st = stateRef.current;

        ctx.fillStyle = "#080d18";
        ctx.fillRect(0, 0, S, S);

        // Subtle grid
        ctx.strokeStyle = "rgba(255,255,255,0.03)";
        ctx.lineWidth = 1;
        for (let i = 1; i < SNAKE_GRID; i++) {
            const p = i * cell;
            ctx.beginPath();
            ctx.moveTo(p, 0);
            ctx.lineTo(p, S);
            ctx.moveTo(0, p);
            ctx.lineTo(S, p);
            ctx.stroke();
        }

        // Regular Apple
        const [fx, fy] = st.food;
        ctx.save();
        ctx.shadowColor = "#f43f5e";
        ctx.shadowBlur = 14;
        ctx.fillStyle = "#f43f5e";
        ctx.beginPath();
        ctx.arc((fx + 0.5) * cell, (fy + 0.5) * cell, cell * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#4ade80";
        ctx.fillRect((fx + 0.45) * cell, (fy + 0.1) * cell, cell * 0.14, cell * 0.18);
        ctx.restore();

        // Golden Bonus Apple
        if (st.goldFood) {
            const [gx, gy] = st.goldFood.pos;
            ctx.save();
            ctx.shadowColor = "#fbbf24";
            ctx.shadowBlur = 18;
            ctx.fillStyle = "#fbbf24";
            ctx.beginPath();
            ctx.arc((gx + 0.5) * cell, (gy + 0.5) * cell, cell * 0.42, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Snake segments (tail to head)
        for (let i = st.snake.length - 1; i >= 0; i--) {
            const [sx, sy] = st.snake[i];
            const isHead = i === 0;
            const pad = isHead ? 1.5 : 2.5;
            ctx.fillStyle = isHead ? "#34d399" : i % 2 === 0 ? "#10b981" : "#059669";
            ctx.beginPath();
            ctx.roundRect(sx * cell + pad, sy * cell + pad, cell - pad * 2, cell - pad * 2, isHead ? 6 : 4);
            ctx.fill();

            if (isHead) {
                const [dx, dy] = st.dir;
                const cx = (sx + 0.5) * cell;
                const cy = (sy + 0.5) * cell;
                const eOff = cell * 0.18;
                ctx.fillStyle = "#064e3b";
                if (dx !== 0) {
                    ctx.beginPath();
                    ctx.arc(cx + dx * eOff, cy - eOff, 2.2, 0, Math.PI * 2);
                    ctx.arc(cx + dx * eOff, cy + eOff, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.arc(cx - eOff, cy + dy * eOff, 2.2, 0, Math.PI * 2);
                    ctx.arc(cx + eOff, cy + dy * eOff, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }, []);

    const resetGame = useCallback(() => {
        playAudio("whoosh");
        const initSnake = [[9, 9], [9, 10], [9, 11]];
        stateRef.current = {
            snake: initSnake,
            dir: [0, -1],
            dirQueue: [],
            food: spawnFreeCell(SNAKE_GRID, initSnake) || [4, 4],
            goldFood: null,
            score: 0,
            applesEaten: 0,
            gameOver: false,
        };
        savedRunRef.current = false;
        setScore(0);
        setGameOver(false);
        setIsPaused(false);
        setIsPlaying(true);
        drawSnakeCanvas();
    }, [drawSnakeCanvas, playAudio]);

    const pushDirection = useCallback((nextDir) => {
        const st = stateRef.current;
        st.dirQueue = queueSnakeDirection(st.dir, st.dirQueue, nextDir);
    }, []);

    useEffect(() => {
        drawSnakeCanvas();
    }, [drawSnakeCanvas]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === " " && (!isPlaying || gameOver)) {
                e.preventDefault();
                resetGame();
                return;
            }
            if (!isPlaying || gameOver) return;
            if (e.key === "p" || e.key === "P") {
                e.preventDefault();
                setIsPaused((p) => !p);
                return;
            }
            if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
                e.preventDefault();
                pushDirection([0, -1]);
            } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
                e.preventDefault();
                pushDirection([0, 1]);
            } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
                e.preventDefault();
                pushDirection([-1, 0]);
            } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
                e.preventDefault();
                pushDirection([1, 0]);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isPlaying, gameOver, pushDirection, resetGame]);

    useEffect(() => {
        if (!isPlaying || isPaused || gameOver) return;
        let timeoutId;
        const tick = () => {
            const next = stepSnakeState(stateRef.current, portalWallsRef.current);
            stateRef.current = next;

            if (next.event === "eat") {
                playAudio("coin");
                setScore(next.score);
            } else if (next.event === "gold") {
                playAudio("tada");
                setScore(next.score);
            } else if (next.event === "crash") {
                playAudio("boom");
                setGameOver(true);
                if (next.score > highScoreRef.current) {
                    highScoreRef.current = next.score;
                    setHighScore(next.score);
                    localStorage.setItem("snake_highscore", String(next.score));
                }
                if (!savedRunRef.current && next.score > 0) {
                    savedRunRef.current = true;
                    saveBackendGameScore("snake", next.score);
                }
                drawSnakeCanvas();
                return;
            }

            drawSnakeCanvas();
            const tickMs = Math.max(66, 118 - Math.floor(next.applesEaten * 1.5));
            timeoutId = setTimeout(tick, tickMs);
        };
        timeoutId = setTimeout(tick, 112);
        return () => clearTimeout(timeoutId);
    }, [isPlaying, isPaused, gameOver, drawSnakeCanvas, playAudio]);

    const onTouchStart = (e) => {
        const t = e.touches[0];
        touchStartRef.current = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e) => {
        if (!touchStartRef.current) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStartRef.current.x;
        const dy = t.clientY - touchStartRef.current.y;
        touchStartRef.current = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
        if (Math.abs(dx) > Math.abs(dy)) pushDirection(dx > 0 ? [1, 0] : [-1, 0]);
        else pushDirection(dy > 0 ? [0, 1] : [0, -1]);
    };

    return (
        <div className="flex flex-col items-center gap-4 max-w-xl mx-auto w-full select-none">
            <div className="flex items-center justify-between w-full px-1">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
                >
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setPortalWalls((w) => !w)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                            portalWalls
                                ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                                : "bg-white/5 border-white/15 text-white/75"
                        }`}
                    >
                        {portalWalls ? "Portal Wrap: ON" : "Solid Walls"}
                    </button>
                    {isPlaying && !gameOver && (
                        <button
                            type="button"
                            onClick={() => setIsPaused((p) => !p)}
                            aria-label={isPaused ? "Resume Snake" : "Pause Snake"}
                            className="p-1.5 rounded-lg bg-white/10 text-white cursor-pointer"
                        >
                            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        </button>
                    )}
                    <span className="text-xs font-bold text-white/70">Len: <strong className="text-teal-300">{stateRef.current.snake.length}</strong></span>
                    <span className="text-xs font-bold text-white/70">Score: <strong className="text-emerald-400">{score}</strong></span>
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" /> {Math.max(highScore, score)}
                    </span>
                </div>
            </div>

            <div
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                className={`relative w-full max-w-[440px] aspect-square rounded-3xl bg-[#080d18] border-2 shadow-[0_0_40px_rgba(16,185,129,0.18)] overflow-hidden touch-none ${
                    portalWalls ? "border-dashed border-emerald-400/70" : "border-solid border-emerald-500/45"
                }`}
            >
                <canvas ref={canvasRef} width={360} height={360} className="w-full h-full block" />

                {!isPlaying && !gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3 p-4 text-center">
                        <span className="text-5xl animate-bounce">🐍</span>
                        <h3 className="text-xl font-black text-white">Super Snake</h3>
                        <p className="text-xs text-white/65">Swipe on board, tap D-pad, or use Arrows/WASD. Eat golden apples for +35!</p>
                        <button
                            type="button"
                            onClick={resetGame}
                            className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm shadow-[0_0_25px_rgba(16,185,129,0.4)] cursor-pointer active:scale-95"
                        >
                            <Play className="h-4 w-4 fill-current" /> Start Game
                        </button>
                    </div>
                )}

                {isPaused && !gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm gap-3">
                        <h3 className="text-xl font-black text-white">Paused</h3>
                        <button
                            type="button"
                            onClick={() => setIsPaused(false)}
                            className="px-6 py-2.5 rounded-xl bg-emerald-500 text-black font-black text-sm cursor-pointer"
                        >
                            Resume
                        </button>
                    </div>
                )}

                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3">
                        <span className="text-5xl">💥</span>
                        <h3 className="text-xl font-black text-rose-400">Game Over</h3>
                        <p className="text-xs text-white/75">Final Score: <strong className="text-emerald-400 text-sm">{score}</strong></p>
                        <button
                            type="button"
                            onClick={resetGame}
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm cursor-pointer active:scale-95"
                        >
                            <RotateCcw className="h-4 w-4" /> Play Again
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile D-Pad */}
            <div className="grid grid-cols-3 gap-2 w-56">
                <div />
                <button type="button" onClick={() => pushDirection([0, -1])} aria-label="Snake Up" className="h-12 rounded-2xl bg-white/10 active:bg-emerald-500/40 font-bold text-white cursor-pointer">▲</button>
                <div />
                <button type="button" onClick={() => pushDirection([-1, 0])} aria-label="Snake Left" className="h-12 rounded-2xl bg-white/10 active:bg-emerald-500/40 font-bold text-white cursor-pointer">◀</button>
                <button type="button" onClick={() => pushDirection([0, 1])} aria-label="Snake Down" className="h-12 rounded-2xl bg-white/10 active:bg-emerald-500/40 font-bold text-white cursor-pointer">▼</button>
                <button type="button" onClick={() => pushDirection([1, 0])} aria-label="Snake Right" className="h-12 rounded-2xl bg-white/10 active:bg-emerald-500/40 font-bold text-white cursor-pointer">▶</button>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   2. FLAPPY TORNADO (60fps Delta-Time Canvas, Wind Trail & Crystals)
   ═══════════════════════════════════════════════════════════════ */
const FlappyTornadoGame = ({ onBack, isMuted }) => {
    const canvasRef = useRef(null);
    const stateRef = useRef(createFlappyState());
    const trailRef = useRef([]);
    const savedRunRef = useRef(false);

    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("flappy_highscore") || 0));
    const [phase, setPhase] = useState("ready"); // ready | playing | paused | gameover

    const highScoreRef = useRef(highScore);
    const isMutedRef = useRef(isMuted);
    useEffect(() => { highScoreRef.current = highScore; }, [highScore]);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

    const playAudio = useCallback((type) => {
        if (!isMutedRef.current) soundEngine.play(type);
    }, []);

    const startGame = useCallback(() => {
        playAudio("whoosh");
        stateRef.current = createFlappyState();
        trailRef.current = [];
        savedRunRef.current = false;
        setScore(0);
        setPhase("playing");
    }, [playAudio]);

    const flap = useCallback(() => {
        if (phase === "paused") {
            setPhase("playing");
            return;
        }
        if (phase === "ready" || phase === "gameover") {
            startGame();
            stateRef.current.vy = -310;
            return;
        }
        if (stateRef.current.gameOver) return;
        playAudio("boing");
        stateRef.current.vy = -310;
    }, [phase, startGame, playAudio]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
                e.preventDefault();
                flap();
            } else if ((e.key === "p" || e.key === "P") && (phase === "playing" || phase === "paused")) {
                e.preventDefault();
                setPhase((p) => (p === "playing" ? "paused" : "playing"));
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [flap, phase]);

    useEffect(() => {
        let rafId;
        let lastTime = performance.now();

        const loop = (now) => {
            const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
            lastTime = now;

            const st = stateRef.current;
            if (phase === "playing" && !st.gameOver) {
                const res = stepFlappy(st, dt, 380, 340);
                if (res.event === "score") {
                    playAudio("coin");
                    setScore(st.score);
                } else if (res.event === "crystal") {
                    playAudio("tada");
                    setScore(st.score);
                } else if (res.event === "crash") {
                    playAudio("boom");
                    setScore(st.score);
                    setPhase("gameover");
                    if (st.score > highScoreRef.current) {
                        highScoreRef.current = st.score;
                        setHighScore(st.score);
                        localStorage.setItem("flappy_highscore", String(st.score));
                    }
                    if (!savedRunRef.current && st.score > 0) {
                        savedRunRef.current = true;
                        saveBackendGameScore("flappy", st.score);
                    }
                }
                trailRef.current.push({ x: 76, y: st.y, life: 0.45 });
                trailRef.current = trailRef.current
                    .map((t) => ({ ...t, x: t.x - 148 * dt, life: t.life - dt }))
                    .filter((t) => t.life > 0);
            }

            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext("2d");
                const W = canvas.width;
                const H = canvas.height;
                const bg = ctx.createLinearGradient(0, 0, 0, H);
                bg.addColorStop(0, "#051024");
                bg.addColorStop(1, "#020612");
                ctx.fillStyle = bg;
                ctx.fillRect(0, 0, W, H);

                // Stars / Wind Streaks
                ctx.fillStyle = "rgba(186, 230, 253, 0.2)";
                for (let i = 0; i < 18; i++) {
                    const sx = ((i * 73 + now * 0.04) % (W + 40)) - 20;
                    const sy = (i * 37) % H;
                    ctx.fillRect(W - sx, sy, 6, 1.5);
                }

                // Pipes with neon rim caps
                for (const p of st.pipes) {
                    const grad = ctx.createLinearGradient(p.x, 0, p.x + 44, 0);
                    grad.addColorStop(0, "#0284c7");
                    grad.addColorStop(0.5, "#22d3ee");
                    grad.addColorStop(1, "#0369a1");
                    ctx.fillStyle = grad;
                    ctx.fillRect(p.x, 0, 44, p.top);
                    ctx.fillRect(p.x - 3, p.top - 10, 50, 10);

                    const botY = p.top + p.gap;
                    ctx.fillRect(p.x, botY, 44, H - botY);
                    ctx.fillRect(p.x - 3, botY, 50, 10);

                    // Wind Crystal (+3)
                    if (!p.crystalTaken && p.crystalY != null) {
                        ctx.save();
                        ctx.translate(p.x + 22, p.crystalY);
                        ctx.rotate(now * 0.004);
                        ctx.shadowColor = "#fbbf24";
                        ctx.shadowBlur = 12;
                        ctx.fillStyle = "#fde047";
                        ctx.fillRect(-7, -7, 14, 14);
                        ctx.restore();
                    }
                }

                // Vortex trail
                for (const tr of trailRef.current) {
                    ctx.fillStyle = `rgba(56, 189, 248, ${tr.life * 0.8})`;
                    ctx.beginPath();
                    ctx.arc(tr.x, tr.y, 8 * tr.life * 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Swirling Tornado Sprite
                ctx.save();
                ctx.translate(76, st.y);
                ctx.rotate(Math.max(-0.5, Math.min(0.6, st.vy * 0.0014)));
                ctx.shadowColor = "#22d3ee";
                ctx.shadowBlur = 18;
                for (let r = 0; r < 3; r++) {
                    const wR = 15 - r * 3.5;
                    const yO = -7 + r * 6;
                    ctx.strokeStyle = r === 0 ? "#e0f2fe" : "#38bdf8";
                    ctx.lineWidth = 4 - r * 0.7;
                    ctx.beginPath();
                    ctx.ellipse(Math.sin(now * 0.015 + r) * 2.5, yO, wR, 5, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
            }

            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [phase, playAudio]);

    return (
        <div className="flex flex-col items-center gap-4 max-w-xl mx-auto w-full select-none">
            <div className="flex items-center justify-between w-full px-1">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
                >
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="flex items-center gap-3">
                    {(phase === "playing" || phase === "paused") && (
                        <button
                            type="button"
                            onClick={() => setPhase((p) => (p === "playing" ? "paused" : "playing"))}
                            aria-label={phase === "paused" ? "Resume Flappy" : "Pause Flappy"}
                            className="p-1.5 rounded-lg bg-white/10 text-white cursor-pointer"
                        >
                            {phase === "paused" ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        </button>
                    )}
                    <span className="text-xs font-bold text-white/70">Score: <strong className="text-cyan-400">{score}</strong></span>
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" /> {Math.max(highScore, score)}
                    </span>
                </div>
            </div>

            <div
                onPointerDown={(e) => {
                    if (e.target.closest("button")) return;
                    flap();
                }}
                className="relative w-full max-w-[480px] aspect-[380/340] rounded-3xl overflow-hidden border-2 border-cyan-500/35 shadow-[0_0_40px_rgba(6,182,212,0.18)] cursor-pointer touch-none"
            >
                <canvas ref={canvasRef} width={380} height={340} className="w-full h-full block" />

                {phase === "playing" && (
                    <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 border border-cyan-400/25 text-xs font-bold text-cyan-200">
                        Tap / Space to Flap • 💎 = +3
                    </div>
                )}

                {phase === "paused" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm gap-3">
                        <h3 className="text-xl font-black text-white">Paused</h3>
                        <button type="button" onClick={() => setPhase("playing")} className="px-6 py-2.5 rounded-xl bg-cyan-400 text-black font-black text-sm cursor-pointer">
                            Resume
                        </button>
                    </div>
                )}

                {phase === "ready" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 backdrop-blur-sm gap-2 p-4 text-center">
                        <span className="text-5xl animate-bounce">🌪️</span>
                        <h3 className="text-xl font-black text-white">Flappy Tornado</h3>
                        <p className="text-xs text-white/70">Tap screen or Spacebar to flap! Grab golden crystals for +3.</p>
                        <button
                            type="button"
                            onClick={startGame}
                            className="mt-2 flex items-center gap-2 px-7 py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-sm cursor-pointer active:scale-95"
                        >
                            <Play className="h-4 w-4 fill-current" /> Tap to Fly
                        </button>
                    </div>
                )}

                {phase === "gameover" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-2">
                        <span className="text-5xl">💥</span>
                        <h3 className="text-xl font-black text-rose-400">Storm Dissipated!</h3>
                        <p className="text-xs text-white/75">Final Score: <strong className="text-cyan-400 text-sm">{score}</strong></p>
                        <button
                            type="button"
                            onClick={startGame}
                            className="mt-2 flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-sm cursor-pointer active:scale-95"
                        >
                            <RotateCcw className="h-4 w-4" /> Fly Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   3. MEMORY MATCH (4x4 / 4x5 Modes, Timer, Streak Multiplier & Score)
   ═══════════════════════════════════════════════════════════════ */
const MemoryMatchGame = ({ onBack, isMuted }) => {
    const [pairCount, setPairCount] = useState(8);
    const [cards, setCards] = useState(() => createMemoryDeck(8));
    const [flipped, setFlipped] = useState([]);
    const [matched, setMatched] = useState([]);
    const [moves, setMoves] = useState(0);
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [finalScore, setFinalScore] = useState(0);
    const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("memory_highscore") || 0));
    const [isWon, setIsWon] = useState(false);

    const playAudio = useCallback((type) => {
        if (!isMuted) soundEngine.play(type);
    }, [isMuted]);

    const initCards = useCallback((nextPairs = pairCount) => {
        playAudio("whoosh");
        setPairCount(nextPairs);
        setCards(createMemoryDeck(nextPairs));
        setFlipped([]);
        setMatched([]);
        setMoves(0);
        setStreak(0);
        setMaxStreak(0);
        setElapsed(0);
        setFinalScore(0);
        setIsWon(false);
    }, [pairCount, playAudio]);

    useEffect(() => {
        if (isWon || moves === 0) return;
        const id = setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => clearInterval(id);
    }, [isWon, moves]);

    const handleCardClick = (idx) => {
        if (flipped.length === 2 || flipped.includes(idx) || matched.includes(idx) || isWon) return;

        playAudio("coin");
        const newFlipped = [...flipped, idx];
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
            const nextMoves = moves + 1;
            setMoves(nextMoves);
            const [first, second] = newFlipped;
            if (cards[first].emoji === cards[second].emoji) {
                const nextStreak = streak + 1;
                const nextMaxStreak = Math.max(maxStreak, nextStreak);
                setStreak(nextStreak);
                setMaxStreak(nextMaxStreak);
                playAudio("tada");

                const nextMatched = [...matched, first, second];
                setMatched(nextMatched);
                setFlipped([]);

                if (nextMatched.length === cards.length) {
                    playAudio("win");
                    setIsWon(true);
                    const sc = computeMemoryFinalScore(pairCount, nextMoves, elapsed, nextMaxStreak);
                    setFinalScore(sc);
                    if (sc > highScore) {
                        setHighScore(sc);
                        localStorage.setItem("memory_highscore", String(sc));
                    }
                    saveBackendGameScore("memory", sc);
                }
            } else {
                setStreak(0);
                setTimeout(() => setFlipped([]), 620);
            }
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 max-w-xl mx-auto w-full select-none">
            <div className="flex items-center justify-between w-full px-1 flex-wrap gap-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
                >
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="flex items-center gap-2">
                    {[8, 10].map((cnt) => (
                        <button
                            key={cnt}
                            type="button"
                            onClick={() => initCards(cnt)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                                pairCount === cnt
                                    ? "bg-fuchsia-500/30 border-fuchsia-400 text-fuchsia-200"
                                    : "bg-white/5 border-white/10 text-white/65"
                            }`}
                        >
                            {cnt === 8 ? "4×4" : "4×5"}
                        </button>
                    ))}
                    <span className="text-xs font-bold text-emerald-300">
                        {Math.floor(matched.length / 2)}/{pairCount} Pairs
                    </span>
                    <span className="text-xs font-bold text-white/70">{elapsed}s • {moves}m</span>
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" /> {highScore}
                    </span>
                    <button
                        type="button"
                        onClick={() => initCards(pairCount)}
                        className="p-1.5 rounded-lg bg-violet-600/40 text-violet-200 hover:bg-violet-600 hover:text-white cursor-pointer"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {streak >= 2 && !isWon && (
                <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black animate-pulse">
                    🔥 {streak}× MATCH STREAK!
                </div>
            )}

            <div className="grid grid-cols-4 gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl">
                {cards.map((card, idx) => {
                    const isCardFlipped = flipped.includes(idx) || matched.includes(idx);
                    const isMatchedCard = matched.includes(idx);

                    return (
                        <motion.button
                            key={card.id}
                            type="button"
                            animate={{ scale: isCardFlipped ? 1.03 : 1 }}
                            transition={{ type: "spring", stiffness: 360, damping: 24 }}
                            whileTap={!isCardFlipped ? { scale: 0.94 } : {}}
                            onClick={() => handleCardClick(idx)}
                            className={`w-16 h-18 sm:w-20 sm:h-24 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-bold border transition-all cursor-pointer ${
                                isMatchedCard
                                    ? "bg-gradient-to-br from-emerald-500/35 to-teal-700/40 border-emerald-400 text-white shadow-[0_0_16px_rgba(16,185,129,0.4)]"
                                    : isCardFlipped
                                    ? "bg-gradient-to-br from-violet-600 to-indigo-700 border-violet-400 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)]"
                                    : "bg-white/[0.08] hover:bg-white/[0.14] border-white/15 text-white/30"
                            }`}
                        >
                            {isCardFlipped ? card.emoji : "?"}
                        </motion.button>
                    );
                })}
            </div>

            {isWon && (
                <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-emerald-500/20 border border-emerald-400 text-center w-full max-w-xs"
                >
                    <span className="text-3xl">🏆</span>
                    <h4 className="text-base font-black text-emerald-300">
                        Cleared in {moves} moves ({elapsed}s)!
                    </h4>
                    <p className="text-xs text-white/80">
                        Score: <strong className="text-amber-300">{finalScore}</strong> (Best Streak {maxStreak}×)
                    </p>
                    <button
                        type="button"
                        onClick={() => initCards(pairCount)}
                        className="mt-1 px-5 py-2 rounded-xl bg-emerald-500 text-black font-black text-xs cursor-pointer"
                    >
                        Play Again
                    </button>
                </motion.div>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   4. 2048 TORNADO (Swipe Gestures, 1-Step Undo, 2048 Victory & Endless)
   ═══════════════════════════════════════════════════════════════ */
const addTileTo2048 = (b) => {
    const empty = [];
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (b[r][c] === 0) empty.push([r, c]);
        }
    }
    if (empty.length === 0) return b;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    const next = b.map((row) => [...row]);
    next[r][c] = Math.random() < 0.9 ? 2 : 4;
    return next;
};

const createInitial2048Board = () => {
    const b = Array(4).fill(null).map(() => Array(4).fill(0));
    return addTileTo2048(addTileTo2048(b));
};

const Game2048 = ({ onBack, isMuted }) => {
    const touchStartRef = useRef(null);
    const savedRunRef = useRef(false);

    const [board, setBoard] = useState(() => createInitial2048Board());
    const [undoSnapshot, setUndoSnapshot] = useState(null);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("2048_highscore") || 0));
    const [hasWon2048, setHasWon2048] = useState(false);
    const [showWinBanner, setShowWinBanner] = useState(false);
    const [gameOver, setGameOver] = useState(false);

    const playAudio = useCallback((type) => {
        if (!isMuted) soundEngine.play(type);
    }, [isMuted]);

    const addRandomTile = useCallback((b) => addTileTo2048(b), []);

    const init2048 = useCallback(() => {
        playAudio("whoosh");
        savedRunRef.current = false;
        setBoard(createInitial2048Board());
        setUndoSnapshot(null);
        setScore(0);
        setHasWon2048(false);
        setShowWinBanner(false);
        setGameOver(false);
    }, [playAudio]);

    const move = useCallback((direction) => {
        if (gameOver || showWinBanner) return;
        const result = move2048Board(board, direction);
        if (!result.changed) return;

        setUndoSnapshot({ board: board.map((r) => [...r]), score });
        playAudio(result.gained > 0 ? "coin" : "laser");

        const finalBoard = addRandomTile(result.board);
        const nextScore = score + result.gained;
        setBoard(finalBoard);
        setScore(nextScore);

        if (nextScore > highScore) {
            setHighScore(nextScore);
            localStorage.setItem("2048_highscore", String(nextScore));
        }

        if (!hasWon2048 && hasReachedTile(finalBoard, 2048)) {
            playAudio("win");
            setHasWon2048(true);
            setShowWinBanner(true);
            if (!savedRunRef.current) {
                savedRunRef.current = true;
                saveBackendGameScore("2048", nextScore);
            }
        }

        if (!hasValid2048Moves(finalBoard)) {
            playAudio("boom");
            setGameOver(true);
            if (!savedRunRef.current && nextScore > 0) {
                savedRunRef.current = true;
                saveBackendGameScore("2048", nextScore);
            }
        }
    }, [board, score, highScore, gameOver, showWinBanner, hasWon2048, addRandomTile, playAudio]);

    const handleUndo = () => {
        if (!undoSnapshot) return;
        setBoard(undoSnapshot.board);
        setScore(undoSnapshot.score);
        setGameOver(false);
        setUndoSnapshot(null);
    };

    const moveRef = useRef(move);
    useEffect(() => { moveRef.current = move; }, [move]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); moveRef.current("left"); }
            else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); moveRef.current("right"); }
            else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); moveRef.current("up"); }
            else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { e.preventDefault(); moveRef.current("down"); }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const onTouchStart = (e) => {
        const t = e.touches[0];
        touchStartRef.current = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e) => {
        if (!touchStartRef.current) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStartRef.current.x;
        const dy = t.clientY - touchStartRef.current.y;
        touchStartRef.current = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
        if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
        else move(dy > 0 ? "down" : "up");
    };

    const getTileColor = (val) => {
        switch (val) {
            case 2: return "bg-slate-700/80 text-white";
            case 4: return "bg-cyan-900 text-cyan-200";
            case 8: return "bg-cyan-700 text-white font-bold";
            case 16: return "bg-blue-600 text-white font-bold";
            case 32: return "bg-indigo-600 text-white font-bold";
            case 64: return "bg-violet-600 text-white font-black";
            case 128: return "bg-fuchsia-600 text-white font-black shadow-[0_0_15px_#d946ef]";
            case 256: return "bg-rose-600 text-white font-black shadow-[0_0_15px_#e11d48]";
            case 512: return "bg-amber-500 text-black font-black shadow-[0_0_15px_#f59e0b]";
            case 1024: return "bg-amber-400 text-black font-black shadow-[0_0_20px_#fbbf24]";
            case 2048: return "bg-emerald-400 text-black font-black shadow-[0_0_25px_#34d399]";
            default: return val > 2048 ? "bg-teal-300 text-black font-black" : "bg-white/[0.04] text-transparent";
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 max-w-xl mx-auto w-full select-none">
            <div className="flex items-center justify-between w-full px-1">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
                >
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white/70">Max: <strong className="text-cyan-300">{Math.max(...board.flat())}</strong></span>
                    <span className="text-xs font-bold text-white/70">Score: <strong className="text-amber-300">{score}</strong></span>
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" /> {Math.max(highScore, score)}
                    </span>
                    <button
                        type="button"
                        onClick={handleUndo}
                        disabled={!undoSnapshot}
                        title="Undo Move"
                        className="p-1.5 rounded-lg bg-white/10 text-white disabled:opacity-35 cursor-pointer"
                    >
                        <Undo2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={init2048}
                        className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            <div
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                className="relative w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] p-3.5 rounded-3xl bg-[#0a0f1d] border-2 border-indigo-500/35 shadow-2xl touch-none"
            >
                <div className="grid grid-cols-4 grid-rows-4 gap-2.5 w-full h-full">
                    {board.flatMap((row, r) =>
                        row.map((val, c) => (
                            <div
                                key={`${r}-${c}`}
                                className={`rounded-2xl flex items-center justify-center ${
                                    val >= 1024 ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
                                } transition-colors duration-100 ${getTileColor(val)}`}
                            >
                                {val > 0 ? val : ""}
                            </div>
                        ))
                    )}
                </div>

                {showWinBanner && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-3xl gap-3 p-4 text-center">
                        <span className="text-4xl">👑</span>
                        <h4 className="text-xl font-black text-emerald-300">2048 Reached!</h4>
                        <p className="text-xs text-white/75">Current Score: <strong className="text-amber-300">{score}</strong></p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowWinBanner(false)}
                                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-black text-xs cursor-pointer"
                            >
                                Keep Playing
                            </button>
                            <button
                                type="button"
                                onClick={init2048}
                                className="px-4 py-2.5 rounded-xl bg-white/15 text-white font-bold text-xs cursor-pointer"
                            >
                                Restart
                            </button>
                        </div>
                    </div>
                )}

                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm rounded-3xl gap-3">
                        <span className="text-4xl">🏁</span>
                        <h4 className="text-lg font-black text-rose-400">No More Moves!</h4>
                        <p className="text-xs text-white/75">Final Score: <strong className="text-amber-300">{score}</strong></p>
                        <button
                            type="button"
                            onClick={init2048}
                            className="px-5 py-2.5 rounded-xl bg-amber-400 text-black font-black text-xs cursor-pointer"
                        >
                            Try Again
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 gap-2 w-56">
                <div />
                <button type="button" onClick={() => move("up")} className="h-12 rounded-2xl bg-white/10 active:bg-indigo-500 font-bold text-white cursor-pointer">▲</button>
                <div />
                <button type="button" onClick={() => move("left")} className="h-12 rounded-2xl bg-white/10 active:bg-indigo-500 font-bold text-white cursor-pointer">◀</button>
                <button type="button" onClick={() => move("down")} className="h-12 rounded-2xl bg-white/10 active:bg-indigo-500 font-bold text-white cursor-pointer">▼</button>
                <button type="button" onClick={() => move("right")} className="h-12 rounded-2xl bg-white/10 active:bg-indigo-500 font-bold text-white cursor-pointer">▶</button>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   5. ZOMBIE SURVIVAL (WASD Move, 3HP, Auto-Fire Hold, Boss & Bombs)
   ═══════════════════════════════════════════════════════════════ */
const ZombieShooter = ({ onBack, isMuted }) => {
    const canvasRef = useRef(null);
    const stateRef = useRef(createZombieState(400, 400));
    const savedRunRef = useRef(false);
    const virtualMoveRef = useRef({ x: 0, y: 0 });

    const [hud, setHud] = useState({ kills: 0, score: 0, hp: 3, bombs: 1, spread: false });
    const [autoFire, setAutoFire] = useState(true);
    const [phase, setPhase] = useState("ready"); // ready | playing | paused | gameover
    const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("zombie_highscore") || 0));

    const autoFireRef = useRef(autoFire);
    const highScoreRef = useRef(highScore);
    const isMutedRef = useRef(isMuted);
    useEffect(() => { autoFireRef.current = autoFire; }, [autoFire]);
    useEffect(() => { highScoreRef.current = highScore; }, [highScore]);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

    const playAudio = useCallback((type) => {
        if (!isMutedRef.current) soundEngine.play(type);
    }, []);

    const startGame = useCallback(() => {
        playAudio("whoosh");
        stateRef.current = createZombieState(400, 400);
        savedRunRef.current = false;
        setHud({ kills: 0, score: 0, hp: 3, bombs: 1, spread: false });
        setPhase("playing");
    }, [playAudio]);

    const detonateBomb = useCallback(() => {
        if (triggerZombieBomb(stateRef.current)) {
            playAudio("boom");
            const s = stateRef.current;
            setHud({ kills: s.kills, score: s.score, hp: s.player.hp, bombs: s.bombs, spread: s.player.spreadTimer > 0 });
        }
    }, [playAudio]);

    useEffect(() => {
        if (phase !== "playing") return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        let animationId;
        let lastTime = performance.now();
        let hudSync = 0;

        const aim = { x: 200, y: 80, down: false };
        const keys = {};

        const onKeyDown = (e) => {
            keys[e.code] = true;
            if (e.code === "Space") {
                e.preventDefault();
                detonateBomb();
            }
        };
        const onKeyUp = (e) => { keys[e.code] = false; };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        const updateAim = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            aim.x = (clientX - rect.left) * (canvas.width / rect.width);
            aim.y = (clientY - rect.top) * (canvas.height / rect.height);
        };
        const onMouseMove = (e) => updateAim(e.clientX, e.clientY);
        const onMouseDown = (e) => {
            aim.down = true;
            updateAim(e.clientX, e.clientY);
            if (fireZombieWeapon(stateRef.current, aim.x, aim.y)) playAudio("laser");
        };
        const onMouseUp = () => { aim.down = false; };
        const onTouchStart = (e) => {
            e.preventDefault();
            aim.down = true;
            updateAim(e.touches[0].clientX, e.touches[0].clientY);
            if (fireZombieWeapon(stateRef.current, aim.x, aim.y)) playAudio("laser");
        };
        const onTouchMove = (e) => {
            e.preventDefault();
            updateAim(e.touches[0].clientX, e.touches[0].clientY);
        };

        canvas.addEventListener("mousemove", onMouseMove);
        canvas.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mouseup", onMouseUp);
        canvas.addEventListener("touchstart", onTouchStart, { passive: false });
        canvas.addEventListener("touchmove", onTouchMove, { passive: false });

        const loop = (now) => {
            const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
            lastTime = now;
            const st = stateRef.current;

            const vMove = virtualMoveRef.current;
            const move = {
                x: vMove.x !== 0 ? vMove.x : (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0),
                y: vMove.y !== 0 ? vMove.y : (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0),
            };
            st.player.angle = Math.atan2(aim.y - st.player.y, aim.x - st.player.x);

            // Auto-target nearest zombie if autoFire on and holding or mobile
            if (aim.down || autoFireRef.current) {
                let targetX = aim.x;
                let targetY = aim.y;
                if (autoFireRef.current && !aim.down && st.zombies.length > 0) {
                    let best = st.zombies[0];
                    let bestD = Infinity;
                    for (const z of st.zombies) {
                        const d = Math.hypot(z.x - st.player.x, z.y - st.player.y);
                        if (d < bestD) { bestD = d; best = z; }
                    }
                    targetX = best.x;
                    targetY = best.y;
                    st.player.angle = Math.atan2(targetY - st.player.y, targetX - st.player.x);
                }
                if (fireZombieWeapon(st, targetX, targetY)) playAudio("laser");
            }

            const res = stepZombieState(st, dt, move);
            if (res.event === "kill") playAudio("coin");
            if (res.event === "powerup") playAudio("tada");
            if (res.event === "hurt") playAudio("boing");
            if (res.event === "crash") {
                playAudio("boom");
                setPhase("gameover");
                setHud({ kills: st.kills, score: st.score, hp: 0, bombs: st.bombs, spread: false });
                if (st.score > highScoreRef.current) {
                    highScoreRef.current = st.score;
                    setHighScore(st.score);
                    localStorage.setItem("zombie_highscore", String(st.score));
                }
                if (!savedRunRef.current && st.score > 0) {
                    savedRunRef.current = true;
                    saveBackendGameScore("zombie", st.score);
                }
                return;
            }

            hudSync += dt;
            if (hudSync >= 0.1) {
                hudSync = 0;
                setHud({
                    kills: st.kills,
                    score: st.score,
                    hp: st.player.hp,
                    bombs: st.bombs,
                    spread: st.player.spreadTimer > 0,
                });
            }

            // Render
            ctx.fillStyle = "#080d19";
            ctx.fillRect(0, 0, st.cw, st.ch);

            // Arena grid
            ctx.strokeStyle = "rgba(132, 204, 22, 0.06)";
            ctx.lineWidth = 1;
            for (let g = 40; g < st.cw; g += 40) {
                ctx.beginPath();
                ctx.moveTo(g, 0); ctx.lineTo(g, st.ch);
                ctx.moveTo(0, g); ctx.lineTo(st.cw, g);
                ctx.stroke();
            }

            // Pickups
            for (const pk of st.pickups) {
                ctx.fillStyle = pk.kind === "spread" ? "#fbbf24" : pk.kind === "heal" ? "#f43f5e" : "#38bdf8";
                ctx.beginPath();
                ctx.arc(pk.x, pk.y, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#000";
                ctx.font = "900 10px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(pk.kind === "spread" ? "3×" : pk.kind === "heal" ? "+" : "B", pk.x, pk.y + 0.5);
            }

            // Particles
            for (const pt of st.particles) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, pt.alpha);
                ctx.fillStyle = pt.color;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Bullets
            ctx.fillStyle = "#fbbf24";
            for (const b of st.bullets) {
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Zombies + Boss HP Bar
            for (const z of st.zombies) {
                ctx.fillStyle = z.boss ? "#f43f5e" : "#84cc16";
                ctx.beginPath();
                ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#0f172a";
                ctx.beginPath();
                ctx.arc(z.x - 4, z.y - 3, 2.5, 0, Math.PI * 2);
                ctx.arc(z.x + 4, z.y - 3, 2.5, 0, Math.PI * 2);
                ctx.fill();
                if (z.boss && z.maxHp > 1) {
                    const bw = z.radius * 2.2;
                    const pct = Math.max(0, Math.min(1, z.hp / z.maxHp));
                    ctx.fillStyle = "rgba(0,0,0,0.65)";
                    ctx.fillRect(z.x - bw / 2, z.y - z.radius - 10, bw, 5);
                    ctx.fillStyle = "#f43f5e";
                    ctx.fillRect(z.x - bw / 2, z.y - z.radius - 10, bw * pct, 5);
                }
            }

            // Player
            if (st.player.invulnTimer <= 0 || Math.floor(now * 0.02) % 2 === 0) {
                ctx.save();
                ctx.translate(st.player.x, st.player.y);
                ctx.rotate(st.player.angle);
                ctx.fillStyle = st.player.spreadTimer > 0 ? "#fbbf24" : "#38bdf8";
                ctx.beginPath();
                ctx.arc(0, 0, st.player.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#e2e8f0";
                ctx.fillRect(st.player.radius - 4, -4, 15, 8);
                ctx.restore();
            }

            animationId = requestAnimationFrame(loop);
        };

        animationId = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            canvas.removeEventListener("mousemove", onMouseMove);
            canvas.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("mouseup", onMouseUp);
            canvas.removeEventListener("touchstart", onTouchStart);
            canvas.removeEventListener("touchmove", onTouchMove);
        };
    }, [phase, playAudio, detonateBomb]);

    return (
        <div className="flex flex-col items-center gap-4 max-w-xl mx-auto w-full select-none">
            <div className="flex items-center justify-between w-full px-1 flex-wrap gap-2">
                <button type="button" onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold text-white cursor-pointer">
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-400">{"❤️".repeat(Math.max(0, hud.hp))}</span>
                    <button
                        type="button"
                        onClick={detonateBomb}
                        disabled={phase !== "playing" || hud.bombs <= 0}
                        className="px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-200 text-xs font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                    >
                        <Bomb className="h-3.5 w-3.5" /> ×{hud.bombs}
                    </button>
                    {(phase === "playing" || phase === "paused") && (
                        <button
                            type="button"
                            onClick={() => setPhase((p) => (p === "playing" ? "paused" : "playing"))}
                            aria-label={phase === "paused" ? "Resume Zombie Survival" : "Pause Zombie Survival"}
                            className="p-1.5 rounded-lg bg-white/10 text-white cursor-pointer"
                        >
                            {phase === "paused" ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setAutoFire((a) => !a)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                            autoFire ? "bg-lime-500/20 border-lime-400/50 text-lime-300" : "bg-white/5 border-white/10 text-white/60"
                        }`}
                    >
                        {autoFire ? "Auto-Aim ON" : "Manual"}
                    </button>
                    <span className="text-xs font-bold text-white/75">Kills: <strong className="text-lime-400">{hud.kills}</strong></span>
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" /> {Math.max(highScore, hud.score)}
                    </span>
                </div>
            </div>

            <div className="relative w-full max-w-[480px] aspect-square rounded-3xl overflow-hidden border-2 border-lime-500/35 shadow-[0_0_40px_rgba(132,204,22,0.18)]">
                <canvas ref={canvasRef} width={400} height={400} className="w-full h-full bg-[#080d19] touch-none" />

                {phase === "paused" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3">
                        <h3 className="text-xl font-black text-white">Paused</h3>
                        <button type="button" onClick={() => setPhase("playing")} className="px-6 py-2.5 rounded-xl bg-lime-500 text-black font-black text-sm cursor-pointer">
                            Resume
                        </button>
                    </div>
                )}

                {phase === "ready" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3 p-4 text-center">
                        <span className="text-5xl">🧟</span>
                        <h3 className="text-xl font-black text-white">Zombie Survival</h3>
                        <p className="text-xs text-white/65">WASD or Touch Pad to dodge, tap/hold to shoot, Space for EMP Bomb! 3 HP + Boss waves.</p>
                        <button type="button" onClick={startGame} className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-lime-500 hover:bg-lime-400 text-black font-black text-sm cursor-pointer active:scale-95">
                            <Play className="h-4 w-4 fill-current" /> Survive
                        </button>
                    </div>
                )}

                {phase === "gameover" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3">
                        <span className="text-5xl">💀</span>
                        <h3 className="text-xl font-black text-rose-400">Overrun!</h3>
                        <p className="text-xs text-white/75">Kills: <strong className="text-lime-400">{hud.kills}</strong> • Score: <strong className="text-amber-300">{hud.score}</strong></p>
                        <button type="button" onClick={startGame} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-lime-500 hover:bg-lime-400 text-black font-black text-sm cursor-pointer active:scale-95">
                            <RotateCcw className="h-4 w-4" /> Fight Again
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile Virtual Movement Pad (so mobile players can dodge seamlessly with Auto-Aim) */}
            <div className="grid grid-cols-3 gap-2 w-56 md:hidden">
                <div />
                <button
                    type="button"
                    onPointerDown={() => { virtualMoveRef.current = { x: 0, y: -1 }; }}
                    onPointerUp={() => { virtualMoveRef.current = { x: 0, y: 0 }; }}
                    onPointerLeave={() => { virtualMoveRef.current = { x: 0, y: 0 }; }}
                    aria-label="Move Up"
                    className="h-12 rounded-2xl bg-white/10 active:bg-lime-500/40 font-bold text-white touch-none"
                >▲</button>
                <div />
                <button
                    type="button"
                    onPointerDown={() => { virtualMoveRef.current = { x: -1, y: 0 }; }}
                    onPointerUp={() => { virtualMoveRef.current = { x: 0, y: 0 }; }}
                    onPointerLeave={() => { virtualMoveRef.current = { x: 0, y: 0 }; }}
                    aria-label="Move Left"
                    className="h-12 rounded-2xl bg-white/10 active:bg-lime-500/40 font-bold text-white touch-none"
                >◀</button>
                <button
                    type="button"
                    onPointerDown={() => { virtualMoveRef.current = { x: 0, y: 1 }; }}
                    onPointerUp={() => { virtualMoveRef.current = { x: 0, y: 0 }; }}
                    onPointerLeave={() => { virtualMoveRef.current = { x: 0, y: 0 }; }}
                    aria-label="Move Down"
                    className="h-12 rounded-2xl bg-white/10 active:bg-lime-500/40 font-bold text-white touch-none"
                >▼</button>
                <button
                    type="button"
                    onPointerDown={() => { virtualMoveRef.current = { x: 1, y: 0 }; }}
                    onPointerUp={() => { virtualMoveRef.current = { x: 0, y: 0 }; }}
                    onPointerLeave={() => { virtualMoveRef.current = { x: 0, y: 0 }; }}
                    aria-label="Move Right"
                    className="h-12 rounded-2xl bg-white/10 active:bg-lime-500/40 font-bold text-white touch-none"
                >▶</button>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   6. NEON DODGE (Jet Sprite, Shield Pickups, Near-Miss Combos)
   ═══════════════════════════════════════════════════════════════ */
const NeonDodge = ({ onBack, isMuted }) => {
    const canvasRef = useRef(null);
    const stateRef = useRef(createNeonDodgeState(380, 450));
    const savedRunRef = useRef(false);
    const virtualDirRef = useRef(0);

    const [score, setScore] = useState(0);
    const [hasShield, setHasShield] = useState(false);
    const [phase, setPhase] = useState("ready"); // ready | playing | paused | gameover
    const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("neondodge_highscore") || 0));

    const highScoreRef = useRef(highScore);
    const isMutedRef = useRef(isMuted);
    useEffect(() => { highScoreRef.current = highScore; }, [highScore]);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

    const playAudio = useCallback((type) => {
        if (!isMutedRef.current) soundEngine.play(type);
    }, []);

    const startGame = useCallback(() => {
        playAudio("whoosh");
        stateRef.current = createNeonDodgeState(380, 450);
        savedRunRef.current = false;
        setScore(0);
        setHasShield(false);
        setPhase("playing");
    }, [playAudio]);

    useEffect(() => {
        if (phase !== "playing") return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        let animationId;
        let lastTime = performance.now();
        let hudSync = 0;
        const keys = {};

        const onKeyDown = (e) => { keys[e.code] = true; };
        const onKeyUp = (e) => { keys[e.code] = false; };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        const movePointer = (clientX) => {
            const rect = canvas.getBoundingClientRect();
            const px = (clientX - rect.left) * (canvas.width / rect.width);
            const p = stateRef.current.player;
            p.x = Math.max(p.width / 2, Math.min(canvas.width - p.width / 2, px));
        };
        const onTouchMove = (e) => { e.preventDefault(); movePointer(e.touches[0].clientX); };
        const onPointerMove = (e) => { if (e.buttons > 0) movePointer(e.clientX); };

        canvas.addEventListener("touchmove", onTouchMove, { passive: false });
        canvas.addEventListener("pointermove", onPointerMove);

        const loop = (now) => {
            const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
            lastTime = now;
            const st = stateRef.current;

            const kbDir = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
            const dir = virtualDirRef.current !== 0 ? virtualDirRef.current : kbDir;
            const res = stepNeonDodge(st, dt, dir);

            if (res.event === "pickup" || res.event === "graze") playAudio("coin");
            if (res.event === "shield_save") playAudio("tada");
            if (res.event === "crash") {
                playAudio("boom");
                setScore(st.score);
                setHasShield(false);
                setPhase("gameover");
                if (st.score > highScoreRef.current) {
                    highScoreRef.current = st.score;
                    setHighScore(st.score);
                    localStorage.setItem("neondodge_highscore", String(st.score));
                }
                if (!savedRunRef.current && st.score > 0) {
                    savedRunRef.current = true;
                    saveBackendGameScore("neondodge", st.score);
                }
                return;
            }

            hudSync += dt;
            if (hudSync >= 0.1) {
                hudSync = 0;
                setScore(st.score);
                setHasShield(st.player.shield);
            }

            // Render
            ctx.fillStyle = "rgba(10, 5, 25, 0.55)";
            ctx.fillRect(0, 0, st.cw, st.ch);

            // Pickups
            for (const pk of st.pickups) {
                ctx.save();
                ctx.fillStyle = pk.kind === "shield" ? "#22d3ee" : "#fbbf24";
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.arc(pk.x, pk.y, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#000";
                ctx.font = "900 10px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(pk.kind === "shield" ? "S" : "★", pk.x, pk.y + 0.5);
                ctx.restore();
            }

            // Obstacles
            for (const o of st.obstacles) {
                ctx.save();
                ctx.fillStyle = o.color;
                ctx.shadowColor = o.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.roundRect(o.x, o.y, o.width, o.height, 4);
                ctx.fill();
                ctx.restore();
            }

            // Near miss popup
            if (st.nearMissPop) {
                ctx.save();
                ctx.fillStyle = "#fde047";
                ctx.font = "900 13px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(st.nearMissPop.text, st.nearMissPop.x, st.nearMissPop.y);
                ctx.restore();
            }

            // Fighter Jet Player
            const p = st.player;
            if (p.invuln <= 0 || Math.floor(now * 0.02) % 2 === 0) {
                ctx.save();
                ctx.translate(p.x, p.y);
                if (p.shield) {
                    ctx.strokeStyle = "#22d3ee";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, 22, 0, Math.PI * 2);
                    ctx.stroke();
                }
                // Thruster flame
                ctx.fillStyle = "#38bdf8";
                ctx.beginPath();
                ctx.moveTo(-5, 11);
                ctx.lineTo(0, 20 + Math.random() * 6);
                ctx.lineTo(5, 11);
                ctx.fill();

                ctx.shadowColor = "#a855f7";
                ctx.shadowBlur = 16;
                ctx.fillStyle = "#c084fc";
                ctx.beginPath();
                ctx.moveTo(0, -15);
                ctx.lineTo(15, 12);
                ctx.lineTo(0, 6);
                ctx.lineTo(-15, 12);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            animationId = requestAnimationFrame(loop);
        };

        animationId = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            canvas.removeEventListener("touchmove", onTouchMove);
            canvas.removeEventListener("pointermove", onPointerMove);
        };
    }, [phase, playAudio]);

    return (
        <div className="flex flex-col items-center gap-4 max-w-xl mx-auto w-full select-none">
            <div className="flex items-center justify-between w-full px-1">
                <button type="button" onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold text-white cursor-pointer">
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="flex items-center gap-2.5">
                    {hasShield && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-bold flex items-center gap-1">
                            <Shield className="h-3.5 w-3.5" /> SHIELD
                        </span>
                    )}
                    {(phase === "playing" || phase === "paused") && (
                        <button
                            type="button"
                            onClick={() => setPhase((p) => (p === "playing" ? "paused" : "playing"))}
                            aria-label={phase === "paused" ? "Resume Neon Dodge" : "Pause Neon Dodge"}
                            className="p-1.5 rounded-lg bg-white/10 text-white cursor-pointer"
                        >
                            {phase === "paused" ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        </button>
                    )}
                    <span className="text-xs font-bold text-white/75">Score: <strong className="text-purple-400">{score}</strong></span>
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" /> {Math.max(highScore, score)}
                    </span>
                </div>
            </div>

            <div className="relative w-full max-w-[460px] aspect-[380/450] rounded-3xl overflow-hidden border-2 border-purple-500/35 shadow-[0_0_40px_rgba(168,85,247,0.18)]">
                <canvas ref={canvasRef} width={380} height={450} className="w-full h-full bg-[#0a0519] touch-none" />

                {phase === "paused" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3">
                        <h3 className="text-xl font-black text-white">Paused</h3>
                        <button type="button" onClick={() => setPhase("playing")} className="px-6 py-2.5 rounded-xl bg-purple-500 text-black font-black text-sm cursor-pointer">
                            Resume
                        </button>
                    </div>
                )}

                {phase === "ready" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3 p-4 text-center">
                        <span className="text-5xl animate-pulse">🛸</span>
                        <h3 className="text-xl font-black text-white">Neon Dodge</h3>
                        <p className="text-xs text-white/65">Drag, tap Left/Right buttons, or use A/D / Arrows. Graze close for +15 &amp; grab S Shields!</p>
                        <button type="button" onClick={startGame} className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-purple-500 hover:bg-purple-400 text-black font-black text-sm cursor-pointer active:scale-95">
                            <Play className="h-4 w-4 fill-current" /> Launch Jet
                        </button>
                    </div>
                )}

                {phase === "gameover" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3">
                        <span className="text-5xl">💥</span>
                        <h3 className="text-xl font-black text-rose-400">Reactor Breached!</h3>
                        <p className="text-xs text-white/75">Final Score: <strong className="text-purple-400 text-sm">{score}</strong></p>
                        <button type="button" onClick={startGame} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-500 hover:bg-purple-400 text-black font-black text-sm cursor-pointer active:scale-95">
                            <RotateCcw className="h-4 w-4" /> Fly Again
                        </button>
                    </div>
                )}
            </div>

            {/* Thumb-friendly Left / Right Steer Controls */}
            <div className="grid grid-cols-2 gap-3 w-64 md:hidden">
                <button
                    type="button"
                    onPointerDown={() => { virtualDirRef.current = -1; }}
                    onPointerUp={() => { virtualDirRef.current = 0; }}
                    onPointerLeave={() => { virtualDirRef.current = 0; }}
                    aria-label="Steer Left"
                    className="h-12 rounded-2xl bg-white/10 active:bg-purple-500/40 font-black text-white text-sm touch-none"
                >◀ Left</button>
                <button
                    type="button"
                    onPointerDown={() => { virtualDirRef.current = 1; }}
                    onPointerUp={() => { virtualDirRef.current = 0; }}
                    onPointerLeave={() => { virtualDirRef.current = 0; }}
                    aria-label="Steer Right"
                    className="h-12 rounded-2xl bg-white/10 active:bg-purple-500/40 font-black text-white text-sm touch-none"
                >Right ▶</button>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN ARCADE LOBBY COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function Arcade() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialNullNorth = searchParams.get("nullnorth") || "";
    const [selectedGame, setSelectedGame] = useState(() => (initialNullNorth ? "nullnorth" : null));
    const [nullNorthInviteCode, setNullNorthInviteCode] = useState(() =>
        initialNullNorth && initialNullNorth !== "HUB" ? initialNullNorth : ""
    );
    const [isMuted, setIsMuted] = useState(false);
    const [aiHubOpen, setAiHubOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState("all");
    const handleBack = useCallback(() => {
        setSelectedGame(null);
        setNullNorthInviteCode("");
        if (searchParams.has("nullnorth")) {
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = sessionStorage.getItem("token");
                if (!token) return;
                const res = await API.get("/user/stats", { params: { token } });
                const stats = res.data?.game_stats;
                if (stats && typeof stats === "object") {
                    Object.entries(stats).forEach(([game, sc]) => {
                        const localKey = `${game}_highscore`;
                        const localScore = Number(localStorage.getItem(localKey) || 0);
                        if (Number(sc) > localScore) {
                            localStorage.setItem(localKey, String(sc));
                        }
                    });
                }
            } catch (_) {}
        };
        fetchStats();
    }, []);

    const GAMES = [
        {
            id: "crownchess",
            title: "Crownfall Chess",
            emoji: "♔⚔️",
            tag: "NEW • Royal Strategy",
            category: "strategy",
            controls: "Click / Tap • AI (3 Tiers) + 2P",
            color: "from-amber-500 to-yellow-700",
            desc: "The noble classic redesigned: crisp SVG pieces, legal move rings, Castling, En Passant, Promotion & Alpha-Beta AI!"
        },
        {
            id: "subwaysurfers",
            title: "Tornado Surfers",
            emoji: "🏄‍♂️⚡",
            tag: "3D Rail Runner",
            category: "3d",
            controls: "Swipe / WASD • Space Shield",
            color: "from-cyan-500 to-fuchsia-600",
            desc: "Upgraded 3D trains with LED liveries, 360° rooftop flips, Hoverboards, Magnet & 3X Fever Overdrive!"
        },
        {
            id: "vortexbastion",
            title: "Vortex Bastion",
            emoji: "🗼⚡",
            tag: "3D Strategy TD",
            category: "strategy",
            controls: "Tap Grid • Build & Upgrade",
            color: "from-sky-500 to-indigo-700",
            desc: "Real-time 3D WebGL A* maze tower defense with branching upgrades & synergies!"
        },
        {
            id: "afterspace",
            title: "AFTERSPACE v3.0",
            emoji: "◈",
            tag: "Open World 4D",
            category: "3d",
            controls: "WASD / Virtual Stick • Shift Dash",
            color: "from-stone-500 to-neutral-800",
            desc: "Open-world 6-sector 3D exploration with simple-math dunes, thermal updrafts & AI tool control."
        },
        {
            id: "neonblade",
            title: "Neon Blade",
            emoji: "🎯🗡️",
            tag: "3D Cyber Forge",
            category: "3d",
            controls: "Tap / Space Throw • Slow-Mo",
            color: "from-rose-500 to-red-700",
            desc: "Three.js 3D blade forge, Razor Grazes, Chrono Slow-Mo, Overdrive & Boss cores!"
        },
        {
            id: "snake",
            title: "Super Snake",
            emoji: "🐍",
            tag: "Classic Retro",
            category: "action",
            controls: "Swipe / Arrows / D-Pad",
            color: "from-emerald-500 to-teal-700",
            desc: "Swipe or steer, eat golden bonus apples, and choose Solid or Portal Wrap Walls!"
        },
        {
            id: "flappy",
            title: "Flappy Tornado",
            emoji: "🌪️",
            tag: "Action 60fps",
            category: "action",
            controls: "Tap / Space Flap",
            color: "from-cyan-500 to-blue-700",
            desc: "Soar through neon wind tunnels and collect +3 golden wind crystals!"
        },
        {
            id: "2048",
            title: "2048 Tornado",
            emoji: "🔢✨",
            tag: "Logic Puzzle",
            category: "strategy",
            controls: "Swipe / Arrows + Undo",
            color: "from-indigo-600 to-violet-800",
            desc: "Touch-swipe tiles, undo mistakes, hit 2048, and keep pushing endless combos!"
        },
        {
            id: "memory",
            title: "Memory Match",
            emoji: "🧠💖",
            tag: "Brain Game",
            category: "strategy",
            controls: "Tap Cards (4×4 / 4×5)",
            color: "from-fuchsia-500 to-pink-700",
            desc: "4×4 or 4×5 grids with live timer, match streak multipliers & high scores!"
        },
        {
            id: "zombie",
            title: "Zombie Survival",
            emoji: "🧟🔫",
            tag: "Arena Shooter",
            category: "action",
            controls: "WASD / Pad + Auto-Aim + EMP",
            color: "from-lime-500 to-green-700",
            desc: "Move with WASD or Touch Pad, blast waves with 3-way spread drops, bosses & EMP bombs!"
        },
        {
            id: "neondodge",
            title: "Neon Dodge",
            emoji: "⚡🛸",
            tag: "Hyper Runner",
            category: "action",
            controls: "Drag / Left-Right / A-D",
            color: "from-purple-500 to-fuchsia-700",
            desc: "Pilot the cyber jet, grab S-shields, and stack +15 near-miss graze combos!"
        },
        {
            id: "photonpong",
            title: "Hyper Photon Pong",
            emoji: "🏓⚡",
            tag: "v2.0 UPDATED",
            isV2: true,
            category: "action",
            controls: "Drag / W-S • AI (3 Tiers) + 2P",
            color: "from-cyan-500 to-sky-700",
            desc: "v2.0 Remaster: spin curveball strikes, rally speed multiplier & 2P local duel."
        },
        {
            id: "cybertetris",
            title: "Polyomino Tetris",
            emoji: "🧱💠",
            tag: "v2.0 UPDATED",
            isV2: true,
            category: "strategy",
            controls: "Arrows / Space Hard Drop • C Hold",
            color: "from-indigo-500 to-blue-800",
            desc: "v2.0 Remaster: 7-bag randomizer, Ghost outline, Hold queue & Hard Drop combos."
        },
        {
            id: "crowncheckers",
            title: "Crown Checkers",
            emoji: "🔴👑",
            tag: "v2.0 UPDATED",
            isV2: true,
            category: "strategy",
            controls: "Tap Moves • Depth-4 AI + 2P",
            color: "from-emerald-500 to-green-800",
            desc: "v2.0 Remaster: forced capture rule, automatic multi-jump chains & King crowning."
        },
        {
            id: "prismbreakout",
            title: "Prism Breakout",
            emoji: "💎🎇",
            tag: "v2.0 UPDATED",
            isV2: true,
            category: "action",
            controls: "Drag Paddle / ← → • Power Drops",
            color: "from-fuchsia-500 to-purple-800",
            desc: "v2.0 Remaster: shattering prism bricks, Multi-ball splitters & Wide Paddle drops."
        },
        {
            id: "asteroidsnova",
            title: "Voidbreaker Asteroids",
            emoji: "☄️🚀",
            tag: "v2.0 UPDATED",
            isV2: true,
            category: "action",
            controls: "A/D Rotate • W Thrust • Space Fire • Shift Blink",
            color: "from-orange-500 to-red-800",
            desc: "v2.0 Remaster: 360° inertia thrust, splitting boulders & hyperspace Blink warp."
        },
        {
            id: "connect4",
            title: "Quantum Connect 4",
            emoji: "🟡🔴",
            tag: "NEW • ALPHA-BETA",
            category: "strategy",
            controls: "Tap Column • Depth-5 AI + 2P",
            color: "from-sky-500 to-cyan-800",
            desc: "Drop neon discs into the 7×6 matrix against an Alpha-Beta tactical solver or 2P."
        },
        {
            id: "reversi",
            title: "Eclipse Reversi",
            emoji: "⚫⚪",
            tag: "NEW • OTHELLO",
            category: "strategy",
            controls: "Tap Flip Hints • Corner AI + 2P",
            color: "from-teal-500 to-emerald-800",
            desc: "Flank & flip discs across 8×8 grid with live flip counters and corner-smart AI."
        },
        {
            id: "navalsonar",
            title: "Aegis Naval Sonar",
            emoji: "🚢📡",
            tag: "NEW • RADAR DUEL",
            category: "strategy",
            controls: "Tap Sonar Sector to Fire",
            color: "from-lime-500 to-emerald-800",
            desc: "Hunt & sink the 5-ship enemy armada against a probability Hunt-and-Target AI."
        },
        {
            id: "cybermines",
            title: "Tactical Minesweeper",
            emoji: "💣🚩",
            tag: "NEW • LOGIC GRID",
            category: "strategy",
            controls: "Tap Reveal / Right-Click Flag / Chord",
            color: "from-amber-500 to-orange-800",
            desc: "Guaranteed safe first click, Chording, Flag Mode & 9×9 / 12×12 / 14×14 grids."
        },
        {
            id: "sudokuzen",
            title: "Chrono Sudoku",
            emoji: "🔢🧩",
            tag: "NEW • 9×9 PUZZLE",
            category: "strategy",
            controls: "Tap Cell + 1–9 • Notes & Smart Hint",
            color: "from-violet-500 to-indigo-800",
            desc: "3 difficulty tiers with Pencil candidate notes, live conflicts & Smart Hint."
        },
        {
            id: "synthrhythm",
            title: "Synth Pulse Rhythm",
            emoji: "🎵⚡",
            tag: "NEW • BPM HIGHWAY",
            category: "action",
            controls: "Tap Pads / D-F-J-K Keys",
            color: "from-pink-500 to-rose-800",
            desc: "4-lane neon rhythm sprint with PERFECT timing judgements & 8× streak multiplier."
        },
        {
            id: "gravitydrop",
            title: "Gravity Merge Drop",
            emoji: "🫧🌟",
            tag: "NEW • PHYSICS MERGE",
            category: "action",
            controls: "Tap / Drag Aim to Drop Orbs",
            color: "from-sky-400 to-indigo-700",
            desc: "Drop & collide equal numbered energy orbs to fuse chains all the way up to 2048!"
        }
    ];

    const filteredGames = categoryFilter === "all"
        ? GAMES
        : categoryFilter === "v2"
        ? GAMES.filter((g) => g.isV2)
        : GAMES.filter((g) => g.category === categoryFilter);

    const getBestForGame = (gid) => {
        try {
            return Number(localStorage.getItem(`${gid}_highscore`) || 0);
        } catch (_) {
            return 0;
        }
    };

    return (
        <main
            className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar text-white select-none ${
                selectedGame === "vortexbastion"
                    ? "p-2 sm:p-4 pb-20 lg:pb-6"
                    : "p-4 md:p-8 pb-24 lg:pb-8"
            }`}
        >
            <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-6">
                {!selectedGame && (
                <header className="rounded-3xl border border-white/10 bg-gradient-to-r from-violet-950/40 via-black/50 to-indigo-950/40 p-5 md:p-8 backdrop-blur-2xl shadow-xl flex items-center justify-between gap-4">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-300">
                            <Gamepad2 className="h-4 w-4" />
                            ChatTornado Arcade
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-2">
                            Mini Games Zone <Sparkles className="h-6 w-6 text-amber-300" />
                        </h1>
                        <p className="mt-1.5 text-xs sm:text-sm text-white/60 max-w-xl">
                            23 hi-fi 60fps, strategy, rhythm, physics &amp; 3D WebGL arcade games including 5 v2.0 Updated Classics!
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <button
                            type="button"
                            onClick={() => setAiHubOpen(true)}
                            className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600/80 to-indigo-600/80 hover:from-violet-500 hover:to-indigo-500 border border-violet-300/35 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg transition cursor-pointer"
                        >
                            <Bot className="h-4 w-4 text-amber-300" />
                            <span>Gemini AI Hub</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsMuted((m) => !m)}
                            title={isMuted ? "Unmute Sound FX" : "Mute Sound FX"}
                            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 shadow-lg cursor-pointer"
                        >
                            {isMuted ? <VolumeX className="h-5 w-5 text-rose-400" /> : <Volume2 className="h-5 w-5 text-emerald-400" />}
                        </button>
                        <div className="hidden sm:flex text-5xl">🎮</div>
                    </div>
                </header>
                )}

                {selectedGame === "nullnorth" ? (
                    <NullNorthGame
                        onBack={handleBack}
                        isMuted={isMuted}
                        initialMatchCode={nullNorthInviteCode}
                    />
                ) : selectedGame === "vortexbastion" ? (
                    <VortexBastionGame
                        onBack={handleBack}
                        isMuted={isMuted}
                        onToggleMute={() => setIsMuted((m) => !m)}
                        onSaveScore={saveBackendGameScore}
                    />
                ) : selectedGame === "subwaysurfers" ? (
                    <TornadoSurfersGame onBack={handleBack} isMuted={isMuted} onSaveScore={saveBackendGameScore} />
                ) : selectedGame === "snake" ? (
                    <SnakeGame onBack={handleBack} isMuted={isMuted} />
                ) : selectedGame === "flappy" ? (
                    <FlappyTornadoGame onBack={handleBack} isMuted={isMuted} />
                ) : selectedGame === "2048" ? (
                    <Game2048 onBack={handleBack} isMuted={isMuted} />
                ) : selectedGame === "memory" ? (
                    <MemoryMatchGame onBack={handleBack} isMuted={isMuted} />
                ) : selectedGame === "zombie" ? (
                    <ZombieShooter onBack={handleBack} isMuted={isMuted} />
                ) : selectedGame === "neondodge" ? (
                    <NeonDodge onBack={handleBack} isMuted={isMuted} />
                ) : selectedGame === "neonblade" ? (
                    <NeonBladeGame onBack={handleBack} isMuted={isMuted} onSaveScore={saveBackendGameScore} />
                ) : selectedGame === "afterspace" ? (
                    <AfterspaceGame onBack={handleBack} isMuted={isMuted} onSaveScore={saveBackendGameScore} />
                ) : selectedGame === "crownchess" ? (
                    <CrownChessGame onBack={handleBack} isMuted={isMuted} onSaveScore={saveBackendGameScore} />
                ) : selectedGame === "photonpong" ? (
                    <PhotonPongGame onBack={handleBack} isMuted={isMuted} onSaveScore={saveBackendGameScore} />
                ) : selectedGame === "cybertetris" ? (
                    <TetrisV2Game onBack={handleBack} isMuted={isMuted} onSaveScore={saveBackendGameScore} />
                ) : selectedGame === "crowncheckers" ? (
                    <CheckersV2Game onBack={handleBack} isMuted={isMuted} onSaveScore={saveBackendGameScore} />
                ) : selectedGame === "prismbreakout" ? (
                    <PrismBreakoutGame onBack={handleBack} isMuted={isMuted} onSaveScore={saveBackendGameScore} />
                ) : selectedGame === "asteroidsnova" ? (
                    <AsteroidsNovaGame onBack={handleBack} isMuted={isMuted} onSaveScore={saveBackendGameScore} />
                ) : selectedGame === "connect4" ? (
                    <ConnectFourGame onBack={handleBack} isMuted={isMuted} onSaveScore={saveBackendGameScore} />
                ) : selectedGame === "reversi" ? (
                    <ReversiEclipseGame onBack={handleBack} isMuted={isMuted} onSaveScore={saveBackendGameScore} />
                ) : selectedGame === "navalsonar" ? (
                    <NavalSonarGame onBack={handleBack} isMuted={isMuted} onSaveScore={saveBackendGameScore} />
                ) : selectedGame === "cybermines" ? (
                    <MinesweeperTacticalGame onBack={handleBack} isMuted={isMuted} onSaveScore={saveBackendGameScore} />
                ) : selectedGame === "sudokuzen" ? (
                    <SudokuZenGame onBack={handleBack} isMuted={isMuted} onSaveScore={saveBackendGameScore} />
                ) : selectedGame === "synthrhythm" ? (
                    <SynthRhythmGame onBack={handleBack} isMuted={isMuted} onSaveScore={saveBackendGameScore} />
                ) : selectedGame === "gravitydrop" ? (
                    <GravityMergeDropGame onBack={handleBack} isMuted={isMuted} onSaveScore={saveBackendGameScore} />
                ) : (
                    <div className="space-y-5">
                        {/* Featured Multiplayer Flagship: NULL//NORTH */}
                        <motion.div
                            whileHover={{ scale: 1.01, y: -2 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => {
                                if (!isMuted) soundEngine.play("tada");
                                setSelectedGame("nullnorth");
                            }}
                            className="relative overflow-hidden rounded-3xl border border-cyan-400/35 bg-gradient-to-r from-[#091526] via-[#070b14] to-[#140a24] p-6 sm:p-7 shadow-2xl cursor-pointer hover:border-cyan-300/60 transition-all"
                        >
                            <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-cyan-500/15 blur-3xl" />
                            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="space-y-2 max-w-2xl">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-xs font-black text-cyan-300 uppercase tracking-wider">
                                        <Compass className="w-3.5 h-3.5" /> NEW • 2–4 Player Asymmetric Co-Op
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-black text-white">
                                        NULL<span className="text-cyan-400">//</span>NORTH
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                        You can see the maze. Your teammate can see the truth. Neither can escape alone — play Cartographer, Seer, Decoder, or Architect with ChatTornado invites &amp; real-time WebSocket sync!
                                    </p>
                                </div>
                                <div className="shrink-0 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 font-black text-sm text-center shadow-lg shadow-cyan-500/20">
                                    Enter NULL//NORTH →
                                </div>
                            </div>
                        </motion.div>

                        {/* Crisp Category Filter Bar */}
                        <div className="flex flex-wrap items-center gap-2">
                            {[
                                { id: "all", label: `All Games (${GAMES.length})` },
                                { id: "v2", label: "v2.0 Updated (5)" },
                                { id: "3d", label: "3D & Worlds" },
                                { id: "strategy", label: "Strategy & Classics" },
                                { id: "action", label: "Action & Reflex" },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setCategoryFilter(tab.id)}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer ${
                                        categoryFilter === tab.id
                                            ? "bg-violet-500 text-white border-violet-300 shadow-md"
                                            : "bg-white/[0.04] text-white/70 border-white/10 hover:bg-white/[0.08]"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Spacious 3-Column Games Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredGames.map((game) => {
                            const bestScore = getBestForGame(game.id);
                            return (
                            <motion.div
                                key={game.id}
                                whileHover={{ scale: 1.03, y: -4 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => {
                                    if (!isMuted) soundEngine.play("coin");
                                    setSelectedGame(game.id);
                                }}
                                className="group relative flex flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 shadow-xl cursor-pointer hover:border-white/25 hover:bg-white/[0.09] transition-all overflow-hidden"
                            >
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${game.color} opacity-20 rounded-bl-full pointer-events-none group-hover:opacity-40 transition-opacity`} />

                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-4xl">{game.emoji}</div>
                                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/10 text-white/80 border border-white/10">
                                            {game.tag}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black text-white group-hover:text-amber-200 transition-colors">
                                        {game.title}
                                    </h3>
                                    <p className="mt-2 text-xs text-white/65 leading-relaxed">
                                        {game.desc}
                                    </p>
                                    {game.controls && (
                                        <div className="mt-3 text-xs font-semibold text-emerald-300/80">
                                            Controls: {game.controls}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-5 flex items-center justify-between pt-4 border-t border-white/10">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-xs font-bold text-violet-300 group-hover:text-white transition-colors">
                                            Play Now
                                        </span>
                                        {bestScore > 0 && (
                                            <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                                                <Trophy className="h-3.5 w-3.5" /> {bestScore.toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-violet-600 transition-colors">
                                        →
                                    </div>
                                </div>
                            </motion.div>
                            );
                        })}
                        </div>
                    </div>
                )}
            </section>

            {/* Discreet Universal In-Game Gemini AI Co-Pilot Button for non-fullscreen games */}
            {selectedGame && !["subwaysurfers", "afterspace"].includes(selectedGame) && (
                <button
                    type="button"
                    onClick={() => setAiHubOpen(true)}
                    className="fixed bottom-4 right-4 z-[60] px-3.5 py-2.5 rounded-2xl bg-violet-600/90 hover:bg-violet-500 border border-violet-300/40 text-white text-xs font-black flex items-center gap-2 shadow-xl backdrop-blur-md cursor-pointer"
                >
                    <Bot className="w-4 h-4 text-amber-300" />
                    <span>AI Co-Pilot</span>
                </button>
            )}

            <ArcadeAiCopilotModal
                isOpen={aiHubOpen}
                activeGameId={selectedGame || "auto"}
                onSelectGame={(gid) => setSelectedGame(gid)}
                onClose={() => setAiHubOpen(false)}
            />
        </main>
    );
}

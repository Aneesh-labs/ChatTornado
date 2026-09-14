import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Trophy, RotateCcw, Volume2, VolumeX, Sparkles, Play, ArrowLeft } from "lucide-react";
import { soundEngine } from "../../utils/soundEffects";

/* ═══════════════════════════════════════════════════════════════
   1. SNAKE GAME COMPONENT (Ultra-Smooth with Dynamic Grid)
   ═══════════════════════════════════════════════════════════════ */
const SnakeGame = ({ onBack, isMuted }) => {
    const GRID_SIZE = 18;
    const [snake, setSnake] = useState([[9, 9], [9, 10], [9, 11]]);
    const [food, setFood] = useState([4, 4]);
    const [dir, setDir] = useState([0, -1]); // moving UP
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("snake_highscore") || 0));
    const [isPlaying, setIsPlaying] = useState(false);
    const dirRef = useRef(dir);
    dirRef.current = dir;

    const playAudio = (type) => {
        if (!isMuted) soundEngine.play(type);
    };

    const generateFood = useCallback((currentSnake) => {
        let newFood;
        while (true) {
            newFood = [
                Math.floor(Math.random() * GRID_SIZE),
                Math.floor(Math.random() * GRID_SIZE)
            ];
            if (!currentSnake.some(seg => seg[0] === newFood[0] && seg[1] === newFood[1])) {
                break;
            }
        }
        return newFood;
    }, [GRID_SIZE]);

    const resetGame = () => {
        playAudio("whoosh");
        const initialSnake = [[9, 9], [9, 10], [9, 11]];
        setSnake(initialSnake);
        setFood(generateFood(initialSnake));
        setDir([0, -1]);
        setGameOver(false);
        setScore(0);
        setIsPlaying(true);
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isPlaying || gameOver) return;
            const [dx, dy] = dirRef.current;

            if ((e.key === "ArrowUp" || e.key === "w" || e.key === "W") && dy === 0) {
                e.preventDefault();
                setDir([0, -1]);
            } else if ((e.key === "ArrowDown" || e.key === "s" || e.key === "S") && dy === 0) {
                e.preventDefault();
                setDir([0, 1]);
            } else if ((e.key === "ArrowLeft" || e.key === "a" || e.key === "A") && dx === 0) {
                e.preventDefault();
                setDir([-1, 0]);
            } else if ((e.key === "ArrowRight" || e.key === "d" || e.key === "D") && dx === 0) {
                e.preventDefault();
                setDir([1, 0]);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isPlaying, gameOver]);

    // Game loop
    useEffect(() => {
        if (!isPlaying || gameOver) return;

        const interval = setInterval(() => {
            setSnake((prev) => {
                const head = prev[0];
                const [dx, dy] = dirRef.current;
                const newHead = [head[0] + dx, head[1] + dy];

                // Collision with walls
                if (newHead[0] < 0 || newHead[0] >= GRID_SIZE || newHead[1] < 0 || newHead[1] >= GRID_SIZE) {
                    playAudio("boom");
                    setGameOver(true);
                    return prev;
                }

                // Collision with self
                if (prev.some(seg => seg[0] === newHead[0] && seg[1] === newHead[1])) {
                    playAudio("boom");
                    setGameOver(true);
                    return prev;
                }

                // Check food
                const ateFood = newHead[0] === food[0] && newHead[1] === food[1];
                let nextSnake;

                if (ateFood) {
                    playAudio("coin");
                    setScore((s) => {
                        const newScore = s + 10;
                        if (newScore > highScore) {
                            setHighScore(newScore);
                            localStorage.setItem("snake_highscore", String(newScore));
                        }
                        return newScore;
                    });
                    setFood(generateFood([newHead, ...prev]));
                    nextSnake = [newHead, ...prev];
                } else {
                    nextSnake = [newHead, ...prev.slice(0, -1)];
                }

                return nextSnake;
            });
        }, Math.max(85, 140 - Math.floor(score / 30) * 8)); // Speed increases with score!

        return () => clearInterval(interval);
    }, [isPlaying, gameOver, food, generateFood, highScore, score, isMuted]);

    return (
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto w-full select-none">
            {/* Top Bar */}
            <div className="flex items-center justify-between w-full px-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Arcade
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white/70">Score: <strong className="text-emerald-400">{score}</strong></span>
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" /> {highScore}
                    </span>
                </div>
            </div>

            {/* Grid Container */}
            <div className="relative w-[320px] h-[320px] sm:w-[360px] sm:h-[360px] rounded-3xl bg-[#090d16] border-2 border-emerald-500/30 p-2 shadow-[0_0_40px_rgba(16,185,129,0.15)] overflow-hidden">
                <div
                    className="w-full h-full gap-[2px]"
                    style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`
                    }}
                >
                    {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
                        const x = idx % GRID_SIZE;
                        const y = Math.floor(idx / GRID_SIZE);
                        const isHead = snake[0][0] === x && snake[0][1] === y;
                        const isBody = snake.some(seg => seg[0] === x && seg[1] === y);
                        const isFood = food[0] === x && food[1] === y;

                        return (
                            <div
                                key={idx}
                                className={`rounded-[3px] transition-all duration-75 ${
                                    isHead
                                        ? "bg-emerald-400 shadow-[0_0_12px_#34d399] z-10"
                                        : isBody
                                        ? "bg-emerald-600/90"
                                        : isFood
                                        ? "bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse scale-90 rounded-full"
                                        : "bg-white/[0.02]"
                                }`}
                            />
                        );
                    })}
                </div>

                {/* Overlays */}
                {!isPlaying && !gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3">
                        <span className="text-5xl animate-bounce">🐍</span>
                        <h3 className="text-xl font-black text-white tracking-tight">Super Snake</h3>
                        <p className="text-xs text-white/60">Use Arrow keys or W/A/S/D to steer</p>
                        <button
                            type="button"
                            onClick={resetGame}
                            className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-95 transition-all"
                        >
                            <Play className="h-4 w-4 fill-current" /> Start Game
                        </button>
                    </div>
                )}

                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3">
                        <span className="text-5xl animate-pulse">💥</span>
                        <h3 className="text-xl font-black text-rose-400">Game Over!</h3>
                        <p className="text-xs text-white/70">Final Score: <strong className="text-emerald-400 text-sm">{score}</strong></p>
                        <button
                            type="button"
                            onClick={resetGame}
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-95 transition-all"
                        >
                            <RotateCcw className="h-4 w-4" /> Play Again
                        </button>
                    </div>
                )}
            </div>

            {/* Touch D-Pad */}
            <div className="grid grid-cols-3 gap-2 w-48 mt-1">
                <div />
                <button
                    type="button"
                    onClick={() => dirRef.current[1] === 0 && setDir([0, -1])}
                    className="h-12 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-emerald-500 active:text-black font-bold text-white flex items-center justify-center text-xl shadow"
                >
                    ▲
                </button>
                <div />
                <button
                    type="button"
                    onClick={() => dirRef.current[0] === 0 && setDir([-1, 0])}
                    className="h-12 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-emerald-500 active:text-black font-bold text-white flex items-center justify-center text-xl shadow"
                >
                    ◀
                </button>
                <button
                    type="button"
                    onClick={() => dirRef.current[1] === 0 && setDir([0, 1])}
                    className="h-12 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-emerald-500 active:text-black font-bold text-white flex items-center justify-center text-xl shadow"
                >
                    ▼
                </button>
                <button
                    type="button"
                    onClick={() => dirRef.current[0] === 0 && setDir([1, 0])}
                    className="h-12 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-emerald-500 active:text-black font-bold text-white flex items-center justify-center text-xl shadow"
                >
                    ▶
                </button>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   2. FLAPPY TORNADO COMPONENT (Ultra-Clean Physics & Cloud Pillars)
   ═══════════════════════════════════════════════════════════════ */
const FlappyTornadoGame = ({ onBack, isMuted }) => {
    const [tornadoY, setTornadoY] = useState(150);
    const [velocity, setVelocity] = useState(0);
    const [pipes, setPipes] = useState([]);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("flappy_highscore") || 0));
    const [isPlaying, setIsPlaying] = useState(false);
    const [gameOver, setGameOver] = useState(false);

    const playAudio = (type) => {
        if (!isMuted) soundEngine.play(type);
    };

    const jump = useCallback(() => {
        if (!isPlaying || gameOver) return;
        playAudio("boing");
        setVelocity(-7.2);
    }, [isPlaying, gameOver, isMuted]);

    const startGame = () => {
        playAudio("whoosh");
        setTornadoY(140);
        setVelocity(0);
        setPipes([{ x: 320, top: 75, bottom: 125 }]);
        setScore(0);
        setGameOver(false);
        setIsPlaying(true);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
                e.preventDefault();
                if (!isPlaying) startGame();
                else jump();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isPlaying, jump]);

    // Game loop
    useEffect(() => {
        if (!isPlaying || gameOver) return;

        const loop = setInterval(() => {
            // Gravity
            setTornadoY((y) => {
                const nextY = y + velocity;
                if (nextY >= 275 || nextY <= 0) {
                    playAudio("boom");
                    setGameOver(true);
                }
                return nextY;
            });
            setVelocity((v) => v + 0.48);

            // Move pipes
            setPipes((prev) => {
                const next = prev.map((p) => ({ ...p, x: p.x - 3.2 }));

                // Spawn new pipe
                const last = next[next.length - 1];
                if (last && last.x < 170) {
                    const topH = Math.floor(Math.random() * 95) + 35;
                    const gap = 115;
                    next.push({ x: 340, top: topH, bottom: 300 - topH - gap });
                }

                // Check scoring & collision
                next.forEach((p) => {
                    if (p.x < 50 && p.x >= 46) {
                        playAudio("coin");
                        setScore((s) => {
                            const newScore = s + 1;
                            if (newScore > highScore) {
                                setHighScore(newScore);
                                localStorage.setItem("flappy_highscore", String(newScore));
                            }
                            return newScore;
                        });
                    }

                    // Collision check
                    if (p.x > 22 && p.x < 76) {
                        if (tornadoY < p.top || tornadoY > 300 - p.bottom - 26) {
                            playAudio("boom");
                            setGameOver(true);
                        }
                    }
                });

                return next.filter((p) => p.x > -45);
            });
        }, 1000 / 40);

        return () => clearInterval(loop);
    }, [isPlaying, gameOver, velocity, tornadoY, highScore, isMuted]);

    return (
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto w-full select-none">
            <div className="flex items-center justify-between w-full px-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Arcade
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white/70">Score: <strong className="text-cyan-400">{score}</strong></span>
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" /> {highScore}
                    </span>
                </div>
            </div>

            <div
                onClick={isPlaying ? jump : startGame}
                className="relative w-[320px] h-[300px] sm:w-[360px] sm:h-[310px] rounded-3xl bg-gradient-to-b from-[#081226] via-[#0b1c36] to-[#040814] border-2 border-cyan-500/30 overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.15)] cursor-pointer"
            >
                {/* Background stars */}
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff20_1px,transparent_1px)] [background-size:18px_18px]" />

                {/* Pipes */}
                {pipes.map((p, idx) => (
                    <React.Fragment key={idx}>
                        <div
                            className="absolute bg-gradient-to-b from-cyan-500 to-blue-700 rounded-b-2xl border-b-2 border-cyan-300 shadow-lg"
                            style={{ left: p.x, top: 0, width: 38, height: p.top }}
                        />
                        <div
                            className="absolute bg-gradient-to-t from-cyan-500 to-blue-700 rounded-t-2xl border-t-2 border-cyan-300 shadow-lg"
                            style={{ left: p.x, bottom: 0, width: 38, height: p.bottom }}
                        />
                    </React.Fragment>
                ))}

                {/* Tornado Character */}
                <motion.div
                    className="absolute text-3xl flex items-center justify-center drop-shadow-[0_0_14px_rgba(56,189,248,0.9)] select-none"
                    style={{ left: 50, top: tornadoY, width: 32, height: 32 }}
                    animate={{ rotate: [0, 360] }}
                    transition={{ repeat: Infinity, duration: 0.35, ease: "linear" }}
                >
                    🌪️
                </motion.div>

                {/* Overlays */}
                {!isPlaying && !gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 backdrop-blur-sm gap-2">
                        <span className="text-5xl animate-bounce">🌪️</span>
                        <h3 className="text-xl font-black text-white tracking-tight">Flappy Tornado</h3>
                        <p className="text-xs text-white/70">Tap screen or Spacebar to fly!</p>
                        <button
                            type="button"
                            onClick={startGame}
                            className="mt-2 flex items-center gap-2 px-7 py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-sm shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-95 transition-all"
                        >
                            <Play className="h-4 w-4 fill-current" /> Tap to Fly
                        </button>
                    </div>
                )}

                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-2">
                        <span className="text-5xl animate-pulse">💥</span>
                        <h3 className="text-xl font-black text-rose-400">Oops, crashed!</h3>
                        <p className="text-xs text-white/70">Final Score: <strong className="text-cyan-400 text-sm">{score}</strong></p>
                        <button
                            type="button"
                            onClick={startGame}
                            className="mt-2 flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-sm shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-95 transition-all"
                        >
                            <RotateCcw className="h-4 w-4" /> Try Again
                        </button>
                    </div>
                )}
            </div>

            <p className="text-[11px] text-white/40">Tap anywhere on the box or press Spacebar to flap wings!</p>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   3. MEMORY MATCH COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const EMOJI_CARDS = ["🐱", "🐶", "🦁", "🐼", "🐸", "🦄", "🚀", "🍕"];

const MemoryMatchGame = ({ onBack, isMuted }) => {
    const [cards, setCards] = useState([]);
    const [flipped, setFlipped] = useState([]);
    const [matched, setMatched] = useState([]);
    const [moves, setMoves] = useState(0);
    const [isWon, setIsWon] = useState(false);

    const playAudio = (type) => {
        if (!isMuted) soundEngine.play(type);
    };

    const initCards = () => {
        playAudio("whoosh");
        const deck = [...EMOJI_CARDS, ...EMOJI_CARDS]
            .sort(() => Math.random() - 0.5)
            .map((emoji, idx) => ({ id: idx, emoji }));
        setCards(deck);
        setFlipped([]);
        setMatched([]);
        setMoves(0);
        setIsWon(false);
    };

    useEffect(() => {
        initCards();
    }, []);

    const handleCardClick = (idx) => {
        if (flipped.length === 2 || flipped.includes(idx) || matched.includes(idx)) return;

        playAudio("coin");
        const newFlipped = [...flipped, idx];
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
            setMoves((m) => m + 1);
            const [first, second] = newFlipped;
            if (cards[first].emoji === cards[second].emoji) {
                playAudio("tada");
                setMatched((prev) => {
                    const nextMatched = [...prev, first, second];
                    if (nextMatched.length === cards.length) {
                        playAudio("win");
                        setIsWon(true);
                    }
                    return nextMatched;
                });
                setFlipped([]);
            } else {
                setTimeout(() => {
                    setFlipped([]);
                }, 750);
            }
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto w-full select-none">
            <div className="flex items-center justify-between w-full px-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Arcade
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white/70">Moves: <strong className="text-amber-300">{moves}</strong></span>
                    <button
                        type="button"
                        onClick={initCards}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600/40 text-violet-200 text-xs font-bold hover:bg-violet-600 hover:text-white transition-colors"
                    >
                        <RotateCcw className="h-3.5 w-3.5" /> Restart
                    </button>
                </div>
            </div>

            {/* 4x4 Card Grid */}
            <div className="grid grid-cols-4 gap-3 p-4 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl">
                {cards.map((card, idx) => {
                    const isCardFlipped = flipped.includes(idx) || matched.includes(idx);

                    return (
                        <motion.button
                            key={card.id}
                            type="button"
                            whileHover={!isCardFlipped ? { scale: 1.05 } : {}}
                            whileTap={!isCardFlipped ? { scale: 0.95 } : {}}
                            onClick={() => handleCardClick(idx)}
                            className={`w-15 h-16 sm:w-18 sm:h-20 rounded-2xl flex items-center justify-center text-3xl font-bold border transition-all ${
                                isCardFlipped
                                    ? "bg-gradient-to-br from-violet-600 to-indigo-700 border-violet-400 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)]"
                                    : "bg-white/[0.08] hover:bg-white/[0.14] border-white/15 text-transparent cursor-pointer shadow-sm"
                            }`}
                        >
                            {isCardFlipped ? card.emoji : "❓"}
                        </motion.button>
                    );
                })}
            </div>

            {isWon && (
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-2.5 p-5 rounded-3xl bg-emerald-500/20 border border-emerald-400 text-center shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                >
                    <span className="text-4xl animate-bounce">🎉🏆</span>
                    <h4 className="text-base font-black text-emerald-300">You matched all cards in {moves} moves!</h4>
                    <button
                        type="button"
                        onClick={initCards}
                        className="mt-1 px-5 py-2.5 rounded-2xl bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400 transition-all shadow-lg active:scale-95"
                    >
                        Play Another Round
                    </button>
                </motion.div>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   4. 2048 TORNADO COMPONENT (Ultra-Addictive Math & Merge Puzzle)
   ═══════════════════════════════════════════════════════════════ */
const Game2048 = ({ onBack, isMuted }) => {
    const [board, setBoard] = useState(Array(4).fill(null).map(() => Array(4).fill(0)));
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("2048_highscore") || 0));
    const [gameOver, setGameOver] = useState(false);

    const playAudio = (type) => {
        if (!isMuted) soundEngine.play(type);
    };

    const addRandomTile = useCallback((b) => {
        const emptyCells = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (b[r][c] === 0) emptyCells.push([r, c]);
            }
        }
        if (emptyCells.length === 0) return b;
        const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const newB = b.map(row => [...row]);
        newB[r][c] = Math.random() < 0.9 ? 2 : 4;
        return newB;
    }, []);

    const init2048 = () => {
        playAudio("whoosh");
        let b = Array(4).fill(null).map(() => Array(4).fill(0));
        b = addRandomTile(b);
        b = addRandomTile(b);
        setBoard(b);
        setScore(0);
        setGameOver(false);
    };

    useEffect(() => {
        init2048();
    }, []);

    const slideRowLeft = (row) => {
        let filtered = row.filter(val => val !== 0);
        let gained = 0;
        for (let i = 0; i < filtered.length - 1; i++) {
            if (filtered[i] === filtered[i + 1]) {
                filtered[i] *= 2;
                gained += filtered[i];
                filtered[i + 1] = 0;
            }
        }
        filtered = filtered.filter(val => val !== 0);
        while (filtered.length < 4) filtered.push(0);
        return { row: filtered, gained };
    };

    const move = (direction) => {
        if (gameOver) return;
        let newBoard = board.map(row => [...row]);
        let totalGained = 0;
        let changed = false;

        if (direction === "left") {
            for (let r = 0; r < 4; r++) {
                const { row, gained } = slideRowLeft(newBoard[r]);
                if (row.join(",") !== newBoard[r].join(",")) changed = true;
                newBoard[r] = row;
                totalGained += gained;
            }
        } else if (direction === "right") {
            for (let r = 0; r < 4; r++) {
                const reversed = [...newBoard[r]].reverse();
                const { row, gained } = slideRowLeft(reversed);
                const restored = row.reverse();
                if (restored.join(",") !== newBoard[r].join(",")) changed = true;
                newBoard[r] = restored;
                totalGained += gained;
            }
        } else if (direction === "up") {
            for (let c = 0; c < 4; c++) {
                const col = [newBoard[0][c], newBoard[1][c], newBoard[2][c], newBoard[3][c]];
                const { row, gained } = slideRowLeft(col);
                for (let r = 0; r < 4; r++) {
                    if (newBoard[r][c] !== row[r]) changed = true;
                    newBoard[r][c] = row[r];
                }
                totalGained += gained;
            }
        } else if (direction === "down") {
            for (let c = 0; c < 4; c++) {
                const col = [newBoard[3][c], newBoard[2][c], newBoard[1][c], newBoard[0][c]];
                const { row, gained } = slideRowLeft(col);
                const restored = row.reverse();
                for (let r = 0; r < 4; r++) {
                    if (newBoard[r][c] !== restored[r]) changed = true;
                    newBoard[r][c] = restored[r];
                }
                totalGained += gained;
            }
        }

        if (changed) {
            playAudio(totalGained > 0 ? "coin" : "laser");
            const finalBoard = addRandomTile(newBoard);
            setBoard(finalBoard);
            const nextScore = score + totalGained;
            setScore(nextScore);
            if (nextScore > highScore) {
                setHighScore(nextScore);
                localStorage.setItem("2048_highscore", String(nextScore));
            }

            // Check game over
            let hasMoves = false;
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    if (finalBoard[r][c] === 0) hasMoves = true;
                    if (r < 3 && finalBoard[r][c] === finalBoard[r + 1][c]) hasMoves = true;
                    if (c < 3 && finalBoard[r][c] === finalBoard[r][c + 1]) hasMoves = true;
                }
            }
            if (!hasMoves) {
                playAudio("boom");
                setGameOver(true);
            }
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); move("left"); }
            else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); move("right"); }
            else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); move("up"); }
            else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { e.preventDefault(); move("down"); }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

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
            case 2048: return "bg-emerald-400 text-black font-black shadow-[0_0_25px_#34d399] animate-pulse";
            default: return "bg-white/[0.04] text-transparent";
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto w-full select-none">
            <div className="flex items-center justify-between w-full px-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Arcade
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white/70">Score: <strong className="text-amber-300">{score}</strong></span>
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" /> {highScore}
                    </span>
                    <button
                        type="button"
                        onClick={init2048}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors"
                    >
                        <RotateCcw className="h-3 w-3" />
                    </button>
                </div>
            </div>

            {/* 4x4 Grid */}
            <div className="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] p-3 rounded-3xl bg-[#0a0f1d] border-2 border-indigo-500/30 shadow-2xl">
                <div className="grid grid-cols-4 grid-rows-4 gap-2.5 w-full h-full">
                    {board.flatMap((row, r) =>
                        row.map((val, c) => (
                            <motion.div
                                key={`${r}-${c}`}
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className={`rounded-2xl flex items-center justify-center text-xl sm:text-2xl transition-all ${getTileColor(val)}`}
                            >
                                {val > 0 ? val : ""}
                            </motion.div>
                        ))
                    )}
                </div>

                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm rounded-3xl gap-3">
                        <span className="text-4xl">🏁</span>
                        <h4 className="text-lg font-black text-rose-400">No More Moves!</h4>
                        <p className="text-xs text-white/70">Final Score: <strong className="text-amber-300">{score}</strong></p>
                        <button
                            type="button"
                            onClick={init2048}
                            className="px-5 py-2.5 rounded-xl bg-amber-400 text-black font-black text-xs hover:bg-amber-300 transition-all shadow-lg active:scale-95"
                        >
                            Try Again
                        </button>
                    </div>
                )}
            </div>

            {/* Direction Controls */}
            <div className="grid grid-cols-3 gap-2 w-48 mt-1">
                <div />
                <button
                    type="button"
                    onClick={() => move("up")}
                    className="h-11 rounded-xl bg-white/10 hover:bg-white/20 active:bg-indigo-500 font-bold text-white flex items-center justify-center text-lg shadow"
                >
                    ▲
                </button>
                <div />
                <button
                    type="button"
                    onClick={() => move("left")}
                    className="h-11 rounded-xl bg-white/10 hover:bg-white/20 active:bg-indigo-500 font-bold text-white flex items-center justify-center text-lg shadow"
                >
                    ◀
                </button>
                <button
                    type="button"
                    onClick={() => move("down")}
                    className="h-11 rounded-xl bg-white/10 hover:bg-white/20 active:bg-indigo-500 font-bold text-white flex items-center justify-center text-lg shadow"
                >
                    ▼
                </button>
                <button
                    type="button"
                    onClick={() => move("right")}
                    className="h-11 rounded-xl bg-white/10 hover:bg-white/20 active:bg-indigo-500 font-bold text-white flex items-center justify-center text-lg shadow"
                >
                    ▶
                </button>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   5. ZOMBIE SHOOTER (Canvas-based Action Game 14+)
   ═══════════════════════════════════════════════════════════════ */
const ZombieShooter = ({ onBack, isMuted }) => {
    const canvasRef = useRef(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("zombie_highscore") || 0));

    const playAudio = (type) => {
        if (!isMuted) soundEngine.play(type);
    };

    const startGame = () => {
        playAudio("whoosh");
        setScore(0);
        setGameOver(false);
        setIsPlaying(true);
    };

    useEffect(() => {
        if (!isPlaying || gameOver) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        let animationId;
        let lastTime = 0;
        let spawnTimer = 0;

        const cw = canvas.width;
        const ch = canvas.height;
        const player = { x: cw / 2, y: ch / 2, radius: 15, angle: 0 };
        const bullets = [];
        const zombies = [];
        let particles = [];
        let currentScore = 0;

        // Mouse tracking
        const mouse = { x: cw / 2, y: ch / 2 };
        const updateMouse = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
            mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
        };
        const handleTouch = (e) => {
            e.preventDefault(); // Prevent scrolling
            const rect = canvas.getBoundingClientRect();
            mouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
            mouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
        };
        
        const shoot = () => {
            playAudio("laser");
            const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
            bullets.push({
                x: player.x + Math.cos(angle) * player.radius,
                y: player.y + Math.sin(angle) * player.radius,
                vx: Math.cos(angle) * 12,
                vy: Math.sin(angle) * 12,
                radius: 4
            });
        };

        const handlePointerDown = (e) => {
            if (e.touches) handleTouch(e);
            else updateMouse(e);
            shoot();
        };

        canvas.addEventListener("mousemove", updateMouse);
        canvas.addEventListener("mousedown", handlePointerDown);
        canvas.addEventListener("touchstart", handlePointerDown, { passive: false });
        canvas.addEventListener("touchmove", handleTouch, { passive: false });

        const spawnZombie = () => {
            const radius = Math.random() * 8 + 10;
            let x, y;
            if (Math.random() < 0.5) {
                x = Math.random() < 0.5 ? 0 - radius : cw + radius;
                y = Math.random() * ch;
            } else {
                x = Math.random() * cw;
                y = Math.random() < 0.5 ? 0 - radius : ch + radius;
            }
            zombies.push({ x, y, radius, speed: Math.random() * 1.5 + 0.5 });
        };

        const draw = (deltaTime) => {
            ctx.fillStyle = "rgba(10, 15, 29, 0.4)"; // Trail effect
            ctx.fillRect(0, 0, cw, ch);

            // Update & Draw Player
            player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(player.angle);
            ctx.fillStyle = "#38bdf8"; // cyan-400
            ctx.beginPath();
            ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
            ctx.fill();
            // Gun barrel
            ctx.fillStyle = "#cbd5e1";
            ctx.fillRect(player.radius - 5, -4, 15, 8);
            ctx.restore();

            // Bullets
            for (let i = bullets.length - 1; i >= 0; i--) {
                const b = bullets[i];
                b.x += b.vx;
                b.y += b.vy;
                ctx.fillStyle = "#fbbf24"; // amber-400
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
                ctx.fill();

                if (b.x < 0 || b.x > cw || b.y < 0 || b.y > ch) {
                    bullets.splice(i, 1);
                }
            }

            // Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.02;
                if (p.alpha <= 0) {
                    particles.splice(i, 1);
                    continue;
                }
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Zombies
            spawnTimer += deltaTime;
            if (spawnTimer > Math.max(300, 1500 - currentScore * 10)) {
                spawnZombie();
                spawnTimer = 0;
            }

            for (let i = zombies.length - 1; i >= 0; i--) {
                const z = zombies[i];
                const angle = Math.atan2(player.y - z.y, player.x - z.x);
                z.x += Math.cos(angle) * z.speed;
                z.y += Math.sin(angle) * z.speed;

                ctx.fillStyle = "#84cc16"; // lime-500 (toxic green)
                ctx.beginPath();
                ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
                ctx.fill();

                // Player collision (Game Over)
                const distPlayer = Math.hypot(player.x - z.x, player.y - z.y);
                if (distPlayer - z.radius - player.radius < 0) {
                    playAudio("boom");
                    setGameOver(true);
                    return;
                }

                // Bullet collision
                for (let j = bullets.length - 1; j >= 0; j--) {
                    const b = bullets[j];
                    const distBullet = Math.hypot(b.x - z.x, b.y - z.y);
                    if (distBullet - z.radius - b.radius < 0) {
                        // Explosion particles
                        for (let k = 0; k < 8; k++) {
                            particles.push({
                                x: z.x, y: z.y,
                                vx: (Math.random() - 0.5) * 6,
                                vy: (Math.random() - 0.5) * 6,
                                radius: Math.random() * 3,
                                alpha: 1,
                                color: "#84cc16"
                            });
                        }
                        playAudio("coin"); // Use coin or similar for hit confirm
                        currentScore += 10;
                        setScore(currentScore);
                        if (currentScore > highScore) {
                            setHighScore(currentScore);
                            localStorage.setItem("zombie_highscore", String(currentScore));
                        }
                        zombies.splice(i, 1);
                        bullets.splice(j, 1);
                        break;
                    }
                }
            }
        };

        const loop = (timestamp) => {
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;
            draw(deltaTime);
            if (!gameOver) animationId = requestAnimationFrame(loop);
        };
        animationId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animationId);
            canvas.removeEventListener("mousemove", updateMouse);
            canvas.removeEventListener("mousedown", handlePointerDown);
            canvas.removeEventListener("touchstart", handlePointerDown);
            canvas.removeEventListener("touchmove", handleTouch);
        };
    }, [isPlaying, gameOver, highScore, isMuted]);

    return (
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto w-full select-none">
            <div className="flex items-center justify-between w-full px-2">
                <button type="button" onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white/70">Kills: <strong className="text-lime-400">{score / 10}</strong></span>
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" /> {highScore / 10}
                    </span>
                </div>
            </div>

            <div className="relative w-[340px] h-[340px] sm:w-[400px] sm:h-[400px] rounded-3xl overflow-hidden border-2 border-lime-500/30 shadow-[0_0_40px_rgba(132,204,22,0.15)]">
                <canvas ref={canvasRef} width={400} height={400} className="w-full h-full bg-[#0a0f1d] touch-none" />

                {!isPlaying && !gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3">
                        <span className="text-5xl">🧟</span>
                        <h3 className="text-xl font-black text-white tracking-tight">Zombie Survival</h3>
                        <p className="text-xs text-white/60">Tap/Click anywhere to shoot!</p>
                        <button onClick={startGame} className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-lime-500 hover:bg-lime-400 text-black font-black text-sm shadow-[0_0_25px_rgba(132,204,22,0.4)] active:scale-95 transition-all">
                            <Play className="h-4 w-4 fill-current" /> Survive
                        </button>
                    </div>
                )}

                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3">
                        <span className="text-5xl animate-pulse">💀</span>
                        <h3 className="text-xl font-black text-rose-400">You Died</h3>
                        <p className="text-xs text-white/70">Zombies Defeated: <strong className="text-lime-400 text-sm">{score / 10}</strong></p>
                        <button onClick={startGame} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-lime-500 hover:bg-lime-400 text-black font-black text-sm shadow-[0_0_25px_rgba(132,204,22,0.4)] active:scale-95 transition-all">
                            <RotateCcw className="h-4 w-4" /> Try Again
                        </button>
                    </div>
                )}
            </div>
            <p className="text-[11px] text-white/40">Keep moving your mouse/finger and tap repeatedly to fire!</p>
        </div>
    );
};


/* ═══════════════════════════════════════════════════════════════
   6. NEON DODGE (Fast-Paced Infinite Runner)
   ═══════════════════════════════════════════════════════════════ */
const NeonDodge = ({ onBack, isMuted }) => {
    const canvasRef = useRef(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("neondodge_highscore") || 0));

    const playAudio = (type) => {
        if (!isMuted) soundEngine.play(type);
    };

    const startGame = () => {
        playAudio("whoosh");
        setScore(0);
        setGameOver(false);
        setIsPlaying(true);
    };

    useEffect(() => {
        if (!isPlaying || gameOver) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        let animationId;
        
        const cw = canvas.width;
        const ch = canvas.height;
        const player = { x: cw / 2, y: ch - 40, width: 30, height: 20, speed: 8 };
        let obstacles = [];
        let particles = [];
        let currentScore = 0;
        let speedMultiplier = 1;
        let frameCount = 0;

        // Controls
        const keys = {};
        const handleKeyDown = (e) => { keys[e.code] = true; };
        const handleKeyUp = (e) => { keys[e.code] = false; };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        const handleTouchMove = (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const touchX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
            player.x = Math.max(player.width / 2, Math.min(cw - player.width / 2, touchX));
        };
        canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

        const draw = () => {
            ctx.fillStyle = "rgba(10, 5, 25, 0.5)"; // Motion blur background
            ctx.fillRect(0, 0, cw, ch);

            // Player movement via keyboard
            if ((keys["ArrowLeft"] || keys["KeyA"]) && player.x > player.width / 2) {
                player.x -= player.speed;
            }
            if ((keys["ArrowRight"] || keys["KeyD"]) && player.x < cw - player.width / 2) {
                player.x += player.speed;
            }

            // Draw Player
            ctx.fillStyle = "#a855f7"; // purple-500
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#a855f7";
            ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);
            ctx.shadowBlur = 0; // reset

            // Spawn obstacles
            frameCount++;
            if (frameCount % Math.max(15, Math.floor(40 - speedMultiplier * 5)) === 0) {
                const w = Math.random() * 50 + 20;
                obstacles.push({
                    x: Math.random() * (cw - w),
                    y: -50,
                    width: w,
                    height: 20,
                    color: Math.random() < 0.2 ? "#f43f5e" : "#e11d48", // rose colors
                    speed: (Math.random() * 3 + 4) * speedMultiplier
                });
            }

            // Update & Draw Obstacles
            for (let i = obstacles.length - 1; i >= 0; i--) {
                const obs = obstacles[i];
                obs.y += obs.speed;
                
                ctx.fillStyle = obs.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = obs.color;
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
                ctx.shadowBlur = 0;

                // Collision detection
                if (
                    player.x - player.width / 2 < obs.x + obs.width &&
                    player.x + player.width / 2 > obs.x &&
                    player.y - player.height / 2 < obs.y + obs.height &&
                    player.y + player.height / 2 > obs.y
                ) {
                    playAudio("boom");
                    setGameOver(true);
                    return;
                }

                if (obs.y > ch) {
                    obstacles.splice(i, 1);
                    currentScore += 10;
                    setScore(currentScore);
                    if (currentScore > highScore) {
                        setHighScore(currentScore);
                        localStorage.setItem("neondodge_highscore", String(currentScore));
                    }
                    if (currentScore % 200 === 0) {
                        speedMultiplier += 0.2;
                        playAudio("coin");
                    }
                }
            }
        };

        const loop = () => {
            draw();
            if (!gameOver) animationId = requestAnimationFrame(loop);
        };
        animationId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            canvas.removeEventListener("touchmove", handleTouchMove);
        };
    }, [isPlaying, gameOver, highScore, isMuted]);

    return (
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto w-full select-none">
            <div className="flex items-center justify-between w-full px-2">
                <button type="button" onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white/70">Score: <strong className="text-purple-400">{score}</strong></span>
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" /> {highScore}
                    </span>
                </div>
            </div>

            <div className="relative w-[340px] h-[400px] sm:w-[380px] sm:h-[450px] rounded-3xl overflow-hidden border-2 border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.15)]">
                <canvas ref={canvasRef} width={380} height={450} className="w-full h-full bg-[#0a0519] touch-none" />

                {!isPlaying && !gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3">
                        <span className="text-5xl animate-pulse">⚡</span>
                        <h3 className="text-xl font-black text-white tracking-tight">Neon Dodge</h3>
                        <p className="text-xs text-white/60">Drag left/right or use Arrow Keys to dodge!</p>
                        <button onClick={startGame} className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-purple-500 hover:bg-purple-400 text-black font-black text-sm shadow-[0_0_25px_rgba(168,85,247,0.4)] active:scale-95 transition-all">
                            <Play className="h-4 w-4 fill-current" /> Start Engine
                        </button>
                    </div>
                )}

                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3">
                        <span className="text-5xl animate-bounce">💥</span>
                        <h3 className="text-xl font-black text-rose-400">CRASHED!</h3>
                        <p className="text-xs text-white/70">Final Score: <strong className="text-purple-400 text-sm">{score}</strong></p>
                        <button onClick={startGame} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-500 hover:bg-purple-400 text-black font-black text-sm shadow-[0_0_25px_rgba(168,85,247,0.4)] active:scale-95 transition-all">
                            <RotateCcw className="h-4 w-4" /> Go Again
                        </button>
                    </div>
                )}
            </div>
            <p className="text-[11px] text-white/40">Drag the purple block to dodge the falling neon hazards!</p>
        </div>
    );
};


/* ═══════════════════════════════════════════════════════════════
   7. NEON BLADE (Knife Hit clone - Action puzzle)
   ═══════════════════════════════════════════════════════════════ */
const NeonBlade = ({ onBack, isMuted }) => {
    const canvasRef = useRef(null);
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("neonblade_highscore") || 0));

    const playAudio = (type) => {
        if (!isMuted) soundEngine.play(type);
    };

    const startGame = () => {
        playAudio("whoosh");
        setScore(0);
        setLevel(1);
        setGameOver(false);
        setIsPlaying(true);
    };

    useEffect(() => {
        if (!isPlaying || gameOver) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        let animationId;
        
        const cw = canvas.width;
        const ch = canvas.height;
        const targetRadius = 60;
        
        let targetAngle = 0;
        let rotationSpeed = 0.03 + (level * 0.005);
        if (level > 3 && Math.random() > 0.5) rotationSpeed *= -1; // random reverse
        
        let knives = [];
        // Add random initial knives based on level
        const numInitKnives = Math.min(3, Math.floor(level / 2));
        for (let i=0; i<numInitKnives; i++) {
            knives.push(Math.random() * Math.PI * 2);
        }

        let knivesToThrow = 5 + Math.floor(level / 2);
        let flyingKnife = null;
        let particles = [];
        
        const throwKnife = () => {
            if (flyingKnife || knivesToThrow <= 0) return;
            playAudio("laser");
            flyingKnife = { y: ch - 50, speed: 25 };
        };

        const handlePointerDown = (e) => {
            e.preventDefault();
            throwKnife();
        };

        canvas.addEventListener("mousedown", handlePointerDown);
        canvas.addEventListener("touchstart", handlePointerDown, { passive: false });

        const drawKnife = (ctx, isStuck) => {
            ctx.fillStyle = "#38bdf8"; // cyan-400
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#38bdf8";
            ctx.beginPath();
            ctx.moveTo(0, isStuck ? targetRadius : -20);
            ctx.lineTo(-4, isStuck ? targetRadius + 30 : 10);
            ctx.lineTo(4, isStuck ? targetRadius + 30 : 10);
            ctx.fill();
            ctx.shadowBlur = 0;
        };

        const draw = () => {
            ctx.fillStyle = "rgba(5, 10, 20, 1)";
            ctx.fillRect(0, 0, cw, ch);

            // Update & Draw Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.03;
                if (p.alpha <= 0) {
                    particles.splice(i, 1);
                    continue;
                }
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Draw Target Center
            targetAngle += rotationSpeed;
            // periodically change speed if high level
            if (level > 4 && Math.random() < 0.01) rotationSpeed = -rotationSpeed;

            ctx.save();
            ctx.translate(cw / 2, ch / 3);
            ctx.rotate(targetAngle);
            
            // Draw stuck knives
            knives.forEach(angle => {
                ctx.save();
                ctx.rotate(angle);
                drawKnife(ctx, true);
                ctx.restore();
            });

            // Target wheel
            ctx.fillStyle = "#f43f5e"; // rose-500
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#f43f5e";
            ctx.beginPath();
            ctx.arc(0, 0, targetRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#0f172a";
            ctx.beginPath();
            ctx.arc(0, 0, targetRadius - 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();

            // Draw Flying Knife
            if (flyingKnife) {
                flyingKnife.y -= flyingKnife.speed;
                ctx.save();
                ctx.translate(cw / 2, flyingKnife.y);
                drawKnife(ctx, false);
                ctx.restore();

                // Check hit
                if (flyingKnife.y <= ch / 3 + targetRadius) {
                    const hitAngle = (-targetAngle + Math.PI / 2) % (Math.PI * 2);
                    const normalizedHitAngle = hitAngle < 0 ? hitAngle + Math.PI * 2 : hitAngle;
                    
                    // Check overlap
                    const hitThreshold = 0.25; // radians
                    let didHit = false;
                    for (let angle of knives) {
                        const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle;
                        let diff = Math.abs(normalizedHitAngle - normalizedAngle);
                        if (diff > Math.PI) diff = Math.PI * 2 - diff;
                        if (diff < hitThreshold) {
                            didHit = true;
                            break;
                        }
                    }

                    if (didHit) {
                        playAudio("boom");
                        for (let k = 0; k < 15; k++) {
                            particles.push({
                                x: cw/2, y: ch/3 + targetRadius,
                                vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
                                radius: Math.random() * 4, alpha: 1, color: "#38bdf8"
                            });
                        }
                        setGameOver(true);
                        flyingKnife = null;
                        return; // wait for next frame to stop
                    } else {
                        playAudio("coin");
                        knives.push(normalizedHitAngle);
                        knivesToThrow--;
                        setScore(s => {
                            const newScore = s + 10;
                            if (newScore > highScore) {
                                setHighScore(newScore);
                                localStorage.setItem("neonblade_highscore", String(newScore));
                            }
                            return newScore;
                        });
                        flyingKnife = null;

                        if (knivesToThrow <= 0) {
                            playAudio("win");
                            setLevel(l => l + 1);
                            setIsPlaying(false); // pause to show next level
                        }
                    }
                }
            }

            // Draw waiting knives
            for(let i=0; i<knivesToThrow; i++) {
                ctx.save();
                ctx.translate(30, ch - 30 - (i * 20));
                ctx.rotate(Math.PI / 2);
                drawKnife(ctx, false);
                ctx.restore();
            }
        };

        const loop = () => {
            draw();
            if (!gameOver && isPlaying) animationId = requestAnimationFrame(loop);
        };
        animationId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animationId);
            canvas.removeEventListener("mousedown", handlePointerDown);
            canvas.removeEventListener("touchstart", handlePointerDown);
        };
    }, [isPlaying, gameOver, level, highScore, isMuted]);

    return (
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto w-full select-none">
            <div className="flex items-center justify-between w-full px-2">
                <button type="button" onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white/70">Level: <strong className="text-rose-400">{level}</strong></span>
                    <span className="text-xs font-bold text-white/70">Score: <strong className="text-cyan-400">{score}</strong></span>
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" /> {highScore}
                    </span>
                </div>
            </div>

            <div className="relative w-[340px] h-[450px] sm:w-[380px] sm:h-[500px] rounded-3xl overflow-hidden border-2 border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.15)]">
                <canvas ref={canvasRef} width={380} height={500} className="w-full h-full bg-[#050a14] touch-none cursor-crosshair" />

                {!isPlaying && !gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3">
                        <span className="text-5xl animate-spin-slow">🎯</span>
                        <h3 className="text-xl font-black text-white tracking-tight">Neon Blade {level > 1 ? `Level ${level}` : ''}</h3>
                        <p className="text-xs text-white/60">Tap to throw knives. Don't hit existing knives!</p>
                        <button onClick={() => setIsPlaying(true)} className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-black font-black text-sm shadow-[0_0_25px_rgba(244,63,94,0.4)] active:scale-95 transition-all">
                            <Play className="h-4 w-4 fill-current" /> {level > 1 ? "Next Level" : "Start Game"}
                        </button>
                    </div>
                )}

                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3">
                        <span className="text-5xl animate-bounce">💥</span>
                        <h3 className="text-xl font-black text-cyan-400">Blades Clashed!</h3>
                        <p className="text-xs text-white/70">Final Score: <strong className="text-cyan-400 text-sm">{score}</strong></p>
                        <button onClick={startGame} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-sm shadow-[0_0_25px_rgba(56,189,248,0.4)] active:scale-95 transition-all">
                            <RotateCcw className="h-4 w-4" /> Try Again
                        </button>
                    </div>
                )}
            </div>
            <p className="text-[11px] text-white/40">Tap anywhere to throw a blade. Clear all blades to advance!</p>
        </div>
    );
};


/* ═══════════════════════════════════════════════════════════════
   MAIN ARCADE DASHBOARD PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function Arcade() {
    const [selectedGame, setSelectedGame] = useState(null);
    const [isMuted, setIsMuted] = useState(false);

    const GAMES = [
        {
            id: "snake",
            title: "Super Snake",
            emoji: "🐍",
            tag: "Classic Retro",
            color: "from-emerald-500 to-teal-700",
            desc: "Eat glowing apples, grow bigger, and beat your personal best!"
        },
        {
            id: "flappy",
            title: "Flappy Tornado",
            emoji: "🌪️",
            tag: "Action Arcade",
            color: "from-cyan-500 to-blue-700",
            desc: "Fly through the cloud pillars without crashing to set high scores!"
        },
        {
            id: "2048",
            title: "2048 Tornado",
            emoji: "🔢✨",
            tag: "Logic Puzzle",
            color: "from-indigo-600 to-violet-800",
            desc: "Swipe and merge numbers up to the golden 2048 tile!"
        },
        {
            id: "memory",
            title: "Memory Match",
            emoji: "🧠💖",
            tag: "Brain Game",
            color: "from-fuchsia-500 to-pink-700",
            desc: "Test your memory and flip matching pairs of cute animal cards!"
        },
        {
            id: "zombie",
            title: "Zombie Survival",
            emoji: "🧟🔫",
            tag: "Action 14+",
            color: "from-lime-500 to-green-700",
            desc: "Survive the undead! Turn and shoot in 360 degrees to stay alive."
        },
        {
            id: "neondodge",
            title: "Neon Dodge",
            emoji: "⚡🛸",
            tag: "Fast Runner",
            color: "from-purple-500 to-fuchsia-700",
            desc: "Dodge falling neon hazards at breakneck speeds!"
        },
        {
            id: "neonblade",
            title: "Neon Blade",
            emoji: "🎯🗡️",
            tag: "Precision",
            color: "from-rose-500 to-red-700",
            desc: "Throw glowing blades into the spinning target without hitting the others!"
        }
    ];

    return (
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8 text-white select-none">
            <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                {/* Header */}
                <header className="rounded-3xl border border-white/10 bg-gradient-to-r from-violet-950/40 via-black/50 to-indigo-950/40 p-6 md:p-8 backdrop-blur-2xl shadow-xl flex items-center justify-between">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-300">
                            <Gamepad2 className="h-4 w-4" />
                            Kids Fun Arcade
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-2">
                            Mini Games Zone <Sparkles className="h-6 w-6 text-amber-300" />
                        </h1>
                        <p className="mt-2 text-xs sm:text-sm text-white/60 max-w-xl">
                            Play fun casual mini-games directly inside ChatTornado without leaving the app!
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsMuted((m) => !m)}
                            title={isMuted ? "Unmute Sound FX" : "Mute Sound FX"}
                            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 shadow-lg"
                        >
                            {isMuted ? <VolumeX className="h-5 w-5 text-rose-400" /> : <Volume2 className="h-5 w-5 text-emerald-400" />}
                        </button>
                        <div className="hidden sm:flex text-6xl">
                            🎮
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                {selectedGame === "snake" ? (
                    <SnakeGame onBack={() => setSelectedGame(null)} isMuted={isMuted} />
                ) : selectedGame === "flappy" ? (
                    <FlappyTornadoGame onBack={() => setSelectedGame(null)} isMuted={isMuted} />
                ) : selectedGame === "2048" ? (
                    <Game2048 onBack={() => setSelectedGame(null)} isMuted={isMuted} />
                ) : selectedGame === "memory" ? (
                    <MemoryMatchGame onBack={() => setSelectedGame(null)} isMuted={isMuted} />
                ) : selectedGame === "zombie" ? (
                    <ZombieShooter onBack={() => setSelectedGame(null)} isMuted={isMuted} />
                ) : selectedGame === "neondodge" ? (
                    <NeonDodge onBack={() => setSelectedGame(null)} isMuted={isMuted} />
                ) : selectedGame === "neonblade" ? (
                    <NeonBlade onBack={() => setSelectedGame(null)} isMuted={isMuted} />
                ) : (
                    /* Games Selection Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {GAMES.map((game) => (
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
                                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-white/70 border border-white/10">
                                            {game.tag}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black text-white group-hover:text-amber-200 transition-colors">
                                        {game.title}
                                    </h3>
                                    <p className="mt-2 text-xs text-white/50 leading-relaxed">
                                        {game.desc}
                                    </p>
                                </div>

                                <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/5">
                                    <span className="text-xs font-bold text-violet-300 group-hover:text-white transition-colors">
                                        Play Now
                                    </span>
                                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-violet-600 transition-colors">
                                        →
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}

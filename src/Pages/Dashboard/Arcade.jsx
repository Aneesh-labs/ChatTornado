import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Trophy, RotateCcw, Volume2, VolumeX, Sparkles, Play, ArrowLeft } from "lucide-react";
import { soundEngine } from "../../utils/soundEffects";

/* ═══════════════════════════════════════════════════════════════
   1. SNAKE GAME COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const SnakeGame = ({ onBack }) => {
    const GRID_SIZE = 20;
    const [snake, setSnake] = useState([[10, 10], [10, 11], [10, 12]]);
    const [food, setFood] = useState([5, 5]);
    const [dir, setDir] = useState([0, -1]); // moving UP
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("snake_highscore") || 0));
    const [isPlaying, setIsPlaying] = useState(false);
    const dirRef = useRef(dir);
    dirRef.current = dir;

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
    }, []);

    const resetGame = () => {
        soundEngine.play("whoosh");
        const initialSnake = [[10, 10], [10, 11], [10, 12]];
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

            if (e.key === "ArrowUp" && dy === 0) setDir([0, -1]);
            else if (e.key === "ArrowDown" && dy === 0) setDir([0, 1]);
            else if (e.key === "ArrowLeft" && dx === 0) setDir([-1, 0]);
            else if (e.key === "ArrowRight" && dx === 0) setDir([1, 0]);
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
                    soundEngine.play("boom");
                    setGameOver(true);
                    return prev;
                }

                // Collision with self
                if (prev.some(seg => seg[0] === newHead[0] && seg[1] === newHead[1])) {
                    soundEngine.play("boom");
                    setGameOver(true);
                    return prev;
                }

                // Check food
                const ateFood = newHead[0] === food[0] && newHead[1] === food[1];
                let nextSnake;

                if (ateFood) {
                    soundEngine.play("coin");
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
        }, 130);

        return () => clearInterval(interval);
    }, [isPlaying, gameOver, food, generateFood, highScore]);

    return (
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
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

            {/* Canvas / Grid */}
            <div className="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] rounded-2xl bg-[#090e17] border-2 border-emerald-500/30 p-1 shadow-2xl overflow-hidden">
                <div className="grid grid-cols-20 grid-rows-20 w-full h-full gap-[1px]">
                    {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
                        const x = idx % GRID_SIZE;
                        const y = Math.floor(idx / GRID_SIZE);
                        const isHead = snake[0][0] === x && snake[0][1] === y;
                        const isBody = snake.some(seg => seg[0] === x && seg[1] === y);
                        const isFood = food[0] === x && food[1] === y;

                        return (
                            <div
                                key={idx}
                                className={`rounded-[2px] transition-colors ${
                                    isHead
                                        ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                                        : isBody
                                        ? "bg-emerald-600/80"
                                        : isFood
                                        ? "bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse"
                                        : "bg-white/[0.015]"
                                }`}
                            />
                        );
                    })}
                </div>

                {/* Overlays */}
                {!isPlaying && !gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm gap-3">
                        <span className="text-4xl">🐍</span>
                        <h3 className="text-lg font-black text-white">Super Snake</h3>
                        <p className="text-xs text-white/60">Use arrow keys or buttons to steer</p>
                        <button
                            type="button"
                            onClick={resetGame}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm shadow-lg active:scale-95 transition-all"
                        >
                            <Play className="h-4 w-4 fill-current" /> Start Game
                        </button>
                    </div>
                )}

                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-3">
                        <span className="text-4xl">💥</span>
                        <h3 className="text-lg font-black text-rose-400">Game Over!</h3>
                        <p className="text-xs text-white/70">Final Score: <strong className="text-emerald-400">{score}</strong></p>
                        <button
                            type="button"
                            onClick={resetGame}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm shadow-lg active:scale-95 transition-all"
                        >
                            <RotateCcw className="h-4 w-4" /> Play Again
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile Touch Direction Controls */}
            <div className="grid grid-cols-3 gap-2 w-48 mt-1">
                <div />
                <button
                    type="button"
                    onClick={() => dirRef.current[1] === 0 && setDir([0, -1])}
                    className="h-11 rounded-xl bg-white/10 hover:bg-white/20 active:bg-emerald-500 active:text-black font-bold text-white flex items-center justify-center text-lg shadow"
                >
                    ▲
                </button>
                <div />
                <button
                    type="button"
                    onClick={() => dirRef.current[0] === 0 && setDir([-1, 0])}
                    className="h-11 rounded-xl bg-white/10 hover:bg-white/20 active:bg-emerald-500 active:text-black font-bold text-white flex items-center justify-center text-lg shadow"
                >
                    ◀
                </button>
                <button
                    type="button"
                    onClick={() => dirRef.current[1] === 0 && setDir([0, 1])}
                    className="h-11 rounded-xl bg-white/10 hover:bg-white/20 active:bg-emerald-500 active:text-black font-bold text-white flex items-center justify-center text-lg shadow"
                >
                    ▼
                </button>
                <button
                    type="button"
                    onClick={() => dirRef.current[0] === 0 && setDir([1, 0])}
                    className="h-11 rounded-xl bg-white/10 hover:bg-white/20 active:bg-emerald-500 active:text-black font-bold text-white flex items-center justify-center text-lg shadow"
                >
                    ▶
                </button>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   2. FLAPPY TORNADO COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const FlappyTornadoGame = ({ onBack }) => {
    const [tornadoY, setTornadoY] = useState(150);
    const [velocity, setVelocity] = useState(0);
    const [pipes, setPipes] = useState([]);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("flappy_highscore") || 0));
    const [isPlaying, setIsPlaying] = useState(false);
    const [gameOver, setGameOver] = useState(false);

    const jump = useCallback(() => {
        if (!isPlaying || gameOver) return;
        soundEngine.play("boing");
        setVelocity(-7.5);
    }, [isPlaying, gameOver]);

    const startGame = () => {
        soundEngine.play("whoosh");
        setTornadoY(150);
        setVelocity(0);
        setPipes([{ x: 300, top: 70, bottom: 130 }]);
        setScore(0);
        setGameOver(false);
        setIsPlaying(true);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === "Space" || e.key === "ArrowUp") {
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
                if (nextY >= 270 || nextY <= 0) {
                    soundEngine.play("boom");
                    setGameOver(true);
                }
                return nextY;
            });
            setVelocity((v) => v + 0.5);

            // Move pipes
            setPipes((prev) => {
                const next = prev.map((p) => ({ ...p, x: p.x - 3.5 }));

                // Spawn new pipe
                const last = next[next.length - 1];
                if (last && last.x < 170) {
                    const topH = Math.floor(Math.random() * 90) + 40;
                    const gap = 110;
                    next.push({ x: 320, top: topH, bottom: 300 - topH - gap });
                }

                // Check scoring & collision
                next.forEach((p) => {
                    // Score point
                    if (p.x < 50 && p.x >= 46) {
                        soundEngine.play("coin");
                        setScore((s) => {
                            const newScore = s + 1;
                            if (newScore > highScore) {
                                setHighScore(newScore);
                                localStorage.setItem("flappy_highscore", String(newScore));
                            }
                            return newScore;
                        });
                    }

                    // Collision check (Tornado x is around 50, size is 24)
                    if (p.x > 25 && p.x < 75) {
                        if (tornadoY < p.top || tornadoY > 300 - p.bottom - 24) {
                            soundEngine.play("boom");
                            setGameOver(true);
                        }
                    }
                });

                return next.filter((p) => p.x > -40);
            });
        }, 1000 / 40);

        return () => clearInterval(loop);
    }, [isPlaying, gameOver, velocity, tornadoY, highScore]);

    return (
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto select-none">
            <div className="flex items-center justify-between w-full px-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Back
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
                className="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[300px] rounded-3xl bg-gradient-to-b from-[#0b1329] via-[#091e3a] to-[#040914] border-2 border-cyan-500/30 overflow-hidden shadow-2xl cursor-pointer"
            >
                {/* Background stars */}
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px]" />

                {/* Pipes (Clouds/Pillars) */}
                {pipes.map((p, idx) => (
                    <React.Fragment key={idx}>
                        <div
                            className="absolute bg-gradient-to-b from-cyan-600 to-indigo-700 rounded-b-2xl border-b-2 border-cyan-300 shadow-md"
                            style={{ left: p.x, top: 0, width: 36, height: p.top }}
                        />
                        <div
                            className="absolute bg-gradient-to-t from-cyan-600 to-indigo-700 rounded-t-2xl border-t-2 border-cyan-300 shadow-md"
                            style={{ left: p.x, bottom: 0, width: 36, height: p.bottom }}
                        />
                    </React.Fragment>
                ))}

                {/* Tornado Character */}
                <motion.div
                    className="absolute text-2xl flex items-center justify-center drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]"
                    style={{ left: 50, top: tornadoY, width: 28, height: 28 }}
                    animate={{ rotate: [0, 360] }}
                    transition={{ repeat: Infinity, duration: 0.35, ease: "linear" }}
                >
                    🌪️
                </motion.div>

                {/* Overlays */}
                {!isPlaying && !gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm gap-2">
                        <span className="text-4xl">🌪️</span>
                        <h3 className="text-lg font-black text-white">Flappy Tornado</h3>
                        <p className="text-xs text-white/70">Click or tap Spacebar to flap & fly!</p>
                        <button
                            type="button"
                            onClick={startGame}
                            className="mt-2 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm shadow-lg active:scale-95"
                        >
                            <Play className="h-4 w-4 fill-current" /> Tap to Fly
                        </button>
                    </div>
                )}

                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-2">
                        <span className="text-4xl">💥</span>
                        <h3 className="text-lg font-black text-rose-400">Oops, crashed!</h3>
                        <p className="text-xs text-white/70">Score: <strong className="text-cyan-400">{score}</strong></p>
                        <button
                            type="button"
                            onClick={startGame}
                            className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm shadow-lg active:scale-95"
                        >
                            <RotateCcw className="h-4 w-4" /> Try Again
                        </button>
                    </div>
                )}
            </div>

            <p className="text-[11px] text-white/40">Tap the box or press Spacebar to stay in the air!</p>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   3. MEMORY MATCH COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const EMOJI_CARDS = ["🐱", "🐶", "🦁", "🐼", "🐸", "🦄", "🚀", "🍕"];

const MemoryMatchGame = ({ onBack }) => {
    const [cards, setCards] = useState([]);
    const [flipped, setFlipped] = useState([]);
    const [matched, setMatched] = useState([]);
    const [moves, setMoves] = useState(0);
    const [isWon, setIsWon] = useState(false);

    const initCards = () => {
        soundEngine.play("whoosh");
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

        soundEngine.play("coin");
        const newFlipped = [...flipped, idx];
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
            setMoves((m) => m + 1);
            const [first, second] = newFlipped;
            if (cards[first].emoji === cards[second].emoji) {
                soundEngine.play("tada");
                setMatched((prev) => {
                    const nextMatched = [...prev, first, second];
                    if (nextMatched.length === cards.length) {
                        soundEngine.play("win");
                        setIsWon(true);
                    }
                    return nextMatched;
                });
                setFlipped([]);
            } else {
                setTimeout(() => {
                    setFlipped([]);
                }, 800);
            }
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto select-none">
            <div className="flex items-center justify-between w-full px-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white/70">Moves: <strong className="text-amber-300">{moves}</strong></span>
                    <button
                        type="button"
                        onClick={initCards}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600/40 text-violet-200 text-xs font-bold hover:bg-violet-600 hover:text-white transition-colors"
                    >
                        <RotateCcw className="h-3.5 w-3.5" /> Restart
                    </button>
                </div>
            </div>

            {/* 4x4 Card Grid */}
            <div className="grid grid-cols-4 gap-2.5 p-3.5 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-md">
                {cards.map((card, idx) => {
                    const isCardFlipped = flipped.includes(idx) || matched.includes(idx);

                    return (
                        <motion.button
                            key={card.id}
                            type="button"
                            whileHover={!isCardFlipped ? { scale: 1.06 } : {}}
                            whileTap={!isCardFlipped ? { scale: 0.94 } : {}}
                            onClick={() => handleCardClick(idx)}
                            className={`w-14 h-16 sm:w-16 sm:h-18 rounded-2xl flex items-center justify-center text-2xl font-bold border transition-all ${
                                isCardFlipped
                                    ? "bg-gradient-to-br from-violet-600 to-indigo-700 border-violet-400 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                                    : "bg-white/10 hover:bg-white/15 border-white/10 text-transparent cursor-pointer"
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
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-center"
                >
                    <span className="text-3xl">🎉🏆</span>
                    <h4 className="text-sm font-black text-emerald-300">You matched all cards in {moves} moves!</h4>
                    <button
                        type="button"
                        onClick={initCards}
                        className="mt-1 px-4 py-1.5 rounded-xl bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400 transition-colors shadow"
                    >
                        Play Another Round
                    </button>
                </motion.div>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN ARCADE DASHBOARD PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function Arcade() {
    const [selectedGame, setSelectedGame] = useState(null);
    const [soundEnabled, setSoundEnabled] = useState(true);

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
            id: "memory",
            title: "Memory Match",
            emoji: "🧠✨",
            tag: "Puzzle",
            color: "from-fuchsia-500 to-purple-800",
            desc: "Test your memory and flip matching pairs of cute animal cards!"
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

                    <div className="hidden sm:flex text-6xl">
                        🎮
                    </div>
                </header>

                {/* Content Area */}
                {selectedGame === "snake" ? (
                    <SnakeGame onBack={() => setSelectedGame(null)} />
                ) : selectedGame === "flappy" ? (
                    <FlappyTornadoGame onBack={() => setSelectedGame(null)} />
                ) : selectedGame === "memory" ? (
                    <MemoryMatchGame onBack={() => setSelectedGame(null)} />
                ) : (
                    /* Games Selection Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {GAMES.map((game) => (
                            <motion.div
                                key={game.id}
                                whileHover={{ scale: 1.03, y: -4 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => {
                                    soundEngine.play("coin");
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

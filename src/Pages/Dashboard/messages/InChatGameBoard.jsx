import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "../../../utils/soundEffects";
import { Trophy, RefreshCw, Sparkles, Gamepad2 } from "lucide-react";

// Check 3-in-a-row for Tic-Tac-Toe
const checkTicTacToeWinner = (board) => {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
        [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], line: lines[i] };
        }
    }
    if (board.every(cell => cell !== null)) {
        return { winner: "draw", line: null };
    }
    return null;
};

// Check 4-in-a-row for Connect 4 (6 rows x 7 cols)
const checkConnect4Winner = (board) => {
    const ROWS = 6;
    const COLS = 7;

    // Horizontal
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            const val = board[r][c];
            if (val && val === board[r][c+1] && val === board[r][c+2] && val === board[r][c+3]) {
                return val;
            }
        }
    }
    // Vertical
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS; c++) {
            const val = board[r][c];
            if (val && val === board[r+1][c] && val === board[r+2][c] && val === board[r+3][c]) {
                return val;
            }
        }
    }
    // Diagonal down-right
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            const val = board[r][c];
            if (val && val === board[r+1][c+1] && val === board[r+2][c+2] && val === board[r+3][c+3]) {
                return val;
            }
        }
    }
    // Diagonal up-right
    for (let r = 3; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            const val = board[r][c];
            if (val && val === board[r-1][c+1] && val === board[r-2][c+2] && val === board[r-3][c+3]) {
                return val;
            }
        }
    }

    if (board.every(row => row.every(cell => cell !== null))) {
        return "draw";
    }
    return null;
};

export default function InChatGameBoard({ gameData, myUserId, senderId, onUpdateGame }) {
    const [localGame, setLocalGame] = useState(gameData);

    useEffect(() => {
        setLocalGame(gameData);
    }, [gameData]);

    if (!localGame) return null;

    const isMeSender = String(myUserId) === String(senderId);

    // ==========================================
    // 1. TIC-TAC-TOE
    // ==========================================
    if (localGame.game === "tictactoe") {
        const board = localGame.board || Array(9).fill(null);
        const turn = localGame.turn || "X";
        const result = checkTicTacToeWinner(board);
        const winner = result?.winner;

        // Player X is game initiator, Player O is opponent
        const isMyTurn = (turn === "X" && isMeSender) || (turn === "O" && !isMeSender);

        const handleCellClick = (idx) => {
            if (board[idx] !== null || winner || !isMyTurn) {
                if (!isMyTurn && !winner) {
                    soundEngine.play("boing");
                }
                return;
            }

            soundEngine.play("coin");
            const newBoard = [...board];
            newBoard[idx] = turn;
            const nextTurn = turn === "X" ? "O" : "X";
            const winCheck = checkTicTacToeWinner(newBoard);

            if (winCheck?.winner && winCheck.winner !== "draw") {
                soundEngine.play("win");
            } else if (winCheck?.winner === "draw") {
                soundEngine.play("drum");
            }

            const updatedGame = {
                ...localGame,
                board: newBoard,
                turn: nextTurn,
                winner: winCheck?.winner || null,
                moves: (localGame.moves || 0) + 1,
            };

            setLocalGame(updatedGame);
            onUpdateGame?.(updatedGame);
        };

        const handleReset = () => {
            soundEngine.play("whoosh");
            const resetGame = {
                ...localGame,
                board: Array(9).fill(null),
                turn: "X",
                winner: null,
                moves: 0,
            };
            setLocalGame(resetGame);
            onUpdateGame?.(resetGame);
        };

        return (
            <div className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-black/40 p-4 backdrop-blur-xl max-w-[280px]">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-white">
                        <Gamepad2 className="h-4 w-4 text-cyan-400" />
                        <span>Tic-Tac-Toe</span>
                    </div>
                    {winner ? (
                        <button
                            type="button"
                            onClick={handleReset}
                            className="flex items-center gap-1 rounded-lg bg-violet-600/50 px-2 py-1 text-[10px] font-bold text-white hover:bg-violet-600 transition-colors"
                        >
                            <RefreshCw className="h-3 w-3" /> Rematch
                        </button>
                    ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                            {isMyTurn ? "Your turn! 🎯" : "Waiting for friend..."}
                        </span>
                    )}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-3 gap-1.5 bg-white/5 p-1.5 rounded-xl border border-white/10">
                    {board.map((cell, idx) => {
                        const isWinCell = result?.line?.includes(idx);

                        return (
                            <motion.button
                                key={idx}
                                type="button"
                                whileHover={cell === null && !winner ? { scale: 1.05 } : {}}
                                whileTap={cell === null && !winner ? { scale: 0.95 } : {}}
                                onClick={() => handleCellClick(idx)}
                                className={`h-16 flex items-center justify-center rounded-xl text-2xl font-black transition-all ${
                                    isWinCell
                                        ? "bg-amber-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse"
                                        : cell === "X"
                                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow"
                                        : cell === "O"
                                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow"
                                        : isMyTurn && !winner
                                        ? "bg-white/10 hover:bg-white/20 border border-dashed border-white/20 cursor-pointer"
                                        : "bg-white/[0.03] cursor-not-allowed opacity-50"
                                }`}
                            >
                                {cell === "X" ? "❌" : cell === "O" ? "⭕" : ""}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Status Bar */}
                <div className="text-center text-xs font-bold">
                    {winner === "draw" ? (
                        <span className="text-amber-300">It's a Tie! 🤝</span>
                    ) : winner ? (
                        <span className="text-emerald-400 flex items-center justify-center gap-1">
                            <Trophy className="h-3.5 w-3.5 text-amber-400" />
                            Player {winner} Won! 🎉
                        </span>
                    ) : (
                        <span className="text-white/50 text-[11px]">
                            {turn === "X" ? "❌ Player X turn" : "⭕ Player O turn"}
                        </span>
                    )}
                </div>
            </div>
        );
    }

    // ==========================================
    // 2. ROCK PAPER SCISSORS
    // ==========================================
    if (localGame.game === "rps") {
        const choices = localGame.choices || {};
        const myChoice = choices[myUserId];
        const otherUserId = Object.keys(choices).find(k => String(k) !== String(myUserId));
        const otherChoice = otherUserId ? choices[otherUserId] : null;
        const bothChose = Object.keys(choices).length >= 2;

        const determineRPSWinner = (c1, c2) => {
            if (c1 === c2) return "draw";
            if (
                (c1 === "rock" && c2 === "scissors") ||
                (c1 === "paper" && c2 === "rock") ||
                (c1 === "scissors" && c2 === "paper")
            ) {
                return "player1";
            }
            return "player2";
        };

        const handlePickRPS = (choice) => {
            if (myChoice) return;
            soundEngine.play("laser");

            const updatedChoices = { ...choices, [myUserId]: choice };
            const isComplete = Object.keys(updatedChoices).length >= 2;

            if (isComplete) {
                soundEngine.play("win");
            }

            const updated = {
                ...localGame,
                choices: updatedChoices,
                status: isComplete ? "revealed" : "waiting",
            };
            setLocalGame(updated);
            onUpdateGame?.(updated);
        };

        const handleResetRPS = () => {
            soundEngine.play("whoosh");
            const resetGame = {
                ...localGame,
                choices: {},
                status: "waiting",
            };
            setLocalGame(resetGame);
            onUpdateGame?.(resetGame);
        };

        const emojis = { rock: "🪨 Rock", paper: "📄 Paper", scissors: "✂️ Scissors" };

        return (
            <div className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-black/40 p-4 backdrop-blur-xl max-w-[280px]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-white">
                        <span>🪨📄✂️</span>
                        <span>Rock Paper Scissors</span>
                    </div>
                    {bothChose && (
                        <button
                            type="button"
                            onClick={handleResetRPS}
                            className="flex items-center gap-1 rounded-lg bg-violet-600/50 px-2 py-1 text-[10px] font-bold text-white hover:bg-violet-600"
                        >
                            <RefreshCw className="h-3 w-3" /> Rematch
                        </button>
                    )}
                </div>

                {bothChose ? (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center gap-3 py-3 bg-white/5 rounded-2xl border border-white/10"
                    >
                        <div className="flex items-center justify-around w-full px-4 text-center">
                            <div>
                                <div className="text-[10px] text-white/50 mb-1">You</div>
                                <div className="text-3xl">{emojis[myChoice]?.split(" ")[0]}</div>
                            </div>
                            <div className="text-xl font-black text-amber-300">VS</div>
                            <div>
                                <div className="text-[10px] text-white/50 mb-1">Friend</div>
                                <div className="text-3xl">{emojis[otherChoice]?.split(" ")[0]}</div>
                            </div>
                        </div>

                        <div className="text-xs font-bold text-emerald-400">
                            {determineRPSWinner(myChoice, otherChoice) === "draw" ? (
                                <span className="text-amber-300">It's a Tie! 🤝</span>
                            ) : determineRPSWinner(myChoice, otherChoice) === "player1" ? (
                                <span className="text-emerald-400">You Won! 🎉🏆</span>
                            ) : (
                                <span className="text-rose-400">Friend Won! 👏</span>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <div className="text-xs text-white/60 text-center font-medium">
                            {myChoice ? "Waiting for friend to pick..." : "Pick your weapon:"}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {["rock", "paper", "scissors"].map((item) => (
                                <motion.button
                                    key={item}
                                    type="button"
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.92 }}
                                    disabled={Boolean(myChoice)}
                                    onClick={() => handlePickRPS(item)}
                                    className={`py-3 flex flex-col items-center gap-1 rounded-xl text-lg font-bold border transition-all ${
                                        myChoice === item
                                            ? "border-amber-400 bg-amber-400/20 text-white ring-2 ring-amber-300 shadow-lg"
                                            : myChoice
                                            ? "border-white/5 bg-white/[0.02] opacity-40"
                                            : "border-white/10 bg-white/[0.06] hover:bg-white/[0.12] text-white cursor-pointer"
                                    }`}
                                >
                                    <span>{item === "rock" ? "🪨" : item === "paper" ? "📄" : "✂️"}</span>
                                    <span className="text-[9px] capitalize text-white/70">{item}</span>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ==========================================
    // 3. CONNECT 4
    // ==========================================
    if (localGame.game === "connect4") {
        const board = localGame.board || Array(6).fill(null).map(() => Array(7).fill(null));
        const turn = localGame.turn || "🔴";
        const winner = checkConnect4Winner(board);

        const isMyTurn = (turn === "🔴" && isMeSender) || (turn === "🟡" && !isMeSender);

        const handleDropColumn = (col) => {
            if (winner || !isMyTurn) {
                if (!isMyTurn && !winner) soundEngine.play("boing");
                return;
            }

            // Find lowest available row in column
            let targetRow = -1;
            for (let r = 5; r >= 0; r--) {
                if (board[r][col] === null) {
                    targetRow = r;
                    break;
                }
            }

            if (targetRow === -1) {
                soundEngine.play("boing");
                return; // column is full
            }

            soundEngine.play("coin");
            const newBoard = board.map(row => [...row]);
            newBoard[targetRow][col] = turn;
            const nextTurn = turn === "🔴" ? "🟡" : "🔴";
            const win = checkConnect4Winner(newBoard);

            if (win && win !== "draw") {
                soundEngine.play("win");
            }

            const updated = {
                ...localGame,
                board: newBoard,
                turn: nextTurn,
                winner: win,
                moves: (localGame.moves || 0) + 1,
            };
            setLocalGame(updated);
            onUpdateGame?.(updated);
        };

        const handleResetC4 = () => {
            soundEngine.play("whoosh");
            const resetGame = {
                ...localGame,
                board: Array(6).fill(null).map(() => Array(7).fill(null)),
                turn: "🔴",
                winner: null,
                moves: 0,
            };
            setLocalGame(resetGame);
            onUpdateGame?.(resetGame);
        };

        return (
            <div className="flex flex-col gap-2.5 rounded-2xl border border-white/15 bg-black/50 p-3.5 backdrop-blur-xl max-w-[310px]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-white">
                        <span>🔴🟡</span>
                        <span>Connect 4</span>
                    </div>
                    {winner ? (
                        <button
                            type="button"
                            onClick={handleResetC4}
                            className="flex items-center gap-1 rounded-lg bg-violet-600/50 px-2 py-1 text-[10px] font-bold text-white hover:bg-violet-600"
                        >
                            <RefreshCw className="h-3 w-3" /> Rematch
                        </button>
                    ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                            {isMyTurn ? "Your turn! Drop a chip" : "Friend's turn..."}
                        </span>
                    )}
                </div>

                {/* Drop Buttons */}
                {!winner && (
                    <div className="grid grid-cols-7 gap-1 px-1">
                        {[0, 1, 2, 3, 4, 5, 6].map((col) => (
                            <button
                                key={col}
                                type="button"
                                onClick={() => handleDropColumn(col)}
                                disabled={!isMyTurn}
                                className={`py-1 rounded-md text-[11px] font-bold transition-all ${
                                    isMyTurn
                                        ? "bg-violet-600/40 hover:bg-violet-600 text-white cursor-pointer active:scale-90"
                                        : "bg-white/[0.02] text-white/20 cursor-not-allowed"
                                }`}
                            >
                                ↓
                            </button>
                        ))}
                    </div>
                )}

                {/* Board */}
                <div className="grid grid-rows-6 gap-1 bg-blue-900/60 p-2 rounded-xl border border-blue-500/30">
                    {board.map((row, rIdx) => (
                        <div key={rIdx} className="grid grid-cols-7 gap-1">
                            {row.map((cell, cIdx) => (
                                <div
                                    key={cIdx}
                                    onClick={() => !winner && isMyTurn && handleDropColumn(cIdx)}
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                                        cell === "🔴"
                                            ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]"
                                            : cell === "🟡"
                                            ? "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.7)]"
                                            : "bg-[#0b1020] hover:bg-[#141b36] border border-blue-950"
                                    }`}
                                />
                            ))}
                        </div>
                    ))}
                </div>

                <div className="text-center text-xs font-bold">
                    {winner === "draw" ? (
                        <span className="text-amber-300">Board Full! Draw! 🤝</span>
                    ) : winner ? (
                        <span className="text-emerald-400 flex items-center justify-center gap-1">
                            <Trophy className="h-3.5 w-3.5 text-amber-400" />
                            {winner} Connected 4 and Won! 🎉
                        </span>
                    ) : (
                        <span className="text-white/40 text-[11px]">
                            {turn} {turn === "🔴" ? "Red" : "Yellow"} Player Turn
                        </span>
                    )}
                </div>
            </div>
        );
    }

    // ==========================================
    // 4. EMOJI MATCH
    // ==========================================
    if (localGame.game === "emojimatch") {
        const { board, matched, pendingFlipped, winner } = localGame;

        const handleCardClick = (idx) => {
            if (winner || matched.includes(idx) || pendingFlipped.includes(idx)) return;
            
            soundEngine.play("coin");
            let newPending = [...pendingFlipped];
            let newMatched = [...matched];

            // If 2 are already flipped, this click clears them and starts a new flip
            if (newPending.length === 2) {
                newPending = [idx];
            } else {
                newPending.push(idx);
            }

            // If we just flipped the second card, check match
            if (newPending.length === 2) {
                const [i1, i2] = newPending;
                if (board[i1] === board[i2]) {
                    newMatched.push(i1, i2);
                    newPending = [];
                    soundEngine.play("win");
                } else {
                    soundEngine.play("boing");
                }
            }

            const win = newMatched.length === board.length;
            if (win) soundEngine.play("win"); // double win sound for full victory

            const updated = {
                ...localGame,
                matched: newMatched,
                pendingFlipped: newPending,
                winner: win ? "done" : null,
            };
            setLocalGame(updated);
            onUpdateGame?.(updated);
        };

        const handleResetMatch = () => {
            soundEngine.play("whoosh");
            const emojis = ["🍎", "🐶", "🚗", "🌟", "🍔", "🎸", "⚽", "🎈"];
            const pairs = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
            const resetGame = {
                ...localGame,
                board: pairs,
                matched: [],
                pendingFlipped: [],
                winner: null,
            };
            setLocalGame(resetGame);
            onUpdateGame?.(resetGame);
        };

        return (
            <div className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-black/40 p-4 backdrop-blur-xl max-w-[280px]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-white">
                        <span>🎴</span>
                        <span>Emoji Match</span>
                    </div>
                    {winner && (
                        <button
                            type="button"
                            onClick={handleResetMatch}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600/50 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-600 transition-colors"
                        >
                            <RefreshCw className="h-3 w-3" /> Play Again
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-4 gap-1.5 bg-white/5 p-2 rounded-xl border border-white/10">
                    {board.map((emoji, idx) => {
                        const isFlipped = matched.includes(idx) || pendingFlipped.includes(idx);
                        const isMatched = matched.includes(idx);
                        
                        return (
                            <motion.button
                                key={idx}
                                type="button"
                                whileHover={!isFlipped && !winner ? { scale: 1.05 } : {}}
                                whileTap={!isFlipped && !winner ? { scale: 0.95 } : {}}
                                onClick={() => handleCardClick(idx)}
                                className={`h-12 flex items-center justify-center rounded-xl text-2xl transition-all ${
                                    isMatched
                                        ? "bg-emerald-500/20 opacity-50 shadow-inner"
                                        : isFlipped
                                        ? "bg-white/10 shadow-lg border border-white/20"
                                        : "bg-gradient-to-br from-indigo-500/40 to-purple-500/40 border border-white/10 cursor-pointer shadow-md"
                                }`}
                            >
                                <AnimatePresence>
                                    {isFlipped && (
                                        <motion.span
                                            initial={{ rotateY: 90, opacity: 0 }}
                                            animate={{ rotateY: 0, opacity: 1 }}
                                            className="drop-shadow-md"
                                        >
                                            {emoji}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        );
                    })}
                </div>

                <div className="text-center text-xs font-bold text-white/50">
                    {winner ? (
                        <span className="text-emerald-400">All Matched! 🎉</span>
                    ) : (
                        <span>Find all matching pairs!</span>
                    )}
                </div>
            </div>
        );
    }

    // ==========================================
    // 5. SECRET WORD (HANGMAN)
    // ==========================================
    if (localGame.game === "wordguess") {
        const { word, status, guesses, winner } = localGame;
        const maxWrongs = 6;
        const wrongs = guesses.filter(g => !word.includes(g)).length;
        const [inputValue, setInputValue] = useState("");

        const isSetter = isMeSender; // For simplicity, initiator sets the word

        const handleSetWord = () => {
            const trimmed = inputValue.trim().toUpperCase().replace(/[^A-Z]/g, "");
            if (trimmed.length < 3 || trimmed.length > 10) return;
            soundEngine.play("coin");
            const updated = {
                ...localGame,
                word: trimmed,
                status: "playing",
            };
            setLocalGame(updated);
            onUpdateGame?.(updated);
        };

        const handleGuess = (letter) => {
            if (isSetter || winner || guesses.includes(letter)) return;
            const newGuesses = [...guesses, letter];
            const newWrongs = newGuesses.filter(g => !word.includes(g)).length;
            
            let newWinner = null;
            if (newWrongs >= maxWrongs) {
                newWinner = "setter"; // Guesser lost
                soundEngine.play("boing");
            } else if (word.split("").every(l => newGuesses.includes(l))) {
                newWinner = "guesser"; // Guesser won
                soundEngine.play("win");
            } else {
                soundEngine.play(word.includes(letter) ? "coin" : "boing");
            }

            const updated = {
                ...localGame,
                guesses: newGuesses,
                winner: newWinner,
            };
            setLocalGame(updated);
            onUpdateGame?.(updated);
        };

        const handleResetWord = () => {
            soundEngine.play("whoosh");
            const resetGame = { ...localGame, word: "", status: "setting", guesses: [], winner: null };
            setLocalGame(resetGame);
            onUpdateGame?.(resetGame);
        };

        return (
            <div className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-black/40 p-4 backdrop-blur-xl max-w-[280px]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-white">
                        <span>🅰️</span>
                        <span>Secret Word</span>
                    </div>
                    {winner && isSetter && (
                        <button onClick={handleResetWord} className="text-[10px] bg-white/10 px-2 py-1 rounded-md text-white/80 hover:bg-white/20">
                            New Word
                        </button>
                    )}
                </div>

                {status === "setting" ? (
                    isSetter ? (
                        <div className="flex flex-col gap-2">
                            <input
                                type="text"
                                placeholder="Enter secret word (3-10 letters)"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white uppercase outline-none"
                            />
                            <button
                                onClick={handleSetWord}
                                disabled={inputValue.trim().length < 3}
                                className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-1.5 rounded-lg text-sm disabled:opacity-50"
                            >
                                Set Word
                            </button>
                        </div>
                    ) : (
                        <div className="text-sm text-white/50 text-center py-4 bg-white/5 rounded-xl">
                            Friend is picking a secret word...
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="text-2xl font-mono font-bold tracking-[0.2em] text-white">
                            {word.split("").map((l, i) => (
                                <span key={i} className={guesses.includes(l) || winner ? (guesses.includes(l) ? "text-white" : "text-red-400") : "text-white/20"}>
                                    {guesses.includes(l) || winner ? l : "_"}
                                </span>
                            ))}
                        </div>
                        
                        {!winner && <div className="text-[10px] text-white/40">Mistakes: {wrongs} / {maxWrongs}</div>}
                        
                        {winner ? (
                            <div className="text-sm font-bold mt-1">
                                {winner === "guesser" ? <span className="text-emerald-400">Word Guessed! 🎉</span> : <span className="text-rose-400">Game Over! 💀</span>}
                            </div>
                        ) : (
                            <div className="grid grid-cols-7 gap-1 mt-1">
                                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(letter => {
                                    const used = guesses.includes(letter);
                                    const isCorrect = used && word.includes(letter);
                                    return (
                                        <button
                                            key={letter}
                                            disabled={used || isSetter}
                                            onClick={() => handleGuess(letter)}
                                            className={`w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded-md transition-colors ${
                                                used 
                                                    ? (isCorrect ? "bg-emerald-500/40 text-emerald-200" : "bg-white/5 text-white/20")
                                                    : "bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                                            } ${isSetter ? "cursor-not-allowed opacity-50" : ""}`}
                                        >
                                            {letter}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ==========================================
    // 6. NUMBER GUESSER
    // ==========================================
    if (localGame.game === "numberguesser") {
        const { number, status, guesses, winner } = localGame;
        const [inputValue, setInputValue] = useState("");
        const isSetter = isMeSender;

        const handleSetNumber = () => {
            const num = parseInt(inputValue);
            if (isNaN(num) || num < 1 || num > 100) return;
            soundEngine.play("coin");
            const updated = {
                ...localGame,
                number: num,
                status: "playing",
            };
            setLocalGame(updated);
            onUpdateGame?.(updated);
        };

        const handleGuessNumber = () => {
            const num = parseInt(inputValue);
            if (isNaN(num) || num < 1 || num > 100 || isSetter || winner) return;
            
            const result = num === number ? "correct" : (num > number ? "lower" : "higher");
            const newGuesses = [{ guess: num, result }, ...guesses];
            
            if (result === "correct") soundEngine.play("win");
            else soundEngine.play("coin");

            const updated = {
                ...localGame,
                guesses: newGuesses,
                winner: result === "correct" ? "guesser" : null,
            };
            setLocalGame(updated);
            onUpdateGame?.(updated);
            setInputValue("");
        };

        const handleResetNum = () => {
            soundEngine.play("whoosh");
            const resetGame = { ...localGame, number: null, status: "setting", guesses: [], winner: null };
            setLocalGame(resetGame);
            onUpdateGame?.(resetGame);
        };

        return (
            <div className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-black/40 p-4 backdrop-blur-xl max-w-[280px] w-full">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-white">
                        <span>🔢</span>
                        <span>Number Guesser</span>
                    </div>
                    {winner && isSetter && (
                        <button onClick={handleResetNum} className="text-[10px] bg-white/10 px-2 py-1 rounded-md text-white/80 hover:bg-white/20">
                            New Game
                        </button>
                    )}
                </div>

                {status === "setting" ? (
                    isSetter ? (
                        <div className="flex flex-col gap-2">
                            <input
                                type="number"
                                min="1" max="100"
                                placeholder="Set number (1-100)"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none"
                            />
                            <button
                                onClick={handleSetNumber}
                                disabled={!inputValue}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 rounded-lg text-sm disabled:opacity-50"
                            >
                                Set Number
                            </button>
                        </div>
                    ) : (
                        <div className="text-sm text-white/50 text-center py-4 bg-white/5 rounded-xl">
                            Friend is picking a number (1-100)...
                        </div>
                    )
                ) : (
                    <div className="flex flex-col gap-2">
                        {winner ? (
                            <div className="text-center text-sm font-bold text-emerald-400 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                {winner === "guesser" ? (isSetter ? "They guessed it! 🎉" : "You guessed it! 🎉") : ""}
                                <div className="text-xl text-white mt-1">{number}</div>
                            </div>
                        ) : (
                            !isSetter && (
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        min="1" max="100"
                                        placeholder="Guess 1-100"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none flex-1"
                                    />
                                    <button
                                        onClick={handleGuessNumber}
                                        disabled={!inputValue}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"
                                    >
                                        Go
                                    </button>
                                </div>
                            )
                        )}
                        
                        <div className="max-h-[120px] overflow-y-auto flex flex-col gap-1 mt-1 pr-1 custom-scrollbar">
                            {guesses.map((g, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs bg-white/5 px-2 py-1.5 rounded-md">
                                    <span className="text-white/60 font-mono">Guess: {g.guess}</span>
                                    <span className={`font-bold ${g.result === 'correct' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {g.result === 'correct' ? '🎯 Correct' : g.result === 'higher' ? '⬆️ Higher' : '⬇️ Lower'}
                                    </span>
                                </div>
                            ))}
                            {guesses.length === 0 && <div className="text-xs text-white/40 text-center py-2">No guesses yet!</div>}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return null;
}

InChatGameBoard.propTypes = {
    gameData: PropTypes.object.isRequired,
    myUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    senderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onUpdateGame: PropTypes.func,
};

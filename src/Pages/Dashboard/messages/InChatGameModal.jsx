import React from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, X, Trophy, Sparkles } from "lucide-react";
import { soundEngine } from "../../../utils/soundEffects";

const AVAILABLE_GAMES = [
    {
        id: "tictactoe",
        name: "Tic-Tac-Toe",
        emoji: "❌",
        desc: "Classic 3-in-a-row match!",
        color: "from-blue-600 to-cyan-500",
        initData: () => ({
            game: "tictactoe",
            board: Array(9).fill(null),
            turn: "X",
            winner: null,
            moves: 0,
        })
    },
    {
        id: "rps",
        name: "Rock Paper Scissors",
        emoji: "✌️",
        desc: "Best of 1 lightning duel!",
        color: "from-amber-500 to-rose-500",
        initData: () => ({
            game: "rps",
            choices: {}, // { [userId]: 'rock' | 'paper' | 'scissors' }
            winner: null,
            status: "waiting", // 'waiting' | 'revealed'
        })
    },
    {
        id: "connect4",
        name: "Connect 4",
        emoji: "🔴",
        desc: "Drop 4 in a row to win!",
        color: "from-fuchsia-600 to-purple-600",
        initData: () => ({
            game: "connect4",
            // 6 rows x 7 columns
            board: Array(6).fill(null).map(() => Array(7).fill(null)),
            turn: "🔴",
            winner: null,
            moves: 0,
        })
    }
];

export default function InChatGameModal({ isOpen, onClose, onStartGame, recipientName = "Friend" }) {
    if (!isOpen) return null;

    const handleSelectGame = (gameDef) => {
        soundEngine.play("coin");
        const gamePayload = {
            id: "game_" + Math.random().toString(36).substring(2, 9),
            ...gameDef.initData(),
            createdAt: Date.now(),
        };
        onStartGame?.(gamePayload);
        onClose?.();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#18132c] to-[#0d091a] p-6 shadow-2xl"
                    style={{ boxShadow: "0 0 50px rgba(139,92,246,0.3)" }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-lg text-white">
                                <Gamepad2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                                    Play In Chat <Sparkles className="h-4 w-4 text-amber-300" />
                                </h3>
                                <p className="text-[11px] text-white/50">Challenge {recipientName} to an instant game!</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Games List */}
                    <div className="flex flex-col gap-3">
                        {AVAILABLE_GAMES.map((game) => (
                            <motion.button
                                key={game.id}
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleSelectGame(game)}
                                className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-all hover:border-white/25 hover:bg-white/[0.08]"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${game.color} text-2xl shadow-lg`}>
                                        {game.emoji}
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-white group-hover:text-amber-200 transition-colors">
                                            {game.name}
                                        </div>
                                        <div className="text-xs text-white/45">{game.desc}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 rounded-xl bg-violet-600/30 px-3 py-1.5 text-xs font-bold text-violet-200 group-hover:bg-violet-600 group-hover:text-white transition-all border border-violet-500/30">
                                    <span>Play</span>
                                    <span>→</span>
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/40">
                        <span className="flex items-center gap-1">
                            <Trophy className="h-3.5 w-3.5 text-amber-400" /> Live scores
                        </span>
                        <span className="text-violet-300 font-semibold">Play right in your chat! 🎮</span>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

InChatGameModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onStartGame: PropTypes.func.isRequired,
    recipientName: PropTypes.string,
};

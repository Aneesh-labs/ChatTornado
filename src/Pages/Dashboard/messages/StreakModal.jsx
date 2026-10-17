import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Shield, Sparkles, X, Trophy, Clock, CheckCircle2 } from "lucide-react";
import { getStreak, freezeStreak, STREAK_TIERS } from "../../../Services/streakService";

export default function StreakModal({ isOpen, onClose, targetUser }) {
    const [streakData, setStreakData] = useState(() => getStreak(targetUser?.id));
    const [frozenNotice, setFrozenNotice] = useState(false);

    useEffect(() => {
        if (targetUser?.id) {
            setStreakData(getStreak(targetUser.id));
        }
    }, [targetUser?.id, isOpen]);

    if (!isOpen || !targetUser) return null;

    const count = streakData?.count || 0;
    const tier = streakData?.tier || STREAK_TIERS[STREAK_TIERS.length - 1];
    const isFrozen = Boolean(streakData?.isFrozen);
    const freezesAvailable = streakData?.freezesAvailable || 0;
    const hoursLeft = streakData?.hoursRemaining || 24;

    const handleFreeze = () => {
        if (freezeStreak(targetUser.id)) {
            setStreakData(getStreak(targetUser.id));
            setFrozenNotice(true);
            setTimeout(() => setFrozenNotice(false), 3000);
        }
    };

    // Calculate next tier
    const nextTier = [...STREAK_TIERS].reverse().find(t => t.min > count) || null;
    const progressPercent = nextTier ? Math.min(100, Math.round((count / nextTier.min) * 100)) : 100;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#131326] via-[#0d0d1a] to-[#07070f] border border-orange-500/30 p-6 shadow-2xl shadow-orange-500/20 overflow-hidden text-white"
                >
                    {/* Background glow orb */}
                    <div className="absolute -top-24 -left-24 w-56 h-56 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/0 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -right-24 w-56 h-56 rounded-full bg-gradient-to-br from-yellow-500/20 to-pink-500/0 blur-3xl pointer-events-none" />

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Streak Header & Flame */}
                    <div className="flex flex-col items-center text-center mt-2">
                        <motion.div
                            animate={{
                                scale: [1, 1.08, 1],
                                rotate: [0, -3, 3, 0],
                            }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                            className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${tier.color} p-0.5 shadow-xl ${tier.glow} flex items-center justify-center relative mb-4`}
                        >
                            <div className="w-full h-full rounded-[22px] bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                <span className="text-5xl select-none">{tier.icon}</span>
                            </div>
                            {isFrozen && (
                                <div className="absolute -bottom-2 -right-2 bg-cyan-500 text-black p-1.5 rounded-full shadow-lg border-2 border-black">
                                    <Shield className="w-4 h-4" />
                                </div>
                            )}
                        </motion.div>

                        <div className="flex items-center gap-2">
                            <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-orange-400 via-amber-200 to-yellow-400 bg-clip-text text-transparent">
                                {count} {count === 1 ? "Day" : "Days"} Streak
                            </h2>
                        </div>
                        <p className="text-xs font-semibold text-orange-400/90 tracking-wide uppercase mt-0.5">
                            {tier.name} with @{targetUser?.username}
                        </p>

                        {/* Status chip */}
                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10">
                            {streakData?.isActiveToday ? (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-300">Ignited today! Streak safe</span>
                                </>
                            ) : (
                                <>
                                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="text-amber-300">
                                        {hoursLeft} hours left to keep your flame alive
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Milestone Progress */}
                    {nextTier && (
                        <div className="mt-6 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                            <div className="flex justify-between items-center text-xs mb-1.5">
                                <span className="text-white/60 flex items-center gap-1.5">
                                    <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                                    Next: {nextTier.name} ({nextTier.min} Days)
                                </span>
                                <span className="text-orange-400 font-bold">{count}/{nextTier.min}</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className={`h-full bg-gradient-to-r ${tier.color}`}
                                />
                            </div>
                            <p className="text-[11px] text-white/50 mt-2 flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                Perk unlocks: <span className="text-white/80 font-medium">{nextTier.perk}</span>
                            </p>
                        </div>
                    )}

                    {/* Freeze Protection Banner */}
                    <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                                <Shield className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-cyan-200">
                                    {isFrozen ? "Streak Protected (Frozen)" : "Streak Freeze"}
                                </h4>
                                <p className="text-[10px] text-white/50">
                                    {isFrozen ? "Active today. Won't expire if you miss!" : `${freezesAvailable} freeze shields available`}
                                </p>
                            </div>
                        </div>

                        {!isFrozen && (
                            <button
                                onClick={handleFreeze}
                                disabled={freezesAvailable <= 0 || count <= 0}
                                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all shadow ${freezesAvailable > 0 && count > 0
                                    ? "bg-cyan-500 hover:bg-cyan-400 text-black active:scale-95 cursor-pointer"
                                    : "bg-white/5 text-white/30 cursor-not-allowed"
                                }`}
                            >
                                Freeze
                            </button>
                        )}
                    </div>

                    {frozenNotice && (
                        <p className="text-center text-xs text-cyan-400 font-semibold mt-2 animate-bounce">
                            ❄️ Streak frozen! Protected for the next 24 hours.
                        </p>
                    )}

                    {/* How streaks work footer */}
                    <p className="text-[10px] text-center text-white/40 mt-5">
                        Exchange at least one message every 24 hours to build and keep your Tornado Streak!
                    </p>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

StreakModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    targetUser: PropTypes.object
};

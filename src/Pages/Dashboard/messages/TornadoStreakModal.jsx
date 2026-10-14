import React, { useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flame, Zap, Wind, Crown, Shield, Clock, Share2, Check } from "lucide-react";
import API from "../../../Services/API";

export const TornadoStreakModal = ({ isOpen, onClose, user, streak, onStreakUpdated }) => {
    const [copied, setCopied] = useState(false);
    const [activatingFreeze, setActivatingFreeze] = useState(false);
    const [freezeNotice, setFreezeNotice] = useState("");

    if (!isOpen || !user) return null;

    const streakCount = Number(streak?.count || 0);
    const bestStreak = Number(streak?.best || streakCount);
    const hoursLeft = Number(streak?.hours_left || 0);
    const freezeCount = Number(streak?.freeze_count ?? 1);
    const isExpiring = Boolean(streak?.is_expiring || (hoursLeft <= 8 && streakCount > 0));

    // Milestone calculations
    let nextMilestone = 7;
    let nextBadge = "⚡";
    let nextTitle = "Lightning Cyclone";
    let prevMilestone = 0;

    if (streakCount >= 100) {
        nextMilestone = 100;
        nextBadge = "👑";
        nextTitle = "Tornado Legend (Max Rank)";
        prevMilestone = 100;
    } else if (streakCount >= 30) {
        nextMilestone = 100;
        nextBadge = "👑";
        nextTitle = "Tornado Legend";
        prevMilestone = 30;
    } else if (streakCount >= 7) {
        nextMilestone = 30;
        nextBadge = "🌪️";
        nextTitle = "Vortex Storm";
        prevMilestone = 7;
    }

    const progressPercent = nextMilestone === prevMilestone
        ? 100
        : Math.min(100, Math.max(5, Math.round(((streakCount - prevMilestone) / (nextMilestone - prevMilestone)) * 100)));

    const handleShareStreak = () => {
        const shareText = `🔥 I have a ${streakCount}-day Tornado Streak with @${user.username} on Chat Tornado! Can you beat us? 🌪️⚡`;
        navigator.clipboard?.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleUseFreeze = async () => {
        if (freezeCount <= 0 || activatingFreeze) return;
        setActivatingFreeze(true);
        setFreezeNotice("");
        try {
            const token = sessionStorage.getItem("token");
            const res = await API.post(`/api/streaks/${user.id}/freeze`, {}, { params: { token } });
            if (res.data?.streak) {
                setFreezeNotice("🛡️ Streak Freeze applied! Your flame is safe.");
                onStreakUpdated?.(res.data.streak);
            }
        } catch (err) {
            setFreezeNotice(err.response?.data?.detail || "Could not activate streak freeze.");
        } finally {
            setActivatingFreeze(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 350 }}
                    className="relative w-full max-w-sm rounded-3xl bg-neutral-950/90 border border-orange-500/30 shadow-[0_0_50px_rgba(249,115,22,0.25)] overflow-hidden text-white"
                >
                    {/* Background Ambient Glow */}
                    <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-br from-orange-500/30 via-amber-500/20 to-purple-600/20 rounded-full blur-3xl pointer-events-none" />

                    {/* Top Bar with Close Button */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10 relative z-10">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🌪️</span>
                            <span className="text-sm font-bold uppercase tracking-wider text-orange-400">
                                Tornado Streaks
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 flex flex-col items-center text-center relative z-10">
                        {/* Animated Flame Hero */}
                        <div className="relative mb-3">
                            <motion.div
                                animate={{
                                    scale: [1, 1.08, 1],
                                    rotate: [-2, 2, -2]
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 2.2,
                                    ease: "easeInOut"
                                }}
                                className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400 p-0.5 shadow-[0_0_35px_rgba(249,115,22,0.6)] flex items-center justify-center"
                            >
                                <div className="w-full h-full rounded-[22px] bg-neutral-950 flex flex-col items-center justify-center">
                                    <span className="text-4xl select-none">
                                        {streak?.badge || "🔥"}
                                    </span>
                                    <span className="text-xs font-black uppercase tracking-widest text-orange-400 mt-1">
                                        {streak?.level || "Flame"}
                                    </span>
                                </div>
                            </motion.div>
                            {isExpiring && (
                                <motion.span
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                    className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black border border-white/40 shadow-lg"
                                >
                                    ⏳ DANGER
                                </motion.span>
                            )}
                        </div>

                        {/* Counter */}
                        <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-200 to-yellow-300">
                            {streakCount} {streakCount === 1 ? "Day" : "Days"}
                        </h3>
                        <p className="text-xs text-white/60 mt-1">
                            Daily conversation streak with <span className="font-bold text-white">@{user.username}</span>
                        </p>

                        {/* Expiry / Countdown Status */}
                        <div className={`mt-4 w-full p-3 rounded-2xl border flex items-center justify-between text-xs font-medium ${
                            isExpiring
                                ? "bg-red-500/15 border-red-500/40 text-red-300 animate-pulse"
                                : "bg-white/[0.04] border-white/10 text-white/80"
                        }`}>
                            <div className="flex items-center gap-2">
                                <Clock className={`w-4 h-4 ${isExpiring ? "text-red-400" : "text-amber-400"}`} />
                                <span>{isExpiring ? "Streak Expiring Soon!" : "Next Message Window"}</span>
                            </div>
                            <span className="font-bold">
                                {streakCount > 0 ? `⏳ ${hoursLeft}h left` : "Inactive"}
                            </span>
                        </div>

                        {/* Milestone Progress Bar */}
                        <div className="w-full mt-4 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-left">
                            <div className="flex justify-between items-center text-xs mb-1.5">
                                <span className="text-white/60">Next Rank:</span>
                                <span className="font-bold text-amber-300 flex items-center gap-1">
                                    <span>{nextBadge}</span>
                                    <span>{nextTitle}</span>
                                </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 rounded-full"
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-white/40 mt-1">
                                <span>Best Streak: {bestStreak} Days</span>
                                <span>{nextMilestone - streakCount > 0 ? `${nextMilestone - streakCount} days to unlock` : "Max Level!"}</span>
                            </div>
                        </div>

                        {/* Streak Freeze Feature */}
                        <div className="w-full mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-sky-950/40 to-blue-900/30 border border-sky-500/30 text-left flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center flex-shrink-0">
                                    <Shield className="w-4 h-4 text-sky-300" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-sky-200">Streak Freeze</h4>
                                    <p className="text-[10px] text-white/50">
                                        {freezeCount > 0 ? `${freezeCount} shield available` : "0 shields left"}
                                    </p>
                                </div>
                            </div>
                            {freezeCount > 0 ? (
                                <button
                                    type="button"
                                    onClick={handleUseFreeze}
                                    disabled={activatingFreeze}
                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-sky-500 hover:bg-sky-400 text-black transition-colors disabled:opacity-50"
                                >
                                    {activatingFreeze ? "Freezing..." : "Activate"}
                                </button>
                            ) : (
                                <span className="text-[10px] font-semibold text-white/40">Used</span>
                            )}
                        </div>

                        {freezeNotice && (
                            <p className="text-[11px] text-sky-300 mt-2 font-medium">
                                {freezeNotice}
                            </p>
                        )}

                        {/* Action Buttons */}
                        <div className="w-full grid grid-cols-2 gap-2 mt-5">
                            <button
                                type="button"
                                onClick={handleShareStreak}
                                className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all active:scale-95"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-amber-400" />}
                                <span>{copied ? "Copied!" : "Flex Streak"}</span>
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-xs font-black text-black flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md"
                            >
                                <span>Keep Chatting 🔥</span>
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

TornadoStreakModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    user: PropTypes.object,
    streak: PropTypes.object,
    onStreakUpdated: PropTypes.func,
};

export default TornadoStreakModal;

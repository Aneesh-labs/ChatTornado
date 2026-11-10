import React, { useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Clock, Lock, Send, X, AlertTriangle } from "lucide-react";
import { soundEngine } from "../../../utils/soundEffects";

const DURATIONS = [
    { label: "10s (Flash)", seconds: 10 },
    { label: "30s (Default)", seconds: 30 },
    { label: "1 min", seconds: 60 },
    { label: "5 min", seconds: 300 },
    { label: "1 hour", seconds: 3600 },
];

export default function DeadDropModal({ isOpen, onClose, onSendDeadDrop }) {
    const [secretText, setSecretText] = useState("");
    const [selectedSeconds, setSelectedSeconds] = useState(30);

    if (!isOpen) return null;

    const handleSend = (e) => {
        e.preventDefault();
        if (!secretText.trim()) return;

        const timeLabel = selectedSeconds < 60 ? `${selectedSeconds}s` : selectedSeconds < 3600 ? `${Math.round(selectedSeconds / 60)}m` : "1h";
        const formatted = `⚡ [DEAD DROP: ${timeLabel}] ${secretText.trim()}`;

        onSendDeadDrop(formatted);
        soundEngine?.play?.("laser");
        setSecretText("");
        onClose();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none">
                <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 12 }}
                    className="relative w-full max-w-md max-h-[88dvh] overflow-y-auto overflow-x-hidden custom-scrollbar rounded-2xl border border-amber-500/30 bg-[#0b0e17] p-5 sm:p-6 shadow-2xl text-white"
                >
                    {/* Glowing sci-fi neon strip */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                                <Zap className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                                    <span>Dead Drop Transmission</span>
                                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        Self-Destruct
                                    </span>
                                </h3>
                                <p className="text-[11px] text-white/40">
                                    Burns to digital ash after recipient decrypts it.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSend} className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-1.5">
                                Classified Message / Passcode / Secret
                            </label>
                            <textarea
                                value={secretText}
                                onChange={(e) => setSecretText(e.target.value)}
                                placeholder="Enter confidential message to transmit..."
                                rows={4}
                                autoFocus
                                className="w-full bg-white/[0.04] border border-white/10 focus:border-amber-400/50 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-white/30 outline-none resize-none font-mono"
                            />
                        </div>

                        {/* Timer Selector */}
                        <div>
                            <label className="block text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>Self-Destruct Timer (Starts on Decrypt)</span>
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                                {DURATIONS.map((dur) => {
                                    const active = selectedSeconds === dur.seconds;
                                    return (
                                        <button
                                            key={dur.seconds}
                                            type="button"
                                            onClick={() => setSelectedSeconds(dur.seconds)}
                                            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition text-center cursor-pointer ${
                                                active
                                                    ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm"
                                                    : "bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.06]"
                                            }`}
                                        >
                                            {dur.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Notice */}
                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/80 text-[11px]">
                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <span>Once the recipient clicks Decrypt, the countdown begins. At 0 seconds, content is completely vaporized.</span>
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!secretText.trim()}
                                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                            >
                                <Send className="w-3.5 h-3.5" />
                                <span>Launch Dead Drop</span>
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

DeadDropModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSendDeadDrop: PropTypes.func.isRequired,
};

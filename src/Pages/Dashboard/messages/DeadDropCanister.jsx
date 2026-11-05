import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { Zap, Clock, Lock, Unlock, Flame, AlertCircle } from "lucide-react";
import { soundEngine } from "../../../utils/soundEffects";
import MathFormattedText from "./MathFormattedText";

const parseDeadDrop = (rawText) => {
    const match = rawText.match(/^⚡\s*\[DEAD DROP:\s*([^\]]+)\]\s*([\s\S]*)$/i);
    if (!match) return { durationStr: "30s", seconds: 30, content: rawText };

    const dur = match[1].trim().toLowerCase();
    let seconds = 30;

    if (dur.endsWith("s")) {
        seconds = parseInt(dur, 10) || 30;
    } else if (dur.endsWith("m")) {
        seconds = (parseInt(dur, 10) || 1) * 60;
    } else if (dur.endsWith("h")) {
        seconds = (parseInt(dur, 10) || 1) * 3600;
    }

    return {
        durationStr: match[1].trim(),
        seconds: Math.max(5, seconds),
        content: match[2].trim(),
    };
};

export default function DeadDropCanister({ rawMessage, onOpenLightbox }) {
    const { durationStr, seconds, content } = parseDeadDrop(rawMessage);
    const [isDecrypted, setIsDecrypted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(seconds);
    const [isVaporized, setIsVaporized] = useState(false);
    const timerRef = useRef(null);

    const handleDecrypt = () => {
        setIsDecrypted(true);
        setTimeLeft(seconds);
        soundEngine?.play?.("laser");

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    setIsVaporized(true);
                    soundEngine?.play?.("explosion");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // 1. Vaporized State
    if (isVaporized) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="my-1.5 p-3 sm:p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs font-mono flex items-center gap-2.5 shadow-lg select-none"
            >
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
                    <Flame className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                    <p className="font-bold uppercase tracking-wider text-[11px] text-rose-200">
                        💥 Transmission Vaporized
                    </p>
                    <p className="text-[10px] text-rose-400/70 mt-0.5">
                        Self-destruct timer expired. Memory contents shredded.
                    </p>
                </div>
            </motion.div>
        );
    }

    // 2. Sealed State (Before decrypt)
    if (!isDecrypted) {
        return (
            <div className="my-1.5 p-3.5 sm:p-4 rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-[#0d101a] to-amber-950/20 shadow-xl max-w-sm select-none">
                <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 flex-shrink-0">
                        <Lock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                                Dead Drop Canister
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {durationStr}
                            </span>
                        </div>
                        <p className="text-[10px] text-white/50 truncate">
                            Encrypted payload • Burns after reading
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleDecrypt}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
                >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Decrypt Transmission</span>
                </button>
            </div>
        );
    }

    // 3. Decrypted Active State (Ticking down)
    const pct = Math.max(0, Math.min(100, (timeLeft / seconds) * 100));

    return (
        <div className="my-1.5 p-3.5 sm:p-4 rounded-xl border border-amber-400/60 bg-[#0d101a] shadow-2xl max-w-md select-text">
            {/* Ticking Banner */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10 select-none">
                <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300">
                        Self-Destruct Active
                    </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-xs font-black text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3 animate-spin [animation-duration:3s]" />
                    <span>{timeLeft}s</span>
                </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-3 select-none">
                <div
                    className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${pct}%` }}
                />
            </div>

            {/* Decrypted Content */}
            <div className="text-white/95 text-xs sm:text-sm leading-relaxed font-mono whitespace-pre-wrap">
                <MathFormattedText text={content} onOpenLightbox={onOpenLightbox} />
            </div>
        </div>
    );
}

DeadDropCanister.propTypes = {
    rawMessage: PropTypes.string.isRequired,
    onOpenLightbox: PropTypes.func,
};

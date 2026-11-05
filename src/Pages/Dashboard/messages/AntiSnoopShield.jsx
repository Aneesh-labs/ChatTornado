import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, Lock } from "lucide-react";
import {
    getShieldActive,
    setShieldActive,
    getAutoBlurOnInactive,
} from "../../../Services/privacyShieldService";
import { soundEngine } from "../../../utils/soundEffects";

export default function AntiSnoopShield() {
    const [isManualShield, setIsManualShield] = useState(getShieldActive);
    const [isWindowUnfocused, setIsWindowUnfocused] = useState(false);
    const [autoBlur, setAutoBlur] = useState(getAutoBlurOnInactive);

    useEffect(() => {
        const handleShieldChanged = (e) => {
            setIsManualShield(Boolean(e.detail?.active));
        };
        const handleAutoBlurChanged = (e) => {
            setAutoBlur(Boolean(e.detail?.enabled));
        };

        window.addEventListener("vortex_shield_changed", handleShieldChanged);
        window.addEventListener("vortex_shield_autoblur_changed", handleAutoBlurChanged);

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setIsWindowUnfocused(true);
            } else {
                // Keep brief grace period before unblurring if returning
                setIsWindowUnfocused(false);
            }
        };

        const handleBlur = () => {
            if (autoBlur) {
                setIsWindowUnfocused(true);
            }
        };

        const handleFocus = () => {
            setIsWindowUnfocused(false);
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("focus", handleFocus);

        return () => {
            window.removeEventListener("vortex_shield_changed", handleShieldChanged);
            window.removeEventListener("vortex_shield_autoblur_changed", handleAutoBlurChanged);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("focus", handleFocus);
        };
    }, [autoBlur]);

    const isVisible = isManualShield || (autoBlur && isWindowUnfocused);

    const handleDeBlur = useCallback(() => {
        setIsManualShield(false);
        setIsWindowUnfocused(false);
        setShieldActive(false);
        soundEngine?.play?.("cyber_chirp");
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={handleDeBlur}
                    className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6 bg-[#07090e]/85 backdrop-blur-2xl cursor-pointer select-none"
                    role="alert"
                    aria-label="Anti-snoop shield active. Click to reveal transmission."
                >
                    {/* Futuristic holographic grid texture */}
                    <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

                    {/* Shield Emblem */}
                    <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-cyan-500/20 via-sky-500/10 to-indigo-500/20 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.3)] mb-4"
                    >
                        <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
                        <Lock className="w-3.5 h-3.5 text-white/80 absolute bottom-3 right-3" />
                    </motion.div>

                    {/* Classification Notice */}
                    <div className="relative z-10 text-center max-w-sm">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase mb-2">
                            <span>🛡️ Privacy Shield Active</span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                            Transmission Obfuscated
                        </h3>
                        <p className="text-xs text-white/50 mt-1 mb-5 leading-relaxed">
                            Screen content is locked against shoulder surfers & camera capture.
                        </p>

                        <button
                            type="button"
                            onClick={handleDeBlur}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 hover:brightness-110 active:scale-95 transition-all touch-manipulation cursor-pointer"
                        >
                            <Eye className="w-4 h-4" />
                            <span>Tap to Reveal Chat</span>
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

AntiSnoopShield.propTypes = {};

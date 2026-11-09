import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, Lock, EyeOff } from "lucide-react";
import {
    getShieldActive,
    setShieldActive,
    getAutoBlurOnInactive,
    setAutoBlurOnInactive,
} from "../../../Services/privacyShieldService";
import { soundEngine } from "../../../utils/soundEffects";

export default function AntiSnoopShield() {
    const [isManualShield, setIsManualShield] = useState(getShieldActive);
    const [isWindowUnfocused, setIsWindowUnfocused] = useState(false);
    const [autoBlur, setAutoBlur] = useState(getAutoBlurOnInactive);

    const isMobileDevice = typeof window !== "undefined" && (
        window.matchMedia("(max-width: 768px)").matches ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "") ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)
    );

    useEffect(() => {
        const handleShieldChanged = (e) => {
            setIsManualShield(Boolean(e.detail?.active));
        };
        const handleAutoBlurChanged = (e) => {
            setAutoBlur(Boolean(e.detail?.enabled));
        };

        window.addEventListener("vortex_shield_changed", handleShieldChanged);
        window.addEventListener("vortex_shield_autoblur_changed", handleAutoBlurChanged);

        // On mobile devices, window.blur fires constantly when opening virtual keyboard or scrolling.
        // Therefore, we NEVER attach window blur listeners on mobile!
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Only if autoBlur is explicitly turned on by user
                if (autoBlur && !isMobileDevice) {
                    setIsWindowUnfocused(true);
                }
            } else {
                setIsWindowUnfocused(false);
            }
        };

        const handleBlur = () => {
            // NEVER auto-blur on mobile/touch phones
            if (!isMobileDevice && autoBlur) {
                setIsWindowUnfocused(true);
            }
        };

        const handleFocus = () => {
            setIsWindowUnfocused(false);
        };

        const handleInteraction = () => {
            // Any tap/click/touch immediately wakes and clears any passive unfocused blur
            setIsWindowUnfocused(false);
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        if (!isMobileDevice) {
            window.addEventListener("blur", handleBlur);
            window.addEventListener("focus", handleFocus);
        }
        window.addEventListener("pointerdown", handleInteraction, { passive: true });
        window.addEventListener("touchstart", handleInteraction, { passive: true });

        return () => {
            window.removeEventListener("vortex_shield_changed", handleShieldChanged);
            window.removeEventListener("vortex_shield_autoblur_changed", handleAutoBlurChanged);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            if (!isMobileDevice) {
                window.removeEventListener("blur", handleBlur);
                window.removeEventListener("focus", handleFocus);
            }
            window.removeEventListener("pointerdown", handleInteraction);
            window.removeEventListener("touchstart", handleInteraction);
        };
    }, [autoBlur, isMobileDevice]);

    // On mobile, shield ONLY appears if manually toggled on
    const isVisible = isMobileDevice ? isManualShield : (isManualShield || (autoBlur && isWindowUnfocused));

    const handleDeBlur = useCallback((e) => {
        if (e) e.stopPropagation();
        setIsManualShield(false);
        setIsWindowUnfocused(false);
        setShieldActive(false);
        if (isMobileDevice) {
            setAutoBlurOnInactive(false);
        }
        soundEngine?.play?.("cyber_chirp");
    }, [isMobileDevice]);

    const handlePermanentDisable = useCallback((e) => {
        if (e) e.stopPropagation();
        setIsManualShield(false);
        setIsWindowUnfocused(false);
        setShieldActive(false);
        setAutoBlurOnInactive(false);
        soundEngine?.play?.("pop");
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={handleDeBlur}
                    className="absolute inset-0 z-40 flex flex-col items-center justify-center p-4 sm:p-6 bg-[#07090e]/85 backdrop-blur-2xl cursor-pointer select-none overscroll-contain"
                    role="alert"
                    aria-label="Anti-snoop shield active. Click to reveal transmission."
                >
                    {/* Futuristic holographic grid texture */}
                    <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

                    {/* Shield Emblem */}
                    <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="relative z-10 w-14 h-14 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-cyan-500/20 via-sky-500/10 to-indigo-500/20 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.3)] mb-3 sm:mb-4"
                    >
                        <Shield className="w-7 h-7 sm:w-10 sm:h-10 text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
                        <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/80 absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3" />
                    </motion.div>

                    {/* Classification Notice */}
                    <div className="relative z-10 text-center max-w-sm px-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase mb-2">
                            <span>🛡️ Privacy Shield</span>
                        </div>
                        <h3 className="text-sm sm:text-lg font-black text-white tracking-wide">
                            Transmission Obfuscated
                        </h3>
                        <p className="text-[11px] sm:text-xs text-white/50 mt-1 mb-4 leading-relaxed">
                            Screen content is veiled against shoulder surfing & camera capture.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={handleDeBlur}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 hover:brightness-110 active:scale-95 transition-all touch-manipulation cursor-pointer"
                            >
                                <Eye className="w-4 h-4" />
                                <span>Tap to Reveal Chat</span>
                            </button>

                            <button
                                type="button"
                                onClick={handlePermanentDisable}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-[11px] font-semibold transition-all touch-manipulation cursor-pointer"
                            >
                                <EyeOff className="w-3.5 h-3.5 text-red-400" />
                                <span>Turn Off Auto-Veil</span>
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

AntiSnoopShield.propTypes = {};

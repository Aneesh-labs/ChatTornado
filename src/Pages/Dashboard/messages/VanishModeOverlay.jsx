import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Ghost, ShieldAlert, Clock, X, Flame, EyeOff, AlertTriangle } from "lucide-react";

export default function VanishModeOverlay({
    isActive,
    onToggle,
    selectedUser,
    onSendVanishMessage,
    onScreenshotDetected
}) {
    const [vanishDuration, setVanishDuration] = useState(10); // seconds
    const [screenshotAlert, setScreenshotAlert] = useState(null);

    // Screenshot & Screen Capture Detection
    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e) => {
            // PrintScreen, Windows+Shift+S, Mac Cmd+Shift+3/4
            const isPrtScn = e.key === "PrintScreen" || e.code === "PrintScreen";
            const isWinSnip = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "s" || e.key === "S");
            const isMacShot = e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5");

            if (isPrtScn || isWinSnip || isMacShot) {
                triggerScreenshotWarning("Keyboard shortcut screenshot");
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // User may have switched to snipping tool or screen recorder
                triggerScreenshotWarning("Screen focus lost / potential screen capture");
            }
        };

        window.addEventListener("keyup", handleKeyDown);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("keyup", handleKeyDown);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [isActive]);

    const triggerScreenshotWarning = useCallback((method) => {
        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setScreenshotAlert({
            time: timeStr,
            method
        });

        if (onScreenshotDetected) {
            onScreenshotDetected(`⚠️ Screenshot / screen grab attempt detected (${timeStr})`);
        }

        setTimeout(() => {
            setScreenshotAlert(null);
        }, 5000);
    }, [onScreenshotDetected]);

    if (!isActive) return null;

    return (
        <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
            {/* Top Vanish Mode Status Ribbon */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-gradient-to-r from-purple-950/95 via-[#18092e]/95 to-indigo-950/95 border-b border-purple-500/40 px-4 py-2 flex items-center justify-between shadow-xl backdrop-blur-xl pointer-events-auto"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center animate-pulse">
                        <Ghost className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                                Vanish Mode Active
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                        </div>
                        <p className="text-[10px] text-white/50">
                            Messages auto-destruct after viewing • Screenshots alert both members
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Timer Selector */}
                    <div className="flex items-center gap-1 bg-black/40 border border-purple-500/30 rounded-xl px-2 py-1 text-xs">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <select
                            value={vanishDuration}
                            onChange={(e) => setVanishDuration(Number(e.target.value))}
                            className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
                        >
                            <option value={5} className="bg-gray-900">5s timer</option>
                            <option value={10} className="bg-gray-900">10s timer</option>
                            <option value={30} className="bg-gray-900">30s timer</option>
                            <option value={60} className="bg-gray-900">1m timer</option>
                        </select>
                    </div>

                    {/* Exit Vanish Mode Button */}
                    <button
                        onClick={onToggle}
                        className="px-3 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    >
                        Turn Off
                    </button>
                </div>
            </motion.div>

            {/* Red Screen-Flash Alert when Screenshot Detected */}
            <AnimatePresence>
                {screenshotAlert && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white px-5 py-3 rounded-2xl border-2 border-red-400 shadow-2xl flex items-center gap-3 backdrop-blur-md pointer-events-auto"
                    >
                        <ShieldAlert className="w-6 h-6 animate-bounce text-yellow-300 flex-shrink-0" />
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-300">
                                ⚠️ Screenshot / Screen Capture Detected!
                            </h4>
                            <p className="text-[11px] text-white/90">
                                An attempt to record or capture this screen was recorded at {screenshotAlert.time}.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

VanishModeOverlay.propTypes = {
    isActive: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
    selectedUser: PropTypes.object,
    onSendVanishMessage: PropTypes.func,
    onScreenshotDetected: PropTypes.func
};

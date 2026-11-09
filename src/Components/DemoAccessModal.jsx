import React, { useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles,
    Shield,
    Clock,
    User,
    ArrowRight,
    X,
    Radio,
    Copy,
    Check
} from "lucide-react";
import API from "../Services/API";
import soundEngine from "../utils/soundEffects";

export default function DemoAccessModal({ isOpen, onClose, initialName = "" }) {
    const [demoName, setDemoName] = useState(initialName);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopyCredentials = () => {
        try {
            navigator.clipboard.writeText("Email: demo@chattornado.com\nPassword: DemoUser2026!");
            setCopied(true);
            soundEngine?.play?.("pop");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore
        }
    };

    const handleLaunchDemo = async (e) => {
        if (e) e.preventDefault();
        const trimmed = demoName.trim();
        if (!trimmed || trimmed.length < 2) {
            setError("Please enter a name or callsign (minimum 2 characters).");
            return;
        }

        setError("");
        setLoading(true);
        soundEngine?.play?.("cyber_chirp");

        try {
            const res = await API.post("/login", {
                email: "demo@chattornado.com",
                password: "DemoUser2026!",
                demo_name: trimmed
            });

            if (res.data?.requires_demo_name && !trimmed) {
                setError("Please enter your name or callsign to enter.");
                setLoading(false);
                return;
            }

            const token = res.data?.access_token || res.data?.token;
            if (!token) {
                throw new Error("Unable to obtain demo authorization token.");
            }

            // Persist to session & local storage
            sessionStorage.setItem("token", token);
            sessionStorage.setItem("username", res.data.username || `${trimmed} (Demo)`);
            sessionStorage.setItem("email", res.data.email || `demo_${trimmed.toLowerCase()}@chattornado.internal`);
            sessionStorage.setItem("role", res.data.role || "USER");
            sessionStorage.setItem("onboardingCompleted", "false"); // Ensures the Symbol Cheat Sheet opens first!
            sessionStorage.setItem("is_demo", "true");
            if (res.data.demo_expires_at) {
                sessionStorage.setItem("demo_expires_at", res.data.demo_expires_at);
            }

            localStorage.setItem("token", token);
            localStorage.setItem("username", res.data.username || `${trimmed} (Demo)`);
            localStorage.setItem("portfolio_onboarding_completed", "false");

            window.dispatchEvent(new Event("sessionStorageUpdate"));
            soundEngine?.play?.("success");

            // Redirect smoothly to home/messages
            setTimeout(() => {
                window.location.href = "/messages";
            }, 300);
        } catch (err) {
            console.error("[DEMO LOGIN ERROR]", err);
            setError(err.response?.data?.detail || err.message || "Failed to initialize demo session. Please try again.");
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-2xl select-none overscroll-contain">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: "spring", stiffness: 360, damping: 28 }}
                    className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl border border-cyan-500/40 bg-[#090d16] text-white shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col max-h-[92vh]"
                >
                    {/* Top ambient holographic neon glow */}
                    <div className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-90" />

                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 flex-shrink-0 bg-white/[0.02]">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-blue-600/30 to-purple-600/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-md">
                                <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                                    <span>ChatTornado Demo Gateway</span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold uppercase">
                                        3 Days Free
                                    </span>
                                </h3>
                                <p className="text-[11px] text-white/50 font-mono">
                                    Shared Multi-User Instant Access Pass
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Modal Body */}
                    <form onSubmit={handleLaunchDemo} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 custom-scrollbar space-y-4">
                        {/* Info Card */}
                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/30 border border-cyan-500/30 space-y-2.5">
                            <div className="flex items-center gap-2">
                                <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                                <h4 className="text-xs sm:text-sm font-bold text-white">
                                    How the Demo Experience Works
                                </h4>
                            </div>
                            <ul className="text-xs text-white/70 space-y-1.5 leading-relaxed">
                                <li className="flex items-start gap-2">
                                    <Clock className="w-3.5 h-3.5 text-amber-300 flex-shrink-0 mt-0.5" />
                                    <span><strong>3-Day Active Session:</strong> Valid for 72 hours from your last login. Refreshes each time you log back in.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <User className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0 mt-0.5" />
                                    <span><strong>Name Persistence:</strong> Enter your name or callsign below. Re-entering the same name restores your previous messages and state.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Shield className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0 mt-0.5" />
                                    <span><strong>Isolated Data:</strong> Each friend who logs in with their name receives an isolated workspace while seeing all global AI and squad channels.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Credentials Hint Card */}
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 text-xs">
                            <div className="space-y-0.5 min-w-0">
                                <p className="text-[10px] text-white/40 uppercase font-mono font-bold tracking-wider">
                                    Universal Demo Credentials
                                </p>
                                <p className="font-mono text-cyan-300 truncate text-[11px] sm:text-xs">
                                    demo@chattornado.com &bull; DemoUser2026!
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCopyCredentials}
                                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copied ? "Copied" : "Copy"}</span>
                            </button>
                        </div>

                        {/* Name Input */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-white/90">
                                Enter your name or nickname to enter: <span className="text-cyan-400">*</span>
                            </label>
                            <div className="relative">
                                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                <input
                                    type="text"
                                    value={demoName}
                                    onChange={(e) => {
                                        setDemoName(e.target.value);
                                        if (error) setError("");
                                    }}
                                    placeholder="e.g. Alex, Rohan, Priya, Commander"
                                    autoFocus
                                    maxLength={25}
                                    className="w-full bg-white/[0.04] border border-cyan-500/30 focus:border-cyan-400 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-white/30 outline-none transition-all shadow-inner"
                                />
                            </div>
                            <p className="text-[10px] text-white/50">
                                Tip: Re-entering this exact name next time will restore your chats and preferences.
                            </p>
                        </div>

                        {error && (
                            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                            <button
                                type="submit"
                                disabled={loading || !demoName.trim()}
                                className={`w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all cursor-pointer ${
                                    loading || !demoName.trim()
                                        ? "bg-cyan-500/30 text-white/40 border border-cyan-500/20 cursor-not-allowed"
                                        : "interactive-shimmer-btn text-white hover:scale-[1.01] active:scale-[0.99]"
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Initializing Demo Workspace...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🚀 Launch 3-Day Demo Experience</span>
                                        <ArrowRight className="w-4 h-4 text-cyan-300" />
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold text-white/60 hover:text-white transition-all cursor-pointer"
                            >
                                Back to Standard Login
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

DemoAccessModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    initialName: PropTypes.string
};

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, CheckCircle2, Zap, Brain, Shield, Sparkles, X } from "lucide-react";
import { soundEngine } from "../../../utils/soundEffects";

export const GOOGLE_MODELS = [
    {
        id: "gemini-3.5-flash",
        name: "Gemini 3.5 Flash",
        version: "v3.5",
        tag: "Default • Smart & Fast",
        badge: "Recommended",
        badgeStyle: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]",
        icon: Zap,
        iconColor: "text-cyan-400",
        iconBg: "bg-cyan-500/10 border-cyan-500/30",
        description: "Google's flagship multimodal model with integrated Google Search grounding, fast reasoning, and balanced conversational depth.",
        speed: "0.3s (Ultra-fast)",
        intelligence: "Very High",
        context: "1M Tokens",
    },
    {
        id: "gemini-3.5-flash-lite",
        name: "Gemini 3.5 Flash Lite",
        version: "v3.5 Lite",
        tag: "Instant Token Streaming",
        badge: "Lowest Latency",
        badgeStyle: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]",
        icon: Sparkles,
        iconColor: "text-emerald-400",
        iconBg: "bg-emerald-500/10 border-emerald-500/30",
        description: "Optimized for lightning-fast token generation and zero-lag dialogue, ideal for rapid interactive exchanges.",
        speed: "0.15s (Instantaneous)",
        intelligence: "High",
        context: "1M Tokens",
    },
    {
        id: "gemini-3.1-pro-preview",
        name: "Gemini 3.1 Pro",
        version: "v3.1 Pro",
        tag: "Deep Reasoning & Architecture",
        badge: "Deep Reasoning",
        badgeStyle: "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.3)]",
        icon: Brain,
        iconColor: "text-purple-400",
        iconBg: "bg-purple-500/10 border-purple-500/30",
        description: "Google's most capable reasoning engine for intricate programming, mathematics, structured payloads, and deep analytical queries.",
        speed: "0.7s (Moderate)",
        intelligence: "Maximum",
        context: "2M Tokens",
    },
    {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        version: "v2.5",
        tag: "Battle-Tested Production",
        badge: "Ultra-Stable",
        badgeStyle: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]",
        icon: Shield,
        iconColor: "text-amber-400",
        iconBg: "bg-amber-500/10 border-amber-500/30",
        description: "Proven long-running production standard known for robust consistency and reliable instruction adherence across diverse inputs.",
        speed: "0.4s (Very Fast)",
        intelligence: "High",
        context: "1M Tokens",
    },
];

export const STORAGE_KEY_GOOGLE_MODEL = "vortex_selected_google_model";

export const getSelectedGoogleModel = () => {
    if (typeof window === "undefined") return "gemini-3.5-flash";
    return localStorage.getItem(STORAGE_KEY_GOOGLE_MODEL) || "gemini-3.5-flash";
};

export default function GoogleModelModal({ isOpen, onClose }) {
    const [selectedModel, setSelectedModel] = useState(getSelectedGoogleModel);
    const [savedNotification, setSavedNotification] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedModel(getSelectedGoogleModel());
            setSavedNotification(false);
        }
    }, [isOpen]);

    const handleSelect = (modelId) => {
        setSelectedModel(modelId);
        soundEngine?.play?.("pop");
    };

    const handleApply = () => {
        localStorage.setItem(STORAGE_KEY_GOOGLE_MODEL, selectedModel);
        window.dispatchEvent(new CustomEvent("vortex_google_model_changed", { detail: selectedModel }));
        soundEngine?.play?.("win");
        setSavedNotification(true);
        setTimeout(() => {
            onClose();
        }, 350);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 select-none"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.93, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.93, y: 15 }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-[#0c101d] via-[#090c17] to-[#05070f] p-5 sm:p-6 shadow-2xl"
                    style={{ boxShadow: "0 0 50px rgba(6,182,212,0.18)" }}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between pb-4 border-b border-white/10 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[1px] shadow-lg">
                                <div className="flex h-full w-full items-center justify-center rounded-2xl bg-[#090d18]">
                                    <Cpu className="h-6 w-6 text-cyan-300" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                    Google Gemini Engine
                                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                        Multi-Model
                                    </span>
                                </h3>
                                <p className="text-xs text-white/60">Choose which neural intelligence powers your VORTEX-9 conversation</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Model Grid */}
                    <div className="space-y-2.5 max-h-[58vh] overflow-y-auto pr-1">
                        {GOOGLE_MODELS.map((model) => {
                            const isSelected = selectedModel === model.id;
                            const IconComponent = model.icon;

                            return (
                                <div
                                    key={model.id}
                                    onClick={() => handleSelect(model.id)}
                                    className={`group relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                                        isSelected
                                            ? "bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/50"
                                            : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`p-2 rounded-xl border ${model.iconBg}`}>
                                                <IconComponent className={`w-4 h-4 ${model.iconColor}`} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">
                                                        {model.name}
                                                    </h4>
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${model.badgeStyle}`}>
                                                        {model.badge}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-white/50">{model.tag}</p>
                                            </div>
                                        </div>

                                        <div className="flex-shrink-0 flex items-center">
                                            {isSelected ? (
                                                <span className="flex items-center gap-1 text-[11px] font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 rounded-full shadow-sm">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                                                    Active
                                                </span>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white/40">
                                                    <div className="w-2 h-2 rounded-full bg-white/20 group-hover:bg-white/40" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <p className="mt-2 text-[11px] text-white/70 leading-relaxed">
                                        {model.description}
                                    </p>

                                    {/* Specs strip */}
                                    <div className="mt-2.5 flex items-center gap-3 pt-2 border-t border-white/5 text-[10px] text-white/50">
                                        <div>
                                            <span className="text-white/30">Speed: </span>
                                            <span className="font-semibold text-white/80">{model.speed}</span>
                                        </div>
                                        <div>•</div>
                                        <div>
                                            <span className="text-white/30">Reasoning: </span>
                                            <span className="font-semibold text-white/80">{model.intelligence}</span>
                                        </div>
                                        <div>•</div>
                                        <div>
                                            <span className="text-white/30">Context: </span>
                                            <span className="font-semibold text-white/80">{model.context}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                        <div className="text-[11px] text-white/50">
                            Automatic fallback guarantees 100% uptime
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-3.5 py-2 text-xs font-semibold text-white/60 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleApply}
                                className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                {savedNotification ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                                        <span>Activated!</span>
                                    </>
                                ) : (
                                    <>
                                        <Cpu className="w-4 h-4" />
                                        <span>Activate Model</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

GoogleModelModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};

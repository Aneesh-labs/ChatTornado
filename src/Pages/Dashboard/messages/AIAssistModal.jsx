import React, { useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Languages, Wand2, Check, ArrowRight, CornerDownLeft, Loader2 } from "lucide-react";
import { polishTone, translateText } from "../../../Services/aiAssistantService";

const TONES = [
    { id: "witty", label: "😉 Witty", desc: "Charming & clever" },
    { id: "professional", label: "💼 Executive", desc: "Polite & business-ready" },
    { id: "roast", label: "🔥 Roast", desc: "Playfully savage" },
    { id: "flirty", label: "💘 Romantic", desc: "Sweet & flirtatious" },
    { id: "diplomatic", label: "🤝 Diplomatic", desc: "Conflict resolving" },
    { id: "concise", label: "⚡ Punchy", desc: "Razor brief" },
];

const LANGUAGES = ["Spanish", "Hindi", "French", "Japanese", "German", "Russian", "Arabic", "Mandarin"];

const QUICK_STARTERS = [
    "Could you summarize our key discussion points?",
    "Can you review and explain this code snippet?",
    "Help me draft a friendly and polite follow-up message.",
    "Please check and correct any grammar or tone issues in this."
];

export default function AIAssistModal({ isOpen, onClose, currentDraft, onApplyDraft }) {
    const [selectedTone, setSelectedTone] = useState("witty");
    const [targetLang, setTargetLang] = useState("Spanish");
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewResult, setPreviewResult] = useState("");

    if (!isOpen || typeof document === "undefined") return null;

    const handleGenerateTone = async (toneId) => {
        if (!currentDraft || !currentDraft.trim()) return;
        setSelectedTone(toneId);
        setIsGenerating(true);
        try {
            const polished = await polishTone(currentDraft, toneId);
            setPreviewResult(polished);
        } catch (err) {
            console.error("Tone generation error", err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleTranslate = async (lang) => {
        if (!currentDraft || !currentDraft.trim()) return;
        setTargetLang(lang);
        setIsGenerating(true);
        try {
            const translated = await translateText(currentDraft, lang);
            setPreviewResult(translated);
        } catch (err) {
            console.error("Translation error", err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApply = () => {
        if (previewResult && onApplyDraft) {
            onApplyDraft(previewResult);
            onClose();
        }
    };

    const handlePickStarter = (starterText) => {
        onApplyDraft?.(starterText);
        onClose();
    };

    return createPortal(
        <AnimatePresence>
            <div 
                className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 40 }}
                    className="relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-purple-500/20 bg-[#0d1017] p-5 sm:p-6 shadow-2xl text-white select-none max-h-[90vh] overflow-y-auto custom-scrollbar"
                >
                    {/* Mobile Pull Indicator */}
                    <div className="sm:hidden w-12 h-1 bg-white/20 rounded-full mx-auto mb-3" />

                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors p-1"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-white">VORTEX AI Message Assistant</h3>
                            <p className="text-xs text-white/50">Instant tone rephrasing, quick prompts & translation</p>
                        </div>
                    </div>

                    {/* Original Draft Preview or Quick Starters */}
                    {currentDraft && currentDraft.trim() ? (
                        <div className="mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                            <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1">
                                Your Draft to Polish:
                            </div>
                            <div className="text-xs text-white/90 italic">
                                "{currentDraft}"
                            </div>
                        </div>
                    ) : (
                        <div className="mb-4">
                            <div className="text-xs font-semibold text-white/70 mb-2">
                                Quick One-Tap Starters:
                            </div>
                            <div className="grid grid-cols-1 gap-1.5">
                                {QUICK_STARTERS.map((starter, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => handlePickStarter(starter)}
                                        className="text-left text-xs text-white/80 p-2.5 rounded-xl bg-white/[0.03] hover:bg-purple-500/10 hover:border-purple-500/30 border border-white/5 transition-all flex items-center justify-between"
                                    >
                                        <span>{starter}</span>
                                        <CornerDownLeft className="h-3.5 w-3.5 text-purple-400 shrink-0 ml-2" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tone Selectors */}
                    <div className="mb-4">
                        <div className="text-xs font-semibold text-white/70 mb-2 flex items-center gap-1.5">
                            <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                            Select Personality / Tone:
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {TONES.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    disabled={!currentDraft?.trim() || isGenerating}
                                    onClick={() => handleGenerateTone(t.id)}
                                    className={`p-2.5 rounded-xl text-left border transition text-xs ${
                                        selectedTone === t.id
                                            ? "bg-purple-500/20 border-purple-500/50 text-purple-200"
                                            : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] text-white/70"
                                    } disabled:opacity-40`}
                                >
                                    <div className="font-bold">{t.label}</div>
                                    <div className="text-[10px] text-white/40">{t.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Translation Quick Buttons */}
                    <div className="mb-4">
                        <div className="text-xs font-semibold text-white/70 mb-2 flex items-center gap-1.5">
                            <Languages className="w-3.5 h-3.5 text-cyan-400" />
                            Instant Translation:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang}
                                    type="button"
                                    disabled={!currentDraft?.trim() || isGenerating}
                                    onClick={() => handleTranslate(lang)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                                        targetLang === lang && previewResult
                                            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200"
                                            : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] text-white/70"
                                    } disabled:opacity-40`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Output Preview */}
                    {previewResult && (
                        <div className="mb-4 p-3 rounded-xl bg-purple-950/30 border border-purple-500/30">
                            <div className="text-[10px] uppercase font-bold text-purple-300 tracking-wider mb-1 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Result Preview:
                            </div>
                            <div className="text-sm text-white/95 leading-relaxed font-sans">
                                {previewResult}
                            </div>
                            <div className="mt-3 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={handleApply}
                                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all shadow-lg flex items-center gap-1.5 active:scale-95"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    Insert Into Chat Input
                                </button>
                            </div>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="flex items-center justify-center py-4 text-purple-300 gap-2 text-xs">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                            <span>VORTEX AI generating response...</span>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}

AIAssistModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    currentDraft: PropTypes.string,
    onApplyDraft: PropTypes.func.isRequired,
};

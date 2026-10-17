import React, { useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Languages, Wand2, Check } from "lucide-react";
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

export default function AIAssistModal({ isOpen, onClose, currentDraft, onApplyDraft }) {
    const [selectedTone, setSelectedTone] = useState("witty");
    const [targetLang, setTargetLang] = useState("Spanish");
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewResult, setPreviewResult] = useState("");

    if (!isOpen) return null;

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

    if (!isOpen || typeof document === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            <div 
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-lg rounded-2xl border border-purple-500/20 bg-[#0d1017] p-6 shadow-2xl text-white select-none"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-white">VORTEX AI Message Assistant</h3>
                            <p className="text-xs text-white/50">Instant tone rephrasing & multilingual translation</p>
                        </div>
                    </div>

                    {/* Original Draft Preview */}
                    <div className="mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                        <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1">
                            Your Current Draft:
                        </div>
                        <div className="text-xs text-white/90 italic">
                            {currentDraft ? `"${currentDraft}"` : "(Type something in chat first to polish tone)"}
                        </div>
                    </div>

                    {/* Tone Selectors */}
                    <div className="mb-4">
                        <div className="text-xs font-semibold text-white/70 mb-2 flex items-center gap-1.5">
                            <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                            Select Personality / Tone:
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {TONES.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    disabled={!currentDraft?.trim() || isGenerating}
                                    onClick={() => handleGenerateTone(t.id)}
                                    className={`p-2 rounded-xl text-left border transition text-xs ${
                                        selectedTone === t.id
                                            ? "bg-purple-500/20 border-purple-500/50 text-purple-200"
                                            : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] text-white/70"
                                    } disabled:opacity-40`}
                                >
                                    <div className="font-bold">{t.label}</div>
                                    <div className="text-[9px] text-white/40">{t.desc}</div>
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
                                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white/70 hover:text-white transition disabled:opacity-40"
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generated Result */}
                    {isGenerating && (
                        <div className="p-3 text-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 font-medium animate-pulse">
                            Synthesizing with VORTEX neural engine...
                        </div>
                    )}

                    {previewResult && !isGenerating && (
                        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2">
                            <div className="text-[10px] font-bold uppercase text-purple-300 tracking-wider">
                                AI Suggestion:
                            </div>
                            <div className="text-sm font-medium text-white leading-relaxed">
                                {previewResult}
                            </div>
                            <button
                                type="button"
                                onClick={handleApply}
                                className="w-full py-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20"
                            >
                                <Check className="w-3.5 h-3.5 stroke-[3]" /> Replace Message Input
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}

AIAssistModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    currentDraft: PropTypes.string,
    onApplyDraft: PropTypes.func,
};

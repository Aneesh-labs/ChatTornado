import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Brain, X, RefreshCw, CheckCircle2, MessageSquare, Zap } from "lucide-react";
import API from "../../../Services/API";
import { soundEngine } from "../../../utils/soundEffects";

export default function PersonalizeModal({ isOpen, onClose }) {
    const [persona, setPersona] = useState(null);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [messageCount, setMessageCount] = useState(0);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");

    const token = sessionStorage.getItem("token");

    const fetchPersona = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await API.get("/api/ai/persona", { params: { token } });
            if (res.data?.status === "success" && res.data.has_persona) {
                setPersona(res.data.persona);
            }
        } catch (err) {
            console.warn("Failed to load AI persona:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchPersona();
            setSuccessMessage("");
        }
    }, [isOpen]);

    const handlePersonalize = async () => {
        if (!token || analyzing) return;
        setAnalyzing(true);
        setSuccessMessage("");
        soundEngine.play("coin");
        try {
            const res = await API.post("/api/ai/personalize", {}, { params: { token } });
            if (res.data?.status === "success" && res.data.data?.persona) {
                setPersona(res.data.data.persona);
                setMessageCount(res.data.data.message_count || 30);
                setLastUpdated(res.data.data.updated_at);
                setSuccessMessage("Personalization complete! VORTEX-9 now understands your communication style.");
                soundEngine.play("win");
            }
        } catch (err) {
            console.error("Personalization failed:", err);
            soundEngine.play("boing");
        } finally {
            setAnalyzing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.92, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.92, y: 15 }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-b from-[#130f24] via-[#0d0a18] to-[#07050d] p-6 shadow-2xl"
                    style={{ boxShadow: "0 0 60px rgba(139,92,246,0.25)" }}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-amber-400 p-[1px] shadow-lg">
                                <div className="flex h-full w-full items-center justify-center rounded-2xl bg-[#0e0a1f]">
                                    <Brain className="h-6 w-6 text-violet-300" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white flex items-center gap-1.5">
                                    VORTEX-9 Cognitive Memory <Sparkles className="h-4 w-4 text-amber-300" />
                                </h3>
                                <p className="text-[11px] text-white/50">Personalize AI responses to match your unique communication style</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* How It Works Card */}
                    <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/70 flex items-start gap-2.5">
                        <Zap className="h-4 w-4 text-amber-300 flex-shrink-0 mt-0.5" />
                        <div className="text-[11px] leading-relaxed">
                            <strong className="text-white">How it works:</strong> The cognitive profiler scans your last <strong>30 messages across all chats</strong> to understand your tone, humor, vocabulary, and favorite topics. VORTEX-9 then naturally matches your vibe in every response.
                        </div>
                    </div>

                    {/* Persona Content Area */}
                    <div className="mb-5 min-h-[140px] max-h-[260px] overflow-y-auto rounded-2xl border border-white/10 bg-black/40 p-4 font-sans text-xs">
                        {analyzing ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                                <RefreshCw className="h-8 w-8 text-violet-400 animate-spin" />
                                <div className="text-sm font-bold text-white">Analyzing last 30 messages across all chats...</div>
                                <div className="text-[11px] text-white/50 max-w-xs">Extracting tone patterns, humor style, and conversational preferences...</div>
                            </div>
                        ) : loading ? (
                            <div className="flex items-center justify-center py-10 text-white/50">
                                <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading persona profile...
                            </div>
                        ) : persona ? (
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Active Personalization Profile
                                    </span>
                                    {lastUpdated && (
                                        <span className="text-[10px] text-white/40">
                                            Updated {new Date(lastUpdated).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                <div className="text-white/90 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                                    {persona}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center text-white/50 gap-2">
                                <MessageSquare className="h-8 w-8 text-white/20" />
                                <div>No personalized profile generated yet.</div>
                                <div className="text-[11px] text-white/40">Click the button below to analyze your messaging style!</div>
                            </div>
                        )}
                    </div>

                    {/* Success notification */}
                    {successMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 flex items-center gap-2"
                        >
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                            <span>{successMessage}</span>
                        </motion.div>
                    )}

                    {/* Action Button */}
                    <div className="flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-white/60 hover:text-white transition-colors"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            disabled={analyzing}
                            onClick={handlePersonalize}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                        >
                            {analyzing ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Analyzing Messages...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 text-amber-300" />
                                    {persona ? "Re-analyze & Update (30 Messages)" : "Personalize From My Messages"}
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

PersonalizeModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};

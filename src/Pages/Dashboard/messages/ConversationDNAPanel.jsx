import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dna,
    RefreshCw,
    X,
    HelpCircle,
    CheckCircle2,
    MessageSquare,
    TrendingUp,
    Sparkles,
    Hash,
    ChevronRight,
    AlertCircle,
    Activity
} from "lucide-react";
import API from "../../../Services/API";
import { useTheme } from "./constants";

const ConversationDNAPanel = ({
    isOpen = false,
    onClose,
    user = null,
    activeBranch = null,
    onSelectCategory,
    onJumpToMessage
}) => {
    const theme = useTheme();
    const [dnaData, setDnaData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedTab, setSelectedTab] = useState("overview"); // 'overview' | 'questions' | 'decisions' | 'timeline'

    const fetchDNA = useCallback(async (refresh = false) => {
        if (!user?.id) return;
        setLoading(true);
        setError(null);
        try {
            const token = sessionStorage.getItem("token");
            const target = user.is_group ? `group_${user.id}` : `dm_${user.id}`;
            const endpoint = refresh ? `/api/dna/refresh/${target}` : `/api/dna/${target}`;
            const params = { token };
            if (activeBranch?.id) {
                params.branch_id = activeBranch.id;
            }

            const res = refresh
                ? await API.post(endpoint, {}, { params })
                : await API.get(endpoint, { params });

            setDnaData(res.data?.data || res.data);
        } catch (err) {
            console.error("Failed to load Conversation DNA:", err);
            setError(err.response?.data?.detail || "Failed to analyze conversation DNA.");
        } finally {
            setLoading(false);
        }
    }, [user, activeBranch]);

    useEffect(() => {
        if (isOpen && user?.id) {
            fetchDNA(false);
        }
    }, [isOpen, user?.id, activeBranch?.id, fetchDNA]);

    if (!isOpen) return null;

    const activityColor = {
        HIGH: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
        MODERATE: "text-sky-400 border-sky-500/30 bg-sky-500/10",
        LOW: "text-amber-400 border-amber-500/30 bg-amber-500/10",
        QUIET: "text-slate-400 border-slate-500/30 bg-slate-500/10"
    }[dnaData?.activity_intensity || "MODERATE"];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ x: "100%", opacity: 0.5 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 26, stiffness: 280 }}
                    className="relative w-full max-w-md h-full bg-[#0d1117] border-l border-white/10 shadow-2xl flex flex-col overflow-hidden text-slate-100"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#161b22]/80 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400">
                                <Dna className="w-5 h-5 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold tracking-wide text-white flex items-center gap-2">
                                    Conversation DNA
                                    {activeBranch && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                                            {activeBranch.name}
                                        </span>
                                    )}
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Dynamic structural & state telemetry
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => fetchDNA(true)}
                                disabled={loading}
                                title="Re-analyze Conversation DNA"
                                className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex border-b border-white/10 bg-[#161b22]/40 px-3 pt-2 gap-1 text-xs">
                        {[
                            { id: "overview", label: "Overview", icon: Activity },
                            { id: "questions", label: `Questions (${dnaData?.unresolved_questions?.length || 0})`, icon: HelpCircle },
                            { id: "decisions", label: `Decisions (${dnaData?.decisions_emerged?.length || 0})`, icon: CheckCircle2 },
                            { id: "timeline", label: "Evolution", icon: TrendingUp }
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = selectedTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setSelectedTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-all border-b-2 font-medium ${
                                        isActive
                                            ? "border-cyan-400 text-cyan-300 bg-white/5"
                                            : "border-transparent text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Body Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                        {loading && !dnaData && (
                            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
                                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                                <p className="text-sm font-medium">Extracting structural telemetry...</p>
                            </div>
                        )}

                        {error && (
                            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-semibold">Analysis Failed</p>
                                    <p className="mt-0.5 text-slate-300">{error}</p>
                                </div>
                            </div>
                        )}

                        {dnaData && (
                            <>
                                {/* TAB: OVERVIEW */}
                                {selectedTab === "overview" && (
                                    <div className="space-y-4">
                                        {/* State & Intensity Bar */}
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div className="p-3 rounded-xl bg-[#161b22] border border-white/10 flex flex-col justify-between">
                                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Conversation State</span>
                                                <div className="mt-1 text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                                                    {dnaData.conversation_state}
                                                </div>
                                            </div>

                                            <div className="p-3 rounded-xl bg-[#161b22] border border-white/10 flex flex-col justify-between">
                                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Activity Intensity</span>
                                                <div className={`mt-1 text-xs font-semibold px-2 py-0.5 rounded-md border w-fit ${activityColor}`}>
                                                    {dnaData.activity_intensity}
                                                </div>
                                            </div>
                                        </div>

                                        {/* DNA Metrics Distribution */}
                                        <div className="p-4 rounded-xl bg-[#161b22] border border-white/10 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Dna className="w-3.5 h-3.5 text-indigo-400" />
                                                    Structural Composition
                                                </h4>
                                                <span className="text-[11px] text-slate-400">{dnaData.total_messages} msgs analyzed</span>
                                            </div>

                                            {/* Stacked multi-color DNA helix progress bar */}
                                            <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
                                                <div
                                                    style={{ width: `${dnaData.topics_pct}%` }}
                                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                                                    title={`Topics: ${dnaData.topics_pct}%`}
                                                />
                                                <div
                                                    style={{ width: `${dnaData.questions_pct}%` }}
                                                    className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
                                                    title={`Questions: ${dnaData.questions_pct}%`}
                                                />
                                                <div
                                                    style={{ width: `${dnaData.discussion_pct}%` }}
                                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-500"
                                                    title={`Discussion: ${dnaData.discussion_pct}%`}
                                                />
                                                <div
                                                    style={{ width: `${dnaData.decisions_pct}%` }}
                                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                                                    title={`Decisions: ${dnaData.decisions_pct}%`}
                                                />
                                            </div>

                                            {/* DNA Metric Rows */}
                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                                {[
                                                    { label: "Topics", pct: dnaData.topics_pct, color: "text-cyan-400", dot: "bg-cyan-400", category: "topics" },
                                                    { label: "Questions", pct: dnaData.questions_pct, color: "text-amber-400", dot: "bg-amber-400", category: "questions" },
                                                    { label: "Discussion", pct: dnaData.discussion_pct, color: "text-indigo-400", dot: "bg-indigo-400", category: "discussion" },
                                                    { label: "Decisions", pct: dnaData.decisions_pct, color: "text-emerald-400", dot: "bg-emerald-400", category: "decisions" }
                                                ].map((metric) => (
                                                    <button
                                                        key={metric.label}
                                                        onClick={() => onSelectCategory?.(metric.category)}
                                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left flex items-center justify-between group cursor-pointer"
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`w-2 h-2 rounded-full ${metric.dot}`} />
                                                            <span className="text-xs text-slate-300 group-hover:text-white font-medium">{metric.label}</span>
                                                        </div>
                                                        <span className={`text-xs font-bold ${metric.color}`}>{metric.pct}%</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Dominant Topics */}
                                        <div className="p-4 rounded-xl bg-[#161b22] border border-white/10 space-y-2.5">
                                            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                                <Hash className="w-3.5 h-3.5 text-cyan-400" />
                                                Dominant Subjects
                                            </h4>
                                            <div className="flex flex-wrap gap-1.5">
                                                {(dnaData.dominant_topics || []).length > 0 ? (
                                                    dnaData.dominant_topics.map((topic, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-xs px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-medium hover:bg-cyan-500/20 transition-colors"
                                                        >
                                                            #{topic}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-500 italic">No recurring topics isolated yet</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Explainability & Privacy Notice */}
                                        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                                            <div className="font-semibold text-slate-300 flex items-center gap-1">
                                                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                                                Explainable Telemetry
                                            </div>
                                            <p>
                                                Conversation DNA uses transparent lexical and structural heuristics. No psychological profiling, sentiment grading, or covert surveillance models are used.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: QUESTIONS */}
                                {selectedTab === "questions" && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                                            <span>Unresolved Inquiries</span>
                                            <span>{dnaData.unresolved_questions?.length || 0} active</span>
                                        </div>

                                        {(dnaData.unresolved_questions || []).length > 0 ? (
                                            <div className="space-y-2">
                                                {dnaData.unresolved_questions.map((q, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => q.message_id && onJumpToMessage?.(q.message_id)}
                                                        className="p-3 rounded-xl bg-[#161b22] border border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-xs group cursor-pointer"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex items-start gap-2">
                                                                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                                                <span className="text-slate-200 group-hover:text-amber-200 transition-colors leading-relaxed">
                                                                    "{q.text}"
                                                                </span>
                                                            </div>
                                                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 shrink-0 mt-0.5" />
                                                        </div>
                                                        <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                                                            <span>By {q.author || "Participant"}</span>
                                                            <span className="text-amber-400/80">Click to jump</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-8 text-center text-slate-500 text-xs">
                                                No unresolved questions found.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB: DECISIONS */}
                                {selectedTab === "decisions" && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                                            <span>Consensus & Outcomes</span>
                                            <span>{dnaData.decisions_emerged?.length || 0} reached</span>
                                        </div>

                                        {(dnaData.decisions_emerged || []).length > 0 ? (
                                            <div className="space-y-2">
                                                {dnaData.decisions_emerged.map((d, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => d.message_id && onJumpToMessage?.(d.message_id)}
                                                        className="p-3 rounded-xl bg-[#161b22] border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-xs group cursor-pointer"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex items-start gap-2">
                                                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                                                <span className="text-slate-200 group-hover:text-emerald-200 transition-colors leading-relaxed">
                                                                    "{d.text}"
                                                                </span>
                                                            </div>
                                                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0 mt-0.5" />
                                                        </div>
                                                        <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                                                            <span>By {d.author || "Participant"}</span>
                                                            <span className="text-emerald-400/80">Click to jump</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-8 text-center text-slate-500 text-xs">
                                                No explicit decisions recorded yet.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB: TIMELINE */}
                                {selectedTab === "timeline" && (
                                    <div className="space-y-3">
                                        <span className="text-xs text-slate-400 px-1">Progression Milestones</span>
                                        {(dnaData.conversation_timeline || []).length > 0 ? (
                                            <div className="relative pl-4 border-l border-white/10 space-y-4 my-2">
                                                {dnaData.conversation_timeline.map((item, idx) => (
                                                    <div key={idx} className="relative group">
                                                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-[#0d1117]" />
                                                        <div className="p-3 rounded-xl bg-[#161b22] border border-white/5 space-y-1">
                                                            <div className="flex items-center justify-between text-[11px]">
                                                                <span className="font-semibold text-cyan-300">{item.phase}</span>
                                                                <span className="text-slate-400">{item.messages_range}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-300">{item.summary}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-8 text-center text-slate-500 text-xs">
                                                Timeline evolves with conversational depth.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

ConversationDNAPanel.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    user: PropTypes.object,
    activeBranch: PropTypes.object,
    onSelectCategory: PropTypes.func,
    onJumpToMessage: PropTypes.func
};

export default ConversationDNAPanel;

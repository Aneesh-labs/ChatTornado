import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock,
    Calendar,
    Sparkles,
    Send,
    X,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Sliders,
    Zap,
    Users,
    MessageSquare,
    ChevronRight,
    HelpCircle,
    Layers
} from "lucide-react";
import API from "../../../Services/API";
import { useTheme } from "./constants";

const FutureMessagesModal = ({
    isOpen = false,
    onClose,
    user = null,
    activeBranch = null,
    initialMessage = "",
    onMessageScheduled
}) => {
    const theme = useTheme();
    const [tab, setTab] = useState("schedule"); // 'schedule' | 'pending'
    const [messageText, setMessageText] = useState(initialMessage || "");
    const [triggerType, setTriggerType] = useState("time"); // 'time' | 'condition'

    // Time Trigger State
    const [customDateTime, setCustomDateTime] = useState("");

    // Condition Trigger State
    const [conditionType, setConditionType] = useState("dna_state"); // 'dna_state' | 'dna_decision_count' | 'message_count' | 'min_members'
    const [dnaStateVal, setDnaStateVal] = useState("DECISION PHASE");
    const [decisionCountVal, setDecisionCountVal] = useState(2);
    const [messageCountVal, setMessageCountVal] = useState(20);
    const [minMembersVal, setMinMembersVal] = useState(5);

    // Pending Messages State
    const [pendingList, setPendingList] = useState([]);
    const [loadingPending, setLoadingPending] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    useEffect(() => {
        if (initialMessage) {
            setMessageText(initialMessage);
        }
    }, [initialMessage]);

    const fetchPending = useCallback(async () => {
        if (!user?.id) return;
        setLoadingPending(true);
        try {
            const token = sessionStorage.getItem("token");
            const res = await API.get("/api/future-messages", {
                params: {
                    token,
                    status: "scheduled,waiting",
                    limit: 30
                }
            });
            // Filter to current chat target if relevant
            const allItems = res.data?.items || [];
            setPendingList(allItems);
        } catch (err) {
            console.error("Failed to load pending future messages:", err);
        } finally {
            setLoadingPending(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (isOpen && user?.id) {
            fetchPending();
            setError(null);
            setSuccessMsg(null);
        }
    }, [isOpen, user?.id, fetchPending]);

    const handleQuickTimePreset = (minutesToAdd) => {
        const d = new Date(Date.now() + minutesToAdd * 60 * 1000);
        // Format for input[type="datetime-local"] in local time
        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setCustomDateTime(localIso);
    };

    const handleCreateFutureMessage = async (e) => {
        e?.preventDefault();
        if (!messageText.trim()) return;
        setError(null);
        setSuccessMsg(null);
        setSubmitting(true);

        try {
            const token = sessionStorage.getItem("token");
            const payload = {
                message: messageText.trim(),
                trigger_type: triggerType,
                receiver_id: user.is_group ? null : user.id,
                group_id: user.is_group ? user.id : null,
                branch_id: activeBranch?.id || null
            };

            if (triggerType === "time") {
                if (!customDateTime) {
                    throw new Error("Please pick a scheduled delivery time");
                }
                payload.scheduled_at = new Date(customDateTime).toISOString();
            } else {
                let cfg = {};
                if (conditionType === "dna_state") {
                    cfg = { type: "dna_state", state: dnaStateVal };
                } else if (conditionType === "dna_decision_count") {
                    cfg = { type: "dna_decision_count", threshold: Number(decisionCountVal) };
                } else if (conditionType === "message_count") {
                    cfg = { type: "message_count", threshold: Number(messageCountVal) };
                } else if (conditionType === "min_members") {
                    cfg = { type: "min_members", count: Number(minMembersVal) };
                }
                payload.condition_config = cfg;
            }

            const res = await API.post("/api/future-messages", payload, { params: { token } });
            setSuccessMsg("Future message queued with server-side scheduler!");
            setMessageText("");
            setCustomDateTime("");
            await fetchPending();
            onMessageScheduled?.(res.data);
            setTimeout(() => {
                setTab("pending");
                setSuccessMsg(null);
            }, 1200);
        } catch (err) {
            console.error("Failed to schedule future message:", err);
            setError(err.response?.data?.detail || err.message || "Failed to schedule message.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelFutureMessage = async (msgId) => {
        if (!confirm("Are you sure you want to cancel this scheduled message?")) return;
        try {
            const token = sessionStorage.getItem("token");
            await API.delete(`/api/future-messages/${msgId}`, { params: { token } });
            await fetchPending();
        } catch (err) {
            console.error("Failed to cancel future message:", err);
            alert("Error cancelling message: " + (err.response?.data?.detail || err.message));
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                <motion.div
                    initial={{ scale: 0.94, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0, y: 10 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-xl bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 max-h-[88vh]"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#161b22]/90 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                                    Future Messages Engine
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Timezone-safe delivery & autonomous state condition triggers
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex border-b border-white/10 bg-[#161b22]/40 px-4 pt-2 gap-2 text-xs">
                        <button
                            onClick={() => setTab("schedule")}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-all border-b-2 font-medium ${
                                tab === "schedule"
                                    ? "border-amber-400 text-amber-300 bg-white/5"
                                    : "border-transparent text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Schedule Trigger</span>
                        </button>

                        <button
                            onClick={() => setTab("pending")}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-all border-b-2 font-medium ${
                                tab === "pending"
                                    ? "border-amber-400 text-amber-300 bg-white/5"
                                    : "border-transparent text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending Queue ({pendingList.length})</span>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        {/* TAB: SCHEDULE */}
                        {tab === "schedule" && (
                            <form onSubmit={handleCreateFutureMessage} className="space-y-4">
                                {/* Target Reality Branch Indicator */}
                                {activeBranch && (
                                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
                                        <Layers className="w-4 h-4 shrink-0" />
                                        <span>Targeting Reality Branch: <strong>{activeBranch.name}</strong></span>
                                    </div>
                                )}

                                {/* Message Content Input */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                        Payload Content
                                    </label>
                                    <textarea
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        placeholder="Write the message that will be transmitted in the future..."
                                        rows={3}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none custom-scrollbar"
                                        required
                                    />
                                </div>

                                {/* Trigger Mode Toggle */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                        Trigger Mechanism
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setTriggerType("time")}
                                            className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                                                triggerType === "time"
                                                    ? "bg-amber-500/15 border-amber-500/50 text-amber-200 ring-1 ring-amber-500/30"
                                                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                                            }`}
                                        >
                                            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                                            <div>
                                                <div className="text-xs font-bold text-white">Time Trigger</div>
                                                <div className="text-[10px] text-slate-400">Fixed timestamp delivery</div>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setTriggerType("condition")}
                                            className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                                                triggerType === "condition"
                                                    ? "bg-amber-500/15 border-amber-500/50 text-amber-200 ring-1 ring-amber-500/30"
                                                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                                            }`}
                                        >
                                            <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
                                            <div>
                                                <div className="text-xs font-bold text-white">State Condition</div>
                                                <div className="text-[10px] text-slate-400">Triggers when state is met</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Trigger Details: TIME */}
                                {triggerType === "time" && (
                                    <div className="p-4 rounded-xl bg-[#161b22] border border-white/10 space-y-3">
                                        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                                            Delivery Timestamp (Timezone Safe UTC)
                                        </span>

                                        {/* Quick Presets */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                { label: "+15 Mins", mins: 15 },
                                                { label: "+1 Hour", mins: 60 },
                                                { label: "Tomorrow Morning", mins: 1440 },
                                                { label: "+3 Days", mins: 4320 },
                                                { label: "New Year 2027", mins: 525600 }
                                            ].map((preset) => (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    onClick={() => handleQuickTimePreset(preset.mins)}
                                                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 font-medium transition-colors"
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>

                                        <input
                                            type="datetime-local"
                                            value={customDateTime}
                                            onChange={(e) => setCustomDateTime(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                                            required
                                        />
                                    </div>
                                )}

                                {/* Trigger Details: CONDITION */}
                                {triggerType === "condition" && (
                                    <div className="p-4 rounded-xl bg-[#161b22] border border-white/10 space-y-3">
                                        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                            <Sliders className="w-3.5 h-3.5 text-amber-400" />
                                            Autonomous State Condition
                                        </span>

                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-medium text-slate-400">Condition Rule</label>
                                            <select
                                                value={conditionType}
                                                onChange={(e) => setConditionType(e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                                            >
                                                <option value="dna_state">Conversation DNA Reaches Specific State</option>
                                                <option value="dna_decision_count">Conversation DNA Records N Decisions</option>
                                                <option value="message_count">Conversation Total Messages Reach Threshold</option>
                                                {user?.is_group && (
                                                    <option value="min_members">Group Reaches Minimum Member Count</option>
                                                )}
                                            </select>
                                        </div>

                                        {conditionType === "dna_state" && (
                                            <div>
                                                <label className="block text-[11px] font-medium text-slate-400 mb-1">Target DNA State</label>
                                                <select
                                                    value={dnaStateVal}
                                                    onChange={(e) => setDnaStateVal(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                                                >
                                                    <option value="DECISION PHASE">DECISION PHASE</option>
                                                    <option value="ACTIVE DISCUSSION">ACTIVE DISCUSSION</option>
                                                    <option value="QUESTION & ANSWER">QUESTION & ANSWER</option>
                                                    <option value="BRAINSTORMING">BRAINSTORMING</option>
                                                </select>
                                            </div>
                                        )}

                                        {conditionType === "dna_decision_count" && (
                                            <div>
                                                <label className="block text-[11px] font-medium text-slate-400 mb-1">Required Decision Count</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="50"
                                                    value={decisionCountVal}
                                                    onChange={(e) => setDecisionCountVal(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white"
                                                />
                                            </div>
                                        )}

                                        {conditionType === "message_count" && (
                                            <div>
                                                <label className="block text-[11px] font-medium text-slate-400 mb-1">Message Count Threshold</label>
                                                <input
                                                    type="number"
                                                    min="5"
                                                    max="1000"
                                                    value={messageCountVal}
                                                    onChange={(e) => setMessageCountVal(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white"
                                                />
                                            </div>
                                        )}

                                        {conditionType === "min_members" && (
                                            <div>
                                                <label className="block text-[11px] font-medium text-slate-400 mb-1">Minimum Group Members</label>
                                                <input
                                                    type="number"
                                                    min="2"
                                                    max="500"
                                                    value={minMembersVal}
                                                    onChange={(e) => setMinMembersVal(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || !messageText.trim()}
                                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg disabled:opacity-50"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>{submitting ? "Engaging Scheduler..." : "Schedule Transmission"}</span>
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* TAB: PENDING */}
                        {tab === "pending" && (
                            <div className="space-y-3">
                                {loadingPending ? (
                                    <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                                        <Clock className="w-4 h-4 animate-spin text-amber-400" />
                                        Loading pending scheduler queue...
                                    </div>
                                ) : pendingList.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {pendingList.map((item) => (
                                            <div
                                                key={item.id}
                                                className="p-3.5 rounded-xl bg-[#161b22] border border-white/10 hover:border-white/20 transition-all text-xs space-y-2 group"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                                item.status === "scheduled"
                                                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                                                    : item.status === "waiting"
                                                                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                                                    : "bg-slate-700 text-slate-300"
                                                            }`}>
                                                                {item.status}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                {item.trigger_type === "time" ? "⏰ Time Trigger" : "⚡ State Trigger"}
                                                            </span>
                                                        </div>
                                                        <p className="text-slate-200 font-medium">"{item.message}"</p>
                                                    </div>

                                                    <button
                                                        onClick={() => handleCancelFutureMessage(item.id)}
                                                        title="Cancel and delete pending future message"
                                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                                                    {item.trigger_type === "time" ? (
                                                        <span>Due: {new Date(item.scheduled_at).toLocaleString()}</span>
                                                    ) : (
                                                        <span>Cond: {JSON.stringify(item.condition_config)}</span>
                                                    )}
                                                    <span>Created {new Date(item.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-slate-500 text-xs">
                                        No pending future messages found.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

FutureMessagesModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    user: PropTypes.object,
    activeBranch: PropTypes.object,
    initialMessage: PropTypes.string,
    onMessageScheduled: PropTypes.func
};

export default FutureMessagesModal;

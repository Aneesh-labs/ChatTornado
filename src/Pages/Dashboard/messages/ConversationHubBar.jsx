import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
    Receipt,
    CheckSquare,
    Clock,
    Sparkles,
    Plus,
    Trash2,
    Check,
    ChevronDown,
    ChevronUp,
    Scale,
    FileText,
    TrendingUp
} from "lucide-react";
import {
    getHubData,
    addExpense,
    deleteExpense,
    clearExpenses,
    calculateBalances,
    addTodo,
    toggleTodo,
    deleteTodo,
    setCountdown,
    clearCountdown
} from "../../../Services/hubService";
import { settleDebate, summarizeChatPlan } from "../../../Services/aiAssistantService";
import { soundEngine } from "../../../utils/soundEffects";

export default function ConversationHubBar({
    conversationId,
    partnerName = "Friend",
    myUserId,
    messages = [],
    onSendMessage
}) {
    const [hubData, setHubData] = useState(() => getHubData(conversationId));
    const [activeTab, setActiveTab] = useState(null); // null = collapsed, "expenses", "todos", "countdown", "ai"

    // Inputs
    const [expenseTitle, setExpenseTitle] = useState("");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expensePayer, setExpensePayer] = useState("You");

    const [todoText, setTodoText] = useState("");

    const [countdownTitle, setCountdownTitle] = useState("");
    const [countdownDate, setCountdownDate] = useState("");

    const [isAiLoading, setIsAiLoading] = useState(false);

    // Sync state
    useEffect(() => {
        setHubData(getHubData(conversationId));
        const handleUpdate = (e) => {
            if (e.detail?.conversationId === conversationId) {
                setHubData(e.detail.data);
            }
        };
        window.addEventListener("vortex_hub_updated", handleUpdate);
        return () => window.removeEventListener("vortex_hub_updated", handleUpdate);
    }, [conversationId]);

    // Live countdown ticker
    const [timeLeft, setTimeLeft] = useState("");
    useEffect(() => {
        if (!hubData?.countdown?.targetDate) {
            setTimeLeft("");
            return;
        }

        const updateTicker = () => {
            const diff = new Date(hubData.countdown.targetDate) - new Date();
            if (diff <= 0) {
                setTimeLeft("Event Started! 🎉");
                return;
            }
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const mins = Math.floor((diff / 1000 / 60) % 60);
            const secs = Math.floor((diff / 1000) % 60);

            if (days > 0) {
                setTimeLeft(`${days}d ${hours}h ${mins}m`);
            } else {
                setTimeLeft(`${hours}h ${mins}m ${secs}s`);
            }
        };

        updateTicker();
        const timer = setInterval(updateTicker, 1000);
        return () => clearInterval(timer);
    }, [hubData?.countdown?.targetDate]);

    // Computed
    const balances = useMemo(() => {
        return calculateBalances(hubData.expenses, "You", partnerName);
    }, [hubData.expenses, partnerName]);

    const todoProgress = useMemo(() => {
        const total = hubData.todos.length;
        const done = hubData.todos.filter((t) => t.done).length;
        return { total, done };
    }, [hubData.todos]);

    // Action Handlers
    const handleAddExpense = (e) => {
        e.preventDefault();
        if (!expenseTitle.trim() || !expenseAmount || Number(expenseAmount) <= 0) return;
        const updated = addExpense(conversationId, {
            title: expenseTitle,
            amount: Number(expenseAmount),
            paidBy: expensePayer,
        });
        setHubData(updated);
        setExpenseTitle("");
        setExpenseAmount("");
        soundEngine?.play?.("pop");

        // Optional post to chat
        if (onSendMessage) {
            onSendMessage(`🧾 **Shared Expense Added:** ${expenseTitle} (₹${expenseAmount} paid by ${expensePayer})`);
        }
    };

    const handleAddTodo = (e) => {
        e.preventDefault();
        if (!todoText.trim()) return;
        const updated = addTodo(conversationId, todoText, "You");
        setHubData(updated);
        setTodoText("");
        soundEngine?.play?.("pop");
    };

    const handleToggleTodo = (todoId) => {
        const updated = toggleTodo(conversationId, todoId, "You");
        setHubData(updated);
        soundEngine?.play?.("like");
    };

    const handleSetCountdown = (e) => {
        e.preventDefault();
        if (!countdownTitle.trim() || !countdownDate) return;
        const updated = setCountdown(conversationId, {
            title: countdownTitle,
            targetDate: countdownDate,
        });
        setHubData(updated);
        soundEngine?.play?.("pop");
        if (onSendMessage) {
            onSendMessage(`⏳ **Countdown Started:** ${countdownTitle} (Target: ${new Date(countdownDate).toLocaleString()})`);
        }
    };

    const handleSettleDebate = async () => {
        if (!onSendMessage || isAiLoading) return;
        setIsAiLoading(true);
        try {
            const verdict = await settleDebate(messages, partnerName, "You");
            onSendMessage(verdict);
            soundEngine?.play?.("send");
            setActiveTab(null);
        } catch (err) {
            console.error("Failed to settle debate", err);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSummarizePlan = async () => {
        if (!onSendMessage || isAiLoading) return;
        setIsAiLoading(true);
        try {
            const plan = await summarizeChatPlan(messages);
            onSendMessage(plan);
            soundEngine?.play?.("send");
            setActiveTab(null);
        } catch (err) {
            console.error("Failed to summarize plan", err);
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div className="relative z-20 w-full border-b border-white/[0.08] bg-black/40 backdrop-blur-xl select-none">
            {/* Top Hub Bar - 4 Action Pills */}
            <div className="flex items-center justify-between px-3 sm:px-6 py-2 gap-2 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {/* 1. Split Bill Pill */}
                    <button
                        type="button"
                        onClick={() => setActiveTab(activeTab === "expenses" ? null : "expenses")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition border ${
                            activeTab === "expenses"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20"
                                : "bg-white/[0.04] hover:bg-white/[0.08] text-white/70 border-white/[0.08]"
                        }`}
                        title="Split Bill & Expense Ledger"
                    >
                        <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">Split</span>
                        {balances.totalSpent > 0 ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                                ₹{balances.totalSpent}
                            </span>
                        ) : (
                            <span className="text-[10px] opacity-50">Bill</span>
                        )}
                    </button>

                    {/* 2. Shared Checklist Pill */}
                    <button
                        type="button"
                        onClick={() => setActiveTab(activeTab === "todos" ? null : "todos")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition border ${
                            activeTab === "todos"
                                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20"
                                : "bg-white/[0.04] hover:bg-white/[0.08] text-white/70 border-white/[0.08]"
                        }`}
                        title="Shared Co-op Checklist"
                    >
                        <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="hidden sm:inline">Tasks</span>
                        {todoProgress.total > 0 ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">
                                {todoProgress.done}/{todoProgress.total}
                            </span>
                        ) : (
                            <span className="text-[10px] opacity-50">List</span>
                        )}
                    </button>

                    {/* 3. Event Countdown Pill */}
                    <button
                        type="button"
                        onClick={() => setActiveTab(activeTab === "countdown" ? null : "countdown")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition border ${
                            activeTab === "countdown"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20"
                                : "bg-white/[0.04] hover:bg-white/[0.08] text-white/70 border-white/[0.08]"
                        }`}
                        title="Event Countdown Timer"
                    >
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">Timer</span>
                        {timeLeft ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold truncate max-w-[100px]">
                                {timeLeft}
                            </span>
                        ) : (
                            <span className="text-[10px] opacity-50">Set</span>
                        )}
                    </button>

                    {/* 4. AI Co-Pilot Pill */}
                    <button
                        type="button"
                        onClick={() => setActiveTab(activeTab === "ai" ? null : "ai")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition border ${
                            activeTab === "ai"
                                ? "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/20"
                                : "bg-white/[0.04] hover:bg-white/[0.08] text-purple-300/80 border-white/[0.08]"
                        }`}
                        title="Deep AI Conversation Co-Pilot"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>AI Co-Pilot</span>
                    </button>
                </div>

                {/* Collapse / Expand Toggle */}
                {activeTab && (
                    <button
                        type="button"
                        onClick={() => setActiveTab(null)}
                        className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition"
                    >
                        <ChevronUp className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Expanded Drawer Area */}
            <AnimatePresence>
                {activeTab && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden px-3 sm:px-6 pb-3 pt-1 border-t border-white/[0.04] bg-white/[0.02]"
                    >
                        {/* EXPENSES / SPLIT BILL */}
                        {activeTab === "expenses" && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                                        <span className="text-xs font-bold text-white/90">Shared Bill Ledger</span>
                                    </div>
                                    <div className="text-xs font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                        {balances.summaryText}
                                    </div>
                                </div>

                                <form onSubmit={handleAddExpense} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Expense description (e.g. Pizza, Taxi, Hotel)"
                                        value={expenseTitle}
                                        onChange={(e) => setExpenseTitle(e.target.value)}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-emerald-500/50"
                                    />
                                    <input
                                        type="number"
                                        placeholder="₹ Amount"
                                        value={expenseAmount}
                                        onChange={(e) => setExpenseAmount(e.target.value)}
                                        className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-emerald-500/50"
                                    />
                                    <select
                                        value={expensePayer}
                                        onChange={(e) => setExpensePayer(e.target.value)}
                                        className="bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                                    >
                                        <option value="You">You Paid</option>
                                        <option value={partnerName}>{partnerName} Paid</option>
                                    </select>
                                    <button
                                        type="submit"
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md shadow-emerald-600/20"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add
                                    </button>
                                </form>

                                {hubData.expenses.length > 0 && (
                                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                                        {hubData.expenses.map((exp) => (
                                            <div
                                                key={exp.id}
                                                className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs"
                                            >
                                                <span className="font-medium text-white/80 truncate max-w-[200px]">
                                                    {exp.title}
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-emerald-300 font-semibold">
                                                        ₹{exp.amount}
                                                    </span>
                                                    <span className="text-[10px] text-white/40">
                                                        by {exp.paidBy}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            const up = deleteExpense(conversationId, exp.id);
                                                            setHubData(up);
                                                        }}
                                                        className="text-white/30 hover:text-red-400 transition"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SHARED TO-DO CHECKLIST */}
                        {activeTab === "todos" && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white/90">Shared Checklist & To-Dos</span>
                                    <span className="text-xs text-cyan-300 font-mono">
                                        {todoProgress.done} of {todoProgress.total} completed
                                    </span>
                                </div>

                                <form onSubmit={handleAddTodo} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add a new shared task or bucket list item..."
                                        value={todoText}
                                        onChange={(e) => setTodoText(e.target.value)}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-cyan-500/50"
                                    />
                                    <button
                                        type="submit"
                                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md shadow-cyan-600/20"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Task
                                    </button>
                                </form>

                                {hubData.todos.length > 0 && (
                                    <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                                        {hubData.todos.map((t) => (
                                            <div
                                                key={t.id}
                                                onClick={() => handleToggleTodo(t.id)}
                                                className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg border transition cursor-pointer ${
                                                    t.done
                                                        ? "bg-white/[0.02] border-white/5 opacity-60 line-through"
                                                        : "bg-white/[0.04] border-white/10 text-white"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 text-xs">
                                                    <div
                                                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                                                            t.done
                                                                ? "bg-cyan-500 border-cyan-400 text-black"
                                                                : "border-white/30"
                                                        }`}
                                                    >
                                                        {t.done && <Check className="w-3 h-3 stroke-[3]" />}
                                                    </div>
                                                    <span>{t.text}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const up = deleteTodo(conversationId, t.id);
                                                        setHubData(up);
                                                    }}
                                                    className="text-white/30 hover:text-red-400 transition ml-2"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* COUNTDOWN TIMER */}
                        {activeTab === "countdown" && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white/90">Event Countdown</span>
                                    {hubData.countdown && (
                                        <button
                                            onClick={() => {
                                                const up = clearCountdown(conversationId);
                                                setHubData(up);
                                            }}
                                            className="text-xs text-red-400/80 hover:text-red-300 font-medium"
                                        >
                                            Reset Timer
                                        </button>
                                    )}
                                </div>

                                {hubData.countdown ? (
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-sm text-amber-200">
                                                {hubData.countdown.title}
                                            </h4>
                                            <p className="text-[11px] text-white/50">
                                                Target: {new Date(hubData.countdown.targetDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-base font-black font-mono text-amber-300 tracking-wider">
                                                {timeLeft || "Ticking..."}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSetCountdown} className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Event name (e.g. Trip to Goa, Hackathon)"
                                            value={countdownTitle}
                                            onChange={(e) => setCountdownTitle(e.target.value)}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-amber-500/50"
                                        />
                                        <input
                                            type="datetime-local"
                                            value={countdownDate}
                                            onChange={(e) => setCountdownDate(e.target.value)}
                                            className="bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                                        />
                                        <button
                                            type="submit"
                                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-amber-600/20"
                                        >
                                            Start Countdown
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}

                        {/* AI CO-PILOT ACTIONS */}
                        {activeTab === "ai" && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5" /> VORTEX AI Co-Pilot Tools
                                    </span>
                                    {isAiLoading && <span className="text-xs text-purple-400 animate-pulse">Analyzing conversation...</span>}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        disabled={isAiLoading}
                                        onClick={handleSettleDebate}
                                        className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-left transition disabled:opacity-50"
                                    >
                                        <Scale className="w-4 h-4 text-purple-400 shrink-0" />
                                        <div>
                                            <div className="text-xs font-bold text-white/90">⚖️ Settle The Debate</div>
                                            <div className="text-[10px] text-white/50 leading-tight">
                                                AI arbitrates who is right based on facts & crowns a winner
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isAiLoading}
                                        onClick={handleSummarizePlan}
                                        className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-left transition disabled:opacity-50"
                                    >
                                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                                        <div>
                                            <div className="text-xs font-bold text-white/90">📋 Summarize & Extract Plan</div>
                                            <div className="text-[10px] text-white/50 leading-tight">
                                                Extracts to-dos, dates & key agreements from recent chat
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

ConversationHubBar.propTypes = {
    conversationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    partnerName: PropTypes.string,
    myUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    messages: PropTypes.array,
    onSendMessage: PropTypes.func,
};

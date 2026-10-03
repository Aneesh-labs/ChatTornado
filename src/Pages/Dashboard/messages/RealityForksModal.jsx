import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
    GitBranch,
    GitFork,
    Plus,
    X,
    Check,
    Archive,
    Trash2,
    Calendar,
    User,
    ArrowRight,
    Sparkles,
    Layers,
    Clock,
    AlertCircle
} from "lucide-react";
import API from "../../../Services/API";
import { useTheme } from "./constants";

const RealityForksModal = ({
    isOpen = false,
    onClose,
    user = null,
    activeBranch = null,
    onSelectBranch,
    forkSourceMessage = null, // Set when opening modal via "Fork from this message"
    onForkCreated
}) => {
    const theme = useTheme();
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Create Fork State
    const [showCreateForm, setShowCreateForm] = useState(Boolean(forkSourceMessage));
    const [branchName, setBranchName] = useState("");
    const [branchDesc, setBranchDesc] = useState("");
    const [creating, setCreating] = useState(false);

    const fetchBranches = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        setError(null);
        try {
            const token = sessionStorage.getItem("token");
            const target = user.is_group ? `group_${user.id}` : `dm_${user.id}`;
            const res = await API.get(`/api/branches/${target}`, { params: { token } });
            setBranches(res.data?.branches || []);
        } catch (err) {
            console.error("Failed to load reality forks:", err);
            setError(err.response?.data?.detail || "Failed to load reality branches.");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (isOpen && user?.id) {
            fetchBranches();
            if (forkSourceMessage) {
                setShowCreateForm(true);
                setBranchName(`Fork-${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}-${Math.random().toString(36).slice(2, 6)}`);
            }
        }
    }, [isOpen, user?.id, forkSourceMessage, fetchBranches]);

    const handleCreateFork = async (e) => {
        e?.preventDefault();
        if (!branchName.trim()) return;
        setCreating(true);
        setError(null);
        try {
            const token = sessionStorage.getItem("token");
            const payload = {
                name: branchName.trim(),
                description: branchDesc.trim() || null,
                fork_message_id: forkSourceMessage?.id || null,
                parent_branch_id: activeBranch?.id || null,
                receiver_id: user.is_group ? null : user.id,
                group_id: user.is_group ? user.id : null
            };
            const res = await API.post("/api/branches/fork", payload, { params: { token } });
            const newBranch = res.data;
            setShowCreateForm(false);
            setBranchName("");
            setBranchDesc("");
            await fetchBranches();
            onForkCreated?.(newBranch);
            onSelectBranch?.(newBranch);
            onClose();
        } catch (err) {
            console.error("Failed to create reality fork:", err);
            setError(err.response?.data?.detail || "Failed to initialize fork.");
        } finally {
            setCreating(false);
        }
    };

    const handleArchiveBranch = async (branchId, e) => {
        e?.stopPropagation();
        if (!confirm("Are you sure you want to archive this reality branch?")) return;
        try {
            const token = sessionStorage.getItem("token");
            await API.delete(`/api/branches/${branchId}`, { params: { token } });
            if (activeBranch?.id === branchId) {
                onSelectBranch?.(null); // Switch to main
            }
            await fetchBranches();
        } catch (err) {
            console.error("Failed to archive branch:", err);
            alert("Failed to archive branch: " + (err.response?.data?.detail || err.message));
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
                    className="relative w-full max-w-2xl bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 max-h-[85vh]"
                >
                    {/* Header */}
                    <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#161b22]/90 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-400">
                                <GitFork className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                                    Reality Forks & Timeline Branches
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Branch conversations non-destructively with shared ancestry
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {!showCreateForm && (
                                <button
                                    onClick={() => {
                                        setShowCreateForm(true);
                                        setBranchName(`Reality-${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}-${Math.random().toString(36).slice(2, 6)}`);
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>New Reality</span>
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                        {error && (
                            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Create Fork Form */}
                        {showCreateForm && (
                            <form onSubmit={handleCreateFork} className="p-4 rounded-xl bg-[#161b22] border border-purple-500/30 space-y-3 shadow-lg">
                                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                    <h4 className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                                        <GitFork className="w-3.5 h-3.5" />
                                        Initialize Reality Branch
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="text-xs text-slate-400 hover:text-slate-200"
                                    >
                                        Cancel
                                    </button>
                                </div>

                                {forkSourceMessage && (
                                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5 text-xs text-slate-300 space-y-1">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Branching Point Message</span>
                                        <p className="line-clamp-2 italic text-slate-300 font-mono text-[11px]">
                                            "{forkSourceMessage.message}"
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Branch Name</label>
                                    <input
                                        type="text"
                                        value={branchName}
                                        onChange={(e) => setBranchName(e.target.value)}
                                        placeholder="e.g., Option A - Microservices Architecture"
                                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                                    <input
                                        type="text"
                                        value={branchDesc}
                                        onChange={(e) => setBranchDesc(e.target.value)}
                                        placeholder="Hypothesis or context for this alternate timeline"
                                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
                                    >
                                        Dismiss
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating || !branchName.trim()}
                                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                                    >
                                        {creating ? "Forking Reality..." : "Create Fork"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Reality Tree Overview */}
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-purple-400" />
                                Available Timelines & Realities
                            </span>

                            {/* Main Branch Card */}
                            <div
                                onClick={() => {
                                    onSelectBranch?.(null);
                                    onClose();
                                }}
                                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                                    !activeBranch
                                        ? "bg-purple-500/10 border-purple-500/40 ring-1 ring-purple-500/30"
                                        : "bg-[#161b22] border-white/10 hover:border-white/20 hover:bg-[#1c2128]"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${!activeBranch ? "bg-purple-500 text-white" : "bg-white/5 text-slate-400"}`}>
                                        <GitBranch className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xs font-bold text-white">main</h4>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                                                Primary Reality
                                            </span>
                                            {!activeBranch && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                                                    ACTIVE
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Original shared chronological discussion stream
                                        </p>
                                    </div>
                                </div>

                                {!activeBranch && (
                                    <Check className="w-4 h-4 text-purple-400" />
                                )}
                            </div>

                            {/* Forked Branches */}
                            {branches.map((b) => {
                                const isActive = activeBranch?.id === b.id;
                                return (
                                    <div
                                        key={b.id}
                                        onClick={() => {
                                            onSelectBranch?.(b);
                                            onClose();
                                        }}
                                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                                            isActive
                                                ? "bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/30"
                                                : "bg-[#161b22] border-white/10 hover:border-white/20 hover:bg-[#1c2128]"
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg mt-0.5 ${isActive ? "bg-indigo-500 text-white" : "bg-white/5 text-purple-400"}`}>
                                                <GitFork className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                                                        {b.name}
                                                    </h4>
                                                    {isActive && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                                                            ACTIVE
                                                        </span>
                                                    )}
                                                </div>
                                                {b.description && (
                                                    <p className="text-xs text-slate-300 mt-0.5">
                                                        {b.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3 text-slate-500" />
                                                        {b.created_by_username || "User"}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-slate-500" />
                                                        {new Date(b.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => handleArchiveBranch(b.id, e)}
                                                title="Archive this reality branch"
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Archive className="w-3.5 h-3.5" />
                                            </button>
                                            {isActive && (
                                                <Check className="w-4 h-4 text-indigo-400" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

RealityForksModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    user: PropTypes.object,
    activeBranch: PropTypes.object,
    onSelectBranch: PropTypes.func,
    forkSourceMessage: PropTypes.object,
    onForkCreated: PropTypes.func
};

export default RealityForksModal;

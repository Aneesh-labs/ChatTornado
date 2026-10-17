import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield,
    Lock,
    Unlock,
    Key,
    Plus,
    Trash2,
    Download,
    Search,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    X,
    FolderKanban,
    Lightbulb,
    FileText,
    Sliders
} from "lucide-react";
import {
    isVaultUnlocked,
    unlockVault,
    lockVault,
    getDecryptedMemories,
    addMemoryRecord,
    deleteMemoryRecord,
    purgeMemoryVault
} from "../../../Services/vortex/vaultService";
import { soundEngine } from "../../../utils/soundEffects";

const CATEGORIES = [
    { id: "all", label: "All Items", icon: FileText, color: "text-purple-400" },
    { id: "preference", label: "Preferences", icon: Sliders, color: "text-cyan-400" },
    { id: "fact", label: "Key Facts", icon: Lightbulb, color: "text-amber-400" },
    { id: "project", label: "Projects", icon: FolderKanban, color: "text-emerald-400" },
    { id: "instruction", label: "AI Directives", icon: Sparkles, color: "text-rose-400" },
];

export default function MemoryVaultModal({ isOpen, onClose }) {
    const [unlocked, setUnlocked] = useState(isVaultUnlocked());
    const [passphrase, setPassphrase] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [memories, setMemories] = useState(getDecryptedMemories());

    // Add Memory Form State
    const [showAddForm, setShowAddForm] = useState(false);
    const [newText, setNewText] = useState("");
    const [newCategory, setNewCategory] = useState("preference");
    const [newTitle, setNewTitle] = useState("");

    useEffect(() => {
        const handleUpdate = (e) => {
            setUnlocked(Boolean(e.detail?.unlocked));
            setMemories(getDecryptedMemories());
        };
        window.addEventListener("vortex_memory_vault_updated", handleUpdate);
        return () => window.removeEventListener("vortex_memory_vault_updated", handleUpdate);
    }, []);

    const handleUnlock = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setIsLoading(true);
        try {
            soundEngine.play("click");
            await unlockVault(passphrase);
            setUnlocked(true);
            setMemories(getDecryptedMemories());
            setPassphrase("");
        } catch (err) {
            setErrorMsg(err.message || "Failed to unlock vault.");
            soundEngine.play("error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLock = () => {
        soundEngine.play("click");
        lockVault();
        setUnlocked(false);
        setMemories([]);
    };

    const handleCreateMemory = async (e) => {
        e.preventDefault();
        if (!newText.trim()) return;
        setIsLoading(true);
        try {
            soundEngine.play("send");
            await addMemoryRecord(newText, newCategory, newTitle);
            setNewText("");
            setNewTitle("");
            setShowAddForm(false);
            setMemories(getDecryptedMemories());
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Permanently delete this encrypted memory record?")) return;
        soundEngine.play("click");
        await deleteMemoryRecord(id);
        setMemories(getDecryptedMemories());
    };

    const handleExport = () => {
        const exportData = {
            export_type: "vortex_zero_knowledge_vault",
            exported_at: new Date().toISOString(),
            record_count: memories.length,
            records: memories
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vortex_vault_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filteredMemories = useMemo(() => {
        return memories.filter((m) => {
            if (activeTab !== "all" && m.category !== activeTab) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const t = (m.title || "").toLowerCase();
                const b = (m.text || "").toLowerCase();
                if (!t.includes(q) && !b.includes(q)) return false;
            }
            return true;
        });
    }, [memories, activeTab, searchQuery]);

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-2xl bg-zinc-950/95 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-950/40 via-zinc-950 to-zinc-950">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-white tracking-wide">VORTEX AI Memory Vault</h2>
                                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                        Zero-Knowledge
                                    </span>
                                </div>
                                <p className="text-xs text-white/50">Client-Side AES-256-GCM • The server never sees your unencrypted data</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {unlocked && (
                                <button
                                    onClick={handleLock}
                                    title="Lock Vault"
                                    className="p-2 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
                                >
                                    <Lock className="w-4 h-4 text-amber-400" />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content Body */}
                    {!unlocked ? (
                        <div className="p-8 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                                <Key className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">Unlock Your Private Memory Vault</h3>
                            <p className="text-xs text-white/60 max-w-sm mb-6">
                                Enter your account password to derive your local AES-256 encryption key. Your key is kept purely in ephemeral RAM and never transmitted.
                            </p>

                            <form onSubmit={handleUnlock} className="w-full max-w-sm space-y-4">
                                <div>
                                    <input
                                        type="password"
                                        placeholder="Enter your vault passphrase..."
                                        value={passphrase}
                                        onChange={(e) => setPassphrase(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/50"
                                        autoFocus
                                    />
                                </div>

                                {errorMsg && (
                                    <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-left">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading || !passphrase}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <span>Deriving Cryptographic Key...</span>
                                    ) : (
                                        <>
                                            <Unlock className="w-4 h-4" />
                                            <span>Decrypt & Unlock Vault</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Toolbar */}
                            <div className="p-4 border-b border-white/10 bg-zinc-900/50 flex flex-wrap items-center justify-between gap-3">
                                {/* Search */}
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                    <input
                                        type="text"
                                        placeholder="Search memories, facts, directives..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleExport}
                                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-white/80 flex items-center gap-1.5 transition"
                                        title="Export Decrypted JSON"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Export</span>
                                    </button>
                                    <button
                                        onClick={() => setShowAddForm(true)}
                                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs text-white font-medium flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add Memory</span>
                                    </button>
                                </div>
                            </div>

                            {/* Category Filter Pills */}
                            <div className="px-4 py-2 border-b border-white/5 bg-zinc-900/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                {CATEGORIES.map((cat) => {
                                    const Icon = cat.icon;
                                    const isActive = activeTab === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveTab(cat.id)}
                                            className={`px-2.5 py-1 rounded-md text-xs flex items-center gap-1.5 transition whitespace-nowrap ${
                                                isActive
                                                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                                            }`}
                                        >
                                            <Icon className="w-3 h-3" />
                                            <span>{cat.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Add Memory Modal/Drawer */}
                            {showAddForm && (
                                <form onSubmit={handleCreateMemory} className="p-4 bg-purple-950/20 border-b border-purple-500/20 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                            New Encrypted Memory Record
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddForm(false)}
                                            className="text-white/40 hover:text-white text-xs"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="Title / Summary (e.g. Tone Preference)"
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60"
                                        />
                                        <select
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500/60"
                                        >
                                            <option value="preference">Preference (Tone, Style, Habits)</option>
                                            <option value="fact">Key Fact (Background, Bio, Facts)</option>
                                            <option value="project">Project (Active tasks & Goals)</option>
                                            <option value="instruction">AI Directive (Permanent Instruction)</option>
                                        </select>
                                    </div>
                                    <textarea
                                        rows={3}
                                        placeholder="What should VORTEX remember about you? (Encrypted locally before sending)"
                                        value={newText}
                                        onChange={(e) => setNewText(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="submit"
                                            disabled={isLoading || !newText.trim()}
                                            className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs text-white font-medium transition disabled:opacity-50"
                                        >
                                            Encrypt & Save
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Memories List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                                {filteredMemories.length === 0 ? (
                                    <div className="text-center py-12 text-white/40 text-xs">
                                        <Shield className="w-8 h-8 mx-auto mb-2 opacity-30 text-purple-400" />
                                        <p>No encrypted memory records found in this category.</p>
                                        <p className="text-[11px] text-white/30 mt-1">Tap 'Add Memory' to give VORTEX persistent private intelligence.</p>
                                    </div>
                                ) : (
                                    filteredMemories.map((mem) => {
                                        return (
                                            <div
                                                key={mem.id}
                                                className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-purple-500/30 transition group flex items-start justify-between gap-3"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                                            {mem.category}
                                                        </span>
                                                        <h5 className="text-xs font-semibold text-white/90">
                                                            {mem.title || "Memory Item"}
                                                        </h5>
                                                    </div>
                                                    <p className="text-xs text-white/70 leading-relaxed font-sans">
                                                        {mem.text}
                                                    </p>
                                                    <span className="text-[10px] text-white/30">
                                                        Encrypted {new Date(mem.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(mem.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                                    title="Permanently Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}

MemoryVaultModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};

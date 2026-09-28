import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, Check, Loader2, AlertCircle } from "lucide-react";
import API from "../../../Services/API";
import { Avatar } from "./constants";

export default function CreateGroupModal({ isOpen, onClose, availableUsers = [], onGroupCreated }) {
    const [name, setName] = useState("");
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const toggleUser = (userId) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError("Group name is required.");
            return;
        }

        setCreating(true);
        setError("");
        try {
            const token = sessionStorage.getItem("token");
            const res = await API.post(
                "/api/groups",
                {
                    name: name.trim(),
                    initial_member_ids: selectedUserIds,
                },
                { params: { token } }
            );

            onGroupCreated?.(res.data.group);
            setName("");
            setSelectedUserIds([]);
            onClose();
        } catch (err) {
            console.error("Failed to create group:", err);
            setError(err.response?.data?.detail || "Failed to create group. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    // Filter out bots for group creation
    const humanUsers = availableUsers.filter((u) => !u.is_bot && u.username !== "VORTEX-9");

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-md bg-[#0e121b] border border-white/10 rounded-2xl p-6 shadow-2xl text-white overflow-hidden flex flex-col max-h-[85vh]"
                >
                    <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Create Group Chat</h3>
                                <p className="text-xs text-white/50">Collaborate with multiple teammates</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleCreate} className="mt-4 flex flex-col flex-1 min-h-0 space-y-4">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1.5">
                                Group Name *
                            </label>
                            <input
                                type="text"
                                maxLength={60}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Design Crew, Tornado Squad"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-400/60"
                                required
                            />
                        </div>

                        <div className="flex-1 min-h-0 flex flex-col">
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                                    Add Members ({selectedUserIds.length} selected)
                                </label>
                            </div>

                            <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-2 space-y-1 custom-scrollbar">
                                {humanUsers.length === 0 ? (
                                    <p className="text-xs text-white/40 text-center py-6">
                                        No connections available to add. Connect with users in Global tab first.
                                    </p>
                                ) : (
                                    humanUsers.map((user) => {
                                        const isSelected = selectedUserIds.includes(user.id);
                                        return (
                                            <div
                                                key={user.id}
                                                onClick={() => toggleUser(user.id)}
                                                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                                                    isSelected
                                                        ? "bg-violet-500/20 border border-violet-500/40 text-white"
                                                        : "hover:bg-white/[0.04] text-white/70"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <Avatar user={user} size="xs" showStatus={false} />
                                                    <span className="text-xs font-semibold truncate">{user.username}</span>
                                                </div>
                                                <div
                                                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                                                        isSelected
                                                            ? "bg-violet-500 border-violet-400 text-white"
                                                            : "border-white/20"
                                                    }`}
                                                >
                                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2.5 pt-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-white/70 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={creating || !name.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Creating…</span>
                                    </>
                                ) : (
                                    "Create Group"
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

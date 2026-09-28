import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Activity, Smile, Loader2 } from "lucide-react";
import API from "../../../Services/API";
import { USER_STATUSES } from "./constants";

export default function UserStatusModal({ isOpen, onClose, currentStatus, currentCustomStatus, onStatusUpdated }) {
    const [selectedStatus, setSelectedStatus] = useState(currentStatus || "online");
    const [customStatus, setCustomStatus] = useState(currentCustomStatus || "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const token = sessionStorage.getItem("token");
            const res = await API.put(
                "/api/user/status",
                {
                    status: selectedStatus,
                    custom_status: customStatus.trim() || null,
                },
                { params: { token } }
            );

            sessionStorage.setItem("user_status", selectedStatus);
            if (customStatus.trim()) {
                sessionStorage.setItem("custom_status", customStatus.trim());
            } else {
                sessionStorage.removeItem("custom_status");
            }
            window.dispatchEvent(new Event("sessionStorageUpdate"));

            onStatusUpdated?.(res.data);
            onClose();
        } catch (err) {
            console.error("Failed to update status:", err);
            setError(err.response?.data?.detail || "Failed to update status.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-sm bg-[#0e121b] border border-white/10 rounded-2xl p-6 shadow-2xl text-white overflow-hidden"
                >
                    <div className="flex items-center justify-between pb-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-cyan-400" />
                            <h3 className="text-base font-bold text-white">Set Your Status</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="mt-4 space-y-4">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            {Object.entries(USER_STATUSES).map(([key, config]) => {
                                const isSelected = selectedStatus === key;
                                return (
                                    <button
                                        type="button"
                                        key={key}
                                        onClick={() => setSelectedStatus(key)}
                                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all text-left ${
                                            isSelected
                                                ? "bg-white/10 border-cyan-400/50 text-white shadow-md shadow-cyan-500/10"
                                                : "bg-white/[0.02] border-white/5 text-white/60 hover:bg-white/[0.06] hover:text-white"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`w-3 h-3 rounded-full ${config.color} ${config.shadow}`} />
                                            <div>
                                                <p className="text-xs font-semibold">{config.label}</p>
                                            </div>
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                                    </button>
                                );
                            })}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1.5 flex items-center gap-1.5">
                                <Smile className="w-3.5 h-3.5 text-cyan-400" />
                                Custom Status
                            </label>
                            <input
                                type="text"
                                maxLength={80}
                                value={customStatus}
                                onChange={(e) => setCustomStatus(e.target.value)}
                                placeholder="What's your focus? (e.g. Coding Tornado)"
                                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-white/70 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Saving…</span>
                                    </>
                                ) : (
                                    "Save Status"
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, AlertTriangle, CheckCircle, X, Loader2 } from "lucide-react";
import API from "../../../Services/API";
import { REPORT_CATEGORIES } from "./constants";

export default function ReportUserModal({ isOpen, onClose, targetUser, onReportSubmitted }) {
    const [category, setCategory] = useState(REPORT_CATEGORIES[0]);
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen || !targetUser) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        try {
            const token = sessionStorage.getItem("token");
            const res = await API.post(
                "/api/reports",
                {
                    reported_user_id: targetUser.id,
                    reason_category: category,
                    description: description.trim() || undefined,
                },
                { params: { token } }
            );

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setDescription("");
                setCategory(REPORT_CATEGORIES[0]);
                onReportSubmitted?.(res.data);
                onClose();
            }, 1600);
        } catch (err) {
            console.error("Failed to submit report:", err);
            setError(err.response?.data?.detail || "Failed to submit report. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-md bg-[#0e121b] border border-red-500/20 rounded-2xl p-6 shadow-2xl text-white overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-white/10">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
                                <ShieldAlert className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Report User</h3>
                                <p className="text-xs text-white/50">Target: @{targetUser.username}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {success ? (
                        <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
                            <CheckCircle className="w-12 h-12 text-emerald-400 animate-bounce" />
                            <h4 className="text-lg font-bold text-white">Report Submitted</h4>
                            <p className="text-xs text-white/60 max-w-xs">
                                Our AI Moderation pipeline is analyzing the report. Safety actions are applied automatically.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
                                    Reason Category
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-red-400/50 transition-colors"
                                >
                                    {REPORT_CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat} className="bg-[#111624] text-white">
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
                                    Description / Evidence (Optional)
                                </label>
                                <textarea
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Explain the violation or incident..."
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-red-400/50 transition-colors resize-none"
                                />
                            </div>

                            <p className="text-[11px] text-white/40 leading-relaxed">
                                False reports are reviewed and may result in penalties. The AI moderation engine inspects relevant context securely.
                            </p>

                            <div className="flex gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-white/70 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-xs font-bold text-white shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Submitting…</span>
                                        </>
                                    ) : (
                                        "Submit Report"
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

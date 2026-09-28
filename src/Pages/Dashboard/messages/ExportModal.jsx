import React, { useState, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Copy, Check, FileText, Code2, Globe, Sparkles } from "lucide-react";
import { exportToMarkdown, exportToHtml, exportToPlainText, downloadFile } from "../../../utils/chatExporter";

const FORMAT_OPTIONS = [
    {
        id: "md",
        title: "Markdown (.md)",
        desc: "Best for Obsidian, Notion, GitHub, and markdown editors",
        icon: Code2,
        badge: "Recommended",
        mime: "text/markdown",
    },
    {
        id: "html",
        title: "Styled HTML / PDF (.html)",
        desc: "Interactive styled page ready to view or print to PDF (Ctrl+P)",
        icon: Globe,
        badge: "Printable",
        mime: "text/html",
    },
    {
        id: "txt",
        title: "Plain Text (.txt)",
        desc: "Simple timestamped text file readable on any device",
        icon: FileText,
        badge: "Lightweight",
        mime: "text/plain",
    },
];

const ExportModal = ({ isOpen, onClose, messages = [], user = null }) => {
    const [format, setFormat] = useState("md");
    const [includeTimestamps, setIncludeTimestamps] = useState(true);
    const [includeAiNotes, setIncludeAiNotes] = useState(true);
    const [range, setRange] = useState("all"); // 'all' or 'last50'
    const [copied, setCopied] = useState(false);
    const [downloaded, setDownloaded] = useState(false);

    const partnerName = user?.username || "Chat Room";

    const exportMessages = useMemo(() => {
        if (!messages || !Array.isArray(messages)) return [];
        if (range === "last50") {
            return messages.slice(-50);
        }
        return messages;
    }, [messages, range]);

    const stats = useMemo(() => {
        const count = exportMessages.length;
        let totalWords = 0;
        for (const m of exportMessages) {
            if (m.message) totalWords += m.message.split(/\s+/).filter(Boolean).length;
        }
        return { count, totalWords };
    }, [exportMessages]);

    const getGeneratedContent = useCallback(() => {
        const options = { includeTimestamps, includeAiNotes };
        if (format === "md") return exportToMarkdown(exportMessages, user, options);
        if (format === "html") return exportToHtml(exportMessages, user, options);
        return exportToPlainText(exportMessages, user, options);
    }, [format, exportMessages, user, includeTimestamps, includeAiNotes]);

    const handleDownload = () => {
        const content = getGeneratedContent();
        const dateStr = new Date().toISOString().slice(0, 10);
        const safeName = (partnerName || "transcript").replace(/[^a-zA-Z0-9_\-]/g, "_");
        const filename = `ChatTornado_${safeName}_${dateStr}.${format}`;
        const targetOption = FORMAT_OPTIONS.find((f) => f.id === format);

        downloadFile(content, filename, targetOption?.mime || "text/plain");

        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 2500);
    };

    const handleCopy = () => {
        const content = getGeneratedContent();
        navigator.clipboard.writeText(content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg rounded-2xl bg-[#0f1422] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.03]">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                                <Download className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                                    Export Conversation Transcript
                                </h3>
                                <p className="text-[11px] text-white/50">
                                    Export chat history with {partnerName}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar text-xs sm:text-sm">
                        {/* Conversation Stats Pill */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10 text-white/70">
                            <span className="flex items-center gap-1.5 font-medium">
                                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                                <span>{stats.count} messages</span>
                            </span>
                            <span className="text-white/40">&bull;</span>
                            <span>~{stats.totalWords.toLocaleString()} words</span>
                            <span className="text-white/40">&bull;</span>
                            <span className="text-cyan-400 font-semibold">{partnerName}</span>
                        </div>

                        {/* Format Cards */}
                        <div>
                            <label className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-2">
                                Choose Export Format
                            </label>
                            <div className="space-y-2">
                                {FORMAT_OPTIONS.map((opt) => {
                                    const Icon = opt.icon;
                                    const isSelected = format === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setFormat(opt.id)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                                isSelected
                                                    ? "bg-cyan-500/15 border-cyan-400/50 shadow-md shadow-cyan-950/40"
                                                    : "bg-white/[0.02] border-white/10 hover:bg-white/[0.05]"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                        isSelected ? "bg-cyan-500/20 text-cyan-300" : "bg-white/5 text-white/50"
                                                    }`}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className={`font-semibold text-xs sm:text-sm ${isSelected ? "text-cyan-200" : "text-white"}`}>
                                                        {opt.title}
                                                    </p>
                                                    <p className="text-[11px] text-white/40">{opt.desc}</p>
                                                </div>
                                            </div>
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    isSelected ? "bg-cyan-400 text-black font-extrabold" : "bg-white/10 text-white/60"
                                                }`}
                                            >
                                                {opt.badge}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Options */}
                        <div className="pt-2 border-t border-white/10 space-y-2.5">
                            <label className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">
                                Export Options
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/10 cursor-pointer text-white/80 hover:text-white">
                                    <input
                                        type="checkbox"
                                        checked={includeTimestamps}
                                        onChange={(e) => setIncludeTimestamps(e.target.checked)}
                                        className="rounded border-white/20 text-cyan-500 focus:ring-0 bg-black/40"
                                    />
                                    <span>Include Timestamps</span>
                                </label>

                                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/10 cursor-pointer text-white/80 hover:text-white">
                                    <input
                                        type="checkbox"
                                        checked={includeAiNotes}
                                        onChange={(e) => setIncludeAiNotes(e.target.checked)}
                                        className="rounded border-white/20 text-cyan-500 focus:ring-0 bg-black/40"
                                    />
                                    <span>Include AI Summaries</span>
                                </label>
                            </div>

                            {/* Range toggle */}
                            <div className="flex items-center gap-2 pt-1 text-xs">
                                <span className="text-white/50 text-xs">Range:</span>
                                <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setRange("all")}
                                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                            range === "all" ? "bg-cyan-500/20 text-cyan-300" : "text-white/50 hover:text-white"
                                        }`}
                                    >
                                        All ({messages.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRange("last50")}
                                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                            range === "last50" ? "bg-cyan-500/20 text-cyan-300" : "text-white/50 hover:text-white"
                                        }`}
                                    >
                                        Last 50
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-white/10 bg-white/[0.02]">
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copied ? "Copied! ✓" : "Copy to Clipboard"}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs shadow-lg shadow-cyan-900/40 transition-all active:scale-95 cursor-pointer"
                        >
                            <Download className="w-3.5 h-3.5 text-black" />
                            <span>{downloaded ? "Downloaded! ✓" : `Download .${format}`}</span>
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

ExportModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    messages: PropTypes.array,
    user: PropTypes.object,
};

export default ExportModal;

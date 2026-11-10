import React, { useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Sparkles, Zap, HardDrive, X, ArrowRight } from "lucide-react";
import { VIDEO_QUALITY_PRESETS, estimateTranscodedSize } from "../Services/media/videoTranscoder";

const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const VideoQualityModal = ({ isOpen, file, onClose, onConfirm }) => {
    const [selectedPreset, setSelectedPreset] = useState(VIDEO_QUALITY_PRESETS.ORIGINAL);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    if (!isOpen || !file) return null;

    const originalSize = file.size;
    const est720p = estimateTranscodedSize(file, VIDEO_QUALITY_PRESETS.BALANCED_720P);
    const est480p = estimateTranscodedSize(file, VIDEO_QUALITY_PRESETS.DATA_SAVER_480P);

    const handleSend = async () => {
        setProcessing(true);
        try {
            await onConfirm(selectedPreset, (p) => setProgress(p));
            onClose();
        } catch (err) {
            console.error("Video send failed:", err);
        } finally {
            setProcessing(false);
            setProgress(0);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-md max-h-[88dvh] overflow-y-auto overflow-x-hidden custom-scrollbar rounded-3xl border border-cyan-500/30 bg-[#0a0f1d] p-5 sm:p-6 shadow-[0_0_40px_rgba(6,182,212,0.25)] text-white"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                                <Film className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-white leading-tight">P2P Video Transfer Quality</h3>
                                <p className="text-[11px] text-white/50 truncate max-w-[220px]">{file.name}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={processing}
                            className="p-1 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Presets */}
                    <div className="mt-4 space-y-2.5">
                        {/* 1. Original */}
                        <div
                            onClick={() => !processing && setSelectedPreset(VIDEO_QUALITY_PRESETS.ORIGINAL)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                selectedPreset === VIDEO_QUALITY_PRESETS.ORIGINAL
                                    ? "bg-cyan-500/15 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                                    : "bg-white/[0.03] border-white/10 hover:border-white/20"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-bold text-white">Original Quality</p>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">Bit-for-Bit</span>
                                    </div>
                                    <p className="text-[10px] text-white/40">Unaltered 1080p/4K resolution & lossless audio</p>
                                </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-cyan-300">{formatBytes(originalSize)}</span>
                        </div>

                        {/* 2. Balanced 720p */}
                        <div
                            onClick={() => !processing && setSelectedPreset(VIDEO_QUALITY_PRESETS.BALANCED_720P)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                selectedPreset === VIDEO_QUALITY_PRESETS.BALANCED_720P
                                    ? "bg-cyan-500/15 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                                    : "bg-white/[0.03] border-white/10 hover:border-white/20"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                                    <HardDrive className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-bold text-white">Balanced (720p HD)</p>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">Optimal</span>
                                    </div>
                                    <p className="text-[10px] text-white/40">Smooth HD playback with fast direct transfer</p>
                                </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-cyan-300">~{formatBytes(est720p)}</span>
                        </div>

                        {/* 3. Data Saver 480p */}
                        <div
                            onClick={() => !processing && setSelectedPreset(VIDEO_QUALITY_PRESETS.DATA_SAVER_480P)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                selectedPreset === VIDEO_QUALITY_PRESETS.DATA_SAVER_480P
                                    ? "bg-cyan-500/15 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                                    : "bg-white/[0.03] border-white/10 hover:border-white/20"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                                    <Zap className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-bold text-white">Data Saver (480p)</p>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">Compact</span>
                                    </div>
                                    <p className="text-[10px] text-white/40">Lightweight transfer for slow mobile networks</p>
                                </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-cyan-300">~{formatBytes(est480p)}</span>
                        </div>
                    </div>

                    {/* Progress indicator during transcoding */}
                    {processing && (
                        <div className="mt-4 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
                            <div className="flex justify-between text-xs text-cyan-300 font-medium mb-1">
                                <span>Optimizing video client-side...</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-cyan-400 to-sky-400 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Action Footer */}
                    <div className="mt-5 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={processing}
                            className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white/70 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={processing}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                        >
                            <span>Send via P2P</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

VideoQualityModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    file: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired
};

export default VideoQualityModal;

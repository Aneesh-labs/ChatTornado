import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Activity, 
    X, 
    Download, 
    Upload, 
    Clock, 
    Trash2, 
    RefreshCw, 
    ShieldCheck, 
    HardDrive, 
    FileText, 
    Film, 
    Image as ImageIcon,
    Sparkles
} from "lucide-react";
import p2pEngine, { TRANSFER_STATES } from "../Services/webrtc/p2pTransferEngine";
import { listOutboxTransfers, deleteOutboxTransfer } from "../Services/db";
import { soundEngine } from "../utils/soundEffects";

const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const P2PTransfersDrawer = ({ isOpen, onClose }) => {
    const [activeTransfers, setActiveTransfers] = useState([]);
    const [outboxItems, setOutboxItems] = useState([]);
    const [stats, setStats] = useState({ totalSent: 0, totalReceived: 0, completedCount: 0 });

    const refreshData = async () => {
        // Collect active transfers from engine
        const currentActive = Array.from(p2pEngine.activeTransfers.values());
        setActiveTransfers(currentActive);

        // Collect outbox items from IndexedDB
        try {
            const items = await listOutboxTransfers();
            setOutboxItems(items || []);
        } catch (e) {
            console.warn("Outbox load warning:", e);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        refreshData();

        const unsub = p2pEngine.subscribe((event, data) => {
            refreshData();
            if (event === "transfer_completed") {
                setStats((prev) => ({
                    ...prev,
                    completedCount: prev.completedCount + 1,
                    totalReceived: prev.totalReceived + (data.session?.fileSize || 0)
                }));
            }
        });

        const interval = setInterval(refreshData, 1000);
        return () => {
            unsub();
            clearInterval(interval);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleDeleteOutbox = async (transferId) => {
        await deleteOutboxTransfer(transferId);
        soundEngine?.play?.("quantum_ping");
        refreshData();
    };

    const handleRetryOutbox = async (item) => {
        if (item.file) {
            await p2pEngine.sendFile(item.file, item.recipientId, {
                transferId: item.transferId,
                filename: item.filename,
                mimeType: item.mimeType,
                sha256: item.sha256
            });
            refreshData();
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[140] flex justify-end bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="relative w-full max-w-sm sm:max-w-md h-full bg-[#090d18] border-l border-cyan-500/20 shadow-2xl p-5 flex flex-col text-white select-none overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                                <Activity className="w-4 h-4 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white leading-tight">P2P Transfers & Outbox</h3>
                                <p className="text-[10px] text-cyan-400/70 font-mono">Zero-Cloud Direct Transmission</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Telemetry Stats Bar */}
                    <div className="mt-4 p-3 rounded-2xl bg-black/50 border border-cyan-500/20 grid grid-cols-2 gap-2 text-center shrink-0">
                        <div className="p-2 rounded-xl bg-white/[0.02]">
                            <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Active Streams</span>
                            <p className="text-sm font-bold text-cyan-300 mt-0.5">{activeTransfers.length}</p>
                        </div>
                        <div className="p-2 rounded-xl bg-white/[0.02]">
                            <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Device Outbox</span>
                            <p className="text-sm font-bold text-amber-300 mt-0.5">{outboxItems.length} queued</p>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                        {/* Section 1: Active In-Flight Transfers */}
                        <div>
                            <div className="flex items-center justify-between text-xs font-bold text-white/70 mb-2">
                                <span>Active Transfers</span>
                                <span className="text-[10px] font-mono text-cyan-400">{activeTransfers.length}</span>
                            </div>

                            {activeTransfers.length === 0 ? (
                                <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-center text-xs text-white/30">
                                    No direct P2P transfers currently streaming.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {activeTransfers.map((session) => (
                                        <div key={session.transferId} className="p-3 rounded-2xl border border-cyan-500/30 bg-black/40 space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-white truncate max-w-[180px]">{session.filename}</span>
                                                <span className="text-[10px] font-mono text-cyan-300">{formatBytes(session.fileSize)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
                                                <span className="capitalize text-cyan-400">{session.status}</span>
                                                <span>{session.role === "sender" ? "Uploading" : "Receiving"}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Section 2: Offline Outbox Queue */}
                        <div>
                            <div className="flex items-center justify-between text-xs font-bold text-white/70 mb-2">
                                <span>Device Outbox (Offline Peers)</span>
                                <span className="text-[10px] font-mono text-amber-400">{outboxItems.length}</span>
                            </div>

                            {outboxItems.length === 0 ? (
                                <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-center text-xs text-white/30">
                                    Outbox clean. No files waiting for offline peers.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {outboxItems.map((item) => (
                                        <div key={item.transferId} className="p-3 rounded-2xl border border-amber-500/20 bg-amber-950/10 flex items-center justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-white truncate">{item.filename}</p>
                                                <div className="flex items-center gap-2 text-[10px] text-white/50 mt-0.5 font-mono">
                                                    <span>{formatBytes(item.fileSize)}</span>
                                                    <span>•</span>
                                                    <span className="text-amber-400">Waiting for peer</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRetryOutbox(item)}
                                                    title="Retry P2P Send"
                                                    className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors cursor-pointer"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteOutbox(item.transferId)}
                                                    title="Remove from Outbox"
                                                    className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors cursor-pointer"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Zero Cloud Storage Certification Badge */}
                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50 shrink-0">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>100% Zero-Cloud Enforced</span>
                        </div>
                        <span className="font-mono text-cyan-400/80">DTLS + AES-GCM</span>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

P2PTransfersDrawer.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
};

export default P2PTransfersDrawer;

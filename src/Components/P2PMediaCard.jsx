import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { 
    Download, 
    Check, 
    X, 
    Clock, 
    AlertCircle, 
    ShieldCheck, 
    Sparkles, 
    FileText, 
    Film, 
    Music, 
    Image as ImageIcon,
    RefreshCw,
    Share2
} from "lucide-react";
import p2pEngine, { TRANSFER_STATES } from "../Services/webrtc/p2pTransferEngine";
import { getLocalMediaUrl } from "../Services/db";

const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const formatSpeed = (bps) => {
    if (!bps || bps <= 0) return "";
    if (bps < 1024) return `${bps} B/s`;
    if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
    return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
};

export const P2PMediaCard = ({ 
    rawMessage, 
    senderId, 
    isMe, 
    myUserId, 
    onOpenLightbox 
}) => {
    const [meta, setMeta] = useState(null);
    const [localUrl, setLocalUrl] = useState(null);
    const [transferState, setTransferState] = useState(TRANSFER_STATES.WAITING_FOR_ACCEPTANCE);
    const [progress, setProgress] = useState(0);
    const [speedBps, setSpeedBps] = useState(0);
    const [errorMessage, setErrorMessage] = useState("");

    // Parse metadata from raw packet: `⚡ P2P_MEDIA\n{...}`
    useEffect(() => {
        try {
            if (!rawMessage) return;
            const jsonPart = rawMessage.replace(/^⚡ P2P_MEDIA\s*/, "").trim();
            const parsed = JSON.parse(jsonPart);
            setMeta(parsed);

            const transferId = parsed.transferId || parsed.fileId;

            // Check if file is already cached/saved on this device
            getLocalMediaUrl(transferId).then((url) => {
                if (url) {
                    setLocalUrl(url);
                    setTransferState(TRANSFER_STATES.COMPLETED);
                    setProgress(100);
                } else {
                    // Check if there is an active session in p2pEngine
                    const session = p2pEngine.activeTransfers.get(transferId);
                    if (session) {
                        setTransferState(session.status);
                    } else if (isMe) {
                        setTransferState(TRANSFER_STATES.WAITING_FOR_PEER);
                    } else {
                        setTransferState(TRANSFER_STATES.WAITING_FOR_ACCEPTANCE);
                    }
                }
            });
        } catch (e) {
            console.error("Failed to parse P2P media metadata:", e);
        }
    }, [rawMessage, isMe]);

    // Subscribe to engine progress and state transitions
    useEffect(() => {
        if (!meta) return;
        const transferId = meta.transferId || meta.fileId;

        const unsubscribe = p2pEngine.subscribe((event, data) => {
            if (data?.transferId !== transferId) return;

            if (event === "transfer_state") {
                setTransferState(data.state);
                if (data.details?.message) {
                    setErrorMessage(data.details.message);
                }
                if (data.state === TRANSFER_STATES.COMPLETED) {
                    getLocalMediaUrl(transferId).then((url) => {
                        if (url) setLocalUrl(url);
                    });
                }
            } else if (event === "transfer_progress") {
                setProgress(data.percent || 0);
                if (data.speedBps) setSpeedBps(data.speedBps);
            } else if (event === "transfer_completed") {
                setTransferState(TRANSFER_STATES.COMPLETED);
                setProgress(100);
                if (data.fileBlob) {
                    const objUrl = URL.createObjectURL(data.fileBlob);
                    setLocalUrl(objUrl);
                }
            }
        });

        return () => unsubscribe();
    }, [meta]);

    if (!meta) return null;

    const transferId = meta.transferId || meta.fileId;
    const isImage = meta.mimeType?.startsWith("image/") || meta.type?.startsWith("image/");
    const isVideo = meta.mimeType?.startsWith("video/") || meta.type?.startsWith("video/");
    const isAudio = meta.mimeType?.startsWith("audio/") || meta.type?.startsWith("audio/");

    const handleAccept = () => {
        setTransferState(TRANSFER_STATES.CONNECTING);
        p2pEngine.acceptTransfer(transferId);
    };

    const handleDecline = () => {
        setTransferState(TRANSFER_STATES.DECLINED);
        p2pEngine.declineTransfer(transferId);
    };

    const handleCancel = () => {
        setTransferState(TRANSFER_STATES.CANCELLED);
        p2pEngine.cancelTransfer(transferId);
    };

    const handleRetry = () => {
        if (isMe) {
            setTransferState(TRANSFER_STATES.CONNECTING);
            // Re-attempt transfer from outbox
            p2pEngine.sendFile(meta.file, meta.recipientId || meta.receiverId, { transferId }).catch((err) => {
                console.error("Retry failed:", err);
            });
        } else {
            handleAccept();
        }
    };

    // Render Completed Media Preview
    if (localUrl && transferState === TRANSFER_STATES.COMPLETED) {
        if (isImage) {
            return (
                <div className="mt-1 flex flex-col gap-1.5 rounded-2xl overflow-hidden border border-cyan-500/30 bg-black/50 p-1.5 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                    <img 
                        src={localUrl} 
                        alt={meta.filename || meta.name} 
                        onClick={() => onOpenLightbox?.(localUrl)}
                        className="rounded-xl max-h-72 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    />
                    <div className="flex items-center justify-between text-[10px] text-white/50 px-1 pt-0.5">
                        <span className="truncate max-w-[170px] font-medium text-white/80">{meta.filename || meta.name}</span>
                        <div className="flex items-center gap-1 text-cyan-300 font-mono">
                            <ShieldCheck className="w-3 h-3 text-cyan-400" />
                            <span>P2P Verified</span>
                        </div>
                    </div>
                </div>
            );
        }

        if (isVideo) {
            return (
                <div className="mt-1 flex flex-col gap-1.5 rounded-2xl overflow-hidden border border-cyan-500/30 bg-black/60 p-1.5 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                    <video 
                        src={localUrl} 
                        controls 
                        className="rounded-xl max-h-72 w-full object-contain bg-black"
                    />
                    <div className="flex items-center justify-between text-[10px] text-white/50 px-1 pt-0.5">
                        <span className="truncate max-w-[170px] font-medium text-white/80">{meta.filename || meta.name}</span>
                        <span className="text-cyan-300 font-mono">{formatBytes(meta.fileSize || meta.size)}</span>
                    </div>
                </div>
            );
        }

        if (isAudio) {
            return (
                <div className="mt-1 flex flex-col gap-1.5 rounded-2xl border border-cyan-500/30 bg-black/60 p-3 shadow-lg">
                    <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="text-xs font-semibold text-white/90 truncate">{meta.filename || meta.name}</span>
                    </div>
                    <audio src={localUrl} controls className="w-full h-8 mt-1" />
                </div>
            );
        }

        // Generic Document / File
        return (
            <div className="mt-1.5 rounded-2xl border border-cyan-500/30 bg-black/50 p-3 flex items-center justify-between gap-3 min-w-[240px]">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{meta.filename || meta.name}</p>
                        <p className="text-[10px] text-cyan-300/70 font-mono">{formatBytes(meta.fileSize || meta.size)} • P2P Vault</p>
                    </div>
                </div>
                <a
                    href={localUrl}
                    download={meta.filename || meta.name || "download"}
                    className="p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 transition-colors shrink-0"
                    title="Save File"
                >
                    <Download className="w-4 h-4" />
                </a>
            </div>
        );
    }

    // In-Flight / Acceptance / Diagnostic Card
    return (
        <div className="mt-1.5 rounded-2xl border border-white/10 bg-black/60 p-3.5 flex flex-col gap-2.5 min-w-[260px] max-w-[320px] shadow-2xl backdrop-blur-xl">
            {/* Header: File Icon + Info */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
                    {isImage ? <ImageIcon className="w-5 h-5" /> : isVideo ? <Film className="w-5 h-5" /> : isAudio ? <Music className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate leading-tight">{meta.filename || meta.name || "Attachment"}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-cyan-300/80 font-mono font-semibold">{formatBytes(meta.fileSize || meta.size)}</span>
                        <span className="text-white/20">•</span>
                        <span className="text-[10px] text-amber-300/80 font-mono flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            Direct P2P
                        </span>
                    </div>
                </div>
            </div>

            {/* Status Feedback Banner */}
            <div className="flex items-center justify-between text-[11px] font-mono px-1">
                <span className={`capitalize font-semibold ${
                    transferState === TRANSFER_STATES.COMPLETED ? "text-emerald-400" :
                    transferState === TRANSFER_STATES.TRANSFERRING ? "text-cyan-300" :
                    transferState === TRANSFER_STATES.NAT_TRAVERSAL_FAILED || transferState === TRANSFER_STATES.INTEGRITY_FAILED ? "text-rose-400" :
                    "text-white/60"
                }`}>
                    {transferState === TRANSFER_STATES.WAITING_FOR_PEER ? "Waiting for peer..." :
                     transferState === TRANSFER_STATES.WAITING_FOR_ACCEPTANCE ? (isMe ? "Sent • Awaiting peer accept" : "Incoming transfer request") :
                     transferState === TRANSFER_STATES.CONNECTING ? "Connecting WebRTC (STUN)..." :
                     transferState === TRANSFER_STATES.TRANSFERRING ? `Transferring • ${progress}%` :
                     transferState === TRANSFER_STATES.VERIFYING ? "Verifying SHA-256..." :
                     transferState === TRANSFER_STATES.DECLINED ? "Transfer declined" :
                     transferState === TRANSFER_STATES.CANCELLED ? "Transfer cancelled" :
                     transferState === TRANSFER_STATES.NAT_TRAVERSAL_FAILED ? "Symmetric NAT blocked P2P" :
                     transferState === TRANSFER_STATES.CONNECTION_LOST ? "Peer disconnected" :
                     transferState}
                </span>
                {transferState === TRANSFER_STATES.TRANSFERRING && speedBps > 0 && (
                    <span className="text-[10px] text-cyan-400/80">{formatSpeed(speedBps)}</span>
                )}
            </div>

            {/* Progress Bar during active transfer */}
            {(transferState === TRANSFER_STATES.TRANSFERRING || transferState === TRANSFER_STATES.VERIFYING) && (
                <div className="space-y-1">
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Diagnostic Alert if NAT traversal or connection fails */}
            {(transferState === TRANSFER_STATES.NAT_TRAVERSAL_FAILED || transferState === TRANSFER_STATES.CONNECTION_LOST) && (
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-300 leading-snug">
                    <p className="font-bold flex items-center gap-1 text-rose-400">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        Direct P2P Traversal Limitation
                    </p>
                    <p className="mt-0.5 opacity-80">
                        Direct connection could not be negotiated. Symmetric NAT or cellular firewall blocks UDP STUN traversal.
                    </p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
                {/* 1. Recipient Acceptance Prompt */}
                {!isMe && transferState === TRANSFER_STATES.WAITING_FOR_ACCEPTANCE && (
                    <>
                        <button
                            type="button"
                            onClick={handleDecline}
                            className="flex-1 py-1.5 px-3 rounded-xl border border-white/15 hover:bg-white/5 text-white/60 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                        >
                            Decline
                        </button>
                        <button
                            type="button"
                            onClick={handleAccept}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)] flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Accept</span>
                        </button>
                    </>
                )}

                {/* 2. Cancellation Button while in progress */}
                {(transferState === TRANSFER_STATES.CONNECTING || transferState === TRANSFER_STATES.TRANSFERRING) && (
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="w-full py-1.5 px-3 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel Transfer</span>
                    </button>
                )}

                {/* 3. Retry on Failures */}
                {(transferState === TRANSFER_STATES.NAT_TRAVERSAL_FAILED || transferState === TRANSFER_STATES.CONNECTION_LOST || transferState === TRANSFER_STATES.DECLINED) && (
                    <button
                        type="button"
                        onClick={handleRetry}
                        className="w-full py-1.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry P2P Connection</span>
                    </button>
                )}
            </div>
        </div>
    );
};

P2PMediaCard.propTypes = {
    rawMessage: PropTypes.string.isRequired,
    senderId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    isMe: PropTypes.bool,
    myUserId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    onOpenLightbox: PropTypes.func
};

export default P2PMediaCard;

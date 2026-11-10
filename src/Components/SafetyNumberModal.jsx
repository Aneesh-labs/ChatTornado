import React, { useMemo, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShieldCheck,
    ShieldAlert,
    Shield,
    Lock,
    Copy,
    Check,
    X,
    RefreshCw,
    Sparkles,
    KeyRound,
} from "lucide-react";
import {
    markPeerVerified,
    unmarkPeerVerified,
    getPeerTrustStatus,
} from "../Services/e2eeIdentity";
import { soundEngine } from "../utils/soundEffects";

/**
 * Generates a deterministic 17x17 matrix visual verification pattern from the 60-digit compact code.
 * Matches visual QR-like parity verification without leaking keys to external services.
 */
function buildVisualMatrix(compactCode) {
    const size = 17;
    const grid = Array.from({ length: size }, () => Array(size).fill(false));
    if (!compactCode) return grid;

    // 3 corner alignment finders (7x7 / 5x5)
    const drawFinder = (r0, c0) => {
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                const border = r === 0 || r === 4 || c === 0 || c === 4;
                const center = r === 2 && c === 2;
                grid[r0 + r][c0 + c] = border || center;
            }
        }
    };
    drawFinder(0, 0);
    drawFinder(0, size - 5);
    drawFinder(size - 5, 0);

    let seed = 2166136261;
    for (let i = 0; i < compactCode.length; i++) {
        seed ^= compactCode.charCodeAt(i);
        seed = Math.imul(seed, 16777619);
    }

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const inTopLeft = r < 6 && c < 6;
            const inTopRight = r < 6 && c >= size - 6;
            const inBotLeft = r >= size - 6 && c < 6;
            if (inTopLeft || inTopRight || inBotLeft) continue;
            seed ^= (r * 31 + c * 17);
            seed = Math.imul(seed, 16777619);
            grid[r][c] = (Math.abs(seed) % 10) < 5;
        }
    }
    return grid;
}

export const SafetyNumberModal = ({
    isOpen,
    onClose,
    myUserId,
    myUsername,
    localIdentity,
    peerUser,
    peerPubKey,
    trustState,
    onTrustUpdated,
    e2eeTextEnabled,
    onToggleE2eeText,
    onRefreshPeerKey,
}) => {
    const [copied, setCopied] = useState(false);
    const [busy, setBusy] = useState(false);
    const [localTrust, setLocalTrust] = useState(trustState);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        setLocalTrust(trustState);
    }, [trustState]);

    useEffect(() => {
        if (!isOpen || !myUserId || !localIdentity?.publicJwk || !peerUser?.id || !peerPubKey) return;
        getPeerTrustStatus(myUserId, localIdentity.publicJwk, peerUser.id, peerPubKey).then(setLocalTrust);
    }, [isOpen, myUserId, localIdentity, peerUser?.id, peerPubKey]);

    const safety = localTrust?.safetyNumber || null;
    const status = localTrust?.status || "unavailable";
    const matrix = useMemo(() => buildVisualMatrix(safety?.compact || ""), [safety?.compact]);

    if (!isOpen || !peerUser) return null;

    const handleCopy = () => {
        if (!safety?.formatted) return;
        navigator.clipboard?.writeText(safety.formatted);
        setCopied(true);
        soundEngine?.play?.("quantum_ping");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleVerifyToggle = async () => {
        if (!myUserId || !localIdentity?.publicJwk || !peerUser?.id || !peerPubKey) return;
        setBusy(true);
        try {
            if (status === "verified") {
                await unmarkPeerVerified(myUserId, peerUser.id);
            } else {
                await markPeerVerified(myUserId, localIdentity.publicJwk, peerUser.id, peerPubKey);
                soundEngine?.play?.("quantum_ping");
            }
            const next = await getPeerTrustStatus(myUserId, localIdentity.publicJwk, peerUser.id, peerPubKey);
            setLocalTrust(next);
            onTrustUpdated?.(next);
        } finally {
            setBusy(false);
        }
    };

    const handleRefreshKey = async () => {
        if (!onRefreshPeerKey) return;
        setRefreshing(true);
        try {
            await onRefreshPeerKey(peerUser.id);
        } finally {
            setTimeout(() => setRefreshing(false), 400);
        }
    };

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 12 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-md rounded-3xl border border-cyan-500/30 bg-[#090d18] p-5 sm:p-6 shadow-[0_0_50px_rgba(6,182,212,0.22)] text-white select-none max-h-[90vh] overflow-y-auto custom-scrollbar"
                >
                    {/* Header Glow */}
                    <div className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close safety number modal"
                        className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Title + Status */}
                    <div className="flex items-center gap-3 mb-4 pr-8">
                        <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                                status === "verified"
                                    ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                                    : status === "key_changed"
                                    ? "bg-amber-500/20 border-amber-400/40 text-amber-300"
                                    : "bg-cyan-500/15 border-cyan-400/30 text-cyan-300"
                            }`}
                        >
                            {status === "verified" ? (
                                <ShieldCheck className="w-6 h-6" />
                            ) : status === "key_changed" ? (
                                <ShieldAlert className="w-6 h-6 animate-pulse" />
                            ) : (
                                <KeyRound className="w-5 h-5" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                                Zero-Knowledge Identity Verification
                            </h3>
                            <p className="text-[11px] text-white/50 truncate mt-0.5">
                                {myUsername || "You"} ↔ {peerUser.username} (ECDH P-256)
                            </p>
                        </div>
                    </div>

                    {/* Key Change Alert */}
                    {status === "key_changed" && (
                        <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 leading-relaxed">
                            <p className="font-bold flex items-center gap-1.5 text-amber-300">
                                <ShieldAlert className="w-4 h-4 shrink-0" />
                                Security Notice: Safety Number Changed
                            </p>
                            <p className="mt-1 text-[11px] text-amber-200/80">
                                {peerUser.username} initialized a new device identity key (e.g., reinstalled APK or switched browser). Re-verify before trusting.
                            </p>
                        </div>
                    )}

                    {status === "unavailable" ? (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center space-y-3 my-2">
                            <Shield className="w-8 h-8 text-white/30 mx-auto" />
                            <p className="text-xs font-semibold text-white/80">
                                Waiting for {peerUser.username}&apos;s ECDH Public Key
                            </p>
                            <p className="text-[11px] text-white/45 leading-relaxed">
                                Once {peerUser.username} opens ChatTornado (Web or Android APK), their device automatically publishes its ECDH P-256 public key so you can verify safety numbers and derive zero-knowledge keys.
                            </p>
                            <button
                                type="button"
                                onClick={handleRefreshKey}
                                disabled={refreshing}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold cursor-pointer transition-colors"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                                Check Peer Key Now
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Visual Fingerprint Matrix */}
                            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-black/40 border border-white/10 mb-4">
                                <div
                                    className="grid gap-[2px] p-2.5 rounded-xl bg-white"
                                    style={{ gridTemplateColumns: `repeat(17, minmax(0, 1fr))` }}
                                    aria-label="Safety Number Verification Visual Pattern"
                                >
                                    {matrix.flatMap((row, rIdx) =>
                                        row.map((filled, cIdx) => (
                                            <div
                                                key={`${rIdx}-${cIdx}`}
                                                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-[1px] ${
                                                    filled ? "bg-[#090d18]" : "bg-white"
                                                }`}
                                            />
                                        ))
                                    )}
                                </div>
                                <p className="text-[10px] font-mono text-white/40 mt-2.5">
                                    Device Fingerprint: {localIdentity?.fingerprint || "LOCAL"}
                                </p>
                            </div>

                            {/* 60-Digit Signal-style Grid */}
                            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-3.5 mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300/80 font-bold">
                                        60-Digit Safety Number
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-300 hover:text-white px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/25 cursor-pointer"
                                    >
                                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                        {copied ? "Copied" : "Copy"}
                                    </button>
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs sm:text-sm font-bold tracking-wider text-white/95 py-1">
                                    {(safety?.groups || []).map((grp, idx) => (
                                        <span key={idx} className="py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                                            {grp}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-[10px] text-white/45 mt-2.5 leading-snug">
                                    Compare these numbers with {peerUser.username} in person or on a call. If they match, P2P media transfers and encrypted chats are mathematically immune to MITM interception.
                                </p>
                            </div>

                            {/* Per-Chat Optional E2EE Text Mode Toggle */}
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 mb-4 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                        Zero-Knowledge E2EE Text Mode
                                    </p>
                                    <p className="text-[10px] text-white/45 mt-0.5 leading-snug">
                                        Encrypt outgoing DMs client-side with ECDH + AES-256-GCM before WebSocket transport.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={e2eeTextEnabled}
                                    onClick={() => {
                                        soundEngine?.play?.("quantum_ping");
                                        onToggleE2eeText?.(!e2eeTextEnabled);
                                    }}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                        e2eeTextEnabled ? "bg-emerald-500" : "bg-white/15"
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                                            e2eeTextEnabled ? "translate-x-5" : "translate-x-0"
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Primary Action: Mark / Unmark Verified */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleVerifyToggle}
                                    disabled={busy}
                                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                        status === "verified"
                                            ? "bg-emerald-500/15 hover:bg-rose-500/15 text-emerald-300 hover:text-rose-300 border border-emerald-500/35 hover:border-rose-500/35"
                                            : "bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                    }`}
                                >
                                    {status === "verified" ? (
                                        <>
                                            <ShieldCheck className="w-4 h-4" />
                                            <span>Verified Peer (Click to Unpin)</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            <span>Mark Peer as Verified</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

SafetyNumberModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    myUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    myUsername: PropTypes.string,
    localIdentity: PropTypes.object,
    peerUser: PropTypes.object,
    peerPubKey: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    trustState: PropTypes.object,
    onTrustUpdated: PropTypes.func,
    e2eeTextEnabled: PropTypes.bool,
    onToggleE2eeText: PropTypes.func,
    onRefreshPeerKey: PropTypes.func,
};

export default SafetyNumberModal;

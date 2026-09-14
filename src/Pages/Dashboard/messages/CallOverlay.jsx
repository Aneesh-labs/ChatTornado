import React, { useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";

const RINGING_STATUSES = new Set(["incoming", "outgoing", "ringing"]);

const getStatusText = (call, showConnected) => {
    if (call.status === "connected" && showConnected) {
        return "Connected";
    }
    switch (call.status) {
        case "incoming":
            return `Incoming ${call.video ? "Video" : "Voice"} Call`;
        case "outgoing":
            return "Calling...";
        case "ringing":
            return "Ringing...";
        case "connected":
            return "End-to-end encrypted";
        case "declined":
            return "Call declined";
        case "failed":
            return "Couldn't connect";
        case "ended":
            return "Call Ended";
        default:
            return "Connecting...";
    }
};

const getInitial = (username) => username?.trim()?.[0]?.toUpperCase() || "✦";

/* ==========================================================================
   SMALL HELPER COMPONENTS
   ========================================================================== */

const Icon = ({ path, className = "h-5 w-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

const ICONS = {
    decline: "M6 18L18 6M6 6l12 12",
    accept: "M5 13l4 4L19 7",
    mute: "M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z",
    unmute: "M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z",
    cameraOn: "M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z",
    cameraOff: "M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z",
    speaker: "M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z",
    endCall: "M15.73 5.25h1.5A2.25 2.25 0 0119.48 7.5v2.25a2.25 2.25 0 01-2.25 2.25h-1.5m-6.75 0H7.5A2.25 2.25 0 015.25 9.75V7.5a2.25 2.25 0 012.25-2.25h1.5m6.75 0v1.5a2.25 2.25 0 01-2.25 2.25h-1.5m-6.75 0v-1.5a2.25 2.25 0 012.25-2.25h1.5",
    lock: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 0h10.5a2.25 2.25 0 012.25 2.25v6.75a2.25 2.25 0 01-2.25 2.25H5.25a2.25 2.25 0 01-2.25-2.25v-6.75a2.25 2.25 0 012.25-2.25z",
    check: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    clock: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
};

/* ==========================================================================
   ANIMATED BACKGROUND — Soft floating glows (CSS only, no canvas)
   ========================================================================== */
const AnimatedBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Deep gradient base */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]" />

        {/* Soft radial glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/8 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/6 rounded-full blur-[96px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-[100px]" />

        {/* Subtle animated orbs */}
        <motion.div
            animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-1/3 w-64 h-64 bg-violet-500/5 rounded-full blur-[80px]"
        />
        <motion.div
            animate={{ y: [0, 15, 0], x: [0, -10, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-1/3 right-1/3 w-48 h-48 bg-blue-500/5 rounded-full blur-[60px]"
        />
    </div>
);

/* ==========================================================================
   AVATAR RING — Elegant animated ring while ringing
   ========================================================================== */
const AvatarRing = ({ isRinging, isConnected }) => {
    if (!isRinging && !isConnected) return null;

    return (
        <>
            {isRinging && (
                <>
                    <motion.div
                        animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.08, 0.3] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 rounded-full bg-violet-400/20"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.05, 0.2] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                        className="absolute -inset-3 rounded-full border border-violet-300/15"
                    />
                </>
            )}
            {isConnected && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 rounded-full border-2 border-emerald-400/40"
                    style={{ boxShadow: "0 0 20px rgba(52,211,153,0.15)" }}
                />
            )}
        </>
    );
};

/* ==========================================================================
   ACTION BUTTON — Premium glass button
   ========================================================================== */
const ActionButton = ({
    onClick,
    icon,
    label,
    isActive,
    activeColor = "rose",
    size = "md",
    autoFocus = false,
    ariaLabel,
    ariaPressed,
}) => {
    const sizeClasses = size === "lg"
        ? "h-16 w-16"
        : size === "md"
            ? "h-14 w-14"
            : "h-12 w-12";

    const activeStyles = isActive
        ? {
            background: `linear-gradient(135deg, ${activeColor === "rose" ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)"}, ${activeColor === "rose" ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)"})`,
            borderColor: activeColor === "rose" ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.4)",
            color: activeColor === "rose" ? "#f87171" : "#4ade80",
        }
        : {
            background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
            borderColor: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.7)",
        };

    return (
        <motion.button
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.92 }}
            onClick={onClick}
            autoFocus={autoFocus}
            aria-label={ariaLabel}
            aria-pressed={ariaPressed}
            className={`${sizeClasses} relative flex items-center justify-center rounded-2xl border backdrop-blur-xl transition-shadow`}
            style={{
                ...activeStyles,
                boxShadow: isActive
                    ? `0 8px 32px ${activeColor === "rose" ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)"}`
                    : "0 4px 16px rgba(0,0,0,0.2)",
            }}
        >
            <Icon path={icon} className="h-5 w-5" />
            {label && (
                <span className="absolute -bottom-5 text-[9px] font-medium text-white/40 whitespace-nowrap">
                    {label}
                </span>
            )}
        </motion.button>
    );
};

/* ==========================================================================
   END CALL BUTTON — Prominent, elegant
   ========================================================================== */
const EndCallButton = ({ onClick, autoFocus = false }) => (
    <motion.button
        whileHover={{ scale: 1.05, y: -1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        autoFocus={autoFocus}
        aria-label="End call"
        className="relative flex h-14 items-center gap-2.5 rounded-2xl px-7 text-sm font-semibold text-white"
        style={{
            background: "linear-gradient(135deg, #ef4444, #dc2626)",
            boxShadow: "0 8px 32px rgba(239,68,68,0.3), 0 2px 8px rgba(0,0,0,0.3)",
        }}
    >
        <Icon path={ICONS.endCall} className="h-4 w-4" />
        End
    </motion.button>
);

/* ==========================================================================
   MAIN CALLOVERLAY COMPONENT
   ========================================================================== */
const CallOverlay = ({
    call,
    onAccept = () => { },
    onReject = () => { },
    onHangup = () => { },
    onToggleMute = () => { },
    onToggleVideo = () => { },
    isMuted = false,
    isCameraOff = false,
}) => {
    const remoteVideo = useRef(null);
    const localVideo = useRef(null);
    const remoteAudio = useRef(null);

    const [callStartTime, setCallStartTime] = useState(null);
    const [callDuration, setCallDuration] = useState(0);
    const [showConnected, setShowConnected] = useState(false);
    const [showEnded, setShowEnded] = useState(false);

    /* ── Media stream attachment ──────────────────────────────────────── */
    useEffect(() => {
        if (remoteVideo.current && call?.remoteStream) {
            if (remoteVideo.current.srcObject !== call.remoteStream) {
                remoteVideo.current.srcObject = call.remoteStream;
            }
            remoteVideo.current.play().catch((e) => console.warn("Remote video auto-play prevented:", e));
        }
        if (localVideo.current && call?.localStream) {
            if (localVideo.current.srcObject !== call.localStream) {
                localVideo.current.srcObject = call.localStream;
            }
            localVideo.current.play().catch((e) => console.warn("Local video auto-play prevented:", e));
        }
        if (remoteAudio.current) {
            if (!call?.video && call?.remoteStream) {
                remoteAudio.current.srcObject = call.remoteStream;
                remoteAudio.current.play().catch(() => { });
            } else {
                remoteAudio.current.srcObject = null;
            }
        }
    }, [call?.remoteStream, call?.localStream, call?.video]);

    /* ── Timer & connected status (unchanged) ─────────────────────────── */
    useEffect(() => {
        if (call?.status !== "connected") {
            setCallStartTime(null);
            setCallDuration(0);
            setShowConnected(false);
            return;
        }
        setShowConnected(true);
        const connectedTimer = setTimeout(() => setShowConnected(false), 1000);
        const start = Date.now();
        setCallStartTime(start);
        const interval = setInterval(() => {
            setCallDuration(Math.floor((Date.now() - start) / 1000));
        }, 1000);
        return () => {
            clearTimeout(connectedTimer);
            clearInterval(interval);
        };
    }, [call?.status]);

    /* ── Ended state (unchanged) ──────────────────────────────────────── */
    useEffect(() => {
        if (call?.status === "ended" || call?.status === "declined") {
            setShowEnded(true);
            const timer = setTimeout(() => setShowEnded(false), 1000);
            return () => clearTimeout(timer);
        }
        setShowEnded(false);
    }, [call?.status]);

    /* ── Body scroll lock (unchanged) ─────────────────────────────────── */
    useEffect(() => {
        if (!call) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previousOverflow; };
    }, [call]);

    /* ── Keyboard shortcuts (unchanged) ───────────────────────────────── */
    useEffect(() => {
        if (!call) return;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                call.status === "incoming" ? onReject() : onHangup();
            } else if (event.key === "Enter" && call.status === "incoming") {
                event.preventDefault();
                onAccept();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [call, onAccept, onReject, onHangup]);

    const formatDuration = useCallback((seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }, []);

    if (!call) return null;

    const incoming = call.status === "incoming";
    const isRinging = RINGING_STATUSES.has(call.status) || !call.status;
    const isConnected = call.status === "connected";
    const isEnded = showEnded || call.status === "ended" || call.status === "declined";
    const avatar = call.user?.avatar;
    const isImageAvatar = typeof avatar === "string" && /^(https?:)?\/\//.test(avatar);

    if ((call.status === "ended" || call.status === "declined") && !showEnded) return null;

    const callType = call.video ? "Video Call" : "Voice Call";

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Call with ${call.user?.username || "unknown caller"}`}
            className="fixed inset-0 z-[100] flex items-center justify-center"
        >
            <AnimatedBackground />

            {/* Subtle vignette overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)] pointer-events-none" />

            <audio ref={remoteAudio} autoPlay playsInline hidden />

            {/* Remote video */}
            {call.video && (
                <motion.video
                    ref={remoteVideo}
                    autoPlay
                    playsInline
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ filter: "brightness(0.85) contrast(1.05)" }}
                />
            )}

            {/* Video overlay gradient for text readability */}
            {call.video && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40 pointer-events-none" />
            )}

            {/* Local preview */}
            {call.video && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                    className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6"
                >
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md shadow-2xl">
                        <video
                            ref={localVideo}
                            autoPlay
                            muted
                            playsInline
                            style={{ transform: "scaleX(-1)" }}
                            className="h-24 w-36 object-cover sm:h-32 sm:w-48"
                        />
                        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
                    </div>
                </motion.div>
            )}

            {/* Main card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative z-10 w-full max-w-sm mx-4"
            >
                <div
                    className="relative overflow-hidden rounded-[2rem] border backdrop-blur-2xl"
                    style={{
                        borderColor: isConnected ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.08)",
                        background: "linear-gradient(180deg, rgba(20,20,30,0.7) 0%, rgba(10,10,18,0.9) 100%)",
                        boxShadow: isConnected
                            ? "0 0 60px rgba(52,211,153,0.08), 0 25px 50px -12px rgba(0,0,0,0.5)"
                            : "0 0 60px rgba(139,92,246,0.06), 0 25px 50px -12px rgba(0,0,0,0.5)",
                    }}
                >
                    {/* Top subtle gradient line */}
                    <div
                        className="h-px w-full"
                        style={{
                            background: isConnected
                                ? "linear-gradient(90deg, transparent, rgba(52,211,153,0.4), transparent)"
                                : "linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)",
                        }}
                    />

                    <div className="relative px-8 py-12 sm:px-10 sm:py-14 text-center">
                        {/* Avatar */}
                        <div className="relative mx-auto mb-6 h-28 w-28">
                            <AvatarRing isRinging={isRinging} isConnected={isConnected} />

                            <motion.div
                                whileHover={{ scale: 1.03 }}
                                className="relative mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full"
                                style={{
                                    background: isImageAvatar
                                        ? "transparent"
                                        : "linear-gradient(135deg, #8b5cf6, #6366f1)",
                                    boxShadow: isConnected
                                        ? "0 0 30px rgba(52,211,153,0.15)"
                                        : "0 0 30px rgba(139,92,246,0.12)",
                                }}
                            >
                                {isImageAvatar ? (
                                    <img src={avatar} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold text-white/90">
                                        {avatar || getInitial(call.user?.username)}
                                    </span>
                                )}
                            </motion.div>
                        </div>

                        {/* Name */}
                        <motion.h2
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-2xl font-bold tracking-tight text-white"
                        >
                            {call.user?.username || "Unknown"}
                        </motion.h2>

                        {/* Call type */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.15 }}
                            className="mt-1 text-sm font-medium text-white/40"
                        >
                            {callType}
                        </motion.p>

                        {/* Status */}
                        <div className="mt-4 space-y-2" role="status" aria-live="polite">
                            <AnimatePresence mode="wait">
                                {showConnected ? (
                                    <motion.div
                                        key="connected"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="flex items-center justify-center gap-2"
                                    >
                                        <Icon path={ICONS.check} className="h-4 w-4 text-emerald-400" />
                                        <span className="text-sm font-semibold text-emerald-400">Connected</span>
                                    </motion.div>
                                ) : (
                                    <motion.p
                                        key="status"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className={`text-sm font-medium ${isConnected ? "text-emerald-400/70" : "text-white/50"
                                            }`}
                                    >
                                        {getStatusText(call, showConnected)}
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            {/* Encryption badge */}
                            {isConnected && !showConnected && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="flex items-center justify-center gap-1.5"
                                >
                                    <Icon path={ICONS.lock} className="h-3 w-3 text-emerald-400/60" />
                                    <span className="text-xs font-medium text-emerald-400/60">End-to-end encrypted</span>
                                </motion.div>
                            )}

                            {/* Timer */}
                            {isConnected && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="mt-3 flex items-center justify-center gap-2"
                                >
                                    <Icon path={ICONS.clock} className="h-4 w-4 text-white/30" />
                                    <span className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-white">
                                        {formatDuration(callDuration)}
                                    </span>
                                </motion.div>
                            )}
                        </div>

                        {/* Buttons */}
                        <div className="mt-10">
                            {incoming ? (
                                <div className="flex justify-center gap-6">
                                    <ActionButton
                                        onClick={onReject}
                                        icon={ICONS.decline}
                                        label="Decline"
                                        activeColor="rose"
                                        size="lg"
                                        autoFocus
                                        ariaLabel="Decline call"
                                    />
                                    <ActionButton
                                        onClick={onAccept}
                                        icon={ICONS.accept}
                                        label="Accept"
                                        activeColor="emerald"
                                        size="lg"
                                        ariaLabel="Accept call"
                                    />
                                </div>
                            ) : (
                                !isEnded && (
                                    <div className="flex flex-wrap items-center justify-center gap-4">
                                        <ActionButton
                                            onClick={onToggleMute}
                                            icon={isMuted ? ICONS.unmute : ICONS.mute}
                                            label={isMuted ? "Unmute" : "Mute"}
                                            isActive={isMuted}
                                            activeColor="rose"
                                            ariaLabel={isMuted ? "Unmute" : "Mute"}
                                            ariaPressed={isMuted}
                                        />

                                        {call.video && (
                                            <ActionButton
                                                onClick={onToggleVideo}
                                                icon={isCameraOff ? ICONS.cameraOff : ICONS.cameraOn}
                                                label={isCameraOff ? "Camera On" : "Camera Off"}
                                                isActive={isCameraOff}
                                                activeColor="rose"
                                                ariaLabel={isCameraOff ? "Turn camera on" : "Turn camera off"}
                                                ariaPressed={isCameraOff}
                                            />
                                        )}

                                        <ActionButton
                                            icon={ICONS.speaker}
                                            label="Speaker"
                                            ariaLabel="Speaker"
                                        />

                                        <EndCallButton
                                            onClick={onHangup}
                                            autoFocus={!isRinging}
                                        />
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

CallOverlay.propTypes = {
    call: PropTypes.shape({
        status: PropTypes.oneOf(["incoming", "outgoing", "ringing", "connected", "declined", "failed", "ended"]),
        video: PropTypes.bool,
        remoteStream: PropTypes.object,
        localStream: PropTypes.object,
        user: PropTypes.shape({
            username: PropTypes.string,
            avatar: PropTypes.string,
        }),
    }),
    onAccept: PropTypes.func,
    onReject: PropTypes.func,
    onHangup: PropTypes.func,
    onToggleMute: PropTypes.func,
    onToggleVideo: PropTypes.func,
    isMuted: PropTypes.bool,
    isCameraOff: PropTypes.bool,
};

export default CallOverlay;
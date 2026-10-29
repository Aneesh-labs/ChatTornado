import React, { useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { VOICE_FILTERS } from "../../../Services/audioVoiceFilters";

const RINGING_STATUSES = new Set(["incoming", "outgoing", "calling", "ringing", "call_waiting"]);

const getStatusText = (call, showConnected) => {
    if (call.status === "connected" && showConnected) {
        return "Connected";
    }
    if (call.isWaitingOnAnotherCall || call.status === "call_waiting") {
        return "🟡 On Another Call • Call Request Sent & Waiting...";
    }
    switch (call.status) {
        case "incoming":
            return `Incoming ${call.video ? "Video" : "Voice"} Call`;
        case "outgoing":
        case "calling":
            return "Calling...";
        case "ringing":
            return "Ringing...";
        case "call_waiting":
            return "🟡 On Another Call • Waiting for Answer...";
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
   ICONS HELPER
   ========================================================================== */

const Icon = ({ path, className = "h-5 w-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

Icon.propTypes = {
    path: PropTypes.string.isRequired,
    className: PropTypes.string,
};

const ICONS = {
    decline: "M6 18L18 6M6 6l12 12",
    accept: "M5 13l4 4L19 7",
    mute: "M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z",
    unmute: "M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z",
    cameraOn: "M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z",
    cameraOff: "m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L3.75 4.5M21 21 3 3m14.25 9.75v-3.5a2.25 2.25 0 0 0-2.25-2.25H9.75",
    speaker: "M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z",
    screenShare: "M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3",
    subtitles: "M7.5 8.25h9m-9 3H12m-4.5 3h9M3.75 3h16.5A2.25 2.25 0 0122.5 5.25v13.5A2.25 2.25 0 0120.25 21H3.75A2.25 2.25 0 011.5 18.75V5.25A2.25 2.25 0 013.75 3z",
    magicWand: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z",
    lock: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 0h10.5a2.25 2.25 0 012.25 2.25v6.75a2.25 2.25 0 01-2.25 2.25H5.25a2.25 2.25 0 01-2.25-2.25v-6.75a2.25 2.25 0 012.25-2.25z",
    check: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    clock: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
};

const AnimatedBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/8 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/6 rounded-full blur-[96px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-[100px]" />
    </div>
);

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

AvatarRing.propTypes = {
    isRinging: PropTypes.bool,
    isConnected: PropTypes.bool,
};

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
    const sizeClasses = size === "lg" ? "h-16 w-16" : size === "md" ? "h-14 w-14" : "h-12 w-12";
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
            aria-label={ariaLabel || label}
            aria-pressed={ariaPressed}
            className={`${sizeClasses} relative flex items-center justify-center rounded-2xl border backdrop-blur-xl transition-shadow cursor-pointer`}
            style={activeStyles}
        >
            <Icon path={icon} />
            <span className="sr-only">{label}</span>
        </motion.button>
    );
};

ActionButton.propTypes = {
    onClick: PropTypes.func,
    icon: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    isActive: PropTypes.bool,
    activeColor: PropTypes.string,
    size: PropTypes.string,
    autoFocus: PropTypes.bool,
    ariaLabel: PropTypes.string,
    ariaPressed: PropTypes.bool,
};

const EndCallButton = ({ onClick, autoFocus = false }) => (
    <motion.button
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.92 }}
        onClick={onClick}
        autoFocus={autoFocus}
        aria-label="End call"
        className="h-14 w-14 sm:h-16 sm:w-16 flex items-center justify-center rounded-2xl border bg-gradient-to-tr from-rose-600 to-red-500 border-rose-400/40 text-white shadow-xl shadow-rose-600/30 cursor-pointer"
    >
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 010-1.41C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
        </svg>
    </motion.button>
);

EndCallButton.propTypes = {
    onClick: PropTypes.func.isRequired,
    autoFocus: PropTypes.bool,
};

/* ==========================================================================
   MAIN CALLOVERLAY COMPONENT
   ========================================================================== */
export default function CallOverlay({
    call,
    onAccept = () => { },
    onReject = () => { },
    onHangup = () => { },
    onToggleMute = () => { },
    onToggleVideo = () => { },
    isMuted = false,
    isCameraOff = false,
    onSendVoicemail = null,
}) {
    const remoteVideo = useRef(null);
    const localVideo = useRef(null);
    const remoteAudio = useRef(null);

    const [callStartTime, setCallStartTime] = useState(null);
    const [callDuration, setCallDuration] = useState(0);
    const [showConnected, setShowConnected] = useState(false);
    const [showEnded, setShowEnded] = useState(false);
    const [ringingSeconds, setRingingSeconds] = useState(0);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);

    // Screen sharing
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const screenStreamRef = useRef(null);

    // Live Subtitles / Speech-to-Text
    const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
    const [liveSubtitles, setLiveSubtitles] = useState("");
    const recognitionRef = useRef(null);

    // Voice Morphing FX
    const [voiceFxOpen, setVoiceFxOpen] = useState(false);
    const [activeVoiceFilter, setActiveVoiceFilter] = useState("normal");

    // Inline 15s Voicemail Recorder
    const [isVoicemailRecording, setIsVoicemailRecording] = useState(false);
    const [voicemailTimeLeft, setVoicemailTimeLeft] = useState(15);
    const voicemailRecorderRef = useRef(null);
    const voicemailChunksRef = useRef([]);

    /* ── Track ringing seconds for 30s timeout tender notice ─────────── */
    useEffect(() => {
        if (!call || call?.status === "connected" || call?.status === "ended" || call?.status === "declined") {
            setRingingSeconds(0);
            return;
        }
        const interval = setInterval(() => {
            setRingingSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [call?.status, call]);

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

    /* ── Duration Timer ─────────────────────────────────────────────────── */
    useEffect(() => {
        if (call?.status !== "connected") {
            setCallStartTime(null);
            setCallDuration(0);
            setShowConnected(false);
            return;
        }
        setShowConnected(true);
        const connectedTimer = setTimeout(() => setShowConnected(false), 1200);
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

    /* ── Ended state ───────────────────────────────────────────────────── */
    useEffect(() => {
        if (call?.status === "ended" || call?.status === "declined") {
            setShowEnded(true);
            const timer = setTimeout(() => setShowEnded(false), 1200);
            return () => clearTimeout(timer);
        }
        setShowEnded(false);
    }, [call?.status]);

    /* ── Body scroll lock ──────────────────────────────────────────────── */
    useEffect(() => {
        if (!call) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previousOverflow; };
    }, [call]);

    /* ── Live Closed Captions / Subtitles ──────────────────────────────── */
    useEffect(() => {
        if (!subtitlesEnabled) {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch { }
                recognitionRef.current = null;
            }
            setLiveSubtitles("");
            return;
        }

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            setLiveSubtitles("(Live subtitles not supported in this browser)");
            return;
        }

        const recognizer = new SpeechRec();
        recognizer.continuous = true;
        recognizer.interimResults = true;
        recognizer.lang = "en-US";

        recognizer.onresult = (e) => {
            const transcript = Array.from(e.results)
                .map((r) => r[0].transcript)
                .join(" ");
            setLiveSubtitles(transcript.slice(-120)); // keep last 120 chars
        };

        recognizer.onerror = () => { };
        recognizer.onend = () => {
            if (subtitlesEnabled) {
                try { recognizer.start(); } catch { }
            }
        };

        try { recognizer.start(); } catch { }
        recognitionRef.current = recognizer;

        return () => {
            try { recognizer.stop(); } catch { }
        };
    }, [subtitlesEnabled]);

    /* ── Screen Sharing Handler ────────────────────────────────────────── */
    const handleToggleScreenShare = async () => {
        if (isScreenSharing) {
            // Stop screen sharing, restore camera
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach((t) => t.stop());
                screenStreamRef.current = null;
            }
            setIsScreenSharing(false);
            if (localVideo.current && call?.localStream) {
                localVideo.current.srcObject = call.localStream;
            }
            return;
        }

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            screenStreamRef.current = screenStream;
            setIsScreenSharing(true);

            if (localVideo.current) {
                localVideo.current.srcObject = screenStream;
            }

            screenStream.getVideoTracks()[0].onended = () => {
                handleToggleScreenShare();
            };
        } catch (err) {
            console.warn("Screen share cancelled or failed:", err);
            setIsScreenSharing(false);
        }
    };

    /* ── 15-Second Voicemail Recorder ──────────────────────────────────── */
    const startVoicemailRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            voicemailRecorderRef.current = recorder;
            voicemailChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) voicemailChunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                if (voicemailChunksRef.current.length > 0) {
                    const audioBlob = new Blob(voicemailChunksRef.current, { type: "audio/webm" });
                    onSendVoicemail?.(audioBlob, activeVoiceFilter);
                }
                onHangup();
            };

            recorder.start();
            setIsVoicemailRecording(true);
            setVoicemailTimeLeft(15);

            const timer = setInterval(() => {
                setVoicemailTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        if (recorder.state === "recording") recorder.stop();
                        setIsVoicemailRecording(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err) {
            console.error("Microphone access denied for voicemail:", err);
            onHangup();
        }
    };

    const stopVoicemailAndSend = () => {
        if (voicemailRecorderRef.current && voicemailRecorderRef.current.state === "recording") {
            voicemailRecorderRef.current.stop();
            setIsVoicemailRecording(false);
        }
    };

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
    const avatar = call.user?.avatar || call.user?.profile_pic;
    const isImageAvatar = typeof avatar === "string" && /^(https?:)?\/\//.test(avatar);

    if ((call.status === "ended" || call.status === "declined") && !showEnded) return null;

    const callType = call.video ? "HD Video Call" : "Studio Voice Call (48kHz)";

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Call with ${call.user?.username || "peer"}`}
            className="fixed inset-0 z-[100] flex items-center justify-center"
        >
            <AnimatedBackground />

            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />

            <audio ref={remoteAudio} autoPlay playsInline hidden />

            {/* Remote video stream */}
            {call.video && (
                <motion.video
                    ref={remoteVideo}
                    autoPlay
                    playsInline
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ filter: "brightness(0.9) contrast(1.05)" }}
                />
            )}

            {call.video && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/50 pointer-events-none" />
            )}

            {/* Local camera / screen preview */}
            {call.video && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                    className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6"
                >
                    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black/50 backdrop-blur-md shadow-2xl h-24 w-36 sm:h-32 sm:w-48 flex items-center justify-center">
                        <video
                            ref={localVideo}
                            autoPlay
                            muted
                            playsInline
                            style={{ transform: isScreenSharing ? "none" : "scaleX(-1)" }}
                            className={`h-full w-full object-cover transition-opacity duration-200 ${isCameraOff && !isScreenSharing ? "opacity-0" : "opacity-100"}`}
                        />
                        {isCameraOff && !isScreenSharing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/95 gap-1.5">
                                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white/60">
                                    <Icon path={ICONS.cameraOff} className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] text-white/50 font-medium">Camera Off</span>
                            </div>
                        )}
                        {isScreenSharing && (
                            <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-emerald-500/80 text-[9px] font-bold text-white uppercase tracking-wider">
                                Screen Sharing
                            </span>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Live Subtitles Floating Caption Bar */}
            {subtitlesEnabled && liveSubtitles && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-28 left-6 right-6 z-30 max-w-xl mx-auto p-3 rounded-2xl bg-black/75 border border-white/20 backdrop-blur-xl text-center"
                >
                    <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block mb-0.5">Live Captions</span>
                    <p className="text-sm font-medium text-white/95 leading-relaxed italic">
                        "{liveSubtitles}"
                    </p>
                </motion.div>
            )}

            {/* Main Interactive Call Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative z-10 w-full max-w-sm mx-4"
            >
                <div
                    className="relative overflow-hidden rounded-[2.5rem] border backdrop-blur-2xl p-8 sm:p-10 text-center"
                    style={{
                        borderColor: isConnected ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.1)",
                        background: "linear-gradient(180deg, rgba(20,20,32,0.85) 0%, rgba(10,10,18,0.95) 100%)",
                        boxShadow: isConnected
                            ? "0 0 70px rgba(52,211,153,0.12), 0 25px 50px -12px rgba(0,0,0,0.6)"
                            : "0 0 70px rgba(139,92,246,0.08), 0 25px 50px -12px rgba(0,0,0,0.6)",
                    }}
                >
                    {/* Top gradient highlight */}
                    <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{
                            background: isConnected
                                ? "linear-gradient(90deg, transparent, rgba(52,211,153,0.6), transparent)"
                                : "linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)",
                        }}
                    />

                    {/* Avatar with beacon */}
                    <div className="relative mx-auto mb-5 h-28 w-28">
                        <AvatarRing isRinging={isRinging} isConnected={isConnected} />
                        <motion.div
                            whileHover={{ scale: 1.03 }}
                            className="relative mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full shadow-2xl border border-white/20"
                            style={{
                                background: isImageAvatar
                                    ? "transparent"
                                    : "linear-gradient(135deg, #8b5cf6, #6366f1)",
                            }}
                        >
                            {isImageAvatar ? (
                                <img src={avatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-white/90">
                                    {getInitial(call.user?.username)}
                                </span>
                            )}
                        </motion.div>
                    </div>

                    {/* Caller Username */}
                    <h2 className="text-2xl font-bold tracking-tight text-white truncate">
                        {call.user?.username || "Peer User"}
                    </h2>

                    <p className="mt-1 text-xs font-semibold text-white/40 uppercase tracking-wider">
                        {callType}
                    </p>

                    {/* Status & Encryption */}
                    <div className="mt-4 space-y-2">
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
                                <p className={`text-sm font-medium ${isConnected ? "text-emerald-400/80" : "text-white/60"}`}>
                                    {getStatusText(call, showConnected)}
                                </p>
                            )}
                        </AnimatePresence>

                        {isConnected && !showConnected && (
                            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400/70">
                                <Icon path={ICONS.lock} className="h-3.5 w-3.5" />
                                <span>End-to-end encrypted (Opus 48kHz)</span>
                            </div>
                        )}

                        {isConnected && (
                            <div className="mt-3 flex items-center justify-center gap-2">
                                <Icon path={ICONS.clock} className="h-4 w-4 text-white/30" />
                                <span className="font-mono text-3xl font-bold tabular-nums text-white">
                                    {formatDuration(callDuration)}
                                </span>
                            </div>
                        )}

                        {/* Tender 30s Timeout Notice with Instant Voicemail */}
                        {ringingSeconds >= 30 && call?.status !== "connected" && call?.status !== "incoming" && !isVoicemailRecording && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-3.5 rounded-2xl bg-violet-950/60 border border-violet-500/30 text-center shadow-xl"
                            >
                                <p className="text-xs text-violet-200 font-medium">
                                    🌸 The person is not lifting right now.
                                </p>
                                <p className="text-[11px] text-white/50 mt-0.5">
                                    Record a 15-second voicemail or leave a message.
                                </p>
                                <div className="mt-3 flex items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={startVoicemailRecording}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 cursor-pointer"
                                    >
                                        <span>🎙️ Record Voicemail (15s)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onHangup}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium cursor-pointer"
                                    >
                                        Leave Message
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Voicemail Recording Modal State */}
                        {isVoicemailRecording && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-4 p-4 rounded-2xl bg-neutral-900 border border-emerald-500/40 text-center"
                            >
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                                    <span className="text-xs font-bold text-rose-300">Recording Voicemail...</span>
                                    <span className="font-mono text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">
                                        {voicemailTimeLeft}s
                                    </span>
                                </div>
                                <p className="text-[11px] text-white/60 mb-3">Speak your message now...</p>
                                <button
                                    type="button"
                                    onClick={stopVoicemailAndSend}
                                    className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-lg"
                                >
                                    ✓ Send Voicemail Note
                                </button>
                            </motion.div>
                        )}

                        {/* Call waiting status banner */}
                        {(call?.isWaitingOnAnotherCall || call?.status === "call_waiting") && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs text-center leading-relaxed"
                            >
                                <span>The other person is on a call. A call request has been sent and is waiting...</span>
                            </motion.div>
                        )}
                    </div>

                    {/* Controls Toolbar */}
                    <div className="mt-8">
                        {incoming ? (
                            <div className="flex justify-center gap-6">
                                <ActionButton
                                    onClick={onReject}
                                    icon={ICONS.decline}
                                    label="Decline"
                                    activeColor="rose"
                                    size="lg"
                                    autoFocus
                                />
                                <ActionButton
                                    onClick={onAccept}
                                    icon={ICONS.accept}
                                    label="Accept"
                                    activeColor="emerald"
                                    size="lg"
                                />
                            </div>
                        ) : (
                            !isEnded && (
                                <div className="flex flex-wrap items-center justify-center gap-3">
                                    {/* Mute Toggle */}
                                    <ActionButton
                                        onClick={onToggleMute}
                                        icon={isMuted ? ICONS.mute : ICONS.unmute}
                                        label={isMuted ? "Unmute" : "Mute"}
                                        isActive={isMuted}
                                        activeColor="rose"
                                    />

                                    {/* Speaker Toggle */}
                                    {!call.video && (
                                        <ActionButton
                                            onClick={() => {
                                                setIsSpeakerOn((prev) => {
                                                    const next = !prev;
                                                    if (remoteAudio.current) {
                                                        remoteAudio.current.volume = next ? 1.0 : 0.35;
                                                    }
                                                    return next;
                                                });
                                            }}
                                            icon={ICONS.speaker}
                                            label={isSpeakerOn ? "Speaker" : "Earpiece"}
                                            isActive={isSpeakerOn}
                                            activeColor="emerald"
                                        />
                                    )}

                                    {/* Video Camera Toggle */}
                                    {call.video && (
                                        <ActionButton
                                            onClick={onToggleVideo}
                                            icon={isCameraOff ? ICONS.cameraOff : ICONS.cameraOn}
                                            label={isCameraOff ? "Camera On" : "Camera Off"}
                                            isActive={isCameraOff}
                                            activeColor="rose"
                                        />
                                    )}

                                    {/* Screen Share Toggle */}
                                    {call.video && isConnected && (
                                        <ActionButton
                                            onClick={handleToggleScreenShare}
                                            icon={ICONS.screenShare}
                                            label="Share Screen"
                                            isActive={isScreenSharing}
                                            activeColor="emerald"
                                        />
                                    )}

                                    {/* Live Subtitles CC */}
                                    {isConnected && (
                                        <ActionButton
                                            onClick={() => setSubtitlesEnabled((prev) => !prev)}
                                            icon={ICONS.subtitles}
                                            label="Subtitles"
                                            isActive={subtitlesEnabled}
                                            activeColor="emerald"
                                        />
                                    )}

                                    {/* Voice FX Morphing Selector */}
                                    {isConnected && (
                                        <ActionButton
                                            onClick={() => setVoiceFxOpen((prev) => !prev)}
                                            icon={ICONS.magicWand}
                                            label="Voice FX"
                                            isActive={voiceFxOpen}
                                            activeColor="emerald"
                                        />
                                    )}

                                    {/* End Call */}
                                    <EndCallButton onClick={onHangup} autoFocus={!isRinging} />
                                </div>
                            )
                        )}

                        {/* Voice FX Morphing Drawer */}
                        {voiceFxOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-3 rounded-2xl bg-white/5 border border-white/10 text-left"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold text-white/90">🎙️ Live Voice FX</span>
                                    <button
                                        type="button"
                                        onClick={() => setVoiceFxOpen(false)}
                                        className="text-white/40 hover:text-white text-xs"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {VOICE_FILTERS.map((f) => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => setActiveVoiceFilter(f.id)}
                                            className={`p-2 rounded-xl text-center border text-[10px] font-semibold transition-all ${
                                                activeVoiceFilter === f.id
                                                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm"
                                                    : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10"
                                            }`}
                                        >
                                            <span className="text-sm block">{f.icon}</span>
                                            <span className="truncate block mt-0.5">{f.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

CallOverlay.propTypes = {
    call: PropTypes.object,
    onAccept: PropTypes.func,
    onReject: PropTypes.func,
    onHangup: PropTypes.func,
    onToggleMute: PropTypes.func,
    onToggleVideo: PropTypes.func,
    isMuted: PropTypes.bool,
    isCameraOff: PropTypes.bool,
    onSendVoicemail: PropTypes.func,
};

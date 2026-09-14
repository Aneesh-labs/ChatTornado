import React, { useState, useRef, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { IconBtn, useTheme } from "./constants";
import API from "../../../Services/API";
import { prepareP2PFile } from "../../../Services/p2p";
import { Shield, X } from "lucide-react";
import CyberShieldModal from "./CyberShieldModal";

const VIDEO_EXTENSIONS = /\.(mp4|mov|mkv|avi|webm|m4v|3gp|flv|mpeg|mpg|ts|mts|m2ts|wmv|asf|ogv|vob)$/i;

const ChatInput = React.memo(({ onSend, replyTo, onCancelReply, selectedUser, socket = null, disabled = false }) => {
    const theme = useTheme();
    const baseUrl = (API.defaults.baseURL || "").replace(/\/+$/, "");
    const [text, setText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const textareaRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const isSendingRef = useRef(false);
    const [shieldModalOpen, setShieldModalOpen] = useState(false);
    const [shieldOptions, setShieldOptions] = useState(null);

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);
    const streamRef = useRef(null);

    const sendStopTypingSignal = useCallback(() => {
        if (!isTyping) return;
        setIsTyping(false);
        if (socket?.readyState === WebSocket.OPEN && selectedUser?.id) {
            socket.send(JSON.stringify({ type: "typing_stop", receiver_id: selectedUser.id }));
        }
    }, [isTyping, socket, selectedUser?.id]);

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            stopRecording(false);
        };
    }, [selectedUser?.id]);

    const handleSend = useCallback(() => {
        if (isSendingRef.current) return;

        const trimmed = text.trim();
        if (!trimmed || disabled) return;

        isSendingRef.current = true;

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        sendStopTypingSignal();
        if (!onSend(trimmed, shieldOptions || {})) {
            isSendingRef.current = false;
            return;
        }
        setText("");
        setShieldOptions(null);
        if (textareaRef.current) textareaRef.current.style.height = "auto";

        setTimeout(() => {
            isSendingRef.current = false;
        }, 200);
    }, [text, onSend, sendStopTypingSignal, disabled]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            handleSend();
        }
    }, [handleSend]);

    const handleChange = (e) => {
        const val = e.target.value;
        setText(val);
        const el = textareaRef.current;
        if (el) {
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
        }
        if (socket?.readyState === WebSocket.OPEN && selectedUser?.id) {
            if (!val.trim()) {
                sendStopTypingSignal();
            } else {
                if (!isTyping) {
                    setIsTyping(true);
                    socket.send(JSON.stringify({ type: "typing_start", receiver_id: selectedUser.id }));
                }
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => sendStopTypingSignal(), 2500);
            }
        }
    };

    const canSend = text.trim().length > 0;

    const startRecording = async () => {
        if (disabled || isSendingRef.current) return;
        try {
            setUploadError("");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                if (audioChunksRef.current.length === 0) return;

                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

                // Only send if it wasn't cancelled
                if (streamRef.current !== "cancelled") {
                    await uploadVoiceNote(audioBlob);
                }

                // Cleanup
                stream.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);

            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Microphone access denied or error:", error);
            setUploadError("Microphone access denied.");
        }
    };

    const stopRecording = (cancel = false) => {
        if (!isRecording || !mediaRecorderRef.current) return;

        if (cancel) {
            streamRef.current = "cancelled";
        }

        mediaRecorderRef.current.stop();
        clearInterval(recordingTimerRef.current);
        setIsRecording(false);
        setRecordingDuration(0);
    };

    const uploadVoiceNote = async (audioBlob) => {
        setUploading(true);
        try {
            const file = new File([audioBlob], `Voice_Message_${Date.now()}.webm`, { type: "audio/webm" });
            const body = new FormData();
            body.append("file", file);

            const response = await API.post(
                `/uploads?token=${encodeURIComponent(sessionStorage.getItem("token") || "")}`,
                body
            );

            const data = response.data;
            const originalPath = ((data.original_url || data.url) || "").replace(/^\//, "");
            const originalUrl = `${baseUrl}/${originalPath}`;

            onSend(`🎤 Voice Message\n${originalUrl}`, shieldOptions || {});

        } catch (error) {
            console.error("Voice note upload failed", error);
            setUploadError("Failed to upload voice message.");
        } finally {
            setUploading(false);
        }
    };

    const handleAttachment = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !selectedUser || disabled) return;
        setUploadError("");
        setUploading(true);

        try {
            const isVideo = Boolean(file.type?.startsWith("video/") || VIDEO_EXTENSIONS.test(file.name || ""));

            // 1. Heavy Photos & Documents: Use Pure P2P Zero-Server Transfer (IndexedDB)
            if (!isVideo) {
                const p2pPayload = await prepareP2PFile(file, selectedUser.id, socket);
                onSend(p2pPayload, shieldOptions || {});
                setShieldOptions(null);
                return;
            }

            // 2. Videos: Use FastAPI FFmpeg transcoding & WebP thumbnail generation pipeline
            const body = new FormData();
            body.append("file", file);

            const response = await API.post(
                `/uploads?token=${encodeURIComponent(sessionStorage.getItem("token") || "")}`,
                body
            );

            const data = response.data;
            const originalPath = ((data.original_url || data.url) || "").replace(/^\//, "");
            const originalUrl = `${baseUrl}/${originalPath}`;

            onSend(`📎 ${data.name}\n${originalUrl}`, shieldOptions || {});
            setShieldOptions(null);

        } catch (error) {
            console.error("Attachment failed", error);
            setUploadError(error.response?.data?.detail || "Attachment failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    return (
        <div className={`px-2 sm:px-4 py-2 sm:py-3 border-t ${theme.border} bg-black/25 backdrop-blur-2xl flex-shrink-0 w-full select-none safe-area-bottom`}>
            <AnimatePresence>
                {replyTo && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`flex items-start gap-2 px-3 py-2 mb-2 rounded-xl ${theme.glass} border ${theme.border} text-xs`}
                    >
                        <div className={`w-0.5 self-stretch rounded-full bg-gradient-to-b ${theme.accent}`} />
                        <div className="flex-1 min-w-0">
                            <p className={`text-[10px] font-semibold ${theme.accentText} mb-0.5`}>
                                Replying to {selectedUser?.username || "User"}
                            </p>
                            <p className="text-[11px] text-white/40 truncate">{replyTo.content || replyTo.message}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onCancelReply}
                            className="text-white/25 hover:text-white/60 transition-colors touch-manipulation p-1"
                            aria-label="Cancel reply"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {shieldOptions && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${shieldOptions.shield_mode === 'timelock' ? 'bg-violet-900/30 border-violet-500/50 text-violet-300' : 'bg-cyan-900/30 border-cyan-500/50 text-cyan-300'}`}
                    >
                        <Shield size={14} />
                        <div className="flex-1 font-medium">
                            {shieldOptions.shield_mode === 'timelock' ? 'Capsule Active (Timelocked)' : 'Laser Reveal Active'}
                        </div>
                        <button onClick={() => setShieldOptions(null)} className="opacity-50 hover:opacity-100 p-1">
                            <X size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-end gap-1.5 sm:gap-2 max-w-full">
                {isRecording ? (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`flex-1 flex items-center justify-between gap-1.5 ${theme.input} border border-red-500/50 rounded-2xl px-4 py-2 sm:py-2.5 bg-red-500/10 h-10`}
                    >
                        <div className="flex items-center gap-3">
                            <motion.div
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                            />
                            <span className="text-sm font-medium text-red-400 font-mono tracking-wider">{formatDuration(recordingDuration)}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => stopRecording(true)}
                            className="text-white/50 hover:text-red-400 transition-colors text-xs font-semibold uppercase tracking-wider"
                        >
                            Cancel
                        </button>
                    </motion.div>
                ) : (
                    <>
                        <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,audio/*,.pdf,.zip,.txt" onChange={handleAttachment} />
                        <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,audio/*,.mkv,.avi,.mov,.mp4,.webm,.m4v,.flv,.3gp,.pdf,.zip,.txt" onChange={handleAttachment} />

                        <div className="flex gap-1 flex-shrink-0">
                            <IconBtn title="Attach image, video, or file" onClick={() => fileInputRef.current?.click()} small>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            </IconBtn>

                            <IconBtn
                                title="Cyber Shield (Laser Scan & Timelocked Capsules)"
                                onClick={() => setShieldModalOpen(true)}
                                small
                                className={`transition-all ${shieldOptions
                                    ? (shieldOptions.shield_mode === 'timelock'
                                        ? '!text-violet-400 bg-violet-500/20 border border-violet-500/50 shadow-[0_0_12px_rgba(139,92,246,0.5)]'
                                        : '!text-cyan-400 bg-cyan-500/20 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.5)]')
                                    : 'text-cyan-400/70 hover:!text-cyan-300 hover:bg-cyan-500/10'
                                    }`}
                            >
                                <Shield className="w-4 h-4" />
                            </IconBtn>
                        </div>

                        <div className={`flex-1 flex items-end gap-1.5 ${theme.input} border rounded-2xl px-3 py-2 sm:py-2.5 focus-within:border-white/20 transition-all duration-200 min-w-0`}>
                            <textarea
                                ref={textareaRef}
                                rows={1}
                                value={text}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                disabled={disabled}
                                placeholder="Message…"
                                aria-label="Write a direct message"
                                className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/20 outline-none resize-none leading-relaxed max-h-[120px] min-h-[22px]"
                            />
                            <button
                                type="button"
                                className="text-white/25 hover:text-white/50 transition-colors flex-shrink-0 focus:outline-none touch-manipulation"
                                aria-label="Insert emoji"
                                onClick={() => setEmojiOpen((open) => !open)}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                            {emojiOpen && (
                                <div className="absolute bottom-14 right-0 z-30 flex gap-1 rounded-2xl border border-white/10 bg-neutral-900 p-2 shadow-2xl">
                                    {["🙂", "😂", "❤️", "🔥", "👍", "✨", "😎", "😡"].map((emoji) => <button key={emoji} type="button" className="p-1 text-lg" onClick={() => { setText((value) => `${value}${emoji}`); setEmojiOpen(false); }}>{emoji}</button>)}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {isRecording ? (
                    <motion.button
                        key="send-audio"
                        type="button"
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        onClick={() => stopRecording(false)}
                        whileTap={{ scale: 0.92 }}
                        className={`w-10 h-10 rounded-xl bg-red-500/20 text-red-500 border border-red-500/50 flex items-center justify-center shadow-lg flex-shrink-0 focus:outline-none touch-manipulation`}
                        aria-label="Send audio message"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </motion.button>
                ) : canSend ? (
                    <motion.button
                        key="send-text"
                        type="button"
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        onClick={handleSend}
                        disabled={disabled || isSendingRef.current}
                        whileTap={{ scale: 0.92 }}
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.accent} flex items-center justify-center shadow-lg flex-shrink-0 focus:outline-none touch-manipulation ${disabled || isSendingRef.current ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label="Send message"
                    >
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                    </motion.button>
                ) : (
                    <motion.button
                        key="record-audio"
                        type="button"
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        onClick={startRecording}
                        disabled={disabled || isSendingRef.current}
                        whileTap={{ scale: 0.92 }}
                        className={`w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center shadow-lg flex-shrink-0 focus:outline-none touch-manipulation transition-colors ${disabled || isSendingRef.current ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label="Record voice message"
                    >
                        <svg className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </motion.button>
                )}
            </div>
            {(uploading || uploadError) && <p className={`mt-1 text-[10px] ${uploadError ? "text-rose-300" : "text-violet-300"}`}>{uploadError || "Uploading securely…"}</p>}

            <CyberShieldModal
                isOpen={shieldModalOpen}
                onClose={() => setShieldModalOpen(false)}
                onApply={(opts) => setShieldOptions(opts)}
            />
        </div>
    );
});

ChatInput.displayName = "ChatInput";

ChatInput.propTypes = {
    onSend: PropTypes.func.isRequired,
    onCancelReply: PropTypes.func.isRequired,
    replyTo: PropTypes.object,
    selectedUser: PropTypes.object,
    socket: PropTypes.object,
    disabled: PropTypes.bool,
};

export default ChatInput;
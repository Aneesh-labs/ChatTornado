import React, { useState, useRef, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { IconBtn, useTheme } from "./constants";
import API from "../../../Services/API";

const ChatInput = React.memo(({ onSend, replyTo, onCancelReply, selectedUser, socket = null, disabled = false }) => {
    const theme = useTheme();
    const baseUrl = API.defaults.baseURL.replace(/\/+$/, "");
    const [text, setText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const textareaRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const isSendingRef = useRef(false); // ✅ ADD THIS

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
        };
    }, [selectedUser?.id]);

    const handleSend = useCallback(() => {
        // ✅ Prevent double sends
        if (isSendingRef.current) return;

        const trimmed = text.trim();
        if (!trimmed || disabled) return;

        isSendingRef.current = true;

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        sendStopTypingSignal();
        if (!onSend(trimmed)) {
            isSendingRef.current = false;
            return;
        }
        setText("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";

        // ✅ Unlock after a short delay
        setTimeout(() => {
            isSendingRef.current = false;
        }, 200);
    }, [text, onSend, sendStopTypingSignal, disabled]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation(); // ✅ ADD THIS
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

    const handleAttachment = async (event) => {
        console.log("📎 handleAttachment started");
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !selectedUser || disabled) return;
        console.log("📎 handleAttachment started");
        setUploadError("");
        setUploading(true);
        try {
            const body = new FormData();
            body.append("file", file);
            let data;

            try {
                const response = await API.post(
                    `/uploads?token=${encodeURIComponent(sessionStorage.getItem("token") || "")}`,
                    body
                );

                data = response.data;
                console.log("✅ Upload request completed");
            } catch (err) {
                console.error("❌ API.post failed", err);
                console.error("Response:", err.response);
                console.error("Request:", err.request);
                throw err;
            }
            // 🔍 Debug: See what backend returns
            console.log("🔍 Raw data from backend:", data);
            console.log("🔍 data.url:", data.url);

            // ✅ BUILD FULL URL FROM RELATIVE PATH
            const previewPath = (data.preview_url || data.url).replace(/^\//, "");
            const previewUrl = `${baseUrl}/${previewPath}`;

            const originalPath = (data.original_url || data.url).replace(/^\//, "");
            const originalUrl = `${baseUrl}/${originalPath}`;

            const urlToSend =
                data.content_type?.startsWith("video/")
                    ? originalUrl
                    : previewUrl;

            console.log("content_type:", data.content_type);
            console.log("previewUrl:", previewUrl);
            console.log("originalUrl:", originalUrl);
            console.log("urlToSend:", urlToSend);

            onSend(`📎 ${data.name}\n${urlToSend}`);

        } catch (error) {
            console.error("Upload failed", error);
            setUploadError(error.response?.data?.detail || "Upload failed. Check that the FastAPI server was restarted.");
        } finally {
            setUploading(false);
        }
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

            <div className="flex items-end gap-1.5 sm:gap-2 max-w-full">
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,audio/*,.pdf,.zip,.txt" onChange={handleAttachment} />
                <IconBtn title="Attach image, video, or file" onClick={() => fileInputRef.current?.click()} small className="flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                </IconBtn>

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

                {/* Send button - always visible when text exists */}
                <motion.button
                    key="send"
                    type="button"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    onClick={handleSend}
                    disabled={!canSend || disabled || isSendingRef.current} // ✅ Disable while sending
                    whileTap={{ scale: 0.92 }}
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.accent} flex items-center justify-center shadow-lg flex-shrink-0 focus:outline-none touch-manipulation ${!canSend || disabled || isSendingRef.current ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label="Send message"
                >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                </motion.button>
            </div>
            {(uploading || uploadError) && <p className={`mt-1 text-[10px] ${uploadError ? "text-rose-300" : "text-violet-300"}`}>{uploadError || "Uploading securely…"}</p>}
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
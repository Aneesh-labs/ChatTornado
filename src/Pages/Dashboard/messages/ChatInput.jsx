import React, { useState, useRef, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { IconBtn, useTheme } from "./constants";
import API from "../../../Services/API";
import { prepareP2PFile } from "../../../Services/p2p";
import { Shield, X, Gamepad2, Volume2, Mic, MicOff, MoreVertical, Sparkles, Wand2, RefreshCw } from "lucide-react";
import CyberShieldModal from "./CyberShieldModal";
import InChatGameModal from "./InChatGameModal";
import SoundboardModal from "./SoundboardModal";
import { isAdminUnlocked, touchAdminSession } from "../../../utils/adminSession";

const VIDEO_EXTENSIONS = /\.(mp4|mov|mkv|avi|webm|m4v|3gp|flv|mpeg|mpg|ts|mts|m2ts|wmv|asf|ogv|vob)$/i;

const ChatInput = React.memo(({ onSend, replyTo, onCancelReply, selectedUser, socket = null, disabled = false, aiMode }) => {
    const theme = useTheme();
    const baseUrl = (API.defaults.baseURL || "").replace(/\/+$/, "");
    const [text, setText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const isTypingRef = useRef(false);
    const textareaRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [showMoreOptions, setShowMoreOptions] = useState(false);
    const isSendingRef = useRef(false);
    const [shieldModalOpen, setShieldModalOpen] = useState(false);
    const [shieldOptions, setShieldOptions] = useState(null);
    const [gameModalOpen, setGameModalOpen] = useState(false);
    const [soundboardModalOpen, setSoundboardModalOpen] = useState(false);
    const [showToneMenu, setShowToneMenu] = useState(false);
    const [isPolishing, setIsPolishing] = useState(false);

    const handlePolish = useCallback(async (toneKey) => {
        if (!text.trim() || isPolishing) return;
        setIsPolishing(true);
        setShowToneMenu(false);
        const token = sessionStorage.getItem("token");
        try {
            if (toneKey === "clean") {
                const res = await fetch(API.defaults.baseURL + "/ai_cleanup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify({ text, token })
                });
                const data = await res.json();
                if (data.success && data.cleaned_text) {
                    setText(data.cleaned_text);
                }
            } else {
                const res = await API.post("/api/ai/polish", { text, tone: toneKey }, { params: { token } });
                if (res.data?.status === "success" && res.data.polished) {
                    setText(res.data.polished);
                }
            }
        } catch (err) {
            console.warn("AI polish failed:", err);
        } finally {
            setIsPolishing(false);
        }
    }, [text, isPolishing]);

    // Audio recording state (Voice Notes)
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);
    const streamRef = useRef(null);

    // Voice-to-Text (Speech Recognition) state
    const [isListening, setIsListening] = useState(false);
    const [editModeId, setEditModeId] = useState(null);
    const recognitionRef = useRef(null);

    // Listen for edit custom event
    useEffect(() => {
        const handleEditEvent = (e) => {
            const msg = e.detail;
            if (msg && msg.id && msg.message) {
                setEditModeId(msg.id);
                setText(msg.message);
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.focus();
                    }
                }, 100);
            }
        };
        window.addEventListener('edit_message', handleEditEvent);
        return () => window.removeEventListener('edit_message', handleEditEvent);
    }, []);
    const baseTextRef = useRef("");

    const toggleSpeechToText = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-US";

            baseTextRef.current = text ? (text.endsWith(" ") ? text : text + " ") : "";

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onresult = (event) => {
                let interimTranscript = "";
                let finalTranscript = "";

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                const currentTranscript = finalTranscript || interimTranscript;
                if (currentTranscript) {
                    const newText = baseTextRef.current + currentTranscript;
                    setText(newText);
                    if (textareaRef.current) {
                        textareaRef.current.style.height = "auto";
                        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
                    }
                }
            };

            recognition.onerror = (event) => {
                console.warn("[SpeechRecognition error]", event.error);
                if (event.error !== "no-speech") {
                    setIsListening(false);
                }
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.error("Failed to start speech recognition:", err);
            setIsListening(false);
        }
    }, [isListening, text]);

    const sendStopTypingSignal = useCallback(() => {
        if (!isTypingRef.current) return;
        isTypingRef.current = false;
        setIsTyping(false);
        if (socket?.readyState === WebSocket.OPEN && selectedUser?.id) {
            socket.send(JSON.stringify({ type: "typing_stop", receiver_id: selectedUser.id }));
        }
    }, [socket, selectedUser?.id]);

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            sendStopTypingSignal();
            stopRecording(false);
            recognitionRef.current?.stop();
        };
    }, [selectedUser?.id, sendStopTypingSignal]);

    const handleSend = useCallback(async () => {
        if (isSendingRef.current) return;

        const trimmed = text.trim();
        if (!trimmed || disabled) return;

        isSendingRef.current = true;

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        sendStopTypingSignal();

        if (editModeId) {
            const token = sessionStorage.getItem("token");
            fetch(`${API.defaults.baseURL}/edit_message/${editModeId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ new_text: trimmed })
            }).then(() => {
                setEditModeId(null);
                setText("");
                if (textareaRef.current) textareaRef.current.style.height = "auto";
                isSendingRef.current = false;
            }).catch(() => {
                isSendingRef.current = false;
            });
            return;
        }

        let activeInputMode = aiMode;
        if (isAdminUnlocked()) {
            activeInputMode = "ADMIN";
            touchAdminSession();
        } else if (activeInputMode === "ADMIN") {
            activeInputMode = "DEFAULT";
        }

        // ─── ADMIN DIRECT DISPATCH & DELETION ──────────────────────────────
        // If in admin mode, try to parse a dispatch or delete command and POST directly
        // to the REST endpoint — no LLM involved at all.
        if (activeInputMode === "ADMIN") {
            const deleteIdPattern = /^(?:please\s+)?(?:delete|remove|erase)\s+(?:message|msg)?\s*#?(\d+)$/i;
            const deleteAllPattern = /^(?:please\s+)?(?:delete|remove|erase|clear|wipe)\s+(?:all\s+)?messages?\s+(?:with|to|from|for)\s+([a-zA-Z0-9_\-.]+)$/i;
            const deleteLastPattern = /^(?:please\s+)?(?:delete|remove|erase)\s+(?:the\s+)?last\s+(?:message|msg|text)(?:\s+(?:with|to|from|for)\s+([a-zA-Z0-9_\-.]+))?$/i;
            const deleteTextPattern = /^(?:please\s+)?(?:delete|remove|erase)\s+(?:message|msg|text)\s+(?:saying|containing|with text)\s+["'`]?(.+?)["'`]?$/i;
            const dispatchPattern = /^(?:please\s+)?(?:send(?:\s+a)?\s+(?:message|text)\s+to|send\s+to|text|msg|tell|broadcast\s+to|message)\s+([a-zA-Z0-9_\-.]+)(?:\s+(?:saying|that|:|-))?(.+)$/i;

            const token = sessionStorage.getItem("token");
            const baseUrl = (API.defaults.baseURL || "").replace(/\/+$/, "");

            // 1. DELETE BY ID
            const delIdMatch = trimmed.match(deleteIdPattern);
            if (delIdMatch) {
                const messageId = parseInt(delIdMatch[1], 10);
                try {
                    const res = await fetch(`${baseUrl}/api/admin/delete`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token, message_id: messageId, mode: "id" })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        onSend(`🗑️ **Deleted message #${messageId}** (${data.target || "User"}): "${data.preview || ''}"`, { ai_mode: "ADMIN", _admin_confirm: true });
                    } else {
                        onSend(`⚠️ Delete failed: ${data.detail || "Unknown error"}`, { ai_mode: "ADMIN", _admin_confirm: true });
                    }
                } catch (err) {
                    onSend(`⚠️ Delete error: ${err.message}`, { ai_mode: "ADMIN", _admin_confirm: true });
                }
                setText("");
                setShieldOptions(null);
                if (textareaRef.current) textareaRef.current.style.height = "auto";
                setTimeout(() => { isSendingRef.current = false; }, 200);
                return;
            }

            // 2. DELETE ALL MESSAGES WITH USER
            const delAllMatch = trimmed.match(deleteAllPattern);
            if (delAllMatch) {
                const targetName = delAllMatch[1].trim();
                try {
                    const res = await fetch(`${baseUrl}/api/admin/delete`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token, target: targetName, mode: "all" })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        onSend(`🗑️ **Deleted all ${data.deleted_count} messages** with **${targetName}**.`, { ai_mode: "ADMIN", _admin_confirm: true });
                    } else {
                        onSend(`⚠️ Delete failed: ${data.detail || "Unknown error"}`, { ai_mode: "ADMIN", _admin_confirm: true });
                    }
                } catch (err) {
                    onSend(`⚠️ Delete error: ${err.message}`, { ai_mode: "ADMIN", _admin_confirm: true });
                }
                setText("");
                setShieldOptions(null);
                if (textareaRef.current) textareaRef.current.style.height = "auto";
                setTimeout(() => { isSendingRef.current = false; }, 200);
                return;
            }

            // 3. DELETE LAST MESSAGE (TO USER OR GLOBALLY)
            const delLastMatch = trimmed.match(deleteLastPattern);
            if (delLastMatch) {
                const targetName = delLastMatch[1] ? delLastMatch[1].trim() : null;
                try {
                    const res = await fetch(`${baseUrl}/api/admin/delete`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token, target: targetName, mode: "last" })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        onSend(`🗑️ **Deleted last message #${data.message_id}** with **${data.target || 'User'}**: "${data.preview || ''}"`, { ai_mode: "ADMIN", _admin_confirm: true });
                    } else {
                        onSend(`⚠️ Delete failed: ${data.detail || "Unknown error"}`, { ai_mode: "ADMIN", _admin_confirm: true });
                    }
                } catch (err) {
                    onSend(`⚠️ Delete error: ${err.message}`, { ai_mode: "ADMIN", _admin_confirm: true });
                }
                setText("");
                setShieldOptions(null);
                if (textareaRef.current) textareaRef.current.style.height = "auto";
                setTimeout(() => { isSendingRef.current = false; }, 200);
                return;
            }

            // 4. DELETE BY TEXT CONTENT
            const delTextMatch = trimmed.match(deleteTextPattern);
            if (delTextMatch) {
                const queryText = delTextMatch[1].trim();
                try {
                    const res = await fetch(`${baseUrl}/api/admin/delete`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token, text_query: queryText, mode: "text" })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        onSend(`🗑️ **Deleted matching message #${data.message_id}** with **${data.target || 'User'}**: "${data.preview || ''}"`, { ai_mode: "ADMIN", _admin_confirm: true });
                    } else {
                        onSend(`⚠️ Delete failed: ${data.detail || "Unknown error"}`, { ai_mode: "ADMIN", _admin_confirm: true });
                    }
                } catch (err) {
                    onSend(`⚠️ Delete error: ${err.message}`, { ai_mode: "ADMIN", _admin_confirm: true });
                }
                setText("");
                setShieldOptions(null);
                if (textareaRef.current) textareaRef.current.style.height = "auto";
                setTimeout(() => { isSendingRef.current = false; }, 200);
                return;
            }

            // 5. DISPATCH MESSAGE
            const match = trimmed.match(dispatchPattern);
            if (match) {
                const targetName = match[1].trim();
                const msgBody = match[2].trim();
                console.log(`%c👑 [ADMIN_DISPATCH] Frontend intercepted! target='${targetName}' | msg='${msgBody}'`,
                    "background: #f59e0b; color: black; font-weight: bold; padding: 2px 6px; border-radius: 3px;");

                try {
                    const res = await fetch(`${baseUrl}/api/admin/dispatch`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token, target: targetName, message: msgBody })
                    });
                    const data = await res.json();

                    if (res.ok) {
                        console.log(`%c👑 [ADMIN_DISPATCH SUCCESS] msg_id=${data.message_id} → ${data.to}`,
                            "background: #059669; color: white; font-weight: bold; padding: 2px 6px;");
                        onSend(`✅ Message dispatched to **${data.to}**: "${msgBody}"`, { ai_mode: "ADMIN", _admin_confirm: true });
                    } else {
                        console.error("[ADMIN_DISPATCH ERROR]", data);
                        onSend(`⚠️ Dispatch failed: ${data.detail || "Unknown error"}`, { ai_mode: "ADMIN", _admin_confirm: true });
                    }
                } catch (err) {
                    console.error("[ADMIN_DISPATCH FETCH ERROR]", err);
                    onSend(`⚠️ Network error during dispatch: ${err.message}`, { ai_mode: "ADMIN", _admin_confirm: true });
                }

                setText("");
                setShieldOptions(null);
                if (textareaRef.current) textareaRef.current.style.height = "auto";
                setTimeout(() => { isSendingRef.current = false; }, 200);
                return;  // ← DO NOT fall through to LLM
            }
        }
        // ──────────────────────────────────────────────────────────────────────

        if (!onSend(trimmed, { ...(shieldOptions || {}), ai_mode: activeInputMode })) {
            isSendingRef.current = false;
            return;
        }
        setText("");
        setShieldOptions(null);
        if (textareaRef.current) textareaRef.current.style.height = "auto";

        setTimeout(() => {
            isSendingRef.current = false;
        }, 200);
    }, [text, disabled, onSend, shieldOptions, editModeId, sendStopTypingSignal, aiMode]);


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
                if (!isTypingRef.current) {
                    isTypingRef.current = true;
                    setIsTyping(true);
                    socket.send(JSON.stringify({ type: "typing_start", receiver_id: selectedUser.id }));
                }
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                    sendStopTypingSignal();
                }, 2500);
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

            onSend(`🎤 Voice Message\n${originalUrl}`, { ...(shieldOptions || {}), ai_mode: aiMode });

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
                onSend(p2pPayload, { ...(shieldOptions || {}), ai_mode: aiMode });
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

            onSend(`📎 ${data.name}\n${originalUrl}`, { ...(shieldOptions || {}), ai_mode: aiMode });
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

            <AnimatePresence>
                {isListening && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 w-fit"
                    >
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                        <span className="font-medium font-mono text-[11px]">Listening… speak into your microphone</span>
                        <button
                            type="button"
                            onClick={toggleSpeechToText}
                            className="ml-2 px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-bold uppercase tracking-wider transition-colors"
                        >
                            Done
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {Boolean(selectedUser?.is_bot || selectedUser?.username === "VORTEX-9") && !isRecording && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none mb-1 text-xs">
                    <button
                        type="button"
                        onClick={() => {
                            setText((prev) => prev.startsWith("/image ") ? prev : "/image ");
                            textareaRef.current?.focus();
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-medium transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                    >
                        <span>🎨</span>
                        <span>/image</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setText("Search the web for ");
                            textareaRef.current?.focus();
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 font-medium transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                    >
                        <span>🌐</span>
                        <span>Search Web</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setText("Brainstorm 3 creative ideas for ");
                            textareaRef.current?.focus();
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 font-medium transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                    >
                        <span>💡</span>
                        <span>Brainstorm</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setText("Explain simply how ");
                            textareaRef.current?.focus();
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                    >
                        <span>⚡</span>
                        <span>Explain simply</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setText("Write code for ");
                            textareaRef.current?.focus();
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                    >
                        <span>💻</span>
                        <span>Code</span>
                    </button>
                </div>
            )}

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
                        <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,audio/*,.mkv,.avi,.mov,.mp4,.webm,.m4v,.flv,.3gp,.pdf,.zip,.txt" onChange={handleAttachment} />

                        <div className="flex gap-1 flex-shrink-0 items-center">
                            <IconBtn title="More options" onClick={() => setShowMoreOptions(!showMoreOptions)} small className={showMoreOptions ? "bg-white/10" : ""}>
                                <MoreVertical className="w-4 h-4" />
                            </IconBtn>

                            <AnimatePresence>
                                {showMoreOptions && (
                                    <motion.div
                                        initial={{ opacity: 0, width: 0, x: -10 }}
                                        animate={{ opacity: 1, width: "auto", x: 0 }}
                                        exit={{ opacity: 0, width: 0, x: -10 }}
                                        className="flex gap-1 overflow-hidden"
                                    >
                                        <IconBtn title="Attach image, video, or file" onClick={() => fileInputRef.current?.click()} small className="shrink-0">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                            </svg>
                                        </IconBtn>

                                        <IconBtn
                                            title="Play In-Chat Games (Tic-Tac-Toe, RPS, Connect 4)"
                                            onClick={() => setGameModalOpen(true)}
                                            small
                                            className="text-amber-400/80 hover:!text-amber-300 hover:bg-amber-500/10 shrink-0"
                                        >
                                            <Gamepad2 className="w-4 h-4" />
                                        </IconBtn>

                                        <IconBtn
                                            title="Fun Soundboard & Cartoon Sounds"
                                            onClick={() => setSoundboardModalOpen(true)}
                                            small
                                            className="text-fuchsia-400/80 hover:!text-fuchsia-300 hover:bg-fuchsia-500/10 shrink-0"
                                        >
                                            <Volume2 className="w-4 h-4" />
                                        </IconBtn>

                                        <IconBtn
                                            title="Cyber Shield (Laser Scan & Timelocked Capsules)"
                                            onClick={() => setShieldModalOpen(true)}
                                            small
                                            className={`transition-all shrink-0 ${shieldOptions
                                                ? (shieldOptions.shield_mode === 'timelock'
                                                    ? '!text-violet-400 bg-violet-500/20 border border-violet-500/50 shadow-[0_0_12px_rgba(139,92,246,0.5)]'
                                                    : '!text-cyan-400 bg-cyan-500/20 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.5)]')
                                                : 'text-cyan-400/70 hover:!text-cyan-300 hover:bg-cyan-500/10'
                                                }`}
                                        >
                                            <Shield className="w-4 h-4" />
                                        </IconBtn>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className={`flex-1 flex items-end gap-1.5 ${theme.input} border rounded-2xl px-3 py-2 sm:py-2.5 focus-within:border-white/20 transition-all duration-200 min-w-0`}>
                            {/* AI Polish & Tone Rewrite Wand */}
                            {text.trim().length > 2 && (
                                <div className="relative shrink-0 mb-1">
                                    <button
                                        type="button"
                                        title="AI Polish & Tone Rewrite"
                                        disabled={isPolishing}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setShowToneMenu(!showToneMenu);
                                        }}
                                        className={`p-1.5 -ml-1 text-cyan-300 hover:bg-cyan-500/20 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                                            isPolishing ? "animate-spin text-amber-300" : ""
                                        }`}
                                    >
                                        {isPolishing ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                    </button>

                                    <AnimatePresence>
                                        {showToneMenu && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowToneMenu(false)} />
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute bottom-full left-0 mb-2 z-50 min-w-[170px] rounded-2xl border border-white/15 bg-[#0e121e]/95 p-1.5 shadow-2xl backdrop-blur-xl text-xs font-semibold"
                                                >
                                                    <div className="px-2 py-1 text-[10px] uppercase font-bold text-white/40 tracking-wider">
                                                        Tone Rewrite
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePolish("professional")}
                                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                                                    >
                                                        <span>👔</span>
                                                        <span>Professional</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePolish("casual")}
                                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                                                    >
                                                        <span>😎</span>
                                                        <span>Casual & Chill</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePolish("roast")}
                                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-rose-500/20 transition-colors text-left cursor-pointer"
                                                    >
                                                        <span>🔥</span>
                                                        <span>Savage Roast</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePolish("concise")}
                                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                                                    >
                                                        <span>⚡</span>
                                                        <span>Short & Punchy</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePolish("flirty")}
                                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-pink-300 hover:text-white hover:bg-pink-500/20 transition-colors text-left cursor-pointer"
                                                    >
                                                        <span>❤️</span>
                                                        <span>Charming & Flirty</span>
                                                    </button>
                                                    <div className="border-t border-white/10 my-1" />
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePolish("clean")}
                                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-cyan-300 hover:text-white hover:bg-cyan-500/20 transition-colors text-left cursor-pointer"
                                                    >
                                                        <span>🧹</span>
                                                        <span>Clean Dictation</span>
                                                    </button>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            <textarea
                                ref={textareaRef}
                                rows={1}
                                value={text}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                disabled={disabled}
                                placeholder={
                                    isListening
                                        ? "Listening… (speaking converts to text)"
                                        : Boolean(selectedUser?.is_bot || selectedUser?.username === "VORTEX-9")
                                            ? "Ask VORTEX-9 anything or type /image <prompt>..."
                                            : "Message…"
                                }
                                aria-label="Write a direct message"
                                className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/20 outline-none resize-none leading-relaxed max-h-[120px] min-h-[22px]"
                            />
                            
                            {/* Speech-to-Text Dictation Button */}
                            <button
                                type="button"
                                onClick={toggleSpeechToText}
                                className={`transition-all flex-shrink-0 focus:outline-none touch-manipulation p-1 rounded-lg ${
                                    isListening
                                        ? "text-cyan-300 bg-cyan-500/25 shadow-[0_0_10px_rgba(6,182,212,0.6)] animate-pulse"
                                        : "text-white/25 hover:text-cyan-400 hover:bg-white/[0.05]"
                                }`}
                                title={isListening ? "Stop Voice-to-Text" : "Voice-to-Text (Speech Recognition)"}
                                aria-label="Voice to text dictation"
                            >
                                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </button>

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

            <InChatGameModal
                isOpen={gameModalOpen}
                onClose={() => setGameModalOpen(false)}
                recipientName={selectedUser?.username || "Friend"}
                onStartGame={(gamePayload) => {
                    onSend("🎮 GAME:" + JSON.stringify(gamePayload), { ai_mode: aiMode });
                }}
            />

            <SoundboardModal
                isOpen={soundboardModalOpen}
                onClose={() => setSoundboardModalOpen(false)}
                recipientName={selectedUser?.username || "Friend"}
                onSendSound={(sound) => {
                    onSend("🔊 SOUND:" + JSON.stringify(sound), { ai_mode: aiMode });
                }}
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
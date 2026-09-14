import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    useMemo
} from "react";
import GhostChatOverlay from "./messages/GhostChatOverlay";

import API from "../../Services/API";
import { createWebSocket } from "../../Services/WebSocket";
import { handleP2PSignal } from "../../Services/p2p";
import { requestNotificationPermission, showMessageNotification } from "../../Services/notifications";

import {
    AnimatePresence,
    LayoutGroup,
    motion
} from "framer-motion";

import {
    ThemeContext,
    THEMES,
    getMyUserId,
    avatarFor,
    fmtDate
} from "./messages/constants";

import { useIsMobile } from "./messages/useMediaQuery";
import Sidebar from "./messages/Sidebar";
import ChatWindow from "./messages/ChatWindow";
import EmptyState from "./messages/EmptyState";
import RightPanel from "./messages/RightPanel";
import WallpaperLayer from "./messages/WallpaperLayer";
import CommandPalette from "./messages/CommandPalette";
import CallOverlay from "./messages/CallOverlay";

/* ==========================================================================
   SECURITY & UTILITY FUNCTIONS
   ========================================================================== */

/** Sanitize user input to prevent XSS injection vectors */
const sanitizeInput = (input) => {
    if (typeof input !== "string") return "";
    return input
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        // .replace(/\//g, "&#x2F;")  // REMOVED - breaks URLs!
        .replace(/\\/g, "&#x5C;")
        .replace(/`/g, "&#96;")
        .trim();
};

/** Validate and sanitize message content before sending */
const validateMessage = (text) => {
    const MAX_LENGTH = 4000;
    const MIN_LENGTH = 1;

    // Structured payloads (P2P zero-server media, voice notes, attachments) must preserve JSON & URLs
    if (typeof text === "string" && (
        text.startsWith("⚡ P2P_MEDIA") ||
        text.startsWith("🎤 Voice Message") ||
        text.startsWith("📎")
    )) {
        return { valid: true, text: text.trim() };
    }

    const sanitized = sanitizeInput(text);
    if (sanitized.length < MIN_LENGTH) return { valid: false, error: "Message cannot be empty" };
    if (sanitized.length > MAX_LENGTH) return { valid: false, error: `Message exceeds ${MAX_LENGTH} character limit` };
    return { valid: true, text: sanitized };
};

/** Rate limiter for message sending */
const createRateLimiter = (maxRequests = 15, windowMs = 60000) => {
    const timestamps = [];
    return () => {
        const now = Date.now();
        while (timestamps.length > 0 && timestamps[0] < now - windowMs) {
            timestamps.shift();
        }
        if (timestamps.length >= maxRequests) {
            return { allowed: false, retryAfter: Math.ceil((timestamps[0] + windowMs - now) / 1000) };
        }
        timestamps.push(now);
        return { allowed: true };
    };
};

/** Secure UUID generator fallback */
const generateSecureId = () => {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${Math.random().toString(36).slice(2, 11)}`;
};

/* ==========================================================================
   MAIN MESSAGES ORCHESTRATION CONTAINER
   ========================================================================== */
const Messages = () => {
    // ── Core Domain State ──────────────────────────────────────────────────────
    const [users, setUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [pinnedChats, setPinnedChats] = useState(new Set());
    const [typingUsers, setTypingUsers] = useState(new Set());
    const [onlineUserIds, setOnlineUserIds] = useState(new Set());

    // ── Layout UI State ────────────────────────────────────────────────────────
    const isMobile = useIsMobile();
    const [mobileView, setMobileView] = useState("list");
    const [rightPanelOpen, setRightPanelOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [selectedMsgIds, setSelectedMsgIds] = useState(new Set());
    const [selectionMode, setSelectionMode] = useState(false);
    const [theme, setTheme] = useState("dark");
    const [wallpaper, setWallpaper] = useState("none");
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [socketReady, setSocketReady] = useState(false);
    const [call, setCall] = useState(null);
    const [ghostChat, setGhostChat] = useState({
        open: false,
        connected: false,
        invited: false,
        user: null,
        messages: [],
        typing: false,
    });
    const [callNotice, setCallNotice] = useState("");
    const [securityStatus, setSecurityStatus] = useState("SECURE");

    // ── Operational Refs ───────────────────────────────────────────────────────
    const myUserId = useRef(getMyUserId());
    const socketRef = useRef(null);
    useEffect(() => {
        usersRef.current = users;
    }, [users]);


    const usersRef = useRef([]);
    const ghostUserRef = useRef(null);
    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const pendingTempIds = useRef(new Set());
    const typingTimeouts = useRef({});
    const peerRef = useRef(null);
    const iceCandidateQueue = useRef([]);
    const callSignalRef = useRef(null);
    const rateLimiterRef = useRef(createRateLimiter(15, 60000));
    const token = sessionStorage.getItem("token");

    const activeUserRef = useRef(selectedUser);
    useEffect(() => {
        activeUserRef.current = selectedUser;
    }, [selectedUser]);

    const currentTheme = useMemo(() => THEMES[theme] || THEMES.dark, [theme]);

    /* ── Security: Token validation ───────────────────────────────────────── */
    const validateToken = useCallback(() => {
        const t = sessionStorage.getItem("token");
        if (!t || t.length < 20) {
            setSecurityStatus("TOKEN_INVALID");
            return false;
        }
        return true;
    }, []);

    /* ── Derived Data (DEFINED BEFORE CALLBACKS THAT USE THEM) ────────────── */
    const enrichedUsers = useMemo(() => {
        return users.map((u) => ({
            ...u,
            avatar: u.avatar || avatarFor(u.id),
            status: onlineUserIds.has(u.id) ? "online" : "offline",
        }));
    }, [users, onlineUserIds]);

    const enrichedSelected = useMemo(() => {
        if (!selectedUser) return null;
        return enrichedUsers.find((u) => u.id === selectedUser.id) || selectedUser;
    }, [enrichedUsers, selectedUser]);

    const groupedMessages = useMemo(() => {
        const result = [];
        let lastDate = "";
        messages.forEach((msg, i) => {
            if (!msg?.created_at) return;
            const dateStr = fmtDate(msg.created_at);
            if (dateStr !== lastDate) {
                result.push({ type: "divider", label: dateStr, key: `d-${dateStr}` });
                lastDate = dateStr;
            }
            const prev = messages[i - 1];
            const showAvatar = !prev || prev.sender_id !== msg.sender_id;
            result.push({ type: "message", msg, showAvatar, key: msg.id || i });
        });
        return result;
    }, [messages]);

    /* ── WebRTC / Call Logic ────────────────────────────────────────────── */
    const sendSignal = useCallback((receiverId, signal) => {
        if (!validateToken()) return false;
        if (socketRef.current?.readyState !== WebSocket.OPEN) return false;
        try {
            socketRef.current.send(JSON.stringify({ type: "signal", receiver_id: receiverId, signal }));
            return true;
        } catch {
            return false;
        }
    }, [validateToken]);

    const drainQueuedCandidates = useCallback(async (peer) => {
        if (!peer || !peer.remoteDescription) return;
        const queue = [...iceCandidateQueue.current];
        iceCandidateQueue.current = [];
        for (const cand of queue) {
            try {
                await peer.addIceCandidate(cand);
            } catch (err) {
                console.warn("Failed to add queued ICE candidate:", err);
            }
        }
    }, []);

    const closeCall = useCallback((notify = true) => {
        const active = peerRef.current;
        if (notify && call?.user?.id) {
            sendSignal(call.user.id, { type: "hangup" });
        }
        active?.getSenders().forEach((sender) => {
            try { sender.track?.stop(); } catch {}
        });
        call?.localStream?.getTracks().forEach((track) => {
            try { track.stop(); } catch {}
        });
        active?.close();
        peerRef.current = null;
        iceCandidateQueue.current = [];
        setCall(null);
    }, [call?.user?.id, call?.localStream, sendSignal]);

    const createPeer = useCallback((user, video, stream) => {
        const turnUrl = import.meta.env.VITE_TURN_URL;
        const iceServers = [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" },
            ...(turnUrl ? [{
                urls: turnUrl,
                username: import.meta.env.VITE_TURN_USERNAME,
                credential: import.meta.env.VITE_TURN_CREDENTIAL
            }] : [])
        ];

        const peer = new RTCPeerConnection({ iceServers });
        if (stream) {
            stream.getTracks().forEach((track) => peer.addTrack(track, stream));
        }

        peer.onicecandidate = ({ candidate }) => {
            if (candidate && user?.id) {
                sendSignal(user.id, { type: "candidate", candidate });
            }
        };

        peer.ontrack = (event) => {
            const remoteStream = event.streams?.[0] || new MediaStream([event.track]);
            setCall((current) => {
                if (!current) return current;
                return { ...current, remoteStream, status: "connected" };
            });
        };

        peer.oniceconnectionstatechange = () => {
            if (peer.iceConnectionState === "connected" || peer.iceConnectionState === "completed") {
                setCall((current) => current ? { ...current, status: "connected" } : current);
            } else if (peer.iceConnectionState === "failed") {
                closeCall(false);
            }
        };

        peer.onconnectionstatechange = () => {
            if (peer.connectionState === "connected") {
                setCall((current) => current ? { ...current, status: "connected" } : current);
            } else if (["failed", "closed"].includes(peer.connectionState)) {
                closeCall(false);
            }
        };

        peerRef.current = peer;
        setCall((current) => ({ ...(current || {}), user, video, localStream: stream, status: current?.status || "calling" }));
        return peer;
    }, [closeCall, sendSignal]);

    const startCall = useCallback(async (video) => {
        setCallNotice("");
        if (!enrichedSelected) {
            setCallNotice("Select a conversation before initiating a call.");
            return;
        }
        if (!socketReady) {
            setCallNotice("Waiting for secure connection. Please try again shortly.");
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            setCallNotice("Browser requires HTTPS for media access.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
            const peer = createPeer(enrichedSelected, video, stream);
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            sendSignal(enrichedSelected.id, { type: "offer", offer, video });
        } catch (error) {
            setCallNotice(`Call failed: ${error.name || "Media permission denied"}.`);
            closeCall(false);
        }
    }, [closeCall, createPeer, enrichedSelected, sendSignal, socketReady]);

    const startGhostChat = useCallback(() => {

        if (!enrichedSelected) return;

        if (!socketRef.current) return;

        if (socketRef.current.readyState !== WebSocket.OPEN) return;

        setGhostChat({
            open: true,
            connected: false,
            invited: false,
            user: enrichedSelected,
            messages: [],
            typing: false,
        });

        ghostUserRef.current = enrichedSelected;

        socketRef.current.send(JSON.stringify({
            type: "ghost_start",
            receiver_id: enrichedSelected.id,
        }));

    }, [enrichedSelected]);

    const acceptCall = useCallback(async () => {
        if (!call?.offer) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: call.video });
            const peer = createPeer(call.user, call.video, stream);
            await peer.setRemoteDescription(new RTCSessionDescription(call.offer));
            await drainQueuedCandidates(peer);
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            sendSignal(call.user.id, { type: "answer", answer });
        } catch (error) {
            console.error("Failed to answer call:", error);
            setCallNotice("Failed to answer call.");
            closeCall();
        }
    }, [call, closeCall, createPeer, drainQueuedCandidates, sendSignal]);

    const handleCallSignal = useCallback(async ({ sender_id, signal }) => {
        if (!signal) return;
        if (signal.type === "offer") {
            const caller = users.find((u) => u.id === sender_id);
            setCall({
                user: caller || { id: sender_id, username: "Incoming caller" },
                video: !!signal.video,
                offer: signal.offer,
                status: "incoming"
            });
            return;
        }
        if (signal.type === "hangup" || signal.type === "reject") {
            closeCall(false);
            return;
        }
        if (signal.type === "answer") {
            if (peerRef.current) {
                await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal.answer));
                await drainQueuedCandidates(peerRef.current);
            }
            return;
        }
        if (signal.type === "candidate" && signal.candidate) {
            const cand = new RTCIceCandidate(signal.candidate);
            if (peerRef.current && peerRef.current.remoteDescription && peerRef.current.remoteDescription.type) {
                try {
                    await peerRef.current.addIceCandidate(cand);
                } catch (e) {
                    console.warn("Failed to add ICE candidate:", e);
                }
            } else {
                iceCandidateQueue.current.push(cand);
            }
            return;
        }
    }, [closeCall, drainQueuedCandidates, users]);
    callSignalRef.current = handleCallSignal;

    /* ── Keyboard Navigation ──────────────────────────────────────────────── */
    useEffect(() => {
        const handleGlobalKeydown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setSearchOpen(true);
            }
            if (e.key === "Escape") {
                setSearchOpen(false);
                setSettingsOpen(false);
                if (selectionMode) {
                    setSelectionMode(false);
                    setSelectedMsgIds(new Set());
                    return;
                }
                if (rightPanelOpen) {
                    setRightPanelOpen(false);
                    return;
                }
                if (isMobile && mobileView === "chat") {
                    setMobileView("list");
                }
            }
        };
        window.addEventListener("keydown", handleGlobalKeydown);
        return () => window.removeEventListener("keydown", handleGlobalKeydown);
    }, [isMobile, mobileView, rightPanelOpen, selectionMode]);

    /* ── Scroll Management ────────────────────────────────────────────────── */
    useEffect(() => {
        requestNotificationPermission();
    }, []);

    const scrollToBottom = useCallback((behavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    }, []);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const handleScroll = () => {
            const isScrolledUp = container.scrollHeight - container.scrollTop - container.clientHeight > 180;
            setShowScrollBtn(isScrolledUp);
        };
        container.addEventListener("scroll", handleScroll, { passive: true });
        return () => container.removeEventListener("scroll", handleScroll);
    }, [selectedUser]);

    useEffect(() => {
        if (!selectedUser) return;
        setMessages([]);
        if (!validateToken()) return;
        API.get(`/messages/${selectedUser.id}`, { params: { token } })
            .then((res) => {
                setMessages(res.data || []);
                requestAnimationFrame(() => scrollToBottom("auto"));
            })
            .catch((err) => {
                if (err.response?.status === 401) {
                    setSecurityStatus("SESSION_EXPIRED");
                }
            });
        setUnreadCounts((prev) => ({ ...prev, [selectedUser.id]: 0 }));
    }, [selectedUser, token, scrollToBottom, validateToken]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || messages.length === 0) return;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 250;
        if (isNearBottom) scrollToBottom("smooth");
    }, [messages.length, scrollToBottom]);

    useEffect(() => {
        if (!Array.isArray(messages) || messages.length === 0) return;
        const total = messages.length;
        sessionStorage.setItem("totalMessages", String(total));
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayCount = messages.filter((m) => m?.created_at && String(m.created_at).slice(0, 10) === todayStr).length;
        sessionStorage.setItem("messagesToday", String(todayCount));
        window.dispatchEvent(new Event("sessionStorageUpdate"));
    }, [messages]);

    /* ── User Fetching ────────────────────────────────────────────────────── */
    useEffect(() => {
        const fetchUsers = async () => {
            if (!validateToken()) return;
            try {
                const res = await API.get("/users", { params: { token } });
                const freshUsers = res.data || [];
                setUsers((prev) => (prev.length === freshUsers.length ? prev : freshUsers));
                setSelectedUser((prev) => {
                    if (!prev && freshUsers.length > 0) return freshUsers[0];
                    if (!prev) return null;
                    const stillExists = freshUsers.find((u) => u.id === prev.id);
                    return stillExists ? prev : (freshUsers[0] || null);
                });
            } catch (err) {
                if (err.response?.status === 401) {
                    setSecurityStatus("SESSION_EXPIRED");
                }
            }
        };
        fetchUsers();
    }, [token, validateToken]);

    /* ── WebSocket Connection ───────────────────────────────────────────── */
    useEffect(() => {
        let ws = null;
        let reconnectTimer = null;
        let heartbeatTimer = null;
        let disposed = false;

        const connect = () => {
            if (disposed || !validateToken()) return;
            ws = createWebSocket();
            if (!ws) return;
            socketRef.current = ws;

            ws.onopen = () => {
                setSocketReady(true);
                setSecurityStatus("SECURE");
                heartbeatTimer = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "ping" }));
                    }
                }, 30000);
            };

            ws.onmessage = (event) => {
                try {
                    const packet = JSON.parse(event.data);
                    if (packet.type === "pong") return;

                    // ==========================
                    // Ghost Chat
                    // ==========================

                    if (packet.type === "ghost_invite") {

                        const user = usersRef.current.find(u => Number(u.id) === Number(packet.sender_id)) || { id: packet.sender_id, username: "Unknown User" };
                        console.log("Ghost packet:", packet);
                        console.log("Users:", users);
                        console.log(
                            "Found user:",
                            users.find(u => Number(u.id) === Number(packet.sender_id))
                        );
                        setGhostChat({
                            open: true,
                            connected: false,
                            invited: true,
                            user,
                            messages: [],
                            typing: false,
                        });

                        ghostUserRef.current = user;

                        return;
                    }

                    if (packet.type === "ghost_connected") {

                        setGhostChat(prev => ({
                            ...prev,
                            connected: true,
                            invited: false,
                        }));

                        return;
                    }

                    if (packet.type === "ghost_message") {

                        setGhostChat(prev => ({
                            ...prev,
                            messages: [
                                ...prev.messages,
                                {
                                    id: generateSecureId(),
                                    text: packet.message,
                                    senderId: packet.sender_id,
                                },
                            ],
                        }));

                        return;
                    }

                    if (packet.type === "ghost_typing") {

                        setGhostChat(prev => ({
                            ...prev,
                            typing: true,
                        }));

                        return;
                    }

                    if (packet.type === "ghost_stop_typing") {

                        setGhostChat(prev => ({
                            ...prev,
                            typing: false,
                        }));

                        return;
                    }

                    if (packet.type === "ghost_closed") {

                        setGhostChat({
                            open: false,
                            connected: false,
                            invited: false,
                            user: null,
                            messages: [],
                            typing: false,
                        });

                        ghostUserRef.current = null;

                        return;
                    }

                    if (packet.type === "online_users") {
                        setOnlineUserIds(new Set(packet.users || []));
                        return;
                    }
                    if (packet.type === "signal") {
                        callSignalRef.current?.(packet);
                        return;
                    }
                    if (packet.type === "typing_start") {
                        const sid = packet.sender_id;
                        setTypingUsers((prev) => new Set(prev).add(sid));
                        if (typingTimeouts.current[sid]) clearTimeout(typingTimeouts.current[sid]);
                        typingTimeouts.current[sid] = setTimeout(() => {
                            setTypingUsers((prev) => {
                                const next = new Set(prev);
                                next.delete(sid);
                                return next;
                            });
                        }, 3000);
                        return;
                    }
                    if (packet.type === "typing_stop") {
                        setTypingUsers((prev) => {
                            const next = new Set(prev);
                            next.delete(packet.sender_id);
                            return next;
                        });
                        return;
                    }
                    if (packet.type?.startsWith("p2p_")) {
                        handleP2PSignal(packet, ws);
                        return;
                    }
                    if (packet.type === "message_deleted" || packet.type === "delete_message") {
                        setMessages((prev) => prev.filter((m) => m.id !== packet.message_id));
                        setSelectedMsgIds((prev) => {
                            const next = new Set(prev);
                            next.delete(packet.message_id);
                            return next;
                        });
                        return;
                    }
                    if (packet.type === "capsule_unlocked") {
                        setMessages((prev) => prev.map((m) => {
                            if (m.id === packet.message_id) {
                                return { ...m, is_locked: false, message: packet.message ?? m.message };
                            }
                            return m;
                        }));
                        return;
                    }
                    if (packet.type === "reaction") {
                        setMessages((prev) => prev.map((m) => {
                            if (m.id !== packet.message_id) return m;
                            if (Array.isArray(packet.reactions)) {
                                return { ...m, reactions: packet.reactions };
                            }
                            const reactionsList = m.reactions || [];
                            const existing = reactionsList.find((r) => r.glyph === packet.emoji);
                            if (existing) {
                                return {
                                    ...m,
                                    reactions: reactionsList.map((r) =>
                                        r.glyph === packet.emoji
                                            ? { ...r, users: [...new Set([...r.users, packet.sender_id])] }
                                            : r
                                    ),
                                };
                            }
                            return { ...m, reactions: [...reactionsList, { glyph: packet.emoji, users: [packet.sender_id] }] };
                        }));
                        return;
                    }
                    if (packet.type === "read_receipt") {
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.receiver_id === packet.reader_id
                                    ? { ...m, read_state: "read", readState: "read" }
                                    : m
                            )
                        );
                        return;
                    }
                    if (packet.type === "message") {
                        // ✅ Fixed: Update existing messages instead of skipping
                        setMessages((prev) => {
                            console.log("===== INCOMING PACKET =====");
                            console.log(packet);
                            console.log("Current messages:", prev);

                            // Check if message exists by ID or temp_id
                            const existingIndex = prev.findIndex((m) => m.id === packet.id);
                            const tempIndex = prev.findIndex((m) => packet.temp_id && m.temp_id === packet.temp_id);

                            // If it exists as a temp message, replace it
                            if (tempIndex !== -1) {
                                console.log("🔄 Replacing temp message with real one");
                                const updated = [...prev];
                                updated[tempIndex] = { ...packet, temp_id: undefined };
                                return updated;
                            }

                            // If it exists by ID, UPDATE it (important for video previews!)
                            if (existingIndex !== -1) {
                                console.log("🔄 Updating existing message (video preview fix)");
                                const updated = [...prev];
                                // Merge the new packet data (could have different formatting)
                                updated[existingIndex] = { ...updated[existingIndex], ...packet };
                                return updated;
                            }

                            console.log("✅ Adding new message");
                            // New message - add it
                            if (packet.temp_id) {
                                pendingTempIds.current.delete(packet.temp_id);
                            }
                            return [...prev, packet];
                        });



                        // Handle unread counts and notifications
                        const isFromCurrentUser = packet.sender_id === myUserId.current;
                        const isFromSelected = packet.sender_id === activeUserRef.current?.id;
                        if (!isFromCurrentUser) {
                            const senderObj = usersRef.current.find((u) => Number(u.id) === Number(packet.sender_id));
                            const senderName = senderObj?.username || "Friend";
                            let notificationBody = packet.message || "New message";
                            if (packet.is_shielded) {
                                notificationBody = packet.shield_mode === 'timelock' ? "🔒 Sent a Timelocked Capsule" : "🛡️ Sent a Shielded Message";
                            }
                            showMessageNotification(senderName, notificationBody);
                        }
                        if (!isFromCurrentUser && !isFromSelected) {
                            setUnreadCounts((prev) => ({
                                ...prev,
                                [packet.sender_id]: (prev[packet.sender_id] || 0) + 1,
                            }));
                        }
                        return;
                    }
                } catch (error) {
                    console.warn("WebSocket message error:", error);
                }
            };

            ws.onclose = () => {
                setSocketReady(false);
                setOnlineUserIds(new Set());
                setTypingUsers(new Set());
                clearInterval(heartbeatTimer);
                if (!disposed) {
                    reconnectTimer = window.setTimeout(connect, 3000);
                }
            };

            ws.onerror = () => {
                setSecurityStatus("CONNECTION_ERROR");
                ws?.close();
            };
        };

        connect();

        return () => {
            disposed = true;
            clearInterval(heartbeatTimer);
            if (reconnectTimer) window.clearTimeout(reconnectTimer);
            Object.values(typingTimeouts.current).forEach(clearTimeout);
            ws?.close();
        };
    }, [validateToken]);

    /* ── Message Sending (with rate limiting & sanitization) ────────────── */
    const sendMessage = useCallback((text, options = {}) => {
        if (!selectedUser || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            return false;
        }
        const rateCheck = rateLimiterRef.current();
        if (!rateCheck.allowed) {
            setCallNotice(`Rate limit exceeded. Try again in ${rateCheck.retryAfter}s.`);
            return false;
        }
        const validation = validateMessage(text);
        if (!validation.valid) {
            setCallNotice(validation.error);
            return false;
        }
        const temp_id = generateSecureId();
        pendingTempIds.current.add(temp_id);

        // Add optimistic message immediately
        const optimisticMessage = {
            temp_id,
            sender_id: myUserId.current,
            receiver_id: selectedUser.id,
            message: validation.text,
            created_at: new Date().toISOString(),
            is_locked: options.shield_mode === 'timelock',
            ...options
        };
        setMessages((prev) => {
            console.log("OPTIMISTIC ADD");
            console.trace();
            return [...prev, optimisticMessage];
        });
        console.log("========== FRONTEND SENDING ==========")
        console.log("temp_id:", temp_id)
        console.log("message:", validation.text)
        console.log("options:", options)
        console.log("====================================")

        try {
            socketRef.current.send(JSON.stringify({
                temp_id,
                receiver_id: selectedUser.id,
                message: validation.text,
                ...options
            }));
        } catch {
            pendingTempIds.current.delete(temp_id);
            // Remove optimistic message on error
            setMessages((prev) => prev.filter((m) => m.temp_id !== temp_id));
            return false;
        }
        setReplyingTo(null);
        return true;
    }, [selectedUser]);

    /* ── Reactions ──────────────────────────────────────────────────────── */
    const addReaction = useCallback((messageId, emoji) => {
        const safeEmoji = sanitizeInput(emoji).slice(0, 10);
        if (!safeEmoji) return;
        const myId = myUserId.current;

        // Optimistic update supporting toggling off if already reacted
        setMessages((prev) => prev.map((m) => {
            if (m.id !== messageId) return m;
            const reactionsList = m.reactions || [];
            const existing = reactionsList.find((r) => r.glyph === safeEmoji);

            let updated;
            if (existing && existing.users?.includes(myId)) {
                // User already reacted with this emoji -> toggle off
                updated = reactionsList
                    .map((r) => r.glyph === safeEmoji ? { ...r, users: r.users.filter((id) => id !== myId) } : r)
                    .filter((r) => r.users && r.users.length > 0);
            } else if (existing) {
                // Add user to existing emoji
                updated = reactionsList.map((r) =>
                    r.glyph === safeEmoji
                        ? { ...r, users: [...new Set([...r.users, myId])] }
                        : r
                );
            } else {
                // Add new emoji reaction
                updated = [...reactionsList, { glyph: safeEmoji, users: [myId] }];
            }
            return { ...m, reactions: updated };
        }));

        if (socketRef.current?.readyState === WebSocket.OPEN && selectedUser?.id) {
            try {
                socketRef.current.send(JSON.stringify({
                    type: "reaction",
                    message_id: messageId,
                    receiver_id: selectedUser.id,
                    emoji: safeEmoji
                }));
            } catch (err) {
                console.warn("Failed to transmit reaction over WebSocket:", err);
            }
        } else if (selectedUser?.id && token) {
            API.post(`/messages/${messageId}/reaction`, { reaction: safeEmoji }, { params: { token } })
                .catch((err) => console.warn("Failed to post reaction via REST fallback:", err));
        }
    }, [selectedUser, token]);

    const togglePin = useCallback((userId) => {
        setPinnedChats((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    }, []);

    const selectUser = useCallback((user) => {
        setSelectedUser(user);
        setSelectionMode(false);
        setSelectedMsgIds(new Set());
        if (isMobile) setMobileView("chat");
    }, [isMobile]);

    const handleBackToList = useCallback(() => {
        setMobileView("list");
        setRightPanelOpen(false);
        setSelectionMode(false);
        setSelectedMsgIds(new Set());
    }, []);

    const handleOpenSearch = useCallback(() => setSearchOpen(true), []);
    const handleCloseSearch = useCallback(() => setSearchOpen(false), []);
    const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
    const handleCloseRightPanel = useCallback(() => setRightPanelOpen(false), []);

    const handleToggleSelectionMode = useCallback(() => {
        setSelectionMode((prev) => {
            if (prev) setSelectedMsgIds(new Set());
            return !prev;
        });
    }, []);

    const handleSelectMessage = useCallback((id) => {
        setSelectionMode(true);
        setSelectedMsgIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            if (next.size === 0) setSelectionMode(false);
            return next;
        });
    }, []);

    /* ── DELETE FUNCTIONS ────────────────────────────────────────────────── */
    const deleteMessage = useCallback(async (messageId, mode) => {
        try {
            const token = sessionStorage.getItem("token");
            await API.post(`/delete_message/${messageId}?mode=${mode}&token=${encodeURIComponent(token)}`);

            // Remove message from UI
            setMessages((prev) => prev.filter((m) => m.id !== messageId));

            // Exit selection mode if active
            if (selectionMode) {
                setSelectedMsgIds((prev) => {
                    const next = new Set(prev);
                    next.delete(messageId);
                    if (next.size === 0) setSelectionMode(false);
                    return next;
                });
            }
        } catch (error) {
            console.error("Failed to delete message:", error);
            setCallNotice("Failed to delete message. Please try again.");
        }
    }, [selectionMode]);

    const deleteSelectedMessages = useCallback(async () => {
        if (selectedMsgIds.size === 0) return;

        const messageIds = Array.from(selectedMsgIds);
        const confirmDelete = window.confirm(`Delete ${messageIds.length} selected message(s)?`);
        if (!confirmDelete) return;

        try {
            const token = sessionStorage.getItem("token");
            // Delete each selected message with "me" mode (hide from current user)
            await Promise.all(
                messageIds.map((id) =>
                    API.post(`/delete_message/${id}?mode=me&token=${encodeURIComponent(token)}`)
                )
            );

            // Remove messages from UI
            const idsToRemove = new Set(messageIds);
            setMessages((prev) => prev.filter((m) => !idsToRemove.has(m.id)));

            // Exit selection mode
            setSelectionMode(false);
            setSelectedMsgIds(new Set());
        } catch (error) {
            console.error("Failed to delete messages:", error);
            setCallNotice("Failed to delete messages. Please try again.");
        }
    }, [selectedMsgIds]);

    const showSidebar = !isMobile || mobileView === "list";

    // Security status color mapping
    const statusColors = {
        SECURE: "#22c55e",
        TOKEN_INVALID: "#ef4444",
        SESSION_EXPIRED: "#f59e0b",
        CONNECTION_ERROR: "#ef4444",
    };

    return (
        <ThemeContext.Provider value={currentTheme}>
            <LayoutGroup>
                <div className={`w-full h-full min-h-0 flex flex-col lg:flex-row overflow-hidden relative select-none text-white bg-gradient-to-br ${currentTheme.bg || "from-neutral-900 to-black"}`}>

                    <WallpaperLayer wallpaper={wallpaper} />

                    {/* Security Status Indicator */}
                    <div className="fixed top-3 right-3 z-[60] flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-xl">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: statusColors[securityStatus] || "#ef4444" }} />
                            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: statusColors[securityStatus] || "#ef4444" }} />
                        </span>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/50">
                            {securityStatus}
                        </span>
                    </div>

                    {/* Conversation list */}
                    <AnimatePresence mode="wait">
                        {showSidebar && (
                            <motion.div
                                key="sidebar"
                                initial={isMobile ? { x: "-100%", opacity: 0 } : false}
                                animate={{ x: 0, opacity: 1 }}
                                exit={isMobile ? { x: "-100%", opacity: 0 } : { opacity: 0 }}
                                transition={{ type: "spring", stiffness: 380, damping: 35 }}
                                className={`${isMobile ? "absolute inset-0 z-20" : "relative"} w-full lg:w-[300px] xl:w-[320px] flex-shrink-0 flex flex-col min-h-0`}
                            >
                                <Sidebar
                                    users={enrichedUsers}
                                    selectedUser={enrichedSelected}
                                    unreadCounts={unreadCounts}
                                    pinnedChats={pinnedChats}
                                    typingUsers={typingUsers}
                                    onSelectUser={selectUser}
                                    onPinUser={togglePin}
                                    onOpenSearch={handleOpenSearch}
                                    onOpenSettings={handleOpenSettings}
                                    onOpenInfoPanel={() => setRightPanelOpen(true)}
                                    myUserId={myUserId.current}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Chat area */}
                    <div className={`flex-1 flex flex-col overflow-hidden relative z-10 min-h-0 min-w-0 ${isMobile && mobileView === "list" ? "hidden lg:flex" : "flex"}`}>
                        {enrichedSelected ? (
                            <ChatWindow
                                enrichedSelected={enrichedSelected}
                                rightPanelOpen={rightPanelOpen}
                                setRightPanelOpen={setRightPanelOpen}
                                groupedMessages={groupedMessages}
                                typingUsers={typingUsers}
                                myUserId={myUserId.current}
                                selectionMode={selectionMode}
                                selectedMsgIds={selectedMsgIds}
                                setSelectedMsgIds={setSelectedMsgIds}
                                setSelectionMode={setSelectionMode}
                                addReaction={addReaction}
                                setReplyingTo={setReplyingTo}
                                scrollContainerRef={scrollContainerRef}
                                messagesEndRef={messagesEndRef}
                                showScrollBtn={showScrollBtn}
                                currentTheme={currentTheme}
                                scrollToBottom={scrollToBottom}
                                sendMessage={sendMessage}
                                socketReady={socketReady}
                                replyingTo={replyingTo}
                                onBack={isMobile ? handleBackToList : undefined}
                                onOpenSearch={handleOpenSearch}
                                onToggleSelectionMode={handleToggleSelectionMode}
                                onSelectMessage={handleSelectMessage}
                                onStartCall={startCall}
                                onStartGhostChat={startGhostChat}
                                onDelete={deleteMessage}
                                onDeleteSelected={deleteSelectedMessages}
                                socket={socketRef.current}
                                isMobile={isMobile}
                            />
                        ) : (
                            <EmptyState onOpenSearch={handleOpenSearch} />
                        )}
                    </div>

                    <RightPanel
                        user={enrichedSelected}
                        messages={messages}
                        isOpen={rightPanelOpen}
                        onClose={handleCloseRightPanel}
                    />

                    <CommandPalette
                        open={searchOpen}
                        onClose={handleCloseSearch}
                        users={enrichedUsers}
                        onSelectUser={selectUser}
                    />
                    <CallOverlay
                        call={call}
                        onAccept={acceptCall}
                        onReject={() => closeCall()}
                        onHangup={() => closeCall()}
                        onToggleMute={() => call?.localStream?.getAudioTracks().forEach((track) => { track.enabled = !track.enabled; })}
                        onToggleVideo={() => call?.localStream?.getVideoTracks().forEach((track) => { track.enabled = !track.enabled; })}
                    />
                    <GhostChatOverlay
                        ghostChat={ghostChat}
                        socket={socketRef.current}
                        onClose={() => {
                            if (ghostChat.user && socketRef.current?.readyState === WebSocket.OPEN) {
                                socketRef.current.send(JSON.stringify({
                                    type: "ghost_close",
                                    receiver_id: ghostChat.user.id,
                                }));
                            }
                            setGhostChat({
                                open: false,
                                connected: false,
                                invited: false,
                                user: null,
                                messages: [],
                                typing: false,
                            });
                        }}
                    />

                    {/* Call Notice Toast */}
                    <AnimatePresence>
                        {callNotice && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="fixed bottom-5 left-1/2 z-[101] w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl border border-rose-300/20 bg-rose-950/90 px-5 py-3.5 text-sm text-rose-100 shadow-2xl backdrop-blur-xl"
                            >
                                <div className="flex items-center justify-between">
                                    <span>{callNotice}</span>
                                    <button type="button" onClick={() => setCallNotice("")} className="ml-3 rounded-lg p-1 font-bold text-white/60 transition hover:bg-white/10 hover:text-white">
                                        ×
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Settings Overlay — Bento Grid */}
                    <AnimatePresence>
                        {settingsOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4"
                            >
                                <motion.div
                                    initial={{ y: 60, opacity: 0, scale: 0.95 }}
                                    animate={{ y: 0, opacity: 1, scale: 1 }}
                                    exit={{ y: 40, opacity: 0, scale: 0.95 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    className="relative overflow-hidden rounded-t-3xl sm:rounded-3xl border border-white/[0.08] bg-[#0a0a12]/95 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto"
                                    style={{ boxShadow: "0 0 60px rgba(139,92,246,0.08), 0 25px 50px -12px rgba(0,0,0,0.8)" }}
                                >
                                    <div className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500" />
                                    <div className="p-6 sm:p-8">
                                        <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-6 sm:hidden" />
                                        <div className="mb-8">
                                            <h4 className="text-lg font-black tracking-tight">Appearance</h4>
                                            <p className="mt-1 text-xs text-white/40">Customize your secure messaging environment</p>
                                        </div>

                                        <div className="mb-8">
                                            <p className="mb-3 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-white/30">Interface Theme</p>
                                            <div className="grid grid-cols-2 gap-2.5">
                                                {Object.entries(THEMES).map(([key, t]) => (
                                                    <motion.button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => setTheme(key)}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-300 ${theme === key ? "border-violet-500/50 bg-violet-500/10" : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"}`}
                                                    >
                                                        {theme === key && (
                                                            <motion.div
                                                                layoutId="activeThemeBg"
                                                                className="absolute inset-0 rounded-xl"
                                                                style={{ border: "1px solid rgba(139,92,246,0.3)", boxShadow: "0 0 20px rgba(139,92,246,0.1)" }}
                                                                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                                            />
                                                        )}
                                                        <div className="relative z-10">
                                                            <div className="mb-2 h-8 w-8 rounded-lg" style={{ background: t.accent ? `linear-gradient(135deg, ${t.accent}, ${t.accent2 || t.accent})` : "#333", boxShadow: theme === key ? `0 0 12px ${t.accent}40` : "none" }} />
                                                            <p className={`text-xs font-bold ${theme === key ? "text-white" : "text-white/60"}`}>{t.name}</p>
                                                        </div>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mb-8">
                                            <p className="mb-3 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-white/30">Background</p>
                                            <div className="grid grid-cols-3 gap-2.5">
                                                {["none", "aurora", "cosmic"].map((opt) => (
                                                    <motion.button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => setWallpaper(opt)}
                                                        whileHover={{ scale: 1.03 }}
                                                        whileTap={{ scale: 0.97 }}
                                                        className={`relative overflow-hidden rounded-xl border py-3 text-xs font-bold capitalize transition-all ${wallpaper === opt ? "border-cyan-500/40 bg-cyan-500/10 text-white" : "border-white/[0.06] bg-white/[0.02] text-white/50 hover:border-white/[0.12]"}`}
                                                    >
                                                        {wallpaper === opt && (
                                                            <motion.div
                                                                layoutId="activeWallpaper"
                                                                className="absolute inset-0 rounded-xl border border-cyan-500/30"
                                                                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                                            />
                                                        )}
                                                        <span className="relative z-10">{opt}</span>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                                                    <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white/80">End-to-End Encrypted</p>
                                                    <p className="text-[10px] text-white/30">AES-256-GCM + WebSocket TLS</p>
                                                </div>
                                            </div>
                                        </div>

                                        <motion.button
                                            type="button"
                                            onClick={() => setSettingsOpen(false)}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            className="w-full py-3 bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold rounded-xl border border-white/[0.08] transition-colors"
                                        >
                                            Apply & Close
                                        </motion.button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </LayoutGroup>
        </ThemeContext.Provider>
    );
};

export default Messages;

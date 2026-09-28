import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import API from "../../../Services/API.js";
import { Glass, Avatar, StatusDot, useTheme } from "./constants";
import { Search, MessageSquare, Image, Film, Link2, FileCode, FileText, User, Mic } from "lucide-react";

const URL_REGEX = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
const IMAGE_REGEX = /\.(jpeg|jpg|gif|png|webp|svg)(\?[^\s<>"']*)?$/i;
const VIDEO_REGEX = /\.(mp4|mov|mkv|avi|webm|m4v|3gp|flv|mpeg|mpg|ts|mts|m2ts|wmv|asf|ogv|vob)(\?[^\s<>"']*)?$/i;

const FILTER_TABS = [
    { id: "all", label: "All", icon: Search },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "media", label: "Media", icon: Image },
    { id: "links", label: "Links", icon: Link2 },
    { id: "files", label: "Files & Code", icon: FileCode },
    { id: "people", label: "People", icon: User },
];

/**
 * Highlights matches within text
 */
const HighlightMatch = ({ text = "", query = "" }) => {
    if (!query.trim() || !text) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return (
        <span>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={i} className="bg-cyan-500/30 text-cyan-300 font-bold px-0.5 rounded">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </span>
    );
};

const CommandPalette = React.memo(({
    open,
    onClose,
    users = [],
    onSelectUser,
    messages = [],
    onJumpToMessage,
}) => {
    const theme = useTheme();
    const [query, setQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [remoteUsers, setRemoteUsers] = useState([]);
    const [focused, setFocused] = useState(0);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const activeRowRef = useRef(null);

    useEffect(() => {
        if (open) {
            setQuery("");
            setActiveTab("all");
            setFocused(0);
            const rafId = requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
            return () => cancelAnimationFrame(rafId);
        }
    }, [open]);

    useEffect(() => {
        if (activeRowRef.current) {
            activeRowRef.current.scrollIntoView({ block: "nearest" });
        }
    }, [focused]);

    // Remote search for users if query is entered
    useEffect(() => {
        if (!query.trim() || activeTab === "messages" || activeTab === "media" || activeTab === "links" || activeTab === "files") {
            setRemoteUsers([]);
            return;
        }
        setLoading(true);
        const controller = new AbortController();
        const delayDebounce = setTimeout(async () => {
            try {
                const token = sessionStorage.getItem("token");
                const res = await API.get("/search-users", {
                    params: { q: query, token },
                    signal: controller.signal,
                });
                setRemoteUsers(res.data || []);
            } catch (err) {
                if (err.name !== "CanceledError") setRemoteUsers([]);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 180);
        return () => {
            clearTimeout(delayDebounce);
            controller.abort();
        };
    }, [query, activeTab]);

    // Extract searchable index from messages
    const messageIndex = useMemo(() => {
        if (!messages || !Array.isArray(messages)) return [];

        const results = [];
        for (const msg of messages) {
            if (!msg || !msg.id) continue;
            const raw = msg.message || "";
            if (!raw) continue;

            const timeStr = msg.created_at
                ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "";
            const senderName = msg.sender?.username || (msg.is_bot ? "VORTEX-9" : "User");

            // 1. Check for Media (Images / Videos / Voice Notes)
            const isVoice = raw.includes("🎤 Voice Message") || raw.includes(".webm") || raw.includes("/voice_notes/");
            const words = raw.split(/\s+/);
            const imgUrl = words.find((w) => IMAGE_REGEX.test(w) || w.includes("/uploads/ai/"));
            const videoUrl = words.find((w) => VIDEO_REGEX.test(w));

            if (isVoice || imgUrl || videoUrl) {
                results.push({
                    type: "media",
                    msgId: msg.id,
                    title: isVoice ? "🎤 Voice Note" : imgUrl ? "🖼️ Image Media" : "🎬 Video Media",
                    subtitle: `${senderName} • ${timeStr}`,
                    preview: imgUrl || videoUrl || raw.slice(0, 80),
                    rawText: raw,
                    isVoice,
                    imgUrl,
                    videoUrl,
                    msg,
                });
            }

            // 2. Check for Links
            const links = raw.match(URL_REGEX);
            if (links && links.length > 0) {
                for (const link of links) {
                    try {
                        const parsed = new URL(link.startsWith("http") ? link : `https://${link}`);
                        results.push({
                            type: "link",
                            msgId: msg.id,
                            title: link,
                            subtitle: `${parsed.hostname} • ${senderName} • ${timeStr}`,
                            rawText: `${link} ${raw}`,
                            msg,
                        });
                    } catch {
                        results.push({
                            type: "link",
                            msgId: msg.id,
                            title: link,
                            subtitle: `${senderName} • ${timeStr}`,
                            rawText: `${link} ${raw}`,
                            msg,
                        });
                    }
                }
            }

            // 3. Check for Code & Document Files
            const isCode = raw.includes("```") || raw.includes("<code>");
            const isDoc = raw.includes("📄 **Attached Document:") || raw.includes("📄 **Document Attached:") || raw.includes("📎");
            if (isCode || isDoc) {
                const docTitleMatch = raw.match(/Document(?:\s+Attached)?:?\s*`?([^`\n]+)`?/i);
                results.push({
                    type: "file",
                    msgId: msg.id,
                    title: isDoc ? (docTitleMatch ? `📄 ${docTitleMatch[1]}` : "📄 Document Attachment") : "💻 Code Snippet",
                    subtitle: `${senderName} • ${timeStr}`,
                    rawText: raw,
                    msg,
                });
            }

            // 4. Standard Message Text
            results.push({
                type: "message",
                msgId: msg.id,
                title: raw.slice(0, 120),
                subtitle: `${senderName} • ${timeStr}`,
                rawText: raw,
                msg,
            });
        }

        return results;
    }, [messages]);

    // Computed filtered results
    const displayed = useMemo(() => {
        const q = query.trim().toLowerCase();

        // 1. Gather People
        let matchedPeople = [];
        if (activeTab === "all" || activeTab === "people") {
            if (q) {
                const localMatches = users.filter(
                    (u) => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
                );
                const combined = [...localMatches, ...remoteUsers];
                // Deduplicate by ID
                const seen = new Set();
                matchedPeople = combined.filter((u) => {
                    if (seen.has(u.id)) return false;
                    seen.add(u.id);
                    return true;
                }).map((u) => ({
                    type: "person",
                    id: `person-${u.id}`,
                    user: u,
                    title: u.username,
                    subtitle: u.email || (u.status === "online" ? "Active now" : "Offline"),
                }));
            } else if (activeTab === "people" || activeTab === "all") {
                matchedPeople = users.slice(0, 6).map((u) => ({
                    type: "person",
                    id: `person-${u.id}`,
                    user: u,
                    title: u.username,
                    subtitle: u.email || (u.status === "online" ? "Active now" : "Offline"),
                }));
            }
        }

        // 2. Gather Message Index Items
        let matchedItems = [];
        if (activeTab !== "people") {
            let pool = messageIndex;
            if (activeTab !== "all") {
                pool = messageIndex.filter((it) => {
                    if (activeTab === "messages") return it.type === "message";
                    if (activeTab === "media") return it.type === "media";
                    if (activeTab === "links") return it.type === "link";
                    if (activeTab === "files") return it.type === "file";
                    return true;
                });
            }

            if (q) {
                matchedItems = pool.filter((it) => it.rawText?.toLowerCase().includes(q));
            } else if (activeTab !== "all") {
                // When empty query on specific tab, show recent items
                matchedItems = pool.slice(-15).reverse();
            }
        }

        // Combine according to activeTab
        if (activeTab === "people") {
            return matchedPeople;
        }

        if (activeTab === "all") {
            if (!q) {
                return matchedPeople.slice(0, 8);
            }
            // Interleave people and messages
            return [...matchedPeople.slice(0, 4), ...matchedItems.slice(0, 16)];
        }

        return matchedItems.slice(0, 25);
    }, [query, activeTab, users, remoteUsers, messageIndex]);

    const handleKeyDown = (e) => {
        if (!displayed.length) {
            if (e.key === "Escape") onClose();
            return;
        }
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setFocused((prev) => Math.min(prev + 1, displayed.length - 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                setFocused((prev) => Math.max(prev - 1, 0));
                break;
            case "Enter":
                e.preventDefault();
                const item = displayed[focused];
                if (item) {
                    if (item.type === "person" && item.user) {
                        onSelectUser(item.user);
                    } else if (item.msgId && onJumpToMessage) {
                        onJumpToMessage(item.msgId);
                    }
                    onClose();
                }
                break;
            case "Escape":
                e.preventDefault();
                onClose();
                break;
            default:
                break;
        }
    };

    const handleItemClick = useCallback((item) => {
        if (item.type === "person" && item.user) {
            onSelectUser(item.user);
        } else if (item.msgId && onJumpToMessage) {
            onJumpToMessage(item.msgId);
        }
        onClose();
    }, [onSelectUser, onJumpToMessage, onClose]);

    const renderItemIcon = (item) => {
        if (item.type === "person") {
            return <Avatar user={item.user} size="sm" className="scale-90 sm:scale-100 flex-shrink-0" />;
        }
        if (item.type === "media") {
            if (item.imgUrl) {
                return (
                    <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-black/40">
                        <img src={item.imgUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                    </div>
                );
            }
            if (item.isVoice) {
                return (
                    <div className="w-9 h-9 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-300 flex-shrink-0">
                        <Mic className="w-4 h-4" />
                    </div>
                );
            }
            return (
                <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 flex-shrink-0">
                    <Film className="w-4 h-4" />
                </div>
            );
        }
        if (item.type === "link") {
            return (
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300 flex-shrink-0">
                    <Link2 className="w-4 h-4" />
                </div>
            );
        }
        if (item.type === "file") {
            return (
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 flex-shrink-0">
                    <FileCode className="w-4 h-4" />
                </div>
            );
        }
        return (
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white/70 flex-shrink-0">
                <MessageSquare className="w-4 h-4" />
            </div>
        );
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overscroll-contain"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: window.innerWidth < 640 ? 0 : -16, x: "-50%" }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, scale: 0.96, y: window.innerWidth < 640 ? 0 : -16, x: "-50%" }}
                        transition={{ type: "spring", stiffness: 420, damping: 30 }}
                        className="fixed top-0 sm:top-[12%] left-1/2 w-full max-w-[580px] h-[100dvh] sm:h-auto z-50 px-0 sm:px-4 flex flex-col justify-end sm:justify-start"
                    >
                        <Glass className="overflow-hidden shadow-2xl shadow-black/80 rounded-t-2xl sm:rounded-2xl max-h-[88vh] sm:max-h-[640px] flex flex-col w-full border-t border-white/10 sm:border-t-0 bg-[#0d121d]/95 backdrop-blur-2xl">
                            {/* Mobile Drag Indicator */}
                            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mt-2.5 mb-1 sm:hidden flex-shrink-0" />

                            {/* Search Input Bar */}
                            <div className={`flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-3 sm:py-3.5 border-b ${theme.border} flex-shrink-0`}>
                                <Search className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value);
                                        setFocused(0);
                                    }}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Search messages, media, links, code, people…"
                                    className="flex-1 bg-transparent text-white placeholder-white/30 text-xs sm:text-sm outline-none"
                                />
                                {loading && (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                        className="w-4 h-4 border-2 border-white/20 border-t-cyan-400 rounded-full flex-shrink-0"
                                    />
                                )}
                                <kbd className="hidden sm:flex text-[10px] text-white/30 border border-white/10 rounded px-1.5 py-0.5 select-none font-mono">ESC</kbd>
                            </div>

                            {/* Universal Filter Tabs */}
                            <div className="flex items-center gap-1 px-3 sm:px-4 py-2 border-b border-white/10 overflow-x-auto scrollbar-none flex-shrink-0 bg-black/20">
                                {FILTER_TABS.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => {
                                                setActiveTab(tab.id);
                                                setFocused(0);
                                            }}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0 cursor-pointer ${
                                                isActive
                                                    ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 shadow-sm"
                                                    : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                                            }`}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Results List */}
                            <div className="overflow-y-auto py-1 sm:py-2 flex-1 overscroll-contain custom-scrollbar max-h-[460px]">
                                {!query.trim() && activeTab === "all" && (
                                    <p className="px-4 sm:px-5 py-1.5 text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase text-white/30 select-none">
                                        Recent Contacts & Quick Search
                                    </p>
                                )}

                                {displayed.length === 0 && !loading && (
                                    <div className="px-5 py-10 text-center text-white/30 text-xs sm:text-sm select-none">
                                        No results found {query.trim() ? `for "${query}"` : "in this category"}
                                    </div>
                                )}

                                {displayed.map((item, i) => {
                                    const isFocused = i === focused;
                                    return (
                                        <button
                                            key={item.id || `${item.type}-${item.msgId || i}`}
                                            ref={isFocused ? activeRowRef : null}
                                            type="button"
                                            onClick={() => handleItemClick(item)}
                                            onMouseEnter={() => window.innerWidth >= 640 && setFocused(i)}
                                            className={`w-full flex items-center gap-3 px-4 sm:px-5 py-2.5 sm:py-3 transition-colors text-left outline-none touch-manipulation cursor-pointer ${
                                                isFocused ? "bg-white/[0.08] border-l-2 border-cyan-400" : "hover:bg-white/[0.03]"
                                            }`}
                                        >
                                            {renderItemIcon(item)}

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs sm:text-sm font-medium text-white truncate">
                                                        <HighlightMatch text={item.title} query={query} />
                                                    </p>
                                                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/50 flex-shrink-0">
                                                        {item.type}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] sm:text-xs text-white/40 truncate mt-0.5">
                                                    {item.subtitle}
                                                </p>
                                            </div>

                                            {item.type === "person" && item.user?.status === "online" && (
                                                <StatusDot status="online" />
                                            )}

                                            {isFocused && (
                                                <kbd className="hidden sm:inline-block text-[10px] text-white/30 border border-white/10 rounded px-1.5 py-0.5 select-none font-mono">
                                                    ↵
                                                </kbd>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Keyboard Shortcuts Footer */}
                            <div className={`hidden sm:flex items-center justify-between px-5 py-2.5 border-t ${theme.border} select-none flex-shrink-0 text-white/30`}>
                                <div className="flex items-center gap-3">
                                    {[["↑↓", "Navigate"], ["↵", "Jump to Item"], ["ESC", "Close"]].map(([key, label]) => (
                                        <span key={key} className="flex items-center gap-1.5 text-[10px]">
                                            <kbd className="border border-white/10 rounded px-1 py-0.5 font-mono text-white/40">{key}</kbd>
                                            <span>{label}</span>
                                        </span>
                                    ))}
                                </div>
                                <span className="text-[10px] font-mono text-cyan-400/60">Universal Deep Search</span>
                            </div>
                        </Glass>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});

CommandPalette.displayName = "CommandPalette";

CommandPalette.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    users: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
            username: PropTypes.string.isRequired,
            email: PropTypes.string,
            status: PropTypes.string,
            avatar: PropTypes.string,
        })
    ),
    onSelectUser: PropTypes.func.isRequired,
    messages: PropTypes.array,
    onJumpToMessage: PropTypes.func,
};

export default CommandPalette;

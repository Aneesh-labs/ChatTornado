import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Tv, X, Play, Pause, Minimize2, Maximize2, Sparkles, Send, Volume2, ExternalLink } from "lucide-react";

const SAMPLE_VIDEOS = [
    { title: "☕ Lofi Beats to Relax/Study", url: "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&enablejsapi=1" },
    { title: "🚗 Synthwave Chill Drive", url: "https://www.youtube.com/embed/4xDzrJKXOOY?autoplay=1&enablejsapi=1" },
    { title: "🪐 Deep Space 4K Ambient", url: "https://www.youtube.com/embed/1-iS7LArMPA?autoplay=1&enablejsapi=1" },
];

export default function WatchTogetherOverlay({ isOpen, onClose, selectedUser, socket }) {
    const [videoUrl, setVideoUrl] = useState(SAMPLE_VIDEOS[0].url);
    const [customUrlInput, setCustomUrlInput] = useState("");
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);
    const [reactions, setReactions] = useState([]);

    const parseVideoUrl = (raw) => {
        if (!raw) return "";
        let url = raw.trim();
        // Extract YouTube ID if standard youtube link
        const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        if (ytMatch && ytMatch[1]) {
            return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&enablejsapi=1`;
        }
        return url;
    };

    const handleApplyUrl = (e) => {
        e.preventDefault();
        const parsed = parseVideoUrl(customUrlInput);
        if (parsed) {
            setVideoUrl(parsed);
            setCustomUrlInput("");
            broadcastWatchEvent("change_video", { url: parsed });
        }
    };

    const spawnReaction = (emoji) => {
        const id = `${Date.now()}-${Math.random()}`;
        const newReaction = {
            id,
            emoji,
            x: Math.random() * 70 + 15, // percent
        };
        setReactions((prev) => [...prev, newReaction]);
        setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== id));
        }, 2200);

        broadcastWatchEvent("reaction", { emoji });
    };

    const broadcastWatchEvent = (action, payload = {}) => {
        if (socket?.readyState === WebSocket.OPEN && selectedUser?.id) {
            socket.send(JSON.stringify({
                type: "watch_together_sync",
                receiver_id: selectedUser.id,
                action,
                payload
            }));
        }
    };

    // Listen for incoming sync from socket
    useEffect(() => {
        const handleCustomEvent = (e) => {
            const data = e.detail;
            if (data?.type === "watch_together_sync") {
                if (data.action === "change_video" && data.payload?.url) {
                    setVideoUrl(data.payload.url);
                } else if (data.action === "reaction" && data.payload?.emoji) {
                    spawnReaction(data.payload.emoji);
                }
            }
        };
        window.addEventListener("watch_together_event", handleCustomEvent);
        return () => window.removeEventListener("watch_together_event", handleCustomEvent);
    }, []);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`fixed z-50 transition-all ${isMinimized
                    ? "bottom-20 right-6 w-80 h-52 rounded-2xl shadow-2xl border border-violet-500/50 bg-black/95 overflow-hidden"
                    : "inset-4 sm:inset-10 md:inset-16 rounded-3xl border border-violet-500/40 bg-gradient-to-b from-[#101026] via-[#090916] to-[#040409] shadow-2xl flex flex-col overflow-hidden"
                }`}
            >
                {/* Header Bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-white/[0.04] border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-violet-600/30 text-violet-400 border border-violet-500/40 flex items-center justify-center">
                            <Tv className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                Watch Together
                                <span className="text-[10px] bg-red-500 text-white font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider animate-pulse">
                                    LIVE SYNC
                                </span>
                            </h3>
                            {!isMinimized && (
                                <p className="text-[11px] text-white/50">
                                    Watching with @{selectedUser?.username || "Friend"}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                            title={isMinimized ? "Expand" : "Minimize to PiP"}
                        >
                            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-white/60 hover:text-red-400 hover:bg-white/10 transition-colors"
                            title="Close Watch Party"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Video Container + Floating Flying Reactions */}
                <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
                    {videoUrl ? (
                        <iframe
                            src={videoUrl}
                            title="Watch Together Video"
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    ) : (
                        <div className="text-white/40 text-center p-6">
                            <Tv className="w-12 h-12 mx-auto mb-2 text-white/20" />
                            <p className="text-sm">Paste a YouTube link below to start streaming together</p>
                        </div>
                    )}

                    {/* Flying animated reactions overlay */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {reactions.map((r) => (
                            <motion.div
                                key={r.id}
                                initial={{ opacity: 1, y: 150, scale: 0.8 }}
                                animate={{ opacity: 0, y: -200, scale: 1.6 }}
                                transition={{ duration: 2, ease: "easeOut" }}
                                style={{ left: `${r.x}%`, position: "absolute", bottom: "10%" }}
                                className="text-3xl select-none filter drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                            >
                                {r.emoji}
                            </motion.div>
                        ))}
                    </div>

                    {/* Floating Reaction Bar (Quick Touch) */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-xl pointer-events-auto">
                        {["❤️", "😂", "😮", "🔥", "👏", "🍿"].map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => spawnReaction(emoji)}
                                className="hover:scale-130 active:scale-90 transition-transform text-xl p-1 cursor-pointer"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bottom URL input and Quick Preset Bar (when not minimized) */}
                {!isMinimized && (
                    <div className="p-3 bg-white/[0.03] border-t border-white/10 flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
                        {/* URL form */}
                        <form onSubmit={handleApplyUrl} className="flex items-center gap-2 w-full sm:flex-1">
                            <input
                                type="text"
                                value={customUrlInput}
                                onChange={(e) => setCustomUrlInput(e.target.value)}
                                placeholder="Paste YouTube link (e.g. https://youtu.be/...)"
                                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500"
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow cursor-pointer flex-shrink-0"
                            >
                                Load Video
                            </button>
                        </form>

                        {/* Presets */}
                        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar">
                            {SAMPLE_VIDEOS.map((s) => (
                                <button
                                    key={s.title}
                                    type="button"
                                    onClick={() => {
                                        setVideoUrl(s.url);
                                        broadcastWatchEvent("change_video", { url: s.url });
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] text-white/70 hover:text-white transition-colors whitespace-nowrap"
                                >
                                    {s.title}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}

WatchTogetherOverlay.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    selectedUser: PropTypes.object,
    socket: PropTypes.object
};

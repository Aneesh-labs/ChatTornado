import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, ChevronDown, ChevronUp, X, ExternalLink } from "lucide-react";
import { getPinnedMessages, unpinMessage } from "../../../Services/pinnedMessagesService";
import { soundEngine } from "../../../utils/soundEffects";

export default function PinnedMessagesBanner({ conversationId, onJumpToMessage }) {
    const [pins, setPins] = useState(() => getPinnedMessages(conversationId));
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        setPins(getPinnedMessages(conversationId));

        const handlePinsChanged = () => {
            setPins(getPinnedMessages(conversationId));
        };

        window.addEventListener("vortex_pinned_messages_changed", handlePinsChanged);
        return () => window.removeEventListener("vortex_pinned_messages_changed", handlePinsChanged);
    }, [conversationId]);

    if (!pins || pins.length === 0) return null;

    const latestPin = pins[0];

    const handleJump = (msgId) => {
        if (onJumpToMessage) {
            onJumpToMessage(msgId);
            soundEngine?.play?.("cyber_chirp");
        }
    };

    const handleUnpin = (e, msgId) => {
        e.stopPropagation();
        unpinMessage(conversationId, msgId);
        soundEngine?.play?.("pop");
    };

    return (
        <div className="relative z-15 w-full bg-[#0a0d17]/90 border-b border-cyan-500/20 backdrop-blur-md select-none">
            {/* Compact Header Bar (takes minimal vertical height, strictly non-cramping) */}
            <div className="flex items-center justify-between px-3 sm:px-5 py-1.5 gap-2 text-xs">
                <div
                    onClick={() => handleJump(latestPin.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer group"
                    title="Click to jump to pinned transmission"
                >
                    <div className="w-5 h-5 rounded-md bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 flex-shrink-0 group-hover:scale-105 transition-transform">
                        <Pin className="w-3 h-3" />
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 flex-shrink-0">
                            Pinned {pins.length > 1 ? `(${pins.length})` : ""}
                        </span>
                        <span className="text-white/40 text-[10px] hidden sm:inline">•</span>
                        <span className="text-white/80 truncate text-[11px] font-medium group-hover:text-cyan-200 transition-colors">
                            {latestPin.text || "Transmission"}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => handleJump(latestPin.id)}
                        className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all cursor-pointer"
                    >
                        <span>Jump</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                    </button>

                    {pins.length > 1 && (
                        <button
                            type="button"
                            onClick={() => setIsExpanded((prev) => !prev)}
                            className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title={isExpanded ? "Collapse pins" : "View all pins"}
                        >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={(e) => handleUnpin(e, latestPin.id)}
                        className="p-1 rounded-md text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Unpin this message"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Expanded List Drawer */}
            <AnimatePresence>
                {isExpanded && pins.length > 1 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-white/5 bg-black/40 px-3 sm:px-5 py-2 space-y-1.5 max-h-48 overflow-y-auto no-scrollbar"
                    >
                        {pins.map((pin, idx) => (
                            <div
                                key={pin.id || idx}
                                className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-xs transition-colors group"
                            >
                                <div
                                    onClick={() => handleJump(pin.id)}
                                    className="flex-1 min-w-0 cursor-pointer pr-2"
                                >
                                    <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                                        <span className="font-semibold text-cyan-300">{pin.senderName}</span>
                                        <span>•</span>
                                        <span>{new Date(pin.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                    <p className="text-white/90 truncate font-mono text-[11px] mt-0.5">
                                        {pin.text}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleJump(pin.id)}
                                        className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold hover:bg-cyan-500/30 transition-colors cursor-pointer"
                                    >
                                        Jump
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => handleUnpin(e, pin.id)}
                                        className="p-1 rounded text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                        title="Unpin"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

PinnedMessagesBanner.propTypes = {
    conversationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onJumpToMessage: PropTypes.func,
};

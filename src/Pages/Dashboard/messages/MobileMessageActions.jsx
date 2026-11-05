import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { useTheme } from "./constants";
import { speechService } from "../../../utils/speechService";
import { togglePinMessage, isMessagePinned } from "../../../Services/pinnedMessagesService";
import soundEngine from "../../../utils/soundEffects";

const QUICK_REACTIONS = ["⚡", "🛸", "💀", "🛡️", "🔥", "❤️", "👍", "😂"];

const MobileMessageActions = React.memo(({
    open,
    msg,
    isMe,
    onClose,
    onReaction,
    onReply,
    onSelect,
    onDelete,
    onFork,
    conversationId,
}) => {
    const theme = useTheme();
    const isSpeaking = msg ? speechService.isSpeaking(msg.id) : false;
    const targetConvId = conversationId || msg?.conversation_id || msg?.receiver_id || msg?.sender_id;
    const isPinned = isMessagePinned(targetConvId, msg?.id);

    const handlePinToggle = () => {
        if (!targetConvId || !msg) return;
        togglePinMessage(targetConvId, msg);
        soundEngine?.play?.("coin");
        onClose?.();
    };

    return (
        <AnimatePresence>
            {open && msg && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
                        aria-hidden="true"
                    />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        className={`fixed bottom-0 left-0 right-0 z-[61] lg:hidden rounded-t-2xl ${theme.glass} border-t ${theme.border} backdrop-blur-2xl pb-safe`}
                        role="dialog"
                        aria-label="Message actions"
                    >
                        <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-3 mb-4" />

                        <p className="px-5 text-[11px] text-white/40 truncate mb-3 font-mono">
                            {msg.message}
                        </p>

                        {/* Sci-Fi Reactions Bar */}
                        <div className="flex items-center justify-center gap-1.5 px-3 pb-3 overflow-x-auto no-scrollbar">
                            {QUICK_REACTIONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                        onReaction?.(msg.id, emoji);
                                        soundEngine?.play?.("coin");
                                        onClose?.();
                                    }}
                                    className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] text-base flex items-center justify-center active:scale-90 transition-transform touch-manipulation flex-shrink-0"
                                    aria-label={`React with ${emoji}`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>

                        {/* Action List */}
                        <div className="border-t border-white/[0.06] px-2 py-2 space-y-0.5 max-h-[42vh] overflow-y-auto custom-scrollbar">
                            <button
                                type="button"
                                onClick={handlePinToggle}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm text-cyan-300 hover:bg-cyan-500/10 active:bg-cyan-500/20 transition-colors touch-manipulation"
                            >
                                <span className="text-base">📌</span>
                                <span className="font-semibold">{isPinned ? "Unpin Transmission" : "Pin Transmission to Top"}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    speechService.speakMessage(msg.id, msg.message);
                                    onClose?.();
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-colors touch-manipulation ${
                                    isSpeaking
                                        ? "text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20"
                                        : "text-white/80 hover:bg-white/[0.04] active:bg-white/[0.06]"
                                }`}
                            >
                                <span className="text-base">{isSpeaking ? "⏹️" : "🔊"}</span>
                                <span className="font-medium">
                                    {isSpeaking ? "Stop reading out loud" : "Read out loud"}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (msg?.message) {
                                        navigator.clipboard.writeText(msg.message);
                                        soundEngine?.play?.("cyber_chirp");
                                    }
                                    onClose?.();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm text-white/80 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors touch-manipulation"
                            >
                                <span className="text-base">📋</span>
                                Copy text
                            </button>

                            {isMe && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent("edit_message", { detail: msg }));
                                        onClose?.();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm text-white/80 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors touch-manipulation"
                                >
                                    <span className="text-base">✏️</span>
                                    Edit message
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    onReply?.(msg);
                                    onClose?.();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm text-white/80 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors touch-manipulation"
                            >
                                <span className="text-base">↩</span>
                                Reply
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onFork?.(msg);
                                    onClose?.();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm text-purple-300 hover:bg-purple-500/10 active:bg-purple-500/20 transition-colors touch-manipulation"
                            >
                                <span className="text-base">🔀</span>
                                Fork Reality from Here
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onSelect?.(msg.id);
                                    onClose?.();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm text-white/80 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors touch-manipulation"
                            >
                                <span className="text-base">☑</span>
                                Select message
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onDelete?.(msg.id, isMe ? "both" : "me");
                                    onClose?.();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors touch-manipulation"
                            >
                                <span className="text-base">🗑</span>
                                Delete message
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-3.5 pb-8 sm:pb-3.5 text-xs font-semibold text-white/40 border-t border-white/[0.06] touch-manipulation"
                        >
                            Cancel
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});

MobileMessageActions.displayName = "MobileMessageActions";

MobileMessageActions.propTypes = {
    open: PropTypes.bool.isRequired,
    msg: PropTypes.object,
    isMe: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onReaction: PropTypes.func,
    onReply: PropTypes.func,
    onSelect: PropTypes.func,
    onDelete: PropTypes.func,
    onFork: PropTypes.func,
    conversationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default MobileMessageActions;

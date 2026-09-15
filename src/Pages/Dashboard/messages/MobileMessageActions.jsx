import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { useTheme } from "./constants";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

const MobileMessageActions = React.memo(({ open, msg, isMe, onClose, onReaction, onReply, onSelect, onDelete }) => {
    const theme = useTheme();

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

                        <p className="px-5 text-[11px] text-white/30 truncate mb-3">
                            {msg.message}
                        </p>

                        <div className="flex items-center justify-center gap-2 px-4 pb-3">
                            {QUICK_REACTIONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => { onReaction?.(msg.id, emoji); onClose?.(); }}
                                    className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] text-lg flex items-center justify-center active:scale-90 transition-transform touch-manipulation"
                                    aria-label={`React with ${emoji}`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-white/[0.06] px-2 py-2 space-y-0.5 max-h-[40vh] overflow-y-auto">
                            <button
                                type="button"
                                onClick={() => { 
                                    if(msg?.message) {
                                        navigator.clipboard.writeText(msg.message);
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
                                        // Emit a custom event so Messages.jsx can pick it up
                                        window.dispatchEvent(new CustomEvent('edit_message', { detail: msg }));
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
                                onClick={() => { onReply?.(msg); onClose?.(); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm text-white/80 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors touch-manipulation"
                            >
                                <span className="text-base">↩</span>
                                Reply
                            </button>
                            <button
                                type="button"
                                onClick={() => { onSelect?.(msg.id); onClose?.(); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm text-white/80 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors touch-manipulation"
                            >
                                <span className="text-base">☑</span>
                                Select message
                            </button>
                            <button
                                type="button"
                                onClick={() => { onDelete?.(msg.id, isMe ? "both" : "me"); onClose?.(); }}
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
};

export default MobileMessageActions;

import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { AnimatePresence } from "framer-motion";
import { DateDivider } from "./constants";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import MobileMessageActions from "./MobileMessageActions";
import API from "../../../Services/API";
import { motion } from "framer-motion";

const SessionDivider = ({ sessionText }) => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const messageLines = (sessionText || "").trim().split('\n').filter(Boolean);
    const hasEnoughContent = messageLines.length >= 2;

    const handleSummarize = async () => {
        if (summary) {
            setOpen((prev) => !prev);
            return;
        }
        if (!sessionText || sessionText.trim() === "") return;
        setLoading(true);
        try {
            const token = sessionStorage.getItem("token");
            const res = await fetch(API.defaults.baseURL + "/ai_summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ chat_text: sessionText, token })
            });
            const data = await res.json();
            if (data.success) {
                setSummary(data.summary);
                setOpen(true);
            }
        } catch (e) {
            console.error("Failed to summarize session:", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center my-3 w-full px-4 select-none">
            <div className="flex items-center gap-2 max-w-md w-full justify-center">
                <div className="h-px bg-white/[0.06] flex-1"></div>
                {hasEnoughContent ? (
                    <button 
                        type="button"
                        onClick={handleSummarize} 
                        disabled={loading}
                        className="text-[10px] text-cyan-400/80 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/20 px-2.5 py-0.5 rounded-full transition-all touch-manipulation disabled:opacity-50 flex items-center gap-1.5 active:scale-95 shadow-sm"
                    >
                        <span>✨</span>
                        <span>{loading ? "Summarizing…" : (summary ? (open ? "Hide Summary" : "View Summary") : "Summarize Session")}</span>
                    </button>
                ) : (
                    <span className="text-[10px] text-white/20 font-medium">1h+ gap</span>
                )}
                <div className="h-px bg-white/[0.06] flex-1"></div>
            </div>
            
            {open && summary && (
                <motion.div 
                    initial={{ opacity: 0, y: -6, scale: 0.98 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="mt-2.5 bg-cyan-950/50 border border-cyan-500/25 rounded-xl p-3 sm:p-3.5 text-xs text-cyan-100/90 leading-relaxed text-left shadow-xl backdrop-blur-md max-w-xl w-full"
                >
                    <div className="flex items-center justify-between mb-1 text-[10px] font-bold text-cyan-300">
                        <span className="flex items-center gap-1">✨ AI Session Summary</span>
                        <button 
                            type="button" 
                            onClick={() => setOpen(false)}
                            className="text-cyan-400/50 hover:text-cyan-200 text-xs px-1"
                        >
                            ✕
                        </button>
                    </div>
                    <p className="whitespace-pre-wrap">{summary}</p>
                </motion.div>
            )}
        </div>
    );
};

const ChatMessages = React.memo(({
    groupedMessages = [],
    typingUsers = new Set(),
    enrichedSelected,
    myUserId,
    selectionMode,
    selectedMsgIds = new Set(),
    setSelectedMsgIds,
    setSelectionMode,
    addReaction,
    setReplyingTo,
    scrollContainerRef,
    messagesEndRef,
    onSelectMessage,
    onDelete,
    isMobile = false,
    socket = null,
    onSend,
}) => {
    const [mobileActionMsg, setMobileActionMsg] = useState(null);

    const handleSelectMessage = useCallback((id) => {
        if (onSelectMessage) {
            onSelectMessage(id);
            return;
        }
        setSelectedMsgIds((prev) => {
            const next = prev instanceof Set ? new Set(prev) : new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            if (next.size === 0) setSelectionMode(false);
            return next;
        });
    }, [onSelectMessage, setSelectedMsgIds, setSelectionMode]);

    const isMessageSelected = useCallback((id) => {
        if (selectedMsgIds instanceof Set) return selectedMsgIds.has(id);
        return Array.isArray(selectedMsgIds) ? selectedMsgIds.includes(id) : false;
    }, [selectedMsgIds]);

    const handleMobileLongPress = useCallback((msg) => {
        if (!isMobile || selectionMode) return;
        setMobileActionMsg(msg);
    }, [isMobile, selectionMode]);

    return (
        <>
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-2 sm:px-6 py-3 sm:py-6 space-y-1 sm:space-y-3 min-h-0 custom-scrollbar overscroll-contain select-none"
            >
                <AnimatePresence initial={false}>
                    {groupedMessages.map((item) => {
                        if (item.type === "divider") {
                            return <DateDivider key={item.key || item.label} label={item.label} />;
                        }
                        if (item.type === "session_divider") {
                            return <SessionDivider key={item.key} sessionText={item.sessionText} />;
                        }
                        if (!item.msg?.id) return null;
                        const isMe = item.msg.sender_id === myUserId;
                        const isSelected = isMessageSelected(item.msg.id);
                        return (
                            <MessageBubble
                                key={item.msg.id}
                                msg={item.msg}
                                isMe={isMe}
                                showAvatar={item.showAvatar}
                                user={enrichedSelected}
                                socket={socket}
                                onReaction={addReaction}
                                onReply={setReplyingTo}
                                onSelect={selectionMode ? handleSelectMessage : undefined}
                                onLongPress={handleMobileLongPress}
                                onDelete={onDelete}
                                selected={isSelected}
                                isMobile={isMobile}
                                onSend={onSend}
                            />
                        );
                    })}
                </AnimatePresence>
                <AnimatePresence>
                    {enrichedSelected?.id && typingUsers?.has?.(enrichedSelected.id) && (
                        <TypingIndicator user={enrichedSelected} />
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} className="h-1 sm:h-2 w-full clear-both" aria-hidden="true" />
            </div>

            <MobileMessageActions
                open={!!mobileActionMsg}
                msg={mobileActionMsg}
                isMe={mobileActionMsg?.sender_id === myUserId}
                onClose={() => setMobileActionMsg(null)}
                onReaction={addReaction}
                onReply={setReplyingTo}
                onSelect={handleSelectMessage}
                onDelete={onDelete}  // ✅ PASS TO MOBILE ACTIONS
            />
        </>
    );
});

ChatMessages.displayName = "ChatMessages";

ChatMessages.propTypes = {
    groupedMessages: PropTypes.array.isRequired,
    typingUsers: PropTypes.oneOfType([PropTypes.instanceOf(Set), PropTypes.array]),
    enrichedSelected: PropTypes.object,
    myUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    selectionMode: PropTypes.bool.isRequired,
    selectedMsgIds: PropTypes.oneOfType([
        PropTypes.instanceOf(Set),
        PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
    ]).isRequired,
    setSelectedMsgIds: PropTypes.func.isRequired,
    setSelectionMode: PropTypes.func.isRequired,
    addReaction: PropTypes.func.isRequired,
    setReplyingTo: PropTypes.func.isRequired,
    scrollContainerRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]).isRequired,
    messagesEndRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]).isRequired,
    onSelectMessage: PropTypes.func,
    onDelete: PropTypes.func,  // ✅ NEW PROP
    isMobile: PropTypes.bool,
};

export default ChatMessages;
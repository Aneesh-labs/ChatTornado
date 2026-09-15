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

    const handleSummarize = async () => {
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
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center my-4 w-full px-4">
            <div className="w-full flex items-center gap-4">
                <div className="h-px bg-white/10 flex-1"></div>
                {!summary && (
                    <button 
                        onClick={handleSummarize} 
                        disabled={loading}
                        className="text-[10px] sm:text-xs font-semibold text-cyan-400 bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/30 px-3 py-1.5 rounded-full transition-all touch-manipulation disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {loading ? "Summarizing..." : "✨ Summarize Session"}
                    </button>
                )}
                {summary && (
                    <span className="text-[10px] sm:text-xs font-bold text-cyan-400 px-3 py-1.5 rounded-full bg-cyan-900/20 border border-cyan-500/20 flex items-center gap-1.5">
                        ✨ Session Summary
                    </span>
                )}
                <div className="h-px bg-white/10 flex-1"></div>
            </div>
            
            {summary && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 bg-cyan-950/40 border border-cyan-500/20 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-cyan-100/90 leading-relaxed text-left shadow-lg backdrop-blur-sm max-w-2xl w-full"
                >
                    {summary}
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
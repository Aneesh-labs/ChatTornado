import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { AnimatePresence } from "framer-motion";
import { DateDivider, areIdsEqual } from "./constants";
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
    onGameMove,
    onRetry,
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

    const isAiChat = Boolean(
        enrichedSelected?.is_bot ||
        enrichedSelected?.username?.toLowerCase?.() === "vortex-9" ||
        enrichedSelected?.username?.toLowerCase?.() === "vortex9"
    );

    const hasMessages = groupedMessages.some((item) => item.type === "message" && (item.msg?.id || item.msg?.temp_id));

    return (
        <>
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-2 sm:px-6 py-3 sm:py-6 space-y-1 sm:space-y-3 min-h-0 custom-scrollbar overscroll-contain select-none"
            >
                {!hasMessages && isAiChat && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-4 py-8 select-none">
                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center text-3xl mb-4 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                            🤖
                        </div>
                        <h2 className="text-xl font-black tracking-tight text-white mb-1.5 flex items-center gap-2">
                            <span>VORTEX-9</span>
                            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300">
                                Online
                            </span>
                        </h2>
                        <p className="text-xs text-white/50 max-w-sm mb-6 leading-relaxed">
                            Your high-performance AI assistant. Ask questions, build software, explore ideas, or start autonomous research.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-md w-full">
                            {[
                                { icon: "⚡", title: "What can you do?", prompt: "What can you help me with?" },
                                { icon: "💻", title: "Coding & Architecture", prompt: "Can you help me design a fast, secure backend service?" },
                                { icon: "🔬", title: "Deep Research", prompt: "/research Quantum error correction progress in 2026" },
                                { icon: "💡", title: "Brainstorm Ideas", prompt: "Brainstorm 5 innovative startup ideas in AI devtools" }
                            ].map((starter, sIdx) => (
                                <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() => onSend?.(starter.prompt)}
                                    className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/30 text-left transition-all group active:scale-98 cursor-pointer"
                                >
                                    <span className="text-lg">{starter.icon}</span>
                                    <div>
                                        <div className="text-xs font-bold text-white/90 group-hover:text-cyan-300 transition-colors">
                                            {starter.title}
                                        </div>
                                        <div className="text-[10px] text-white/40 truncate max-w-[170px]">
                                            {starter.prompt}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {!hasMessages && !isAiChat && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[260px] text-center px-4 py-8 select-none">
                        <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-2xl mb-3 shadow-inner">
                            💬
                        </div>
                        <h3 className="text-sm font-bold text-white mb-1">
                            No messages yet
                        </h3>
                        <p className="text-xs text-white/40 max-w-xs">
                            This is the beginning of your conversation with <span className="text-white/70 font-semibold">{enrichedSelected?.username || "this user"}</span>. Say hello! 👋
                        </p>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {groupedMessages.map((item) => {
                        if (item.type === "divider") {
                            return <DateDivider key={item.key || item.label} label={item.label} />;
                        }
                        if (item.type === "session_divider") {
                            return <SessionDivider key={item.key} sessionText={item.sessionText} />;
                        }
                        if (!item.msg?.id && !item.msg?.temp_id) return null;
                        const isMe = areIdsEqual(item.msg.sender_id, myUserId);
                        const msgIdentifier = item.msg.id || item.msg.temp_id;
                        const isSelected = isMessageSelected(msgIdentifier);
                        return (
                            <MessageBubble
                                key={item.key || msgIdentifier}
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
                                onGameMove={onGameMove}
                                onRetry={onRetry}
                            />
                        );
                    })}
                </AnimatePresence>
                <AnimatePresence>
                    {enrichedSelected?.id && (typingUsers?.has?.(enrichedSelected.id) || typingUsers?.has?.(Number(enrichedSelected.id)) || typingUsers?.has?.(String(enrichedSelected.id))) && (
                        <TypingIndicator user={enrichedSelected} />
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} className="h-1 sm:h-2 w-full clear-both" aria-hidden="true" />
            </div>

            <MobileMessageActions
                open={!!mobileActionMsg}
                msg={mobileActionMsg}
                isMe={areIdsEqual(mobileActionMsg?.sender_id, myUserId)}
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
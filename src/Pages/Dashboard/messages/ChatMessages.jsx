import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { AnimatePresence } from "framer-motion";
import { DateDivider } from "./constants";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import MobileMessageActions from "./MobileMessageActions";

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
    onDelete,              // ✅ NEW PROP
    isMobile = false,
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
                                onReaction={addReaction}
                                onReply={setReplyingTo}
                                onSelect={selectionMode ? handleSelectMessage : undefined}
                                onLongPress={handleMobileLongPress}
                                onDelete={onDelete}  // ✅ PASS TO MESSAGE BUBBLE
                                selected={isSelected}
                                isMobile={isMobile}
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
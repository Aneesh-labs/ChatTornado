import React from "react";
import PropTypes from "prop-types";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ScrollBar from "./ScrollBar";

const ChatWindow = React.memo(({
    enrichedSelected,
    rightPanelOpen,
    setRightPanelOpen,
    groupedMessages,
    typingUsers,
    myUserId,
    selectionMode,
    selectedMsgIds,
    setSelectedMsgIds,
    setSelectionMode,
    addReaction,
    setReplyingTo,
    scrollContainerRef,
    messagesEndRef,
    showScrollBtn,
    currentTheme,
    scrollToBottom,
    sendMessage,
    socketReady,
    replyingTo,
    onBack,
    onOpenSearch,
    onToggleSelectionMode,
    onSelectMessage,
    isMobile = false,
    onStartCall,
    onStartGhostChat,
    socket,
    onDelete,              // ✅ NEW PROP
    onDeleteSelected,      // ✅ NEW PROP
}) => {
    const handleTogglePanel = () => {
        setRightPanelOpen((prev) => !prev);
    };

    const handleCancelReply = () => {
        setReplyingTo(null);
    };

    const selectedCount = selectedMsgIds instanceof Set ? selectedMsgIds.size : selectedMsgIds.length;

    return (
        <div role="main" aria-label="Chat Conversation Window" className="flex flex-col flex-1 overflow-hidden relative w-full h-full min-h-0 bg-transparent antialiased select-none">
            <ChatHeader
                user={enrichedSelected}
                onTogglePanel={handleTogglePanel}
                panelOpen={rightPanelOpen}
                onBack={onBack}
                onOpenSearch={onOpenSearch}
                selectionMode={selectionMode}
                selectedCount={selectedCount}
                onToggleSelectionMode={onToggleSelectionMode}
                onCancelSelection={() => {
                    setSelectionMode(false);
                    setSelectedMsgIds(new Set());
                }}
                onStartCall={onStartCall}
                onStartGhostChat={onStartGhostChat}
                onDeleteSelected={onDeleteSelected}  // ✅ PASS TO HEADER
            />
            <ChatMessages
                groupedMessages={groupedMessages}
                typingUsers={typingUsers}
                enrichedSelected={enrichedSelected}
                myUserId={myUserId}
                selectionMode={selectionMode}
                selectedMsgIds={selectedMsgIds}
                setSelectedMsgIds={setSelectedMsgIds}
                setSelectionMode={setSelectionMode}
                addReaction={addReaction}
                setReplyingTo={setReplyingTo}
                scrollContainerRef={scrollContainerRef}
                messagesEndRef={messagesEndRef}
                onSelectMessage={onSelectMessage}
                onDelete={onDelete}
                isMobile={isMobile}
                socket={socket}
                onSend={sendMessage}
            />
            <ScrollBar show={showScrollBtn} currentTheme={currentTheme} scrollToBottom={scrollToBottom} isMobile={isMobile} />
            {!selectionMode && (
                <ChatInput
                    onSend={sendMessage}
                    replyTo={replyingTo}
                    onCancelReply={handleCancelReply}
                    selectedUser={enrichedSelected}
                    disabled={!socketReady}
                    socket={socket}
                />
            )}
        </div>
    );
});

ChatWindow.displayName = "ChatWindow";

ChatWindow.propTypes = {
    enrichedSelected: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        username: PropTypes.string.isRequired,
        avatar: PropTypes.string,
        status: PropTypes.string,
    }),
    rightPanelOpen: PropTypes.bool.isRequired,
    setRightPanelOpen: PropTypes.func.isRequired,
    groupedMessages: PropTypes.array.isRequired,
    typingUsers: PropTypes.instanceOf(Set),
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
    showScrollBtn: PropTypes.bool.isRequired,
    currentTheme: PropTypes.object,
    scrollToBottom: PropTypes.func.isRequired,
    sendMessage: PropTypes.func.isRequired,
    socketReady: PropTypes.bool.isRequired,
    replyingTo: PropTypes.object,
    onBack: PropTypes.func,
    onOpenSearch: PropTypes.func,
    onToggleSelectionMode: PropTypes.func,
    onSelectMessage: PropTypes.func,
    isMobile: PropTypes.bool,
    onStartCall: PropTypes.func,
    onStartGhostChat: PropTypes.func,   // ✅ NEW PROP
    socket: PropTypes.object,
    onDelete: PropTypes.func,           // ✅ NEW PROP
    onDeleteSelected: PropTypes.func,   // ✅ NEW PROP
};

export default ChatWindow;
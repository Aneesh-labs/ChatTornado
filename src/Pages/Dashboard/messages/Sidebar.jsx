import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { useTheme, Avatar, Badge, IconBtn } from "./constants";

const FILTER_TABS = [
    ["all", "All"],
    ["pinned", "Pinned"],
    ["unread", "Unread"],
];

export const ConversationCard = React.memo(({
    user = {},
    selected = false,
    unread = 0,
    pinned = false,
    typing = false,
    onSelect,
    onPin
    onPin,
    isGlobal = false,
    connectionStatus = null,
    onRequestConnection
}) => {
    const theme = useTheme();

    const handleKeyDown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect?.();
            if (!isGlobal || connectionStatus === "accepted") {
                onSelect?.();
            }
        }
    };
    
    const handleActionClick = (e) => {
        e.stopPropagation();
        if (onRequestConnection) {
            onRequestConnection(user.id);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            whileHover={{ x: 2 }}
            onClick={onSelect}
            onClick={() => {
                if (!isGlobal || connectionStatus === "accepted") {
                    onSelect?.();
                }
            }}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-selected={selected}
            className={`relative flex items-center gap-3 px-3 py-3 rounded-2xl cursor-pointer transition-all duration-150 group outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 touch-manipulation active:scale-[0.99] ${selected
            className={`relative flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-150 group outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 touch-manipulation ${isGlobal && connectionStatus !== "accepted" ? "cursor-default" : "cursor-pointer active:scale-[0.99]"} ${selected
                ? `bg-gradient-to-r ${theme?.accent || "from-violet-600 to-indigo-600"} bg-opacity-20 border border-white/[0.12] shadow-lg`
                : `border border-transparent ${theme?.glassHover || "hover:bg-white/[0.02]"} hover:border-white/[0.06]`
                }`}
        >
            {selected && (
            {selected && !isGlobal && (
                <motion.div
                    layoutId="selectedBar"
                    className={`absolute left-0 top-1/4 bottom-1/4 w-0.5 rounded-full bg-gradient-to-b ${theme?.accent || "from-violet-500 to-indigo-500"}`}
                />
            )}

            <Avatar user={user} size="sm" />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm font-semibold truncate ${selected ? "text-white" : "text-white/80"}`}>
                        {user?.username || "Unknown User"}
                    </span>
                    {pinned && (
                    {pinned && !isGlobal && (
                        <span role="img" aria-label="Pinned conversation" className="text-[10px] text-white/25 flex-shrink-0">
                            📌
                        </span>
                    )}
                </div>

                {typing ? (
                {typing && !isGlobal ? (
                    <span className={`text-xs ${theme?.accentText || "text-violet-400"} font-medium`}>
                        typing…
                    </span>
                ) : (
                    <span className="text-xs text-white/30 truncate block">
                        {user?.status === "online" ? "Active now" : "Offline"}
                    </span>
                )}
            </div>

            <div className="flex flex-col items-end gap-1.5 flex-shrink-0 min-w-[24px]">
                <AnimatePresence>
                    {unread > 0 && <Badge count={unread} />}
                </AnimatePresence>
                {isGlobal ? (
                    <div className="flex items-center justify-end">
                        {connectionStatus === "accepted" ? (
                            <span className="text-[10px] text-green-400 font-semibold bg-green-400/10 px-2 py-0.5 rounded-full">Connected</span>
                        ) : connectionStatus === "pending" ? (
                            <span className="text-[10px] text-yellow-400 font-semibold bg-yellow-400/10 px-2 py-0.5 rounded-full">Pending</span>
                        ) : (
                            <button
                                onClick={handleActionClick}
                                className="text-[10px] bg-violet-600 hover:bg-violet-500 text-white font-semibold px-2.5 py-1 rounded-full transition-colors"
                            >
                                Request
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <AnimatePresence>
                            {unread > 0 && <Badge count={unread} />}
                        </AnimatePresence>

                <div className="h-4 flex items-center justify-end">
                    <button
                        type="button"
                        aria-label={pinned ? "Unpin conversation" : "Pin conversation"}
                        onClick={(e) => {
                            e.stopPropagation();
                            onPin?.();
                        }}
                        className={`text-[11px] p-1 transition-colors touch-manipulation lg:opacity-0 lg:group-hover:opacity-100 ${pinned ? "text-violet-400 opacity-100" : "text-white/20 hover:text-white/50"}`}
                    >
                        {pinned ? "★" : "☆"}
                    </button>
                </div>
                        <div className="h-4 flex items-center justify-end">
                            <button
                                type="button"
                                aria-label={pinned ? "Unpin conversation" : "Pin conversation"}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPin?.();
                                }}
                                className={`text-[11px] p-1 transition-colors touch-manipulation lg:opacity-0 lg:group-hover:opacity-100 ${pinned ? "text-violet-400 opacity-100" : "text-white/20 hover:text-white/50"}`}
                            >
                                {pinned ? "★" : "☆"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </motion.div>
    );
});

ConversationCard.propTypes = {
    user: PropTypes.object,
    selected: PropTypes.bool,
    unread: PropTypes.number,
    pinned: PropTypes.bool,
    typing: PropTypes.bool,
    onSelect: PropTypes.func,
    onPin: PropTypes.func,
    isGlobal: PropTypes.bool,
    connectionStatus: PropTypes.string,
    onRequestConnection: PropTypes.func,
};

ConversationCard.displayName = "ConversationCard";

const MAIN_TABS = [
    ["chats", "Chats"],
    ["global", "Global"],
];

const Sidebar = React.memo(({
    users = [],
    users = [], // Will be used for Global
    activeUsers = [], // Will be used for Chats
    connectionStatuses = {}, // To show pending/connected
    selectedUser = null,
    unreadCounts = {},
    pinnedChats = new Set(),
    typingUsers = new Set(),
    onSelectUser,
    onPinUser,
    onOpenSearch,
    onOpenSettings,
    onOpenInfoPanel,
    onRequestConnection,
    myUserId
}) => {
    const theme = useTheme();
    const [filter, setFilter] = useState("all");
    const [mainTab, setMainTab] = useState("chats");

    const safePinnedChats = pinnedChats instanceof Set ? pinnedChats : new Set();
    const safeTypingUsers = typingUsers instanceof Set ? typingUsers : new Set();
    const safeUnreadCounts = unreadCounts && typeof unreadCounts === "object" ? unreadCounts : {};

    const sortedUsers = useMemo(() => {
        if (!Array.isArray(users)) return [];
        const sourceList = mainTab === "chats" ? activeUsers : users;
        if (!Array.isArray(sourceList)) return [];

        const pinnedList = [];
        const unpinnedList = [];

        users.forEach((user) => {
        sourceList.forEach((user) => {
            if (!user || typeof user.id === "undefined") return;

            const isPinned = safePinnedChats.has(user.id);
            const isUnread = (safeUnreadCounts[user.id] || 0) > 0;

            if (filter === "pinned" && !isPinned) return;
            if (filter === "unread" && !isUnread) return;
            if (mainTab === "chats") {
                if (filter === "pinned" && !isPinned) return;
                if (filter === "unread" && !isUnread) return;
            }

            if (isPinned) {
            if (isPinned && mainTab === "chats") {
                pinnedList.push(user);
            } else {
                unpinnedList.push(user);
            }
        });

        return [...pinnedList, ...unpinnedList];
    }, [users, safePinnedChats, safeUnreadCounts, filter]);
    }, [users, activeUsers, mainTab, safePinnedChats, safeUnreadCounts, filter]);

    const totalUnread = useMemo(() => {
        return Object.values(safeUnreadCounts).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
    }, [safeUnreadCounts]);

    const myUser = useMemo(() => {
        return Array.isArray(users) ? users.find((u) => u?.id === myUserId) : null;
    }, [users, myUserId]);

    return (
        <div className={`w-full h-full flex flex-col relative ${theme?.sidebar || ""} border-r ${theme?.border || ""} backdrop-blur-2xl overflow-hidden`}>

            <div className={`flex flex-col gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b ${theme?.border || ""}`}>
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${theme?.accent || "from-violet-500 to-indigo-500"} flex items-center justify-center shadow-lg`}>
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-sm font-bold text-white/90 tracking-tight block">Messages</span>
                            <span className="text-[10px] text-white/30">{users.length} conversations</span>
                            <span className="text-[10px] text-white/30">{activeUsers.length} conversations</span>
                        </div>
                        {totalUnread > 0 && <Badge count={totalUnread} />}
                    </div>

                    <div className="flex items-center gap-1">
                        <IconBtn onClick={onOpenSearch} title="Search ⌘K" small>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </IconBtn>

                        <IconBtn onClick={onOpenSettings} title="Settings" small>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </IconBtn>
                    </div>
                </div>

                {selectedUser && onOpenInfoPanel && (
                    <button
                        type="button"
                        onClick={onOpenInfoPanel}
                        className="flex lg:hidden items-center justify-between w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all active:scale-[0.99] touch-manipulation"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <Avatar user={selectedUser} size="xs" showStatus={false} />
                            <span className="text-[11px] font-medium text-white/60 truncate">
                                <span className="text-white/90 font-semibold">{selectedUser.username}</span>
                            </span>
                        </div>
                        <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider flex-shrink-0 ml-2">
                            Info →
                        </span>
                    </button>
                )}
            </div>

            {/* Filter Tabs */}
            <div className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 border-b ${theme?.border || ""}`} role="tablist">
                {FILTER_TABS.map(([key, label]) => {
                    const isFilterActive = filter === key;
            
            {/* Main Tabs */}
            <div className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 border-b ${theme?.border || ""}`} role="tablist">
                {MAIN_TABS.map(([key, label]) => {
                    const isFilterActive = mainTab === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={isFilterActive}
                            onClick={() => setFilter(key)}
                            className={`flex-1 text-[11px] py-2 rounded-xl font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-white/20 touch-manipulation ${isFilterActive
                                ? `bg-gradient-to-r ${theme?.accent || "from-violet-500 to-indigo-500"} text-white shadow`
                                : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                            onClick={() => setMainTab(key)}
                            className={`flex-1 text-[12px] py-1.5 rounded-xl font-bold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-white/20 touch-manipulation ${isFilterActive
                                ? `bg-white/10 text-white shadow`
                                : "text-white/40 hover:text-white/70"
                                }`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* Filter Tabs */}
            {mainTab === "chats" && (
                <div className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 border-b ${theme?.border || ""}`} role="tablist">
                    {FILTER_TABS.map(([key, label]) => {
                        const isFilterActive = filter === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={isFilterActive}
                                onClick={() => setFilter(key)}
                                className={`flex-1 text-[10px] py-1 rounded-lg font-medium transition-all duration-150 outline-none touch-manipulation ${isFilterActive
                                    ? `bg-gradient-to-r ${theme?.accent || "from-violet-500 to-indigo-500"} text-white`
                                    : "text-white/30 hover:bg-white/[0.04]"
                                    }`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 min-h-0 custom-scrollbar overscroll-contain">
                <AnimatePresence mode="popLayout">
                    {sortedUsers.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-12 gap-3"
                        >
                            <div role="img" aria-label="Blank box visual illustration" className="text-3xl opacity-20">💬</div>
                            <p className="text-xs text-white/20 text-center px-4">
                                {filter === "pinned" ? "No pinned chats yet" : filter === "unread" ? "All caught up!" : "No conversations yet"}
                            </p>
                        </motion.div>
                    )}

                    {sortedUsers.map((user) => (
                        <ConversationCard
                            key={user.id}
                            user={user}
                            selected={selectedUser?.id === user.id}
                            unread={safeUnreadCounts[user.id] || 0}
                            pinned={safePinnedChats.has(user.id)}
                            typing={safeTypingUsers.has(user.id)}
                            onSelect={() => onSelectUser?.(user)}
                            onPin={() => onPinUser?.(user.id)}
                        />
                    ))}
                    {sortedUsers.map((user) => {
                        let status = null;
                        if (connectionStatuses && connectionStatuses[user.id]) {
                            status = connectionStatuses[user.id].status;
                        }
                        return (
                            <ConversationCard
                                key={user.id}
                                user={user}
                                selected={selectedUser?.id === user.id}
                                unread={safeUnreadCounts[user.id] || 0}
                                pinned={safePinnedChats.has(user.id)}
                                typing={safeTypingUsers.has(user.id)}
                                onSelect={() => onSelectUser?.(user)}
                                onPin={() => onPinUser?.(user.id)}
                                isGlobal={mainTab === "global"}
                                connectionStatus={status}
                                onRequestConnection={onRequestConnection}
                            />
                        );
                    })}
                </AnimatePresence>
            </div>

            {myUser && (
                <div className={`flex items-center gap-3 px-4 py-3 border-t ${theme?.border || ""} flex-shrink-0`}>
                    <Avatar user={myUser} size="sm" showStatus={false} />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white/70 truncate">{myUser.username}</p>
                        <p className="text-[10px] text-white/25">You</p>
                    </div>
                </div>
            )}

            {/* Floating search FAB — mobile only */}
            <button
                type="button"
                onClick={onOpenSearch}
                aria-label="Search conversations"
                className={`lg:hidden absolute bottom-20 right-4 w-12 h-12 rounded-2xl bg-gradient-to-br ${theme?.accent || "from-violet-500 to-indigo-500"} shadow-xl flex items-center justify-center z-10 active:scale-95 transition-transform touch-manipulation`}
            >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </button>
        </div>
    );
});

Sidebar.propTypes = {
    users: PropTypes.array,
    selectedUser: PropTypes.object,
    unreadCounts: PropTypes.object,
    pinnedChats: PropTypes.instanceOf(Set),
    typingUsers: PropTypes.instanceOf(Set),
    onSelectUser: PropTypes.func,
    onPinUser: PropTypes.func,
    onOpenSearch: PropTypes.func,
    onOpenSettings: PropTypes.func,
    onOpenInfoPanel: PropTypes.func,
    myUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

Sidebar.displayName = "Sidebar";

export default Sidebar;
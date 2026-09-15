import React from "react";
import PropTypes from "prop-types";
import { IconBtn, Avatar, useTheme } from "./constants";
import { triggerDemoNotification } from "../../../Services/notifications";

const ChatHeader = React.memo(({
    user = null,
    onTogglePanel,
    panelOpen = false,
    onBack,
    onOpenSearch,
    selectionMode = false,
    selectedCount = 0,
    onToggleSelectionMode,
    onCancelSelection,
    onStartCall,
    onStartGhostChat,
    onDeleteSelected, // ✅ NEW PROP
}) => {
    const theme = useTheme();
    const username = user?.username || "Chat Room";
    const isOnline = user?.status === "online";

    if (selectionMode) {
        return (
            <div className={`flex items-center justify-between px-3 sm:px-6 py-3 border-b ${theme.border} backdrop-blur-2xl bg-black/30 flex-shrink-0 w-full select-none`}>
                <button
                    type="button"
                    onClick={onCancelSelection}
                    className="text-xs font-semibold text-white/60 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors touch-manipulation"
                >
                    Cancel
                </button>
                <span className="text-xs sm:text-sm font-semibold text-white/80 tabular-nums">
                    {selectedCount} selected
                </span>
                <div className="flex items-center gap-2">
                    {/* ✅ DELETE SELECTED BUTTON */}
                    {selectedCount > 0 && onDeleteSelected && (
                        <button
                            type="button"
                            onClick={onDeleteSelected}
                            className="text-xs font-semibold text-red-400 hover:text-red-300 px-2 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors touch-manipulation flex items-center gap-1.5"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onToggleSelectionMode}
                        className="text-xs font-semibold text-violet-400 hover:text-violet-300 px-2 py-1.5 rounded-lg hover:bg-violet-500/10 transition-colors touch-manipulation"
                    >
                        Done
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-4 border-b ${theme.border} backdrop-blur-2xl bg-black/20 flex-shrink-0 w-full select-none`}>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Back to conversations"
                        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/[0.06] text-white/60 hover:text-white transition-colors flex-shrink-0 touch-manipulation"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}
                <Avatar user={user} size="md" className="flex-shrink-0 scale-90 sm:scale-100 origin-left" />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xs sm:text-sm font-semibold text-white leading-tight truncate tracking-wide">
                            {username}
                        </h2>
                        {Boolean(user?.is_bot || user?.username === "VORTEX-9") && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                                ⚡ AI CORE
                            </span>
                        )}
                    </div>
                    <p className={`text-[10px] sm:text-xs mt-0.5 font-medium transition-colors ${
                        Boolean(user?.is_bot || user?.username === "VORTEX-9")
                            ? "text-cyan-400 font-mono flex items-center gap-1"
                            : isOnline ? "text-emerald-400" : "text-white/25"
                    }`}>
                        {Boolean(user?.is_bot || user?.username === "VORTEX-9")
                            ? "⚡ Autonomous Neural Core"
                            : isOnline ? "Active now" : "Offline"}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                {onOpenSearch && (
                    <IconBtn title="Search" onClick={onOpenSearch} small className="lg:hidden">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </IconBtn>
                )}
                {!Boolean(user?.is_bot || user?.username === "VORTEX-9") && (
                    <>
                        <IconBtn title="Voice call" onClick={() => onStartCall?.(false)} small>
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </IconBtn>
                        <IconBtn title="Video call" onClick={() => onStartCall?.(true)} small>
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.867v6.266a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </IconBtn>
                        <IconBtn
                            title="Ghost Chat"
                            onClick={() => onStartGhostChat?.()}
                            small
                        >
                            <svg
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 10h.01M15 10h.01M9 14h6M7 20l-3-3V7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H7z"
                                />
                            </svg>
                        </IconBtn>
                    </>
                )}

                <IconBtn title="Select messages" onClick={onToggleSelectionMode} small className="sm:hidden">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                </IconBtn>
                <IconBtn title="Select messages" onClick={onToggleSelectionMode} small className="hidden sm:flex">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </IconBtn>
                <IconBtn title="Info" active={panelOpen} onClick={onTogglePanel} small>
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </IconBtn>
            </div>
        </div>
    );
});

ChatHeader.displayName = "ChatHeader";
ChatHeader.propTypes = {
    user: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        username: PropTypes.string,
        status: PropTypes.string,
        avatar: PropTypes.string,
    }),
    onTogglePanel: PropTypes.func.isRequired,
    panelOpen: PropTypes.bool,
    onBack: PropTypes.func,
    onOpenSearch: PropTypes.func,
    selectionMode: PropTypes.bool,
    selectedCount: PropTypes.number,
    onToggleSelectionMode: PropTypes.func,
    onCancelSelection: PropTypes.func,
    onStartCall: PropTypes.func,
    onStartGhostChat: PropTypes.func, // ✅ NEW PROP
    onDeleteSelected: PropTypes.func, // ✅ NEW PROP
};

export default ChatHeader;
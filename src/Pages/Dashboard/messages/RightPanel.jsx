import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";

import UserProfilePanel from "./UserProfilePanel";
import { useTheme, Section } from "./constants";
import { useIsMobile } from "./useMediaQuery";

const TABS = [
    ["info", "Info"],
    ["media", "Media"],
    ["settings", "Options"],
];

const ACTION_ITEMS = [
    { icon: "🔔", label: "Mute", sub: "Notifications off", ariaLabel: "Mute notifications" },
    { icon: "⭐", label: "Favourite", sub: "Saved contact", ariaLabel: "Mark as favourite" },
    { icon: "📌", label: "Pin chat", sub: "Keep at top", ariaLabel: "Pin conversation" },
];

const DANGER_ITEMS = [
    { icon: "🚫", label: "Block user", ariaLabel: "Block this user" },
    { icon: "🗑", label: "Clear chat", ariaLabel: "Clear conversation history" },
];

const RightPanelContent = React.memo(({ user, messages, tab, setTab, totalMessagesCount, mediaMessages, theme, onClearChat }) => {
    const [showConfirmClear, setShowConfirmClear] = useState(false);

    return (
        <div className="flex flex-col h-full overflow-hidden w-full relative">
            <UserProfilePanel user={user} />

            <div className={`flex border-b ${theme.border || ""}`} role="tablist">
                {TABS.map(([key, label]) => {
                    const isActive = tab === key;
                    return (
                        <button
                            key={key}
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setTab(key)}
                            className={`flex-1 py-2.5 text-[11px] font-medium transition-all touch-manipulation ${isActive
                                ? `${theme.accentText || "text-violet-500"} border-b-2 border-violet-500`
                                : "text-white/25 hover:text-white/50"
                                }`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar overscroll-contain">
                {tab === "info" && (
                    <div className="px-4 py-4 space-y-4">
                        <Section title="Conversation">
                            <div className="flex justify-between items-center px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                                <span className="text-xs text-white/35">Messages</span>
                                <span className="text-xs font-semibold text-white/70">{totalMessagesCount}</span>
                            </div>
                            <div className="flex justify-between items-center px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                                <span className="text-xs text-white/35">Shared files</span>
                                <span className="text-xs font-semibold text-white/70">{mediaMessages.length}</span>
                            </div>
                        </Section>

                        <Section title="Actions">
                            {ACTION_ITEMS.map(({ icon, label, sub, ariaLabel }) => (
                                <motion.button
                                    key={label}
                                    type="button"
                                    whileTap={{ scale: 0.98 }}
                                    aria-label={ariaLabel}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] active:bg-white/[0.05] transition-all text-left touch-manipulation"
                                >
                                    <span role="img" aria-hidden="true" className="text-base flex-shrink-0">{icon}</span>
                                    <div>
                                        <p className="text-xs text-white/70 font-medium">{label}</p>
                                        <p className="text-[10px] text-white/25">{sub}</p>
                                    </div>
                                </motion.button>
                            ))}
                        </Section>

                        <Section title="Danger">
                            {DANGER_ITEMS.map(({ icon, label, ariaLabel }) => (
                                <motion.button
                                    key={label}
                                    type="button"
                                    whileTap={{ scale: 0.98 }}
                                    aria-label={ariaLabel}
                                    onClick={() => {
                                        if (label === "Clear chat") {
                                            setShowConfirmClear(true);
                                        }
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/[0.07] active:bg-red-500/10 transition-all text-left touch-manipulation"
                                >
                                    <span role="img" aria-hidden="true" className="text-base flex-shrink-0">{icon}</span>
                                    <span className="text-xs text-red-400/70 font-medium">{label}</span>
                                </motion.button>
                            ))}
                        </Section>
                    </div>
                )}

                {tab === "media" && (
                    <div className="px-4 py-4">
                        {mediaMessages.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-12 text-center">
                                <div role="img" aria-label="No media fallback visual" className="text-3xl opacity-20">🖼</div>
                                <p className="text-xs text-white/20">No shared media yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-1.5">
                                {mediaMessages.map((m) => (
                                    <div
                                        key={m.id || m.media_url}
                                        className="aspect-square rounded-lg bg-white/[0.04] border border-white/[0.06] overflow-hidden"
                                    >
                                        <img
                                            src={m.media_url}
                                            alt="Shared attachment"
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tab === "settings" && (
                    <div className="px-4 py-4 space-y-3">
                        <p className="text-xs text-white/20 text-center pt-4">
                            Per-conversation settings coming soon
                        </p>
                    </div>
                )}
            </div>

            {/* Clear Chat Confirmation Dialog */}
            <AnimatePresence>
                {showConfirmClear && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full rounded-2xl border border-red-500/30 bg-[#0d1017] p-5 shadow-2xl text-center"
                        >
                            <span className="text-3xl">🗑️</span>
                            <h4 className="mt-2 text-sm font-bold text-white">Delete All Chat?</h4>
                            <p className="mt-1 text-xs text-white/60">
                                This will permanently delete the entire conversation with <span className="text-white font-semibold">{user?.username}</span> from the database.
                            </p>
                            <div className="mt-4 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmClear(false)}
                                    className="flex-1 py-2 rounded-xl bg-white/5 text-xs font-semibold text-white/70 hover:bg-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowConfirmClear(false);
                                        onClearChat?.();
                                    }}
                                    className="flex-1 py-2 rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-500"
                                >
                                    Delete Chat
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
});

RightPanelContent.displayName = "RightPanelContent";

const RightPanel = React.memo(({ user = {}, messages = [], isOpen = false, onClose, onClearChat }) => {
    const theme = useTheme();
    const isMobile = useIsMobile();
    const [tab, setTab] = useState("info");

    const mediaMessages = useMemo(() => {
        return Array.isArray(messages) ? messages.filter((m) => m?.media_url) : [];
    }, [messages]);

    const totalMessagesCount = Array.isArray(messages) ? messages.length : 0;

    if (!user) return null;

    return (
        <>
            <AnimatePresence>
                {isOpen && isMobile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                        aria-hidden="true"
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="right-panel"
                        initial={isMobile ? { x: "100%" } : { opacity: 0, x: 40 }}
                        animate={isMobile ? { x: 0 } : { opacity: 1, x: 0 }}
                        exit={isMobile ? { x: "100%" } : { opacity: 0, x: 40 }}
                        transition={{ type: "spring", stiffness: 380, damping: 35 }}
                        className={`
                            flex flex-col overflow-hidden backdrop-blur-2xl shadow-2xl
                            ${theme.sidebar || ""} border-l ${theme.border || ""}
                            ${isMobile
                                ? "fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm"
                                : "relative z-0 w-[280px] xl:w-[300px] flex-shrink-0 h-full min-h-0"
                            }
                        `}
                    >
                        <div className="flex justify-between items-center p-3 border-b border-white/[0.04] lg:hidden flex-shrink-0">
                            <span className="text-xs font-semibold text-white/40 tracking-wider uppercase">Contact Info</span>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] text-sm font-bold text-white/70 active:bg-white/[0.1] transition-colors touch-manipulation"
                                aria-label="Close profile panel"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="hidden lg:flex justify-end p-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
                                aria-label="Close panel"
                            >
                                ✕
                            </button>
                        </div>

                        <RightPanelContent
                            user={user}
                            messages={messages}
                            tab={tab}
                            setTab={setTab}
                            totalMessagesCount={totalMessagesCount}
                            mediaMessages={mediaMessages}
                            theme={theme}
                            onClearChat={onClearChat}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
});

RightPanel.propTypes = {
    user: PropTypes.object,
    messages: PropTypes.array,
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onClearChat: PropTypes.func,
};

RightPanel.displayName = "RightPanel";

export default RightPanel;

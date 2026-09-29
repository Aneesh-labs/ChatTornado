import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical, Sparkles, Brain, Download, Cpu, Ban, UserCheck, ShieldAlert, Users, BadgeCheck } from "lucide-react";
import { IconBtn, Avatar, useTheme } from "./constants";
import PersonalizeModal from "./PersonalizeModal";
import ExportModal from "./ExportModal";
import GoogleModelModal, { getSelectedGoogleModel } from "./GoogleModelModal";
import ReportUserModal from "./ReportUserModal";
import GroupInfoModal from "./GroupInfoModal";
import API from "../../../Services/API";
import { triggerDemoNotification } from "../../../Services/notifications";
import { isAdminUnlocked, setAdminUnlockedSession, touchAdminSession } from "../../../utils/adminSession";

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
    onReloadChat, // 🔄 Reload messages from backend
    isReloading = false,
    aiMode,
    setAiMode,
    messages = [],
}) => {
    const theme = useTheme();
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showPersonalizeModal, setShowPersonalizeModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showGoogleModelModal, setShowGoogleModelModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [currentGoogleModel, setCurrentGoogleModel] = useState(getSelectedGoogleModel);
    const username = user?.name || user?.username || "Chat Room";
    const isOnline = user?.status === "online";
    const isGroup = Boolean(user?.is_group);

    useEffect(() => {
        if (!user?.id || user?.is_bot || isGroup) return;
        const checkBlock = async () => {
            try {
                const token = sessionStorage.getItem("token");
                const res = await API.get(`/api/blocks/check/${user.id}`, { params: { token } });
                setIsBlocked(Boolean(res.data?.i_blocked));
            } catch (err) {
                console.warn("Failed to check block status", err);
            }
        };
        checkBlock();
    }, [user?.id, isGroup]);

    const handleToggleBlock = async () => {
        if (!user?.id) return;
        const token = sessionStorage.getItem("token");
        try {
            if (isBlocked) {
                await API.delete(`/api/blocks/${user.id}`, { params: { token } });
                setIsBlocked(false);
            } else {
                if (confirm(`Block @${user.username}? They won't be able to message or call you.`)) {
                    await API.post(`/api/blocks/${user.id}`, {}, { params: { token } });
                    setIsBlocked(true);
                }
            }
        } catch (err) {
            console.error("Block action failed", err);
        }
        setShowMoreMenu(false);
    };

    const [modeHistory, setModeHistory] = useState([]);
    const [adminUnlocked, setAdminUnlocked] = useState(() => isAdminUnlocked());

    useEffect(() => {
        const handleModelChange = (e) => {
            if (e.detail) setCurrentGoogleModel(e.detail);
        };
        window.addEventListener("vortex_google_model_changed", handleModelChange);
        return () => window.removeEventListener("vortex_google_model_changed", handleModelChange);
    }, []);

    useEffect(() => {
        const handleAdminUnlock = () => {
            setAdminUnlocked(true);
        };
        const handleAdminRevoke = () => {
            setAdminUnlocked(false);
            setAiMode?.("DEFAULT");
        };
        window.addEventListener("vortex_admin_activated", handleAdminUnlock);
        window.addEventListener("vortex_admin_revoked", handleAdminRevoke);
        return () => {
            window.removeEventListener("vortex_admin_activated", handleAdminUnlock);
            window.removeEventListener("vortex_admin_revoked", handleAdminRevoke);
        };
    }, [setAiMode]);

    const handleModeChange = (newMode) => {
        if (!adminUnlocked) {
            let nextHistory = [...modeHistory, newMode];
            if (nextHistory.length > 3) nextHistory = nextHistory.slice(-3);
            setModeHistory(nextHistory);

            console.log(
                `%c[VORTEX MODE]%c Selected: %c${newMode}%c | Sequence: [${nextHistory.join(" ➔ ")}] (Needed: FUNNY ➔ DEFAULT ➔ ROAST)`,
                "background: #0284c7; color: white; font-weight: bold; padding: 2px 5px; border-radius: 3px;",
                "",
                "color: #38bdf8; font-weight: bold;",
                ""
            );

            // Secret pattern trigger: FUNNY -> DEFAULT -> ROAST
            if (
                nextHistory.length === 3 &&
                nextHistory[0] === "FUNNY" &&
                nextHistory[1] === "DEFAULT" &&
                nextHistory[2] === "ROAST"
            ) {
                console.log(
                    `%c👑 [VORTEX ADMIN UNLOCKED]%c Sequence FUNNY ➔ DEFAULT ➔ ROAST matched! Active Session Admin Mode ACTIVATED!`,
                    "background: #f59e0b; color: black; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px;",
                    "color: #fbbf24; font-weight: bold; font-size: 12px;"
                );
                setAdminUnlockedSession();
                setAdminUnlocked(true);
                setAiMode?.("ADMIN");
                return;
            }
        } else {
            console.log(`%c[VORTEX ADMIN ACTIVE]%c Mode changed to: ${newMode}`, "background: #f59e0b; color: black; font-weight: bold; padding: 2px 5px; border-radius: 3px;", "");
            touchAdminSession();
        }
        setAiMode?.(newMode);
    };

    if (selectionMode) {
        return (
            <div className={`relative z-30 flex items-center justify-between px-3 sm:px-6 py-3 border-b ${theme.border} backdrop-blur-2xl bg-black/30 flex-shrink-0 w-full select-none`}>
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

    const isBotUser = Boolean(
        user?.is_bot || 
        user?.username?.toUpperCase() === "VORTEX-9" || 
        user?.username?.toLowerCase()?.includes("vortex") || 
        user?.username?.toLowerCase()?.includes("ai")
    );

    return (
        <div className={`relative z-30 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-4 border-b ${theme.border} backdrop-blur-2xl bg-black/20 flex-shrink-0 w-full select-none`}>
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
                {isGroup ? (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg border border-white/10 flex-shrink-0">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                ) : (
                    <Avatar user={user} size="md" className="flex-shrink-0 scale-90 sm:scale-100 origin-left" />
                )}
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <h2 className="text-xs sm:text-sm font-semibold text-white leading-tight truncate tracking-wide max-w-[120px] sm:max-w-none flex items-center gap-1.5">
                            <span>{username}</span>
                            {!isGroup && (Boolean(user?.is_verified) || Boolean(user?.email_verified)) && (
                                <span title="Verified User" className="inline-flex items-center text-sky-400">
                                    <BadgeCheck className="h-4 w-4 fill-sky-400/20 text-sky-400" />
                                </span>
                            )}
                        </h2>
                        {isBotUser && (
                            <>
                                {(adminUnlocked || aiMode === "ADMIN") && (
                                    <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-pulse flex-shrink-0">
                                        👑 ADMIN ACTIVE
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowPersonalizeModal(true)}
                                    title="Personalize VORTEX-9 from your last 30 messages"
                                    className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-gradient-to-r from-violet-600/40 via-purple-600/40 to-fuchsia-600/40 hover:from-violet-600/60 hover:to-fuchsia-600/60 border border-violet-400/40 text-violet-200 transition-all shadow-sm active:scale-95 cursor-pointer flex-shrink-0"
                                >
                                    <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                                    <span>Personalize</span>
                                </button>
                            </>
                        )}
                    </div>
                    
                    {isBotUser ? (
                        <div className="flex items-center gap-1.5 mt-1">
                            <select
                                value={aiMode}
                                onChange={(e) => handleModeChange(e.target.value)}
                                className={`text-[10px] sm:text-xs rounded-md px-1.5 py-0.5 outline-none cursor-pointer transition-all ${
                                    aiMode === "ADMIN" || adminUnlocked
                                        ? "bg-amber-950/70 border border-amber-500/60 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)] focus:border-amber-400 font-semibold"
                                        : "bg-black/40 border border-cyan-500/30 text-cyan-300 focus:border-cyan-400"
                                }`}
                            >
                                <option value="DEFAULT">Default</option>
                                <option value="RESEARCH">Research 🔬</option>
                                <option value="FUNNY">Funny</option>
                                <option value="ROAST">Roast</option>
                                <option value="SERIOUS">Serious</option>
                                <option value="CODING">Coding</option>
                                {(adminUnlocked || aiMode === "ADMIN") && (
                                    <option value="ADMIN" className="bg-neutral-900 text-amber-300 font-bold">
                                        👑 Admin Mode
                                    </option>
                                )}
                            </select>
                        </div>
                    ) : isGroup ? (
                        <p className="text-[9px] sm:text-xs mt-0.5 font-medium text-violet-400 truncate">
                            {user?.member_count ? `${user.member_count} members` : "Group Chat"}
                        </p>
                    ) : (
                        <p className={`text-[9px] sm:text-xs mt-0.5 font-medium transition-colors truncate ${
                            isOnline ? "text-emerald-400" : "text-white/25"
                        }`}>
                            {isOnline ? "Active now" : "Offline"}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                {/* --- MOBILE ACTIONS --- */}
                <div className="flex sm:hidden items-center gap-0.5">
                    {onReloadChat && (
                        <IconBtn 
                            title="Reload chat messages" 
                            onClick={onReloadChat} 
                            small 
                            className={isReloading ? "text-cyan-400 bg-white/[0.08]" : ""}
                        >
                            <svg 
                                className={`w-3.5 h-3.5 transition-transform duration-500 ${isReloading ? "animate-spin text-cyan-400" : ""}`} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </IconBtn>
                    )}
                    <div className="relative flex items-center">
                        <IconBtn title="More options" onClick={() => setShowMoreMenu(!showMoreMenu)} small className={showMoreMenu ? "bg-white/10" : ""}>
                            <MoreVertical className="w-4 h-4" />
                        </IconBtn>
                        
                        <AnimatePresence>
                            {showMoreMenu && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setShowMoreMenu(false)} 
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                        className="absolute top-full right-0 mt-2 bg-[#0e121b]/95 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl flex flex-col p-1.5 z-50 min-w-[160px]"
                                    >
                                        {isBotUser && (
                                            <button 
                                                onClick={() => { setShowGoogleModelModal(true); setShowMoreMenu(false); }} 
                                                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-cyan-300 hover:text-white hover:bg-cyan-500/10 rounded-lg text-left cursor-pointer transition-colors"
                                            >
                                                <Cpu className="w-4 h-4 text-cyan-400" />
                                                <span>AI Models (OpenRouter & Gemini)</span>
                                            </button>
                                        )}
                                        {onReloadChat && (
                                            <button onClick={() => { onReloadChat(); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-left">
                                                <svg className={`w-4 h-4 ${isReloading ? "animate-spin text-cyan-400" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Reload Chat
                                            </button>
                                        )}
                                        {onOpenSearch && (
                                            <button onClick={() => { onOpenSearch(); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-left">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                Search
                                            </button>
                                        )}
                                        {isGroup ? (
                                            <button 
                                                onClick={() => { setShowGroupModal(true); setShowMoreMenu(false); }} 
                                                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-violet-300 hover:text-white hover:bg-violet-500/15 rounded-lg text-left cursor-pointer transition-colors"
                                            >
                                                <Users className="w-4 h-4 text-violet-400" />
                                                <span>Group Members & Settings</span>
                                            </button>
                                        ) : !isBotUser ? (
                                            <>
                                                <button onClick={() => { onStartCall?.(false); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-left">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                    Voice Call
                                                </button>
                                                <button onClick={() => { onStartCall?.(true); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-left">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.867v6.266a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                    Video Call
                                                </button>
                                                <button onClick={() => { onStartGhostChat?.(); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-left">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h.01M15 10h.01M9 14h6M7 20l-3-3V7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H7z" /></svg>
                                                    Ghost Chat
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => { onStartCall?.("ai"); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-left">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                    Voice Call (Live AI)
                                                </button>
                                            </>
                                        )}
                                        <button onClick={() => { setShowExportModal(true); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-left cursor-pointer">
                                            <Download className="w-4 h-4 text-cyan-400" />
                                            Export Chat
                                        </button>
                                        <button onClick={() => { onToggleSelectionMode(); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-left">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                            Select
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* --- DESKTOP ACTIONS --- */}
                <div className="hidden sm:flex items-center gap-0.5 sm:gap-1">
                    {onReloadChat && (
                        <IconBtn 
                            title="Reload chat messages" 
                            onClick={onReloadChat} 
                            small 
                            className={isReloading ? "text-cyan-400 bg-white/[0.08]" : ""}
                        >
                            <svg 
                                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-500 ${isReloading ? "animate-spin text-cyan-400" : ""}`} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </IconBtn>
                    )}
                    {onOpenSearch && (
                        <IconBtn title="Search" onClick={onOpenSearch} small className="lg:hidden">
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </IconBtn>
                    )}
                    {!isBotUser && !isGroup ? (
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
                            <IconBtn title="Ghost Chat" onClick={() => onStartGhostChat?.()} small>
                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h.01M15 10h.01M9 14h6M7 20l-3-3V7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H7z" />
                                </svg>
                            </IconBtn>
                        </>
                    ) : isBotUser ? (
                        <IconBtn title="Live AI Voice Call" onClick={() => onStartCall?.("ai")} small>
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </IconBtn>
                    ) : null}
                    <IconBtn title="Export chat transcript (.md, .html, .txt)" onClick={() => setShowExportModal(true)} small className="hover:!text-cyan-300">
                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
                    </IconBtn>
                    <IconBtn title="Select messages" onClick={onToggleSelectionMode} small>
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </IconBtn>

                    {/* Three-dots menu for desktop and mobile */}
                    <div className="relative flex items-center">
                        <IconBtn 
                            title="More options" 
                            onClick={() => setShowMoreMenu(!showMoreMenu)} 
                            small 
                            className={showMoreMenu ? "bg-white/10 text-cyan-400" : ""}
                        >
                            <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </IconBtn>
                        <AnimatePresence>
                            {showMoreMenu && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setShowMoreMenu(false)} 
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                        className="absolute top-full right-0 mt-2 bg-[#0e121b]/95 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl flex flex-col p-1.5 z-50 min-w-[200px]"
                                    >
                                        {isGroup && (
                                            <button 
                                                onClick={() => { setShowGroupModal(true); setShowMoreMenu(false); }} 
                                                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-violet-300 hover:text-white hover:bg-violet-500/15 rounded-lg text-left cursor-pointer transition-colors"
                                            >
                                                <Users className="w-4 h-4 text-violet-400" />
                                                <span>Group Members & Settings</span>
                                            </button>
                                        )}
                                        {isBotUser ? (
                                            <>
                                                <button 
                                                    onClick={() => { setShowGoogleModelModal(true); setShowMoreMenu(false); }} 
                                                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-cyan-300 hover:text-white hover:bg-cyan-500/15 rounded-lg text-left cursor-pointer transition-colors"
                                                >
                                                    <Cpu className="w-4 h-4 text-cyan-400" />
                                                    <span>AI Models (OpenRouter & Gemini)</span>
                                                </button>
                                                <button 
                                                    onClick={() => { onStartCall?.("ai"); setShowMoreMenu(false); }} 
                                                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-left cursor-pointer"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                    <span>Voice Call (Live AI)</span>
                                                </button>
                                            </>
                                        ) : !isGroup && (
                                            <>
                                                <button 
                                                    onClick={handleToggleBlock}
                                                    className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left cursor-pointer transition-colors ${
                                                        isBlocked
                                                            ? "text-emerald-300 hover:bg-emerald-500/15"
                                                            : "text-rose-400 hover:bg-rose-500/15"
                                                    }`}
                                                >
                                                    {isBlocked ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                                    <span>{isBlocked ? "Unblock User" : "Block User"}</span>
                                                </button>
                                                <button 
                                                    onClick={() => { setShowReportModal(true); setShowMoreMenu(false); }} 
                                                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-300 hover:text-white hover:bg-amber-500/15 rounded-lg text-left cursor-pointer transition-colors"
                                                >
                                                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                                                    <span>Report User</span>
                                                </button>
                                            </>
                                        )}
                                        {onReloadChat && (
                                            <button onClick={() => { onReloadChat(); setShowMoreMenu(false); }} className="flex items-center gap-2.5 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-left cursor-pointer">
                                                <svg className={`w-4 h-4 ${isReloading ? "animate-spin text-cyan-400" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                <span>Reload Chat</span>
                                            </button>
                                        )}
                                        <button onClick={() => { setShowExportModal(true); setShowMoreMenu(false); }} className="flex items-center gap-2.5 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-left cursor-pointer">
                                            <Download className="w-4 h-4 text-cyan-400" />
                                            <span>Export Chat</span>
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <IconBtn 
                    title={isGroup ? "Group Info" : "Info"} 
                    active={panelOpen} 
                    onClick={isGroup ? () => setShowGroupModal(true) : onTogglePanel} 
                    small
                >
                    {isGroup ? (
                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-300" />
                    ) : (
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </IconBtn>
            </div>

            <PersonalizeModal
                isOpen={showPersonalizeModal}
                onClose={() => setShowPersonalizeModal(false)}
            />

            <GoogleModelModal
                isOpen={showGoogleModelModal}
                onClose={() => setShowGoogleModelModal(false)}
            />

            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                messages={messages}
                user={user}
            />

            <ReportUserModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                targetUser={user}
            />

            {isGroup && (
                <GroupInfoModal
                    isOpen={showGroupModal}
                    onClose={() => setShowGroupModal(false)}
                    group={user}
                    onGroupUpdated={onReloadChat}
                    onGroupLeft={() => {
                        setShowGroupModal(false);
                        onBack?.();
                    }}
                />
            )}
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
    onStartGhostChat: PropTypes.func,
    onDeleteSelected: PropTypes.func,
    onReloadChat: PropTypes.func,
    isReloading: PropTypes.bool,
    messages: PropTypes.array,
};

export default ChatHeader;
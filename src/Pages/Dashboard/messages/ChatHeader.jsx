import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Smartphone, Lock, MoreVertical, AlertTriangle, Sparkles, Brain, Download, Cpu, Ban, UserCheck, ShieldAlert, Users, BadgeCheck, Dna, GitFork, Clock, Tv, Ghost, Flame, Shield, Phone, PhoneCall, Video, Search, RotateCw, ChevronLeft, ChevronDown, CheckSquare, ListChecks, Terminal, Zap } from "lucide-react";
import { toggleShieldActive } from "../../../Services/privacyShieldService";
import { triggerPanicEscape } from "../../../utils/panicKey";
import { IconBtn, Avatar, useTheme } from "./constants";
import PersonalizeModal from "./PersonalizeModal";
import VaultChatModal from "./VaultChatModal";
import { isVaultChat } from "../../../Services/vaultService";
import ExportModal from "./ExportModal";
import GoogleModelModal, { getSelectedGoogleModel } from "./GoogleModelModal";
import ReportUserModal from "./ReportUserModal";
import GroupInfoModal from "./GroupInfoModal";
import MemoryVaultModal from "./MemoryVaultModal";
import API from "../../../Services/API";
import { triggerDemoNotification } from "../../../Services/notifications";
import { isAdminUnlocked, setAdminUnlockedSession, touchAdminSession } from "../../../utils/adminSession";
import { getStreak } from "../../../Services/streakService";
import { soundEngine } from "../../../utils/soundEffects";

const ChatHeader = React.memo(({
    user = null,
    isFriend = false,
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
    onDeleteSelected,
    onReloadChat,
    isReloading = false,
    aiMode,
    setAiMode,
    messages = [],
    activeBranch = null,
    onOpenDNA,
    onOpenRealityForks,
    onOpenFutureMessages,
    onOpenStreakModal,
    onOpenStatusStory,
    onToggleWatchParty,
    onToggleVanishMode,
    isVanishModeActive = false,
    quantumHud = null,
}) => {
    const theme = useTheme();
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showQuantumMenu, setShowQuantumMenu] = useState(false);
    const [showPersonalizeModal, setShowPersonalizeModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showGoogleModelModal, setShowGoogleModelModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showMemoryVaultModal, setShowMemoryVaultModal] = useState(false);
    const [showVaultChatModal, setShowVaultChatModal] = useState(false);
    const [isVaultProtected, setIsVaultProtected] = useState(() => isVaultChat(user?.id));

    useEffect(() => {
        setIsVaultProtected(isVaultChat(user?.id));
        const handleVaultChats = (e) => {
            if (e.detail?.changedId === String(user?.id)) {
                setIsVaultProtected(Boolean(e.detail.isVault));
            } else {
                setIsVaultProtected(isVaultChat(user?.id));
            }
        };
        window.addEventListener("vortex_vault_chats_changed", handleVaultChats);
        return () => window.removeEventListener("vortex_vault_chats_changed", handleVaultChats);
    }, [user?.id]);
    const [isBlocked, setIsBlocked] = useState(false);
    const [currentGoogleModel, setCurrentGoogleModel] = useState(getSelectedGoogleModel);
    const [showStatusPopover, setShowStatusPopover] = useState(false);
    const username = user?.name || user?.username || "Chat Room";
    const isOnline = user?.status === "online";
    const isGroup = Boolean(user?.is_group);

    const rawStatus = (user?.status || "offline").toLowerCase();
    let statusDotColor = "bg-white/30";
    let statusLabel = "Offline";

    if (isOnline || rawStatus === "online" || rawStatus === "available") {
        statusDotColor = "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]";
        statusLabel = "Online";
    } else if (rawStatus === "busy") {
        statusDotColor = "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]";
        statusLabel = "Busy";
    } else if (rawStatus === "coding") {
        statusDotColor = "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]";
        statusLabel = "Coding 💻";
    } else if (rawStatus === "off_duty") {
        statusDotColor = "bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]";
        statusLabel = "Off-Duty 🏖️";
    } else if (rawStatus === "in_a_call") {
        statusDotColor = "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]";
        statusLabel = "In a Call 📞";
    }

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
        soundEngine.play("cyber_chirp");
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

    const isBotUser = Boolean(
        user?.is_bot || 
        user?.username?.toUpperCase() === "VORTEX-9" || 
        user?.username?.toLowerCase()?.includes("vortex") || 
        user?.username?.toLowerCase()?.includes("ai")
    );
    const userStreak = useMemo(() => (!isGroup && !isBotUser && user?.id ? getStreak(user.id) : null), [user?.id, isGroup, isBotUser]);

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



    return (
        <div className={`relative z-30 flex items-center justify-between gap-2 overflow-hidden flex-nowrap px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-cyan-500/20 backdrop-blur-2xl bg-[#090c14]/90 shadow-[0_4px_24px_rgba(0,0,0,0.45)] flex-shrink-0 w-full select-none`}>
            {/* Sci-Fi Hologram Sweeper Beam */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Back to conversations"
                        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/18 text-white/70 hover:text-white transition-all active:scale-95 flex-shrink-0 touch-manipulation cursor-pointer"
                    >
                        <ChevronLeft className="w-4.5 h-4.5" />
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
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <h2 className="text-xs sm:text-sm font-semibold text-white leading-tight truncate tracking-wide flex items-center gap-1 min-w-0">
                            <span>{username}</span>
                            {!isGroup && (Boolean(user?.is_verified) || Boolean(user?.email_verified)) && (
                                <span title="Verified User" className="inline-flex items-center text-sky-400">
                                    <BadgeCheck className="h-4 w-4 fill-sky-400/20 text-sky-400" />
                                </span>
                            )}
                        </h2>
                        {/* Streak Badge */}
                        {userStreak && userStreak.count > 0 && (
                            <button
                                type="button"
                                onClick={() => onOpenStreakModal?.(user)}
                                title={`${userStreak.count} Day Streak (${userStreak.tier.name}) - View milestone rewards`}
                                className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${userStreak.tier.color} text-white shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer shrink-0`}
                            >
                                <span>{userStreak.tier.icon}</span>
                                <span>{userStreak.count} Streak</span>
                            </button>
                        )}
                        {/* Status Indicator Dot Beside Fire Badge */}
                        {!isGroup && !isBotUser && (
                            <div className="relative inline-flex items-center">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowStatusPopover((prev) => !prev);
                                    }}
                                    title={`Status: ${statusLabel}${user?.custom_status ? ` - "${user.custom_status}"` : ""}. Click to view status.`}
                                    className="group relative flex items-center justify-center p-1 rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer flex-shrink-0"
                                >
                                    <span className={`w-2.5 h-2.5 rounded-full ${statusDotColor} ring-2 ring-black/80 transition-transform group-hover:scale-125`} />
                                    <span className="sr-only">Status: {statusLabel}</span>
                                </button>

                                {showStatusPopover && (
                                    <div 
                                        onClick={(e) => e.stopPropagation()} 
                                        className="absolute top-full left-0 mt-2 z-50 w-60 rounded-2xl border border-white/20 bg-neutral-900/95 p-3 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
                                    >
                                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2.5 h-2.5 rounded-full ${statusDotColor}`} />
                                                <span className="text-xs font-bold text-white capitalize">{statusLabel}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowStatusPopover(false)}
                                                className="text-white/40 hover:text-white text-xs p-1 rounded-md"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        {user?.custom_status ? (
                                            <div className="bg-white/5 rounded-lg p-2 border border-white/10 mb-2">
                                                <p className="text-xs text-white/90 font-medium break-words leading-snug">
                                                    "{user.custom_status}"
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-white/40 italic mb-2">
                                                No custom status message set.
                                            </p>
                                        )}
                                        <div className="text-[10px] text-white/50 flex items-center justify-between pt-1">
                                            <span className="font-medium text-white/70">@{user?.username || "user"}</span>
                                            <span>{isOnline ? "Active right now" : "Currently offline"}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowStatusPopover(false);
                                                onOpenStatusStory?.(user);
                                            }}
                                            className="w-full mt-2.5 py-1.5 px-2 rounded-xl bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 hover:from-violet-600/50 hover:to-fuchsia-600/50 border border-violet-500/30 text-violet-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                                        >
                                            <span>📸 View Ephemeral Stories (P2P)</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Reality Branch Switcher Badge */}
                        <button
                            type="button"
                            onClick={onOpenRealityForks}
                            title="Reality Forks - Click to switch or create conversation branches"
                            className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                        >
                            <GitFork className="w-2.5 h-2.5 text-purple-400" />
                            <span>{activeBranch ? activeBranch.name : "main"}</span>
                        </button>
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

                        {/* Inline Quantum Lattice HUD Telemetry Widget */}
                        {quantumHud && (
                            <div className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-black/60 px-2 py-0.5 backdrop-blur-xl shrink-0">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: quantumHud.color || "#22c55e" }} />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full shadow-[0_0_6px_rgba(34,197,94,0.9)]" style={{ background: quantumHud.color || "#22c55e" }} />
                                </span>
                                <span className="text-[9px] font-mono font-black uppercase tracking-wider text-cyan-300">
                                    {quantumHud.securityStatus}
                                </span>
                                <span className="text-[8.5px] font-mono text-cyan-400/70 border-l border-white/15 pl-1">
                                    {quantumHud.quantumPing}ms
                                </span>
                                <button
                                    type="button"
                                    onClick={quantumHud.toggleHoloScanlines}
                                    title={quantumHud.holoScanlines ? "Disable Holographic HUD Scanlines" : "Enable Sci-Fi Holographic HUD Scanlines"}
                                    className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                                        quantumHud.holoScanlines 
                                            ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.6)] font-bold animate-pulse" 
                                            : "bg-white/5 border-white/10 text-white/50 hover:text-cyan-300 hover:border-cyan-500/40"
                                    }`}
                                >
                                    HOLO {quantumHud.holoScanlines ? "ON" : "OFF"}
                                </button>
                                {quantumHud.onOpenP2PTransfers && (
                                    <button
                                        type="button"
                                        onClick={quantumHud.onOpenP2PTransfers}
                                        title="Open Peer-to-Peer Transfers & Outbox Monitor"
                                        className="text-[8px] font-mono px-1.5 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all cursor-pointer flex items-center gap-1"
                                    >
                                        <Activity className="w-2.5 h-2.5 text-cyan-400" />
                                        P2P
                                    </button>
                                )}
                                {quantumHud.onOpenAndroidDownload && (
                                    <button
                                        type="button"
                                        onClick={quantumHud.onOpenAndroidDownload}
                                        title="Get Native Android App (APK)"
                                        className="text-[8px] font-mono px-1.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400 transition-all cursor-pointer flex items-center gap-1"
                                    >
                                        <Smartphone className="w-2.5 h-2.5 text-emerald-400" />
                                        APK
                                    </button>
                                )}
                            </div>
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

            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                {/* --- MOBILE ACTIONS --- */}
                <div className="flex sm:hidden items-center gap-1">
                    {!isBotUser && !isGroup ? (
                        <>
                            <IconBtn 
                                title="Voice call" 
                                onClick={() => onStartCall?.(false)} 
                                small 
                                className="!text-emerald-400 !bg-emerald-500/10 hover:!bg-emerald-500/20 border border-emerald-500/20"
                            >
                                <Phone className="w-3.5 h-3.5" />
                            </IconBtn>
                            <IconBtn 
                                title="Video call" 
                                onClick={() => onStartCall?.(true)} 
                                small 
                                className="!text-sky-400 !bg-sky-500/10 hover:!bg-sky-500/20 border border-sky-500/20"
                            >
                                <Video className="w-3.5 h-3.5" />
                            </IconBtn>
                        </>
                    ) : isBotUser ? (
                        <IconBtn 
                            title="Live AI Voice Call" 
                            onClick={() => onStartCall?.("ai")} 
                            small 
                            className="!text-cyan-400 !bg-cyan-500/10 hover:!bg-cyan-500/20 border border-cyan-500/20"
                        >
                            <PhoneCall className="w-3.5 h-3.5" />
                        </IconBtn>
                    ) : null}
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
                                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" 
                                        onClick={() => setShowMoreMenu(false)} 
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                        className="fixed top-14 right-2 z-50 bg-[#0c101c]/98 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col p-2 space-y-1 w-[min(92vw,320px)] max-h-[75vh] overflow-y-auto custom-scrollbar"
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
                                            <button onClick={() => { onOpenSearch(); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-xs text-cyan-300 hover:text-white hover:bg-cyan-500/15 rounded-lg text-left font-semibold cursor-pointer">
                                                <Terminal className="w-4 h-4 text-cyan-400" />
                                                <span>Cyber Terminal / HUD</span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                toggleShieldActive();
                                                setShowMoreMenu(false);
                                            }}
                                            className="flex items-center gap-2 px-3 py-2 text-xs text-cyan-300 hover:text-white hover:bg-cyan-500/15 rounded-lg text-left font-semibold cursor-pointer"
                                        >
                                            <Shield className="w-4 h-4 text-cyan-400" />
                                            <span>Anti-Snoop Privacy Shield</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowMoreMenu(false);
                                                triggerPanicEscape();
                                            }}
                                            className="flex items-center gap-2.5 px-3 py-2 text-xs text-rose-300 hover:text-white hover:bg-rose-500/20 rounded-xl text-left font-semibold cursor-pointer transition-colors"
                                        >
                                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                                            <span>🚨 Emergency Panic (Purge & Wiki Redirect)</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                window.dispatchEvent(new CustomEvent("vortex_open_deaddrop"));
                                                setShowMoreMenu(false);
                                            }}
                                            className="flex items-center gap-2 px-3 py-2 text-xs text-amber-300 hover:text-white hover:bg-amber-500/15 rounded-lg text-left font-semibold cursor-pointer"
                                        >
                                            <Zap className="w-4 h-4 text-amber-400" />
                                            <span>Dead Drop (Timed Burn)</span>
                                        </button>
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
                                                <button onClick={() => { onToggleWatchParty?.(); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-xs text-violet-300 hover:text-white hover:bg-violet-500/10 rounded-lg text-left">
                                                    <Tv className="w-4 h-4 text-violet-400" />
                                                    Watch Together
                                                </button>
                                                <button onClick={() => { onToggleVanishMode?.(); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-xs text-purple-300 hover:text-white hover:bg-purple-500/10 rounded-lg text-left">
                                                    <Ghost className="w-4 h-4 text-purple-400" />
                                                    {isVanishModeActive ? "Turn Off Vanish Mode" : "Vanish Mode"}
                                                </button>
                                                {(!isBotUser && !isGroup && (isFriend || isVaultProtected)) && (
                                                    <button onClick={() => { setShowVaultChatModal(true); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-xs text-purple-300 hover:text-white hover:bg-purple-500/15 rounded-lg text-left font-semibold">
                                                        <Lock className="w-4 h-4 text-purple-400" />
                                                        <span>{isVaultProtected ? "Ghost Vault: Locked (Hidden in Decoy)" : "Lock in Ghost Vault"}</span>
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => { onStartCall?.("ai"); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-left">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                    Voice Call (Live AI)
                                                </button>
                                            </>
                                        )}
                                        <button onClick={() => { onOpenDNA?.(); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-cyan-300 hover:text-white hover:bg-cyan-500/10 rounded-lg text-left cursor-pointer">
                                            <Dna className="w-4 h-4 text-cyan-400" />
                                            <span>Conversation DNA</span>
                                        </button>
                                        <button onClick={() => { onOpenRealityForks?.(); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-purple-300 hover:text-white hover:bg-purple-500/10 rounded-lg text-left cursor-pointer">
                                            <GitFork className="w-4 h-4 text-purple-400" />
                                            <span>Reality Forks</span>
                                        </button>
                                        <button onClick={() => { onOpenFutureMessages?.(); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-300 hover:text-white hover:bg-amber-500/10 rounded-lg text-left cursor-pointer">
                                            <Clock className="w-4 h-4 text-amber-400" />
                                            <span>Future Messages</span>
                                        </button>
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
                <div className="hidden sm:flex items-center gap-1 sm:gap-1.5">
                    {/* Primary Direct Communication */}
                    {!isBotUser && !isGroup ? (
                        <>
                            <IconBtn title="Voice call" onClick={() => onStartCall?.(false)} small className="hover:!text-emerald-300 hover:!bg-emerald-500/15">
                                <Phone className="w-4 h-4 text-emerald-400" />
                            </IconBtn>
                            <IconBtn title="Video call" onClick={() => onStartCall?.(true)} small className="hover:!text-sky-300 hover:!bg-sky-500/15">
                                <Video className="w-4 h-4 text-sky-400" />
                            </IconBtn>
                            {(!isBotUser && !isGroup && (isFriend || isVaultProtected)) && (
                                <button
                                    type="button"
                                    onClick={() => setShowVaultChatModal(true)}
                                    title={isVaultProtected ? "Chat locked in Ghost Vault (Hidden in Decoy Mode). Click to change." : "Lock Chat in Ghost Vault (Hide in Decoy Mode)"}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                        isVaultProtected
                                            ? "bg-purple-600/30 border border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.4)] animate-pulse font-bold"
                                            : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10"
                                    }`}
                                >
                                    <Lock className="w-3.5 h-3.5 text-purple-400" />
                                    <span className="hidden md:inline">{isVaultProtected ? "Vault: Locked" : "Ghost Vault"}</span>
                                </button>
                            )}
                        </>
                    ) : isBotUser ? (
                        <>
                            <IconBtn title="Live AI Voice Call" onClick={() => onStartCall?.("ai")} small className="hover:!text-sky-300 bg-sky-500/10 border-sky-400/30">
                                <PhoneCall className="w-4 h-4 text-sky-400 animate-pulse" />
                            </IconBtn>
                            <IconBtn title="Switch AI Model" onClick={() => setShowGoogleModelModal(true)} small className="hover:!text-cyan-300">
                                <Cpu className="w-4 h-4 text-cyan-400" />
                            </IconBtn>
                        </>
                    ) : null}

                    {/* Quantum Lab Dropdown (Consolidated Hi-Fi Features) */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowQuantumMenu(!showQuantumMenu)}
                            title="Explore Futuristic Chat Features"
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                                showQuantumMenu
                                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                                    : "bg-white/[0.04] hover:bg-white/[0.08] text-white/80 border-white/10 hover:border-white/20"
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="hidden md:inline">Quantum Lab</span>
                            <ChevronDown className="w-3 h-3 opacity-60" />
                        </button>
                        <AnimatePresence>
                            {showQuantumMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowQuantumMenu(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                        className="absolute top-full right-0 mt-2 bg-[#0d121f]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl flex flex-col p-2 z-50 min-w-[220px] space-y-1"
                                    >
                                        <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-white/40 border-b border-white/10 mb-1">
                                            ⚡ Quantum Chat Utilities
                                        </div>
                                        <button
                                            onClick={() => { soundEngine.play("data_scan"); onOpenDNA?.(); setShowQuantumMenu(false); }}
                                            className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:text-white hover:bg-cyan-500/15 rounded-xl text-left cursor-pointer transition-colors"
                                        >
                                            <Dna className="w-4 h-4 text-cyan-400 shrink-0" />
                                            <div>
                                                <p className="font-semibold">Conversation DNA</p>
                                                <p className="text-[10px] text-white/40">Structural & state telemetry</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => { soundEngine.play("warp_drive"); onOpenRealityForks?.(); setShowQuantumMenu(false); }}
                                            className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-purple-300 hover:text-white hover:bg-purple-500/15 rounded-xl text-left cursor-pointer transition-colors"
                                        >
                                            <GitFork className="w-4 h-4 text-purple-400 shrink-0" />
                                            <div>
                                                <p className="font-semibold">Reality Forks</p>
                                                <p className="text-[10px] text-white/40">Branch timeline dimensions</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => { soundEngine.play("quantum_ping"); onOpenFutureMessages?.(); setShowQuantumMenu(false); }}
                                            className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:text-white hover:bg-amber-500/15 rounded-xl text-left cursor-pointer transition-colors"
                                        >
                                            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                                            <div>
                                                <p className="font-semibold">Future Delivery</p>
                                                <p className="text-[10px] text-white/40">Scheduled future message drops</p>
                                            </div>
                                        </button>
                                        {!isBotUser && !isGroup && (
                                            <>
                                                <button
                                                    onClick={() => { onToggleWatchParty?.(); setShowQuantumMenu(false); }}
                                                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-violet-300 hover:text-white hover:bg-violet-500/15 rounded-xl text-left cursor-pointer transition-colors"
                                                >
                                                    <Tv className="w-4 h-4 text-violet-400 shrink-0" />
                                                    <div>
                                                        <p className="font-semibold">Watch Together</p>
                                                        <p className="text-[10px] text-white/40">Synchronized video viewing</p>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => { onToggleVanishMode?.(); setShowQuantumMenu(false); }}
                                                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-pink-300 hover:text-white hover:bg-pink-500/15 rounded-xl text-left cursor-pointer transition-colors"
                                                >
                                                    <Ghost className="w-4 h-4 text-pink-400 shrink-0" />
                                                    <div>
                                                        <p className="font-semibold">Vanish Mode</p>
                                                        <p className="text-[10px] text-white/40">{isVanishModeActive ? "Active (turn off)" : "Self-destructing messages"}</p>
                                                    </div>
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => { setShowExportModal(true); setShowQuantumMenu(false); }}
                                            className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:text-white hover:bg-emerald-500/15 rounded-xl text-left cursor-pointer transition-colors"
                                        >
                                            <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                                            <div>
                                                <p className="font-semibold">Export Transcript</p>
                                                <p className="text-[10px] text-white/40">Download as Markdown / HTML</p>
                                            </div>
                                        </button>
                                        {quantumHud?.onOpenP2PTransfers && (
                                            <button
                                                onClick={() => { quantumHud.onOpenP2PTransfers(); setShowQuantumMenu(false); }}
                                                className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:text-white hover:bg-cyan-500/15 rounded-xl text-left cursor-pointer transition-colors"
                                            >
                                                <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                                                <div>
                                                    <p className="font-semibold">P2P Transfers & Outbox</p>
                                                    <p className="text-[10px] text-white/40">Active streams & queued files</p>
                                                </div>
                                            </button>
                                        )}
                                        {quantumHud?.onOpenAndroidDownload && (
                                            <button
                                                onClick={() => { quantumHud.onOpenAndroidDownload(); setShowQuantumMenu(false); }}
                                                className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:text-white hover:bg-emerald-500/15 rounded-xl text-left cursor-pointer transition-colors"
                                            >
                                                <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                                                <div>
                                                    <p className="font-semibold">Get Android App</p>
                                                    <p className="text-[10px] text-white/40">Download APK & QR code</p>
                                                </div>
                                            </button>
                                        )}
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Shining Interactive Demo Button */}
                    <button
                        type="button"
                        onClick={() => {
                            soundEngine.play("quantum_ping");
                            window.dispatchEvent(new CustomEvent("vortex_open_tour"));
                        }}
                        title="Open Interactive Demo & Feature Guide"
                        className="interactive-shimmer-btn flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                        <span className="hidden md:inline">Demo</span>
                    </button>

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
                                                    onClick={() => { setShowMemoryVaultModal(true); setShowMoreMenu(false); }} 
                                                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-300 hover:text-white hover:bg-emerald-500/15 rounded-lg text-left cursor-pointer transition-colors"
                                                >
                                                    <Shield className="w-4 h-4 text-emerald-400" />
                                                    <span>Memory Vault (Encrypted)</span>
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

            <VaultChatModal
                isOpen={showVaultChatModal}
                onClose={() => setShowVaultChatModal(false)}
                user={user}
                isFriend={isFriend}
                onStatusChanged={(isLocked) => setIsVaultProtected(isLocked)}
            />

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

            <MemoryVaultModal
                isOpen={showMemoryVaultModal}
                onClose={() => setShowMemoryVaultModal(false)}
            />
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
    isFriend: PropTypes.bool,
    onStartGhostChat: PropTypes.func,
    onDeleteSelected: PropTypes.func,
    onReloadChat: PropTypes.func,
    isReloading: PropTypes.bool,
    messages: PropTypes.array,
};

export default ChatHeader;
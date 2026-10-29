import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bell,
    LogOut,
    Palette,
    Radio,
    ShieldCheck,
    SlidersHorizontal,
    Users,
    Trash2,
    AlertTriangle,
    Loader2,
    Volume2,
    VolumeX,
    Lock,
    Eye,
    EyeOff,
    CheckCircle2,
    UserX,
    Megaphone,
    Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import API from "../../Services/API";
import { clearAdminSession } from "../../utils/adminSession";
import { soundEffects } from "../../utils/soundEffects";
import { getVaultPin, setVaultPin, enterDecoyMode } from "../../Services/vaultService";
import { KeyRound, ShieldAlert, Zap } from "lucide-react";


export default function Settings() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("general"); // 'general' | 'privacy' | 'security' | 'danger'
    const [pendingRequests, setPendingRequests] = useState([]);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    // Sound effects setting
        // Cypherpunk Security & Duress Protection states
    const [realPin, setRealPin] = useState(() => getVaultPin());
    const [decoyPin, setDecoyPin] = useState(() => localStorage.getItem("vortex_decoy_pin") || "0000");
    const [pinSavedNotice, setPinSavedNotice] = useState(false);
    const [antiScreenshot, setAntiScreenshot] = useState(() => localStorage.getItem("vortex_anti_screenshot") !== "false");
    const [panicKeyEnabled, setPanicKeyEnabled] = useState(() => localStorage.getItem("vortex_panic_key") === "true");
    const [testNotifNotice, setTestNotifNotice] = useState("");

    const [soundEnabled, setSoundEnabled] = useState(() => {
        return localStorage.getItem("chat_sound_enabled") !== "false";
    });

    // Notification permission status
    const [notifPermission, setNotifPermission] = useState(() => {
        return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default";
    });

        const handleSavePins = () => {
        if (!/^\d{4}$/.test(realPin) || !/^\d{4}$/.test(decoyPin)) {
            alert("Both PINs must be exactly 4 digits.");
            return;
        }
        if (realPin === decoyPin) {
            alert("Decoy PIN must be different from your real Secret Vault PIN.");
            return;
        }
        setVaultPin(realPin);
        localStorage.setItem("vortex_decoy_pin", decoyPin);
        setPinSavedNotice(true);
        soundEffects.play("coin");
        setTimeout(() => setPinSavedNotice(false), 3000);
    };

    const handleTestDecoy = () => {
        enterDecoyMode();
        soundEffects.play("whoosh");
        alert("🚨 Decoy Mode Activated! Confidential vaults hidden. Returning to Dashboard.");
        navigate("/dashboard/messages");
    };

    const handleSendTestNotification = () => {
        if ("Notification" in window && Notification.permission === "granted") {
            try {
                new Notification("ChatTornado", {
                    body: "🚀 Real-time push alert operational! You're all set.",
                    icon: "/favicon.ico",
                });
                soundEffects.play("pop");
                setTestNotifNotice("Test alert dispatched!");
                setTimeout(() => setTestNotifNotice(""), 3000);
            } catch (err) {
                console.warn("Notification error:", err);
            }
        } else {
            requestNotifications();
        }
    };

    const toggleSound = () => {
        const next = !soundEnabled;
        setSoundEnabled(next);
        localStorage.setItem("chat_sound_enabled", String(next));
        if (next) {
            soundEffects.play("pop");
        }
    };

    const requestNotifications = async () => {
        if ("Notification" in window) {
            const perm = await Notification.requestPermission();
            setNotifPermission(perm);
        }
    };

    const fetchSettingsData = async () => {
        try {
            const token = sessionStorage.getItem("token");
            const [pendingRes, blocksRes, annRes] = await Promise.allSettled([
                API.get("/connections/pending", { params: { token } }),
                API.get("/api/blocks", { params: { token } }),
                API.get("/api/announcements", { params: { token } }),
            ]);
            if (pendingRes.status === "fulfilled") setPendingRequests(pendingRes.value.data || []);
            if (blocksRes.status === "fulfilled") setBlockedUsers(blocksRes.value.data || []);
            if (annRes.status === "fulfilled") setAnnouncements(annRes.value.data || []);
        } catch (err) {
            console.error("Failed to fetch settings data", err);
        }
    };

    useEffect(() => {
        fetchSettingsData();
    }, []);

    const handleUnblock = async (userId) => {
        try {
            const token = sessionStorage.getItem("token");
            await API.delete(`/api/blocks/${userId}`, { params: { token } });
            setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
        } catch (err) {
            console.error("Failed to unblock user:", err);
        }
    };

    const handleMarkAnnouncementRead = async (annId) => {
        try {
            const token = sessionStorage.getItem("token");
            await API.post(`/api/announcements/${annId}/read`, {}, { params: { token } });
            setAnnouncements((prev) =>
                prev.map((a) => (a.id === annId ? { ...a, is_read: true } : a))
            );
        } catch (err) {
            console.error("Failed to mark announcement as read:", err);
        }
    };

    const handleAction = async (id, action) => {
        try {
            const token = sessionStorage.getItem("token");
            await API.post(`/connections/${id}/action`, { action }, { params: { token } });
            setPendingRequests((prev) => prev.filter((r) => r.connection_id !== id));
        } catch (err) {
            console.error(`Failed to ${action} request`, err);
        }
    };

    const handleLogout = () => {
        clearAdminSession();
        sessionStorage.clear();
        window.dispatchEvent(new Event("sessionStorageUpdate"));
        navigate("/", { replace: true });
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        setDeleteError("");
        try {
            const token = sessionStorage.getItem("token");
            await API.delete("/user/account", { params: { token } });
            clearAdminSession();
            sessionStorage.clear();
            window.dispatchEvent(new Event("sessionStorageUpdate"));
            navigate("/", { replace: true });
        } catch (err) {
            console.error("Failed to delete account:", err);
            setDeleteError(err.response?.data?.detail || "Failed to delete account. Please try again.");
            setIsDeleting(false);
        }
    };

    return (
        <main className="min-h-0 flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 text-white custom-scrollbar overscroll-contain">
            <section className="mx-auto flex w-full max-w-5xl flex-col gap-5 sm:gap-6 pb-12">
                {/* Header */}
                <header className="rounded-2xl border border-white/10 bg-gradient-to-r from-sky-950/20 via-indigo-950/20 to-black/40 p-5 sm:p-7 backdrop-blur-2xl shadow-xl">
                    <div className="mb-2.5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-300">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-sky-400" />
                        <span>Workspace Controls & Preferences</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">Settings</h1>
                    <p className="mt-1.5 text-xs sm:text-sm text-white/60 max-w-xl">
                        Manage your audio feedback, notifications, privacy permissions, and zero-knowledge encryption preferences.
                    </p>

                    {/* Navigation Tabs */}
                    <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-white/10">
                        {[
                            { id: "general", label: "Preferences & Audio", icon: Volume2 },
                            { id: "privacy", label: "Connections & Privacy", icon: Users, badge: pendingRequests.length },
                            { id: "security", label: "Zero-Knowledge Vault", icon: ShieldCheck },
                            { id: "danger", label: "Danger Zone", icon: AlertTriangle },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                    activeTab === tab.id
                                        ? "bg-white/15 border border-white/20 text-white shadow-md font-black"
                                        : "text-white/50 hover:bg-white/[0.04] hover:text-white"
                                }`}
                            >
                                <tab.icon className="h-3.5 w-3.5" />
                                <span>{tab.label}</span>
                                {tab.badge > 0 && (
                                    <span className="bg-sky-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Tab 1: Preferences & Audio */}
                {activeTab === "general" && (
                    <div className="grid gap-4">
                        {/* Audio Feedback Toggle */}
                        <div className="rounded-2xl border border-white/10 bg-[#090c14]/90 p-5 backdrop-blur-2xl shadow-xl flex items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                                <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                    {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Audio & Sound FX</h3>
                                    <p className="text-xs text-white/50 mt-0.5">Play atmospheric sound effects for sends, receives, and game moves.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={toggleSound}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    soundEnabled
                                        ? "bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                                        : "bg-white/10 text-white/40"
                                }`}
                            >
                                {soundEnabled ? "Enabled" : "Muted"}
                            </button>
                        </div>

                        {/* Push Notifications Toggle */}
                        <div className="rounded-2xl border border-white/10 bg-[#090c14]/90 p-5 backdrop-blur-2xl shadow-xl flex items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                                <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                                    <Bell className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Desktop & Mobile Push Alerts</h3>
                                    <p className="text-xs text-white/50 mt-0.5">Receive native system notifications when new messages arrive.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {notifPermission === "granted" && (
                                    <button
                                        type="button"
                                        onClick={handleSendTestNotification}
                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white/80 transition-all border border-white/10 active:scale-95"
                                    >
                                        Test Alert
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={requestNotifications}
                                    disabled={notifPermission === "granted"}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                        notifPermission === "granted"
                                            ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 cursor-default"
                                            : "bg-sky-600 text-white hover:bg-sky-500 active:scale-95"
                                    }`}
                                >
                                    {notifPermission === "granted" ? "Active" : "Allow Alerts"}
                                </button>
                            </div>
                        </div>

                        {/* System Announcements */}
                        {announcements.length > 0 && (
                            <div className="rounded-2xl border border-white/10 bg-[#090c14]/90 p-5 backdrop-blur-2xl shadow-xl">
                                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <Megaphone className="h-4 w-4 text-amber-400" />
                                    System Announcements
                                </h3>
                                <div className="space-y-2">
                                    {announcements.map((ann) => (
                                        <div key={ann.id} className="flex items-start justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                            <div>
                                                <p className="text-xs font-semibold text-white/90">{ann.title || "Notice"}</p>
                                                <p className="text-[11px] text-white/50 mt-0.5">{ann.content}</p>
                                            </div>
                                            {!ann.is_read && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleMarkAnnouncementRead(ann.id)}
                                                    className="text-[10px] text-sky-400 hover:text-sky-300 font-bold px-2 py-1 rounded bg-sky-500/10"
                                                >
                                                    Dismiss
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 2: Connections & Privacy */}
                {activeTab === "privacy" && (
                    <div className="grid gap-4">
                        {/* Connection Requests */}
                        <div className="rounded-2xl border border-white/10 bg-[#090c14]/90 p-5 backdrop-blur-2xl shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Users className="h-4 w-4 text-indigo-400" />
                                    Incoming Chat Requests
                                </h3>
                                <span className="text-xs text-white/40">{pendingRequests.length} pending</span>
                            </div>
                            {pendingRequests.length === 0 ? (
                                <p className="text-xs text-white/40 italic py-3">No pending connection requests.</p>
                            ) : (
                                <div className="space-y-2.5">
                                    {pendingRequests.map((req) => (
                                        <div key={req.connection_id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                            <div>
                                                <p className="text-xs font-bold text-white">{req.requester_username}</p>
                                                <p className="text-[10px] text-white/40">Wants to connect</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAction(req.connection_id, "accept")}
                                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAction(req.connection_id, "reject")}
                                                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white/60 transition-colors"
                                                >
                                                    Ignore
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Blocked Users */}
                        <div className="rounded-2xl border border-white/10 bg-[#090c14]/90 p-5 backdrop-blur-2xl shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <UserX className="h-4 w-4 text-rose-400" />
                                    Blocked Users
                                </h3>
                                <span className="text-xs text-white/40">{blockedUsers.length} blocked</span>
                            </div>
                            {blockedUsers.length === 0 ? (
                                <p className="text-xs text-white/40 italic py-3">No users are currently blocked.</p>
                            ) : (
                                <div className="space-y-2">
                                    {blockedUsers.map((u) => (
                                        <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                            <p className="text-xs font-semibold text-white/80">{u.username}</p>
                                            <button
                                                type="button"
                                                onClick={() => handleUnblock(u.id)}
                                                className="text-xs text-rose-400 hover:text-rose-300 font-bold px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20"
                                            >
                                                Unblock
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab 3: Cypherpunk Security & Duress Protection */}
                {activeTab === "security" && (
                    <div className="grid gap-4">
                        {/* Overview Banner */}
                        <div className="rounded-2xl border border-white/10 bg-[#090c14]/90 p-5 backdrop-blur-2xl shadow-xl flex items-start gap-3.5">
                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                                <Lock className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">VORTEX Zero-Knowledge Fortress</h3>
                                <p className="text-xs text-white/50 mt-0.5">
                                    End-to-end client-side encryption (AES-256 GCM + PBKDF2). Keys never touch remote servers.
                                </p>
                            </div>
                        </div>

                        {/* Duress & Decoy PIN Card */}
                        <div className="rounded-2xl border border-white/10 bg-[#090c14]/90 p-5 backdrop-blur-2xl shadow-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                        <KeyRound className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Dual-PIN Duress & Decoy Protection</h4>
                                        <p className="text-xs text-white/50">Configure alternate passcodes for forced unlock situations.</p>
                                    </div>
                                </div>
                                {pinSavedNotice && (
                                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-pulse">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Saved!
                                    </span>
                                )}
                            </div>

                            <p className="text-xs text-white/60 leading-relaxed">
                                If forced to unlock your phone or account, enter your <strong className="text-amber-300">Decoy PIN</strong>.
                                ChatTornado will instantly boot into an innocent Safe Mode with zero trace of your encrypted chats.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                                    <label className="text-xs font-bold text-white/80 block mb-1.5">Secret Vault PIN (4 digits)</label>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        value={realPin}
                                        onChange={(e) => setRealPin(e.target.value.replace(/\D/g, ""))}
                                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white font-mono text-center tracking-widest text-sm focus:border-purple-500 focus:outline-none"
                                        placeholder="••••"
                                    />
                                    <span className="text-[10px] text-white/40 mt-1 block">Unlocks true encrypted vault.</span>
                                </div>

                                <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                                    <label className="text-xs font-bold text-amber-300 block mb-1.5">Duress / Decoy PIN (4 digits)</label>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        value={decoyPin}
                                        onChange={(e) => setDecoyPin(e.target.value.replace(/\D/g, ""))}
                                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-amber-500/20 text-amber-300 font-mono text-center tracking-widest text-sm focus:border-amber-500 focus:outline-none"
                                        placeholder="0000"
                                    />
                                    <span className="text-[10px] text-white/40 mt-1 block">Boots innocent decoy state.</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={handleSavePins}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg transition-all active:scale-95"
                                >
                                    Save Passcodes
                                </button>
                                <button
                                    type="button"
                                    onClick={handleTestDecoy}
                                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-all active:scale-95"
                                >
                                    Simulate Decoy Trigger
                                </button>
                            </div>
                        </div>

                        {/* Anti-Screenshot & Emergency Panic Key */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-white/10 bg-[#090c14]/90 p-5 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-sky-400">
                                        <EyeOff className="h-4 w-4" />
                                        <h4 className="text-sm font-bold text-white">Anti-Screenshot Guard</h4>
                                    </div>
                                    <p className="text-xs text-white/50 leading-relaxed">
                                        Automatically masks messages when window focus is lost or screen capture tools are detected.
                                    </p>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = !antiScreenshot;
                                            setAntiScreenshot(next);
                                            localStorage.setItem("vortex_anti_screenshot", String(next));
                                            soundEffects.play("pop");
                                        }}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            antiScreenshot
                                                ? "bg-sky-500/20 border border-sky-500/30 text-sky-300"
                                                : "bg-white/10 text-white/40"
                                        }`}
                                    >
                                        {antiScreenshot ? "Active" : "Disabled"}
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-[#090c14]/90 p-5 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-rose-400">
                                        <ShieldAlert className="h-4 w-4" />
                                        <h4 className="text-sm font-bold text-white">Triple-Esc Panic Key</h4>
                                    </div>
                                    <p className="text-xs text-white/50 leading-relaxed">
                                        Pressing <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Esc</kbd> 3 times quickly wipes session RAM and instantly redirects to Wikipedia.
                                    </p>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = !panicKeyEnabled;
                                            setPanicKeyEnabled(next);
                                            localStorage.setItem("vortex_panic_key", String(next));
                                            soundEffects.play("pop");
                                        }}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            panicKeyEnabled
                                                ? "bg-rose-500/20 border border-rose-500/30 text-rose-300"
                                                : "bg-white/10 text-white/40"
                                        }`}
                                    >
                                        {panicKeyEnabled ? "Armed" : "Disabled"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 4: Danger Zone */}
                {activeTab === "danger" && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-950/10 p-5 backdrop-blur-2xl shadow-xl">
                        <div className="flex items-center gap-2.5 text-red-400 mb-2">
                            <AlertTriangle className="h-5 w-5" />
                            <h3 className="text-base font-bold text-red-400">Irreversible Actions</h3>
                        </div>
                        <p className="text-xs text-red-200/60 max-w-lg mb-5">
                            Permanently erase your account, all message history, encrypted memories, and contacts from the database.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setDeleteConfirmText("");
                                setDeleteError("");
                                setShowDeleteModal(true);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-red-600/20 border border-red-500/40 text-red-300 text-xs font-bold hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 active:scale-95"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete Account Permanently
                        </button>
                    </div>
                )}
            </section>

            {/* Permanent Account Deletion Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#0c0d12] p-6 shadow-2xl"
                        >
                            <div className="flex items-center gap-3 text-red-400 mb-4">
                                <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 border border-red-500/20">
                                    <Trash2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Delete Account Forever?</h3>
                                    <p className="text-xs text-red-400/80">Permanent & irreversible action</p>
                                </div>
                            </div>

                            <p className="text-xs leading-relaxed text-white/60 mb-4">
                                This will completely wipe your account, conversations, messages, reactions, and connections from the database. Your username and email will immediately become available for anyone to register again.
                            </p>

                            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 mb-4">
                                <p className="text-xs text-white/70 mb-2">
                                    Type <span className="font-bold text-red-400 font-mono">DELETE</span> below to confirm:
                                </p>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder="DELETE"
                                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white font-mono placeholder:text-white/20 focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            {deleteError && (
                                <p className="text-xs text-red-400 mb-3 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                                    {deleteError}
                                </p>
                            )}

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-white/70 hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={deleteConfirmText !== "DELETE" || isDeleting}
                                    onClick={handleDeleteAccount}
                                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center justify-center gap-1.5"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Wiping...
                                        </>
                                    ) : (
                                        "Delete Account"
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </main>
    );
}

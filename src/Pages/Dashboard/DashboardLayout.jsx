import React, { useMemo, useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
    BarChart3,
    Gamepad2,
    Globe,
    Home,
    LogOut,
    MessageSquareText,
    Radio,
    Settings,
    Shield,
    Smartphone,
    Sparkles,
    UserRound,
    Zap,
    HelpCircle,
    Search,
    WifiOff,
    Palette,
    Maximize2,
    Minimize2,
} from "lucide-react";
import { clearAdminSession } from "../../utils/adminSession";
import PortfolioOnboardingModal from "../../Components/PortfolioOnboardingModal";
import AndroidAppDownloadModal from "../../Components/AndroidAppDownloadModal";
import CommandPaletteModal from "../../Components/CommandPaletteModal";

const ACCENT_THEMES = [
    { id: "sky", label: "Sky Cyan", orb1: "bg-sky-500/12", orb2: "bg-indigo-600/12" },
    { id: "violet", label: "Violet Pulse", orb1: "bg-violet-500/14", orb2: "bg-fuchsia-600/12" },
    { id: "emerald", label: "Emerald Matrix", orb1: "bg-emerald-500/12", orb2: "bg-teal-600/12" },
    { id: "amber", label: "Amber Solar", orb1: "bg-amber-500/12", orb2: "bg-rose-600/10" },
];

const navItems = [
    { to: "/home", label: "Home", icon: Home, badge: null },
    { to: "/messages", label: "Messages", icon: MessageSquareText, badge: "AI" },
    { to: "/darkweb", label: "Dark Web", icon: Globe, badge: "P2P", mobileOnly: true },
    { to: "/arcade", label: "Arcade", icon: Gamepad2, badge: null },
    { to: "/insights", label: "Insights", icon: BarChart3, badge: null },
    { to: "/profile", label: "Profile", icon: UserRound, badge: null },
    { to: "/settings", label: "Settings", icon: Settings, badge: null },
];

export default function DashboardLayout() {
    const navigate = useNavigate();
    const [username, setUsername] = useState(() => sessionStorage.getItem("username") || "Member");
    const [role, setRole] = useState(() => {
        try {
            const token = sessionStorage.getItem("token");
            if (token) {
                const p = JSON.parse(atob(token.split(".")[1]));
                return p.role || sessionStorage.getItem("role") || "USER";
            }
        } catch {
            return sessionStorage.getItem("role") || "USER";
        }
        return sessionStorage.getItem("role") || "USER";
    });
    const [showOnboarding, setShowOnboarding] = useState(() => {
        return sessionStorage.getItem("onboardingCompleted") !== "true";
    });
    const [isMobileChatActive, setIsMobileChatActive] = useState(false);
    const [showAndroidModal, setShowAndroidModal] = useState(false);
    const [cmdOpen, setCmdOpen] = useState(false);
    const [appFullscreen, setAppFullscreen] = useState(false);
    const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));

    const toggleAppFullscreen = async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else if (document.documentElement?.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (_) {}
    };

    useEffect(() => {
        const onFs = () => setAppFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener("fullscreenchange", onFs);
        return () => document.removeEventListener("fullscreenchange", onFs);
    }, []);
    const [accentId, setAccentId] = useState(() => {
        try { return localStorage.getItem("chattornado_accent") || "sky"; } catch (_) { return "sky"; }
    });

    const cycleAccent = () => {
        const idx = ACCENT_THEMES.findIndex((t) => t.id === accentId);
        const next = ACCENT_THEMES[(idx + 1) % ACCENT_THEMES.length];
        setAccentId(next.id);
        try { localStorage.setItem("chattornado_accent", next.id); } catch (_) {}
    };
    const activeAccent = ACCENT_THEMES.find((t) => t.id === accentId) || ACCENT_THEMES[0];

    useEffect(() => {
        const onOnline = () => setIsOnline(true);
        const onOffline = () => setIsOnline(false);
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === "k") {
                e.preventDefault();
                setCmdOpen((v) => !v);
            }
        };
        const onOpenCmd = () => setCmdOpen(true);
        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        window.addEventListener("keydown", onKey);
        window.addEventListener("chattornado:open-command-palette", onOpenCmd);
        return () => {
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("chattornado:open-command-palette", onOpenCmd);
        };
    }, []);

    const isAdmin = Boolean(
        role === "SUPER_ADMIN" ||
        sessionStorage.getItem("role") === "SUPER_ADMIN" ||
        username === "BlackShadow-ChatTornado"
    );

    const activeNavItems = useMemo(() => {
        const base = [...navItems];
        if (isAdmin) {
            base.push({
                to: "/admin",
                label: "Admin Board",
                icon: Shield,
                badge: "ROOT",
                isAdminOnly: true
            });
        }
        return base;
    }, [isAdmin]);

    useEffect(() => {
        const handleMobileChatChange = (e) => {
            setIsMobileChatActive(Boolean(e.detail?.open));
        };
        window.addEventListener("chattornado_chat_open", handleMobileChatChange);
        return () => window.removeEventListener("chattornado_chat_open", handleMobileChatChange);
    }, []);

    useEffect(() => {
        const syncState = () => {
            setUsername(sessionStorage.getItem("username") || "Member");
            setShowOnboarding(sessionStorage.getItem("onboardingCompleted") !== "true");
        };
        const handleOpenOnboarding = () => setShowOnboarding(true);

        window.addEventListener("sessionStorageUpdate", syncState);
        window.addEventListener("openPortfolioOnboarding", handleOpenOnboarding);
        window.addEventListener("vortex_open_tour", handleOpenOnboarding);
        return () => {
            window.removeEventListener("sessionStorageUpdate", syncState);
            window.removeEventListener("openPortfolioOnboarding", handleOpenOnboarding);
            window.removeEventListener("vortex_open_tour", handleOpenOnboarding);
        };
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
        const handleWindowScroll = () => {
            if (window.scrollY !== 0 || window.scrollX !== 0) {
                window.scrollTo(0, 0);
            }
        };
        window.addEventListener("scroll", handleWindowScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleWindowScroll);
    }, []);

    const initial = username.trim().charAt(0).toUpperCase() || "M";

    const handleLogout = () => {
        clearAdminSession();
        sessionStorage.clear();
        window.dispatchEvent(new Event("sessionStorageUpdate"));
        navigate("/", { replace: true });
    };

    return (
        <div className="relative flex h-screen h-[100dvh] w-full overflow-hidden bg-[#07090d] text-white selection:bg-sky-500/30 selection:text-white">
            <PortfolioOnboardingModal
                isOpen={showOnboarding}
                onClose={() => setShowOnboarding(false)}
                onComplete={() => setShowOnboarding(false)}
            />
            <AndroidAppDownloadModal
                isOpen={showAndroidModal}
                onClose={() => setShowAndroidModal(false)}
            />
            <CommandPaletteModal
                isOpen={cmdOpen}
                onClose={() => setCmdOpen(false)}
                isAdmin={isAdmin}
                onCycleAccent={cycleAccent}
                onOpenAndroid={() => setShowAndroidModal(true)}
                onOpenTour={() => setShowOnboarding(true)}
            />

            {/* Ambient Multi-Layer Background Mesh */}
            <div className={`pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full ${activeAccent.orb1} blur-[120px] transition-colors duration-700`} />
            <div className={`pointer-events-none absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full ${activeAccent.orb2} blur-[140px] transition-colors duration-700`} />
            <div className="pointer-events-none absolute -bottom-40 left-1/3 h-[500px] w-[500px] rounded-full bg-amber-500/8 blur-[130px]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

            {/* Desktop Elevated Sidebar */}
            <aside className="relative z-10 hidden w-[280px] shrink-0 border-r border-white/10 bg-[#090c14]/90 p-4 backdrop-blur-2xl lg:flex lg:flex-col shadow-[12px_0_48px_rgba(0,0,0,0.5)] h-full overflow-hidden">
                {/* Brand Header */}
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 shadow-lg group">
                    <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex items-center gap-3">
                        <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-sky-400 via-indigo-500 to-purple-600 text-white shadow-[0_0_24px_rgba(56,189,248,0.4)]">
                            <Radio className="h-5 w-5 animate-pulse" />
                            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#090c14] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <span className="truncate text-base font-black tracking-tight bg-gradient-to-r from-white via-white/95 to-white/70 bg-clip-text text-transparent">
                                    Chat Tornado
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-300/80">
                                <Sparkles className="h-3 w-3 text-sky-400 animate-spin" style={{ animationDuration: "8s" }} />
                                <span>VORTEX AI Core</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Telemetry Micro-Pill + Quick Jump */}
                <div className="mt-3 flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setCmdOpen(true)}
                        className="flex-1 flex items-center justify-between rounded-xl border border-white/12 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 text-xs font-bold text-white/75 transition cursor-pointer"
                        title="Open Global Command Palette (Ctrl+K)"
                    >
                        <span className="flex items-center gap-1.5">
                            <Search className="h-3.5 w-3.5 text-sky-300" />
                            <span>Quick Jump</span>
                        </span>
                        <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/60">⌘K</span>
                    </button>
                    <button
                        type="button"
                        onClick={cycleAccent}
                        title={`Theme Accent: ${activeAccent.label}`}
                        aria-label="Cycle ambient accent theme"
                        className="p-2 rounded-xl border border-white/12 bg-white/[0.04] hover:bg-white/[0.08] text-sky-300 transition cursor-pointer"
                    >
                        <Palette className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={toggleAppFullscreen}
                        title={appFullscreen ? "Exit Fullscreen" : "Fullscreen App"}
                        aria-label={appFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                        className="p-2 rounded-xl border border-white/12 bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white transition cursor-pointer"
                    >
                        {appFullscreen ? <Minimize2 className="h-4 w-4 text-cyan-300" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                </div>

                {/* Navigation Items */}
                <nav className="mt-4 flex flex-1 flex-col gap-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5" aria-label="Dashboard navigation">
                    {activeNavItems.filter((item) => !item.mobileOnly).map(({ to, label, icon: Icon, badge, isAdminOnly }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                [
                                    "group relative flex min-h-[46px] items-center gap-3.5 rounded-xl border px-3.5 text-sm font-bold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                                    isActive
                                        ? isAdminOnly
                                            ? "border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/5 text-amber-200 shadow-[0_8px_24px_rgba(245,158,11,0.3)] font-black"
                                            : "border-white/20 bg-gradient-to-r from-white/12 via-white/8 to-white/5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.15)] font-black"
                                        : isAdminOnly
                                            ? "border-amber-500/30 bg-amber-500/5 text-amber-300 hover:border-amber-400/50 hover:bg-amber-500/15 hover:text-amber-100"
                                            : "border-transparent text-white/60 hover:border-white/10 hover:bg-white/[0.045] hover:text-white",
                                ].join(" ")
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full shadow-[0_0_12px_rgba(56,189,248,0.8)] ${isAdminOnly ? "bg-gradient-to-b from-amber-400 to-rose-500" : "bg-gradient-to-b from-sky-400 to-indigo-500"}`} />
                                    )}
                                    <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? (isAdminOnly ? "text-amber-300" : "text-sky-300") : (isAdminOnly ? "text-amber-400" : "text-white/60 group-hover:text-white")}`} />
                                    <span className="truncate flex-1">{label}</span>
                                    {badge && (
                                        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-black shadow-sm ${
                                            isAdminOnly
                                                ? "bg-amber-500/20 border-amber-400/40 text-amber-300 animate-pulse"
                                                : "bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border-sky-400/30 text-sky-300"
                                        }`}>
                                            {badge}
                                        </span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User Card & Logout */}
                <div className="space-y-2.5 border-t border-white/10 pt-4">
                    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.035] p-3 shadow-inner">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-sky-400 via-indigo-500 to-purple-600 text-sm font-black text-white shadow-md">
                            {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-white/95">{username}</p>
                            <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                                <Shield className="h-3 w-3 shrink-0" />
                                <span>Zero-Knowledge Vault</span>
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowAndroidModal(true)}
                        className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-bold text-emerald-300 shadow-lg transition-all active:scale-[0.98] outline-none cursor-pointer mb-2 group"
                        title="Download Native Android APK & QR"
                    >
                        <Smartphone className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span>Get Android App</span>
                        <span className="rounded-full bg-emerald-500/25 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-200">
                            APK
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowOnboarding(true)}
                        className="interactive-shimmer-btn flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-[0.98] outline-none cursor-pointer mb-2 group"
                        title="Interactive Guided Tour & Live Demo"
                    >
                        <Sparkles className="h-4 w-4 text-amber-300 group-hover:rotate-12 transition-transform" />
                        <span>Interactive Demo & Tour</span>
                        <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-200">
                            DEMO
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-bold text-red-200 transition-all hover:border-red-400/40 hover:bg-red-500/20 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Disconnect Session</span>
                    </button>
                </div>
            </aside>

            {/* Main Stage Content */}
            <main id="main-content" className={`relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden h-full ${isMobileChatActive ? "pb-0" : "pb-[54px]"} lg:pb-0`} role="main">
                {/* Mobile Top App Bar (Hidden when in active mobile chat to maximize viewport) */}
                {!isMobileChatActive && (
                    <div className="flex items-center justify-between border-b border-white/10 bg-[#090c14]/90 px-4 py-3 backdrop-blur-2xl lg:hidden shadow-md">
                        <div className="flex items-center gap-2.5">
                            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-400 via-indigo-500 to-purple-600 text-white shadow-md">
                                <Radio className="h-4 w-4 animate-pulse" />
                            </div>
                            <div>
                                <p className="text-sm font-black tracking-tight">Chat Tornado</p>
                                <p className="text-[10px] font-semibold text-sky-300/80">VORTEX AI World</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={toggleAppFullscreen}
                                className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/[0.06] text-white/80 active:scale-95 transition-all"
                                aria-label={appFullscreen ? "Exit fullscreen" : "Fullscreen app"}
                                title={appFullscreen ? "Exit Fullscreen" : "Fullscreen App"}
                            >
                                {appFullscreen ? <Minimize2 className="h-4 w-4 text-cyan-300" /> : <Maximize2 className="h-4 w-4" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => setCmdOpen(true)}
                                className="grid h-9 w-9 place-items-center rounded-xl border border-sky-400/30 bg-sky-500/15 text-sky-300 active:scale-95 transition-all"
                                aria-label="Quick Jump Command Palette"
                                title="Quick Jump (⌘K)"
                            >
                                <Search className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAndroidModal(true)}
                                className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 active:scale-95 transition-all"
                                aria-label="Get Android App APK"
                                title="Get Android App (APK & QR)"
                            >
                                <Smartphone className="h-4 w-4 text-emerald-400" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowOnboarding(true)}
                                className="interactive-shimmer-btn grid h-9 w-9 place-items-center rounded-xl text-white active:scale-95 transition-all"
                                aria-label="Guided Tour & Demo"
                                title="Guided Tour & Demo"
                            >
                                <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                            </button>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="grid h-9 w-9 place-items-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-200 active:scale-95 transition-all"
                                aria-label="Logout"
                                title="Logout"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {!isOnline && (
                    <div className="mx-3 mt-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-200 flex items-center justify-center gap-2">
                        <WifiOff className="h-4 w-4 shrink-0" />
                        <span>You are offline — messages &amp; scores will sync when reconnected.</span>
                    </div>
                )}

                <Outlet />

                {/* Mobile Lower Navigation Bar (Hidden in active chat to maximize typing & message area) */}
                {!isMobileChatActive && (
                    <nav className="fixed bottom-0 inset-x-0 z-50 flex h-[54px] items-center justify-around overflow-x-auto no-scrollbar border-t border-white/10 bg-[#090c14]/95 px-1 backdrop-blur-2xl lg:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.6)]" aria-label="Mobile dashboard navigation">
                        {activeNavItems.filter(item => !item.mobileOnly || item.to === "/darkweb" || item.isAdminOnly).map(({ to, label, icon: Icon, isAdminOnly }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    [
                                        "flex h-full flex-1 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-[9px] font-semibold transition-all active:scale-95 touch-manipulation",
                                    isActive
                                        ? "text-sky-300 font-bold"
                                        : "text-white/50 hover:text-white hover:bg-white/[0.04]",
                                ].join(" ")
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <div className={`p-1 rounded-lg transition-colors ${isActive ? "bg-sky-500/20 text-sky-300" : ""}`}>
                                        <Icon className="h-4 w-4 shrink-0" />
                                    </div>
                                    <span className="truncate max-w-[46px] leading-tight text-[8.5px]">{label.split(" ")[0]}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                    </nav>
                )}
            </main>
        </div>
    );
}

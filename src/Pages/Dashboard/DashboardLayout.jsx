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
    Sparkles,
    UserRound,
    Zap,
} from "lucide-react";
import { clearAdminSession } from "../../utils/adminSession";
import PortfolioOnboardingModal from "../../Components/PortfolioOnboardingModal";

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
    const [showOnboarding, setShowOnboarding] = useState(() => {
        return sessionStorage.getItem("onboardingCompleted") !== "true";
    });

    useEffect(() => {
        const syncState = () => {
            setUsername(sessionStorage.getItem("username") || "Member");
            setShowOnboarding(sessionStorage.getItem("onboardingCompleted") !== "true");
        };
        const handleOpenOnboarding = () => setShowOnboarding(true);

        window.addEventListener("sessionStorageUpdate", syncState);
        window.addEventListener("openPortfolioOnboarding", handleOpenOnboarding);
        return () => {
            window.removeEventListener("sessionStorageUpdate", syncState);
            window.removeEventListener("openPortfolioOnboarding", handleOpenOnboarding);
        };
    }, []);

    const initial = username.trim().charAt(0).toUpperCase() || "M";

    const handleLogout = () => {
        clearAdminSession();
        sessionStorage.clear();
        window.dispatchEvent(new Event("sessionStorageUpdate"));
        navigate("/", { replace: true });
    };

    return (
        <div className="relative flex h-full w-full overflow-hidden bg-[#07090d] text-white selection:bg-sky-500/30 selection:text-white">
            <PortfolioOnboardingModal
                isOpen={showOnboarding}
                onClose={() => setShowOnboarding(false)}
                onComplete={() => setShowOnboarding(false)}
            />

            {/* Ambient Multi-Layer Background Mesh */}
            <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[120px]" />
            <div className="pointer-events-none absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[140px]" />
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

                {/* System Telemetry Micro-Pill */}
                <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[11px] font-medium text-emerald-300/90">
                    <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>Mesh Network</span>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-400/80">E2EE Ready</span>
                </div>

                {/* Navigation Items */}
                <nav className="mt-4 flex flex-1 flex-col gap-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5" aria-label="Dashboard navigation">
                    {navItems.filter((item) => !item.mobileOnly).map(({ to, label, icon: Icon, badge }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                [
                                    "group relative flex min-h-[46px] items-center gap-3.5 rounded-xl border px-3.5 text-sm font-bold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                                    isActive
                                        ? "border-white/20 bg-gradient-to-r from-white/12 via-white/8 to-white/5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.15)] font-black"
                                        : "border-transparent text-white/60 hover:border-white/10 hover:bg-white/[0.045] hover:text-white",
                                ].join(" ")
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-sky-400 to-indigo-500 shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
                                    )}
                                    <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-sky-300" : "text-white/60 group-hover:text-white"}`} />
                                    <span className="truncate flex-1">{label}</span>
                                    {badge && (
                                        <span className="rounded-md bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border border-sky-400/30 px-1.5 py-0.5 text-[10px] font-black text-sky-300 shadow-sm">
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
                        onClick={handleLogout}
                        className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-bold text-red-200 transition-all hover:border-red-400/40 hover:bg-red-500/20 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Disconnect Session</span>
                    </button>
                </div>
            </aside>

            {/* Main Stage Content */}
            <main id="main-content" className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden h-full" role="main">
                {/* Mobile Top App Bar */}
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

                <Outlet />

                {/* Mobile Bottom Floating Navigation Dock */}
                <nav className="relative z-20 flex overflow-x-auto border-t border-white/10 bg-[#090c14]/95 px-2 py-2 backdrop-blur-2xl lg:hidden justify-between gap-1 shadow-2xl" aria-label="Mobile dashboard navigation">
                    {navItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                [
                                    "flex min-h-[46px] min-w-[48px] shrink-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold transition-all active:scale-95",
                                    isActive
                                        ? "bg-gradient-to-b from-white/15 to-white/5 border border-white/20 text-sky-300 shadow-md font-black"
                                        : "text-white/50 hover:bg-white/[0.04] hover:text-white",
                                ].join(" ")
                            }
                        >
                            <Icon className="h-4 w-4" />
                            <span className="truncate max-w-[54px]">{label.split(" ")[0]}</span>
                        </NavLink>
                    ))}
                </nav>
            </main>
        </div>
    );
}

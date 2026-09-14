import React, { useMemo } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
    BarChart3,
    Gamepad2,
    Home,
    LogOut,
    MessageSquareText,
    Radio,
    Settings,
    Shield,
    UserRound,
} from "lucide-react";

const navItems = [
    { to: "/home", label: "Home", icon: Home },
    { to: "/messages", label: "Messages", icon: MessageSquareText },
    { to: "/arcade", label: "Arcade 🎮", icon: Gamepad2 },
    { to: "/insights", label: "Insights", icon: BarChart3 },
    { to: "/profile", label: "Profile", icon: UserRound },
    { to: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout() {
    const navigate = useNavigate();
    const username = useMemo(() => sessionStorage.getItem("username") || "Member", []);
    const initial = username.trim().charAt(0).toUpperCase() || "M";

    const handleLogout = () => {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("username");
        window.dispatchEvent(new Event("sessionStorageUpdate"));
        navigate("/", { replace: true });
    };

    return (
        <div className="relative flex h-dvh w-screen overflow-hidden bg-[#07090d] text-white">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(125,211,252,0.08),transparent_34%,rgba(248,196,113,0.07)_68%,transparent)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:48px_48px]" />

            <aside className="relative z-10 hidden w-[280px] shrink-0 border-r border-white/10 bg-[#090c12]/88 p-4 backdrop-blur-2xl lg:flex lg:flex-col">
                <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.055] p-3">
                    <div className="grid h-11 w-11 place-items-center rounded-lg bg-white text-[#07131d] shadow-[0_18px_50px_rgba(255,255,255,0.08)]">
                        <Radio className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-black tracking-tight">Chat Tornado</p>
                        <p className="text-xs font-medium text-white/42">Private command layer</p>
                    </div>
                </div>

                <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Dashboard navigation">
                    {navItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                [
                                    "group flex min-h-[46px] items-center gap-3 rounded-lg border px-3 text-sm font-bold transition",
                                    isActive
                                        ? "border-white/16 bg-white text-[#07131d] shadow-[0_18px_42px_rgba(255,255,255,0.08)]"
                                        : "border-transparent text-white/58 hover:border-white/10 hover:bg-white/[0.055] hover:text-white",
                                ].join(" ")
                            }
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="space-y-3 border-t border-white/10 pt-4">
                    <div className="flex items-center gap-3 rounded-lg bg-white/[0.045] p-3">
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[linear-gradient(135deg,#7dd3fc,#c4b5fd)] text-sm font-black text-[#07131d]">
                            {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{username}</p>
                            <p className="flex items-center gap-1.5 text-xs text-emerald-300/75">
                                <Shield className="h-3.5 w-3.5" />
                                Verified session
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-red-400/16 bg-red-500/8 text-sm font-bold text-red-200 transition hover:border-red-300/28 hover:bg-red-500/14"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>
            </aside>

            <main id="main-content" className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden" role="main">
                <div className="flex items-center justify-between border-b border-white/10 bg-[#090c12]/78 px-4 py-3 backdrop-blur-2xl lg:hidden">
                    <div className="flex items-center gap-2">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#07131d]">
                            <Radio className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-sm font-black">Chat Tornado</p>
                            <p className="text-[11px] text-white/45">Premium workspace</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.055] text-white/70"
                        aria-label="Logout"
                        title="Logout"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>

                <Outlet />

                <nav className="relative z-20 grid grid-cols-5 border-t border-white/10 bg-[#090c12]/92 px-2 py-2 backdrop-blur-2xl lg:hidden" aria-label="Mobile dashboard navigation">
                    {navItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                [
                                    "flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-bold transition",
                                    isActive ? "bg-white text-[#07131d]" : "text-white/48 hover:bg-white/[0.06] hover:text-white",
                                ].join(" ")
                            }
                        >
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>
            </main>
        </div>
    );
}

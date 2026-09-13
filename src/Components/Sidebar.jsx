import { NavLink } from "react-router-dom"
import { useState } from "react"


export default function Sidebar() {
    const username = sessionStorage.getItem("username") || "Guest"
    const [open, setOpen] = useState(false)
    const [desktopOpen, setDesktopOpen] = useState(true)

    const avatarLetter = username ? username.charAt(0).toUpperCase() : "?"

    return (
        <>
            {/* MOBILE BUTTON */}
            <button
                onClick={() => setOpen(!open)}
                className="md:hidden fixed top-4 left-4 z-[99999] bg-gradient-to-r from-cyan-500 to-teal-400 text-zinc-950 px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all duration-200"
            >
                ☰
            </button>

            {/* BACKDROP */}
            {open && (
                <div
                    onClick={() => setOpen(false)}
                    className="md:hidden fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[99998] transition-opacity duration-300"
                />
            )}

            {/* SIDEBAR CONTAINER */}
            <div
                className={`fixed md:relative top-0 left-0 h-screen flex flex-col z-[99999] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] bg-zinc-950/80 backdrop-blur-xl border-r border-zinc-800/50 shadow-2xl overflow-visible
                    ${open ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"}
                    ${desktopOpen ? "w-72" : "w-72 md:w-[20px]"}`}
            >
                {/* DESKTOP FLOATING TOGGLE ARROW */}
                <button
                    onClick={() => setDesktopOpen(!desktopOpen)}
                    className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700/50 items-center justify-center text-zinc-400 hover:text-zinc-100 shadow-md hover:scale-110 active:scale-95 transition-all duration-300 z-[100000] cursor-pointer group"
                >
                    <span className={`text-[9px] font-bold transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${desktopOpen ? "" : "rotate-180"}`}>
                        ◀
                    </span>
                </button>

                {/* ANIMATED CONTENT WRAPPER */}
                <div
                    className={`h-full flex flex-col p-6 w-72 transition-all duration-300 ease-in-out origin-left
                        ${desktopOpen ? "opacity-100 scale-100" : "opacity-100 md:opacity-0 md:scale-95 md:pointer-events-none"}`}
                >
                    {/* CLOSE BUTTON (MOBILE ONLY) */}
                    <button
                        onClick={() => setOpen(false)}
                        className="md:hidden self-end text-xl text-zinc-400 hover:text-zinc-100 mb-4 p-1 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        ✕
                    </button>

                    {/* LOGO */}
                    <div className="mb-8 select-none">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent tracking-tight flex items-center gap-2">
                            <span className="drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">🌪️</span> ChatTornado
                        </h1>
                    </div>

                    {/* USER PROFILE CARD */}
                    <div className="mb-8 p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] shadow-[inset_0_1px_0px_rgba(255,255,255,0.1)] backdrop-blur-md flex items-center gap-3 relative overflow-hidden group">
                        <div className="absolute -inset-px bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />

                        {/* Circular Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-[0_0_15px_rgba(6,182,212,0.25)] border border-white/10 shrink-0 select-none">
                            {avatarLetter}
                        </div>

                        {/* User Metadata */}
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Logged in as</span>
                            <span className="text-zinc-200 font-medium text-sm truncate mt-0.5 drop-shadow-sm">
                                {username}
                            </span>
                        </div>
                    </div>

                    {/* NAVIGATION */}
                    <nav className="flex flex-col gap-1.5 flex-1">
                        {[
                            ["🏠 Home", "/home"],
                            ["💬 Messages", "/messages"],
                            ["🔥 Insights", "/insights"],
                            ["👤 Profile", "/profile"],
                            ["⚙️ Settings", "/settings"],
                        ].map(([label, path]) => {
                            const emoji = label.split(" ")[0]
                            const text = label.split(" ").slice(1).join(" ")

                            return (
                                <NavLink
                                    key={path}
                                    to={path}
                                    onClick={() => setOpen(false)}
                                    className={({ isActive }) =>
                                        `group relative flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 select-none border ${isActive
                                            ? "text-cyan-400 bg-gradient-to-r from-cyan-500/10 to-indigo-500/5 border-cyan-500/25 shadow-[0_0_20px_rgba(34,211,238,0.05)] font-semibold"
                                            : "text-zinc-400 hover:text-zinc-100 bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/[0.04]"
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            {/* Active Visual Indicator Bar */}
                                            {isActive && (
                                                <div className="absolute left-0 top-1/4 h-1/2 w-[3px] bg-gradient-to-b from-cyan-400 to-teal-400 rounded-r-full shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                                            )}

                                            {/* Icon with Subtle Hover Spring */}
                                            <span className="text-base transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[4deg]">
                                                {emoji}
                                            </span>

                                            {/* Label Text */}
                                            <span className="transition-colors duration-300">
                                                {text}
                                            </span>
                                        </>
                                    )}
                                </NavLink>
                            )
                        })}
                    </nav>

                    {/* FOOTER / LOGOUT */}
                    <div className="mt-auto pt-4 border-t border-zinc-800/50">
                        <button
                            onClick={() => {
                                sessionStorage.clear()
                                window.location.href = "/login"
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300"
                        >
                            <span className="text-base">🚪</span>
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
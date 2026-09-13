import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, Palette, Radio, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";

export default function Settings() {
    const navigate = useNavigate();

    const handleLogout = () => {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("username");
        window.dispatchEvent(new Event("sessionStorageUpdate"));
        navigate("/", { replace: true });
    };

    return (
        <main className="min-h-0 flex-1 overflow-y-auto p-4 text-white md:p-8">
            <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                <header className="rounded-lg border border-white/10 bg-white/[0.055] p-6 backdrop-blur-2xl md:p-8">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/55">
                        <SlidersHorizontal className="h-4 w-4 text-sky-200" />
                        Workspace controls
                    </div>
                    <h1 className="text-[clamp(32px,5vw,64px)] font-black leading-none tracking-tight">Settings</h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-white/58">
                        Manage the local session and visible product preferences without touching the backend contract.
                    </p>
                </header>

                <div className="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
                    <section className="grid gap-4">
                        {[
                            {
                                icon: Palette,
                                title: "Visual system",
                                body: "Premium dark interface with restrained accents, sharp spacing, and chat-first density.",
                                value: "Aether Pro",
                            },
                            {
                                icon: Bell,
                                title: "Notifications",
                                body: "Prepared for conversation alerts and unread count escalation.",
                                value: "Ready",
                            },
                            {
                                icon: Radio,
                                title: "Realtime transport",
                                body: "The dashboard keeps the existing WebSocket and API flow intact.",
                                value: "Live",
                            },
                        ].map(({ icon: Icon, title, body, value }, index) => (
                            <motion.div
                                key={title}
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="rounded-lg border border-white/10 bg-[#0d1118]/82 p-5 backdrop-blur-xl"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-[#07131d]">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black">{title}</h2>
                                            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/48">{body}</p>
                                        </div>
                                    </div>
                                    <span className="rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-black text-white/72">
                                        {value}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </section>

                    <aside className="grid content-start gap-4">
                        <section className="rounded-lg border border-emerald-300/18 bg-emerald-300/8 p-5 backdrop-blur-xl">
                            <ShieldCheck className="h-6 w-6 text-emerald-200" />
                            <h2 className="mt-5 text-xl font-black">Session healthy</h2>
                            <p className="mt-2 text-sm leading-6 text-emerald-50/62">
                                Authentication state is stored in session storage and verified by the existing protected route.
                            </p>
                        </section>

                        <section className="rounded-lg border border-red-300/18 bg-red-500/8 p-5 backdrop-blur-xl" aria-label="Account session">
                            <h2 className="text-xl font-black">Account session</h2>
                            <p className="mt-2 text-sm leading-6 text-white/52">
                                End this browser session and return to the login screen.
                            </p>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-red-400 px-4 text-sm font-black text-[#210607] transition hover:bg-red-300"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout securely
                            </button>
                        </section>
                    </aside>
                </div>
            </section>
        </main>
    );
}

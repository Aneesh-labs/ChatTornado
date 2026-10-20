import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Activity,
    ArrowUpRight,
    Bot,
    Cpu,
    Gamepad2,
    Lock,
    MessageSquareText,
    Radio,
    ShieldCheck,
    Sparkles,
    Zap,
} from "lucide-react";
import { motion } from "framer-motion";

const statCards = [
    {
        label: "Total messages",
        key: "totalMessages",
        icon: MessageSquareText,
        tint: "text-sky-300",
        badge: "Synced",
        ring: "border-sky-400/20 bg-sky-500/5",
    },
    {
        label: "Messages today",
        key: "messagesToday",
        icon: Zap,
        tint: "text-amber-300",
        badge: "Live",
        ring: "border-amber-400/20 bg-amber-500/5",
    },
    {
        label: "Session integrity",
        key: "status",
        icon: ShieldCheck,
        tint: "text-emerald-300",
        badge: "E2EE",
        ring: "border-emerald-400/20 bg-emerald-500/5",
    },
];

function readMetric(key, fallback = 0) {
    const value = Number(sessionStorage.getItem(key));
    return Number.isFinite(value) ? value : fallback;
}

function getTimeOfDayGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

export default function Home() {
    const navigate = useNavigate();
    const [snapshot, setSnapshot] = useState(() => ({
        username: sessionStorage.getItem("username") || "Member",
        totalMessages: readMetric("totalMessages"),
        messagesToday: readMetric("messagesToday"),
    }));

    useEffect(() => {
        const sync = () => {
            setSnapshot({
                username: sessionStorage.getItem("username") || "Member",
                totalMessages: readMetric("totalMessages"),
                messagesToday: readMetric("messagesToday"),
            });
        };

        sync();
        window.addEventListener("storage", sync);
        window.addEventListener("sessionStorageUpdate", sync);
        return () => {
            window.removeEventListener("storage", sync);
            window.removeEventListener("sessionStorageUpdate", sync);
        };
    }, []);

    const greeting = useMemo(() => getTimeOfDayGreeting(), []);

    const cards = useMemo(
        () =>
            statCards.map((card) => ({
                ...card,
                value:
                    card.key === "status"
                        ? "Active"
                        : Number(snapshot[card.key] || 0).toLocaleString(),
            })),
        [snapshot]
    );

    return (
        <main className="min-h-0 flex-1 overflow-y-auto p-4 text-white md:p-8 custom-scrollbar">
            <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                {/* Hero Command Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="relative overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-br from-[#0c101a]/95 via-[#0e1424]/90 to-[#12192e]/90 p-6 md:p-9 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
                >
                    <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-purple-500/15 blur-3xl" />

                    <div className="relative grid gap-8 md:grid-cols-[1.25fr_0.75fr]">
                        <div className="max-w-3xl">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3.5 py-1.5 text-xs font-black tracking-wider uppercase text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
                                <Radio className="h-4 w-4 animate-pulse text-sky-400" />
                                <span>VORTEX AI Command Deck</span>
                            </div>
                            <h1 className="text-[clamp(32px,4.5vw,56px)] font-black leading-[1.02] tracking-tight">
                                {greeting},{" "}
                                <span className="bg-gradient-to-r from-sky-300 via-indigo-200 to-amber-200 bg-clip-text text-transparent">
                                    {snapshot.username}
                                </span>
                                .
                            </h1>
                            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">
                                Your multi-AI ecosystem, zero-knowledge memory vault, and private real-time communication channels are primed and synchronized.
                            </p>

                            {/* Quick Launch Buttons */}
                            <div className="mt-7 flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate("/messages")}
                                    className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-600 px-5 py-3 text-sm font-black text-white shadow-[0_8px_24px_rgba(56,189,248,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                                >
                                    <Bot className="h-4.5 w-4.5" />
                                    <span>Launch VORTEX-9 AI</span>
                                    <ArrowUpRight className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate("/arcade")}
                                    className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white transition-all hover:border-white/20 hover:bg-white/[0.1] active:scale-[0.98] cursor-pointer"
                                >
                                    <Gamepad2 className="h-4 w-4 text-amber-300" />
                                    <span>Arcade Hub</span>
                                </button>
                            </div>
                        </div>

                        {/* Telemetry Status Right Panel */}
                        <div className="grid content-end gap-2.5">
                            {[
                                { title: "VORTEX Neural Engine", status: "Online", sub: "Gemini 2.5 Multi-Model", color: "bg-sky-400" },
                                { title: "Zero-Knowledge Vault", status: "Protected", sub: "Client-side Argon2id + AES", color: "bg-emerald-400" },
                                { title: "P2P WebRTC Layer", status: "Ready", sub: "Encrypted Direct Media", color: "bg-indigo-400" },
                            ].map((item) => (
                                <div
                                    key={item.title}
                                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-3.5 shadow-inner backdrop-blur-md"
                                >
                                    <div>
                                        <p className="text-xs font-bold text-white/90">{item.title}</p>
                                        <p className="text-[11px] text-white/50">{item.sub}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-white/80">{item.status}</span>
                                        <span className={`h-2.5 w-2.5 rounded-full ${item.color} shadow-[0_0_12px_currentColor]`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Metrics Grid */}
                <section className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-label="Dashboard metrics">
                    {cards.map(({ label, value, icon: Icon, tint, ring, badge }, index) => (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.42, delay: index * 0.05 }}
                            className={`relative overflow-hidden rounded-2xl border ${ring} p-5.5 shadow-[0_18px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-all hover:border-white/20`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.08] shadow-inner">
                                        <Icon className={`h-5 w-5 ${tint}`} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-wider rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-white/60">
                                        {badge}
                                    </span>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-white/30" />
                            </div>
                            <p className="mt-5 text-4xl font-black tracking-tight text-white/95">{value}</p>
                            <p className="mt-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white/45">{label}</p>
                        </motion.div>
                    ))}
                </section>

                {/* System Rhythm & Operations Cards */}
                <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.8fr_1.2fr]">
                    {/* Live System Profile */}
                    <div className="rounded-2xl border border-white/10 bg-[#0d1118]/85 p-6 shadow-xl backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 text-white shadow-md">
                                <Activity className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white/95">Neural Pipeline Rhythm</h2>
                                <p className="text-xs text-white/50">Adaptive model routing & response latency profile.</p>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-white/60">Pipeline Throughput</span>
                                <span className="text-sky-300">Optimal (98.4%)</span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-white/10 p-0.5">
                                <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400 shadow-[0_0_12px_rgba(56,189,248,0.6)]" />
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                            <div>
                                <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Gateway Latency</p>
                                <p className="mt-1 text-sm font-black text-white/90">~120ms (Uvicorn WS)</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Privacy Engine</p>
                                <p className="mt-1 text-sm font-black text-emerald-300">PII Neutralized</p>
                            </div>
                        </div>
                    </div>

                    {/* Operational Highlights */}
                    <div className="rounded-2xl border border-white/10 bg-[#0d1118]/85 p-6 shadow-xl backdrop-blur-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-black text-white/95">Workspace Architecture</h2>
                                <p className="text-xs text-white/50">Engineered for security, privacy, and autonomous collaboration.</p>
                            </div>
                            <span className="rounded-lg bg-white/[0.06] border border-white/10 px-2.5 py-1 text-[11px] font-mono font-bold text-white/70">
                                v2.4 VORTEX
                            </span>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            {[
                                { title: "Model Router", value: "Smart Hybrid", desc: "Fast & Deep Routing" },
                                { title: "Vault Privacy", value: "Zero-Knowledge", desc: "Argon2id + AES-256" },
                                { title: "Realtime Sync", value: "Auto-Heal 15s", desc: "Zero Idle Drops" },
                            ].map((item) => (
                                <div key={item.title} className="rounded-xl border border-white/8 bg-white/[0.035] p-4 transition-all hover:bg-white/[0.05]">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{item.title}</p>
                                    <p className="mt-2 text-base font-black text-white/90">{item.value}</p>
                                    <p className="mt-1 text-[11px] text-white/50">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </section>
        </main>
    );
}

import React, { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, MessageSquareText, Radio, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";

const statCards = [
    {
        label: "Total messages",
        key: "totalMessages",
        icon: MessageSquareText,
        tint: "text-sky-200",
        ring: "border-sky-300/18",
    },
    {
        label: "Messages today",
        key: "messagesToday",
        icon: Zap,
        tint: "text-amber-200",
        ring: "border-amber-300/18",
    },
    {
        label: "Session status",
        key: "status",
        icon: ShieldCheck,
        tint: "text-emerald-200",
        ring: "border-emerald-300/18",
    },
];

function readMetric(key, fallback = 0) {
    const value = Number(sessionStorage.getItem(key));
    return Number.isFinite(value) ? value : fallback;
}

export default function Home() {
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

    const cards = useMemo(
        () =>
            statCards.map((card) => ({
                ...card,
                value:
                    card.key === "status"
                        ? "Online"
                        : Number(snapshot[card.key] || 0).toLocaleString(),
            })),
        [snapshot]
    );

    return (
        <main className="min-h-0 flex-1 overflow-y-auto p-4 text-white md:p-8">
            <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.055] shadow-[0_28px_90px_rgba(0,0,0,0.30)] backdrop-blur-2xl"
                >
                    <div className="grid gap-8 p-6 md:grid-cols-[1.15fr_0.85fr] md:p-8">
                        <div className="max-w-3xl">
                            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/58">
                                <Radio className="h-4 w-4 text-sky-200" />
                                Live command center
                            </div>
                            <h1 className="text-[clamp(34px,5vw,68px)] font-black leading-[0.96] tracking-tight">
                                Welcome back, {snapshot.username}.
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-8 text-white/62">
                                Your conversations, workspace health, and message velocity are collected into one calm operational view.
                            </p>
                        </div>

                        <div className="grid content-end gap-3">
                            {["Backend protected", "Realtime channel", "Premium interface"].map((item) => (
                                <div key={item} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                                    <span className="text-sm font-bold text-white/74">{item}</span>
                                    <span className="h-2 w-2 rounded-sm bg-emerald-300 shadow-[0_0_20px_rgba(110,231,183,0.55)]" />
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                <section className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-label="Dashboard metrics">
                    {cards.map(({ label, value, icon: Icon, tint, ring }, index) => (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.42, delay: index * 0.05 }}
                            className={`rounded-lg border ${ring} bg-[#0d1118]/82 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl`}
                        >
                            <div className="flex items-center justify-between">
                                <Icon className={`h-5 w-5 ${tint}`} />
                                <ArrowUpRight className="h-4 w-4 text-white/24" />
                            </div>
                            <p className="mt-7 text-4xl font-black tracking-tight">{value}</p>
                            <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-white/38">{label}</p>
                        </motion.div>
                    ))}
                </section>

                <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.72fr_1fr]">
                    <div className="rounded-lg border border-white/10 bg-[#0d1118]/82 p-5 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-lg bg-white text-[#07131d]">
                                <Activity className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black">System rhythm</h2>
                                <p className="text-sm text-white/45">Stable realtime delivery profile.</p>
                            </div>
                        </div>
                        <div className="mt-6 h-2 overflow-hidden rounded-lg bg-white/10">
                            <div className="h-full w-[82%] rounded-lg bg-[linear-gradient(90deg,#7dd3fc,#86efac,#f8c471)]" />
                        </div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-[#0d1118]/82 p-5 backdrop-blur-xl">
                        <h2 className="text-lg font-black">Today at a glance</h2>
                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            {[
                                ["Focus", "Clear queue"],
                                ["Latency", "Low"],
                                ["Security", "JWT active"],
                            ].map(([label, value]) => (
                                <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/34">{label}</p>
                                    <p className="mt-2 text-lg font-black text-white/86">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </section>
        </main>
    );
}

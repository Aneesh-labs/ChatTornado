import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Clock3, MessageSquareText, RadioTower, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

function readNumber(key) {
    const value = Number(sessionStorage.getItem(key));
    return Number.isFinite(value) ? value : 0;
}

export default function Insights() {
    const [metrics, setMetrics] = useState(() => ({
        totalMessages: readNumber("totalMessages"),
        messagesToday: readNumber("messagesToday"),
    }));

    useEffect(() => {
        const syncMetrics = () => {
            setMetrics({
                totalMessages: readNumber("totalMessages"),
                messagesToday: readNumber("messagesToday"),
            });
        };

        syncMetrics();
        window.addEventListener("storage", syncMetrics);
        window.addEventListener("sessionStorageUpdate", syncMetrics);
        return () => {
            window.removeEventListener("storage", syncMetrics);
            window.removeEventListener("sessionStorageUpdate", syncMetrics);
        };
    }, []);

    const activity = useMemo(() => {
        if (metrics.totalMessages >= 100) return { label: "Peak", tone: "text-rose-200", width: 100 };
        if (metrics.totalMessages >= 70) return { label: "High", tone: "text-amber-200", width: metrics.totalMessages };
        if (metrics.totalMessages >= 35) return { label: "Balanced", tone: "text-sky-200", width: metrics.totalMessages };
        return { label: "Quiet", tone: "text-emerald-200", width: Math.max(metrics.totalMessages, 8) };
    }, [metrics.totalMessages]);

    const dailyWidth = Math.min(metrics.messagesToday * 5, 100);

    return (
        <main className="min-h-0 flex-1 overflow-y-auto p-4 text-white md:p-8">
            <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                <header className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.055] p-6 backdrop-blur-2xl md:flex-row md:items-end md:justify-between md:p-8">
                    <div>
                        <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/55">
                            <BarChart3 className="h-4 w-4 text-sky-200" />
                            Conversation intelligence
                        </div>
                        <h1 className="text-[clamp(32px,5vw,64px)] font-black leading-none tracking-tight">Insights</h1>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/58">
                            Track message volume, activity pressure, and daily velocity without leaving the workspace.
                        </p>
                    </div>
                    <div className="rounded-lg border border-emerald-300/18 bg-emerald-300/8 px-4 py-3 text-sm font-bold text-emerald-100">
                        Live telemetry
                    </div>
                </header>

                <section className="grid grid-cols-1 gap-4 md:grid-cols-4" aria-label="Quick statistics">
                    {[
                        { label: "Total messages", value: metrics.totalMessages.toLocaleString(), icon: MessageSquareText, tone: "text-sky-200" },
                        { label: "Messages today", value: metrics.messagesToday.toLocaleString(), icon: TrendingUp, tone: "text-amber-200" },
                        { label: "Activity", value: activity.label, icon: RadioTower, tone: activity.tone },
                        { label: "Window", value: "24h", icon: Clock3, tone: "text-violet-200" },
                    ].map(({ label, value, icon: Icon, tone }, index) => (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="rounded-lg border border-white/10 bg-[#0d1118]/82 p-5 backdrop-blur-xl"
                        >
                            <Icon className={`h-5 w-5 ${tone}`} />
                            <p className="mt-7 text-4xl font-black tracking-tight">{value}</p>
                            <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/34">{label}</p>
                        </motion.div>
                    ))}
                </section>

                <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.72fr]">
                    <div className="rounded-lg border border-white/10 bg-[#0d1118]/82 p-6 backdrop-blur-xl">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black">Activity overview</h2>
                                <p className="mt-1 text-sm text-white/46">Volume and daily velocity targets.</p>
                            </div>
                            <BarChart3 className="h-5 w-5 text-white/30" />
                        </div>

                        <div className="mt-8 space-y-7">
                            {[
                                { label: "Total volume cap", value: metrics.totalMessages, max: 100, width: Math.min(metrics.totalMessages, 100), bar: "bg-[linear-gradient(90deg,#7dd3fc,#c4b5fd)]" },
                                { label: "Daily velocity", value: metrics.messagesToday, max: 20, width: dailyWidth, bar: "bg-[linear-gradient(90deg,#f8c471,#86efac)]" },
                                { label: "Activity pressure", value: activity.width, max: 100, width: activity.width, bar: "bg-[linear-gradient(90deg,#86efac,#7dd3fc,#f8c471)]" },
                            ].map((row) => (
                                <div key={row.label}>
                                    <div className="mb-2 flex items-end justify-between gap-4">
                                        <span className="text-sm font-bold text-white/74">{row.label}</span>
                                        <span className="text-xs font-bold tabular-nums text-white/42">
                                            {row.value} / {row.max}
                                        </span>
                                    </div>
                                    <div className="h-3 overflow-hidden rounded-lg bg-white/10">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${row.width}%` }}
                                            transition={{ duration: 0.65, ease: "easeOut" }}
                                            className={`h-full rounded-lg ${row.bar}`}
                                            role="progressbar"
                                            aria-valuenow={row.value}
                                            aria-valuemin="0"
                                            aria-valuemax={row.max}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-[#0d1118]/82 p-6 backdrop-blur-xl">
                        <h2 className="text-xl font-black">Signal quality</h2>
                        <div className="mt-6 grid gap-3">
                            {[
                                ["Realtime sync", "Stable"],
                                ["Delivery layer", "Protected"],
                                ["User state", "Session-bound"],
                                ["Dashboard noise", "Reduced"],
                            ].map(([label, value]) => (
                                <div key={label} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
                                    <span className="text-sm font-bold text-white/58">{label}</span>
                                    <span className="text-sm font-black text-white">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </section>
        </main>
    );
}

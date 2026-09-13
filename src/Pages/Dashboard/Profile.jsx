import React, { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Fingerprint, Mail, ShieldCheck, UserRound } from "lucide-react";
import { motion } from "framer-motion";

export default function Profile() {
    const [username, setUsername] = useState(() => sessionStorage.getItem("username") || "Member");

    useEffect(() => {
        const syncProfileData = () => {
            setUsername(sessionStorage.getItem("username") || "Member");
        };

        syncProfileData();
        window.addEventListener("storage", syncProfileData);
        window.addEventListener("sessionStorageUpdate", syncProfileData);
        return () => {
            window.removeEventListener("storage", syncProfileData);
            window.removeEventListener("sessionStorageUpdate", syncProfileData);
        };
    }, []);

    const initial = useMemo(() => username.trim().charAt(0).toUpperCase() || "M", [username]);

    return (
        <main className="min-h-0 flex-1 overflow-y-auto p-4 text-white md:p-8">
            <section className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[0.78fr_1fr]">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.055] backdrop-blur-2xl"
                    aria-label="Profile summary"
                >
                    <div className="h-1 bg-[linear-gradient(90deg,#7dd3fc,#c4b5fd,#86efac)]" />
                    <div className="p-6 md:p-8">
                        <div className="grid h-28 w-28 place-items-center rounded-lg bg-[linear-gradient(135deg,#ffffff,#7dd3fc,#c4b5fd)] text-5xl font-black text-[#07131d] shadow-[0_28px_70px_rgba(125,211,252,0.14)]">
                            {initial}
                        </div>

                        <p className="mt-8 text-xs font-bold uppercase tracking-[0.20em] text-white/38">Account profile</p>
                        <h1 className="mt-3 break-words text-[clamp(34px,5vw,64px)] font-black leading-none tracking-tight">
                            {username}
                        </h1>
                        <p className="mt-5 max-w-xl text-sm leading-7 text-white/55">
                            This identity is tied to the active browser session and protected by the existing frontend authentication layer.
                        </p>

                        <div className="mt-7 inline-flex items-center gap-2 rounded-lg border border-emerald-300/18 bg-emerald-300/8 px-4 py-3 text-sm font-bold text-emerald-100">
                            <BadgeCheck className="h-4 w-4" />
                            Active online
                        </div>
                    </div>
                </motion.section>

                <section className="grid content-start gap-4">
                    <header className="rounded-lg border border-white/10 bg-[#0d1118]/82 p-6 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-lg bg-white text-[#07131d]">
                                <UserRound className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black">Profile details</h2>
                                <p className="text-sm text-white/45">Session identity and access state.</p>
                            </div>
                        </div>
                    </header>

                    <div className="grid gap-4 md:grid-cols-2">
                        {[
                            { label: "Display name", value: username, icon: UserRound },
                            { label: "System role", value: "Standard user", icon: ShieldCheck },
                            { label: "Auth state", value: "JWT verified", icon: Fingerprint },
                            { label: "Contact layer", value: "Private account", icon: Mail },
                        ].map(({ label, value, icon: Icon }) => (
                            <div key={label} className="rounded-lg border border-white/10 bg-[#0d1118]/82 p-5 backdrop-blur-xl">
                                <Icon className="h-5 w-5 text-sky-200" />
                                <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-white/34">{label}</p>
                                <p className="mt-2 break-words text-xl font-black text-white/88">{value}</p>
                            </div>
                        ))}
                    </div>

                    <section className="rounded-lg border border-white/10 bg-[#0d1118]/82 p-6 backdrop-blur-xl">
                        <h2 className="text-xl font-black">Access integrity</h2>
                        <div className="mt-5 space-y-3">
                            {["Protected route passed", "Token stored in session", "Logout clears credentials"].map((item) => (
                                <div key={item} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
                                    <span className="text-sm font-bold text-white/62">{item}</span>
                                    <span className="h-2 w-2 rounded-sm bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.55)]" />
                                </div>
                            ))}
                        </div>
                    </section>
                </section>
            </section>
        </main>
    );
}

{ console.log("LoginDesktop3 loaded!") }

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    ArrowRight,
    Eye,
    EyeOff,
    Lock,
    Mail,
    Radio,
    ShieldCheck,
    Sparkles,
    Waves,
} from "lucide-react";

import API from "../Services/API";

const palettes = {
    signal: {
        name: "Signal",
        accent: "#7dd3fc",
        ink: "#07131d",
        line: "rgba(125, 211, 252, 0.42)",
    },
    ember: {
        name: "Ember",
        accent: "#f8c471",
        ink: "#171006",
        line: "rgba(248, 196, 113, 0.38)",
    },
    violet: {
        name: "Violet",
        accent: "#c4b5fd",
        ink: "#100d1c",
        line: "rgba(196, 181, 253, 0.40)",
    },
};

function drawLoginField(canvas, paletteRef, pulseRef) {
    const context = canvas.getContext("2d");
    if (!context) return () => { };

    let frameId = 0;
    let last = 0;
    const nodes = Array.from({ length: 76 }, (_, index) => ({
        index,
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.018,
        vy: (Math.random() - 0.5) * 0.018,
        radius: 0.8 + Math.random() * 1.8,
    }));

    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = (time) => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const dt = Math.min((time - last) / 1000 || 0.016, 0.05);
        last = time;
        const palette = palettes[paletteRef.current] || palettes.signal;

        const base = context.createLinearGradient(0, 0, width, height);
        base.addColorStop(0, "#05070b");
        base.addColorStop(0.48, palette.ink);
        base.addColorStop(1, "#030407");
        context.fillStyle = base;
        context.fillRect(0, 0, width, height);

        context.save();
        context.globalAlpha = 0.25;
        context.strokeStyle = "rgba(255,255,255,0.08)";
        context.lineWidth = 1;
        const grid = 52;
        const drift = (time * 0.012) % grid;
        for (let x = -grid; x < width + grid; x += grid) {
            context.beginPath();
            context.moveTo(x + drift, 0);
            context.lineTo(x - height * 0.18 + drift, height);
            context.stroke();
        }
        for (let y = -grid; y < height + grid; y += grid) {
            context.beginPath();
            context.moveTo(0, y + drift);
            context.lineTo(width, y - width * 0.05 + drift);
            context.stroke();
        }
        context.restore();

        nodes.forEach((node, index) => {
            node.x += node.vx * dt;
            node.y += node.vy * dt;
            if (node.x < 0 || node.x > 1) node.vx *= -1;
            if (node.y < 0 || node.y > 1) node.vy *= -1;

            const x = node.x * width;
            const y = node.y * height;
            context.beginPath();
            context.fillStyle = index % 3 === 0 ? palette.line : "rgba(255,255,255,0.22)";
            context.arc(x, y, node.radius, 0, Math.PI * 2);
            context.fill();

            for (let j = index + 1; j < nodes.length; j += 1) {
                const other = nodes[j];
                const ox = other.x * width;
                const oy = other.y * height;
                const dx = x - ox;
                const dy = y - oy;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 128) {
                    context.beginPath();
                    context.strokeStyle = `rgba(255,255,255,${0.08 * (1 - distance / 128)})`;
                    context.moveTo(x, y);
                    context.lineTo(ox, oy);
                    context.stroke();
                }
            }
        });

        if (pulseRef.current > 0.01) {
            context.save();
            context.globalAlpha = pulseRef.current;
            context.strokeStyle = palette.accent;
            context.lineWidth = 1.4;
            const radius = 180 + (1 - pulseRef.current) * 440;
            context.beginPath();
            context.arc(width * 0.72, height * 0.52, radius, 0, Math.PI * 2);
            context.stroke();
            context.restore();
            pulseRef.current *= 0.9;
        }

        frameId = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    frameId = requestAnimationFrame(render);

    return () => {
        cancelAnimationFrame(frameId);
        window.removeEventListener("resize", resize);
    };
}

export default function LoginDesktop() {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const paletteRef = useRef("signal");
    const pulseRef = useRef(0);

    const [palette, setPalette] = useState("signal");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("Gateway ready");

    useEffect(() => {
        if (!canvasRef.current) return undefined;
        return drawLoginField(canvasRef.current, paletteRef, pulseRef);
    }, []);

    useEffect(() => {
        paletteRef.current = palette;
        pulseRef.current = 1;
    }, [palette]);

    const passwordStrength = useMemo(() => {
        const lengthScore = Math.min(password.length / 12, 1);
        const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((rule) => rule.test(password)).length / 4;
        return Math.round((lengthScore * 0.58 + variety * 0.42) * 100);
    }, [password]);

    const activePalette = palettes[palette];

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isSubmitting) return;

        setError("");
        setStatus("Verifying identity");
        setIsSubmitting(true);
        pulseRef.current = 1;

        try {
            const response = await API.post("/login", {
                email: email.trim(),
                password,
            });

            const token = response.data?.access_token || response.data?.token;
            if (!token) {
                throw new Error("The server did not return an access token.");
            }

            sessionStorage.setItem("token", token);
            sessionStorage.setItem(
                "username",
                response.data?.user?.username || response.data?.username || email.trim().split("@")[0] || "Member"
            );
            window.dispatchEvent(new Event("sessionStorageUpdate"));

            setStatus("Access granted");
            setTimeout(() => navigate("/home", { replace: true }), 520);
        } catch (requestError) {
            const detail = requestError.response?.data?.detail || requestError.message || "Authentication failed.";
            setStatus("Access denied");
            setError(detail);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="relative min-h-dvh overflow-hidden bg-[#05070b] text-white">
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.68),rgba(0,0,0,0.22)_44%,rgba(0,0,0,0.55))]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),transparent_32%,rgba(0,0,0,0.42))]" />

            <section className="relative z-10 mx-auto grid min-h-dvh w-[min(1180px,calc(100%-48px))] grid-cols-[minmax(320px,1fr)_minmax(390px,500px)] items-center gap-16 py-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="flex min-h-[680px] flex-col justify-between"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/15 bg-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl">
                        <Waves className="h-6 w-6" style={{ color: activePalette.accent }} />
                    </div>

                    <div className="max-w-2xl">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.07] px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                            <Radio className="h-4 w-4" style={{ color: activePalette.accent }} />
                            Chat Tornado command surface
                        </div>
                        <h1 className="text-[clamp(52px,7vw,96px)] font-black leading-[0.92] tracking-tight">
                            Messaging with a calmer kind of power.
                        </h1>
                        <p className="mt-7 max-w-xl text-base leading-8 text-slate-300/78">
                            A private, cinematic workspace for real-time conversations, team signals, and focused message flow.
                        </p>

                        <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
                            {[
                                ["Live", "WebSocket session"],
                                ["JWT", "Protected routes"],
                                ["Fast", "Vite interface"],
                            ].map(([value, label]) => (
                                <div key={value} className="rounded-lg border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl">
                                    <p className="text-2xl font-black">{value}</p>
                                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-white/42">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                <motion.form
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0, x: 26 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
                    className="relative overflow-hidden rounded-lg border border-white/15 bg-[#080b10]/78 shadow-[0_34px_120px_rgba(0,0,0,0.62)] backdrop-blur-2xl"
                    style={{ "--accent": activePalette.accent }}
                >
                    <div className="h-1 bg-[linear-gradient(90deg,var(--accent),#f472b6,#86efac)]" />
                    <div className="p-8">
                        <div className="flex items-start justify-between gap-5">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/42">Secure entry</p>
                                <h2 className="mt-3 text-4xl font-black tracking-tight">Welcome back.</h2>
                            </div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/12 bg-white/[0.06]">
                                <ShieldCheck className="h-5 w-5" style={{ color: activePalette.accent }} />
                            </div>
                        </div>

                        <p className="mt-4 text-sm leading-6 text-white/55">
                            Sign in with the same backend authentication used by the rest of the app.
                        </p>

                        <div className="mt-8 space-y-4">
                            <label className="group grid min-h-[60px] grid-cols-[20px_1fr] items-center gap-3 rounded-lg border border-white/12 bg-black/24 px-4 transition focus-within:border-white/28 focus-within:bg-black/34">
                                <Mail className="h-5 w-5 text-white/38 transition group-focus-within:text-[var(--accent)]" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="Email address"
                                    autoComplete="email"
                                    required
                                    className="min-w-0 bg-transparent text-[15px] text-white outline-none placeholder:text-white/30"
                                />
                            </label>

                            <label className="group grid min-h-[60px] grid-cols-[20px_1fr_34px] items-center gap-3 rounded-lg border border-white/12 bg-black/24 px-4 transition focus-within:border-white/28 focus-within:bg-black/34">
                                <Lock className="h-5 w-5 text-white/38 transition group-focus-within:text-[var(--accent)]" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Password"
                                    autoComplete="current-password"
                                    required
                                    className="min-w-0 bg-transparent text-[15px] text-white outline-none placeholder:text-white/30"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((value) => !value)}
                                    className="grid h-9 w-9 place-items-center rounded-lg text-white/42 transition hover:bg-white/8 hover:text-white"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </label>
                        </div>

                        <div className="mt-4 h-1 overflow-hidden rounded-lg bg-white/10" aria-hidden="true">
                            <div
                                className="h-full rounded-lg bg-[linear-gradient(90deg,#fb7185,#f8c471,#86efac)] transition-all duration-300"
                                style={{ width: `${passwordStrength}%` }}
                            />
                        </div>

                        {error && (
                            <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                                role="alert"
                            >
                                {error}
                            </motion.p>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="mt-7 flex min-h-[58px] w-full items-center justify-center gap-3 rounded-lg bg-white px-5 text-sm font-black text-[#07131d] shadow-[0_20px_46px_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_rgba(255,255,255,0.17)] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
                        >
                            {isSubmitting ? "Verifying..." : "Open dashboard"}
                            <ArrowRight className="h-4 w-4" />
                        </button>

                        <div className="mt-7 grid grid-cols-3 gap-2" aria-label="Visual profile">
                            {Object.entries(palettes).map(([key, item]) => (
                                <button
                                    key={key}
                                    type="button"
                                    aria-pressed={palette === key}
                                    onClick={() => setPalette(key)}
                                    className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-3 text-xs font-bold text-white/58 transition hover:border-white/18 hover:text-white aria-pressed:border-white/30 aria-pressed:bg-white/12"
                                >
                                    {item.name}
                                </button>
                            ))}
                        </div>

                        <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-white/45">
                            <span className="inline-flex items-center gap-2">
                                <span className="h-2 w-2 rounded-sm" style={{ background: activePalette.accent }} />
                                {status}
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5" />
                                Premium shell
                            </span>
                        </div>
                    </div>
                </motion.form>
            </section>
        </main>
    );
}

/*
===========================================
🕵️ ChatTornado Hidden Behaviors / Easter Eggs
===========================================

1. Boot the application.
   → A cinematic boot sequence with a typewriter terminal animation is displayed.

2. Change the active neural palette.
   → The entire interface recolors with a holographic pulse animation.

3. Move the mouse around the screen.
   → Particles are repelled by the cursor, creating a living holographic field.

4. Observe the background.
   → Floating hexagons, triangles, and holographic rings continuously drift and rotate.

5. Watch the particle network.
   → Nearby particles automatically connect into a dynamic neural network.

6. Focus an input field.
   → The field gains a holographic glow matching the selected palette.

7. Type an email address.
   → A ScanLine verification icon appears beside the email field.

8. Type a password.
   → The encryption strength meter updates live from
      WEAK → MODERATE → STRONG → UNBREAKABLE.

9. Toggle password visibility.
   → The password icon switches between Eye and EyeOff.

10. Change themes repeatedly.
    → Every palette change emits an expanding holographic pulse.

11. Submit the login form.
    → Authentication mode activates with animated scanning effects.

12. During authentication.
    → The login button displays a moving scan beam while the Orbit icon continuously rotates.

13. Successful authentication.
    → Status changes to ACCESS_GRANTED and redirects to the dashboard.

14. Failed authentication.
    → Status changes to ACCESS_DENIED and the server error is displayed.

15. Observe the interface.
    → Animated scan lines, data streams, shimmer effects, breathing glows, floating icons,
      holographic borders, and neural particles continuously animate in the background.

===========================================
No hidden usernames.
No hidden passwords.
No Konami code.
No secret developer commands.
No unlockable themes.
=========================================== */

{ console.log("LoginDesktop4 loaded!") }


import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    Zap,
    Hexagon,
    Cpu,
    Fingerprint,
    ScanLine,
    Orbit,
    ChevronRight,
    Terminal,
    Activity,
    Wifi,
    Shield,
} from "lucide-react";

import API from "../Services/API";

/* ═══════════════════════════════════════════════════════════════
   SCI-FI THEME SYSTEM — Four holographic palettes
   ═══════════════════════════════════════════════════════════════ */
const palettes = {
    nebula: {
        name: "NEBULA",
        accent: "#00f5d4",
        accent2: "#7b2cbf",
        accent3: "#ff006e",
        ink: "#050510",
        surface: "#0a0a1a",
        line: "rgba(0, 245, 212, 0.35)",
        glow: "rgba(0, 245, 212, 0.15)",
        grid: "rgba(0, 245, 212, 0.08)",
    },
    solar: {
        name: "SOLAR",
        accent: "#ff9e00",
        accent2: "#ff5400",
        accent3: "#ff006e",
        ink: "#0f0500",
        surface: "#1a0a00",
        line: "rgba(255, 158, 0, 0.35)",
        glow: "rgba(255, 158, 0, 0.15)",
        grid: "rgba(255, 158, 0, 0.08)",
    },
    void: {
        name: "VOID",
        accent: "#c77dff",
        accent2: "#7b2cbf",
        accent3: "#e0aaff",
        ink: "#0a0010",
        surface: "#12001a",
        line: "rgba(199, 125, 255, 0.35)",
        glow: "rgba(199, 125, 255, 0.15)",
        grid: "rgba(199, 125, 255, 0.08)",
    },
    aurora: {
        name: "AURORA",
        accent: "#38b000",
        accent2: "#70e000",
        accent3: "#ccff33",
        ink: "#001005",
        surface: "#001a0a",
        line: "rgba(56, 176, 0, 0.35)",
        glow: "rgba(56, 176, 0, 0.15)",
        grid: "rgba(56, 176, 0, 0.08)",
    },
};

/* ═══════════════════════════════════════════════════════════════
   ADVANCED CANVAS PARTICLE SYSTEM — Holographic field
   ═══════════════════════════════════════════════════════════════ */
function drawSciFiField(canvas, paletteRef, pulseRef, mouseRef) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => { };

    let frameId = 0;
    let last = 0;
    let time = 0;

    // Holographic particles
    const particles = Array.from({ length: 120 }, (_, i) => ({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.012,
        vy: (Math.random() - 0.5) * 0.012,
        radius: 0.5 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.7,
        layer: Math.floor(Math.random() * 3),
    }));

    // Constellation lines between nearby particles
    const connections = [];

    // Floating geometric shapes
    const shapes = Array.from({ length: 8 }, (_, i) => ({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.008,
        vy: (Math.random() - 0.5) * 0.008,
        size: 30 + Math.random() * 60,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.005,
        type: ["hex", "tri", "ring"][Math.floor(Math.random() * 3)],
        opacity: 0.03 + Math.random() * 0.06,
    }));

    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawHexagon = (x, y, size, rotation, color, opacity) => {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = rotation + (i * Math.PI) / 3;
            const px = x + Math.cos(angle) * size;
            const py = y + Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    };

    const drawTriangle = (x, y, size, rotation, color, opacity) => {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const angle = rotation + (i * 2 * Math.PI) / 3;
            const px = x + Math.cos(angle) * size;
            const py = y + Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    };

    const drawRing = (x, y, size, rotation, color, opacity) => {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.arc(x, y, size, rotation, rotation + Math.PI * 1.5);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    };

    const render = (timestamp) => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const dt = Math.min((timestamp - last) / 1000 || 0.016, 0.05);
        last = timestamp;
        time += dt;
        const palette = palettes[paletteRef.current] || palettes.nebula;
        const mouse = mouseRef.current;

        // Deep space background with subtle gradient
        const bg = ctx.createRadialGradient(
            width * 0.3, height * 0.3, 0,
            width * 0.5, height * 0.5, Math.max(width, height) * 0.8
        );
        bg.addColorStop(0, palette.ink);
        bg.addColorStop(0.4, "#020208");
        bg.addColorStop(1, "#000000");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Subtle noise texture overlay
        ctx.fillStyle = "rgba(255,255,255,0.008)";
        for (let i = 0; i < 300; i++) {
            const nx = Math.random() * width;
            const ny = Math.random() * height;
            ctx.fillRect(nx, ny, 1, 1);
        }

        // Holographic grid — perspective lines
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = palette.grid;
        ctx.lineWidth = 0.5;
        const gridSize = 60;
        const perspective = 0.3;
        for (let x = 0; x < width + gridSize; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + (x - width / 2) * perspective, height);
            ctx.stroke();
        }
        for (let y = 0; y < height + gridSize; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y + (y - height / 2) * perspective * 0.3);
            ctx.stroke();
        }
        ctx.restore();

        // Floating geometric shapes
        shapes.forEach((shape) => {
            shape.x += shape.vx * dt;
            shape.y += shape.vy * dt;
            shape.rotation += shape.rotSpeed;
            if (shape.x < -0.1 || shape.x > 1.1) shape.vx *= -1;
            if (shape.y < -0.1 || shape.y > 1.1) shape.vy *= -1;

            const sx = shape.x * width;
            const sy = shape.y * height;
            const breathe = Math.sin(time * shape.rotSpeed * 200 + shape.phase) * 0.2 + 1;

            if (shape.type === "hex") {
                drawHexagon(sx, sy, shape.size * breathe, shape.rotation, palette.accent, shape.opacity);
            } else if (shape.type === "tri") {
                drawTriangle(sx, sy, shape.size * breathe, shape.rotation, palette.accent2, shape.opacity);
            } else {
                drawRing(sx, sy, shape.size * breathe, shape.rotation, palette.accent3, shape.opacity);
            }
        });

        // Particles with mouse interaction
        particles.forEach((p, i) => {
            // Mouse repulsion
            const px = p.x * width;
            const py = p.y * height;
            const mdx = px - mouse.x;
            const mdy = py - mouse.y;
            const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mDist < 150 && mDist > 0) {
                const force = (150 - mDist) / 150 * 0.0005;
                p.vx += (mdx / mDist) * force;
                p.vy += (mdy / mDist) * force;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Damping
            p.vx *= 0.999;
            p.vy *= 0.999;

            // Boundary bounce with soft edges
            if (p.x < 0.02) { p.x = 0.02; p.vx *= -0.8; }
            if (p.x > 0.98) { p.x = 0.98; p.vx *= -0.8; }
            if (p.y < 0.02) { p.y = 0.02; p.vy *= -0.8; }
            if (p.y > 0.98) { p.y = 0.98; p.vy *= -0.8; }

            const x = p.x * width;
            const y = p.y * height;
            const breathe = Math.sin(time * p.speed + p.phase) * 0.4 + 0.6;
            const radius = p.radius * breathe;

            // Glow effect for some particles
            if (i % 5 === 0) {
                ctx.save();
                ctx.globalAlpha = 0.15 * breathe;
                ctx.fillStyle = palette.accent;
                ctx.beginPath();
                ctx.arc(x, y, radius * 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            ctx.save();
            ctx.globalAlpha = (0.4 + 0.6 * breathe) * (p.layer === 0 ? 0.5 : p.layer === 1 ? 0.8 : 1);
            ctx.fillStyle = i % 4 === 0 ? palette.accent : i % 4 === 1 ? palette.accent2 : "rgba(255,255,255,0.5)";
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Neural network connections
        ctx.save();
        for (let i = 0; i < particles.length; i++) {
            const p1 = particles[i];
            const x1 = p1.x * width;
            const y1 = p1.y * height;
            let connections = 0;
            for (let j = i + 1; j < particles.length && connections < 3; j++) {
                const p2 = particles[j];
                const x2 = p2.x * width;
                const y2 = p2.y * height;
                const dx = x1 - x2;
                const dy = y1 - y2;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 140) {
                    connections++;
                    const alpha = 0.12 * (1 - dist / 140);
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();

        // Holographic pulse rings
        if (pulseRef.current > 0.005) {
            const pulse = pulseRef.current;
            ctx.save();
            ctx.globalAlpha = pulse * 0.3;
            ctx.strokeStyle = palette.accent;
            ctx.lineWidth = 1.5;
            const radius = 100 + (1 - pulse) * 300;
            ctx.beginPath();
            ctx.arc(width * 0.72, height * 0.5, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalAlpha = pulse * 0.15;
            ctx.strokeStyle = palette.accent2;
            ctx.beginPath();
            ctx.arc(width * 0.72, height * 0.5, radius * 0.7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            pulseRef.current *= 0.94;
        }

        // Scan line effect
        ctx.save();
        ctx.globalAlpha = 0.03;
        ctx.fillStyle = palette.accent;
        const scanY = ((time * 80) % (height + 200)) - 100;
        ctx.fillRect(0, scanY, width, 2);
        ctx.restore();

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

/* ═══════════════════════════════════════════════════════════════
   TYPOWRITER EFFECT HOOK
   ═══════════════════════════════════════════════════════════════ */
function useTypewriter(text, speed = 40, trigger = true) {
    const [display, setDisplay] = useState("");
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!trigger) { setDisplay(""); setDone(false); return; }
        setDisplay("");
        setDone(false);
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplay(text.slice(0, i + 1));
                i++;
            } else {
                setDone(true);
                clearInterval(timer);
            }
        }, speed);
        return () => clearInterval(timer);
    }, [text, speed, trigger]);

    return { display, done };
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT — Sci-Fi Login Desktop
   ═══════════════════════════════════════════════════════════════ */
export default function LoginDesktop() {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const paletteRef = useRef("nebula");
    const pulseRef = useRef(0);
    const mouseRef = useRef({ x: -1000, y: -1000 });

    const [palette, setPalette] = useState("nebula");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("SYSTEM_READY");
    const [focusField, setFocusField] = useState(null);
    const [bootSequence, setBootSequence] = useState(true);
    const [scanActive, setScanActive] = useState(false);

    const activePalette = palettes[palette];

    // Boot sequence
    useEffect(() => {
        const timer = setTimeout(() => setBootSequence(false), 2200);
        return () => clearTimeout(timer);
    }, []);

    // Canvas particle system
    useEffect(() => {
        if (!canvasRef.current) return undefined;
        return drawSciFiField(canvasRef.current, paletteRef, pulseRef, mouseRef);
    }, []);

    // Mouse tracking
    useEffect(() => {
        const handleMouse = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener("mousemove", handleMouse);
        return () => window.removeEventListener("mousemove", handleMouse);
    }, []);

    // Palette change triggers pulse
    useEffect(() => {
        paletteRef.current = palette;
        pulseRef.current = 1;
        setStatus("THEME_SYNCED");
        const t = setTimeout(() => setStatus("SYSTEM_READY"), 1200);
        return () => clearTimeout(t);
    }, [palette]);

    const bootText = useTypewriter(
        "> INITIALIZING NEURAL LINK...\n> AUTHENTICATING BIOMETRICS...\n> ESTABLISHING SECURE TUNNEL...\n> ACCESS GRANTED",
        35,
        bootSequence
    );

    const passwordStrength = useMemo(() => {
        const lengthScore = Math.min(password.length / 14, 1);
        const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((r) => r.test(password)).length / 4;
        const entropy = Math.round((lengthScore * 0.55 + variety * 0.45) * 100);
        return entropy;
    }, [password]);

    const getStrengthLabel = (s) => {
        if (s < 30) return "WEAK";
        if (s < 60) return "MODERATE";
        if (s < 85) return "STRONG";
        return "UNBREAKABLE";
    };

    const getStrengthColor = (s) => {
        if (s < 30) return "#ff4444";
        if (s < 60) return "#ffaa00";
        if (s < 85) return "#00ccff";
        return activePalette.accent;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isSubmitting) return;

        setError("");
        setStatus("VERIFYING_IDENTITY");
        setIsSubmitting(true);
        setScanActive(true);
        pulseRef.current = 1;

        try {
            const response = await API.post("/login", {
                email: email.trim(),
                password,
            });

            const token = response.data?.access_token || response.data?.token;
            if (!token) {
                throw new Error("NO_TOKEN_RECEIVED");
            }

            sessionStorage.setItem("token", token);
            sessionStorage.setItem(
                "username",
                response.data?.user?.username || response.data?.username || email.trim().split("@")[0] || "OPERATIVE"
            );
            window.dispatchEvent(new Event("sessionStorageUpdate"));

            setStatus("ACCESS_GRANTED");
            setScanActive(false);
            setTimeout(() => navigate("/home", { replace: true }), 800);
        } catch (requestError) {
            const detail = requestError.response?.data?.detail || requestError.message || "AUTHENTICATION_FAILED";
            setStatus("ACCESS_DENIED");
            setError(detail);
            setScanActive(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Decorative data stream lines
    const DataStream = () => (
        <div className="absolute right-0 top-0 h-full w-px overflow-hidden opacity-20">
            <motion.div
                animate={{ y: ["-100%", "100%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="h-20 w-full"
                style={{ background: `linear-gradient(180deg, transparent, ${activePalette.accent}, transparent)` }}
            />
        </div>
    );

    return (
        <main className="relative min-h-dvh overflow-hidden bg-black text-white selection:bg-white/20">
            {/* ── Background Canvas ── */}
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

            {/* ── Cinematic Overlays ── */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,transparent_0%,rgba(0,0,0,0.6)_70%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.4)_0%,transparent_30%,rgba(0,0,0,0.5)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.75)_0%,transparent_35%,rgba(0,0,0,0.4)_100%)]" />

            {/* ── Scan Line Overlay ── */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.03]">
                <div className="h-full w-full" style={{
                    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)"
                }} />
            </div>

            {/* ── Boot Sequence Overlay ── */}
            <AnimatePresence>
                {bootSequence && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black"
                    >
                        <div className="max-w-lg px-8">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mb-6 flex items-center gap-3"
                            >
                                <Hexagon className="h-8 w-8" style={{ color: activePalette.accent }} />
                                <span className="text-sm font-mono tracking-[0.3em]" style={{ color: activePalette.accent }}>
                                    ChatTornado_OS v4.2
                                </span>
                            </motion.div>
                            <pre className="font-mono text-sm leading-7" style={{ color: activePalette.accent }}>
                                {bootText.display}
                                {!bootText.done && <span className="animate-pulse">_</span>}
                            </pre>
                            <div className="mt-6 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: activePalette.accent }}
                                    initial={{ width: "0%" }}
                                    animate={{ width: bootText.done ? "100%" : "75%" }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Main Content ── */}
            <section className="relative z-10 mx-auto grid min-h-dvh w-[min(1280px,calc(100%-32px))] grid-cols-1 items-center gap-8 py-8 lg:grid-cols-[1fr_minmax(400px,480px)] lg:gap-16 lg:py-12">

                {/* ═══════ LEFT PANEL — Hero ═══════ */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                    className="flex flex-col justify-center lg:min-h-[700px]"
                >
                    {/* Logo / Brand */}
                    <div className="mb-10 flex items-center gap-4">
                        <div className="relative flex h-14 w-14 items-center justify-center">
                            <div className="absolute inset-0 rounded-xl" style={{
                                background: `linear-gradient(135deg, ${activePalette.accent}20, ${activePalette.accent2}20)`,
                                border: `1px solid ${activePalette.line}`,
                            }} />
                            <div className="absolute inset-0 rounded-xl opacity-50" style={{
                                boxShadow: `0 0 30px ${activePalette.glow}`,
                            }} />
                            <Orbit className="relative h-7 w-7" style={{ color: activePalette.accent }} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight">ChatTornado</h3>
                            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40">Secure Communications</p>
                        </div>
                    </div>

                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mb-8 inline-flex w-fit items-center gap-2.5 rounded-lg border px-4 py-2.5"
                        style={{
                            borderColor: activePalette.line,
                            background: `linear-gradient(135deg, ${activePalette.accent}08, transparent)`,
                        }}
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: activePalette.accent }} />
                            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: activePalette.accent }} />
                        </span>
                        <Radio className="h-3.5 w-3.5" style={{ color: activePalette.accent }} />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-white/60">
                            Neural Link Active
                        </span>
                    </motion.div>

                    {/* Headline */}
                    <h1 className="text-[clamp(40px,6vw,84px)] font-black leading-[0.92] tracking-tight">
                        <span className="block">Messaging</span>
                        <span className="block bg-clip-text text-transparent" style={{
                            backgroundImage: `linear-gradient(135deg, ${activePalette.accent}, ${activePalette.accent2}, ${activePalette.accent3})`,
                        }}>
                            Reimagined.
                        </span>
                    </h1>

                    <p className="mt-6 max-w-md text-[15px] leading-7 text-white/50">
                        A quantum-encrypted workspace for real-time signal transmission.
                        Zero-latency channels. Military-grade security. Pure elegance.
                    </p>

                    {/* Feature Grid — Bento Style */}
                    <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-3">
                        {[
                            { icon: Zap, label: "QUANTUM", sub: "WebSocket" },
                            { icon: Shield, label: "AES-256", sub: "Encrypted" },
                            { icon: Cpu, label: "LIGHTNING", sub: "Vite Engine" },
                            { icon: Fingerprint, label: "BIOMETRIC", sub: "Auth" },
                            { icon: Activity, label: "REALTIME", sub: "Sync" },
                            { icon: Wifi, label: "MESH", sub: "Network" },
                        ].map(({ icon: Icon, label, sub }, i) => (
                            <motion.div
                                key={label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 + i * 0.08 }}
                                className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
                            >
                                <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20" style={{ background: activePalette.accent }} />
                                <Icon className="mb-3 h-5 w-5" style={{ color: activePalette.accent }} />
                                <p className="text-sm font-bold tracking-tight">{label}</p>
                                <p className="mt-0.5 text-[10px] font-mono uppercase tracking-wider text-white/30">{sub}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* ═══════ RIGHT PANEL — Login Form ═══════ */}
                <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                    className="relative"
                >
                    {/* Holographic Card */}
                    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#06060f]/80 shadow-2xl backdrop-blur-2xl"
                        style={{
                            boxShadow: `0 0 80px ${activePalette.glow}, 0 25px 50px -12px rgba(0,0,0,0.8)`,
                        }}
                    >
                        {/* Top accent bar */}
                        <div className="relative h-1 overflow-hidden">
                            <div className="absolute inset-0" style={{
                                background: `linear-gradient(90deg, ${activePalette.accent}, ${activePalette.accent2}, ${activePalette.accent3}, ${activePalette.accent})`,
                                backgroundSize: "200% 100%",
                                animation: "shimmer 3s linear infinite",
                            }} />
                        </div>

                        {/* Corner decorations */}
                        <div className="absolute left-3 top-3 h-6 w-6 border-l border-t" style={{ borderColor: activePalette.line }} />
                        <div className="absolute right-3 top-3 h-6 w-6 border-r border-t" style={{ borderColor: activePalette.line }} />
                        <div className="absolute bottom-3 left-3 h-6 w-6 border-b border-l" style={{ borderColor: activePalette.line }} />
                        <div className="absolute bottom-3 right-3 h-6 w-6 border-b border-r" style={{ borderColor: activePalette.line }} />

                        <DataStream />

                        <form onSubmit={handleSubmit} className="relative p-8 lg:p-10">
                            {/* Header */}
                            <div className="mb-8 flex items-start justify-between">
                                <div>
                                    <div className="mb-2 flex items-center gap-2">
                                        <Terminal className="h-3.5 w-3.5" style={{ color: activePalette.accent }} />
                                        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40">
                                            Secure Entry
                                        </span>
                                    </div>
                                    <h2 className="text-3xl font-black tracking-tight">Authenticate</h2>
                                </div>
                                <div className="relative flex h-12 w-12 items-center justify-center">
                                    <div className="absolute inset-0 rounded-xl" style={{
                                        border: `1px solid ${activePalette.line}`,
                                        background: `${activePalette.accent}08`,
                                    }} />
                                    <ShieldCheck className="relative h-5 w-5" style={{ color: activePalette.accent }} />
                                </div>
                            </div>

                            <p className="mb-8 text-[13px] leading-6 text-white/40">
                                Enter your credentials to establish a secure neural link with the ChatTornado backbone.
                            </p>

                            {/* Email Field */}
                            <div className="mb-4">
                                <label className="mb-1.5 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
                                    <Mail className="h-3 w-3" />
                                    Identity / Email
                                </label>
                                <div
                                    className="relative overflow-hidden rounded-xl border bg-white/[0.03] transition-all duration-300"
                                    style={{
                                        borderColor: focusField === "email" ? activePalette.accent : "rgba(255,255,255,0.08)",
                                        boxShadow: focusField === "email" ? `0 0 20px ${activePalette.glow}` : "none",
                                    }}
                                >
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onFocus={() => setFocusField("email")}
                                        onBlur={() => setFocusField(null)}
                                        placeholder="operative@chattornado.net"
                                        autoComplete="email"
                                        required
                                        className="w-full bg-transparent px-4 py-4 text-[14px] text-white outline-none placeholder:text-white/20"
                                    />
                                    <AnimatePresence>
                                        {email && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                exit={{ scale: 0 }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                            >
                                                <ScanLine className="h-4 w-4" style={{ color: activePalette.accent }} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="mb-4">
                                <label className="mb-1.5 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
                                    <Lock className="h-3 w-3" />
                                    Access Key / Password
                                </label>
                                <div
                                    className="relative overflow-hidden rounded-xl border bg-white/[0.03] transition-all duration-300"
                                    style={{
                                        borderColor: focusField === "password" ? activePalette.accent : "rgba(255,255,255,0.08)",
                                        boxShadow: focusField === "password" ? `0 0 20px ${activePalette.glow}` : "none",
                                    }}
                                >
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setFocusField("password")}
                                        onBlur={() => setFocusField(null)}
                                        placeholder="••••••••••••"
                                        autoComplete="current-password"
                                        required
                                        className="w-full bg-transparent px-4 py-4 pr-12 text-[14px] text-white outline-none placeholder:text-white/20"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/30 transition hover:bg-white/5 hover:text-white/60"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Password Strength */}
                            <div className="mb-6">
                                <div className="mb-1.5 flex items-center justify-between">
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/30">
                                        Encryption Strength
                                    </span>
                                    <span className="text-[10px] font-mono font-bold" style={{ color: getStrengthColor(passwordStrength) }}>
                                        {getStrengthLabel(passwordStrength)}
                                    </span>
                                </div>
                                <div className="h-1 overflow-hidden rounded-full bg-white/5">
                                    <motion.div
                                        className="h-full rounded-full"
                                        animate={{ width: `${passwordStrength}%` }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                        style={{
                                            background: `linear-gradient(90deg, ${getStrengthColor(passwordStrength)}, ${activePalette.accent})`,
                                            boxShadow: `0 0 10px ${getStrengthColor(passwordStrength)}40`,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Error */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mb-5 overflow-hidden"
                                    >
                                        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3">
                                            <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                            <p className="text-xs font-mono text-red-300/80">{error}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="group relative flex min-h-[56px] w-full items-center justify-center gap-3 overflow-hidden rounded-xl font-bold text-sm transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                                style={{
                                    background: isSubmitting
                                        ? "rgba(255,255,255,0.05)"
                                        : `linear-gradient(135deg, ${activePalette.accent}, ${activePalette.accent2})`,
                                    color: isSubmitting ? "rgba(255,255,255,0.5)" : "#000",
                                    boxShadow: isSubmitting ? "none" : `0 0 30px ${activePalette.glow}`,
                                }}
                            >
                                {/* Scan overlay on button */}
                                {scanActive && (
                                    <motion.div
                                        className="absolute inset-0"
                                        animate={{ x: ["-100%", "200%"] }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                        style={{
                                            background: `linear-gradient(90deg, transparent, ${activePalette.accent}30, transparent)`,
                                            width: "50%",
                                        }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    {isSubmitting ? (
                                        <>
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            >
                                                <Orbit className="h-4 w-4" />
                                            </motion.div>
                                            AUTHENTICATING...
                                        </>
                                    ) : (
                                        <>
                                            INITIATE LINK
                                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </>
                                    )}
                                </span>
                            </button>

                            {/* Theme Selector */}
                            <div className="mt-8">
                                <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
                                    Select Neural Palette
                                </p>
                                <div className="grid grid-cols-4 gap-2">
                                    {Object.entries(palettes).map(([key, p]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setPalette(key)}
                                            className="group relative overflow-hidden rounded-lg border p-3 transition-all duration-300"
                                            style={{
                                                borderColor: palette === key ? p.accent : "rgba(255,255,255,0.06)",
                                                background: palette === key ? `${p.accent}10` : "rgba(255,255,255,0.02)",
                                            }}
                                        >
                                            {palette === key && (
                                                <motion.div
                                                    layoutId="activeTheme"
                                                    className="absolute inset-0 rounded-lg"
                                                    style={{
                                                        border: `1px solid ${p.accent}`,
                                                        boxShadow: `0 0 20px ${p.glow}`,
                                                    }}
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                            <div className="relative z-10 flex flex-col items-center gap-2">
                                                <div className="h-4 w-4 rounded-full" style={{
                                                    background: `linear-gradient(135deg, ${p.accent}, ${p.accent2})`,
                                                    boxShadow: palette === key ? `0 0 12px ${p.accent}60` : "none",
                                                }} />
                                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider" style={{
                                                    color: palette === key ? p.accent : "rgba(255,255,255,0.4)",
                                                }}>
                                                    {p.name}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Footer Status */}
                            <div className="mt-8 flex items-center justify-between border-t border-white/[0.06] pt-5">
                                <div className="flex items-center gap-2.5">
                                    <span className="relative flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{
                                            background: status === "ACCESS_DENIED" ? "#ff4444" : status === "ACCESS_GRANTED" ? activePalette.accent : activePalette.accent,
                                        }} />
                                        <span className="relative inline-flex h-2 w-2 rounded-full" style={{
                                            background: status === "ACCESS_DENIED" ? "#ff4444" : status === "ACCESS_GRANTED" ? activePalette.accent : activePalette.accent,
                                        }} />
                                    </span>
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                                        {status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-white/25">
                                    <Sparkles className="h-3 w-3" />
                                    <span className="text-[10px] font-mono uppercase tracking-wider">Quantum Shell</span>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Floating decorative elements around card */}
                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -right-4 -top-4 h-20 w-20 opacity-20"
                    >
                        <Hexagon className="h-full w-full" style={{ color: activePalette.accent }} strokeWidth={0.5} />
                    </motion.div>
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="absolute -bottom-6 -left-6 h-16 w-16 opacity-15"
                    >
                        <Cpu className="h-full w-full" style={{ color: activePalette.accent2 }} strokeWidth={0.5} />
                    </motion.div>
                </motion.div>
            </section>

            {/* ── Global Styles for Animations ── */}
            <style>{`
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </main>
    );
}

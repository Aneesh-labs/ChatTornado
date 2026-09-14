/*
===========================================
🕵️ ChatTornado Hidden Behaviors / Easter Eggs
===========================================

1. Hover the login card.
   → The card tilts in 3D and follows the cursor.

2. Move the cursor around the login card.
   → The ambient glow follows the mouse position.

3. Start typing in the email or password field.
   → Animated ripple waves are emitted into the particle background.

4. Change the interface theme.
   → A locator pulse expands from the login card while every color smoothly transitions.

5. Submit the login form.
   → The particle field converges toward the login card during authentication.

6. Successful authentication.
   → The interface shows a success state, emits a pulse, then automatically redirects to the dashboard.

7. Failed authentication.
   → The card performs a premium shake animation and displays the returned error.

8. Hover the login button.
   → The button slightly lifts with a premium shadow effect.

9. Click the login button.
   → A ripple animation originates from the click position.

10. Toggle password visibility.
    → The Eye / EyeOff icon smoothly morphs instead of instantly changing.

11. Password strength appears only after typing.
    → The strength meter animates into view and updates live.

12. Status messages animate between every authentication stage.
    → Gateway Ready → Encryption Active → Verifying Identity → Access Granted / Access Denied.

===========================================
No hidden passwords.
No secret usernames.
No Konami code.
No unlockable themes.
No hidden developer commands.
===========================================
*/
{ console.log("LoginDesktop2 loaded!") }

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    ArrowRight,
    Check,
    Eye,
    EyeOff,
    Loader2,
    Lock,
    Mail,
    Radio,
    ShieldCheck,
    Sparkles,
    Waves,
    UserPlus,
    User,
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

const EASE_PREMIUM = [0.16, 1, 0.3, 1];
const THEME_TRANSITION = "640ms cubic-bezier(0.16, 1, 0.3, 1)";

const PARTICLE_COUNT = 76;
const PARTICLE_VELOCITY = 0.018;
const PARTICLE_RADIUS_MIN = 0.8;
const PARTICLE_RADIUS_RANGE = 1.8;
const CONNECTION_DISTANCE = 128;
const CONNECTION_DISTANCE_SQ = CONNECTION_DISTANCE * CONNECTION_DISTANCE;
const GRID_SIZE = 52;
const GRID_DRIFT_SPEED = 0.012;
const CAMERA_DRIFT_AMPLITUDE = 7;
const CAMERA_DRIFT_SPEED_X = 0.00021;
const CAMERA_DRIFT_SPEED_Y = 0.00017;
const PULSE_BASE_RADIUS = 180;
const PULSE_RADIUS_GROWTH = 440;
const PULSE_DECAY = 0.9;
const CONVERGE_EASE = 0.045;
const RIPPLE_MAX_RADIUS = 130;
const RIPPLE_GROWTH = 190;
const RIPPLE_FADE = 1.6;
const RIPPLE_THROTTLE_MS = 90;

const STAGE = {
    IDLE: "idle",
    COMPRESSING: "compressing",
    ENCRYPTING: "encrypting",
    VERIFYING: "verifying",
    SUCCESS: "success",
    ERROR: "error",
};

const STATUS_COPY = {
    [STAGE.IDLE]: "Gateway ready",
    [STAGE.COMPRESSING]: "Gateway ready",
    [STAGE.ENCRYPTING]: "Encryption active",
    [STAGE.VERIFYING]: "Verifying identity",
    [STAGE.SUCCESS]: "Access granted",
    [STAGE.ERROR]: "Access denied",
};

const TIMING = {
    compress: 160,
    encrypt: 420,
    successHold: 1100,
    errorHold: 1600,
    shake: 0.5,
};

const STRENGTH_LEVELS = [
    { max: 24, label: "Weak", color: "#fb7185" },
    { max: 49, label: "Fair", color: "#f8c471" },
    { max: 74, label: "Good", color: "#7dd3fc" },
    { max: 100, label: "Strong", color: "#86efac" },
];

const SHAKE_KEYFRAMES = [0, -10, 10, -8, 8, -4, 4, 0];

function getStrengthLevel(score) {
    return STRENGTH_LEVELS.find((level) => score <= level.max) ?? STRENGTH_LEVELS[STRENGTH_LEVELS.length - 1];
}

function wait(ms, registry) {
    return new Promise((resolve) => {
        const id = setTimeout(resolve, ms);
        registry.push(id);
    });
}

function normalizedCenter(element) {
    if (!element) return { x: 0.5, y: 0.5 };
    const rect = element.getBoundingClientRect();
    return {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
    };
}

function drawLoginField(canvas, refs) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return () => { };

    const { pulseRef, pulseOriginRef, convergeRef, rippleQueueRef } = refs;

    let frameId = 0;
    let last = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const nodes = Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
        index,
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * PARTICLE_VELOCITY,
        vy: (Math.random() - 0.5) * PARTICLE_VELOCITY,
        radius: PARTICLE_RADIUS_MIN + Math.random() * PARTICLE_RADIUS_RANGE,
    }));

    const ripples = [];

    let cachedGradient = null;
    let cachedInk = "";
    let cachedWidth = 0;
    let cachedHeight = 0;

    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        cachedGradient = null;
    };

    const getBackgroundGradient = (ink) => {
        if (cachedGradient && cachedInk === ink && cachedWidth === width && cachedHeight === height) {
            return cachedGradient;
        }
        const gradient = context.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#05070b");
        gradient.addColorStop(0.48, ink);
        gradient.addColorStop(1, "#030407");
        cachedGradient = gradient;
        cachedInk = ink;
        cachedWidth = width;
        cachedHeight = height;
        return gradient;
    };

    const render = (time) => {
        const dt = Math.min((time - last) / 1000 || 0.016, 0.05);
        last = time;

        const styles = getComputedStyle(canvas);
        const accent = styles.getPropertyValue("--accent").trim() || "#7dd3fc";
        const ink = styles.getPropertyValue("--ink").trim() || "#07131d";
        const line = styles.getPropertyValue("--line").trim() || "rgba(125, 211, 252, 0.42)";

        const cameraX = Math.sin(time * CAMERA_DRIFT_SPEED_X) * CAMERA_DRIFT_AMPLITUDE;
        const cameraY = Math.cos(time * CAMERA_DRIFT_SPEED_Y) * CAMERA_DRIFT_AMPLITUDE * 0.6;
        const margin = CAMERA_DRIFT_AMPLITUDE * 2;

        context.save();
        context.translate(cameraX, cameraY);

        context.fillStyle = getBackgroundGradient(ink);
        context.fillRect(-margin, -margin, width + margin * 2, height + margin * 2);

        context.save();
        context.globalAlpha = 0.09;
        const fogX = width * (0.28 + Math.sin(time * 0.00013) * 0.06);
        const fogY = height * (0.32 + Math.cos(time * 0.00011) * 0.06);
        const fog = context.createRadialGradient(fogX, fogY, 0, fogX, fogY, width * 0.5);
        fog.addColorStop(0, accent);
        fog.addColorStop(1, "rgba(0,0,0,0)");
        context.fillStyle = fog;
        context.fillRect(-margin, -margin, width + margin * 2, height + margin * 2);
        context.restore();

        context.save();
        context.globalAlpha = 0.25;
        context.strokeStyle = "rgba(255,255,255,0.08)";
        context.lineWidth = 1;
        const drift = (time * GRID_DRIFT_SPEED) % GRID_SIZE;
        for (let x = -GRID_SIZE; x < width + GRID_SIZE; x += GRID_SIZE) {
            context.beginPath();
            context.moveTo(x + drift, 0);
            context.lineTo(x - height * 0.18 + drift, height);
            context.stroke();
        }
        for (let y = -GRID_SIZE; y < height + GRID_SIZE; y += GRID_SIZE) {
            context.beginPath();
            context.moveTo(0, y + drift);
            context.lineTo(width, y - width * 0.05 + drift);
            context.stroke();
        }
        context.restore();

        const converge = convergeRef.current;
        nodes.forEach((node, index) => {
            if (converge.active) {
                node.x += (converge.x - node.x) * CONVERGE_EASE * converge.strength;
                node.y += (converge.y - node.y) * CONVERGE_EASE * converge.strength;
            } else {
                node.x += node.vx * dt;
                node.y += node.vy * dt;
                if (node.x < 0 || node.x > 1) node.vx *= -1;
                if (node.y < 0 || node.y > 1) node.vy *= -1;
            }

            const x = node.x * width;
            const y = node.y * height;
            context.beginPath();
            context.fillStyle = index % 3 === 0 ? line : "rgba(255,255,255,0.22)";
            context.arc(x, y, node.radius, 0, Math.PI * 2);
            context.fill();

            for (let j = index + 1; j < nodes.length; j += 1) {
                const other = nodes[j];
                const otherX = other.x * width;
                const otherY = other.y * height;
                const deltaX = x - otherX;
                const deltaY = y - otherY;
                const distanceSq = deltaX * deltaX + deltaY * deltaY;
                if (distanceSq < CONNECTION_DISTANCE_SQ) {
                    const distance = Math.sqrt(distanceSq);
                    context.beginPath();
                    context.strokeStyle = `rgba(255,255,255,${0.08 * (1 - distance / CONNECTION_DISTANCE)})`;
                    context.moveTo(x, y);
                    context.lineTo(otherX, otherY);
                    context.stroke();
                }
            }
        });

        while (rippleQueueRef.current.length) {
            const origin = rippleQueueRef.current.shift();
            ripples.push({ x: origin.x * width, y: origin.y * height, radius: 0, alpha: 0.5 });
        }
        for (let i = ripples.length - 1; i >= 0; i -= 1) {
            const ripple = ripples[i];
            ripple.radius += RIPPLE_GROWTH * dt;
            ripple.alpha -= RIPPLE_FADE * dt;
            if (ripple.alpha <= 0 || ripple.radius > RIPPLE_MAX_RADIUS) {
                ripples.splice(i, 1);
                continue;
            }
            context.save();
            context.globalAlpha = Math.max(ripple.alpha, 0);
            context.strokeStyle = accent;
            context.lineWidth = 1;
            context.beginPath();
            context.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
            context.stroke();
            context.restore();
        }

        if (pulseRef.current > 0.01) {
            context.save();
            context.globalAlpha = pulseRef.current;
            context.strokeStyle = accent;
            context.lineWidth = 1.4;
            const radius = PULSE_BASE_RADIUS + (1 - pulseRef.current) * PULSE_RADIUS_GROWTH;
            context.beginPath();
            context.arc(pulseOriginRef.current.x * width, pulseOriginRef.current.y * height, radius, 0, Math.PI * 2);
            context.stroke();
            context.restore();
            pulseRef.current *= PULSE_DECAY;
        }

        context.restore();
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
    const cardRef = useRef(null);
    const buttonRef = useRef(null);

    const pulseRef = useRef(0);
    const pulseOriginRef = useRef({ x: 0.72, y: 0.52 });
    const convergeRef = useRef({ active: false, strength: 0, x: 0.5, y: 0.5 });
    const rippleQueueRef = useRef([]);
    const lastRippleTimeRef = useRef(0);
    const timersRef = useRef([]);
    const isMountedRef = useRef(true);

    const [mode, setMode] = useState("login");

    const [palette, setPalette] = useState("signal");
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [emailTouched, setEmailTouched] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [stage, setStage] = useState(STAGE.IDLE);
    const [error, setError] = useState("");
    const [signupSuccess, setSignupSuccess] = useState(false);
    const [buttonRipples, setButtonRipples] = useState([]);

    const activePalette = palettes[palette];

    const isBusy = stage === STAGE.COMPRESSING || stage === STAGE.ENCRYPTING || stage === STAGE.VERIFYING || stage === STAGE.SUCCESS;
    const isLoading = stage === STAGE.COMPRESSING || stage === STAGE.ENCRYPTING || stage === STAGE.VERIFYING;
    const statusText = STATUS_COPY[stage];

    const pointerX = useMotionValue(0);
    const pointerY = useMotionValue(0);
    const shakeX = useMotionValue(0);
    const parallaxX = useSpring(pointerX, { stiffness: 150, damping: 18, mass: 0.4 });
    const parallaxY = useSpring(pointerY, { stiffness: 150, damping: 18, mass: 0.4 });
    const cardX = useTransform([parallaxX, shakeX], ([driftX, shake]) => driftX + shake);
    const glowX = useTransform(parallaxX, (value) => value * 2.4);
    const glowY = useTransform(parallaxY, (value) => value * 2.4);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            timersRef.current.forEach(clearTimeout);
        };
    }, []);

    useEffect(() => {
        if (!canvasRef.current) return undefined;
        return drawLoginField(canvasRef.current, { pulseRef, pulseOriginRef, convergeRef, rippleQueueRef });
    }, []);

    useEffect(() => {
        pulseOriginRef.current = normalizedCenter(cardRef.current);
        pulseRef.current = 1;
    }, [palette]);

    const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);

    const passwordStrength = useMemo(() => {
        if (!password) return 0;
        const lengthScore = Math.min(password.length / 14, 1);
        const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((rule) => rule.test(password)).length / 4;
        const uniqueChars = new Set(password).size;
        const diversity = Math.min(uniqueChars / password.length, 1);
        const raw = lengthScore * 0.5 + variety * 0.35 + diversity * 0.15;
        return Math.round(Math.min(raw, 1) * 100);
    }, [password]);

    const strengthLevel = getStrengthLevel(passwordStrength);

    const handleCardMouseMove = useCallback(
        (event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
            const relativeY = (event.clientY - rect.top) / rect.height - 0.5;
            pointerX.set(relativeX * 16);
            pointerY.set(relativeY * 16);
        },
        [pointerX, pointerY]
    );

    const handleCardMouseLeave = useCallback(() => {
        pointerX.set(0);
        pointerY.set(0);
    }, [pointerX, pointerY]);

    const triggerTypingRipple = useCallback((element) => {
        const now = performance.now();
        if (now - lastRippleTimeRef.current < RIPPLE_THROTTLE_MS) return;
        lastRippleTimeRef.current = now;
        rippleQueueRef.current.push(normalizedCenter(element));
    }, []);

    const handleButtonRipple = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const id = `${Date.now()}-${Math.random()}`;
        setButtonRipples((current) => [
            ...current,
            { id, x: event.clientX - rect.left, y: event.clientY - rect.top },
        ]);
        window.setTimeout(() => {
            setButtonRipples((current) => current.filter((ripple) => ripple.id !== id));
        }, 650);
    };

    const toggleMode = () => {
        if (isBusy) return;
        setMode(mode === "login" ? "signup" : "login");
        setError("");
        setStage(STAGE.IDLE);
        setSignupSuccess(false);
        setPassword("");
        setConfirmPassword("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (stage !== STAGE.IDLE && stage !== STAGE.ERROR) return;

        setError("");
        setStage(STAGE.COMPRESSING);
        pulseOriginRef.current = normalizedCenter(buttonRef.current);

        await wait(TIMING.compress, timersRef.current);
        if (!isMountedRef.current) return;

        setStage(STAGE.ENCRYPTING);
        convergeRef.current = { active: true, strength: 1, ...normalizedCenter(cardRef.current) };

        await wait(TIMING.encrypt, timersRef.current);
        if (!isMountedRef.current) return;

        setStage(STAGE.VERIFYING);

        try {
            if (mode === "login") {
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

                if (!isMountedRef.current) return;
                convergeRef.current = { active: false, strength: 0, x: 0.5, y: 0.5 };
                pulseOriginRef.current = normalizedCenter(buttonRef.current);
                pulseRef.current = 1;
                setStage(STAGE.SUCCESS);

                await wait(TIMING.successHold, timersRef.current);
                if (!isMountedRef.current) return;
                navigate("/home", { replace: true });
            } else {
                if (password !== confirmPassword) {
                    throw new Error("Passwords do not match.");
                }

                if (!username.trim() || username.trim().length < 3) {
                    throw new Error("Username must be at least 3 characters.");
                }

                const formData = new FormData();
                formData.append("username", username.trim());
                formData.append("email", email.trim());
                formData.append("password", password);

                const response = await API.post("/signup", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });

                if (!isMountedRef.current) return;
                convergeRef.current = { active: false, strength: 0, x: 0.5, y: 0.5 };
                pulseOriginRef.current = normalizedCenter(buttonRef.current);
                pulseRef.current = 1;

                setSignupSuccess(true);
                setStage(STAGE.SUCCESS);

                await wait(1500, timersRef.current);
                if (!isMountedRef.current) return;

                setMode("login");
                setSignupSuccess(false);
                setPassword("");
                setConfirmPassword("");
                setUsername("");
                setStage(STAGE.IDLE);
                setError("");
            }
        } catch (requestError) {
            if (!isMountedRef.current) return;
            convergeRef.current = { active: false, strength: 0, x: 0.5, y: 0.5 };

            const isNetworkError = !requestError.response;
            let detail = "Authentication failed.";
            if (!isNetworkError && requestError.response?.data) {
                const data = requestError.response.data;
                if (Array.isArray(data) && data.length > 0 && data[0].msg) {
                    detail = data.map((err) => err.msg).join(", ");
                } else if (data.detail) {
                    detail = data.detail;
                } else if (data.message) {
                    detail = data.message;
                } else if (typeof data === "string") {
                    detail = data;
                }
            } else if (isNetworkError) {
                detail = "Can't reach the server. Check your connection and try again.";
            }

            setError(detail);
            setStage(STAGE.ERROR);
            animate(shakeX, SHAKE_KEYFRAMES, { duration: TIMING.shake, ease: "easeInOut" });

            await wait(TIMING.errorHold, timersRef.current);
            if (!isMountedRef.current) return;
            setStage((current) => (current === STAGE.ERROR ? STAGE.IDLE : current));
        }
    };

    const glowColor = stage === STAGE.ERROR ? "#fb7185" : stage === STAGE.SUCCESS ? "#86efac" : "var(--accent)";
    const glowBreathe =
        stage === STAGE.ERROR
            ? { opacity: [0.55, 0.85, 0.55] }
            : stage === STAGE.SUCCESS
                ? { opacity: [0.45, 0.75, 0.45] }
                : { opacity: [0.22, 0.38, 0.22] };
    const glowTransition =
        stage === STAGE.ERROR
            ? { duration: 0.55, repeat: 2, ease: "easeInOut" }
            : stage === STAGE.SUCCESS
                ? { duration: 0.9, repeat: 1, ease: "easeInOut" }
                : { duration: 4.5, repeat: Infinity, ease: "easeInOut" };

    const isSignup = mode === "signup";
    const isLogin = mode === "login";

    return (
        <main
            className="relative min-h-dvh overflow-hidden bg-[#05070b] text-white"
            style={{
                "--accent": activePalette.accent,
                "--ink": activePalette.ink,
                "--line": activePalette.line,
                transition: `--accent ${THEME_TRANSITION}, --ink ${THEME_TRANSITION}, --line ${THEME_TRANSITION}`,
            }}
        >
            <style>{`
                @property --accent { syntax: '<color>'; inherits: true; initial-value: #7dd3fc; }
                @property --ink { syntax: '<color>'; inherits: true; initial-value: #07131d; }
                @property --line { syntax: '<color>'; inherits: true; initial-value: rgba(125, 211, 252, 0.42); }
                @keyframes chattornado-strip-flow {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }
            `}</style>

            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.68),rgba(0,0,0,0.22)_44%,rgba(0,0,0,0.55))]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),transparent_32%,rgba(0,0,0,0.42))]" />

            <section className="relative z-10 mx-auto grid min-h-dvh w-[min(1180px,calc(100%-48px))] grid-cols-[minmax(320px,1fr)_minmax(390px,500px)] items-center gap-16 py-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: EASE_PREMIUM }}
                    className="flex min-h-[680px] flex-col justify-between"
                >
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-lg border border-white/15 bg-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl">
                        <motion.span
                            aria-hidden="true"
                            className="pointer-events-none absolute -inset-3 rounded-xl blur-xl"
                            style={{ background: "var(--accent)" }}
                            animate={{ opacity: [0.15, 0.35, 0.15] }}
                            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <Waves className="relative h-6 w-6" style={{ color: "var(--accent)" }} />
                    </div>

                    <div className="max-w-2xl">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.07] px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                            <motion.span
                                animate={{ opacity: [0.6, 1, 0.6] }}
                                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                                className="flex"
                            >
                                <Radio className="h-4 w-4" style={{ color: "var(--accent)" }} />
                            </motion.span>
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
                                <motion.div
                                    key={value}
                                    whileHover={{ y: -3, scale: 1.02 }}
                                    transition={{ duration: 0.3, ease: EASE_PREMIUM }}
                                    className="rounded-lg border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl transition-shadow duration-300 hover:border-white/20 hover:shadow-[0_18px_40px_-14px_var(--accent)]"
                                >
                                    <p className="text-2xl font-black">{value}</p>
                                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-white/42">{label}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 26 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.72, ease: EASE_PREMIUM, delay: 0.08 }}
                >
                    <motion.div
                        ref={cardRef}
                        onMouseMove={handleCardMouseMove}
                        onMouseLeave={handleCardMouseLeave}
                        whileHover={{ scale: 1.012 }}
                        transition={{ duration: 0.4, ease: EASE_PREMIUM }}
                        style={{ x: cardX, y: parallaxY }}
                        className="relative"
                    >
                        <motion.div
                            aria-hidden="true"
                            className="pointer-events-none absolute -inset-6 rounded-[32px] blur-2xl"
                            style={{
                                background: `radial-gradient(closest-side, ${glowColor}, transparent)`,
                                x: glowX,
                                y: glowY,
                            }}
                            animate={glowBreathe}
                            transition={glowTransition}
                        />

                        <form
                            onSubmit={handleSubmit}
                            className="relative overflow-hidden rounded-lg border bg-[#080b10]/78 shadow-[0_34px_120px_rgba(0,0,0,0.62)] backdrop-blur-2xl transition-colors duration-300"
                            style={{ borderColor: stage === STAGE.ERROR ? "rgba(248,113,113,0.55)" : "rgba(255,255,255,0.15)" }}
                        >
                            <motion.div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
                                animate={{ x: ["-20%", "340%"] }}
                                transition={{ duration: 7.5, repeat: Infinity, ease: "linear", repeatDelay: 2.5 }}
                            />

                            <div
                                className="h-1 bg-[linear-gradient(90deg,var(--accent),#f472b6,#86efac)] bg-[length:200%_100%]"
                                style={{ animation: "chattornado-strip-flow 6s linear infinite" }}
                            />
                            <div className="p-8">
                                <div className="flex items-start justify-between gap-5">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/42">
                                            {isLogin ? "Secure entry" : "Create account"}
                                        </p>
                                        <h2 className="mt-3 text-4xl font-black tracking-tight">
                                            {isLogin ? "Welcome back." : "Join the storm."}
                                        </h2>
                                    </div>
                                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/12 bg-white/[0.06]">
                                        {isLogin ? (
                                            <ShieldCheck className="h-5 w-5" style={{ color: "var(--accent)" }} />
                                        ) : (
                                            <UserPlus className="h-5 w-5" style={{ color: "var(--accent)" }} />
                                        )}
                                    </div>
                                </div>

                                <p className="mt-4 text-sm leading-6 text-white/55">
                                    {isLogin
                                        ? "Sign in with the same backend authentication used by the rest of the app."
                                        : "Create your ChatTornado account and start messaging securely."}
                                </p>

                                <div className="mt-8 space-y-4">
                                    <AnimatePresence mode="wait" initial={false}>
                                        {isSignup && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                transition={{ duration: 0.3, ease: EASE_PREMIUM }}
                                                className="overflow-hidden"
                                            >
                                                <label className="group grid min-h-[60px] grid-cols-[20px_1fr] items-center gap-3 rounded-lg border border-white/12 bg-black/24 px-4 transition-all duration-300 focus-within:border-white/28 focus-within:bg-black/34 focus-within:shadow-[0_0_0_1px_var(--accent),0_0_28px_-8px_var(--accent)]">
                                                    <User className="h-5 w-5 text-white/38 transition-colors duration-300 group-focus-within:text-[var(--accent)]" />
                                                    <input
                                                        type="text"
                                                        value={username}
                                                        onChange={(event) => setUsername(event.target.value)}
                                                        onKeyDown={(event) => triggerTypingRipple(event.currentTarget)}
                                                        placeholder="Username"
                                                        autoComplete="username"
                                                        required={isSignup}
                                                        className="min-w-0 bg-transparent text-[15px] text-white outline-none placeholder:text-white/30"
                                                    />
                                                </label>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <motion.label
                                        className="group grid min-h-[60px] grid-cols-[20px_1fr] items-center gap-3 rounded-lg border border-white/12 bg-black/24 px-4 transition-all duration-300 focus-within:border-white/28 focus-within:bg-black/34 focus-within:shadow-[0_0_0_1px_var(--accent),0_0_28px_-8px_var(--accent)]"
                                        animate={emailTouched && email && !emailValid ? { x: [0, -4, 4, -3, 3, 0] } : { x: 0 }}
                                        transition={{ duration: 0.35, ease: "easeInOut" }}
                                        style={{
                                            borderColor: emailTouched && email && !emailValid ? "rgba(248,113,113,0.55)" : undefined,
                                        }}
                                    >
                                        <Mail className="h-5 w-5 text-white/38 transition-colors duration-300 group-focus-within:text-[var(--accent)]" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            onBlur={() => setEmailTouched(true)}
                                            onKeyDown={(event) => triggerTypingRipple(event.currentTarget)}
                                            placeholder="Email address"
                                            autoComplete="email"
                                            required
                                            className="min-w-0 bg-transparent text-[15px] text-white outline-none placeholder:text-white/30"
                                        />
                                    </motion.label>

                                    <label className="group grid min-h-[60px] grid-cols-[20px_1fr_34px] items-center gap-3 rounded-lg border border-white/12 bg-black/24 px-4 transition-all duration-300 focus-within:border-white/28 focus-within:bg-black/34 focus-within:shadow-[0_0_0_1px_var(--accent),0_0_28px_-8px_var(--accent)]">
                                        <motion.span
                                            className="flex"
                                            animate={
                                                stage === STAGE.ENCRYPTING || stage === STAGE.VERIFYING
                                                    ? { scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }
                                                    : stage === STAGE.SUCCESS
                                                        ? { scale: [1, 1.3, 1] }
                                                        : { scale: 1, rotate: 0 }
                                            }
                                            transition={{
                                                duration: stage === STAGE.SUCCESS ? 0.5 : 1.1,
                                                repeat: stage === STAGE.VERIFYING ? Infinity : 0,
                                                ease: "easeInOut",
                                            }}
                                        >
                                            <Lock
                                                className="h-5 w-5 text-white/38 transition-colors duration-300 group-focus-within:text-[var(--accent)]"
                                                style={stage === STAGE.SUCCESS ? { color: "#86efac" } : undefined}
                                            />
                                        </motion.span>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            onKeyDown={(event) => triggerTypingRipple(event.currentTarget)}
                                            placeholder="Password"
                                            autoComplete={isLogin ? "current-password" : "new-password"}
                                            required
                                            className="min-w-0 bg-transparent text-[15px] text-white outline-none placeholder:text-white/30"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((value) => !value)}
                                            className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg text-white/42 transition hover:bg-white/8 hover:text-white"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                            title={showPassword ? "Hide password" : "Show password"}
                                        >
                                            <AnimatePresence mode="wait" initial={false}>
                                                <motion.span
                                                    key={showPassword ? "hide" : "show"}
                                                    initial={{ opacity: 0, scale: 0.75, rotate: -10 }}
                                                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                                    exit={{ opacity: 0, scale: 0.75, rotate: 10 }}
                                                    transition={{ duration: 0.2, ease: EASE_PREMIUM }}
                                                    className="flex"
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </motion.span>
                                            </AnimatePresence>
                                        </button>
                                    </label>

                                    <AnimatePresence mode="wait" initial={false}>
                                        {isSignup && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                transition={{ duration: 0.3, ease: EASE_PREMIUM }}
                                                className="overflow-hidden"
                                            >
                                                <label className="group grid min-h-[60px] grid-cols-[20px_1fr_34px] items-center gap-3 rounded-lg border border-white/12 bg-black/24 px-4 transition-all duration-300 focus-within:border-white/28 focus-within:bg-black/34 focus-within:shadow-[0_0_0_1px_var(--accent),0_0_28px_-8px_var(--accent)]">
                                                    <Lock className="h-5 w-5 text-white/38 transition-colors duration-300 group-focus-within:text-[var(--accent)]" />
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        value={confirmPassword}
                                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                                        onKeyDown={(event) => triggerTypingRipple(event.currentTarget)}
                                                        placeholder="Confirm password"
                                                        autoComplete="new-password"
                                                        required={isSignup}
                                                        className="min-w-0 bg-transparent text-[15px] text-white outline-none placeholder:text-white/30"
                                                    />
                                                    <div className="w-9" />
                                                </label>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <AnimatePresence initial={false}>
                                    {password.length > 0 && (
                                        <motion.div
                                            key="strength"
                                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                            transition={{ duration: 0.32, ease: EASE_PREMIUM }}
                                            className="overflow-hidden"
                                        >
                                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em]">
                                                <span className="text-white/40">Password strength</span>
                                                <AnimatePresence mode="wait" initial={false}>
                                                    <motion.span
                                                        key={strengthLevel.label}
                                                        initial={{ opacity: 0, y: -4 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 4 }}
                                                        transition={{ duration: 0.22 }}
                                                        style={{ color: strengthLevel.color }}
                                                    >
                                                        {strengthLevel.label}
                                                    </motion.span>
                                                </AnimatePresence>
                                            </div>
                                            <div className="mt-2 h-1 overflow-hidden rounded-lg bg-white/10" aria-hidden="true">
                                                <motion.div
                                                    className="h-full rounded-lg"
                                                    style={{ background: "linear-gradient(90deg,#fb7185,#f8c471,#86efac)" }}
                                                    animate={{ width: `${passwordStrength}%` }}
                                                    transition={{ duration: 0.4, ease: EASE_PREMIUM }}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, ease: EASE_PREMIUM }}
                                        className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                                        role="alert"
                                    >
                                        {error}
                                    </motion.p>
                                )}

                                {signupSuccess && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, ease: EASE_PREMIUM }}
                                        className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
                                        role="alert"
                                    >
                                        ✅ Account created successfully! Please login with your credentials.
                                    </motion.p>
                                )}

                                <motion.button
                                    ref={buttonRef}
                                    type="submit"
                                    disabled={isBusy}
                                    onPointerDown={handleButtonRipple}
                                    whileTap={{ scale: 0.97 }}
                                    whileHover={isBusy ? undefined : { scale: 1.015, y: -2 }}
                                    animate={{ scale: stage === STAGE.SUCCESS ? 1.02 : 1 }}
                                    transition={{ duration: 0.3, ease: EASE_PREMIUM }}
                                    className="relative mt-7 flex min-h-[58px] w-full items-center justify-center gap-3 overflow-hidden rounded-lg bg-white px-5 text-sm font-black text-[#07131d] shadow-[0_20px_46px_rgba(255,255,255,0.12)] transition-shadow duration-300 hover:shadow-[0_26px_64px_-8px_var(--accent)] disabled:cursor-not-allowed disabled:opacity-65"
                                >
                                    {buttonRipples.map((ripple) => (
                                        <motion.span
                                            key={ripple.id}
                                            className="pointer-events-none absolute rounded-full bg-[#07131d]/15"
                                            style={{ left: ripple.x, top: ripple.y, translateX: "-50%", translateY: "-50%" }}
                                            initial={{ width: 0, height: 0, opacity: 0.45 }}
                                            animate={{ width: 320, height: 320, opacity: 0 }}
                                            transition={{ duration: 0.65, ease: "easeOut" }}
                                        />
                                    ))}

                                    <AnimatePresence mode="wait" initial={false}>
                                        {stage === STAGE.SUCCESS ? (
                                            <motion.span
                                                key="success"
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                transition={{ duration: 0.25 }}
                                                className="flex items-center gap-2"
                                            >
                                                <Check className="h-4 w-4" />
                                                {isLogin ? "Access granted" : "Account created!"}
                                            </motion.span>
                                        ) : isLoading ? (
                                            <motion.span
                                                key="loading"
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                transition={{ duration: 0.25 }}
                                                className="flex items-center gap-2"
                                            >
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                {stage === STAGE.ENCRYPTING ? "Encrypting..." : "Verifying..."}
                                            </motion.span>
                                        ) : (
                                            <motion.span
                                                key="idle"
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                transition={{ duration: 0.25 }}
                                                className="flex items-center gap-2"
                                            >
                                                {isLogin ? "Open dashboard" : "Create account"}
                                                <ArrowRight className="h-4 w-4" />
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </motion.button>

                                <div className="mt-5 text-center">
                                    <button
                                        type="button"
                                        onClick={toggleMode}
                                        disabled={isBusy}
                                        className="text-xs text-white/40 hover:text-white/70 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLogin ? "Don't have an account? Create one →" : "Already have an account? Sign in →"}
                                    </button>
                                </div>

                                <div className="mt-7 grid grid-cols-3 gap-2" aria-label="Visual profile">
                                    {Object.entries(palettes).map(([key, item]) => (
                                        <motion.button
                                            key={key}
                                            type="button"
                                            aria-pressed={palette === key}
                                            onClick={() => setPalette(key)}
                                            whileTap={{ scale: 0.96 }}
                                            whileHover={{ scale: 1.02 }}
                                            transition={{ duration: 0.25, ease: EASE_PREMIUM }}
                                            className="relative flex items-center justify-center gap-2 overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] px-3 py-3 text-xs font-bold text-white/58 transition hover:border-white/18 hover:text-white aria-pressed:text-white"
                                        >
                                            {palette === key && (
                                                <motion.span
                                                    layoutId="theme-active-ring"
                                                    className="absolute inset-0 rounded-lg border border-white/30 bg-white/12"
                                                    transition={{ duration: 0.4, ease: EASE_PREMIUM }}
                                                />
                                            )}
                                            <span
                                                className="relative z-10 h-2.5 w-2.5 rounded-full"
                                                style={{ background: item.accent, boxShadow: `0 0 10px ${item.accent}` }}
                                                aria-hidden="true"
                                            />
                                            <span className="relative z-10">{item.name}</span>
                                        </motion.button>
                                    ))}
                                </div>

                                <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-white/45">
                                    <span className="inline-flex items-center gap-2" aria-live="polite">
                                        <motion.span
                                            className="h-2 w-2 rounded-sm"
                                            style={{ background: "var(--accent)" }}
                                            animate={{ opacity: [0.6, 1, 0.6] }}
                                            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                        <AnimatePresence mode="wait" initial={false}>
                                            <motion.span
                                                key={statusText}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                transition={{ duration: 0.28, ease: EASE_PREMIUM }}
                                            >
                                                {statusText}
                                            </motion.span>
                                        </AnimatePresence>
                                    </span>
                                    <span className="inline-flex items-center gap-2">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Premium shell
                                    </span>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            </section>
        </main>
    );
}
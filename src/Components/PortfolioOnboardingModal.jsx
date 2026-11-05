import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles,
    Shield,
    Zap,
    Bot,
    MessageSquare,
    Compass,
    Radio,
    Flame,
    Eye,
    EyeOff,
    Check,
    ArrowRight,
    ArrowLeft,
    X,
    Lock,
    Gamepad2,
    Users,
    Code,
    Brain,
    HelpCircle,
    Sliders,
    AlertTriangle,
} from "lucide-react";
import API from "../Services/API";
import soundEngine from "../utils/soundEffects";

const ROLES = [
    { id: "dev", label: "Software Engineer / Builder", icon: Code, desc: "Codes, builds apps, systems architecture" },
    { id: "student", label: "Student / Researcher", icon: Brain, desc: "Learning, academic research, exploring topics" },
    { id: "creator", label: "Gamer / Creative Creator", icon: Gamepad2, desc: "Gaming, digital arts, media, streaming" },
    { id: "security", label: "Cybersecurity & Privacy", icon: Shield, desc: "OPSEC, cryptography, privacy tools" },
    { id: "casual", label: "Casual / General Chatter", icon: MessageSquare, desc: "Connecting with friends, messaging" },
];

const POPULAR_INTERESTS = [
    "Python", "React", "AI & LLMs", "Cybersecurity", "Gaming", "Web Development",
    "Science", "Design & 3D", "Finance & Startups", "Music", "Linux / DevOps", "Philosophy"
];

export default function PortfolioOnboardingModal({ isOpen, onClose, onComplete }) {
    const [step, setStep] = useState(1);
    const totalSteps = 5;

    // AI Personalization Form State
    const defaultUser = sessionStorage.getItem("username") || "Member";
    const [callsign, setCallsign] = useState(() => localStorage.getItem("vortex_ai_callsign") || defaultUser);
    const [selectedRole, setSelectedRole] = useState(() => localStorage.getItem("vortex_ai_role") || "dev");
    const [selectedInterests, setSelectedInterests] = useState(() => {
        try {
            const raw = localStorage.getItem("vortex_ai_interests");
            return raw ? JSON.parse(raw) : ["AI & LLMs", "Web Development"];
        } catch {
            return ["AI & LLMs", "Web Development"];
        }
    });
    const [aiMemoryConsent, setAiMemoryConsent] = useState(() => {
        const val = localStorage.getItem("vortex_ai_consent");
        return val === null ? true : val === "true";
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const toggleInterest = (tag) => {
        setSelectedInterests((prev) => {
            const exists = prev.includes(tag);
            const next = exists ? prev.filter((t) => t !== tag) : [...prev, tag];
            soundEngine?.play?.("pop");
            return next;
        });
    };

    const handleNext = () => {
        if (step < totalSteps) {
            soundEngine?.play?.("cyber_chirp");
            setStep((s) => s + 1);
        } else {
            handleFinish();
        }
    };

    const handleBack = () => {
        if (step > 1) {
            soundEngine?.play?.("pop");
            setStep((s) => s - 1);
        }
    };

    const handleFinish = async () => {
        setIsSaving(true);
        soundEngine?.play?.("win");

        // Save preferences to localStorage
        localStorage.setItem("vortex_ai_callsign", callsign.trim() || defaultUser);
        localStorage.setItem("vortex_ai_role", selectedRole);
        localStorage.setItem("vortex_ai_interests", JSON.stringify(selectedInterests));
        localStorage.setItem("vortex_ai_consent", aiMemoryConsent ? "true" : "false");
        localStorage.setItem("chattornado_onboarding_completed", "true");
        sessionStorage.setItem("onboardingCompleted", "true");

        // Sync with backend API
        try {
            const token = sessionStorage.getItem("token") || "";
            if (token) {
                const roleObj = ROLES.find((r) => r.id === selectedRole);
                await API.post(
                    `/api/ai/persona?token=${encodeURIComponent(token)}`,
                    {
                        callsign: callsign.trim() || defaultUser,
                        role: roleObj ? roleObj.label : selectedRole,
                        interests: selectedInterests.join(", "),
                        ai_memory_consent: aiMemoryConsent,
                        custom_instructions: `User prefers to be addressed as ${callsign.trim() || defaultUser}. Role: ${roleObj?.label}.`,
                    }
                );
                // Also mark portfolio/onboarding completed
                await API.post(`/user/portfolio?token=${encodeURIComponent(token)}`, {
                    portfolio: {
                        displayName: callsign.trim() || defaultUser,
                        role: roleObj?.label,
                        interests: selectedInterests,
                        ai_consent: aiMemoryConsent,
                    },
                });
            }
        } catch (e) {
            console.warn("Could not sync AI persona to server, saved locally:", e);
        } finally {
            setIsSaving(false);
            window.dispatchEvent(new Event("sessionStorageUpdate"));
            onComplete?.();
            onClose?.();
        }
    };

    const handleSkip = () => {
        soundEngine?.play?.("whoosh");
        localStorage.setItem("chattornado_onboarding_completed", "true");
        sessionStorage.setItem("onboardingCompleted", "true");
        window.dispatchEvent(new Event("sessionStorageUpdate"));
        onComplete?.();
        onClose?.();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl select-none overscroll-contain">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    className="relative w-full max-w-xl rounded-2xl sm:rounded-3xl border border-cyan-500/30 bg-[#0a0d16] text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]"
                >
                    {/* Top ambient holographic beam */}
                    <div className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10 flex-shrink-0 bg-white/[0.02]">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                                    ChatTornado Quick Guide
                                </h3>
                                <p className="text-[10px] sm:text-[11px] text-cyan-300/70 font-mono">
                                    Step {step} of {totalSteps}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleSkip}
                                className="text-[11px] font-semibold text-white/40 hover:text-white/80 transition-colors px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
                            >
                                Skip Tour
                            </button>
                            <button
                                type="button"
                                onClick={handleSkip}
                                className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-white/5 flex-shrink-0">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 ease-out"
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        />
                    </div>

                    {/* Scrollable Step Content */}
                    <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar space-y-4">
                        {/* STEP 1: WELCOME & OVERVIEW */}
                        {step === 1 && (
                            <motion.div
                                key="step-1"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-4"
                            >
                                <div className="text-center sm:text-left">
                                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-widest mb-1.5">
                                        Welcome Operative
                                    </span>
                                    <h4 className="text-lg sm:text-xl font-black text-white">
                                        Welcome to ChatTornado 🌪️
                                    </h4>
                                    <p className="text-xs sm:text-sm text-white/60 mt-1 leading-relaxed">
                                        ChatTornado is a high-security, cyberpunk communication network designed for ultra-fast messaging, cooperative tools, and integrated autonomous AI.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/30 transition-colors">
                                        <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center mb-2">
                                            <MessageSquare className="w-4 h-4" />
                                        </div>
                                        <h5 className="text-xs font-bold text-white">Instant Chats</h5>
                                        <p className="text-[11px] text-white/50 mt-1 leading-normal">
                                            Real-time direct messaging, squads, and media sharing with zero delay.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-violet-400/30 transition-colors">
                                        <div className="w-7 h-7 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center mb-2">
                                            <Shield className="w-4 h-4" />
                                        </div>
                                        <h5 className="text-xs font-bold text-white">Ghost Stealth</h5>
                                        <p className="text-[11px] text-white/50 mt-1 leading-normal">
                                            Dead drops, anti-snoop shields, and panic escape keys for full privacy.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-colors">
                                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center mb-2">
                                            <Bot className="w-4 h-4" />
                                        </div>
                                        <h5 className="text-xs font-bold text-white">VORTEX-9 AI</h5>
                                        <p className="text-[11px] text-white/50 mt-1 leading-normal">
                                            Your personal AI co-pilot for coding, deep research, and chat synthesis.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-cyan-200/80 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                                    <span>Takes less than 1 minute to complete. Click Next to learn the key shortcuts!</span>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: NAVIGATION & DISCOVERY */}
                        {step === 2 && (
                            <motion.div
                                key="step-2"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-3.5"
                            >
                                <div>
                                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-[10px] font-mono font-bold uppercase tracking-widest mb-1.5">
                                        Exploration & Navigation
                                    </span>
                                    <h4 className="text-lg sm:text-xl font-black text-white">
                                        How to Navigate ChatTornado 🗺️
                                    </h4>
                                    <p className="text-xs sm:text-sm text-white/60 mt-1">
                                        Getting around is effortless across phone, tablet, and desktop.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <div className="p-3 rounded-xl bg-white/[0.025] border border-white/10 flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-sky-500/20 text-sky-300 flex-shrink-0 mt-0.5">
                                            <Users className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-bold text-white">Chats & The Global Directory</h5>
                                            <p className="text-[11px] text-white/50 mt-0.5 leading-normal">
                                                On the left sidebar (or bottom bar on phone), tap the <strong>Global</strong> tab to discover online members worldwide. Click any user to send an instant connection request!
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-white/[0.025] border border-white/10 flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-fuchsia-500/20 text-fuchsia-300 flex-shrink-0 mt-0.5">
                                            <Radio className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-bold text-white">24-Hour Status Notes</h5>
                                            <p className="text-[11px] text-white/50 mt-0.5 leading-normal">
                                                Tap <strong>"New Note"</strong> at the top of your chat list to post thoughts, activities, or music vibes that appear as floating status bubbles above your avatar.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-white/[0.025] border border-white/10 flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 flex-shrink-0 mt-0.5">
                                            <Gamepad2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-bold text-white">In-Chat Hubs & Arcade</h5>
                                            <p className="text-[11px] text-white/50 mt-0.5 leading-normal">
                                                Split bills, track shared task checklists, set event countdowns, or play multiplayer mini-games (Tic-Tac-Toe, Connect 4, RPS) right inside your chats.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: STEALTH & OPSEC SUPERPOWERS */}
                        {step === 3 && (
                            <motion.div
                                key="step-3"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-3.5"
                            >
                                <div>
                                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-400/30 text-violet-300 text-[10px] font-mono font-bold uppercase tracking-widest mb-1.5">
                                        Maximum Privacy
                                    </span>
                                    <h4 className="text-lg sm:text-xl font-black text-white">
                                        Stealth & Security Controls 🛡️
                                    </h4>
                                    <p className="text-xs sm:text-sm text-white/60 mt-1">
                                        You are in control of your privacy with state-of-the-art protections.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <div className="p-3 rounded-xl bg-white/[0.025] border border-white/10 flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 flex-shrink-0 mt-0.5">
                                            <Zap className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-bold text-white">⚡ Dead Drop (Timed Burners)</h5>
                                            <p className="text-[11px] text-white/50 mt-0.5 leading-normal">
                                                Send sensitive passcodes or confidential notes that automatically vaporize into digital ash after the recipient decrypts and reads them.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-white/[0.025] border border-white/10 flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 flex-shrink-0 mt-0.5">
                                            <EyeOff className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-bold text-white">🛡️ Anti-Snoop Privacy Shield</h5>
                                            <p className="text-[11px] text-white/50 mt-0.5 leading-normal">
                                                In public or switching tabs? The shield automatically obfuscates chat text to prevent shoulder-surfers from reading your screen. Tap anywhere to de-blur.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-white/[0.025] border border-white/10 flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-rose-500/20 text-rose-300 flex-shrink-0 mt-0.5">
                                            <AlertTriangle className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-bold text-white">🚨 Triple-ESC Panic Key</h5>
                                            <p className="text-[11px] text-white/50 mt-0.5 leading-normal">
                                                Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Esc</kbd> 3 times quickly (or type <code className="text-cyan-300">/panic</code> in terminal) to instantly wipe temporary RAM and divert to Wikipedia.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 4: VORTEX-9 AI CO-PILOT */}
                        {step === 4 && (
                            <motion.div
                                key="step-4"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-3.5"
                            >
                                <div>
                                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-widest mb-1.5">
                                        Artificial Intelligence
                                    </span>
                                    <h4 className="text-lg sm:text-xl font-black text-white">
                                        Meet VORTEX-9 (AI Co-Pilot) 🤖
                                    </h4>
                                    <p className="text-xs sm:text-sm text-white/60 mt-1">
                                        Always available in your chat list. No subscriptions or external setup needed.
                                    </p>
                                </div>

                                <div className="space-y-2.5">
                                    <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/30 to-blue-950/20 border border-cyan-500/25 flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 flex-shrink-0">
                                            <Code className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-bold text-white">Interactive Code & Web Sandboxes</h5>
                                            <p className="text-[11px] text-white/50 mt-0.5 leading-normal">
                                                Ask VORTEX-9 to build HTML/JS apps, animations, or algorithms. Code blocks feature live runnable previews right inside your chat!
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-gradient-to-r from-purple-950/30 to-indigo-950/20 border border-purple-500/25 flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 flex-shrink-0">
                                            <Brain className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-bold text-white">Deep Research & Chat Summaries</h5>
                                            <p className="text-[11px] text-white/50 mt-0.5 leading-normal">
                                                Type <code className="text-purple-300">/research &lt;topic&gt;</code> to create exhaustive research dossiers, or click "Summarize Session" in any chat to condense 100s of messages into bullet points.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/30 to-orange-950/20 border border-amber-500/25 flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 flex-shrink-0">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-bold text-white">AI Arbiter & Image Generation</h5>
                                            <p className="text-[11px] text-white/50 mt-0.5 leading-normal">
                                                Debating with a friend? Let VORTEX-9 settle it with objective logic. Want art? Type <code className="text-amber-300">/image &lt;prompt&gt;</code> to synthesize images instantly.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 5: AI PERSONALIZATION & INFO STORAGE CONSENT */}
                        {step === 5 && (
                            <motion.div
                                key="step-5"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-4"
                            >
                                <div>
                                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-bold uppercase tracking-widest mb-1.5">
                                        Setup & Personalization
                                    </span>
                                    <h4 className="text-lg sm:text-xl font-black text-white">
                                        AI Memory & Personalization 🧠
                                    </h4>
                                    <p className="text-xs text-white/60 mt-1">
                                        Tell VORTEX-9 who you are and customize how your information is stored.
                                    </p>
                                </div>

                                {/* Callsign Input */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1.5">
                                        What should VORTEX-9 call you? (Callsign / Nickname)
                                    </label>
                                    <input
                                        type="text"
                                        value={callsign}
                                        onChange={(e) => setCallsign(e.target.value)}
                                        placeholder="e.g. Alex, Commander, DevDan"
                                        className="w-full bg-white/[0.04] border border-white/10 focus:border-cyan-400/60 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-white/30 outline-none font-mono transition-colors"
                                    />
                                </div>

                                {/* Role Selector */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1.5">
                                        Your Primary Vibe & Focus
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {ROLES.map((r) => {
                                            const active = selectedRole === r.id;
                                            const RoleIcon = r.icon;
                                            return (
                                                <button
                                                    key={r.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedRole(r.id);
                                                        soundEngine?.play?.("pop");
                                                    }}
                                                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                                        active
                                                            ? "bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/15"
                                                            : "bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <RoleIcon className={`w-3.5 h-3.5 ${active ? "text-cyan-300" : "text-white/40"}`} />
                                                        <span className="text-xs font-bold truncate">{r.label}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Interests Tags */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1.5">
                                        Topics You Love (Select Any)
                                    </label>
                                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                                        {POPULAR_INTERESTS.map((tag) => {
                                            const active = selectedInterests.includes(tag);
                                            return (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => toggleInterest(tag)}
                                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                                                        active
                                                            ? "bg-violet-500/25 border-violet-400 text-violet-200 shadow-sm"
                                                            : "bg-white/[0.03] border-white/10 text-white/50 hover:text-white hover:bg-white/[0.06]"
                                                    }`}
                                                >
                                                    {active ? `✓ ${tag}` : `+ ${tag}`}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* AI Memory & Consent Toggle (Strict Privacy Standard) */}
                                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <Brain className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                            <div>
                                                <h5 className="text-xs font-bold text-white">AI Memory & Context Storage</h5>
                                                <p className="text-[10px] text-white/40">
                                                    Allow VORTEX-9 to remember your preferences for personalized answers.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAiMemoryConsent((prev) => !prev);
                                                soundEngine?.play?.("pop");
                                            }}
                                            className={`relative w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex-shrink-0 ${
                                                aiMemoryConsent ? "bg-emerald-500" : "bg-white/20"
                                            }`}
                                        >
                                            <div
                                                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                                    aiMemoryConsent ? "translate-x-5" : "translate-x-0"
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    <div className="text-[10px] text-white/50 leading-relaxed pl-6 border-t border-white/5 pt-2">
                                        {aiMemoryConsent ? (
                                            <span className="text-emerald-300 font-medium">
                                                ✓ Memory Enabled: VORTEX-9 will remember your callsign & preferences. Stored safely in local encrypted storage. Never shared with third parties.
                                            </span>
                                        ) : (
                                            <span className="text-amber-300/80 font-medium">
                                                ⚪ Stateless Mode: VORTEX-9 will answer questions without retaining any personal history or session memory.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Modal Footer Controls */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/10 bg-[#07090f] flex-shrink-0">
                        <div>
                            {step > 1 ? (
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Back</span>
                                </button>
                            ) : (
                                <span className="text-[11px] text-white/30 hidden sm:inline">
                                    Quick 1-Minute Walkthrough
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {step < totalSteps ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all active:scale-95 cursor-pointer"
                                >
                                    <span>Continue</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={handleFinish}
                                    className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:brightness-110 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>{isSaving ? "Saving..." : "Launch ChatTornado 🚀"}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

PortfolioOnboardingModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onComplete: PropTypes.func,
};

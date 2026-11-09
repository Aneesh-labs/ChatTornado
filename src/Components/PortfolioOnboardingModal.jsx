import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles,
    Shield,
    Zap,
    Bot,
    MessageSquare,
    Radio,
    ArrowRight,
    ArrowLeft,
    X,
    Lock,
    Gamepad2,
    Code,
    Brain,
    AlertTriangle,
    Search,
    Phone,
    PhoneCall,
    Video,
    Dna,
    GitFork,
    Clock,
    Tv,
    Ghost,
    Download,
    Receipt,
    CheckSquare,
    BookOpen
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

const CHEAT_SHEET_SYMBOLS = [
    {
        id: "voice_call",
        category: "calling",
        categoryLabel: "📞 Direct Comms",
        icon: Phone,
        name: "Voice Call",
        badge: "WebRTC Audio",
        color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
        desc: "Starts a private, low-latency, peer-to-peer encrypted voice call with another user directly inside your browser."
    },
    {
        id: "video_call",
        category: "calling",
        categoryLabel: "📞 Direct Comms",
        icon: Video,
        name: "Video Call",
        badge: "1080p HD Video",
        color: "text-sky-400 border-sky-500/30 bg-sky-500/10",
        desc: "High-definition live video & audio call with instant camera switching and screen share support."
    },
    {
        id: "ai_voice_call",
        category: "calling",
        categoryLabel: "📞 Direct Comms",
        icon: PhoneCall,
        name: "Live AI Voice Call",
        badge: "Autonomous AI",
        color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
        desc: "Talk out loud to VORTEX-9 AI. Speaks back with real-time speech synthesis for hands-free brainstorming."
    },
    {
        id: "conversation_dna",
        category: "quantum",
        categoryLabel: "⚡ Quantum Lab",
        icon: Dna,
        name: "Conversation DNA",
        badge: "Telemetry & Graph",
        color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
        desc: "Real-time state telemetry, cryptographic message authenticity hashes, sentiment flow, and linguistic complexity metrics."
    },
    {
        id: "reality_forks",
        category: "quantum",
        categoryLabel: "⚡ Quantum Lab",
        icon: GitFork,
        name: "Reality Forks",
        badge: "Timeline Branches",
        color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
        desc: "Branches your chat into an alternate parallel timeline to explore what-if discussion paths without disrupting the main conversation."
    },
    {
        id: "future_messages",
        category: "quantum",
        categoryLabel: "⚡ Quantum Lab",
        icon: Clock,
        name: "Future Delivery",
        badge: "Time-Lock",
        color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
        desc: "Compose an encrypted message now scheduled to automatically drop into the chat at an exact future date and time."
    },
    {
        id: "watch_together",
        category: "quantum",
        categoryLabel: "⚡ Quantum Lab",
        icon: Tv,
        name: "Watch Together",
        badge: "Live Video Sync",
        color: "text-violet-400 border-violet-500/30 bg-violet-500/10",
        desc: "Synchronized video player: watch YouTube and web videos together with friends with synchronized pause, play, and seek."
    },
    {
        id: "vanish_mode",
        category: "quantum",
        categoryLabel: "⚡ Quantum Lab",
        icon: Ghost,
        name: "Vanish Mode",
        badge: "Self-Destruct",
        color: "text-pink-400 border-pink-500/30 bg-pink-500/10",
        desc: "Messages disappear permanently after being read. Triggers visual alerts if a screenshot is detected."
    },
    {
        id: "export_chat",
        category: "quantum",
        categoryLabel: "⚡ Quantum Lab",
        icon: Download,
        name: "Export Transcript",
        badge: "Archival",
        color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
        desc: "Downloads complete chat history formatted as clean Markdown (.md), JSON, or printable HTML."
    },
    {
        id: "ghost_vault",
        category: "security",
        categoryLabel: "🔒 Stealth & OPSEC",
        icon: Lock,
        name: "Ghost Vault & Decoy",
        badge: "Zero-Knowledge",
        color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
        desc: "Locks sensitive chats behind a secret PIN. Entering a fake PIN unlocks Decoy Mode, showing innocent dummy news while hiding secret chats."
    },
    {
        id: "panic_switch",
        category: "security",
        categoryLabel: "🔒 Stealth & OPSEC",
        icon: AlertTriangle,
        name: "Triple-ESC Panic Key",
        badge: "Press ESC 3x",
        color: "text-red-400 border-red-500/30 bg-red-500/10",
        desc: "Press ESC 3 times quickly anywhere in the app to instantly redirect your browser to Wikipedia and purge live session memory with zero trace."
    },
    {
        id: "anti_snoop",
        category: "security",
        categoryLabel: "🔒 Stealth & OPSEC",
        icon: Shield,
        name: "Anti-Snoop Shield",
        badge: "Privacy Blur",
        color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
        desc: "Instantly applies a heavy frosted blur to all messages and sidebar contacts to prevent shoulder-surfing in public places."
    },
    {
        id: "split_bill",
        category: "coop",
        categoryLabel: "💰 Co-Op Supertools",
        icon: Receipt,
        name: "Split Bill & Ledger",
        badge: "Expense Ledger",
        color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
        desc: "Shared expense tracker that automatically tallies expenses and calculates who owes whom in real time."
    },
    {
        id: "shared_tasks",
        category: "coop",
        categoryLabel: "💰 Co-Op Supertools",
        icon: CheckSquare,
        name: "Shared Tasks",
        badge: "Co-Op Checklist",
        color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
        desc: "Synchronized checklist for squads, travel itineraries, and project deliverables with real-time checkmarks."
    },
    {
        id: "countdown_timer",
        category: "coop",
        categoryLabel: "💰 Co-Op Supertools",
        icon: Clock,
        name: "Countdown Timer",
        badge: "Synchronized",
        color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
        desc: "Live event countdown timer visible to both users in the chat for meetings, deadlines, and game sessions."
    },
    {
        id: "arcade_hub",
        category: "coop",
        categoryLabel: "💰 Co-Op Supertools",
        icon: Gamepad2,
        name: "Arcade Hub",
        badge: "Retro Gaming",
        color: "text-pink-400 border-pink-500/30 bg-pink-500/10",
        desc: "Play multiplayer mini-games (Tic-Tac-Toe, Connect 4, Cyber Arena) directly inside ChatTornado."
    }
];

export default function PortfolioOnboardingModal({ isOpen, onClose, onComplete }) {
    const navigate = useNavigate();

    // viewMode: "cheatsheet" | "tour" | "persona"
    const [viewMode, setViewMode] = useState("cheatsheet");
    const [tourStep, setTourStep] = useState(1);
    const totalTourSteps = 4;

    const [categoryFilter, setCategoryFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

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
            setViewMode("cheatsheet");
            setTourStep(1);
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

    const handleTourNext = () => {
        if (tourStep < totalTourSteps) {
            soundEngine?.play?.("cyber_chirp");
            setTourStep((s) => s + 1);
        } else {
            soundEngine?.play?.("cyber_chirp");
            setViewMode("persona");
        }
    };

    const handleTourBack = () => {
        if (tourStep > 1) {
            soundEngine?.play?.("pop");
            setTourStep((s) => s - 1);
        } else {
            setViewMode("cheatsheet");
        }
    };

    const handleFinish = async () => {
        setIsSaving(true);
        soundEngine?.play?.("win");

        localStorage.setItem("vortex_ai_callsign", callsign.trim() || defaultUser);
        localStorage.setItem("vortex_ai_role", selectedRole);
        localStorage.setItem("vortex_ai_interests", JSON.stringify(selectedInterests));
        localStorage.setItem("vortex_ai_consent", aiMemoryConsent ? "true" : "false");
        localStorage.setItem("chattornado_onboarding_completed", "true");
        sessionStorage.setItem("onboardingCompleted", "true");

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

    const filteredSymbols = CHEAT_SHEET_SYMBOLS.filter((item) => {
        const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
        const matchesSearch = !searchQuery.trim() || 
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.badge.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/85 backdrop-blur-2xl select-none overscroll-contain">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    className="relative w-full max-w-2xl lg:max-w-3xl rounded-2xl sm:rounded-3xl border border-cyan-500/30 bg-[#090d16] text-white shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[88vh]"
                >
                    {/* Top ambient holographic neon beam */}
                    <div className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 flex-shrink-0 bg-white/[0.02]">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                                {viewMode === "cheatsheet" ? <BookOpen className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                                    {viewMode === "cheatsheet" && "ChatTornado Control Deck & Button Cheat Sheet"}
                                    {viewMode === "tour" && `Guided Interactive Tour (Step ${tourStep} of ${totalTourSteps})`}
                                    {viewMode === "persona" && "AI Memory & Identity Setup"}
                                </h3>
                                <p className="text-[10px] sm:text-[11px] text-cyan-300/70 font-mono">
                                    {viewMode === "cheatsheet" && "Visual Interface Blueprint & Action Reference"}
                                    {viewMode === "tour" && "Master Key Shortcuts & Superpowers"}
                                    {viewMode === "persona" && "Tailor VORTEX-9 to your exact communication style"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2">
                            {viewMode !== "cheatsheet" && (
                                <button
                                    type="button"
                                    onClick={() => setViewMode("cheatsheet")}
                                    className="text-[11px] font-semibold text-cyan-300 hover:text-white px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 transition-all cursor-pointer flex items-center gap-1"
                                >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Cheat Sheet</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleSkip}
                                className="text-[11px] font-semibold text-white/40 hover:text-white/80 transition-colors px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
                            >
                                Skip
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

                    {/* Progress Bar (Visible in Tour mode) */}
                    {viewMode === "tour" && (
                        <div className="w-full h-1 bg-white/5 flex-shrink-0">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 ease-out"
                                style={{ width: `${(tourStep / totalTourSteps) * 100}%` }}
                            />
                        </div>
                    )}

                    {/* VIEW MODE 1: VISUAL CHEAT SHEET & CONTROL DECK */}
                    {viewMode === "cheatsheet" && (
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 custom-scrollbar space-y-4">
                            {/* Intro Banner */}
                            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                                <div>
                                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-widest mb-1">
                                        Interface Directory
                                    </span>
                                    <h4 className="text-sm sm:text-base font-bold text-white">
                                        Welcome to ChatTornado 🌪️
                                    </h4>
                                    <p className="text-xs text-white/60 mt-0.5 max-w-xl leading-relaxed">
                                        Review this cheat sheet to understand every button symbol, its function, and secret powers before diving in.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:w-48">
                                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search symbols..."
                                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-white/40 outline-none focus:border-cyan-400/50"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
                                {[
                                    { id: "all", label: "All Symbols (16)" },
                                    { id: "calling", label: "📞 Direct Comms" },
                                    { id: "quantum", label: "⚡ Quantum Lab" },
                                    { id: "security", label: "🔒 OPSEC & Vault" },
                                    { id: "coop", label: "💰 Co-Op Tools" },
                                ].map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => {
                                            setCategoryFilter(cat.id);
                                            soundEngine?.play?.("pop");
                                        }}
                                        className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                                            categoryFilter === cat.id
                                                ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-sm"
                                                : "bg-white/[0.03] hover:bg-white/[0.08] text-white/60 border-white/10"
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>

                            {/* Symbols Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {filteredSymbols.map((item) => {
                                    const IconComp = item.icon;
                                    return (
                                        <div
                                            key={item.id}
                                            className="p-3 rounded-2xl bg-white/[0.025] border border-white/10 hover:border-white/20 transition-all space-y-1.5 flex flex-col justify-between"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-base border ${item.color}`}>
                                                        <IconComp className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h5 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                                                            <span>{item.name}</span>
                                                        </h5>
                                                        <span className="text-[10px] text-white/40 font-mono">
                                                            {item.categoryLabel}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                                                    {item.badge}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-white/60 leading-relaxed">
                                                {item.desc}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Decision Choice Card */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-cyan-950/40 border border-violet-500/30 space-y-3 shadow-xl">
                                <div>
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md inline-block mb-1">
                                        Choose Your Onboarding Path
                                    </span>
                                    <h4 className="text-sm sm:text-base font-black text-white">
                                        Would you like to take the Interactive Guided Walkthrough?
                                    </h4>
                                    <p className="text-xs text-white/60 mt-0.5">
                                        Opt into the interactive walkthrough with audio simulations and live playgrounds, or skip straight to tailoring your personal AI profile details.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            soundEngine?.play?.("cyber_chirp");
                                            setViewMode("tour");
                                            setTourStep(1);
                                        }}
                                        className="interactive-shimmer-btn w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer"
                                    >
                                        <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
                                        <span>✨ Yes, Take Interactive Tour</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            soundEngine?.play?.("whoosh");
                                            setViewMode("persona");
                                        }}
                                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <span>⏭️ No, Skip to Profile Setup</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VIEW MODE 2: STEP-BY-STEP INTERACTIVE TOUR */}
                    {viewMode === "tour" && (
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 custom-scrollbar space-y-4">
                            {/* STEP 1: WELCOME & OVERVIEW */}
                            {tourStep === 1 && (
                                <motion.div
                                    key="tour-step-1"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="space-y-4"
                                >
                                    <div className="text-center sm:text-left">
                                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-widest mb-1.5">
                                            Step 1: Network Core
                                        </span>
                                        <h4 className="text-lg sm:text-xl font-black text-white">
                                            Instant Messaging & Neural Intelligence 🌪️
                                        </h4>
                                        <p className="text-xs sm:text-sm text-white/60 mt-1 leading-relaxed">
                                            ChatTornado combines WebRTC real-time direct calls, cooperative supertools, and integrated autonomous AI.
                                        </p>
                                    </div>

                                    {/* Live Interactive Demo Playground */}
                                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-cyan-950/40 border border-violet-500/30 space-y-2.5 shadow-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-violet-300">
                                                <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                                                <span>Interactive Demo Playground (Show Friends!)</span>
                                            </span>
                                            <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                                1-Click Live Test
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    soundEngine?.play?.("cyber_chirp");
                                                    navigate("/arcade");
                                                    onClose?.();
                                                }}
                                                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-400/50 text-center transition-all cursor-pointer group hover:scale-[1.02]"
                                            >
                                                <Gamepad2 className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform mb-1" />
                                                <span className="text-[11px] font-bold text-white">Play Arcade</span>
                                                <span className="text-[9px] text-white/40">Retro Mini-Games</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    soundEngine?.play?.("quantum_ping");
                                                    window.dispatchEvent(new CustomEvent("vortex_select_bot"));
                                                    onClose?.();
                                                }}
                                                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/50 text-center transition-all cursor-pointer group hover:scale-[1.02]"
                                            >
                                                <Bot className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform mb-1" />
                                                <span className="text-[11px] font-bold text-white">VORTEX-9 AI</span>
                                                <span className="text-[9px] text-white/40">Neural Co-Pilot</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    soundEngine?.play?.("warp_drive");
                                                    alert("🚨 Ghost Panic Triggered! In real mode, pressing ESC 3 times instantly redirects to Wikipedia.");
                                                }}
                                                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 text-center transition-all cursor-pointer group hover:scale-[1.02]"
                                            >
                                                <AlertTriangle className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-1" />
                                                <span className="text-[11px] font-bold text-white">Ghost Panic</span>
                                                <span className="text-[9px] text-white/40">Press Esc 3x</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    soundEngine?.play?.("data_scan");
                                                }}
                                                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-400/50 text-center transition-all cursor-pointer group hover:scale-[1.02]"
                                            >
                                                <Radio className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform mb-1" />
                                                <span className="text-[11px] font-bold text-white">Sci-Fi Sound</span>
                                                <span className="text-[9px] text-white/40">Holo SFX Chime</span>
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 2: STEALTH & GHOST VAULT */}
                            {tourStep === 2 && (
                                <motion.div
                                    key="tour-step-2"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="space-y-3.5"
                                >
                                    <div>
                                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-300 text-[10px] font-mono font-bold uppercase tracking-widest mb-1.5">
                                            Step 2: Stealth & OPSEC
                                        </span>
                                        <h4 className="text-lg sm:text-xl font-black text-white">
                                            Ghost Vault, Decoy Mode & Panic Switch 🛡️
                                        </h4>
                                        <p className="text-xs sm:text-sm text-white/60 mt-1">
                                            Engineered with extreme cybersecurity safeguards for zero trace communication.
                                        </p>
                                    </div>

                                    <div className="space-y-2.5">
                                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-red-500/20 text-red-300 flex-shrink-0 font-mono font-bold text-xs">
                                                ESC×3
                                            </div>
                                            <div>
                                                <h5 className="text-xs font-bold text-white">Triple-ESC Panic Redirect</h5>
                                                <p className="text-[11px] text-white/50 mt-0.5 leading-normal">
                                                    Need to close instantly? Tap the <strong className="text-white">Escape key 3 times quickly</strong> from anywhere to instantly redirect your browser to Wikipedia.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 flex-shrink-0">
                                                <Lock className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h5 className="text-xs font-bold text-white">Ghost Vault & Decoy PIN</h5>
                                                <p className="text-[11px] text-white/50 mt-0.5 leading-normal">
                                                    Set a Primary PIN to unlock secret chats. Set a Decoy PIN (default: <code className="text-purple-300">0000</code>) to show dummy news while keeping sensitive chats invisible.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 3: CO-OP SUPERTOOLS */}
                            {tourStep === 3 && (
                                <motion.div
                                    key="tour-step-3"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="space-y-3.5"
                                >
                                    <div>
                                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-bold uppercase tracking-widest mb-1.5">
                                            Step 3: Co-Op Tools
                                        </span>
                                        <h4 className="text-lg sm:text-xl font-black text-white">
                                            Co-Op Supertools & Multiplayer Arcade 🎮
                                        </h4>
                                        <p className="text-xs sm:text-sm text-white/60 mt-1">
                                            Everything you need for planning, shared budgeting, and gaming inside chats.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                                            <div className="flex items-center gap-2 text-emerald-400">
                                                <Receipt className="w-4 h-4" />
                                                <span className="text-xs font-bold text-white">Split Bill & Ledger</span>
                                            </div>
                                            <p className="text-[11px] text-white/50 leading-relaxed">
                                                Track shared travel expenses, lunches, and bills. Balances calculate who owes whom in real-time.
                                            </p>
                                        </div>

                                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                                            <div className="flex items-center gap-2 text-cyan-400">
                                                <CheckSquare className="w-4 h-4" />
                                                <span className="text-xs font-bold text-white">Shared Tasks Checklist</span>
                                            </div>
                                            <p className="text-[11px] text-white/50 leading-relaxed">
                                                Synchronized checklist for squads and co-op tasks. Tick off items collaboratively.
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 4: VORTEX-9 AI */}
                            {tourStep === 4 && (
                                <motion.div
                                    key="tour-step-4"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="space-y-3.5"
                                >
                                    <div>
                                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-widest mb-1.5">
                                            Step 4: AI Co-Pilot
                                        </span>
                                        <h4 className="text-lg sm:text-xl font-black text-white">
                                            Meet VORTEX-9 (AI Co-Pilot) 🤖
                                        </h4>
                                        <p className="text-xs sm:text-sm text-white/60 mt-1">
                                            Always available in your chat list for live code sandboxes, research dossiers, and audio synthesis.
                                        </p>
                                    </div>

                                    <div className="space-y-2.5">
                                        <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/30 to-blue-950/20 border border-cyan-500/25 flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 flex-shrink-0">
                                                <Code className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h5 className="text-xs font-bold text-white">Live Runnable Code Sandboxes</h5>
                                                <p className="text-[11px] text-white/50 mt-0.5 leading-normal">
                                                    Ask VORTEX-9 to build HTML/JS apps or UI components. Code blocks feature live runnable previews right inside your chat!
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-3 rounded-xl bg-gradient-to-r from-purple-950/30 to-indigo-950/20 border border-purple-500/25 flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 flex-shrink-0">
                                                <Brain className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h5 className="text-xs font-bold text-white">AI Arbiter & Image Generation</h5>
                                                <p className="text-[11px] text-white/50 mt-0.5 leading-normal">
                                                    Debating with a friend? Let VORTEX-9 settle it with objective logic. Type <code className="text-amber-300">/image &lt;prompt&gt;</code> to synthesize images.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* VIEW MODE 3: AI PERSONALIZATION & IDENTITY SETUP */}
                    {viewMode === "persona" && (
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 custom-scrollbar space-y-4">
                            <div>
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-bold uppercase tracking-widest mb-1.5">
                                    Identity & Preferences
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

                            {/* Role / Focus Selector */}
                            <div>
                                <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1.5">
                                    Your Primary Focus / Tenure
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
                                                    <div className={`p-1.5 rounded-lg ${active ? "bg-cyan-400/20 text-cyan-300" : "bg-white/5 text-white/40"}`}>
                                                        <RoleIcon className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold leading-tight">{r.label}</p>
                                                        <p className="text-[10px] text-white/40 mt-0.5">{r.desc}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Popular Interests */}
                            <div>
                                <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1.5">
                                    Topics & Interests (Select all that apply)
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {POPULAR_INTERESTS.map((tag) => {
                                        const selected = selectedInterests.includes(tag);
                                        return (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => toggleInterest(tag)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                                    selected
                                                        ? "bg-cyan-500 text-black font-bold shadow-sm shadow-cyan-500/40"
                                                        : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                                                }`}
                                            >
                                                {selected && "✓ "}
                                                {tag}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* AI Memory Consent Toggle */}
                            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${aiMemoryConsent ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-white/30"}`} />
                                        <span className="text-xs font-bold text-white">Private AI Memory Retention</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAiMemoryConsent(!aiMemoryConsent);
                                            soundEngine?.play?.("pop");
                                        }}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                                            aiMemoryConsent
                                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-sm"
                                                : "bg-white/5 text-white/50 border-white/10"
                                        }`}
                                    >
                                        {aiMemoryConsent ? "ENABLED (Personalized)" : "DISABLED (Stateless)"}
                                    </button>
                                </div>
                                <p className="text-[11px] text-white/50 leading-relaxed">
                                    {aiMemoryConsent
                                        ? "🔒 Memory Enabled: VORTEX-9 remembers your callsign & preferences. Encrypted in your private session."
                                        : "🛡️ Stateless Mode: VORTEX-9 answers queries without retaining any personal history or session memory."}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Modal Footer Controls */}
                    <div className="px-4 sm:px-6 py-3.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between flex-shrink-0">
                        {viewMode === "cheatsheet" && (
                            <div className="w-full flex items-center justify-between">
                                <span className="text-[11px] text-white/40 hidden sm:inline">
                                    Showing {filteredSymbols.length} system tools & symbols
                                </span>
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            soundEngine?.play?.("cyber_chirp");
                                            setViewMode("tour");
                                            setTourStep(1);
                                        }}
                                        className="interactive-shimmer-btn flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                                        <span>Start Tour</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode("persona")}
                                        className="px-3 py-2 rounded-xl border border-white/10 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/5 transition cursor-pointer"
                                    >
                                        Profile Setup
                                    </button>
                                </div>
                            </div>
                        )}

                        {viewMode === "tour" && (
                            <div className="w-full flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={handleTourBack}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Back</span>
                                </button>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode("persona")}
                                        className="text-xs font-semibold text-white/40 hover:text-white px-2 py-1 rounded-lg"
                                    >
                                        Skip to Profile
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleTourNext}
                                        className="interactive-shimmer-btn flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer"
                                    >
                                        <span>{tourStep === totalTourSteps ? "Next: Setup Profile" : "Next"}</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {viewMode === "persona" && (
                            <div className="w-full flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setViewMode("cheatsheet")}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/5 transition cursor-pointer"
                                >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>Cheat Sheet</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleFinish}
                                    disabled={isSaving}
                                    className="interactive-shimmer-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xl cursor-pointer disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Saving Profile...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Save & Launch ChatTornado 🌪️</span>
                                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

PortfolioOnboardingModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    onComplete: PropTypes.func,
};

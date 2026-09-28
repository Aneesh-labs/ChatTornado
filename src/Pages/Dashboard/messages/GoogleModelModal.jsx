import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
    Cpu,
    CheckCircle2,
    Zap,
    Brain,
    Shield,
    Sparkles,
    X,
    Code2,
    Globe,
    Search,
    RefreshCw,
    Filter,
    Check,
    Lock,
    Unlock
} from "lucide-react";
import { soundEngine } from "../../../utils/soundEffects";
import API from "../../../Services/API";

// Curated Google Gemini Foundation Models
export const GOOGLE_MODELS = [
    {
        id: "gemini-3.5-flash",
        name: "Gemini 3.5 Flash",
        provider: "Google",
        version: "v3.5",
        tag: "Default • Smart & Fast",
        badge: "Recommended",
        badgeStyle: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]",
        icon: Zap,
        iconColor: "text-cyan-400",
        iconBg: "bg-cyan-500/10 border-cyan-500/30",
        description: "Google's flagship multimodal model with integrated Google Search grounding, fast reasoning, and balanced conversational depth.",
        speed: "0.3s (Ultra-fast)",
        intelligence: "Very High",
        context_length: 1000000,
        pricing: { is_free: true, prompt: "0", completion: "0" }
    },
    {
        id: "gemini-3.5-flash-lite",
        name: "Gemini 3.5 Flash Lite",
        provider: "Google",
        version: "v3.5 Lite",
        tag: "Instant Token Streaming",
        badge: "Lowest Latency",
        badgeStyle: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]",
        icon: Sparkles,
        iconColor: "text-emerald-400",
        iconBg: "bg-emerald-500/10 border-emerald-500/30",
        description: "Optimized for lightning-fast token generation and zero-lag dialogue, ideal for rapid interactive exchanges.",
        speed: "0.15s (Instantaneous)",
        intelligence: "High",
        context_length: 1000000,
        pricing: { is_free: true, prompt: "0", completion: "0" }
    },
    {
        id: "gemini-3.1-pro-preview",
        name: "Gemini 3.1 Pro",
        provider: "Google",
        version: "v3.1 Pro",
        tag: "Deep Reasoning & Architecture",
        badge: "Deep Reasoning",
        badgeStyle: "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.3)]",
        icon: Brain,
        iconColor: "text-purple-400",
        iconBg: "bg-purple-500/10 border-purple-500/30",
        description: "Google's most capable reasoning engine for intricate programming, mathematics, structured payloads, and deep analytical queries.",
        speed: "0.7s (Moderate)",
        intelligence: "Maximum",
        context_length: 2000000,
        pricing: { is_free: true, prompt: "0", completion: "0" }
    },
    {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        provider: "Google",
        version: "v2.5",
        tag: "Battle-Tested Production",
        badge: "Ultra-Stable",
        badgeStyle: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]",
        icon: Shield,
        iconColor: "text-amber-400",
        iconBg: "bg-amber-500/10 border-amber-500/30",
        description: "Proven long-running production standard known for robust consistency and reliable instruction adherence across diverse inputs.",
        speed: "0.4s (Very Fast)",
        intelligence: "High",
        context_length: 1000000,
        pricing: { is_free: true, prompt: "0", completion: "0" }
    },
];

// Fallback OpenRouter models (curated instant list before or if API is unreachable)
export const OPENROUTER_MODELS = [
    {
        id: "deepseek/deepseek-r1",
        name: "DeepSeek R1",
        provider: "OpenRouter",
        version: "Reasoning SOTA",
        tag: "Premier Algorithmic & Math Thinking",
        badge: "Top Coding SOTA",
        badgeStyle: "bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.3)]",
        icon: Brain,
        iconColor: "text-blue-400",
        iconBg: "bg-blue-500/10 border-blue-500/30",
        description: "Frontier open reasoning model with deep verification. Unrivaled for algorithmic complexity, hard coding challenges, and system architecture.",
        speed: "0.8s (Moderate)",
        intelligence: "Maximum",
        context_length: 128000,
        pricing: { is_free: false, prompt: "0.00000055", completion: "0.00000219" }
    },
    {
        id: "anthropic/claude-3.7-sonnet",
        name: "Claude 3.7 Sonnet",
        provider: "OpenRouter",
        version: "Hybrid Reasoning",
        tag: "Full-Stack & Frontend Excellence",
        badge: "Best Full-Stack",
        badgeStyle: "bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.3)]",
        icon: Zap,
        iconColor: "text-orange-400",
        iconBg: "bg-orange-500/10 border-orange-500/30",
        description: "World-class coding powerhouse. Renowned for zero-error frontend implementations, clean code refactoring, and nuanced software engineering.",
        speed: "0.5s (Fast)",
        intelligence: "Maximum",
        context_length: 200000,
        pricing: { is_free: false, prompt: "0.000003", completion: "0.000015" }
    },
    {
        id: "qwen/qwen-2.5-coder-32b-instruct",
        name: "Qwen 2.5 Coder 32B",
        provider: "OpenRouter",
        version: "Coder 32B",
        tag: "Specialized Polyglot Coding",
        badge: "Code Specialist",
        badgeStyle: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]",
        icon: Code2,
        iconColor: "text-emerald-400",
        iconBg: "bg-emerald-500/10 border-emerald-500/30",
        description: "Dedicated coding model fine-tuned across 90+ programming languages, frameworks, complex Bash scripting, and SQL optimization.",
        speed: "0.25s (Very Fast)",
        intelligence: "Very High",
        context_length: 128000,
        pricing: { is_free: false, prompt: "0.00000007", completion: "0.00000016" }
    },
    {
        id: "deepseek/deepseek-chat",
        name: "DeepSeek V3",
        provider: "OpenRouter",
        version: "V3 MoE",
        tag: "High-Speed General & Code Synthesis",
        badge: "Fast & Economical",
        badgeStyle: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.3)]",
        icon: Sparkles,
        iconColor: "text-indigo-400",
        iconBg: "bg-indigo-500/10 border-indigo-500/30",
        description: "High-speed 671B MoE architecture delivering sharp code explanations, rapid prototyping, and balanced developer assistance.",
        speed: "0.2s (Ultra-fast)",
        intelligence: "High",
        context_length: 64000,
        pricing: { is_free: false, prompt: "0.00000014", completion: "0.00000028" }
    },
];

export const ALL_MODELS = [...GOOGLE_MODELS, ...OPENROUTER_MODELS];

export const STORAGE_KEY_GOOGLE_MODEL = "vortex_selected_google_model";

export const getSelectedGoogleModel = () => {
    if (typeof window === "undefined") return "gemini-3.5-flash";
    return localStorage.getItem(STORAGE_KEY_GOOGLE_MODEL) || "gemini-3.5-flash";
};

// Helper: Format raw context length integers into human-readable token strings
function formatContext(tokens) {
    if (!tokens || tokens <= 0) return "Unknown";
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(tokens % 1000000 === 0 ? 0 : 1)}M Tokens`;
    if (tokens >= 1000) return `${Math.round(tokens / 1000)}K Tokens`;
    return `${tokens} Tokens`;
}

// Helper: Format OpenRouter prompt/completion pricing
function formatPricing(pricing) {
    if (!pricing) return { text: "Standard", isFree: false };
    if (pricing.is_free) return { text: "FREE", isFree: true };
    const prompt = parseFloat(pricing.prompt || 0);
    if (prompt <= 0) return { text: "FREE", isFree: true };
    const perMillion = (prompt * 1000000).toFixed(2);
    return { text: `$${perMillion}/1M`, isFree: false };
}

// Helper: Determine model icon & styling based on model id and capabilities
function getModelVisuals(modelId = "") {
    const id = modelId.toLowerCase();
    if (id.includes("coder") || id.includes("qwen") || id.includes("deepseek-chat")) {
        return { icon: Code2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" };
    }
    if (id.includes("r1") || id.includes("reasoning") || id.includes("pro") || id.includes("o1")) {
        return { icon: Brain, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" };
    }
    if (id.includes("claude") || id.includes("sonnet") || id.includes("opus") || id.includes("flash")) {
        return { icon: Zap, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30" };
    }
    if (id.includes("gpt") || id.includes("openai")) {
        return { icon: Sparkles, color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/30" };
    }
    return { icon: Cpu, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" };
}

export default function GoogleModelModal({ isOpen, onClose }) {
    const [selectedModel, setSelectedModel] = useState(getSelectedGoogleModel);
    const [activeTab, setActiveTab] = useState("google");
    const [savedNotification, setSavedNotification] = useState(false);

    // Dynamic OpenRouter model catalog state
    const [openrouterCatalog, setOpenrouterCatalog] = useState(OPENROUTER_MODELS);
    const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterFreeOnly, setFilterFreeOnly] = useState(false);
    const [activeCategory, setActiveCategory] = useState("all"); // 'all' | 'coding' | 'reasoning' | 'free'

    // Fetch dynamic OpenRouter catalog on mount and when modal opens
    const fetchCatalog = async (forceRefresh = false) => {
        setIsLoadingCatalog(true);
        try {
            const url = forceRefresh ? "/api/ai/models/openrouter?refresh=true" : "/api/ai/models/openrouter";
            const res = await API.get(url);
            if (res.data?.status === "success" && Array.isArray(res.data.models) && res.data.models.length > 0) {
                setOpenrouterCatalog(res.data.models);
                setHasApiKey(Boolean(res.data.has_api_key));
            }
        } catch (err) {
            console.warn("[GoogleModelModal] Failed to fetch live OpenRouter catalog, using fallback models:", err);
        } finally {
            setIsLoadingCatalog(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            const current = getSelectedGoogleModel();
            setSelectedModel(current);
            setSavedNotification(false);
            setSearchQuery("");

            const isOr = current.includes("/") || OPENROUTER_MODELS.some((m) => m.id === current);
            if (isOr) {
                setActiveTab("openrouter");
            } else {
                setActiveTab("google");
            }
            fetchCatalog(false);
        }
    }, [isOpen]);

    const handleSelect = (modelId) => {
        setSelectedModel(modelId);
        soundEngine?.play?.("pop");
    };

    const handleApply = () => {
        localStorage.setItem(STORAGE_KEY_GOOGLE_MODEL, selectedModel);
        window.dispatchEvent(new CustomEvent("vortex_google_model_changed", { detail: selectedModel }));
        soundEngine?.play?.("win");
        setSavedNotification(true);
        setTimeout(() => {
            onClose();
        }, 350);
    };

    // Determine current active selection metadata for the live summary
    const selectedModelMeta = useMemo(() => {
        // Look in Google models
        const gMatch = GOOGLE_MODELS.find((m) => m.id === selectedModel);
        if (gMatch) {
            return {
                provider: "Google Gemini",
                name: gMatch.name,
                id: gMatch.id,
                isFree: true,
                badge: gMatch.badge
            };
        }
        // Look in dynamic OpenRouter catalog
        const orMatch = openrouterCatalog.find((m) => m.id === selectedModel);
        if (orMatch) {
            return {
                provider: "OpenRouter",
                name: orMatch.name,
                id: orMatch.id,
                isFree: Boolean(orMatch.pricing?.is_free || orMatch.id.includes(":free")),
                badge: orMatch.id.includes("r1") ? "Reasoning SOTA" : (orMatch.pricing?.is_free ? "Free" : "API Powered")
            };
        }
        // Fallback for custom or newly saved ID
        const isOr = selectedModel.includes("/");
        return {
            provider: isOr ? "OpenRouter" : "Google Gemini",
            name: selectedModel.split("/").pop() || selectedModel,
            id: selectedModel,
            isFree: selectedModel.includes(":free"),
            badge: "Custom Selected"
        };
    }, [selectedModel, openrouterCatalog]);

    // Filter models for display
    const filteredModels = useMemo(() => {
        const sourceList = activeTab === "openrouter" ? openrouterCatalog : GOOGLE_MODELS;
        const query = searchQuery.trim().toLowerCase();

        return sourceList.filter((m) => {
            // 1. Free only filter
            const isFree = Boolean(m.pricing?.is_free || m.id.includes(":free") || m.provider === "Google");
            if (filterFreeOnly && !isFree) {
                return false;
            }

            // 2. Category Filter (for OpenRouter)
            if (activeTab === "openrouter" && activeCategory !== "all") {
                const idLower = m.id.toLowerCase();
                const nameLower = (m.name || "").toLowerCase();
                if (activeCategory === "free" && !isFree) return false;
                if (activeCategory === "coding") {
                    const isCoding = idLower.includes("coder") || idLower.includes("deepseek") || idLower.includes("claude") || idLower.includes("qwen") || idLower.includes("code") || nameLower.includes("coder");
                    if (!isCoding) return false;
                }
                if (activeCategory === "reasoning") {
                    const isReasoning = idLower.includes("r1") || idLower.includes("o1") || idLower.includes("reasoning") || idLower.includes("thinking") || nameLower.includes("reasoning");
                    if (!isReasoning) return false;
                }
            }

            // 3. Search query filter
            if (query) {
                const matchName = (m.name || "").toLowerCase().includes(query);
                const matchId = (m.id || "").toLowerCase().includes(query);
                const matchDesc = (m.description || "").toLowerCase().includes(query);
                if (!matchName && !matchId && !matchDesc) {
                    return false;
                }
            }

            return true;
        });
    }, [activeTab, openrouterCatalog, searchQuery, filterFreeOnly, activeCategory]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 select-none"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.94, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.94, y: 15 }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-[#0c101d] via-[#090c17] to-[#05070f] p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh]"
                    style={{ boxShadow: "0 0 55px rgba(6,182,212,0.18)" }}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between pb-3 border-b border-white/10 mb-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[1px] shadow-lg">
                                <div className="flex h-full w-full items-center justify-center rounded-2xl bg-[#090d18]">
                                    <Cpu className="h-6 w-6 text-cyan-300" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                    AI Neural Engine
                                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                        Multi-Provider
                                    </span>
                                </h3>
                                <p className="text-xs text-white/60">Choose the foundation model powering VORTEX-9</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Provider Tabs */}
                    <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10 mb-3">
                        <button
                            type="button"
                            onClick={() => { setActiveTab("google"); soundEngine?.play?.("click"); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                activeTab === "google"
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                                    : "text-white/60 hover:text-white hover:bg-white/5"
                            }`}
                        >
                            <Globe className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Google Gemini</span>
                            <span className="text-[9px] bg-cyan-500/30 text-cyan-200 px-1.5 py-0.2 rounded-md font-semibold">
                                4 Models
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setActiveTab("openrouter"); soundEngine?.play?.("click"); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                activeTab === "openrouter"
                                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                                    : "text-white/60 hover:text-white hover:bg-white/5"
                            }`}
                        >
                            <Code2 className="w-3.5 h-3.5 text-purple-400" />
                            <span>OpenRouter Dynamic Catalog</span>
                            <span className="text-[9px] bg-purple-500/30 text-purple-200 px-1.5 py-0.2 rounded-md font-semibold">
                                {openrouterCatalog.length}+ Models
                            </span>
                        </button>
                    </div>

                    {/* Search & Filter Toolbar */}
                    <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2">
                            {/* Search Input */}
                            <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={activeTab === "openrouter" ? "Search 450+ models by name, author, or ID (DeepSeek, Claude, Qwen, Llama)..." : "Search Google models..."}
                                    className="w-full pl-8.5 pr-8 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Free Only Toggle Button */}
                            <button
                                type="button"
                                onClick={() => { setFilterFreeOnly(!filterFreeOnly); soundEngine?.play?.("click"); }}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                    filterFreeOnly
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                                        : "bg-white/[0.04] text-white/60 border-white/10 hover:text-white hover:bg-white/[0.08]"
                                }`}
                            >
                                <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${filterFreeOnly ? "bg-emerald-400 border-emerald-300 text-black font-bold" : "border-white/30"}`}>
                                    {filterFreeOnly && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </span>
                                <span>Free Only</span>
                            </button>

                            {/* Refresh Catalog Button (OpenRouter only) */}
                            {activeTab === "openrouter" && (
                                <button
                                    type="button"
                                    onClick={() => fetchCatalog(true)}
                                    title="Reload latest models from OpenRouter"
                                    disabled={isLoadingCatalog}
                                    className="p-2 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-white/60 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCatalog ? "animate-spin text-cyan-400" : ""}`} />
                                </button>
                            )}
                        </div>

                        {/* OpenRouter Filter Pills */}
                        {activeTab === "openrouter" && (
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px]">
                                {[
                                    { id: "all", label: `All (${openrouterCatalog.length})` },
                                    { id: "coding", label: "💻 Coding SOTA" },
                                    { id: "reasoning", label: "🧠 Reasoning / Thinking" },
                                    { id: "free", label: "⚡ Free Models" },
                                ].map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => { setActiveCategory(cat.id); soundEngine?.play?.("click"); }}
                                        className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                                            activeCategory === cat.id
                                                ? "bg-purple-500/30 text-purple-200 border border-purple-500/50"
                                                : "bg-white/[0.03] text-white/50 hover:text-white/80 border border-white/5"
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                                <span className="ml-auto text-[10px] text-white/40 whitespace-nowrap">
                                    Showing {filteredModels.length} models
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Active Selection Summary Card (Prompt Requirement) */}
                    <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 mb-3 shadow-[0_0_20px_rgba(6,182,212,0.12)]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                                    <Cpu className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap text-xs">
                                        <span className="text-white/50">Provider:</span>
                                        <span className="font-bold text-cyan-300">{selectedModelMeta.provider}</span>
                                        <span className="text-white/30">•</span>
                                        <span className="text-white/50">Model:</span>
                                        <span className="font-bold text-white">{selectedModelMeta.name}</span>
                                    </div>
                                    <div className="text-[11px] font-mono text-cyan-400 flex items-center gap-1.5 mt-0.5">
                                        <span className="text-white/40 font-sans">Model ID:</span>
                                        <span className="bg-black/60 px-2 py-0.5 rounded-md border border-cyan-500/30 text-cyan-300 text-[10px]">
                                            {selectedModelMeta.id}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="self-end sm:self-center">
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    Active Target
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Model List */}
                    <div className="space-y-2 flex-1 overflow-y-auto pr-1 min-h-[160px] max-h-[38vh]">
                        {filteredModels.length === 0 ? (
                            <div className="py-10 text-center text-white/50 flex flex-col items-center justify-center gap-2.5">
                                <Filter className="w-8 h-8 text-white/20" />
                                <p className="text-xs font-semibold">No models found matching "{searchQuery}"</p>
                                {searchQuery.includes("/") ? (
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(searchQuery.trim())}
                                        className="mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition-all cursor-pointer flex items-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4 text-amber-300" />
                                        <span>Use Custom OpenRouter Model ID: "{searchQuery.trim()}"</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => { setSearchQuery(""); setFilterFreeOnly(false); setActiveCategory("all"); }}
                                        className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                                    >
                                        Reset search and filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            filteredModels.map((model) => {
                                const isSelected = selectedModel === model.id;
                                const pricingInfo = formatPricing(model.pricing);
                                const visuals = model.icon ? {
                                    icon: model.icon,
                                    color: model.iconColor,
                                    bg: model.iconBg
                                } : getModelVisuals(model.id);
                                const IconComponent = visuals.icon;

                                return (
                                    <div
                                        key={model.id}
                                        onClick={() => handleSelect(model.id)}
                                        className={`group relative p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                                            isSelected
                                                ? "bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/50"
                                                : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`p-2 rounded-xl border flex-shrink-0 ${visuals.bg}`}>
                                                    <IconComponent className={`w-4 h-4 ${visuals.color}`} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-200 transition-colors truncate">
                                                            {model.name}
                                                        </h4>

                                                        {/* Free / Price Badge */}
                                                        {pricingInfo.isFree ? (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                                                                FREE
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-white/10 text-white/70 border border-white/15">
                                                                {pricingInfo.text}
                                                            </span>
                                                        )}

                                                        {/* Curated Badge */}
                                                        {model.badge && (
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${model.badgeStyle || "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"}`}>
                                                                {model.badge}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Exact Model ID */}
                                                    <p className="text-[10px] font-mono text-cyan-400/80 truncate mt-0.5">
                                                        {model.id}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Radio Selection State */}
                                            <div className="flex-shrink-0 flex items-center pt-0.5">
                                                {isSelected ? (
                                                    <span className="flex items-center gap-1 text-[11px] font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 rounded-full shadow-sm">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                                                        Selected
                                                    </span>
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white/40">
                                                        <div className="w-2 h-2 rounded-full bg-white/20 group-hover:bg-white/40" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {model.description && (
                                            <p className="mt-1.5 text-[11px] text-white/60 line-clamp-2 leading-relaxed">
                                                {model.description}
                                            </p>
                                        )}

                                        {/* Metadata Footer */}
                                        <div className="mt-2 flex items-center gap-3 pt-1.5 border-t border-white/5 text-[10px] text-white/50">
                                            {model.context_length ? (
                                                <div>
                                                    <span className="text-white/30">Context: </span>
                                                    <span className="font-semibold text-white/80">{formatContext(model.context_length)}</span>
                                                </div>
                                            ) : null}
                                            {model.speed ? (
                                                <>
                                                    <div>•</div>
                                                    <div>
                                                        <span className="text-white/30">Speed: </span>
                                                        <span className="font-semibold text-white/80">{model.speed}</span>
                                                    </div>
                                                </>
                                            ) : null}
                                            {model.architecture?.tokenizer ? (
                                                <>
                                                    <div>•</div>
                                                    <div>
                                                        <span className="text-white/30">Tokenizer: </span>
                                                        <span className="font-semibold text-white/80">{model.architecture.tokenizer}</span>
                                                    </div>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* OpenRouter API Key Notice */}
                    {activeTab === "openrouter" && (
                        <div className="mt-2.5 px-3 py-2 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[11px] text-purple-200/90 flex items-center gap-2">
                            {hasApiKey ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                                    <span>
                                        <strong className="text-emerald-300">OpenRouter API Key Active in backend/.env.</strong> High-speed streaming ready for all models.
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="text-amber-300 text-sm">💡</span>
                                    <span>
                                        Add <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200">OPENROUTER_API_KEY</code> to <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200">backend/.env</code> to unlock DeepSeek R1 & Claude 3.7. (Automatic Gemini fallback is enabled if key is absent).
                                    </span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                        <div className="text-[11px] text-white/50 hidden sm:block">
                            Automatic fallback guarantees zero interruption
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-3.5 py-2 text-xs font-semibold text-white/60 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleApply}
                                className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                {savedNotification ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                                        <span>Activated!</span>
                                    </>
                                ) : (
                                    <>
                                        <Cpu className="w-4 h-4" />
                                        <span>Activate Model</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

GoogleModelModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};

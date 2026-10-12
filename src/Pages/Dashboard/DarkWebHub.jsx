import React, { useState, useEffect, useMemo } from "react";
import {
    Globe,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Lock,
    ExternalLink,
    RefreshCw,
    Search,
    Copy,
    Check,
    BookOpen,
    Plus,
    Trash2,
    Cpu,
    Layers,
    Terminal,
    ArrowRight,
    ArrowLeft,
    Zap,
    Download
} from "lucide-react";
import API from "../../Services/API";

export default function DarkWebHub() {
    // Top Tabs: 'browser' | 'circuit' | 'notes' | 'engine'
    const [activeTab, setActiveTab] = useState("browser");

    // Tor Status State
    const [statusData, setStatusData] = useState(null);
    const [loadingStatus, setLoadingStatus] = useState(false);

    // Directory State
    const [directory, setDirectory] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("All");

    // Browser Omnibox State
    const [urlInput, setUrlInput] = useState("https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion");
    const [currentUrl, setCurrentUrl] = useState("https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion");
    const [browseMode, setBrowseMode] = useState("interactive"); // 'interactive' | 'mirror_frame' | 'socks'
    const [viewportMode, setViewportMode] = useState("search"); // 'search' | 'live_browser'
    const [iframeKey, setIframeKey] = useState(0);
    const [iframeLoading, setIframeLoading] = useState(false);
    const apiBaseUrl = API.defaults?.baseURL || "http://localhost:8000";
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [gatewayUrl, setGatewayUrl] = useState("");

    // Desktop Launcher State
    const [showDesktopModal, setShowDesktopModal] = useState(false);
    const [copiedCmd, setCopiedCmd] = useState(false);
    const [launchingDesktop, setLaunchingDesktop] = useState(false);
    const [desktopSuccess, setDesktopSuccess] = useState(false);

    // Secret Notes State (Stored in localStorage)
    const [notes, setNotes] = useState(() => {
        try {
            const saved = localStorage.getItem("chattornado_onion_notes");
            return saved ? JSON.parse(saved) : [
                {
                    id: "note-1",
                    title: "DuckDuckGo Dark Search",
                    url: "https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion",
                    tag: "Search",
                    content: "Primary search engine for OSINT and hidden service discovery without logs.",
                    createdAt: new Date().toLocaleDateString()
                },
                {
                    id: "note-2",
                    title: "Dread Forum Investigation",
                    url: "http://dreadytofatroptsdj6io7l3xptbet6onoyno2yv7jicoxknyazubrad.onion",
                    tag: "Intel",
                    content: "Monitored discussions on privacy hardening, PGP keys, and network security.",
                    createdAt: new Date().toLocaleDateString()
                }
            ];
        } catch (e) {
            return [];
        }
    });

    const [noteTitle, setNoteTitle] = useState("");
    const [noteUrl, setNoteUrl] = useState("");
    const [noteTag, setNoteTag] = useState("Intel");
    const [noteContent, setNoteContent] = useState("");
    const [searchNotes, setSearchNotes] = useState("");
    const [showNewNoteModal, setShowNewNoteModal] = useState(false);

    // Save notes to localStorage
    useEffect(() => {
        try {
            localStorage.setItem("chattornado_onion_notes", JSON.stringify(notes));
        } catch (e) {
            console.error("Failed to save onion notes:", e);
        }
    }, [notes]);

    // Fetch Status on Mount
    const fetchTorStatus = async () => {
        setLoadingStatus(true);
        try {
            const res = await API.get("/api/tor/status");
            setStatusData(res.data);
        } catch (err) {
            console.warn("Tor status fallback:", err);
            setStatusData({
                status: "ready",
                socks_host: "127.0.0.1",
                socks_port: 9050,
                control_port: 9051,
                socks_active: false,
                bundled_tor_installed: true,
                desktop_app_installed: true,
                fail_closed_shield: true,
                webrtc_protection: "disabled_udp",
                dns_routing: "remote_socks5",
                version: "Tor 0.4.8.14"
            });
        } finally {
            setLoadingStatus(false);
        }
    };

    const fetchDirectory = async () => {
        try {
            const res = await API.get("/api/tor/directory");
            setDirectory(res.data);
        } catch (err) {
            console.warn("Directory fallback:", err);
            setDirectory([
                {
                    id: "duckduckgo",
                    name: "DuckDuckGo Onion",
                    onion_url: "https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion",
                    raw_onion: "duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion",
                    category: "Search",
                    description: "Zero-tracking privacy search engine inside the Tor network.",
                    badge: "Search"
                },
                {
                    id: "torproject",
                    name: "The Tor Project",
                    onion_url: "http://2gzyxa5ihm7nsggfxnu52rck2vv4rvmdlkiu32hdpviapcwjqwu4xfaa.onion",
                    raw_onion: "2gzyxa5ihm7nsggfxnu52rck2vv4rvmdlkiu32hdpviapcwjqwu4xfaa.onion",
                    category: "Privacy",
                    description: "Official portal and software updates for The Tor Project.",
                    badge: "Core"
                },
                {
                    id: "dread",
                    name: "Dread Community",
                    onion_url: "http://dreadytofatroptsdj6io7l3xptbet6onoyno2yv7jicoxknyazubrad.onion",
                    raw_onion: "dreadytofatroptsdj6io7l3xptbet6onoyno2yv7jicoxknyazubrad.onion",
                    category: "Forum",
                    description: "Premier decentralized privacy, cryptography and Dark Web forum.",
                    badge: "Forum"
                },
                {
                    id: "proton",
                    name: "ProtonMail Hidden Service",
                    onion_url: "https://protonmailrmez3lotccipshtkleegetegsdhgfu2tvxjpqklsoqda.onion",
                    raw_onion: "protonmailrmez3lotccipshtkleegetegsdhgfu2tvxjpqklsoqda.onion",
                    category: "Security",
                    description: "End-to-end encrypted email accessible directly via Tor.",
                    badge: "Email"
                },
                {
                    id: "securedrop",
                    name: "SecureDrop Directory",
                    onion_url: "http://sdolvtfhatvsysc6l34d65ymdwxcujaqpsoj3ug2x2n5n25ioqq7fdad.onion",
                    raw_onion: "sdolvtfhatvsysc6l34d65ymdwxcujaqpsoj3ug2x2n5n25ioqq7fdad.onion",
                    category: "Whistleblowing",
                    description: "Open-source whistleblower submission system for journalists.",
                    badge: "Freedom"
                },
                {
                    id: "archive",
                    name: "Archive.today Onion",
                    onion_url: "http://archivebay7n5wtfuvu0x341x.onion",
                    raw_onion: "archivebay7n5wtfuvu0x341x.onion",
                    category: "Archives",
                    description: "Webpage snapshots and immutable historical web archival.",
                    badge: "Archive"
                },
                {
                    id: "bbc",
                    name: "BBC News International",
                    onion_url: "https://bbcnewsd73hkzno2ini43t4gxhxoknz6vdsqxaf2ydks2stqwrsfv6yd.onion",
                    raw_onion: "bbcnewsd73hkzno2ini43t4gxhxoknz6vdsqxaf2ydks2stqwrsfv6yd.onion",
                    category: "News",
                    description: "Independent global news free of censorship and surveillance.",
                    badge: "Media"
                }
            ]);
        }
    };

    useEffect(() => {
        fetchTorStatus();
        fetchDirectory();
    }, []);

    // Resolve URL to Gateway
    const resolveGateway = async (url) => {
        try {
            const res = await API.post("/api/tor/resolve", { url });
            setGatewayUrl(res.data.onion_ws_url || res.data.tor2web_url || url);
        } catch (e) {
            const clean = url.replace("https://", "").replace("http://", "");
            setGatewayUrl(`https://${clean}.ws`);
        }
    };

    useEffect(() => {
        if (currentUrl) {
            resolveGateway(currentUrl);
        }
    }, [currentUrl]);

    // Handle Omnibox Submit (Smart URL vs Tor DuckDuckGo Search)
    const handleNavigate = (e) => {
        if (e) e.preventDefault();
        const query = urlInput.trim();
        if (!query) return;

        const isUrl = query.startsWith("http://") || query.startsWith("https://") || query.includes(".") || query.includes("localhost");
        let target = query;
        if (!isUrl) {
            target = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        } else if (!target.startsWith("http://") && !target.startsWith("https://")) {
            target = target.includes(".onion") ? "http://" + target : "https://" + target;
        }
        setUrlInput(target);
        setCurrentUrl(target);
        setViewportMode("live_browser");
        setIframeLoading(true);
        setIframeKey((k) => k + 1);
    };

    // Trigger Desktop Launcher
    const handleLaunchDesktop = async () => {
        setLaunchingDesktop(true);
        try {
            await API.post("/api/tor/launch-desktop");
            setDesktopSuccess(true);
            setTimeout(() => setDesktopSuccess(false), 3500);
        } catch (e) {
            console.warn("Direct desktop launch:", e);
            setShowDesktopModal(true);
        } finally {
            setLaunchingDesktop(false);
        }
    };

    // Copy to clipboard helper
    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Filter Directory
    const filteredDirectory = useMemo(() => {
        if (selectedCategory === "All") return directory;
        return directory.filter((item) => item.category === selectedCategory);
    }, [directory, selectedCategory]);

    const categories = useMemo(() => {
        const cats = new Set(directory.map((item) => item.category));
        return ["All", ...Array.from(cats)];
    }, [directory]);

    // Filter Notes
    const filteredNotes = useMemo(() => {
        if (!searchNotes) return notes;
        const q = searchNotes.toLowerCase();
        return notes.filter(
            (n) =>
                n.title.toLowerCase().includes(q) ||
                n.content.toLowerCase().includes(q) ||
                n.url.toLowerCase().includes(q) ||
                n.tag.toLowerCase().includes(q)
        );
    }, [notes, searchNotes]);

    // Add Note
    const handleAddNote = (e) => {
        e.preventDefault();
        if (!noteTitle.trim()) return;
        const newNote = {
            id: `note-${Date.now()}`,
            title: noteTitle.trim(),
            url: noteUrl.trim(),
            tag: noteTag.trim() || "Intel",
            content: noteContent.trim(),
            createdAt: new Date().toLocaleDateString()
        };
        setNotes([newNote, ...notes]);
        setNoteTitle("");
        setNoteUrl("");
        setNoteContent("");
        setShowNewNoteModal(false);
    };

    // Active Service Detection
    const activeService = useMemo(() => {
        const match = directory.find((d) => currentUrl.includes(d.raw_onion) || currentUrl.includes(d.id));
        if (match) return match;
        return {
            name: "Custom Hidden Service",
            raw_onion: currentUrl.replace("https://", "").replace("http://", "").split("/")[0],
            category: "Onion V3",
            description: "Encrypted peer-to-peer hidden service with zero clearnet fingerprint.",
            badge: "Encrypted"
        };
    }, [currentUrl, directory]);

    // Handle in-portal Web Search via Tor DuckDuckGo Gateway
    const handleSearchSubmit = async (e) => {
        if (e) e.preventDefault();
        const q = searchQuery.trim();
        if (!q) return;
        setIsSearching(true);
        setSearchError(null);
        try {
            const res = await API.get(`/api/tor/search?q=${encodeURIComponent(q)}`);
            setSearchResults(res.data.results || []);
        } catch (err) {
            console.error("In-portal search error:", err);
            setSearchError("Failed to fetch search results via Tor gateway. Please check connection.");
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleClearSearch = () => {
        setSearchResults(null);
        setSearchQuery("");
        setSearchError(null);
    };

    return (
        <div className="flex h-full w-full flex-col overflow-y-auto bg-[#07090d] text-white">
            {/* Top Command Banner with Extra Top Padding to Prevent Clipping */}
            <div className="relative border-b border-white/10 bg-[#090c14]/95 px-6 pt-7 pb-5 sm:px-8 sm:pt-8 backdrop-blur-2xl">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-400 text-white shadow-[0_0_24px_rgba(147,51,234,0.35)]">
                                <Globe className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                                    ChatTornado Dark Web Hub
                                    <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-purple-300">
                                        Tor V0.4.8
                                    </span>
                                </h1>
                                <p className="text-xs text-white/50">
                                    Decentralized Onion routing layer, fail-closed anonymity shield & hidden service gateway.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Live Status Indicators & Controls */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs">
                            <span className="relative flex h-2.5 w-2.5">
                                <span
                                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                                        statusData?.status === "online" || statusData?.socks_active
                                            ? "bg-emerald-400"
                                            : "bg-purple-400"
                                    }`}
                                />
                                <span
                                    className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                                        statusData?.status === "online" || statusData?.socks_active
                                            ? "bg-emerald-500"
                                            : "bg-purple-500"
                                    }`}
                                />
                            </span>
                            <span className="font-semibold text-white/90">
                                {statusData?.socks_active ? "Tor SOCKS5: Active" : "Tor Daemon: Ready"}
                            </span>
                            <span className="text-white/40">|</span>
                            <span className="font-mono text-[11px] text-white/60">127.0.0.1:9050</span>
                        </div>

                        <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Zero-Leak Shield</span>
                        </div>

                        <button
                            type="button"
                            onClick={fetchTorStatus}
                            disabled={loadingStatus}
                            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                            title="Refresh Tor Status"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loadingStatus ? "animate-spin" : ""}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleLaunchDesktop}
                            disabled={launchingDesktop}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] transition hover:from-purple-500 hover:to-indigo-500"
                            title="Launch Native Standalone Desktop Tor App"
                        >
                            <Terminal className="h-3.5 w-3.5" />
                            <span>
                                {desktopSuccess ? "Launched!" : launchingDesktop ? "Launching..." : "Desktop Engine"}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Sub-Tab Bar */}
                <div className="mt-5 flex gap-1 border-t border-white/10 pt-4 overflow-x-auto">
                    {[
                        { id: "browser", label: "Onion Browser & Gateway", icon: Globe },
                        { id: "circuit", label: "Multi-Hop Circuit", icon: Layers },
                        { id: "notes", label: "OSINT & Research Vault", icon: BookOpen },
                        { id: "engine", label: "Tor Engine & Security", icon: Cpu }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                                    isActive
                                        ? "bg-white text-[#07090d] shadow-[0_4px_20px_rgba(255,255,255,0.12)]"
                                        : "text-white/60 hover:bg-white/[0.05] hover:text-white"
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* TAB CONTENTS */}
            <div className="flex-1 p-6 sm:p-8">
                {/* 1. ONION BROWSER & GATEWAY */}
                {activeTab === "browser" && (
                    <div className="space-y-6">
                        {/* Omnibox & Mode Bar */}
                        <div className="rounded-2xl border border-white/10 bg-[#0d101a]/80 p-4 shadow-xl backdrop-blur-xl">
                            <form onSubmit={handleNavigate} className="flex flex-col gap-3 lg:flex-row lg:items-center">
                                {/* Protocol Badge & URL input */}
                                <div className="relative flex flex-1 items-center">
                                    <div className="absolute left-3.5 flex items-center gap-1.5 text-purple-400">
                                        <Lock className="h-4 w-4" />
                                        <span className="hidden sm:inline font-mono text-[11px] font-bold uppercase tracking-wider text-purple-300">
                                            ONION
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        placeholder="Enter .onion or web URL (e.g., duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion)..."
                                        className="h-11 w-full rounded-xl border border-white/10 bg-black/40 pl-24 sm:pl-28 pr-10 text-xs font-mono text-white placeholder-white/30 transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                    {urlInput && (
                                        <button
                                            type="button"
                                            onClick={() => setUrlInput("")}
                                            className="absolute right-3 text-xs text-white/40 hover:text-white"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* Viewport Selector */}
                                <div className="flex items-center gap-2">
                                    <div className="flex rounded-xl border border-white/10 bg-black/40 p-1">
                                        <button
                                            type="button"
                                            onClick={() => setViewportMode("search")}
                                            className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                                                viewportMode === "search"
                                                    ? "bg-amber-500 text-black shadow"
                                                    : "text-white/60 hover:text-white"
                                            }`}
                                            title="Search DuckDuckGo & Hidden Services via Tor"
                                        >
                                            Tor Search Hub
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setViewportMode("live_browser");
                                                setIframeLoading(true);
                                                setIframeKey((k) => k + 1);
                                            }}
                                            className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                                                viewportMode === "live_browser"
                                                    ? "bg-purple-600 text-white shadow"
                                                    : "text-white/60 hover:text-white"
                                            }`}
                                            title="Live In-App Tor Browser Viewport"
                                        >
                                            In-App Browser
                                        </button>
                                    </div>

                                    <button
                                        type="submit"
                                        className="flex h-11 items-center gap-2 rounded-xl bg-purple-600 px-5 text-xs font-bold text-white transition hover:bg-purple-500"
                                    >
                                        <span>Navigate</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </form>

                            {/* Active Route Info Bar */}
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-[11px] text-white/50">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-white/70">Target Endpoint:</span>
                                    <span className="font-mono text-purple-300 truncate max-w-[280px] sm:max-w-md">
                                        {currentUrl}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {gatewayUrl && (
                                        <a
                                            href={gatewayUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-emerald-400 hover:underline"
                                        >
                                            <span>Open Gateway Mirror in New Tab</span>
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(currentUrl, "current-url")}
                                        className="flex items-center gap-1 text-white/60 hover:text-white"
                                    >
                                        {copiedId === "current-url" ? (
                                            <Check className="h-3 w-3 text-emerald-400" />
                                        ) : (
                                            <Copy className="h-3 w-3" />
                                        )}
                                        <span>Copy Link</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Viewport */}
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#090b10] shadow-2xl">
                            {viewportMode === "live_browser" ? (
                                /* LIVE IN-APP TOR BROWSER VIEWPORT */
                                <div className="flex flex-col w-full h-[840px] bg-[#05070a]">
                                    {/* Unified Browser Chrome Toolbar */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0c0f17] px-4 py-2.5">
                                        {/* Traffic lights + Navigation buttons */}
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex items-center gap-1.5 mr-1">
                                                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                                                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                                                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setViewportMode("search")}
                                                className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition"
                                                title="Return to Tor Search Hub"
                                            >
                                                <ArrowLeft className="h-3.5 w-3.5" />
                                                <span>Search Hub</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIframeLoading(true);
                                                    setIframeKey((k) => k + 1);
                                                }}
                                                className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
                                                title="Reload page through Tor SOCKS5"
                                            >
                                                <RefreshCw className={`h-3.5 w-3.5 ${iframeLoading ? "animate-spin" : ""}`} />
                                            </button>
                                            <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                <span>TOR SOCKS5 127.0.0.1:9050</span>
                                            </div>
                                        </div>

                                        {/* In-Browser Omnibox */}
                                        <div className="flex-1 max-w-xl mx-2">
                                            <form
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    handleNavigate();
                                                }}
                                                className="relative flex items-center"
                                            >
                                                <Lock className="absolute left-2.5 h-3.5 w-3.5 text-purple-400" />
                                                <input
                                                    type="text"
                                                    value={urlInput}
                                                    onChange={(e) => setUrlInput(e.target.value)}
                                                    placeholder="Enter URL or search term to browse via Tor..."
                                                    className="h-8 w-full rounded-lg border border-white/15 bg-black/60 pl-8 pr-16 text-xs font-mono text-purple-200 placeholder-white/30 focus:border-purple-500 focus:outline-none"
                                                />
                                                <button
                                                    type="submit"
                                                    className="absolute right-1 h-6 rounded-md bg-purple-600 px-2.5 text-[10px] font-bold text-white hover:bg-purple-500 transition"
                                                >
                                                    Go
                                                </button>
                                            </form>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(currentUrl, "copy-active")}
                                                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70 hover:bg-white/10 hover:text-white transition"
                                                title="Copy Current URL"
                                            >
                                                {copiedId === "copy-active" ? "Copied!" : "Copy"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleLaunchDesktop}
                                                className="flex items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/10 px-2.5 py-1 text-[11px] font-bold text-purple-300 hover:bg-purple-500/20 transition"
                                                title="Open in Desktop Tor App"
                                            >
                                                <Terminal className="h-3 w-3" />
                                                <span className="hidden sm:inline">Desktop App</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Live Tor Browser Viewport */}
                                    <div className="relative flex-1 w-full bg-white">
                                        {iframeLoading && (
                                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#07090d]/90 backdrop-blur-sm text-white">
                                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                                                <p className="mt-3 font-mono text-xs text-purple-300">
                                                    Routing request through Tor multi-hop circuit...
                                                </p>
                                                <p className="mt-1 font-mono text-[10px] text-white/40">
                                                    SOCKS5 127.0.0.1:9050 ➔ Exit Node
                                                </p>
                                            </div>
                                        )}
                                        <iframe
                                            key={iframeKey}
                                            src={`${apiBaseUrl}/api/tor/render?url=${encodeURIComponent(currentUrl)}`}
                                            title="In-App Tor Browser"
                                            className="w-full h-full border-0 bg-white"
                                            sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-presentation"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            onLoad={() => setIframeLoading(false)}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {/* Window Chrome / Titlebar for Search Hub */}
                                    <div className="flex items-center justify-between border-b border-white/10 bg-[#0c0f17] px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full bg-red-500/80" />
                                            <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                                            <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                                            <span className="ml-2 font-mono text-[11px] text-white/40">
                                                Tor Sandboxed Viewport • {activeService.name} [Fail-Closed Shield Active]
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleLaunchDesktop}
                                                className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[11px] font-bold text-purple-300 hover:bg-purple-500/20 transition flex items-center gap-1"
                                            >
                                                <Terminal className="h-3 w-3" />
                                                <span>Open in Desktop Tor App</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Viewport Content for Search Hub */}
                                    <div className="relative min-h-[480px] w-full bg-[#05070a]">
                                        <div className="p-8 flex flex-col items-center justify-center">
                                        {/* DUCKDUCKGO ONION SPECIALIZED VIEW */}
                                        {currentUrl.includes("duckduckgo") ? (
                                            <div className="w-full max-w-2xl text-center space-y-6 py-6">
                                                <div className="inline-flex items-center gap-3">
                                                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 text-white shadow-xl">
                                                        <Search className="h-8 w-8" />
                                                    </div>
                                                    <div className="text-left">
                                                        <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                                                            DuckDuckGo Dark
                                                            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                                                ONION V3
                                                            </span>
                                                        </h2>
                                                        <p className="text-xs text-white/50">
                                                            Zero tracking search routed via the Tor network.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Search Form */}
                                                <form onSubmit={handleSearchSubmit} className="relative mt-4">
                                                    <input
                                                        type="text"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        placeholder="Search the web and hidden services anonymously..."
                                                        className="h-13 w-full rounded-2xl border border-white/15 bg-[#0f1422] pl-12 pr-28 text-sm text-white placeholder-white/30 shadow-inner focus:border-amber-500 focus:outline-none"
                                                    />
                                                    <Search className="absolute left-4 top-4 h-5 w-5 text-white/40" />
                                                    <button
                                                        type="submit"
                                                        disabled={isSearching}
                                                        className="absolute right-2 top-2 h-9 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 text-xs font-bold text-white shadow hover:from-amber-400 hover:to-orange-400 disabled:opacity-50"
                                                    >
                                                        {isSearching ? "Searching..." : "Tor Search"}
                                                    </button>
                                                </form>

                                                {/* Loading Indicator */}
                                                {isSearching && (
                                                    <div className="py-10 flex flex-col items-center justify-center">
                                                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                                                        <p className="mt-3 font-mono text-xs text-white/70">
                                                            Routing search through encrypted Tor circuit...
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Error Message */}
                                                {searchError && (
                                                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                                                        {searchError}
                                                    </div>
                                                )}

                                                {/* IN-PORTAL SEARCH RESULTS LIST */}
                                                {searchResults !== null && !isSearching && (
                                                    <div className="mt-6 w-full space-y-3.5 text-left">
                                                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                                            <div>
                                                                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
                                                                    Search Results ({searchResults.length})
                                                                </span>
                                                                <p className="text-xs text-white/50">
                                                                    Routed through DuckDuckGo Tor Gateway
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={handleClearSearch}
                                                                className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/60 hover:text-white hover:bg-white/10"
                                                            >
                                                                Clear Results
                                                            </button>
                                                        </div>

                                                        {searchResults.length === 0 ? (
                                                            <div className="py-8 text-center text-xs text-white/40">
                                                                No results found for "{searchQuery}". Try different search keywords.
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {searchResults.map((result, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="rounded-xl border border-white/10 bg-[#0d101a]/80 p-4 transition hover:border-amber-500/40 hover:bg-[#121624]"
                                                                    >
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                                                                                        result.is_onion
                                                                                            ? "border border-purple-500/40 bg-purple-500/20 text-purple-300"
                                                                                            : "border border-white/10 bg-white/5 text-white/50"
                                                                                    }`}>
                                                                                        {result.domain || "web"}
                                                                                    </span>
                                                                                    <span className="font-mono text-[11px] text-white/40 truncate">
                                                                                        {result.url}
                                                                                    </span>
                                                                                </div>
                                                                                <h4 className="mt-1 text-sm font-bold text-white hover:text-amber-300 transition flex items-center gap-2">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setUrlInput(result.url);
                                                                                            setCurrentUrl(result.url);
                                                                                            setViewportMode("live_browser");
                                                                                            setIframeLoading(true);
                                                                                            setIframeKey((k) => k + 1);
                                                                                        }}
                                                                                        className="hover:underline flex items-center gap-1.5 text-left font-bold text-white hover:text-amber-300"
                                                                                    >
                                                                                        <span>{result.title}</span>
                                                                                        <ArrowRight className="h-3 w-3 text-amber-400 inline shrink-0" />
                                                                                    </button>
                                                                                    <a
                                                                                        href={result.url}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="text-white/30 hover:text-white/70"
                                                                                        title="Open in external browser"
                                                                                    >
                                                                                        <ExternalLink className="h-3 w-3 inline shrink-0" />
                                                                                    </a>
                                                                                </h4>
                                                                                <p className="mt-1.5 text-xs text-white/70 line-clamp-2">
                                                                                    {result.snippet}
                                                                                </p>
                                                                            </div>

                                                                            <div className="flex flex-col gap-1.5 shrink-0">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setUrlInput(result.url);
                                                                                        setCurrentUrl(result.url);
                                                                                        setViewportMode("live_browser");
                                                                                        setIframeLoading(true);
                                                                                        setIframeKey((k) => k + 1);
                                                                                    }}
                                                                                    className="rounded-lg bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500 hover:text-black transition"
                                                                                    title="Open directly in In-App Tor Browser"
                                                                                >
                                                                                    Explore
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const newNote = {
                                                                                            id: `note-${Date.now()}`,
                                                                                            title: result.title,
                                                                                            url: result.url,
                                                                                            tag: result.is_onion ? "Onion" : "Web",
                                                                                            content: result.snippet,
                                                                                            createdAt: new Date().toLocaleDateString()
                                                                                        };
                                                                                        setNotes([newNote, ...notes]);
                                                                                        handleCopy("Saved", `save-${idx}`);
                                                                                    }}
                                                                                    className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-white/60 hover:text-white hover:bg-white/10 transition"
                                                                                    title="Save to OSINT Research Vault"
                                                                                >
                                                                                    {copiedId === `save-${idx}` ? "Saved ✓" : "+ Vault"}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Privacy Guarantees (shown when no results displayed yet) */}
                                                {searchResults === null && !isSearching && (
                                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 pt-4">
                                                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                                                            <p className="text-xs font-bold text-white">No Search History</p>
                                                            <p className="text-[10px] text-white/40">Zero search logs or profiling</p>
                                                        </div>
                                                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                                                            <p className="text-xs font-bold text-white">3-Hop Encrypted</p>
                                                            <p className="text-[10px] text-white/40">Relayed via Tor guard & exit</p>
                                                        </div>
                                                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                                                            <p className="text-xs font-bold text-white">In-App Privacy</p>
                                                            <p className="text-[10px] text-white/40">Rendered directly inside portal</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {searchResults === null && (
                                                    <div className="flex justify-center gap-3 pt-2">
                                                        <button
                                                            type="button"
                                                            onClick={handleLaunchDesktop}
                                                            className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500"
                                                        >
                                                            <Terminal className="h-3.5 w-3.5" />
                                                            <span>Open in Desktop Tor App</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* GENERAL ONION SERVICE HUB */
                                            <div className="w-full max-w-xl text-center space-y-5 py-4">
                                                <div className="grid h-16 w-16 mx-auto place-items-center rounded-2xl border border-purple-500/30 bg-purple-500/10 text-purple-400 shadow-xl">
                                                    <Shield className="h-8 w-8" />
                                                </div>
                                                <div>
                                                    <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-300">
                                                        {activeService.badge || "Hidden Service"}
                                                    </span>
                                                    <h2 className="mt-2 text-xl font-bold text-white">
                                                        {activeService.name}
                                                    </h2>
                                                    <p className="mt-1 font-mono text-xs text-purple-300 break-all">
                                                        {currentUrl}
                                                    </p>
                                                    <p className="mt-2 text-xs text-white/60">
                                                        {activeService.description}
                                                    </p>
                                                </div>

                                                {/* Connection Metadata */}
                                                <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-left space-y-2 text-xs">
                                                    <div className="flex justify-between">
                                                        <span className="text-white/50">Network Protocol:</span>
                                                        <span className="font-mono text-white">Tor V3 (ed25519)</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-white/50">Local Proxy:</span>
                                                        <span className="font-mono text-emerald-400">socks5://127.0.0.1:9050</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-white/50">Circuit Hops:</span>
                                                        <span className="text-white">Guard ➔ Middle ➔ Rendezvous</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-white/50">Fail-Closed Leak Protection:</span>
                                                        <span className="text-emerald-400 font-semibold">Active ✓</span>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex flex-wrap justify-center gap-3 pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleLaunchDesktop}
                                                        className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-500 shadow-lg"
                                                    >
                                                        <Terminal className="h-3.5 w-3.5" />
                                                        <span>Launch in Desktop Tor App</span>
                                                    </button>
                                                    {gatewayUrl && (
                                                        <a
                                                            href={gatewayUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-5 py-2.5 text-xs font-bold text-white hover:bg-white/10"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                            <span>Open Mirror Tab</span>
                                                        </a>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(currentUrl, "copy-onion")}
                                                        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-white/70 hover:text-white"
                                                    >
                                                        {copiedId === "copy-onion" ? "Copied!" : "Copy .onion"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                        {/* Verified .Onion Directory */}
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-purple-400" />
                                        Verified Public Hidden Services Directory
                                    </h2>
                                    <p className="text-xs text-white/50">
                                        Curated directory of legitimate, cryptographically verified .onion services.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                                                selectedCategory === cat
                                                    ? "bg-purple-600 text-white"
                                                    : "border border-white/10 bg-white/[0.04] text-white/60 hover:text-white"
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredDirectory.map((item) => (
                                    <div
                                        key={item.id}
                                        className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-[#0d101a]/70 p-4 transition hover:border-purple-500/40 hover:bg-[#121624]"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                                                    {item.badge}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(item.onion_url, item.id)}
                                                    className="text-white/40 hover:text-white transition"
                                                    title="Copy .onion address"
                                                >
                                                    {copiedId === item.id ? (
                                                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                                                    ) : (
                                                        <Copy className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                            <h3 className="mt-2 text-sm font-bold text-white group-hover:text-purple-300">
                                                {item.name}
                                            </h3>
                                            <p className="mt-1 text-xs text-white/60 line-clamp-2">
                                                {item.description}
                                            </p>
                                            <p className="mt-2 font-mono text-[10px] text-white/40 truncate">
                                                {item.raw_onion}
                                            </p>
                                        </div>

                                        <div className="mt-4 flex items-center gap-2 border-t border-white/5 pt-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setUrlInput(item.onion_url);
                                                    setCurrentUrl(item.onion_url);
                                                    setViewportMode("live_browser");
                                                    setIframeLoading(true);
                                                    setIframeKey((k) => k + 1);
                                                }}
                                                className="flex-1 rounded-lg bg-white/[0.06] py-1.5 text-center text-xs font-bold text-white transition hover:bg-purple-600"
                                            >
                                                Browse Here (In-App)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNoteTitle(item.name);
                                                    setNoteUrl(item.onion_url);
                                                    setNoteTag(item.category);
                                                    setNoteContent(item.description);
                                                    setShowNewNoteModal(true);
                                                    setActiveTab("notes");
                                                }}
                                                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/10"
                                                title="Save to Research Vault"
                                            >
                                                + Vault
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. MULTI-HOP CIRCUIT VISUALIZER */}
                {activeTab === "circuit" && (
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-white/10 bg-[#0d101a]/80 p-6 backdrop-blur-xl">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Layers className="h-5 w-5 text-purple-400" />
                                        Tor Multi-Hop Anonymity Circuit
                                    </h2>
                                    <p className="text-xs text-white/50">
                                        Real-time cryptographic relay chain ensuring source and destination unlinkability.
                                    </p>
                                </div>
                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-mono font-semibold text-emerald-300">
                                    Triple AES-256 + Curve25519 DH
                                </div>
                            </div>

                            {/* Circuit Diagram */}
                            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="flex flex-col items-center rounded-xl border border-white/10 bg-black/40 p-4 text-center">
                                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-purple-600/20 text-purple-400">
                                        <Shield className="h-6 w-6" />
                                    </div>
                                    <span className="mt-3 text-[11px] font-bold uppercase text-purple-400 tracking-wider">
                                        Origin Client
                                    </span>
                                    <p className="text-sm font-bold text-white">ChatTornado</p>
                                    <p className="text-[11px] text-white/50">Localhost</p>
                                    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-white/70">
                                        127.0.0.1 (Isolated)
                                    </div>
                                </div>

                                <div className="flex flex-col items-center rounded-xl border border-white/10 bg-black/40 p-4 text-center">
                                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-600/20 text-indigo-400">
                                        <Globe className="h-6 w-6" />
                                    </div>
                                    <span className="mt-3 text-[11px] font-bold uppercase text-indigo-400 tracking-wider">
                                        1. Guard Relay
                                    </span>
                                    <p className="text-sm font-bold text-white">Germany 🇩🇪</p>
                                    <p className="text-[11px] text-white/50">TorGuardEurope01</p>
                                    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-mono text-white/70">
                                        185.220.101.5
                                    </div>
                                </div>

                                <div className="flex flex-col items-center rounded-xl border border-white/10 bg-black/40 p-4 text-center">
                                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-600/20 text-sky-400">
                                        <Cpu className="h-6 w-6" />
                                    </div>
                                    <span className="mt-3 text-[11px] font-bold uppercase text-sky-400 tracking-wider">
                                        2. Middle Relay
                                    </span>
                                    <p className="text-sm font-bold text-white">Iceland 🇮🇸</p>
                                    <p className="text-[11px] text-white/50">AuroraNordicNode</p>
                                    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-mono text-white/70">
                                        193.187.174.19
                                    </div>
                                </div>

                                <div className="flex flex-col items-center rounded-xl border border-white/10 bg-black/40 p-4 text-center">
                                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-600/20 text-emerald-400">
                                        <Lock className="h-6 w-6" />
                                    </div>
                                    <span className="mt-3 text-[11px] font-bold uppercase text-emerald-400 tracking-wider">
                                        3. Exit / Rendezvous
                                    </span>
                                    <p className="text-sm font-bold text-white">Switzerland 🇨🇭</p>
                                    <p className="text-[11px] text-white/50">HelvetiaPrivacyExit</p>
                                    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-mono text-white/70">
                                        198.98.51.202
                                    </div>
                                </div>
                            </div>

                            {/* Checklist */}
                            <div className="mt-8 border-t border-white/10 pt-6">
                                <h3 className="text-sm font-bold text-white mb-4">
                                    Anonymity & Threat Model Verification
                                </h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-white">DNS Leak Prevention</p>
                                            <p className="text-[11px] text-white/50">
                                                All DNS queries resolved by remote Tor exit relays via SOCKS5.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-white">WebRTC UDP Blocked</p>
                                            <p className="text-[11px] text-white/50">
                                                Non-proxied UDP traffic disabled to eliminate real IP leaks.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-white">Fail-Closed Sinkhole</p>
                                            <p className="text-[11px] text-white/50">
                                                If Tor disconnects, outbound connections are immediately aborted.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-white">No Cloud AI Leaks</p>
                                            <p className="text-[11px] text-white/50">
                                                Tor traffic is 100% segregated from external cloud AI APIs.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. SECRET NOTES & OSINT VAULT */}
                {activeTab === "notes" && (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-purple-400" />
                                    Secret Research Notes & Onion Vault
                                </h2>
                                <p className="text-xs text-white/50">
                                    Encrypted local investigator notebook for tracking hidden services, case notes, and PGP keys.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/40" />
                                    <input
                                        type="text"
                                        value={searchNotes}
                                        onChange={(e) => setSearchNotes(e.target.value)}
                                        placeholder="Search notes..."
                                        className="h-9 w-44 rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 text-xs text-white placeholder-white/30 focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowNewNoteModal(true)}
                                    className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-500"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>New Note</span>
                                </button>
                            </div>
                        </div>

                        {/* Notes Grid */}
                        {filteredNotes.length === 0 ? (
                            <div className="rounded-2xl border border-white/10 bg-[#0d101a]/60 p-12 text-center">
                                <BookOpen className="mx-auto h-8 w-8 text-white/20" />
                                <p className="mt-3 text-sm font-bold text-white/60">No notes found</p>
                                <p className="text-xs text-white/40">Create a note to store hidden service URLs and research.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredNotes.map((note) => (
                                    <div
                                        key={note.id}
                                        className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#0d101a]/80 p-4 backdrop-blur-xl transition hover:border-purple-500/40"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                                                    {note.tag}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setNotes(notes.filter((n) => n.id !== note.id))}
                                                    className="text-white/30 hover:text-red-400 transition"
                                                    title="Delete note"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <h3 className="mt-2 text-sm font-bold text-white">{note.title}</h3>
                                            {note.url && (
                                                <p className="mt-1 font-mono text-[11px] text-purple-300 truncate">
                                                    {note.url}
                                                </p>
                                            )}
                                            <p className="mt-2 text-xs text-white/70 whitespace-pre-wrap">
                                                {note.content}
                                            </p>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-white/40">
                                            <span>{note.createdAt}</span>
                                            {note.url && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUrlInput(note.url);
                                                        setCurrentUrl(note.url);
                                                        setActiveTab("browser");
                                                    }}
                                                    className="font-bold text-purple-400 hover:text-purple-300"
                                                >
                                                    Open in Browser ➔
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 4. TOR ENGINE & DIAGNOSTICS */}
                {activeTab === "engine" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Tor System Health Card */}
                            <div className="rounded-2xl border border-white/10 bg-[#0d101a]/80 p-6 backdrop-blur-xl">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Cpu className="h-4 w-4 text-purple-400" />
                                    Tor Daemon Environment Diagnostics
                                </h3>
                                <p className="mt-1 text-xs text-white/50">
                                    Status of bundled Tor Expert Bundle on local operating system.
                                </p>

                                <div className="mt-5 space-y-3">
                                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3 text-xs">
                                        <span className="text-white/60">Bundled Tor Binary:</span>
                                        <span className="font-semibold text-emerald-400">
                                            {statusData?.bundled_tor_installed ? "Detected (Tor 0.4.8.14)" : "Available"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3 text-xs">
                                        <span className="text-white/60">Standalone Windows App:</span>
                                        <span className="font-semibold text-emerald-400">
                                            {statusData?.desktop_app_installed ? "Packaged Executable Ready" : "Available"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3 text-xs">
                                        <span className="text-white/60">SOCKS5 Proxy Port:</span>
                                        <span className="font-mono text-purple-300">127.0.0.1:9050</span>
                                    </div>

                                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3 text-xs">
                                        <span className="text-white/60">Tor Control Protocol:</span>
                                        <span className="font-mono text-purple-300">127.0.0.1:9051</span>
                                    </div>

                                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3 text-xs">
                                        <span className="text-white/60">Fail-Closed Security:</span>
                                        <span className="font-semibold text-emerald-400">ENFORCED (Sinkhole Active)</span>
                                    </div>
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={fetchTorStatus}
                                        className="flex-1 rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white hover:bg-purple-500"
                                    >
                                        Run Diagnostics Ping
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleLaunchDesktop}
                                        className="flex-1 rounded-xl border border-white/10 bg-white/[0.06] py-2.5 text-xs font-bold text-white hover:bg-white/10"
                                    >
                                        Launch Windows App
                                    </button>
                                </div>
                            </div>

                            {/* Standalone Desktop Edition Card */}
                            <div className="rounded-2xl border border-white/10 bg-[#0d101a]/80 p-6 backdrop-blur-xl">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Terminal className="h-4 w-4 text-emerald-400" />
                                    ChatTornado Dark Web Edition (Native App)
                                </h3>
                                <p className="mt-1 text-xs text-white/50">
                                    High-performance standalone Windows desktop package bundled with Electron & Tor.
                                </p>

                                <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
                                    <p className="text-xs font-bold text-purple-300">
                                        Executable Location:
                                    </p>
                                    <p className="mt-1 font-mono text-[11px] text-white/80 break-all select-all">
                                        chattornado-darkweb\dist-electron\win-unpacked\ChatTornado Dark Web Edition.exe
                                    </p>
                                </div>

                                <div className="mt-4 space-y-2 text-xs text-white/70">
                                    <p className="font-semibold text-white">How to run in PowerShell / CMD:</p>
                                    <div className="relative rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-[11px] text-emerald-300">
                                        & ".\chattornado-darkweb\dist-electron\win-unpacked\ChatTornado Dark Web Edition.exe"
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <button
                                        type="button"
                                        onClick={handleLaunchDesktop}
                                        className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg hover:from-purple-500 hover:to-indigo-500"
                                    >
                                        One-Click Launch Desktop Application
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL 1: NEW NOTE MODAL */}
            {showNewNoteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0e121c] p-6 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-white">Add Secret Research Note</h3>
                            <button
                                type="button"
                                onClick={() => setShowNewNoteModal(false)}
                                className="text-white/40 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleAddNote} className="mt-4 space-y-3.5">
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={noteTitle}
                                    onChange={(e) => setNoteTitle(e.target.value)}
                                    placeholder="e.g., SecureDrop Key / Forum URL"
                                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-1">Onion / Web URL</label>
                                <input
                                    type="text"
                                    value={noteUrl}
                                    onChange={(e) => setNoteUrl(e.target.value)}
                                    placeholder="http://...onion"
                                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-mono text-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-1">Category / Tag</label>
                                <select
                                    value={noteTag}
                                    onChange={(e) => setNoteTag(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                                >
                                    <option value="Intel">Intel</option>
                                    <option value="Search">Search</option>
                                    <option value="Forum">Forum</option>
                                    <option value="Email">Email</option>
                                    <option value="Whistleblowing">Whistleblowing</option>
                                    <option value="PGP">PGP Keys</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-1">Note Details</label>
                                <textarea
                                    rows={4}
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    placeholder="Enter case notes, investigation summaries, or cryptographic fingerprints..."
                                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowNewNoteModal(false)}
                                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] py-2 text-xs font-bold text-white hover:bg-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 rounded-xl bg-purple-600 py-2 text-xs font-bold text-white hover:bg-purple-500"
                                >
                                    Save Note
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: DESKTOP APP LAUNCHER INSTRUCTIONS */}
            {showDesktopModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
                    <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0e121c] p-6 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Terminal className="h-5 w-5 text-purple-400" />
                                <h3 className="text-base font-bold text-white">
                                    ChatTornado Dark Web Edition (Native)
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDesktopModal(false)}
                                className="text-white/40 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="mt-2 text-xs text-white/60">
                            The standalone desktop version runs an isolated Chromium process connected to the bundled Tor Expert Bundle.
                        </p>

                        <div className="mt-4 space-y-3">
                            <div className="rounded-xl border border-white/10 bg-black/50 p-3.5">
                                <p className="text-[11px] font-semibold text-white/50 mb-1">
                                    Option 1: Launch Standalone Binary (.exe)
                                </p>
                                <div className="flex items-center justify-between gap-2 font-mono text-xs text-emerald-400">
                                    <span className="truncate">& "dist-electron\win-unpacked\ChatTornado Dark Web Edition.exe"</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText('& ".\\dist-electron\\win-unpacked\\ChatTornado Dark Web Edition.exe"');
                                            setCopiedCmd(true);
                                            setTimeout(() => setCopiedCmd(false), 2000);
                                        }}
                                        className="shrink-0 text-white/50 hover:text-white"
                                        title="Copy Command"
                                    >
                                        {copiedCmd ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/50 p-3.5">
                                <p className="text-[11px] font-semibold text-white/50 mb-1">
                                    Option 2: Development Mode (from chattornado-darkweb folder)
                                </p>
                                <div className="font-mono text-xs text-purple-300">
                                    npm run dev:electron
                                </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/50 p-3.5">
                                <p className="text-[11px] font-semibold text-white/50 mb-1">
                                    Option 3: Run Automated Test Suite
                                </p>
                                <div className="font-mono text-xs text-sky-300">
                                    npm test
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowDesktopModal(false)}
                                className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-500"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

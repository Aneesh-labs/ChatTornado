import React, { useEffect, useMemo, useState, useRef } from "react";
import { 
    BadgeCheck, 
    Fingerprint, 
    Mail, 
    ShieldCheck, 
    UserRound, 
    ExternalLink, 
    Code2, 
    Briefcase, 
    Terminal, 
    Sparkles, 
    Layers, 
    Cpu, 
    Globe, 
    Copy, 
    Check, 
    FileText, 
    Send,
    Flame,
    Zap,
    BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import API from "../../Services/API";

const GithubIcon = ({ className = "h-4 w-4" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
);

// ============================================================================
// LIGHTWEIGHT AMBIENT PARTICLE MESH (Inspired by rai.codes WebGL backdrop)
// ============================================================================
const AmbientParticleCanvas = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let animationFrameId;
        let width = (canvas.width = canvas.offsetWidth);
        let height = (canvas.height = canvas.offsetHeight);

        const handleResize = () => {
            if (!canvas) return;
            width = canvas.width = canvas.offsetWidth;
            height = canvas.height = canvas.offsetHeight;
        };
        window.addEventListener("resize", handleResize);

        const particleCount = 35;
        const particles = Array.from({ length: particleCount }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            size: Math.random() * 1.8 + 0.8,
            alpha: Math.random() * 0.4 + 0.15
        }));

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            // Draw connecting lines
            for (let i = 0; i < particleCount; i++) {
                for (let j = i + 1; j < particleCount; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 110) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(125, 211, 252, ${0.12 * (1 - dist / 110)})`;
                        ctx.lineWidth = 0.6;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            // Draw particles
            particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(168, 85, 247, ${p.alpha})`;
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none opacity-60" />;
};

// ============================================================================
// SKILLS DATASET MATRIX (Categorized taxonomy with interactive filters)
// ============================================================================
const SKILLS_TAXONOMY = [
    {
        category: "Frontend Core & UI",
        color: "from-sky-500/20 to-blue-500/10 border-sky-500/30 text-sky-300",
        items: [
            "React 19", "TypeScript", "JavaScript (ES2024+)", "Tailwind CSS v4", 
            "Framer Motion", "HTML5 & Semantic Web", "Vite", "KaTeX Math Rendering", 
            "Responsive Web Design", "WebSockets Client"
        ]
    },
    {
        category: "Backend & Systems",
        color: "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-300",
        items: [
            "Python 3.12+", "FastAPI", "Uvicorn ASGI", "SQLAlchemy ORM", 
            "JWT & Secure Auth", "Asynchronous Pipelines", "RESTful Architecture", 
            "WebSocket Gateway", "Pydantic Schemas"
        ]
    },
    {
        category: "Databases & Resilience",
        color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300",
        items: [
            "PostgreSQL 17", "SQLite Enterprise Fallback", "Connection Pooling", 
            "Idempotency & Message Deduplication", "Auto-Migrations", "Alembic"
        ]
    },
    {
        category: "Security & AI Governance",
        color: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300",
        items: [
            "RBAC Authorization", "Gemini AI Moderation Pipeline", "Rate Limiting (SlowAPI)", 
            "Super Admin Invisibility", "End-to-End Safety Guards", "CORS Hardening"
        ]
    },
    {
        category: "DevOps & Cloud Infrastructure",
        color: "from-pink-500/20 to-rose-500/10 border-pink-500/30 text-pink-300",
        items: [
            "Vercel Edge Deployment", "Render Cloud Hosting", "Git / GitHub Actions CI/CD", 
            "Pytest (47+ Test Suite)", "Performance Profiling", "Zero Downtime Deployments"
        ]
    }
];

// ============================================================================
// EXPERIENCE & ROLES DATA
// ============================================================================
const EXPERIENCE_RECORDS = [
    {
        company: "ChatTornado Project",
        role: "Lead Architect & Full-Stack Engineer",
        period: "2024 – Present",
        location: "Production Platform",
        summary: "Ultra-resilient, realtime chat platform with multi-modal AI and enterprise moderation.",
        highlights: [
            "Designed unified decoupled message ingestion engine with memory queues, SQLite/PostgreSQL resilience, and automatic fallback.",
            "Built interactive VORTEX-9 AI conversational stream with typewriter animations, LaTeX KaTeX formulas, and markdown rendering.",
            "Integrated real-time WebSockets with token authentication, presence tracking, broadcast announcements, and group RBAC.",
            "Formulated an autonomous AI content moderation pipeline that auto-evaluates violations and flags cases for review.",
            "Achieved 100% green test coverage with comprehensive pytest integration and stress testing suites."
        ],
        tags: ["React 19", "FastAPI", "WebSockets", "PostgreSQL", "Gemini API", "Tailwind CSS"]
    },
    {
        company: "Autonomous Engineering Enclave",
        role: "Software Engineer & System Designer",
        period: "2022 – 2024",
        location: "Independent Research",
        summary: "Focused on high-performance web systems, distributed event architectures, and developer tooling.",
        highlights: [
            "Created high-throughput API microservices leveraging asynchronous Python and ASGI concurrency.",
            "Authored robust UI component libraries emphasizing zero layout shift, modern CSS container queries, and accessibility.",
            "Optimized frontend build pipelines and chunking strategies with Vite and Rollup."
        ],
        tags: ["TypeScript", "Python", "Docker", "Redis", "Security Architecture"]
    }
];

// ============================================================================
// PROJECTS SHOWCASE DATA
// ============================================================================
const PROJECTS_SHOWCASE = [
    {
        title: "ChatTornado",
        status: "LIVE PRODUCTION",
        url: "https://chattornado.vercel.app",
        repo: "https://github.com/Aneesh-labs/ChatTornado",
        description: "Full-stack real-time collaboration ecosystem with AI-powered assistant, real-time presence, multi-image upload pipeline, and granular Super Admin moderation.",
        metrics: "47 passing integration suites • Instant WebSocket sync • Multi-modal Gemini integration",
        tags: ["React", "FastAPI", "WebSockets", "Tailwind v4", "PostgreSQL", "Gemini 3.8 Flash"]
    },
    {
        title: "VORTEX-9 Neural Assistant",
        status: "BUILT-IN AGENT",
        url: "/home",
        description: "Specialized in-app AI copilot with live streaming typewriter dynamics, contextual chat comprehension, and advanced scientific KaTeX rendering.",
        metrics: "Sub-second first token latency • Native markdown code blocks with copy utilities",
        tags: ["Gemini AI", "KaTeX", "Typewriter Stream", "NLP"]
    },
    {
        title: "Admin Command Matrix",
        status: "ACTIVE ENCLAVE",
        url: "/admin",
        description: "High-security control center for platform audits, user governance, broadcast announcements, login telemetry, and moderation case review.",
        metrics: "Strict RBAC enforcement • Super admin stealth mode • Live telemetry charts",
        tags: ["RBAC", "Dashboard", "Audit Logs", "Data Security"]
    }
];

export default function Profile() {
    const [username, setUsername] = useState(() => sessionStorage.getItem("username") || "Aneesh");
    const [email, setEmail] = useState(() => sessionStorage.getItem("email") || "architect@chattornado.com");
    const [activeTab, setActiveTab] = useState("about"); // about | skills | work | projects | integrity
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [userRole, setUserRole] = useState("Architect / Admin");
    const [isVerified, setIsVerified] = useState(true);
    const [portfolioData, setPortfolioData] = useState(() => {
        try {
            const raw = sessionStorage.getItem("portfolioData");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        const syncProfileData = () => {
            const storedUser = sessionStorage.getItem("username");
            const storedEmail = sessionStorage.getItem("email");
            const verified = sessionStorage.getItem("emailVerified") === "true";
            if (storedUser) setUsername(storedUser);
            if (storedEmail) setEmail(storedEmail);
            setIsVerified(verified);
            try {
                const raw = sessionStorage.getItem("portfolioData");
                if (raw) setPortfolioData(JSON.parse(raw));
            } catch {}
        };

        syncProfileData();
        window.addEventListener("storage", syncProfileData);
        window.addEventListener("sessionStorageUpdate", syncProfileData);

        const token = sessionStorage.getItem("token");
        if (token) {
            API.get(`/user/portfolio?token=${token}`)
                .then(res => {
                    if (res.data?.portfolio_data) {
                        setPortfolioData(res.data.portfolio_data);
                        sessionStorage.setItem("portfolioData", JSON.stringify(res.data.portfolio_data));
                    }
                    if (res.data?.role) setUserRole(res.data.role);
                })
                .catch(() => {});
        }

        return () => {
            window.removeEventListener("storage", syncProfileData);
            window.removeEventListener("sessionStorageUpdate", syncProfileData);
        };
    }, []);

    const effectiveName = portfolioData?.displayName || username;
    const effectiveEmail = portfolioData?.email || email;
    const effectiveRole = portfolioData?.role || userRole;
    const effectiveHeadline = portfolioData?.headline || "Engineering robust real-time web applications & AI pipelines.";
    const effectiveBio = portfolioData?.bio || "Full-stack developer with a focus on modern React frontends, high-concurrency Python & FastAPI backends, real-time WebSocket systems, and agentic AI pipelines.";
    const effectiveSkills = portfolioData?.skills && portfolioData.skills.length > 0 ? portfolioData.skills : ["React 19", "TypeScript", "Tailwind CSS", "Python", "FastAPI", "PostgreSQL", "WebSockets"];
    const effectiveProjects = portfolioData?.projects && portfolioData.projects.length > 0 ? portfolioData.projects : PROJECTS_SHOWCASE;
    const effectiveGithub = portfolioData?.socials?.github || "https://github.com/Aneesh-labs/ChatTornado";

    const initial = useMemo(() => effectiveName.trim().charAt(0).toUpperCase() || "A", [effectiveName]);

    const codeSnippetText = `const { ${effectiveSkills.slice(0, 6).map(s => s.toLowerCase().replace(/[^a-z0-9]/g, '')).join(', ')}, ...moreSkills } = ${effectiveName.toLowerCase().replace(/\s+/g, '')}Profile;`;

    const handleCopyCode = () => {
        navigator.clipboard.writeText(codeSnippetText);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleCopyEmail = () => {
        navigator.clipboard.writeText(email);
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
    };

    const navTabs = [
        { id: "about", label: "About", icon: UserRound },
        { id: "skills", label: "Skills", icon: Code2 },
        { id: "work", label: "Work", icon: Briefcase },
        { id: "projects", label: "Projects", icon: Layers },
        { id: "integrity", label: "Integrity", icon: ShieldCheck },
    ];

    return (
        <main className="relative min-h-0 flex-1 overflow-y-auto bg-[#07090e] text-white p-4 md:p-8 font-sans antialiased selection:bg-purple-500/30">
            {/* Ambient Reactive Background Particle Field */}
            <AmbientParticleCanvas />

            <div className="relative z-10 mx-auto max-w-6xl space-y-8">
                
                {/* ========================================================================= */}
                {/* SIGNATURE RAI.CODES TOP NAVIGATION DOCK */}
                {/* ========================================================================= */}
                <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0d111a]/80 p-3 px-5 shadow-2xl backdrop-blur-2xl">
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-sky-400 text-lg font-black text-white shadow-lg shadow-purple-500/20">
                            {initial}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white tracking-tight">{effectiveName}</span>
                                {isVerified && (
                                    <BadgeCheck className="h-4 w-4 text-sky-400" title="Verified Identity" />
                                )}
                            </div>
                            <span className="text-xs text-purple-300/80 font-mono">{effectiveRole}</span>
                        </div>
                    </div>

                    {/* Navigation Pills */}
                    <nav className="flex items-center gap-1 overflow-x-auto rounded-xl bg-white/[0.04] p-1 border border-white/5">
                        {navTabs.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={`relative flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                    activeTab === id
                                        ? "text-white bg-white/10 shadow-sm shadow-purple-500/10 border border-white/10"
                                        : "text-white/50 hover:text-white/90 hover:bg-white/5"
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                <span>{label}</span>
                                {activeTab === id && (
                                    <motion.div
                                        layoutId="activeTabIndicator"
                                        className="absolute -bottom-1 left-2 right-2 h-[2px] bg-gradient-to-r from-sky-400 to-purple-400 rounded-full"
                                    />
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* Quick Connect Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.dispatchEvent(new Event("openPortfolioOnboarding"))}
                            className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20"
                            title="Re-open Onboarding & Portfolio Setup"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Edit Portfolio</span>
                        </button>
                        <button
                            onClick={handleCopyEmail}
                            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                        >
                            {copiedEmail ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copiedEmail ? "Copied!" : "Email"}</span>
                        </button>
                        {effectiveGithub && (
                            <a
                                href={effectiveGithub}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/20"
                            >
                                <GithubIcon className="h-3.5 w-3.5" />
                                <span>GitHub</span>
                                <ExternalLink className="h-3 w-3 opacity-60" />
                            </a>
                        )}
                    </div>
                </header>

                {/* ========================================================================= */}
                {/* SIGNATURE MONOSPACE CODE BLOCK BANNER (Inspired by rai.codes) */}
                {/* ========================================================================= */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0a0d14]/90 p-4 font-mono text-xs shadow-xl backdrop-blur-xl group"
                >
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2.5 text-[11px] text-white/40">
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70 inline-block" />
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70 inline-block" />
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70 inline-block" />
                            <span className="ml-2 text-white/50">developer-skills.ts</span>
                        </div>
                        <button
                            onClick={handleCopyCode}
                            className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/90 transition"
                        >
                            {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            <span>{copiedCode ? "Copied snippet" : "Copy"}</span>
                        </button>
                    </div>
                    <code className="text-purple-300 leading-relaxed break-all">
                        {codeSnippetText}
                    </code>
                </motion.div>

                {/* ========================================================================= */}
                {/* TAB CONTENT SECTIONS */}
                {/* ========================================================================= */}
                <AnimatePresence mode="wait">
                    
                    {/* TAB: ABOUT / OVERVIEW */}
                    {activeTab === "about" && (
                        <motion.div
                            key="about"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25 }}
                            className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]"
                        >
                            {/* Hero Intro Column */}
                            <div className="space-y-6 rounded-2xl border border-white/10 bg-[#0d111a]/80 p-6 md:p-8 backdrop-blur-2xl">
                                <div className="space-y-3">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        Available for Collaboration & Scaling
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                                        {effectiveHeadline}
                                    </h1>
                                    <p className="text-sm md:text-base leading-relaxed text-white/60">
                                        {effectiveBio}
                                    </p>
                                </div>

                                {/* Experience highlights mini row */}
                                <div className="grid grid-cols-3 gap-3 pt-2">
                                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
                                        <span className="block text-2xl font-black text-sky-400">47+</span>
                                        <span className="text-[11px] text-white/40 uppercase font-mono">Test Suites</span>
                                    </div>
                                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
                                        <span className="block text-2xl font-black text-purple-400">100%</span>
                                        <span className="text-[11px] text-white/40 uppercase font-mono">Live Uptime</span>
                                    </div>
                                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
                                        <span className="block text-2xl font-black text-emerald-400">&lt;50ms</span>
                                        <span className="text-[11px] text-white/40 uppercase font-mono">WS Latency</span>
                                    </div>
                                </div>

                                <div className="pt-2 flex flex-wrap gap-3">
                                    <button
                                        onClick={() => setActiveTab("projects")}
                                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/25 transition hover:from-purple-500 hover:to-indigo-500"
                                    >
                                        <Layers className="h-4 w-4" />
                                        Explore Projects
                                    </button>
                                    <a
                                        href={`mailto:${effectiveEmail}?subject=Project%20Collaboration`}
                                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
                                    >
                                        <Mail className="h-4 w-4" />
                                        Drop a Message
                                    </a>
                                </div>
                            </div>

                            {/* Identity Matrix Side Column */}
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-white/10 bg-[#0d111a]/80 p-6 backdrop-blur-2xl space-y-4">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/40 font-mono">
                                        Identity & System Details
                                    </h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                            <span className="text-white/50 flex items-center gap-2"><UserRound className="h-4 w-4 text-sky-400" /> Name</span>
                                            <span className="font-semibold text-white">{effectiveName}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                            <span className="text-white/50 flex items-center gap-2"><Mail className="h-4 w-4 text-purple-400" /> Email</span>
                                            <span className="font-mono text-xs text-white/80">{effectiveEmail}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                            <span className="text-white/50 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Role</span>
                                            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">{effectiveRole}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-white/50 flex items-center gap-2"><Fingerprint className="h-4 w-4 text-pink-400" /> Auth Status</span>
                                            <span className="font-mono text-xs text-emerald-300 font-semibold">JWT Session Valid</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-[#0d111a]/80 p-6 backdrop-blur-2xl">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/40 font-mono mb-3">
                                        Core Philosophy
                                    </h3>
                                    <p className="text-xs leading-relaxed text-white/60">
                                        "Software should be fast by design, resilient by default, and delightful by craft. Clean architectures allow teams to move quickly without breaking trust."
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* TAB: SKILLS & TAXONOMY */}
                    {activeTab === "skills" && (
                        <motion.div
                            key="skills"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-6"
                        >
                            <div className="grid gap-4 md:grid-cols-2">
                                {SKILLS_TAXONOMY.map((group) => (
                                    <div 
                                        key={group.category}
                                        className="rounded-2xl border border-white/10 bg-[#0d111a]/80 p-6 backdrop-blur-2xl transition hover:border-white/20"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-sm text-white tracking-wide">{group.category}</h3>
                                            <span className="text-[11px] font-mono text-white/40">{group.items.length} proficiencies</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {group.items.map((skill) => (
                                                <span
                                                    key={skill}
                                                    className={`rounded-lg border bg-gradient-to-r px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105 cursor-default ${group.color}`}
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* TAB: WORK & EXPERIENCE */}
                    {activeTab === "work" && (
                        <motion.div
                            key="work"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-6"
                        >
                            {EXPERIENCE_RECORDS.map((exp, idx) => (
                                <div
                                    key={idx}
                                    className="relative rounded-2xl border border-white/10 bg-[#0d111a]/80 p-6 md:p-8 backdrop-blur-2xl space-y-4"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{exp.role}</h3>
                                            <span className="text-sm font-semibold text-purple-400">{exp.company}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="rounded-md bg-white/5 px-2.5 py-1 text-xs font-mono text-white/60 border border-white/5 block md:inline-block">
                                                {exp.period}
                                            </span>
                                            <span className="text-xs text-white/40 block mt-1">{exp.location}</span>
                                        </div>
                                    </div>

                                    <p className="text-sm text-white/70 italic">{exp.summary}</p>

                                    <ul className="space-y-2 text-xs md:text-sm text-white/60 leading-relaxed">
                                        {exp.highlights.map((h, i) => (
                                            <li key={i} className="flex items-start gap-2.5">
                                                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                                                <span>{h}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="flex flex-wrap gap-1.5 pt-2">
                                        {exp.tags.map((t) => (
                                            <span key={t} className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] font-mono text-white/50 border border-white/5">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* TAB: PROJECTS SHOWCASE */}
                    {activeTab === "projects" && (
                        <motion.div
                            key="projects"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25 }}
                            className="grid gap-6 md:grid-cols-2"
                        >
                            {effectiveProjects.map((proj, idx) => {
                                const tagList = Array.isArray(proj.tags) 
                                    ? proj.tags 
                                    : typeof proj.tags === "string" 
                                    ? proj.tags.split(",").map(t => t.trim()).filter(Boolean) 
                                    : [];
                                return (
                                    <div
                                        key={idx}
                                        className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0d111a]/80 p-6 backdrop-blur-2xl transition hover:border-white/20 group"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="rounded-md bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 uppercase tracking-wide">
                                                    {proj.status || "PROJECT"}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {proj.repo && (
                                                        <a
                                                            href={proj.repo}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-white/40 hover:text-white transition"
                                                            title="GitHub Repository"
                                                        >
                                                            <GithubIcon className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                    {proj.url && (
                                                        <a
                                                            href={proj.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-white/40 hover:text-white transition"
                                                            title="Open Link"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition">
                                                {proj.title}
                                            </h3>

                                            <p className="text-xs md:text-sm text-white/60 leading-relaxed">
                                                {proj.description}
                                            </p>

                                            {proj.metrics && (
                                                <div className="rounded-lg bg-black/30 p-2.5 text-[11px] font-mono text-emerald-400/90 border border-white/5">
                                                    ⚡ {proj.metrics}
                                                </div>
                                            )}
                                        </div>

                                        {tagList.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-4 mt-auto">
                                                {tagList.map((t) => (
                                                    <span key={t} className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] font-mono text-white/50 border border-white/5">
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </motion.div>
                    )}

                    {/* TAB: INTEGRITY & TELEMETRY */}
                    {activeTab === "integrity" && (
                        <motion.div
                            key="integrity"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-6"
                        >
                            <div className="rounded-2xl border border-white/10 bg-[#0d111a]/80 p-6 md:p-8 backdrop-blur-2xl space-y-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                                    Access & Cryptographic Integrity
                                </h3>
                                <p className="text-xs text-white/50">
                                    Real-time inspection of active JWT credentials, state isolation, and backend connection security.
                                </p>

                                <div className="space-y-3 pt-2">
                                    {[
                                        { name: "Cryptographic JWT Session Token", status: "Active & Verified", ok: true },
                                        { name: "PostgreSQL & SQLite Data Replication", status: "Healthy & Synced", ok: true },
                                        { name: "WebSocket Gateway Encryption", status: "WSS TLS 1.3 Active", ok: true },
                                        { name: "AI Safety Pipeline & Moderation Guards", status: "Online & Monitoring", ok: true },
                                        { name: "Frontend Sandboxing & XSS Protection", status: "Enforced", ok: true }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3.5 px-4">
                                            <span className="text-xs md:text-sm font-semibold text-white/80">{item.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono text-emerald-400">{item.status}</span>
                                                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>

            </div>
        </main>
    );
}

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Layers, 
    Sparkles, 
    Code2, 
    Briefcase, 
    UserRound, 
    Mail, 
    Check, 
    ArrowRight, 
    ArrowLeft, 
    X, 
    Plus, 
    Trash2, 
    ExternalLink, 
    Globe, 
    ShieldCheck, 
    Laptop, 
    Cpu, 
    Palette, 
    Brain, 
    Terminal, 
    Flame, 
    Zap 
} from "lucide-react";
import API from "../Services/API";

const DOMAINS_LIST = [
    { id: "fullstack", label: "Full-Stack Architect", icon: Layers, desc: "End-to-end architectures, React & FastAPI pipelines" },
    { id: "frontend", label: "Frontend & UI/UX Engineer", icon: Palette, desc: "Fluid animations, responsive layouts, design systems" },
    { id: "ai_ml", label: "AI & Cognitive Systems Engineer", icon: Brain, desc: "Agentic AI, LLM pipelines, autonomous workflows" },
    { id: "backend", label: "Backend & Distributed Systems", icon: Cpu, desc: "High-throughput APIs, microservices, databases" },
    { id: "devops", label: "DevOps & Cloud Security", icon: ShieldCheck, desc: "CI/CD, container orchestration, resilience" },
    { id: "founder", label: "Solo Founder & Product Builder", icon: Flame, desc: "Zero-to-one product shipping and monetization" },
    { id: "student", label: "Developer & Explorer", icon: Terminal, desc: "Passionate coder learning, hacking and building" }
];

const PRESET_SKILLS = [
    "React", "TypeScript", "JavaScript", "Python", "FastAPI", "Tailwind CSS", 
    "PostgreSQL", "WebSockets", "Docker", "Node.js", "Next.js", "Redis", 
    "GraphQL", "REST APIs", "Git", "Framer Motion", "Gemini AI", "SQLAlchemy"
];

const GithubIcon = ({ className = "h-4 w-4" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
);

export default function PortfolioOnboardingModal({ isOpen, onClose, onComplete }) {
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [domain, setDomain] = useState("fullstack");
    const [displayName, setDisplayName] = useState(() => sessionStorage.getItem("username") || "");
    const [email, setEmail] = useState(() => sessionStorage.getItem("email") || "");
    const [headline, setHeadline] = useState("");
    const [bio, setBio] = useState("");
    const [role, setRole] = useState("");
    
    // Skills
    const [selectedSkills, setSelectedSkills] = useState(["React", "Python", "TypeScript", "Tailwind CSS"]);
    const [customSkillInput, setCustomSkillInput] = useState("");

    // Projects
    const [projects, setProjects] = useState([
        {
            title: "ChatTornado",
            description: "High-concurrency realtime messaging platform with agentic AI and moderation",
            url: "https://chattornado.vercel.app",
            repo: "https://github.com/Aneesh-labs/ChatTornado",
            tags: "React, FastAPI, WebSockets"
        }
    ]);
    const [newProject, setNewProject] = useState({ title: "", description: "", url: "", repo: "", tags: "" });
    const [showProjectForm, setShowProjectForm] = useState(false);

    // Social Links
    const [githubUrl, setGithubUrl] = useState("");
    const [linkedinUrl, setLinkedinUrl] = useState("");
    const [websiteUrl, setWebsiteUrl] = useState("");

    useEffect(() => {
        if (!displayName) {
            setDisplayName(sessionStorage.getItem("username") || "");
        }
        if (!email) {
            setEmail(sessionStorage.getItem("email") || "");
        }
        // Auto default headline based on domain
        const selected = DOMAINS_LIST.find(d => d.id === domain);
        if (selected && !headline) {
            setHeadline(`${selected.label} crafting high performance digital experiences`);
            setRole(selected.label);
        }
    }, [domain]);

    if (!isOpen) return null;

    const toggleSkill = (skill) => {
        if (selectedSkills.includes(skill)) {
            setSelectedSkills(selectedSkills.filter(s => s !== skill));
        } else {
            setSelectedSkills([...selectedSkills, skill]);
        }
    };

    const addCustomSkill = (e) => {
        if (e) e.preventDefault();
        const trimmed = customSkillInput.trim();
        if (trimmed && !selectedSkills.includes(trimmed)) {
            setSelectedSkills([...selectedSkills, trimmed]);
            setCustomSkillInput("");
        }
    };

    const addProject = (e) => {
        if (e) e.preventDefault();
        if (!newProject.title.trim()) return;
        setProjects([...projects, { ...newProject }]);
        setNewProject({ title: "", description: "", url: "", repo: "", tags: "" });
        setShowProjectForm(false);
    };

    const removeProject = (index) => {
        setProjects(projects.filter((_, idx) => idx !== index));
    };

    const handleSave = async (isSkipping = false) => {
        if (submitting) return;
        setSubmitting(true);

        const token = sessionStorage.getItem("token");
        const defaultRole = DOMAINS_LIST.find(d => d.id === domain)?.label || "Developer";

        const portfolioPayload = isSkipping ? {
            domain: "fullstack",
            displayName: displayName || sessionStorage.getItem("username") || "Member",
            email: email || sessionStorage.getItem("email") || "",
            headline: "Software Engineer & Builder",
            bio: "Exploring and developing software on ChatTornado.",
            role: "Software Engineer",
            skills: ["React", "Python", "TypeScript", "Tailwind CSS"],
            projects: [],
            socials: { github: "", linkedin: "", website: "" },
            is_private: true,
            updated_at: new Date().toISOString()
        } : {
            domain,
            displayName: displayName.trim() || sessionStorage.getItem("username") || "Member",
            email: email.trim() || sessionStorage.getItem("email") || "",
            headline: headline.trim() || `${defaultRole} building scalable web systems`,
            bio: bio.trim() || "Passionate engineer focusing on modern tech and real-time platforms.",
            role: role.trim() || defaultRole,
            skills: selectedSkills,
            projects: projects,
            socials: {
                github: githubUrl.trim(),
                linkedin: linkedinUrl.trim(),
                website: websiteUrl.trim()
            },
            is_private: true,
            updated_at: new Date().toISOString()
        };

        try {
            if (token) {
                await API.post("/user/portfolio", {
                    token,
                    portfolio: portfolioPayload,
                    custom_status: headline.slice(0, 80) || undefined
                });
            }
            sessionStorage.setItem("onboardingCompleted", "true");
            sessionStorage.setItem("portfolioData", JSON.stringify(portfolioPayload));
            if (portfolioPayload.displayName) {
                sessionStorage.setItem("username", portfolioPayload.displayName);
            }
            window.dispatchEvent(new Event("sessionStorageUpdate"));

            if (onComplete) onComplete(portfolioPayload);
            if (onClose) onClose();
        } catch (err) {
            console.error("Failed to save portfolio:", err);
            // Save locally so the user is never stuck
            sessionStorage.setItem("onboardingCompleted", "true");
            sessionStorage.setItem("portfolioData", JSON.stringify(portfolioPayload));
            window.dispatchEvent(new Event("sessionStorageUpdate"));
            if (onComplete) onComplete(portfolioPayload);
            if (onClose) onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative flex flex-col h-[90vh] max-h-[760px] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0a0d14]/95 text-white shadow-2xl"
            >
                {/* Header Bar */}
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-purple-600 to-sky-400 text-sm font-black shadow-md shadow-purple-500/20">
                            ⚡
                        </div>
                        <div>
                            <h2 className="text-base font-bold tracking-tight text-white">Create Your Profile Showcase</h2>
                            <p className="text-xs text-white/40">Step {step} of 6 • Developer Showcase</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleSave(true)}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/50 transition hover:bg-white/10 hover:text-white"
                        >
                            Skip for now ↗
                        </button>
                    </div>
                </div>

                {/* Stepper Progress Bar */}
                <div className="h-1 w-full bg-white/5">
                    <div 
                        className="h-full bg-gradient-to-r from-sky-400 via-purple-500 to-emerald-400 transition-all duration-300 ease-out" 
                        style={{ width: `${(step / 6) * 100}%` }}
                    />
                </div>

                {/* Step Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* STEP 1: FIELD / DOMAIN SELECTION */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-white">Which field do you match with?</h3>
                                <p className="text-xs text-white/50 mt-1">Select the domain that best defines your focus or interests.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                {DOMAINS_LIST.map((item) => {
                                    const Icon = item.icon;
                                    const isSelected = domain === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                setDomain(item.id);
                                                setRole(item.label);
                                            }}
                                            className={`flex items-start gap-3.5 rounded-2xl p-4 text-left transition-all border ${
                                                isSelected
                                                    ? "border-purple-500/50 bg-gradient-to-br from-purple-500/15 to-sky-500/10 shadow-lg shadow-purple-500/10"
                                                    : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                                            }`}
                                        >
                                            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isSelected ? "bg-purple-500 text-white" : "bg-white/5 text-white/60"}`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-sm font-bold ${isSelected ? "text-white" : "text-white/80"}`}>{item.label}</span>
                                                    {isSelected && <Check className="h-4 w-4 text-purple-400 shrink-0" />}
                                                </div>
                                                <p className="text-xs text-white/45 mt-1 leading-snug">{item.desc}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: PROFILE & BIO */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-white">Tell us about your profile</h3>
                                <p className="text-xs text-white/50 mt-1">Set your headline, bio, and identity details for your personal showcase.</p>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div>
                                    <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Your full name or handle"
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-purple-400"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                                        Professional Headline
                                    </label>
                                    <input
                                        type="text"
                                        value={headline}
                                        onChange={(e) => setHeadline(e.target.value)}
                                        placeholder="e.g. Full-Stack Engineer building high-scale real-time web applications"
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-purple-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                                        Write About Yourself (Bio)
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="Write a few lines about your background, interests, technical passions, and what you're currently building..."
                                        className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white placeholder-white/30 outline-none focus:border-purple-400 resize-none leading-relaxed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                                        Email ID
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your.email@example.com"
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-purple-400 font-mono text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: ROLE & CORE TECH STACK */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-white">Role & Core Tech Stack</h3>
                                <p className="text-xs text-white/50 mt-1">Select the languages and tools that power your signature code banner.</p>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div>
                                    <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                                        Specific Role / Title
                                    </label>
                                    <input
                                        type="text"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        placeholder="e.g. Staff Software Engineer / Full-Stack Architect"
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-purple-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
                                        Select Core Skills ({selectedSkills.length} selected)
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {PRESET_SKILLS.map((skill) => {
                                            const active = selectedSkills.includes(skill);
                                            return (
                                                <button
                                                    key={skill}
                                                    type="button"
                                                    onClick={() => toggleSkill(skill)}
                                                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all border ${
                                                        active
                                                            ? "border-purple-400 bg-purple-500/20 text-purple-200 shadow-sm shadow-purple-500/20"
                                                            : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
                                                    }`}
                                                >
                                                    {active && <span className="mr-1">✓</span>}
                                                    {skill}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <form onSubmit={addCustomSkill} className="flex gap-2 pt-1">
                                    <input
                                        type="text"
                                        value={customSkillInput}
                                        onChange={(e) => setCustomSkillInput(e.target.value)}
                                        placeholder="Add custom skill (e.g. WebAssembly, Rust, AWS)"
                                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-purple-400"
                                    />
                                    <button
                                        type="submit"
                                        className="flex items-center gap-1 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 transition"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: PROJECTS TO TAG */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-extrabold text-white">Featured Projects</h3>
                                    <p className="text-xs text-white/50 mt-1">Showcase your best builds, repositories, and applications.</p>
                                </div>
                                {!showProjectForm && (
                                    <button
                                        type="button"
                                        onClick={() => setShowProjectForm(true)}
                                        className="flex items-center gap-1 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add Project
                                    </button>
                                )}
                            </div>

                            {/* New Project Inline Form */}
                            {showProjectForm && (
                                <form onSubmit={addProject} className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                        <span className="text-xs font-bold text-purple-300 uppercase font-mono">New Project Details</span>
                                        <button type="button" onClick={() => setShowProjectForm(false)} className="text-white/40 hover:text-white">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            value={newProject.title}
                                            onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                                            placeholder="Project Name *"
                                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none"
                                            required
                                        />
                                        <input
                                            type="text"
                                            value={newProject.tags}
                                            onChange={(e) => setNewProject({ ...newProject, tags: e.target.value })}
                                            placeholder="Tech tags (e.g. React, Node.js)"
                                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={newProject.description}
                                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                        placeholder="Short description / highlight of what it does..."
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none"
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <input
                                            type="url"
                                            value={newProject.url}
                                            onChange={(e) => setNewProject({ ...newProject, url: e.target.value })}
                                            placeholder="Live Demo URL (optional)"
                                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none font-mono text-[11px]"
                                        />
                                        <input
                                            type="url"
                                            value={newProject.repo}
                                            onChange={(e) => setNewProject({ ...newProject, repo: e.target.value })}
                                            placeholder="GitHub Repo URL (optional)"
                                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none font-mono text-[11px]"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setShowProjectForm(false)}
                                            className="px-3 py-1.5 text-xs text-white/60 hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-purple-500"
                                        >
                                            Save to List
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Existing Projects List */}
                            <div className="space-y-3 pt-1">
                                {projects.length === 0 ? (
                                    <p className="text-center py-6 text-xs text-white/40 italic">
                                        No projects tagged yet. Click "Add Project" above or skip to continue.
                                    </p>
                                ) : (
                                    projects.map((proj, idx) => (
                                        <div key={idx} className="flex items-start justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-white">{proj.title}</span>
                                                    {proj.url && <ExternalLink className="h-3 w-3 text-sky-400" />}
                                                </div>
                                                <p className="text-xs text-white/55 mt-0.5 line-clamp-2">{proj.description}</p>
                                                {proj.tags && (
                                                    <span className="inline-block mt-1.5 text-[10px] font-mono text-purple-300/80 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                                        {proj.tags}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeProject(idx)}
                                                className="text-white/30 hover:text-red-400 p-1 transition"
                                                title="Remove Project"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 5: SOCIAL & GITHUB LINKS */}
                    {step === 5 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-white">Social & GitHub Presence</h3>
                                <p className="text-xs text-white/50 mt-1">Connect your developer profiles and links for your action bar.</p>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div>
                                    <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                                        <GithubIcon className="h-3.5 w-3.5 text-white" />
                                        GitHub Profile Link
                                    </label>
                                    <input
                                        type="url"
                                        value={githubUrl}
                                        onChange={(e) => setGithubUrl(e.target.value)}
                                        placeholder="https://github.com/your-username"
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-purple-400 font-mono text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                                        <Globe className="h-3.5 w-3.5 text-sky-400" />
                                        Personal Website / Portfolio (Optional)
                                    </label>
                                    <input
                                        type="url"
                                        value={websiteUrl}
                                        onChange={(e) => setWebsiteUrl(e.target.value)}
                                        placeholder="https://yourwebsite.com"
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-purple-400 font-mono text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                                        <Briefcase className="h-3.5 w-3.5 text-blue-400" />
                                        LinkedIn / Professional Profile (Optional)
                                    </label>
                                    <input
                                        type="url"
                                        value={linkedinUrl}
                                        onChange={(e) => setLinkedinUrl(e.target.value)}
                                        placeholder="https://linkedin.com/in/your-profile"
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-purple-400 font-mono text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 6: PREVIEW & FINALIZE */}
                    {step === 6 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-white">Review Your Developer Portfolio</h3>
                                <p className="text-xs text-white/50 mt-1">
                                    This showcase is strictly private to your account. Only you can view it in your dashboard profile.
                                </p>
                            </div>

                            {/* Live Miniature Preview */}
                            <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-tr from-purple-600 to-sky-400 text-lg font-black text-white">
                                        {displayName ? displayName.charAt(0).toUpperCase() : "A"}
                                    </div>
                                    <div>
                                        <h4 className="font-extrabold text-base text-white">{displayName || "Anonymous Architect"}</h4>
                                        <p className="text-xs text-purple-300 font-mono">{role || "Developer"}</p>
                                    </div>
                                </div>

                                <p className="text-xs text-white/70 leading-relaxed italic">
                                    "{bio || "Passionate engineer focusing on modern tech and real-time platforms."}"
                                </p>

                                {/* Signature code preview */}
                                <div className="rounded-lg bg-black/50 p-2.5 font-mono text-[11px] text-purple-300 border border-white/5">
                                    const &#123; {selectedSkills.slice(0, 5).join(", ")}, ...more &#125; = {displayName ? displayName.toLowerCase().replace(/\s+/g, '') : "user"}Profile;
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {selectedSkills.slice(0, 8).map(s => (
                                        <span key={s} className="rounded px-2 py-0.5 text-[10px] font-bold bg-white/5 text-white/60 border border-white/5">
                                            {s}
                                        </span>
                                    ))}
                                    {selectedSkills.length > 8 && (
                                        <span className="text-[10px] text-white/40 self-center">
                                            +{selectedSkills.length - 8} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 bg-white/[0.02]">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={() => setStep(step - 1)}
                            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 transition"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back
                        </button>
                    ) : (
                        <div />
                    )}

                    <div className="flex items-center gap-3">
                        {step < 6 ? (
                            <button
                                type="button"
                                onClick={() => setStep(step + 1)}
                                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/20 hover:from-purple-500 hover:to-indigo-500 transition"
                            >
                                <span>Continue</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => handleSave(false)}
                                disabled={submitting}
                                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-xs font-bold text-black shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition disabled:opacity-50"
                            >
                                {submitting ? (
                                    <span>Saving Portfolio...</span>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4" />
                                        <span>Launch My Portfolio ⚡</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

            </motion.div>
        </div>
    );
}

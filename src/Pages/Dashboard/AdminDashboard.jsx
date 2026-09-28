import React, { useState, useEffect } from "react";
import {
    ShieldCheck, Users, AlertTriangle, Radio, BarChart3, Clock,
    FileText, Ban, CheckCircle, Search, RefreshCw, Send, Trash2,
    Lock, ShieldAlert, Activity, UserX, UserCheck, Layers, HardDrive
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import API from "../../Services/API";

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("overview");
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Users
    const [userQuery, setUserQuery] = useState("");
    const [searchedUsers, setSearchedUsers] = useState([]);
    const [selectedUserForRestrict, setSelectedUserForRestrict] = useState(null);
    const [restrictHours, setRestrictHours] = useState("48");
    const [restrictReason, setRestrictReason] = useState("");
    const [isPermanent, setIsPermanent] = useState(false);

    // Moderation
    const [moderationCases, setModerationCases] = useState([]);
    const [resolvingCaseId, setResolvingCaseId] = useState(null);
    const [modAction, setModAction] = useState("TEMPORARY_RESTRICTION");
    const [modNotes, setModNotes] = useState("");

    // Announcements
    const [announcements, setAnnouncements] = useState([]);
    const [annTitle, setAnnTitle] = useState("");
    const [annContent, setAnnContent] = useState("");
    const [annCategory, setAnnCategory] = useState("General");
    const [annExpires, setAnnExpires] = useState("24");

    // Login History
    const [loginHistory, setLoginHistory] = useState([]);

    // Audit Logs
    const [auditLogs, setAuditLogs] = useState([]);

    const [statusMsg, setStatusMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const token = sessionStorage.getItem("token");

    const fetchStats = async () => {
        setLoadingStats(true);
        try {
            const res = await API.get("/api/admin/stats", { params: { token } });
            setStats(res.data);
        } catch (err) {
            console.error("Failed to load admin stats:", err);
            setErrorMsg(err.response?.data?.detail || "Admin access denied or failed to load stats.");
        } finally {
            setLoadingStats(false);
        }
    };

    const fetchModerationCases = async () => {
        try {
            const res = await API.get("/api/admin/moderation/cases", { params: { token } });
            setModerationCases(res.data || []);
        } catch (err) {
            console.error("Failed to load moderation cases:", err);
        }
    };

    const fetchAnnouncements = async () => {
        try {
            const res = await API.get("/api/admin/announcements", { params: { token } });
            setAnnouncements(res.data || []);
        } catch (err) {
            console.error("Failed to load announcements:", err);
        }
    };

    const fetchLoginHistory = async () => {
        try {
            const res = await API.get("/api/admin/logins", { params: { token } });
            setLoginHistory(res.data || []);
        } catch (err) {
            console.error("Failed to load login history:", err);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const res = await API.get("/api/admin/audit-logs", { params: { token } });
            setAuditLogs(res.data || []);
        } catch (err) {
            console.error("Failed to load audit logs:", err);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        if (activeTab === "moderation") fetchModerationCases();
        if (activeTab === "announcements") fetchAnnouncements();
        if (activeTab === "logins") fetchLoginHistory();
        if (activeTab === "audit") fetchAuditLogs();
    }, [activeTab]);

    const handleSearchUsers = async (e) => {
        e?.preventDefault();
        if (!userQuery.trim()) return;
        try {
            const res = await API.get(`/search-users?q=${encodeURIComponent(userQuery.trim())}`, { params: { token } });
            setSearchedUsers(res.data || []);
        } catch (err) {
            setErrorMsg("User search failed.");
        }
    };

    const handleApplyRestriction = async (e) => {
        e.preventDefault();
        if (!selectedUserForRestrict) return;
        try {
            await API.post(
                `/api/admin/users/${selectedUserForRestrict.id}/restrict`,
                {
                    hours: isPermanent ? null : parseInt(restrictHours) || 48,
                    permanent: isPermanent,
                    reason: restrictReason.trim() || "Violation of community safety guidelines."
                },
                { params: { token } }
            );
            setStatusMsg(`Restriction successfully applied to @${selectedUserForRestrict.username}.`);
            setSelectedUserForRestrict(null);
            setRestrictReason("");
            fetchStats();
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "Failed to apply restriction.");
        }
    };

    const handleUnrestrictUser = async (userId, username) => {
        try {
            await API.post(`/api/admin/users/${userId}/unrestrict`, {}, { params: { token } });
            setStatusMsg(`Restrictions lifted for @${username}.`);
            fetchStats();
            handleSearchUsers();
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "Failed to lift restriction.");
        }
    };

    const handleResolveCase = async (caseId) => {
        try {
            await API.post(
                `/api/admin/moderation/cases/${caseId}/resolve`,
                {
                    action_taken: modAction,
                    notes: modNotes.trim() || undefined
                },
                { params: { token } }
            );
            setStatusMsg("Moderation case resolved.");
            setResolvingCaseId(null);
            setModNotes("");
            fetchModerationCases();
            fetchStats();
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "Failed to resolve moderation case.");
        }
    };

    const handleCreateAnnouncement = async (e) => {
        e.preventDefault();
        if (!annTitle.trim() || !annContent.trim()) return;
        try {
            await API.post(
                "/api/admin/announcements",
                {
                    title: annTitle.trim(),
                    content: annContent.trim(),
                    category: annCategory,
                    expires_in_hours: parseInt(annExpires) || 24
                },
                { params: { token } }
            );
            setStatusMsg("Broadcast announcement published to all active users!");
            setAnnTitle("");
            setAnnContent("");
            fetchAnnouncements();
            fetchStats();
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "Failed to publish announcement.");
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
        <main className="min-h-0 flex-1 overflow-y-auto p-4 text-white md:p-8 custom-scrollbar">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                {/* Header Banner */}
                <header className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-[#0d111c] to-[#0e1322] p-6 backdrop-blur-2xl md:p-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <ShieldCheck className="w-48 h-48 text-amber-400" />
                    </div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
                        <Lock className="h-3.5 w-3.5 text-amber-400" />
                        Super Admin Command Console • BlackShadow-ChatTornado
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                        Operational Dashboard
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
                        Zero-trust infrastructure controls, AI-assisted safety enforcement, live presence telemetry, and organization-wide broadcasts.
                    </p>

                    {/* Notice Bars */}
                    {statusMsg && (
                        <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                {statusMsg}
                            </span>
                            <button onClick={() => setStatusMsg("")} className="hover:text-white">✕</button>
                        </div>
                    )}
                    {errorMsg && (
                        <div className="mt-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                {errorMsg}
                            </span>
                            <button onClick={() => setErrorMsg("")} className="hover:text-white">✕</button>
                        </div>
                    )}
                </header>

                {/* Tabs Navigation */}
                <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {[
                        { id: "overview", label: "Metrics & Telemetry", icon: BarChart3 },
                        { id: "users", label: "User Enforcement", icon: Users },
                        { id: "moderation", label: "AI Moderation Queue", icon: ShieldAlert },
                        { id: "announcements", label: "Announcements Broadcast", icon: Radio },
                        { id: "logins", label: "Login Access History", icon: Clock },
                        { id: "audit", label: "System Audit Logs", icon: FileText },
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                activeTab === id
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10"
                                    : "bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{label}</span>
                        </button>
                    ))}
                    <button
                        onClick={fetchStats}
                        title="Refresh metrics"
                        className="ml-auto p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingStats ? "animate-spin text-amber-400" : ""}`} />
                    </button>
                </div>

                {/* TAB 1: METRICS & TELEMETRY */}
                {activeTab === "overview" && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                            <div className="flex items-center justify-between text-white/50 mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider">Registered Users</span>
                                <Users className="w-4 h-4 text-cyan-400" />
                            </div>
                            <p className="text-3xl font-black text-white">{stats?.users?.total ?? "…"}</p>
                            <p className="text-xs text-white/40 mt-1">
                                {stats?.users?.active_connections ?? 0} live connected sessions
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                            <div className="flex items-center justify-between text-white/50 mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider">Messages Sent</span>
                                <Activity className="w-4 h-4 text-emerald-400" />
                            </div>
                            <p className="text-3xl font-black text-white">{stats?.messaging?.total ?? "…"}</p>
                            <p className="text-xs text-white/40 mt-1">
                                {stats?.messaging?.today ?? 0} messages today
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                            <div className="flex items-center justify-between text-white/50 mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider">Active Groups</span>
                                <Layers className="w-4 h-4 text-violet-400" />
                            </div>
                            <p className="text-3xl font-black text-white">{stats?.groups?.total ?? "…"}</p>
                            <p className="text-xs text-white/40 mt-1">
                                Collaborative workspaces
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                            <div className="flex items-center justify-between text-white/50 mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider">Media Storage</span>
                                <HardDrive className="w-4 h-4 text-amber-400" />
                            </div>
                            <p className="text-2xl font-black text-white">
                                {formatBytes(stats?.media?.total_storage_bytes)}
                            </p>
                            <p className="text-xs text-white/40 mt-1">
                                Enforced max 100 MB / image
                            </p>
                        </div>

                        <div className="sm:col-span-2 lg:col-span-4 p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-4 flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-amber-400" />
                                Moderation & Safety Pipeline Health
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                                    <span className="text-xs text-white/50">Pending Moderation Cases</span>
                                    <p className="text-2xl font-bold text-amber-400 mt-1">{stats?.moderation?.pending_cases ?? 0}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                                    <span className="text-xs text-white/50">Total Incidents Reported</span>
                                    <p className="text-2xl font-bold text-white mt-1">{stats?.moderation?.total_reports ?? 0}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                                    <span className="text-xs text-white/50">Restricted Users</span>
                                    <p className="text-2xl font-bold text-rose-400 mt-1">{stats?.users?.restricted ?? 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: USER ENFORCEMENT */}
                {activeTab === "users" && (
                    <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-3">
                                Search & Sanction User
                            </h3>
                            <form onSubmit={handleSearchUsers} className="flex gap-2">
                                <input
                                    type="text"
                                    value={userQuery}
                                    onChange={(e) => setUserQuery(e.target.value)}
                                    placeholder="Search user by username or email..."
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
                                />
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 transition-colors"
                                >
                                    <Search className="w-4 h-4" />
                                    <span>Search</span>
                                </button>
                            </form>

                            {searchedUsers.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {searchedUsers.map((u) => (
                                        <div
                                            key={u.id}
                                            className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between"
                                        >
                                            <div>
                                                <p className="text-sm font-bold text-white">{u.username}</p>
                                                <p className="text-xs text-white/40">{u.email || "No email"} • ID: {u.id}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setSelectedUserForRestrict(u)}
                                                    className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold hover:bg-rose-500/30 transition-colors"
                                                >
                                                    Restrict / Ban
                                                </button>
                                                <button
                                                    onClick={() => handleUnrestrictUser(u.id, u.username)}
                                                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30 transition-colors"
                                                >
                                                    Lift Sanctions
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Restriction Dialog */}
                        {selectedUserForRestrict && (
                            <div className="p-6 rounded-2xl bg-red-950/30 border border-red-500/30">
                                <h4 className="text-sm font-bold text-red-300 mb-3 flex items-center gap-2">
                                    <UserX className="w-4 h-4" />
                                    Apply Restriction to @{selectedUserForRestrict.username}
                                </h4>
                                <form onSubmit={handleApplyRestriction} className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 text-xs font-medium text-white/80 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isPermanent}
                                                onChange={(e) => setIsPermanent(e.target.checked)}
                                                className="rounded bg-black/40 border-white/20 text-red-500 focus:ring-0"
                                            />
                                            Permanent Ban
                                        </label>
                                        {!isPermanent && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-white/60">Duration (Hours):</span>
                                                <input
                                                    type="number"
                                                    value={restrictHours}
                                                    onChange={(e) => setRestrictHours(e.target.value)}
                                                    className="w-20 px-3 py-1 rounded bg-black/40 border border-white/10 text-xs text-white"
                                                    min="1"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <textarea
                                        rows={2}
                                        value={restrictReason}
                                        onChange={(e) => setRestrictReason(e.target.value)}
                                        placeholder="Reason for restriction..."
                                        className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30"
                                        required
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-colors"
                                        >
                                            Confirm Restriction
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedUserForRestrict(null)}
                                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white/70 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: AI MODERATION QUEUE */}
                {activeTab === "moderation" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">
                                Incident Reports & AI Severity Classifications ({moderationCases.length})
                            </h3>
                            <button
                                onClick={fetchModerationCases}
                                className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                            >
                                Refresh Queue
                            </button>
                        </div>

                        {moderationCases.length === 0 ? (
                            <div className="py-16 text-center rounded-2xl bg-white/[0.02] border border-white/10">
                                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-50" />
                                <p className="text-sm font-semibold text-white/70">Moderation Queue Clear</p>
                                <p className="text-xs text-white/30">No unresolved safety incidents found.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {moderationCases.map((c) => (
                                    <div
                                        key={c.id}
                                        className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3"
                                    >
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                        c.ai_severity === "CRITICAL"
                                                            ? "bg-red-500/20 text-red-400 border border-red-500/40"
                                                            : c.ai_severity === "HIGH"
                                                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                                            : c.ai_severity === "MEDIUM"
                                                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                                            : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                                                    }`}
                                                >
                                                    Severity: {c.ai_severity}
                                                </span>
                                                <span className="text-xs text-white/40">
                                                    Confidence: {Math.round(c.ai_confidence * 100)}%
                                                </span>
                                            </div>
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-white/60">
                                                Status: {c.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                                                <p className="text-white/40 mb-1">Target Account:</p>
                                                <p className="font-bold text-white">@{c.target_user?.username || `ID ${c.user_id}`}</p>
                                                <p className="text-white/40 mt-1">Reason: <span className="text-amber-300">{c.report?.reason_category || "Spam"}</span></p>
                                                {c.report?.description && (
                                                    <p className="text-white/60 mt-1 italic">"{c.report.description}"</p>
                                                )}
                                            </div>
                                            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                                                <p className="text-white/40 mb-1">AI Explanation:</p>
                                                <p className="text-white/80 leading-relaxed">{c.ai_explanation || "Automated classification heuristic applied."}</p>
                                            </div>
                                        </div>

                                        {resolvingCaseId === c.id ? (
                                            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 space-y-3">
                                                <div className="flex gap-2">
                                                    <select
                                                        value={modAction}
                                                        onChange={(e) => setModAction(e.target.value)}
                                                        className="px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white"
                                                    >
                                                        <option value="NO_ACTION">No Action (Dismiss)</option>
                                                        <option value="TEMPORARY_RESTRICTION">Temporary Restriction (48h)</option>
                                                        <option value="PERMANENT_BAN">Permanent Ban</option>
                                                        <option value="CONTENT_REMOVAL">Content Warning & Removal</option>
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={modNotes}
                                                        onChange={(e) => setModNotes(e.target.value)}
                                                        placeholder="Admin review notes..."
                                                        className="flex-1 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleResolveCase(c.id)}
                                                        className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
                                                    >
                                                        Submit Decision
                                                    </button>
                                                    <button
                                                        onClick={() => setResolvingCaseId(null)}
                                                        className="px-3 py-1.5 rounded-lg bg-white/10 text-xs text-white/70"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => setResolvingCaseId(c.id)}
                                                    className="px-4 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-colors"
                                                >
                                                    Review & Adjudicate
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: BROADCAST ANNOUNCEMENTS */}
                {activeTab === "announcements" && (
                    <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-4 flex items-center gap-2">
                                <Send className="w-4 h-4 text-cyan-400" />
                                Publish Live Announcement
                            </h3>
                            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold text-white/60 mb-1">Title *</label>
                                        <input
                                            type="text"
                                            value={annTitle}
                                            onChange={(e) => setAnnTitle(e.target.value)}
                                            placeholder="e.g. Scheduled System Upgrade"
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-white/60 mb-1">Category</label>
                                        <select
                                            value={annCategory}
                                            onChange={(e) => setAnnCategory(e.target.value)}
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none"
                                        >
                                            <option value="General" className="bg-[#111624]">General</option>
                                            <option value="Maintenance" className="bg-[#111624]">Maintenance</option>
                                            <option value="Security" className="bg-[#111624]">Security</option>
                                            <option value="Feature" className="bg-[#111624]">Feature</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-white/60 mb-1">Content *</label>
                                    <textarea
                                        rows={3}
                                        value={annContent}
                                        onChange={(e) => setAnnContent(e.target.value)}
                                        placeholder="Announcement markdown / message body..."
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none"
                                        required
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-white/60">Expires in (Hours):</span>
                                        <input
                                            type="number"
                                            value={annExpires}
                                            onChange={(e) => setAnnExpires(e.target.value)}
                                            className="w-20 px-3 py-1 rounded bg-black/40 border border-white/10 text-xs text-white"
                                            min="1"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-cyan-500/20"
                                    >
                                        <Radio className="w-4 h-4" />
                                        <span>Publish & Broadcast</span>
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Recent announcements list */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white/60">Published History</h4>
                            {announcements.map((a) => (
                                <div key={a.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-cyan-300">{a.title}</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/60">{a.category}</span>
                                        </div>
                                        <p className="text-xs text-white/70">{a.content}</p>
                                        <p className="text-[10px] text-white/30 mt-1">Created: {new Date(a.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB 5: LOGIN HISTORY */}
                {activeTab === "logins" && (
                    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">
                                Authentication Access Logs (Last 100 entries)
                            </h3>
                            <button onClick={fetchLoginHistory} className="text-xs text-amber-400 hover:text-amber-300 font-semibold">
                                Refresh
                            </button>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-white/10 text-white/50">
                                        <th className="py-2.5 px-3">User ID</th>
                                        <th className="py-2.5 px-3">IP Address</th>
                                        <th className="py-2.5 px-3">Status</th>
                                        <th className="py-2.5 px-3">Timestamp (UTC)</th>
                                        <th className="py-2.5 px-3">User-Agent</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loginHistory.map((l) => (
                                        <tr key={l.id} className="hover:bg-white/[0.02]">
                                            <td className="py-2.5 px-3 font-semibold text-white">{l.user_id}</td>
                                            <td className="py-2.5 px-3 font-mono text-cyan-300">{l.ip_address || "—"}</td>
                                            <td className="py-2.5 px-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    l.status === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                                                }`}>
                                                    {l.status}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-white/40">{new Date(l.created_at).toLocaleString()}</td>
                                            <td className="py-2.5 px-3 text-white/40 truncate max-w-xs">{l.user_agent || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 6: SYSTEM AUDIT LOGS */}
                {activeTab === "audit" && (
                    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">
                                Administrative Action Audit Trail
                            </h3>
                            <button onClick={fetchAuditLogs} className="text-xs text-amber-400 hover:text-amber-300 font-semibold">
                                Refresh
                            </button>
                        </div>

                        <div className="space-y-2">
                            {auditLogs.map((log) => (
                                <div key={log.id} className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-amber-400">{log.action}</span>
                                            <span className="text-white/40">• Target: {log.target_type} #{log.target_id || "global"}</span>
                                        </div>
                                        {log.details && (
                                            <p className="text-white/70 mt-0.5 font-mono text-[11px]">{log.details}</p>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-white/30 whitespace-nowrap">
                                        {new Date(log.created_at).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

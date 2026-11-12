import React, { useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  Gamepad2,
  Lock,
  Mail,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
} from "lucide-react";
import API from "../Services/API";
import { formatApiError } from "../utils/apiError";
import AndroidAppDownloadModal from "../Components/AndroidAppDownloadModal";
import soundEngine from "../utils/soundEffects";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Private Chats & Calls",
    desc: "Fast 1-on-1 & group messaging with voice/video calls and direct P2P file sharing.",
    accent: "text-sky-300",
    bg: "border-sky-400/20 bg-sky-500/5",
  },
  {
    icon: Bot,
    title: "Built-In Gemini AI",
    desc: "Chat with AI, generate voices & images, or use the live voice co-pilot anywhere.",
    accent: "text-violet-300",
    bg: "border-violet-400/20 bg-violet-500/5",
  },
  {
    icon: Gamepad2,
    title: "10 Instant 3D & Mini Games",
    desc: "Play AFTERSPACE 3D, Tornado Surfers, Tower Defense, and Co-Op right in your browser.",
    accent: "text-emerald-300",
    bg: "border-emerald-400/20 bg-emerald-500/5",
  },
  {
    icon: ShieldCheck,
    title: "Simple Privacy Protection",
    desc: "Vanish messages, snoop lock, and quick panic shortcut — no technical setup needed.",
    accent: "text-amber-300",
    bg: "border-amber-400/20 bg-amber-500/5",
  },
];

export default function LoginShowcase({ onOpenDemo }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // login | signup
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [apkModalOpen, setApkModalOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setNotice("");

    if (mode === "signup") {
      if (username.trim().length < 3) {
        setError("Please pick a username with at least 3 characters.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        const res = await API.post("/login", {
          email: email.trim(),
          password,
        });
        const token = res.data?.access_token || res.data?.token;
        if (!token) throw new Error("No authentication token returned.");

        sessionStorage.setItem("token", token);
        sessionStorage.setItem(
          "username",
          res.data?.user?.username || res.data?.username || email.trim().split("@")[0] || "Member"
        );
        if (res.data?.role) sessionStorage.setItem("role", res.data.role);
        window.dispatchEvent(new Event("sessionStorageUpdate"));
        soundEngine?.play?.("success");
        navigate("/home", { replace: true });
      } else {
        await API.post("/signup", {
          username: username.trim(),
          email: email.trim(),
          password,
        });
        soundEngine?.play?.("success");
        setNotice("Account created! Enter your password below to sign in.");
        setMode("login");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setError(formatApiError(err, mode === "login" ? "Could not sign in. Check email & password." : "Could not create account."));
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToForm = (targetMode = "login") => {
    setMode(targetMode);
    const el = document.getElementById("auth-card");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#070b12] text-white flex flex-col">
      {/* Subtle Ambient Background Gradient (Light on Mobile CPU/GPU) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.12),transparent_42%),radial-gradient(circle_at_85%_80%,rgba(139,92,246,0.12),transparent_44%)]"
      />

      {/* Clean Top Bar: Aligned Logo + Clear Action Buttons (Zero overlapping floating pills) */}
      <header className="relative z-10 w-full border-b border-white/10 bg-[#070b12]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-lg shadow-md">
              🌪️
            </div>
            <div>
              <span className="font-black tracking-tight text-base sm:text-lg text-white">ChatTornado</span>
              <span className="hidden sm:inline-block ml-2 text-xs text-slate-400">Messaging • AI • Arcade</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setApkModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
              <span>Android App</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine?.play?.("cyber_chirp");
                onOpenDemo();
              }}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 hover:brightness-110 text-slate-950 text-xs font-black shadow-md transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Try Free Demo</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToForm("login")}
              className="sm:hidden inline-flex items-center px-3 py-2 rounded-xl border border-white/15 bg-white/10 text-xs font-bold text-white cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Responsive Main Grid: Desktop 2-Col Side-by-Side | Mobile Thumb-First Order */}
      <main className="relative z-10 flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* LEFT COLUMN (Desktop Hero & Plain-English Benefits | Mobile Compact Intro First) */}
        <section className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-xs font-bold text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>No setup guides needed — start chatting or playing in 5 seconds</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.06] text-white">
            Chat, Voice AI &amp; 3D Games{" "}
            <span className="bg-gradient-to-r from-sky-300 via-indigo-300 to-emerald-300 bg-clip-text text-transparent">
              in one simple app.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
            Talk privately with friends, ask Gemini AI using voice or text, share large files directly, and jump straight into 10 browser &amp; phone games — all from one clean dashboard.
          </p>

          {/* Primary & Convenience CTA Placement (Ergonomic on both Mobile & Desktop) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                soundEngine?.play?.("cyber_chirp");
                onOpenDemo();
              }}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 hover:brightness-105 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Instant 3-Day Demo (No Account)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => scrollToForm("signup")}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Create Free Account</span>
            </button>

            <button
              type="button"
              onClick={() => setApkModalOpen(true)}
              className="sm:hidden w-full px-4 py-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Download Android APK</span>
            </button>
          </div>

          {/* 4 Crystal-Clear Feature Cards (2x2 Grid — easy to scan on Phones & Desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {FEATURES.map(({ icon: Icon, title, desc, accent, bg }) => (
              <div
                key={title}
                className={`p-4 rounded-2xl border ${bg} backdrop-blur-sm flex items-start gap-3`}
              >
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className={`w-4 h-4 ${accent}`} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">{title}</h2>
                  <p className="text-xs text-slate-300/80 mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT COLUMN (Focused Sign In / Sign Up Card) */}
        <section id="auth-card" className="lg:col-span-5 w-full">
          <div className="rounded-3xl border border-white/15 bg-[#0e1420]/95 p-6 sm:p-8 shadow-2xl">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  mode === "login"
                    ? "bg-white text-slate-950 shadow"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
                className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  mode === "signup"
                    ? "bg-white text-slate-950 shadow"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="mb-5">
              <h2 className="text-xl font-black text-white">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {mode === "login"
                  ? "Sign in with your email and password to open your dashboard."
                  : "Pick a username and password — takes less than 20 seconds."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === "signup" && (
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-300">Username</span>
                  <div className="flex items-center gap-2.5 px-3.5 h-12 rounded-xl border border-white/15 bg-black/40 focus-within:border-sky-400">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a display name"
                      required
                      className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </label>
              )}

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-300">Email</span>
                <div className="flex items-center gap-2.5 px-3.5 h-12 rounded-xl border border-white/15 bg-black/40 focus-within:border-sky-400">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-300">Password</span>
                <div className="flex items-center gap-2.5 px-3.5 h-12 rounded-xl border border-white/15 bg-black/40 focus-within:border-sky-400">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>

              {mode === "signup" && (
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-300">Confirm Password</span>
                  <div className="flex items-center gap-2.5 px-3.5 h-12 rounded-xl border border-white/15 bg-black/40 focus-within:border-sky-400">
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </label>
              )}

              {error && (
                <div className="p-3 rounded-xl border border-rose-400/35 bg-rose-500/10 text-xs text-rose-200">
                  {error}
                </div>
              )}

              {notice && (
                <div className="p-3 rounded-xl border border-emerald-400/35 bg-emerald-500/10 text-xs text-emerald-200">
                  {notice}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:brightness-110 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer mt-2"
              >
                <span>
                  {submitting
                    ? "Signing you in..."
                    : mode === "login"
                    ? "Sign In to ChatTornado"
                    : "Create Free Account"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Convenience Option inside Auth Card */}
            <div className="mt-5 pt-4 border-t border-white/10 text-center space-y-2.5">
              <div className="text-xs text-slate-400">Just want to look around first?</div>
              <button
                type="button"
                onClick={onOpenDemo}
                className="w-full py-2.5 rounded-xl border border-cyan-400/35 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Explore with 1-Tap 3-Day Demo</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      <AndroidAppDownloadModal isOpen={apkModalOpen} onClose={() => setApkModalOpen(false)} />
    </div>
  );
}

LoginShowcase.propTypes = {
  onOpenDemo: PropTypes.func.isRequired,
};

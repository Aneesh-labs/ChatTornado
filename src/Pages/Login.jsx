import React, { useEffect, useState } from "react";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";

import LoginDesktop1 from "./LoginDesktop";
import LoginDesktop2 from "./LoginDesktop2";
import LoginDesktop3 from "./LoginDesktop3";
import LoginDesktop4 from "./LoginDesktop4";

import LoginMobile from "./LoginMobile";
import DemoAccessModal from "../Components/DemoAccessModal";
import AndroidAppDownloadModal from "../Components/AndroidAppDownloadModal";
import soundEngine from "../utils/soundEffects";

const desktopPages = [
  LoginDesktop1,
  LoginDesktop2,
  LoginDesktop3,
  LoginDesktop4,
];

const QUICK_HIGHLIGHTS = [
  {
    icon: MessageSquare,
    title: "Private Chat & Calls",
    detail: "Fast direct messages, group rooms, and device-to-device file transfers.",
    tone: "text-sky-300",
  },
  {
    icon: Bot,
    title: "Built-In Gemini AI",
    detail: "Ask questions, generate voices & badges, or talk with real-time Voice AI.",
    tone: "text-violet-300",
  },
  {
    icon: Gamepad2,
    title: "10 Instant 3D & Mini Games",
    detail: "Play AFTERSPACE, Tornado Surfers, Tower Defense, and Co-Op right inside.",
    tone: "text-emerald-300",
  },
  {
    icon: ShieldCheck,
    title: "Zero-Guide Privacy",
    detail: "Vanish messages, snoop lock, and quick panic lock work out of the box.",
    tone: "text-amber-300",
  },
];

export default function Login() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isApkOpen, setIsApkOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  // Randomly pick one desktop page (supports ?v=1..4 or ?desktop=1..4 override)
  const [DesktopComponent] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const override = parseInt(params.get("v") || params.get("desktop") || "", 10);
      if (!isNaN(override) && override >= 1 && override <= desktopPages.length) {
        return desktopPages[override - 1];
      }
    }
    const randomIndex = Math.floor(Math.random() * desktopPages.length);
    return desktopPages[randomIndex];
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = (e) => setIsMobile(e.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const handlePromptDemo = () => {
      setIsDemoOpen(true);
    };
    window.addEventListener("vortex_prompt_demo_name", handlePromptDemo);
    return () => window.removeEventListener("vortex_prompt_demo_name", handlePromptDemo);
  }, []);

  const openDemo = () => {
    soundEngine?.play?.("cyber_chirp");
    setIsDemoOpen(true);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-y-auto overflow-x-hidden custom-scrollbar">
      {/* DESKTOP TOP-RIGHT FRAMEWORK: Clear CTA placement away from top-left logo */}
      <div className="hidden md:flex fixed top-4 right-5 z-40 items-center gap-2">
        <button
          type="button"
          onClick={() => setInfoOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/15 bg-black/55 hover:bg-black/75 backdrop-blur-xl text-xs font-semibold text-slate-200 shadow-lg transition cursor-pointer"
        >
          <span>What is ChatTornado?</span>
          {infoOpen ? <ChevronUp className="w-3.5 h-3.5 text-sky-300" /> : <ChevronDown className="w-3.5 h-3.5 text-sky-300" />}
        </button>

        <button
          type="button"
          onClick={() => setIsApkOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/15 bg-black/55 hover:bg-black/75 backdrop-blur-xl text-xs font-semibold text-emerald-200 shadow-lg transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
          <span>Android App</span>
        </button>

        <button
          type="button"
          onClick={openDemo}
          className="interactive-shimmer-btn flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white shadow-[0_0_24px_rgba(6,182,212,0.4)] hover:shadow-[0_0_32px_rgba(6,182,212,0.65)] transition-all cursor-pointer border border-cyan-400/40 hover:scale-[1.03] active:scale-95"
          title="Try ChatTornado instantly with a 3-Day Demo Account"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Try 3-Day Demo</span>
          <span className="px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 text-[10px] font-mono uppercase">
            No Signup
          </span>
        </button>
      </div>

      {/* PLAIN-ENGLISH QUICK MARKETING OVERVIEW DRAWER (Accessible on both Desktop & Mobile) */}
      {infoOpen && (
        <div className="fixed z-50 top-16 right-4 left-4 md:left-auto md:w-[440px] rounded-2xl border border-white/15 bg-[#0a0f18]/95 backdrop-blur-2xl p-4 shadow-2xl text-white">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
            <div>
              <div className="text-sm font-black tracking-tight">What You Get Inside ChatTornado</div>
              <div className="text-xs text-slate-400">Everything works cleanly without reading a guide</div>
            </div>
            <button
              type="button"
              onClick={() => setInfoOpen(false)}
              aria-label="Close overview"
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {QUICK_HIGHLIGHTS.map(({ icon: Icon, title, detail, tone }) => (
              <div key={title} className="p-2.5 rounded-xl border border-white/10 bg-white/[0.04]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${tone}`} />
                  <span>{title}</span>
                </div>
                <p className="text-xs text-slate-300/80 mt-1 leading-snug">{detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400">Try everything in 5 seconds:</span>
            <button
              type="button"
              onClick={() => {
                setInfoOpen(false);
                openDemo();
              }}
              className="px-3 py-1.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-black cursor-pointer"
            >
              Launch Instant Demo
            </button>
          </div>
        </div>
      )}

      {/* DESKTOP BOTTOM COMPACT FEATURE STRIP (Self-explanatory at a glance, non-overlapping) */}
      <div className="hidden lg:flex fixed bottom-3 left-1/2 -translate-x-1/2 z-30 items-center gap-3 px-4 py-1.5 rounded-full border border-white/10 bg-black/50 backdrop-blur-xl text-xs text-slate-300 shadow-lg pointer-events-auto">
        <span className="text-sky-300 font-semibold">Private Chat</span>
        <span className="text-white/20">•</span>
        <span className="text-violet-300 font-semibold">Gemini Live Voice AI</span>
        <span className="text-white/20">•</span>
        <span className="text-emerald-300 font-semibold">10 Browser &amp; 3D Games</span>
        <span className="text-white/20">•</span>
        <button
          type="button"
          onClick={() => setInfoOpen((v) => !v)}
          className="text-amber-300 hover:underline font-semibold cursor-pointer"
        >
          Quick Tour
        </button>
      </div>

      {/* MOBILE THUMB-FIRST BOTTOM ACTION BAR (Zero top telemetry collision, clears bottom-right hotspot) */}
      <div className="md:hidden fixed bottom-3 left-3 right-16 z-40 flex items-center gap-1.5 p-1.5 rounded-2xl border border-white/15 bg-[#090d16]/90 backdrop-blur-xl shadow-2xl">
        <button
          type="button"
          onClick={openDemo}
          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>3-Day Demo</span>
        </button>
        <button
          type="button"
          onClick={() => setInfoOpen((v) => !v)}
          className="py-2 px-2.5 rounded-xl border border-white/15 bg-white/5 text-xs font-semibold text-white cursor-pointer"
        >
          Features
        </button>
        <button
          type="button"
          onClick={() => setIsApkOpen(true)}
          aria-label="Android App"
          className="py-2 px-2.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-xs font-semibold text-emerald-200 flex items-center gap-1 cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>App</span>
        </button>
      </div>

      {/* Original Login UI Preserved Identically */}
      {isMobile ? <LoginMobile /> : <DesktopComponent />}

      {/* Shared Multi-User 3-Day Demo Gateway Modal */}
      <DemoAccessModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
      />

      {/* Android App Download Modal */}
      <AndroidAppDownloadModal
        isOpen={isApkOpen}
        onClose={() => setIsApkOpen(false)}
      />
    </div>
  );
}

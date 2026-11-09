import React, { useEffect, useState } from "react";
import { Sparkles, Key } from "lucide-react";

import LoginDesktop1 from "./LoginDesktop";
import LoginDesktop2 from "./LoginDesktop2";
import LoginDesktop3 from "./LoginDesktop3";
import LoginDesktop4 from "./LoginDesktop4";

import LoginMobile from "./LoginMobile";
import DemoAccessModal from "../Components/DemoAccessModal";
import soundEngine from "../utils/soundEffects";

const desktopPages = [
  LoginDesktop1,
  LoginDesktop2,
  LoginDesktop3,
  LoginDesktop4,
];

export default function Login() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );
  const [isDemoOpen, setIsDemoOpen] = useState(false);

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

  return (
    <div className="relative min-h-screen w-full">
      {/* Floating 3-Day Shared Demo Quick Launcher */}
      <div className="fixed top-3 right-3 sm:top-5 sm:right-6 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            soundEngine?.play?.("cyber_chirp");
            setIsDemoOpen(true);
          }}
          className="interactive-shimmer-btn flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold text-white shadow-[0_0_24px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.7)] transition-all cursor-pointer border border-cyan-400/40 hover:scale-105 active:scale-95"
          title="Try ChatTornado with instant 3-Day Demo Account"
        >
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="tracking-wide">🚀 3-Day Demo Access</span>
          <span className="hidden md:inline-block px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 text-[10px] font-mono uppercase">
            No Signup
          </span>
        </button>
      </div>

      {/* Main Login UI */}
      {isMobile ? <LoginMobile /> : <DesktopComponent />}

      {/* Shared Multi-User 3-Day Demo Gateway Modal */}
      <DemoAccessModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
      />
    </div>
  );
}

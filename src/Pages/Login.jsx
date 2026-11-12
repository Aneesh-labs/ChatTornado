import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import LoginDesktop1 from "./LoginDesktop";
import LoginDesktop2 from "./LoginDesktop2";
import LoginDesktop3 from "./LoginDesktop3";
import LoginDesktop4 from "./LoginDesktop4";

import LoginMobile from "./LoginMobile";
import LoginShowcase from "./LoginShowcase";
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

  // Use clear unified LoginShowcase by default; preserve ?v=1..4 & ?mobile=classic legacy overrides
  const [legacyVariant] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mobile") === "classic") return "mobile-classic";
      const override = parseInt(params.get("v") || params.get("desktop") || "", 10);
      if (!isNaN(override) && override >= 1 && override <= desktopPages.length) {
        return override;
      }
    }
    return null;
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

  const LegacyDesktopComponent =
    typeof legacyVariant === "number" ? desktopPages[legacyVariant - 1] : null;

  return (
    <div className="relative h-[100dvh] w-full overflow-y-auto overflow-x-hidden custom-scrollbar">
      {legacyVariant ? (
        <>
          <div className="fixed top-3 left-3 sm:top-5 sm:left-6 z-40 flex items-center gap-2">
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
              <span className="tracking-wide">🚀 3-Day Demo</span>
            </button>
          </div>
          {isMobile ? <LoginMobile /> : <LegacyDesktopComponent />}
        </>
      ) : (
        <LoginShowcase onOpenDemo={() => setIsDemoOpen(true)} />
      )}

      {/* Shared Multi-User 3-Day Demo Gateway Modal */}
      <DemoAccessModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
      />
    </div>
  );
}

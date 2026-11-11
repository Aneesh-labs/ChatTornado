import React, { useState } from "react";
import PropTypes from "prop-types";
import { Volume2, VolumeX } from "lucide-react";

const MENU_ITEMS = [
  { id: "new", label: "NEW EXPEDITION" },
  { id: "continue", label: "CONTINUE" },
  { id: "multiplayer", label: "MULTIPLAYER" },
  { id: "archive", label: "EXPLORATION ARCHIVE" },
  { id: "settings", label: "SETTINGS" },
  { id: "credits", label: "CREDITS" },
];

const MainMenu = ({
  hasSavedProgress,
  isMuted,
  onSelectItem,
  onToggleMute,
  onExitArcade,
}) => {
  const [hovered, setHovered] = useState("new");
  const [showCredits, setShowCredits] = useState(false);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-8 sm:p-12 md:p-16 bg-gradient-to-r from-[#151A19]/75 via-[#151A19]/25 to-transparent">
      {/* Top Bar: Quiet Return to ChatTornado Arcade */}
      <div className="flex items-center justify-between">
        <span className="as-tech-label uppercase text-[#8F938C]">Observatory v2.0 • Mobile + Web</span>
        <button
          type="button"
          onClick={onExitArcade}
          className="as-tech-label uppercase text-[#8F938C] hover:text-[#F5F3ED] transition-colors cursor-pointer"
        >
          Return to Arcade
        </button>
      </div>

      {/* Main Left-Offset Editorial Title Composition (Part 5.2 & 5.3) */}
      <div className="max-w-3xl pl-0 sm:pl-8 md:pl-14 my-auto">
        <h1 className="as-display-title text-[#F5F3ED] tracking-tight">AFTERSPACE</h1>
        <div className="as-sans text-sm sm:text-base text-[#BEBDB2] tracking-[0.14em] uppercase mt-2">
          Echoes of the Fourth Dimension
        </div>
        <p className="as-body text-[#8F938C] italic mt-4 max-w-md">
          &ldquo;Somewhere beyond the geometry we understand.&rdquo;
        </p>

        {/* Vertical Cinematic Title Sequence Navigation */}
        <nav className="mt-10 flex flex-col items-start gap-2.5" aria-label="Main Menu">
          {MENU_ITEMS.map((item) => {
            const disabled = item.id === "continue" && !hasSavedProgress;
            const isActive = hovered === item.id && !disabled;
            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onMouseEnter={() => setHovered(item.id)}
                onFocus={() => setHovered(item.id)}
                onClick={() => {
                  if (item.id === "credits") {
                    setShowCredits((v) => !v);
                    return;
                  }
                  onSelectItem(item.id);
                }}
                className={`group flex items-center gap-3 py-1 text-left transition-all duration-150 ${
                  disabled
                    ? "text-[#636C66] cursor-not-allowed opacity-55"
                    : isActive
                    ? "text-[#F5F3ED] translate-x-[3px] cursor-pointer"
                    : "text-[#BEBDB2]/80 hover:text-[#F5F3ED] cursor-pointer"
                }`}
              >
                <span
                  className={`inline-block h-px transition-all duration-150 ${
                    isActive ? "w-5 bg-[#B99A70]" : "w-0 bg-transparent"
                  }`}
                />
                <span className="text-xs sm:text-sm tracking-[0.16em] font-medium">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {showCredits && (
          <div className="mt-6 max-w-md as-surface-atmospheric p-4">
            <div className="as-tech-label uppercase text-[#B99A70]">Credits</div>
            <p className="as-secondary text-[#D5D2C8] mt-1.5">
              AFTERSPACE — Quiet Cosmic Minimalism design system, stereographic 4D projection engine, and WebGL observatory world built inside ChatTornado.
            </p>
          </div>
        )}
      </div>

      {/* Lower Discreet Information Area (Part 5.4) */}
      <div className="flex items-end justify-between gap-4">
        <div className="as-direct-shadow">
          <div className="as-tech-label uppercase text-[#B99A70]">CHAPTER 01</div>
          <div className="as-secondary text-[#D5D2C8] tracking-wider uppercase mt-0.5">
            THE SILENT SINGULARITY
          </div>
        </div>

        <div className="flex items-center gap-4 as-direct-shadow">
          <span className="as-tech-label text-[#B99A70]">VERSION 2.0</span>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? "Unmute Audio" : "Mute Audio"}
            className="w-8 h-8 rounded-[2px] border border-[#E8E9E2]/15 bg-[#151A19]/65 hover:border-[#E8E9E2]/40 text-[#E8E9E2] flex items-center justify-center cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-[#A97C69]" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

MainMenu.propTypes = {
  hasSavedProgress: PropTypes.bool.isRequired,
  isMuted: PropTypes.bool.isRequired,
  onSelectItem: PropTypes.func.isRequired,
  onToggleMute: PropTypes.func.isRequired,
  onExitArcade: PropTypes.func.isRequired,
};

export default MainMenu;

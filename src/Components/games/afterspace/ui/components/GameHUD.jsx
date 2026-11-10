import React from "react";
import PropTypes from "prop-types";
import { BookOpen, Compass, Layers, Package, Pause, Radio } from "lucide-react";

const GameHUD = ({
  region,
  suitEnergy,
  stability,
  activeObjective,
  nearestInteractable,
  scannerActive,
  temporalLabel,
  regionBanner,
  discoveryToast,
  coopNotice,
  timelineOpen,
  onExamine,
  onToggleScanner,
  onToggleTimeline,
  onOpenOverlay,
  onPause,
  onTouchMove,
}) => {
  const interactOpacity = nearestInteractable ? "opacity-100" : "opacity-65 hover:opacity-100";

  return (
    <div className="pointer-events-none fixed inset-0 z-10 p-6 sm:p-8 md:px-12 md:py-9 flex flex-col justify-between">
      {/* Top Row: Top-Left Region Indicator + Top-Right Compact Suit Status */}
      <div className="flex items-start justify-between gap-6">
        <div className={`transition-opacity duration-300 ${interactOpacity} as-direct-shadow`}>
          <div className="as-tech-label uppercase text-[#E8E9E2]">
            {region?.name || "The Forgotten Gateway"}
          </div>
          <div className="as-tech-label text-[#8F938C] mt-0.5">
            {region?.code || "EXPEDITION 01 / REGION 01"}
          </div>
        </div>

        <div className={`flex items-start gap-6 transition-opacity duration-300 ${interactOpacity} as-direct-shadow`}>
          <div className="hidden sm:flex items-center gap-6">
            <div className="text-right">
              <div className="as-tech-label uppercase text-[#8F938C]">Suit energy</div>
              <div className="as-mono text-xs text-[#E8E9E2] mt-0.5">{Math.round(suitEnergy)}%</div>
            </div>
            <div className="h-6 w-px bg-[#E8E9E2]/15" />
            <div className="text-right">
              <div className="as-tech-label uppercase text-[#8F938C]">Stability</div>
              <div
                className={`as-mono text-xs mt-0.5 ${
                  stability < 75 ? "text-[#A97C69]" : "text-[#89988A]"
                }`}
              >
                {Math.round(stability)}%
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause Menu"
            className="pointer-events-auto h-8 px-2.5 rounded-[2px] border border-[#E8E9E2]/15 bg-[#151A19]/65 hover:border-[#E8E9E2]/35 text-[#E8E9E2] flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" />
            <span className="hidden sm:inline as-tech-label">ESC</span>
          </button>
        </div>
      </div>

      {/* Subtle Region Title Reveal (Part 8.1 — disappears naturally after 4-5s) */}
      {regionBanner?.visible && (
        <div className="pointer-events-none absolute top-24 left-6 sm:left-12 max-w-md transition-opacity duration-700 as-direct-shadow">
          <div className="as-tech-label uppercase text-[#B99A70] mb-1.5">
            {regionBanner.code}
          </div>
          <h2 className="as-region-heading text-[#F5F3ED]">
            {regionBanner.title}
          </h2>
          <p className="as-secondary text-[#BEBDB2] mt-1.5">
            {regionBanner.subtitle}
          </p>
        </div>
      )}

      {/* Subtle Center Interaction Indicator (Part 7.3 & 7.4 — no reticle unless near interactable) */}
      {nearestInteractable && (
        <div className="pointer-events-none fixed inset-0 flex flex-col items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#F5F3ED]/90 mb-5" />
          <button
            type="button"
            onClick={onExamine}
            className="pointer-events-auto flex flex-col items-center gap-1 px-4 py-2 rounded-[2px] bg-[#151A19]/75 border border-[#E8E9E2]/20 hover:border-[#B99A70]/60 transition-all duration-200 cursor-pointer"
          >
            <span className="as-tech-label uppercase text-[#8F938C]">
              {nearestInteractable.label}
            </span>
            <div className="flex items-center gap-2 text-xs text-[#F5F3ED]">
              <span>{nearestInteractable.action}</span>
              <span className="as-mono px-1.5 py-0.5 border border-[#E8E9E2]/25 text-[#B99A70] rounded-[2px]">
                E
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Discovery & Coop Notifications near bottom-center (Part 8.2 & 19.2) */}
      <div className="pointer-events-none fixed bottom-24 inset-x-0 flex flex-col items-center gap-2 px-4">
        {discoveryToast && (
          <div className="as-surface-atmospheric px-5 py-3 text-center max-w-sm transition-all duration-300">
            <div className="as-tech-label uppercase text-[#B99A70]">{discoveryToast.kicker}</div>
            <div className="as-serif text-xl text-[#F5F3ED] mt-0.5">{discoveryToast.title}</div>
            <div className="as-secondary text-[#BEBDB2] mt-0.5">{discoveryToast.sub}</div>
          </div>
        )}
        {coopNotice && (
          <div className="as-surface-atmospheric px-4 py-2 text-xs text-[#D5D2C8]">
            {coopNotice.text}
          </div>
        )}
      </div>

      {/* Bottom Row: Equipment & Instruments (Bottom-Left) + Compact Objective (Bottom-Right) */}
      <div className="flex items-end justify-between gap-6">
        <div className="pointer-events-auto flex flex-col gap-2">
          {/* Compact touch directional pad ONLY on small mobile viewports */}
          <div className="grid grid-cols-3 gap-1 w-28 sm:hidden mb-1">
            <div />
            <button
              type="button"
              onPointerDown={() => onTouchMove("forward", true)}
              onPointerUp={() => onTouchMove("forward", false)}
              onPointerLeave={() => onTouchMove("forward", false)}
              className="h-8 bg-[#151A19]/75 border border-[#E8E9E2]/15 text-xs text-[#E8E9E2]"
            >
              ↑
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => onTouchMove("left", true)}
              onPointerUp={() => onTouchMove("left", false)}
              onPointerLeave={() => onTouchMove("left", false)}
              className="h-8 bg-[#151A19]/75 border border-[#E8E9E2]/15 text-xs text-[#E8E9E2]"
            >
              ←
            </button>
            <button
              type="button"
              onPointerDown={() => onTouchMove("backward", true)}
              onPointerUp={() => onTouchMove("backward", false)}
              onPointerLeave={() => onTouchMove("backward", false)}
              className="h-8 bg-[#151A19]/75 border border-[#E8E9E2]/15 text-xs text-[#E8E9E2]"
            >
              ↓
            </button>
            <button
              type="button"
              onPointerDown={() => onTouchMove("right", true)}
              onPointerUp={() => onTouchMove("right", false)}
              onPointerLeave={() => onTouchMove("right", false)}
              className="h-8 bg-[#151A19]/75 border border-[#E8E9E2]/15 text-xs text-[#E8E9E2]"
            >
              →
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleScanner}
              className={`h-8 px-2.5 rounded-[2px] border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                scannerActive
                  ? "bg-[#202625] border-[#B99A70]/60 text-[#F5F3ED]"
                  : "bg-[#151A19]/70 border-[#E8E9E2]/15 text-[#BEBDB2] hover:text-[#F5F3ED]"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Scan</span>
              <span className="as-mono text-[#8F938C]">Q</span>
            </button>

            <button
              type="button"
              onClick={onToggleTimeline}
              className={`h-8 px-2.5 rounded-[2px] border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                timelineOpen
                  ? "bg-[#202625] border-[#8496A1]/70 text-[#F5F3ED]"
                  : "bg-[#151A19]/70 border-[#E8E9E2]/15 text-[#BEBDB2] hover:text-[#F5F3ED]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="as-mono">{temporalLabel}</span>
              <span className="as-mono text-[#8F938C]">T</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenOverlay("journal")}
              className="h-8 px-2.5 rounded-[2px] border border-[#E8E9E2]/15 bg-[#151A19]/70 text-[#BEBDB2] hover:text-[#F5F3ED] text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Journal</span>
              <span className="as-mono text-[#8F938C]">J</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenOverlay("inventory")}
              className="h-8 px-2.5 rounded-[2px] border border-[#E8E9E2]/15 bg-[#151A19]/70 text-[#BEBDB2] hover:text-[#F5F3ED] text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Artifacts</span>
              <span className="as-mono text-[#8F938C]">I</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenOverlay("map")}
              className="h-8 px-2.5 rounded-[2px] border border-[#E8E9E2]/15 bg-[#151A19]/70 text-[#BEBDB2] hover:text-[#F5F3ED] text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Map</span>
              <span className="as-mono text-[#8F938C]">M</span>
            </button>
          </div>
        </div>

        {/* Bottom-Right Compact Objective Reminder (Type C direct text, clickable to Tab overview) */}
        <button
          type="button"
          onClick={() => onOpenOverlay("mission")}
          className={`pointer-events-auto text-right transition-opacity duration-300 ${interactOpacity} as-direct-shadow cursor-pointer group`}
        >
          <div className="as-tech-label uppercase text-[#8F938C] group-hover:text-[#B99A70] transition-colors">
            Expedition record [Tab]
          </div>
          <div className="as-secondary text-[#E8E9E2] mt-0.5 max-w-[260px]">
            {activeObjective ? activeObjective.title : "Threshold stabilized."}
          </div>
          <div className="hidden md:block text-xs text-[#8F938C] mt-1">
            WASD Move • Drag / Dbl-Click Look
          </div>
        </button>
      </div>
    </div>
  );
};

GameHUD.propTypes = {
  region: PropTypes.object,
  suitEnergy: PropTypes.number.isRequired,
  stability: PropTypes.number.isRequired,
  activeObjective: PropTypes.object,
  nearestInteractable: PropTypes.object,
  scannerActive: PropTypes.bool.isRequired,
  temporalLabel: PropTypes.string.isRequired,
  regionBanner: PropTypes.object,
  discoveryToast: PropTypes.object,
  coopNotice: PropTypes.object,
  timelineOpen: PropTypes.bool.isRequired,
  onExamine: PropTypes.func.isRequired,
  onToggleScanner: PropTypes.func.isRequired,
  onToggleTimeline: PropTypes.func.isRequired,
  onOpenOverlay: PropTypes.func.isRequired,
  onPause: PropTypes.func.isRequired,
  onTouchMove: PropTypes.func.isRequired,
};

export default GameHUD;

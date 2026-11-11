import React from "react";
import PropTypes from "prop-types";
import { EXPLORER_CHARACTERS } from "../../afterspaceEngine";

const DIFFICULTIES = [
  {
    id: "Guided",
    desc: "Subtle alignment notes and calmer temporal variance for uninterrupted observation.",
  },
  {
    id: "Standard",
    desc: "Unassisted spatial discovery with calibrated scanner and temporal tools.",
  },
  {
    id: "Unassisted",
    desc: "No calibration hints. Interpret coordinates directly from architecture and inscriptions.",
  },
];

const ExpeditionSetup = ({
  expeditionMode,
  difficulty,
  selectedCharacterId = "aria",
  onChangeCharacter,
  onChangeMode,
  onChangeDifficulty,
  onBegin,
  onBack,
}) => {
  const selectedDiff = DIFFICULTIES.find((d) => d.id === difficulty) || DIFFICULTIES[1];

  return (
    <div className="fixed inset-0 z-20 bg-[#151A19]/75 backdrop-blur-sm flex items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-6xl as-surface-solid grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left: Framed Architectural Preview Window of Starting Region */}
        <div className="lg:col-span-6 p-8 md:p-10 bg-[#202625] border-b lg:border-b-0 lg:border-r border-[#E8E9E2]/10 flex flex-col justify-between min-h-[280px]">
          <div className="as-tech-label uppercase text-[#8F938C]">
            Horizon Survey • Region 01
          </div>

          <svg viewBox="0 0 420 260" className="w-full h-auto my-6">
            <rect width="420" height="260" fill="#151A19" />
            <circle cx="96" cy="72" r="28" fill="#EDEAE1" fillOpacity="0.82" />
            <ellipse
              cx="96"
              cy="72"
              rx="42"
              ry="12"
              fill="none"
              stroke="#B99A70"
              strokeOpacity="0.55"
              transform="rotate(-14 96 72)"
            />
            <polygon points="0,210 140,178 270,185 420,210 420,260 0,260" fill="#202625" />
            <rect x="190" y="96" width="12" height="90" fill="#D5D2C8" fillOpacity="0.72" />
            <rect x="228" y="96" width="12" height="90" fill="#D5D2C8" fillOpacity="0.72" />
            <rect x="184" y="88" width="62" height="10" fill="#EDEAE1" fillOpacity="0.85" />
            <line x1="165" y1="260" x2="205" y2="186" stroke="#8F938C" strokeOpacity="0.3" />
            <line x1="265" y1="260" x2="225" y2="186" stroke="#8F938C" strokeOpacity="0.3" />
          </svg>

          <div className="flex items-center justify-between text-xs text-[#8F938C]">
            <span>The Forgotten Gateway</span>
            <span className="as-mono">T + 000</span>
          </div>
        </div>

        {/* Right: Editorial Preparation Arrangement (Part 6) */}
        <div className="lg:col-span-6 p-8 md:p-12 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="as-tech-label uppercase text-[#B99A70]">NEW EXPEDITION</span>
              <button
                type="button"
                onClick={onBack}
                className="as-tech-label text-[#8F938C] hover:text-[#F5F3ED] cursor-pointer"
              >
                BACK
              </button>
            </div>

            <h2 className="as-chapter-title text-[#F5F3ED] mt-2">
              The Silent Singularity
            </h2>

            <p className="as-body text-[#BEBDB2] mt-4">
              An abandoned structure lies beyond the known limits of your instruments. No record explains its origin.
            </p>

            {/* Explorer Character Roster */}
            <div className="mt-6">
              <div className="as-tech-label uppercase text-[#8F938C] mb-2">Explorer Profile</div>
              <div className="grid grid-cols-3 gap-2">
                {EXPLORER_CHARACTERS.map((ch) => {
                  const active = selectedCharacterId === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => onChangeCharacter?.(ch.id)}
                      className={`text-left px-3 py-2.5 rounded-[2px] border transition-colors cursor-pointer ${
                        active
                          ? "bg-[#303735] border-[#B99A70]/65 text-[#F5F3ED]"
                          : "border-[#E8E9E2]/12 text-[#8F938C] hover:text-[#E8E9E2]"
                      }`}
                    >
                      <div className="text-xs font-medium">{ch.name}</div>
                      <div className="text-[11px] opacity-75 mt-0.5">{ch.title}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expedition Type */}
            <div className="mt-7">
              <div className="as-tech-label uppercase text-[#8F938C] mb-2">Expedition Type</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {["Solo Exploration", "Cooperative Exploration"].map((mode) => {
                  const selected = expeditionMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onChangeMode(mode)}
                      className={`text-left px-4 py-3 rounded-[2px] border text-sm transition-colors cursor-pointer ${
                        selected
                          ? "bg-[#303735] border-[#B99A70]/65 text-[#F5F3ED]"
                          : "border-[#E8E9E2]/12 text-[#8F938C] hover:text-[#E8E9E2]"
                      }`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty */}
            <div className="mt-6">
              <div className="as-tech-label uppercase text-[#8F938C] mb-2">Difficulty</div>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTIES.map((d) => {
                  const selected = difficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => onChangeDifficulty(d.id)}
                      className={`px-3 py-2.5 rounded-[2px] border text-xs font-medium transition-colors cursor-pointer ${
                        selected
                          ? "bg-[#303735] border-[#B99A70]/65 text-[#F5F3ED]"
                          : "border-[#E8E9E2]/12 text-[#8F938C] hover:text-[#E8E9E2]"
                      }`}
                    >
                      {d.id}
                    </button>
                  );
                })}
              </div>
              <p className="as-secondary text-[#BEBDB2] mt-2.5">{selectedDiff.desc}</p>
            </div>
          </div>

          <div className="pt-8 mt-6 border-t border-[#E8E9E2]/10">
            <button
              type="button"
              onClick={onBegin}
              className="w-full py-3.5 px-6 rounded-[2px] bg-[#202625] hover:bg-[#303735] border border-[#E8E9E2]/25 text-[#F5F3ED] text-xs tracking-[0.18em] uppercase font-medium transition-colors cursor-pointer"
            >
              BEGIN EXPEDITION
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

ExpeditionSetup.propTypes = {
  expeditionMode: PropTypes.string.isRequired,
  difficulty: PropTypes.string.isRequired,
  selectedCharacterId: PropTypes.string,
  onChangeCharacter: PropTypes.func,
  onChangeMode: PropTypes.func.isRequired,
  onChangeDifficulty: PropTypes.func.isRequired,
  onBegin: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default ExpeditionSetup;

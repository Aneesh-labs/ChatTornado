import React, { useState } from "react";
import PropTypes from "prop-types";
import { JOURNAL_CATALOG } from "../../afterspaceEngine";

const CATEGORIES = [
  "Overview",
  "Locations",
  "Discoveries",
  "Artifacts",
  "Anomalies",
  "Scientific records",
  "Expedition history",
];

const renderDiagramSvg = (diagram, dark) => {
  const stroke = dark ? "#E8E9E2" : "#151A19";
  const accent = "#B99A70";
  const muted = dark ? "#8F938C" : "#636C66";

  if (diagram === "tesseract") {
    return (
      <svg viewBox="0 0 260 170" className="w-full h-44">
        <rect x="75" y="35" width="110" height="100" fill="none" stroke={stroke} strokeWidth="1" />
        <rect x="98" y="55" width="64" height="60" fill="none" stroke={accent} strokeWidth="1.2" />
        {[
          [75, 35, 98, 55],
          [185, 35, 162, 55],
          [75, 135, 98, 115],
          [185, 135, 162, 115],
        ].map(([x1, y1, x2, y2], idx) => (
          <line key={idx} x1={x1} y1={y1} x2={x2} y2={y2} stroke={muted} strokeWidth="1" />
        ))}
        <text x="12" y="22" fill={muted} fontSize="9" fontFamily="IBM Plex Mono">
          FIG. 06 — 16 VERTEX HYPERCUBE PROJECTION
        </text>
      </svg>
    );
  }

  if (diagram === "observatory") {
    return (
      <svg viewBox="0 0 260 170" className="w-full h-44">
        <circle cx="130" cy="85" r="52" fill="none" stroke={stroke} strokeWidth="1" />
        <ellipse cx="130" cy="85" rx="64" ry="22" fill="none" stroke={accent} strokeWidth="1" transform="rotate(-18 130 85)" />
        <line x1="35" y1="138" x2="225" y2="138" stroke={muted} strokeDasharray="3 3" />
        <text x="12" y="22" fill={muted} fontSize="9" fontFamily="IBM Plex Mono">
          FIG. 04 — TEMPORAL SPAN CONFIGURATION
        </text>
      </svg>
    );
  }

  if (diagram === "coordinates") {
    return (
      <svg viewBox="0 0 260 170" className="w-full h-44">
        <rect x="52" y="28" width="156" height="112" fill="none" stroke={stroke} strokeWidth="1" />
        <line x1="72" y1="68" x2="188" y2="68" stroke={accent} strokeWidth="1" />
        <text x="82" y="60" fill={stroke} fontSize="11" fontFamily="IBM Plex Mono">
          XW : 045°   YW : 035°
        </text>
        <text x="82" y="96" fill={muted} fontSize="9" fontFamily="IBM Plex Mono">
          SYMMETRY THRESHOLD ±005°
        </text>
      </svg>
    );
  }

  if (diagram === "arch") {
    return (
      <svg viewBox="0 0 260 170" className="w-full h-44">
        <rect x="86" y="42" width="16" height="96" fill="none" stroke={stroke} strokeWidth="1" />
        <rect x="158" y="42" width="16" height="96" fill="none" stroke={stroke} strokeWidth="1" />
        <rect x="78" y="30" width="104" height="12" fill="none" stroke={accent} strokeWidth="1.2" />
        <line x1="30" y1="138" x2="230" y2="138" stroke={muted} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 260 170" className="w-full h-44">
      <circle cx="130" cy="85" r="36" fill="none" stroke={stroke} strokeWidth="1" />
      <circle cx="130" cy="85" r="6" fill={accent} />
      <line x1="40" y1="85" x2="220" y2="85" stroke={muted} strokeDasharray="2 4" />
      <line x1="130" y1="22" x2="130" y2="148" stroke={muted} strokeDasharray="2 4" />
    </svg>
  );
};

const JournalScreen = ({
  journalDiscovered,
  biome,
  onSelectEntrySound,
  onClose,
}) => {
  const [category, setCategory] = useState("Overview");
  const [selectedId, setSelectedId] = useState(JOURNAL_CATALOG[0].id);
  const [paperDark, setPaperDark] = useState(biome !== "desert");
  const [enlargedDiagram, setEnlargedDiagram] = useState(false);

  const visibleEntries = JOURNAL_CATALOG.filter((entry) => {
    if (category === "Overview" || category === "Expedition history") return true;
    return entry.category === category;
  });

  const activeEntry =
    JOURNAL_CATALOG.find((e) => e.id === selectedId) || visibleEntries[0] || JOURNAL_CATALOG[0];
  const isDiscovered = Boolean(journalDiscovered[activeEntry.id]);

  return (
    <div className="fixed inset-0 z-30 bg-[#151A19]/85 backdrop-blur-sm flex items-center justify-center p-4 md:p-10">
      <div
        className={`w-full max-w-6xl h-[min(88vh,780px)] flex flex-col overflow-hidden transition-colors duration-300 ${
          paperDark ? "as-paper-surface-dark" : "as-paper-surface"
        }`}
      >
        {/* Top Bar */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            paperDark ? "border-[#E8E9E2]/12" : "border-[#BEBDB2]"
          }`}
        >
          <div>
            <div className={`as-tech-label uppercase ${paperDark ? "text-[#8F938C]" : "text-[#636C66]"}`}>
              Scientific Expedition Notebook
            </div>
            <h2 className="as-section-heading mt-0.5">Field Journal</h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPaperDark((v) => !v)}
              className={`px-3 py-1.5 rounded-[2px] border text-xs cursor-pointer ${
                paperDark
                  ? "border-[#E8E9E2]/15 text-[#BEBDB2] hover:text-[#F5F3ED]"
                  : "border-[#BEBDB2] text-[#303735] hover:bg-[#D5D2C8]"
              }`}
            >
              {paperDark ? "Ivory Paper" : "Observatory Slate"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-1.5 rounded-[2px] border text-xs cursor-pointer ${
                paperDark
                  ? "border-[#E8E9E2]/20 bg-[#303735] text-[#F5F3ED]"
                  : "border-[#8F938C] bg-[#D5D2C8] text-[#151A19]"
              }`}
            >
              Close [J]
            </button>
          </div>
        </div>

        {/* 3-Column Physical Notebook Layout (Part 9.1) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0">
          {/* Left Column: Index Sections */}
          <div
            className={`md:col-span-3 p-5 border-b md:border-b-0 md:border-r overflow-y-auto as-scroll ${
              paperDark ? "border-[#E8E9E2]/10" : "border-[#BEBDB2]"
            }`}
          >
            <div className={`as-tech-label uppercase mb-3 ${paperDark ? "text-[#8F938C]" : "text-[#636C66]"}`}>
              Sections
            </div>
            <div className="flex md:flex-col gap-1 overflow-x-auto">
              {CATEGORIES.map((cat) => {
                const active = cat === category;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      onSelectEntrySound?.();
                    }}
                    className={`text-left px-3 py-2 rounded-[2px] text-xs whitespace-nowrap transition-colors cursor-pointer ${
                      active
                        ? paperDark
                          ? "bg-[#303735] text-[#F5F3ED]"
                          : "bg-[#D5D2C8] text-[#151A19] font-medium"
                        : paperDark
                        ? "text-[#8F938C] hover:text-[#EDEAE1]"
                        : "text-[#636C66] hover:text-[#151A19]"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Middle Column: Entries List */}
          <div
            className={`md:col-span-4 p-5 border-b md:border-b-0 md:border-r overflow-y-auto as-scroll ${
              paperDark ? "border-[#E8E9E2]/10" : "border-[#BEBDB2]"
            }`}
          >
            <div className={`as-tech-label uppercase mb-3 ${paperDark ? "text-[#8F938C]" : "text-[#636C66]"}`}>
              Records ({Object.values(journalDiscovered).filter(Boolean).length}/{JOURNAL_CATALOG.length})
            </div>

            <div className="space-y-2">
              {visibleEntries.map((entry) => {
                const known = Boolean(journalDiscovered[entry.id]);
                const active = activeEntry.id === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(entry.id);
                      onSelectEntrySound?.();
                    }}
                    className={`w-full text-left p-3.5 rounded-[2px] border transition-colors cursor-pointer ${
                      active
                        ? paperDark
                          ? "bg-[#303735]/80 border-[#B99A70]/65"
                          : "bg-[#D5D2C8]/70 border-[#B99A70]"
                        : paperDark
                        ? "border-[#E8E9E2]/10 hover:border-[#E8E9E2]/25"
                        : "border-[#BEBDB2]/80 hover:border-[#8F938C]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="as-mono text-xs text-[#B99A70]">{entry.code}</span>
                      <span className={`as-tech-label ${paperDark ? "text-[#8F938C]" : "text-[#636C66]"}`}>
                        {known ? entry.temporalState : "UNDISCOVERED"}
                      </span>
                    </div>
                    <div className="as-serif text-lg mt-1">
                      {known ? entry.title : "Unrecorded Observation"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Editorial Typography & Architectural Diagram (Part 9.2 & 9.3) */}
          <div className="md:col-span-5 p-6 md:p-8 overflow-y-auto as-scroll">
            {isDiscovered ? (
              <>
                <div className="as-mono text-xs text-[#B99A70]">{activeEntry.code}</div>
                <h3 className="as-section-heading mt-1">{activeEntry.title}</h3>
                <p className="as-body italic mt-3 opacity-85">
                  &ldquo;{activeEntry.quote}&rdquo;
                </p>

                {/* Diagram Plate with Larger Inspect Toggle */}
                <div
                  className={`my-5 p-3 border rounded-[2px] ${
                    paperDark ? "border-[#E8E9E2]/12 bg-[#151A19]/75" : "border-[#BEBDB2] bg-[#F5F3ED]"
                  }`}
                >
                  {renderDiagramSvg(activeEntry.diagram, paperDark)}
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      onClick={() => setEnlargedDiagram(true)}
                      className="as-tech-label text-[#B99A70] hover:underline cursor-pointer"
                    >
                      Inspect Plate ↗
                    </button>
                  </div>
                </div>

                <p className="as-body opacity-90">{activeEntry.body}</p>

                <dl
                  className={`mt-6 pt-4 border-t grid grid-cols-2 gap-y-3 gap-x-4 text-xs ${
                    paperDark ? "border-[#E8E9E2]/12" : "border-[#BEBDB2]"
                  }`}
                >
                  <div>
                    <dt className="opacity-60">Discovery date</dt>
                    <dd className="mt-0.5 font-medium">{activeEntry.date}</dd>
                  </div>
                  <div>
                    <dt className="opacity-60">Location</dt>
                    <dd className="mt-0.5 font-medium">{activeEntry.location}</dd>
                  </div>
                  <div>
                    <dt className="opacity-60">Temporal state</dt>
                    <dd className="as-mono mt-0.5">{activeEntry.temporalState}</dd>
                  </div>
                  <div>
                    <dt className="opacity-60">Classification</dt>
                    <dd className="mt-0.5 font-medium">{activeEntry.classification}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="opacity-60">Coordinates</dt>
                    <dd className="as-mono mt-0.5">
                      X {activeEntry.coords.x.toFixed(2)} • Y {activeEntry.coords.y.toFixed(2)} • Z{" "}
                      {activeEntry.coords.z.toFixed(2)}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 opacity-70">
                <div className="as-mono text-xs text-[#B99A70]">{activeEntry.code}</div>
                <div className="as-serif text-2xl mt-2">Section Incomplete</div>
                <p className="as-secondary mt-2 max-w-xs">
                  Continue exploring {activeEntry.location} with your scanner and examination instruments to document this phenomenon.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Larger Plate Inspection View (Part 9.3) */}
      {enlargedDiagram && isDiscovered && (
        <div
          onClick={() => setEnlargedDiagram(false)}
          className="fixed inset-0 z-40 bg-[#151A19]/92 flex items-center justify-center p-8 cursor-pointer"
        >
          <div className="max-w-2xl w-full as-surface-solid p-8 text-center">
            <div className="as-mono text-xs text-[#B99A70] mb-3">{activeEntry.code} — {activeEntry.title}</div>
            {renderDiagramSvg(activeEntry.diagram, true)}
            <div className="as-tech-label text-[#8F938C] mt-4">Click anywhere to return</div>
          </div>
        </div>
      )}
    </div>
  );
};

JournalScreen.propTypes = {
  journalDiscovered: PropTypes.object.isRequired,
  biome: PropTypes.string.isRequired,
  onSelectEntrySound: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

export default JournalScreen;

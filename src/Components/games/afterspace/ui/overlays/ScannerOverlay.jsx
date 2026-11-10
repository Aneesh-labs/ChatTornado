import React from "react";
import PropTypes from "prop-types";

const ScannerOverlay = ({ player, scanTarget, scanProgress, onClose }) => {
  const pct = Math.round(scanProgress || 0);
  const strokeDashoffset = 100 - pct;

  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      {/* Top quiet instrument marker */}
      <div className="fixed top-20 left-6 sm:left-12 flex items-center gap-3 as-direct-shadow">
        <span className="w-1.5 h-1.5 rounded-full bg-[#B99A70]" />
        <span className="as-tech-label uppercase text-[#EDEAE1]">Observation Mode</span>
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto as-mono text-xs text-[#8F938C] hover:text-[#F5F3ED] underline-offset-4 hover:underline cursor-pointer"
        >
          [Q] Exit
        </button>
      </div>

      {/* Gradual circular progress around central axis only while actively scanning */}
      {scanTarget && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <svg width="58" height="58" viewBox="0 0 40 40" className="-rotate-90">
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="rgba(232,233,226,0.16)"
              strokeWidth="1"
            />
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="#B99A70"
              strokeWidth="1.25"
              strokeDasharray="100"
              strokeDashoffset={strokeDashoffset}
              pathLength="100"
            />
          </svg>
        </div>
      )}

      {/* Restrained Scanner Data Readout (Part 10.1) */}
      <div className="fixed right-6 sm:right-12 top-1/3 w-64 as-surface-atmospheric p-5">
        {scanTarget ? (
          <>
            <div className="as-tech-label uppercase text-[#B99A70]">{scanTarget.label}</div>
            <div className="as-secondary text-[#BEBDB2] mt-1">Unknown classification</div>

            <div className="mt-4 pt-3 border-t border-[#E8E9E2]/12 space-y-2">
              <div className="as-tech-label uppercase text-[#8F938C]">Spatial coordinates</div>
              <div className="grid grid-cols-3 gap-2 as-mono text-xs text-[#EDEAE1]">
                <span>X {scanTarget.x.toFixed(2)}</span>
                <span>Y {scanTarget.y.toFixed(2)}</span>
                <span>Z {scanTarget.z.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-[#8F938C]">Temporal signature</span>
              <span className="as-mono text-[#E8E9E2]">{scanTarget.signature || "T + 000.00"}</span>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-[#8F938C]">Observation confidence</span>
              <span className="as-mono text-[#B99A70]">{pct}%</span>
            </div>
          </>
        ) : (
          <>
            <div className="as-tech-label uppercase text-[#8F938C]">Ambient Telemetry</div>
            <div className="mt-3 grid grid-cols-3 gap-2 as-mono text-xs text-[#EDEAE1]">
              <span>X {player.x.toFixed(1)}</span>
              <span>Y {player.y.toFixed(1)}</span>
              <span>Z {player.z.toFixed(1)}</span>
            </div>
            <p className="as-secondary text-[#8F938C] mt-3">
              Approach temporal residue in Region 01 to calibrate observation sample.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

ScannerOverlay.propTypes = {
  player: PropTypes.object.isRequired,
  scanTarget: PropTypes.object,
  scanProgress: PropTypes.number,
  onClose: PropTypes.func.isRequired,
};

export default ScannerOverlay;

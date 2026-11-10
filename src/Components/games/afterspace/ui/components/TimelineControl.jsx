import React from "react";
import PropTypes from "prop-types";
import { TEMPORAL_STATES } from "../../afterspaceEngine";

const TimelineControl = ({
  currentIndex,
  previewIndex,
  onHoverState,
  onSelectState,
  onClose,
}) => {
  const shown =
    previewIndex !== null && previewIndex !== undefined
      ? TEMPORAL_STATES[previewIndex]
      : TEMPORAL_STATES[currentIndex];

  return (
    <div className="pointer-events-auto fixed bottom-20 left-1/2 -translate-x-1/2 z-20 w-[min(92vw,760px)]">
      <div className="as-surface-atmospheric px-6 py-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="as-tech-label uppercase text-[#8F938C]">
            Temporal Instrument
          </div>

          <div className="flex items-center gap-3">
            {shown.unstable && (
              <span className="as-tech-label uppercase text-[#A97C69]">
                TEMPORAL STATE: UNSTABLE
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="as-tech-label text-[#8F938C] hover:text-[#F5F3ED] cursor-pointer"
            >
              CLOSE [T]
            </button>
          </div>
        </div>

        {/* Horizontal calibrated tick axis */}
        <div className="relative pt-2 pb-1">
          <div className="flex items-center justify-between px-2 mb-2">
            {Array.from({ length: 19 }).map((_, idx) => (
              <div
                key={idx}
                className={`w-px ${
                  idx % 9 === 0 ? "h-2.5 bg-[#E8E9E2]/45" : "h-1.5 bg-[#E8E9E2]/15"
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {TEMPORAL_STATES.map((st, idx) => {
              const selected = idx === currentIndex;
              const previewing = idx === previewIndex && idx !== currentIndex;
              return (
                <button
                  key={st.id}
                  type="button"
                  onMouseEnter={() => onHoverState(idx)}
                  onMouseLeave={() => onHoverState(null)}
                  onClick={() => onSelectState(idx)}
                  className={`text-left px-3 py-2.5 rounded-[2px] border transition-all duration-150 cursor-pointer ${
                    selected
                      ? "bg-[#303735]/90 border-[#B99A70]/65 text-[#F5F3ED]"
                      : previewing
                      ? "bg-[#202625]/80 border-[#E8E9E2]/30 text-[#EDEAE1]"
                      : "bg-transparent border-[#E8E9E2]/10 text-[#8F938C] hover:text-[#E8E9E2]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium tracking-wider uppercase">{st.label}</span>
                    {selected && <span className="w-1.5 h-1.5 rounded-full bg-[#B99A70]" />}
                  </div>
                  <div className="as-mono text-xs mt-1 text-[#BEBDB2]">{st.code}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="as-secondary text-[#BEBDB2] mt-2.5">
          {previewIndex !== null && previewIndex !== undefined && previewIndex !== currentIndex
            ? `Preview: ${shown.summary}`
            : shown.summary}
        </div>
      </div>
    </div>
  );
};

TimelineControl.propTypes = {
  currentIndex: PropTypes.number.isRequired,
  previewIndex: PropTypes.number,
  onHoverState: PropTypes.func.isRequired,
  onSelectState: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default TimelineControl;

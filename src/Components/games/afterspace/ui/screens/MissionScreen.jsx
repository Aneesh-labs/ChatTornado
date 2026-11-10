import React from "react";
import PropTypes from "prop-types";

const MissionScreen = ({
  objectives,
  hintTier,
  difficulty,
  onRevealHint,
  onClose,
}) => {
  const completedCount = objectives.filter((o) => o.completed).length;

  return (
    <div className="fixed inset-0 z-30 bg-[#151A19]/90 backdrop-blur-sm flex items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-3xl as-surface-solid p-8 md:p-12">
        <div className="flex items-start justify-between pb-6 border-b border-[#E8E9E2]/12">
          <div>
            <div className="as-tech-label uppercase text-[#B99A70]">Expedition Record</div>
            <h2 className="as-chapter-title text-[#F5F3ED] mt-1">THE SILENT SINGULARITY</h2>
            <p className="as-body text-[#BEBDB2] mt-3 max-w-xl">
              An unexplained structure lies at the center of this region. Its internal geometry does not correspond to any known spatial configuration.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-[2px] border border-[#E8E9E2]/20 bg-[#202625] text-xs text-[#F5F3ED] cursor-pointer"
          >
            Close [Tab]
          </button>
        </div>

        <div className="flex items-center justify-between mt-6 mb-4 text-xs">
          <span className="as-tech-label uppercase text-[#8F938C]">Sequential Objectives</span>
          <span className="as-mono text-[#E8E9E2]">
            {completedCount} / {objectives.length} OBSERVED
          </span>
        </div>

        <ol className="space-y-3">
          {objectives.map((obj, idx) => {
            const tier = hintTier[obj.id] || 0;
            const allowHints = difficulty !== "Unassisted";
            return (
              <li
                key={obj.id}
                className={`p-4 border rounded-[2px] transition-opacity ${
                  obj.completed
                    ? "border-[#E8E9E2]/10 opacity-55"
                    : "border-[#E8E9E2]/18 bg-[#202625]/55"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="as-mono text-xs text-[#8F938C]">0{idx + 1}.</span>
                    <span
                      className={`text-sm ${
                        obj.completed ? "line-through text-[#8F938C]" : "text-[#F5F3ED]"
                      }`}
                    >
                      {obj.title}
                    </span>
                  </div>

                  {!obj.completed && allowHints && tier < obj.hints.length && (
                    <button
                      type="button"
                      onClick={() => onRevealHint(obj.id)}
                      className="as-tech-label text-[#B99A70] hover:underline cursor-pointer shrink-0"
                    >
                      {tier === 0 ? "Consult field note" : "More explicit note"}
                    </button>
                  )}
                </div>

                {!obj.completed && tier > 0 && (
                  <p className="as-secondary text-[#89988A] mt-2 pl-7">
                    {obj.hints[Math.min(tier - 1, obj.hints.length - 1)]}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

MissionScreen.propTypes = {
  objectives: PropTypes.array.isRequired,
  hintTier: PropTypes.object.isRequired,
  difficulty: PropTypes.string.isRequired,
  onRevealHint: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default MissionScreen;

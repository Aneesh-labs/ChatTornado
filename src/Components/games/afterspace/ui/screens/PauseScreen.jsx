import React from "react";
import PropTypes from "prop-types";

const PauseScreen = ({
  regionName,
  temporalCode,
  onResume,
  onRestart,
  onOpenJournal,
  onOpenSettings,
  onExitExpedition,
}) => {
  const actions = [
    { id: "resume", label: "Resume", fn: onResume, primary: true },
    { id: "restart", label: "Restart checkpoint", fn: onRestart },
    { id: "journal", label: "Field journal", fn: onOpenJournal },
    { id: "settings", label: "Settings", fn: onOpenSettings },
    { id: "exit", label: "Exit expedition", fn: onExitExpedition },
  ];

  return (
    <div className="fixed inset-0 z-30 bg-[#151A19]/75 backdrop-blur-md flex items-center justify-center p-8 md:p-16">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
        {/* Left Column: Quiet Pause Typography & Navigation (Part 16) */}
        <div className="md:col-span-5">
          <div className="as-tech-label uppercase text-[#8F938C] mb-2">Expedition Suspended</div>
          <h2 className="as-chapter-title text-[#F5F3ED]">PAUSED</h2>

          <div className="mt-8 flex flex-col items-start gap-2.5">
            {actions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.fn}
                className={`py-1.5 text-left transition-all duration-150 cursor-pointer ${
                  item.primary
                    ? "as-serif text-3xl text-[#F5F3ED] hover:translate-x-1"
                    : "text-sm text-[#BEBDB2] hover:text-[#F5F3ED] hover:translate-x-1"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Quiet Atmospheric Still Frame */}
        <div className="hidden md:block md:col-span-7 as-surface-atmospheric p-8">
          <div className="as-tech-label uppercase text-[#B99A70]">{temporalCode}</div>
          <div className="as-region-heading text-[#EDEAE1] mt-2">{regionName}</div>
          <p className="as-body text-[#8F938C] mt-4 max-w-md">
            Instruments remain idle. Environmental geometry continues rotating silently beyond the threshold.
          </p>
        </div>
      </div>
    </div>
  );
};

PauseScreen.propTypes = {
  regionName: PropTypes.string.isRequired,
  temporalCode: PropTypes.string.isRequired,
  onResume: PropTypes.func.isRequired,
  onRestart: PropTypes.func.isRequired,
  onOpenJournal: PropTypes.func.isRequired,
  onOpenSettings: PropTypes.func.isRequired,
  onExitExpedition: PropTypes.func.isRequired,
};

export default PauseScreen;

import React from "react";
import PropTypes from "prop-types";
import { ArrowLeft, Pause, Play, RotateCcw, Trophy } from "lucide-react";

const HiFiGameShell = ({
  title,
  badge,
  badgeTone = "bg-cyan-500/20 border-cyan-400/40 text-cyan-200",
  onBack,
  score,
  highScore,
  isPaused,
  onTogglePause,
  onReset,
  controlsHint,
  extraHeader,
  children,
}) => {
  return (
    <div className="flex flex-col items-center gap-3.5 max-w-4xl mx-auto w-full select-none">
      <div className="flex flex-wrap items-center justify-between gap-2 w-full px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="text-sm sm:text-base font-black text-white tracking-tight">
            {title}
          </span>
          {badge && (
            <span className={`px-2.5 py-0.5 rounded-full border text-xs font-extrabold ${badgeTone}`}>
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {extraHeader}
          {score !== undefined && (
            <span className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/80">
              Score: <strong className="text-cyan-300 tabular-nums">{Number(score).toLocaleString()}</strong>
            </span>
          )}
          {highScore !== undefined && (
            <span className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-amber-300 flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" />
              <span className="tabular-nums">{Number(Math.max(highScore, score || 0)).toLocaleString()}</span>
            </span>
          )}
          {onTogglePause && (
            <button
              type="button"
              onClick={onTogglePause}
              aria-label={isPaused ? "Resume game" : "Pause game"}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
          )}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              aria-label="Restart game"
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {children}

      {controlsHint && (
        <div className="text-xs text-white/60 text-center px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">
          {controlsHint}
        </div>
      )}
    </div>
  );
};

HiFiGameShell.propTypes = {
  title: PropTypes.string.isRequired,
  badge: PropTypes.string,
  badgeTone: PropTypes.string,
  onBack: PropTypes.func.isRequired,
  score: PropTypes.number,
  highScore: PropTypes.number,
  isPaused: PropTypes.bool,
  onTogglePause: PropTypes.func,
  onReset: PropTypes.func,
  controlsHint: PropTypes.string,
  extraHeader: PropTypes.node,
  children: PropTypes.node.isRequired,
};

export default HiFiGameShell;

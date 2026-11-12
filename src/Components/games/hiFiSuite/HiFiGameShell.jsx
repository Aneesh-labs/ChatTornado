import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";

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
  const shellRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localMuted, setLocalMuted] = useState(() =>
    typeof window !== "undefined" ? Boolean(window.__arcadeMuted) : false
  );

  const toggleFullscreen = useCallback(async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } else {
        setIsFullscreen((v) => !v);
      }
    } catch (_) {
      setIsFullscreen((v) => !v);
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    const onMuteSync = (e) => {
      if (e?.detail && typeof e.detail.isMuted === "boolean") {
        setLocalMuted(e.detail.isMuted);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    window.addEventListener("arcade:mute-changed", onMuteSync);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      window.removeEventListener("arcade:mute-changed", onMuteSync);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.metaKey || e.ctrlKey) return;
      const k = e.key?.toLowerCase();
      if (k === "p" && onTogglePause) {
        e.preventDefault();
        onTogglePause();
      } else if (k === "r" && onReset) {
        e.preventDefault();
        onReset();
      } else if (k === "f") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onReset, onTogglePause, toggleFullscreen]);

  const isNewBest =
    score !== undefined &&
    highScore !== undefined &&
    Number(score) > 0 &&
    Number(score) >= Number(highScore);

  const handleToggleMute = () => {
    window.dispatchEvent(new CustomEvent("arcade:toggle-mute"));
  };

  return (
    <div
      ref={shellRef}
      className={`flex flex-col items-center gap-3.5 w-full select-none transition-all ${
        isFullscreen
          ? "fixed inset-0 z-[90] bg-[#050814] p-4 sm:p-6 overflow-y-auto justify-center"
          : "max-w-4xl mx-auto"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 w-full px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer transition"
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
            <span
              className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1 ${
                isNewBest
                  ? "bg-amber-500/20 border-amber-400/50 text-amber-200 animate-pulse"
                  : "bg-white/5 border-white/10 text-amber-300"
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              <span className="tabular-nums">{Number(Math.max(highScore, score || 0)).toLocaleString()}</span>
              {isNewBest && (
                <span className="ml-1 inline-flex items-center gap-0.5 text-[11px] font-black text-amber-200">
                  <Sparkles className="h-3 w-3" /> NEW
                </span>
              )}
            </span>
          )}
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={localMuted ? "Unmute sound" : "Mute sound"}
            title={localMuted ? "Unmute Sound FX" : "Mute Sound FX"}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition"
          >
            {localMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </button>
          {onTogglePause && (
            <button
              type="button"
              onClick={onTogglePause}
              aria-label={isPaused ? "Resume game" : "Pause game"}
              title="Pause / Resume (P)"
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
          )}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              aria-label="Restart game"
              title="Restart (R)"
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit theater mode" : "Enter theater mode"}
            title="Theater / Fullscreen (F)"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4 text-cyan-300" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {children}

      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-white/65 text-center px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">
        {controlsHint && <span>{controlsHint}</span>}
        <span className="text-white/30">•</span>
        <span className="text-white/50">
          {onTogglePause ? "P Pause • " : ""}
          {onReset ? "R Restart • " : ""}
          F Theater
        </span>
      </div>
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

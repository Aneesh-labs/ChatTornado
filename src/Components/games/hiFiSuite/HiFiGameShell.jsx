import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import {
  ArrowLeft,
  Flame,
  Gamepad2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { getMasteryMedal } from "../arcadeProgression";
import { BOT_TIERS, getActiveBotTierId, getBotTier, setActiveBotTierId } from "../botPersonas";

const dispatchSyntheticKey = (type, codes) => {
  codes.forEach((code) => {
    const key =
      code === "Space"
        ? " "
        : code === "ShiftLeft"
        ? "Shift"
        : code.startsWith("Key")
        ? code.slice(3).toLowerCase()
        : code;
    try {
      window.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true }));
    } catch (_) {}
  });
};

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
  const prevScoreRef = useRef(Number(score) || 0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [paceStreak, setPaceStreak] = useState(0);
  const [showTouchPad, setShowTouchPad] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 || "ontouchstart" in window : false
  );
  const [localMuted, setLocalMuted] = useState(() =>
    typeof window !== "undefined" ? Boolean(window.__arcadeMuted) : false
  );
  const [rankInfo, setRankInfo] = useState(() =>
    typeof window !== "undefined" && window.__arcadeLevelInfo
      ? window.__arcadeLevelInfo
      : null
  );
  const [botTierId, setBotTierId] = useState(getActiveBotTierId);

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
    const onXpSync = (e) => {
      if (e?.detail) setRankInfo(e.detail);
    };
    const onBotSync = (e) => {
      if (e?.detail?.tier) setBotTierId(e.detail.tier);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    window.addEventListener("arcade:mute-changed", onMuteSync);
    window.addEventListener("arcade:xp-updated", onXpSync);
    window.addEventListener("arcade:bot-tier-changed", onBotSync);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      window.removeEventListener("arcade:mute-changed", onMuteSync);
      window.removeEventListener("arcade:xp-updated", onXpSync);
      window.removeEventListener("arcade:bot-tier-changed", onBotSync);
    };
  }, []);

  useEffect(() => {
    const curr = Number(score) || 0;
    const prev = prevScoreRef.current;
    if (curr > prev) {
      const delta = curr - prev;
      prevScoreRef.current = curr;
      setPaceStreak((p) => Math.min(99, p + 1));
      try { navigator.vibrate?.(10); } catch (_) {}
      window.dispatchEvent(new CustomEvent("arcade:score-delta", { detail: { delta } }));
    } else if (curr < prev) {
      prevScoreRef.current = curr;
      setPaceStreak(0);
    }
  }, [score]);

  useEffect(() => {
    if (paceStreak <= 0) return undefined;
    const t = setTimeout(() => setPaceStreak(0), 4500);
    return () => clearTimeout(t);
  }, [paceStreak]);

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

  const bestSeen = Math.max(Number(highScore) || 0, Number(score) || 0);
  const medal = getMasteryMedal(bestSeen);
  const isNewBest =
    score !== undefined &&
    highScore !== undefined &&
    Number(score) > 0 &&
    Number(score) >= Number(highScore);

  const handleToggleMute = () => {
    window.dispatchEvent(new CustomEvent("arcade:toggle-mute"));
  };

  const handleNextRandom = () => {
    window.dispatchEvent(new CustomEvent("arcade:next-random"));
  };

  const touchBtnProps = (codes) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      try { navigator.vibrate?.(6); } catch (_) {}
      dispatchSyntheticKey("keydown", codes);
    },
    onPointerUp: () => dispatchSyntheticKey("keyup", codes),
    onPointerCancel: () => dispatchSyntheticKey("keyup", codes),
    onPointerLeave: () => dispatchSyntheticKey("keyup", codes),
  });

  return (
    <div
      ref={shellRef}
      className={`flex flex-col items-center gap-3 w-full select-none transition-all ${
        isFullscreen
          ? "fixed inset-0 z-[90] bg-[#050814] p-3 sm:p-6 overflow-y-auto justify-center"
          : "max-w-4xl mx-auto"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 w-full px-1">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="text-sm sm:text-base font-black text-white tracking-tight">
            {title}
          </span>
          {badge && (
            <span className={`px-2 py-0.5 rounded-full border text-xs font-extrabold ${badgeTone}`}>
              {badge}
            </span>
          )}
          {medal && (
            <span className={`px-2 py-0.5 rounded-full border text-xs font-extrabold ${medal.tone}`}>
              {medal.emoji} {medal.label}
            </span>
          )}
          {rankInfo && (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-400/30 text-xs font-bold text-violet-200">
              Lv.{rankInfo.level} {rankInfo.rankTitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {extraHeader}
          {paceStreak >= 2 && (
            <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-orange-500/25 to-rose-500/25 border border-orange-400/45 text-xs font-black text-orange-200 flex items-center gap-1 animate-pulse">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              {paceStreak >= 5 ? "ON FIRE!" : `${paceStreak}x PACE`}
            </span>
          )}
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
              <span className="tabular-nums">{bestSeen.toLocaleString()}</span>
              {isNewBest && (
                <span className="ml-1 inline-flex items-center gap-0.5 text-xs font-black text-amber-200">
                  <Sparkles className="h-3 w-3" /> NEW
                </span>
              )}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              const idx = BOT_TIERS.findIndex((b) => b.id === botTierId);
              const next = BOT_TIERS[(idx + 1) % BOT_TIERS.length];
              setBotTierId(setActiveBotTierId(next.id));
            }}
            title={`Bot Intelligence: ${getBotTier(botTierId).name} (${getBotTier(botTierId).label}) — Click to cycle`}
            className={`px-2.5 py-1.5 min-h-[38px] rounded-xl border text-xs font-extrabold flex items-center gap-1 cursor-pointer transition ${getBotTier(botTierId).tone}`}
          >
            <span>{getBotTier(botTierId).emoji}</span>
            <span className="hidden sm:inline">{getBotTier(botTierId).name}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowTouchPad((v) => !v)}
            aria-label="Toggle phone touch pad"
            title="Toggle Mobile Touch Pad"
            className={`p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border cursor-pointer transition ${
              showTouchPad
                ? "bg-cyan-500/25 border-cyan-400/50 text-cyan-200"
                : "bg-white/10 border-transparent hover:bg-white/20 text-white"
            }`}
          >
            <Gamepad2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNextRandom}
            aria-label="Play next random game"
            title="Next Random Game"
            className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-violet-500/20 hover:bg-violet-500/35 border border-violet-400/30 text-violet-200 cursor-pointer transition"
          >
            <Shuffle className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={localMuted ? "Unmute sound" : "Mute sound"}
            title={localMuted ? "Unmute Sound FX" : "Mute Sound FX"}
            className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition"
          >
            {localMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </button>
          {onTogglePause && (
            <button
              type="button"
              onClick={onTogglePause}
              aria-label={isPaused ? "Resume game" : "Pause game"}
              title="Pause / Resume (P)"
              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition"
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
              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit theater mode" : "Enter theater mode"}
            title="Theater / Fullscreen (F)"
            className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4 text-cyan-300" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Responsive Phone-Safe Stage Container */}
      <div className="w-full flex flex-col items-center overflow-x-hidden [&_canvas]:max-w-full [&_canvas]:h-auto [&_canvas]:touch-none">
        {children}
      </div>

      {/* Universal On-Screen Phone Touch Pad */}
      {showTouchPad && (
        <div className="w-full max-w-full sm:max-w-md flex items-center justify-between gap-2 sm:gap-3 px-2.5 sm:px-3 py-2.5 rounded-2xl bg-white/[0.04] border border-white/15 touch-none">
          <div className="grid grid-cols-3 gap-1.5 w-32 sm:w-36 shrink-0">
            <div />
            <button
              type="button"
              aria-label="Up"
              {...touchBtnProps(["ArrowUp", "KeyW"])}
              className="h-11 rounded-xl bg-white/10 active:bg-cyan-500/40 text-white font-black text-sm touch-none cursor-pointer"
            >
              ▲
            </button>
            <div />
            <button
              type="button"
              aria-label="Left"
              {...touchBtnProps(["ArrowLeft", "KeyA"])}
              className="h-11 rounded-xl bg-white/10 active:bg-cyan-500/40 text-white font-black text-sm touch-none cursor-pointer"
            >
              ◀
            </button>
            <button
              type="button"
              aria-label="Down"
              {...touchBtnProps(["ArrowDown", "KeyS"])}
              className="h-11 rounded-xl bg-white/10 active:bg-cyan-500/40 text-white font-black text-sm touch-none cursor-pointer"
            >
              ▼
            </button>
            <button
              type="button"
              aria-label="Right"
              {...touchBtnProps(["ArrowRight", "KeyD"])}
              className="h-11 rounded-xl bg-white/10 active:bg-cyan-500/40 text-white font-black text-sm touch-none cursor-pointer"
            >
              ▶
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Boost or Shift"
              {...touchBtnProps(["ShiftLeft"])}
              className="h-12 px-4 rounded-2xl bg-violet-500/25 active:bg-violet-500/50 border border-violet-400/40 text-violet-100 font-black text-xs touch-none cursor-pointer"
            >
              BOOST
            </button>
            <button
              type="button"
              aria-label="Action or Space"
              {...touchBtnProps(["Space"])}
              className="h-14 px-5 rounded-2xl bg-cyan-500/30 active:bg-cyan-500/60 border border-cyan-400/50 text-white font-black text-xs touch-none cursor-pointer"
            >
              ACT / FIRE
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-white/65 text-center px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">
        {controlsHint && <span>{controlsHint}</span>}
        <span className="text-white/30 hidden sm:inline">•</span>
        <span className="text-white/50 hidden sm:inline">
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

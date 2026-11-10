import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import {
  RotateCcw,
  Play,
  Pause,
  ArrowLeft,
  Shield,
  Magnet,
  Zap,
  Flame,
  Trophy,
  Coins,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Wind,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { soundEngine } from "../../utils/soundEffects";
import TornadoSurfers3DScene from "./TornadoSurfers3DScene";
import {
  createInitialRunnerState,
  triggerJump,
  triggerSlideOrSlam,
  triggerLaneMove,
  triggerHoverboard,
  stepRunnerState,
  BASE_SPEED,
} from "./tornadoSurfersEngine";

const POWERUP_BARS = [
  { key: "hoverboardTimer", label: "BOARD", max: 18.0, color: "bg-cyan-400", text: "text-cyan-300", Icon: Shield },
  { key: "jetpackTimer", label: "JETPACK", max: 6.5, color: "bg-sky-400", text: "text-sky-300", Icon: Flame },
  { key: "sneakersTimer", label: "BOOTS", max: 8.5, color: "bg-emerald-400", text: "text-emerald-300", Icon: Wind },
  { key: "magnetTimer", label: "MAGNET", max: 9.0, color: "bg-rose-400", text: "text-rose-300", Icon: Magnet },
  { key: "multiplierTimer", label: "2X MULT", max: 10.0, color: "bg-amber-400", text: "text-amber-300", Icon: Zap },
];

const TornadoSurfersGame = ({ onBack, isMuted = false, onSaveScore }) => {
  const stateRef = useRef(createInitialRunnerState());
  const savedThisRunRef = useRef(false);
  const hudAccumRef = useRef(0);
  const lastCoinAudioRef = useRef(0);

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const onSaveScoreRef = useRef(onSaveScore);
  useEffect(() => {
    onSaveScoreRef.current = onSaveScore;
  }, [onSaveScore]);

  const [highScore, setHighScore] = useState(() =>
    parseInt(localStorage.getItem("subwaysurfers_highscore") || "0", 10)
  );
  const highScoreRef = useRef(highScore);
  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  const [isNewBest, setIsNewBest] = useState(false);

  const [hud, setHud] = useState({
    phase: "ready",
    score: 0,
    coins: 0,
    hoverboards: 3,
    hoverboardTimer: 0,
    magnetTimer: 0,
    multiplierTimer: 0,
    jetpackTimer: 0,
    sneakersTimer: 0,
    chaserTimer: 0,
    speedMult: 1.0,
    combo: 0,
    stunts: 0,
  });

  const syncHudFromEngine = useCallback(() => {
    const s = stateRef.current;
    setHud({
      phase: s.phase,
      score: s.score,
      coins: s.coins,
      hoverboards: s.hoverboards,
      hoverboardTimer: s.hoverboardTimer,
      magnetTimer: s.magnetTimer,
      multiplierTimer: s.multiplierTimer,
      jetpackTimer: s.jetpackTimer,
      sneakersTimer: s.sneakersTimer,
      chaserTimer: s.chaserTimer,
      speedMult: +(s.speed / BASE_SPEED).toFixed(1),
      combo: s.combo,
      stunts: s.stunts,
    });
  }, []);

  const playAudio = useCallback((type) => {
    if (!isMutedRef.current) {
      soundEngine.play(type);
    }
  }, []);

  const handleCrashRecord = useCallback(
    (s) => {
      playAudio("boom");
      if (s.score > highScoreRef.current) {
        highScoreRef.current = s.score;
        setHighScore(s.score);
        setIsNewBest(true);
        localStorage.setItem("subwaysurfers_highscore", s.score.toString());
      }
      if (!savedThisRunRef.current && onSaveScoreRef.current && s.score > 0) {
        savedThisRunRef.current = true;
        onSaveScoreRef.current("subwaysurfers", s.score);
      }
      syncHudFromEngine();
    },
    [playAudio, syncHudFromEngine]
  );

  const startNewRun = useCallback(() => {
    const fresh = createInitialRunnerState();
    fresh.phase = "playing";
    stateRef.current = fresh;
    savedThisRunRef.current = false;
    hudAccumRef.current = 0;
    setIsNewBest(false);
    syncHudFromEngine();
    playAudio("whoosh");
  }, [playAudio, syncHudFromEngine]);

  const togglePause = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === "playing") {
      s.phase = "paused";
      syncHudFromEngine();
    } else if (s.phase === "paused") {
      s.phase = "playing";
      syncHudFromEngine();
    }
  }, [syncHudFromEngine]);

  const handleJump = useCallback(() => {
    if (stateRef.current.phase === "ready") {
      startNewRun();
      return;
    }
    const jumped = triggerJump(stateRef.current);
    if (jumped) playAudio("boing");
  }, [playAudio, startNewRun]);

  const handleSlide = useCallback(() => {
    const slid = triggerSlideOrSlam(stateRef.current);
    if (slid) playAudio("whoosh");
  }, [playAudio]);

  const handleMove = useCallback(
    (delta) => {
      const s = stateRef.current;
      if (s.phase !== "playing") return;
      const moved = triggerLaneMove(s, delta);
      if (moved) {
        playAudio("laser");
        return;
      }
      if (s.phase === "gameover") {
        handleCrashRecord(s);
      } else if (s.stumbleTimer > 0.3) {
        playAudio("boom");
        syncHudFromEngine();
      }
    },
    [handleCrashRecord, playAudio, syncHudFromEngine]
  );

  const handleBoard = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === "ready" || s.phase === "gameover") {
      startNewRun();
      return;
    }
    const ok = triggerHoverboard(s);
    if (ok) {
      playAudio("tada");
      syncHudFromEngine();
    }
  }, [playAudio, startNewRun, syncHudFromEngine]);

  const handleStep = useCallback(
    (dt) => {
      const s = stateRef.current;
      if (s.phase !== "playing") return;

      const events = stepRunnerState(s, dt);
      if (events.coinPicked) {
        const now = performance.now();
        if (now - lastCoinAudioRef.current >= 55) {
          lastCoinAudioRef.current = now;
          playAudio("coin");
        }
      }
      if (events.powerupPicked || events.shieldSaved || events.stunt) {
        playAudio("tada");
        syncHudFromEngine();
      }
      if (events.crashed) {
        handleCrashRecord(s);
        return;
      }

      hudAccumRef.current += dt;
      if (hudAccumRef.current >= 0.08) {
        hudAccumRef.current = 0;
        syncHudFromEngine();
      }
    },
    [handleCrashRecord, playAudio, syncHudFromEngine]
  );

  // Keyboard controls for laptop / desktop
  useEffect(() => {
    const onKeyDown = (e) => {
      const s = stateRef.current;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        handleMove(-1);
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        handleMove(1);
      } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        if (s.phase === "ready" || s.phase === "gameover") startNewRun();
        else handleJump();
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleSlide();
      } else if (e.key === " ") {
        e.preventDefault();
        if (s.phase === "ready" || s.phase === "gameover") startNewRun();
        else handleBoard();
      } else if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleMove, handleJump, handleSlide, handleBoard, startNewRun, togglePause]);

  const activeBars = POWERUP_BARS.filter((b) => hud[b.key] > 0.05);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-2.5 select-none">
      {/* Compact Sci-Fi Telemetry Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-slate-950/85 border border-cyan-500/20 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-200 transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Arcade</span>
          </button>
          <div>
            <div className="text-xs font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-fuchsia-400 uppercase">
              Tornado Surfers 3D
            </div>
            <div className="text-[11px] font-medium text-slate-400 hidden sm:block">
              Neo-Rail Cyber Runner • {hud.speedMult.toFixed(1)}x Mach
            </div>
          </div>
        </div>

        {/* Live Telemetry Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-amber-400/25">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold tabular-nums text-amber-300">{hud.coins}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-fuchsia-400/25">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
            <span className="text-xs font-bold tabular-nums text-fuchsia-300">{hud.stunts}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-cyan-400/30">
            <span className="text-[11px] font-semibold text-cyan-400/80">SCORE</span>
            <span className="text-xs sm:text-sm font-black tabular-nums text-white">
              {hud.score.toLocaleString()}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-white/10">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-bold tabular-nums text-slate-300">
              {highScore.toLocaleString()}
            </span>
          </div>

          {(hud.phase === "playing" || hud.phase === "paused") && (
            <button
              type="button"
              onClick={togglePause}
              aria-label={hud.phase === "paused" ? "Resume game" : "Pause game"}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 transition active:scale-95"
            >
              {hud.phase === "paused" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Full-Bleed Phone-First 3D WebGL Viewport */}
      <div className="relative w-full h-[61dvh] sm:h-[66dvh] min-h-[380px] max-h-[700px] rounded-2xl overflow-hidden border border-cyan-500/30 bg-[#050816] shadow-[0_0_50px_-12px_rgba(6,182,212,0.35)]">
        <TornadoSurfers3DScene
          simRef={stateRef}
          onStep={handleStep}
          onSwipeMove={handleMove}
          onSwipeJump={handleJump}
          onSwipeSlide={handleSlide}
          onDoubleTap={handleBoard}
        />

        {/* Floating Top-Left Active Powerup Timers */}
        {hud.phase === "playing" && (
          <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1.5 max-w-[165px]">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/75 border border-cyan-400/30 backdrop-blur-sm">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-200">
                Boards: {hud.hoverboards}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                • {hud.speedMult.toFixed(1)}x
              </span>
            </div>

            {activeBars.map(({ key, label, max, color, text, Icon }) => {
              const pct = Math.max(4, Math.min(100, (hud[key] / max) * 100));
              return (
                <div
                  key={key}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-white/10 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold ${text}`}>
                      <Icon className="w-3 h-3" />
                      {label}
                    </span>
                    <span className="text-[11px] font-bold tabular-nums text-slate-200">
                      {hud[key].toFixed(1)}s
                    </span>
                  </div>
                  <div className="w-28 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-75`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Top-Right Chaser Warning & Combo Streak */}
        {hud.phase === "playing" && (
          <div className="pointer-events-none absolute top-3 right-3 flex flex-col items-end gap-1.5">
            {hud.chaserTimer > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/90 border border-rose-400/60 text-rose-200 shadow-lg shadow-rose-950/60 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-black tracking-wide">
                  ENFORCER LOCK • {hud.chaserTimer.toFixed(1)}s
                </span>
              </div>
            )}
            {hud.combo > 1 && (
              <div className="px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-400/40 text-xs font-black text-amber-300 backdrop-blur-sm">
                {hud.combo}x COIN COMBO
              </div>
            )}
          </div>
        )}

        {/* READY OVERLAY */}
        {hud.phase === "ready" && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-cyan-400/35 bg-slate-900/95 p-5 shadow-2xl text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-xs font-bold text-cyan-300 mb-3">
                <Zap className="w-3.5 h-3.5" />
                THREE.JS 3D EDITION
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Tornado Surfers
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Dodge Express Moving Trains, vault rooftops with Super Boots, chain{" "}
                <span className="text-fuchsia-300 font-semibold">+50 Stunts</span>, and fire your Hoverboard EMP shield.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-left text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10">
                  <div className="font-bold text-cyan-300">Touch / Mobile</div>
                  <div className="text-slate-400 mt-0.5">Swipe L/R/Up/Down • Double-tap Shield</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10">
                  <div className="font-bold text-fuchsia-300">Keyboard</div>
                  <div className="text-slate-400 mt-0.5">WASD / Arrows • Space Shield • P Pause</div>
                </div>
              </div>

              <button
                type="button"
                onClick={startNewRun}
                className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-fuchsia-500 hover:brightness-110 text-slate-950 font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30 transition active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                LAUNCH 3D RUN
              </button>
            </div>
          </div>
        )}

        {/* PAUSED OVERLAY */}
        {hud.phase === "paused" && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
            <div className="w-full max-w-xs rounded-2xl border border-cyan-400/35 bg-slate-900/95 p-5 text-center shadow-2xl">
              <h3 className="text-xl font-black text-white">RUN PAUSED</h3>
              <p className="text-xs text-slate-400 mt-1">
                Score: {hud.score.toLocaleString()} • {hud.coins} Coins
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={togglePause}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  RESUME
                </button>
                <button
                  type="button"
                  onClick={startNewRun}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  RESTART RUN
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GAMEOVER OVERLAY */}
        {hud.phase === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-2xl border border-rose-500/40 bg-slate-900/95 p-5 text-center shadow-2xl">
              {isNewBest && (
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-xs font-black text-amber-300 mb-2">
                  <Trophy className="w-3.5 h-3.5" />
                  NEW PERSONAL RECORD!
                </div>
              )}
              <h3 className="text-2xl font-black text-white">WIPED OUT!</h3>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-950/85 border border-cyan-400/20">
                  <div className="text-[11px] font-semibold text-slate-400">FINAL SCORE</div>
                  <div className="text-lg font-black tabular-nums text-cyan-300">
                    {hud.score.toLocaleString()}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/85 border border-yellow-400/20">
                  <div className="text-[11px] font-semibold text-slate-400">BEST RECORD</div>
                  <div className="text-lg font-black tabular-nums text-yellow-300">
                    {highScore.toLocaleString()}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/85 border border-amber-400/20">
                  <div className="text-[11px] font-semibold text-slate-400">COINS</div>
                  <div className="text-base font-bold tabular-nums text-amber-300">{hud.coins}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/85 border border-fuchsia-400/20">
                  <div className="text-[11px] font-semibold text-slate-400">AIR STUNTS</div>
                  <div className="text-base font-bold tabular-nums text-fuchsia-300">{hud.stunts}</div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={startNewRun}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:brightness-110 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  RUN AGAIN
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-bold text-sm transition active:scale-95"
                >
                  EXIT
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Thumb-Friendly Tactical Deck (Mobile Tap + Desktop Click) */}
      <div className="grid grid-cols-5 gap-2">
        <button
          type="button"
          onClick={() => handleMove(-1)}
          aria-label="Move Left"
          className="h-12 sm:h-11 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/25 text-cyan-300 flex items-center justify-center gap-1 text-xs font-bold touch-manipulation transition active:scale-95 active:bg-cyan-500/20"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">LEFT</span>
        </button>

        <button
          type="button"
          onClick={handleJump}
          aria-label="Jump"
          className="h-12 sm:h-11 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 flex items-center justify-center gap-1 text-xs font-bold touch-manipulation transition active:scale-95 active:bg-emerald-500/20"
        >
          <ChevronUp className="w-5 h-5" />
          <span className="hidden sm:inline">JUMP</span>
        </button>

        <button
          type="button"
          onClick={handleBoard}
          aria-label="Activate Hoverboard Shield"
          className={`h-12 sm:h-11 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-black touch-manipulation transition active:scale-95 ${
            hud.hoverboardTimer > 0
              ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-inner shadow-cyan-500/30"
              : "bg-slate-900/90 hover:bg-slate-800 border-fuchsia-500/35 text-fuchsia-300"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span className="tabular-nums">{hud.hoverboards}</span>
        </button>

        <button
          type="button"
          onClick={handleSlide}
          aria-label="Slide or Air Slam"
          className="h-12 sm:h-11 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-amber-500/30 text-amber-300 flex items-center justify-center gap-1 text-xs font-bold touch-manipulation transition active:scale-95 active:bg-amber-500/20"
        >
          <ChevronDown className="w-5 h-5" />
          <span className="hidden sm:inline">SLIDE</span>
        </button>

        <button
          type="button"
          onClick={() => handleMove(1)}
          aria-label="Move Right"
          className="h-12 sm:h-11 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/25 text-cyan-300 flex items-center justify-center gap-1 text-xs font-bold touch-manipulation transition active:scale-95 active:bg-cyan-500/20"
        >
          <span className="hidden sm:inline">RIGHT</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

TornadoSurfersGame.propTypes = {
  onBack: PropTypes.func.isRequired,
  isMuted: PropTypes.bool,
  onSaveScore: PropTypes.func,
};

export default TornadoSurfersGame;

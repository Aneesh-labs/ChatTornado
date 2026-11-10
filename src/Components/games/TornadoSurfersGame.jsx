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
} from "lucide-react";
import { soundEngine } from "../../utils/soundEffects";
import {
  createInitialRunnerState,
  triggerJump,
  triggerSlideOrSlam,
  triggerLaneMove,
  triggerHoverboard,
  stepRunnerState,
  projectWorld,
  TRAIN_ROOF_Y,
  BASE_SPEED,
} from "./tornadoSurfersEngine";

const TRAIN_PALETTES = [
  { front: "#1e293b", side: "#0f172a", roof: "#334155", accent: "#06b6d4", badge: "TORNADO-01" },
  { front: "#311042", side: "#1e092b", roof: "#4c1d95", accent: "#f43f5e", badge: "CYBER-X" },
  { front: "#064e3b", side: "#022c22", roof: "#047857", accent: "#fbbf24", badge: "METRO-99" },
];

const SKYLINE = [
  { x: 0.04, w: 0.07, h: 0.21, hue: "#0f172a", win: "#38bdf8" },
  { x: 0.12, w: 0.06, h: 0.27, hue: "#1e1b4b", win: "#c084fc" },
  { x: 0.19, w: 0.08, h: 0.17, hue: "#0f172a", win: "#22d3ee" },
  { x: 0.28, w: 0.05, h: 0.24, hue: "#172554", win: "#f472b6" },
  { x: 0.67, w: 0.06, h: 0.25, hue: "#1e1b4b", win: "#38bdf8" },
  { x: 0.74, w: 0.07, h: 0.19, hue: "#0f172a", win: "#fbbf24" },
  { x: 0.82, w: 0.08, h: 0.28, hue: "#172554", win: "#22d3ee" },
  { x: 0.91, w: 0.07, h: 0.20, hue: "#0f172a", win: "#f43f5e" },
];

const TornadoSurfersGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const stateRef = useRef(createInitialRunnerState());
  const savedThisRunRef = useRef(false);
  const touchStartRef = useRef(null);
  const lastTapRef = useRef(0);

  const [hud, setHud] = useState({
    phase: "ready",
    score: 0,
    coins: 0,
    hoverboards: 3,
    hoverboardTimer: 0,
    magnetTimer: 0,
    multiplierTimer: 0,
    jetpackTimer: 0,
    speedMult: 1.0,
    combo: 0,
  });

  const [highScore, setHighScore] = useState(() =>
    parseInt(localStorage.getItem("subwaysurfers_highscore") || "0", 10)
  );
  const highScoreRef = useRef(highScore);
  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

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
      speedMult: +(s.speed / BASE_SPEED).toFixed(1),
      combo: s.combo,
    });
  }, []);

  const playAudio = useCallback(
    (type) => {
      if (!isMuted) soundEngine.play(type);
    },
    [isMuted]
  );

  const startNewRun = useCallback(() => {
    const fresh = createInitialRunnerState();
    fresh.phase = "playing";
    stateRef.current = fresh;
    savedThisRunRef.current = false;
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
    const jumped = triggerJump(stateRef.current);
    if (jumped) playAudio("boing");
  }, [playAudio]);

  const handleSlide = useCallback(() => {
    const slid = triggerSlideOrSlam(stateRef.current);
    if (slid) playAudio("whoosh");
  }, [playAudio]);

  const handleMove = useCallback(
    (delta) => {
      const moved = triggerLaneMove(stateRef.current, delta);
      if (moved) playAudio("laser");
    },
    [playAudio]
  );

  const handleBoard = useCallback(() => {
    const ok = triggerHoverboard(stateRef.current);
    if (ok) {
      playAudio("tada");
      syncHudFromEngine();
    }
  }, [playAudio, syncHudFromEngine]);

  // Keyboard controls
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

  // Main requestAnimationFrame loop + crisp HiDPI Canvas rendering
  useEffect(() => {
    let rafId;
    let lastTime = performance.now();
    let hudAccum = 0;

    const drawFrame = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const s = stateRef.current;
      if (s.phase === "playing") {
        const events = stepRunnerState(s, dt);
        if (events.coinPicked) playAudio("coin");
        if (events.powerupPicked || events.shieldSaved) playAudio("tada");
        if (events.crashed) {
          playAudio("boom");
          if (s.score > highScoreRef.current) {
            setHighScore(s.score);
            localStorage.setItem("subwaysurfers_highscore", s.score.toString());
          }
          if (!savedThisRunRef.current && onSaveScore && s.score > 0) {
            savedThisRunRef.current = true;
            onSaveScore("subwaysurfers", s.score);
          }
          syncHudFromEngine();
        }
      }

      hudAccum += dt;
      if (hudAccum >= 0.08 && s.phase === "playing") {
        hudAccum = 0;
        syncHudFromEngine();
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const W = canvas.width;
        const H = canvas.height;
        const horizonY = H * 0.31;

        ctx.save();
        if (s.shakeTimer > 0) {
          const mag = s.shakeIntensity * (s.shakeTimer / 0.45);
          ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
        }

        // 1. Cyber Sky Gradient + Horizon Glow
        const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
        sky.addColorStop(0, "#050714");
        sky.addColorStop(0.55, "#140b30");
        sky.addColorStop(1, "#4c1d95");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, horizonY + 2);

        // Synth Sun / Vortex Core at Vanishing Point
        const sunGrad = ctx.createRadialGradient(W * 0.5, horizonY * 0.9, 6, W * 0.5, horizonY * 0.9, 105);
        sunGrad.addColorStop(0, "rgba(251, 191, 36, 0.9)");
        sunGrad.addColorStop(0.35, "rgba(244, 63, 94, 0.55)");
        sunGrad.addColorStop(1, "rgba(139, 92, 246, 0)");
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(W * 0.5, horizonY * 0.9, 105, 0, Math.PI * 2);
        ctx.fill();

        // City Skyline Buildings
        for (const b of SKYLINE) {
          const bx = b.x * W;
          const bw = b.w * W;
          const bh = b.h * H;
          const by = horizonY - bh;
          ctx.fillStyle = b.hue;
          ctx.fillRect(bx, by, bw, bh);
          ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
          ctx.lineWidth = 1;
          ctx.strokeRect(bx, by, bw, bh);
          // Lit windows
          ctx.fillStyle = b.win;
          ctx.globalAlpha = 0.35;
          for (let wy = by + 8; wy < horizonY - 10; wy += 11) {
            for (let wx = bx + 5; wx < bx + bw - 6; wx += 9) {
              if (((wx + wy) % 3) !== 0) {
                ctx.fillRect(wx, wy, 4, 5);
              }
            }
          }
          ctx.globalAlpha = 1;
        }

        // 2. Track Bed
        const trackGrad = ctx.createLinearGradient(0, horizonY, 0, H);
        trackGrad.addColorStop(0, "#0b1120");
        trackGrad.addColorStop(0.35, "#0f172a");
        trackGrad.addColorStop(1, "#020617");
        ctx.fillStyle = trackGrad;
        ctx.fillRect(0, horizonY, W, H - horizonY);

        // Horizon neon seam
        ctx.strokeStyle = "#ec4899";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(W, horizonY);
        ctx.stroke();

        // 3. Perspective Track Rails & Scrolling Sleepers
        const railOffsets = [-1.45, -0.5, 0.5, 1.45];
        for (const offset of railOffsets) {
          const farP = projectWorld(offset, 0, 1.0, W, H);
          const nearP = projectWorld(offset, 0, -0.02, W, H);
          ctx.strokeStyle = offset === -1.45 || offset === 1.45 ? "rgba(236, 72, 153, 0.45)" : "rgba(34, 211, 238, 0.55)";
          ctx.lineWidth = offset === -1.45 || offset === 1.45 ? 3 : 2;
          ctx.beginPath();
          ctx.moveTo(farP.x, farP.y);
          ctx.lineTo(nearP.x, nearP.y);
          ctx.stroke();
        }

        // Scrolling sleepers & lane rails inside each of 3 lanes
        const sleeperCount = 12;
        for (let i = 0; i < sleeperCount; i++) {
          const zRaw = ((i / sleeperCount) - s.trackScroll / sleeperCount + 1) % 1;
          if (zRaw > 0.96 || zRaw < 0.01) continue;
          const pLeft = projectWorld(-1.42, 0, zRaw, W, H);
          const pRight = projectWorld(1.42, 0, zRaw, W, H);
          ctx.strokeStyle = `rgba(148, 163, 184, ${(1 - zRaw) * 0.28})`;
          ctx.lineWidth = Math.max(1, (1 - zRaw) * 4.5);
          ctx.beginPath();
          ctx.moveTo(pLeft.x, pLeft.y);
          ctx.lineTo(pRight.x, pRight.y);
          ctx.stroke();
        }

        // Twin inner metal tracks per lane
        for (const laneIdx of [-1, 0, 1]) {
          for (const railDX of [-0.24, 0.24]) {
            const pFar = projectWorld(laneIdx + railDX, 0, 1.0, W, H);
            const pNear = projectWorld(laneIdx + railDX, 0, -0.02, W, H);
            ctx.strokeStyle = "rgba(100, 116, 139, 0.55)";
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(pFar.x, pFar.y);
            ctx.lineTo(pNear.x, pNear.y);
            ctx.stroke();
          }
        }

        // Overhead cyber arches receding with trackScroll
        for (let g = 0; g < 3; g++) {
          const gz = ((g / 3) - (s.trackScroll / 3) + 1) % 1;
          if (gz > 0.92 || gz < 0.08) continue;
          const lBase = projectWorld(-1.55, 0, gz, W, H);
          const lTop = projectWorld(-1.55, 2.35, gz, W, H);
          const rBase = projectWorld(1.55, 0, gz, W, H);
          const rTop = projectWorld(1.55, 2.35, gz, W, H);
          ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - gz) * 0.22})`;
          ctx.lineWidth = Math.max(1, (1 - gz) * 3.5);
          ctx.beginPath();
          ctx.moveTo(lBase.x, lBase.y);
          ctx.lineTo(lTop.x, lTop.y);
          ctx.lineTo(rTop.x, rTop.y);
          ctx.lineTo(rBase.x, rBase.y);
          ctx.stroke();
        }

        // 4. Painter's Algorithm Depth-Sorted Draw List (Entities + Runner)
        const drawList = [];
        for (const ent of s.entities) {
          if (ent.z > 1.05 || (ent.zEnd ?? ent.z) < -0.06) continue;
          drawList.push({ type: "entity", sortZ: ent.zEnd ?? ent.z, ent });
        }
        drawList.push({ type: "runner", sortZ: 0.085 });
        drawList.sort((a, b) => b.sortZ - a.sortZ);

        const tSec = now * 0.001;

        for (const item of drawList) {
          if (item.type === "runner") {
            drawRunner(ctx, s, W, H, tSec);
          } else {
            drawEntity3D(ctx, item.ent, W, H, tSec);
          }
        }

        // 5. Floating Score / Powerup Popups
        for (const p of s.popups) {
          const proj = projectWorld(p.x, p.y, 0.08, W, H);
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
          ctx.font = "900 18px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#000";
          ctx.fillText(p.text, proj.x + 1.5, proj.y + 1.5);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, proj.x, proj.y);
          ctx.restore();
        }

        // 6. Turbo / Jetpack Speed Lines
        if (s.phase === "playing" && (s.jetpackTimer > 0 || s.speed > BASE_SPEED * 1.45)) {
          ctx.save();
          ctx.strokeStyle = s.jetpackTimer > 0 ? "rgba(56, 189, 248, 0.35)" : "rgba(255, 255, 255, 0.16)";
          ctx.lineWidth = 2;
          for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2 + (tSec * 2) % 1;
            const r1 = W * 0.32;
            const r2 = W * 0.56;
            ctx.beginPath();
            ctx.moveTo(W * 0.5 + Math.cos(ang) * r1, H * 0.48 + Math.sin(ang) * r1 * 0.6);
            ctx.lineTo(W * 0.5 + Math.cos(ang) * r2, H * 0.48 + Math.sin(ang) * r2 * 0.6);
            ctx.stroke();
          }
          ctx.restore();
        }

        ctx.restore();
      }

      rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafId);
  }, [playAudio, onSaveScore, syncHudFromEngine]);

  // Touch Swipe + Double-Tap Hoverboard Handlers
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    const now = Date.now();
    if (now - lastTapRef.current < 260) {
      if (stateRef.current.phase === "playing") handleBoard();
    }
    lastTapRef.current = now;
  };

  const onTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    if (stateRef.current.phase === "ready") {
      startNewRun();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? 1 : -1);
    } else if (dy < 0) {
      handleJump();
    } else {
      handleSlide();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-3 pb-4">
      {/* Header Bar */}
      <div className="w-full flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-sm font-medium border border-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Lobby
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center gap-1.5 text-amber-300 font-black text-sm">
            <Coins className="w-4 h-4" /> {hud.coins}
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-200 font-black text-sm">
            {hud.score.toLocaleString()}
          </div>
          <div className="hidden sm:flex px-3 py-1.5 rounded-xl bg-fuchsia-500/15 border border-fuchsia-400/30 items-center gap-1.5 text-fuchsia-200 font-bold text-xs">
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> {Math.max(highScore, hud.score).toLocaleString()}
          </div>
          {(hud.phase === "playing" || hud.phase === "paused") && (
            <button
              onClick={togglePause}
              aria-label="Pause Game"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white cursor-pointer"
            >
              {hud.phase === "paused" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Active Powerups Strip */}
      <div className="w-full min-h-[28px] flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={handleBoard}
            disabled={hud.phase !== "playing" || hud.hoverboards <= 0 || hud.hoverboardTimer > 0}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
              hud.hoverboardTimer > 0
                ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 animate-pulse"
                : hud.hoverboards > 0
                ? "bg-white/5 hover:bg-cyan-500/20 border-white/15 text-cyan-300"
                : "bg-white/5 border-white/5 text-gray-500 opacity-50"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            {hud.hoverboardTimer > 0
              ? `BOARD ${hud.hoverboardTimer.toFixed(0)}s`
              : `HOVERBOARD ×${hud.hoverboards}`}
          </button>

          {hud.magnetTimer > 0 && (
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/25 border border-rose-400/50 text-rose-200 flex items-center gap-1">
              <Magnet className="w-3 h-3" /> {hud.magnetTimer.toFixed(0)}s
            </span>
          )}
          {hud.multiplierTimer > 0 && (
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/25 border border-amber-400/50 text-amber-200 flex items-center gap-1">
              <Zap className="w-3 h-3" /> 2X {hud.multiplierTimer.toFixed(0)}s
            </span>
          )}
          {hud.jetpackTimer > 0 && (
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-500/25 border border-sky-400/50 text-sky-200 flex items-center gap-1">
              <Flame className="w-3 h-3" /> JETPACK {hud.jetpackTimer.toFixed(0)}s
            </span>
          )}
        </div>

        <span className="text-[11px] font-mono text-cyan-300/80">
          SPEED {hud.speedMult.toFixed(1)}x {hud.combo > 2 ? `• ${hud.combo}× COMBO` : ""}
        </span>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div
        className="relative w-full max-w-[480px] aspect-[3/4] rounded-2xl overflow-hidden border border-cyan-500/35 shadow-[0_0_50px_rgba(6,182,212,0.2)] bg-[#050714] touch-none select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <canvas ref={canvasRef} width={480} height={640} className="w-full h-full block" />

        {/* Ready Overlay */}
        {hud.phase === "ready" && (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-bold mb-3">
              CYBER RAILWAYS 3D
            </div>
            <h3 className="text-3xl font-black text-white tracking-tight mb-2">
              TORNADO SURFERS
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xs mb-6 leading-relaxed">
              Ride train roofs via ramps, smash lasers with Hoverboards, fly with Jetpacks, and chain coin combos.
            </p>
            <button
              onClick={startNewRun}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-black text-base shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" /> START RUN
            </button>
            <p className="text-[11px] text-gray-400 mt-4">
              Swipe or WASD/Arrows • Space / Double-tap = Hoverboard
            </p>
          </div>
        )}

        {/* Paused Overlay */}
        {hud.phase === "paused" && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
            <h3 className="text-2xl font-black text-white">PAUSED</h3>
            <button
              onClick={togglePause}
              className="px-7 py-3 rounded-xl bg-cyan-500 text-slate-950 font-black flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" /> RESUME
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {hud.phase === "gameover" && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-1">
              Wiped Out
            </span>
            <h3 className="text-3xl font-black text-white mb-4">RUN COMPLETE</h3>
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-6">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[11px] text-gray-400">FINAL SCORE</p>
                <p className="text-xl font-black text-cyan-300">{hud.score.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[11px] text-gray-400">BEST SCORE</p>
                <p className="text-xl font-black text-amber-300">
                  {Math.max(highScore, hud.score).toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={startNewRun}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black flex items-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.45)] cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-5 h-5" /> RUN AGAIN
            </button>
          </div>
        )}
      </div>

      {/* Tactile Touch / Quick Action Controls Bar (especially handy on mobile) */}
      <div className="w-full max-w-[480px] grid grid-cols-5 gap-2">
        <button
          onClick={() => handleMove(-1)}
          aria-label="Move Left"
          className="py-3 rounded-xl bg-white/5 active:bg-cyan-500/30 border border-white/10 flex items-center justify-center text-white cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleJump}
          aria-label="Jump"
          className="py-3 rounded-xl bg-white/5 active:bg-cyan-500/30 border border-white/10 flex items-center justify-center text-cyan-300 font-bold text-xs gap-1 cursor-pointer"
        >
          <ChevronUp className="w-5 h-5" /> JUMP
        </button>
        <button
          onClick={handleSlide}
          aria-label="Slide"
          className="py-3 rounded-xl bg-white/5 active:bg-fuchsia-500/30 border border-white/10 flex items-center justify-center text-fuchsia-300 font-bold text-xs gap-1 cursor-pointer"
        >
          <ChevronDown className="w-5 h-5" /> SLIDE
        </button>
        <button
          onClick={handleBoard}
          aria-label="Activate Hoverboard"
          className="py-3 rounded-xl bg-cyan-500/15 active:bg-cyan-500/40 border border-cyan-400/30 flex items-center justify-center text-cyan-200 font-bold text-xs gap-1 cursor-pointer"
        >
          <Shield className="w-4 h-4" /> ({hud.hoverboards})
        </button>
        <button
          onClick={() => handleMove(1)}
          aria-label="Move Right"
          className="py-3 rounded-xl bg-white/5 active:bg-cyan-500/30 border border-white/10 flex items-center justify-center text-white cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   3D CANVAS RENDERERS (Extruded Trains, Ramps, Obstacles, Runner)
   ═══════════════════════════════════════════════════════════════ */

function drawEntity3D(ctx, ent, W, H, tSec) {
  const lanePos = ent.lane - 1;

  if (ent.kind === "train") {
    const pal = TRAIN_PALETTES[ent.colorVariant % TRAIN_PALETTES.length];
    const zFront = Math.max(0.01, ent.z);
    const zBack = Math.min(1.06, ent.zEnd ?? ent.z + 0.24);
    const halfW = 0.36;

    const flb = projectWorld(lanePos - halfW, 0, zFront, W, H);
    const frb = projectWorld(lanePos + halfW, 0, zFront, W, H);
    const flt = projectWorld(lanePos - halfW, TRAIN_ROOF_Y, zFront, W, H);
    const frt = projectWorld(lanePos + halfW, TRAIN_ROOF_Y, zFront, W, H);

    const blb = projectWorld(lanePos - halfW, 0, zBack, W, H);
    const brb = projectWorld(lanePos + halfW, 0, zBack, W, H);
    const blt = projectWorld(lanePos - halfW, TRAIN_ROOF_Y, zBack, W, H);
    const brt = projectWorld(lanePos + halfW, TRAIN_ROOF_Y, zBack, W, H);

    // Side face (inner wall visible toward center camera)
    ctx.fillStyle = pal.side;
    if (lanePos < 0) {
      ctx.beginPath();
      ctx.moveTo(frb.x, frb.y);
      ctx.lineTo(brb.x, brb.y);
      ctx.lineTo(brt.x, brt.y);
      ctx.lineTo(frt.x, frt.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (lanePos > 0) {
      ctx.beginPath();
      ctx.moveTo(flb.x, flb.y);
      ctx.lineTo(blb.x, blb.y);
      ctx.lineTo(blt.x, blt.y);
      ctx.lineTo(flt.x, flt.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Walkable Roof polygon
    ctx.fillStyle = pal.roof;
    ctx.beginPath();
    ctx.moveTo(flt.x, flt.y);
    ctx.lineTo(frt.x, frt.y);
    ctx.lineTo(brt.x, brt.y);
    ctx.lineTo(blt.x, blt.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Front Face
    const fw = frb.x - flb.x;
    const fh = flb.y - flt.y;
    ctx.fillStyle = pal.front;
    ctx.fillRect(flt.x, flt.y, fw, fh);
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(flt.x, flt.y, fw, fh);

    // Windshield
    ctx.fillStyle = "#020617";
    ctx.fillRect(flt.x + fw * 0.14, flt.y + fh * 0.16, fw * 0.72, fh * 0.34);
    ctx.strokeStyle = "rgba(56,189,248,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(flt.x + fw * 0.14, flt.y + fh * 0.16, fw * 0.72, fh * 0.34);

    // Twin Headlights
    const hlR = Math.max(2, fw * 0.085);
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(flt.x + fw * 0.24, flt.y + fh * 0.72, hlR, 0, Math.PI * 2);
    ctx.arc(flt.x + fw * 0.76, flt.y + fh * 0.72, hlR, 0, Math.PI * 2);
    ctx.fill();

    // Neon accent bumper bar
    ctx.fillStyle = pal.accent;
    ctx.fillRect(flt.x + fw * 0.08, flt.y + fh * 0.88, fw * 0.84, Math.max(2, fh * 0.07));
    return;
  }

  if (ent.kind === "ramp") {
    const zFront = Math.max(0.01, ent.z);
    const zBack = Math.min(1.06, ent.zEnd ?? ent.z + 0.14);
    const hw = 0.35;
    const fl = projectWorld(lanePos - hw, 0, zFront, W, H);
    const fr = projectWorld(lanePos + hw, 0, zFront, W, H);
    const bl = projectWorld(lanePos - hw, TRAIN_ROOF_Y, zBack, W, H);
    const br = projectWorld(lanePos + hw, TRAIN_ROOF_Y, zBack, W, H);

    const grad = ctx.createLinearGradient(0, bl.y, 0, fl.y);
    grad.addColorStop(0, "#fbbf24");
    grad.addColorStop(1, "#0284c7");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(fl.x, fl.y);
    ctx.lineTo(fr.x, fr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }

  if (ent.kind === "low_barrier") {
    const z = Math.max(0.01, ent.z);
    const pL = projectWorld(lanePos - 0.34, 0, z, W, H);
    const pR = projectWorld(lanePos + 0.34, 0, z, W, H);
    const pTop = projectWorld(lanePos, 0.5, z, W, H);
    const bw = pR.x - pL.x;
    const bh = pL.y - pTop.y;

    ctx.fillStyle = "#f97316";
    ctx.fillRect(pL.x, pTop.y, bw, bh * 0.65);
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(pL.x + bw * 0.1, pTop.y + bh * 0.15, bw * 0.25, bh * 0.35);
    ctx.fillRect(pL.x + bw * 0.65, pTop.y + bh * 0.15, bw * 0.25, bh * 0.35);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pL.x, pTop.y, bw, bh * 0.65);
    return;
  }

  if (ent.kind === "high_gate") {
    const z = Math.max(0.01, ent.z);
    const lBot = projectWorld(lanePos - 0.34, 0, z, W, H);
    const rBot = projectWorld(lanePos + 0.34, 0, z, W, H);
    const lMid = projectWorld(lanePos - 0.34, 0.6, z, W, H);
    const lTop = projectWorld(lanePos - 0.34, 1.35, z, W, H);
    const pw = Math.max(4, (rBot.x - lBot.x) * 0.1);

    // Side pillars
    ctx.fillStyle = "#334155";
    ctx.fillRect(lBot.x, lTop.y, pw, lBot.y - lTop.y);
    ctx.fillRect(rBot.x - pw, lTop.y, pw, rBot.y - lTop.y);

    // Laser beam block between 0.6 and 1.35 height (player must slide under!)
    ctx.fillStyle = "rgba(244, 63, 94, 0.72)";
    ctx.fillRect(lBot.x + pw, lTop.y, rBot.x - lBot.x - pw * 2, lMid.y - lTop.y);
    ctx.strokeStyle = "#fda4af";
    ctx.lineWidth = 2;
    ctx.strokeRect(lBot.x + pw, lTop.y, rBot.x - lBot.x - pw * 2, lMid.y - lTop.y);
    return;
  }

  // Coin or Powerups
  const proj = projectWorld(lanePos, ent.y ?? 0.34, Math.max(0.01, ent.z), W, H);
  const r = Math.max(4, proj.unitHeight * 0.21);

  if (ent.kind === "coin") {
    const spin = Math.abs(Math.cos(tSec * 6 + ent.z * 8));
    ctx.save();
    ctx.translate(proj.x, proj.y);
    ctx.scale(Math.max(0.25, spin), 1);
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.22);
    ctx.strokeStyle = "#fef08a";
    ctx.stroke();
    ctx.fillStyle = "#92400e";
    ctx.font = `900 ${Math.max(7, Math.round(r))}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", 0, 1);
    ctx.restore();
    return;
  }

  // Powerup floating badge
  const pColors = {
    magnet: "#f43f5e",
    multiplier: "#f59e0b",
    jetpack: "#38bdf8",
    board_pickup: "#22d3ee",
  };
  const pIcons = {
    magnet: "M",
    multiplier: "2X",
    jetpack: "J",
    board_pickup: "B",
  };
  const bob = Math.sin(tSec * 5) * r * 0.35;
  ctx.save();
  ctx.translate(proj.x, proj.y + bob);
  ctx.shadowColor = pColors[ent.kind] || "#38bdf8";
  ctx.shadowBlur = 14;
  ctx.fillStyle = pColors[ent.kind] || "#38bdf8";
  ctx.beginPath();
  ctx.roundRect(-r * 1.15, -r * 1.15, r * 2.3, r * 2.3, r * 0.45);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `900 ${Math.max(9, Math.round(r * 0.95))}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(pIcons[ent.kind] || "?", 0, 1);
  ctx.restore();
}

function drawRunner(ctx, s, W, H, tSec) {
  const proj = projectWorld(s.laneX, s.y, 0.085, W, H);
  const floorProj = projectWorld(s.laneX, s.groundY, 0.085, W, H);
  const px = proj.x;
  const py = proj.y;
  const u = proj.unitHeight;

  // Dynamic Shadow on current ground/roof
  const airH = Math.max(0, s.y - s.groundY);
  const shadowScale = Math.max(0.35, 1 - airH * 0.25);
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.beginPath();
  ctx.ellipse(floorProj.x, floorProj.y + 4, u * 0.34 * shadowScale, u * 0.1 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  if (s.invulnTimer > 0 && Math.floor(tSec * 16) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  // Hoverboard Shield Aura + Glowing Board
  if (s.hoverboardTimer > 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(34, 211, 238, 0.55)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(px, py - u * 0.45, u * 0.62, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    ctx.roundRect(px - u * 0.38, py - u * 0.08, u * 0.76, u * 0.12, 8);
    ctx.fill();
    ctx.restore();
  }

  // Jetpack Flame Plumes
  if (s.jetpackTimer > 0) {
    ctx.save();
    const fl = u * (0.35 + Math.random() * 0.2);
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.moveTo(px - u * 0.18, py - u * 0.35);
    ctx.lineTo(px - u * 0.1, py - u * 0.35 + fl);
    ctx.lineTo(px - u * 0.02, py - u * 0.35);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + u * 0.02, py - u * 0.35);
    ctx.lineTo(px + u * 0.1, py - u * 0.35 + fl);
    ctx.lineTo(px + u * 0.18, py - u * 0.35);
    ctx.fill();
    ctx.restore();
  }

  const sliding = s.slideTimer > 0;
  const stride = Math.sin(tSec * 15);
  const bodyH = sliding ? u * 0.42 : u * 0.88;
  const bodyW = sliding ? u * 0.44 : u * 0.34;

  // Articulated Legs
  if (!sliding) {
    const legLiftL = s.y > s.groundY + 0.1 ? u * 0.12 : stride * u * 0.14;
    const legLiftR = s.y > s.groundY + 0.1 ? -u * 0.05 : -stride * u * 0.14;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = Math.max(4, u * 0.11);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(px - u * 0.09, py - u * 0.34);
    ctx.lineTo(px - u * 0.12, py - legLiftL);
    ctx.moveTo(px + u * 0.09, py - u * 0.34);
    ctx.lineTo(px + u * 0.12, py - legLiftR);
    ctx.stroke();
  }

  // Neon Torso Jacket
  const torsoGrad = ctx.createLinearGradient(px - bodyW * 0.5, py - bodyH, px + bodyW * 0.5, py);
  torsoGrad.addColorStop(0, "#ec4899");
  torsoGrad.addColorStop(1, "#6366f1");
  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.roundRect(px - bodyW * 0.5, py - bodyH * 0.85, bodyW, bodyH * 0.52, 8);
  ctx.fill();

  // Head + Glowing Visor
  const headR = u * 0.16;
  const headY = sliding ? py - bodyH * 0.72 : py - bodyH * 0.96;
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(px, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Visor stripe
  ctx.fillStyle = "#06b6d4";
  ctx.fillRect(px - headR * 0.75, headY - headR * 0.25, headR * 1.5, headR * 0.45);

  ctx.globalAlpha = 1;
}

TornadoSurfersGame.propTypes = {
  onBack: PropTypes.func.isRequired,
  isMuted: PropTypes.bool,
  onSaveScore: PropTypes.func,
};

export default TornadoSurfersGame;

import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { Play, RotateCcw } from "lucide-react";
import { soundEngine } from "../../../utils/soundEffects";
import HiFiGameShell from "../hiFiSuite/HiFiGameShell";

/* ═══════════════════════════════════════════════════════════════════════════
   1. ORBITAL SLINGSHOT v2.0 (Gravity Wells + Curved Probe Trajectory)
   ═══════════════════════════════════════════════════════════════════════════ */
export const OrbitalSlingshotGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [hud, setHud] = useState({ score: 0, stage: 1, shots: 5 });
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("orbitalslingshot_highscore") || 0));
  const stateRef = useRef(null);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const setupStage = (stageNum, prevScore = 0, prevShots = 5) => {
    const W = 440;
    const H = 360;
    const wells = [
      { x: 210, y: 180, mass: 3400 + stageNum * 220, r: 22 },
      ...(stageNum > 1 ? [{ x: 310, y: 110 + ((stageNum * 45) % 140), mass: 2200, r: 16 }] : []),
    ];
    stateRef.current = {
      W, H, stage: stageNum, score: prevScore, shots: prevShots,
      probe: null, drag: null,
      launch: { x: 54, y: H - 54 },
      goal: { x: W - 54, y: 65 + ((stageNum * 53) % (H - 140)), r: 20 },
      wells, trail: [],
    };
  };

  const startGame = useCallback(() => {
    setupStage(1, 0, 5);
    setHud({ score: 0, stage: 1, shots: 5 });
    setPhase("playing");
    playFx("whoosh");
  }, [playFx]);

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (cx - rect.left) * (canvas.width / rect.width), y: (cy - rect.top) * (canvas.height / rect.height) };
    };
    const onDown = (e) => {
      const s = stateRef.current;
      if (s.probe) return;
      s.drag = getPos(e);
    };
    const onMove = (e) => {
      const s = stateRef.current;
      if (s.drag) s.drag = getPos(e);
    };
    const onUp = () => {
      const s = stateRef.current;
      if (!s.drag || s.probe) return;
      const dx = s.launch.x - s.drag.x;
      const dy = s.launch.y - s.drag.y;
      s.drag = null;
      if (Math.hypot(dx, dy) < 10) return;
      s.probe = { x: s.launch.x, y: s.launch.y, vx: dx * 3.8, vy: dy * 3.8 };
      s.trail = [];
      playFx("laser");
    };
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: true });
    canvas.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    let rafId;
    let prev = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.035, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const s = stateRef.current;

      if (s.probe) {
        const p = s.probe;
        for (const w of s.wells) {
          const dx = w.x - p.x;
          const dy = w.y - p.y;
          const d2 = Math.max(400, dx * dx + dy * dy);
          const d = Math.sqrt(d2);
          const f = (w.mass * 12) / d2;
          p.vx += (dx / d) * f * dt;
          p.vy += (dy / d) * f * dt;
          if (d < w.r + 6) {
            s.probe = null;
            s.shots -= 1;
            playFx("boom");
            break;
          }
        }
        if (s.probe) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          s.trail.push({ x: p.x, y: p.y });
          if (s.trail.length > 48) s.trail.shift();

          if (Math.hypot(p.x - s.goal.x, p.y - s.goal.y) < s.goal.r + 8) {
            const nextScore = s.score + 150 * s.stage;
            const nextStage = s.stage + 1;
            const nextShots = Math.min(6, s.shots + 1);
            playFx("tada");
            setupStage(nextStage, nextScore, nextShots);
            setHud({ score: nextScore, stage: nextStage, shots: nextShots });
          } else if (p.x < -30 || p.x > s.W + 30 || p.y < -30 || p.y > s.H + 30) {
            s.probe = null;
            s.shots -= 1;
            setHud({ score: s.score, stage: s.stage, shots: s.shots });
          }
        }
        if (s.shots <= 0 && !s.probe) {
          if (s.score > highScore) {
            setHighScore(s.score);
            localStorage.setItem("orbitalslingshot_highscore", String(s.score));
            onSaveScore?.("orbitalslingshot", s.score);
          }
          setPhase("gameover");
          return;
        }
      }

      ctx.fillStyle = "#040814";
      ctx.fillRect(0, 0, s.W, s.H);

      for (const w of s.wells) {
        ctx.strokeStyle = "rgba(168,85,247,0.28)";
        ctx.beginPath(); ctx.arc(w.x, w.y, w.r * 2.1, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#a855f7";
        ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2); ctx.fill();
      }

      // Wormhole goal
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s.goal.x, s.goal.y, s.goal.r, 0, Math.PI * 2); ctx.stroke();

      // Launcher & drag aim vector
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath(); ctx.arc(s.launch.x, s.launch.y, 9, 0, Math.PI * 2); ctx.fill();
      if (s.drag) {
        const dx0 = s.launch.x - s.drag.x;
        const dy0 = s.launch.y - s.drag.y;
        ctx.strokeStyle = "#fde047";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(s.launch.x, s.launch.y);
        ctx.lineTo(s.launch.x + dx0, s.launch.y + dy0);
        ctx.stroke();
        ctx.setLineDash([]);

        // Gravity-curved trajectory prediction arc
        if (Math.hypot(dx0, dy0) >= 10) {
          let sx = s.launch.x;
          let sy = s.launch.y;
          let svx = dx0 * 3.8;
          let svy = dy0 * 3.8;
          const stepDt = 0.028;
          for (let step = 0; step < 24; step++) {
            let hitWell = false;
            for (const w of s.wells) {
              const wx = w.x - sx;
              const wy = w.y - sy;
              const wd2 = Math.max(400, wx * wx + wy * wy);
              const wd = Math.sqrt(wd2);
              const wf = (w.mass * 12) / wd2;
              svx += (wx / wd) * wf * stepDt;
              svy += (wy / wd) * wf * stepDt;
              if (wd < w.r + 4) { hitWell = true; break; }
            }
            if (hitWell) break;
            sx += svx * stepDt;
            sy += svy * stepDt;
            ctx.fillStyle = `rgba(253,224,71,${Math.max(0.15, 0.85 - step * 0.03)})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      for (let i = 0; i < s.trail.length; i++) {
        ctx.fillStyle = `rgba(56,189,248,${(i / s.trail.length) * 0.8})`;
        ctx.beginPath(); ctx.arc(s.trail[i].x, s.trail[i].y, 3, 0, Math.PI * 2); ctx.fill();
      }
      if (s.probe) {
        ctx.fillStyle = "#fef08a";
        ctx.beginPath(); ctx.arc(s.probe.x, s.probe.y, 6, 0, Math.PI * 2); ctx.fill();
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [highScore, onSaveScore, phase, playFx]);

  return (
    <HiFiGameShell
      title="Orbital Slingshot"
      badge="v2.0 UPDATED"
      onBack={onBack}
      score={hud.score}
      highScore={highScore}
      onReset={startGame}
      controlsHint="Drag back from the cyan launcher & release to curve probes around purple gravity wells into the emerald wormhole!"
      extraHeader={<span className="text-xs font-bold text-purple-300">Sector {hud.stage} • {hud.shots} Probes</span>}
    >
      <div className="relative w-full max-w-[460px] aspect-[440/360] rounded-3xl overflow-hidden border-2 border-purple-500/35 shadow-2xl">
        <canvas ref={canvasRef} width={440} height={360} className="w-full h-full block touch-none cursor-crosshair" />
        {phase === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3 p-4 text-center">
            <h3 className="text-2xl font-black text-white">Orbital Slingshot v2.0</h3>
            <p className="text-xs text-white/70 max-w-xs">Bend probe trajectories through real inverse-square gravity wells!</p>
            <button type="button" onClick={startGame} className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-purple-400 text-black font-black text-sm cursor-pointer"><Play className="h-4 w-4 fill-current" /> Launch</button>
          </div>
        )}
        {phase === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3">
            <h3 className="text-2xl font-black text-rose-400">Out of Probes!</h3>
            <p className="text-xs text-white/75">Final Score: {hud.score}</p>
            <button type="button" onClick={startGame} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-400 text-black font-black text-sm cursor-pointer"><RotateCcw className="h-4 w-4" /> Retry</button>
          </div>
        )}
      </div>
    </HiFiGameShell>
  );
};
OrbitalSlingshotGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   2. HYPER WARP TUNNEL v2.0 (360° Polar Cylinder Dodger)
   ═══════════════════════════════════════════════════════════════════════════ */
export const HyperTunnelGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("hypertunnel_highscore") || 0));
  const stateRef = useRef(null);
  const dirRef = useRef(0);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const startGame = useCallback(() => {
    stateRef.current = { W: 380, H: 380, angle: Math.PI / 2, gates: [], spawn: 0, score: 0, speed: 1.05 };
    setScore(0);
    setPhase("playing");
    playFx("whoosh");
  }, [playFx]);

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const keys = {};
    const kd = (e) => { keys[e.code] = true; };
    const ku = (e) => { keys[e.code] = false; };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    let rafId;
    let prev = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.04, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const s = stateRef.current;
      const turn = dirRef.current !== 0 ? dirRef.current : (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
      s.angle += turn * 3.8 * dt;
      s.speed = Math.min(2.2, s.speed + dt * 0.03);
      s.spawn += dt;
      if (s.spawn >= 0.95 / s.speed) {
        s.spawn = 0;
        const gapAngle = Math.random() * Math.PI * 2;
        s.gates.push({ r: 14, gapAngle, gapWidth: 1.05, passed: false });
      }

      const cx = s.W / 2;
      const cy = s.H / 2;
      const playerR = 152;

      for (let i = s.gates.length - 1; i >= 0; i--) {
        const g = s.gates[i];
        g.r += 130 * s.speed * dt;
        g.gapAngle += 0.35 * dt;
        if (!g.passed && g.r >= playerR - 6) {
          g.passed = true;
          const diff = Math.abs(Math.atan2(Math.sin(s.angle - g.gapAngle), Math.cos(s.angle - g.gapAngle)));
          if (diff > g.gapWidth * 0.5) {
            playFx("boom");
            if (s.score > highScore) {
              setHighScore(s.score);
              localStorage.setItem("hypertunnel_highscore", String(s.score));
              onSaveScore?.("hypertunnel", s.score);
            }
            setPhase("gameover");
            return;
          }
          s.score += 30;
          setScore(s.score);
          playFx("coin");
        }
        if (g.r > 240) s.gates.splice(i, 1);
      }

      ctx.fillStyle = "#040914";
      ctx.fillRect(0, 0, s.W, s.H);
      ctx.strokeStyle = "rgba(34,211,238,0.16)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, playerR, 0, Math.PI * 2); ctx.stroke();

      for (const g of s.gates) {
        ctx.strokeStyle = "#f43f5e";
        ctx.lineWidth = Math.max(3, g.r * 0.05);
        ctx.beginPath();
        ctx.arc(cx, cy, g.r, g.gapAngle + g.gapWidth * 0.5, g.gapAngle + Math.PI * 2 - g.gapWidth * 0.5);
        ctx.stroke();
      }

      const px = cx + Math.cos(s.angle) * playerR;
      const py = cy + Math.sin(s.angle) * playerR;
      ctx.fillStyle = "#34d399";
      ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.fill();

      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [highScore, onSaveScore, phase, playFx]);

  return (
    <HiFiGameShell
      title="Hyper Warp Tunnel"
      badge="v2.0 UPDATED"
      onBack={onBack}
      score={score}
      highScore={highScore}
      onReset={startGame}
      controlsHint="Rotate around the 360° cyber ring with A/D or ◀/▶ buttons to slip through expanding laser gaps"
    >
      <div className="relative w-full max-w-[400px] aspect-square rounded-3xl overflow-hidden border-2 border-cyan-500/35 shadow-2xl">
        <canvas ref={canvasRef} width={380} height={380} className="w-full h-full block" />
        {phase === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3 p-4 text-center">
            <h3 className="text-2xl font-black text-white">Hyper Warp Tunnel v2.0</h3>
            <button type="button" onClick={startGame} className="px-7 py-3 rounded-2xl bg-cyan-400 text-black font-black text-sm cursor-pointer">Enter Warp</button>
          </div>
        )}
        {phase === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3">
            <h3 className="text-2xl font-black text-rose-400">Gate Impact!</h3>
            <p className="text-xs text-white/75">Score: {score}</p>
            <button type="button" onClick={startGame} className="px-6 py-2.5 rounded-xl bg-cyan-400 text-black font-black text-sm cursor-pointer">Re-Enter</button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 w-64 md:hidden">
        <button type="button" onPointerDown={() => { dirRef.current = -1; }} onPointerUp={() => { dirRef.current = 0; }} onPointerLeave={() => { dirRef.current = 0; }} className="h-12 rounded-xl bg-white/10 font-black text-white touch-none">↺ Spin CCW</button>
        <button type="button" onPointerDown={() => { dirRef.current = 1; }} onPointerUp={() => { dirRef.current = 0; }} onPointerLeave={() => { dirRef.current = 0; }} className="h-12 rounded-xl bg-white/10 font-black text-white touch-none">Spin CW ↻</button>
      </div>
    </HiFiGameShell>
  );
};
HyperTunnelGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   3. LASER DOME INTERCEPTOR v2.0 (Flak Burst Missile Defense)
   ═══════════════════════════════════════════════════════════════════════════ */
export const LaserBastionGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [hud, setHud] = useState({ score: 0, cities: 3 });
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("laserbastion_highscore") || 0));
  const stateRef = useRef(null);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const startGame = useCallback(() => {
    stateRef.current = { W: 440, H: 360, meteors: [], blasts: [], spawn: 0, score: 0, cities: [true, true, true] };
    setHud({ score: 0, cities: 3 });
    setPhase("playing");
    playFx("whoosh");
  }, [playFx]);

  const fireFlak = (e) => {
    const s = stateRef.current;
    if (!s || phase !== "playing") return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (s.W / rect.width);
    const y = (e.clientY - rect.top) * (s.H / rect.height);
    s.blasts.push({ x, y, r: 4, maxR: 46, growing: true });
    playFx("laser");
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let rafId;
    let prev = performance.now();

    const loop = (now) => {
      const dt = Math.min(0.04, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const s = stateRef.current;
      s.spawn += dt;
      if (s.spawn >= Math.max(0.42, 1.15 - s.score * 0.0006)) {
        s.spawn = 0;
        const targetX = [90, 220, 350][Math.floor(Math.random() * 3)];
        const sx = Math.random() * s.W;
        const ang = Math.atan2(s.H - 20, targetX - sx);
        const spd = 85 + Math.min(140, s.score * 0.08);
        s.meteors.push({ x: sx, y: -10, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd });
      }

      for (let bi = s.blasts.length - 1; bi >= 0; bi--) {
        const b = s.blasts[bi];
        if (b.growing) { b.r += 155 * dt; if (b.r >= b.maxR) b.growing = false; }
        else { b.r -= 95 * dt; if (b.r <= 0) s.blasts.splice(bi, 1); }
      }

      for (let mi = s.meteors.length - 1; mi >= 0; mi--) {
        const m = s.meteors[mi];
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (s.blasts.some((b) => Math.hypot(b.x - m.x, b.y - m.y) <= b.r + 6)) {
          s.meteors.splice(mi, 1);
          s.score += 35;
          playFx("coin");
          setHud({ score: s.score, cities: s.cities.filter(Boolean).length });
          continue;
        }
        if (m.y >= s.H - 22) {
          s.meteors.splice(mi, 1);
          const idx = m.x < 155 ? 0 : m.x < 285 ? 1 : 2;
          if (s.cities[idx]) s.cities[idx] = false;
          playFx("boom");
          const alive = s.cities.filter(Boolean).length;
          setHud({ score: s.score, cities: alive });
          if (alive === 0) {
            if (s.score > highScore) {
              setHighScore(s.score);
              localStorage.setItem("laserbastion_highscore", String(s.score));
              onSaveScore?.("laserbastion", s.score);
            }
            setPhase("gameover");
            return;
          }
        }
      }

      ctx.fillStyle = "#050914";
      ctx.fillRect(0, 0, s.W, s.H);
      [90, 220, 350].forEach((cx, idx) => {
        ctx.fillStyle = s.cities[idx] ? "#34d399" : "#334155";
        ctx.fillRect(cx - 24, s.H - 24, 48, 20);
      });
      ctx.fillStyle = "#fb7185";
      for (const m of s.meteors) {
        ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, Math.PI * 2); ctx.fill();
      }
      for (const b of s.blasts) {
        ctx.strokeStyle = "#fde047";
        ctx.fillStyle = "rgba(253, 224, 71, 0.22)";
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [highScore, onSaveScore, phase, playFx]);

  return (
    <HiFiGameShell
      title="Laser Dome Interceptor"
      badge="v2.0 UPDATED"
      onBack={onBack}
      score={hud.score}
      highScore={highScore}
      onReset={startGame}
      controlsHint="Tap/Click anywhere in the sky to detonate expanding flak shockwaves & protect your 3 Energy Domes"
      extraHeader={<span className="text-xs font-bold text-emerald-300">Domes: {hud.cities}/3</span>}
    >
      <div className="relative w-full max-w-[460px] aspect-[440/360] rounded-3xl overflow-hidden border-2 border-amber-400/35 shadow-2xl">
        <canvas ref={canvasRef} width={440} height={360} onClick={fireFlak} className="w-full h-full block cursor-crosshair touch-none" />
        {phase === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3 p-4 text-center">
            <h3 className="text-2xl font-black text-white">Laser Dome Interceptor v2.0</h3>
            <button type="button" onClick={startGame} className="px-7 py-3 rounded-2xl bg-amber-400 text-black font-black text-sm cursor-pointer">Defend Domes</button>
          </div>
        )}
        {phase === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3">
            <h3 className="text-2xl font-black text-rose-400">Domes Breached!</h3>
            <p className="text-xs text-white/75">Final Score: {hud.score}</p>
            <button type="button" onClick={startGame} className="px-6 py-2.5 rounded-xl bg-amber-400 text-black font-black text-sm cursor-pointer">Rebuild</button>
          </div>
        )}
      </div>
    </HiFiGameShell>
  );
};
LaserBastionGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   4. POLARITY SHIELD v2.0 (Dual-Color Rotating Shield Core)
   ═══════════════════════════════════════════════════════════════════════════ */
export const PolarDefenderGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [hud, setHud] = useState({ score: 0, hp: 3 });
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("polardefender_highscore") || 0));
  const stateRef = useRef(null);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const flipPolarity = useCallback(() => {
    if (!stateRef.current || phase !== "playing") return;
    stateRef.current.angle += Math.PI;
    playFx("laser");
  }, [phase, playFx]);

  const startGame = useCallback(() => {
    stateRef.current = { W: 360, H: 360, angle: 0, bolts: [], spawn: 0, score: 0, hp: 3 };
    setHud({ score: 0, hp: 3 });
    setPhase("playing");
    playFx("whoosh");
  }, [playFx]);

  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e) => {
      if (e.code === "Space" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        flipPolarity();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipPolarity, phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let rafId;
    let prev = performance.now();

    const loop = (now) => {
      const dt = Math.min(0.04, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const s = stateRef.current;
      const cx = s.W / 2;
      const cy = s.H / 2;
      s.spawn += dt;
      if (s.spawn >= Math.max(0.45, 1.0 - s.score * 0.0005)) {
        s.spawn = 0;
        const fromTop = Math.random() < 0.5;
        s.bolts.push({
          x: cx,
          y: fromTop ? -10 : s.H + 10,
          vy: fromTop ? 155 : -155,
          isCyan: Math.random() < 0.5,
        });
      }

      for (let i = s.bolts.length - 1; i >= 0; i--) {
        const b = s.bolts[i];
        b.y += b.vy * dt;
        if (Math.abs(b.y - cy) < 36) {
          s.bolts.splice(i, 1);
          const topIsCyan = Math.cos(s.angle) >= 0;
          const shieldIsCyan = b.vy > 0 ? topIsCyan : !topIsCyan;
          if (shieldIsCyan === b.isCyan) {
            s.score += 50;
            playFx("coin");
            setHud({ score: s.score, hp: s.hp });
          } else {
            s.hp -= 1;
            playFx("boom");
            setHud({ score: s.score, hp: s.hp });
            if (s.hp <= 0) {
              if (s.score > highScore) {
                setHighScore(s.score);
                localStorage.setItem("polardefender_highscore", String(s.score));
                onSaveScore?.("polardefender", s.score);
              }
              setPhase("gameover");
              return;
            }
          }
        }
      }

      ctx.fillStyle = "#050914";
      ctx.fillRect(0, 0, s.W, s.H);
      // Draw top/bottom rotating polarity arcs
      ctx.lineWidth = 10;
      ctx.strokeStyle = "#22d3ee";
      ctx.beginPath(); ctx.arc(cx, cy, 40, s.angle - Math.PI * 0.9, s.angle - 0.1); ctx.stroke();
      ctx.strokeStyle = "#f43f5e";
      ctx.beginPath(); ctx.arc(cx, cy, 40, s.angle + 0.1, s.angle + Math.PI * 0.9); ctx.stroke();

      for (const b of s.bolts) {
        ctx.fillStyle = b.isCyan ? "#22d3ee" : "#f43f5e";
        ctx.beginPath(); ctx.arc(b.x, b.y, 9, 0, Math.PI * 2); ctx.fill();
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [highScore, onSaveScore, phase, playFx]);

  return (
    <HiFiGameShell
      title="Polarity Shield"
      badge="v2.0 UPDATED"
      onBack={onBack}
      score={hud.score}
      highScore={highScore}
      onReset={startGame}
      controlsHint="Tap board or press Space to flip Cyan / Crimson shield polarity & match incoming energy bolts"
      extraHeader={<span className="text-xs font-bold text-rose-400">{"❤️".repeat(Math.max(0, hud.hp))}</span>}
    >
      <div className="relative w-full max-w-[380px] aspect-square rounded-3xl overflow-hidden border-2 border-cyan-500/35 shadow-2xl">
        <canvas ref={canvasRef} width={360} height={360} onClick={flipPolarity} className="w-full h-full block cursor-pointer touch-none" />
        {phase === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3 p-4 text-center">
            <h3 className="text-2xl font-black text-white">Polarity Shield v2.0</h3>
            <button type="button" onClick={startGame} className="px-7 py-3 rounded-2xl bg-cyan-400 text-black font-black text-sm cursor-pointer">Activate Core</button>
          </div>
        )}
        {phase === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3">
            <h3 className="text-2xl font-black text-rose-400">Core Overloaded!</h3>
            <p className="text-xs text-white/75">Final Score: {hud.score}</p>
            <button type="button" onClick={startGame} className="px-6 py-2.5 rounded-xl bg-cyan-400 text-black font-black text-sm cursor-pointer">Reboot</button>
          </div>
        )}
      </div>
    </HiFiGameShell>
  );
};
PolarDefenderGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   5. DEEP CORE LASER MINER v2.0 (Crystal Pod Extraction)
   ═══════════════════════════════════════════════════════════════════════════ */
export const AstroMinerGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [hud, setHud] = useState({ score: 0, timeLeft: 45 });
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("astrominer_highscore") || 0));
  const stateRef = useRef(null);
  const vDirRef = useRef({ x: 0, y: 0 });
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const startGame = useCallback(() => {
    const crystals = Array.from({ length: 7 }, () => ({
      x: 40 + Math.random() * 340, y: 40 + Math.random() * 280, gold: Math.random() < 0.25,
    }));
    const hazards = Array.from({ length: 4 }, (_, i) => ({
      x: 80 + i * 75, y: 80 + ((i * 80) % 200), vx: (i % 2 === 0 ? 1 : -1) * 75, vy: 55,
    }));
    stateRef.current = { W: 420, H: 360, pod: { x: 210, y: 180 }, crystals, hazards, score: 0, timeLeft: 45 };
    setHud({ score: 0, timeLeft: 45 });
    setPhase("playing");
    playFx("whoosh");
  }, [playFx]);

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const keys = {};
    const kd = (e) => { keys[e.code] = true; };
    const ku = (e) => { keys[e.code] = false; };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    let rafId;
    let prev = performance.now();
    let uiTimer = 0;
    const loop = (now) => {
      const dt = Math.min(0.04, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const s = stateRef.current;
      s.timeLeft = Math.max(0, s.timeLeft - dt);
      const dx = vDirRef.current.x !== 0 ? vDirRef.current.x : (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
      const dy = vDirRef.current.y !== 0 ? vDirRef.current.y : (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
      s.pod.x = Math.max(14, Math.min(s.W - 14, s.pod.x + dx * 210 * dt));
      s.pod.y = Math.max(14, Math.min(s.H - 14, s.pod.y + dy * 210 * dt));

      for (let i = s.crystals.length - 1; i >= 0; i--) {
        const c = s.crystals[i];
        if (Math.hypot(c.x - s.pod.x, c.y - s.pod.y) < 22) {
          s.score += c.gold ? 80 : 30;
          playFx(c.gold ? "tada" : "coin");
          s.crystals[i] = { x: 35 + Math.random() * 350, y: 35 + Math.random() * 290, gold: Math.random() < 0.28 };
        }
      }

      for (const h of s.hazards) {
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        if (h.x < 16 || h.x > s.W - 16) h.vx *= -1;
        if (h.y < 16 || h.y > s.H - 16) h.vy *= -1;
        if (Math.hypot(h.x - s.pod.x, h.y - s.pod.y) < 22) {
          s.score = Math.max(0, s.score - 25);
          s.pod.x = s.W / 2;
          s.pod.y = s.H / 2;
          playFx("boom");
        }
      }

      if (s.timeLeft <= 0) {
        if (s.score > highScore) {
          setHighScore(s.score);
          localStorage.setItem("astrominer_highscore", String(s.score));
          onSaveScore?.("astrominer", s.score);
        }
        playFx("win");
        setPhase("gameover");
        return;
      }

      uiTimer += dt;
      if (uiTimer >= 0.15) {
        uiTimer = 0;
        setHud({ score: s.score, timeLeft: Math.ceil(s.timeLeft) });
      }

      ctx.fillStyle = "#06110e";
      ctx.fillRect(0, 0, s.W, s.H);
      for (const c of s.crystals) {
        ctx.fillStyle = c.gold ? "#fbbf24" : "#34d399";
        ctx.beginPath(); ctx.arc(c.x, c.y, c.gold ? 9 : 7, 0, Math.PI * 2); ctx.fill();
      }
      for (const h of s.hazards) {
        ctx.fillStyle = "#f43f5e";
        ctx.beginPath(); ctx.arc(h.x, h.y, 11, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath(); ctx.arc(s.pod.x, s.pod.y, 12, 0, Math.PI * 2); ctx.fill();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [highScore, onSaveScore, phase, playFx]);

  return (
    <HiFiGameShell
      title="Deep Core Laser Miner"
      badge="v2.0 UPDATED"
      onBack={onBack}
      score={hud.score}
      highScore={highScore}
      onReset={startGame}
      controlsHint="Move pod with WASD / Arrows or touch pad to harvest emerald & gold crystals while dodging crimson drones"
      extraHeader={<span className="text-xs font-bold text-emerald-300">{hud.timeLeft}s</span>}
    >
      <div className="relative w-full max-w-[440px] aspect-[420/360] rounded-3xl overflow-hidden border-2 border-emerald-500/35 shadow-2xl">
        <canvas ref={canvasRef} width={420} height={360} className="w-full h-full block" />
        {phase === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3">
            <h3 className="text-2xl font-black text-white">Deep Core Laser Miner v2.0</h3>
            <button type="button" onClick={startGame} className="px-7 py-3 rounded-2xl bg-emerald-400 text-black font-black text-sm cursor-pointer">Start Drill</button>
          </div>
        )}
        {phase === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3">
            <h3 className="text-2xl font-black text-emerald-300">Shift Complete!</h3>
            <p className="text-xs text-white/75">Extracted Score: {hud.score}</p>
            <button type="button" onClick={startGame} className="px-6 py-2.5 rounded-xl bg-emerald-400 text-black font-black text-sm cursor-pointer">Mine Again</button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 w-52 md:hidden">
        <div />
        <button type="button" onPointerDown={() => { vDirRef.current = { x: 0, y: -1 }; }} onPointerUp={() => { vDirRef.current = { x: 0, y: 0 }; }} className="h-11 rounded-xl bg-white/10 font-bold text-white touch-none">▲</button>
        <div />
        <button type="button" onPointerDown={() => { vDirRef.current = { x: -1, y: 0 }; }} onPointerUp={() => { vDirRef.current = { x: 0, y: 0 }; }} className="h-11 rounded-xl bg-white/10 font-bold text-white touch-none">◀</button>
        <button type="button" onPointerDown={() => { vDirRef.current = { x: 0, y: 1 }; }} onPointerUp={() => { vDirRef.current = { x: 0, y: 0 }; }} className="h-11 rounded-xl bg-white/10 font-bold text-white touch-none">▼</button>
        <button type="button" onPointerDown={() => { vDirRef.current = { x: 1, y: 0 }; }} onPointerUp={() => { vDirRef.current = { x: 0, y: 0 }; }} className="h-11 rounded-xl bg-white/10 font-bold text-white touch-none">▶</button>
      </div>
    </HiFiGameShell>
  );
};
AstroMinerGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

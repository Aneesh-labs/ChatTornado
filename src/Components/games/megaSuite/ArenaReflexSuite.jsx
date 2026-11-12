import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { Play, RotateCcw } from "lucide-react";
import { soundEngine } from "../../../utils/soundEffects";
import HiFiGameShell from "../hiFiSuite/HiFiGameShell";

/* ═══════════════════════════════════════════════════════════════════════════
   6. RICOCHET DUELIST v2.0 (Bank-Shot Bounce Multiplier Arena)
   ═══════════════════════════════════════════════════════════════════════════ */
export const RicochetArenaGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [hud, setHud] = useState({ score: 0, shots: 8 });
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("ricochetarena_highscore") || 0));
  const stateRef = useRef(null);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const startGame = useCallback(() => {
    const targets = Array.from({ length: 5 }, (_, i) => ({
      x: 90 + (i * 68) % 300, y: 70 + (i * 52) % 210, r: 15,
    }));
    stateRef.current = { W: 420, H: 340, shooter: { x: 210, y: 310 }, disc: null, targets, score: 0, shots: 8 };
    setHud({ score: 0, shots: 8 });
    setPhase("playing");
    playFx("whoosh");
  }, [playFx]);

  const shootAt = (e) => {
    const s = stateRef.current;
    if (!s || s.disc || phase !== "playing") return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (s.W / rect.width);
    const my = (e.clientY - rect.top) * (s.H / rect.height);
    const ang = Math.atan2(my - s.shooter.y, mx - s.shooter.x);
    s.disc = { x: s.shooter.x, y: s.shooter.y, vx: Math.cos(ang) * 410, vy: Math.sin(ang) * 410, bounces: 0 };
    playFx("laser");
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let rafId;
    let prev = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.035, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const s = stateRef.current;
      if (s.disc) {
        const d = s.disc;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.x < 8 || d.x > s.W - 8) { d.vx *= -1; d.bounces += 1; d.x = Math.max(8, Math.min(s.W - 8, d.x)); playFx("boing"); }
        if (d.y < 8 || d.y > s.H - 8) { d.vy *= -1; d.bounces += 1; d.y = Math.max(8, Math.min(s.H - 8, d.y)); playFx("boing"); }

        for (let i = s.targets.length - 1; i >= 0; i--) {
          const t = s.targets[i];
          if (Math.hypot(t.x - d.x, t.y - d.y) < t.r + 8) {
            s.score += 50 * (d.bounces + 1);
            s.targets.splice(i, 1);
            s.targets.push({ x: 50 + Math.random() * 320, y: 45 + Math.random() * 210, r: 15 });
            playFx("coin");
            setHud({ score: s.score, shots: s.shots });
          }
        }
        if (d.bounces >= 4) {
          s.disc = null;
          s.shots -= 1;
          setHud({ score: s.score, shots: s.shots });
          if (s.shots <= 0) {
            if (s.score > highScore) {
              setHighScore(s.score);
              localStorage.setItem("ricochetarena_highscore", String(s.score));
              onSaveScore?.("ricochetarena", s.score);
            }
            setPhase("gameover");
            return;
          }
        }
      }

      ctx.fillStyle = "#060b16";
      ctx.fillRect(0, 0, s.W, s.H);
      for (const t of s.targets) {
        ctx.fillStyle = "#f43f5e";
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath(); ctx.arc(s.shooter.x, s.shooter.y, 10, 0, Math.PI * 2); ctx.fill();
      if (s.disc) {
        ctx.fillStyle = "#fde047";
        ctx.beginPath(); ctx.arc(s.disc.x, s.disc.y, 7, 0, Math.PI * 2); ctx.fill();
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [highScore, onSaveScore, phase, playFx]);

  return (
    <HiFiGameShell
      title="Ricochet Duelist"
      badge="v2.0 UPDATED"
      onBack={onBack}
      score={hud.score}
      highScore={highScore}
      onReset={startGame}
      controlsHint="Tap/Click anywhere to fire a bouncing plasma disc • Bank off walls to multiply points up to 4×!"
      extraHeader={<span className="text-xs font-bold text-amber-300">Discs Left: {hud.shots}</span>}
    >
      <div className="relative w-full max-w-[440px] aspect-[420/340] rounded-3xl overflow-hidden border-2 border-cyan-400/35 shadow-2xl">
        <canvas ref={canvasRef} width={420} height={340} onClick={shootAt} className="w-full h-full block cursor-crosshair touch-none" />
        {phase === "ready" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3"><h3 className="text-2xl font-black text-white">Ricochet Duelist v2.0</h3><button type="button" onClick={startGame} className="px-7 py-3 rounded-2xl bg-cyan-400 text-black font-black text-sm cursor-pointer">Arm Discs</button></div>}
        {phase === "gameover" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3"><h3 className="text-2xl font-black text-cyan-300">Round Over!</h3><p className="text-xs text-white/75">Final Score: {hud.score}</p><button type="button" onClick={startGame} className="px-6 py-2.5 rounded-xl bg-cyan-400 text-black font-black text-sm cursor-pointer">Play Again</button></div>}
      </div>
    </HiFiGameShell>
  );
};
RicochetArenaGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   7. QUANTUM RAIL SWITCHER v2.0 (Track Junction Routing)
   ═══════════════════════════════════════════════════════════════════════════ */
export const RailSwitcherGame = ({ onBack, isMuted, onSaveScore }) => {
  const [phase, setPhase] = useState("ready");
  const [switches, setSwitches] = useState([0, 0]); // 0 = upper, 1 = lower
  const [carts, setCarts] = useState([]);
  const [hud, setHud] = useState({ score: 0, lives: 3 });
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("railswitcher_highscore") || 0));
  const swRef = useRef([0, 0]);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const toggleSw = (idx) => {
    const next = [...swRef.current];
    next[idx] = next[idx] === 0 ? 1 : 0;
    swRef.current = next;
    setSwitches(next);
    playFx("laser");
  };

  const startGame = () => {
    setCarts([{ id: 1, x: 0, color: 0 }]);
    setHud({ score: 0, lives: 3 });
    setPhase("playing");
    playFx("whoosh");
  };

  useEffect(() => {
    if (phase !== "playing") return;
    let idSeq = 2;
    const iv = setInterval(() => {
      setCarts((prev) => {
        const next = [];
        for (const c of prev) {
          const nx = c.x + 2.4;
          if (nx >= 100) {
            const lane = c.x < 50 ? swRef.current[0] : (swRef.current[0] === 0 ? 0 : 1 + swRef.current[1]);
            const matched = lane === c.color;
            setHud((h) => {
              const sc = matched ? h.score + 50 : h.score;
              const lv = matched ? h.lives : h.lives - 1;
              if (matched) playFx("coin");
              else playFx("boom");
              if (lv <= 0) {
                if (sc > highScore) {
                  setHighScore(sc);
                  localStorage.setItem("railswitcher_highscore", String(sc));
                  onSaveScore?.("railswitcher", sc);
                }
                setPhase("gameover");
              }
              return { score: sc, lives: lv };
            });
          } else {
            next.push({ ...c, x: nx });
          }
        }
        if (next.length === 0 || next[next.length - 1].x > 42) {
          next.push({ id: idSeq++, x: 0, color: Math.floor(Math.random() * 3) });
        }
        return next;
      });
    }, 60);
    return () => clearInterval(iv);
  }, [highScore, onSaveScore, phase, playFx]);

  const colors = ["bg-cyan-400", "bg-amber-400", "bg-rose-500"];
  const stationNames = ["Cyan Bay", "Gold Bay", "Crimson Bay"];

  return (
    <HiFiGameShell
      title="Quantum Rail Switcher"
      badge="v2.0 UPDATED"
      onBack={onBack}
      score={hud.score}
      highScore={highScore}
      onReset={startGame}
      controlsHint="Tap Junction 1 or Junction 2 buttons to route colored cargo pods into matching stations"
      extraHeader={<span className="text-xs font-bold text-rose-400">{"❤️".repeat(Math.max(0, hud.lives))}</span>}
    >
      <div className="w-full max-w-md p-4 rounded-3xl bg-[#07101f] border-2 border-cyan-500/35 space-y-4">
        <div className="relative h-28 rounded-2xl bg-black/50 border border-white/10 overflow-hidden px-3 flex items-center">
          {carts.map((c) => (
            <div
              key={c.id}
              className={`absolute w-7 h-7 rounded-lg ${colors[c.color]} border-2 border-white shadow-lg`}
              style={{ left: `${c.x}%`, top: "40%" }}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {stationNames.map((n, idx) => (
            <div key={n} className={`p-2 rounded-xl border border-white/15 text-xs font-black text-black ${colors[idx]}`}>{n}</div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => toggleSw(0)} className="py-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-black text-white cursor-pointer">
            Junction 1 → {switches[0] === 0 ? "Cyan Bay" : "Split Bay"}
          </button>
          <button type="button" onClick={() => toggleSw(1)} className="py-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-black text-white cursor-pointer">
            Junction 2 → {switches[1] === 0 ? "Gold Bay" : "Crimson Bay"}
          </button>
        </div>

        {phase !== "playing" && (
          <div className="text-center pt-2">
            <button type="button" onClick={startGame} className="px-7 py-2.5 rounded-xl bg-cyan-400 text-black font-black text-sm cursor-pointer">
              {phase === "ready" ? "Open Track" : `Restart (Score: ${hud.score})`}
            </button>
          </div>
        )}
      </div>
    </HiFiGameShell>
  );
};
RailSwitcherGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   8. SINE WAVE SURFER v2.0 (Hold-to-Climb Cyber Trail)
   ═══════════════════════════════════════════════════════════════════════════ */
export const WaveSurferGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("wavesurfer_highscore") || 0));
  const holdRef = useRef(false);
  const stateRef = useRef(null);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const startGame = useCallback(() => {
    stateRef.current = { W: 420, H: 280, y: 140, trail: [], walls: [], spawn: 0, score: 0 };
    setScore(0);
    setPhase("playing");
    playFx("whoosh");
  }, [playFx]);

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const down = () => { holdRef.current = true; };
    const up = () => { holdRef.current = false; };
    const kd = (e) => { if (e.code === "Space" || e.key === "ArrowUp") { e.preventDefault(); holdRef.current = true; } };
    const ku = (e) => { if (e.code === "Space" || e.key === "ArrowUp") holdRef.current = false; };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    canvas.addEventListener("mousedown", down);
    canvas.addEventListener("touchstart", down, { passive: true });

    let rafId;
    let prev = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.035, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const s = stateRef.current;
      s.y += (holdRef.current ? -215 : 215) * dt;
      s.trail.push({ x: 84, y: s.y });
      for (const t of s.trail) t.x -= 185 * dt;
      s.trail = s.trail.filter((t) => t.x > 0);

      s.spawn += dt;
      if (s.spawn >= 1.05) {
        s.spawn = 0;
        const gapY = 55 + Math.random() * (s.H - 150);
        s.walls.push({ x: s.W + 10, gapY, gapH: 86, passed: false });
      }

      if (s.y < 10 || s.y > s.H - 10) {
        playFx("boom");
        if (s.score > highScore) { setHighScore(s.score); localStorage.setItem("wavesurfer_highscore", String(s.score)); onSaveScore?.("wavesurfer", s.score); }
        setPhase("gameover");
        return;
      }

      for (let i = s.walls.length - 1; i >= 0; i--) {
        const w = s.walls[i];
        w.x -= 185 * dt;
        if (Math.abs(w.x - 84) < 16 && (s.y < w.gapY || s.y > w.gapY + w.gapH)) {
          playFx("boom");
          if (s.score > highScore) { setHighScore(s.score); localStorage.setItem("wavesurfer_highscore", String(s.score)); onSaveScore?.("wavesurfer", s.score); }
          setPhase("gameover");
          return;
        }
        if (!w.passed && w.x < 70) { w.passed = true; s.score += 20; setScore(s.score); playFx("coin"); }
        if (w.x < -30) s.walls.splice(i, 1);
      }

      ctx.fillStyle = "#050914";
      ctx.fillRect(0, 0, s.W, s.H);
      ctx.fillStyle = "#ec4899";
      for (const w of s.walls) {
        ctx.fillRect(w.x, 0, 20, w.gapY);
        ctx.fillRect(w.x, w.gapY + w.gapH, 20, s.H - (w.gapY + w.gapH));
      }
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 3;
      ctx.beginPath();
      s.trail.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.fillStyle = "#fef08a";
      ctx.beginPath(); ctx.arc(84, s.y, 7, 0, Math.PI * 2); ctx.fill();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
  }, [highScore, onSaveScore, phase, playFx]);

  return (
    <HiFiGameShell title="Sine Wave Surfer" badge="v2.0 UPDATED" onBack={onBack} score={score} highScore={highScore} onReset={startGame} controlsHint="Hold screen or Spacebar to climb diagonally • Release to dive diagonally!">
      <div className="relative w-full max-w-[440px] aspect-[420/280] rounded-3xl overflow-hidden border-2 border-pink-500/35 shadow-2xl">
        <canvas ref={canvasRef} width={420} height={280} className="w-full h-full block touch-none cursor-pointer" />
        {phase === "ready" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3"><h3 className="text-2xl font-black text-white">Sine Wave Surfer v2.0</h3><button type="button" onClick={startGame} className="px-7 py-3 rounded-2xl bg-pink-400 text-black font-black text-sm cursor-pointer">Ride Wave</button></div>}
        {phase === "gameover" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3"><h3 className="text-2xl font-black text-rose-400">Wave Crashed!</h3><p className="text-xs text-white/75">Score: {score}</p><button type="button" onClick={startGame} className="px-6 py-2.5 rounded-xl bg-pink-400 text-black font-black text-sm cursor-pointer">Retry</button></div>}
      </div>
    </HiFiGameShell>
  );
};
WaveSurferGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   9. SHADOW MIRROR DASH v2.0 (Simultaneous Dual-Runner Jump Sync)
   ═══════════════════════════════════════════════════════════════════════════ */
export const MirrorDashGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("mirrordash_highscore") || 0));
  const stateRef = useRef(null);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const triggerJump = useCallback(() => {
    const s = stateRef.current;
    if (!s || phase !== "playing") return;
    if (s.topY === 0) { s.topVy = 360; playFx("boing"); }
    if (s.botY === 0) { s.botVy = 360; }
  }, [phase, playFx]);

  const startGame = useCallback(() => {
    stateRef.current = { W: 440, H: 280, topY: 0, topVy: 0, botY: 0, botVy: 0, spikes: [], spawn: 0, score: 0 };
    setScore(0);
    setPhase("playing");
    playFx("whoosh");
  }, [playFx]);

  useEffect(() => {
    if (phase !== "playing") return;
    const kd = (e) => { if (e.code === "Space" || e.key === "ArrowUp") { e.preventDefault(); triggerJump(); } };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, [phase, triggerJump]);

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let rafId;
    let prev = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.035, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const s = stateRef.current;
      for (const key of ["top", "bot"]) {
        s[`${key}Y`] += s[`${key}Vy`] * dt;
        s[`${key}Vy`] -= 980 * dt;
        if (s[`${key}Y`] <= 0) { s[`${key}Y`] = 0; s[`${key}Vy`] = 0; }
      }
      s.spawn += dt;
      if (s.spawn >= 1.25) {
        s.spawn = 0;
        s.spikes.push({ x: s.W + 10, onTop: Math.random() < 0.5, passed: false });
      }
      for (let i = s.spikes.length - 1; i >= 0; i--) {
        const sp = s.spikes[i];
        sp.x -= 210 * dt;
        const runnerY = sp.onTop ? s.topY : s.botY;
        if (Math.abs(sp.x - 76) < 16 && runnerY < 26) {
          playFx("boom");
          if (s.score > highScore) { setHighScore(s.score); localStorage.setItem("mirrordash_highscore", String(s.score)); onSaveScore?.("mirrordash", s.score); }
          setPhase("gameover");
          return;
        }
        if (!sp.passed && sp.x < 60) { sp.passed = true; s.score += 25; setScore(s.score); playFx("coin"); }
        if (sp.x < -20) s.spikes.splice(i, 1);
      }

      ctx.fillStyle = "#060b16";
      ctx.fillRect(0, 0, s.W, s.H);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, s.H / 2 - 2, s.W, 4);
      // Top runner (hanging upward from ceiling / mid) & Bottom runner
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(66, s.H / 2 - 26 - s.topY, 20, 24);
      ctx.fillStyle = "#a855f7";
      ctx.fillRect(66, s.H - 26 - s.botY, 20, 24);

      ctx.fillStyle = "#f43f5e";
      for (const sp of s.spikes) {
        const yBase = sp.onTop ? s.H / 2 - 26 : s.H - 26;
        ctx.fillRect(sp.x - 8, yBase, 16, 24);
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [highScore, onSaveScore, phase, playFx]);

  return (
    <HiFiGameShell title="Shadow Mirror Dash" badge="v2.0 UPDATED" onBack={onBack} score={score} highScore={highScore} onReset={startGame} controlsHint="Tap or press Space to jump BOTH mirrored runners simultaneously over floor & mid-deck spikes">
      <div className="relative w-full max-w-[460px] aspect-[440/280] rounded-3xl overflow-hidden border-2 border-purple-500/35 shadow-2xl">
        <canvas ref={canvasRef} width={440} height={280} onClick={triggerJump} className="w-full h-full block cursor-pointer touch-none" />
        {phase === "ready" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3"><h3 className="text-2xl font-black text-white">Shadow Mirror Dash v2.0</h3><button type="button" onClick={startGame} className="px-7 py-3 rounded-2xl bg-purple-400 text-black font-black text-sm cursor-pointer">Sync Runners</button></div>}
        {phase === "gameover" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3"><h3 className="text-2xl font-black text-rose-400">Mirror Broken!</h3><p className="text-xs text-white/75">Score: {score}</p><button type="button" onClick={startGame} className="px-6 py-2.5 rounded-xl bg-purple-400 text-black font-black text-sm cursor-pointer">Retry</button></div>}
      </div>
    </HiFiGameShell>
  );
};
MirrorDashGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   10. CHRONO SLOW-MO SNIPER v2.0 (Bullet-Time Drone Range)
   ═══════════════════════════════════════════════════════════════════════════ */
export const ChronoSniperGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [hud, setHud] = useState({ score: 0, timeLeft: 35, slowMo: false });
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("chronosniper_highscore") || 0));
  const stateRef = useRef(null);
  const slowRef = useRef(false);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const startGame = useCallback(() => {
    const drones = Array.from({ length: 6 }, () => ({
      x: 40 + Math.random() * 340, y: 40 + Math.random() * 240, vx: (Math.random() - 0.5) * 290, vy: (Math.random() - 0.5) * 230, r: 16,
    }));
    stateRef.current = { W: 420, H: 320, drones, score: 0, timeLeft: 35, rings: [] };
    setHud({ score: 0, timeLeft: 35, slowMo: false });
    setPhase("playing");
    playFx("whoosh");
  }, [playFx]);

  const snipe = (e) => {
    const s = stateRef.current;
    if (!s || phase !== "playing") return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (s.W / rect.width);
    const my = (e.clientY - rect.top) * (s.H / rect.height);
    let hit = false;
    for (let i = s.drones.length - 1; i >= 0; i--) {
      const d = s.drones[i];
      const dist = Math.hypot(d.x - mx, d.y - my);
      if (dist <= d.r + 8) {
        const crit = dist <= 7;
        s.score += crit ? 120 : 50;
        s.rings.push({ x: d.x, y: d.y, life: 0.35, crit });
        s.drones[i] = { x: 40 + Math.random() * 340, y: 40 + Math.random() * 240, vx: (Math.random() - 0.5) * 310, vy: (Math.random() - 0.5) * 240, r: 15 };
        playFx(crit ? "tada" : "coin");
        hit = true;
        break;
      }
    }
    if (!hit) playFx("laser");
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const kd = (e) => { if (e.code === "ShiftLeft" || e.code === "Space") { slowRef.current = true; } };
    const ku = (e) => { if (e.code === "ShiftLeft" || e.code === "Space") { slowRef.current = false; } };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let rafId;
    let prev = performance.now();
    let uiTimer = 0;

    const loop = (now) => {
      const dt = Math.min(0.04, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const s = stateRef.current;
      const timeScale = slowRef.current ? 0.25 : 1.0;
      s.timeLeft = Math.max(0, s.timeLeft - dt);
      for (const d of s.drones) {
        d.x += d.vx * dt * timeScale;
        d.y += d.vy * dt * timeScale;
        if (d.x < 18 || d.x > s.W - 18) d.vx *= -1;
        if (d.y < 18 || d.y > s.H - 18) d.vy *= -1;
      }
      s.rings = s.rings.map((r) => ({ ...r, life: r.life - dt })).filter((r) => r.life > 0);
      if (s.timeLeft <= 0) {
        if (s.score > highScore) { setHighScore(s.score); localStorage.setItem("chronosniper_highscore", String(s.score)); onSaveScore?.("chronosniper", s.score); }
        playFx("win");
        setPhase("gameover");
        return;
      }
      uiTimer += dt;
      if (uiTimer >= 0.15) { uiTimer = 0; setHud({ score: s.score, timeLeft: Math.ceil(s.timeLeft), slowMo: slowRef.current }); }

      ctx.fillStyle = slowRef.current ? "#09182c" : "#050914";
      ctx.fillRect(0, 0, s.W, s.H);
      for (const d of s.drones) {
        ctx.strokeStyle = "#f43f5e";
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#fde047";
        ctx.beginPath(); ctx.arc(d.x, d.y, 4, 0, Math.PI * 2); ctx.fill();
      }
      for (const r of s.rings) {
        ctx.strokeStyle = r.crit ? "#fde047" : "#34d399";
        ctx.beginPath(); ctx.arc(r.x, r.y, (1 - r.life / 0.35) * 32, 0, Math.PI * 2); ctx.stroke();
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [highScore, onSaveScore, phase, playFx]);

  return (
    <HiFiGameShell
      title="Chrono Slow-Mo Sniper"
      badge="v2.0 UPDATED"
      onBack={onBack}
      score={hud.score}
      highScore={highScore}
      onReset={startGame}
      controlsHint="Hold Space/Shift (or Bullet-Time button) to slow drones 4× • Bullseyes score +120!"
      extraHeader={
        <div className="flex items-center gap-2">
          <button type="button" onPointerDown={() => { slowRef.current = true; }} onPointerUp={() => { slowRef.current = false; }} onPointerLeave={() => { slowRef.current = false; }} className="px-2.5 py-1 rounded-lg bg-cyan-500/25 border border-cyan-400 text-xs font-bold text-cyan-200 touch-none cursor-pointer">
            {hud.slowMo ? "SLOW-MO ON" : "Hold Slow-Mo"}
          </button>
          <span className="text-xs font-bold text-amber-300">{hud.timeLeft}s</span>
        </div>
      }
    >
      <div className="relative w-full max-w-[440px] aspect-[420/320] rounded-3xl overflow-hidden border-2 border-cyan-500/35 shadow-2xl">
        <canvas ref={canvasRef} width={420} height={320} onClick={snipe} className="w-full h-full block cursor-crosshair touch-none" />
        {phase === "ready" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3"><h3 className="text-2xl font-black text-white">Chrono Slow-Mo Sniper v2.0</h3><button type="button" onClick={startGame} className="px-7 py-3 rounded-2xl bg-cyan-400 text-black font-black text-sm cursor-pointer">Engage Scope</button></div>}
        {phase === "gameover" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3"><h3 className="text-2xl font-black text-cyan-300">Range Complete!</h3><p className="text-xs text-white/75">Score: {hud.score}</p><button type="button" onClick={startGame} className="px-6 py-2.5 rounded-xl bg-cyan-400 text-black font-black text-sm cursor-pointer">Retry</button></div>}
      </div>
    </HiFiGameShell>
  );
};
ChronoSniperGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { Play, RotateCcw } from "lucide-react";
import { soundEngine } from "../../../utils/soundEffects";
import HiFiGameShell from "./HiFiGameShell";

/* ═══════════════════════════════════════════════════════════════════════════
   11. SYNTH PULSE RHYTHM (4-Lane Neon Highway + Timing Judges + WebAudio Synth)
   ═══════════════════════════════════════════════════════════════════════════ */
const LANE_KEYS = ["KeyD", "KeyF", "KeyJ", "KeyK"];
const LANE_LABELS = ["D", "F", "J", "K"];
const LANE_COLORS = ["#22d3ee", "#34d399", "#fbbf24", "#f43f5e"];

export const SynthRhythmGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [hud, setHud] = useState({ score: 0, combo: 0, timeLeft: 45, judge: "" });
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("synthrhythm_highscore") || 0));
  const stateRef = useRef(null);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const hitLane = useCallback((laneIdx) => {
    const s = stateRef.current;
    if (!s || phase !== "playing") return;
    s.laneFlash[laneIdx] = 0.16;

    const hitY = s.H - 58;
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < s.notes.length; i++) {
      const n = s.notes[i];
      if (n.lane !== laneIdx) continue;
      const d = Math.abs(n.y - hitY);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }

    if (bestIdx !== -1 && bestDist < 42) {
      s.notes.splice(bestIdx, 1);
      const isPerfect = bestDist < 19;
      s.combo += 1;
      const mult = Math.min(8, 1 + Math.floor(s.combo / 5));
      s.score += (isPerfect ? 100 : 50) * mult;
      s.judge = isPerfect ? `PERFECT ×${mult}` : `GOOD ×${mult}`;
      s.judgeTimer = 0.55;
      playFx(isPerfect ? "tada" : "coin");
    } else {
      s.combo = 0;
      s.judge = "MISS";
      s.judgeTimer = 0.4;
      playFx("boing");
    }
    setHud({ score: s.score, combo: s.combo, timeLeft: Math.ceil(s.timeLeft), judge: s.judge });
  }, [phase, playFx]);

  const startGame = useCallback(() => {
    stateRef.current = {
      W: 360, H: 420, notes: [], spawnAccum: 0, score: 0, combo: 0,
      timeLeft: 45, judge: "", judgeTimer: 0, laneFlash: [0, 0, 0, 0],
    };
    setHud({ score: 0, combo: 0, timeLeft: 45, judge: "" });
    setPhase("playing");
    playFx("whoosh");
  }, [playFx]);

  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e) => {
      const idx = LANE_KEYS.indexOf(e.code);
      if (idx >= 0) {
        e.preventDefault();
        hitLane(idx);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hitLane, phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let rafId;
    let prev = performance.now();
    let uiTimer = 0;

    const loop = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const s = stateRef.current;
      s.timeLeft = Math.max(0, s.timeLeft - dt);
      if (s.judgeTimer > 0) s.judgeTimer = Math.max(0, s.judgeTimer - dt);
      for (let i = 0; i < 4; i++) s.laneFlash[i] = Math.max(0, s.laneFlash[i] - dt);

      s.spawnAccum += dt;
      if (s.spawnAccum >= 0.42) {
        s.spawnAccum -= 0.42;
        s.notes.push({ lane: Math.floor(Math.random() * 4), y: -16 });
      }

      const hitY = s.H - 58;
      for (let i = s.notes.length - 1; i >= 0; i--) {
        s.notes[i].y += 245 * dt;
        if (s.notes[i].y > s.H + 14) {
          s.notes.splice(i, 1);
          s.combo = 0;
        }
      }

      if (s.timeLeft <= 0) {
        if (s.score > highScore) {
          setHighScore(s.score);
          localStorage.setItem("synthrhythm_highscore", String(s.score));
          onSaveScore?.("synthrhythm", s.score);
        }
        playFx("win");
        setPhase("gameover");
        return;
      }

      uiTimer += dt;
      if (uiTimer >= 0.2) {
        uiTimer = 0;
        setHud({ score: s.score, combo: s.combo, timeLeft: Math.ceil(s.timeLeft), judge: s.judgeTimer > 0 ? s.judge : "" });
      }

      // Draw 4-lane highway
      ctx.fillStyle = "#060814";
      ctx.fillRect(0, 0, s.W, s.H);
      const laneW = s.W / 4;
      for (let i = 0; i < 4; i++) {
        if (s.laneFlash[i] > 0) {
          ctx.fillStyle = `${LANE_COLORS[i]}33`;
          ctx.fillRect(i * laneW, 0, laneW, s.H);
        }
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.strokeRect(i * laneW, 0, laneW, s.H);

        // Receptor ring
        ctx.strokeStyle = LANE_COLORS[i];
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(i * laneW + 12, hitY - 12, laneW - 24, 24, 8);
        ctx.stroke();
      }

      for (const n of s.notes) {
        const x = n.lane * laneW + 14;
        ctx.fillStyle = LANE_COLORS[n.lane];
        ctx.beginPath();
        ctx.roundRect(x, n.y - 10, laneW - 28, 20, 7);
        ctx.fill();
      }

      if (s.judgeTimer > 0) {
        ctx.fillStyle = s.judge.includes("PERFECT") ? "#fde047" : s.judge === "MISS" ? "#fb7185" : "#34d399";
        ctx.font = "900 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(s.judge, s.W / 2, hitY - 40);
      }

      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [highScore, onSaveScore, phase, playFx]);

  return (
    <HiFiGameShell
      title="Synth Pulse Rhythm"
      badge="NEW • 4-LANE BPM"
      badgeTone="bg-pink-500/20 border-pink-400/50 text-pink-200"
      onBack={onBack}
      score={hud.score}
      highScore={highScore}
      onReset={startGame}
      controlsHint="Tap lane pads or press D / F / J / K when neon notes cross the receptor bar"
      extraHeader={<span className="text-xs font-bold text-pink-300">{hud.timeLeft}s • {hud.combo}× Combo</span>}
    >
      <div className="relative w-full max-w-[360px] rounded-3xl overflow-hidden border-2 border-pink-500/35 shadow-2xl">
        <canvas ref={canvasRef} width={360} height={420} className="w-full aspect-[360/420] block" />
        <div className="grid grid-cols-4 gap-1 p-1.5 bg-[#090d1b] border-t border-white/10">
          {LANE_LABELS.map((lbl, idx) => (
            <button
              key={lbl}
              type="button"
              onPointerDown={() => hitLane(idx)}
              className="h-12 rounded-xl font-black text-white text-sm active:scale-95 transition-transform touch-none cursor-pointer border border-white/15"
              style={{ backgroundColor: `${LANE_COLORS[idx]}33` }}
            >
              {lbl}
            </button>
          ))}
        </div>
        {phase === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3 p-4 text-center">
            <h3 className="text-2xl font-black text-white">Synth Pulse Rhythm</h3>
            <p className="text-xs text-white/70 max-w-xs">45-second neon beat sprint. Chain hits past 8× multiplier!</p>
            <button type="button" onClick={startGame} className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-pink-500 hover:bg-pink-400 text-black font-black text-sm cursor-pointer">
              <Play className="h-4 w-4 fill-current" /> Start Track
            </button>
          </div>
        )}
        {phase === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3">
            <h3 className="text-2xl font-black text-pink-300">Track Complete!</h3>
            <p className="text-xs text-white/75">Final Score: {hud.score}</p>
            <button type="button" onClick={startGame} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-pink-500 text-black font-black text-sm cursor-pointer">
              <RotateCcw className="h-4 w-4" /> Encore
            </button>
          </div>
        )}
      </div>
    </HiFiGameShell>
  );
};
SynthRhythmGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   12. GRAVITY MERGE DROP (Suika-Style 2048 Elastic Orb Physics)
   ═══════════════════════════════════════════════════════════════════════════ */
const ORB_SPECS = {
  2: { r: 16, col: "#38bdf8" },
  4: { r: 21, col: "#34d399" },
  8: { r: 26, col: "#a855f7" },
  16: { r: 31, col: "#f43f5e" },
  32: { r: 36, col: "#fbbf24" },
  64: { r: 42, col: "#fb923c" },
  128: { r: 48, col: "#ec4899" },
  256: { r: 54, col: "#14b8a6" },
  512: { r: 60, col: "#eab308" },
  1024: { r: 66, col: "#22c55e" },
  2048: { r: 72, col: "#fde047" },
};

export const GravityMergeDropGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [hud, setHud] = useState({ score: 0, nextVal: 2 });
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("gravitydrop_highscore") || 0));
  const stateRef = useRef(null);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const pickNextVal = () => [2, 2, 4, 8][Math.floor(Math.random() * 4)];

  const startGame = useCallback(() => {
    stateRef.current = {
      W: 360, H: 440, aimX: 180, nextVal: 2, orbs: [], sparks: [], score: 0, dropCooldown: 0,
    };
    setHud({ score: 0, nextVal: 2 });
    setPhase("playing");
    playFx("whoosh");
  }, [playFx]);

  const dropOrb = (clientX) => {
    const s = stateRef.current;
    if (!s || phase !== "playing" || s.dropCooldown > 0) return;
    if (clientX !== undefined) {
      const rect = canvasRef.current.getBoundingClientRect();
      s.aimX = Math.max(40, Math.min(s.W - 40, (clientX - rect.left) * (s.W / rect.width)));
    }
    const spec = ORB_SPECS[s.nextVal];
    s.orbs.push({ x: s.aimX, y: 42, vx: (Math.random() - 0.5) * 15, vy: 0, val: s.nextVal, r: spec.r });
    s.nextVal = pickNextVal();
    s.dropCooldown = 0.36;
    playFx("laser");
    setHud({ score: s.score, nextVal: s.nextVal });
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
      if (s.dropCooldown > 0) s.dropCooldown = Math.max(0, s.dropCooldown - dt);

      // Integrate orbs + collisions + same-value fusion
      for (const o of s.orbs) {
        o.vy += 460 * dt;
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        o.vx *= 0.99;
        if (o.x - o.r < 6) { o.x = 6 + o.r; o.vx = Math.abs(o.vx) * 0.45; }
        if (o.x + o.r > s.W - 6) { o.x = s.W - 6 - o.r; o.vx = -Math.abs(o.vx) * 0.45; }
        if (o.y + o.r > s.H - 6) { o.y = s.H - 6 - o.r; o.vy = -Math.abs(o.vy) * 0.25; }
      }

      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < s.orbs.length; i++) {
          for (let j = i + 1; j < s.orbs.length; j++) {
            const a = s.orbs[i];
            const b = s.orbs[j];
            if (!a || !b) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 0.001;
            const minDist = a.r + b.r;
            if (dist < minDist) {
              if (a.val === b.val && a.val < 2048) {
                const nextVal = a.val * 2;
                const spec = ORB_SPECS[nextVal];
                a.x = (a.x + b.x) * 0.5;
                a.y = (a.y + b.y) * 0.5;
                a.val = nextVal;
                a.r = spec.r;
                a.vy = -80;
                s.orbs.splice(j, 1);
                s.score += nextVal;
                playFx("coin");
                setHud({ score: s.score, nextVal: s.nextVal });
                break;
              }
              const overlap = (minDist - dist) * 0.5;
              const nx = dx / dist;
              const ny = dy / dist;
              a.x -= nx * overlap; a.y -= ny * overlap;
              b.x += nx * overlap; b.y += ny * overlap;
            }
          }
        }
      }

      // Overflow danger check (orb resting near top after settling)
      if (s.dropCooldown <= 0 && s.orbs.some((o) => o.y - o.r < 68 && Math.abs(o.vy) < 12)) {
        if (s.score > highScore) {
          setHighScore(s.score);
          localStorage.setItem("gravitydrop_highscore", String(s.score));
          onSaveScore?.("gravitydrop", s.score);
        }
        playFx("boom");
        setPhase("gameover");
        return;
      }

      ctx.fillStyle = "#080e1a";
      ctx.fillRect(0, 0, s.W, s.H);
      // Danger line
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "rgba(244, 63, 94, 0.55)";
      ctx.beginPath();
      ctx.moveTo(0, 72);
      ctx.lineTo(s.W, 72);
      ctx.stroke();
      ctx.setLineDash([]);

      // Aim drop guide
      const nextSpec = ORB_SPECS[s.nextVal];
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.moveTo(s.aimX, 42);
      ctx.lineTo(s.aimX, s.H);
      ctx.stroke();
      ctx.fillStyle = nextSpec.col;
      ctx.beginPath();
      ctx.arc(s.aimX, 34, nextSpec.r * 0.75, 0, Math.PI * 2);
      ctx.fill();

      for (const o of s.orbs) {
        const spec = ORB_SPECS[o.val] || ORB_SPECS[2];
        ctx.fillStyle = spec.col;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#040812";
        ctx.font = `900 ${Math.max(12, Math.floor(o.r * 0.65))}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(o.val), o.x, o.y);
      }

      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [highScore, onSaveScore, phase, playFx]);

  return (
    <HiFiGameShell
      title="Gravity Merge Drop"
      badge="NEW • PHYSICS PUZZLE"
      badgeTone="bg-sky-500/20 border-sky-400/50 text-sky-200"
      onBack={onBack}
      score={hud.score}
      highScore={highScore}
      onReset={startGame}
      controlsHint="Tap or drag anywhere in the well to drop & merge identical numbered orbs"
      extraHeader={<span className="text-xs font-bold text-amber-300">Next Orb: {hud.nextVal}</span>}
    >
      <div className="relative w-full max-w-[360px] rounded-3xl overflow-hidden border-2 border-sky-400/35 shadow-2xl">
        <canvas
          ref={canvasRef}
          width={360}
          height={440}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            if (stateRef.current) stateRef.current.aimX = Math.max(40, Math.min(320, (e.clientX - rect.left) * (360 / rect.width)));
          }}
          onClick={(e) => dropOrb(e.clientX)}
          className="w-full aspect-[360/440] block touch-none cursor-crosshair"
        />
        {phase === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3 p-4 text-center">
            <h3 className="text-2xl font-black text-white">Gravity Merge Drop</h3>
            <p className="text-xs text-white/70 max-w-xs">Fuse colliding equal orbs all the way up to 2048 before overflow!</p>
            <button type="button" onClick={startGame} className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-sky-400 hover:bg-sky-300 text-black font-black text-sm cursor-pointer">
              <Play className="h-4 w-4 fill-current" /> Drop Orbs
            </button>
          </div>
        )}
        {phase === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3">
            <h3 className="text-2xl font-black text-rose-400">Well Overflowed!</h3>
            <p className="text-xs text-white/75">Final Score: {hud.score}</p>
            <button type="button" onClick={startGame} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-400 text-black font-black text-sm cursor-pointer">
              <RotateCcw className="h-4 w-4" /> Play Again
            </button>
          </div>
        )}
      </div>
    </HiFiGameShell>
  );
};
GravityMergeDropGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

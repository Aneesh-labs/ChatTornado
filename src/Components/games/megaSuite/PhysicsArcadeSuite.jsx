import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { Play, RotateCcw } from "lucide-react";
import { soundEngine } from "../../../utils/soundEffects";
import HiFiGameShell from "../hiFiSuite/HiFiGameShell";

/* ═══════════════════════════════════════════════════════════════════════════
   26. VORTEX BUMPER PINBALL v2.0 (Dual Flippers + Bumpers)
   ═══════════════════════════════════════════════════════════════════════════ */
export const PinballVortexGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [hud, setHud] = useState({ score: 0, balls: 3 });
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("pinballvortex_highscore") || 0));
  const flipRef = useRef({ left: false, right: false });
  const stateRef = useRef(null);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const startGame = useCallback(() => {
    stateRef.current = {
      W: 340, H: 440,
      ball: { x: 170, y: 120, vx: 90, vy: 40 },
      bumpers: [{ x: 110, y: 140, r: 22 }, { x: 230, y: 140, r: 22 }, { x: 170, y: 205, r: 24 }],
      score: 0, balls: 3,
    };
    setHud({ score: 0, balls: 3 });
    setPhase("playing");
    playFx("whoosh");
  }, [playFx]);

  useEffect(() => {
    if (phase !== "playing") return;
    const kd = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") flipRef.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") flipRef.current.right = true;
    };
    const ku = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") flipRef.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") flipRef.current.right = false;
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let rafId;
    let prev = performance.now();

    const loop = (now) => {
      const dt = Math.min(0.035, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const s = stateRef.current;
      const b = s.ball;
      b.vy += 380 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < 10) { b.x = 10; b.vx = Math.abs(b.vx) * 0.9; }
      if (b.x > s.W - 10) { b.x = s.W - 10; b.vx = -Math.abs(b.vx) * 0.9; }
      if (b.y < 10) { b.y = 10; b.vy = Math.abs(b.vy) * 0.9; }

      for (const bmp of s.bumpers) {
        const dx = b.x - bmp.x; const dy = b.y - bmp.y;
        const d = Math.hypot(dx, dy);
        if (d < bmp.r + 8) {
          const nx = dx / (d || 1); const ny = dy / (d || 1);
          b.x = bmp.x + nx * (bmp.r + 9);
          b.y = bmp.y + ny * (bmp.r + 9);
          b.vx = nx * 280; b.vy = ny * 280;
          s.score += 50;
          playFx("coin");
          setHud({ score: s.score, balls: s.balls });
        }
      }

      // Left / Right flippers
      if (b.y >= s.H - 58 && b.y <= s.H - 36 && b.vy > 0) {
        if (b.x < s.W / 2 - 12 && flipRef.current.left) {
          b.vy = -390; b.vx += 85; playFx("boing");
        } else if (b.x > s.W / 2 + 12 && flipRef.current.right) {
          b.vy = -390; b.vx -= 85; playFx("boing");
        }
      }

      if (b.y > s.H + 14) {
        s.balls -= 1;
        playFx("boom");
        setHud({ score: s.score, balls: s.balls });
        if (s.balls <= 0) {
          if (s.score > highScore) { setHighScore(s.score); localStorage.setItem("pinballvortex_highscore", String(s.score)); onSaveScore?.("pinballvortex", s.score); }
          setPhase("gameover");
          return;
        }
        s.ball = { x: 170, y: 100, vx: (Math.random() - 0.5) * 140, vy: 20 };
      }

      ctx.fillStyle = "#060b16";
      ctx.fillRect(0, 0, s.W, s.H);
      for (const bmp of s.bumpers) {
        ctx.fillStyle = "#ec4899";
        ctx.beginPath(); ctx.arc(bmp.x, bmp.y, bmp.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(45, s.H - 54);
      ctx.lineTo(148, flipRef.current.left ? s.H - 70 : s.H - 42);
      ctx.moveTo(s.W - 45, s.H - 54);
      ctx.lineTo(s.W - 148, flipRef.current.right ? s.H - 70 : s.H - 42);
      ctx.stroke();

      ctx.fillStyle = "#fef08a";
      ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, Math.PI * 2); ctx.fill();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [highScore, onSaveScore, phase, playFx]);

  return (
    <HiFiGameShell title="Vortex Bumper Pinball" badge="v2.0 UPDATED" onBack={onBack} score={hud.score} highScore={highScore} onReset={startGame} controlsHint="Hold A/← or D/→ (or tap Left/Right pads) to fire flippers & bounce off glowing bumpers!" extraHeader={<span className="text-xs font-bold text-pink-300">Balls: {hud.balls}</span>}>
      <div className="relative w-full max-w-[340px] rounded-3xl overflow-hidden border-2 border-pink-500/35 shadow-2xl">
        <canvas ref={canvasRef} width={340} height={440} className="w-full aspect-[340/440] block" />
        <div className="grid grid-cols-2 gap-2 p-2 bg-[#090d1b] border-t border-white/10">
          <button type="button" onPointerDown={() => { flipRef.current.left = true; }} onPointerUp={() => { flipRef.current.left = false; }} onPointerLeave={() => { flipRef.current.left = false; }} className="h-12 rounded-xl bg-cyan-500/25 font-black text-cyan-200 text-xs touch-none">LEFT FLIPPER</button>
          <button type="button" onPointerDown={() => { flipRef.current.right = true; }} onPointerUp={() => { flipRef.current.right = false; }} onPointerLeave={() => { flipRef.current.right = false; }} className="h-12 rounded-xl bg-cyan-500/25 font-black text-cyan-200 text-xs touch-none">RIGHT FLIPPER</button>
        </div>
        {phase === "ready" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3"><h3 className="text-2xl font-black text-white">Vortex Pinball v2.0</h3><button type="button" onClick={startGame} className="px-7 py-3 rounded-2xl bg-pink-500 text-black font-black text-sm cursor-pointer"><Play className="h-4 w-4 inline mr-1 fill-current" /> Launch Ball</button></div>}
        {phase === "gameover" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3"><h3 className="text-2xl font-black text-rose-400">Game Over!</h3><p className="text-xs text-white/75">Final Score: {hud.score}</p><button type="button" onClick={startGame} className="px-6 py-2.5 rounded-xl bg-pink-500 text-black font-black text-sm cursor-pointer"><RotateCcw className="h-4 w-4 inline mr-1" /> Replay</button></div>}
      </div>
    </HiFiGameShell>
  );
};
PinballVortexGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   27. SKYSCRAPER STACKER v2.0 (Timing Slicer Tower Builder)
   ═══════════════════════════════════════════════════════════════════════════ */
export const TowerStackGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("towerstack_highscore") || 0));
  const stateRef = useRef(null);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const startGame = useCallback(() => {
    stateRef.current = {
      W: 340, H: 400,
      stack: [{ x: 90, w: 160, y: 376 }],
      mover: { x: 20, w: 160, vx: 190 },
      score: 0,
    };
    setScore(0);
    setPhase("playing");
    playFx("whoosh");
  }, [playFx]);

  const dropFloor = useCallback(() => {
    const s = stateRef.current;
    if (!s || phase !== "playing") return;
    const top = s.stack[s.stack.length - 1];
    const m = s.mover;
    const overlapLeft = Math.max(top.x, m.x);
    const overlapRight = Math.min(top.x + top.w, m.x + m.w);
    const overlapW = overlapRight - overlapLeft;

    if (overlapW <= 4) {
      playFx("boom");
      if (s.score > highScore) { setHighScore(s.score); localStorage.setItem("towerstack_highscore", String(s.score)); onSaveScore?.("towerstack", s.score); }
      setPhase("gameover");
      return;
    }

    const perfect = Math.abs(m.x - top.x) < 7;
    const finalW = perfect ? Math.min(180, top.w + 6) : overlapW;
    const finalX = perfect ? top.x : overlapLeft;
    s.stack.push({ x: finalX, w: finalW, y: top.y - 22 });
    if (s.stack.length > 12) {
      s.stack.shift();
      for (const f of s.stack) f.y += 22;
    }
    s.score += perfect ? 100 : 40;
    setScore(s.score);
    playFx(perfect ? "tada" : "coin");
    s.mover = { x: 10, w: finalW, vx: Math.min(340, 190 + s.score * 0.14) };
  }, [highScore, onSaveScore, phase, playFx]);

  useEffect(() => {
    if (phase !== "playing") return;
    const kd = (e) => { if (e.code === "Space") { e.preventDefault(); dropFloor(); } };
    window.addEventListener("keydown", kd);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let rafId;
    let prev = performance.now();

    const loop = (now) => {
      const dt = Math.min(0.04, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const s = stateRef.current;
      const m = s.mover;
      m.x += m.vx * dt;
      if (m.x <= 6) { m.x = 6; m.vx = Math.abs(m.vx); }
      if (m.x + m.w >= s.W - 6) { m.x = s.W - 6 - m.w; m.vx = -Math.abs(m.vx); }

      ctx.fillStyle = "#060b16";
      ctx.fillRect(0, 0, s.W, s.H);
      s.stack.forEach((f, idx) => {
        ctx.fillStyle = `hsl(${(idx * 24 + 160) % 360}, 80%, 58%)`;
        ctx.fillRect(f.x, f.y, f.w, 18);
      });
      ctx.fillStyle = "#fde047";
      ctx.fillRect(m.x, s.stack[s.stack.length - 1].y - 24, m.w, 18);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("keydown", kd); };
  }, [dropFloor, phase]);

  return (
    <HiFiGameShell title="Skyscraper Stacker" badge="v2.0 UPDATED" onBack={onBack} score={score} highScore={highScore} onReset={startGame} controlsHint="Tap or press Space to drop moving neon floor slab • Near-perfect alignment widens your slab (+100)!">
      <div className="relative w-full max-w-[350px] aspect-[340/400] rounded-3xl overflow-hidden border-2 border-emerald-400/35 shadow-2xl">
        <canvas ref={canvasRef} width={340} height={400} onClick={dropFloor} className="w-full h-full block cursor-pointer touch-none" />
        {phase === "ready" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3"><h3 className="text-2xl font-black text-white">Skyscraper Stacker v2.0</h3><button type="button" onClick={startGame} className="px-7 py-3 rounded-2xl bg-emerald-400 text-black font-black text-sm cursor-pointer">Build Tower</button></div>}
        {phase === "gameover" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3"><h3 className="text-2xl font-black text-rose-400">Tower Missed!</h3><p className="text-xs text-white/75">Final Score: {score}</p><button type="button" onClick={startGame} className="px-6 py-2.5 rounded-xl bg-emerald-400 text-black font-black text-sm cursor-pointer">Rebuild</button></div>}
      </div>
    </HiFiGameShell>
  );
};
TowerStackGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   28. CYBER MINI-GOLF v2.0 (Drag-Back Aim + Ricochet Bank Holes)
   ═══════════════════════════════════════════════════════════════════════════ */
export const GolfSynthGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [hud, setHud] = useState({ hole: 1, strokes: 0, score: 0 });
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("golfsynth_highscore") || 0));
  const stateRef = useRef(null);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const loadHole = useCallback((holeNum, totalScore = 0) => {
    const W = 420; const H = 300;
    stateRef.current = {
      W, H, holeNum, score: totalScore, strokes: 0, drag: null,
      ball: { x: 56, y: H / 2, vx: 0, vy: 0 },
      cup: { x: W - 56, y: 70 + ((holeNum * 67) % 160), r: 14 },
      walls: [{ x: 185, y: holeNum % 2 === 0 ? 40 : 120, w: 18, h: 130 }],
    };
    setHud({ hole: holeNum, strokes: 0, score: totalScore });
  }, []);

  useEffect(() => { loadHole(1, 0); }, [loadHole]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (cx - rect.left) * (canvas.width / rect.width), y: (cy - rect.top) * (canvas.height / rect.height) };
    };
    const onDown = (e) => { const s = stateRef.current; if (Math.hypot(s.ball.vx, s.ball.vy) < 4) s.drag = getPos(e); };
    const onMove = (e) => { if (stateRef.current?.drag) stateRef.current.drag = getPos(e); };
    const onUp = () => {
      const s = stateRef.current;
      if (!s?.drag) return;
      const dx = s.ball.x - s.drag.x; const dy = s.ball.y - s.drag.y;
      s.drag = null;
      if (Math.hypot(dx, dy) < 8) return;
      s.ball.vx = Math.max(-420, Math.min(420, dx * 4.5));
      s.ball.vy = Math.max(-420, Math.min(420, dy * 4.5));
      s.strokes += 1;
      setHud({ hole: s.holeNum, strokes: s.strokes, score: s.score });
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
      if (s) {
        const b = s.ball;
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.vx *= 0.975; b.vy *= 0.975;
        if (b.x < 10 || b.x > s.W - 10) { b.vx *= -0.85; b.x = Math.max(10, Math.min(s.W - 10, b.x)); playFx("boing"); }
        if (b.y < 10 || b.y > s.H - 10) { b.vy *= -0.85; b.y = Math.max(10, Math.min(s.H - 10, b.y)); playFx("boing"); }
        for (const w of s.walls) {
          if (b.x + 8 > w.x && b.x - 8 < w.x + w.w && b.y + 8 > w.y && b.y - 8 < w.y + w.h) {
            b.vx *= -0.85;
            b.x += Math.sign(b.vx) * 6;
            playFx("boing");
          }
        }
        if (Math.hypot(b.x - s.cup.x, b.y - s.cup.y) < s.cup.r && Math.hypot(b.vx, b.vy) < 230) {
          const holePts = Math.max(50, 260 - s.strokes * 40);
          const nextScore = s.score + holePts;
          playFx("win");
          if (nextScore > highScore) { setHighScore(nextScore); localStorage.setItem("golfsynth_highscore", String(nextScore)); onSaveScore?.("golfsynth", nextScore); }
          loadHole(s.holeNum + 1, nextScore);
        }

        ctx.fillStyle = "#062119";
        ctx.fillRect(0, 0, s.W, s.H);
        ctx.fillStyle = "#020b09";
        ctx.beginPath(); ctx.arc(s.cup.x, s.cup.y, s.cup.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fbbf24";
        for (const w of s.walls) ctx.fillRect(w.x, w.y, w.w, w.h);
        if (s.drag) {
          ctx.strokeStyle = "#fde047";
          ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + (b.x - s.drag.x), b.y + (b.y - s.drag.y)); ctx.stroke();
        }
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI * 2); ctx.fill();
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); window.removeEventListener("touchend", onUp); };
  }, [highScore, loadHole, onSaveScore, playFx]);

  return (
    <HiFiGameShell title="Cyber Mini-Golf" badge="v2.0 UPDATED" onBack={onBack} score={hud.score} highScore={highScore} onReset={() => loadHole(1, 0)} controlsHint="Drag back anywhere from the ball & release to putt past bumpers into the dark cup!" extraHeader={<span className="text-xs font-bold text-emerald-300">Hole {hud.hole} • Strokes {hud.strokes}</span>}>
      <div className="relative w-full max-w-[440px] aspect-[420/300] rounded-3xl overflow-hidden border-2 border-emerald-400/35 shadow-2xl">
        <canvas ref={canvasRef} width={420} height={300} className="w-full h-full block cursor-crosshair touch-none" />
      </div>
    </HiFiGameShell>
  );
};
GolfSynthGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   29. HELIX PILLAR DROP v2.0 (Rotating Ring Gap Fall)
   ═══════════════════════════════════════════════════════════════════════════ */
export const HelixBounceGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("helixbounce_highscore") || 0));
  const stateRef = useRef(null);
  const dirRef = useRef(0);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const startGame = useCallback(() => {
    const rings = Array.from({ length: 6 }, (_, i) => ({
      y: 120 + i * 75, gapStart: (i * 1.3) % (Math.PI * 2), hazardStart: (i * 1.3 + 2.4) % (Math.PI * 2), scored: false,
    }));
    stateRef.current = { W: 340, H: 400, rot: 0, ballY: 60, ballVy: 0, rings, score: 0 };
    setScore(0);
    setPhase("playing");
    playFx("whoosh");
  }, [playFx]);

  useEffect(() => {
    if (phase !== "playing") return;
    const keys = {};
    const kd = (e) => { keys[e.code] = true; };
    const ku = (e) => { keys[e.code] = false; };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let rafId;
    let prev = performance.now();

    const loop = (now) => {
      const dt = Math.min(0.035, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const s = stateRef.current;
      const turn = dirRef.current !== 0 ? dirRef.current : (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
      s.rot += turn * 3.6 * dt;
      s.ballVy += 520 * dt;
      s.ballY += s.ballVy * dt;

      if (s.ballY > 180) {
        const shift = s.ballY - 180;
        s.ballY = 180;
        for (const r of s.rings) r.y -= shift;
      }

      const norm = (a) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const ballAng = norm(Math.PI / 2 - s.rot);

      for (const r of s.rings) {
        if (s.ballVy > 0 && Math.abs(s.ballY - (r.y - 8)) < 9) {
          const gDist = Math.abs(Math.atan2(Math.sin(ballAng - r.gapStart), Math.cos(ballAng - r.gapStart)));
          const hDist = Math.abs(Math.atan2(Math.sin(ballAng - r.hazardStart), Math.cos(ballAng - r.hazardStart)));
          if (gDist < 0.62) {
            if (!r.scored) { r.scored = true; s.score += 50; setScore(s.score); playFx("coin"); }
          } else if (hDist < 0.52) {
            playFx("boom");
            if (s.score > highScore) { setHighScore(s.score); localStorage.setItem("helixbounce_highscore", String(s.score)); onSaveScore?.("helixbounce", s.score); }
            setPhase("gameover");
            return;
          } else {
            s.ballVy = -265;
            playFx("boing");
          }
        }
        if (r.y < -30) {
          r.y += 450;
          r.gapStart = Math.random() * Math.PI * 2;
          r.hazardStart = (r.gapStart + 2.2) % (Math.PI * 2);
          r.scored = false;
        }
      }

      ctx.fillStyle = "#060b16";
      ctx.fillRect(0, 0, s.W, s.H);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(s.W / 2 - 14, 0, 28, s.H);
      for (const r of s.rings) {
        const gapScreenX = s.W / 2 + Math.cos(r.gapStart + s.rot) * 90;
        const hazScreenX = s.W / 2 + Math.cos(r.hazardStart + s.rot) * 90;
        ctx.fillStyle = "#34d399";
        ctx.fillRect(40, r.y, s.W - 80, 10);
        ctx.fillStyle = "#060b16";
        ctx.fillRect(gapScreenX - 24, r.y - 1, 48, 12);
        ctx.fillStyle = "#f43f5e";
        ctx.fillRect(hazScreenX - 18, r.y - 1, 36, 12);
      }
      ctx.fillStyle = "#fde047";
      ctx.beginPath(); ctx.arc(s.W / 2, s.ballY, 9, 0, Math.PI * 2); ctx.fill();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [highScore, onSaveScore, phase, playFx]);

  return (
    <HiFiGameShell title="Helix Pillar Drop" badge="v2.0 UPDATED" onBack={onBack} score={score} highScore={highScore} onReset={startGame} controlsHint="Rotate pillar with ← / → (or buttons) to drop through dark gaps while avoiding crimson hazard zones">
      <div className="relative w-full max-w-[350px] aspect-[340/400] rounded-3xl overflow-hidden border-2 border-emerald-400/35 shadow-2xl">
        <canvas ref={canvasRef} width={340} height={400} className="w-full h-full block" />
        {phase === "ready" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3"><h3 className="text-2xl font-black text-white">Helix Pillar Drop v2.0</h3><button type="button" onClick={startGame} className="px-7 py-3 rounded-2xl bg-emerald-400 text-black font-black text-sm cursor-pointer">Drop Orb</button></div>}
        {phase === "gameover" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3"><h3 className="text-2xl font-black text-rose-400">Hazard Shatter!</h3><p className="text-xs text-white/75">Score: {score}</p><button type="button" onClick={startGame} className="px-6 py-2.5 rounded-xl bg-emerald-400 text-black font-black text-sm cursor-pointer">Retry</button></div>}
      </div>
      <div className="grid grid-cols-2 gap-3 w-64 md:hidden">
        <button type="button" onPointerDown={() => { dirRef.current = -1; }} onPointerUp={() => { dirRef.current = 0; }} className="h-12 rounded-xl bg-white/10 font-black text-white touch-none">↺ Rotate L</button>
        <button type="button" onPointerDown={() => { dirRef.current = 1; }} onPointerUp={() => { dirRef.current = 0; }} className="h-12 rounded-xl bg-white/10 font-black text-white touch-none">Rotate R ↻</button>
      </div>
    </HiFiGameShell>
  );
};
HelixBounceGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   30. DRONE SWARM COMMANDER v2.0 (Boid Herding Core Capture)
   ═══════════════════════════════════════════════════════════════════════════ */
export const SwarmCommanderGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [hud, setHud] = useState({ score: 0, timeLeft: 45 });
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("swarmcommander_highscore") || 0));
  const stateRef = useRef(null);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const startGame = useCallback(() => {
    const drones = Array.from({ length: 10 }, (_, i) => ({
      x: 160 + i * 8, y: 180, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60,
    }));
    const cores = Array.from({ length: 4 }, () => ({ x: 40 + Math.random() * 340, y: 40 + Math.random() * 260 }));
    stateRef.current = { W: 420, H: 340, beacon: { x: 210, y: 170 }, drones, cores, score: 0, timeLeft: 45 };
    setHud({ score: 0, timeLeft: 45 });
    setPhase("playing");
    playFx("whoosh");
  }, [playFx]);

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const moveBeacon = (e) => {
      const rect = canvas.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      stateRef.current.beacon.x = (cx - rect.left) * (canvas.width / rect.width);
      stateRef.current.beacon.y = (cy - rect.top) * (canvas.height / rect.height);
    };
    canvas.addEventListener("mousemove", moveBeacon);
    canvas.addEventListener("touchmove", moveBeacon, { passive: true });
    canvas.addEventListener("touchstart", moveBeacon, { passive: true });

    let rafId;
    let prev = performance.now();
    let uiTimer = 0;
    const loop = (now) => {
      const dt = Math.min(0.035, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const s = stateRef.current;
      s.timeLeft = Math.max(0, s.timeLeft - dt);

      for (let i = 0; i < s.drones.length; i++) {
        const d = s.drones[i];
        d.vx += (s.beacon.x - d.x) * 1.9 * dt;
        d.vy += (s.beacon.y - d.y) * 1.9 * dt;
        // Separation from neighboring drones
        for (let j = 0; j < s.drones.length; j++) {
          if (i === j) continue;
          const dx = d.x - s.drones[j].x; const dy = d.y - s.drones[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0 && dist < 24) { d.vx += (dx / dist) * 160 * dt; d.vy += (dy / dist) * 160 * dt; }
        }
        d.vx *= 0.96; d.vy *= 0.96;
        d.x = Math.max(10, Math.min(s.W - 10, d.x + d.vx * dt));
        d.y = Math.max(10, Math.min(s.H - 10, d.y + d.vy * dt));

        for (let ci = s.cores.length - 1; ci >= 0; ci--) {
          if (Math.hypot(d.x - s.cores[ci].x, d.y - s.cores[ci].y) < 16) {
            s.score += 35;
            s.cores[ci] = { x: 35 + Math.random() * 350, y: 35 + Math.random() * 270 };
            playFx("coin");
          }
        }
      }

      if (s.timeLeft <= 0) {
        if (s.score > highScore) { setHighScore(s.score); localStorage.setItem("swarmcommander_highscore", String(s.score)); onSaveScore?.("swarmcommander", s.score); }
        playFx("win");
        setPhase("gameover");
        return;
      }

      uiTimer += dt;
      if (uiTimer >= 0.15) { uiTimer = 0; setHud({ score: s.score, timeLeft: Math.ceil(s.timeLeft) }); }

      ctx.fillStyle = "#050914";
      ctx.fillRect(0, 0, s.W, s.H);
      ctx.strokeStyle = "rgba(56,189,248,0.3)";
      ctx.beginPath(); ctx.arc(s.beacon.x, s.beacon.y, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#fbbf24";
      for (const c of s.cores) { ctx.beginPath(); ctx.arc(c.x, c.y, 8, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#34d399";
      for (const d of s.drones) { ctx.beginPath(); ctx.arc(d.x, d.y, 5, 0, Math.PI * 2); ctx.fill(); }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafId); };
  }, [highScore, onSaveScore, phase, playFx]);

  return (
    <HiFiGameShell title="Drone Swarm Commander" badge="v2.0 UPDATED" onBack={onBack} score={hud.score} highScore={highScore} onReset={startGame} controlsHint="Move cursor or drag finger to guide your 10-drone flocking swarm into golden energy cores!" extraHeader={<span className="text-xs font-bold text-emerald-300">{hud.timeLeft}s</span>}>
      <div className="relative w-full max-w-[440px] aspect-[420/340] rounded-3xl overflow-hidden border-2 border-cyan-400/35 shadow-2xl">
        <canvas ref={canvasRef} width={420} height={340} className="w-full h-full block touch-none cursor-none" />
        {phase === "ready" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3"><h3 className="text-2xl font-black text-white">Drone Swarm Commander v2.0</h3><button type="button" onClick={startGame} className="px-7 py-3 rounded-2xl bg-cyan-400 text-black font-black text-sm cursor-pointer">Command Swarm</button></div>}
        {phase === "gameover" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3"><h3 className="text-2xl font-black text-cyan-300">Sortie Complete!</h3><p className="text-xs text-white/75">Swarm Score: {hud.score}</p><button type="button" onClick={startGame} className="px-6 py-2.5 rounded-xl bg-cyan-400 text-black font-black text-sm cursor-pointer">Replay</button></div>}
      </div>
    </HiFiGameShell>
  );
};
SwarmCommanderGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

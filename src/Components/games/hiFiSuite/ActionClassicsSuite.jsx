import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { Play, RotateCcw } from "lucide-react";
import { soundEngine } from "../../../utils/soundEffects";
import HiFiGameShell from "./HiFiGameShell";

/* ═══════════════════════════════════════════════════════════════════════════
   1. HYPER PHOTON PONG v2.0 (Spin Physics, Rally Multiplier, 2P & AI)
   ═══════════════════════════════════════════════════════════════════════════ */
export const PhotonPongGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [mode, setMode] = useState("ai_club"); // ai_novice | ai_club | ai_gm | pvp
  const [phase, setPhase] = useState("ready");
  const [hud, setHud] = useState({ p1: 0, p2: 0, rally: 0, maxRally: 0 });
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("photonpong_highscore") || 0));

  const stateRef = useRef(null);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const resetRound = useCallback((serveDir = 1) => {
    const W = 520;
    const H = 320;
    if (!stateRef.current) {
      stateRef.current = {
        W, H, p1Y: H / 2, p2Y: H / 2, p1Vy: 0, p2Vy: 0,
        ball: { x: W / 2, y: H / 2, vx: 265 * serveDir, vy: (Math.random() - 0.5) * 140 },
        trail: [], sparks: [], p1: 0, p2: 0, rally: 0, maxRally: 0,
      };
    } else {
      const s = stateRef.current;
      s.ball = { x: W / 2, y: H / 2, vx: 265 * serveDir, vy: (Math.random() - 0.5) * 150 };
      s.rally = 0;
      s.trail = [];
    }
  }, []);

  const startGame = useCallback(() => {
    stateRef.current = null;
    resetRound(1);
    setHud({ p1: 0, p2: 0, rally: 0, maxRally: 0 });
    setPhase("playing");
    playFx("whoosh");
  }, [playFx, resetRound]);

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const keys = {};
    let pointerY = null;

    const onKeyDown = (e) => { keys[e.code] = true; };
    const onKeyUp = (e) => { keys[e.code] = false; };
    const onPointer = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      pointerY = (clientY - rect.top) * (canvas.height / rect.height);
    };
    const clearPointer = () => { pointerY = null; };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", (e) => { if (e.buttons === 1) onPointer(e); });
    canvas.addEventListener("mousedown", onPointer);
    window.addEventListener("mouseup", clearPointer);
    canvas.addEventListener("touchstart", onPointer, { passive: true });
    canvas.addEventListener("touchmove", onPointer, { passive: true });

    let rafId;
    let prev = performance.now();

    const loop = (now) => {
      const dt = Math.min(0.04, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const s = stateRef.current;
      const padH = 66;
      const padSpd = 340;

      // P1 controls (W/S, Up/Down in AI mode, or drag)
      const oldP1 = s.p1Y;
      if (pointerY !== null) {
        s.p1Y += (pointerY - s.p1Y) * Math.min(1, dt * 16);
      } else {
        const up = keys.KeyW || (mode !== "pvp" && keys.ArrowUp);
        const dn = keys.KeyS || (mode !== "pvp" && keys.ArrowDown);
        if (up) s.p1Y -= padSpd * dt;
        if (dn) s.p1Y += padSpd * dt;
      }
      s.p1Y = Math.max(padH / 2, Math.min(s.H - padH / 2, s.p1Y));
      s.p1Vy = (s.p1Y - oldP1) / dt;

      // P2 / AI control
      const oldP2 = s.p2Y;
      if (mode === "pvp") {
        if (keys.ArrowUp) s.p2Y -= padSpd * dt;
        if (keys.ArrowDown) s.p2Y += padSpd * dt;
      } else {
        const aiSpd = mode === "ai_novice" ? 195 : mode === "ai_gm" ? 360 : 270;
        const target = s.ball.vx > 0 ? s.ball.y : s.H / 2;
        const diff = target - s.p2Y;
        s.p2Y += Math.sign(diff) * Math.min(Math.abs(diff), aiSpd * dt);
      }
      s.p2Y = Math.max(padH / 2, Math.min(s.H - padH / 2, s.p2Y));
      s.p2Vy = (s.p2Y - oldP2) / dt;

      // Ball physics
      const b = s.ball;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      s.trail.push({ x: b.x, y: b.y, life: 0.25 });
      s.trail = s.trail.map((t) => ({ ...t, life: t.life - dt })).filter((t) => t.life > 0);

      if (b.y < 8) { b.y = 8; b.vy = Math.abs(b.vy); playFx("laser"); }
      if (b.y > s.H - 8) { b.y = s.H - 8; b.vy = -Math.abs(b.vy); playFx("laser"); }

      const hitPaddle = (px, py, pvy, dir) => {
        if (Math.abs(b.x - px) < 13 && Math.abs(b.y - py) < padH / 2 + 8) {
          const offset = (b.y - py) / (padH / 2);
          const speed = Math.min(590, Math.hypot(b.vx, b.vy) * 1.06 + 10);
          const angle = offset * 0.85;
          b.vx = Math.cos(angle) * speed * dir;
          b.vy = Math.sin(angle) * speed + pvy * 0.12;
          b.x = px + dir * 14;
          s.rally += 1;
          if (s.rally > s.maxRally) s.maxRally = s.rally;
          for (let i = 0; i < 8; i++) {
            s.sparks.push({ x: b.x, y: b.y, vx: dir * (60 + Math.random() * 140), vy: (Math.random() - 0.5) * 180, life: 0.35 });
          }
          playFx("coin");
          setHud({ p1: s.p1, p2: s.p2, rally: s.rally, maxRally: s.maxRally });
        }
      };

      if (b.vx < 0) hitPaddle(24, s.p1Y, s.p1Vy, 1);
      if (b.vx > 0) hitPaddle(s.W - 24, s.p2Y, s.p2Vy, -1);

      // Score check
      if (b.x < -12 || b.x > s.W + 12) {
        if (b.x < -12) s.p2 += 1;
        else s.p1 += 1;
        playFx(b.x < -12 ? "boing" : "tada");
        setHud({ p1: s.p1, p2: s.p2, rally: 0, maxRally: s.maxRally });

        if (s.p1 >= 7 || s.p2 >= 7) {
          const totalScore = s.p1 * 120 + s.maxRally * 25;
          if (s.p1 >= 7 && totalScore > highScore) {
            setHighScore(totalScore);
            localStorage.setItem("photonpong_highscore", String(totalScore));
            onSaveScore?.("photonpong", totalScore);
          }
          setPhase("gameover");
          return;
        }
        resetRound(b.x < -12 ? 1 : -1);
      }

      s.sparks = s.sparks.map((sp) => ({ ...sp, x: sp.x + sp.vx * dt, y: sp.y + sp.vy * dt, life: sp.life - dt })).filter((sp) => sp.life > 0);

      // Render neon court
      ctx.fillStyle = "#060b16";
      ctx.fillRect(0, 0, s.W, s.H);
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = "rgba(56,189,248,0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.W / 2, 0);
      ctx.lineTo(s.W / 2, s.H);
      ctx.stroke();
      ctx.setLineDash([]);

      for (const tr of s.trail) {
        ctx.fillStyle = `rgba(34,211,238,${tr.life * 2.2})`;
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, 7 * (tr.life / 0.25), 0, Math.PI * 2);
        ctx.fill();
      }
      for (const sp of s.sparks) {
        ctx.fillStyle = `rgba(251,191,36,${sp.life * 2.6})`;
        ctx.fillRect(sp.x - 2, sp.y - 2, 4, 4);
      }

      ctx.shadowBlur = 14;
      ctx.shadowColor = "#34d399";
      ctx.fillStyle = "#34d399";
      ctx.fillRect(16, s.p1Y - padH / 2, 10, padH);

      ctx.shadowColor = "#f43f5e";
      ctx.fillStyle = "#fb7185";
      ctx.fillRect(s.W - 26, s.p2Y - padH / 2, 10, padH);

      ctx.shadowColor = "#fde047";
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mouseup", clearPointer);
    };
  }, [highScore, mode, onSaveScore, phase, playFx, resetRound]);

  return (
    <HiFiGameShell
      title="Hyper Photon Pong"
      badge="v2.0 UPDATED"
      badgeTone="bg-cyan-500/20 border-cyan-400/50 text-cyan-200"
      onBack={onBack}
      score={hud.p1 * 120 + hud.maxRally * 25}
      highScore={highScore}
      isPaused={phase === "paused"}
      onTogglePause={phase === "playing" || phase === "paused" ? () => setPhase((p) => (p === "playing" ? "paused" : "playing")) : undefined}
      onReset={startGame}
      controlsHint={mode === "pvp" ? "P1: W/S • P2: ↑/↓ • First to 7 wins" : "Drag court or press W/S / ↑/↓ • First to 7 wins"}
      extraHeader={
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          {[
            { id: "ai_novice", l: "Easy AI" },
            { id: "ai_club", l: "Pro AI" },
            { id: "ai_gm", l: "Turbo AI" },
            { id: "pvp", l: "2P Local" },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { setMode(m.id); setPhase("ready"); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${mode === m.id ? "bg-cyan-400 text-black" : "text-white/70"}`}
            >
              {m.l}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex items-center justify-center gap-8 text-center">
        <div>
          <div className="text-xs font-bold text-emerald-300">YOU</div>
          <div className="text-3xl font-black text-white tabular-nums">{hud.p1}</div>
        </div>
        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-amber-300">
          Rally {hud.rally}×
        </div>
        <div>
          <div className="text-xs font-bold text-rose-300">{mode === "pvp" ? "P2" : "CPU"}</div>
          <div className="text-3xl font-black text-white tabular-nums">{hud.p2}</div>
        </div>
      </div>

      <div className="relative w-full max-w-[540px] aspect-[520/320] rounded-3xl overflow-hidden border-2 border-cyan-500/35 shadow-2xl">
        <canvas ref={canvasRef} width={520} height={320} className="w-full h-full block touch-none" />
        {phase === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3 p-4 text-center">
            <h3 className="text-2xl font-black text-white">Hyper Photon Pong v2.0</h3>
            <p className="text-xs text-white/70 max-w-sm">Spin-curve photon strikes, escalating rally speeds, and local 2P duel support.</p>
            <button type="button" onClick={startGame} className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-sm cursor-pointer">
              <Play className="h-4 w-4 fill-current" /> Start Match
            </button>
          </div>
        )}
        {phase === "paused" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3">
            <h3 className="text-xl font-black text-white">Paused</h3>
            <button type="button" onClick={() => setPhase("playing")} className="px-6 py-2.5 rounded-xl bg-cyan-400 text-black font-black text-sm cursor-pointer">
              Resume
            </button>
          </div>
        )}
        {phase === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3">
            <h3 className="text-2xl font-black text-white">{hud.p1 >= 7 ? "🏆 Victory!" : "💥 Match Lost"}</h3>
            <p className="text-xs text-white/75">Max Rally: {hud.maxRally}× • Score: {hud.p1 * 120 + hud.maxRally * 25}</p>
            <button type="button" onClick={startGame} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-400 text-black font-black text-sm cursor-pointer">
              <RotateCcw className="h-4 w-4" /> Rematch
            </button>
          </div>
        )}
      </div>
    </HiFiGameShell>
  );
};
PhotonPongGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   2. PRISM BREAKOUT v2.0 (Multiball, Wide Paddle, Laser Drops & Stages)
   ═══════════════════════════════════════════════════════════════════════════ */
export const PrismBreakoutGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [hud, setHud] = useState({ score: 0, lives: 3, level: 1 });
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("prismbreakout_highscore") || 0));
  const stateRef = useRef(null);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const buildLevel = useCallback((levelNum, prevScore = 0, prevLives = 3) => {
    const W = 440;
    const H = 400;
    const cols = 8;
    const rows = Math.min(7, 4 + levelNum);
    const bricks = [];
    const hues = ["#f43f5e", "#f59e0b", "#10b981", "#22d3ee", "#a855f7", "#ec4899", "#eab308"];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: 24 + c * 50,
          y: 42 + r * 22,
          w: 44,
          h: 15,
          hp: r === 0 && levelNum > 1 ? 2 : 1,
          color: hues[(r + levelNum) % hues.length],
        });
      }
    }
    stateRef.current = {
      W, H, paddleX: W / 2, paddleW: 84, wideTimer: 0,
      balls: [{ x: W / 2, y: H - 46, vx: 170 * (Math.random() < 0.5 ? 1 : -1), vy: -245 }],
      bricks, powerups: [], sparks: [],
      score: prevScore, lives: prevLives, level: levelNum,
    };
  }, []);

  const startGame = useCallback(() => {
    buildLevel(1, 0, 3);
    setHud({ score: 0, lives: 3, level: 1 });
    setPhase("playing");
    playFx("whoosh");
  }, [buildLevel, playFx]);

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const keys = {};
    let dragX = null;

    const onKeyDown = (e) => { keys[e.code] = true; };
    const onKeyUp = (e) => { keys[e.code] = false; };
    const updateX = (e) => {
      const rect = canvas.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      dragX = (cx - rect.left) * (canvas.width / rect.width);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", (e) => { if (e.buttons === 1) updateX(e); });
    canvas.addEventListener("touchmove", updateX, { passive: true });
    canvas.addEventListener("touchstart", updateX, { passive: true });

    let rafId;
    let prev = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.04, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const s = stateRef.current;
      if (s.wideTimer > 0) s.wideTimer = Math.max(0, s.wideTimer - dt);
      const pw = s.wideTimer > 0 ? 124 : s.paddleW;

      if (dragX !== null) s.paddleX += (dragX - s.paddleX) * Math.min(1, dt * 18);
      else {
        const dir = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
        s.paddleX += dir * 360 * dt;
      }
      s.paddleX = Math.max(pw / 2 + 6, Math.min(s.W - pw / 2 - 6, s.paddleX));

      for (let bi = s.balls.length - 1; bi >= 0; bi--) {
        const b = s.balls[bi];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < 8) { b.x = 8; b.vx = Math.abs(b.vx); playFx("laser"); }
        if (b.x > s.W - 8) { b.x = s.W - 8; b.vx = -Math.abs(b.vx); playFx("laser"); }
        if (b.y < 8) { b.y = 8; b.vy = Math.abs(b.vy); playFx("laser"); }

        if (b.vy > 0 && b.y >= s.H - 34 && b.y <= s.H - 18 && Math.abs(b.x - s.paddleX) <= pw / 2 + 8) {
          const offset = (b.x - s.paddleX) / (pw / 2);
          const spd = Math.min(430, Math.hypot(b.vx, b.vy) + 4);
          const ang = offset * 1.05;
          b.vx = Math.sin(ang) * spd;
          b.vy = -Math.cos(ang) * spd;
          b.y = s.H - 35;
          playFx("boing");
        }

        for (let k = s.bricks.length - 1; k >= 0; k--) {
          const br = s.bricks[k];
          if (b.x + 7 > br.x && b.x - 7 < br.x + br.w && b.y + 7 > br.y && b.y - 7 < br.y + br.h) {
            b.vy *= -1;
            br.hp -= 1;
            if (br.hp <= 0) {
              s.bricks.splice(k, 1);
              s.score += 25 * s.level;
              for (let sp = 0; sp < 6; sp++) {
                s.sparks.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, col: br.color, life: 0.35 });
              }
              if (Math.random() < 0.22) {
                s.powerups.push({ x: br.x + br.w / 2, y: br.y + 10, kind: Math.random() < 0.5 ? "multi" : "wide" });
              }
              playFx("coin");
            } else {
              playFx("laser");
            }
            setHud({ score: s.score, lives: s.lives, level: s.level });
            break;
          }
        }

        if (b.y > s.H + 14) {
          s.balls.splice(bi, 1);
        }
      }

      if (s.balls.length === 0) {
        s.lives -= 1;
        playFx("boom");
        setHud({ score: s.score, lives: s.lives, level: s.level });
        if (s.lives <= 0) {
          if (s.score > highScore) {
            setHighScore(s.score);
            localStorage.setItem("prismbreakout_highscore", String(s.score));
            onSaveScore?.("prismbreakout", s.score);
          }
          setPhase("gameover");
          return;
        }
        s.balls.push({ x: s.paddleX, y: s.H - 44, vx: 165, vy: -245 });
      }

      if (s.bricks.length === 0) {
        playFx("tada");
        buildLevel(s.level + 1, s.score + 200, s.lives);
        setHud({ score: stateRef.current.score, lives: stateRef.current.lives, level: stateRef.current.level });
      }

      for (let i = s.powerups.length - 1; i >= 0; i--) {
        const p = s.powerups[i];
        p.y += 120 * dt;
        if (Math.abs(p.y - (s.H - 26)) < 16 && Math.abs(p.x - s.paddleX) < pw / 2 + 12) {
          if (p.kind === "wide") s.wideTimer = 10;
          else if (s.balls.length < 4 && s.balls[0]) {
            s.balls.push({ x: s.balls[0].x, y: s.balls[0].y, vx: -s.balls[0].vx, vy: s.balls[0].vy });
          }
          s.score += 50;
          playFx("tada");
          s.powerups.splice(i, 1);
        } else if (p.y > s.H + 20) s.powerups.splice(i, 1);
      }

      s.sparks = s.sparks.map((sp) => ({ ...sp, x: sp.x + sp.vx * dt, y: sp.y + sp.vy * dt, life: sp.life - dt })).filter((sp) => sp.life > 0);

      ctx.fillStyle = "#080c17";
      ctx.fillRect(0, 0, s.W, s.H);
      for (const br of s.bricks) {
        ctx.fillStyle = br.color;
        ctx.fillRect(br.x, br.y, br.w, br.h);
        if (br.hp > 1) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.strokeRect(br.x + 1, br.y + 1, br.w - 2, br.h - 2);
        }
      }
      for (const p of s.powerups) {
        ctx.fillStyle = p.kind === "wide" ? "#34d399" : "#fbbf24";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.font = "900 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.kind === "wide" ? "W" : "2×", p.x, p.y + 4);
      }
      for (const sp of s.sparks) {
        ctx.globalAlpha = sp.life * 2.5;
        ctx.fillStyle = sp.col;
        ctx.fillRect(sp.x, sp.y, 4, 4);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = s.wideTimer > 0 ? "#34d399" : "#38bdf8";
      ctx.fillRect(s.paddleX - pw / 2, s.H - 28, pw, 12);
      ctx.fillStyle = "#fef08a";
      for (const b of s.balls) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [buildLevel, highScore, onSaveScore, phase, playFx]);

  return (
    <HiFiGameShell
      title="Prism Breakout"
      badge="v2.0 UPDATED"
      badgeTone="bg-fuchsia-500/20 border-fuchsia-400/50 text-fuchsia-200"
      onBack={onBack}
      score={hud.score}
      highScore={highScore}
      isPaused={phase === "paused"}
      onTogglePause={phase === "playing" || phase === "paused" ? () => setPhase((p) => (p === "playing" ? "paused" : "playing")) : undefined}
      onReset={startGame}
      controlsHint="Drag paddle or use ← / → keys • Catch W (Wide) & 2× (Multiball) drops!"
      extraHeader={
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="text-fuchsia-300">Stage {hud.level}</span>
          <span className="text-rose-400">{"❤️".repeat(Math.max(0, hud.lives))}</span>
        </div>
      }
    >
      <div className="relative w-full max-w-[460px] aspect-[440/400] rounded-3xl overflow-hidden border-2 border-fuchsia-500/35 shadow-2xl">
        <canvas ref={canvasRef} width={440} height={400} className="w-full h-full block touch-none" />
        {phase === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3 p-4 text-center">
            <h3 className="text-2xl font-black text-white">Prism Breakout v2.0</h3>
            <p className="text-xs text-white/70 max-w-sm">Shatter multi-armor prism waves, catch multiballs, and stack stage multipliers.</p>
            <button type="button" onClick={startGame} className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-fuchsia-500 hover:bg-fuchsia-400 text-black font-black text-sm cursor-pointer">
              <Play className="h-4 w-4 fill-current" /> Launch Orb
            </button>
          </div>
        )}
        {phase === "paused" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3">
            <h3 className="text-xl font-black text-white">Paused</h3>
            <button type="button" onClick={() => setPhase("playing")} className="px-6 py-2.5 rounded-xl bg-fuchsia-500 text-black font-black text-sm cursor-pointer">Resume</button>
          </div>
        )}
        {phase === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3">
            <h3 className="text-2xl font-black text-rose-400">Orb Lost!</h3>
            <p className="text-xs text-white/75">Final Score: {hud.score} (Stage {hud.level})</p>
            <button type="button" onClick={startGame} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-fuchsia-500 text-black font-black text-sm cursor-pointer">
              <RotateCcw className="h-4 w-4" /> Play Again
            </button>
          </div>
        )}
      </div>
    </HiFiGameShell>
  );
};
PrismBreakoutGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   3. VOIDBREAKER ASTEROIDS v2.0 (360° Thruster, Warp Blink & Splitting Rocks)
   ═══════════════════════════════════════════════════════════════════════════ */
export const AsteroidsNovaGame = ({ onBack, isMuted, onSaveScore }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("ready");
  const [hud, setHud] = useState({ score: 0, lives: 3, wave: 1 });
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("asteroidsnova_highscore") || 0));
  const stateRef = useRef(null);
  const vInputRef = useRef({ left: false, right: false, thrust: false, fire: false });
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const spawnRock = (x, y, radius) => {
    const ang = Math.random() * Math.PI * 2;
    const spd = (44 - radius) * 2.1 + 35;
    return { x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, radius };
  };

  const startGame = useCallback(() => {
    const W = 440;
    const H = 400;
    const rocks = [];
    for (let i = 0; i < 5; i++) {
      rocks.push(spawnRock((i * 110 + 40) % W, i % 2 === 0 ? 40 : H - 40, 28));
    }
    stateRef.current = {
      W, H, ship: { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, invuln: 2.0 },
      bullets: [], rocks, sparks: [], score: 0, lives: 3, wave: 1, cooldown: 0,
    };
    setHud({ score: 0, lives: 3, wave: 1 });
    setPhase("playing");
    playFx("whoosh");
  }, [playFx]);

  const triggerBlink = () => {
    const s = stateRef.current;
    if (!s || phase !== "playing") return;
    s.ship.x = 40 + Math.random() * (s.W - 80);
    s.ship.y = 40 + Math.random() * (s.H - 80);
    s.ship.vx *= 0.25;
    s.ship.vy *= 0.25;
    s.ship.invuln = Math.max(s.ship.invuln, 0.85);
    playFx("tada");
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const keys = {};
    const onKeyDown = (e) => {
      keys[e.code] = true;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") triggerBlink();
    };
    const onKeyUp = (e) => { keys[e.code] = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let rafId;
    let prev = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.04, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const s = stateRef.current;
      const sh = s.ship;
      if (sh.invuln > 0) sh.invuln = Math.max(0, sh.invuln - dt);
      if (s.cooldown > 0) s.cooldown = Math.max(0, s.cooldown - dt);

      const rotL = keys.ArrowLeft || keys.KeyA || vInputRef.current.left;
      const rotR = keys.ArrowRight || keys.KeyD || vInputRef.current.right;
      const thr = keys.ArrowUp || keys.KeyW || vInputRef.current.thrust;
      const fire = keys.Space || vInputRef.current.fire;

      if (rotL) sh.angle -= 4.2 * dt;
      if (rotR) sh.angle += 4.2 * dt;
      if (thr) {
        sh.vx += Math.cos(sh.angle) * 240 * dt;
        sh.vy += Math.sin(sh.angle) * 240 * dt;
      }
      sh.vx *= 0.992;
      sh.vy *= 0.992;
      sh.x = (sh.x + sh.vx * dt + s.W) % s.W;
      sh.y = (sh.y + sh.vy * dt + s.H) % s.H;

      if (fire && s.cooldown <= 0) {
        s.cooldown = 0.2;
        s.bullets.push({
          x: sh.x + Math.cos(sh.angle) * 14,
          y: sh.y + Math.sin(sh.angle) * 14,
          vx: Math.cos(sh.angle) * 390 + sh.vx * 0.2,
          vy: Math.sin(sh.angle) * 390 + sh.vy * 0.2,
          life: 1.05,
        });
        playFx("laser");
      }

      for (let i = s.bullets.length - 1; i >= 0; i--) {
        const b = s.bullets[i];
        b.life -= dt;
        if (b.life <= 0) { s.bullets.splice(i, 1); continue; }
        b.x = (b.x + b.vx * dt + s.W) % s.W;
        b.y = (b.y + b.vy * dt + s.H) % s.H;
      }

      for (let ri = s.rocks.length - 1; ri >= 0; ri--) {
        const r = s.rocks[ri];
        r.x = (r.x + r.vx * dt + s.W) % s.W;
        r.y = (r.y + r.vy * dt + s.H) % s.H;

        let destroyed = false;
        for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
          const b = s.bullets[bi];
          if (Math.hypot(b.x - r.x, b.y - r.y) < r.radius + 3) {
            s.bullets.splice(bi, 1);
            s.rocks.splice(ri, 1);
            s.score += r.radius > 20 ? 50 : r.radius > 12 ? 80 : 120;
            if (r.radius > 14) {
              s.rocks.push(spawnRock(r.x, r.y, r.radius * 0.56), spawnRock(r.x, r.y, r.radius * 0.56));
            }
            for (let k = 0; k < 6; k++) {
              s.sparks.push({ x: r.x, y: r.y, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.5) * 140, life: 0.4 });
            }
            playFx("coin");
            setHud({ score: s.score, lives: s.lives, wave: s.wave });
            destroyed = true;
            break;
          }
        }
        if (destroyed) continue;

        if (sh.invuln <= 0 && Math.hypot(sh.x - r.x, sh.y - r.y) < r.radius + 10) {
          s.lives -= 1;
          sh.x = s.W / 2; sh.y = s.H / 2; sh.vx = 0; sh.vy = 0; sh.invuln = 2.5;
          playFx("boom");
          setHud({ score: s.score, lives: s.lives, wave: s.wave });
          if (s.lives <= 0) {
            if (s.score > highScore) {
              setHighScore(s.score);
              localStorage.setItem("asteroidsnova_highscore", String(s.score));
              onSaveScore?.("asteroidsnova", s.score);
            }
            setPhase("gameover");
            return;
          }
        }
      }

      if (s.rocks.length === 0) {
        s.wave += 1;
        for (let i = 0; i < 4 + s.wave; i++) {
          s.rocks.push(spawnRock((i * 95) % s.W, i % 2 === 0 ? 25 : s.H - 25, 28));
        }
        playFx("tada");
        setHud({ score: s.score, lives: s.lives, wave: s.wave });
      }

      s.sparks = s.sparks.map((sp) => ({ ...sp, x: sp.x + sp.vx * dt, y: sp.y + sp.vy * dt, life: sp.life - dt })).filter((sp) => sp.life > 0);

      ctx.fillStyle = "#040711";
      ctx.fillRect(0, 0, s.W, s.H);
      ctx.strokeStyle = "#fb923c";
      ctx.lineWidth = 2;
      for (const r of s.rocks) {
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#fde047";
      for (const b of s.bullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const sp of s.sparks) {
        ctx.fillStyle = `rgba(251,146,60,${sp.life * 2.5})`;
        ctx.fillRect(sp.x, sp.y, 3, 3);
      }

      if (sh.invuln <= 0 || Math.floor(now * 0.02) % 2 === 0) {
        ctx.save();
        ctx.translate(sh.x, sh.y);
        ctx.rotate(sh.angle);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-10, 9);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-10, -9);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [highScore, onSaveScore, phase, playFx]);

  return (
    <HiFiGameShell
      title="Voidbreaker Asteroids"
      badge="v2.0 UPDATED"
      badgeTone="bg-orange-500/20 border-orange-400/50 text-orange-200"
      onBack={onBack}
      score={hud.score}
      highScore={highScore}
      isPaused={phase === "paused"}
      onTogglePause={phase === "playing" || phase === "paused" ? () => setPhase((p) => (p === "playing" ? "paused" : "playing")) : undefined}
      onReset={startGame}
      controlsHint="A/D or ◀/▶ Rotate • W/↑ Thrust • Space Fire • Shift Hyperspace Blink"
      extraHeader={<span className="text-xs font-bold text-rose-400">Wave {hud.wave} • {"🚀".repeat(Math.max(0, hud.lives))}</span>}
    >
      <div className="relative w-full max-w-[460px] aspect-[440/400] rounded-3xl overflow-hidden border-2 border-orange-500/35 shadow-2xl">
        <canvas ref={canvasRef} width={440} height={400} className="w-full h-full block touch-none" />
        {phase === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3 p-4 text-center">
            <h3 className="text-2xl font-black text-white">Voidbreaker Asteroids v2.0</h3>
            <p className="text-xs text-white/70 max-w-sm">360° vector thrust physics, splitting asteroids, and Shift hyperspace emergency warp.</p>
            <button type="button" onClick={startGame} className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-orange-400 hover:bg-orange-300 text-black font-black text-sm cursor-pointer">
              <Play className="h-4 w-4 fill-current" /> Launch Ship
            </button>
          </div>
        )}
        {phase === "paused" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3">
            <h3 className="text-xl font-black text-white">Paused</h3>
            <button type="button" onClick={() => setPhase("playing")} className="px-6 py-2.5 rounded-xl bg-orange-400 text-black font-black text-sm cursor-pointer">Resume</button>
          </div>
        )}
        {phase === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3">
            <h3 className="text-2xl font-black text-rose-400">Hull Destroyed!</h3>
            <p className="text-xs text-white/75">Final Score: {hud.score} (Wave {hud.wave})</p>
            <button type="button" onClick={startGame} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-400 text-black font-black text-sm cursor-pointer">
              <RotateCcw className="h-4 w-4" /> Redeploy
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 w-full max-w-[360px] md:hidden">
        <button type="button" onPointerDown={() => { vInputRef.current.left = true; }} onPointerUp={() => { vInputRef.current.left = false; }} onPointerLeave={() => { vInputRef.current.left = false; }} className="h-12 rounded-xl bg-white/10 active:bg-orange-500/40 font-black text-white touch-none">↺</button>
        <button type="button" onPointerDown={() => { vInputRef.current.thrust = true; }} onPointerUp={() => { vInputRef.current.thrust = false; }} onPointerLeave={() => { vInputRef.current.thrust = false; }} className="h-12 rounded-xl bg-white/10 active:bg-orange-500/40 font-black text-white touch-none">THRUST</button>
        <button type="button" onPointerDown={() => { vInputRef.current.fire = true; }} onPointerUp={() => { vInputRef.current.fire = false; }} onPointerLeave={() => { vInputRef.current.fire = false; }} className="h-12 rounded-xl bg-orange-500/30 active:bg-orange-500/60 font-black text-orange-200 touch-none">FIRE</button>
        <button type="button" onPointerDown={() => { vInputRef.current.right = true; }} onPointerUp={() => { vInputRef.current.right = false; }} onPointerLeave={() => { vInputRef.current.right = false; }} className="h-12 rounded-xl bg-white/10 active:bg-orange-500/40 font-black text-white touch-none">↻</button>
      </div>
    </HiFiGameShell>
  );
};
AsteroidsNovaGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

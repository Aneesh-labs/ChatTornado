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
  Award,
  Bot,
  Volume2,
  UserCheck,
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
  RUNNER_CHARACTERS,
  PRIZE_CATALOG,
  evaluateSurferRewards,
} from "./tornadoSurfersEngine";
import {
  loadArcadeAiProfile,
  saveArcadeAiProfile,
  saveBackendPersonaPreference,
  askPersonalizedCompanion,
  requestLiveVoiceToken,
  speakCompanionLine,
} from "../../Services/arcadeAiService";

const POWERUP_BARS = [
  { key: "feverTimer", label: "3X FEVER", max: 6.5, color: "bg-yellow-300", text: "text-yellow-200", Icon: Sparkles },
  { key: "hoverboardTimer", label: "BOARD", max: 18.0, color: "bg-emerald-400", text: "text-emerald-200", Icon: Shield },
  { key: "jetpackTimer", label: "JETPACK", max: 6.5, color: "bg-teal-300", text: "text-teal-200", Icon: Flame },
  { key: "sneakersTimer", label: "BOOTS", max: 8.5, color: "bg-lime-400", text: "text-lime-200", Icon: Wind },
  { key: "magnetTimer", label: "MAGNET", max: 9.0, color: "bg-rose-400", text: "text-rose-200", Icon: Magnet },
  { key: "multiplierTimer", label: "2X MULT", max: 10.0, color: "bg-amber-400", text: "text-amber-200", Icon: Zap },
];

const loadCareerStats = (best) => {
  try {
    const raw = localStorage.getItem("subwaysurfers_career_v1");
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      bestScore: Math.max(best, Number(parsed.bestScore || 0)),
      totalCoins: Number(parsed.totalCoins || 0),
      totalStunts: Number(parsed.totalStunts || 0),
    };
  } catch (_) {
    return { bestScore: best, totalCoins: 0, totalStunts: 0 };
  }
};

const TornadoSurfersGame = ({ onBack, isMuted = false, onSaveScore }) => {
  const stateRef = useRef(createInitialRunnerState());
  const savedThisRunRef = useRef(false);
  const hudAccumRef = useRef(0);
  const lastCoinAudioRef = useRef(0);
  const lastInteractionIdRef = useRef(null);

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

  const [careerStats, setCareerStats] = useState(() => loadCareerStats(highScore));
  const [aiProfile, setAiProfile] = useState(loadArcadeAiProfile);
  const [aiReply, setAiReply] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [newPrizeBanner, setNewPrizeBanner] = useState(null);
  const [liveStatus, setLiveStatus] = useState("");

  const rewards = evaluateSurferRewards(careerStats);
  const selectedCharId = rewards.unlockedCharacters.includes(aiProfile.selectedSurferId)
    ? aiProfile.selectedSurferId
    : "vanguard";
  const selectedChar =
    RUNNER_CHARACTERS.find((c) => c.id === selectedCharId) || RUNNER_CHARACTERS[0];

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
    feverTimer: 0,
    feverCharge: 0,
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
      feverTimer: s.feverTimer || 0,
      feverCharge: s.feverCharge || 0,
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

  const askCoach = useCallback(
    async (customPrompt, statsOverride = null) => {
      setAiLoading(true);
      const st = statsOverride || careerStats;
      const rew = evaluateSurferRewards(st);
      const unlockedNames = PRIZE_CATALOG.filter((p) => rew.unlockedPrizes.includes(p.id)).map(
        (p) => p.name
      );
      const res = await askPersonalizedCompanion({
        gameId: "subwaysurfers",
        prompt: customPrompt,
        playerContext: {
          callsign: aiProfile.callsign,
          playstyle: aiProfile.playstyle,
          character: selectedChar.name,
          prizes: unlockedNames,
          score: stateRef.current.score || st.bestScore,
        },
        previousInteractionId: lastInteractionIdRef.current,
      });
      if (res.interaction_id) lastInteractionIdRef.current = res.interaction_id;
      setAiReply(res.reply);
      setAiLoading(false);
      if (aiProfile.voiceEnabled && !isMutedRef.current) {
        speakCompanionLine(res.reply, true);
      }
    },
    [aiProfile, careerStats, selectedChar.name]
  );

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
      setCareerStats((prev) => {
        const prevRew = evaluateSurferRewards(prev);
        const next = {
          bestScore: Math.max(prev.bestScore, s.score),
          totalCoins: prev.totalCoins + s.coins,
          totalStunts: prev.totalStunts + s.stunts,
        };
        try {
          localStorage.setItem("subwaysurfers_career_v1", JSON.stringify(next));
        } catch (_) {}
        const nextRew = evaluateSurferRewards(next);
        const earnedPrize = nextRew.unlockedPrizes.find((id) => !prevRew.unlockedPrizes.includes(id));
        if (earnedPrize) {
          const prizeObj = PRIZE_CATALOG.find((p) => p.id === earnedPrize);
          if (prizeObj) setNewPrizeBanner(prizeObj.name);
        }
        return next;
      });
      syncHudFromEngine();
      askCoach(
        `Run ended with ${s.score} points, ${s.coins} coins, and ${s.stunts} stunts. Give one concise personalized tip.`
      );
    },
    [askCoach, playAudio, syncHudFromEngine]
  );

  const startNewRun = useCallback(() => {
    const fresh = createInitialRunnerState();
    fresh.phase = "playing";
    stateRef.current = fresh;
    savedThisRunRef.current = false;
    hudAccumRef.current = 0;
    setIsNewBest(false);
    setNewPrizeBanner(null);
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
      s.invulnTimer = Math.max(s.invulnTimer, 0.85);
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
      if (events.powerupPicked || events.shieldSaved || events.stunt || events.feverStarted) {
        playAudio("tada");
        syncHudFromEngine();
      }
      if (events.crashed) {
        handleCrashRecord(s);
        return;
      }

      hudAccumRef.current += dt;
      if (hudAccumRef.current >= 0.1) {
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
      } else if (e.key === "Enter") {
        if (s.phase === "ready" || s.phase === "gameover") {
          e.preventDefault();
          startNewRun();
        } else if (s.phase === "paused") {
          e.preventDefault();
          togglePause();
        }
      } else if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleMove, handleJump, handleSlide, handleBoard, startNewRun, togglePause]);

  // Auto-pause active runs if the user switches browser tabs
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && stateRef.current.phase === "playing") {
        stateRef.current.phase = "paused";
        syncHudFromEngine();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [syncHudFromEngine]);

  const activeBars = POWERUP_BARS.filter((b) => hud[b.key] > 0.05);

  return (
    <div className="fixed inset-0 z-50 w-screen h-[100dvh] bg-[#031712] overflow-hidden select-none">
      {/* Full-Screen 3D WebGL Canvas Layer */}
      <div className="absolute inset-0">
        <TornadoSurfers3DScene
          simRef={stateRef}
          characterId={selectedCharId}
          onStep={handleStep}
          onSwipeMove={handleMove}
          onSwipeJump={handleJump}
          onSwipeSlide={handleSlide}
          onDoubleTap={handleBoard}
        />
      </div>

      {/* Big & Clean Translucent Emerald Top HUD */}
      <div className="pointer-events-none absolute top-0 inset-x-0 z-10 p-3 sm:p-4 flex items-start justify-between gap-2">
        {/* Left: Exit + Pause */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Exit to Arcade"
            className="h-10 px-3.5 rounded-2xl bg-emerald-950/85 hover:bg-emerald-900/95 border border-emerald-400/35 text-emerald-100 flex items-center gap-1.5 text-sm font-bold shadow-lg transition-transform active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-emerald-300" />
            <span>Exit</span>
          </button>

          {(hud.phase === "playing" || hud.phase === "paused") && (
            <button
              type="button"
              onClick={togglePause}
              aria-label={hud.phase === "paused" ? "Resume run" : "Pause run"}
              className="h-10 w-10 rounded-2xl bg-emerald-950/85 hover:bg-emerald-900/95 border border-emerald-400/35 text-emerald-200 flex items-center justify-center shadow-lg transition-transform active:scale-95"
            >
              {hud.phase === "paused" ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* Center/Right: Big Legible Score + Coins + Stunts */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="px-4 py-1.5 rounded-2xl bg-emerald-950/85 border border-emerald-400/35 shadow-lg flex items-baseline gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              {hud.speedMult.toFixed(1)}x
            </span>
            <span className="text-2xl sm:text-3xl font-black tabular-nums text-white tracking-tight">
              {hud.score.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/85 border border-emerald-400/25">
              <Coins className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-extrabold tabular-nums text-amber-200">{hud.coins}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/85 border border-emerald-400/25">
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span className="text-sm font-extrabold tabular-nums text-emerald-200">{hud.stunts}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/85 border border-emerald-400/25">
              <Trophy className="w-4 h-4 text-yellow-300" />
              <span className="text-sm font-bold tabular-nums text-emerald-100">
                {highScore.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Active Powerup Bars + Enforcer Alert */}
      {hud.phase === "playing" && (
        <div className="pointer-events-none absolute top-20 sm:top-24 inset-x-3 sm:inset-x-4 z-10 flex items-start justify-between">
          <div className="flex flex-col gap-1.5 max-w-[175px]">
            {activeBars.map(({ key, label, max, color, text, Icon }) => {
              const ratio = Math.max(0.05, Math.min(1, hud[key] / max));
              return (
                <div
                  key={key}
                  className="px-3 py-2 rounded-xl bg-emerald-950/85 border border-emerald-400/30 shadow-md"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 text-xs font-extrabold ${text}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-white">
                      {hud[key].toFixed(1)}s
                    </span>
                  </div>
                  <div className="w-28 h-1.5 rounded-full bg-emerald-950 overflow-hidden">
                    <div
                      className={`h-full w-full rounded-full origin-left ${color} transition-transform duration-100 will-change-transform`}
                      style={{ transform: `scaleX(${ratio})` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {hud.chaserTimer > 0 && (
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-rose-950/90 border border-rose-400/60 text-rose-100 shadow-lg">
                <AlertTriangle className="w-4 h-4 text-rose-300" />
                <span className="text-xs sm:text-sm font-black tracking-wide">
                  CHASER LOCK • {hud.chaserTimer.toFixed(1)}s
                </span>
              </div>
            )}
            {hud.combo > 1 && (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-950/85 border border-emerald-400/40 text-xs sm:text-sm font-black text-lime-300">
                {hud.combo}x STREAK
              </div>
            )}
            {hud.feverTimer <= 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-950/85 border border-emerald-400/25 shadow-md">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-[11px] font-black tracking-wider text-yellow-200 uppercase">
                    Fever
                  </span>
                  <span className="text-[11px] font-bold tabular-nums text-yellow-100">
                    {Math.min(100, Math.round(hud.feverCharge || 0))}%
                  </span>
                </div>
                <div className="w-24 h-1.5 rounded-full bg-emerald-950 overflow-hidden">
                  <div
                    className="h-full w-full rounded-full origin-left bg-gradient-to-r from-emerald-400 to-yellow-300 transition-transform duration-100 will-change-transform"
                    style={{ transform: `scaleX(${Math.max(0.04, Math.min(1, (hud.feverCharge || 0) / 100))})` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact Web Action Dock */}
      {hud.phase === "playing" && (
        <div className="pointer-events-none absolute bottom-4 inset-x-4 z-10 flex flex-col items-center gap-2">
          <div className="w-full max-w-md grid grid-cols-5 gap-2 md:hidden">
            <button
              type="button"
              onClick={() => handleMove(-1)}
              aria-label="Move Left"
              className="pointer-events-auto h-11 rounded-2xl bg-emerald-950/85 hover:bg-emerald-900/95 border border-emerald-400/35 text-emerald-100 flex items-center justify-center transition-transform active:scale-95"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={handleJump}
              aria-label="Jump"
              className="pointer-events-auto h-11 rounded-2xl bg-emerald-950/85 hover:bg-emerald-900/95 border border-emerald-400/35 text-lime-200 flex items-center justify-center transition-transform active:scale-95"
            >
              <ChevronUp className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={handleBoard}
              aria-label="Activate Hoverboard Shield"
              className={`pointer-events-auto h-11 rounded-2xl border flex items-center justify-center gap-1.5 text-sm font-black transition-transform active:scale-95 ${
                hud.hoverboardTimer > 0
                  ? "bg-emerald-500/40 border-emerald-300 text-white"
                  : "bg-emerald-950/85 hover:bg-emerald-900/95 border-emerald-400/40 text-emerald-200"
              }`}
            >
              <Shield className="w-4 h-4" />
              <span className="tabular-nums">{hud.hoverboards}</span>
            </button>

            <button
              type="button"
              onClick={handleSlide}
              aria-label="Slide or Slam"
              className="pointer-events-auto h-11 rounded-2xl bg-emerald-950/85 hover:bg-emerald-900/95 border border-emerald-400/35 text-amber-200 flex items-center justify-center transition-transform active:scale-95"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={() => handleMove(1)}
              aria-label="Move Right"
              className="pointer-events-auto h-11 rounded-2xl bg-emerald-950/85 hover:bg-emerald-900/95 border border-emerald-400/35 text-emerald-100 flex items-center justify-center transition-transform active:scale-95"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleBoard}
              aria-label="Activate Hoverboard Shield"
              className={`pointer-events-auto h-9 px-3.5 rounded-full border flex items-center gap-1.5 text-xs font-black transition-transform active:scale-95 ${
                hud.hoverboardTimer > 0
                  ? "bg-emerald-500/40 border-emerald-300 text-white"
                  : "bg-emerald-950/85 hover:bg-emerald-900/95 border-emerald-400/35 text-emerald-200"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="tabular-nums">{hud.hoverboards}</span>
            </button>
            <div className="text-[11px] font-semibold tracking-wide text-emerald-200/80 bg-emerald-950/85 px-3.5 py-1.5 rounded-full border border-emerald-400/20">
              WASD / Arrow Keys • Space: Shield • Double-click / Drag track • P: Pause
            </div>
          </div>
        </div>
      )}

      {/* READY OVERLAY (Characters, Prize Vault & Personalized Gemini Coach) */}
      {hud.phase === "ready" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-emerald-950/50 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-emerald-400/35 bg-emerald-950/90 backdrop-blur-xl p-5 sm:p-7 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-300/35 text-xs font-extrabold text-emerald-200">
                <Zap className="w-4 h-4" />
                EMERALD 3D RUNNER
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-200">
                <Award className="w-4 h-4 text-amber-300" />
                {rewards.unlockedPrizes.length}/{PRIZE_CATALOG.length} Prizes • {careerStats.totalCoins} Career Coins
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left: Runner Character Picker + Prizes */}
              <div className="md:col-span-7 space-y-3">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    Tornado Surfers
                  </h2>
                  <p className="mt-1 text-xs text-emerald-100/80">
                    Choose your runner &amp; unlock Vault Prizes through coins, stunts, and distance.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {RUNNER_CHARACTERS.map((char) => {
                    const unlocked = rewards.unlockedCharacters.includes(char.id);
                    const active = selectedCharId === char.id;
                    return (
                      <button
                        key={char.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => {
                          const next = saveArcadeAiProfile({ selectedSurferId: char.id });
                          setAiProfile(next);
                        }}
                        className={`text-left p-2.5 rounded-2xl border text-xs transition-all ${
                          !unlocked
                            ? "border-emerald-400/15 bg-emerald-950/60 text-emerald-100/45 cursor-not-allowed"
                            : active
                            ? "border-lime-300 bg-emerald-900/85 text-white cursor-pointer"
                            : "border-emerald-400/25 bg-emerald-900/40 text-emerald-100 hover:border-emerald-300/50 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center justify-between font-extrabold">
                          <span>{char.name}</span>
                          {unlocked ? (active ? "ACTIVE" : "READY") : `${char.unlockCoins}c`}
                        </div>
                        <div className="text-[11px] opacity-75 mt-0.5">{char.role}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 rounded-2xl bg-emerald-900/40 border border-emerald-400/20">
                  <div className="text-xs font-extrabold text-amber-200 mb-1.5">Prize Vault</div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRIZE_CATALOG.map((pr) => {
                      const won = rewards.unlockedPrizes.includes(pr.id);
                      return (
                        <span
                          key={pr.id}
                          title={pr.desc}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                            won
                              ? "bg-amber-400/20 border-amber-300/50 text-amber-200"
                              : "bg-emerald-950/60 border-emerald-400/15 text-emerald-100/40"
                          }`}
                        >
                          {pr.badge} • {pr.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right: Personalized Gemini 3.8 Flash & Live Voice AI Coach */}
              <div className="md:col-span-5 flex flex-col justify-between p-4 rounded-2xl bg-emerald-900/45 border border-emerald-400/25 space-y-3">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-200">
                      <Bot className="w-4 h-4 text-lime-300" />
                      Personal AI Coach
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        const nextVoice = !aiProfile.voiceEnabled;
                        const next = saveArcadeAiProfile({ voiceEnabled: nextVoice });
                        setAiProfile(next);
                        if (nextVoice) {
                          const tok = await requestLiveVoiceToken("subwaysurfers");
                          setLiveStatus(tok.available ? "Gemini Live ready" : "Browser Voice active");
                        } else {
                          setLiveStatus("");
                        }
                      }}
                      className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                        aiProfile.voiceEnabled
                          ? "border-lime-300 text-lime-200 bg-emerald-800/70"
                          : "border-emerald-400/25 text-emerald-200/75"
                      }`}
                    >
                      <Volume2 className="w-3 h-3" />
                      {aiProfile.voiceEnabled ? "Voice ON" : "Voice"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <input
                      type="text"
                      value={aiProfile.callsign}
                      maxLength={18}
                      onChange={(e) => {
                        const next = saveArcadeAiProfile({ callsign: e.target.value });
                        setAiProfile(next);
                      }}
                      placeholder="Callsign"
                      aria-label="Player Callsign"
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-400/25 text-white text-xs"
                    />
                    <select
                      value={aiProfile.playstyle}
                      onChange={(e) => {
                        const next = saveArcadeAiProfile({ playstyle: e.target.value });
                        setAiProfile(next);
                      }}
                      aria-label="Playstyle"
                      className="px-2 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-400/25 text-emerald-100 text-xs"
                    >
                      <option value="Adaptive Strategist">Adaptive</option>
                      <option value="Speedrunner">Speedrunner</option>
                      <option value="Collector">Collector</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      saveBackendPersonaPreference(aiProfile);
                      askCoach(`Give ${aiProfile.callsign} a short personalized briefing for ${selectedChar.name}.`);
                    }}
                    className="w-full py-1.5 px-3 rounded-xl bg-emerald-800/70 hover:bg-emerald-700/80 border border-emerald-300/30 text-xs font-bold text-emerald-100 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    {aiLoading ? "Personalizing..." : "Sync Profile & Ask Gemini AI"}
                  </button>

                  {liveStatus && (
                    <div className="text-[11px] text-lime-200/80 font-mono">{liveStatus}</div>
                  )}

                  {aiReply && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/75 border border-emerald-400/20 text-xs text-emerald-100/90 leading-relaxed">
                      {aiReply}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={startNewRun}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-300 hover:brightness-105 text-emerald-950 font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-transform active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  START RUN AS {selectedChar.name.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAUSED OVERLAY */}
      {hud.phase === "paused" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-5 bg-emerald-950/60 backdrop-blur-md">
          <div className="w-full max-w-xs rounded-3xl border border-emerald-400/35 bg-emerald-950/80 backdrop-blur-xl p-6 text-center shadow-2xl">
            <h3 className="text-2xl font-black text-white">PAUSED</h3>
            <p className="text-sm text-emerald-200/80 mt-1">
              Score: {hud.score.toLocaleString()} • {hud.coins} Coins
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={togglePause}
                className="w-full py-3.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black text-base flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                RESUME
              </button>
              <button
                type="button"
                onClick={startNewRun}
                className="w-full py-3.5 rounded-2xl bg-emerald-900/70 hover:bg-emerald-800/80 border border-emerald-400/30 text-emerald-100 font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                RESTART
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAMEOVER OVERLAY */}
      {hud.phase === "gameover" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-5 bg-emerald-950/65 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-emerald-400/40 bg-emerald-950/85 backdrop-blur-xl p-6 text-center shadow-2xl">
            {isNewBest && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-lime-400/20 border border-lime-300/40 text-xs font-black text-lime-200 mb-2">
                <Trophy className="w-4 h-4" />
                NEW HIGH SCORE!
              </div>
            )}
            {newPrizeBanner && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/45 text-xs font-black text-amber-200 mb-2 ml-1">
                <Award className="w-4 h-4" />
                PRIZE UNLOCKED: {newPrizeBanner}
              </div>
            )}
            <h3 className="text-3xl font-black text-white">RUN ENDED</h3>
            {aiReply && (
              <p className="mt-2 p-2.5 rounded-xl bg-emerald-900/45 border border-emerald-400/20 text-xs text-emerald-100/90 leading-relaxed">
                {aiReply}
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-emerald-900/50 border border-emerald-400/25">
                <div className="text-xs font-semibold text-emerald-200/75">SCORE</div>
                <div className="text-xl font-black tabular-nums text-white mt-0.5">
                  {hud.score.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-900/50 border border-emerald-400/25">
                <div className="text-xs font-semibold text-emerald-200/75">BEST</div>
                <div className="text-xl font-black tabular-nums text-lime-300 mt-0.5">
                  {highScore.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-900/50 border border-emerald-400/25">
                <div className="text-xs font-semibold text-emerald-200/75">COINS</div>
                <div className="text-lg font-bold tabular-nums text-amber-300 mt-0.5">{hud.coins}</div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-900/50 border border-emerald-400/25">
                <div className="text-xs font-semibold text-emerald-200/75">STUNTS</div>
                <div className="text-lg font-bold tabular-nums text-emerald-300 mt-0.5">{hud.stunts}</div>
              </div>
            </div>

            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={startNewRun}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-300 hover:brightness-105 text-emerald-950 font-black text-base flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
              >
                <RotateCcw className="w-5 h-5" />
                RUN AGAIN
              </button>
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-4 rounded-2xl bg-emerald-900/70 hover:bg-emerald-800/80 border border-emerald-400/30 text-emerald-100 font-bold text-sm transition active:scale-95"
              >
                EXIT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

TornadoSurfersGame.propTypes = {
  onBack: PropTypes.func.isRequired,
  isMuted: PropTypes.bool,
  onSaveScore: PropTypes.func,
};

export default TornadoSurfersGame;

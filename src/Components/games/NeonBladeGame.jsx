import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Trophy,
  Sparkles,
  Zap,
  Clock,
  Flame,
  Crosshair,
  Lock,
  Check,
} from "lucide-react";
import { soundEngine } from "../../utils/soundEffects";
import NeonBlade3DScene from "./NeonBlade3DScene";
import {
  BLADE_SKINS,
  createInitialNeonBladeState,
  advanceToNextStage,
  throwNeonBlade,
  stepNeonBladeState,
} from "./neonBladeEngine";

function loadUnlockedSkins() {
  try {
    const raw = JSON.parse(localStorage.getItem("neonblade_unlocked_skins") || '["cyber"]');
    return Array.isArray(raw) && raw.length > 0 ? raw : ["cyber"];
  } catch {
    return ["cyber"];
  }
}

const NeonBladeGame = ({ onBack, isMuted = false, onSaveScore }) => {
  const [equippedSkin, setEquippedSkin] = useState(
    () => localStorage.getItem("neonblade_equipped_skin") || "cyber"
  );
  const [unlockedSkins, setUnlockedSkins] = useState(loadUnlockedSkins);
  const [orbBank, setOrbBank] = useState(() =>
    parseInt(localStorage.getItem("neonblade_orbs") || "0", 10)
  );
  const [highScore, setHighScore] = useState(() =>
    parseInt(localStorage.getItem("neonblade_highscore") || "0", 10)
  );
  const [showForge, setShowForge] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [showCrashModal, setShowCrashModal] = useState(false);

  const stateRef = useRef(null);
  if (stateRef.current === null) {
    stateRef.current = createInitialNeonBladeState(1, localStorage.getItem("neonblade_equipped_skin") || "cyber");
  }

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const onSaveScoreRef = useRef(onSaveScore);
  useEffect(() => {
    onSaveScoreRef.current = onSaveScore;
  }, [onSaveScore]);

  const highScoreRef = useRef(highScore);
  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  const orbBankRef = useRef(orbBank);
  useEffect(() => {
    orbBankRef.current = orbBank;
  }, [orbBank]);

  const savedThisRunRef = useRef(false);
  const crashTimeoutRef = useRef(null);

  const [hud, setHud] = useState(() => ({
    phase: "ready",
    level: 1,
    isBoss: false,
    bossName: "",
    score: 0,
    knivesLeft: 5,
    knivesTotal: 5,
    fever: 0,
    overdriveTimer: 0,
    chronoTimer: 0,
    grazes: 0,
    stageOrbsSliced: 0,
    maxStreak: 0,
  }));

  const syncHudFromEngine = useCallback(() => {
    const s = stateRef.current;
    setHud({
      phase: s.phase,
      level: s.level,
      isBoss: s.isBoss,
      bossName: s.bossName,
      score: s.score,
      knivesLeft: s.knivesLeft,
      knivesTotal: s.knivesTotal,
      fever: s.fever,
      overdriveTimer: s.overdriveTimer,
      chronoTimer: s.chronoTimer,
      grazes: s.grazes,
      stageOrbsSliced: s.stageOrbsSliced,
      maxStreak: s.maxStreak,
    });
  }, []);

  const playAudio = useCallback((type) => {
    if (!isMutedRef.current) {
      soundEngine.play(type);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (crashTimeoutRef.current) clearTimeout(crashTimeoutRef.current);
    };
  }, []);

  const startFreshRun = useCallback(() => {
    if (crashTimeoutRef.current) clearTimeout(crashTimeoutRef.current);
    const fresh = createInitialNeonBladeState(1, equippedSkin);
    fresh.phase = "playing";
    stateRef.current = fresh;
    savedThisRunRef.current = false;
    setIsNewBest(false);
    setShowCrashModal(false);
    setShowForge(false);
    syncHudFromEngine();
    playAudio("whoosh");
  }, [equippedSkin, playAudio, syncHudFromEngine]);

  const handleNextStage = useCallback(() => {
    advanceToNextStage(stateRef.current);
    stateRef.current.skin = equippedSkin;
    syncHudFromEngine();
    playAudio("whoosh");
  }, [equippedSkin, playAudio, syncHudFromEngine]);

  const handleThrow = useCallback(() => {
    if (showForge) return;
    const s = stateRef.current;
    if (s.phase === "ready") {
      startFreshRun();
      return;
    }
    if (s.phase === "levelclear") {
      handleNextStage();
      return;
    }
    if (s.phase !== "playing") return;

    const thrown = throwNeonBlade(s);
    if (thrown) {
      playAudio("laser");
      syncHudFromEngine();
    }
  }, [handleNextStage, playAudio, showForge, startFreshRun, syncHudFromEngine]);

  const handleStep = useCallback(
    (dt) => {
      const s = stateRef.current;
      const ev = stepNeonBladeState(s, dt);

      if (ev.orbSliced) {
        orbBankRef.current += 1;
        setOrbBank(orbBankRef.current);
        localStorage.setItem("neonblade_orbs", String(orbBankRef.current));
      }

      if (ev.chronoActivated || ev.overdriveTriggered || ev.orbSliced || ev.graze) {
        playAudio("tada");
        syncHudFromEngine();
      } else if (ev.hit) {
        playAudio("coin");
        syncHudFromEngine();
      }

      if (ev.stageCleared) {
        playAudio("win");
        syncHudFromEngine();
      }

      if (ev.readyForNext) {
        syncHudFromEngine();
      }

      if (ev.clash) {
        playAudio("boom");
        if (s.score > highScoreRef.current) {
          highScoreRef.current = s.score;
          setHighScore(s.score);
          setIsNewBest(true);
          localStorage.setItem("neonblade_highscore", String(s.score));
        }
        if (!savedThisRunRef.current && onSaveScoreRef.current && s.score > 0) {
          savedThisRunRef.current = true;
          onSaveScoreRef.current("neonblade", s.score);
        }
        syncHudFromEngine();
        if (crashTimeoutRef.current) clearTimeout(crashTimeoutRef.current);
        crashTimeoutRef.current = setTimeout(() => {
          setShowCrashModal(true);
        }, 420);
      }
    },
    [playAudio, syncHudFromEngine]
  );

  const handleSelectOrBuySkin = (skin) => {
    if (unlockedSkins.includes(skin.id)) {
      setEquippedSkin(skin.id);
      localStorage.setItem("neonblade_equipped_skin", skin.id);
      if (stateRef.current) stateRef.current.skin = skin.id;
      playAudio("coin");
      return;
    }
    if (orbBankRef.current >= skin.cost) {
      const nextOrbs = orbBankRef.current - skin.cost;
      orbBankRef.current = nextOrbs;
      setOrbBank(nextOrbs);
      localStorage.setItem("neonblade_orbs", String(nextOrbs));

      const nextUnlocked = [...unlockedSkins, skin.id];
      setUnlockedSkins(nextUnlocked);
      localStorage.setItem("neonblade_unlocked_skins", JSON.stringify(nextUnlocked));

      setEquippedSkin(skin.id);
      localStorage.setItem("neonblade_equipped_skin", skin.id);
      if (stateRef.current) stateRef.current.skin = skin.id;
      playAudio("tada");
    }
  };

  // Keyboard support (Space / ArrowUp / Enter)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === "Space" || e.key === "ArrowUp" || e.key === "Enter") {
        e.preventDefault();
        if (hud.phase === "gameover" && showCrashModal) {
          startFreshRun();
        } else {
          handleThrow();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleThrow, hud.phase, showCrashModal, startFreshRun]);

  const activeSkinSpec = BLADE_SKINS.find((sk) => sk.id === equippedSkin) || BLADE_SKINS[0];

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-2.5 select-none">
      {/* Compact Cyber Forge Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-slate-950/85 border border-rose-500/25 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-200 transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Arcade</span>
          </button>
          <div>
            <div className="text-xs font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-300 to-cyan-400 uppercase">
              Neon Blade 3D
            </div>
            <div className="text-[11px] font-medium text-slate-400 hidden sm:block">
              Stage {hud.level} {hud.isBoss ? `• BOSS: ${hud.bossName}` : "• Cyber Forge"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="px-2.5 py-1 rounded-xl bg-slate-900/90 border border-rose-500/30 text-xs font-black text-rose-300">
            LVL {hud.level}
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-amber-400/25">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold tabular-nums text-amber-300">{orbBank}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-cyan-400/30">
            <span className="text-xs font-black tabular-nums text-white">
              {hud.score.toLocaleString()}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-white/10">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-bold tabular-nums text-slate-300">
              {Math.max(highScore, hud.score).toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowForge((f) => !f)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-fuchsia-500/35 text-xs font-bold text-fuchsia-300 transition active:scale-95"
          >
            Forge
          </button>
        </div>
      </div>

      {/* Full-Bleed 3D WebGL Viewport */}
      <div className="relative w-full h-[61dvh] sm:h-[66dvh] min-h-[380px] max-h-[700px] rounded-2xl overflow-hidden border border-rose-500/30 bg-[#040712] shadow-[0_0_50px_-12px_rgba(244,63,94,0.3)]">
        <NeonBlade3DScene simRef={stateRef} onStep={handleStep} onThrow={handleThrow} />

        {/* Left Edge: Remaining Blades Rack */}
        {hud.phase === "playing" && (
          <div className="pointer-events-none absolute left-3 bottom-4 flex flex-col-reverse gap-1.5">
            {Array.from({ length: hud.knivesTotal }).map((_, idx) => {
              const available = idx < hud.knivesLeft;
              return (
                <div
                  key={idx}
                  className={`w-7 h-2 rounded-full transition-all duration-150 ${
                    available
                      ? "bg-gradient-to-r from-cyan-400 to-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                      : "bg-slate-800/70 w-4 opacity-40"
                  }`}
                />
              );
            })}
            <span className="text-[11px] font-black text-slate-300 mb-1">
              {hud.knivesLeft}/{hud.knivesTotal}
            </span>
          </div>
        )}

        {/* Top HUD: Fever / Overdrive + Chrono + Boss Alert */}
        {hud.phase === "playing" && (
          <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
            <div className="px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 backdrop-blur-sm min-w-[130px]">
              <div className="flex items-center justify-between gap-2 text-[11px] font-black mb-1">
                {hud.overdriveTimer > 0 ? (
                  <span className="inline-flex items-center gap-1 text-fuchsia-300 animate-pulse">
                    <Flame className="w-3.5 h-3.5 text-fuchsia-400" />
                    OVERDRIVE 2X ({hud.overdriveTimer.toFixed(1)}s)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-cyan-300">
                    <Zap className="w-3 h-3 text-cyan-400" />
                    FEVER {Math.round(hud.fever)}%
                  </span>
                )}
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${
                    hud.overdriveTimer > 0
                      ? "bg-gradient-to-r from-fuchsia-500 to-amber-400"
                      : "bg-gradient-to-r from-cyan-500 to-fuchsia-400"
                  }`}
                  style={{
                    width: `${
                      hud.overdriveTimer > 0 ? (hud.overdriveTimer / 6.0) * 100 : hud.fever
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              {hud.isBoss && (
                <div className="px-3 py-1 rounded-xl bg-amber-950/90 border border-amber-400/50 text-xs font-black text-amber-300 shadow-lg">
                  BOSS: {hud.bossName}
                </div>
              )}
              {hud.chronoTimer > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-950/90 border border-sky-400/50 text-xs font-black text-sky-300 animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  CHRONO SLOW {hud.chronoTimer.toFixed(1)}s
                </div>
              )}
            </div>
          </div>
        )}

        {/* READY / LEVEL CLEAR OVERLAY */}
        {(hud.phase === "ready" || hud.phase === "levelclear") && !showForge && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-rose-500/35 bg-slate-900/95 p-5 shadow-2xl text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-400/30 text-xs font-bold text-rose-300 mb-2">
                <Crosshair className="w-3.5 h-3.5" />
                {hud.phase === "levelclear" ? `CORE SHATTERED • STAGE ${hud.level} CLEAR` : "THREE.JS 3D EDITION"}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {hud.phase === "levelclear"
                  ? `Ready for Stage ${hud.level + 1}?`
                  : "Neon Blade 3D"}
              </h2>

              <p className="mt-1.5 text-xs sm:text-sm text-slate-300">
                {hud.phase === "levelclear"
                  ? `Orbs Sliced: ${hud.stageOrbsSliced} • Razor Grazes: ${hud.grazes} • Score: ${hud.score.toLocaleString()}`
                  : "Tap anywhere to launch 3D blades. Slice Gold Orbs (+25 & Forge currency), hit Chrono Crystals for slow-mo, and graze blades for 2X Overdrive!"}
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={hud.phase === "levelclear" ? handleNextStage : startFreshRun}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 via-amber-500 to-cyan-500 hover:brightness-110 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {hud.phase === "levelclear" ? `STAGE ${hud.level + 1}` : "LAUNCH BLADES"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForge(true)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-fuchsia-400/35 text-fuchsia-300 font-bold text-sm transition active:scale-95"
                >
                  Skins
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GAMEOVER OVERLAY (revealed cleanly after 3D ricochet) */}
        {hud.phase === "gameover" && showCrashModal && !showForge && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-950/78 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-2xl border border-rose-500/45 bg-slate-900/95 p-5 text-center shadow-2xl">
              {isNewBest && (
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-xs font-black text-amber-300 mb-2">
                  <Trophy className="w-3.5 h-3.5" />
                  NEW HIGH SCORE!
                </div>
              )}
              <h3 className="text-2xl font-black text-white">BLADES CLASHED!</h3>

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
                <div className="p-2.5 rounded-xl bg-slate-950/85 border border-rose-400/20">
                  <div className="text-[11px] font-semibold text-slate-400">STAGE REACHED</div>
                  <div className="text-base font-bold tabular-nums text-rose-300">Stage {hud.level}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/85 border border-fuchsia-400/20">
                  <div className="text-[11px] font-semibold text-slate-400">GRAZES / ORBS</div>
                  <div className="text-base font-bold tabular-nums text-fuchsia-300">
                    {hud.grazes} / {orbBank}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={startFreshRun}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-rose-500 hover:brightness-110 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  RETRY
                </button>
                <button
                  type="button"
                  onClick={() => setShowForge(true)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-fuchsia-400/35 text-fuchsia-300 font-bold text-sm transition active:scale-95"
                >
                  Forge
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BLADE FORGE SKIN SELECTOR MODAL */}
        {showForge && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md z-20">
            <div className="w-full max-w-md rounded-2xl border border-fuchsia-500/40 bg-slate-900 p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-black text-white">Cyber Blade Forge</h3>
                  <p className="text-xs text-slate-400">
                    Unlock 3D blades with Orbs • Bank:{" "}
                    <strong className="text-amber-300">{orbBank} Orbs</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForge(false)}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {BLADE_SKINS.map((sk) => {
                  const unlocked = unlockedSkins.includes(sk.id);
                  const equipped = equippedSkin === sk.id;
                  const canAfford = orbBank >= sk.cost;

                  return (
                    <button
                      key={sk.id}
                      type="button"
                      onClick={() => handleSelectOrBuySkin(sk)}
                      disabled={!unlocked && !canAfford}
                      className={`p-3 rounded-xl border text-left transition ${
                        equipped
                          ? "bg-slate-800/90 border-cyan-400 ring-1 ring-cyan-400/40"
                          : unlocked
                          ? "bg-slate-950/80 border-white/15 hover:border-white/30"
                          : canAfford
                          ? "bg-slate-950/80 border-amber-400/40 hover:border-amber-300"
                          : "bg-slate-950/50 border-white/5 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: sk.bladeHex }}
                        />
                        {equipped ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-cyan-300">
                            <Check className="w-3 h-3" /> EQUIPPED
                          </span>
                        ) : unlocked ? (
                          <span className="text-[11px] font-bold text-slate-300">EQUIP</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-300">
                            <Lock className="w-3 h-3" /> {sk.cost} Orbs
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-xs font-black text-white">{sk.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Ergonomic Mobile Trigger Bar */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          handleThrow();
        }}
        className="w-full h-12 sm:h-11 rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/50 to-slate-900 hover:brightness-110 border border-rose-500/35 flex items-center justify-center gap-2 text-xs sm:text-sm font-black tracking-wider text-white touch-manipulation transition active:scale-[0.98]"
      >
        <Crosshair className="w-4 h-4 text-rose-400" />
        <span>
          THROW {activeSkinSpec.name.toUpperCase()} • {hud.knivesLeft} LEFT
        </span>
      </button>
    </div>
  );
};

NeonBladeGame.propTypes = {
  onBack: PropTypes.func.isRequired,
  isMuted: PropTypes.bool,
  onSaveScore: PropTypes.func,
};

export default NeonBladeGame;

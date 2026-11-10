import React, { useState, useRef, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  Zap,
  Camera,
  Check,
  X,
  RotateCcw,
  Play,
  Pause,
  ArrowUpCircle,
  Trash2,
  FastForward,
  Trophy,
  Crosshair,
  Flame,
  Radio,
  HelpCircle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { soundEngine } from "../../../utils/soundEffects";
import {
  createInitialGrid,
  findPath,
  previewTowerPlacement,
} from "./pathfinding";
import {
  TURRET_CATALOG,
  ABILITY_CONFIG,
  createCombatState,
  placeTurret,
  upgradeTurret,
  salvageTurret,
  enqueueWave,
  triggerOrbitalAbility,
  stepCombat,
  getUpgradeOptions,
} from "./turretsAndCombat";
import VortexBastionScene from "./VortexBastionScene";
import { TurretEmblem } from "./TurretIcons";

const CAMERA_CYCLE = ["iso", "top", "hero"];
const TARGETING_CYCLE = ["first", "strongest", "close"];

const ROLE_TAGS = {
  pulse: "KINETIC DPS",
  cryo: "SLOW • REVEAL",
  tesla: "2.5× SHIELD",
  rail: "ARMOR PIERCE",
};

function getWaveThreatChips(nextWave) {
  const chips = [];
  if (nextWave % 5 === 0) chips.push({ label: "BOSS", cls: "bg-rose-500/30 text-rose-200 border-rose-400/60" });
  if (nextWave >= 2) chips.push({ label: "SHIELD", cls: "bg-sky-500/20 text-sky-200 border-sky-400/40" });
  if (nextWave >= 2) chips.push({ label: "TANK", cls: "bg-orange-500/20 text-orange-200 border-orange-400/40" });
  if (nextWave >= 3) chips.push({ label: "STEALTH", cls: "bg-purple-500/20 text-purple-200 border-purple-400/40" });
  if (nextWave >= 4) chips.push({ label: "MEDIC", cls: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40" });
  return chips;
}

const VortexBastionGame = ({ onBack, isMuted, onToggleMute, onSaveScore }) => {
  const simRef = useRef(createCombatState(createInitialGrid()));
  const savedScoreRef = useRef(false);

  const [selectedBuildType, setSelectedBuildType] = useState("pulse");
  const [showGuide, setShowGuide] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoWave, setAutoWave] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const victoryShownRef = useRef(false);
  const autoWaveDelayRef = useRef(0);
  const [activeAbilityMode, setActiveAbilityMode] = useState(null);
  const [previewCell, setPreviewCell] = useState(null);
  const [previewInfo, setPreviewInfo] = useState(null);
  const [selectedTowerId, setSelectedTowerId] = useState(null);
  const [selectedTowerSnapshot, setSelectedTowerSnapshot] = useState(null);
  const [activePath, setActivePath] = useState(() => findPath(createInitialGrid()) || []);
  const [cameraPreset, setCameraPreset] = useState("iso");
  const [highScore, setHighScore] = useState(() =>
    Number(localStorage.getItem("vortexbastion_highscore") || 0)
  );

  const [hud, setHud] = useState({
    credits: 340,
    coreHp: 20,
    maxCoreHp: 20,
    wave: 0,
    score: 0,
    kills: 0,
    reactions: 0,
    speedMult: 1,
    enemiesLeft: 0,
    ionCd: 0,
    empCd: 0,
    bossHp: 0,
    bossMaxHp: 0,
    bossShield: 0,
    bossMaxShield: 0,
    banner: null,
    gameOver: false,
  });

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const highScoreRef = useRef(highScore);
  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  const pausedOrModalRef = useRef(false);
  useEffect(() => {
    pausedOrModalRef.current = isPaused || showGuide || showVictoryModal;
  }, [isPaused, showGuide, showVictoryModal]);

  const autoWaveRef = useRef(autoWave);
  useEffect(() => {
    autoWaveRef.current = autoWave;
  }, [autoWave]);

  const lastSoundTimeRef = useRef(0);
  const playAudio = useCallback((type) => {
    if (isMutedRef.current) return;
    if (type === "coin" || type === "laser") {
      const now = performance.now();
      if (now - lastSoundTimeRef.current < 75) return;
      lastSoundTimeRef.current = now;
    }
    soundEngine.play(type);
  }, []);

  const syncHud = useCallback(
    (bumpGrid = false, nextSelectedId = selectedTowerId, nextPreviewCell = previewCell) => {
      const s = simRef.current;
      const boss = s.enemies.find((e) => e.kind === "boss" && !e.dead);
      setHud({
        credits: s.credits,
        coreHp: s.coreHp,
        maxCoreHp: s.maxCoreHp || 20,
        wave: s.wave,
        score: s.score,
        kills: s.kills,
        reactions: s.reactionsTriggered,
        speedMult: s.speedMult,
        enemiesLeft: s.enemies.length + s.spawnQueue.length,
        ionCd: s.abilities?.ionCooldown || 0,
        empCd: s.abilities?.empCooldown || 0,
        bossHp: boss ? Math.max(0, Math.round(boss.hp)) : 0,
        bossMaxHp: boss ? boss.maxHp : 0,
        bossShield: boss ? Math.max(0, Math.round(boss.shield)) : 0,
        bossMaxShield: boss ? boss.maxShield : 0,
        banner: s.lastBanner ? { ...s.lastBanner } : null,
        gameOver: s.gameOver,
      });
      if (bumpGrid) {
        setActivePath(findPath(s.grid) || []);
      }
      if (nextSelectedId) {
        const found = s.towers.find((t) => t.id === nextSelectedId);
        setSelectedTowerSnapshot(found ? { ...found, stats: { ...found.stats } } : null);
      } else {
        setSelectedTowerSnapshot(null);
      }
      if (nextPreviewCell) {
        setPreviewInfo(previewTowerPlacement(s.grid, nextPreviewCell, s.enemies));
      } else {
        setPreviewInfo(null);
      }
    },
    [selectedTowerId, previewCell]
  );

  const handleTileTap = useCallback(
    (cell) => {
      const s = simRef.current;
      if (activeAbilityMode) {
        const res = triggerOrbitalAbility(s, activeAbilityMode, cell);
        if (res.ok) {
          playAudio(activeAbilityMode === "ion" ? "boom" : "tada");
          setActiveAbilityMode(null);
          syncHud();
        }
        return;
      }
      const existing = s.towers.find((t) => t.col === cell.col && t.row === cell.row);
      if (existing) {
        playAudio("laser");
        const nextId = selectedTowerId === existing.id ? null : existing.id;
        setPreviewCell(null);
        setPreviewInfo(null);
        setSelectedTowerId(nextId);
        setSelectedTowerSnapshot(nextId ? { ...existing, stats: { ...existing.stats } } : null);
        return;
      }
      setSelectedTowerId(null);
      setSelectedTowerSnapshot(null);
      playAudio("laser");
      const sameCell = previewCell && previewCell.col === cell.col && previewCell.row === cell.row;
      const nextPreview = sameCell ? null : cell;
      setPreviewCell(nextPreview);
      setPreviewInfo(nextPreview ? previewTowerPlacement(s.grid, nextPreview, s.enemies) : null);
    },
    [activeAbilityMode, playAudio, selectedTowerId, previewCell, syncHud]
  );

  const handleConfirmBuild = useCallback(() => {
    if (!previewCell) return;
    const res = placeTurret(simRef.current, selectedBuildType, previewCell);
    if (res.ok) {
      playAudio("coin");
      setPreviewCell(null);
      setSelectedTowerId(res.tower.id);
      syncHud(true, res.tower.id, null);
    }
  }, [previewCell, selectedBuildType, playAudio, syncHud]);

  const handleUpgrade = useCallback(
    (branch = null) => {
      if (!selectedTowerId) return;
      const res = upgradeTurret(simRef.current, selectedTowerId, branch);
      if (res.ok) {
        playAudio("tada");
        syncHud(true, selectedTowerId, null);
      }
    },
    [selectedTowerId, playAudio, syncHud]
  );

  const handleSalvage = useCallback(() => {
    if (!selectedTowerId) return;
    const res = salvageTurret(simRef.current, selectedTowerId);
    if (res.ok) {
      playAudio("whoosh");
      setSelectedTowerId(null);
      syncHud(true, null, null);
    }
  }, [selectedTowerId, playAudio, syncHud]);

  const handleCycleTargeting = useCallback(() => {
    if (!selectedTowerId) return;
    const tower = simRef.current.towers.find((t) => t.id === selectedTowerId);
    if (!tower) return;
    const idx = TARGETING_CYCLE.indexOf(tower.targeting);
    tower.targeting = TARGETING_CYCLE[(idx + 1) % TARGETING_CYCLE.length];
    playAudio("laser");
    syncHud(false, selectedTowerId, previewCell);
  }, [selectedTowerId, previewCell, playAudio, syncHud]);

  const handleSendWave = useCallback(() => {
    if (enqueueWave(simRef.current)) {
      playAudio("whoosh");
      syncHud();
    }
  }, [playAudio, syncHud]);

  const handleToggleSpeed = useCallback(() => {
    const s = simRef.current;
    s.speedMult = s.speedMult === 1 ? 2 : s.speedMult === 2 ? 3 : 1;
    playAudio("laser");
    syncHud();
  }, [playAudio, syncHud]);

  const handleReset = useCallback(() => {
    playAudio("whoosh");
    simRef.current = createCombatState(createInitialGrid());
    savedScoreRef.current = false;
    victoryShownRef.current = false;
    autoWaveDelayRef.current = 0;
    setIsPaused(false);
    setShowVictoryModal(false);
    setActiveAbilityMode(null);
    setPreviewCell(null);
    setSelectedTowerId(null);
    syncHud(true, null, null);
  }, [playAudio, syncHud]);

  const hudSyncAccum = useRef(0);
  const handleTick = useCallback(
    (dt) => {
      const s = simRef.current;
      if (s.gameOver || pausedOrModalRef.current) return;

      if (autoWaveRef.current && s.wave > 0 && !s.waveActive && s.spawnQueue.length === 0 && s.enemies.length === 0) {
        autoWaveDelayRef.current += dt;
        if (autoWaveDelayRef.current >= 2.0) {
          autoWaveDelayRef.current = 0;
          enqueueWave(s);
          playAudio("whoosh");
          syncHud();
        }
      } else {
        autoWaveDelayRef.current = 0;
      }

      const ev = stepCombat(s, dt);

      if (ev.fired.has("tesla")) playAudio("laser");
      else if (ev.fired.has("rail")) playAudio("boing");
      if (ev.reaction || ev.waveCleared) playAudio("tada");
      if (ev.killCount > 0) playAudio("coin");
      if (ev.leaked) playAudio("boom");

      if (ev.waveCleared && s.wave === 10 && !victoryShownRef.current) {
        victoryShownRef.current = true;
        setShowVictoryModal(true);
        if (s.score > highScoreRef.current) {
          setHighScore(s.score);
          localStorage.setItem("vortexbastion_highscore", String(s.score));
        }
        if (onSaveScore && s.score > 0) {
          onSaveScore("vortexbastion", s.score);
        }
        syncHud();
        return;
      }

      if (s.gameOver) {
        if (s.score > highScoreRef.current) {
          setHighScore(s.score);
          localStorage.setItem("vortexbastion_highscore", String(s.score));
        }
        if (!savedScoreRef.current && onSaveScore && s.score > 0) {
          savedScoreRef.current = true;
          onSaveScore("vortexbastion", s.score);
        }
        syncHud();
        return;
      }

      hudSyncAccum.current += dt;
      if (hudSyncAccum.current >= 0.1) {
        hudSyncAccum.current = 0;
        syncHud();
      }
    },
    [playAudio, onSaveScore, syncHud]
  );

  const cycleCamera = () => {
    playAudio("laser");
    setCameraPreset((c) => CAMERA_CYCLE[(CAMERA_CYCLE.indexOf(c) + 1) % CAMERA_CYCLE.length]);
  };

  const selectedCatalog = TURRET_CATALOG[selectedBuildType];
  const upgradeOptions = selectedTowerSnapshot ? getUpgradeOptions(selectedTowerSnapshot) : [];
  const corePct = Math.round((hud.coreHp / Math.max(1, hud.maxCoreHp)) * 100);
  const pathDelta =
    previewInfo?.valid && previewInfo.path ? previewInfo.path.length - activePath.length : 0;
  const ionPct = Math.max(0, 100 - (hud.ionCd / ABILITY_CONFIG.ion.cooldown) * 100);
  const empPct = Math.max(0, 100 - (hud.empCd / ABILITY_CONFIG.emp.cooldown) * 100);
  const threatChips = getWaveThreatChips(hud.wave + 1);

  return (
    <div
      className={`w-full max-w-3xl mx-auto flex flex-col rounded-[28px] overflow-hidden border bg-[#050814] transition-all select-none ${
        corePct <= 25
          ? "border-rose-500/65 shadow-[0_0_60px_rgba(244,63,94,0.35)]"
          : "border-cyan-500/35 shadow-[0_0_60px_rgba(6,182,212,0.22)]"
      }`}
    >
      {/* ─── Integrated Top Sci-Fi Command Header ──────────────────── */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-gradient-to-r from-slate-950 via-[#091226] to-slate-950 border-b border-cyan-500/20">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Lobby"
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/15 border border-white/10 text-white cursor-pointer flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Core Integrity Bar + Energy Reactor */}
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-400/25 flex flex-col min-w-[66px]">
              <div className="flex items-center justify-between gap-1 text-[10px] font-black text-cyan-300">
                <span className="flex items-center gap-0.5"><Shield className="w-3 h-3" /> CORE</span>
                <span>{hud.coreHp}</span>
              </div>
              <div className="w-full h-1 mt-0.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    corePct > 50 ? "bg-cyan-400" : corePct > 25 ? "bg-amber-400" : "bg-rose-500 animate-pulse"
                  }`}
                  style={{ width: `${corePct}%` }}
                />
              </div>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center gap-1 text-amber-300 text-xs font-black">
              <Zap className="w-3.5 h-3.5 fill-current" /> {hud.credits}
            </div>
          </div>
        </div>

        {/* Right Telemetry + Quick Toggles */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="hidden sm:flex px-2.5 py-1 rounded-xl bg-fuchsia-500/15 border border-fuchsia-400/25 text-fuchsia-200 text-xs font-black">
            W{hud.wave} • {hud.score.toLocaleString()}
          </div>
          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            aria-label={isPaused ? "Resume" : "Pause"}
            className={`p-2 rounded-xl border cursor-pointer ${
              isPaused ? "bg-rose-500/25 border-rose-400 text-rose-200" : "bg-white/[0.06] border-white/10 text-white"
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleToggleSpeed}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black border flex items-center gap-1 cursor-pointer ${
              hud.speedMult > 1
                ? "bg-amber-400 text-slate-950 border-amber-300"
                : "bg-white/[0.06] border-white/10 text-white"
            }`}
          >
            <FastForward className="w-3.5 h-3.5" /> {hud.speedMult}×
          </button>
          <button
            type="button"
            onClick={cycleCamera}
            className="px-2 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/15 border border-white/10 text-[11px] font-bold text-cyan-200 flex items-center gap-1 uppercase cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{cameraPreset}</span>
          </button>
          {onToggleMute && (
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? "Unmute Audio" : "Mute Audio"}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/15 border border-white/10 text-white cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowGuide((g) => !g)}
            aria-label="Tactical Brief"
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/15 border border-white/10 text-cyan-200 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Edge-to-Edge 3D WebGL Battlefield ──────────────────────── */}
      <div className="relative w-full h-[60dvh] min-h-[395px] sm:h-[64dvh] max-h-[650px] bg-[#040712]">
        <VortexBastionScene
          simRef={simRef}
          activePath={activePath}
          previewCell={previewCell}
          previewValid={Boolean(previewInfo?.valid)}
          previewPath={previewInfo?.path || null}
          previewType={selectedBuildType}
          selectedTowerId={selectedTowerId}
          cameraPreset={cameraPreset}
          onTileTap={handleTileTap}
          onTick={handleTick}
        />

        {/* Top-Left Mobile Wave Telemetry & Next Threat Forecast */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
          <div className="px-2.5 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/15 text-[11px] font-black text-white flex items-center gap-2">
            <span className="text-cyan-300">WAVE {hud.wave}</span>
            <span className="text-white/30">|</span>
            <span className="text-amber-300">{hud.score.toLocaleString()} PTS</span>
          </div>
          {threatChips.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {threatChips.map((chip) => (
                <span
                  key={chip.label}
                  className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black tracking-wider ${chip.cls}`}
                >
                  W{hud.wave + 1}: {chip.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Top-Right Compact Controls: Auto-Wave & Send Wave CTA */}
        {!hud.gameOver && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAutoWave((a) => !a)}
              className={`px-2.5 py-2 rounded-xl text-[10px] font-black border backdrop-blur-md cursor-pointer transition-all ${
                autoWave
                  ? "bg-emerald-500/30 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  : "bg-slate-950/75 border-white/15 text-white/60 hover:text-white"
              }`}
            >
              AUTO
            </button>
            <button
              type="button"
              onClick={handleSendWave}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs shadow-[0_0_24px_rgba(6,182,212,0.5)] flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {hud.enemiesLeft > 0 ? `+25⚡ (${hud.enemiesLeft})` : `WAVE ${hud.wave + 1}`}
            </button>
          </div>
        )}

        {/* Centered Reaction / Wave Clear Toast */}
        <AnimatePresence>
          {hud.banner && !hud.gameOver && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-md border text-[11px] font-black shadow-2xl whitespace-nowrap pointer-events-none"
              style={{ color: hud.banner.color, borderColor: `${hud.banner.color}77` }}
            >
              {hud.banner.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dreadnought Boss Health Banner */}
        {hud.bossMaxHp > 0 && !hud.gameOver && (
          <div className="absolute top-14 left-3 right-3 p-2.5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-rose-500/50 shadow-2xl pointer-events-none">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-rose-300 mb-1">
              <span>⚠️ DREADNOUGHT BOSS</span>
              <span>
                {hud.bossShield > 0 ? `SHD ${hud.bossShield} • ` : ""}
                {hud.bossHp}/{hud.bossMaxHp}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-orange-400 transition-all"
                style={{ width: `${Math.round((hud.bossHp / Math.max(1, hud.bossMaxHp)) * 100)}%` }}
              />
            </div>
            {hud.bossMaxShield > 0 && hud.bossShield > 0 && (
              <div className="w-full h-1 mt-1 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all"
                  style={{ width: `${Math.round((hud.bossShield / Math.max(1, hud.bossMaxShield)) * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Orbital Strike Crosshair Mode Banner */}
        <AnimatePresence>
          {activeAbilityMode && !hud.gameOver && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 p-3 rounded-2xl bg-rose-950/92 backdrop-blur-md border border-rose-400/70 shadow-2xl"
            >
              <p className="text-xs font-black text-rose-100">
                {activeAbilityMode === "ion"
                  ? "🎯 TAP ARENA TILE TO CALL ORBITAL ION STRIKE"
                  : "⚡ TAP ARENA TILE TO DETONATE EMP PULSE"}
              </p>
              <button
                type="button"
                onClick={() => setActiveAbilityMode(null)}
                className="px-3 py-1.5 rounded-xl bg-white/15 text-xs font-bold text-white cursor-pointer"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Placement Preview Pill */}
        <AnimatePresence>
          {previewCell && !activeAbilityMode && !hud.gameOver && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-950/92 backdrop-blur-xl border border-cyan-400/45 shadow-2xl"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex-shrink-0">
                  <TurretEmblem type={selectedBuildType} className="w-7 h-7" />
                </div>
                <div className="min-w-0">
                  {previewInfo?.valid ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-cyan-300 truncate">{selectedCatalog.name}</p>
                        {pathDelta > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[9px] font-black">
                            +{pathDelta} DETOUR
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/65 truncate">{selectedCatalog.desc}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-black text-rose-400">Placement Blocked</p>
                      <p className="text-[11px] text-white/70">{previewInfo?.reason}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewCell(null)}
                  className="p-2.5 rounded-xl bg-white/10 text-gray-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={!previewInfo?.valid || hud.credits < selectedCatalog.cost}
                  onClick={handleConfirmBuild}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 disabled:from-white/10 disabled:to-white/10 disabled:text-white/40 text-slate-950 font-black text-xs flex items-center gap-1 shadow-lg cursor-pointer"
                >
                  <Check className="w-4 h-4" /> {selectedCatalog.cost}⚡
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Turret Upgrade / Salvage Inspector Drawer */}
        <AnimatePresence>
          {selectedTowerSnapshot && !previewCell && !activeAbilityMode && !hud.gameOver && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="absolute bottom-3 left-3 right-3 flex flex-col gap-2.5 p-3 rounded-2xl bg-slate-950/94 backdrop-blur-xl border border-white/20 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-xl bg-white/5 border border-white/10">
                    <TurretEmblem type={selectedTowerSnapshot.type} className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-black text-white">
                        {TURRET_CATALOG[selectedTowerSnapshot.type]?.name}
                      </p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map((lvl) => (
                          <span
                            key={lvl}
                            className={`w-2 h-2 rounded-full ${
                              lvl <= selectedTowerSnapshot.tier ? "bg-cyan-400" : "bg-white/20"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-white/65">
                      ATK <strong className="text-white">{selectedTowerSnapshot.stats.damage}</strong> • RNG{" "}
                      <strong className="text-white">{selectedTowerSnapshot.stats.range}</strong> • TOTAL DMG{" "}
                      <strong className="text-amber-300">{selectedTowerSnapshot.damageDealt || 0}</strong> • KILLS{" "}
                      <strong className="text-lime-300">{selectedTowerSnapshot.kills}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCycleTargeting}
                    className="px-2 py-1.5 rounded-xl bg-white/10 text-[10px] font-black text-cyan-200 uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <Crosshair className="w-3 h-3" /> {selectedTowerSnapshot.targeting}
                  </button>
                  <button
                    type="button"
                    onClick={handleSalvage}
                    className="px-2 py-1.5 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 text-[10px] font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> +{Math.round(selectedTowerSnapshot.totalInvested * 0.7)}⚡
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTowerId(null);
                      setSelectedTowerSnapshot(null);
                    }}
                    className="p-1 text-white/50 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {upgradeOptions.length > 0 && (
                <div className={`grid ${upgradeOptions.length === 2 ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
                  {upgradeOptions.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      disabled={hud.credits < opt.cost}
                      onClick={() => handleUpgrade(opt.branch)}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600/40 to-violet-600/35 hover:from-indigo-600/60 hover:to-violet-600/55 disabled:opacity-40 border border-indigo-400/45 text-left flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-white truncate flex items-center gap-1">
                          <ArrowUpCircle className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" /> {opt.label}
                        </p>
                        <p className="text-[10px] text-white/65 truncate">{opt.desc}</p>
                      </div>
                      <span className="text-xs font-black text-amber-300 flex-shrink-0">{opt.cost}⚡</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tactical Brief Overlay */}
        {showGuide && (
          <div className="absolute inset-0 bg-slate-950/94 backdrop-blur-md p-5 flex flex-col justify-between overflow-y-auto custom-scrollbar z-20">
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <h4 className="text-sm font-black tracking-wide text-cyan-300">TACTICAL COMMAND BRIEF</h4>
                <button type="button" onClick={() => setShowGuide(false)} className="p-1.5 rounded-xl bg-white/10 text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-xs text-white/80 leading-relaxed">
                <p><strong className="text-cyan-300">A* Labyrinth:</strong> Tap any tile to preview routes before spending. Two-finger pinch zooms; drag orbits the 3D fortress.</p>
                <p><strong className="text-amber-300">Elemental Synergies:</strong></p>
                <ul className="list-disc pl-4 space-y-1 text-white/75">
                  <li><strong>Cryo + Siege Mortar (Pulse T3-B):</strong> Triggers <strong>THERMAL SHATTER</strong> AoE blast + Armor Shred.</li>
                  <li><strong>Tesla + Rail Spire:</strong> Triggers <strong>OVERCHARGE</strong> bonus burst + Armor Shred.</li>
                </ul>
                <p><strong className="text-fuchsia-300">Counters:</strong> Tesla deals <strong>2.5×</strong> vs Energy Shields; Cryo & Rail Marker expose <strong>Stealth Cloakers</strong>; target Medics early.</p>
                <p><strong className="text-emerald-300">Economy:</strong> Earn <strong>+10% Interest</strong> per cleared wave (up to +60⚡) or call waves early for instant <strong>+25⚡</strong>.</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowGuide(false)} className="mt-4 w-full py-3 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs cursor-pointer">
              Resume Command
            </button>
          </div>
        )}

        {/* Wave 10 Sector Victory Overlay */}
        {showVictoryModal && !hud.gameOver && (
          <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center gap-3 z-20">
            <span className="text-4xl animate-bounce">🏆</span>
            <h3 className="text-2xl font-black text-emerald-300">SECTOR SECURED!</h3>
            <p className="text-xs text-white/75 max-w-xs">
              Wave 10 & Dreadnought fleets defeated with <strong>{hud.coreHp}</strong> Core HP! Score:{" "}
              <strong className="text-cyan-300">{hud.score.toLocaleString()}</strong>
            </p>
            <div className="flex items-center gap-2 mt-1">
              <button type="button" onClick={() => setShowVictoryModal(false)} className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-black text-xs cursor-pointer">
                Continue Endless
              </button>
              <button type="button" onClick={handleReset} className="px-4 py-2.5 rounded-2xl bg-white/10 text-white font-bold text-xs cursor-pointer">
                New Mission
              </button>
            </div>
          </div>
        )}

        {/* Battle Report Game Over Overlay */}
        {hud.gameOver && (
          <div className="absolute inset-0 bg-black/88 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center gap-3 z-20">
            <span className="text-4xl">💥</span>
            <h3 className="text-2xl font-black text-rose-400">BASTION BREACHED</h3>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs text-left">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-white/55">WAVES</p>
                <p className="text-base font-black text-white">{hud.wave}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-white/55">KILLS</p>
                <p className="text-base font-black text-lime-300">{hud.kills}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-white/55">SYNERGIES</p>
                <p className="text-base font-black text-fuchsia-300">{hud.reactions}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-white/55">SCORE</p>
                <p className="text-base font-black text-cyan-300">{hud.score.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
              <Trophy className="w-4 h-4" /> Personal Best: {Math.max(highScore, hud.score).toLocaleString()}
            </div>
            <button type="button" onClick={handleReset} className="mt-1 px-7 py-3 rounded-2xl bg-cyan-400 text-slate-950 font-black text-sm flex items-center gap-2 cursor-pointer active:scale-95">
              <RotateCcw className="w-4 h-4" /> Rebuild Defense
            </button>
          </div>
        )}
      </div>

      {/* ─── Integrated Bottom Tactical Command Deck ───────────────── */}
      <div className="p-3 bg-gradient-to-b from-[#070c1a] to-[#040710] border-t border-cyan-500/20 flex flex-col gap-2">
        {/* Orbital Capacitor Ability Row with Recharge Fill Bars */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={hud.ionCd > 0 || hud.gameOver}
            onClick={() => {
              playAudio("laser");
              setPreviewCell(null);
              setSelectedTowerId(null);
              setActiveAbilityMode((m) => (m === "ion" ? null : "ion"));
            }}
            className={`relative overflow-hidden px-3 py-2 rounded-xl border flex items-center justify-between text-xs font-black transition-all cursor-pointer ${
              activeAbilityMode === "ion"
                ? "border-rose-400 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.35)]"
                : hud.ionCd > 0
                ? "border-white/10 text-white/45"
                : "border-rose-400/45 text-rose-200 hover:border-rose-300"
            }`}
          >
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-rose-600/30 to-rose-400/20 transition-all duration-150 pointer-events-none"
              style={{ width: `${ionPct}%` }}
            />
            <span className="relative flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-400" /> ORBITAL ION
            </span>
            <span className="relative text-[11px]">{hud.ionCd > 0 ? `${Math.ceil(hud.ionCd)}s` : "READY"}</span>
          </button>

          <button
            type="button"
            disabled={hud.empCd > 0 || hud.gameOver}
            onClick={() => {
              playAudio("laser");
              setPreviewCell(null);
              setSelectedTowerId(null);
              setActiveAbilityMode((m) => (m === "emp" ? null : "emp"));
            }}
            className={`relative overflow-hidden px-3 py-2 rounded-xl border flex items-center justify-between text-xs font-black transition-all cursor-pointer ${
              activeAbilityMode === "emp"
                ? "border-amber-400 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.35)]"
                : hud.empCd > 0
                ? "border-white/10 text-white/45"
                : "border-amber-400/45 text-amber-200 hover:border-amber-300"
            }`}
          >
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500/30 to-yellow-400/20 transition-all duration-150 pointer-events-none"
              style={{ width: `${empPct}%` }}
            />
            <span className="relative flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-amber-300" /> EMP PULSE
            </span>
            <span className="relative text-[11px]">{hud.empCd > 0 ? `${Math.ceil(hud.empCd)}s` : "READY"}</span>
          </button>
        </div>

        {/* 4 Custom SVG Turret Cards */}
        <div className="grid grid-cols-4 gap-2">
          {Object.values(TURRET_CATALOG).map((t) => {
            const active = selectedBuildType === t.id;
            const affordable = hud.credits >= t.cost;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  playAudio("laser");
                  setSelectedBuildType(t.id);
                }}
                className={`relative p-2 rounded-2xl border flex flex-col items-center text-center transition-all cursor-pointer overflow-hidden ${
                  active
                    ? "bg-white/12 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.28)]"
                    : "bg-white/[0.03] border-white/10 hover:bg-white/[0.07]"
                } ${!affordable ? "opacity-50" : ""}`}
              >
                {active && (
                  <span
                    className="absolute top-0 inset-x-3 h-0.5 rounded-full"
                    style={{ backgroundColor: t.accent }}
                  />
                )}
                <TurretEmblem type={t.id} className="w-7 h-7 mb-1" />
                <span className="text-[11px] font-black text-white leading-tight">{t.short}</span>
                <span className="text-[8px] font-bold tracking-wider text-white/45 mt-0.5">
                  {ROLE_TAGS[t.id]}
                </span>
                <span className="text-[11px] font-black text-amber-300 mt-1">{t.cost}⚡</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

VortexBastionGame.propTypes = {
  onBack: PropTypes.func.isRequired,
  isMuted: PropTypes.bool,
  onToggleMute: PropTypes.func,
  onSaveScore: PropTypes.func,
};

export default VortexBastionGame;

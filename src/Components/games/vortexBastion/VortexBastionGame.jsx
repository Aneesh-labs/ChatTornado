import React, { useState, useRef, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import {
  ArrowLeft,
  Shield,
  Zap,
  Camera,
  Check,
  X,
  RotateCcw,
  Play,
  ArrowUpCircle,
  Trash2,
  FastForward,
  Trophy,
  Crosshair,
  Flame,
  Radio,
  HelpCircle,
} from "lucide-react";
import { soundEngine } from "../../../utils/soundEffects";
import {
  createInitialGrid,
  findPath,
  previewTowerPlacement,
} from "./pathfinding";
import {
  TURRET_CATALOG,
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

const CAMERA_CYCLE = ["iso", "top", "hero"];
const TARGETING_CYCLE = ["first", "strongest", "close"];

const VortexBastionGame = ({ onBack, isMuted, onSaveScore }) => {
  const simRef = useRef(createCombatState(createInitialGrid()));
  const savedScoreRef = useRef(false);

  const [selectedBuildType, setSelectedBuildType] = useState("pulse");
  const [showGuide, setShowGuide] = useState(false);
  const [activeAbilityMode, setActiveAbilityMode] = useState(null); // "ion" | "emp" | null
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

  const playAudio = useCallback((type) => {
    if (!isMutedRef.current) soundEngine.play(type);
  }, []);

  const syncHud = useCallback(
    (bumpGrid = false, nextSelectedId = selectedTowerId, nextPreviewCell = previewCell) => {
      const s = simRef.current;
      const boss = s.enemies.find((e) => e.kind === "boss" && !e.dead);
      setHud({
        credits: s.credits,
        coreHp: s.coreHp,
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
    setActiveAbilityMode(null);
    setPreviewCell(null);
    setSelectedTowerId(null);
    syncHud(true, null, null);
  }, [playAudio, syncHud]);

  const hudSyncAccum = useRef(0);
  const handleTick = useCallback(
    (dt) => {
      const s = simRef.current;
      if (s.gameOver) return;
      const ev = stepCombat(s, dt);

      if (ev.fired.has("tesla")) playAudio("laser");
      else if (ev.fired.has("rail")) playAudio("boing");
      if (ev.reaction || ev.waveCleared) playAudio("tada");
      if (ev.killCount > 0) playAudio("coin");
      if (ev.leaked) playAudio("boom");

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
      if (hudSyncAccum.current >= 0.12) {
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

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-2.5 pb-4 select-none">
      {/* Compact Top Telemetry Strip */}
      <div className="flex items-center justify-between gap-1.5 px-1 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Lobby
        </button>

        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="px-2.5 py-1 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center gap-1 text-cyan-300 text-xs font-black">
            <Shield className="w-3.5 h-3.5" /> {hud.coreHp}
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center gap-1 text-amber-300 text-xs font-black">
            <Zap className="w-3.5 h-3.5" /> {hud.credits}
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-fuchsia-500/15 border border-fuchsia-400/30 text-fuchsia-200 text-xs font-black">
            W{hud.wave} • {hud.score}
          </div>
          <button
            type="button"
            onClick={handleToggleSpeed}
            className={`px-2 py-1 rounded-xl text-xs font-black border flex items-center gap-1 cursor-pointer ${
              hud.speedMult > 1
                ? "bg-amber-400 text-slate-950 border-amber-300"
                : "bg-white/10 text-white border-white/10"
            }`}
          >
            <FastForward className="w-3.5 h-3.5" /> {hud.speedMult}×
          </button>
          <button
            type="button"
            onClick={cycleCamera}
            className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-cyan-200 flex items-center gap-1 uppercase cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" /> {cameraPreset}
          </button>
          <button
            type="button"
            onClick={() => setShowGuide((g) => !g)}
            title="Tactical Field Guide"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-200 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 3D Viewport (Phone-first Portrait Scale) */}
      <div className="relative w-full h-[58dvh] min-h-[390px] max-h-[620px] rounded-3xl overflow-hidden border-2 border-cyan-500/35 bg-[#040712] shadow-[0_0_50px_rgba(6,182,212,0.2)]">
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

        {/* Top-Left Live Reaction / Interest Banner */}
        {hud.banner && !hud.gameOver && (
          <div
            className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-slate-950/90 border text-[11px] font-black shadow-lg pointer-events-none"
            style={{ color: hud.banner.color, borderColor: `${hud.banner.color}66` }}
          >
            {hud.banner.text}
          </div>
        )}

        {/* Active Dreadnought Boss Health Bar */}
        {hud.bossMaxHp > 0 && !hud.gameOver && (
          <div className="absolute top-12 left-3 right-3 p-2 rounded-xl bg-slate-950/90 border border-rose-500/45 shadow-lg pointer-events-none">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-rose-300 mb-1">
              <span>Dreadnought Boss</span>
              <span>
                {hud.bossShield > 0 ? `SHD ${hud.bossShield} • ` : ""}
                HP {hud.bossHp}/{hud.bossMaxHp}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex flex-col gap-0.5">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-orange-400 transition-all"
                style={{ width: `${Math.round((hud.bossHp / Math.max(1, hud.bossMaxHp)) * 100)}%` }}
              />
            </div>
            {hud.bossMaxShield > 0 && hud.bossShield > 0 && (
              <div className="w-full h-1 mt-0.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all"
                  style={{ width: `${Math.round((hud.bossShield / Math.max(1, hud.bossMaxShield)) * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Orbital Strike Crosshair Mode Banner */}
        {activeAbilityMode && !hud.gameOver && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-rose-950/90 border border-rose-400 shadow-xl">
            <p className="text-xs font-black text-rose-200">
              {activeAbilityMode === "ion"
                ? "TAP ANY TILE FOR ORBITAL ION STRIKE!"
                : "TAP ANY TILE FOR EMP SHIELD PULSE!"}
            </p>
            <button
              type="button"
              onClick={() => setActiveAbilityMode(null)}
              className="px-2.5 py-1 rounded-lg bg-white/15 text-xs font-bold text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Top-Right Send Wave CTA Pill + Next Wave Threat Forecast */}
        {!hud.gameOver && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {(hud.wave + 1) % 5 === 0 && (
              <span className="px-2 py-1 rounded-lg bg-rose-500/25 border border-rose-400/50 text-rose-200 text-[10px] font-black animate-pulse">
                BOSS W{hud.wave + 1}
              </span>
            )}
            <button
              type="button"
              onClick={handleSendWave}
              className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs shadow-[0_0_20px_rgba(6,182,212,0.45)] flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {hud.enemiesLeft > 0 ? `+25⚡ Wave (${hud.enemiesLeft})` : `Wave ${hud.wave + 1}`}
            </button>
          </div>
        )}

        {/* Placement Preview Pill */}
        {previewCell && !hud.gameOver && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-cyan-400/40 shadow-xl">
            <div className="min-w-0">
              {previewInfo?.valid ? (
                <>
                  <p className="text-xs font-black text-cyan-300 truncate">
                    {selectedCatalog.name} • Route {previewInfo.path.length} steps
                  </p>
                  <p className="text-[11px] text-white/70 truncate">{selectedCatalog.desc}</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-black text-rose-400">Blocked</p>
                  <p className="text-[11px] text-white/70">{previewInfo?.reason}</p>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setPreviewCell(null)}
                className="p-2 rounded-xl bg-white/10 text-gray-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={!previewInfo?.valid || hud.credits < selectedCatalog.cost}
                onClick={handleConfirmBuild}
                className="px-3.5 py-2 rounded-xl bg-cyan-400 disabled:bg-white/10 disabled:text-white/40 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-4 h-4" /> {selectedCatalog.cost}⚡
              </button>
            </div>
          </div>
        )}

        {/* Selected Turret Upgrade / Salvage Inspector Drawer */}
        {selectedTowerSnapshot && !previewCell && !hud.gameOver && (
          <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2 p-3 rounded-2xl bg-slate-950/92 backdrop-blur-md border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black text-white">
                  {TURRET_CATALOG[selectedTowerSnapshot.type]?.name} (T{selectedTowerSnapshot.tier}
                  {selectedTowerSnapshot.branch ? `-${selectedTowerSnapshot.branch}` : ""})
                </p>
                <p className="text-[10px] text-white/60">
                  DMG {selectedTowerSnapshot.stats.damage} • RNG {selectedTowerSnapshot.stats.range} • Kills {selectedTowerSnapshot.kills}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCycleTargeting}
                  className="px-2 py-1 rounded-lg bg-white/10 text-[10px] font-bold text-cyan-200 uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Crosshair className="w-3 h-3" /> {selectedTowerSnapshot.targeting}
                </button>
                <button
                  type="button"
                  onClick={handleSalvage}
                  title="Salvage Turret (70% Refund)"
                  className="px-2 py-1 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
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
              <div className={`grid ${upgradeOptions.length === 2 ? "grid-cols-2" : "grid-cols-1"} gap-1.5`}>
                {upgradeOptions.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    disabled={hud.credits < opt.cost}
                    onClick={() => handleUpgrade(opt.branch)}
                    className="px-2.5 py-2 rounded-xl bg-indigo-600/35 hover:bg-indigo-600/55 disabled:opacity-40 border border-indigo-400/40 text-left flex items-center justify-between gap-2 cursor-pointer"
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
          </div>
        )}

        {/* Tactical Field Guide Overlay */}
        {showGuide && (
          <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-md p-4 flex flex-col justify-between overflow-y-auto custom-scrollbar z-20">
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h4 className="text-sm font-black text-cyan-300">TACTICAL COMMAND BRIEF</h4>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="p-1 rounded-lg bg-white/10 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1.5 text-[11px] text-white/80 leading-relaxed">
                <p><strong className="text-cyan-300">A* Maze Routing:</strong> Enemies take the shortest path dynamically. Sculpt choke-points & detours without completely sealing corridors.</p>
                <p><strong className="text-amber-300">Elemental Synergies:</strong></p>
                <ul className="list-disc pl-4 space-y-1 text-white/75">
                  <li><strong>Cryo + Siege Mortar (Pulse T3-B):</strong> Triggers <strong>THERMAL SHATTER</strong> AoE blast + shreds Armor!</li>
                  <li><strong>Tesla + Rail Spire:</strong> Triggers <strong>OVERCHARGE</strong> bonus burst + Armor Shred!</li>
                </ul>
                <p><strong className="text-fuchsia-300">Squad Counters:</strong> Tesla deals <strong>2.5×</strong> vs Energy Shields; Cryo & Rail Orbital Marker reveal <strong>Stealth Cloakers</strong>; focus Healers first.</p>
                <p><strong className="text-emerald-300">Economy:</strong> Earn <strong>+10% Interest</strong> (up to +60⚡) per cleared wave, or call waves early for instant <strong>+25⚡</strong>.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-3 w-full py-2.5 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              Return to Command
            </button>
          </div>
        )}

        {/* Game Over Battle Report Overlay */}
        {hud.gameOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center gap-3 z-20">
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
                <p className="text-base font-black text-cyan-300">{hud.score}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
              <Trophy className="w-4 h-4" /> Personal Best: {Math.max(highScore, hud.score)}
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="mt-1 px-7 py-3 rounded-2xl bg-cyan-400 text-slate-950 font-black text-sm flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4" /> Rebuild Defense
            </button>
          </div>
        )}
      </div>

      {/* Orbital Strikes + Bottom Phone-First Turret Selection Dock */}
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
          className={`px-3 py-2 rounded-2xl border flex items-center justify-between text-xs font-black transition-all cursor-pointer ${
            activeAbilityMode === "ion"
              ? "bg-rose-500/35 border-rose-400 text-rose-100"
              : hud.ionCd > 0
              ? "bg-white/5 border-white/10 text-white/40"
              : "bg-rose-500/15 hover:bg-rose-500/25 border-rose-400/40 text-rose-200"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-rose-400" /> ORBITAL ION
          </span>
          <span>{hud.ionCd > 0 ? `${Math.ceil(hud.ionCd)}s` : "READY"}</span>
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
          className={`px-3 py-2 rounded-2xl border flex items-center justify-between text-xs font-black transition-all cursor-pointer ${
            activeAbilityMode === "emp"
              ? "bg-amber-500/35 border-amber-400 text-amber-100"
              : hud.empCd > 0
              ? "bg-white/5 border-white/10 text-white/40"
              : "bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/40 text-amber-200"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-amber-300" /> EMP PULSE
          </span>
          <span>{hud.empCd > 0 ? `${Math.ceil(hud.empCd)}s` : "READY"}</span>
        </button>
      </div>

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
              className={`p-2 rounded-2xl border text-left transition-all cursor-pointer ${
                active
                  ? "bg-white/15 border-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.25)]"
                  : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08]"
              } ${!affordable ? "opacity-55" : ""}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-black text-white">{t.short}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: t.accent }}
                />
              </div>
              <p className="text-[11px] font-bold text-amber-300 mt-0.5">{t.cost}⚡</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

VortexBastionGame.propTypes = {
  onBack: PropTypes.func.isRequired,
  isMuted: PropTypes.bool,
  onSaveScore: PropTypes.func,
};

export default VortexBastionGame;

import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import "./ui/design-tokens.css";
import "./ui/typography.css";
import { afterspaceSound } from "./soundscape";
import AfterspaceWorld3D from "./AfterspaceWorld3D";
import GameHUD from "./ui/components/GameHUD";
import TimelineControl from "./ui/components/TimelineControl";
import ScannerOverlay from "./ui/overlays/ScannerOverlay";
import HypercubeOverlay from "./ui/overlays/HypercubeOverlay";
import MapOverlay from "./ui/overlays/MapOverlay";
import MainMenu from "./ui/screens/MainMenu";
import ExpeditionSetup from "./ui/screens/ExpeditionSetup";
import PauseScreen from "./ui/screens/PauseScreen";
import JournalScreen from "./ui/screens/JournalScreen";
import InventoryScreen from "./ui/screens/InventoryScreen";
import MissionScreen from "./ui/screens/MissionScreen";
import SettingsScreen from "./ui/screens/SettingsScreen";
import CompletionScreen from "./ui/screens/CompletionScreen";
import {
  ARTIFACT_CATALOG,
  DEFAULT_SETTINGS,
  EXPLORER_CHARACTERS,
  REGIONS,
  TEMPORAL_STATES,
  computeHypercubeAlignment,
  createInitialAfterspaceState,
  findNearestInteractable,
  getRegionAtZ,
  shiftTemporalState,
  triggerExamineAction,
  updateHypercubeAngle,
} from "./afterspaceEngine";
import {
  askPersonalizedCompanion,
  loadArcadeAiProfile,
  saveArcadeAiProfile,
  speakCompanionLine,
} from "../../../Services/arcadeAiService";

const STORAGE_SETTINGS_KEY = "afterspace_settings_v1";
const STORAGE_PROGRESS_KEY = "afterspace_expedition_v1";

const loadSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch (_) {
    return DEFAULT_SETTINGS;
  }
};

const hasSavedState = () => {
  try {
    return Boolean(localStorage.getItem(STORAGE_PROGRESS_KEY));
  } catch (_) {
    return false;
  }
};

const buildUiSnapshot = (s) => ({
  screen: s.screen,
  activeOverlay: s.activeOverlay,
  expeditionMode: s.expeditionMode,
  difficulty: s.difficulty,
  player: { ...s.player },
  temporalIndex: s.temporalIndex,
  atFracturedSpan: Boolean(s.atFracturedSpan),
  scannerActive: s.scannerActive,
  scanProgress: s.scanProgress,
  suitEnergy: s.suitEnergy,
  stability: s.stability,
  discoveredRegions: [...s.discoveredRegions],
  regionBanner: s.regionBanner ? { ...s.regionBanner } : null,
  discoveryToast: s.discoveryToast ? { ...s.discoveryToast } : null,
  coopNotice: s.coopNotice ? { ...s.coopNotice } : null,
  journalDiscovered: { ...s.journalDiscovered },
  ownedArtifacts: { ...s.ownedArtifacts },
  objectives: s.objectives.map((o) => ({ ...o })),
  hintTier: { ...s.hintTier },
  hypercube: {
    ...s.hypercube,
    angles: { ...s.hypercube.angles },
    alignment: { ...s.hypercube.alignment },
  },
});

const AfterspaceGame = ({ onBack, isMuted = false, onSaveScore }) => {
  const simRef = useRef(createInitialAfterspaceState());
  const inputRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    turnLeft: false,
    turnRight: false,
    sprint: false,
  });
  const settingsRef = useRef(loadSettings());

  useEffect(() => {
    return () => afterspaceSound.stopAmbientDrone();
  }, []);

  const [settings, setSettings] = useState(loadSettings);
  const [snap, setSnap] = useState(() => buildUiSnapshot(createInitialAfterspaceState()));
  const [localMuted, setLocalMuted] = useState(isMuted);
  const [savedAvailable, setSavedAvailable] = useState(() => hasSavedState());
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [previewTemporalIdx, setPreviewTemporalIdx] = useState(null);
  const [aiProfile, setAiProfile] = useState(loadArcadeAiProfile);
  const [aiWhisper, setAiWhisper] = useState(null);
  const interactionIdRef = useRef(null);

  const forceSync = useCallback(() => {
    setSnap(buildUiSnapshot(simRef.current));
  }, []);

  useEffect(() => {
    afterspaceSound.setMuted(localMuted);
  }, [localMuted]);

  useEffect(() => {
    settingsRef.current = settings;
    afterspaceSound.setVolumes({
      master: settings.masterVolume / 100,
      music: settings.musicVolume / 100,
      ambient: settings.ambientVolume / 100,
      effects: settings.effectsVolume / 100,
    });
  }, [settings]);

  const persistProgress = useCallback(() => {
    try {
      const s = simRef.current;
      if (s.screen === "menu" || s.screen === "setup") return;
      const snapshot = {
        player: s.player,
        temporalIndex: s.temporalIndex,
        expeditionMode: s.expeditionMode,
        difficulty: s.difficulty,
        discoveredRegions: s.discoveredRegions,
        journalDiscovered: s.journalDiscovered,
        ownedArtifacts: s.ownedArtifacts,
        objectives: s.objectives.map((o) => o.completed),
        angles: s.hypercube.angles,
      };
      localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(snapshot));
      setSavedAvailable(true);
    } catch (_) {}
  }, []);

  const handleDiscoveryEvent = useCallback(
    (events) => {
      if (events.recoveredArtifact || events.scanCompleted) {
        afterspaceSound.playDiscovery();
        persistProgress();
      }
      if (events.enteredRegion && simRef.current.coopMate.active) {
        simRef.current.coopNotice = {
          text: `${simRef.current.coopMate.name} has entered ${events.enteredRegion.name}.`,
          timer: 4.5,
        };
      }
    },
    [persistProgress]
  );

  const handleChangeSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  const handleSelectMenu = useCallback(
    (id) => {
      afterspaceSound.playClick();
      const s = simRef.current;
      if (id === "new") {
        s.expeditionMode = "Solo Exploration";
        s.screen = "setup";
        forceSync();
      } else if (id === "multiplayer") {
        s.expeditionMode = "Cooperative Exploration";
        s.screen = "setup";
        forceSync();
      } else if (id === "continue") {
        try {
          const raw = localStorage.getItem(STORAGE_PROGRESS_KEY);
          if (raw) {
            const stateData = JSON.parse(raw);
            const restored = createInitialAfterspaceState({
              startInWorld: true,
              expeditionMode: stateData.expeditionMode,
              difficulty: stateData.difficulty,
            });
            restored.player = stateData.player || restored.player;
            restored.temporalIndex = stateData.temporalIndex ?? 1;
            restored.discoveredRegions = stateData.discoveredRegions || ["gateway"];
            restored.journalDiscovered = {
              ...restored.journalDiscovered,
              ...(stateData.journalDiscovered || {}),
            };
            restored.ownedArtifacts = {
              ...restored.ownedArtifacts,
              ...(stateData.ownedArtifacts || {}),
            };
            if (Array.isArray(stateData.objectives)) {
              restored.objectives.forEach((o, idx) => {
                o.completed = Boolean(stateData.objectives[idx]);
              });
            }
            if (stateData.angles) {
              restored.hypercube.angles = stateData.angles;
              restored.hypercube.alignment = computeHypercubeAlignment(stateData.angles);
            }
            simRef.current = restored;
            forceSync();
            return;
          }
        } catch (_) {}
        s.screen = "setup";
        forceSync();
      } else if (id === "archive") {
        s.activeOverlay = "journal";
        forceSync();
      } else if (id === "settings") {
        s.activeOverlay = "settings";
        forceSync();
      }
    },
    [forceSync]
  );

  const handleBeginExpedition = useCallback(() => {
    afterspaceSound.playDiscovery();
    afterspaceSound.startAmbientDrone();
    const s = simRef.current;
    const fresh = createInitialAfterspaceState({
      startInWorld: true,
      expeditionMode: s.expeditionMode,
      difficulty: s.difficulty,
    });
    simRef.current = fresh;
    setTimelineOpen(false);
    setPreviewTemporalIdx(null);
    persistProgress();
    forceSync();
  }, [forceSync, persistProgress]);

  const handleExamine = useCallback(() => {
    const s = simRef.current;
    if (s.screen !== "playing" || s.activeOverlay) return;
    const res = triggerExamineAction(s);
    if (!res.handled) return;

    if (res.blocked) {
      s.discoveryToast = {
        kicker: "GEOMETRIC LOCK",
        title: "Threshold Dormant",
        sub: res.message,
        timer: 3.8,
      };
    } else if (res.completed) {
      afterspaceSound.playCompletionChord();
      const score =
        Object.values(s.journalDiscovered).filter(Boolean).length * 100 +
        Object.values(s.ownedArtifacts).filter(Boolean).length * 150;
      onSaveScore?.("afterspace", score);
    } else if (res.opened) {
      afterspaceSound.playClick();
    } else {
      afterspaceSound.playDiscovery();
      persistProgress();
    }
    forceSync();
  }, [forceSync, onSaveScore, persistProgress]);

  const handleTemporalSelect = useCallback(
    (idx) => {
      const changed = shiftTemporalState(simRef.current, idx);
      if (changed) {
        afterspaceSound.playTemporalShift(idx);
        setPreviewTemporalIdx(null);
        persistProgress();
        forceSync();
      }
    },
    [forceSync, persistProgress]
  );

  const handleAskGuide = useCallback(async () => {
    afterspaceSound.playClick();
    const s = simRef.current;
    const region = getRegionAtZ(s.player.z);
    const explorer =
      EXPLORER_CHARACTERS.find((c) => c.id === aiProfile.selectedAfterspaceRole) ||
      EXPLORER_CHARACTERS[0];
    const unlockedNames = ARTIFACT_CATALOG.filter((a) => s.ownedArtifacts[a.id]).map((a) => a.name);
    const res = await askPersonalizedCompanion({
      gameId: "afterspace",
      prompt: `Offer one calm architectural observation or hint for ${region.name}.`,
      playerContext: {
        callsign: aiProfile.callsign,
        playstyle: aiProfile.playstyle,
        character: explorer.name,
        region: region.name,
        prizes: unlockedNames,
        score: unlockedNames.length * 100,
      },
      previousInteractionId: interactionIdRef.current,
    });
    if (res.interaction_id) interactionIdRef.current = res.interaction_id;
    setAiWhisper(res.reply);
    if (aiProfile.voiceEnabled && !localMuted) {
      speakCompanionLine(res.reply, true);
    }
    setTimeout(() => setAiWhisper(null), 7000);
  }, [aiProfile, localMuted]);

  const handleOpenOverlay = useCallback(
    (overlayName) => {
      afterspaceSound.playJournalTurn();
      const s = simRef.current;
      s.activeOverlay = s.activeOverlay === overlayName ? null : overlayName;
      setTimelineOpen(false);
      setPreviewTemporalIdx(null);
      forceSync();
    },
    [forceSync]
  );

  useEffect(() => {
    const setKeyMove = (key, down) => {
      const k = key.toLowerCase();
      if (k === "w" || key === "arrowup") inputRef.current.forward = down;
      if (k === "s" || key === "arrowdown") inputRef.current.backward = down;
      if (k === "a") inputRef.current.left = down;
      if (k === "d") inputRef.current.right = down;
      if (key === "arrowleft") inputRef.current.turnLeft = down;
      if (key === "arrowright") inputRef.current.turnRight = down;
      if (key === "shift") inputRef.current.sprint = down;
    };

    const onKeyDown = (e) => {
      const s = simRef.current;
      setKeyMove(e.key, true);

      if (s.screen === "menu" || s.screen === "setup") {
        if (e.key === "Escape" && s.activeOverlay) {
          s.activeOverlay = null;
          forceSync();
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        if (s.activeOverlay) {
          s.activeOverlay = null;
          forceSync();
        } else if (timelineOpen) {
          setTimelineOpen(false);
          setPreviewTemporalIdx(null);
        } else if (s.screen === "playing") {
          s.screen = "paused";
          forceSync();
        } else if (s.screen === "paused") {
          s.screen = "playing";
          forceSync();
        }
        return;
      }

      if (s.screen !== "playing") return;

      const k = e.key.toLowerCase();
      if (k === "e" && !s.activeOverlay) {
        e.preventDefault();
        handleExamine();
      } else if (k === "q" && !s.activeOverlay) {
        e.preventDefault();
        s.scannerActive = !s.scannerActive;
        afterspaceSound.playClick();
        forceSync();
      } else if (k === "t" && !s.activeOverlay) {
        e.preventDefault();
        setTimelineOpen((o) => !o);
        setPreviewTemporalIdx(null);
        afterspaceSound.playClick();
      } else if (k === "j") {
        e.preventDefault();
        handleOpenOverlay("journal");
      } else if (k === "i") {
        e.preventDefault();
        handleOpenOverlay("inventory");
      } else if (k === "m") {
        e.preventDefault();
        handleOpenOverlay("map");
      } else if (k === "g") {
        e.preventDefault();
        handleAskGuide();
      } else if (e.key === "Tab") {
        e.preventDefault();
        handleOpenOverlay("mission");
      }
    };

    const onKeyUp = (e) => {
      setKeyMove(e.key, false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [forceSync, handleAskGuide, handleExamine, handleOpenOverlay, timelineOpen]);

  const currentRegion = getRegionAtZ(snap.player.z);
  const currentTemporal = TEMPORAL_STATES[snap.temporalIndex];
  const activeObjective = snap.objectives.find((o) => !o.completed) || null;
  const nearest =
    snap.screen === "playing" && !snap.activeOverlay
      ? findNearestInteractable(snap.player)
      : null;
  const scanTarget =
    snap.scannerActive && nearest?.id === "int_temporal_residue" ? nearest : null;

  return (
    <div
      data-biome={currentRegion.biome}
      data-contrast={settings.highContrast ? "high" : "normal"}
      data-reduced-motion={settings.reducedMotion ? "true" : "false"}
      data-text-scale={settings.largeText ? "large" : "normal"}
      className="afterspace-root fixed inset-0 z-50 w-screen h-[100dvh] overflow-hidden select-none"
    >
      {/* Continuous 3D Observatory Environment */}
      <AfterspaceWorld3D
        simRef={simRef}
        inputRef={inputRef}
        settingsRef={settingsRef}
        previewTemporalIndex={timelineOpen ? previewTemporalIdx : null}
        onSyncHud={forceSync}
        onDiscoveryEvent={handleDiscoveryEvent}
      />

      {/* Screen: MAIN MENU */}
      {snap.screen === "menu" && !snap.activeOverlay && (
        <MainMenu
          hasSavedProgress={savedAvailable}
          isMuted={localMuted}
          onSelectItem={handleSelectMenu}
          onToggleMute={() => setLocalMuted((m) => !m)}
          onExitArcade={onBack}
        />
      )}

      {/* Screen: EXPEDITION PREPARATION */}
      {snap.screen === "setup" && !snap.activeOverlay && (
        <ExpeditionSetup
          expeditionMode={snap.expeditionMode}
          difficulty={snap.difficulty}
          selectedCharacterId={aiProfile.selectedAfterspaceRole}
          onChangeCharacter={(cid) => {
            const next = saveArcadeAiProfile({ selectedAfterspaceRole: cid });
            setAiProfile(next);
          }}
          onChangeMode={(mode) => {
            simRef.current.expeditionMode = mode;
            forceSync();
          }}
          onChangeDifficulty={(diff) => {
            simRef.current.difficulty = diff;
            forceSync();
          }}
          onBegin={handleBeginExpedition}
          onBack={() => {
            simRef.current.screen = "menu";
            forceSync();
          }}
        />
      )}

      {/* IN-GAME HUD & SCANNER / TIMELINE */}
      {snap.screen === "playing" && !snap.activeOverlay && (
        <>
          <GameHUD
            region={currentRegion}
            bearingDeg={Math.round((((-snap.player.yaw * 180) / Math.PI) % 360 + 360) % 360)}
            suitEnergy={snap.suitEnergy}
            stability={snap.stability}
            activeObjective={activeObjective}
            nearestInteractable={nearest}
            atFracturedSpan={snap.atFracturedSpan}
            scannerActive={snap.scannerActive}
            temporalLabel={currentTemporal.code}
            regionBanner={snap.regionBanner}
            discoveryToast={snap.discoveryToast}
            coopNotice={snap.coopNotice}
            aiWhisper={aiWhisper}
            timelineOpen={timelineOpen}
            onExamine={handleExamine}
            onAskGuide={handleAskGuide}
            onToggleScanner={() => {
              simRef.current.scannerActive = !simRef.current.scannerActive;
              afterspaceSound.playClick();
              forceSync();
            }}
            onToggleTimeline={() => {
              setTimelineOpen((o) => !o);
              setPreviewTemporalIdx(null);
              afterspaceSound.playClick();
            }}
            onOpenOverlay={handleOpenOverlay}
            onPause={() => {
              simRef.current.screen = "paused";
              forceSync();
            }}
            onTouchMove={(dir, active) => {
              inputRef.current[dir] = active;
            }}
          />

          {snap.scannerActive && (
            <ScannerOverlay
              player={snap.player}
              scanTarget={scanTarget}
              scanProgress={snap.scanProgress}
              onClose={() => {
                simRef.current.scannerActive = false;
                forceSync();
              }}
            />
          )}

          {timelineOpen && (
            <TimelineControl
              currentIndex={snap.temporalIndex}
              previewIndex={previewTemporalIdx}
              onHoverState={setPreviewTemporalIdx}
              onSelectState={handleTemporalSelect}
              onClose={() => {
                setTimelineOpen(false);
                setPreviewTemporalIdx(null);
              }}
            />
          )}
        </>
      )}

      {/* PAUSE SCREEN */}
      {snap.screen === "paused" && !snap.activeOverlay && (
        <PauseScreen
          regionName={currentRegion.name}
          temporalCode={currentTemporal.code}
          onResume={() => {
            simRef.current.screen = "playing";
            forceSync();
          }}
          onRestart={() => {
            handleBeginExpedition();
          }}
          onOpenJournal={() => {
            simRef.current.activeOverlay = "journal";
            forceSync();
          }}
          onOpenSettings={() => {
            simRef.current.activeOverlay = "settings";
            forceSync();
          }}
          onExitExpedition={() => {
            persistProgress();
            simRef.current.screen = "menu";
            simRef.current.activeOverlay = null;
            forceSync();
          }}
        />
      )}

      {/* OVERLAY: FIELD JOURNAL (J) */}
      {snap.activeOverlay === "journal" && (
        <JournalScreen
          journalDiscovered={snap.journalDiscovered}
          biome={currentRegion.biome}
          onSelectEntrySound={() => afterspaceSound.playJournalTurn()}
          onClose={() => {
            simRef.current.activeOverlay = null;
            forceSync();
          }}
        />
      )}

      {/* OVERLAY: ARTIFACT INVENTORY (I) */}
      {snap.activeOverlay === "inventory" && (
        <InventoryScreen
          ownedArtifacts={snap.ownedArtifacts}
          alignedHypercube={snap.hypercube.alignment.aligned}
          onClose={() => {
            simRef.current.activeOverlay = null;
            forceSync();
          }}
        />
      )}

      {/* OVERLAY: EXPEDITION MISSION RECORD (Tab) */}
      {snap.activeOverlay === "mission" && (
        <MissionScreen
          objectives={snap.objectives}
          hintTier={snap.hintTier}
          difficulty={snap.difficulty}
          onRevealHint={(objId) => {
            simRef.current.hintTier[objId] = (simRef.current.hintTier[objId] || 0) + 1;
            afterspaceSound.playClick();
            forceSync();
          }}
          onClose={() => {
            simRef.current.activeOverlay = null;
            forceSync();
          }}
        />
      )}

      {/* OVERLAY: CARTOGRAPHIC WORLD MAP (M) */}
      {snap.activeOverlay === "map" && (
        <MapOverlay
          player={snap.player}
          regionId={currentRegion.id}
          discoveredRegions={snap.discoveredRegions}
          journalDiscovered={snap.journalDiscovered}
          onClose={() => {
            simRef.current.activeOverlay = null;
            forceSync();
          }}
        />
      )}

      {/* OVERLAY: 4D TESSERACT CONTROL */}
      {snap.activeOverlay === "hypercube" && (
        <HypercubeOverlay
          hypercube={snap.hypercube}
          difficulty={snap.difficulty}
          onSelectPlane={(plane) => {
            simRef.current.hypercube.selectedPlane = plane;
            afterspaceSound.playClick();
            forceSync();
          }}
          onChangeAngle={(plane, deg) => {
            const alignment = updateHypercubeAngle(simRef.current, plane, deg);
            if (alignment.aligned) {
              afterspaceSound.playDiscovery();
              persistProgress();
            }
            forceSync();
          }}
          onUpdateOption={(key, val) => {
            simRef.current.hypercube[key] = val;
            forceSync();
          }}
          onReset={() => {
            simRef.current.hypercube.angles = { XY: 12, XZ: 8, XW: 0, YZ: 0, YW: 0, ZW: 0 };
            simRef.current.hypercube.alignment = computeHypercubeAlignment(
              simRef.current.hypercube.angles
            );
            afterspaceSound.playClick();
            forceSync();
          }}
          onClose={() => {
            simRef.current.activeOverlay = null;
            forceSync();
          }}
        />
      )}

      {/* OVERLAY: SETTINGS */}
      {snap.activeOverlay === "settings" && (
        <SettingsScreen
          settings={settings}
          onChangeSetting={handleChangeSetting}
          onClose={() => {
            simRef.current.activeOverlay = null;
            forceSync();
          }}
        />
      )}

      {/* SCREEN: EXPEDITION COMPLETE */}
      {snap.screen === "complete" && (
        <CompletionScreen
          discoveriesCount={Object.values(snap.journalDiscovered).filter(Boolean).length}
          regionsCount={snap.discoveredRegions.length || REGIONS.length}
          artifactsCount={Object.values(snap.ownedArtifacts).filter(Boolean).length}
          onContinueExploring={() => {
            simRef.current.screen = "playing";
            forceSync();
          }}
          onReturnMenu={() => {
            simRef.current.screen = "menu";
            forceSync();
          }}
        />
      )}
    </div>
  );
};

AfterspaceGame.propTypes = {
  onBack: PropTypes.func.isRequired,
  isMuted: PropTypes.bool,
  onSaveScore: PropTypes.func,
};

export default AfterspaceGame;

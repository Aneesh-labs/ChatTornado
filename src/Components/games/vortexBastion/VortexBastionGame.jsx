import React, { useState, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import {
  ArrowLeft,
  Shield,
  Zap,
  Camera,
  Check,
  X,
  RotateCcw,
  Route,
} from "lucide-react";
import { soundEngine } from "../../../utils/soundEffects";
import {
  createInitialGrid,
  findPath,
  previewTowerPlacement,
  CELL_TOWER,
} from "./pathfinding";
import VortexBastionScene from "./VortexBastionScene";

const CAMERA_CYCLE = ["iso", "top", "hero"];

const VortexBastionGame = ({ onBack, isMuted }) => {
  const [grid, setGrid] = useState(() => createInitialGrid());
  const [credits, setCredits] = useState(320);
  const [coreHp, setCoreHp] = useState(20);
  const [cameraPreset, setCameraPreset] = useState("iso");
  const [previewCell, setPreviewCell] = useState(null);

  const playAudio = useCallback(
    (type) => {
      if (!isMuted) soundEngine.play(type);
    },
    [isMuted]
  );

  const activePath = useMemo(() => findPath(grid) || [], [grid]);

  const previewInfo = useMemo(() => {
    if (!previewCell) return null;
    return previewTowerPlacement(grid, previewCell, []);
  }, [grid, previewCell]);

  const handleTileTap = useCallback(
    (cell) => {
      playAudio("laser");
      setPreviewCell((prev) =>
        prev && prev.col === cell.col && prev.row === cell.row ? null : cell
      );
    },
    [playAudio]
  );

  const handleConfirmBuild = useCallback(() => {
    if (!previewCell || !previewInfo?.valid || credits < 60) return;
    playAudio("coin");
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[previewCell.row][previewCell.col] = CELL_TOWER;
      return next;
    });
    setCredits((c) => c - 60);
    setPreviewCell(null);
  }, [previewCell, previewInfo, credits, playAudio]);

  const handleResetMaze = useCallback(() => {
    playAudio("whoosh");
    setGrid(createInitialGrid());
    setCredits(320);
    setCoreHp(20);
    setPreviewCell(null);
  }, [playAudio]);

  const cycleCamera = () => {
    playAudio("laser");
    setCameraPreset((cur) => {
      const idx = CAMERA_CYCLE.indexOf(cur);
      return CAMERA_CYCLE[(idx + 1) % CAMERA_CYCLE.length];
    });
  };

  const pathDelta =
    previewInfo?.valid && previewInfo.path
      ? previewInfo.path.length - activePath.length
      : 0;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-2.5 pb-4 select-none">
      {/* Compact Phone-First Top Bar */}
      <div className="flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Lobby
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="px-2.5 py-1 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center gap-1 text-cyan-300 text-xs font-black">
            <Shield className="w-3.5 h-3.5" /> {coreHp}
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center gap-1 text-amber-300 text-xs font-black">
            <Zap className="w-3.5 h-3.5" /> {credits}
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-violet-500/15 border border-violet-400/30 flex items-center gap-1 text-violet-200 text-xs font-bold">
            <Route className="w-3.5 h-3.5" /> {activePath.length}
          </div>
          <button
            type="button"
            onClick={cycleCamera}
            title="Cycle 3D Camera Angle"
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-cyan-200 flex items-center gap-1 uppercase cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" /> {cameraPreset}
          </button>
          <button
            type="button"
            onClick={handleResetMaze}
            title="Reset Arena"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Full 3D WebGL Arena Viewport (Portrait-First Aspect) */}
      <div className="relative w-full h-[64dvh] min-h-[420px] max-h-[680px] rounded-3xl overflow-hidden border-2 border-cyan-500/35 bg-[#040712] shadow-[0_0_50px_rgba(6,182,212,0.2)]">
        <VortexBastionScene
          grid={grid}
          activePath={activePath}
          previewCell={previewCell}
          previewValid={Boolean(previewInfo?.valid)}
          previewPath={previewInfo?.path || null}
          cameraPreset={cameraPreset}
          onTileTap={handleTileTap}
        />

        {/* Floating Live Path / Confirm Pill inside viewport for ergonomic thumb reach */}
        {previewCell && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-cyan-400/40 shadow-xl">
            <div className="min-w-0">
              {previewInfo?.valid ? (
                <>
                  <p className="text-xs font-black text-cyan-300 truncate">
                    Pulse Bastion • Tile ({previewCell.col}, {previewCell.row})
                  </p>
                  <p className="text-[11px] text-white/70">
                    Route: {previewInfo.path.length} steps{" "}
                    {pathDelta > 0 && (
                      <span className="text-amber-300 font-bold">
                        (+{pathDelta} detour!)
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-black text-rose-400">Invalid Placement</p>
                  <p className="text-[11px] text-white/70">{previewInfo?.reason}</p>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setPreviewCell(null)}
                aria-label="Cancel placement"
                className="p-2 rounded-xl bg-white/10 text-gray-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={!previewInfo?.valid || credits < 60}
                onClick={handleConfirmBuild}
                className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:bg-white/10 disabled:text-white/40 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Build (60⚡)
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-center text-white/50 px-2">
        Tap any tile to preview live A* enemy rerouting • Drag gently to tilt 3D camera
      </p>
    </div>
  );
};

VortexBastionGame.propTypes = {
  onBack: PropTypes.func.isRequired,
  isMuted: PropTypes.bool,
};

export default VortexBastionGame;

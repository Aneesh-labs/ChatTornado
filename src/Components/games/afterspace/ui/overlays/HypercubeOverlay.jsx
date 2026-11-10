import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  ROTATION_PLANES,
  TESSERACT_TOPOLOGY,
  project4Dto3D,
} from "../../afterspaceEngine";

const HypercubeOverlay = ({
  hypercube,
  difficulty,
  onSelectPlane,
  onChangeAngle,
  onUpdateOption,
  onReset,
  onClose,
}) => {
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const [showMathNotes, setShowMathNotes] = useState(false);

  const selectedPlane = hypercube.selectedPlane;
  const activeAngle = hypercube.angles[selectedPlane] ?? 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h) * 0.19;

    ctx.clearRect(0, 0, w, h);

    const projected = TESSERACT_TOPOLOGY.vertices.map((v) =>
      project4Dto3D(v, hypercube.angles, hypercube.projectionDistance)
    );

    const drawSet = (pts, strokeStyle, vertexStyle, drawLabels) => {
      if (hypercube.showEdges) {
        ctx.lineWidth = 1.25;
        ctx.strokeStyle = strokeStyle;
        TESSERACT_TOPOLOGY.edges.forEach(([a, b]) => {
          const pa = pts[a];
          const pb = pts[b];
          ctx.beginPath();
          ctx.moveTo(cx + pa.x * scale, cy - pa.y * scale);
          ctx.lineTo(cx + pb.x * scale, cy - pb.y * scale);
          ctx.stroke();
        });
      }

      if (hypercube.showVertices) {
        pts.forEach((p, idx) => {
          const px = cx + p.x * scale;
          const py = cy - p.y * scale;
          const r = Math.max(2, Math.min(4.2, 2.2 + p.w * 0.7));
          ctx.beginPath();
          ctx.fillStyle = vertexStyle;
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();

          if (drawLabels) {
            ctx.font = '10px "IBM Plex Mono", monospace';
            ctx.fillStyle = "rgba(190,189,178,0.8)";
            ctx.fillText(`V${idx.toString().padStart(2, "0")}`, px + 6, py - 4);
          }
        });
      }
    };

    if (hypercube.compareProjection) {
      const refProj = TESSERACT_TOPOLOGY.vertices.map((v) =>
        project4Dto3D(v, { XY: 12, XZ: 8, XW: 45, YZ: 0, YW: 35, ZW: 0 }, hypercube.projectionDistance)
      );
      drawSet(refProj, "rgba(132, 150, 161, 0.25)", "rgba(132, 150, 161, 0.35)", false);
    }

    const lineCol = hypercube.alignment.aligned
      ? "rgba(185, 154, 112, 0.9)"
      : "rgba(237, 234, 225, 0.78)";
    drawSet(projected, lineCol, "#B99A70", hypercube.showLabels);
    return undefined;
  }, [hypercube]);

  const handleCanvasPointerDown = (e) => {
    dragRef.current = { x: e.clientX, y: e.clientY, startAngle: activeAngle };
  };
  const handleCanvasPointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    onChangeAngle(selectedPlane, dragRef.current.startAngle + dx * 0.45);
  };
  const handleCanvasPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-30 bg-[#151A19]/82 backdrop-blur-md flex flex-col justify-between p-6 md:px-14 md:py-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="as-tech-label uppercase text-[#8F938C]">
            Central Hypercube Interface
          </div>
          <h2 className="as-section-heading text-[#F5F3ED] mt-1">
            Four-Dimensional Projection
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="as-tech-label uppercase text-[#8F938C]">Symmetry Resonance</div>
            <div
              className={`as-mono text-sm mt-0.5 ${
                hypercube.alignment.aligned ? "text-[#B99A70]" : "text-[#E8E9E2]"
              }`}
            >
              {hypercube.alignment.percent}% {hypercube.alignment.aligned ? "• ALIGNED" : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-[2px] border border-[#E8E9E2]/20 bg-[#202625] hover:bg-[#303735] text-xs text-[#F5F3ED] cursor-pointer"
          >
            Return [Esc]
          </button>
        </div>
      </div>

      {/* Main Three-Zone Composition (Part 12.2: No heavy panel walls around the object) */}
      <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6 my-auto">
        {/* Left: Compact Rotation Planes List */}
        <div className="md:col-span-3 flex md:flex-col gap-1.5 flex-wrap">
          <div className="w-full as-tech-label uppercase text-[#8F938C] mb-1">
            Rotation Planes
          </div>
          {ROTATION_PLANES.map((plane) => {
            const active = selectedPlane === plane;
            return (
              <button
                key={plane}
                type="button"
                onClick={() => onSelectPlane(plane)}
                className={`flex items-center justify-between px-3 py-2 rounded-[2px] border text-xs transition-all cursor-pointer min-w-[82px] ${
                  active
                    ? "bg-[#202625] border-[#B99A70]/65 text-[#F5F3ED] translate-x-0.5"
                    : "bg-transparent border-[#E8E9E2]/12 text-[#8F938C] hover:text-[#E8E9E2]"
                }`}
              >
                <span className="as-mono tracking-wider">{plane}</span>
                <span className="as-mono text-[#BEBDB2]">
                  {Math.round(hypercube.angles[plane] ?? 0).toString().padStart(3, "0")}°
                </span>
              </button>
            );
          })}
          {difficulty === "Guided" && (
            <p className="as-secondary text-[#89988A] mt-2">
              Observatory reference notes suggest alignment near XW 045° and YW 035°.
            </p>
          )}
        </div>

        {/* Center: Live Projected Tesseract Canvas */}
        <div className="md:col-span-6 flex flex-col items-center justify-center">
          <canvas
            ref={canvasRef}
            width={440}
            height={360}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerLeave={handleCanvasPointerUp}
            className="w-full max-w-[440px] h-auto cursor-grab active:cursor-grabbing touch-none"
          />
          <div className="as-secondary text-[#8F938C] mt-1">
            Drag horizontally across projection to rotate {selectedPlane}
          </div>
        </div>

        {/* Right: Projection Settings & Optional Mathematical Notes (Part 12.4 & 12.5) */}
        <div className="md:col-span-3 space-y-4">
          <div className="as-tech-label uppercase text-[#8F938C]">Projection Controls</div>

          <div className="space-y-2 text-xs">
            {[
              ["showVertices", "Display vertices (16)"],
              ["showEdges", "Display edges (32)"],
              ["showLabels", "Projected vertex labels"],
              ["compareProjection", "Compare target harmonic"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 py-1 cursor-pointer">
                <span className="text-[#D5D2C8]">{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(hypercube[key])}
                  onChange={(e) => onUpdateOption(key, e.target.checked)}
                  className="accent-[#B99A70] cursor-pointer"
                />
              </label>
            ))}
          </div>

          <div className="pt-2 border-t border-[#E8E9E2]/12">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#8F938C]">Projection distance</span>
              <span className="as-mono text-[#E8E9E2]">
                {hypercube.projectionDistance.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="1.6"
              max="3.6"
              step="0.05"
              value={hypercube.projectionDistance}
              onChange={(e) => onUpdateOption("projectionDistance", parseFloat(e.target.value))}
              className="w-full accent-[#B99A70] cursor-pointer"
            />
          </div>

          <div className="pt-2 border-t border-[#E8E9E2]/12">
            <button
              type="button"
              onClick={() => setShowMathNotes((v) => !v)}
              className="as-tech-label text-[#8496A1] hover:text-[#F5F3ED] cursor-pointer"
            >
              {showMathNotes ? "Hide Mathematical Annotation" : "Show Mathematical Annotation"}
            </button>
            {showMathNotes && (
              <div className="mt-2.5 p-3 border border-[#E8E9E2]/12 rounded-[2px] bg-[#202625]/70 space-y-1.5">
                <div className="flex justify-between as-mono text-xs">
                  <span className="text-[#8F938C]">ROTATION PLANE</span>
                  <span className="text-[#EDEAE1]">{selectedPlane}</span>
                </div>
                <div className="flex justify-between as-mono text-xs">
                  <span className="text-[#8F938C]">ANGLE</span>
                  <span className="text-[#EDEAE1]">
                    {Math.round(activeAngle).toString().padStart(3, "0")}°
                  </span>
                </div>
                <div className="flex justify-between as-mono text-xs">
                  <span className="text-[#8F938C]">PROJECTION DIST</span>
                  <span className="text-[#EDEAE1]">{hypercube.projectionDistance.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Angular Bar & Reset */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E8E9E2]/12">
        <div className="flex items-center gap-4 w-full sm:w-auto flex-1 max-w-lg">
          <span className="as-mono text-xs text-[#B99A70] w-8">{selectedPlane}</span>
          <input
            type="range"
            min="0"
            max="359"
            step="1"
            value={Math.round(activeAngle)}
            onChange={(e) => onChangeAngle(selectedPlane, parseFloat(e.target.value))}
            className="flex-1 accent-[#B99A70] cursor-pointer"
          />
          <span className="as-mono text-xs text-[#E8E9E2] w-12 text-right">
            {Math.round(activeAngle)}°
          </span>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="px-4 py-1.5 rounded-[2px] border border-[#E8E9E2]/15 text-xs text-[#BEBDB2] hover:text-[#F5F3ED] cursor-pointer"
        >
          Reset rotation
        </button>
      </div>
    </div>
  );
};

HypercubeOverlay.propTypes = {
  hypercube: PropTypes.object.isRequired,
  difficulty: PropTypes.string.isRequired,
  onSelectPlane: PropTypes.func.isRequired,
  onChangeAngle: PropTypes.func.isRequired,
  onUpdateOption: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default HypercubeOverlay;

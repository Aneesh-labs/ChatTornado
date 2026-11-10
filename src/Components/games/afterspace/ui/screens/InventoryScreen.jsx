import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { ARTIFACT_CATALOG } from "../../afterspaceEngine";

const ARTIFACT_CATEGORIES = [
  "All Recovered",
  "Artifacts",
  "Temporal fragments",
  "Energy cores",
  "Dimensional keys",
  "Ancient records",
  "Unknown materials",
];

const InventoryScreen = ({ ownedArtifacts, alignedHypercube, onClose }) => {
  const ownedList = ARTIFACT_CATALOG.filter((a) => ownedArtifacts[a.id]);
  const [category, setCategory] = useState("All Recovered");
  const [selectedId, setSelectedId] = useState(ownedList[0]?.id || ARTIFACT_CATALOG[0].id);
  const [yawDeg, setYawDeg] = useState(28);
  const [pitchDeg, setPitchDeg] = useState(18);
  const dragRef = useRef(null);
  const canvasRef = useRef(null);

  const filtered = ARTIFACT_CATALOG.filter(
    (a) => category === "All Recovered" || a.category === category
  );
  const activeItem =
    ARTIFACT_CATALOG.find((a) => a.id === selectedId) || filtered[0] || ARTIFACT_CATALOG[0];
  const isOwned = Boolean(ownedArtifacts[activeItem.id]);

  // Interactive 3D wireframe/solid artifact preview (Part 14.3)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!isOwned) return undefined;

    const ry = (yawDeg * Math.PI) / 180;
    const rx = (pitchDeg * Math.PI) / 180;
    const project = ([vx, vy, vz]) => {
      const x1 = vx * Math.cos(ry) - vz * Math.sin(ry);
      const z1 = vx * Math.sin(ry) + vz * Math.cos(ry);
      const y2 = vy * Math.cos(rx) - z1 * Math.sin(rx);
      const z2 = vy * Math.sin(rx) + z1 * Math.cos(rx);
      const s = 140 / (3.4 - z2);
      return [w / 2 + x1 * s, h / 2 - y2 * s];
    };

    const pts =
      activeItem.shape === "octa"
        ? [
            [0, 1.2, 0],
            [1, 0, 0],
            [0, 0, 1],
            [-1, 0, 0],
            [0, 0, -1],
            [0, -1.2, 0],
          ]
        : [
            [-0.85, -0.85, -0.85],
            [0.85, -0.85, -0.85],
            [0.85, 0.85, -0.85],
            [-0.85, 0.85, -0.85],
            [-0.85, -0.85, 0.85],
            [0.85, -0.85, 0.85],
            [0.85, 0.85, 0.85],
            [-0.85, 0.85, 0.85],
          ];

    const edges =
      activeItem.shape === "octa"
        ? [
            [0, 1], [0, 2], [0, 3], [0, 4],
            [5, 1], [5, 2], [5, 3], [5, 4],
            [1, 2], [2, 3], [3, 4], [4, 1],
          ]
        : [
            [0, 1], [1, 2], [2, 3], [3, 0],
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7],
          ];

    const projected = pts.map(project);
    ctx.strokeStyle = activeItem.color || "#B99A70";
    ctx.lineWidth = 1.5;
    edges.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(projected[a][0], projected[a][1]);
      ctx.lineTo(projected[b][0], projected[b][1]);
      ctx.stroke();
    });
    return undefined;
  }, [activeItem, isOwned, pitchDeg, yawDeg]);

  return (
    <div className="fixed inset-0 z-30 bg-[#151A19]/92 flex flex-col p-6 md:p-12">
      <div className="flex items-start justify-between pb-5 border-b border-[#E8E9E2]/12">
        <div>
          <div className="as-tech-label uppercase text-[#8F938C]">Recovered Specimens</div>
          <h2 className="as-section-heading text-[#F5F3ED] mt-1">Artifact Collection</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-[2px] border border-[#E8E9E2]/20 bg-[#202625] hover:bg-[#303735] text-xs text-[#F5F3ED] cursor-pointer"
        >
          Close [I]
        </button>
      </div>

      {/* 3-Column Spacious Archive (Part 14.1) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 py-6 min-h-0 overflow-y-auto as-scroll">
        {/* Left: Categories */}
        <div className="lg:col-span-3 space-y-1">
          <div className="as-tech-label uppercase text-[#8F938C] mb-3">Categories</div>
          {ARTIFACT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`w-full text-left px-3 py-2 rounded-[2px] text-xs transition-colors cursor-pointer ${
                category === cat
                  ? "bg-[#202625] text-[#F5F3ED] border-l-2 border-[#B99A70]"
                  : "text-[#8F938C] hover:text-[#E8E9E2]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Center: Artifact Tiles */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
          {filtered.map((item) => {
            const owned = Boolean(ownedArtifacts[item.id]);
            const selected = activeItem.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`text-left p-5 border rounded-[4px] transition-colors cursor-pointer ${
                  selected
                    ? "bg-[#202625] border-[#B99A70]/65"
                    : "bg-[#151A19] border-[#E8E9E2]/12 hover:border-[#E8E9E2]/25"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="as-mono text-xs text-[#B99A70]">{item.code}</span>
                  <span className="as-mono text-xs text-[#8F938C]">
                    {owned ? `x${item.quantity}` : "UNFOUND"}
                  </span>
                </div>
                <div className="as-serif text-2xl text-[#F5F3ED] mt-2">
                  {owned ? item.name : "Unrecovered Specimen"}
                </div>
                <div className="as-secondary text-[#8F938C] mt-1">{item.category}</div>
              </button>
            );
          })}
        </div>

        {/* Right: Enlarged Rotatable 3D Specimen Preview + Provenance Details */}
        <div className="lg:col-span-4 as-surface-solid p-6 flex flex-col justify-between">
          {isOwned ? (
            <>
              <div>
                <div className="as-mono text-xs text-[#B99A70]">{activeItem.code}</div>
                <h3 className="as-serif text-3xl text-[#F5F3ED] mt-1">{activeItem.name}</h3>

                <canvas
                  ref={canvasRef}
                  width={260}
                  height={190}
                  onPointerDown={(e) => {
                    dragRef.current = { x: e.clientX, y: e.clientY, yaw: yawDeg, pitch: pitchDeg };
                  }}
                  onPointerMove={(e) => {
                    if (!dragRef.current) return;
                    setYawDeg(dragRef.current.yaw + (e.clientX - dragRef.current.x) * 0.6);
                    setPitchDeg(dragRef.current.pitch + (e.clientY - dragRef.current.y) * 0.5);
                  }}
                  onPointerUp={() => {
                    dragRef.current = null;
                  }}
                  onPointerLeave={() => {
                    dragRef.current = null;
                  }}
                  className="w-full h-44 my-4 bg-[#202625]/60 border border-[#E8E9E2]/10 rounded-[2px] cursor-grab active:cursor-grabbing"
                />

                <p className="as-body text-[#D5D2C8] italic">
                  &ldquo;{activeItem.description}&rdquo;
                </p>

                {alignedHypercube && (
                  <p className="as-secondary text-[#89988A] mt-3 pt-3 border-t border-[#E8E9E2]/10">
                    Secondary observation: {activeItem.hiddenNote}
                  </p>
                )}
              </div>

              <dl className="mt-5 pt-4 border-t border-[#E8E9E2]/12 space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-[#8F938C]">Origin</dt>
                  <dd className="text-[#EDEAE1]">{activeItem.origin}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#8F938C]">Classification</dt>
                  <dd className="text-[#EDEAE1]">{activeItem.classification}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#8F938C]">Temporal signature</dt>
                  <dd className="as-mono text-[#EDEAE1]">{activeItem.temporalSignature}</dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="my-auto text-center py-10">
              <div className="as-mono text-xs text-[#8F938C]">{activeItem.code}</div>
              <p className="as-body text-[#8F938C] mt-3">
                Located within {activeItem.origin}. Explore along the outer causeways to recover this object.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

InventoryScreen.propTypes = {
  ownedArtifacts: PropTypes.object.isRequired,
  alignedHypercube: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default InventoryScreen;

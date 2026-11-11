import React, { useState } from "react";
import PropTypes from "prop-types";
import { INTERACTABLES, REGIONS } from "../../afterspaceEngine";

const MapOverlay = ({
  player,
  regionId,
  discoveredRegions,
  journalDiscovered,
  waypoint = null,
  onSetWaypoint,
  onClose,
}) => {
  const [selectedRegion, setSelectedRegion] = useState(
    () => REGIONS.find((r) => r.id === regionId) || REGIONS[0]
  );
  const [zoom, setZoom] = useState(1);

  const mapYFromZ = (z) => 195 + z * 3.6; // maps Z [-54..48] across open world into SVG space
  const mapXFromX = (x) => 220 + x * 3.3; // maps X [-58..58] across West Sundial Basin .. East Pillars

  return (
    <div className="fixed inset-0 z-30 bg-[#151A19]/92 flex flex-col p-6 md:p-12">
      <div className="flex items-start justify-between pb-5 border-b border-[#E8E9E2]/12">
        <div>
          <div className="as-tech-label uppercase text-[#8F938C]">Cartographic Survey</div>
          <h2 className="as-section-heading text-[#F5F3ED] mt-1">Survey of the Fourth Dimension</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-[2px] border border-[#E8E9E2]/20 bg-[#202625] hover:bg-[#303735] text-xs text-[#F5F3ED] cursor-pointer"
        >
          Close [M]
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 py-6 min-h-0 overflow-y-auto as-scroll">
        {/* Left: Region List */}
        <div className="lg:col-span-3 space-y-2">
          <div className="as-tech-label uppercase text-[#8F938C] mb-3">Regions</div>
          {REGIONS.map((reg) => {
            const known = discoveredRegions.includes(reg.id);
            const active = selectedRegion?.id === reg.id;
            return (
              <button
                key={reg.id}
                type="button"
                onClick={() => setSelectedRegion(reg)}
                className={`w-full text-left p-3.5 rounded-[2px] border transition-colors cursor-pointer ${
                  active
                    ? "bg-[#202625] border-[#B99A70]/60 text-[#F5F3ED]"
                    : "border-[#E8E9E2]/10 text-[#8F938C] hover:text-[#E8E9E2]"
                }`}
              >
                <div className="as-tech-label uppercase text-[#B99A70]">{reg.indexLabel}</div>
                <div className="as-serif text-lg mt-0.5">
                  {known ? reg.name : "Uncharted Horizon"}
                </div>
              </button>
            );
          })}
        </div>

        {/* Center: Delicate Contour Line Cartography */}
        <div className="lg:col-span-6 as-surface-solid p-4 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-3 right-3 flex gap-1.5 z-10">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.15).toFixed(2)))}
              className="w-7 h-7 border border-[#E8E9E2]/15 bg-[#202625] text-xs text-[#E8E9E2] cursor-pointer"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.15).toFixed(2)))}
              className="w-7 h-7 border border-[#E8E9E2]/15 bg-[#202625] text-xs text-[#E8E9E2] cursor-pointer"
            >
              −
            </button>
          </div>

          <svg
            viewBox="0 0 440 400"
            className="w-full max-w-[440px] h-auto transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* Contour elevation ellipses */}
            {[55, 95, 140, 185].map((r, i) => (
              <ellipse
                key={r}
                cx="220"
                cy={190 + i * 6}
                rx={r * 0.9}
                ry={r * 1.15}
                fill="none"
                stroke="rgba(190,189,178,0.12)"
                strokeDasharray={i % 2 === 1 ? "3 4" : undefined}
              />
            ))}

            {/* Causeway spine */}
            <line
              x1="220"
              y1={mapYFromZ(26)}
              x2="220"
              y2={mapYFromZ(-26)}
              stroke="rgba(232,233,226,0.22)"
              strokeWidth="1.5"
            />

            {/* Region boundaries */}
            {REGIONS.map((reg) => {
              const known = discoveredRegions.includes(reg.id);
              const yCenter = mapYFromZ(reg.center.z);
              return (
                <g key={reg.id} opacity={known ? 1 : 0.35}>
                  <rect
                    x="130"
                    y={yCenter - 38}
                    width="180"
                    height="76"
                    fill="none"
                    stroke={selectedRegion.id === reg.id ? "#B99A70" : "rgba(232,233,226,0.16)"}
                  />
                  <text
                    x="138"
                    y={yCenter - 22}
                    fill="#8F938C"
                    fontSize="9"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {reg.indexLabel}
                  </text>
                </g>
              );
            })}

            {/* Discovered landmarks (click to set 3D sky waypoint) */}
            {INTERACTABLES.map((item) => {
              const known = discoveredRegions.includes(item.region);
              const recorded = item.journalId ? journalDiscovered[item.journalId] : false;
              const ix = mapXFromX(item.x);
              const iy = mapYFromZ(item.z);
              return (
                <g
                  key={item.id}
                  onClick={() => onSetWaypoint?.(item.id, item.label)}
                  style={{ cursor: "pointer" }}
                  opacity={known ? 1 : 0.45}
                >
                  <circle
                    cx={ix}
                    cy={iy}
                    r="4.2"
                    fill={recorded ? "#89988A" : "none"}
                    stroke={recorded ? "#89988A" : "#B99A70"}
                    strokeWidth="1.2"
                  />
                  <text
                    x={ix + 7}
                    y={iy + 3}
                    fill="#BEBDB2"
                    fontSize="8.5"
                    fontFamily="Inter, sans-serif"
                  >
                    {item.label}
                  </text>
                </g>
              );
            })}

            {waypoint && (
              <g>
                <circle
                  cx={mapXFromX(waypoint.x)}
                  cy={mapYFromZ(waypoint.z)}
                  r="8"
                  fill="none"
                  stroke="#B99A70"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />
              </g>
            )}

            {/* Current explorer position (restrained circular marker) */}
            <circle
              cx={mapXFromX(player.x)}
              cy={mapYFromZ(player.z)}
              r="5.5"
              fill="none"
              stroke="#F5F3ED"
              strokeWidth="1.2"
            />
            <circle cx={mapXFromX(player.x)} cy={mapYFromZ(player.z)} r="2" fill="#F5F3ED" />
          </svg>
        </div>

        {/* Right: Selected Location Description */}
        <div className="lg:col-span-3 flex flex-col justify-between p-4 border border-[#E8E9E2]/10 bg-[#202625]/50">
          <div>
            <div className="as-tech-label uppercase text-[#B99A70]">
              {selectedRegion.indexLabel}
            </div>
            <h3 className="as-serif text-2xl text-[#F5F3ED] mt-1">
              {discoveredRegions.includes(selectedRegion.id)
                ? selectedRegion.name
                : "Uncharted Horizon"}
            </h3>
            <p className="as-body text-[#BEBDB2] mt-3">
              {discoveredRegions.includes(selectedRegion.id)
                ? selectedRegion.subtitle
                : "Terrain remains beyond direct calibration. Traverse northward to map contours."}
            </p>
          </div>

          <div className="pt-4 border-t border-[#E8E9E2]/12 space-y-1">
            <div className="as-tech-label uppercase text-[#8F938C]">Current Coordinates</div>
            <div className="as-mono text-xs text-[#E8E9E2]">
              X {player.x.toFixed(2)} • Z {player.z.toFixed(2)} • Scale 1:{Math.round(400 / zoom)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

MapOverlay.propTypes = {
  player: PropTypes.object.isRequired,
  regionId: PropTypes.string.isRequired,
  discoveredRegions: PropTypes.array.isRequired,
  journalDiscovered: PropTypes.object.isRequired,
  waypoint: PropTypes.object,
  onSetWaypoint: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

export default MapOverlay;

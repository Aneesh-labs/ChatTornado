import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Compass,
  Eye,
  KeyRound,
  Wrench,
  Radio,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  RotateCw,
  ArrowUpDown,
  Lock,
  Unlock,
} from "lucide-react";
import { ROLE_META } from "./nullNorthMeta";

export const RoleBriefingModal = ({ isOpen, capabilities, onClose }) => {
  if (!isOpen) return null;
  const list = capabilities?.length ? capabilities : ["CARTOGRAPHER"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-3xl border border-cyan-500/35 bg-[#090d16] p-6 shadow-2xl max-h-[90dvh] overflow-y-auto">
        <div className="text-xs font-bold uppercase tracking-widest text-cyan-400">
          Neural Role Briefing
        </div>
        <h3 className="text-2xl font-black text-white mt-1">
          {list.map((c) => ROLE_META[c]?.title || c).join(" + ")}
        </h3>
        <p className="text-sm text-slate-300 mt-1">
          You see only your authorized dimension layer. Communicate clearly in Squad Comms to survive.
        </p>

        <div className="mt-4 space-y-4">
          {list.map((cap) => {
            const meta = ROLE_META[cap];
            if (!meta) return null;
            const Icon = meta.Icon;
            return (
              <div key={cap} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border ${meta.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-base font-black text-white">{meta.title}</div>
                    <div className="text-xs text-slate-400">{meta.sub}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Capabilities
                  </div>
                  <ul className="space-y-1 text-xs text-slate-200 list-disc pl-4">
                    {meta.abilities.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-300 mb-1">
                    Blind Spots
                  </div>
                  <ul className="space-y-1 text-xs text-slate-400 list-disc pl-4">
                    {meta.limits.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:brightness-110 text-slate-950 font-black text-sm tracking-wide cursor-pointer transition active:scale-[0.99]"
        >
          ENTER LABYRINTH HUD
        </button>
      </div>
    </div>
  );
};

RoleBriefingModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  capabilities: PropTypes.arrayOf(PropTypes.string),
  onClose: PropTypes.func.isRequired,
};

export const CartographerDeck = ({ layer, currentRoomId, energy, onAction, busy }) => {
  const [pingLabel, setPingLabel] = useState("SAFE");
  const [pingRoom, setPingRoom] = useState(currentRoomId || "R0");

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
            <Compass className="w-4 h-4" /> Cartographer Layer
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {layer.rooms?.length || 0} chambers • {layer.edges?.length || 0} corridors mapped
          </p>
        </div>

        <button
          type="button"
          disabled={busy || energy < 15}
          onClick={() => onAction("SCAN_MAP", {})}
          className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-40 border border-cyan-400/40 text-xs font-black text-cyan-200 flex items-center gap-1.5 cursor-pointer"
        >
          <Radio className="w-3.5 h-3.5" />
          Scan All (-15⚡)
        </button>
      </div>

      <div className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-2.5">
        <div className="text-xs font-bold text-slate-200">Broadcast Squad Beacon (-5⚡)</div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={pingRoom}
            onChange={(e) => setPingRoom(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#070b14] border border-white/15 text-xs font-semibold text-white outline-none"
          >
            {(layer.rooms || []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} — {r.name}
              </option>
            ))}
          </select>

          <select
            value={pingLabel}
            onChange={(e) => setPingLabel(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#070b14] border border-white/15 text-xs font-semibold text-white outline-none"
          >
            <option value="SAFE">SAFE ROUTE</option>
            <option value="GOTO">GO HERE</option>
            <option value="AVOID">AVOID SECTOR</option>
            <option value="EXIT">EXTRACTION</option>
          </select>
        </div>

        <button
          type="button"
          disabled={busy || energy < 5}
          onClick={() => onAction("PING_ROOM", { room_id: pingRoom, label: pingLabel })}
          className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-black text-xs cursor-pointer transition"
        >
          Transmit Beacon Ping
        </button>
      </div>
    </div>
  );
};

CartographerDeck.propTypes = {
  layer: PropTypes.object.isRequired,
  currentRoomId: PropTypes.string,
  energy: PropTypes.number.isRequired,
  onAction: PropTypes.func.isRequired,
  busy: PropTypes.bool,
};

export const SeerDeck = ({ layer, energy, onAction, busy }) => {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> Seer Threat Radar
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Next flux in {layer.instability_countdown}s
          </p>
        </div>

        <button
          type="button"
          disabled={busy || energy < 15}
          onClick={() => onAction("SCAN_HAZARDS", {})}
          className="px-3.5 py-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 disabled:opacity-40 border border-violet-400/40 text-xs font-black text-violet-200 flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Deep Scan (-15⚡)
        </button>
      </div>

      <div className="p-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-100 leading-relaxed">{layer.next_shift_warning}</div>
      </div>

      <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1 custom-scrollbar">
        {(layer.hazards || []).length === 0 ? (
          <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] text-xs text-slate-400 text-center">
            No hazards on adjacent edges yet. Run Deep Scan (-15⚡) to sweep all sectors!
          </div>
        ) : (
          layer.hazards.map((h) => (
            <div
              key={h.edge_id}
              className="p-3 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-between gap-3"
            >
              <div>
                <div className="text-xs font-black text-white uppercase">
                  {h.between} • {h.hazard.replace("_", " ")}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {h.stabilized ? "Stabilized — safe passage" : "Active anomaly on corridor"}
                </div>
              </div>
              {h.stabilized ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Clear
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busy || energy < 18}
                  onClick={() => onAction("STABILIZE_HAZARD", { edge_id: h.edge_id })}
                  className="px-3 py-2 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white text-xs font-black cursor-pointer shrink-0"
                >
                  Stabilize (-18⚡)
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

SeerDeck.propTypes = {
  layer: PropTypes.object.isRequired,
  energy: PropTypes.number.isRequired,
  onAction: PropTypes.func.isRequired,
  busy: PropTypes.bool,
};

export const DecoderDeck = ({ layer, energy, onAction, busy }) => {
  const puzzles = layer.puzzles || [];
  const [selectedPid, setSelectedPid] = useState(() => puzzles[0]?.id || "");
  const [slots, setSlots] = useState(["Δ", "Ω", "Ψ"]);

  const activePuzzle = puzzles.find((p) => p.id === selectedPid) || puzzles[0];
  const glyphs = activePuzzle?.glyph_options || ["Δ", "Ω", "Ψ", "◈", "⬡", "✧"];

  const cycleSlot = (idx) => {
    setSlots((prev) => {
      const next = [...prev];
      const curIdx = glyphs.indexOf(next[idx]);
      next[idx] = glyphs[(curIdx + 1) % glyphs.length];
      return next;
    });
  };

  return (
    <div className="space-y-3.5">
      <div>
        <div className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
          <KeyRound className="w-4 h-4" /> Decoder Cipher Matrix
        </div>
        {layer.current_room_inscription && (
          <p className="text-xs text-amber-200/80 mt-0.5">{layer.current_room_inscription}</p>
        )}
      </div>

      {/* Door Lock Selector Pills */}
      <div className="flex flex-wrap gap-1.5">
        {puzzles.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedPid(p.id)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
              activePuzzle?.id === p.id
                ? "bg-amber-500/25 border-amber-400 text-amber-200"
                : "bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]"
            }`}
          >
            {p.solved ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
            {p.lock_name}
          </button>
        ))}
      </div>

      {activePuzzle && (
        <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.03] space-y-3">
          <div className="text-xs text-cyan-200 font-semibold">
            Resonance Clue: <span className="text-amber-300">{activePuzzle.clue}</span>
          </div>

          {activePuzzle.solved ? (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-xs font-black text-emerald-300 text-center">
              GATE SEAL BYPASSED — PASSAGE OPEN
            </div>
          ) : (
            <>
              {/* Interactive 3-Slot Glyph Sequencer */}
              <div className="grid grid-cols-3 gap-2.5">
                {slots.map((sym, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => cycleSlot(idx)}
                    className="py-3 rounded-2xl border border-amber-400/40 bg-[#070b14] hover:bg-amber-500/10 text-2xl font-black text-amber-200 flex flex-col items-center justify-center cursor-pointer transition active:scale-95"
                    title="Tap to cycle glyph"
                  >
                    <span>{sym}</span>
                    <span className="text-[11px] font-bold text-slate-400 mt-0.5">Slot {idx + 1}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={busy || energy < 12}
                onClick={() => onAction("DECODE_DOOR", { puzzle_id: activePuzzle.id, sequence: slots })}
                className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-black text-xs cursor-pointer transition"
              >
                Transmit Sequence (-12⚡)
              </button>
            </>
          )}

          {/* Previous Mastermind Resonance Attempts */}
          {(activePuzzle.attempts || []).length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-white/10 max-h-[115px] overflow-y-auto">
              {activePuzzle.attempts.map((att, i) => (
                <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-black/30">
                  <span className="font-mono font-bold text-white tracking-widest">
                    {att.sequence.join(" ")}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-300 font-bold">{att.exact} Exact</span>
                    <span className="text-amber-300 font-bold">{att.misplaced} Misplaced</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

DecoderDeck.propTypes = {
  layer: PropTypes.object.isRequired,
  energy: PropTypes.number.isRequired,
  onAction: PropTypes.func.isRequired,
  busy: PropTypes.bool,
};

export const ArchitectDeck = ({ layer, energy, onAction, busy }) => {
  return (
    <div className="space-y-3.5">
      <div>
        <div className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
          <Wrench className="w-4 h-4" /> Architect Structural Controls
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Activate dormant spans &amp; rotate hubs. Safety interlock prevents deadlocks.
        </p>
      </div>

      {/* Bridges */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-200">Quantum Bridges (-16⚡)</div>
        {(layer.bridges || []).length === 0 ? (
          <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02] text-xs text-slate-400">
            No toggleable bridges in this layout. Use Chamber Rotation below.
          </div>
        ) : (
          layer.bridges.map((b) => (
            <div
              key={b.edge_id}
              className="p-3 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-between gap-2"
            >
              <div className="text-xs font-bold text-white">
                Span {b.a} ↔ {b.b}
                <span className={`ml-2 text-xs ${b.active ? "text-emerald-300" : "text-slate-400"}`}>
                  ({b.active ? "ONLINE" : "DORMANT"})
                </span>
              </div>
              <button
                type="button"
                disabled={busy || energy < 16}
                onClick={() => onAction("TOGGLE_BRIDGE", { edge_id: b.edge_id })}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 disabled:opacity-40 border border-emerald-400/40 text-xs font-black text-emerald-200 flex items-center gap-1 cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                Toggle
              </button>
            </div>
          ))
        )}
      </div>

      {/* Rotatable Chambers */}
      <div className="space-y-2 max-h-[155px] overflow-y-auto pr-1 custom-scrollbar">
        <div className="text-xs font-bold text-slate-200">Rotatable Hubs (-16⚡)</div>
        {(layer.rotatable_chambers || []).map((c) => (
          <div
            key={c.id}
            className="p-2.5 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-between gap-2"
          >
            <div className="text-xs text-white font-semibold">
              {c.name} • <span className="text-cyan-300">{c.orientation}°</span>
            </div>
            <button
              type="button"
              disabled={busy || energy < 16}
              onClick={() => onAction("ROTATE_ROOM", { room_id: c.id })}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 disabled:opacity-40 border border-cyan-400/40 text-xs font-black text-cyan-200 flex items-center gap-1 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Rotate 90°
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

ArchitectDeck.propTypes = {
  layer: PropTypes.object.isRequired,
  energy: PropTypes.number.isRequired,
  onAction: PropTypes.func.isRequired,
  busy: PropTypes.bool,
};

import React, { useState, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Compass,
  Gamepad2,
  Globe,
  Home,
  MessageSquareText,
  Palette,
  Search,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { MEGA_GAMES_CATALOG } from "./games/megaSuite/megaRegistry";

const CORE_GAMES = [
  { id: "nullnorth", title: "NULL//NORTH", emoji: "🧭", desc: "2-4P Asymmetric Co-Op" },
  { id: "crownchess", title: "Crownfall Chess", emoji: "♔", desc: "Alpha-Beta Royal Chess" },
  { id: "subwaysurfers", title: "Tornado Surfers", emoji: "🏄‍♂️", desc: "3D Rail Runner" },
  { id: "vortexbastion", title: "Vortex Bastion", emoji: "🗼", desc: "3D WebGL Tower Defense" },
  { id: "afterspace", title: "AFTERSPACE v3.0", emoji: "◈", desc: "Open World 4D Explorer" },
  { id: "neonblade", title: "Neon Blade", emoji: "🗡️", desc: "3D Cyber Blade Forge" },
  { id: "snake", title: "Super Snake", emoji: "🐍", desc: "Classic Retro" },
  { id: "flappy", title: "Flappy Tornado", emoji: "🌪️", desc: "60fps Wind Runner" },
  { id: "2048", title: "2048 Tornado", emoji: "🔢", desc: "Tile Merge Puzzle" },
  { id: "memory", title: "Memory Match", emoji: "🧠", desc: "Card Pair Combo" },
  { id: "zombie", title: "Zombie Survival", emoji: "🧟", desc: "Arena Shooter" },
  { id: "neondodge", title: "Neon Dodge", emoji: "🛸", desc: "Near-Miss Graze Jet" },
  { id: "photonpong", title: "Hyper Photon Pong", emoji: "🏓", desc: "v2.0 Spin Physics" },
  { id: "cybertetris", title: "Polyomino Tetris", emoji: "🧱", desc: "v2.0 7-Bag Hard Drop" },
  { id: "crowncheckers", title: "Crown Checkers", emoji: "👑", desc: "v2.0 Forced Captures" },
  { id: "prismbreakout", title: "Prism Breakout", emoji: "💎", desc: "v2.0 Multi-Ball" },
  { id: "asteroidsnova", title: "Voidbreaker Asteroids", emoji: "☄️", desc: "v2.0 360 Thrust" },
  { id: "connect4", title: "Quantum Connect 4", emoji: "🟡", desc: "Alpha-Beta Matrix" },
  { id: "reversi", title: "Eclipse Reversi", emoji: "⚫", desc: "Corner-Smart Othello" },
  { id: "navalsonar", title: "Aegis Naval Sonar", emoji: "🚢", desc: "Radar Armada Duel" },
  { id: "cybermines", title: "Tactical Minesweeper", emoji: "💣", desc: "Flood-Fill & Chord" },
  { id: "sudokuzen", title: "Chrono Sudoku", emoji: "🧩", desc: "9x9 Logic Grid" },
  { id: "synthrhythm", title: "Synth Rhythm 4-Key", emoji: "🎵", desc: "BPM Highway" },
  { id: "gravitydrop", title: "Gravity Merge Drop", emoji: "🫧", desc: "Physics Orb Fuse" },
];

export default function CommandPaletteModal({
  isOpen,
  onClose,
  isAdmin,
  onCycleAccent,
  onOpenAndroid,
  onOpenTour,
}) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo(() => {
    const pages = [
      { id: "nav-home", group: "Navigate", title: "Home Command Deck", sub: "Overview, AI telemetry & quick launch", icon: Home, run: () => navigate("/home") },
      { id: "nav-msg", group: "Navigate", title: "Messages & VORTEX AI", sub: "Encrypted chat & Gemini AI assistant", icon: MessageSquareText, run: () => navigate("/messages") },
      { id: "nav-arcade", group: "Navigate", title: "Arcade Hub (53 Games)", sub: "v3.0 XP Ranks, Quests & Touch Pad", icon: Gamepad2, run: () => navigate("/arcade") },
      { id: "nav-darkweb", group: "Navigate", title: "Dark Web P2P Mesh", sub: "Direct peer transfers & encrypted rooms", icon: Globe, run: () => navigate("/darkweb") },
      { id: "nav-insights", group: "Navigate", title: "Insights & Telemetry", sub: "Activity analytics & charts", icon: BarChart3, run: () => navigate("/insights") },
      { id: "nav-profile", group: "Navigate", title: "Profile", sub: "Identity & account details", icon: UserRound, run: () => navigate("/profile") },
      { id: "nav-settings", group: "Navigate", title: "Settings", sub: "Security, preferences & vault", icon: Settings, run: () => navigate("/settings") },
      ...(isAdmin ? [{ id: "nav-admin", group: "Navigate", title: "Admin Dashboard", sub: "Root telemetry & moderation", icon: Shield, run: () => navigate("/admin") }] : []),
    ];

    const actions = [
      { id: "act-accent", group: "Quick Actions", title: "Cycle Ambient Accent Theme", sub: "Switch Sky / Violet / Emerald / Amber glow", icon: Palette, run: () => onCycleAccent?.() },
      { id: "act-tour", group: "Quick Actions", title: "Open Interactive Tour & Demo", sub: "Guided walkthrough of ChatTornado", icon: Sparkles, run: () => onOpenTour?.() },
      { id: "act-apk", group: "Quick Actions", title: "Get Android App (APK & QR)", sub: "Install native mobile companion", icon: Smartphone, run: () => onOpenAndroid?.() },
    ];

    const games = [...CORE_GAMES, ...MEGA_GAMES_CATALOG].map((g) => ({
      id: `game-${g.id}`,
      group: "Play Arcade Game",
      title: `${g.emoji || "🎮"} ${g.title}`,
      sub: g.desc || "Launch directly in Arcade",
      icon: Compass,
      run: () => navigate(`/arcade?game=${encodeURIComponent(g.id)}`),
    }));

    const all = [...pages, ...actions, ...games];
    const q = query.trim().toLowerCase();
    if (!q) return [...pages, ...actions, ...games.slice(0, 6)];
    return all.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.sub.toLowerCase().includes(q) ||
        it.group.toLowerCase().includes(q)
    ).slice(0, 24);
  }, [isAdmin, navigate, onCycleAccent, onOpenAndroid, onOpenTour, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (items.length ? (i + 1) % items.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
      } else if (e.key === "Enter" && items[activeIndex]) {
        e.preventDefault();
        items[activeIndex].run();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, isOpen, items, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-md flex items-start justify-center p-3 sm:p-6 pt-12 sm:pt-20"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl border border-white/15 bg-[#0a0f1d] shadow-2xl overflow-hidden flex flex-col max-h-[78vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
          <Search className="h-4 w-4 text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to any page, action, or 53 Arcade games..."
            aria-label="Command palette search"
            className="flex-1 bg-transparent text-sm font-semibold text-white placeholder:text-white/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs text-white/50">
              No matching pages, actions, or games.
            </div>
          ) : (
            items.map((item, idx) => {
              const Icon = item.icon;
              const selected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    item.run();
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left transition cursor-pointer ${
                    selected
                      ? "bg-sky-500/20 border border-sky-400/40 text-white"
                      : "border border-transparent text-white/80 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="h-9 w-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-sky-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate">{item.title}</div>
                    <div className="text-xs text-white/50 truncate">{item.sub}</div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/55 shrink-0">
                    {item.group}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[11px] text-white/45">
          <span>↑↓ Navigate • Enter Launch • Esc Close</span>
          <span className="font-mono">Ctrl+K / ⌘K</span>
        </div>
      </div>
    </div>
  );
}

CommandPaletteModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  isAdmin: PropTypes.bool,
  onCycleAccent: PropTypes.func,
  onOpenAndroid: PropTypes.func,
  onOpenTour: PropTypes.func,
};

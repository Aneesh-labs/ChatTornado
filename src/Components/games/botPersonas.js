/**
 * 4 Bot Intelligence Tiers shared across Arcade AI opponents and the Gemini Co-Pilot.
 */

export const BOT_TIERS = [
  {
    id: "rookie",
    name: "Sparky",
    level: 1,
    label: "Lv.1 Rookie",
    iq: 85,
    emoji: "🤖",
    tone: "text-emerald-300 bg-emerald-500/15 border-emerald-400/35",
    desc: "Playful & forgiving — makes casual moves so you can learn the ropes.",
    promptPrefix: "Respond as Sparky (Lv.1 Rookie Bot): upbeat, casual, beginner-friendly tips.",
  },
  {
    id: "tactician",
    name: "Cipher",
    level: 2,
    label: "Lv.2 Tactician",
    iq: 115,
    emoji: "🦊",
    tone: "text-cyan-300 bg-cyan-500/15 border-cyan-400/35",
    desc: "Balanced & observant — blocks obvious threats and plays steady combos.",
    promptPrefix: "Respond as Cipher (Lv.2 Tactician Bot): concise tactical hints and balanced strategy.",
  },
  {
    id: "mastermind",
    name: "Valkyrie",
    level: 3,
    label: "Lv.3 Mastermind",
    iq: 145,
    emoji: "🦉",
    tone: "text-violet-300 bg-violet-500/15 border-violet-400/35",
    desc: "Sharp heuristic evaluator — hunts extra turns, traps, and high-value plays.",
    promptPrefix: "Respond as Valkyrie (Lv.3 Mastermind Bot): sharp, analytical optimization advice.",
  },
  {
    id: "apex",
    name: "VORTEX Apex",
    level: 4,
    label: "Lv.4 Apex AI",
    iq: 180,
    emoji: "🐉",
    tone: "text-amber-300 bg-amber-500/15 border-amber-400/40",
    desc: "Maximum intelligence — optimal math, 2-ply lookahead & ruthless precision.",
    promptPrefix: "Respond as VORTEX Apex (Lv.4 Grandmaster AI): elite optimal theory and ruthless win paths.",
  },
];

export function getBotTier(id) {
  return BOT_TIERS.find((b) => b.id === id) || BOT_TIERS[1];
}

export function getActiveBotTierId() {
  try {
    return localStorage.getItem("arcade_bot_tier") || "tactician";
  } catch (_) {
    return "tactician";
  }
}

export function setActiveBotTierId(id) {
  const valid = getBotTier(id).id;
  try {
    localStorage.setItem("arcade_bot_tier", valid);
  } catch (_) {}
  if (typeof window !== "undefined") {
    window.__arcadeBotTier = valid;
    window.dispatchEvent(new CustomEvent("arcade:bot-tier-changed", { detail: { tier: valid } }));
  }
  return valid;
}

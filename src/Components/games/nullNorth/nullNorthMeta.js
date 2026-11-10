import { Compass, Eye, KeyRound, Wrench } from "lucide-react";

export const ROLE_META = {
  CARTOGRAPHER: {
    title: "Cartographer",
    sub: "Navigation Specialist",
    accent: "text-cyan-300 border-cyan-400/35 bg-cyan-500/10",
    badge: "bg-cyan-500/20 text-cyan-200 border-cyan-400/35",
    Icon: Compass,
    abilities: [
      "Views full labyrinth chamber layout & corridor topology in 3D.",
      "Executes Map Scans (-15⚡) to expose Cipher Vault & Recharge pods.",
      "Places SAFE / AVOID / EXIT beacons visible to all operatives.",
    ],
    limits: [
      "Cannot detect hidden dimensional traps or unstable fields.",
      "Cannot read locked gate cipher sequences.",
    ],
  },
  SEER: {
    title: "Seer",
    sub: "Threat & Entropy Specialist",
    accent: "text-violet-300 border-violet-400/35 bg-violet-500/10",
    badge: "bg-violet-500/20 text-violet-200 border-violet-400/35",
    Icon: Eye,
    abilities: [
      "Detects Distortion, Instability, False Passages & Lockdowns on radar.",
      "Receives advance Instability Shift warnings before sectors mutate.",
      "Stabilizes dangerous corridors (-18⚡) & revives downed teammates.",
    ],
    limits: [
      "Cannot view global room coordinates or distant layout connections.",
      "Relies on Cartographer directions to navigate safely.",
    ],
  },
  DECODER: {
    title: "Decoder",
    sub: "Cipher & Symbol Specialist",
    accent: "text-amber-300 border-amber-400/35 bg-amber-500/10",
    badge: "bg-amber-500/20 text-amber-200 border-amber-400/35",
    Icon: KeyRound,
    abilities: [
      "Reads dimensional runes & partial cipher clues from chambers.",
      "Solves 3-glyph locks using resonance (Exact / Misplaced) feedback.",
      "Unlocks the Extraction Gate seal for team escape.",
    ],
    limits: [
      "Cannot see map layout or hazard fields along corridors.",
      "Needs squad updates when entering Clue Vault chambers.",
    ],
  },
  ARCHITECT: {
    title: "Architect",
    sub: "Structural Manipulation Specialist",
    accent: "text-emerald-300 border-emerald-400/35 bg-emerald-500/10",
    badge: "bg-emerald-500/20 text-emerald-200 border-emerald-400/35",
    Icon: Wrench,
    abilities: [
      "Activates or retracts dormant dimensional bridges (-16⚡).",
      "Rotates junction chambers (-16⚡) to align passages & clear locks.",
      "Protected by server safety interlocks so extraction stays possible.",
    ],
    limits: [
      "Does not see hidden hazard types or gate symbol solutions.",
      "Must coordinate before retracting bridges behind teammates.",
    ],
  },
};

import API from "./API";

const PROFILE_STORAGE_KEY = "chattornado_arcade_ai_profile_v1";

export const DEFAULT_AI_PROFILE = {
  callsign: "Explorer",
  playstyle: "Adaptive Strategist",
  voiceEnabled: false,
  selectedSurferId: "vanguard",
  selectedAfterspaceRole: "aria",
};

export function loadArcadeAiProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? { ...DEFAULT_AI_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_AI_PROFILE };
  } catch (_) {
    return { ...DEFAULT_AI_PROFILE };
  }
}

export function saveArcadeAiProfile(patch) {
  const next = { ...loadArcadeAiProfile(), ...patch };
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
  } catch (_) {}
  return next;
}

export async function fetchPersonalizedPersonaSummary() {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) return null;
    const res = await API.get("/api/ai/persona", { params: { token } });
    return res.data?.persona || null;
  } catch (_) {
    return null;
  }
}

export async function saveBackendPersonaPreference(profile) {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) return false;
    await API.post(
      `/api/ai/persona?token=${encodeURIComponent(token)}`,
      {
        callsign: profile.callsign,
        role: profile.playstyle,
        interests: `Arcade & 3D Exploration (${profile.selectedSurferId}, ${profile.selectedAfterspaceRole})`,
        ai_memory_consent: true,
        custom_instructions: "Personalize coaching, lore notes, and prize milestones concisely.",
      }
    );
    return true;
  } catch (_) {
    return false;
  }
}

export async function askPersonalizedCompanion({
  gameId,
  prompt,
  playerContext = {},
  previousInteractionId = null,
}) {
  const profile = loadArcadeAiProfile();
  const mergedContext = {
    callsign: profile.callsign,
    playstyle: profile.playstyle,
    ...playerContext,
  };

  try {
    const token = sessionStorage.getItem("token");
    if (token) {
      const res = await API.post(
        `/api/ai/arcade-companion?token=${encodeURIComponent(token)}`,
        {
          game_id: gameId,
          prompt,
          player_context: mergedContext,
          previous_interaction_id: previousInteractionId,
        }
      );
      if (res.data?.reply) {
        return res.data;
      }
    }
  } catch (_) {}

  // Offline/guest personalized fallback using profile & telemetry
  const name = mergedContext.callsign || "Explorer";
  const prizes = mergedContext.prizes || [];
  const score = mergedContext.score || 0;
  const region = mergedContext.region || "";
  const charName = mergedContext.character || "Vanguard";

  if (gameId === "afterspace") {
    const guidance =
      region === "The Forgotten Gateway"
        ? "Examine the Ancient Oculus Gate [E], scan Temporal Residue [Q], then shift Timeline [T] to cross."
        : region === "The Fractured Observatory"
        ? "Inspect the Astrolabe Slab for the XW 045° / YW 035° coordinates before heading north."
        : "Align XW near 045° and YW near 035° inside the Central Hypercube to unseal the Dimensional Threshold.";
    return {
      reply: `${name} (${charName} • ${profile.playstyle}): ${prizes.length} specimens logged. ${guidance}`,
      interaction_id: null,
      model: "personalized-local",
      personalized: true,
    };
  }

  const tip =
    profile.playstyle === "Collector"
      ? "Prioritize Magnet & Coin arcs on train roofs to unlock all 4 Characters and 6 Vault Prizes faster."
      : profile.playstyle === "Speedrunner"
      ? "Chain ramp-to-train-roof leaps for +50 Stunts and use Hoverboard Shield blasts through heavy Express waves."
      : "Blend rooftop leaps with clean lane timing — next prize milestone is within reach!";

  return {
    reply: `${name} (${charName}) — Best ${score.toLocaleString()}, ${prizes.length} Prizes unlocked. ${tip}`,
    interaction_id: null,
    model: "personalized-local",
    personalized: true,
  };
}

export async function requestLiveVoiceToken(gameId = "subwaysurfers") {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) return { available: false, reason: "Sign in required for Live API token" };
    const res = await API.post(
      `/api/ai/live-token?game_id=${encodeURIComponent(gameId)}&token=${encodeURIComponent(token)}`
    );
    return res.data || { available: false };
  } catch (_) {
    return { available: false, reason: "Live voice endpoint unavailable offline" };
  }
}

export function speakCompanionLine(text, enabled = true) {
  if (!enabled || !text || typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.02;
    utter.pitch = 0.98;
    window.speechSynthesis.speak(utter);
  } catch (_) {}
}

import API from "./API";

const PROFILE_STORAGE_KEY = "chattornado_arcade_ai_profile_v1";

export const DEFAULT_AI_PROFILE = {
  callsign: "Explorer",
  playstyle: "Adaptive Strategist",
  voiceEnabled: false,
  ttsVoice: "Kore",
  selectedSurferId: "vanguard",
  selectedAfterspaceRole: "aria",
  emblemDataUrl: "",
  emblemLabel: "",
};

const GAME_SCORE_KEYS = {
  snake: "snake_highscore",
  flappy: "flappy_highscore",
  2048: "2048_highscore",
  memory: "memory_highscore",
  zombie: "zombie_highscore",
  neondodge: "neondodge_highscore",
  neonblade: "neonblade_highscore",
  subwaysurfers: "subwaysurfers_highscore",
  vortexbastion: "vortexbastion_highscore",
  nullnorth: "nullnorth_highscore",
  afterspace: "afterspace_highscore",
};

export function collectArcadeHighScores() {
  const out = {};
  if (typeof localStorage === "undefined") return out;
  Object.entries(GAME_SCORE_KEYS).forEach(([id, key]) => {
    try {
      const val = Number(localStorage.getItem(key) || 0);
      if (val > 0) out[id] = val;
    } catch (_) {}
  });
  return out;
}

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

export function inferLocalToolActions(gameId, prompt = "") {
  const low = (prompt || "").toLowerCase();
  const actions = [];
  if (gameId === "afterspace") {
    if (low.includes("past")) actions.push({ name: "set_temporal_state", arguments: { state_id: "PAST" } });
    else if (low.includes("future")) actions.push({ name: "set_temporal_state", arguments: { state_id: "FUTURE" } });
    else if (low.includes("present")) actions.push({ name: "set_temporal_state", arguments: { state_id: "PRESENT" } });

    if (low.includes("sundial") || low.includes("west")) {
      actions.push({ name: "set_waypoint_beacon", arguments: { target_id: "int_sundial_obelisk", label: "Sundial Gnomon" } });
    } else if (low.includes("pillar") || low.includes("east")) {
      actions.push({ name: "set_waypoint_beacon", arguments: { target_id: "int_echo_pillars", label: "Harmonic Pillars" } });
    } else if (low.includes("beacon") || low.includes("south")) {
      actions.push({ name: "set_waypoint_beacon", arguments: { target_id: "int_southern_beacon", label: "Horizon Beacon" } });
    } else if (low.includes("hypercube") || low.includes("tesseract")) {
      actions.push({ name: "set_waypoint_beacon", arguments: { target_id: "int_tesseract", label: "Central Hypercube" } });
    }
    if (low.includes("scan")) {
      actions.push({ name: "toggle_scanner", arguments: { active: true } });
    }
  } else {
    const mapGames = ["afterspace", "subwaysurfers", "nullnorth", "vortexbastion", "neonblade", "snake", "flappy", "2048", "memory", "zombie", "neondodge"];
    for (const gid of mapGames) {
      if (low.includes(`launch ${gid}`) || low.includes(`open ${gid}`) || low.includes(`play ${gid}`)) {
        actions.push({ name: "launch_arcade_game", arguments: { game_id: gid } });
        break;
      }
    }
  }
  return actions;
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

  // Offline/guest personalized fallback using profile & telemetry across all 11 Arcade games
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
      tool_actions: inferLocalToolActions(gameId, prompt),
    };
  }

  const genericTips = {
    snake: "Sweep outer walls smoothly before looping inward for +25 golden apples.",
    flappy: "Aim centers of gaps to catch +3 Golden Wind Crystals without over-pumping.",
    "2048": "Pin your largest tile into one fixed corner and stack descending chains along that edge.",
    memory: "Build early pair certainty cleanly so streak multipliers compound past x4.",
    zombie: "Kite infected rings along wide arcs and detonate EMP bombs only when boxed in.",
    neondodge: "Skim just beside laser wings for +15 Graze chains while Shield is active.",
    neonblade: "Wait for Razor Graze flash alignment to stack Overdrive 2X multipliers on bosses.",
    vortexbastion: "Pair Cryo slow pylons upfront with Rail/Mortar crossfire before Wave 5 Dreadnought.",
    nullnorth: "Share decoded glyph sequence early with your partner to beat entropy lock.",
  };

  const tip =
    genericTips[gameId] ||
    (profile.playstyle === "Collector"
      ? "Prioritize Magnet & Coin arcs on train roofs to unlock all 4 Characters and 6 Vault Prizes faster."
      : profile.playstyle === "Speedrunner"
      ? "Chain ramp-to-train-roof leaps for +50 Stunts and use Hoverboard Shield blasts through heavy Express waves."
      : "Blend rooftop leaps with clean lane timing — next prize milestone is within reach!");

  return {
    reply: `${name} (${charName}) — Best ${score.toLocaleString()}, ${prizes.length} Prizes unlocked. ${tip}`,
    interaction_id: null,
    model: "personalized-local",
    personalized: true,
    tool_actions: inferLocalToolActions(gameId, prompt),
  };
}

export async function generateArcadeMission({ gameId = "auto", highScores = null } = {}) {
  const profile = loadArcadeAiProfile();
  const scores = highScores || collectArcadeHighScores();

  try {
    const token = sessionStorage.getItem("token");
    if (token) {
      const res = await API.post(
        `/api/ai/arcade-mission?token=${encodeURIComponent(token)}`,
        {
          game_id: gameId,
          high_scores: scores,
          player_context: { callsign: profile.callsign, playstyle: profile.playstyle },
        }
      );
      if (res.data?.title) return res.data;
    }
  } catch (_) {}

  const chosen =
    gameId !== "auto"
      ? gameId
      : Object.keys(scores)[0] || "subwaysurfers";
  const prev = Number(scores[chosen] || 0);
  const target = Math.max(1000, Math.round(prev * 1.25) + 350);
  return {
    recommended_game: chosen,
    title: `${profile.callsign}'s ${profile.playstyle.split(" ")[0]} Trial`,
    objective: `Score ${target.toLocaleString()} pts in ${chosen} cleanly.`,
    target_score: target,
    strategy_tip: "Keep your tempo disciplined and chain multiplier windows before taking risks.",
    live_callout: `${profile.callsign}, your next target in ${chosen} is ${target.toLocaleString()}!`,
    model: "personalized-local",
    personalized: true,
  };
}

export async function generateArcadeEmblem({ gameId = "afterspace", achievement = "Master Explorer" } = {}) {
  const profile = loadArcadeAiProfile();
  try {
    const token = sessionStorage.getItem("token");
    if (token) {
      const res = await API.post(
        `/api/ai/arcade-emblem?token=${encodeURIComponent(token)}`,
        { game_id: gameId, achievement, callsign: profile.callsign }
      );
      if (res.data?.available && res.data?.image_base64) {
        const mime = res.data.mime_type || "image/png";
        const dataUrl = `data:${mime};base64,${res.data.image_base64}`;
        saveArcadeAiProfile({ emblemDataUrl: dataUrl, emblemLabel: `${gameId} • ${achievement}` });
        return { ...res.data, dataUrl };
      }
    }
  } catch (_) {}
  return { available: false, dataUrl: null, model: "svg-local" };
}

export async function requestLiveVoiceToken(gameId = "subwaysurfers", extendedThinking = false) {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) return { available: false, reason: "Sign in required for Live API token" };
    const res = await API.post(
      `/api/ai/live-token?game_id=${encodeURIComponent(gameId)}&extended_thinking=${extendedThinking}&token=${encodeURIComponent(token)}`
    );
    return res.data || { available: false };
  } catch (_) {
    return { available: false, reason: "Live voice endpoint unavailable offline" };
  }
}

export async function speakCompanionLine(text, enabled = true, style = "calm yet engaging") {
  if (!enabled || !text) return;
  const profile = loadArcadeAiProfile();

  try {
    const token = sessionStorage.getItem("token");
    if (token) {
      const res = await API.post(
        `/api/ai/arcade-tts?token=${encodeURIComponent(token)}`,
        { text, style, voice: profile.ttsVoice || "Kore" }
      );
      if (res.data?.available && res.data?.audio_base64) {
        const mime = res.data.mime_type || "audio/wav";
        const audio = new Audio(`data:${mime};base64,${res.data.audio_base64}`);
        audio.play().catch(() => {});
        return;
      }
    }
  } catch (_) {}

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.02;
      utter.pitch = 0.98;
      window.speechSynthesis.speak(utter);
    } catch (_) {}
  }
}

/**
 * Lightweight browser Gemini 3.8 Live WebSocket client using official @google/genai SDK
 * with ephemeral server tokens, 16kHz mic PCM uplink, 24kHz PCM playback, and Hybrid VAD.
 */
export class ArcadeLiveClient {
  constructor({ onStatus, onInputTranscript, onOutputTranscript, onToolCall, onError } = {}) {
    this.onStatus = onStatus;
    this.onInputTranscript = onInputTranscript;
    this.onOutputTranscript = onOutputTranscript;
    this.onToolCall = onToolCall;
    this.onError = onError;
    this.session = null;
    this.micStream = null;
    this.audioCtx = null;
    this.processor = null;
    this.nextPlayTime = 0;
    this.activeSources = new Set();
    this.connected = false;
  }

  async connect({ gameId = "arcade", extendedThinking = false } = {}) {
    this.disconnect();
    this.onStatus?.("minting-token");
    const tokenRes = await requestLiveVoiceToken(gameId, extendedThinking);
    if (!tokenRes?.available || !tokenRes?.token) {
      this.onStatus?.("offline");
      return { ok: false, reason: tokenRes?.reason || "Ephemeral token unavailable" };
    }

    try {
      this.onStatus?.("connecting");
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: tokenRes.token, apiVersion: "v1alpha" });
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      this.nextPlayTime = this.audioCtx.currentTime;

      const model = tokenRes.model || "gemini-3.8-live";
      this.session = await ai.live.connect({
        model,
        config: { responseModalities: ["AUDIO"] },
        callbacks: {
          onopen: () => {
            this.connected = true;
            this.onStatus?.("connected");
          },
          onmessage: (msg) => {
            if (msg?.toolCall?.functionCalls?.length && this.onToolCall) {
              const responses = msg.toolCall.functionCalls.map((fc) => {
                const outcome = this.onToolCall(fc.name, fc.args || {});
                return {
                  id: fc.id,
                  name: fc.name,
                  response: { result: outcome || "executed" },
                };
              });
              try {
                this.session?.sendToolResponse?.({ functionResponses: responses });
              } catch (_) {}
            }
            const content = msg?.serverContent;
            if (!content) return;
            if (content.interrupted) {
              this.clearPlaybackQueue();
            }
            if (content.inputTranscription?.text) {
              this.onInputTranscript?.(content.inputTranscription.text);
            }
            if (content.outputTranscription?.text) {
              this.onOutputTranscript?.(content.outputTranscription.text);
            }
            if (content.modelTurn?.parts) {
              for (const part of content.modelTurn.parts) {
                if (part.inlineData?.data) {
                  this.enqueuePcm24k(part.inlineData.data);
                }
              }
            }
          },
          onerror: (err) => {
            this.onError?.(err?.message || "Live stream error");
          },
          onclose: () => {
            this.connected = false;
            this.onStatus?.("closed");
          },
        },
      });
      return { ok: true, model };
    } catch (err) {
      this.onStatus?.("error");
      this.onError?.(err?.message || "Live connect failed");
      return { ok: false, reason: err?.message };
    }
  }

  sendTextTelemetry(text) {
    if (!this.session || !this.connected || !text) return false;
    this.session.sendRealtimeInput({ text });
    return true;
  }

  async startMicrophone() {
    if (!this.session || !this.connected || !navigator.mediaDevices?.getUserMedia) return false;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
    this.micStream = stream;
    const micCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const source = micCtx.createMediaStreamSource(stream);
    const processor = micCtx.createScriptProcessor(2048, 1, 1);
    processor.onaudioprocess = (ev) => {
      if (!this.connected || !this.session) return;
      const input = ev.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i += 1) {
        const s = Math.max(-1, Math.min(1, input[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      const bytes = new Uint8Array(pcm16.buffer);
      let bin = "";
      for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
      this.session.sendRealtimeInput({
        audio: { data: btoa(bin), mimeType: "audio/pcm;rate=16000" },
      });
    };
    source.connect(processor);
    processor.connect(micCtx.destination);
    this.processor = { processor, micCtx };
    return true;
  }

  stopMicrophone() {
    if (this.session && this.connected) {
      try {
        this.session.sendRealtimeInput({ audioStreamEnd: true });
      } catch (_) {}
    }
    this.processor?.processor?.disconnect?.();
    this.processor?.micCtx?.close?.().catch?.(() => {});
    this.processor = null;
    this.micStream?.getTracks?.().forEach((t) => t.stop());
    this.micStream = null;
  }

  enqueuePcm24k(base64Str) {
    if (!this.audioCtx) return;
    const raw = atob(base64Str);
    const buf = new ArrayBuffer(raw.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i);
    const int16 = new Int16Array(buf);
    const audioBuf = this.audioCtx.createBuffer(1, int16.length, 24000);
    const ch = audioBuf.getChannelData(0);
    for (let i = 0; i < int16.length; i += 1) ch[i] = int16[i] / 32768;
    const node = this.audioCtx.createBufferSource();
    node.buffer = audioBuf;
    node.connect(this.audioCtx.destination);
    const startAt = Math.max(this.audioCtx.currentTime, this.nextPlayTime);
    node.start(startAt);
    this.nextPlayTime = startAt + audioBuf.duration;
    this.activeSources.add(node);
    node.onended = () => this.activeSources.delete(node);
  }

  clearPlaybackQueue() {
    this.activeSources.forEach((n) => {
      try { n.stop(); } catch (_) {}
    });
    this.activeSources.clear();
    if (this.audioCtx) this.nextPlayTime = this.audioCtx.currentTime;
  }

  disconnect() {
    this.connected = false;
    this.stopMicrophone();
    this.clearPlaybackQueue();
    try { this.session?.close?.(); } catch (_) {}
    this.session = null;
    try { this.audioCtx?.close?.(); } catch (_) {}
    this.audioCtx = null;
  }
}

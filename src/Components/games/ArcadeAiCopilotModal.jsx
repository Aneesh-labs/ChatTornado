import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Award,
  Bot,
  Mic,
  MicOff,
  Radio,
  Send,
  Sparkles,
  Target,
  Volume2,
  X,
} from "lucide-react";
import {
  ArcadeLiveClient,
  askPersonalizedCompanion,
  collectArcadeHighScores,
  generateArcadeEmblem,
  generateArcadeMission,
  loadArcadeAiProfile,
  saveArcadeAiProfile,
  saveBackendPersonaPreference,
  speakCompanionLine,
} from "../../Services/arcadeAiService";

const PLAYSTYLES = [
  "Adaptive Strategist",
  "Speedrunner",
  "Collector",
  "Lore Explorer",
  "Tactician",
];

const ArcadeAiCopilotModal = ({ isOpen, activeGameId = "auto", onSelectGame, onClose }) => {
  const [profile, setProfile] = useState(loadArcadeAiProfile);
  const [highScores] = useState(collectArcadeHighScores);
  const [tab, setTab] = useState("copilot"); // copilot | mission | live | emblem
  const [promptInput, setPromptInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [mission, setMission] = useState(null);
  const [loadingMission, setLoadingMission] = useState(false);
  const [emblemLoading, setEmblemLoading] = useState(false);

  // Live API WebSocket state
  const liveClientRef = useRef(null);
  const interactionIdRef = useRef(null);
  const [liveStatus, setLiveStatus] = useState("idle");
  const [micActive, setMicActive] = useState(false);
  const [extendedThinking, setExtendedThinking] = useState(false);
  const [transcripts, setTranscripts] = useState([]);
  const [liveError, setLiveError] = useState("");

  useEffect(() => {
    return () => {
      liveClientRef.current?.disconnect();
      liveClientRef.current = null;
    };
  }, []);

  if (!isOpen) return null;

  const updateProfile = (patch) => {
    const next = saveArcadeAiProfile(patch);
    setProfile(next);
    saveBackendPersonaPreference(next);
  };

  const handleAsk = async (text) => {
    const q = (text || promptInput).trim();
    if (!q || loadingChat) return;
    setPromptInput("");
    setLoadingChat(true);
    setMessages((m) => [...m, { role: "user", text: q }]);

    const targetGame = activeGameId && activeGameId !== "auto" ? activeGameId : "arcade";
    const res = await askPersonalizedCompanion({
      gameId: targetGame,
      prompt: q,
      playerContext: {
        callsign: profile.callsign,
        playstyle: profile.playstyle,
        score: highScores[targetGame] || Object.values(highScores).reduce((a, b) => Math.max(a, b), 0),
        prizes: Object.keys(highScores),
      },
      previousInteractionId: interactionIdRef.current,
    });
    if (res.interaction_id) interactionIdRef.current = res.interaction_id;
    setMessages((m) => [...m, { role: "ai", text: res.reply, model: res.model }]);
    setLoadingChat(false);

    if (profile.voiceEnabled) {
      speakCompanionLine(res.reply, true);
    }
  };

  const handleGenerateMission = async () => {
    if (loadingMission) return;
    setLoadingMission(true);
    const res = await generateArcadeMission({ gameId: activeGameId || "auto", highScores });
    setMission(res);
    setLoadingMission(false);
    if (profile.voiceEnabled && res.live_callout) {
      speakCompanionLine(res.live_callout, true, "focused heroic game master");
    }
  };

  const handleMintEmblem = async () => {
    if (emblemLoading) return;
    setEmblemLoading(true);
    const game = activeGameId && activeGameId !== "auto" ? activeGameId : "afterspace";
    const topScore = highScores[game] || Object.values(highScores)[0] || 1500;
    await generateArcadeEmblem({
      gameId: game,
      achievement: `Peak ${topScore.toLocaleString()} PTS`,
    });
    setProfile(loadArcadeAiProfile());
    setEmblemLoading(false);
  };

  const toggleLiveConnect = async () => {
    if (liveStatus === "connected") {
      liveClientRef.current?.disconnect();
      liveClientRef.current = null;
      setMicActive(false);
      setLiveStatus("idle");
      return;
    }

    setLiveError("");
    const client = new ArcadeLiveClient({
      onStatus: setLiveStatus,
      onInputTranscript: (txt) =>
        setTranscripts((t) => [...t.slice(-8), { who: profile.callsign, text: txt }]),
      onOutputTranscript: (txt) =>
        setTranscripts((t) => [...t.slice(-8), { who: "Gemini Live", text: txt }]),
      onError: (err) => setLiveError(err),
    });
    liveClientRef.current = client;
    const res = await client.connect({
      gameId: activeGameId === "auto" ? "chattornado-arcade" : activeGameId,
      extendedThinking,
    });
    if (!res.ok) {
      setLiveError(res.reason || "Live API unavailable offline — use AI Chat or TTS below.");
      return;
    }
    const gName = activeGameId === "auto" ? "ChatTornado Arcade" : activeGameId;
    client.sendTextTelemetry(
      `Player ${profile.callsign} (${profile.playstyle}) joined Live session for ${gName}. High scores: ${JSON.stringify(highScores)}.`
    );
  };

  const toggleMic = async () => {
    if (!liveClientRef.current?.connected) return;
    if (micActive) {
      liveClientRef.current.stopMicrophone();
      setMicActive(false);
    } else {
      const ok = await liveClientRef.current.startMicrophone().catch(() => false);
      setMicActive(ok);
      if (!ok) setLiveError("Microphone permission required for real-time voice.");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-2xl max-h-[90dvh] rounded-3xl border border-white/15 bg-[#0c1118]/95 text-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-400/35 flex items-center justify-center">
              <Bot className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight flex items-center gap-2">
                Arcade Gemini AI Hub
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  3.8 Flash + Live
                </span>
              </div>
              <div className="text-xs text-white/55">
                Personalized for {profile.callsign} • {profile.playstyle}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI Hub"
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 flex flex-wrap gap-1.5 border-b border-white/10 pb-3">
          {[
            { id: "copilot", label: "AI Coach Chat", Icon: Sparkles },
            { id: "live", label: "Gemini Live Voice", Icon: Radio },
            { id: "mission", label: "AI Mission", Icon: Target },
            { id: "emblem", label: "AI Emblem & Persona", Icon: Award },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                tab === id
                  ? "bg-violet-500/25 border-violet-400/50 text-white"
                  : "bg-white/5 border-white/10 text-white/65 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === "copilot" && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Best tactic for my highest score?",
                  "Recommend which Arcade game fits my mood",
                  "Give me a 1-line speedrun tip",
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleAsk(q)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-white/80 cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="min-h-[180px] max-h-[260px] overflow-y-auto space-y-2.5 rounded-2xl bg-black/40 border border-white/10 p-3.5">
                {messages.length === 0 && (
                  <div className="text-xs text-white/50 text-center py-8">
                    Stateful multi-turn coach powered by Gemini 3.8 Flash Interactions API. Ask anything about tactics, prizes, or 4D puzzles!
                  </div>
                )}
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-violet-600/25 border border-violet-400/30 ml-8 text-white"
                        : "bg-emerald-950/60 border border-emerald-400/25 mr-6 text-emerald-50"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">
                      {m.role === "user" ? profile.callsign : `Gemini Companion (${m.model || "3.8-flash"})`}
                    </div>
                    {m.text}
                  </div>
                ))}
                {loadingChat && <div className="text-xs text-violet-300">Thinking...</div>}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAsk();
                  }}
                  placeholder="Ask your AI co-pilot for tips or lore..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:border-violet-400"
                />
                <button
                  type="button"
                  onClick={() => handleAsk()}
                  disabled={loadingChat}
                  className="px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </div>
            </>
          )}

          {tab === "live" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    Real-Time Voice Stream
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/10 text-emerald-300">
                      {liveStatus}
                    </span>
                  </div>
                  <div className="text-xs text-white/55 mt-0.5">
                    Server mints 1-use Ephemeral Auth Token for Gemini 3.8 Live WebSocket audio.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleLiveConnect}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                      liveStatus === "connected"
                        ? "bg-rose-500/80 hover:bg-rose-500 text-white"
                        : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                    }`}
                  >
                    {liveStatus === "connected" ? "End Session" : "Connect Live"}
                  </button>
                  {liveStatus === "connected" && (
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={`p-2 rounded-xl border cursor-pointer ${
                        micActive
                          ? "bg-rose-500/25 border-rose-400 text-rose-200"
                          : "bg-white/10 border-white/15 text-white"
                      }`}
                    >
                      {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-white/75 cursor-pointer">
                <input
                  type="checkbox"
                  checked={extendedThinking}
                  onChange={(e) => setExtendedThinking(e.target.checked)}
                  disabled={liveStatus === "connected"}
                  className="accent-violet-400"
                />
                Use Gemini 3.8 Live Extended Thinking (deeper strategy reasoning)
              </label>

              {liveError && (
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/35 text-xs text-amber-200">
                  {liveError}
                </div>
              )}

              <div className="min-h-[130px] rounded-2xl bg-black/40 border border-white/10 p-3 space-y-1.5">
                {transcripts.length === 0 ? (
                  <div className="text-xs text-white/45 py-6 text-center">
                    Live input/output transcriptions appear here once connected.
                  </div>
                ) : (
                  transcripts.map((t, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-bold text-violet-300">{t.who}: </span>
                      <span className="text-white/85">{t.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === "mission" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-white/65">
                  Uses Gemini 3.8 Flash Structured JSON Output tailored to your saved high scores.
                </div>
                <button
                  type="button"
                  onClick={handleGenerateMission}
                  disabled={loadingMission}
                  className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer shrink-0"
                >
                  {loadingMission ? "Generating..." : "New AI Mission"}
                </button>
              </div>

              {mission && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-950/60 to-slate-900/80 border border-amber-400/35 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      {mission.recommended_game} • Target {Number(mission.target_score).toLocaleString()} pts
                    </div>
                    <span className="text-[11px] font-mono text-white/50">{mission.model}</span>
                  </div>
                  <div className="text-base font-black text-white">{mission.title}</div>
                  <div className="text-xs text-white/85">{mission.objective}</div>
                  <div className="p-2.5 rounded-xl bg-black/35 text-xs text-emerald-200">
                    Strategy: {mission.strategy_tip}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {onSelectGame && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectGame(mission.recommended_game);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                      >
                        Launch {mission.recommended_game}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => speakCompanionLine(mission.live_callout, true)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-violet-300" />
                      Speak Briefing
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "emblem" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs space-y-1">
                  <span className="text-white/65 block">Player Callsign</span>
                  <input
                    type="text"
                    value={profile.callsign}
                    maxLength={24}
                    onChange={(e) => updateProfile({ callsign: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
                  />
                </label>
                <label className="text-xs space-y-1">
                  <span className="text-white/65 block">Playstyle Archetype</span>
                  <select
                    value={profile.playstyle}
                    onChange={(e) => updateProfile({ playstyle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
                  >
                    {PLAYSTYLES.map((p) => (
                      <option key={p} value={p} className="bg-slate-900">
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-black/35 border border-white/10 text-xs cursor-pointer">
                <span>Gemini 3.8 Flash TTS Voice Readouts</span>
                <input
                  type="checkbox"
                  checked={Boolean(profile.voiceEnabled)}
                  onChange={(e) => updateProfile({ voiceEnabled: e.target.checked })}
                  className="accent-emerald-400"
                />
              </label>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-center gap-4">
                {profile.emblemDataUrl ? (
                  <img
                    src={profile.emblemDataUrl}
                    alt="AI Arcade Emblem"
                    className="w-20 h-20 rounded-2xl object-cover border border-amber-400/40"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-violet-500/20 border border-amber-400/35 flex items-center justify-center text-2xl">
                    ◈
                  </div>
                )}
                <div className="flex-1 text-center sm:text-left">
                  <div className="text-xs font-bold text-white">Nano Banana 2.1 Collector Medallion</div>
                  <div className="text-xs text-white/55 mt-0.5">
                    {profile.emblemLabel || "Generate a personalized emblem for your top score."}
                  </div>
                  <button
                    type="button"
                    onClick={handleMintEmblem}
                    disabled={emblemLoading}
                    className="mt-2.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    {emblemLoading ? "Minting Emblem..." : "Generate AI Emblem"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ArcadeAiCopilotModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  activeGameId: PropTypes.string,
  onSelectGame: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

export default ArcadeAiCopilotModal;

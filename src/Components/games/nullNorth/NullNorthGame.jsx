import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import {
  ArrowLeft,
  Compass,
  Users,
  Shield,
  Zap,
  Clock,
  Send,
  Copy,
  Check,
  Trophy,
  Play,
  Sparkles,
  LogIn,
  MessageSquare,
  Info,
  BatteryCharging,
  Flag,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import API from "../../../Services/API";
import createWebSocket from "../../../Services/WebSocket";
import { soundEngine } from "../../../utils/soundEffects";
import NullNorthMaze3D from "./NullNorthMaze3D";
import { ROLE_META } from "./nullNorthMeta";
import {
  RoleBriefingModal,
  CartographerDeck,
  SeerDeck,
  DecoderDeck,
  ArchitectDeck,
} from "./NullNorthRolePanels";
import {
  createNullNorthMatch,
  listNullNorthMatches,
  joinNullNorthMatch,
  selectNullNorthRole,
  toggleNullNorthReady,
  startNullNorthMatch,
  submitNullNorthAction,
  getNullNorthState,
  getNullNorthProfile,
  getNullNorthLeaderboard,
  inviteToNullNorthMatch,
} from "./nullNorthApi";

function fmtSeconds(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

const QUICK_CALLOUTS = [
  "Hold — hazard ahead!",
  "Corridor safe, moving up.",
  "Need Architect bridge!",
  "Need Decoder cipher!",
  "Inside Extraction Gate!",
];

const NullNorthGame = ({ onBack, isMuted = false, initialMatchCode = "" }) => {
  const [matchState, setMatchState] = useState(null);
  const [openMatches, setOpenMatches] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  const [difficulty, setDifficulty] = useState("standard");
  const [playerLimit, setPlayerLimit] = useState(4);
  const [soloTraining, setSoloTraining] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState(initialMatchCode || "");

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [showBriefing, setShowBriefing] = useState(false);
  const briefedMatchRef = useRef(null);

  // Clean non-cramped tab navigation
  const [mobileTab, setMobileTab] = useState("maze"); // maze | deck | comms | team
  const [desktopSideTab, setDesktopSideTab] = useState("deck"); // deck | comms | team

  // Isolated Squad Comms
  const [commsMessages, setCommsMessages] = useState([]);
  const [commsDraft, setCommsDraft] = useState("");
  const wsRef = useRef(null);

  // Invite friends/groups modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTargets, setInviteTargets] = useState({ groups: [], friends: [] });

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const playSfx = useCallback((type) => {
    if (!isMutedRef.current) soundEngine.play(type);
  }, []);

  const showToastMsg = useCallback((msg, kind = "info") => {
    setToast({ msg, kind });
    setTimeout(() => setToast((cur) => (cur?.msg === msg ? null : cur)), 3400);
  }, []);

  const refreshHub = useCallback(async () => {
    try {
      const [matches, prof, lb] = await Promise.all([
        listNullNorthMatches().catch(() => []),
        getNullNorthProfile().catch(() => null),
        getNullNorthLeaderboard().catch(() => []),
      ]);
      setOpenMatches(matches);
      if (prof) setProfileData(prof);
      setLeaderboard(lb);
    } catch {
      // keep UI responsive even offline
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      try {
        const [matches, prof, lb] = await Promise.all([
          listNullNorthMatches().catch(() => []),
          getNullNorthProfile().catch(() => null),
          getNullNorthLeaderboard().catch(() => []),
        ]);
        if (!active) return;
        setOpenMatches(matches);
        if (prof) setProfileData(prof);
        setLeaderboard(lb);
      } catch {
        // offline safe
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Auto-join if launched directly from a ChatTornado invitation link/card
  useEffect(() => {
    if (!initialMatchCode) return;
    let cancelled = false;
    Promise.resolve().then(async () => {
      try {
        const res = await joinNullNorthMatch(initialMatchCode);
        if (!cancelled && res?.state) {
          setMatchState(res.state);
          playSfx("tada");
        }
      } catch (err) {
        if (!cancelled) {
          showToastMsg(err?.response?.data?.detail || "Unable to join invite match", "error");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialMatchCode, playSfx, showToastMsg]);

  const currentMatchId = matchState?.match?.id;
  const currentStatus = matchState?.match?.status;

  // Trigger briefing modal once when entering active play
  useEffect(() => {
    if (currentMatchId && currentStatus === "active" && briefedMatchRef.current !== currentMatchId) {
      briefedMatchRef.current = currentMatchId;
      Promise.resolve().then(() => {
        setShowBriefing(true);
        playSfx("tada");
      });
    }
  }, [currentMatchId, currentStatus, playSfx]);

  // Real-time WebSocket listener for NULL//NORTH isolated events & squad chat
  useEffect(() => {
    let active = true;
    let reconnectTimer = null;

    const connectWs = (attempt = 0) => {
      const ws = createWebSocket(attempt);
      if (!ws) return;
      wsRef.current = ws;

      ws.onopen = () => {
        if (currentMatchId) {
          getNullNorthState(currentMatchId)
            .then((st) => active && st && setMatchState(st))
            .catch(() => {});
        }
      };

      ws.onmessage = (evt) => {
        if (!active) return;
        try {
          const pkt = JSON.parse(evt.data);
          if (pkt.type === "null_north_event" && pkt.match_id === currentMatchId && pkt.state) {
            setMatchState(pkt.state);
            if (pkt.event === "HAZARD_WARNING") playSfx("boom");
            if (pkt.event === "PUZZLE_UPDATED") playSfx("coin");
            if (pkt.event === "MATCH_COMPLETED") playSfx("win");
          } else if (pkt.type === "null_north_chat_message" && pkt.match_id === currentMatchId) {
            setCommsMessages((prev) => [...prev.slice(-40), pkt]);
            playSfx("chime");
          }
        } catch {
          // ignore non-json
        }
      };

      ws.onclose = () => {
        if (!active) return;
        reconnectTimer = setTimeout(() => connectWs(attempt + 1), 2500);
      };
    };

    connectWs(0);
    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
    };
  }, [currentMatchId, playSfx]);

  // Lightweight state sync fallback poll when active/lobby
  useEffect(() => {
    if (!currentMatchId || currentStatus === "completed" || currentStatus === "failed") return;
    const id = setInterval(() => {
      getNullNorthState(currentMatchId)
        .then((st) => st && setMatchState(st))
        .catch(() => {});
    }, 4500);
    return () => clearInterval(id);
  }, [currentMatchId, currentStatus]);

  const handleCreateMatch = async () => {
    try {
      setBusy(true);
      const res = await createNullNorthMatch({
        difficulty,
        game_mode: "classic",
        player_limit: soloTraining ? 2 : playerLimit,
        solo_bots: soloTraining,
      });
      setCommsMessages([]);
      setMatchState(res.state);
      playSfx("tada");
    } catch (err) {
      showToastMsg(err?.response?.data?.detail || "Could not create match", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleJoinByRef = async (ref) => {
    const clean = String(ref || "").trim();
    if (!clean) return;
    try {
      setBusy(true);
      const res = await joinNullNorthMatch(clean);
      setCommsMessages([]);
      setMatchState(res.state);
      playSfx("tada");
    } catch (err) {
      showToastMsg(err?.response?.data?.detail || "Match not found or full", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSelectRole = async (role) => {
    if (!currentMatchId) return;
    try {
      setBusy(true);
      const res = await selectNullNorthRole(currentMatchId, role);
      if (res?.state) setMatchState(res.state);
      playSfx("coin");
    } catch (err) {
      showToastMsg(err?.response?.data?.detail || "Role already taken", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleReady = async () => {
    if (!currentMatchId) return;
    try {
      setBusy(true);
      const res = await toggleNullNorthReady(currentMatchId);
      if (res?.state) setMatchState(res.state);
      playSfx("coin");
    } catch (err) {
      showToastMsg(err?.response?.data?.detail || "Failed to toggle readiness", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleStartMatch = async () => {
    if (!currentMatchId) return;
    try {
      setBusy(true);
      const res = await startNullNorthMatch(currentMatchId);
      if (res?.state) setMatchState(res.state);
    } catch (err) {
      showToastMsg(err?.response?.data?.detail || "Need at least 2 players to start", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleAction = async (actionType, payload = {}) => {
    if (!currentMatchId) return;
    try {
      setBusy(true);
      const res = await submitNullNorthAction(currentMatchId, actionType, payload);
      if (res?.state) setMatchState(res.state);
      if (res?.feedback) showToastMsg(res.feedback, "success");
      playSfx(actionType === "MOVE" ? "whoosh" : "coin");
    } catch (err) {
      showToastMsg(err?.response?.data?.detail || "Action rejected", "error");
      playSfx("boom");
    } finally {
      setBusy(false);
    }
  };

  const handleSendComms = (textOverride) => {
    const text = (textOverride ?? commsDraft).trim();
    if (!text || !currentMatchId) return;
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(
        JSON.stringify({
          type: "null_north_chat",
          match_id: currentMatchId,
          text,
        })
      );
      if (!textOverride) setCommsDraft("");
    } else {
      showToastMsg("WebSocket reconnecting — hold a moment", "error");
    }
  };

  const openInviteModal = async () => {
    setInviteOpen(true);
    const token = sessionStorage.getItem("token");
    if (!token) return;
    try {
      const [gRes, fRes] = await Promise.all([
        API.get("/api/groups", { params: { token } }).catch(() => ({ data: [] })),
        API.get("/connections/active", { params: { token } }).catch(() => ({ data: [] })),
      ]);
      setInviteTargets({
        groups: Array.isArray(gRes.data) ? gRes.data : [],
        friends: Array.isArray(fRes.data) ? fRes.data.filter((f) => !f.is_bot) : [],
      });
    } catch {
      // ignore
    }
  };

  const sendChatInvite = async (target) => {
    if (!currentMatchId) return;
    try {
      await inviteToNullNorthMatch(currentMatchId, target);
      showToastMsg("Invitation card sent cleanly into conversation!", "success");
      setInviteOpen(false);
    } catch (err) {
      showToastMsg(err?.response?.data?.detail || "Could not send invite", "error");
    }
  };

  const copyMatchCode = () => {
    if (!matchState?.match?.match_code) return;
    navigator.clipboard?.writeText(matchState.match.match_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  /* ═══════════════════════════════════════════════════════════════
     SCREEN 1: DISCOVERY HUB
     ═══════════════════════════════════════════════════════════════ */
  if (!matchState) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6 select-none">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-sm font-bold text-white cursor-pointer transition"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            Back to Arcade
          </button>

          <button
            type="button"
            onClick={refreshHub}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-slate-300 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            Refresh Lobbies
          </button>
        </div>

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-[#09111f] via-[#070a12] to-[#120b22] p-6 sm:p-8 shadow-2xl">
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-xs font-black tracking-widest text-cyan-300 uppercase">
                <Compass className="w-3.5 h-3.5" /> Asymmetric Co-Op Escape
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                NULL<span className="text-cyan-400">//</span>NORTH
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                You can see the maze. Your teammate can see the truth. Neither can escape alone.
                Every operative perceives a filtered reality layer inside a shifting procedural dimension — coordinate over ChatTornado before collapse.
              </p>
            </div>

            {profileData?.stats && (
              <div className="grid grid-cols-3 gap-3 shrink-0">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
                  <div className="text-xs text-slate-400 font-semibold">Escapes</div>
                  <div className="text-2xl font-black text-emerald-300 mt-0.5">{profileData.stats.victories}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
                  <div className="text-xs text-slate-400 font-semibold">Puzzles</div>
                  <div className="text-2xl font-black text-amber-300 mt-0.5">{profileData.stats.puzzles_solved}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
                  <div className="text-xs text-slate-400 font-semibold">XP</div>
                  <div className="text-2xl font-black text-cyan-300 mt-0.5">{profileData.stats.xp}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create vs Join Controls (Generous Grid, Zero Cramping) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Match Card */}
          <div className="lg:col-span-7 rounded-3xl border border-white/10 bg-[#0b101b]/90 p-6 space-y-5">
            <div>
              <h2 className="text-xl font-black text-white">Deploy New Labyrinth</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Server-authoritative procedural map with verified Extraction path.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {["standard", "hard", "nightmare"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`py-2.5 rounded-xl border text-xs font-black capitalize cursor-pointer transition ${
                        difficulty === d
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                          : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Squad Size</label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      disabled={soloTraining}
                      onClick={() => setPlayerLimit(n)}
                      className={`py-2.5 rounded-xl border text-xs font-black cursor-pointer transition disabled:opacity-40 ${
                        playerLimit === n && !soloTraining
                          ? "bg-violet-500/25 border-violet-400 text-violet-200"
                          : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {n}P
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] cursor-pointer">
              <input
                type="checkbox"
                checked={soloTraining}
                onChange={(e) => setSoloTraining(e.target.checked)}
                className="w-4 h-4 accent-cyan-400"
              />
              <div>
                <div className="text-sm font-bold text-white">Solo Operative Mode (Practice)</div>
                <div className="text-xs text-slate-400">
                  Allow launching immediately with 1 player to inspect the maze &amp; cipher locks.
                </div>
              </div>
            </label>

            <button
              type="button"
              disabled={busy}
              onClick={handleCreateMatch}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:brightness-110 disabled:opacity-50 text-slate-950 font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer transition active:scale-[0.99]"
            >
              <Play className="w-4 h-4 fill-current" />
              CREATE NULL//NORTH ROOM
            </button>
          </div>

          {/* Join by Code & Active Lobbies */}
          <div className="lg:col-span-5 rounded-3xl border border-white/10 bg-[#0b101b]/90 p-6 space-y-4">
            <h2 className="text-xl font-black text-white">Join Active Squad</h2>

            <div className="flex gap-2">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="6-CHAR CODE (e.g. X9K4P2)"
                maxLength={8}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm font-mono font-bold text-white uppercase outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                disabled={busy || !joinCodeInput.trim()}
                onClick={() => handleJoinByRef(joinCodeInput)}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Join
              </button>
            </div>

            <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1 custom-scrollbar">
              {openMatches.length === 0 ? (
                <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] text-xs text-slate-400 text-center">
                  No open rooms right now. Create one or invite friends directly inside a chat!
                </div>
              ) : (
                openMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-2">
                        <span className="font-mono text-cyan-300">{m.match_code}</span>
                        <span className="text-slate-400">Host: {m.host_username}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 capitalize">
                        {m.difficulty} • {m.joined_count}/{m.player_limit} Ops • {m.status}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleJoinByRef(m.match_code)}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-cyan-500 hover:text-slate-950 text-xs font-black text-white cursor-pointer transition"
                    >
                      {m.is_member ? "Resume" : "Join"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Four Asymmetric Classes Showcase + Global Leaderboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(ROLE_META).map(([key, meta]) => {
            const Icon = meta.Icon;
            return (
              <div key={key} className="rounded-3xl border border-white/10 bg-[#0b101b]/75 p-5 space-y-2.5">
                <div className={`inline-flex p-2.5 rounded-2xl border ${meta.accent}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-white">{meta.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{meta.abilities[0]}</p>
              </div>
            );
          })}
        </div>

        {leaderboard.length > 0 && (
          <div className="rounded-3xl border border-white/10 bg-[#0b101b]/85 p-6">
            <h3 className="text-base font-black text-white flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-400" /> Top Dimensional Escapers
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {leaderboard.slice(0, 6).map((entry, idx) => (
                <div
                  key={entry.user_id}
                  className="p-3 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-between text-xs"
                >
                  <div className="font-bold text-white">
                    <span className="text-cyan-400 mr-2">#{idx + 1}</span>
                    {entry.username}
                  </div>
                  <div className="font-bold text-amber-300">
                    {entry.victories} Wins • {entry.xp} XP
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 border border-cyan-400/40 text-sm font-bold text-white shadow-2xl">
            {toast.msg}
          </div>
        )}
      </div>
    );
  }

  const mInfo = matchState.match;
  const self = matchState.self;
  const team = matchState.team || [];
  const isHost = Number(mInfo.host_user_id) === Number(self.user_id);

  /* ═══════════════════════════════════════════════════════════════
     SCREEN 2: MATCH LOBBY
     ═══════════════════════════════════════════════════════════════ */
  if (mInfo.status === "lobby") {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 select-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMatchState(null)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-sm font-bold text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" /> Leave Lobby
          </button>

          <button
            type="button"
            onClick={copyMatchCode}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-sm font-mono font-black text-cyan-200 cursor-pointer"
          >
            <span>CODE: {mInfo.match_code}</span>
            {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Player Slots */}
          <div className="lg:col-span-6 rounded-3xl border border-white/10 bg-[#0b101b]/90 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Squad Roster ({team.length}/{mInfo.player_limit})
              </h2>
              <button
                type="button"
                onClick={openInviteModal}
                className="px-3.5 py-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/35 border border-violet-400/40 text-xs font-black text-violet-200 flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" /> Invite Chat
              </button>
            </div>

            <div className="space-y-3">
              {Array.from({ length: mInfo.player_limit }).map((_, idx) => {
                const p = team[idx];
                if (!p) {
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.015] text-xs text-slate-500 flex items-center justify-between"
                    >
                      <span>Open Operative Slot #{idx + 1}</span>
                      <span>Share code {mInfo.match_code}</span>
                    </div>
                  );
                }
                const meta = ROLE_META[p.assigned_role];
                return (
                  <div
                    key={p.user_id}
                    className="p-4 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-black text-white flex items-center gap-2">
                        {p.username}
                        {Number(p.user_id) === Number(mInfo.host_user_id) && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-bold">
                            HOST
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-cyan-300 font-semibold mt-0.5">
                        {meta ? meta.title : p.assigned_role}
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black border ${
                        p.is_ready
                          ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                          : "bg-slate-800 border-white/10 text-slate-400"
                      }`}
                    >
                      {p.is_ready ? "READY" : "WAITING"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={handleToggleReady}
                className="flex-1 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-sm cursor-pointer transition"
              >
                {self.is_ready ? "Cancel Ready" : "Mark Ready"}
              </button>

              {isHost && (
                <button
                  type="button"
                  disabled={busy || (team.length < 2 && !mInfo.solo_bots)}
                  onClick={handleStartMatch}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:brightness-110 disabled:opacity-40 text-slate-950 font-black text-sm cursor-pointer transition"
                >
                  Deploy Squad
                </button>
              )}
            </div>
          </div>

          {/* Class Assignment Selector */}
          <div className="lg:col-span-6 rounded-3xl border border-white/10 bg-[#0b101b]/90 p-6 space-y-4">
            <h2 className="text-xl font-black text-white">Select Asymmetric Class</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(ROLE_META).map(([roleKey, meta]) => {
                const Icon = meta.Icon;
                const claimedBy = team.find((t) => t.assigned_role === roleKey && t.user_id !== self.user_id);
                const isMine = self.assigned_role === roleKey;
                return (
                  <button
                    key={roleKey}
                    type="button"
                    disabled={busy || Boolean(claimedBy)}
                    onClick={() => handleSelectRole(roleKey)}
                    className={`p-4 rounded-2xl border text-left transition cursor-pointer disabled:opacity-45 ${
                      isMine
                        ? "bg-cyan-500/20 border-cyan-400 ring-1 ring-cyan-400/40"
                        : "bg-white/[0.03] border-white/10 hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Icon className="w-5 h-5 text-cyan-300" />
                      <span className="text-xs font-bold text-slate-300">
                        {isMine ? "SELECTED" : claimedBy ? claimedBy.username : "AVAILABLE"}
                      </span>
                    </div>
                    <div className="text-sm font-black text-white mt-2">{meta.title}</div>
                    <div className="text-xs text-slate-400 mt-1">{meta.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Invite Modal */}
        {inviteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#090d16] p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white">Send ChatTornado Invite Card</h3>
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="px-3 py-1 rounded-xl bg-white/10 text-xs font-bold text-slate-200 cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {inviteTargets.groups.map((g) => (
                  <button
                    key={`g_${g.id}`}
                    type="button"
                    onClick={() => sendChatInvite({ group_id: g.id })}
                    className="w-full p-3 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-cyan-500/15 text-left flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{g.name}</div>
                      <div className="text-xs text-slate-400">Group • {g.member_count} members</div>
                    </div>
                    <span className="text-xs font-black text-cyan-300">Invite</span>
                  </button>
                ))}
                {inviteTargets.friends.map((f) => (
                  <button
                    key={`f_${f.id}`}
                    type="button"
                    onClick={() => sendChatInvite({ dm_partner_id: f.id })}
                    className="w-full p-3 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-violet-500/15 text-left flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{f.username}</div>
                      <div className="text-xs text-slate-400">Direct Message • {f.status}</div>
                    </div>
                    <span className="text-xs font-black text-violet-300">Invite</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 border border-cyan-400/40 text-sm font-bold text-white shadow-2xl">
            {toast.msg}
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     SCREEN 6: MATCH RESULTS (Victory / Collapse)
     ═══════════════════════════════════════════════════════════════ */
  if (mInfo.status === "completed" || mInfo.status === "failed") {
    const victory = mInfo.status === "completed";
    return (
      <div className="w-full max-w-2xl mx-auto py-8 select-none">
        <div className="rounded-3xl border border-white/15 bg-[#090d16] p-8 text-center shadow-2xl space-y-6">
          <div
            className={`inline-flex px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase border ${
              victory
                ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                : "bg-rose-500/20 border-rose-400/40 text-rose-300"
            }`}
          >
            {victory ? "DIMENSION ESCAPE COMPLETE" : "DIMENSION COLLAPSED"}
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white">
            {victory ? "Squad Extracted Cleanly!" : "Signal Lost in Labyrinth"}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
              <div className="text-xs text-slate-400">Time Remaining</div>
              <div className="text-xl font-black text-cyan-300 mt-1">{fmtSeconds(mInfo.collapse_seconds_left)}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
              <div className="text-xs text-slate-400">Extraction</div>
              <div className="text-xl font-black text-emerald-300 mt-1">{mInfo.extraction_progress}%</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 col-span-2 sm:col-span-1">
              <div className="text-xs text-slate-400">Operatives</div>
              <div className="text-xl font-black text-white mt-1">{team.length}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setMatchState(null);
                refreshHub();
              }}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 font-black text-sm cursor-pointer"
            >
              Return to NULL//NORTH Hub
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm cursor-pointer"
            >
              Arcade Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     SCREEN 4 & 5: ACTIVE LABYRINTH HUD (Spacious, Non-Cramped)
     ═══════════════════════════════════════════════════════════════ */
  const caps = self.capabilities || [self.assigned_role];
  const currRoom = matchState.current_room;
  const adjEdges = currRoom?.adjacent_edges || [];
  const inExtraction = currRoom?.id === "R_EXT";

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 select-none">
      {/* Top Sci-Fi Command Bar */}
      <div className="rounded-3xl border border-white/10 bg-[#090d16]/95 p-3.5 sm:p-4 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMatchState(null)}
            className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white cursor-pointer"
            title="Leave Match HUD"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
          </button>

          <div>
            <div className="text-sm font-black text-white flex items-center gap-2">
              NULL<span className="text-cyan-400">//</span>NORTH
              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-400/35 text-xs font-bold text-cyan-200">
                {caps.map((c) => ROLE_META[c]?.title || c).join(" + ")}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Location: <strong className="text-white">{currRoom?.name || self.current_room_id}</strong>
            </div>
          </div>
        </div>

        {/* Timers & Resources */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 flex items-center gap-1.5 text-xs font-black text-rose-300">
            <Clock className="w-4 h-4" />
            Collapse {fmtSeconds(mInfo.collapse_seconds_left)}
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 flex items-center gap-1.5 text-xs font-bold text-amber-300">
            <Sparkles className="w-4 h-4" />
            Shift {mInfo.instability_countdown}s
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-emerald-400/25 flex items-center gap-1.5 text-xs font-black text-emerald-300">
            <Shield className="w-4 h-4" />
            HP {self.hp}/3
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-cyan-400/25 flex items-center gap-1.5 text-xs font-black text-cyan-300">
            <Zap className="w-4 h-4" />
            {self.energy}⚡
          </div>

          <button
            type="button"
            onClick={() => setShowBriefing(true)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-cyan-300" /> Briefing
          </button>
        </div>
      </div>

      {/* Mobile Non-Cramped Section Switcher */}
      <div className="grid grid-cols-4 gap-2 lg:hidden">
        {[
          { id: "maze", label: "3D & Move" },
          { id: "deck", label: "Class Deck" },
          { id: "comms", label: `Comms (${commsMessages.length})` },
          { id: "team", label: "Squad & Log" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setMobileTab(t.id)}
            className={`py-2.5 rounded-xl border text-xs font-black cursor-pointer ${
              mobileTab === t.id
                ? "bg-cyan-500/25 border-cyan-400 text-cyan-200"
                : "bg-[#090d16] border-white/10 text-slate-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Three.js Isometric Labyrinth + Corridor Navigation */}
        <div className={`lg:col-span-7 space-y-4 ${mobileTab === "maze" ? "block" : "hidden lg:block"}`}>
          <div className="rounded-3xl border border-cyan-500/25 bg-[#060913] overflow-hidden shadow-2xl h-[340px] sm:h-[420px]">
            <NullNorthMaze3D
              gameState={matchState}
              onSelectRoom={(rid) => {
                if (adjEdges.some((e) => e.target_room_id === rid)) {
                  handleAction("MOVE", { target_room_id: rid });
                }
              }}
            />
          </div>

          {/* Spacious Movement & Recharge Action Strip */}
          <div className="rounded-3xl border border-white/10 bg-[#0b101b]/90 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-black uppercase tracking-wider text-slate-300">
                Connected Corridors From {currRoom?.id}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleAction("RECHARGE", {})}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 text-xs font-black text-amber-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <BatteryCharging className="w-4 h-4" />
                  {currRoom?.charge_ready ? "Node Recharge (+45⚡)" : "Rest (+22⚡)"}
                </button>

                {inExtraction && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleAction("TRIGGER_EXTRACTION", {})}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer animate-pulse"
                  >
                    <Flag className="w-4 h-4" /> TRIGGER EXTRACTION
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {adjEdges.map((edge) => {
                const blockedReason = !edge.active
                  ? "Bridge Dormant"
                  : edge.locked
                  ? "Cipher Locked"
                  : edge.cooldown_lock_ticks > 0
                  ? `Locked (${edge.cooldown_lock_ticks}t)`
                  : null;
                return (
                  <button
                    key={edge.id}
                    type="button"
                    disabled={busy || Boolean(blockedReason)}
                    onClick={() => handleAction("MOVE", { target_room_id: edge.target_room_id })}
                    className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.04] hover:border-cyan-400/50 hover:bg-cyan-500/10 disabled:opacity-50 text-left flex items-center justify-between gap-2 cursor-pointer transition"
                  >
                    <div>
                      <div className="text-sm font-black text-white">
                        Move → {edge.target_room_id}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Corridor {edge.id} {edge.hazard && edge.hazard !== "none" ? `• ${edge.hazard.toUpperCase()}` : ""}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-black/40 text-xs font-bold text-cyan-300">
                      {blockedReason || "-4⚡"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Dedicated Class Deck / Isolated Squad Comms / Team Status */}
        <div className={`lg:col-span-5 rounded-3xl border border-white/10 bg-[#0b101b]/95 p-5 space-y-4 ${mobileTab !== "maze" ? "block" : "hidden lg:block"}`}>
          {/* Desktop Side Switcher */}
          <div className="hidden lg:grid grid-cols-3 gap-2">
            {[
              { id: "deck", label: "Class Layer" },
              { id: "comms", label: `Comms (${commsMessages.length})` },
              { id: "team", label: "Squad & Log" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDesktopSideTab(t.id)}
                className={`py-2 rounded-xl border text-xs font-black cursor-pointer transition ${
                  desktopSideTab === t.id
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                    : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Class Interfaces */}
          {(mobileTab === "deck" || (mobileTab === "maze" && desktopSideTab === "deck")) && (
            <div className="space-y-5">
              {matchState.layers?.cartographer && (
                <CartographerDeck
                  layer={matchState.layers.cartographer}
                  currentRoomId={currRoom?.id}
                  energy={self.energy}
                  onAction={handleAction}
                  busy={busy}
                />
              )}
              {matchState.layers?.seer && (
                <SeerDeck
                  layer={matchState.layers.seer}
                  energy={self.energy}
                  onAction={handleAction}
                  busy={busy}
                />
              )}
              {matchState.layers?.decoder && (
                <DecoderDeck
                  layer={matchState.layers.decoder}
                  energy={self.energy}
                  onAction={handleAction}
                  busy={busy}
                />
              )}
              {matchState.layers?.architect && (
                <ArchitectDeck
                  layer={matchState.layers.architect}
                  energy={self.energy}
                  onAction={handleAction}
                  busy={busy}
                />
              )}
            </div>
          )}

          {/* Isolated Squad Tactical Comms */}
          {(mobileTab === "comms" || (mobileTab === "maze" && desktopSideTab === "comms")) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                <MessageSquare className="w-4 h-4" /> Tactical Squad Channel
              </div>

              <div className="h-[270px] overflow-y-auto space-y-2 p-3 rounded-2xl bg-black/40 border border-white/10 custom-scrollbar">
                {commsMessages.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center pt-16">
                    Share corridors, hazard warnings &amp; symbol sequences here. Completely isolated from private DMs.
                  </div>
                ) : (
                  commsMessages.map((cm, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs">
                      <div className="flex items-center justify-between text-slate-400 mb-0.5">
                        <span className="font-black text-cyan-300">{cm.sender_name}</span>
                        <span className="text-[11px] font-bold text-violet-300">{cm.role}</span>
                      </div>
                      <div className="text-white leading-relaxed">{cm.text}</div>
                    </div>
                  ))
                )}
              </div>

              {/* 1-Tap Quick Callouts */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_CALLOUTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSendComms(q)}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-cyan-500/20 border border-white/10 text-xs text-slate-200 cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendComms();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={commsDraft}
                  onChange={(e) => setCommsDraft(e.target.value)}
                  placeholder="Report corridor, hazard, or glyph..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* Team Status & Event Log */}
          {(mobileTab === "team" || (mobileTab === "maze" && desktopSideTab === "team")) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Operative Status
                </div>
                {team.map((op) => (
                  <div
                    key={op.user_id}
                    className="p-3 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-black text-white">{op.username}</div>
                      <div className="text-cyan-300 font-semibold">
                        {ROLE_META[op.assigned_role]?.title || op.assigned_role}
                        {op.room_id && op.room_id !== "UNKNOWN" ? ` • ${op.room_id}` : ""}
                      </div>
                    </div>
                    <div className="text-right font-bold">
                      <div className="text-emerald-300">HP {op.hp}/3</div>
                      <div className="text-cyan-300">{op.energy}⚡</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Dimension Event Log
                </div>
                {(matchState.recent_events || []).slice().reverse().map((ev) => (
                  <div key={ev.id} className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-300">
                    <span className="font-mono text-cyan-400 mr-1.5">[T{ev.tick}]</span>
                    {ev.payload?.message || ev.payload?.reason || ev.type}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <RoleBriefingModal
        isOpen={showBriefing}
        capabilities={caps}
        onClose={() => setShowBriefing(false)}
      />

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl border text-sm font-bold text-white shadow-2xl ${
            toast.kind === "error"
              ? "bg-rose-950/95 border-rose-400/50"
              : "bg-slate-900/95 border-cyan-400/50"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
};

NullNorthGame.propTypes = {
  onBack: PropTypes.func.isRequired,
  isMuted: PropTypes.bool,
  initialMatchCode: PropTypes.string,
};

export default NullNorthGame;

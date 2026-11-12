/**
 * Universal v3.0 Arcade Progression, Daily Quests, Streaks & Mastery Medal Engine.
 * Pure functions tested in `tests/progression.test.mjs`.
 */

export const ARCADE_RANKS = [
  { minLevel: 1, title: "Rookie", color: "text-slate-300" },
  { minLevel: 3, title: "Challenger", color: "text-emerald-300" },
  { minLevel: 6, title: "Cyber Ace", color: "text-cyan-300" },
  { minLevel: 10, title: "Vortex Master", color: "text-violet-300" },
  { minLevel: 15, title: "Grandmaster", color: "text-amber-300" },
  { minLevel: 22, title: "Tornado Legend", color: "text-rose-300" },
  { minLevel: 30, title: "Cosmic Mythic", color: "text-fuchsia-300" },
];

export function xpRequiredForLevel(level) {
  return Math.max(100, Math.round(100 + (level - 1) * 65));
}

export function computeLevelFromXp(totalXp = 0) {
  let xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (xp >= xpRequiredForLevel(level)) {
    xp -= xpRequiredForLevel(level);
    level += 1;
  }
  const needed = xpRequiredForLevel(level);
  const rank = [...ARCADE_RANKS].reverse().find((r) => level >= r.minLevel) || ARCADE_RANKS[0];
  return {
    level,
    currentXp: xp,
    neededXp: needed,
    progressPct: Math.min(100, Math.round((xp / needed) * 100)),
    rankTitle: rank.title,
    rankColor: rank.color,
  };
}

export function getMasteryMedal(bestScore = 0) {
  const s = Number(bestScore) || 0;
  if (s >= 1500) return { tier: "prism", label: "Prism", emoji: "💎", tone: "text-cyan-300 bg-cyan-500/15 border-cyan-400/40" };
  if (s >= 600) return { tier: "gold", label: "Gold", emoji: "🥇", tone: "text-amber-300 bg-amber-500/15 border-amber-400/40" };
  if (s >= 200) return { tier: "silver", label: "Silver", emoji: "🥈", tone: "text-slate-200 bg-slate-400/15 border-slate-300/40" };
  if (s > 0) return { tier: "bronze", label: "Bronze", emoji: "🥉", tone: "text-orange-300 bg-orange-500/15 border-orange-400/40" };
  return null;
}

export function getTodayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function hashDateSeed(dateKey) {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function getSpotlightGameId(dateKey, gameIds = []) {
  if (!gameIds.length) return "orbitalslingshot";
  const idx = hashDateSeed(dateKey) % gameIds.length;
  return gameIds[idx];
}

export function createDailyProgressState(dateKey, gameIds = []) {
  const spotlightId = getSpotlightGameId(dateKey, gameIds);
  return {
    dateKey,
    spotlightId,
    gamesPlayedToday: [],
    pointsToday: 0,
    claimedQuests: [],
  };
}

export function getDailyQuests(dailyState, gamesCatalog = []) {
  const spotlight = gamesCatalog.find((g) => g.id === dailyState.spotlightId);
  const spotlightName = spotlight ? spotlight.title : dailyState.spotlightId;
  const playedCount = dailyState.gamesPlayedToday?.length || 0;
  const playedSpotlight = dailyState.gamesPlayedToday?.includes(dailyState.spotlightId);
  const pts = dailyState.pointsToday || 0;

  return [
    {
      id: "variety3",
      title: "Arcade Explorer",
      desc: "Play 3 different games today",
      progress: Math.min(3, playedCount),
      target: 3,
      xpReward: 150,
      done: playedCount >= 3,
      claimed: dailyState.claimedQuests?.includes("variety3"),
    },
    {
      id: "spotlight",
      title: `2x Spotlight: ${spotlightName}`,
      desc: `Launch & play ${spotlightName} today`,
      progress: playedSpotlight ? 1 : 0,
      target: 1,
      xpReward: 200,
      done: Boolean(playedSpotlight),
      claimed: dailyState.claimedQuests?.includes("spotlight"),
    },
    {
      id: "scorer500",
      title: "Score Hunter",
      desc: "Earn 500+ total points today",
      progress: Math.min(500, pts),
      target: 500,
      xpReward: 180,
      done: pts >= 500,
      claimed: dailyState.claimedQuests?.includes("scorer500"),
    },
  ];
}

export function updatePlayStreak(prevStreak = 0, lastDateKey = "", todayKey = getTodayKey()) {
  if (lastDateKey === todayKey) {
    return { streak: Math.max(1, prevStreak), lastDateKey: todayKey, incremented: false };
  }
  if (!lastDateKey) {
    return { streak: 1, lastDateKey: todayKey, incremented: true };
  }
  const prev = new Date(`${lastDateKey}T00:00:00`);
  const curr = new Date(`${todayKey}T00:00:00`);
  const diffDays = Math.round((curr - prev) / 86400000);
  if (diffDays === 1) {
    return { streak: prevStreak + 1, lastDateKey: todayKey, incremented: true };
  }
  return { streak: 1, lastDateKey: todayKey, incremented: true };
}

export const ARCADE_ACHIEVEMENTS = [
  { id: "first_blood", title: "First Spark", emoji: "⚡", desc: "Play at least 1 game", check: (c) => c.playedCount >= 1 },
  { id: "explorer_5", title: "Arcade Tourist", emoji: "🧭", desc: "Set a score in 5 different games", check: (c) => c.playedCount >= 5 },
  { id: "explorer_15", title: "Cabinet Collector", emoji: "🕹️", desc: "Set a score in 15 different games", check: (c) => c.playedCount >= 15 },
  { id: "total_5k", title: "5K Club", emoji: "💎", desc: "Reach 5,000 Total Arcade Points", check: (c) => c.totalScore >= 5000 },
  { id: "gold_ace", title: "Gold Medalist", emoji: "🥇", desc: "Earn 600+ in any single game", check: (c) => c.maxSingleScore >= 600 },
  { id: "prism_god", title: "Prism Legend", emoji: "👑", desc: "Earn 1,500+ in any single game", check: (c) => c.maxSingleScore >= 1500 },
  { id: "streak_3", title: "Dedicated Player", emoji: "🔥", desc: "Reach a 3-day play streak", check: (c) => c.streak >= 3 },
  { id: "level_5", title: "Rising Star", emoji: "🌟", desc: "Reach Arcade Level 5+", check: (c) => c.level >= 5 },
];

export function evaluateAchievements(ctx) {
  return ARCADE_ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: Boolean(a.check(ctx)),
  }));
}

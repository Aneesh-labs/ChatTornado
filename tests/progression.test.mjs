import test from "node:test";
import assert from "node:assert/strict";
import {
  computeLevelFromXp,
  xpRequiredForLevel,
  getMasteryMedal,
  getSpotlightGameId,
  createDailyProgressState,
  getDailyQuests,
  updatePlayStreak,
  evaluateAchievements,
} from "../src/Components/games/arcadeProgression.js";
import { BOT_TIERS, getBotTier } from "../src/Components/games/botPersonas.js";
import { chooseNimAiMove } from "../src/Components/games/megaSuite/megaEngines.js";

test("XP & Level curve scales cleanly and assigns Arcade Ranks", () => {
  const lv1 = computeLevelFromXp(0);
  assert.equal(lv1.level, 1);
  assert.equal(lv1.rankTitle, "Rookie");
  assert.equal(lv1.neededXp, xpRequiredForLevel(1));

  const lv3 = computeLevelFromXp(100 + 165);
  assert.equal(lv3.level, 3);
  assert.equal(lv3.rankTitle, "Challenger");
});

test("Mastery Medals map thresholds to Bronze, Silver, Gold, Prism", () => {
  assert.equal(getMasteryMedal(0), null);
  assert.equal(getMasteryMedal(50)?.tier, "bronze");
  assert.equal(getMasteryMedal(250)?.tier, "silver");
  assert.equal(getMasteryMedal(700)?.tier, "gold");
  assert.equal(getMasteryMedal(2000)?.tier, "prism");
});

test("Daily Quests & Spotlight are deterministic per date and track completion", () => {
  const ids = ["snake", "crownchess", "mancalanexus", "orbitalslingshot"];
  const s1 = getSpotlightGameId("2026-11-12", ids);
  const s2 = getSpotlightGameId("2026-11-12", ids);
  assert.equal(s1, s2);

  const state = createDailyProgressState("2026-11-12", ids);
  state.gamesPlayedToday = ["snake", s1, "crownchess"];
  state.pointsToday = 620;

  const quests = getDailyQuests(state, ids.map((id) => ({ id, title: id })));
  assert.equal(quests.length, 3);
  assert.ok(quests.every((q) => q.done === true));
});

test("Play Streak increments on consecutive days and resets after gaps", () => {
  const day1 = updatePlayStreak(0, "", "2026-11-10");
  assert.equal(day1.streak, 1);

  const sameDay = updatePlayStreak(day1.streak, day1.lastDateKey, "2026-11-10");
  assert.equal(sameDay.streak, 1);
  assert.equal(sameDay.incremented, false);

  const day2 = updatePlayStreak(day1.streak, day1.lastDateKey, "2026-11-11");
  assert.equal(day2.streak, 2);
  assert.equal(day2.incremented, true);

  const missed = updatePlayStreak(day2.streak, day2.lastDateKey, "2026-11-14");
  assert.equal(missed.streak, 1);
});

test("Achievements evaluate unlocked badges from player stats", () => {
  const res = evaluateAchievements({
    playedCount: 6,
    totalScore: 5400,
    maxSingleScore: 700,
    streak: 3,
    level: 5,
  });
  const unlockedIds = res.filter((a) => a.unlocked).map((a) => a.id);
  assert.ok(unlockedIds.includes("first_blood"));
  assert.ok(unlockedIds.includes("explorer_5"));
  assert.ok(unlockedIds.includes("total_5k"));
  assert.ok(unlockedIds.includes("gold_ace"));
  assert.ok(unlockedIds.includes("streak_3"));
  assert.ok(unlockedIds.includes("level_5"));
  assert.equal(unlockedIds.includes("prism_god"), false);
});

test("4 Bot Intelligence Tiers scale IQ and Nim AI behavior", () => {
  assert.equal(BOT_TIERS.length, 4);
  assert.ok(getBotTier("rookie").iq < getBotTier("tactician").iq);
  assert.ok(getBotTier("tactician").iq < getBotTier("mastermind").iq);
  assert.ok(getBotTier("mastermind").iq < getBotTier("apex").iq);

  const piles = [3, 4, 5];
  const apexMove = chooseNimAiMove(piles, "apex");
  const after = [...piles];
  after[apexMove.pile] -= apexMove.remove;
  assert.equal(after.reduce((a, b) => a ^ b, 0), 0);

  const rookieMove = chooseNimAiMove(piles, "rookie");
  assert.equal(rookieMove.remove, 1);
});

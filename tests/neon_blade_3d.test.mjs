import test from "node:test";
import assert from "node:assert/strict";

import {
  BLADE_SKINS,
  CORE_Y,
  TARGET_RADIUS,
  IMPACT_Y,
  MIN_BLADE_SEP,
  createInitialNeonBladeState,
  advanceToNextStage,
  throwNeonBlade,
  stepNeonBladeState,
} from "../src/Components/games/neonBladeEngine.js";
import { computeBladeImpactAngle, normalizeAngle } from "../src/Components/games/arcadeEngines.js";

test("Neon Blade 3D: throwing, sticking, multi-stage shatter & Boss core progression", () => {
  assert.equal(BLADE_SKINS.length, 4);
  const st = createInitialNeonBladeState(1, "cyber", () => 0.5);
  st.phase = "playing";
  st.knivesLeft = 2;
  st.knivesTotal = 2;
  st.stuckKnives = [];
  st.orbs = [];

  // Fire blade 1
  assert.equal(throwNeonBlade(st), true);
  assert.equal(st.knivesLeft, 1);
  assert.equal(st.flyingKnives.length, 1);
  // Rapid fire immediately blocked during 0.085s cooldown, allowed right after
  assert.equal(throwNeonBlade(st), false);

  // Step until first blade impacts wheel
  let hit1 = false;
  for (let i = 0; i < 12; i++) {
    const ev = stepNeonBladeState(st, 0.02);
    if (ev.hit) hit1 = true;
  }
  assert.equal(hit1, true);
  assert.equal(st.stuckKnives.length, 1);
  assert.equal(st.phase, "playing");

  // Fire final blade after cooldown & rotate safely away so no clash
  st.targetAngle = Math.PI;
  assert.equal(throwNeonBlade(st), true);
  let cleared = false;
  for (let i = 0; i < 15; i++) {
    const ev = stepNeonBladeState(st, 0.02);
    if (ev.stageCleared) cleared = true;
  }
  assert.equal(cleared, true);
  assert.equal(st.phase, "shattering");
  assert.equal(st.shatterShards.length, 12);
  assert.ok(st.ricochetBlades.length >= 2);

  // Finish shatter animation -> transitions cleanly to levelclear
  let readyNext = false;
  for (let i = 0; i < 25; i++) {
    const ev = stepNeonBladeState(st, 0.04);
    if (ev.readyForNext) readyNext = true;
  }
  assert.equal(readyNext, true);
  assert.equal(st.phase, "levelclear");

  // Advance to Stage 5 Boss check
  st.level = 4;
  advanceToNextStage(st, () => 0.5);
  assert.equal(st.level, 5);
  assert.equal(st.isBoss, true);
  assert.ok(st.bossName.length > 0);
});

test("Neon Blade 3D: Gold Orb, Chrono Slow-Mo, Razor Graze, Overdrive 2X & Ricochet Clash", () => {
  const st = createInitialNeonBladeState(2, "solar", () => 0.5);
  st.phase = "playing";
  st.baseSpeed = 0; // freeze spin for deterministic placement test
  st.targetAngle = 0;
  st.knivesLeft = 5;

  // Compute exact impact angle for current targetAngle = 0 -> 0
  const impact = computeBladeImpactAngle(st.targetAngle);
  // Place a stuck knife just inside Razor Graze window (MIN_BLADE_SEP + 0.05)
  st.stuckKnives = [{ angle: normalizeAngle(impact + MIN_BLADE_SEP + 0.05), skin: "hazard", recoil: 0 }];
  // Place both a Gold Orb & Chrono Crystal near impact = 0
  st.orbs = [
    { id: "g1", angle: normalizeAngle(impact + 0.05), type: "gold", sliced: false },
    { id: "c1", angle: normalizeAngle(impact - 0.05), type: "chrono", sliced: false },
  ];
  st.fever = 85; // pushing over 100 activates Overdrive 2X

  assert.equal(throwNeonBlade(st), true);
  let eventsSeen = { graze: false, orbSliced: false, chronoActivated: false, overdriveTriggered: false };
  for (let i = 0; i < 12; i++) {
    const ev = stepNeonBladeState(st, 0.02);
    if (ev.graze) eventsSeen.graze = true;
    if (ev.orbSliced) eventsSeen.orbSliced = true;
    if (ev.chronoActivated) eventsSeen.chronoActivated = true;
    if (ev.overdriveTriggered) eventsSeen.overdriveTriggered = true;
  }
  assert.equal(eventsSeen.graze, true);
  assert.equal(eventsSeen.orbSliced, true);
  assert.equal(eventsSeen.chronoActivated, true);
  assert.equal(eventsSeen.overdriveTriggered, true);
  assert.ok(st.chronoTimer > 2.5);
  assert.ok(st.overdriveTimer > 5.0);
  assert.equal(st.grazes, 1);
  assert.equal(st.stageOrbsSliced, 1);
  // Overdrive 2X multiplied hit+orb+graze score -> (10 + 25 + 15 + 20) * 2 = 140
  assert.equal(st.score, 140);

  // Verify Chrono slows spin speed when baseSpeed is non-zero
  st.baseSpeed = 2.0;
  const beforeAng = st.targetAngle;
  stepNeonBladeState(st, 0.05);
  const deltaSlow = Math.abs(st.targetAngle - beforeAng);
  assert.ok(deltaSlow < 0.055, `Expected chrono 0.45x spin speed, got delta ${deltaSlow}`);

  // Firing straight into the stuck blade at impact = st.targetAngle causes ricochet clash gameover
  st.throwCooldown = 0;
  st.knivesLeft = 3;
  st.stuckKnives.push({ angle: computeBladeImpactAngle(st.targetAngle), skin: "cyber", recoil: 0 });
  assert.equal(throwNeonBlade(st), true);
  st.flyingKnives[0].y = IMPACT_Y - 0.05;
  const clashEv = stepNeonBladeState(st, 0.02);
  assert.equal(clashEv.clash, true);
  assert.equal(st.phase, "gameover");
  assert.ok(st.ricochetBlades.length >= 1);
  assert.ok(CORE_Y > TARGET_RADIUS * 0.5);
});

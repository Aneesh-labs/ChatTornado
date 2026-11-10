import test from "node:test";
import assert from "node:assert/strict";

import {
  CORE_CELL,
  createInitialGrid,
  gridToWorld,
} from "../src/Components/games/vortexBastion/pathfinding.js";
import {
  createCombatState,
  createEnemyInstance,
  placeTurret,
  upgradeTurret,
  enqueueWave,
  applyEnemyDamage,
  stepCombat,
  buildWaveRoster,
} from "../src/Components/games/vortexBastion/turretsAndCombat.js";

test("Vortex Bastion C3: Aegis shield takes 2.5x from electric & Healer restores nearby allies", () => {
  const sim = createCombatState(createInitialGrid());
  const pos = gridToWorld(4, 6);
  const aegis = createEnemyInstance(
    { kind: "shielded", hp: 100, maxHp: 100, shield: 80, maxShield: 80, armor: 0, speed: 0, reward: 20, coreDmg: 1 },
    1,
    [{ col: 4, row: 6 }, CORE_CELL]
  );
  // Kinetic 20 takes 20 shield (remaining 60)
  applyEnemyDamage(sim, aegis, 20, null, "kinetic");
  assert.equal(aegis.shield, 60);

  // Electric 24 hits shield for 24 * 2.5 = 60 -> breaks shield cleanly!
  applyEnemyDamage(sim, aegis, 24, null, "electric");
  assert.equal(aegis.shield, 0);
  assert.equal(aegis.hp, 100);

  // Healer pulse restores injured ally within 2.1 tiles
  const injured = createEnemyInstance(
    { kind: "drone", hp: 50, maxHp: 100, armor: 0, speed: 0, reward: 10, coreDmg: 1 },
    2,
    [{ col: 4, row: 6 }, CORE_CELL]
  );
  const healer = createEnemyInstance(
    { kind: "healer", hp: 80, maxHp: 80, armor: 0, speed: 0, reward: 20, coreDmg: 1 },
    3,
    [{ col: 4, row: 6 }, CORE_CELL]
  );
  healer.healCooldown = 0.01;
  sim.enemies = [injured, healer];
  stepCombat(sim, 0.03);
  assert.ok(injured.hp > 50, `Expected healer pulse to heal ally from 50, got ${injured.hp}`);
  assert.ok(pos);
});

test("Vortex Bastion C3: Stealth Cloaker evades long-range Rail until Cryo reveal, and Cryo+Mortar triggers THERMAL SHATTER", () => {
  const sim = createCombatState(createInitialGrid());
  sim.credits = 900;

  // Rail placed far away at (4, 10); cloaker at (4, 6) => dist 4.0 > 1.95
  placeTurret(sim, "rail", { col: 4, row: 10 });
  const cloaker = createEnemyInstance(
    { kind: "cloaker", hp: 120, maxHp: 120, speed: 0, reward: 20, coreDmg: 1, stealthed: true },
    1,
    [{ col: 4, row: 6 }, CORE_CELL]
  );
  sim.enemies = [cloaker];
  stepCombat(sim, 0.03);
  assert.equal(cloaker.hp, 120, "Rail should not target unrevealed cloaker at distance 4");

  // Place Cryo nearby at (3, 6) -> slows & reveals cloaker, allowing Rail to strike next!
  placeTurret(sim, "cryo", { col: 3, row: 6 });
  stepCombat(sim, 0.03);
  assert.ok(cloaker.revealTimer > 1.0);
  assert.ok(cloaker.hp < 120);

  // Elemental Synergy: Siege Mortar (Pulse T3-B burn) + Chilled target => THERMAL SHATTER!
  const pulse = placeTurret(sim, "pulse", { col: 5, row: 6 });
  upgradeTurret(sim, pulse.tower.id);
  upgradeTurret(sim, pulse.tower.id, "B"); // Siege Mortar applies burn / triggers shatter on slow
  const chilledTank = createEnemyInstance(
    { kind: "juggernaut", hp: 400, maxHp: 400, armor: 10, speed: 0, reward: 25, coreDmg: 2 },
    2,
    [{ col: 4, row: 6 }, CORE_CELL]
  );
  chilledTank.slowTimer = 3.0;
  chilledTank.slowFactor = 0.4;
  sim.enemies = [chilledTank];

  for (let i = 0; i < 20; i++) stepCombat(sim, 0.03);
  assert.ok(sim.reactionsTriggered >= 1, "Expected Thermal Shatter reaction to trigger!");
  assert.ok(chilledTank.armorShredTimer > 0);
});

test("Vortex Bastion C3: compound 10% wave-clear interest & early-send risk bonus", () => {
  const sim = createCombatState(createInitialGrid());
  sim.credits = 400;
  enqueueWave(sim);
  // Early-send while queue still active grants +25⚡
  const creditsBeforeEarly = sim.credits;
  enqueueWave(sim);
  assert.equal(sim.credits, creditsBeforeEarly + 25);

  // Simulate wave clear with 500 saved credits -> +50 interest (capped at 60) + wave bonus
  sim.credits = 500;
  sim.wave = 2;
  sim.waveActive = true;
  sim.spawnQueue = [];
  sim.enemies = [];
  const ev = stepCombat(sim, 0.02);
  assert.equal(ev.waveCleared, true);
  // interest = 50, waveBonus = 30 + 2*5 = 40 -> total 590
  assert.equal(sim.credits, 590);

  // Roster scales up cleanly by wave 4 with healer/cloaker/shielded
  const w4 = buildWaveRoster(4);
  assert.ok(w4.some((u) => u.kind === "shielded"));
  assert.ok(w4.some((u) => u.kind === "cloaker"));
  assert.ok(w4.some((u) => u.kind === "healer"));
});

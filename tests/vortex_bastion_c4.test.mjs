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
  buildWaveRoster,
  applyEnemyDamage,
  triggerOrbitalAbility,
  stepCombat,
} from "../src/Components/games/vortexBastion/turretsAndCombat.js";

test("Vortex Bastion C4: Wave 5 spawns Dreadnought Boss & 50% HP triggers Phase 2 swarm split", () => {
  const w5 = buildWaveRoster(5);
  const bossTemplate = w5.find((u) => u.kind === "boss");
  assert.ok(bossTemplate, "Wave 5 roster should include Dreadnought Boss");
  assert.ok(bossTemplate.maxShield > 0);

  const sim = createCombatState(createInitialGrid());
  sim.wave = 5;
  const boss = createEnemyInstance(bossTemplate, 1, [{ col: 4, row: 5 }, CORE_CELL]);
  boss.shield = 0;
  sim.enemies = [boss];

  // Damage boss past 50% HP threshold -> deploys 3 Hyper Swarmers!
  applyEnemyDamage(sim, boss, Math.round(boss.maxHp * 0.6), null, "pierce");
  assert.equal(boss.splitTriggered, true);
  const swarmers = sim.enemies.filter((e) => e.kind === "swarmer");
  assert.equal(swarmers.length, 3);
  assert.ok(sim.shakeTimer > 0);
});

test("Vortex Bastion C4: Orbital Ion burns/damages cluster & EMP strips shields + enforces cooldown", () => {
  const sim = createCombatState(createInitialGrid());
  sim.wave = 2;
  const targetCell = { col: 4, row: 6 };
  const targetW = gridToWorld(targetCell.col, targetCell.row);

  const shielded = createEnemyInstance(
    { kind: "shielded", hp: 300, maxHp: 300, shield: 150, maxShield: 150, armor: 0, speed: 1, reward: 20, coreDmg: 1 },
    1,
    [targetCell, CORE_CELL]
  );
  sim.enemies = [shielded];

  // EMP strips 100% shield + stuns non-boss
  const empRes = triggerOrbitalAbility(sim, "emp", targetCell);
  assert.equal(empRes.ok, true);
  assert.equal(shielded.shield, 0);
  assert.ok(shielded.stunTimer >= 2.5);
  assert.ok(sim.abilities.empCooldown >= 17);

  // Double cast during cooldown is blocked
  const empBlocked = triggerOrbitalAbility(sim, "emp", targetCell);
  assert.equal(empBlocked.ok, false);

  // Ion deals heavy thermal damage & applies burn
  const hpBeforeIon = shielded.hp;
  const ionRes = triggerOrbitalAbility(sim, "ion", targetCell);
  assert.equal(ionRes.ok, true);
  assert.ok(shielded.hp < hpBeforeIon - 150);
  assert.ok(shielded.burnTimer >= 3.5);
  assert.ok(sim.effects.some((fx) => fx.kind === "orbital_beam"));
  assert.ok(targetW);

  // Stepping combat ticks cooldowns down
  const cdBefore = sim.abilities.ionCooldown;
  stepCombat(sim, 0.05);
  assert.ok(sim.abilities.ionCooldown < cdBefore);
});

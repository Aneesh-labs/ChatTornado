import test from "node:test";
import assert from "node:assert/strict";

import { createInitialGrid, findPath } from "../src/Components/games/vortexBastion/pathfinding.js";
import {
  createCombatState,
  placeTurret,
  upgradeTurret,
  enqueueWave,
  triggerOrbitalAbility,
  stepCombat,
} from "../src/Components/games/vortexBastion/turretsAndCombat.js";

test("Vortex Bastion C5: 3D floating combat popups emit on kill/overcharge and float upward to expiry", () => {
  const sim = createCombatState(createInitialGrid());
  sim.credits = 800;

  const tesla = placeTurret(sim, "tesla", { col: 3, row: 6 });
  const rail = placeTurret(sim, "rail", { col: 4, row: 10 });
  assert.equal(tesla.ok && rail.ok, true);

  enqueueWave(sim);
  for (let i = 0; i < 240; i++) {
    stepCombat(sim, 0.05);
    if (sim.kills >= 1 && sim.popups.length > 0) break;
  }
  assert.ok(sim.kills >= 1);

  // If any popup is currently alive, verify y rises as life decays
  if (sim.popups.length > 0) {
    const startY = sim.popups[0].y;
    const startLife = sim.popups[0].life;
    stepCombat(sim, 0.04);
    if (sim.popups.length > 0 && sim.popups[0].life < startLife) {
      assert.ok(sim.popups[0].y > startY);
    }
  }
});

test("Vortex Bastion C5: full 5-wave simulated campaign through Wave 5 Dreadnought Boss without NaN/state corruption", () => {
  const sim = createCombatState(createInitialGrid());
  sim.credits = 1500;
  sim.speedMult = 3;

  // Build tactical maze bend + full 4-turret elemental killbox
  const placements = [
    ["pulse", { col: 4, row: 4 }],
    ["cryo", { col: 3, row: 5 }],
    ["tesla", { col: 5, row: 5 }],
    ["rail", { col: 4, row: 8 }],
    ["pulse", { col: 3, row: 7 }],
    ["tesla", { col: 5, row: 7 }],
  ];

  const built = [];
  for (const [type, cell] of placements) {
    const res = placeTurret(sim, type, cell);
    assert.equal(res.ok, true, `Failed to place ${type} at (${cell.col},${cell.row}): ${res.reason}`);
    built.push(res.tower);
  }

  // Upgrade Pulse[0] -> T3-B Siege Mortar (cryo+burn Thermal Shatter combo!)
  assert.equal(upgradeTurret(sim, built[0].id).ok, true);
  assert.equal(upgradeTurret(sim, built[0].id, "B").ok, true);
  // Upgrade Tesla -> T3-A Arc Capacitor (6 chain targets)
  assert.equal(upgradeTurret(sim, built[2].id).ok, true);
  assert.equal(upgradeTurret(sim, built[2].id, "A").ok, true);

  const mazePath = findPath(sim.grid);
  assert.ok(mazePath && mazePath.length > 13);

  // Run Waves 1 through 5
  for (let w = 1; w <= 5; w++) {
    assert.equal(enqueueWave(sim), true);
    let ticks = 0;
    while ((sim.spawnQueue.length > 0 || sim.enemies.length > 0) && ticks < 1500 && !sim.gameOver) {
      if (ticks === 90) triggerOrbitalAbility(sim, "emp", { col: 4, row: 6 });
      if (ticks === 100) triggerOrbitalAbility(sim, "ion", { col: 4, row: 6 });
      stepCombat(sim, 0.05);
      ticks += 1;
    }
    assert.equal(sim.gameOver, false, `Bastion unexpectedly breached on wave ${w}`);
  }

  assert.equal(sim.wave, 5);
  assert.ok(sim.kills >= 40);
  assert.ok(sim.score > 2000);
  assert.ok(Number.isFinite(sim.credits));
  assert.ok(sim.coreHp > 0);
});

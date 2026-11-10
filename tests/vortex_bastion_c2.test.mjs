import test from "node:test";
import assert from "node:assert/strict";

import {
  CELL_EMPTY,
  CELL_TOWER,
  CORE_CELL,
  createInitialGrid,
  gridToWorld,
} from "../src/Components/games/vortexBastion/pathfinding.js";
import {
  TURRET_CATALOG,
  createCombatState,
  placeTurret,
  upgradeTurret,
  salvageTurret,
  enqueueWave,
  stepCombat,
} from "../src/Components/games/vortexBastion/turretsAndCombat.js";

test("Vortex Bastion C2: place, upgrade Tier 1 -> 2 -> 3 Branch A/B, and salvage 70% refund", () => {
  const sim = createCombatState(createInitialGrid());
  sim.credits = 500;

  const built = placeTurret(sim, "pulse", { col: 3, row: 5 });
  assert.equal(built.ok, true);
  assert.equal(sim.credits, 500 - TURRET_CATALOG.pulse.cost);
  assert.equal(sim.grid[5][3], CELL_TOWER);

  // Upgrade to Tier 2
  const u2 = upgradeTurret(sim, built.tower.id);
  assert.equal(u2.ok, true);
  assert.equal(built.tower.tier, 2);
  assert.ok(built.tower.stats.damage > TURRET_CATALOG.pulse.damage);

  // Upgrade to Tier 3 Branch B (Siege Mortar with splash radius)
  const u3 = upgradeTurret(sim, built.tower.id, "B");
  assert.equal(u3.ok, true);
  assert.equal(built.tower.tier, 3);
  assert.equal(built.tower.branch, "B");
  assert.ok(built.tower.stats.splashRadius > 0);

  // Salvage refunds 70% of total invested credits and clears grid cell
  const creditsBefore = sim.credits;
  const expectedRefund = Math.round(built.tower.totalInvested * 0.7);
  const sal = salvageTurret(sim, built.tower.id);
  assert.equal(sal.ok, true);
  assert.equal(sal.refund, expectedRefund);
  assert.equal(sim.credits, creditsBefore + expectedRefund);
  assert.equal(sim.grid[5][3], CELL_EMPTY);
});

test("Vortex Bastion C2: Pulse fires projectiles & kills enemy, Cryo chills, Tesla chains, Rail pierces", () => {
  // 1) Pulse cannon kills drone and grants credits/score
  const pulseSim = createCombatState(createInitialGrid());
  const pPlaced = placeTurret(pulseSim, "pulse", { col: 3, row: 6 });
  const targetW = gridToWorld(4, 6);
  pulseSim.enemies.push({
    id: "e1",
    kind: "drone",
    hp: 15,
    maxHp: 15,
    baseSpeed: 0,
    reward: 14,
    coreDmg: 1,
    col: 4,
    row: 6,
    wx: targetW.x,
    wz: targetW.z,
    yaw: 0,
    path: [{ col: 4, row: 6 }, CORE_CELL],
    waypointIdx: 1,
    progressRatio: 0.5,
    slowFactor: 0,
    slowTimer: 0,
    stunTimer: 0,
    vulnBonus: 0,
    dead: false,
  });
  for (let i = 0; i < 15; i++) stepCombat(pulseSim, 0.03);
  assert.equal(pulseSim.kills, 1);
  assert.ok(pulseSim.credits > 340 - TURRET_CATALOG.pulse.cost);
  assert.equal(pPlaced.tower.kills, 1);

  // 2) Cryo applies slowFactor
  const cryoSim = createCombatState(createInitialGrid());
  placeTurret(cryoSim, "cryo", { col: 3, row: 6 });
  cryoSim.enemies.push({
    id: "e2",
    kind: "drone",
    hp: 200,
    maxHp: 200,
    baseSpeed: 1.5,
    reward: 10,
    coreDmg: 1,
    col: 4,
    row: 6,
    wx: targetW.x,
    wz: targetW.z,
    yaw: 0,
    path: [{ col: 4, row: 6 }, CORE_CELL],
    waypointIdx: 1,
    progressRatio: 0.5,
    slowFactor: 0,
    slowTimer: 0,
    stunTimer: 0,
    vulnBonus: 0,
    dead: false,
  });
  stepCombat(cryoSim, 0.03);
  assert.ok(cryoSim.enemies[0].slowFactor >= 0.4);
  assert.ok(cryoSim.enemies[0].slowTimer > 1.5);

  // 3) Tesla chains across 3 clustered targets
  const teslaSim = createCombatState(createInitialGrid());
  placeTurret(teslaSim, "tesla", { col: 3, row: 6 });
  for (let k = 0; k < 3; k++) {
    const pos = gridToWorld(4, 5 + k);
    teslaSim.enemies.push({
      id: `te_${k}`,
      kind: "drone",
      hp: 100,
      maxHp: 100,
      baseSpeed: 0,
      reward: 10,
      coreDmg: 1,
      col: 4,
      row: 5 + k,
      wx: pos.x,
      wz: pos.z,
      yaw: 0,
      path: [{ col: 4, row: 5 + k }, CORE_CELL],
      waypointIdx: 1,
      progressRatio: 0.4 + k * 0.1,
      slowFactor: 0,
      slowTimer: 0,
      stunTimer: 0,
      vulnBonus: 0,
      dead: false,
    });
  }
  stepCombat(teslaSim, 0.03);
  // All 3 enemies in chain should have taken lightning damage
  assert.ok(teslaSim.enemies.every((e) => e.hp < 100));

  // 4) Rail Spire pierces multiple aligned targets
  const railSim = createCombatState(createInitialGrid());
  placeTurret(railSim, "rail", { col: 4, row: 4 });
  for (let k = 0; k < 2; k++) {
    const pos = gridToWorld(4, 6 + k);
    railSim.enemies.push({
      id: `re_${k}`,
      kind: "drone",
      hp: 200,
      maxHp: 200,
      baseSpeed: 0,
      reward: 10,
      coreDmg: 1,
      col: 4,
      row: 6 + k,
      wx: pos.x,
      wz: pos.z,
      yaw: 0,
      path: [{ col: 4, row: 6 + k }, CORE_CELL],
      waypointIdx: 1,
      progressRatio: 0.5 + k * 0.1,
      slowFactor: 0,
      slowTimer: 0,
      stunTimer: 0,
      vulnBonus: 0,
      dead: false,
    });
  }
  stepCombat(railSim, 0.03);
  assert.ok(railSim.enemies.every((e) => e.hp === 200 - TURRET_CATALOG.rail.damage));
});

test("Vortex Bastion C2: wave spawning & core breach triggers gameOver at 0 HP", () => {
  const sim = createCombatState(createInitialGrid());
  assert.equal(enqueueWave(sim), true);
  assert.equal(sim.wave, 1);
  assert.ok(sim.spawnQueue.length >= 8);

  const coreW = gridToWorld(CORE_CELL.col, CORE_CELL.row);
  sim.coreHp = 1;
  sim.spawnQueue = [];
  sim.enemies = [
    {
      id: "breach",
      kind: "drone",
      hp: 50,
      maxHp: 50,
      baseSpeed: 5,
      reward: 10,
      coreDmg: 1,
      col: CORE_CELL.col,
      row: CORE_CELL.row,
      wx: coreW.x,
      wz: coreW.z,
      yaw: 0,
      path: [CORE_CELL],
      waypointIdx: 0,
      progressRatio: 0.99,
      slowFactor: 0,
      slowTimer: 0,
      stunTimer: 0,
      vulnBonus: 0,
      dead: false,
    },
  ];
  const ev = stepCombat(sim, 0.05);
  assert.equal(ev.leaked, true);
  assert.equal(sim.coreHp, 0);
  assert.equal(sim.gameOver, true);
});

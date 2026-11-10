/**
 * Core Combat Engine, 4 Articulated Turret Archetypes, Branching Tier 1-3 Upgrades,
 * Projectiles, Cryo Slow, Tesla Chain Lightning & Rail Pierce for Vortex Bastion.
 */

import {
  CELL_EMPTY,
  CELL_TOWER,
  CORE_CELL,
  SPAWN_CELL,
  findPath,
  previewTowerPlacement,
  gridToWorld,
} from "./pathfinding.js";

export const TURRET_CATALOG = {
  pulse: {
    id: "pulse",
    name: "Pulse Bastion",
    short: "Pulse",
    colorHex: 0x38bdf8,
    accent: "#38bdf8",
    cost: 60,
    range: 2.55,
    damage: 18,
    fireRate: 2.4, // shots/sec
    projSpeed: 12.5,
    desc: "Rapid kinetic dual-cannon. High single-target DPS.",
    tier2Cost: 75,
    branches: {
      A: {
        name: "Gatling Overdrive",
        cost: 140,
        rangeMult: 1.12,
        damageMult: 0.9,
        fireRateMult: 2.2,
        desc: "Quad rotary barrels firing blisteringly fast.",
      },
      B: {
        name: "Siege Mortar",
        cost: 145,
        rangeMult: 1.2,
        damageMult: 2.2,
        fireRateMult: 0.85,
        splashRadius: 1.25,
        desc: "Heavy explosive plasma shells with AoE blast.",
      },
    },
  },
  cryo: {
    id: "cryo",
    name: "Cryo Projector",
    short: "Cryo",
    colorHex: 0x22d3ee,
    accent: "#22d3ee",
    cost: 85,
    range: 2.35,
    damage: 10,
    fireRate: 1.0,
    slowFactor: 0.42, // reduces speed by 42%
    slowDuration: 2.4,
    desc: "Frost emitter chilling & slowing nearby squads.",
    tier2Cost: 90,
    branches: {
      A: {
        name: "Permafrost Matrix",
        cost: 150,
        rangeMult: 1.25,
        damageMult: 1.4,
        fireRateMult: 1.15,
        slowFactor: 0.62,
        desc: "Massive freezing field (-62% speed + brittle armor).",
      },
      B: {
        name: "Shatter Nova",
        cost: 155,
        rangeMult: 1.08,
        damageMult: 2.6,
        fireRateMult: 1.4,
        slowFactor: 0.48,
        desc: "High-frequency frost bursts deal heavy AoE damage.",
      },
    },
  },
  tesla: {
    id: "tesla",
    name: "Tesla Spire",
    short: "Tesla",
    colorHex: 0xfbbf24,
    accent: "#fbbf24",
    cost: 110,
    range: 2.75,
    damage: 24,
    fireRate: 1.35,
    chainCount: 3,
    chainRadius: 2.2,
    desc: "High-voltage spire arcing chain lightning across foes.",
    tier2Cost: 115,
    branches: {
      A: {
        name: "Arc Capacitor",
        cost: 170,
        rangeMult: 1.15,
        damageMult: 1.25,
        fireRateMult: 1.35,
        chainCount: 6,
        desc: "Jumps lightning across up to 6 targets per discharge.",
      },
      B: {
        name: "Overload Pylon",
        cost: 175,
        rangeMult: 1.1,
        damageMult: 2.1,
        fireRateMult: 0.95,
        chainCount: 3,
        stunDuration: 0.35,
        desc: "Heavy voltage surge briefly stuns primary target.",
      },
    },
  },
  rail: {
    id: "rail",
    name: "Rail Spire",
    short: "Rail",
    colorHex: 0xc084fc,
    accent: "#c084fc",
    cost: 140,
    range: 4.6,
    damage: 68,
    fireRate: 0.58,
    pierceCount: 3,
    desc: "Long-range electromagnetic beam piercing lined targets.",
    tier2Cost: 135,
    branches: {
      A: {
        name: "Hyper-Penetrator",
        cost: 210,
        rangeMult: 1.3,
        damageMult: 1.9,
        fireRateMult: 1.15,
        pierceCount: 6,
        desc: "Corridor-spanning laser slicing through 6 enemies.",
      },
      B: {
        name: "Orbital Marker",
        cost: 215,
        rangeMult: 1.15,
        damageMult: 1.6,
        fireRateMult: 1.35,
        pierceCount: 3,
        markVuln: 0.3,
        desc: "Targets take +30% extra damage from all turrets.",
      },
    },
  },
};

export function computeTurretStats(type, tier = 1, branch = null) {
  const base = TURRET_CATALOG[type];
  if (!base) return null;

  let range = base.range;
  let damage = base.damage;
  let fireRate = base.fireRate;
  let slowFactor = base.slowFactor || 0;
  let chainCount = base.chainCount || 0;
  let pierceCount = base.pierceCount || 1;
  let splashRadius = 0;
  let stunDuration = 0;
  let markVuln = 0;

  if (tier >= 2) {
    range *= 1.1;
    damage = Math.round(damage * 1.45);
    fireRate *= 1.15;
    if (slowFactor > 0) slowFactor = Math.min(0.55, slowFactor + 0.08);
    if (chainCount > 0) chainCount += 1;
    if (pierceCount > 1) pierceCount += 1;
  }

  if (tier >= 3 && branch && base.branches?.[branch]) {
    const br = base.branches[branch];
    range *= br.rangeMult || 1;
    damage = Math.round(damage * (br.damageMult || 1));
    fireRate *= br.fireRateMult || 1;
    if (br.slowFactor) slowFactor = br.slowFactor;
    if (br.chainCount) chainCount = br.chainCount;
    if (br.pierceCount) pierceCount = br.pierceCount;
    if (br.splashRadius) splashRadius = br.splashRadius;
    if (br.stunDuration) stunDuration = br.stunDuration;
    if (br.markVuln) markVuln = br.markVuln;
  }

  return {
    range: +range.toFixed(2),
    damage,
    fireRate: +fireRate.toFixed(2),
    slowFactor,
    chainCount,
    pierceCount,
    splashRadius,
    stunDuration,
    markVuln,
  };
}

export function getUpgradeOptions(tower) {
  const catalog = TURRET_CATALOG[tower.type];
  if (!catalog || tower.tier >= 3) return [];
  if (tower.tier === 1) {
    return [
      {
        tier: 2,
        branch: null,
        label: `Upgrade Tier 2`,
        cost: catalog.tier2Cost,
        desc: "+45% DMG, +15% Fire Rate & +10% Range",
      },
    ];
  }
  return ["A", "B"].map((key) => ({
    tier: 3,
    branch: key,
    label: catalog.branches[key].name,
    cost: catalog.branches[key].cost,
    desc: catalog.branches[key].desc,
  }));
}

export function createCombatState(grid) {
  return {
    grid: grid.map((r) => [...r]),
    credits: 340,
    coreHp: 20,
    maxCoreHp: 20,
    wave: 0,
    score: 0,
    kills: 0,
    speedMult: 1,
    towers: [],
    enemies: [],
    projectiles: [],
    effects: [],
    spawnQueue: [],
    spawnCooldown: 0,
    nextId: 1,
    gameOver: false,
  };
}

export function placeTurret(state, type, cell) {
  const cat = TURRET_CATALOG[type];
  if (!cat) return { ok: false, reason: "Unknown turret" };
  if (state.credits < cat.cost) return { ok: false, reason: "Insufficient credits" };

  const check = previewTowerPlacement(state.grid, cell, state.enemies);
  if (!check.valid) return { ok: false, reason: check.reason };

  state.grid[cell.row][cell.col] = CELL_TOWER;
  state.credits -= cat.cost;

  const pos = gridToWorld(cell.col, cell.row);
  const stats = computeTurretStats(type, 1, null);
  const tower = {
    id: `t_${state.nextId++}`,
    type,
    col: cell.col,
    row: cell.row,
    wx: pos.x,
    wz: pos.z,
    tier: 1,
    branch: null,
    totalInvested: cat.cost,
    targeting: "first", // "first" | "strongest" | "close"
    yaw: 0,
    cooldown: 0,
    recoil: 0,
    kills: 0,
    stats,
  };
  state.towers.push(tower);

  // Re-route active enemies smoothly around new tower
  rerouteActiveEnemies(state);

  return { ok: true, tower };
}

export function upgradeTurret(state, towerId, branch = null) {
  const tower = state.towers.find((t) => t.id === towerId);
  if (!tower || tower.tier >= 3) return { ok: false, reason: "Max tier reached" };

  const cat = TURRET_CATALOG[tower.type];
  let cost;
  const nextTier = tower.tier + 1;
  let chosenBranch = null;

  if (tower.tier === 1) {
    cost = cat.tier2Cost;
  } else {
    chosenBranch = branch === "B" ? "B" : "A";
    cost = cat.branches[chosenBranch].cost;
  }

  if (state.credits < cost) return { ok: false, reason: "Insufficient credits" };

  state.credits -= cost;
  tower.tier = nextTier;
  tower.branch = chosenBranch;
  tower.totalInvested += cost;
  tower.stats = computeTurretStats(tower.type, tower.tier, tower.branch);

  state.effects.push({
    id: `fx_${state.nextId++}`,
    kind: "upgrade",
    x: tower.wx,
    y: 0.6,
    z: tower.wz,
    color: cat.colorHex,
    life: 0.45,
    maxLife: 0.45,
  });

  return { ok: true, tower };
}

export function salvageTurret(state, towerId) {
  const idx = state.towers.findIndex((t) => t.id === towerId);
  if (idx === -1) return { ok: false, refund: 0 };
  const tower = state.towers[idx];
  const refund = Math.round(tower.totalInvested * 0.7);
  state.credits += refund;
  state.grid[tower.row][tower.col] = CELL_EMPTY;
  state.towers.splice(idx, 1);
  rerouteActiveEnemies(state);
  return { ok: true, refund };
}

export function rerouteActiveEnemies(state) {
  for (const enemy of state.enemies) {
    const startCell = {
      col: Math.max(0, Math.min(8, Math.round(enemy.col))),
      row: Math.max(0, Math.min(12, Math.round(enemy.row))),
    };
    const newPath = findPath(state.grid, startCell, CORE_CELL);
    if (newPath && newPath.length > 0) {
      enemy.path = newPath;
      enemy.waypointIdx = Math.min(1, newPath.length - 1);
    }
  }
}

export function enqueueWave(state) {
  if (state.gameOver) return false;
  state.wave += 1;
  const w = state.wave;
  const count = 6 + w * 2;
  const mainPath = findPath(state.grid, SPAWN_CELL, CORE_CELL) || [SPAWN_CELL, CORE_CELL];

  for (let i = 0; i < count; i++) {
    const isHeavy = w >= 2 && i % 4 === 3;
    const isFast = w >= 3 && i % 5 === 2;
    const baseHp = Math.round((46 + w * 24) * (isHeavy ? 2.3 : isFast ? 0.68 : 1));
    state.spawnQueue.push({
      kind: isHeavy ? "juggernaut" : isFast ? "swarmer" : "drone",
      hp: baseHp,
      maxHp: baseHp,
      speed: isHeavy ? 1.05 : isFast ? 2.45 : 1.55 + Math.min(0.6, w * 0.05),
      reward: isHeavy ? 24 : isFast ? 12 : 14,
      coreDmg: isHeavy ? 2 : 1,
      pathSnapshot: mainPath,
    });
  }
  state.spawnCooldown = 0.05;
  return true;
}

function chooseTarget(tower, enemies) {
  const candidates = enemies.filter((e) => {
    const dist = Math.hypot(e.wx - tower.wx, e.wz - tower.wz);
    return dist <= tower.stats.range && e.hp > 0;
  });
  if (candidates.length === 0) return null;

  if (tower.targeting === "strongest") {
    return candidates.reduce((a, b) => (b.hp > a.hp ? b : a));
  }
  if (tower.targeting === "close") {
    return candidates.reduce((a, b) =>
      Math.hypot(a.wx - tower.wx, a.wz - tower.wz) < Math.hypot(b.wx - tower.wx, b.wz - tower.wz)
        ? a
        : b
    );
  }
  // Default: "first" (furthest along path / closest to Core)
  return candidates.reduce((a, b) =>
    b.progressRatio > a.progressRatio ? b : a
  );
}

function applyEnemyDamage(state, enemy, rawDmg, sourceTower) {
  const mult = 1 + (enemy.vulnBonus || 0);
  const dmg = Math.round(rawDmg * mult);
  enemy.hp -= dmg;
  if (enemy.hp <= 0 && !enemy.dead) {
    enemy.dead = true;
    state.credits += enemy.reward;
    state.kills += 1;
    state.score += enemy.reward * 5;
    if (sourceTower) sourceTower.kills += 1;
    state.effects.push({
      id: `fx_${state.nextId++}`,
      kind: "explosion",
      x: enemy.wx,
      y: 0.45,
      z: enemy.wz,
      color: enemy.kind === "juggernaut" ? 0xf97316 : 0xf43f5e,
      life: 0.4,
      maxLife: 0.4,
    });
  }
  return dmg;
}

/**
 * Steps full real-time tower defense simulation by `rawDt` seconds.
 * Returns events for audio: `{ fired: Set, killCount, leaked }`
 */
export function stepCombat(state, rawDt) {
  const audioEvents = { fired: new Set(), killCount: 0, leaked: false };
  if (state.gameOver) return audioEvents;

  const dt = Math.min(0.05, Math.max(0.001, rawDt)) * state.speedMult;

  // 1. Wave Spawning
  if (state.spawnQueue.length > 0) {
    state.spawnCooldown -= dt;
    if (state.spawnCooldown <= 0) {
      const template = state.spawnQueue.shift();
      const freshPath = findPath(state.grid, SPAWN_CELL, CORE_CELL) || template.pathSnapshot;
      const startW = gridToWorld(freshPath[0].col, freshPath[0].row);
      state.enemies.push({
        id: `e_${state.nextId++}`,
        kind: template.kind,
        hp: template.hp,
        maxHp: template.maxHp,
        baseSpeed: template.speed,
        reward: template.reward,
        coreDmg: template.coreDmg,
        col: freshPath[0].col,
        row: freshPath[0].row,
        wx: startW.x,
        wz: startW.z,
        yaw: 0,
        path: freshPath,
        waypointIdx: freshPath.length > 1 ? 1 : 0,
        progressRatio: 0,
        slowFactor: 0,
        slowTimer: 0,
        stunTimer: 0,
        vulnBonus: 0,
        dead: false,
      });
      state.spawnCooldown = template.kind === "swarmer" ? 0.45 : 0.72;
    }
  }

  // 2. Enemy Movement & Status Timers
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (e.dead || e.hp <= 0) {
      state.enemies.splice(i, 1);
      audioEvents.killCount += 1;
      continue;
    }

    if (e.slowTimer > 0) {
      e.slowTimer = Math.max(0, e.slowTimer - dt);
      if (e.slowTimer === 0) e.slowFactor = 0;
    }
    if (e.stunTimer > 0) {
      e.stunTimer = Math.max(0, e.stunTimer - dt);
      continue;
    }

    const effSpeed = e.baseSpeed * (1 - Math.min(0.7, e.slowFactor));
    let moveBudget = effSpeed * dt;

    while (moveBudget > 0 && e.waypointIdx < e.path.length) {
      const wp = e.path[e.waypointIdx];
      const wpW = gridToWorld(wp.col, wp.row);
      const dx = wpW.x - e.wx;
      const dz = wpW.z - e.wz;
      const dist = Math.hypot(dx, dz);

      if (dist <= moveBudget) {
        e.wx = wpW.x;
        e.wz = wpW.z;
        e.col = wp.col;
        e.row = wp.row;
        moveBudget -= dist;
        e.waypointIdx += 1;
      } else {
        const vx = dx / dist;
        const vz = dz / dist;
        e.wx += vx * moveBudget;
        e.wz += vz * moveBudget;
        e.col = e.wx + 4;
        e.row = e.wz + 6;
        e.yaw = Math.atan2(vx, vz);
        moveBudget = 0;
      }
    }

    e.progressRatio = e.waypointIdx / Math.max(1, e.path.length - 1);

    // Reached Bastion Core!
    if (e.waypointIdx >= e.path.length) {
      state.coreHp = Math.max(0, state.coreHp - e.coreDmg);
      audioEvents.leaked = true;
      state.enemies.splice(i, 1);
      if (state.coreHp <= 0) {
        state.gameOver = true;
        return audioEvents;
      }
    }
  }

  // 3. Turret Aiming & Firing
  for (const t of state.towers) {
    if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 5);
    if (t.cooldown > 0) t.cooldown = Math.max(0, t.cooldown - dt);

    const target = chooseTarget(t, state.enemies);
    if (!target) continue;

    // Smooth yaw turn toward target
    const desiredYaw = Math.atan2(target.wx - t.wx, target.wz - t.wz);
    let diff = desiredYaw - t.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    t.yaw += diff * Math.min(1, dt * 14);

    if (t.cooldown > 0) continue;
    t.cooldown = 1 / t.stats.fireRate;
    t.recoil = 1.0;
    audioEvents.fired.add(t.type);

    if (t.type === "pulse") {
      state.projectiles.push({
        id: `p_${state.nextId++}`,
        towerId: t.id,
        x: t.wx + Math.sin(t.yaw) * 0.32,
        y: 0.62,
        z: t.wz + Math.cos(t.yaw) * 0.32,
        targetId: target.id,
        lastX: target.wx,
        lastZ: target.wz,
        speed: TURRET_CATALOG.pulse.projSpeed,
        damage: t.stats.damage,
        splashRadius: t.stats.splashRadius || 0,
        color: t.branch === "B" ? 0xf97316 : 0x38bdf8,
      });
    } else if (t.type === "cryo") {
      // Expanding frost dome damaging & chilling ALL enemies in range
      for (const e of state.enemies) {
        if (Math.hypot(e.wx - t.wx, e.wz - t.wz) <= t.stats.range) {
          e.slowFactor = Math.max(e.slowFactor, t.stats.slowFactor);
          e.slowTimer = Math.max(e.slowTimer, TURRET_CATALOG.cryo.slowDuration);
          if (t.tier >= 2) e.vulnBonus = Math.max(e.vulnBonus, 0.15);
          applyEnemyDamage(state, e, t.stats.damage, t);
        }
      }
      state.effects.push({
        id: `fx_${state.nextId++}`,
        kind: "cryo_ring",
        x: t.wx,
        y: 0.14,
        z: t.wz,
        radius: t.stats.range,
        color: 0x22d3ee,
        life: 0.42,
        maxLife: 0.42,
      });
    } else if (t.type === "tesla") {
      const hitSet = new Set([target.id]);
      const chainPoints = [
        { x: t.wx, y: 0.88, z: t.wz },
        { x: target.wx, y: 0.48, z: target.wz },
      ];
      applyEnemyDamage(state, target, t.stats.damage, t);
      if (t.stats.stunDuration > 0) {
        target.stunTimer = Math.max(target.stunTimer, t.stats.stunDuration);
      }

      let curSource = target;
      for (let c = 1; c < t.stats.chainCount; c++) {
        const nextHop = state.enemies.find(
          (e) =>
            !e.dead &&
            e.hp > 0 &&
            !hitSet.has(e.id) &&
            Math.hypot(e.wx - curSource.wx, e.wz - curSource.wz) <=
              TURRET_CATALOG.tesla.chainRadius
        );
        if (!nextHop) break;
        hitSet.add(nextHop.id);
        chainPoints.push({ x: nextHop.wx, y: 0.48, z: nextHop.wz });
        applyEnemyDamage(state, nextHop, Math.round(t.stats.damage * Math.pow(0.8, c)), t);
        curSource = nextHop;
      }

      state.effects.push({
        id: `fx_${state.nextId++}`,
        kind: "lightning",
        points: chainPoints,
        color: 0xfbbf24,
        life: 0.18,
        maxLife: 0.18,
      });
    } else if (t.type === "rail") {
      // Piercing supersonic beam along line from turret through primary target
      const dx = target.wx - t.wx;
      const dz = target.wz - t.wz;
      const len = Math.max(0.01, Math.hypot(dx, dz));
      const ux = dx / len;
      const uz = dz / len;
      const beamLen = t.stats.range + 0.6;

      let pierced = 0;
      for (const e of state.enemies) {
        if (pierced >= t.stats.pierceCount || e.dead) continue;
        const ex = e.wx - t.wx;
        const ez = e.wz - t.wz;
        const proj = ex * ux + ez * uz;
        if (proj < 0 || proj > beamLen) continue;
        const perp = Math.abs(ex * uz - ez * ux);
        if (perp <= 0.48) {
          if (t.stats.markVuln > 0) {
            e.vulnBonus = Math.max(e.vulnBonus, t.stats.markVuln);
          }
          applyEnemyDamage(state, e, t.stats.damage, t);
          pierced += 1;
        }
      }

      state.effects.push({
        id: `fx_${state.nextId++}`,
        kind: "beam",
        x1: t.wx + ux * 0.35,
        y1: 0.68,
        z1: t.wz + uz * 0.35,
        x2: t.wx + ux * beamLen,
        y2: 0.48,
        z2: t.wz + uz * beamLen,
        color: 0xc084fc,
        life: 0.22,
        maxLife: 0.22,
      });
    }
  }

  // 4. Projectile Flight & Impact
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const pr = state.projectiles[i];
    const target = state.enemies.find((e) => e.id === pr.targetId && !e.dead);
    if (target) {
      pr.lastX = target.wx;
      pr.lastZ = target.wz;
    }

    const dx = pr.lastX - pr.x;
    const dz = pr.lastZ - pr.z;
    const dist = Math.hypot(dx, dz);
    const step = pr.speed * dt;

    if (dist <= step + 0.22) {
      const srcTower = state.towers.find((t) => t.id === pr.towerId);
      if (pr.splashRadius > 0) {
        for (const e of state.enemies) {
          if (Math.hypot(e.wx - pr.lastX, e.wz - pr.lastZ) <= pr.splashRadius) {
            applyEnemyDamage(state, e, pr.damage, srcTower);
          }
        }
        state.effects.push({
          id: `fx_${state.nextId++}`,
          kind: "cryo_ring",
          x: pr.lastX,
          y: 0.25,
          z: pr.lastZ,
          radius: pr.splashRadius,
          color: 0xf97316,
          life: 0.3,
          maxLife: 0.3,
        });
      } else if (target) {
        applyEnemyDamage(state, target, pr.damage, srcTower);
      }
      state.projectiles.splice(i, 1);
    } else {
      pr.x += (dx / dist) * step;
      pr.z += (dz / dist) * step;
    }
  }

  // 5. Cleanup Dead Enemies & Visual Effects
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    if (state.enemies[i].dead || state.enemies[i].hp <= 0) {
      state.enemies.splice(i, 1);
      audioEvents.killCount += 1;
    }
  }
  for (let i = state.effects.length - 1; i >= 0; i--) {
    state.effects[i].life -= dt;
    if (state.effects[i].life <= 0) state.effects.splice(i, 1);
  }

  return audioEvents;
}

/**
 * Core Combat Engine for Vortex Bastion:
 * - 4 Articulated Turret Archetypes + Branching Tier 1-3 Upgrades
 * - Specialized Enemies: Drone, Swarmer, Juggernaut (Armor), Aegis (Shield), Cloaker (Stealth), Healer
 * - Elemental Synergy Matrix: Cryo + Siege Mortar => THERMAL SHATTER; Tesla + Rail => OVERCHARGE
 * - Compound Interest (10% saved credits, max +60) & Early-Wave Send Bonus (+25)
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
    fireRate: 2.4,
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
        appliesBurn: true,
        desc: "Explosive plasma shells; triggers Thermal Shatter on Chilled foes!",
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
    slowFactor: 0.42,
    slowDuration: 2.4,
    desc: "Frost emitter chilling foes & revealing Stealthed units.",
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
    desc: "2.5× vs Energy Shields; chains arcs across squads.",
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
        desc: "Heavy voltage surge stuns target & shreds armor on Rail marks.",
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
    desc: "Armor-piercing laser slicing lines & Overcharging Shocked foes.",
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
        desc: "Reveals stealth & marks targets for +30% all-source damage.",
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
  let appliesBurn = false;

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
    if (br.appliesBurn) appliesBurn = true;
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
    appliesBurn,
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
        label: "Upgrade Tier 2",
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
    waveActive: false,
    score: 0,
    kills: 0,
    reactionsTriggered: 0,
    speedMult: 1,
    abilities: { ionCooldown: 0, empCooldown: 0 },
    shakeTimer: 0,
    shakeIntensity: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    effects: [],
    popups: [],
    spawnQueue: [],
    spawnCooldown: 0,
    nextId: 1,
    lastBanner: null,
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
    targeting: "first",
    yaw: 0,
    cooldown: 0,
    recoil: 0,
    kills: 0,
    stats: computeTurretStats(type, 1, null),
  };
  state.towers.push(tower);
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

export function buildWaveRoster(waveNum) {
  const count = 6 + waveNum * 2;
  const roster = [];
  for (let i = 0; i < count; i++) {
    let kind = "drone";
    if (waveNum >= 4 && i % 7 === 6) kind = "healer";
    else if (waveNum >= 3 && i % 6 === 4) kind = "cloaker";
    else if (waveNum >= 2 && i % 5 === 3) kind = "shielded";
    else if (waveNum >= 2 && i % 4 === 3) kind = "juggernaut";
    else if (waveNum >= 3 && i % 5 === 2) kind = "swarmer";

    const hpScale = 46 + waveNum * 24;
    const specs = {
      drone: { hpMult: 1.0, speed: 1.55 + Math.min(0.6, waveNum * 0.05), reward: 14, dmg: 1, armor: 0, shield: 0 },
      swarmer: { hpMult: 0.68, speed: 2.45, reward: 12, dmg: 1, armor: 0, shield: 0 },
      juggernaut: { hpMult: 2.3, speed: 1.05, reward: 26, dmg: 2, armor: 8 + waveNum * 2, shield: 0 },
      shielded: { hpMult: 1.15, speed: 1.45, reward: 22, dmg: 1, armor: 0, shield: Math.round(hpScale * 0.9) },
      cloaker: { hpMult: 0.95, speed: 1.85, reward: 20, dmg: 1, armor: 0, shield: 0 },
      healer: { hpMult: 1.1, speed: 1.35, reward: 24, dmg: 1, armor: 0, shield: Math.round(hpScale * 0.4) },
    }[kind];

    const maxHp = Math.round(hpScale * specs.hpMult);
    roster.push({
      kind,
      hp: maxHp,
      maxHp,
      shield: specs.shield,
      maxShield: specs.shield,
      armor: specs.armor,
      speed: specs.speed,
      reward: specs.reward,
      coreDmg: specs.dmg,
      stealthed: kind === "cloaker",
    });
  }

  // Every 5th wave culminates in a towering Dreadnought Boss!
  if (waveNum % 5 === 0) {
    const bossHp = Math.round((46 + waveNum * 24) * 9.5);
    const bossShield = Math.round(bossHp * 0.45);
    roster.push({
      kind: "boss",
      hp: bossHp,
      maxHp: bossHp,
      shield: bossShield,
      maxShield: bossShield,
      armor: 12 + waveNum * 2,
      speed: 0.82,
      reward: 120,
      coreDmg: 5,
      stealthed: false,
    });
  }

  return roster;
}

export function enqueueWave(state) {
  if (state.gameOver) return false;

  // Early-Send Bonus if calling new wave while active squad still fighting!
  if (state.wave > 0 && (state.enemies.length > 0 || state.spawnQueue.length > 0)) {
    const earlyBonus = 25;
    state.credits += earlyBonus;
    state.lastBanner = { text: `EARLY CALL +${earlyBonus}⚡`, color: "#fbbf24", life: 2.2 };
  }

  state.wave += 1;
  state.waveActive = true;
  const mainPath = findPath(state.grid, SPAWN_CELL, CORE_CELL) || [SPAWN_CELL, CORE_CELL];
  const roster = buildWaveRoster(state.wave);

  for (const unit of roster) {
    state.spawnQueue.push({
      ...unit,
      pathSnapshot: mainPath,
    });
  }
  state.spawnCooldown = 0.05;
  return true;
}

export function createEnemyInstance(template, idNum, path) {
  const startW = gridToWorld(path[0].col, path[0].row);
  return {
    id: `e_${idNum}`,
    kind: template.kind,
    hp: template.hp,
    maxHp: template.maxHp,
    shield: template.shield || 0,
    maxShield: template.maxShield || 0,
    shieldRegenDelay: 0,
    armor: template.armor || 0,
    baseSpeed: template.speed,
    reward: template.reward,
    coreDmg: template.coreDmg,
    col: path[0].col,
    row: path[0].row,
    wx: startW.x,
    wz: startW.z,
    yaw: 0,
    path,
    waypointIdx: path.length > 1 ? 1 : 0,
    progressRatio: 0,
    slowFactor: 0,
    slowTimer: 0,
    shockTimer: 0,
    burnTimer: 0,
    stunTimer: 0,
    armorShredTimer: 0,
    healCooldown: template.kind === "healer" ? 1.6 : 0,
    stealthed: Boolean(template.stealthed),
    splitTriggered: false,
    revealTimer: 0,
    vulnBonus: 0,
    dead: false,
  };
}

export const ABILITY_CONFIG = {
  ion: { name: "Orbital Ion", cooldown: 22, radius: 1.85 },
  emp: { name: "EMP Surge", cooldown: 18, radius: 2.85 },
};

export function triggerOrbitalAbility(state, kind, cell) {
  if (state.gameOver || !cell) return { ok: false, reason: "Invalid state" };
  const targetW = gridToWorld(cell.col, cell.row);

  if (kind === "ion") {
    if ((state.abilities?.ionCooldown || 0) > 0) {
      return { ok: false, reason: "Ion recharging" };
    }
    state.abilities.ionCooldown = ABILITY_CONFIG.ion.cooldown;
    const rad = ABILITY_CONFIG.ion.radius;
    const dmg = 180 + state.wave * 35;
    for (const e of state.enemies) {
      if (!e.dead && Math.hypot(e.wx - targetW.x, e.wz - targetW.z) <= rad) {
        e.burnTimer = Math.max(e.burnTimer, 4.0);
        e.revealTimer = Math.max(e.revealTimer, 4.0);
        applyEnemyDamage(state, e, dmg, null, "thermal");
      }
    }
    state.effects.push({
      id: `fx_${state.nextId++}`,
      kind: "orbital_beam",
      x: targetW.x,
      z: targetW.z,
      radius: rad,
      color: 0xf43f5e,
      life: 0.55,
      maxLife: 0.55,
    });
    state.shakeTimer = 0.35;
    state.shakeIntensity = 0.24;
    state.lastBanner = { text: "ORBITAL ION IMPACT!", color: "#fb7185", life: 2.0 };
    return { ok: true };
  }

  if (kind === "emp") {
    if ((state.abilities?.empCooldown || 0) > 0) {
      return { ok: false, reason: "EMP recharging" };
    }
    state.abilities.empCooldown = ABILITY_CONFIG.emp.cooldown;
    const rad = ABILITY_CONFIG.emp.radius;
    for (const e of state.enemies) {
      if (!e.dead && Math.hypot(e.wx - targetW.x, e.wz - targetW.z) <= rad) {
        e.shield = 0;
        e.shieldRegenDelay = 5.0;
        e.revealTimer = Math.max(e.revealTimer, 4.0);
        e.shockTimer = Math.max(e.shockTimer, 3.5);
        if (e.kind === "boss") {
          e.slowFactor = Math.max(e.slowFactor, 0.5);
          e.slowTimer = Math.max(e.slowTimer, 2.2);
        } else {
          e.stunTimer = Math.max(e.stunTimer, 2.6);
        }
      }
    }
    state.effects.push({
      id: `fx_${state.nextId++}`,
      kind: "cryo_ring",
      x: targetW.x,
      y: 0.35,
      z: targetW.z,
      radius: rad,
      color: 0xfacc15,
      life: 0.5,
      maxLife: 0.5,
    });
    state.shakeTimer = 0.25;
    state.shakeIntensity = 0.16;
    state.lastBanner = { text: "EMP PULSE — SHIELDS STRIPPED!", color: "#facc15", life: 2.0 };
    return { ok: true };
  }

  return { ok: false, reason: "Unknown ability" };
}

function isTargetable(tower, enemy) {
  const dist = Math.hypot(enemy.wx - tower.wx, enemy.wz - tower.wz);
  if (dist > tower.stats.range || enemy.hp <= 0 || enemy.dead) return false;
  if (!enemy.stealthed || enemy.revealTimer > 0) return true;
  // Cloaked units are only targetable at close sensor range (<= 1.95 tiles)
  return dist <= 1.95;
}

function chooseTarget(tower, enemies) {
  const candidates = enemies.filter((e) => isTargetable(tower, e));
  if (candidates.length === 0) return null;

  if (tower.targeting === "strongest") {
    return candidates.reduce((a, b) => (b.hp + b.shield > a.hp + a.shield ? b : a));
  }
  if (tower.targeting === "close") {
    return candidates.reduce((a, b) =>
      Math.hypot(a.wx - tower.wx, a.wz - tower.wz) < Math.hypot(b.wx - tower.wx, b.wz - tower.wz)
        ? a
        : b
    );
  }
  return candidates.reduce((a, b) => (b.progressRatio > a.progressRatio ? b : a));
}

export function applyEnemyDamage(state, enemy, rawDmg, sourceTower, damageType = "kinetic") {
  if (enemy.dead) return 0;

  // Rail ignores flat armor; Armor Shred halves remaining armor
  const effectiveArmor =
    damageType === "pierce" || damageType === "thermal"
      ? 0
      : (enemy.armor || 0) * (enemy.armorShredTimer > 0 ? 0.35 : 1);

  const mult = 1 + (enemy.vulnBonus || 0);
  let remaining = Math.max(1, Math.round((rawDmg - effectiveArmor) * mult));

  // Energy Shield absorbs damage first; Tesla / Electric deals 2.5x shield damage!
  if (enemy.shield > 0) {
    enemy.shieldRegenDelay = 2.5;
    const shieldMult = damageType === "electric" ? 2.5 : 1.0;
    const effectiveShieldHit = remaining * shieldMult;
    if (effectiveShieldHit <= enemy.shield) {
      enemy.shield -= effectiveShieldHit;
      return remaining;
    } else {
      const leftoverRatio = (effectiveShieldHit - enemy.shield) / effectiveShieldHit;
      enemy.shield = 0;
      remaining = Math.round(remaining * leftoverRatio);
    }
  }

  enemy.hp -= remaining;

  // Dreadnought Phase 2 Split at <= 50% HP: deploys 3 Hyper Swarmers ahead!
  if (enemy.kind === "boss" && !enemy.splitTriggered && enemy.hp > 0 && enemy.hp <= enemy.maxHp * 0.5) {
    enemy.splitTriggered = true;
    state.shakeTimer = 0.3;
    state.shakeIntensity = 0.22;
    state.lastBanner = { text: "DREADNOUGHT PHASE 2 — SWARM DEPLOYED!", color: "#f97316", life: 2.4 };
    const swHp = Math.round((46 + state.wave * 24) * 0.72);
    for (let sIdx = 0; sIdx < 3; sIdx++) {
      const sw = createEnemyInstance(
        { kind: "swarmer", hp: swHp, maxHp: swHp, armor: 0, speed: 2.55, reward: 12, coreDmg: 1 },
        state.nextId++,
        enemy.path
      );
      sw.wx = enemy.wx + (sIdx - 1) * 0.28;
      sw.wz = enemy.wz;
      sw.col = enemy.col;
      sw.row = enemy.row;
      sw.waypointIdx = enemy.waypointIdx;
      state.enemies.push(sw);
    }
  }

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
    if (state.popups) {
      state.popups.push({
        id: `pop_${state.nextId++}`,
        text: `+${enemy.reward}⚡`,
        color: "#fbbf24",
        x: enemy.wx,
        y: 0.85,
        z: enemy.wz,
        life: 0.85,
        maxLife: 0.85,
      });
    }
  }
  return remaining;
}

function triggerThermalShatter(state, epicEnemy, sourceTower) {
  state.reactionsTriggered += 1;
  epicEnemy.slowTimer = 0;
  epicEnemy.slowFactor = 0;
  epicEnemy.armorShredTimer = 4.0;
  const blastDmg = 45 + state.wave * 10;

  for (const other of state.enemies) {
    if (!other.dead && Math.hypot(other.wx - epicEnemy.wx, other.wz - epicEnemy.wz) <= 1.6) {
      other.armorShredTimer = Math.max(other.armorShredTimer, 4.0);
      applyEnemyDamage(state, other, blastDmg, sourceTower, "thermal");
    }
  }
  state.effects.push({
    id: `fx_${state.nextId++}`,
    kind: "shatter",
    x: epicEnemy.wx,
    y: 0.35,
    z: epicEnemy.wz,
    radius: 1.65,
    color: 0x38bdf8,
    life: 0.45,
    maxLife: 0.45,
  });
  if (state.popups) {
    state.popups.push({
      id: `pop_${state.nextId++}`,
      text: "SHATTER!",
      color: "#38bdf8",
      x: epicEnemy.wx,
      y: 1.1,
      z: epicEnemy.wz,
      life: 1.0,
      maxLife: 1.0,
    });
  }
  state.lastBanner = { text: "THERMAL SHATTER! ARMOR SHREDDED", color: "#38bdf8", life: 1.8 };
}

function triggerOverchargeDischarge(state, enemy, sourceTower) {
  state.reactionsTriggered += 1;
  enemy.shockTimer = 0;
  enemy.armorShredTimer = Math.max(enemy.armorShredTimer, 3.5);
  const bonusDmg = 40 + state.wave * 8;
  applyEnemyDamage(state, enemy, bonusDmg, sourceTower, "electric");
  state.effects.push({
    id: `fx_${state.nextId++}`,
    kind: "cryo_ring",
    x: enemy.wx,
    y: 0.4,
    z: enemy.wz,
    radius: 1.35,
    color: 0xfacc15,
    life: 0.35,
    maxLife: 0.35,
  });
  if (state.popups) {
    state.popups.push({
      id: `pop_${state.nextId++}`,
      text: "OVERCHARGE!",
      color: "#facc15",
      x: enemy.wx,
      y: 1.1,
      z: enemy.wz,
      life: 1.0,
      maxLife: 1.0,
    });
  }
  state.lastBanner = { text: "OVERCHARGE! +ARMOR SHRED", color: "#facc15", life: 1.8 };
}

/**
 * Steps real-time simulation by `rawDt` seconds.
 */
export function stepCombat(state, rawDt) {
  const audioEvents = { fired: new Set(), killCount: 0, leaked: false, reaction: false, waveCleared: false };
  if (state.gameOver) return audioEvents;

  const dt = Math.min(0.05, Math.max(0.001, rawDt)) * state.speedMult;

  if (state.abilities) {
    if (state.abilities.ionCooldown > 0) {
      state.abilities.ionCooldown = Math.max(0, state.abilities.ionCooldown - rawDt);
    }
    if (state.abilities.empCooldown > 0) {
      state.abilities.empCooldown = Math.max(0, state.abilities.empCooldown - rawDt);
    }
  }
  if (state.shakeTimer > 0) {
    state.shakeTimer = Math.max(0, state.shakeTimer - rawDt);
  }

  if (state.lastBanner) {
    state.lastBanner.life -= dt;
    if (state.lastBanner.life <= 0) state.lastBanner = null;
  }

  // 1. Wave Spawning
  if (state.spawnQueue.length > 0) {
    state.spawnCooldown -= dt;
    if (state.spawnCooldown <= 0) {
      const template = state.spawnQueue.shift();
      const freshPath = findPath(state.grid, SPAWN_CELL, CORE_CELL) || template.pathSnapshot;
      state.enemies.push(createEnemyInstance(template, state.nextId++, freshPath));
      state.spawnCooldown = template.kind === "swarmer" ? 0.42 : 0.72;
    }
  }

  // 2. Enemy Movement, Shield Regen, Healer Pulse & Status Timers
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
    if (e.shockTimer > 0) e.shockTimer = Math.max(0, e.shockTimer - dt);
    if (e.armorShredTimer > 0) e.armorShredTimer = Math.max(0, e.armorShredTimer - dt);
    if (e.revealTimer > 0) e.revealTimer = Math.max(0, e.revealTimer - dt);

    // Burn DOT
    if (e.burnTimer > 0) {
      e.burnTimer = Math.max(0, e.burnTimer - dt);
      e.hp -= 12 * dt;
      if (e.hp <= 0) {
        applyEnemyDamage(state, e, 1, null, "thermal");
        continue;
      }
    }

    // Shield Regeneration after delay
    if (e.maxShield > 0) {
      if (e.shieldRegenDelay > 0) {
        e.shieldRegenDelay = Math.max(0, e.shieldRegenDelay - dt);
      } else if (e.shield < e.maxShield) {
        e.shield = Math.min(e.maxShield, e.shield + 14 * dt);
      }
    }

    // Healer Nanite Pulse
    if (e.kind === "healer" && e.stunTimer <= 0) {
      e.healCooldown -= dt;
      if (e.healCooldown <= 0) {
        e.healCooldown = 2.2;
        for (const ally of state.enemies) {
          if (!ally.dead && ally.hp < ally.maxHp && Math.hypot(ally.wx - e.wx, ally.wz - e.wz) <= 2.1) {
            ally.hp = Math.min(ally.maxHp, ally.hp + Math.round(ally.maxHp * 0.14));
          }
        }
        state.effects.push({
          id: `fx_${state.nextId++}`,
          kind: "cryo_ring",
          x: e.wx,
          y: 0.2,
          z: e.wz,
          radius: 1.9,
          color: 0x34d399,
          life: 0.4,
          maxLife: 0.4,
        });
      }
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
        appliesBurn: Boolean(t.stats.appliesBurn),
        color: t.branch === "B" ? 0xf97316 : 0x38bdf8,
      });
    } else if (t.type === "cryo") {
      for (const e of state.enemies) {
        if (Math.hypot(e.wx - t.wx, e.wz - t.wz) <= t.stats.range) {
          e.slowFactor = Math.max(e.slowFactor, t.stats.slowFactor);
          e.slowTimer = Math.max(e.slowTimer, TURRET_CATALOG.cryo.slowDuration);
          e.revealTimer = Math.max(e.revealTimer, 3.0); // reveals cloaked units
          if (t.tier >= 2) e.vulnBonus = Math.max(e.vulnBonus, 0.15);
          if (e.burnTimer > 0) {
            e.burnTimer = 0;
            triggerThermalShatter(state, e, t);
            audioEvents.reaction = true;
          }
          applyEnemyDamage(state, e, t.stats.damage, t, "cryo");
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
      target.shockTimer = Math.max(target.shockTimer, 3.0);
      applyEnemyDamage(state, target, t.stats.damage, t, "electric");
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
        nextHop.shockTimer = Math.max(nextHop.shockTimer, 3.0);
        chainPoints.push({ x: nextHop.wx, y: 0.48, z: nextHop.wz });
        applyEnemyDamage(state, nextHop, Math.round(t.stats.damage * Math.pow(0.8, c)), t, "electric");
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
            e.revealTimer = Math.max(e.revealTimer, 4.0);
          }
          if (e.shockTimer > 0) {
            triggerOverchargeDischarge(state, e, t);
            audioEvents.reaction = true;
          }
          applyEnemyDamage(state, e, t.stats.damage, t, "pierce");
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

  // 4. Projectiles Flight & Impact (including Siege Mortar Thermal Shatter!)
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
            if (pr.appliesBurn) {
              if (e.slowTimer > 0) {
                triggerThermalShatter(state, e, srcTower);
                audioEvents.reaction = true;
              } else {
                e.burnTimer = Math.max(e.burnTimer, 3.0);
              }
            }
            applyEnemyDamage(state, e, pr.damage, srcTower, "kinetic");
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
        applyEnemyDamage(state, target, pr.damage, srcTower, "kinetic");
      }
      state.projectiles.splice(i, 1);
    } else {
      pr.x += (dx / dist) * step;
      pr.z += (dz / dist) * step;
    }
  }

  // 5. Cleanup Dead Enemies & FX
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
  if (state.popups) {
    for (let i = state.popups.length - 1; i >= 0; i--) {
      const pop = state.popups[i];
      pop.life -= rawDt;
      pop.y += rawDt * 0.85;
      if (pop.life <= 0) state.popups.splice(i, 1);
    }
  }

  // 6. Wave Clear -> Award 10% Compound Interest (capped at +60⚡) + Wave Bonus
  if (state.waveActive && state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.waveActive = false;
    const interest = Math.min(60, Math.floor(state.credits * 0.1));
    const waveBonus = 30 + state.wave * 5;
    state.credits += interest + waveBonus;
    state.score += state.wave * 50;
    state.lastBanner = {
      text: `WAVE ${state.wave} CLEAR! +${waveBonus}⚡ • +${interest}⚡ INTEREST`,
      color: "#34d399",
      life: 2.6,
    };
    audioEvents.waveCleared = true;
  }

  return audioEvents;
}

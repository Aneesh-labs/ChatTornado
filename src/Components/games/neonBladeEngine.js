/**
 * Pure simulation engine for Neon Blade 3D (Cyber Forge).
 * Uses exact angle math from arcadeEngines.js while adding multi-knife queues,
 * Razor Graze close-call combos, Chrono Slow-Mo crystals, Overdrive 2X fever,
 * Boss reactor spin curves, 3D core shatter physics, and unlockable 3D skins.
 */
import {
  normalizeAngle,
  angularDistance,
  computeBladeImpactAngle,
  checkBladeCollision,
} from "./arcadeEngines.js";

export const CORE_Y = 1.35;
export const TARGET_RADIUS = 1.62;
export const STANDBY_Y = -3.45;
export const IMPACT_Y = CORE_Y - TARGET_RADIUS; // -0.27
export const FLIGHT_SPEED = 24.0;
export const MIN_BLADE_SEP = 0.24;
export const GRAZE_WINDOW = 0.13;

export const BLADE_SKINS = [
  { id: "cyber", name: "Cyber Edge", cost: 0, bladeHex: "#38bdf8", accentHex: "#22d3ee", hexNum: 0x38bdf8 },
  { id: "kunai", name: "Plasma Kunai", cost: 15, bladeHex: "#f43f5e", accentHex: "#fb7185", hexNum: 0xf43f5e },
  { id: "solar", name: "Solar Katana", cost: 35, bladeHex: "#fbbf24", accentHex: "#fef08a", hexNum: 0xfbbf24 },
  { id: "void", name: "Void Scythe", cost: 60, bladeHex: "#c084fc", accentHex: "#e879f9", hexNum: 0xc084fc },
];

export const BOSS_CORES = [
  "CHRONO REACTOR",
  "AEGIS SHREDDER",
  "NOVA TURBINE",
  "OMEGA VORTEX",
];

function computeStageKnives(level) {
  return Math.min(13, 5 + Math.floor(level * 0.65));
}

function populateStageEntities(state, rng = Math.random) {
  const { level } = state;
  state.isBoss = level % 5 === 0;
  state.bossName = state.isBoss
    ? BOSS_CORES[(Math.floor(level / 5) - 1) % BOSS_CORES.length]
    : "";
  state.bossPattern = state.isBoss ? ((Math.floor(level / 5) - 1) % 3) : 0;

  state.targetAngle = 0;
  state.spinTime = 0;
  const dir = level % 2 === 0 ? -1 : 1;
  state.baseSpeed = dir * Math.min(4.2, 1.65 + level * 0.17);

  state.stuckKnives = [];
  const preCount = Math.min(5, Math.floor(level / 2));
  for (let i = 0; i < preCount; i++) {
    const jitter = level >= 4 ? (rng() - 0.5) * 0.14 : 0;
    state.stuckKnives.push({
      angle: normalizeAngle((i * Math.PI * 2) / Math.max(1, preCount) + jitter),
      skin: "hazard",
      recoil: 0,
    });
  }

  state.orbs = [];
  const totalOrbs = state.isBoss ? 3 : level >= 3 ? 2 : 1;
  for (let i = 0; i < totalOrbs; i++) {
    const ang = normalizeAngle(i * 2.09 + 0.65 + rng() * 0.35);
    const stuckAngles = state.stuckKnives.map((k) => k.angle);
    if (!checkBladeCollision(ang, stuckAngles, 0.28)) {
      const isChrono = i === 1 && level >= 2 && rng() < 0.55;
      state.orbs.push({
        id: `orb_${level}_${i}`,
        angle: ang,
        type: isChrono ? "chrono" : "gold",
        sliced: false,
      });
    }
  }

  state.knivesLeft = computeStageKnives(level);
  state.knivesTotal = state.knivesLeft;
  state.flyingKnives = [];
  state.throwCooldown = 0;
  state.shatterShards = [];
  state.ricochetBlades = [];
  state.recoilZ = 0;
}

export function createInitialNeonBladeState(level = 1, skin = "cyber", rng = Math.random) {
  const state = {
    phase: "ready", // ready | playing | shattering | levelclear | gameover
    level,
    isBoss: false,
    bossName: "",
    bossPattern: 0,
    skin,
    score: 0,
    stageOrbsSliced: 0,
    grazes: 0,
    streak: 0,
    maxStreak: 0,
    targetAngle: 0,
    baseSpeed: 1.8,
    spinTime: 0,
    stuckKnives: [],
    orbs: [],
    knivesLeft: 5,
    knivesTotal: 5,
    flyingKnives: [],
    throwCooldown: 0,
    chronoTimer: 0,
    fever: 0,
    overdriveTimer: 0,
    recoilZ: 0,
    shakeTimer: 0,
    shakeIntensity: 0,
    transitionTimer: 0,
    shatterShards: [],
    ricochetBlades: [],
    burstQueue: [],
    popups: [],
  };
  populateStageEntities(state, rng);
  return state;
}

export function advanceToNextStage(state, rng = Math.random) {
  state.level += 1;
  state.phase = "playing";
  state.throwCooldown = 0;
  populateStageEntities(state, rng);
  return state;
}

export function throwNeonBlade(state) {
  if (state.phase !== "playing") return false;
  if (state.knivesLeft <= 0 || state.throwCooldown > 0) return false;

  state.knivesLeft -= 1;
  state.throwCooldown = 0.085;
  state.flyingKnives.push({
    id: `fk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    y: STANDBY_Y,
    skin: state.skin,
  });
  return true;
}

function getEffectiveSpinSpeed(state) {
  let mult = 1.0;
  if (state.isBoss) {
    if (state.bossPattern === 0) {
      mult = 1 + Math.sin(state.spinTime * 2.8) * 0.72;
    } else if (state.bossPattern === 1) {
      // Surging speed + smooth momentary direction reversal
      mult = 1.15 * Math.cos(state.spinTime * 1.45);
    } else {
      // Twin-beat stutter pulse
      mult = 0.35 + Math.pow(Math.abs(Math.sin(state.spinTime * 2.1)), 1.6) * 1.55;
    }
  } else if (state.level >= 4) {
    mult = 1 + Math.sin(state.spinTime * 1.8) * 0.28;
  }

  if (state.chronoTimer > 0) {
    mult *= 0.45;
  }
  return state.baseSpeed * mult;
}

export function stepNeonBladeState(state, rawDt) {
  const events = {
    hit: false,
    clash: false,
    orbSliced: false,
    chronoActivated: false,
    graze: false,
    overdriveTriggered: false,
    stageCleared: false,
    readyForNext: false,
  };

  const dt = Math.min(0.05, Math.max(0, rawDt));
  if (dt <= 0) return events;

  if (state.shakeTimer > 0) state.shakeTimer = Math.max(0, state.shakeTimer - dt);
  if (state.recoilZ > 0) state.recoilZ = Math.max(0, state.recoilZ - dt * 2.4);
  if (state.throwCooldown > 0) state.throwCooldown = Math.max(0, state.throwCooldown - dt);

  for (const k of state.stuckKnives) {
    if (k.recoil > 0) k.recoil = Math.max(0, k.recoil - dt * 3.5);
  }

  for (const p of state.popups) {
    p.life -= dt;
    p.y += dt * 1.1;
  }
  state.popups = state.popups.filter((p) => p.life > 0);

  // Update flying shatter debris & ricochet blades regardless of transition phase
  for (const sh of state.shatterShards) {
    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;
    sh.z += sh.vz * dt;
    sh.vy -= 14 * dt;
    sh.rx += sh.vrx * dt;
    sh.ry += sh.vry * dt;
    sh.rz += sh.vrz * dt;
  }
  for (const rb of state.ricochetBlades) {
    rb.x += rb.vx * dt;
    rb.y += rb.vy * dt;
    rb.z += rb.vz * dt;
    rb.vy -= 18 * dt;
    rb.rx += rb.vrx * dt;
    rb.rz += rb.vrz * dt;
  }

  if (state.phase === "shattering") {
    state.transitionTimer = Math.max(0, state.transitionTimer - dt);
    if (state.transitionTimer === 0) {
      state.phase = "levelclear";
      events.readyForNext = true;
    }
    return events;
  }

  if (state.phase !== "playing") return events;

  if (state.chronoTimer > 0) state.chronoTimer = Math.max(0, state.chronoTimer - dt);
  if (state.overdriveTimer > 0) {
    state.overdriveTimer = Math.max(0, state.overdriveTimer - dt);
    if (state.overdriveTimer === 0) state.fever = 0;
  }

  // Rotate core
  state.spinTime += dt;
  const omega = getEffectiveSpinSpeed(state);
  state.targetAngle = normalizeAngle(state.targetAngle + omega * dt);

  // Advance flying knives
  const nextFlying = [];
  for (const fk of state.flyingKnives) {
    fk.y += FLIGHT_SPEED * dt;
    if (fk.y < IMPACT_Y) {
      nextFlying.push(fk);
      continue;
    }

    const impactAngle = computeBladeImpactAngle(state.targetAngle);
    const stuckAngles = state.stuckKnives.map((k) => k.angle);
    const collided = checkBladeCollision(impactAngle, stuckAngles, MIN_BLADE_SEP);

    if (collided) {
      events.clash = true;
      state.phase = "gameover";
      state.streak = 0;
      state.shakeTimer = 0.36;
      state.shakeIntensity = 0.26;
      state.burstQueue.push({ x: 0, y: IMPACT_Y, z: 0.25, color: 0xf43f5e, count: 22 });
      state.ricochetBlades.push({
        x: 0,
        y: IMPACT_Y,
        z: 0.2,
        vx: (omega >= 0 ? -1 : 1) * 4.2,
        vy: -3.5,
        vz: 4.0,
        rx: 2.5,
        rz: 0,
        vrx: 11,
        vrz: -14,
        skin: fk.skin,
      });
      state.popups.push({
        id: `p_${Math.random()}`,
        text: "CLASHED!",
        x: 0,
        y: IMPACT_Y + 0.5,
        color: "#f43f5e",
        life: 0.9,
      });
      // Remaining knives disappear once game ends
      state.flyingKnives = [];
      return events;
    }

    // Successful stick!
    events.hit = true;
    state.recoilZ = 0.22;
    state.shakeTimer = 0.08;
    state.shakeIntensity = 0.07;
    state.streak += 1;
    if (state.streak > state.maxStreak) state.maxStreak = state.streak;

    state.stuckKnives.push({
      angle: impactAngle,
      skin: fk.skin,
      recoil: 0.32,
    });

    // Check Razor Graze close call
    let closestSep = Infinity;
    for (const prevAngle of stuckAngles) {
      const sep = angularDistance(impactAngle, prevAngle);
      if (sep < closestSep) closestSep = sep;
    }
    const isGraze = closestSep >= MIN_BLADE_SEP && closestSep <= MIN_BLADE_SEP + GRAZE_WINDOW;

    // Check Orbs sliced
    let orbBonus = 0;
    for (const orb of state.orbs) {
      if (!orb.sliced && angularDistance(impactAngle, orb.angle) < 0.29) {
        orb.sliced = true;
        if (orb.type === "chrono") {
          events.chronoActivated = true;
          state.chronoTimer = 3.4;
          orbBonus += 15;
          state.burstQueue.push({ x: 0, y: IMPACT_Y, z: 0.25, color: 0x38bdf8, count: 16 });
          state.popups.push({
            id: `p_${Math.random()}`,
            text: "CHRONO SLOW!",
            x: 0,
            y: IMPACT_Y + 0.65,
            color: "#38bdf8",
            life: 0.9,
          });
        } else {
          events.orbSliced = true;
          state.stageOrbsSliced += 1;
          orbBonus += 25;
          state.burstQueue.push({ x: 0, y: IMPACT_Y, z: 0.25, color: 0xfbbf24, count: 16 });
          state.popups.push({
            id: `p_${Math.random()}`,
            text: "+25 ORB!",
            x: 0,
            y: IMPACT_Y + 0.65,
            color: "#fbbf24",
            life: 0.85,
          });
        }
      }
    }

    // Fever / Overdrive buildup
    if (state.overdriveTimer <= 0) {
      const gainFever = 16 + (isGraze ? 22 : 0) + (orbBonus > 0 ? 18 : 0);
      state.fever = Math.min(100, state.fever + gainFever);
      if (state.fever >= 100) {
        state.overdriveTimer = 6.0;
        events.overdriveTriggered = true;
        state.burstQueue.push({ x: 0, y: CORE_Y, z: 0.3, color: 0xe879f9, count: 24 });
        state.popups.push({
          id: `p_${Math.random()}`,
          text: "OVERDRIVE 2X!",
          x: 0,
          y: CORE_Y - 0.1,
          color: "#e879f9",
          life: 1.0,
        });
      }
    }

    const scoreMult = state.overdriveTimer > 0 ? 2 : 1;
    let grazeBonus = 0;
    if (isGraze) {
      events.graze = true;
      state.grazes += 1;
      grazeBonus = 20;
      state.popups.push({
        id: `p_${Math.random()}`,
        text: `+${20 * scoreMult} GRAZE!`,
        x: 0,
        y: IMPACT_Y + 0.35,
        color: "#22d3ee",
        life: 0.8,
      });
    }

    const hitScore = (10 + orbBonus + grazeBonus) * scoreMult;
    state.score += hitScore;
    state.burstQueue.push({ x: 0, y: IMPACT_Y, z: 0.2, color: 0x22d3ee, count: 9 });

    // Check stage completion when last knife sticks & no more in air
    if (state.knivesLeft === 0 && nextFlying.length === 0) {
      events.stageCleared = true;
      state.phase = "shattering";
      state.transitionTimer = 0.85;
      state.shakeTimer = 0.32;
      state.shakeIntensity = 0.22;
      const clearBonus = state.level * 25 * scoreMult;
      state.score += clearBonus;
      state.popups.push({
        id: `p_${Math.random()}`,
        text: `CORE SHATTERED +${clearBonus}!`,
        x: 0,
        y: CORE_Y + 0.3,
        color: state.isBoss ? "#fde047" : "#34d399",
        life: 1.0,
      });
      state.burstQueue.push({
        x: 0,
        y: CORE_Y,
        z: 0.35,
        color: state.isBoss ? 0xfbbf24 : 0x38bdf8,
        count: 30,
      });

      // Spawn radial 3D core shards + fling all embedded blades
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        const spd = 4.2 + (i % 3) * 1.8;
        state.shatterShards.push({
          x: Math.cos(ang) * 0.65,
          y: CORE_Y + Math.sin(ang) * 0.65,
          z: 0,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd + 2.5,
          vz: 1.2 + (i % 4) * 0.9,
          rx: i * 0.4,
          ry: i * 0.6,
          rz: ang,
          vrx: 6 + (i % 4) * 2,
          vry: -5,
          vrz: 8,
          isBoss: state.isBoss,
        });
      }
      for (const k of state.stuckKnives) {
        const worldAng = k.angle + state.targetAngle;
        const outwardX = Math.sin(worldAng);
        const outwardY = -Math.cos(worldAng);
        state.ricochetBlades.push({
          x: outwardX * TARGET_RADIUS,
          y: CORE_Y + outwardY * TARGET_RADIUS,
          z: 0.1,
          vx: outwardX * 7.2,
          vy: outwardY * 7.2 + 2.0,
          vz: 2.5,
          rx: 0,
          rz: worldAng,
          vrx: 5,
          vrz: 9,
          skin: k.skin,
        });
      }
    }
  }
  state.flyingKnives = nextFlying;

  return events;
}

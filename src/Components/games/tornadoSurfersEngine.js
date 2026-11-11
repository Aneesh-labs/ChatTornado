/**
 * Pure simulation engine & 3D perspective projection math for Tornado Surfers.
 * Powers the Three.js 3D WebGL endless runner with delta-time physics,
 * articulated runner stride/lean telemetry, side-scrape stumble + Chaser Drone,
 * Express Moving Trains, Super Sneakers, Jetpack, Magnet, 2x & Hoverboard EMP.
 */

export const MAX_Z = 1.0;
export const PLAYER_HIT_Z = 0.085;
export const TRAIN_ROOF_Y = 1.15;
export const JETPACK_Y = 2.45;
export const GRAVITY = 34;
export const JUMP_VELOCITY = 12.6;
export const SLAM_VELOCITY = -26;
export const BASE_SPEED = 0.36; // world z-units per second
export const MAX_SPEED = 0.86;

export const RUNNER_CHARACTERS = [
  {
    id: "vanguard",
    name: "Vanguard Emerald",
    role: "Interceptor Scout",
    unlockCoins: 0,
    unlockScore: 0,
    colors: { torso: 0x10b981, emissive: 0x059669, limb: 0x064e3b, trim: 0x6ee7b7, scarf: 0xa7f3d0, head: 0xf0fdf4 },
    perk: "Balanced aerodynamics & quick lane recovery",
  },
  {
    id: "solarflare",
    name: "Solar Flare",
    role: "Rooftop Stunt Pilot",
    unlockCoins: 60,
    unlockScore: 1200,
    colors: { torso: 0xf59e0b, emissive: 0xd97706, limb: 0x451a03, trim: 0xfde047, scarf: 0xfdba74, head: 0xfffbeb },
    perk: "High-visibility amber visor & blazing scarf trail",
  },
  {
    id: "glacier",
    name: "Glacier Phantom",
    role: "Cryo Rail Skater",
    unlockCoins: 150,
    unlockScore: 2800,
    colors: { torso: 0x06b6d4, emissive: 0x0e7490, limb: 0x083344, trim: 0xa5f3fc, scarf: 0xe0f2fe, head: 0xecfeff },
    perk: "Sub-zero titanium weave & frost-edge hoverboard",
  },
  {
    id: "chrono",
    name: "Singularity Chrono",
    role: "Fourth-Axis Nomad",
    unlockCoins: 300,
    unlockScore: 5000,
    colors: { torso: 0xb99a70, emissive: 0x847a85, limb: 0x202625, trim: 0xedeae1, scarf: 0xd5d2c8, head: 0xf5f3ed },
    perk: "Observatory alloy chassis & antique-gold telemetry rig",
  },
];

export const PRIZE_CATALOG = [
  { id: "prize_first_run", name: "First Mile Medal", badge: "M1", desc: "Reach 500 points in a single run", req: (st) => st.bestScore >= 500 },
  { id: "prize_coin_bag", name: "Track Collector Seal", badge: "C50", desc: "Gather 50 total career coins", req: (st) => st.totalCoins >= 50 },
  { id: "prize_stunt_ace", name: "Rooftop Stunt Crest", badge: "S5", desc: "Complete 5 career rooftop stunts", req: (st) => st.totalStunts >= 5 },
  { id: "prize_skyline", name: "Skyline Sprinter Trophy", badge: "2K", desc: "Reach 2,000 points in a single run", req: (st) => st.bestScore >= 2000 },
  { id: "prize_baron", name: "Coin Baron Vault", badge: "C200", desc: "Gather 200 total career coins", req: (st) => st.totalCoins >= 200 },
  { id: "prize_centurion", name: "Apex Surfer Relic", badge: "5K", desc: "Reach 5,000 points in a single run", req: (st) => st.bestScore >= 5000 },
];

export function evaluateSurferRewards(careerStats) {
  const safe = {
    bestScore: Number(careerStats?.bestScore || 0),
    totalCoins: Number(careerStats?.totalCoins || 0),
    totalStunts: Number(careerStats?.totalStunts || 0),
  };
  const unlockedCharacters = RUNNER_CHARACTERS.filter(
    (c) => safe.totalCoins >= c.unlockCoins || safe.bestScore >= c.unlockScore
  ).map((c) => c.id);
  const unlockedPrizes = PRIZE_CATALOG.filter((p) => p.req(safe)).map((p) => p.id);
  return { unlockedCharacters, unlockedPrizes };
}

export function createInitialRunnerState() {
  return {
    phase: "ready", // "ready" | "playing" | "paused" | "gameover"
    lane: 1, // 0, 1, 2
    prevLane: 1,
    laneX: 0, // smooth interpolated -1..1
    leanAngle: 0,
    stridePhase: 0,
    y: 0,
    vy: 0,
    groundY: 0,
    coyoteTimer: 0,
    slideTimer: 0,
    slamPending: false,
    jumpBufferTimer: 0,
    stumbleTimer: 0,
    chaserTimer: 0,
    invulnTimer: 0,
    hoverboards: 3,
    hoverboardTimer: 0,
    magnetTimer: 0,
    multiplierTimer: 0,
    jetpackTimer: 0,
    sneakersTimer: 0,
    speed: BASE_SPEED,
    distance: 0,
    coins: 0,
    score: 0,
    combo: 0,
    stunts: 0,
    comboTimer: 0,
    spawnTimer: 0.25,
    trackScroll: 0,
    shakeTimer: 0,
    shakeIntensity: 0,
    waveIndex: 0,
    entities: [],
    popups: [],
    burstQueue: [],
  };
}

export function triggerJump(state) {
  if (state.phase !== "playing") return false;
  if (state.jetpackTimer > 0) return false;
  state.slideTimer = 0;
  state.slamPending = false;
  const onSurface = state.y <= state.groundY + 0.06 || state.coyoteTimer > 0;
  if (onSurface) {
    const mult = state.sneakersTimer > 0 ? 1.36 : 1.0;
    state.vy = JUMP_VELOCITY * mult;
    state.y = Math.max(state.y, state.groundY + 0.01);
    state.coyoteTimer = 0;
    state.jumpBufferTimer = 0;
    return true;
  }
  state.jumpBufferTimer = 0.16;
  return false;
}

export function triggerSlideOrSlam(state) {
  if (state.phase !== "playing") return false;
  if (state.jetpackTimer > 0) return false;
  if (state.y > state.groundY + 0.08) {
    state.vy = Math.min(state.vy, SLAM_VELOCITY);
    state.slamPending = true;
    return true;
  }
  state.slideTimer = 0.68;
  return true;
}

export function triggerLaneMove(state, delta) {
  if (state.phase !== "playing") return false;
  const next = Math.max(0, Math.min(2, state.lane + delta));
  if (next === state.lane) return false;

  // Check if moving sideways into the side wall of an adjacent train at ground height!
  const targetHitTrain = state.entities.find(
    (e) =>
      e.kind === "train" &&
      !e.hit &&
      Math.round(e.lane) === next &&
      e.z <= PLAYER_HIT_Z + 0.015 &&
      (e.zEnd ?? e.z + 0.24) >= PLAYER_HIT_Z - 0.015 &&
      state.y < TRAIN_ROOF_Y - 0.25
  );

  if (targetHitTrain && state.invulnTimer <= 0 && state.jetpackTimer <= 0) {
    // Side-scrape stumble like Subway Surfers: bounce back unless Chaser Drone is already right behind you!
    state.shakeTimer = 0.28;
    state.shakeIntensity = 0.22;
    if (state.hoverboardTimer > 0) {
      state.hoverboardTimer = 0;
      state.invulnTimer = 1.4;
      targetHitTrain.hit = true;
      state.burstQueue.push({ x: targetHitTrain.lane - 1, y: 0.6, z: PLAYER_HIT_Z, color: 0x22d3ee, count: 16 });
      state.popups.push({
        id: `p_${Math.random()}`,
        text: "BOARD SAVE!",
        x: state.laneX,
        y: state.y + 1.0,
        color: "#22d3ee",
        life: 0.9,
      });
      return true;
    }
    if (state.chaserTimer > 0) {
      state.phase = "gameover";
      return false;
    }
    state.chaserTimer = 4.2;
    state.stumbleTimer = 0.4;
    state.burstQueue.push({ x: state.laneX, y: 0.5, z: PLAYER_HIT_Z, color: 0xf97316, count: 10 });
    state.popups.push({
      id: `p_${Math.random()}`,
      text: "STUMBLE!",
      x: state.laneX,
      y: state.y + 0.95,
      color: "#fb923c",
      life: 0.8,
    });
    return false;
  }

  state.prevLane = state.lane;
  state.lane = next;
  return true;
}

export function triggerHoverboard(state) {
  if (state.phase !== "playing") return false;
  if (state.hoverboardTimer > 0 || state.hoverboards <= 0) return false;
  state.hoverboards -= 1;
  state.hoverboardTimer = 18.0;
  state.burstQueue.push({ x: state.laneX, y: 0.3, z: PLAYER_HIT_Z, color: 0x22d3ee, count: 14 });
  return true;
}

/**
 * Guaranteed passable procedural wave spawner.
 * Includes rooftop ramps, slaloms, laser gates, and late-game moving Express Trains.
 */
export function generateWave(waveIndex, rng = Math.random) {
  const entities = [];
  const laneOrder = [0, 1, 2];
  for (let i = laneOrder.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [laneOrder[i], laneOrder[j]] = [laneOrder[j], laneOrder[i]];
  }

  const safeLane = laneOrder[0];
  const roll = rng();
  const canExpress = waveIndex >= 6;

  if (waveIndex % 5 === 2 && roll < 0.85) {
    entities.push({
      id: `ramp_${waveIndex}`,
      kind: "ramp",
      lane: safeLane,
      z: 1.0,
      zEnd: 1.14,
      hit: false,
    });
    entities.push({
      id: `train_top_${waveIndex}`,
      kind: "train",
      lane: safeLane,
      z: 1.14,
      zEnd: 1.44,
      colorVariant: waveIndex % 3,
      moving: false,
      hit: false,
    });
    for (let k = 0; k < 5; k++) {
      entities.push({
        id: `rcoin_${waveIndex}_${k}`,
        kind: "coin",
        lane: safeLane,
        y: TRAIN_ROOF_Y + 0.36,
        z: 1.17 + k * 0.058,
        collected: false,
      });
    }
    entities.push({
      id: `train_side_${waveIndex}`,
      kind: "train",
      lane: laneOrder[1],
      z: 1.04,
      zEnd: 1.34,
      colorVariant: (waveIndex + 1) % 3,
      moving: canExpress && rng() < 0.35,
      hit: false,
    });
    if (rng() < 0.5) {
      const kinds = ["magnet", "multiplier", "jetpack", "board_pickup", "sneakers"];
      entities.push({
        id: `pwr_${waveIndex}`,
        kind: kinds[Math.floor(rng() * kinds.length)],
        lane: laneOrder[2],
        y: 0.4,
        z: 1.08,
        collected: false,
      });
    }
    return { entities, nextCooldown: Math.max(0.85, 1.35 - waveIndex * 0.01) };
  }

  const pattern = rng();
  if (pattern < 0.35) {
    const trainCount = rng() < 0.58 ? 2 : 1;
    for (let i = 1; i <= trainCount; i++) {
      entities.push({
        id: `train_${waveIndex}_${i}`,
        kind: "train",
        lane: laneOrder[i],
        z: 1.02 + (i - 1) * 0.04,
        zEnd: 1.3 + (i - 1) * 0.04,
        colorVariant: (waveIndex + i) % 3,
        moving: canExpress && i === 1 && rng() < 0.3,
        hit: false,
      });
    }
    for (let k = 0; k < 4; k++) {
      entities.push({
        id: `coin_${waveIndex}_${k}`,
        kind: "coin",
        lane: safeLane,
        y: 0.34,
        z: 0.98 + k * 0.065,
        collected: false,
      });
    }
  } else if (pattern < 0.7) {
    const isGate = rng() < 0.48;
    entities.push({
      id: `obs_${waveIndex}_safe`,
      kind: isGate ? "high_gate" : "low_barrier",
      lane: safeLane,
      z: 1.0,
      zEnd: 1.04,
      hit: false,
    });
    for (let k = 0; k < 3; k++) {
      entities.push({
        id: `acoin_${waveIndex}_${k}`,
        kind: "coin",
        lane: safeLane,
        y: isGate ? 0.24 : k === 1 ? 0.95 : 0.65,
        z: 0.96 + k * 0.045,
        collected: false,
      });
    }
    entities.push({
      id: `obs_${waveIndex}_b1`,
      kind: "train",
      lane: laneOrder[1],
      z: 1.0,
      zEnd: 1.26,
      colorVariant: waveIndex % 3,
      moving: false,
      hit: false,
    });
    if (rng() < 0.65) {
      entities.push({
        id: `obs_${waveIndex}_b2`,
        kind: rng() < 0.5 ? "low_barrier" : "high_gate",
        lane: laneOrder[2],
        z: 1.0,
        zEnd: 1.04,
        hit: false,
      });
    }
  } else {
    entities.push({
      id: `slalom_${waveIndex}_1`,
      kind: "low_barrier",
      lane: laneOrder[1],
      z: 1.0,
      zEnd: 1.04,
      hit: false,
    });
    entities.push({
      id: `slalom_${waveIndex}_2`,
      kind: "high_gate",
      lane: laneOrder[2],
      z: 1.12,
      zEnd: 1.16,
      hit: false,
    });
    for (let k = 0; k < 4; k++) {
      entities.push({
        id: `scoin_${waveIndex}_${k}`,
        kind: "coin",
        lane: safeLane,
        y: 0.34,
        z: 0.96 + k * 0.06,
        collected: false,
      });
    }
  }

  if (rng() < 0.26) {
    const kinds = ["magnet", "multiplier", "jetpack", "board_pickup", "sneakers"];
    entities.push({
      id: `power_${waveIndex}`,
      kind: kinds[Math.floor(rng() * kinds.length)],
      lane: safeLane,
      y: 0.42,
      z: 1.26,
      collected: false,
    });
  }

  // Exact tail extent prevents consecutive waves from overlapping at any speed
  const maxTailZ = entities.reduce((acc, e) => Math.max(acc, e.zEnd ?? e.z), 1.05);
  const gapDist = Math.max(0.24, 0.36 - waveIndex * 0.002);

  return {
    entities,
    nextCooldown: (maxTailZ - 1.0) + gapDist,
  };
}

/**
 * Advances simulation by dt seconds (clamped for tab-switch safety).
 */
export function stepRunnerState(state, rawDt, rng = Math.random) {
  const events = {
    coinPicked: false,
    crashed: false,
    shieldSaved: false,
    powerupPicked: null,
    stunt: false,
  };

  if (state.phase !== "playing") return events;
  const dt = Math.min(0.05, Math.max(0, rawDt));

  const targetSpeed = Math.min(MAX_SPEED, BASE_SPEED + state.distance * 0.00055);
  const effectiveSpeed = state.jetpackTimer > 0 ? targetSpeed * 1.45 : targetSpeed;
  state.speed = effectiveSpeed;
  state.stridePhase += dt * (effectiveSpeed / BASE_SPEED) * 14;

  // Timers
  if (state.slideTimer > 0) state.slideTimer = Math.max(0, state.slideTimer - dt);
  if (state.jumpBufferTimer > 0) state.jumpBufferTimer = Math.max(0, state.jumpBufferTimer - dt);
  if (state.stumbleTimer > 0) state.stumbleTimer = Math.max(0, state.stumbleTimer - dt);
  if (state.chaserTimer > 0) state.chaserTimer = Math.max(0, state.chaserTimer - dt);
  if (state.invulnTimer > 0) state.invulnTimer = Math.max(0, state.invulnTimer - dt);
  if (state.hoverboardTimer > 0) state.hoverboardTimer = Math.max(0, state.hoverboardTimer - dt);
  if (state.magnetTimer > 0) state.magnetTimer = Math.max(0, state.magnetTimer - dt);
  if (state.multiplierTimer > 0) state.multiplierTimer = Math.max(0, state.multiplierTimer - dt);
  if (state.sneakersTimer > 0) state.sneakersTimer = Math.max(0, state.sneakersTimer - dt);
  if (state.comboTimer > 0) {
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer === 0) state.combo = 0;
  }
  if (state.shakeTimer > 0) state.shakeTimer = Math.max(0, state.shakeTimer - dt);

  const wasJetpack = state.jetpackTimer > 0;
  if (state.jetpackTimer > 0) {
    state.jetpackTimer = Math.max(0, state.jetpackTimer - dt);
    if (state.jetpackTimer === 0 && wasJetpack) {
      state.invulnTimer = Math.max(state.invulnTimer, 1.45);
    }
  }

  // Distance & score
  const mult = state.multiplierTimer > 0 ? 2 : 1;
  const dz = effectiveSpeed * dt;
  const distGain = dz * 115;
  state.distance += distGain;
  state.score += Math.floor(distGain * mult);
  state.trackScroll = (state.trackScroll + dz * 12) % 1;

  // Smooth, crisp lateral lane interpolation & dynamic body bank leanAngle
  const targetX = state.lane - 1;
  const dx = targetX - state.laneX;
  state.laneX += dx * Math.min(1, dt * 26);
  const targetLean = Math.max(-0.42, Math.min(0.42, -dx * 0.78));
  state.leanAngle += (targetLean - state.leanAngle) * Math.min(1, dt * 22);

  // Surface elevation (ground / ramp / walkable train roof)
  const prevGroundY = state.groundY;
  let surfaceY = 0;
  for (const ent of state.entities) {
    if (Math.abs(ent.lane - (state.laneX + 1)) > 0.5) continue;
    if (ent.kind === "ramp" && ent.z <= PLAYER_HIT_Z + 0.05 && (ent.zEnd ?? ent.z + 0.14) >= PLAYER_HIT_Z - 0.04) {
      const len = (ent.zEnd ?? ent.z + 0.14) - ent.z;
      const rampFrac = Math.max(0, Math.min(1, (PLAYER_HIT_Z - ent.z) / Math.max(0.05, len)));
      surfaceY = Math.max(surfaceY, rampFrac * TRAIN_ROOF_Y);
      if (state.y <= surfaceY && state.vy <= 0) {
        state.y = surfaceY;
      }
    }
    if (ent.kind === "train" && ent.z <= PLAYER_HIT_Z + 0.04 && (ent.zEnd ?? ent.z + 0.24) >= PLAYER_HIT_Z - 0.03) {
      if (state.y >= TRAIN_ROOF_Y - 0.36) {
        surfaceY = Math.max(surfaceY, TRAIN_ROOF_Y);
      }
    }
  }
  state.groundY = surfaceY;
  if (state.y <= prevGroundY + 0.06 && surfaceY < prevGroundY) {
    state.coyoteTimer = 0.085;
  } else if (state.y <= state.groundY + 0.04) {
    state.coyoteTimer = 0.085;
  } else if (state.coyoteTimer > 0) {
    state.coyoteTimer = Math.max(0, state.coyoteTimer - dt);
  }

  // Vertical motion
  if (state.jetpackTimer > 0) {
    state.y += (JETPACK_Y - state.y) * Math.min(1, dt * 7);
    state.vy = 0;
    state.slideTimer = 0;
  } else {
    state.vy -= GRAVITY * dt;
    state.y += state.vy * dt;
    if (state.y <= state.groundY) {
      state.y = state.groundY;
      state.vy = 0;
      if (state.slamPending) {
        state.slamPending = false;
        state.slideTimer = 0.45;
      }
      if (state.jumpBufferTimer > 0) {
        triggerJump(state);
      }
    }
  }

  // Spawn waves or sky coin trails
  state.spawnTimer -= dz;
  if (state.spawnTimer <= 0) {
    if (state.jetpackTimer > 0.6) {
      const skyLane = Math.floor(rng() * 3);
      for (let k = 0; k < 5; k++) {
        state.entities.push({
          id: `jcoin_${state.waveIndex}_${k}`,
          kind: "coin",
          lane: skyLane,
          y: JETPACK_Y,
          z: 0.96 + k * 0.05,
          collected: false,
        });
      }
      state.waveIndex += 1;
      state.spawnTimer = 0.28;
    } else {
      const wave = generateWave(state.waveIndex, rng);
      // Prevent fast Express moving trains from overtaking and clipping into existing obstacles ahead on that lane
      for (const ent of wave.entities) {
        if (ent.moving) {
          const laneOccupiedAhead = state.entities.some(
            (existing) => existing.kind !== "coin" && existing.lane === ent.lane && existing.z > 0.2
          );
          if (laneOccupiedAhead) ent.moving = false;
        }
      }
      state.entities.push(...wave.entities);
      state.waveIndex += 1;
      state.spawnTimer = wave.nextCooldown;
    }
  }

  const playerIsSliding = state.slideTimer > 0;
  for (const ent of state.entities) {
    const stepDz = ent.moving ? dz * 1.45 : dz;
    ent.z -= stepDz;
    if (ent.zEnd !== undefined) ent.zEnd -= stepDz;

    const isCoinOrPower =
      ent.kind === "coin" ||
      ent.kind === "magnet" ||
      ent.kind === "multiplier" ||
      ent.kind === "jetpack" ||
      ent.kind === "board_pickup" ||
      ent.kind === "sneakers";

    if (isCoinOrPower) {
      if (ent.collected) continue;

      if (ent.kind === "coin" && state.magnetTimer > 0 && ent.z < 0.5 && ent.z > -0.05) {
        const laneTarget = state.laneX + 1;
        ent.lane += (laneTarget - ent.lane) * Math.min(1, dt * 14);
        ent.y = (ent.y ?? 0.34) + (state.y + 0.34 - (ent.y ?? 0.34)) * Math.min(1, dt * 14);
      }

      const entY = ent.y ?? 0.34;
      const laneDist = Math.abs(ent.lane - (state.laneX + 1));
      const zDist = Math.abs(ent.z - PLAYER_HIT_Z);
      const yDist = Math.abs(entY - (state.y + 0.35));

      if (laneDist < 0.56 && zDist < 0.08 && yDist < 0.68) {
        ent.collected = true;
        if (ent.kind === "coin") {
          state.coins += mult;
          state.combo += 1;
          state.comboTimer = 1.6;
          const bonus = (10 + Math.min(40, state.combo * 2)) * mult;
          state.score += bonus;
          events.coinPicked = true;
          state.burstQueue.push({ x: ent.lane - 1, y: entY, z: PLAYER_HIT_Z, color: 0xfbbf24, count: 6 });
          state.popups.push({
            id: `p_${Math.random()}`,
            text: `+${bonus}`,
            x: state.laneX,
            y: state.y + 0.9,
            color: "#fbbf24",
            life: 0.7,
          });
        } else {
          events.powerupPicked = ent.kind;
          if (ent.kind === "magnet") state.magnetTimer = 9.0;
          if (ent.kind === "multiplier") state.multiplierTimer = 10.0;
          if (ent.kind === "jetpack") state.jetpackTimer = 6.5;
          if (ent.kind === "board_pickup") state.hoverboards += 1;
          if (ent.kind === "sneakers") state.sneakersTimer = 8.5;
          const labels = {
            magnet: "MAGNET!",
            multiplier: "2X SCORE!",
            jetpack: "JETPACK!",
            board_pickup: "+1 BOARD!",
            sneakers: "SUPER BOOTS!",
          };
          state.burstQueue.push({ x: ent.lane - 1, y: entY, z: PLAYER_HIT_Z, color: 0x38bdf8, count: 14 });
          state.popups.push({
            id: `p_${Math.random()}`,
            text: labels[ent.kind],
            x: state.laneX,
            y: state.y + 1.0,
            color: "#38bdf8",
            life: 0.95,
          });
        }
      }
      continue;
    }

    if (ent.hit || ent.kind === "ramp") continue;
    const zStart = ent.z;
    const zEnd = ent.zEnd ?? ent.z + 0.04;
    const overlapsZ = zStart <= PLAYER_HIT_Z + 0.025 && zEnd >= PLAYER_HIT_Z - 0.025;
    if (!overlapsZ) continue;

    const laneDist = Math.abs(ent.lane - (state.laneX + 1));
    if (laneDist >= 0.44) {
      // Stunt graze bonus if jumping cleanly right past a train roof or low hurdle!
      if (!ent.stunted && laneDist < 1.15 && state.y > 0.7 && ent.kind === "train") {
        ent.stunted = true;
        state.stunts += 1;
        state.score += 50 * mult;
        events.stunt = true;
        state.popups.push({
          id: `p_${Math.random()}`,
          text: `+${50 * mult} STUNT!`,
          x: state.laneX,
          y: state.y + 1.05,
          color: "#a855f7",
          life: 0.8,
        });
      }
      continue;
    }

    let collides = false;
    if (ent.kind === "low_barrier") {
      if (state.y < 0.46) collides = true;
    } else if (ent.kind === "high_gate") {
      if (!playerIsSliding && state.y < 1.38 && state.y + 0.85 > 0.56) {
        collides = true;
      }
    } else if (ent.kind === "train") {
      if (state.y < TRAIN_ROOF_Y - 0.22) {
        collides = true;
      }
    }

    if (collides && state.invulnTimer <= 0 && state.jetpackTimer <= 0) {
      ent.hit = true;
      if (state.hoverboardTimer > 0) {
        state.hoverboardTimer = 0;
        state.invulnTimer = 1.6;
        state.shakeTimer = 0.35;
        state.shakeIntensity = 0.28;
        events.shieldSaved = true;
        state.burstQueue.push({ x: state.laneX, y: state.y + 0.5, z: PLAYER_HIT_Z, color: 0x22d3ee, count: 24 });
        for (const other of state.entities) {
          if (other.z < 0.45 && other.z > -0.1 && (other.kind === "train" || other.kind === "low_barrier" || other.kind === "high_gate")) {
            other.hit = true;
          }
        }
        state.popups.push({
          id: `p_${Math.random()}`,
          text: "SHIELD BLAST!",
          x: state.laneX,
          y: state.y + 1.1,
          color: "#22d3ee",
          life: 1.0,
        });
      } else {
        state.phase = "gameover";
        state.shakeTimer = 0.45;
        state.shakeIntensity = 0.36;
        events.crashed = true;
        state.burstQueue.push({ x: state.laneX, y: state.y + 0.5, z: PLAYER_HIT_Z, color: 0xf43f5e, count: 24 });
        return events;
      }
    }
  }

  for (const p of state.popups) {
    p.life -= dt;
    p.y += dt * 1.15;
  }
  state.popups = state.popups.filter((p) => p.life > 0);

  state.entities = state.entities.filter(
    (e) => (e.zEnd ?? e.z) > -0.26 && !e.collected && !e.hit
  );

  return events;
}

/**
 * Retained for compatibility & deterministic perspective math unit tests.
 */
export function projectWorld(laneX, y, z, width, height) {
  const clampedZ = Math.max(-0.08, Math.min(1.25, z));
  const horizonY = height * 0.31;
  const groundBottomY = height * 0.94;
  const depthScale = Math.pow(1 - Math.min(0.95, clampedZ * 0.9), 1.45);
  const yFloor = horizonY + (groundBottomY - horizonY) * depthScale;
  const centerX = width * 0.5;
  const laneSpacing = width * 0.255 * (0.16 + 0.84 * depthScale);
  const px = centerX + laneX * laneSpacing;
  const unitHeight = height * 0.26 * (0.14 + 0.86 * depthScale);
  const py = yFloor - y * unitHeight;
  return { x: px, y: py, yFloor, scale: depthScale, unitHeight, laneSpacing };
}

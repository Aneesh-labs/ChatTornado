/**
 * Pure simulation engine & 3D perspective projection math for Tornado Surfers.
 * Kept framework-agnostic so both TornadoSurfersGame.jsx and unit tests run
 * deterministic, frame-rate independent physics and guaranteed-passable waves.
 */

export const MAX_Z = 1.0;
export const PLAYER_HIT_Z = 0.085;
export const TRAIN_ROOF_Y = 1.15;
export const JETPACK_Y = 2.45;
export const GRAVITY = 28;
export const JUMP_VELOCITY = 11.4;
export const SLAM_VELOCITY = -24;
export const BASE_SPEED = 0.36; // world z-units per second
export const MAX_SPEED = 0.86;

export function createInitialRunnerState() {
  return {
    phase: "ready", // "ready" | "playing" | "paused" | "gameover"
    lane: 1, // 0, 1, 2
    prevLane: 1,
    laneX: 0, // interpolated -1..1
    y: 0,
    vy: 0,
    groundY: 0,
    slideTimer: 0,
    slamPending: false,
    jumpBufferTimer: 0,
    stumbleTimer: 0,
    invulnTimer: 0,
    hoverboards: 3,
    hoverboardTimer: 0,
    magnetTimer: 0,
    multiplierTimer: 0,
    jetpackTimer: 0,
    speed: BASE_SPEED,
    distance: 0,
    coins: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    spawnTimer: 0.4,
    trackScroll: 0,
    shakeTimer: 0,
    shakeIntensity: 0,
    waveIndex: 0,
    entities: [],
    popups: [],
    particles: [],
  };
}

export function triggerJump(state) {
  if (state.phase !== "playing") return false;
  if (state.jetpackTimer > 0) return false;
  // Cancel active slide immediately so jumping feels snappy
  state.slideTimer = 0;
  state.slamPending = false;
  const onSurface = state.y <= state.groundY + 0.06;
  if (onSurface) {
    state.vy = JUMP_VELOCITY;
    state.y = Math.max(state.y, state.groundY + 0.01);
    state.jumpBufferTimer = 0;
    return true;
  }
  state.jumpBufferTimer = 0.14;
  return false;
}

export function triggerSlideOrSlam(state) {
  if (state.phase !== "playing") return false;
  if (state.jetpackTimer > 0) return false;
  if (state.y > state.groundY + 0.08) {
    // Mid-air fast-fall slam + roll on landing
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
  state.prevLane = state.lane;
  state.lane = next;
  return true;
}

export function triggerHoverboard(state) {
  if (state.phase !== "playing") return false;
  if (state.hoverboardTimer > 0 || state.hoverboards <= 0) return false;
  state.hoverboards -= 1;
  state.hoverboardTimer = 18.0;
  return true;
}

/**
 * Guaranteed passable procedural wave spawner.
 * Every wave ensures at least one lane is open OR traversable via ramp / low hurdle / arch.
 */
export function generateWave(waveIndex, rng = Math.random) {
  const entities = [];
  const laneOrder = [0, 1, 2];
  // Shuffle lanes using rng
  for (let i = laneOrder.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [laneOrder[i], laneOrder[j]] = [laneOrder[j], laneOrder[i]];
  }

  const safeLane = laneOrder[0];
  const roll = rng();

  if (waveIndex % 5 === 2 && roll < 0.85) {
    // Elevated ramp + rooftop train run on one lane, trains on others
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
      zEnd: 1.42,
      colorVariant: waveIndex % 3,
      hit: false,
    });
    // Rooftop coin line
    for (let k = 0; k < 4; k++) {
      entities.push({
        id: `rcoin_${waveIndex}_${k}`,
        kind: "coin",
        lane: safeLane,
        y: TRAIN_ROOF_Y + 0.35,
        z: 1.17 + k * 0.065,
        collected: false,
      });
    }
    // Companion train in another lane
    entities.push({
      id: `train_side_${waveIndex}`,
      kind: "train",
      lane: laneOrder[1],
      z: 1.04,
      zEnd: 1.34,
      colorVariant: (waveIndex + 1) % 3,
      hit: false,
    });
    // Bonus powerup at end of third lane or on safe rooftop
    if (rng() < 0.45) {
      const kinds = ["magnet", "multiplier", "jetpack", "board_pickup"];
      entities.push({
        id: `pwr_${waveIndex}`,
        kind: kinds[Math.floor(rng() * kinds.length)],
        lane: laneOrder[2],
        y: 0.36,
        z: 1.08,
        collected: false,
      });
    }
    return { entities, nextCooldown: Math.max(0.88, 1.38 - waveIndex * 0.01) };
  }

  // Standard mixed obstacle row: max 2 solid trains, 3rd lane is open or hurdle/arch
  const pattern = rng();
  if (pattern < 0.35) {
    // 1 or 2 trains + open coin lane
    const trainCount = rng() < 0.55 ? 2 : 1;
    for (let i = 1; i <= trainCount; i++) {
      entities.push({
        id: `train_${waveIndex}_${i}`,
        kind: "train",
        lane: laneOrder[i],
        z: 1.02 + (i - 1) * 0.04,
        zEnd: 1.28 + (i - 1) * 0.04,
        colorVariant: (waveIndex + i) % 3,
        hit: false,
      });
    }
    for (let k = 0; k < 4; k++) {
      entities.push({
        id: `coin_${waveIndex}_${k}`,
        kind: "coin",
        lane: safeLane,
        y: 0.32,
        z: 0.98 + k * 0.065,
        collected: false,
      });
    }
  } else if (pattern < 0.7) {
    // Jumpable low barrier OR slideable high gate in safeLane, obstacles in others
    const isGate = rng() < 0.48;
    entities.push({
      id: `obs_${waveIndex}_safe`,
      kind: isGate ? "high_gate" : "low_barrier",
      lane: safeLane,
      z: 1.0,
      zEnd: 1.04,
      hit: false,
    });
    // Arc of coins over barrier or under gate
    for (let k = 0; k < 3; k++) {
      entities.push({
        id: `acoin_${waveIndex}_${k}`,
        kind: "coin",
        lane: safeLane,
        y: isGate ? 0.22 : k === 1 ? 0.92 : 0.62,
        z: 0.96 + k * 0.045,
        collected: false,
      });
    }
    entities.push({
      id: `obs_${waveIndex}_b1`,
      kind: "train",
      lane: laneOrder[1],
      z: 1.0,
      zEnd: 1.24,
      colorVariant: waveIndex % 3,
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
    // Slalom wave across all 3 lanes (low barriers & open coin trails)
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
        y: 0.32,
        z: 0.96 + k * 0.06,
        collected: false,
      });
    }
  }

  // Occasional powerup spawn in open lane
  if (rng() < 0.24) {
    const kinds = ["magnet", "multiplier", "jetpack", "board_pickup"];
    entities.push({
      id: `power_${waveIndex}`,
      kind: kinds[Math.floor(rng() * kinds.length)],
      lane: safeLane,
      y: 0.4,
      z: 1.26,
      collected: false,
    });
  }

  return {
    entities,
    nextCooldown: Math.max(0.66, 1.12 - waveIndex * 0.008),
  };
}

/**
 * Advances simulation by dt seconds (clamped for tab-switch safety).
 * Returns event flags for audio/effects: { coinPicked, crashed, shieldSaved, powerupPicked, jumped }
 */
export function stepRunnerState(state, rawDt, rng = Math.random) {
  const events = {
    coinPicked: false,
    crashed: false,
    shieldSaved: false,
    powerupPicked: null,
  };

  if (state.phase !== "playing") return events;
  const dt = Math.min(0.05, Math.max(0, rawDt));

  // Speed ramps smoothly with distance up to MAX_SPEED
  const targetSpeed = Math.min(MAX_SPEED, BASE_SPEED + state.distance * 0.00055);
  const effectiveSpeed = state.jetpackTimer > 0 ? targetSpeed * 1.42 : targetSpeed;
  state.speed = effectiveSpeed;

  // Timers
  if (state.slideTimer > 0) state.slideTimer = Math.max(0, state.slideTimer - dt);
  if (state.jumpBufferTimer > 0) state.jumpBufferTimer = Math.max(0, state.jumpBufferTimer - dt);
  if (state.stumbleTimer > 0) state.stumbleTimer = Math.max(0, state.stumbleTimer - dt);
  if (state.invulnTimer > 0) state.invulnTimer = Math.max(0, state.invulnTimer - dt);
  if (state.hoverboardTimer > 0) state.hoverboardTimer = Math.max(0, state.hoverboardTimer - dt);
  if (state.magnetTimer > 0) state.magnetTimer = Math.max(0, state.magnetTimer - dt);
  if (state.multiplierTimer > 0) state.multiplierTimer = Math.max(0, state.multiplierTimer - dt);
  if (state.comboTimer > 0) {
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer === 0) state.combo = 0;
  }
  if (state.shakeTimer > 0) state.shakeTimer = Math.max(0, state.shakeTimer - dt);

  const wasJetpack = state.jetpackTimer > 0;
  if (state.jetpackTimer > 0) {
    state.jetpackTimer = Math.max(0, state.jetpackTimer - dt);
    if (state.jetpackTimer === 0 && wasJetpack) {
      state.invulnTimer = Math.max(state.invulnTimer, 1.4); // safe descent grace
    }
  }

  // Distance & score
  const mult = state.multiplierTimer > 0 ? 2 : 1;
  const dz = effectiveSpeed * dt;
  const distGain = dz * 115;
  state.distance += distGain;
  state.score += Math.floor(distGain * mult);
  state.trackScroll = (state.trackScroll + dz * 12) % 1;

  // Smooth lateral lane interpolation
  const targetX = state.lane - 1;
  const dx = targetX - state.laneX;
  state.laneX += dx * Math.min(1, dt * 18);

  // Determine ground surface underneath player (floor 0 or train roof/ramp)
  let surfaceY = 0;
  for (const ent of state.entities) {
    if (Math.abs(ent.lane - (state.laneX + 1)) > 0.48) continue;
    if (ent.kind === "ramp" && ent.z <= PLAYER_HIT_Z + 0.04 && (ent.zEnd ?? ent.z + 0.14) >= PLAYER_HIT_Z - 0.03) {
      const len = (ent.zEnd ?? ent.z + 0.14) - ent.z;
      const rampFrac = Math.max(0, Math.min(1, (PLAYER_HIT_Z - ent.z) / Math.max(0.05, len)));
      surfaceY = Math.max(surfaceY, rampFrac * TRAIN_ROOF_Y);
      if (state.y <= surfaceY && state.vy <= 0) {
        state.y = surfaceY;
      }
    }
    if (ent.kind === "train" && ent.z <= PLAYER_HIT_Z + 0.03 && (ent.zEnd ?? ent.z + 0.24) >= PLAYER_HIT_Z - 0.02) {
      if (state.y >= TRAIN_ROOF_Y - 0.35) {
        surfaceY = Math.max(surfaceY, TRAIN_ROOF_Y);
      }
    }
  }
  state.groundY = surfaceY;

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

  // Spawn waves or jetpack sky-coins
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
      state.entities.push(...wave.entities);
      state.waveIndex += 1;
      state.spawnTimer = wave.nextCooldown * effectiveSpeed;
    }
  }

  // Move entities toward runner & resolve interactions
  const playerIsSliding = state.slideTimer > 0;
  for (const ent of state.entities) {
    ent.z -= dz;
    if (ent.zEnd !== undefined) ent.zEnd -= dz;

    const isCoinOrPower =
      ent.kind === "coin" ||
      ent.kind === "magnet" ||
      ent.kind === "multiplier" ||
      ent.kind === "jetpack" ||
      ent.kind === "board_pickup";

    if (isCoinOrPower) {
      if (ent.collected) continue;

      // Magnet pulls nearby coins across lanes & heights
      if (ent.kind === "coin" && state.magnetTimer > 0 && ent.z < 0.48 && ent.z > -0.05) {
        const laneTarget = state.laneX + 1;
        ent.lane += (laneTarget - ent.lane) * Math.min(1, dt * 14);
        ent.y = (ent.y ?? 0.3) + (state.y + 0.3 - (ent.y ?? 0.3)) * Math.min(1, dt * 14);
      }

      const entY = ent.y ?? 0.32;
      const laneDist = Math.abs(ent.lane - (state.laneX + 1));
      const zDist = Math.abs(ent.z - PLAYER_HIT_Z);
      const yDist = Math.abs(entY - (state.y + 0.35));

      if (laneDist < 0.55 && zDist < 0.075 && yDist < 0.65) {
        ent.collected = true;
        if (ent.kind === "coin") {
          state.coins += mult;
          state.combo += 1;
          state.comboTimer = 1.6;
          const bonus = (10 + Math.min(40, state.combo * 2)) * mult;
          state.score += bonus;
          events.coinPicked = true;
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
          if (ent.kind === "magnet") state.magnetTimer = 8.5;
          if (ent.kind === "multiplier") state.multiplierTimer = 10.0;
          if (ent.kind === "jetpack") state.jetpackTimer = 6.5;
          if (ent.kind === "board_pickup") state.hoverboards += 1;
          const labels = {
            magnet: "MAGNET!",
            multiplier: "2X SCORE!",
            jetpack: "JETPACK!",
            board_pickup: "+1 BOARD!",
          };
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

    // Obstacles
    if (ent.hit || ent.kind === "ramp") continue;
    const zStart = ent.z;
    const zEnd = ent.zEnd ?? ent.z + 0.04;
    const overlapsZ = zStart <= PLAYER_HIT_Z + 0.025 && zEnd >= PLAYER_HIT_Z - 0.025;
    if (!overlapsZ) continue;

    const laneDist = Math.abs(ent.lane - (state.laneX + 1));
    if (laneDist >= 0.44) continue;

    let collides = false;
    if (ent.kind === "low_barrier") {
      if (state.y < 0.46) collides = true;
    } else if (ent.kind === "high_gate") {
      if (!playerIsSliding && state.y < 1.38 && state.y + 0.85 > 0.56) {
        collides = true;
      }
    } else if (ent.kind === "train") {
      // Safe if standing atop train roof or soaring above it
      if (state.y < TRAIN_ROOF_Y - 0.22) {
        collides = true;
      }
    }

    if (collides && state.invulnTimer <= 0 && state.jetpackTimer <= 0) {
      ent.hit = true;
      if (state.hoverboardTimer > 0) {
        // Hoverboard EMP Shield saves run & shatters nearby obstacles!
        state.hoverboardTimer = 0;
        state.invulnTimer = 1.6;
        state.shakeTimer = 0.35;
        state.shakeIntensity = 14;
        events.shieldSaved = true;
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
        state.shakeIntensity = 18;
        events.crashed = true;
        return events;
      }
    }
  }

  // Update popups
  for (const p of state.popups) {
    p.life -= dt;
    p.y += dt * 1.1;
  }
  state.popups = state.popups.filter((p) => p.life > 0);

  // Prune behind camera
  state.entities = state.entities.filter(
    (e) => (e.zEnd ?? e.z) > -0.15 && !e.collected && !e.hit
  );

  return events;
}

/**
 * Projects world coordinates (laneX in -1.5..1.5, y in world units, z in 0..1)
 * onto canvas pixels with true horizon perspective.
 */
export function projectWorld(laneX, y, z, width, height) {
  const clampedZ = Math.max(-0.08, Math.min(1.25, z));
  const horizonY = height * 0.31;
  const groundBottomY = height * 0.94;
  // Non-linear perspective curve so foreground feels sweeping and horizon crisp
  const depthScale = Math.pow(1 - Math.min(0.95, clampedZ * 0.9), 1.45);
  const yFloor = horizonY + (groundBottomY - horizonY) * depthScale;
  const centerX = width * 0.5;
  const laneSpacing = width * 0.255 * (0.16 + 0.84 * depthScale);
  const px = centerX + laneX * laneSpacing;
  const unitHeight = height * 0.26 * (0.14 + 0.86 * depthScale);
  const py = yFloor - y * unitHeight;
  return { x: px, y: py, yFloor, scale: depthScale, unitHeight, laneSpacing };
}

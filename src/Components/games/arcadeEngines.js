/**
 * Pure simulation & logic engines for Mini Games 1–7 in ChatTornado Arcade.
 * Enables smooth dt-independent physics in React Canvas/DOM UIs and direct unit testing.
 */

/* ═══════════════════════════════════════════════════════════════
   1. SUPER SNAKE
   ═══════════════════════════════════════════════════════════════ */
export const SNAKE_GRID = 18;

export function queueSnakeDirection(currentDir, queue, nextDir) {
  const refDir = queue.length > 0 ? queue[queue.length - 1] : currentDir;
  // Disallow same axis / 180-degree reversal
  if (refDir[0] + nextDir[0] === 0 && refDir[1] + nextDir[1] === 0) {
    return queue;
  }
  if (refDir[0] === nextDir[0] && refDir[1] === nextDir[1]) {
    return queue;
  }
  if (queue.length >= 2) return queue;
  return [...queue, nextDir];
}

export function spawnFreeCell(gridSize, occupiedCells, rng = Math.random) {
  const occupied = new Set(occupiedCells.map(([x, y]) => `${x},${y}`));
  const free = [];
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      if (!occupied.has(`${x},${y}`)) free.push([x, y]);
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(rng() * free.length)];
}

export function stepSnakeState(state, portalWalls = false, rng = Math.random) {
  if (state.gameOver) return { ...state, event: null };

  const queue = [...state.dirQueue];
  const activeDir = queue.length > 0 ? queue.shift() : state.dir;
  const head = state.snake[0];
  let nx = head[0] + activeDir[0];
  let ny = head[1] + activeDir[1];

  if (portalWalls) {
    nx = (nx + SNAKE_GRID) % SNAKE_GRID;
    ny = (ny + SNAKE_GRID) % SNAKE_GRID;
  } else if (nx < 0 || nx >= SNAKE_GRID || ny < 0 || ny >= SNAKE_GRID) {
    return { ...state, dir: activeDir, dirQueue: queue, gameOver: true, event: "crash" };
  }

  const ateFood = nx === state.food[0] && ny === state.food[1];
  const ateGold =
    state.goldFood && nx === state.goldFood.pos[0] && ny === state.goldFood.pos[1];

  // Tail vacates unless growing this tick
  const bodyToCheck = ateFood || ateGold ? state.snake : state.snake.slice(0, -1);
  if (bodyToCheck.some(([sx, sy]) => sx === nx && sy === ny)) {
    return { ...state, dir: activeDir, dirQueue: queue, gameOver: true, event: "crash" };
  }

  const newHead = [nx, ny];
  const nextSnake =
    ateFood || ateGold ? [newHead, ...state.snake] : [newHead, ...state.snake.slice(0, -1)];

  let score = state.score;
  let applesEaten = state.applesEaten;
  let food = state.food;
  let goldFood = state.goldFood
    ? { ...state.goldFood, ticksLeft: state.goldFood.ticksLeft - 1 }
    : null;
  if (goldFood && goldFood.ticksLeft <= 0) goldFood = null;

  let event = null;
  if (ateFood) {
    score += 10;
    applesEaten += 1;
    event = "eat";
    const occupied = goldFood ? [...nextSnake, goldFood.pos] : nextSnake;
    food = spawnFreeCell(SNAKE_GRID, occupied, rng) || food;
    if (applesEaten % 5 === 0 && !goldFood) {
      const gPos = spawnFreeCell(SNAKE_GRID, [...nextSnake, food], rng);
      if (gPos) goldFood = { pos: gPos, ticksLeft: 55 };
    }
  } else if (ateGold) {
    score += 35;
    goldFood = null;
    event = "gold";
  }

  return {
    ...state,
    snake: nextSnake,
    dir: activeDir,
    dirQueue: queue,
    food,
    goldFood,
    score,
    applesEaten,
    gameOver: false,
    event,
  };
}

/* ═══════════════════════════════════════════════════════════════
   2. FLAPPY TORNADO (60fps dt normalized)
   ═══════════════════════════════════════════════════════════════ */
export function createFlappyState() {
  return {
    y: 170,
    vy: 0,
    pipes: [{ x: 350, top: 85, gap: 118, scored: false, crystalY: 144, crystalTaken: false }],
    score: 0,
    gameOver: false,
  };
}

export function stepFlappy(state, dt, width = 380, height = 340, rng = Math.random) {
  if (state.gameOver) return { event: null };
  const clampedDt = Math.min(0.05, Math.max(0.001, dt));
  const gravity = 920; // px/s^2
  const pipeSpeed = 148; // px/s

  state.vy += gravity * clampedDt;
  state.y += state.vy * clampedDt;

  const playerX = 76;
  const hitR = 12;

  if (state.y - hitR <= 0 || state.y + hitR >= height) {
    state.gameOver = true;
    return { event: "crash" };
  }

  let event = null;
  for (const p of state.pipes) {
    p.x -= pipeSpeed * clampedDt;

    // Crystal bonus collection
    if (!p.crystalTaken && p.crystalY != null) {
      const cx = p.x + 22;
      if (Math.hypot(playerX - cx, state.y - p.crystalY) < hitR + 11) {
        p.crystalTaken = true;
        state.score += 3;
        event = "crystal";
      }
    }

    // Score trigger when passing pipe center
    if (!p.scored && p.x + 22 < playerX) {
      p.scored = true;
      state.score += 1;
      if (!event) event = "score";
    }

    // AABB vs Circle pipe collision with fair 12px radius
    const pipeW = 44;
    if (playerX + hitR > p.x && playerX - hitR < p.x + pipeW) {
      if (state.y - hitR < p.top || state.y + hitR > p.top + p.gap) {
        state.gameOver = true;
        return { event: "crash" };
      }
    }
  }

  const last = state.pipes[state.pipes.length - 1];
  if (last && last.x < width - 175) {
    const gap = Math.max(96, 120 - Math.floor(state.score / 8) * 3);
    const top = Math.floor(rng() * (height - gap - 90)) + 40;
    const hasCrystal = rng() < 0.45;
    state.pipes.push({
      x: width + 20,
      top,
      gap,
      scored: false,
      crystalY: hasCrystal ? top + gap * 0.5 : null,
      crystalTaken: false,
    });
  }

  state.pipes = state.pipes.filter((p) => p.x > -60);
  return { event };
}

/* ═══════════════════════════════════════════════════════════════
   3. MEMORY MATCH
   ═══════════════════════════════════════════════════════════════ */
export const MEMORY_POOL = ["🐱", "🐶", "🦁", "🐼", "🐸", "🦄", "🚀", "🍕", "⚡", "💎"];

export function createMemoryDeck(pairCount = 8, rng = Math.random) {
  const chosen = MEMORY_POOL.slice(0, pairCount);
  const deck = [...chosen, ...chosen].map((emoji, idx) => ({ id: idx, emoji }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.map((c, idx) => ({ id: idx, emoji: c.emoji }));
}

export function computeMemoryFinalScore(pairCount, moves, elapsedSec, maxStreak) {
  const base = pairCount * 100;
  const moveBonus = Math.max(0, (pairCount * 2 - moves) * 20);
  const timeBonus = Math.max(0, (pairCount * 6 - elapsedSec) * 5);
  return base + moveBonus + timeBonus + maxStreak * 30;
}

/* ═══════════════════════════════════════════════════════════════
   4. 2048 TORNADO
   ═══════════════════════════════════════════════════════════════ */
export function slide2048RowLeft(row) {
  const filtered = row.filter((v) => v !== 0);
  let gained = 0;
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      gained += filtered[i];
      filtered[i + 1] = 0;
    }
  }
  const compact = filtered.filter((v) => v !== 0);
  while (compact.length < 4) compact.push(0);
  return { row: compact, gained };
}

export function move2048Board(board, direction) {
  const next = board.map((r) => [...r]);
  let gained = 0;
  let changed = false;

  if (direction === "left" || direction === "right") {
    for (let r = 0; r < 4; r++) {
      const src = direction === "right" ? [...next[r]].reverse() : next[r];
      const res = slide2048RowLeft(src);
      const out = direction === "right" ? res.row.reverse() : res.row;
      if (out.some((v, idx) => v !== next[r][idx])) changed = true;
      next[r] = out;
      gained += res.gained;
    }
  } else if (direction === "up" || direction === "down") {
    for (let c = 0; c < 4; c++) {
      const col = [next[0][c], next[1][c], next[2][c], next[3][c]];
      const src = direction === "down" ? [...col].reverse() : col;
      const res = slide2048RowLeft(src);
      const out = direction === "down" ? res.row.reverse() : res.row;
      for (let r = 0; r < 4; r++) {
        if (next[r][c] !== out[r]) changed = true;
        next[r][c] = out[r];
      }
      gained += res.gained;
    }
  }

  return { board: next, gained, changed };
}

export function hasValid2048Moves(board) {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return true;
      if (r < 3 && board[r][c] === board[r + 1][c]) return true;
      if (c < 3 && board[r][c] === board[r][c + 1]) return true;
    }
  }
  return false;
}

export function hasReachedTile(board, target = 2048) {
  return board.some((row) => row.some((v) => v >= target));
}

/* ═══════════════════════════════════════════════════════════════
   5. ZOMBIE SURVIVAL (dt normalized, 3 HP, WASD, Spread & Bosses)
   ═══════════════════════════════════════════════════════════════ */
export function createZombieState(cw = 400, ch = 400) {
  return {
    cw,
    ch,
    player: { x: cw / 2, y: ch / 2, radius: 14, angle: 0, hp: 3, maxHp: 3, invulnTimer: 0, spreadTimer: 0 },
    bullets: [],
    zombies: [],
    pickups: [],
    particles: [],
    score: 0,
    kills: 0,
    bombs: 1,
    spawnTimer: 0.4,
    shootCooldown: 0,
    gameOver: false,
  };
}

export function fireZombieWeapon(state, aimX, aimY) {
  if (state.gameOver || state.shootCooldown > 0) return false;
  const p = state.player;
  const baseAngle = Math.atan2(aimY - p.y, aimX - p.x);
  p.angle = baseAngle;
  const angles = p.spreadTimer > 0 ? [baseAngle - 0.16, baseAngle, baseAngle + 0.16] : [baseAngle];
  for (const ang of angles) {
    state.bullets.push({
      x: p.x + Math.cos(ang) * p.radius,
      y: p.y + Math.sin(ang) * p.radius,
      vx: Math.cos(ang) * 560,
      vy: Math.sin(ang) * 560,
      radius: 4,
    });
  }
  state.shootCooldown = p.spreadTimer > 0 ? 0.14 : 0.17;
  return true;
}

export function triggerZombieBomb(state) {
  if (state.gameOver || state.bombs <= 0) return false;
  state.bombs -= 1;
  const p = state.player;
  for (const z of state.zombies) {
    state.kills += 1;
    state.score += z.boss ? 40 : 10;
    for (let k = 0; k < 6; k++) {
      state.particles.push({
        x: z.x,
        y: z.y,
        vx: (Math.random() - 0.5) * 180,
        vy: (Math.random() - 0.5) * 180,
        radius: 3,
        alpha: 1,
        color: "#38bdf8",
      });
    }
  }
  state.zombies = [];
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    state.particles.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(a) * 240,
      vy: Math.sin(a) * 240,
      radius: 4,
      alpha: 1,
      color: "#38bdf8",
    });
  }
  return true;
}

export function stepZombieState(state, dt, moveInput = { x: 0, y: 0 }, rng = Math.random) {
  if (state.gameOver) return { event: null };
  const cDt = Math.min(0.05, Math.max(0.001, dt));
  const p = state.player;

  if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - cDt);
  if (p.spreadTimer > 0) p.spreadTimer = Math.max(0, p.spreadTimer - cDt);
  if (state.shootCooldown > 0) state.shootCooldown = Math.max(0, state.shootCooldown - cDt);

  // Player WASD / Joystick movement
  const mag = Math.hypot(moveInput.x, moveInput.y);
  if (mag > 0) {
    const speed = 175;
    p.x = Math.max(p.radius, Math.min(state.cw - p.radius, p.x + (moveInput.x / mag) * speed * cDt));
    p.y = Math.max(p.radius, Math.min(state.ch - p.radius, p.y + (moveInput.y / mag) * speed * cDt));
  }

  // Bullets
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * cDt;
    b.y += b.vy * cDt;
    if (b.x < -10 || b.x > state.cw + 10 || b.y < -10 || b.y > state.ch + 10) {
      state.bullets.splice(i, 1);
    }
  }

  // Spawn Zombies
  state.spawnTimer -= cDt;
  if (state.spawnTimer <= 0) {
    const isBoss = state.kills > 0 && state.kills % 18 === 0 && !state.zombies.some((z) => z.boss);
    const radius = isBoss ? 22 : rng() * 6 + 11;
    let x, y;
    if (rng() < 0.5) {
      x = rng() < 0.5 ? -radius : state.cw + radius;
      y = rng() * state.ch;
    } else {
      x = rng() * state.cw;
      y = rng() < 0.5 ? -radius : state.ch + radius;
    }
    state.zombies.push({
      x,
      y,
      radius,
      boss: isBoss,
      hp: isBoss ? 4 : 1,
      speed: isBoss ? 52 : 58 + rng() * 52 + Math.min(50, state.kills * 0.8),
    });
    state.spawnTimer = Math.max(0.32, 1.25 - state.kills * 0.015);
  }

  let event = null;

  // Pickups
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const pk = state.pickups[i];
    pk.life -= cDt;
    if (pk.life <= 0) {
      state.pickups.splice(i, 1);
      continue;
    }
    if (Math.hypot(p.x - pk.x, p.y - pk.y) < p.radius + 12) {
      if (pk.kind === "spread") p.spreadTimer = 9;
      if (pk.kind === "heal") p.hp = Math.min(p.maxHp, p.hp + 1);
      if (pk.kind === "bomb") state.bombs += 1;
      event = "powerup";
      state.pickups.splice(i, 1);
    }
  }

  // Zombies update + collisions
  for (let i = state.zombies.length - 1; i >= 0; i--) {
    const z = state.zombies[i];
    const ang = Math.atan2(p.y - z.y, p.x - z.x);
    z.x += Math.cos(ang) * z.speed * cDt;
    z.y += Math.sin(ang) * z.speed * cDt;

    if (p.invulnTimer <= 0 && Math.hypot(p.x - z.x, p.y - z.y) < p.radius + z.radius) {
      p.hp -= 1;
      p.invulnTimer = 1.1;
      state.zombies.splice(i, 1);
      if (p.hp <= 0) {
        state.gameOver = true;
        return { event: "crash" };
      }
      event = "hurt";
      continue;
    }

    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      if (Math.hypot(b.x - z.x, b.y - z.y) < z.radius + b.radius) {
        state.bullets.splice(j, 1);
        z.hp -= 1;
        if (z.hp <= 0) {
          state.kills += 1;
          state.score += z.boss ? 50 : 10;
          event = event || "kill";
          if (rng() < 0.14 || z.boss) {
            const kinds = ["spread", "heal", "bomb"];
            state.pickups.push({
              x: z.x,
              y: z.y,
              kind: kinds[Math.floor(rng() * kinds.length)],
              life: 10,
            });
          }
          for (let k = 0; k < 7; k++) {
            state.particles.push({
              x: z.x,
              y: z.y,
              vx: (rng() - 0.5) * 160,
              vy: (rng() - 0.5) * 160,
              radius: 2.5,
              alpha: 1,
              color: z.boss ? "#f43f5e" : "#84cc16",
            });
          }
          state.zombies.splice(i, 1);
        }
        break;
      }
    }
  }

  // Particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.x += pt.vx * cDt;
    pt.y += pt.vy * cDt;
    pt.alpha -= cDt * 2.1;
    if (pt.alpha <= 0) state.particles.splice(i, 1);
  }

  return { event };
}

/* ═══════════════════════════════════════════════════════════════
   6. NEON DODGE (dt normalized + shields + near-miss combos)
   ═══════════════════════════════════════════════════════════════ */
export function createNeonDodgeState(cw = 380, ch = 450) {
  return {
    cw,
    ch,
    player: { x: cw / 2, y: ch - 46, width: 30, height: 26, speed: 340, shield: false, invuln: 0 },
    obstacles: [],
    pickups: [],
    score: 0,
    speedMult: 1,
    spawnTimer: 0.35,
    pickupTimer: 5.5,
    nearMissPop: null,
    gameOver: false,
  };
}

export function stepNeonDodge(state, dt, moveDir = 0, rng = Math.random) {
  if (state.gameOver) return { event: null };
  const cDt = Math.min(0.05, Math.max(0.001, dt));
  const p = state.player;
  if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - cDt);
  if (state.nearMissPop) {
    state.nearMissPop.life -= cDt;
    if (state.nearMissPop.life <= 0) state.nearMissPop = null;
  }

  if (moveDir !== 0) {
    p.x = Math.max(p.width / 2, Math.min(state.cw - p.width / 2, p.x + moveDir * p.speed * cDt));
  }

  state.spawnTimer -= cDt;
  if (state.spawnTimer <= 0) {
    const w = rng() * 52 + 24;
    state.obstacles.push({
      x: rng() * (state.cw - w),
      y: -26,
      width: w,
      height: 18,
      vx: (rng() - 0.5) * (state.speedMult > 1.4 ? 65 : 0),
      speed: (210 + rng() * 115) * state.speedMult,
      color: rng() < 0.25 ? "#f43f5e" : "#e11d48",
      grazed: false,
    });
    state.spawnTimer = Math.max(0.22, 0.58 - state.speedMult * 0.09);
  }

  state.pickupTimer -= cDt;
  if (state.pickupTimer <= 0) {
    state.pickups.push({
      x: 24 + rng() * (state.cw - 48),
      y: -20,
      kind: rng() < 0.5 ? "shield" : "star",
      speed: 170,
    });
    state.pickupTimer = 5.5 + rng() * 4;
  }

  let event = null;
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const pk = state.pickups[i];
    pk.y += pk.speed * cDt;
    if (Math.hypot(p.x - pk.x, p.y - pk.y) < 26) {
      if (pk.kind === "shield") p.shield = true;
      else state.score += 25;
      event = "pickup";
      state.pickups.splice(i, 1);
      continue;
    }
    if (pk.y > state.ch + 20) state.pickups.splice(i, 1);
  }

  for (let i = state.obstacles.length - 1; i >= 0; i--) {
    const o = state.obstacles[i];
    o.y += o.speed * cDt;
    o.x += o.vx * cDt;
    if (o.x <= 0 || o.x + o.width >= state.cw) o.vx *= -1;

    const px1 = p.x - p.width * 0.42;
    const px2 = p.x + p.width * 0.42;
    const py1 = p.y - p.height * 0.42;
    const py2 = p.y + p.height * 0.42;

    if (px1 < o.x + o.width && px2 > o.x && py1 < o.y + o.height && py2 > o.y) {
      if (p.invuln > 0) {
        state.obstacles.splice(i, 1);
        continue;
      }
      if (p.shield) {
        p.shield = false;
        p.invuln = 1.2;
        state.obstacles.splice(i, 1);
        event = "shield_save";
        continue;
      }
      state.gameOver = true;
      return { event: "crash" };
    }

    // Near miss bonus check
    if (!o.grazed && py1 < o.y + o.height + 10 && py2 > o.y - 10) {
      const distX = Math.max(o.x - px2, px1 - (o.x + o.width), 0);
      if (distX > 0 && distX < 18) {
        o.grazed = true;
        state.score += 15;
        state.nearMissPop = { text: "+15 GRAZE!", x: p.x, y: p.y - 26, life: 0.7 };
        event = event || "graze";
      }
    }

    if (o.y > state.ch + 20) {
      state.obstacles.splice(i, 1);
      state.score += 10;
      state.speedMult = 1 + Math.floor(state.score / 200) * 0.15;
    }
  }

  return { event };
}

/* ═══════════════════════════════════════════════════════════════
   7. NEON BLADE (Fixed angle math + golden cores)
   ═══════════════════════════════════════════════════════════════ */
export function normalizeAngle(rad) {
  const twoPi = Math.PI * 2;
  return ((rad % twoPi) + twoPi) % twoPi;
}

export function angularDistance(a, b) {
  const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return diff > Math.PI ? Math.PI * 2 - diff : diff;
}

/**
 * Computes wheel-local angle corresponding to the world bottom impact point
 * when the wheel has accumulated rotation `targetAngle`.
 * Because bottom is (0, +R) rotated by `targetAngle + knifeAngle`,
 * alignment at world bottom occurs when `targetAngle + knifeAngle ≡ 0 (mod 2π)`,
 * i.e. `knifeAngle = normalizeAngle(-targetAngle)`.
 */
export function computeBladeImpactAngle(targetAngle) {
  return normalizeAngle(-targetAngle);
}

export function checkBladeCollision(impactAngle, stuckAngles, minSepRad = 0.24) {
  return stuckAngles.some((ang) => angularDistance(impactAngle, ang) < minSepRad);
}

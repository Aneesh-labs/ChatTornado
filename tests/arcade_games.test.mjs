import test from "node:test";
import assert from "node:assert/strict";

import {
  SNAKE_GRID,
  queueSnakeDirection,
  stepSnakeState,
  createFlappyState,
  stepFlappy,
  createMemoryDeck,
  computeMemoryFinalScore,
  slide2048RowLeft,
  move2048Board,
  hasValid2048Moves,
  hasReachedTile,
  createZombieState,
  fireZombieWeapon,
  triggerZombieBomb,
  stepZombieState,
  createNeonDodgeState,
  stepNeonDodge,
  computeBladeImpactAngle,
  checkBladeCollision,
  normalizeAngle,
} from "../src/Components/games/arcadeEngines.js";

import {
  createInitialRunnerState,
  triggerJump,
  triggerSlideOrSlam,
  triggerLaneMove,
  triggerHoverboard,
  generateWave,
  stepRunnerState,
  projectWorld,
  PLAYER_HIT_Z,
  TRAIN_ROOF_Y,
  JETPACK_Y,
} from "../src/Components/games/tornadoSurfersEngine.js";

/* ═══════════════════════════════════════════════════════════════
   1. SUPER SNAKE TESTS
   ═══════════════════════════════════════════════════════════════ */
test("1. Super Snake: direction queue prevents 180-deg self-reversal & handles apples + portal walls", () => {
  let q = [];
  // Currently going UP [0,-1]; pressing DOWN [0,1] should be ignored
  q = queueSnakeDirection([0, -1], q, [0, 1]);
  assert.deepEqual(q, []);

  // Pressing LEFT [-1,0] then DOWN [0,1] buffers both cleanly!
  q = queueSnakeDirection([0, -1], q, [-1, 0]);
  q = queueSnakeDirection([0, -1], q, [0, 1]);
  assert.deepEqual(q, [[-1, 0], [0, 1]]);

  let state = {
    snake: [[9, 9], [9, 10], [9, 11]],
    dir: [0, -1],
    dirQueue: q,
    food: [8, 9],
    goldFood: null,
    score: 0,
    applesEaten: 0,
    gameOver: false,
  };

  // Step 1 turns LEFT onto [8,9] eating apple!
  state = stepSnakeState(state, false, () => 0.25);
  assert.equal(state.event, "eat");
  assert.equal(state.score, 10);
  assert.equal(state.snake.length, 4);
  assert.deepEqual(state.dir, [-1, 0]);

  // Step 2 consumes queued DOWN turn
  state = stepSnakeState(state, false, () => 0.25);
  assert.deepEqual(state.dir, [0, 1]);
  assert.equal(state.gameOver, false);

  // Wall wrap vs classic wall crash
  const edgeState = {
    snake: [[0, 5], [1, 5], [2, 5]],
    dir: [-1, 0],
    dirQueue: [],
    food: [10, 10],
    goldFood: null,
    score: 20,
    applesEaten: 2,
    gameOver: false,
  };
  const wrapped = stepSnakeState(edgeState, true);
  assert.equal(wrapped.gameOver, false);
  assert.deepEqual(wrapped.snake[0], [SNAKE_GRID - 1, 5]);

  const crashed = stepSnakeState(edgeState, false);
  assert.equal(crashed.gameOver, true);
  assert.equal(crashed.event, "crash");
});

/* ═══════════════════════════════════════════════════════════════
   2. FLAPPY TORNADO TESTS
   ═══════════════════════════════════════════════════════════════ */
test("2. Flappy Tornado: dt physics, crystal +3 bonus, pipe +1 score, and fair crash detection", () => {
  const st = createFlappyState();
  st.y = 144;
  st.pipes = [{ x: 100, top: 80, gap: 120, scored: false, crystalY: 144, crystalTaken: false }];

  // Simulate passing crystal & pipe at x=76
  let gotCrystal = false;
  let gotScore = false;
  for (let i = 0; i < 45; i++) {
    st.vy = -10; // keep roughly level
    const res = stepFlappy(st, 1 / 60, 380, 340, () => 0.5);
    if (res.event === "crystal") gotCrystal = true;
    if (res.event === "score") gotScore = true;
  }
  assert.equal(gotCrystal, true);
  assert.equal(gotScore, true);
  assert.equal(st.score, 4); // 3 crystal + 1 pipe
  assert.equal(st.gameOver, false);

  // Floor crash check
  st.y = 335;
  st.vy = 200;
  const crash = stepFlappy(st, 0.05, 380, 340);
  assert.equal(crash.event, "crash");
  assert.equal(st.gameOver, true);
});

/* ═══════════════════════════════════════════════════════════════
   3. MEMORY MATCH TESTS
   ═══════════════════════════════════════════════════════════════ */
test("3. Memory Match: 4x4 (16 cards) & 4x5 (20 cards) decks have exact pairs + streak scoring", () => {
  const deck16 = createMemoryDeck(8);
  assert.equal(deck16.length, 16);
  const counts16 = new Map();
  for (const c of deck16) counts16.set(c.emoji, (counts16.get(c.emoji) || 0) + 1);
  assert.equal(counts16.size, 8);
  for (const v of counts16.values()) assert.equal(v, 2);

  const deck20 = createMemoryDeck(10);
  assert.equal(deck20.length, 20);
  const fastScore = computeMemoryFinalScore(8, 10, 20, 4);
  const slowScore = computeMemoryFinalScore(8, 22, 90, 1);
  assert.ok(fastScore > slowScore);
});

/* ═══════════════════════════════════════════════════════════════
   4. 2048 TORNADO TESTS
   ═══════════════════════════════════════════════════════════════ */
test("4. 2048 Tornado: merge rules prevent double-merge per turn, detect 2048 win & no-moves gameover", () => {
  const rowRes = slide2048RowLeft([2, 2, 4, 0]);
  assert.deepEqual(rowRes.row, [4, 4, 0, 0]);
  assert.equal(rowRes.gained, 4);

  const fourTwos = slide2048RowLeft([2, 2, 2, 2]);
  assert.deepEqual(fourTwos.row, [4, 4, 0, 0]);
  assert.equal(fourTwos.gained, 8);

  const winBoard = [
    [1024, 1024, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const moved = move2048Board(winBoard, "left");
  assert.equal(moved.changed, true);
  assert.equal(moved.gained, 2048);
  assert.equal(hasReachedTile(moved.board, 2048), true);

  const lockedBoard = [
    [2, 4, 8, 16],
    [16, 8, 4, 2],
    [2, 4, 8, 16],
    [16, 8, 4, 2],
  ];
  assert.equal(hasValid2048Moves(lockedBoard), false);
});

/* ═══════════════════════════════════════════════════════════════
   5. ZOMBIE SURVIVAL TESTS
   ═══════════════════════════════════════════════════════════════ */
test("5. Zombie Survival: WASD movement, spread shot, EMP bomb & 3HP survival shield", () => {
  const zState = createZombieState(400, 400);
  const startX = zState.player.x;
  zState.zombies.push({ x: 300, y: 200, radius: 14, boss: false, hp: 1, speed: 50 });

  // Spread shot fires 3 bullets!
  zState.player.spreadTimer = 5;
  const fired = fireZombieWeapon(zState, 300, 200);
  assert.equal(fired, true);
  assert.equal(zState.bullets.length, 3);

  // Move left while stepping dt
  stepZombieState(zState, 0.05, { x: -1, y: 0 }, () => 0.5);
  assert.ok(zState.player.x < startX);

  // Damage reduces HP 3 -> 2 without instant gameover
  zState.zombies.push({ x: zState.player.x, y: zState.player.y, radius: 14, boss: false, hp: 1, speed: 0 });
  const hurtRes = stepZombieState(zState, 0.016, { x: 0, y: 0 }, () => 0.5);
  assert.equal(hurtRes.event, "hurt");
  assert.equal(zState.player.hp, 2);
  assert.equal(zState.gameOver, false);

  // EMP Bomb clears active horde
  zState.zombies.push({ x: 10, y: 10, radius: 14, boss: false, hp: 1, speed: 50 });
  assert.equal(triggerZombieBomb(zState), true);
  assert.equal(zState.zombies.length, 0);
  assert.equal(zState.bombs, 0);
});

/* ═══════════════════════════════════════════════════════════════
   6. NEON DODGE TESTS
   ═══════════════════════════════════════════════════════════════ */
test("6. Neon Dodge: jet movement, near-miss graze +15, shield absorption, and fatal crash", () => {
  const dState = createNeonDodgeState(380, 450);
  const midX = dState.player.x;

  // Move right
  stepNeonDodge(dState, 0.05, 1, () => 0.5);
  assert.ok(dState.player.x > midX);

  // Place obstacle just beside player for graze bonus
  dState.obstacles.push({
    x: dState.player.x + dState.player.width * 0.42 + 6,
    y: dState.player.y - 5,
    width: 30,
    height: 18,
    vx: 0,
    speed: 100,
    color: "#f43f5e",
    grazed: false,
  });
  const grazeRes = stepNeonDodge(dState, 0.016, 0, () => 0.5);
  assert.equal(grazeRes.event, "graze");
  assert.equal(dState.score, 15);

  // Shield saves from direct hit
  dState.player.shield = true;
  dState.obstacles.push({
    x: dState.player.x - 10,
    y: dState.player.y - 5,
    width: 30,
    height: 18,
    vx: 0,
    speed: 0,
    color: "#f43f5e",
    grazed: false,
  });
  const saveRes = stepNeonDodge(dState, 0.016, 0, () => 0.5);
  assert.equal(saveRes.event, "shield_save");
  assert.equal(dState.player.shield, false);
  assert.equal(dState.gameOver, false);

  // Next hit with shield=false and invuln=0 causes gameover
  dState.player.invuln = 0;
  dState.obstacles.push({
    x: dState.player.x - 10,
    y: dState.player.y - 5,
    width: 30,
    height: 18,
    vx: 0,
    speed: 0,
    color: "#f43f5e",
    grazed: false,
  });
  const crashRes = stepNeonDodge(dState, 0.016, 0, () => 0.5);
  assert.equal(crashRes.event, "crash");
  assert.equal(dState.gameOver, true);
});

/* ═══════════════════════════════════════════════════════════════
   7. NEON BLADE TESTS
   ═══════════════════════════════════════════════════════════════ */
test("7. Neon Blade: exact bottom alignment math & collision separation check", () => {
  // Bottom point has wheel-local angle = normalizeAngle(-targetAngle)
  const targetAngle = Math.PI * 0.75;
  const impact = computeBladeImpactAngle(targetAngle);
  assert.ok(Math.abs(normalizeAngle(impact + targetAngle) - 0) < 1e-9);

  // Stuck knife right at impact collides; knife across wheel is safe
  assert.equal(checkBladeCollision(impact, [impact + 0.05], 0.24), true);
  assert.equal(checkBladeCollision(impact, [normalizeAngle(impact + Math.PI)], 0.24), false);
});

/* ═══════════════════════════════════════════════════════════════
   8. TORNADO SURFERS 3D ENGINE TESTS (The Completely Overhauled #8)
   ═══════════════════════════════════════════════════════════════ */
test("8. Tornado Surfers: 200 procedural waves are ALWAYS passable, ramp elevates onto train roofs, slide/slam & hoverboard EMP work", () => {
  // A) Procedural wave passability across 200 seeds
  for (let w = 0; w < 200; w++) {
    const { entities } = generateWave(w, () => ((w * 37) % 100) / 100);
    // At z near 1.0, ensure all 3 lanes are never simultaneously solid non-ramp trains
    const nearTrains = entities.filter((e) => e.kind === "train" && e.z < 1.08);
    const hasRamp = entities.some((e) => e.kind === "ramp");
    if (!hasRamp) {
      const solidLanes = new Set(nearTrains.map((t) => t.lane));
      assert.ok(solidLanes.size <= 2, `Wave ${w} spawned 3 solid blocking trains without ramp!`);
    }
  }

  // B) Responsive Slide -> Jump cancel & Mid-air Slam -> Roll
  const st = createInitialRunnerState();
  st.phase = "playing";
  assert.equal(triggerSlideOrSlam(st), true);
  assert.ok(st.slideTimer > 0.5);
  // Jumping cancels slide immediately
  assert.equal(triggerJump(st), true);
  assert.equal(st.slideTimer, 0);
  assert.ok(st.vy > 10);
  // Swiping down mid-air triggers fast-fall slam
  st.y = 0.7;
  assert.equal(triggerSlideOrSlam(st), true);
  assert.equal(st.slamPending, true);
  assert.ok(st.vy <= -20);

  // C) Ramp smoothly elevates runner onto Train Roof without crashing!
  const rampRun = createInitialRunnerState();
  rampRun.phase = "playing";
  rampRun.entities = [
    { id: "r1", kind: "ramp", lane: 1, z: PLAYER_HIT_Z + 0.02, zEnd: PLAYER_HIT_Z + 0.16, hit: false },
    { id: "t1", kind: "train", lane: 1, z: PLAYER_HIT_Z + 0.16, zEnd: PLAYER_HIT_Z + 0.42, colorVariant: 0, hit: false },
  ];
  for (let step = 0; step < 30; step++) {
    const ev = stepRunnerState(rampRun, 0.03);
    assert.equal(ev.crashed, false, `Runner unexpectedly crashed on ramp/train-roof step ${step}`);
  }
  assert.ok(rampRun.groundY >= TRAIN_ROOF_Y - 0.1 || rampRun.y >= TRAIN_ROOF_Y - 0.1);

  // D) Hoverboard EMP absorbs train collision and keeps run alive!
  const boardRun = createInitialRunnerState();
  boardRun.phase = "playing";
  assert.equal(triggerHoverboard(boardRun), true);
  assert.equal(boardRun.hoverboards, 2);
  boardRun.entities = [
    { id: "t_hit", kind: "train", lane: 1, z: PLAYER_HIT_Z, zEnd: PLAYER_HIT_Z + 0.25, colorVariant: 1, hit: false },
  ];
  const shieldEv = stepRunnerState(boardRun, 0.016);
  assert.equal(shieldEv.shieldSaved, true);
  assert.equal(shieldEv.crashed, false);
  assert.equal(boardRun.phase, "playing");
  assert.ok(boardRun.invulnTimer > 1.0);

  // E) Jetpack lifts above trains
  const jetRun = createInitialRunnerState();
  jetRun.phase = "playing";
  jetRun.jetpackTimer = 5.0;
  for (let i = 0; i < 40; i++) stepRunnerState(jetRun, 0.03);
  assert.ok(jetRun.y > TRAIN_ROOF_Y + 0.5 && jetRun.y <= JETPACK_Y + 0.1);

  // F) Lane move & 3D perspective projection sanity
  assert.equal(triggerLaneMove(boardRun, -1), true);
  assert.equal(boardRun.lane, 0);
  const pNear = projectWorld(0, 0, 0.08, 480, 640);
  const pFar = projectWorld(0, 0, 0.9, 480, 640);
  assert.ok(pNear.yFloor > pFar.yFloor);
  assert.ok(pNear.scale > pFar.scale);
});

test("9. Tornado Surfers 3D upgrades: Super Sneakers, +50 Stunts, Moving Express Trains, and Side-Scrape Chaser", () => {
  // A) Super Sneakers multiply jump velocity by 1.38x
  const norm = createInitialRunnerState();
  norm.phase = "playing";
  triggerJump(norm);

  const boot = createInitialRunnerState();
  boot.phase = "playing";
  boot.sneakersTimer = 8.0;
  triggerJump(boot);
  assert.ok(boot.vy > norm.vy * 1.35, `Expected Super Sneakers jump velocity boost (${boot.vy} vs ${norm.vy})`);

  // B) Express Moving Train advances 1.45x faster than a stationary train
  const exp = createInitialRunnerState();
  exp.phase = "playing";
  exp.entities = [
    { id: "static_t", kind: "train", lane: 0, z: 0.8, zEnd: 1.05, moving: false, hit: false },
    { id: "express_t", kind: "train", lane: 2, z: 0.8, zEnd: 1.05, moving: true, hit: false },
  ];
  stepRunnerState(exp, 0.04);
  const dzStatic = 0.8 - exp.entities.find((e) => e.id === "static_t").z;
  const dzExpress = 0.8 - exp.entities.find((e) => e.id === "express_t").z;
  assert.ok(Math.abs(dzExpress / dzStatic - 1.45) < 1e-6, `Expected 1.45x express delta, got ${dzExpress / dzStatic}`);

  // C) Mid-air +50 STUNT! bonus when jumping cleanly alongside a train
  const stuntRun = createInitialRunnerState();
  stuntRun.phase = "playing";
  stuntRun.lane = 0;
  stuntRun.laneX = -1;
  stuntRun.y = 0.9;
  stuntRun.vy = 2;
  stuntRun.entities = [
    { id: "adj_train", kind: "train", lane: 1, z: PLAYER_HIT_Z, zEnd: PLAYER_HIT_Z + 0.25, moving: false, hit: false },
  ];
  const stuntEv = stepRunnerState(stuntRun, 0.016);
  assert.equal(stuntEv.stunt, true);
  assert.equal(stuntRun.stunts, 1);
  assert.ok(stuntRun.score >= 50);

  // D) Side-scrape stumble alerts Chaser Drone first, then catches on repeat stumble
  const stumbleRun = createInitialRunnerState();
  stumbleRun.phase = "playing";
  stumbleRun.lane = 1;
  stumbleRun.entities = [
    { id: "side_t", kind: "train", lane: 2, z: PLAYER_HIT_Z, zEnd: PLAYER_HIT_Z + 0.24, hit: false },
  ];
  assert.equal(triggerLaneMove(stumbleRun, 1), false);
  assert.equal(stumbleRun.phase, "playing");
  assert.equal(stumbleRun.lane, 1);
  assert.ok(stumbleRun.chaserTimer > 3.5);

  // Second consecutive side-scrape while Chaser Drone is locked causes gameover
  assert.equal(triggerLaneMove(stumbleRun, 1), false);
  assert.equal(stumbleRun.phase, "gameover");
});

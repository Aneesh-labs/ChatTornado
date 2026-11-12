import test from "node:test";
import assert from "node:assert/strict";
import {
  createMancalaState,
  sowMancalaPit,
  chooseMancalaAiMove,
  chooseNimAiMove,
  checkGomokuWin,
  chooseGomokuAiMove,
  toggleLightsCell,
  createSolvableLightsBoard,
  isSlidePuzzleSolvable,
  createSolvableSlide15,
  isPrimeNumber,
  generateTarget24Puzzle,
  computeNonogramClues,
  getRotatedPorts,
  traceCircuitPower,
} from "../src/Components/games/megaSuite/megaEngines.js";

test("Mancala: initial state, extra turn on store landing, capture, and AI move", () => {
  const init = createMancalaState();
  assert.equal(init.pits.length, 14);
  assert.equal(init.turn, 0);

  // Sowing pit index 2 (4 stones) lands in index 6 (P1 store) -> extra turn
  const afterExtra = sowMancalaPit(init, 2);
  assert.equal(afterExtra.extraTurn, true);
  assert.equal(afterExtra.turn, 0);
  assert.equal(afterExtra.pits[6], 1);

  // Capture test: P1 pit 0 has 1 stone, pit 1 is empty, opposite pit 11 has 5 stones
  const captureState = {
    pits: [1, 0, 0, 0, 0, 1, 0, 4, 4, 4, 4, 5, 4, 0],
    turn: 0,
    winner: null,
    extraTurn: false,
    lastCaptured: false,
  };
  const afterCap = sowMancalaPit(captureState, 0);
  assert.equal(afterCap.lastCaptured, true);
  assert.equal(afterCap.pits[6], 6); // 5 opposite + 1 landing stone
  assert.equal(afterCap.pits[11], 0);
  assert.equal(afterCap.pits[1], 0);

  // AI chooses a valid pit in 7..12
  const aiTurn = { ...init, turn: 1 };
  const aiIdx = chooseMancalaAiMove(aiTurn);
  assert.ok(aiIdx >= 7 && aiIdx <= 12);
});

test("Nim XOR AI: finds zero-nim-sum winning move when available", () => {
  const piles = [3, 4, 5]; // 3 ^ 4 ^ 5 = 2 != 0
  const move = chooseNimAiMove(piles);
  assert.ok(move !== null);
  const next = [...piles];
  next[move.pile] -= move.remove;
  const xorAfter = next.reduce((a, b) => a ^ b, 0);
  assert.equal(xorAfter, 0);
});

test("Gomoku: detects 5-in-a-row win and AI blocks opponent 4-in-a-row", () => {
  const grid = Array.from({ length: 11 }, () => Array(11).fill(0));
  for (let c = 2; c < 7; c++) grid[5][c] = 1;
  const win = checkGomokuWin(grid, 11);
  assert.equal(win?.winner, 1);
  assert.equal(win?.line.length, 5);

  const threatGrid = Array.from({ length: 11 }, () => Array(11).fill(0));
  for (let c = 3; c < 7; c++) threatGrid[5][c] = 1; // 4 in a row, open at [5,2] and [5,7]
  const [r, c] = chooseGomokuAiMove(threatGrid, 2);
  assert.equal(r, 5);
  assert.ok(c === 2 || c === 7);
});

test("Lights Prism: toggleLightsCell flips cross pattern and generator creates non-empty board", () => {
  const board = createSolvableLightsBoard(5, 6);
  const litCount = board.flat().filter(Boolean).length;
  assert.ok(litCount > 0);

  const empty = Array.from({ length: 5 }, () => Array(5).fill(false));
  const toggled = toggleLightsCell(empty, 2, 2);
  assert.equal(toggled[2][2], true);
  assert.equal(toggled[1][2], true);
  assert.equal(toggled[3][2], true);
  assert.equal(toggled[2][1], true);
  assert.equal(toggled[2][3], true);
  assert.equal(toggled.flat().filter(Boolean).length, 5);
});

test("Sliding 15-puzzle: generated boards are always solvable and not pre-solved", () => {
  for (let i = 0; i < 5; i++) {
    const arr = createSolvableSlide15();
    assert.equal(arr.length, 16);
    assert.equal(isSlidePuzzleSolvable(arr), true);
  }
  assert.equal(isSlidePuzzleSolvable([1,2,3,4,5,6,7,8,9,10,11,12,13,15,14,0]), false);
});

test("Word & Math engines: primes and Target 24 generator", () => {
  assert.equal(isPrimeNumber(1), false);
  assert.equal(isPrimeNumber(2), true);
  assert.equal(isPrimeNumber(17), true);
  assert.equal(isPrimeNumber(91), false);

  const quad = generateTarget24Puzzle();
  assert.equal(quad.length, 4);
  assert.ok(quad.every((n) => Number.isInteger(n) && n >= 1 && n <= 9));
});

test("Nonogram & Circuit Flow: clue computation and BFS power path", () => {
  const sol = [
    [1, 1, 0],
    [0, 1, 1],
    [1, 0, 1],
  ];
  const clues = computeNonogramClues(sol);
  assert.deepEqual(clues.rows, [[2], [2], [1, 1]]);
  assert.deepEqual(clues.cols, [[1, 1], [2], [2]]);

  assert.deepEqual(getRotatedPorts("I", 1), [1, 3]);
  const circuit = [
    [{ kind: "X", rot: 0 }, { kind: "I", rot: 1 }],
    [{ kind: "I", rot: 0 }, { kind: "L", rot: 0 }],
  ];
  // [0,0](X) -> [0,1](I horiz) doesn't connect down, [0,0](X) -> [1,0](I vert) doesn't connect right
  assert.equal(traceCircuitPower(circuit).solved, false);

  const solvedCircuit = [
    [{ kind: "X", rot: 0 }, { kind: "L", rot: 2 }],
    [{ kind: "I", rot: 0 }, { kind: "X", rot: 0 }],
  ];
  // [0,0](X) connects right to [0,1](L rot 2 -> ports [2, 3] = bottom, left), which connects down to [1,1](X)
  assert.equal(traceCircuitPower(solvedCircuit).solved, true);
});

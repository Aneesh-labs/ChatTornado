import test from "node:test";
import assert from "node:assert/strict";
import {
  createCheckersState,
  getCheckersLegalMoves,
  applyCheckersMove,
  chooseCheckersAiMove,
  TETRIS_COLS,
  TETRIS_ROWS,
  createTetrisState,
  getTetrisGhostRow,
  holdTetrisPiece,
  hardDropTetris,
  createConnect4State,
  dropConnect4Disc,
  chooseConnect4AiMove,
  createMinesState,
  revealMineCell,
  toggleMineFlag,
  chordMineCell,
  createReversiState,
  getReversiValidMoves,
  applyReversiMove,
  chooseReversiAiMove,
  createRandomNavalGrid,
  chooseNavalAiTarget,
  generateSudokuPuzzle,
  findSudokuConflicts,
} from "../src/Components/games/hiFiEngines.js";

test("Crown Checkers v2.0: enforces mandatory captures & chains multi-jumps", () => {
  const s = createCheckersState();
  // Custom double-jump setup for White on (5,0) jumping b at (4,1) and (2,3)
  s.board = Array.from({ length: 8 }, () => Array(8).fill(null));
  s.board[5][0] = { color: "w", king: false };
  s.board[4][1] = { color: "b", king: false };
  s.board[2][3] = { color: "b", king: false };
  s.board[5][4] = { color: "w", king: false }; // another non-capturing piece

  const moves = getCheckersLegalMoves(s, "w");
  assert.equal(moves.length, 1);
  assert.deepEqual(moves[0].to, [3, 2]);
  assert.deepEqual(moves[0].capture, [4, 1]);

  const mid = applyCheckersMove(s, moves[0]);
  assert.equal(mid.turn, "w"); // must continue multi-jump!
  assert.deepEqual(mid.mustContinueFrom, [3, 2]);

  const jump2 = getCheckersLegalMoves(mid, "w");
  assert.equal(jump2.length, 1);
  assert.deepEqual(jump2[0].to, [1, 4]);
  const end = applyCheckersMove(mid, jump2[0]);
  assert.equal(end.turn, "b");
  assert.equal(end.board[4][1], null);
  assert.equal(end.board[2][3], null);

  const aiStart = chooseCheckersAiMove(createCheckersState(), "w", 2);
  assert.ok(aiStart);
});

test("Polyomino Tetris v2.0: Ghost row, Hold swap, and Hard Drop clears full bottom row", () => {
  const s = createTetrisState();
  const initialType = s.current.type;
  assert.equal(holdTetrisPiece(s), true);
  assert.equal(s.hold, initialType);
  assert.equal(holdTetrisPiece(s), false); // once per turn until lock

  const ghost = getTetrisGhostRow(s);
  assert.ok(ghost >= 0 && ghost < TETRIS_ROWS);

  // Fill bottom row except columns 3..6 and place 4-wide horizontal I-piece to clear it
  s.current = {
    type: "I",
    color: "#22d3ee",
    matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    row: 0,
    col: 3,
  };
  for (let c = 0; c < TETRIS_COLS; c++) {
    if (c < 3 || c > 6) s.grid[TETRIS_ROWS - 1][c] = "#ffffff";
  }
  const res = hardDropTetris(s);
  assert.equal(res.cleared, 1);
  assert.equal(s.lines, 1);
  assert.ok(s.score > 100);
});

test("Quantum Connect 4: detects 4-in-a-row and AI takes immediate winning drop", () => {
  let s = createConnect4State();
  s.grid[5][0] = 2; s.grid[5][1] = 2; s.grid[5][2] = 2;
  s.turn = 2;
  const col = chooseConnect4AiMove(s, 2, 4);
  assert.equal(col, 3);
  const won = dropConnect4Disc(s, col);
  assert.equal(won.winner, 2);
  assert.equal(won.winLine.length, 4);
});

test("Tactical Minesweeper: guarantees safe first click, flood-fill reveal, and Chording", () => {
  let s = createMinesState(9, 9, 10);
  s = revealMineCell(s, 4, 4);
  assert.equal(s.initialized, true);
  assert.equal(s.status, "playing");
  assert.equal(s.board[4][4].mine, false);
  assert.ok(s.revealedCount >= 1);

  const flagged = toggleMineFlag(s, 0, 0);
  assert.equal(flagged.board[0][0].flagged, true);
  assert.equal(typeof chordMineCell(flagged, 4, 4).revealedCount, "number");
});

test("Eclipse Reversi, Naval Sonar & Chrono Sudoku engines work accurately", () => {
  // Reversi
  let rev = createReversiState();
  const revMoves = getReversiValidMoves(rev.board, 1);
  assert.equal(revMoves.length, 4);
  rev = applyReversiMove(rev, revMoves[0]);
  assert.equal(rev.turn, 2);
  const aiRev = chooseReversiAiMove(rev, 2);
  assert.ok(aiRev && aiRev.flips.length >= 1);

  // Naval Sonar
  const naval = createRandomNavalGrid(8);
  const totalShipCells = naval.grid.flat().filter(Boolean).length;
  assert.equal(totalShipCells, 17); // 5+4+3+3+2
  naval.shots[3][3] = 2; // simulate a hit so AI hunts adjacent cell!
  const [tr, tc] = chooseNavalAiTarget(naval.shots);
  assert.equal(Math.abs(tr - 3) + Math.abs(tc - 3), 1);

  // Sudoku
  const sud = generateSudokuPuzzle("tactical");
  assert.equal(findSudokuConflicts(sud.solution).size, 0);
  assert.equal(findSudokuConflicts(sud.grid).size, 0);
});

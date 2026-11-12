import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialChessState,
  getLegalMoves,
  getLegalMovesFromSquare,
  applyChessMove,
  undoChessMove,
  chooseBestChessMove,
  squareName,
} from "../src/Components/games/crownChessEngine.js";

function findMove(state, fromSq, toSq, promotion = null) {
  return getLegalMoves(state).find(
    (m) =>
      squareName(m.from[0], m.from[1]) === fromSq &&
      squareName(m.to[0], m.to[1]) === toSq &&
      (!promotion || m.promotion === promotion)
  );
}

test("Crownfall Chess: opening position yields 20 legal White moves", () => {
  const s = createInitialChessState();
  const legal = getLegalMoves(s, "w");
  assert.equal(legal.length, 20);
  const e2Moves = getLegalMovesFromSquare(s, 6, 4);
  assert.equal(e2Moves.length, 2); // e3 and e4
});

test("Crownfall Chess: Fool's Mate detects checkmate and restores cleanly via undo", () => {
  let s = createInitialChessState();
  s = applyChessMove(s, findMove(s, "f2", "f3"));
  s = applyChessMove(s, findMove(s, "e7", "e5"));
  s = applyChessMove(s, findMove(s, "g2", "g4"));
  const mateMv = findMove(s, "d8", "h4");
  assert.ok(mateMv, "Queen h4 move should be legal");
  s = applyChessMove(s, mateMv);

  assert.equal(s.status, "checkmate");
  assert.equal(s.winner, "b");
  assert.equal(s.lastMove.san, "Qh4#");
  assert.equal(getLegalMoves(s).length, 0);

  const undone = undoChessMove(s, 1);
  assert.equal(undone.turn, "b");
  assert.equal(undone.status, "playing");
  assert.equal(undone.winner, null);
});

test("Crownfall Chess: Kingside castling moves King & Rook and rejects attacked transit squares", () => {
  const s = createInitialChessState();
  // Clear f1 & g1 for White
  s.board[7][5] = null;
  s.board[7][6] = null;
  const castleMv = findMove(s, "e1", "g1");
  assert.ok(castleMv, "White O-O should be legal when f1/g1 clear and safe");
  assert.equal(castleMv.isCastle, "K");
  const afterCastle = applyChessMove(s, castleMv);
  assert.equal(afterCastle.board[7][6], "wK");
  assert.equal(afterCastle.board[7][5], "wR");
  assert.equal(afterCastle.lastMove.san, "O-O");

  // Put Black Rook on f5 attacking transit square f1 -> O-O must be illegal!
  const blocked = createInitialChessState();
  blocked.board[7][5] = null;
  blocked.board[7][6] = null;
  blocked.board[6][5] = null;
  blocked.board[3][5] = "bR";
  assert.equal(findMove(blocked, "e1", "g1"), undefined);
});

test("Crownfall Chess: En Passant capture & Pawn Promotion to Knight", () => {
  const s = createInitialChessState();
  // White pawn on e5, Black double-pushes d7->d5 -> White can capture exd6 e.p.
  s.board[6][4] = null;
  s.board[3][4] = "wP";
  s.turn = "b";
  let next = applyChessMove(s, findMove(s, "d7", "d5"));
  assert.deepEqual(next.enPassant, [2, 3]);

  const epMove = findMove(next, "e5", "d6");
  assert.ok(epMove && epMove.isEnPassant);
  next = applyChessMove(next, epMove);
  assert.equal(next.board[3][3], null); // captured Black d5 pawn removed
  assert.equal(next.board[2][3], "wP");

  // Promotion test
  const promoState = createInitialChessState();
  promoState.board = Array(8).fill(null).map(() => Array(8).fill(null));
  promoState.board[7][4] = "wK";
  promoState.board[0][7] = "bK";
  promoState.board[1][0] = "wP";
  promoState.turn = "w";
  promoState.castling = { wK: false, wQ: false, bK: false, bQ: false };
  const knightPromo = findMove(promoState, "a7", "a8", "N");
  assert.ok(knightPromo, "Should offer Knight underpromotion");
  const promoted = applyChessMove(promoState, knightPromo);
  assert.equal(promoted.board[0][0], "wN");
});

test("Crownfall Chess: Alpha-Beta AI spots immediate mate-in-1", () => {
  const s = createInitialChessState();
  s.board = Array(8).fill(null).map(() => Array(8).fill(null));
  s.board[7][4] = "wK";
  s.board[0][7] = "bK";
  s.board[6][0] = "bQ";
  s.board[5][1] = "bR";
  s.turn = "b";
  s.castling = { wK: false, wQ: false, bK: false, bQ: false };

  const aiMove = chooseBestChessMove(s, "club");
  assert.ok(aiMove);
  const res = applyChessMove(s, aiMove);
  assert.equal(res.status, "checkmate");
  assert.equal(res.winner, "b");
});

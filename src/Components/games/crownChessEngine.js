/**
 * Pure JavaScript Rules & Alpha-Beta Search Engine for Crownfall Chess.
 * Implements complete FIDE movement, pins, check/checkmate/stalemate,
 * castling (including transit-square safety), en passant, promotion,
 * algebraic SAN notation, and a 3-tier Negamax + Alpha-Beta AI.
 */

export const PIECE_VALUES = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000,
};

// Positional bonuses from White's perspective (row 0 = rank 8, row 7 = rank 1)
const PST_PAWN = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 27, 27, 10,  5,  5],
  [0,  0,  0, 24, 24,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-22,-22, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0],
];

const PST_KNIGHT = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 12, 16, 16, 12,  0,-30],
  [-30,  5, 16, 22, 22, 16,  5,-30],
  [-30,  0, 16, 22, 22, 16,  0,-30],
  [-30,  5, 12, 16, 16, 12,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
];

const PST_BISHOP = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  8, 12, 12,  8,  0,-10],
  [-10,  6,  6, 12, 12,  6,  6,-10],
  [-10,  0, 12, 12, 12, 12,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  6,  0,  0,  0,  0,  6,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
];

const PST_ROOK = [
  [ 0,  0,  0,  0,  0,  0,  0,  0],
  [ 8, 14, 14, 14, 14, 14, 14,  8],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [ 0,  0,  0,  6,  6,  0,  0,  0],
];

const PST_QUEEN = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,   0,  5,  6,  6,  5,  0, -5],
  [ 0,   0,  5,  6,  6,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20],
];

const PST_KING = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [ 20, 20,  0,  0,  0,  0, 20, 20],
  [ 20, 30, 10,  0,  0, 10, 30, 20],
];

const PST_MAP = {
  P: PST_PAWN,
  N: PST_KNIGHT,
  B: PST_BISHOP,
  R: PST_ROOK,
  Q: PST_QUEEN,
  K: PST_KING,
};

const FILES = "abcdefgh";

export function squareName(r, c) {
  return `${FILES[c]}${8 - r}`;
}

export function createInitialChessState() {
  const board = [
    ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
    ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP"],
    ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"],
  ];

  return {
    board,
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null, // [r, c] target square behind double-pushed pawn
    halfmove: 0,
    fullmove: 1,
    captured: { w: [], b: [] },
    lastMove: null,
    history: [], // snapshots + SAN notation
    status: "playing", // "playing" | "check" | "checkmate" | "stalemate" | "draw"
    winner: null, // "w" | "b" | "draw" | null
  };
}

export function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export function findKing(board, color) {
  const target = `${color}K`;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === target) return [r, c];
    }
  }
  return null;
}

export function isSquareAttacked(board, row, col, byColor) {
  const pawnDir = byColor === "w" ? 1 : -1;
  // Pawns attack diagonally toward (row, col) from (row + pawnDir, col +/- 1)
  for (const dc of [-1, 1]) {
    const pr = row + pawnDir;
    const pc = col + dc;
    if (inBounds(pr, pc) && board[pr][pc] === `${byColor}P`) return true;
  }

  // Knights
  const knightSteps = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [dr, dc] of knightSteps) {
    const nr = row + dr;
    const nc = col + dc;
    if (inBounds(nr, nc) && board[nr][nc] === `${byColor}N`) return true;
  }

  // Orthogonal rays (Rook / Queen)
  const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of orthoDirs) {
    let nr = row + dr;
    let nc = col + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p[0] === byColor && (p[1] === "R" || p[1] === "Q")) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  // Diagonal rays (Bishop / Queen)
  const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of diagDirs) {
    let nr = row + dr;
    let nc = col + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p[0] === byColor && (p[1] === "B" || p[1] === "Q")) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  // Enemy King
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (inBounds(nr, nc) && board[nr][nc] === `${byColor}K`) return true;
    }
  }

  return false;
}

export function isKingInCheck(board, color) {
  const k = findKing(board, color);
  if (!k) return false;
  const enemy = color === "w" ? "b" : "w";
  return isSquareAttacked(board, k[0], k[1], enemy);
}

function generatePseudoMoves(state, color) {
  const { board, castling, enPassant } = state;
  const moves = [];
  const enemy = color === "w" ? "b" : "w";

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece[0] !== color) continue;
      const kind = piece[1];

      if (kind === "P") {
        const dir = color === "w" ? -1 : 1;
        const startRow = color === "w" ? 6 : 1;
        const promoRow = color === "w" ? 0 : 7;

        const r1 = r + dir;
        if (inBounds(r1, c) && !board[r1][c]) {
          if (r1 === promoRow) {
            for (const promo of ["Q", "R", "B", "N"]) {
              moves.push({ from: [r, c], to: [r1, c], piece, promotion: promo });
            }
          } else {
            moves.push({ from: [r, c], to: [r1, c], piece });
            const r2 = r + dir * 2;
            if (r === startRow && !board[r2][c]) {
              moves.push({ from: [r, c], to: [r2, c], piece, isDoublePush: true });
            }
          }
        }

        for (const dc of [-1, 1]) {
          const nc = c + dc;
          if (!inBounds(r1, nc)) continue;
          const target = board[r1][nc];
          if (target && target[0] === enemy) {
            if (r1 === promoRow) {
              for (const promo of ["Q", "R", "B", "N"]) {
                moves.push({ from: [r, c], to: [r1, nc], piece, captured: target, promotion: promo });
              }
            } else {
              moves.push({ from: [r, c], to: [r1, nc], piece, captured: target });
            }
          } else if (enPassant && enPassant[0] === r1 && enPassant[1] === nc) {
            moves.push({
              from: [r, c],
              to: [r1, nc],
              piece,
              captured: `${enemy}P`,
              isEnPassant: true,
            });
          }
        }
      } else if (kind === "N") {
        const steps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        for (const [dr, dc] of steps) {
          const nr = r + dr;
          const nc = c + dc;
          if (!inBounds(nr, nc)) continue;
          const target = board[nr][nc];
          if (!target) moves.push({ from: [r, c], to: [nr, nc], piece });
          else if (target[0] === enemy) moves.push({ from: [r, c], to: [nr, nc], piece, captured: target });
        }
      } else if (kind === "B" || kind === "R" || kind === "Q") {
        const dirs = [];
        if (kind === "B" || kind === "Q") dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        if (kind === "R" || kind === "Q") dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
        for (const [dr, dc] of dirs) {
          let nr = r + dr;
          let nc = c + dc;
          while (inBounds(nr, nc)) {
            const target = board[nr][nc];
            if (!target) {
              moves.push({ from: [r, c], to: [nr, nc], piece });
            } else {
              if (target[0] === enemy) {
                moves.push({ from: [r, c], to: [nr, nc], piece, captured: target });
              }
              break;
            }
            nr += dr;
            nc += dc;
          }
        }
      } else if (kind === "K") {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (!inBounds(nr, nc)) continue;
            const target = board[nr][nc];
            if (!target) moves.push({ from: [r, c], to: [nr, nc], piece });
            else if (target[0] === enemy) moves.push({ from: [r, c], to: [nr, nc], piece, captured: target });
          }
        }

        // Castling (King on home rank col 4)
        const homeRow = color === "w" ? 7 : 0;
        if (r === homeRow && c === 4 && !isSquareAttacked(board, homeRow, 4, enemy)) {
          if (castling[`${color}K`] && !board[homeRow][5] && !board[homeRow][6] && board[homeRow][7] === `${color}R`) {
            if (!isSquareAttacked(board, homeRow, 5, enemy) && !isSquareAttacked(board, homeRow, 6, enemy)) {
              moves.push({ from: [homeRow, 4], to: [homeRow, 6], piece, isCastle: "K" });
            }
          }
          if (castling[`${color}Q`] && !board[homeRow][3] && !board[homeRow][2] && !board[homeRow][1] && board[homeRow][0] === `${color}R`) {
            if (!isSquareAttacked(board, homeRow, 3, enemy) && !isSquareAttacked(board, homeRow, 2, enemy)) {
              moves.push({ from: [homeRow, 4], to: [homeRow, 2], piece, isCastle: "Q" });
            }
          }
        }
      }
    }
  }
  return moves;
}

function applyRawMoveToBoard(board, move) {
  const next = cloneBoard(board);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = next[fr][fc];
  next[fr][fc] = null;

  if (move.isEnPassant) {
    next[fr][tc] = null;
  }

  if (move.isCastle === "K") {
    next[fr][5] = next[fr][7];
    next[fr][7] = null;
  } else if (move.isCastle === "Q") {
    next[fr][3] = next[fr][0];
    next[fr][0] = null;
  }

  next[tr][tc] = move.promotion ? `${piece[0]}${move.promotion}` : piece;
  return next;
}

export function getLegalMoves(state, color = state.turn) {
  const pseudo = generatePseudoMoves(state, color);
  return pseudo.filter((mv) => {
    const b2 = applyRawMoveToBoard(state.board, mv);
    return !isKingInCheck(b2, color);
  });
}

export function getLegalMovesFromSquare(state, row, col) {
  const piece = state.board[row]?.[col];
  if (!piece || piece[0] !== state.turn) return [];
  return getLegalMoves(state, state.turn).filter(
    (m) => m.from[0] === row && m.from[1] === col
  );
}

function isInsufficientMaterial(board) {
  const pieces = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p[1] !== "K") pieces.push({ piece: p, r, c });
    }
  }
  if (pieces.length === 0) return true;
  if (pieces.length === 1 && (pieces[0].piece[1] === "N" || pieces[0].piece[1] === "B")) return true;
  if (
    pieces.length === 2 &&
    pieces[0].piece[1] === "B" &&
    pieces[1].piece[1] === "B" &&
    (pieces[0].r + pieces[0].c) % 2 === (pieces[1].r + pieces[1].c) % 2
  ) {
    return true;
  }
  return false;
}

function buildSanLabel(prevState, move, nextBoard, nextLegalCount, inCheck) {
  if (move.isCastle === "K") return inCheck ? (nextLegalCount === 0 ? "O-O#" : "O-O+") : "O-O";
  if (move.isCastle === "Q") return inCheck ? (nextLegalCount === 0 ? "O-O-O#" : "O-O-O+") : "O-O-O";

  const kind = move.piece[1];
  const dest = squareName(move.to[0], move.to[1]);
  let prefix = "";
  if (kind === "P") {
    if (move.captured || move.isEnPassant) prefix = `${FILES[move.from[1]]}x`;
  } else {
    prefix = kind;
    // Basic disambiguation among same-color same-kind peers
    const peers = getLegalMoves(prevState, move.piece[0]).filter(
      (m) =>
        m.piece === move.piece &&
        m.to[0] === move.to[0] &&
        m.to[1] === move.to[1] &&
        (m.from[0] !== move.from[0] || m.from[1] !== move.from[1])
    );
    if (peers.length > 0) {
      const sameFile = peers.some((p) => p.from[1] === move.from[1]);
      const sameRank = peers.some((p) => p.from[0] === move.from[0]);
      if (!sameFile) prefix += FILES[move.from[1]];
      else if (!sameRank) prefix += String(8 - move.from[0]);
      else prefix += squareName(move.from[0], move.from[1]);
    }
    if (move.captured) prefix += "x";
  }

  const promo = move.promotion ? `=${move.promotion}` : "";
  const suffix = inCheck ? (nextLegalCount === 0 ? "#" : "+") : "";
  return `${prefix}${dest}${promo}${suffix}`;
}

export function applyChessMove(state, move) {
  const nextBoard = applyRawMoveToBoard(state.board, move);
  const mover = state.turn;
  const enemy = mover === "w" ? "b" : "w";

  const nextCastling = { ...state.castling };
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;

  if (move.piece === "wK") {
    nextCastling.wK = false;
    nextCastling.wQ = false;
  } else if (move.piece === "bK") {
    nextCastling.bK = false;
    nextCastling.bQ = false;
  }
  if ((fr === 7 && fc === 0) || (tr === 7 && tc === 0)) nextCastling.wQ = false;
  if ((fr === 7 && fc === 7) || (tr === 7 && tc === 7)) nextCastling.wK = false;
  if ((fr === 0 && fc === 0) || (tr === 0 && tc === 0)) nextCastling.bQ = false;
  if ((fr === 0 && fc === 7) || (tr === 0 && tc === 7)) nextCastling.bK = false;

  const nextEnPassant = move.isDoublePush ? [(fr + tr) / 2, fc] : null;
  const nextCaptured = {
    w: [...state.captured.w],
    b: [...state.captured.b],
  };
  if (move.captured) {
    nextCaptured[mover].push(move.captured);
  }

  const nextHalfmove = move.piece[1] === "P" || move.captured ? 0 : state.halfmove + 1;
  const nextFullmove = mover === "b" ? state.fullmove + 1 : state.fullmove;

  const tempState = {
    board: nextBoard,
    turn: enemy,
    castling: nextCastling,
    enPassant: nextEnPassant,
    halfmove: nextHalfmove,
    fullmove: nextFullmove,
    captured: nextCaptured,
  };

  const enemyLegal = getLegalMoves(tempState, enemy);
  const inCheck = isKingInCheck(nextBoard, enemy);

  let status = "playing";
  let winner = null;
  if (enemyLegal.length === 0) {
    if (inCheck) {
      status = "checkmate";
      winner = mover;
    } else {
      status = "stalemate";
      winner = "draw";
    }
  } else if (nextHalfmove >= 100 || isInsufficientMaterial(nextBoard)) {
    status = "draw";
    winner = "draw";
  } else if (inCheck) {
    status = "check";
  }

  const san = buildSanLabel(state, move, nextBoard, enemyLegal.length, inCheck);

  const historyEntry = {
    san,
    from: move.from,
    to: move.to,
    piece: move.piece,
    captured: move.captured || null,
    promotion: move.promotion || null,
    snapshot: {
      board: cloneBoard(state.board),
      turn: state.turn,
      castling: { ...state.castling },
      enPassant: state.enPassant ? [...state.enPassant] : null,
      halfmove: state.halfmove,
      fullmove: state.fullmove,
      captured: { w: [...state.captured.w], b: [...state.captured.b] },
      lastMove: state.lastMove,
      status: state.status,
      winner: state.winner,
    },
  };

  return {
    ...tempState,
    lastMove: { from: move.from, to: move.to, san },
    history: [...state.history, historyEntry],
    status,
    winner,
  };
}

export function undoChessMove(state, steps = 1) {
  let curr = state;
  for (let i = 0; i < steps; i++) {
    if (!curr.history.length) break;
    const prevHist = curr.history.slice(0, -1);
    const snap = curr.history[curr.history.length - 1].snapshot;
    curr = {
      ...snap,
      history: prevHist,
    };
  }
  return curr;
}

export function evaluateMaterialBalance(board) {
  let wScore = 0;
  let bScore = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p[1] === "K") continue;
      const val = PIECE_VALUES[p[1]] / 100;
      if (p[0] === "w") wScore += val;
      else bScore += val;
    }
  }
  return { white: Math.round(wScore), black: Math.round(bScore), diff: Math.round(wScore - bScore) };
}

export function evaluateBoardScore(board, colorToMove) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const side = p[0];
      const kind = p[1];
      const pst = PST_MAP[kind];
      const pstRow = side === "w" ? r : 7 - r;
      const total = PIECE_VALUES[kind] + (pst ? pst[pstRow][c] : 0);
      score += side === "w" ? total : -total;
    }
  }
  return colorToMove === "w" ? score : -score;
}

function orderMoves(moves) {
  return moves.sort((a, b) => {
    let sa = 0;
    let sb = 0;
    if (a.captured) sa += 10 * PIECE_VALUES[a.captured[1]] - PIECE_VALUES[a.piece[1]];
    if (b.captured) sb += 10 * PIECE_VALUES[b.captured[1]] - PIECE_VALUES[b.piece[1]];
    if (a.promotion) sa += PIECE_VALUES[a.promotion];
    if (b.promotion) sb += PIECE_VALUES[b.promotion];
    if (a.isCastle) sa += 65;
    if (b.isCastle) sb += 65;
    return sb - sa;
  });
}

function negamax(state, depth, alpha, beta) {
  const legal = getLegalMoves(state, state.turn);
  if (legal.length === 0) {
    if (isKingInCheck(state.board, state.turn)) {
      return -100000 - depth * 50; // Prefer fastest mate
    }
    return 0; // Stalemate
  }
  if (depth === 0) {
    return evaluateBoardScore(state.board, state.turn);
  }

  const ordered = orderMoves(legal);
  let best = -Infinity;

  for (const mv of ordered) {
    const nextBoard = applyRawMoveToBoard(state.board, mv);
    const enemy = state.turn === "w" ? "b" : "w";
    const [fr, fc] = mv.from;
    const nextCastling = { ...state.castling };
    if (mv.piece === "wK") { nextCastling.wK = false; nextCastling.wQ = false; }
    if (mv.piece === "bK") { nextCastling.bK = false; nextCastling.bQ = false; }
    if (fr === 7 && fc === 0) nextCastling.wQ = false;
    if (fr === 7 && fc === 7) nextCastling.wK = false;
    if (fr === 0 && fc === 0) nextCastling.bQ = false;
    if (fr === 0 && fc === 7) nextCastling.bK = false;

    const childState = {
      board: nextBoard,
      turn: enemy,
      castling: nextCastling,
      enPassant: mv.isDoublePush ? [(fr + mv.to[0]) / 2, fc] : null,
    };

    const score = -negamax(childState, depth - 1, -beta, -alpha);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export function chooseBestChessMove(state, difficulty = "club") {
  const legal = getLegalMoves(state, state.turn);
  if (legal.length === 0) return null;

  const depth = difficulty === "novice" ? 1 : difficulty === "grandmaster" ? 3 : 2;
  const ordered = orderMoves(legal);

  let bestScore = -Infinity;
  let bestMoves = [];

  for (const mv of ordered) {
    const nextState = applyChessMove(state, mv);
    let sc;
    if (nextState.status === "checkmate") {
      return mv; // Instant mate-in-1!
    }
    if (nextState.status === "stalemate" || nextState.status === "draw") {
      sc = 0;
    } else {
      sc = -negamax(nextState, depth - 1, -Infinity, Infinity);
    }

    if (sc > bestScore) {
      bestScore = sc;
      bestMoves = [mv];
    } else if (sc === bestScore) {
      bestMoves.push(mv);
    }
  }

  // Slight natural tie-breaker in novice mode; deterministic strongest in GM
  if (difficulty === "novice" && ordered.length > 2 && Math.random() < 0.25) {
    return ordered[Math.floor(Math.random() * Math.min(3, ordered.length))];
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)] || ordered[0];
}

/**
 * Pure simulation, board rules, and AI solvers for the 12 Hi-Fi Arcade games.
 * Keeps every game deterministic and fast-tested under `node --test`.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   1. CROWN CHECKERS v2.0 (Official Forced-Capture & Multi-Jump Engine)
   ═══════════════════════════════════════════════════════════════════════════ */
export function createCheckersState() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) board[r][c] = { color: "b", king: false };
        else if (r > 4) board[r][c] = { color: "w", king: false };
      }
    }
  }
  return {
    board,
    turn: "w",
    winner: null,
    mustContinueFrom: null, // [r, c] during mid-turn multi-jump chain
    lastMove: null,
    movesCount: 0,
  };
}

function getPieceJumpSequences(board, r, c, piece) {
  const dirs = piece.king
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.color === "w"
    ? [[-1, -1], [-1, 1]]
    : [[1, -1], [1, 1]];

  const res = [];
  for (const [dr, dc] of dirs) {
    const mr = r + dr;
    const mc = c + dc;
    const jr = r + dr * 2;
    const jc = c + dc * 2;
    if (jr < 0 || jr >= 8 || jc < 0 || jc >= 8) continue;
    const mid = board[mr][mc];
    if (mid && mid.color !== piece.color && !board[jr][jc]) {
      res.push({ from: [r, c], to: [jr, jc], capture: [mr, mc] });
    }
  }
  return res;
}

export function getCheckersLegalMoves(state, color = state.turn) {
  const { board, mustContinueFrom } = state;
  const jumps = [];
  const steps = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (mustContinueFrom && (mustContinueFrom[0] !== r || mustContinueFrom[1] !== c)) continue;
      const p = board[r][c];
      if (!p || p.color !== color) continue;

      const pieceJumps = getPieceJumpSequences(board, r, c, p);
      jumps.push(...pieceJumps);

      if (!mustContinueFrom) {
        const dirs = p.king
          ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
          : color === "w"
          ? [[-1, -1], [-1, 1]]
          : [[1, -1], [1, 1]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc]) {
            steps.push({ from: [r, c], to: [nr, nc], capture: null });
          }
        }
      }
    }
  }
  // Forced capture rule
  return jumps.length > 0 ? jumps : steps;
}

export function applyCheckersMove(state, move) {
  const board = state.board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = { ...board[fr][fc] };
  board[fr][fc] = null;

  let promoted = false;
  if (move.capture) {
    board[move.capture[0]][move.capture[1]] = null;
  }
  if (!piece.king && ((piece.color === "w" && tr === 0) || (piece.color === "b" && tr === 7))) {
    piece.king = true;
    promoted = true;
  }
  board[tr][tc] = piece;

  // Check multi-jump continuation (stops if just crowned per standard American Draughts)
  let nextTurn = state.turn === "w" ? "b" : "w";
  let mustContinueFrom = null;
  if (move.capture && !promoted) {
    const moreJumps = getPieceJumpSequences(board, tr, tc, piece);
    if (moreJumps.length > 0) {
      nextTurn = state.turn;
      mustContinueFrom = [tr, tc];
    }
  }

  const nextState = {
    board,
    turn: nextTurn,
    winner: null,
    mustContinueFrom,
    lastMove: { from: [fr, fc], to: [tr, tc] },
    movesCount: state.movesCount + 1,
  };

  const nextMoves = getCheckersLegalMoves(nextState, nextTurn);
  if (nextMoves.length === 0) {
    nextState.winner = nextTurn === "w" ? "b" : "w";
  }
  return nextState;
}

function evalCheckersBoard(board, aiColor) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const base = p.king ? 185 : 100 + (p.color === "b" ? r * 6 : (7 - r) * 6);
      const centerBonus = c >= 2 && c <= 5 && r >= 2 && r <= 5 ? 14 : 0;
      const val = base + centerBonus;
      score += p.color === aiColor ? val : -val;
    }
  }
  return score;
}

export function chooseCheckersAiMove(state, aiColor = "b", depth = 4) {
  const legal = getCheckersLegalMoves(state, state.turn);
  if (legal.length === 0) return null;

  const search = (st, d, alpha, beta) => {
    if (st.winner) return st.winner === aiColor ? 10000 + d * 20 : -10000 - d * 20;
    if (d <= 0) return evalCheckersBoard(st.board, aiColor);
    const mvs = getCheckersLegalMoves(st, st.turn);
    if (mvs.length === 0) return st.turn === aiColor ? -9500 : 9500;

    const maximizing = st.turn === aiColor;
    let best = maximizing ? -Infinity : Infinity;
    for (const mv of mvs) {
      const child = applyCheckersMove(st, mv);
      const val = search(child, d - 1, alpha, beta);
      if (maximizing) {
        best = Math.max(best, val);
        alpha = Math.max(alpha, best);
      } else {
        best = Math.min(best, val);
        beta = Math.min(beta, best);
      }
      if (alpha >= beta) break;
    }
    return best;
  };

  let bestScore = -Infinity;
  let bestMoves = [];
  for (const mv of legal) {
    const val = search(applyCheckersMove(state, mv), depth - 1, -Infinity, Infinity);
    if (val > bestScore) {
      bestScore = val;
      bestMoves = [mv];
    } else if (val === bestScore) {
      bestMoves.push(mv);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)] || legal[0];
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. POLYOMINO TETRIS v2.0 (7-Bag, Ghost Piece, Hold & Hard Drop)
   ═══════════════════════════════════════════════════════════════════════════ */
export const TETRIS_COLS = 10;
export const TETRIS_ROWS = 20;

export const TETROMINOES = {
  I: { color: "#22d3ee", shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
  O: { color: "#fbbf24", shape: [[1,1],[1,1]] },
  T: { color: "#c084fc", shape: [[0,1,0],[1,1,1],[0,0,0]] },
  S: { color: "#4ade80", shape: [[0,1,1],[1,1,0],[0,0,0]] },
  Z: { color: "#f43f5e", shape: [[1,1,0],[0,1,1],[0,0,0]] },
  J: { color: "#60a5fa", shape: [[1,0,0],[1,1,1],[0,0,0]] },
  L: { color: "#fb923c", shape: [[0,0,1],[1,1,1],[0,0,0]] },
};

function makeSevenBag() {
  const keys = Object.keys(TETROMINOES);
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return keys;
}

export function createTetrisPiece(type) {
  const spec = TETROMINOES[type];
  const matrix = spec.shape.map((r) => [...r]);
  return {
    type,
    color: spec.color,
    matrix,
    row: type === "I" ? -1 : 0,
    col: Math.floor((TETRIS_COLS - matrix[0].length) / 2),
  };
}

export function createTetrisState() {
  const bag = [...makeSevenBag(), ...makeSevenBag()];
  const currentType = bag.shift();
  return {
    grid: Array.from({ length: TETRIS_ROWS }, () => Array(TETRIS_COLS).fill(null)),
    current: createTetrisPiece(currentType),
    bag,
    hold: null,
    holdUsed: false,
    score: 0,
    lines: 0,
    level: 1,
    combo: 0,
    gameOver: false,
    lastClearLabel: "",
  };
}

export function doesTetrisCollide(grid, matrix, row, col) {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue;
      const nr = row + r;
      const nc = col + c;
      if (nc < 0 || nc >= TETRIS_COLS || nr >= TETRIS_ROWS) return true;
      if (nr >= 0 && grid[nr][nc] !== null) return true;
    }
  }
  return false;
}

export function getTetrisGhostRow(state) {
  if (!state.current) return 0;
  let gr = state.current.row;
  while (!doesTetrisCollide(state.grid, state.current.matrix, gr + 1, state.current.col)) {
    gr++;
  }
  return gr;
}

export function rotateTetrisMatrix(matrix, dir = 1) {
  const N = matrix.length;
  const rotated = Array.from({ length: N }, () => Array(N).fill(0));
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (dir > 0) rotated[c][N - 1 - r] = matrix[r][c];
      else rotated[N - 1 - c][r] = matrix[r][c];
    }
  }
  return rotated;
}

export function tryMoveTetris(state, dr, dc) {
  if (state.gameOver) return false;
  const p = state.current;
  if (!doesTetrisCollide(state.grid, p.matrix, p.row + dr, p.col + dc)) {
    p.row += dr;
    p.col += dc;
    return true;
  }
  return false;
}

export function tryRotateTetris(state, dir = 1) {
  if (state.gameOver) return false;
  const p = state.current;
  const nextMat = rotateTetrisMatrix(p.matrix, dir);
  const kicks = [0, -1, 1, -2, 2];
  for (const dc of kicks) {
    if (!doesTetrisCollide(state.grid, nextMat, p.row, p.col + dc)) {
      p.matrix = nextMat;
      p.col += dc;
      return true;
    }
    if (!doesTetrisCollide(state.grid, nextMat, p.row - 1, p.col + dc)) {
      p.matrix = nextMat;
      p.row -= 1;
      p.col += dc;
      return true;
    }
  }
  return false;
}

export function holdTetrisPiece(state) {
  if (state.gameOver || state.holdUsed) return false;
  const curType = state.current.type;
  if (!state.hold) {
    state.hold = curType;
    if (state.bag.length < 7) state.bag.push(...makeSevenBag());
    state.current = createTetrisPiece(state.bag.shift());
  } else {
    const swap = state.hold;
    state.hold = curType;
    state.current = createTetrisPiece(swap);
  }
  state.holdUsed = true;
  return true;
}

export function lockTetrisPiece(state) {
  const p = state.current;
  for (let r = 0; r < p.matrix.length; r++) {
    for (let c = 0; c < p.matrix[r].length; c++) {
      if (!p.matrix[r][c]) continue;
      const nr = p.row + r;
      const nc = p.col + c;
      if (nr < 0) {
        state.gameOver = true;
        return { cleared: 0, gameOver: true };
      }
      state.grid[nr][nc] = p.color;
    }
  }

  let cleared = 0;
  for (let r = TETRIS_ROWS - 1; r >= 0; r--) {
    if (state.grid[r].every((cell) => cell !== null)) {
      state.grid.splice(r, 1);
      state.grid.unshift(Array(TETRIS_COLS).fill(null));
      cleared++;
      r++;
    }
  }

  if (cleared > 0) {
    const basePts = [0, 100, 300, 500, 800][cleared] || 1000;
    state.combo += 1;
    state.lines += cleared;
    state.level = Math.floor(state.lines / 10) + 1;
    state.score += (basePts + state.combo * 25) * state.level;
    state.lastClearLabel = cleared === 4 ? "TETRIS! +800" : `${cleared}× LINE CLEAR`;
  } else {
    state.combo = 0;
    state.lastClearLabel = "";
  }

  if (state.bag.length < 7) state.bag.push(...makeSevenBag());
  state.current = createTetrisPiece(state.bag.shift());
  state.holdUsed = false;
  if (doesTetrisCollide(state.grid, state.current.matrix, state.current.row, state.current.col)) {
    state.gameOver = true;
  }
  return { cleared, gameOver: state.gameOver };
}

export function hardDropTetris(state) {
  if (state.gameOver) return { cleared: 0, gameOver: true };
  let dropRows = 0;
  while (tryMoveTetris(state, 1, 0)) dropRows++;
  state.score += dropRows * 2;
  return { ...lockTetrisPiece(state), dropRows };
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. QUANTUM CONNECT FOUR (Gravity Grid + Alpha-Beta Depth-5 Solver)
   ═══════════════════════════════════════════════════════════════════════════ */
export const C4_ROWS = 6;
export const C4_COLS = 7;

export function createConnect4State() {
  return {
    grid: Array.from({ length: C4_ROWS }, () => Array(C4_COLS).fill(0)), // 0 empty, 1 human, 2 AI/P2
    turn: 1,
    winner: 0, // 0 none, 1, 2, or "draw"
    winLine: null,
    lastDrop: null,
    moves: 0,
  };
}

export function getConnect4ValidCols(grid) {
  const order = [3, 2, 4, 1, 5, 0, 6]; // center-first ordering speeds alpha-beta
  return order.filter((c) => grid[0][c] === 0);
}

export function findConnect4Win(grid) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      const player = grid[r][c];
      if (!player) continue;
      for (const [dr, dc] of dirs) {
        const line = [[r, c]];
        for (let step = 1; step < 4; step++) {
          const nr = r + dr * step;
          const nc = c + dc * step;
          if (nr < 0 || nr >= C4_ROWS || nc < 0 || nc >= C4_COLS || grid[nr][nc] !== player) break;
          line.push([nr, nc]);
        }
        if (line.length === 4) return { winner: player, line };
      }
    }
  }
  return null;
}

export function dropConnect4Disc(state, col) {
  if (state.winner || col < 0 || col >= C4_COLS || state.grid[0][col] !== 0) return null;
  const grid = state.grid.map((row) => [...row]);
  let landRow = -1;
  for (let r = C4_ROWS - 1; r >= 0; r--) {
    if (grid[r][col] === 0) {
      grid[r][col] = state.turn;
      landRow = r;
      break;
    }
  }
  const win = findConnect4Win(grid);
  const full = !win && grid[0].every((v) => v !== 0);
  return {
    grid,
    turn: state.turn === 1 ? 2 : 1,
    winner: win ? win.winner : full ? "draw" : 0,
    winLine: win ? win.line : null,
    lastDrop: [landRow, col],
    moves: state.moves + 1,
  };
}

function evalC4Window(win, aiId) {
  const oppId = aiId === 1 ? 2 : 1;
  let aiCnt = 0;
  let oppCnt = 0;
  let empty = 0;
  for (const v of win) {
    if (v === aiId) aiCnt++;
    else if (v === oppId) oppCnt++;
    else empty++;
  }
  if (aiCnt === 4) return 10000;
  if (oppCnt === 4) return -10000;
  if (aiCnt === 3 && empty === 1) return 18;
  if (aiCnt === 2 && empty === 2) return 4;
  if (oppCnt === 3 && empty === 1) return -22;
  if (oppCnt === 2 && empty === 2) return -3;
  return 0;
}

function evalC4Board(grid, aiId) {
  let score = 0;
  for (let r = 0; r < C4_ROWS; r++) {
    if (grid[r][3] === aiId) score += 6;
    else if (grid[r][3] !== 0) score -= 5;
  }
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      for (const [dr, dc] of dirs) {
        const er = r + dr * 3;
        const ec = c + dc * 3;
        if (er < 0 || er >= C4_ROWS || ec < 0 || ec >= C4_COLS) continue;
        score += evalC4Window([grid[r][c], grid[r + dr][c + dc], grid[r + dr * 2][c + dc * 2], grid[er][ec]], aiId);
      }
    }
  }
  return score;
}

export function chooseConnect4AiMove(state, aiId = 2, depth = 5) {
  const valid = getConnect4ValidCols(state.grid);
  if (valid.length === 0) return -1;

  // Immediate win or block check
  for (const col of valid) {
    const res = dropConnect4Disc(state, col);
    if (res?.winner === aiId) return col;
  }

  const minimax = (st, d, alpha, beta, maximizing) => {
    if (st.winner === aiId) return 50000 + d;
    if (st.winner && st.winner !== "draw") return -50000 - d;
    if (st.winner === "draw") return 0;
    if (d === 0) return evalC4Board(st.grid, aiId);

    const cols = getConnect4ValidCols(st.grid);
    if (maximizing) {
      let best = -Infinity;
      for (const c of cols) {
        best = Math.max(best, minimax(dropConnect4Disc(st, c), d - 1, alpha, beta, false));
        alpha = Math.max(alpha, best);
        if (alpha >= beta) break;
      }
      return best;
    }
    let best = Infinity;
    for (const c of cols) {
      best = Math.min(best, minimax(dropConnect4Disc(st, c), d - 1, alpha, beta, true));
      beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  };

  let bestCol = valid[0];
  let bestVal = -Infinity;
  for (const col of valid) {
    const val = minimax(dropConnect4Disc(state, col), depth - 1, -Infinity, Infinity, false);
    if (val > bestVal) {
      bestVal = val;
      bestCol = col;
    }
  }
  return bestCol;
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. TACTICAL MINESWEEPER (Safe First Click + Chording + Flood Fill)
   ═══════════════════════════════════════════════════════════════════════════ */
export function createMinesState(rows = 9, cols = 9, mineCount = 10) {
  return {
    rows,
    cols,
    mineCount,
    board: Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, adj: 0 }))
    ),
    initialized: false,
    status: "playing", // "playing" | "won" | "lost"
    flagsUsed: 0,
    revealedCount: 0,
  };
}

function populateMines(board, rows, cols, mineCount, safeR, safeC) {
  const candidates = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      candidates.push([r, c]);
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (let i = 0; i < Math.min(mineCount, candidates.length); i++) {
    const [mr, mc] = candidates[i];
    board[mr][mc].mine = true;
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      let cnt = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) cnt++;
        }
      }
      board[r][c].adj = cnt;
    }
  }
}

export function revealMineCell(state, r, c) {
  if (state.status !== "playing") return state;
  const board = state.board.map((row) => row.map((cell) => ({ ...cell })));
  if (board[r][c].flagged || board[r][c].revealed) return state;

  let initialized = state.initialized;
  if (!initialized) {
    populateMines(board, state.rows, state.cols, state.mineCount, r, c);
    initialized = true;
  }

  let revealedCount = state.revealedCount;
  if (board[r][c].mine) {
    for (let i = 0; i < state.rows; i++) {
      for (let j = 0; j < state.cols; j++) {
        if (board[i][j].mine) board[i][j].revealed = true;
      }
    }
    return { ...state, board, initialized, status: "lost" };
  }

  const queue = [[r, c]];
  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    if (board[cr][cc].revealed || board[cr][cc].flagged) continue;
    board[cr][cc].revealed = true;
    revealedCount++;
    if (board[cr][cc].adj === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols && !board[nr][nc].revealed) {
            queue.push([nr, nc]);
          }
        }
      }
    }
  }

  const totalSafe = state.rows * state.cols - state.mineCount;
  const status = revealedCount >= totalSafe ? "won" : "playing";
  return { ...state, board, initialized, revealedCount, status };
}

export function toggleMineFlag(state, r, c) {
  if (state.status !== "playing" || state.board[r][c].revealed) return state;
  const board = state.board.map((row) => row.map((cell) => ({ ...cell })));
  board[r][c].flagged = !board[r][c].flagged;
  const flagsUsed = state.flagsUsed + (board[r][c].flagged ? 1 : -1);
  return { ...state, board, flagsUsed };
}

export function chordMineCell(state, r, c) {
  const cell = state.board[r][c];
  if (!cell.revealed || cell.adj === 0 || state.status !== "playing") return state;
  let flags = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols && state.board[nr][nc].flagged) flags++;
    }
  }
  if (flags !== cell.adj) return state;
  let next = state;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < next.rows && nc >= 0 && nc < next.cols && !next.board[nr][nc].flagged && !next.board[nr][nc].revealed) {
        next = revealMineCell(next, nr, nc);
      }
    }
  }
  return next;
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. ECLIPSE REVERSI / OTHELLO (Corner-Priority AI & Flip Calculator)
   ═══════════════════════════════════════════════════════════════════════════ */
const REVERSI_WEIGHTS = [
  [120, -25, 20,  5,  5, 20, -25, 120],
  [-25, -45, -5, -5, -5, -5, -45, -25],
  [ 20,  -5, 15,  3,  3, 15,  -5,  20],
  [  5,  -5,  3,  3,  3,  3,  -5,   5],
  [  5,  -5,  3,  3,  3,  3,  -5,   5],
  [ 20,  -5, 15,  3,  3, 15,  -5,  20],
  [-25, -45, -5, -5, -5, -5, -45, -25],
  [120, -25, 20,  5,  5, 20, -25, 120],
];

export function createReversiState() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(0)); // 1 Dark (Player 1), 2 Light (AI/P2)
  board[3][3] = 2;
  board[3][4] = 1;
  board[4][3] = 1;
  board[4][4] = 2;
  return { board, turn: 1, winner: 0, passedNotice: "", lastMove: null };
}

export function getReversiFlips(board, r, c, player) {
  if (board[r][c] !== 0) return [];
  const opp = player === 1 ? 2 : 1;
  const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const allFlips = [];
  for (const [dr, dc] of dirs) {
    const line = [];
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === opp) {
      line.push([nr, nc]);
      nr += dr;
      nc += dc;
    }
    if (line.length > 0 && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === player) {
      allFlips.push(...line);
    }
  }
  return allFlips;
}

export function getReversiValidMoves(board, player) {
  const res = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const flips = getReversiFlips(board, r, c, player);
      if (flips.length > 0) res.push({ r, c, flips });
    }
  }
  return res;
}

export function countReversiDiscs(board) {
  let d1 = 0;
  let d2 = 0;
  for (const row of board) {
    for (const v of row) {
      if (v === 1) d1++;
      else if (v === 2) d2++;
    }
  }
  return { dark: d1, light: d2 };
}

export function applyReversiMove(state, move) {
  const board = state.board.map((row) => [...row]);
  const player = state.turn;
  const opp = player === 1 ? 2 : 1;
  board[move.r][move.c] = player;
  for (const [fr, fc] of move.flips) board[fr][fc] = player;

  let nextTurn = opp;
  let passedNotice = "";
  let winner = 0;

  if (getReversiValidMoves(board, opp).length === 0) {
    if (getReversiValidMoves(board, player).length === 0) {
      const { dark, light } = countReversiDiscs(board);
      winner = dark > light ? 1 : light > dark ? 2 : "draw";
    } else {
      nextTurn = player;
      passedNotice = opp === 1 ? "Black has no moves — turn passed!" : "White has no moves — turn passed!";
    }
  }
  return { board, turn: nextTurn, winner, passedNotice, lastMove: [move.r, move.c] };
}

export function chooseReversiAiMove(state, aiId = 2) {
  const moves = getReversiValidMoves(state.board, aiId);
  if (moves.length === 0) return null;
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const next = applyReversiMove(state, m);
    let sc = REVERSI_WEIGHTS[m.r][m.c] + m.flips.length * 3;
    const oppMoves = getReversiValidMoves(next.board, aiId === 2 ? 1 : 2);
    sc -= oppMoves.length * 5;
    if (oppMoves.some((om) => (om.r === 0 || om.r === 7) && (om.c === 0 || om.c === 7))) {
      sc -= 140; // Avoid gifting corners
    }
    if (sc > bestScore) {
      bestScore = sc;
      best = m;
    }
  }
  return best;
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. AEGIS NAVAL SONAR (Battleship Fleet + Hunt-and-Target AI)
   ═══════════════════════════════════════════════════════════════════════════ */
export const NAVAL_SHIPS = [
  { id: "carrier", name: "Carrier", len: 5 },
  { id: "battleship", name: "Dreadnought", len: 4 },
  { id: "cruiser", name: "Cruiser", len: 3 },
  { id: "sub", name: "Submarine", len: 3 },
  { id: "destroyer", name: "Interceptor", len: 2 },
];

export function createRandomNavalGrid(size = 8) {
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const placements = [];
  for (const ship of NAVAL_SHIPS) {
    let placed = false;
    for (let attempt = 0; attempt < 150 && !placed; attempt++) {
      const horiz = Math.random() < 0.5;
      const r0 = Math.floor(Math.random() * (horiz ? size : size - ship.len + 1));
      const c0 = Math.floor(Math.random() * (horiz ? size - ship.len + 1 : size));
      let clear = true;
      const coords = [];
      for (let k = 0; k < ship.len; k++) {
        const nr = r0 + (horiz ? 0 : k);
        const nc = c0 + (horiz ? k : 0);
        if (grid[nr][nc] !== null) { clear = false; break; }
        coords.push([nr, nc]);
      }
      if (clear) {
        coords.forEach(([nr, nc]) => { grid[nr][nc] = ship.id; });
        placements.push({ ...ship, coords, hits: 0 });
        placed = true;
      }
    }
  }
  return { grid, placements, shots: Array.from({ length: size }, () => Array(size).fill(0)) }; // 0 unshot, 1 miss, 2 hit
}

export function chooseNavalAiTarget(shotsGrid) {
  const size = shotsGrid.length;
  const targets = [];
  // Hunt neighbors of unsunk hits
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (shotsGrid[r][c] === 2) {
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && shotsGrid[nr][nc] === 0) {
            targets.push([nr, nc]);
          }
        }
      }
    }
  }
  if (targets.length > 0) return targets[Math.floor(Math.random() * targets.length)];
  const checkerboard = [];
  const fallback = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (shotsGrid[r][c] === 0) {
        if ((r + c) % 2 === 0) checkerboard.push([r, c]);
        fallback.push([r, c]);
      }
    }
  }
  const pool = checkerboard.length > 0 ? checkerboard : fallback;
  return pool[Math.floor(Math.random() * pool.length)] || [0, 0];
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. CHRONO SUDOKU (Solved Generator + Difficulty Mask + Conflict Checker)
   ═══════════════════════════════════════════════════════════════════════════ */
export function generateSudokuPuzzle(difficulty = "tactical") {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const isSafe = (b, r, c, val) => {
    for (let i = 0; i < 9; i++) {
      if (b[r][i] === val || b[i][c] === val) return false;
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (b[br + i][bc + j] === val) return false;
      }
    }
    return true;
  };

  const solve = (b) => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c] === 0) {
          const order = [...nums].sort(() => Math.random() - 0.5);
          for (const val of order) {
            if (isSafe(b, r, c, val)) {
              b[r][c] = val;
              if (solve(b)) return true;
              b[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  solve(board);
  const solution = board.map((r) => [...r]);
  const blanks = difficulty === "casual" ? 34 : difficulty === "master" ? 50 : 42;
  const cells = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) cells.push([r, c]);
  cells.sort(() => Math.random() - 0.5);
  for (let i = 0; i < blanks; i++) {
    const [r, c] = cells[i];
    board[r][c] = 0;
  }
  return {
    initial: board.map((r) => [...r]),
    grid: board.map((r) => [...r]),
    solution,
    notes: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [])),
  };
}

export function findSudokuConflicts(grid) {
  const bad = new Set();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = grid[r][c];
      if (!val) continue;
      for (let i = 0; i < 9; i++) {
        if (i !== c && grid[r][i] === val) { bad.add(`${r}-${c}`); bad.add(`${r}-${i}`); }
        if (i !== r && grid[i][c] === val) { bad.add(`${r}-${c}`); bad.add(`${i}-${c}`); }
      }
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const nr = br + i;
          const nc = bc + j;
          if ((nr !== r || nc !== c) && grid[nr][nc] === val) {
            bad.add(`${r}-${c}`);
            bad.add(`${nr}-${nc}`);
          }
        }
      }
    }
  }
  return bad;
}

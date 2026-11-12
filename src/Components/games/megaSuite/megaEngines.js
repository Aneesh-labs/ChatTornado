/**
 * Pure deterministic rules, generators, and AI solvers for the 30-game v2.0 Mega Suite.
 * Tested in `tests/mega-games.test.mjs`.
 */

/* 1. MANCALA NEXUS v2.0 (Indices 0..5 = P1 pits, 6 = P1 Store, 7..12 = AI pits, 13 = AI Store) */
export function createMancalaState() {
  return {
    pits: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
    turn: 0, // 0 = P1, 1 = AI/P2
    winner: null,
    extraTurn: false,
    lastCaptured: false,
  };
}

export function sowMancalaPit(state, idx) {
  const pits = [...state.pits];
  const isP1 = state.turn === 0;
  if ((isP1 && (idx < 0 || idx > 5)) || (!isP1 && (idx < 7 || idx > 12))) return null;
  let stones = pits[idx];
  if (stones === 0) return null;

  pits[idx] = 0;
  let pos = idx;
  const oppStore = isP1 ? 13 : 6;
  const ownStore = isP1 ? 6 : 13;

  while (stones > 0) {
    pos = (pos + 1) % 14;
    if (pos === oppStore) continue;
    pits[pos] += 1;
    stones -= 1;
  }

  let captured = false;
  const landedOwnSide = isP1 ? (pos >= 0 && pos <= 5) : (pos >= 7 && pos <= 12);
  if (landedOwnSide && pits[pos] === 1) {
    const opposite = 12 - pos;
    if (pits[opposite] > 0) {
      pits[ownStore] += pits[opposite] + 1;
      pits[opposite] = 0;
      pits[pos] = 0;
      captured = true;
    }
  }

  const extraTurn = pos === ownStore;
  const p1Empty = pits.slice(0, 6).every((v) => v === 0);
  const p2Empty = pits.slice(7, 13).every((v) => v === 0);
  let winner = null;

  if (p1Empty || p2Empty) {
    for (let i = 0; i < 6; i++) { pits[6] += pits[i]; pits[i] = 0; }
    for (let i = 7; i < 13; i++) { pits[13] += pits[i]; pits[i] = 0; }
    winner = pits[6] > pits[13] ? 0 : pits[13] > pits[6] ? 1 : "draw";
  }

  return {
    pits,
    turn: winner !== null ? state.turn : extraTurn ? state.turn : (state.turn === 0 ? 1 : 0),
    winner,
    extraTurn: extraTurn && winner === null,
    lastCaptured: captured,
  };
}

export function chooseMancalaAiMove(state, tier = "apex") {
  const valid = [];
  for (let i = 7; i <= 12; i++) if (state.pits[i] > 0) valid.push(i);
  if (valid.length === 0) return -1;

  if (tier === "rookie") {
    return valid[Math.floor(Math.random() * valid.length)];
  }

  let best = valid[0];
  let bestScore = -Infinity;
  for (const idx of valid) {
    const next = sowMancalaPit(state, idx);
    let sc = (next.pits[13] - state.pits[13]) * 12;
    if (next.extraTurn) sc += 18;
    if (next.lastCaptured) sc += 14;
    if (tier === "tactician") sc += (Math.random() - 0.5) * 14;
    if (tier === "apex" && next.winner === null) {
      // 2-ply lookahead: penalize opponent's best reply
      const oppValid = [];
      for (let p = 0; p <= 5; p++) if (next.pits[p] > 0) oppValid.push(p);
      let worstReply = 0;
      for (const oppIdx of oppValid) {
        const reply = sowMancalaPit({ ...next, turn: 0 }, oppIdx);
        if (reply) {
          const oppGain = (reply.pits[6] - next.pits[6]) * 10 + (reply.extraTurn ? 12 : 0);
          if (oppGain > worstReply) worstReply = oppGain;
        }
      }
      sc -= worstReply * 0.65;
    }
    if (sc > bestScore) { bestScore = sc; best = idx; }
  }
  return best;
}

/* 2. NIM PILE DUEL v2.0 (4-Tier AI up to Optimal XOR Nim-Sum) */
export function chooseNimAiMove(piles, tier = "apex") {
  const nonEmpty = piles.map((v, i) => ({ v, i })).filter((x) => x.v > 0);
  if (nonEmpty.length === 0) return null;

  if (tier === "rookie") {
    const pick = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
    return { pile: pick.i, remove: 1 };
  }
  if (tier === "tactician" && Math.random() < 0.4) {
    const pick = nonEmpty[0];
    return { pile: pick.i, remove: Math.max(1, Math.min(pick.v, Math.ceil(pick.v / 2))) };
  }

  const xorSum = piles.reduce((a, b) => a ^ b, 0);
  if (xorSum !== 0) {
    for (let i = 0; i < piles.length; i++) {
      const target = piles[i] ^ xorSum;
      if (target < piles[i]) {
        return { pile: i, remove: piles[i] - target };
      }
    }
  }
  return { pile: nonEmpty[0].i, remove: 1 };
}

/* 3. FIVE-IN-A-ROW GOMOKU v2.0 (11x11 Win Checker + Threat AI) */
export function checkGomokuWin(grid, size = 11) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const p = grid[r][c];
      if (!p) continue;
      for (const [dr, dc] of dirs) {
        const line = [[r, c]];
        for (let k = 1; k < 5; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size || grid[nr][nc] !== p) break;
          line.push([nr, nc]);
        }
        if (line.length === 5) return { winner: p, line };
      }
    }
  }
  return null;
}

export function chooseGomokuAiMove(grid, aiId = 2, tier = "apex") {
  const size = grid.length;
  const oppId = aiId === 1 ? 2 : 1;
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];

  if (tier === "rookie") {
    const empty = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) if (grid[r][c] === 0) empty.push([r, c]);
    }
    return empty.length ? empty[Math.floor(Math.random() * empty.length)] : [5, 5];
  }

  const scoreCell = (r, c, player) => {
    let total = 0;
    for (const [dr, dc] of dirs) {
      let count = 1;
      let openEnds = 0;
      for (const sign of [-1, 1]) {
        let k = 1;
        while (k < 5) {
          const nr = r + dr * k * sign;
          const nc = c + dc * k * sign;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
          if (grid[nr][nc] === player) count++;
          else {
            if (grid[nr][nc] === 0) openEnds++;
            break;
          }
          k++;
        }
      }
      if (count >= 5) total += 100000;
      else if (count === 4) total += openEnds >= 1 ? 8000 : 800;
      else if (count === 3) total += openEnds === 2 ? 900 : 140;
      else if (count === 2) total += openEnds === 2 ? 40 : 12;
    }
    return total;
  };

  let bestR = Math.floor(size / 2);
  let bestC = Math.floor(size / 2);
  let bestScore = -1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== 0) continue;
      const off = scoreCell(r, c, aiId);
      const def = scoreCell(r, c, oppId) * 0.92;
      const center = 5 - Math.abs(r - 5) * 0.4 - Math.abs(c - 5) * 0.4;
      const sc = Math.max(off, def) + center;
      if (sc > bestScore) { bestScore = sc; bestR = r; bestC = c; }
    }
  }
  return [bestR, bestC];
}

/* 4. PRISM CASCADE (LIGHTS OUT) v2.0 (Guaranteed Solvable Generator) */
export function toggleLightsCell(grid, r, c) {
  const n = grid.length;
  const next = grid.map((row) => [...row]);
  for (const [dr, dc] of [[0,0],[-1,0],[1,0],[0,-1],[0,1]]) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < n && nc >= 0 && nc < n) next[nr][nc] = !next[nr][nc];
  }
  return next;
}

export function createSolvableLightsBoard(size = 5, taps = 7) {
  let grid = Array.from({ length: size }, () => Array(size).fill(false));
  for (let i = 0; i < taps; i++) {
    grid = toggleLightsCell(grid, Math.floor(Math.random() * size), Math.floor(Math.random() * size));
  }
  if (grid.every((row) => row.every((v) => !v))) {
    grid = toggleLightsCell(grid, 2, 2);
  }
  return grid;
}

/* 5. CYBER 15-SLIDE v2.0 (Guaranteed Solvable Parity Check) */
export function isSlidePuzzleSolvable(arr) {
  let inversions = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === 0) continue;
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[j] !== 0 && arr[i] > arr[j]) inversions++;
    }
  }
  const blankRowFromBottom = 4 - Math.floor(arr.indexOf(0) / 4);
  return blankRowFromBottom % 2 === 1 ? inversions % 2 === 0 : inversions % 2 === 1;
}

export function createSolvableSlide15() {
  const arr = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0];
  do {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  } while (!isSlidePuzzleSolvable(arr) || arr.every((v, idx) => v === (idx === 15 ? 0 : idx + 1)));
  return arr;
}

/* 6. PRIME BLITZ v2.0 */
export function isPrimeNumber(n) {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let d = 3; d * d <= n; d += 2) {
    if (n % d === 0) return false;
  }
  return true;
}

/* 7. EQUATION FORGE 24 v2.0 (Guaranteed Solvable Quad Generator) */
export function generateTarget24Puzzle() {
  const quads = [
    [3, 3, 8, 8], [1, 5, 5, 5], [2, 3, 4, 6], [4, 4, 7, 7],
    [1, 3, 4, 6], [2, 6, 6, 8], [3, 6, 6, 9], [2, 2, 6, 8],
    [1, 2, 4, 8], [3, 4, 5, 6], [4, 6, 6, 8], [2, 4, 6, 8],
  ];
  return quads[Math.floor(Math.random() * quads.length)].slice().sort(() => Math.random() - 0.5);
}

/* 8. NONOGRAM CLUES v2.0 */
export function computeNonogramClues(solution) {
  const size = solution.length;
  const lineClues = (arr) => {
    const out = [];
    let run = 0;
    for (const v of arr) {
      if (v) run++;
      else if (run > 0) { out.push(run); run = 0; }
    }
    if (run > 0) out.push(run);
    return out.length ? out : [0];
  };
  const rows = solution.map((r) => lineClues(r));
  const cols = Array.from({ length: size }, (_, c) => lineClues(solution.map((r) => r[c])));
  return { rows, cols };
}

/* 9. CIRCUIT LINK v2.0 (BFS Power Propagation from [0,0] to [size-1, size-1]) */
const PIPE_PORTS = {
  I: [0, 2],      // top, bottom
  L: [0, 1],      // top, right
  T: [0, 1, 3],   // top, right, left
  X: [0, 1, 2, 3],
};

export function getRotatedPorts(kind, rot) {
  return (PIPE_PORTS[kind] || []).map((d) => (d + rot) % 4);
}

export function traceCircuitPower(grid) {
  const n = grid.length;
  const powered = Array.from({ length: n }, () => Array(n).fill(false));
  const queue = [[0, 0]];
  powered[0][0] = true;
  const dirs = [[-1, 0, 2], [0, 1, 3], [1, 0, 0], [0, -1, 1]];

  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const ports = getRotatedPorts(grid[r][c].kind, grid[r][c].rot);
    for (const dir of ports) {
      const [dr, dc, opp] = dirs[dir];
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n || powered[nr][nc]) continue;
      if (getRotatedPorts(grid[nr][nc].kind, grid[nr][nc].rot).includes(opp)) {
        powered[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }
  return { powered, solved: powered[n - 1][n - 1] };
}

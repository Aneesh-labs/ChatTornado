/**
 * Grid configuration and real-time A* pathfinding + anti-lockout validation
 * for Vortex Bastion (9x13 phone-first vertical cyber arena).
 */

export const GRID_COLS = 9;
export const GRID_ROWS = 13;
export const TILE_SIZE = 1.0;

export function gridToWorld(col, row) {
  return {
    x: (col - (GRID_COLS - 1) / 2) * TILE_SIZE,
    z: (row - (GRID_ROWS - 1) / 2) * TILE_SIZE,
  };
}

export const SPAWN_CELL = { col: 4, row: 0 };
export const CORE_CELL = { col: 4, row: 12 };

// Strategic cyber-monolith pillars creating natural choke corridors while keeping maze open
export const INITIAL_OBSTACLES = [
  { col: 2, row: 3 },
  { col: 6, row: 3 },
  { col: 2, row: 9 },
  { col: 6, row: 9 },
];

export const CELL_EMPTY = 0;
export const CELL_OBSTACLE = 1;
export const CELL_TOWER = 2;

export function createInitialGrid() {
  const grid = Array.from({ length: GRID_ROWS }, () =>
    Array(GRID_COLS).fill(CELL_EMPTY)
  );
  for (const ob of INITIAL_OBSTACLES) {
    grid[ob.row][ob.col] = CELL_OBSTACLE;
  }
  return grid;
}

export function isSameCell(a, b) {
  return Boolean(a && b && a.col === b.col && a.row === b.row);
}

export function cellKey(col, row) {
  return `${col},${row}`;
}

export function isWalkable(grid, col, row) {
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
  return grid[row][col] === CELL_EMPTY;
}

/**
 * Computes shortest orthogonal path from `start` to `goal` using A*.
 * Prefers straight corridors slightly via cross-product tie-breaker for clean visuals.
 * Returns array of `{ col, row }` waypoints including start and goal, or null if blocked.
 */
export function findPath(grid, start = SPAWN_CELL, goal = CORE_CELL) {
  if (!isWalkable(grid, start.col, start.row)) return null;
  if (!isWalkable(grid, goal.col, goal.row)) return null;
  if (isSameCell(start, goal)) return [{ col: start.col, row: start.row }];

  const open = [];
  const gScore = new Float64Array(GRID_ROWS * GRID_COLS).fill(Infinity);
  const fScore = new Float64Array(GRID_ROWS * GRID_COLS).fill(Infinity);
  const parent = new Int32Array(GRID_ROWS * GRID_COLS).fill(-1);
  const closed = new Uint8Array(GRID_ROWS * GRID_COLS);

  const idx = (c, r) => r * GRID_COLS + c;
  const startIdx = idx(start.col, start.row);
  const goalIdx = idx(goal.col, goal.row);

  const heuristic = (c, r) => {
    const h = Math.abs(c - goal.col) + Math.abs(r - goal.row);
    // Subtle tie-breaker keeps corridors straight & visually clean
    const dx1 = c - goal.col;
    const dy1 = r - goal.row;
    const dx2 = start.col - goal.col;
    const dy2 = start.row - goal.row;
    const cross = Math.abs(dx1 * dy2 - dx2 * dy1);
    return h + cross * 0.001;
  };

  gScore[startIdx] = 0;
  fScore[startIdx] = heuristic(start.col, start.row);
  open.push(startIdx);

  const dirs = [
    [0, 1],
    [1, 0],
    [-1, 0],
    [0, -1],
  ];

  while (open.length > 0) {
    // Pop lowest fScore
    let bestPos = 0;
    for (let i = 1; i < open.length; i++) {
      if (fScore[open[i]] < fScore[open[bestPos]]) bestPos = i;
    }
    const current = open[bestPos];
    open.splice(bestPos, 1);

    if (current === goalIdx) {
      const path = [];
      let cur = current;
      while (cur !== -1) {
        const r = Math.floor(cur / GRID_COLS);
        const c = cur % GRID_COLS;
        path.push({ col: c, row: r });
        cur = parent[cur];
      }
      path.reverse();
      return path;
    }

    closed[current] = 1;
    const cr = Math.floor(current / GRID_COLS);
    const cc = current % GRID_COLS;

    for (const [dc, dr] of dirs) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (!isWalkable(grid, nc, nr)) continue;

      const nIdx = idx(nc, nr);
      if (closed[nIdx]) continue;

      const tentativeG = gScore[current] + 1;
      if (tentativeG < gScore[nIdx]) {
        parent[nIdx] = current;
        gScore[nIdx] = tentativeG;
        fScore[nIdx] = tentativeG + heuristic(nc, nr);
        if (!open.includes(nIdx)) {
          open.push(nIdx);
        }
      }
    }
  }

  return null;
}

/**
 * Validates whether placing a tower at `cell` keeps the arena strictly passable
 * from Spawn to Core AND avoids trapping any currently active enemies.
 */
export function previewTowerPlacement(
  grid,
  cell,
  activeEnemies = [],
  spawn = SPAWN_CELL,
  core = CORE_CELL
) {
  if (!cell || cell.col < 0 || cell.col >= GRID_COLS || cell.row < 0 || cell.row >= GRID_ROWS) {
    return { valid: false, reason: "Out of bounds", path: null };
  }
  if (isSameCell(cell, spawn)) {
    return { valid: false, reason: "Cannot block Spawn Portal", path: null };
  }
  if (isSameCell(cell, core)) {
    return { valid: false, reason: "Cannot build on Bastion Core", path: null };
  }
  if (grid[cell.row][cell.col] !== CELL_EMPTY) {
    return { valid: false, reason: "Tile occupied", path: null };
  }

  // Test hypothetical placement on cloned grid
  const testGrid = grid.map((r) => [...r]);
  testGrid[cell.row][cell.col] = CELL_TOWER;

  const mainPath = findPath(testGrid, spawn, core);
  if (!mainPath) {
    return { valid: false, reason: "Blocks all routes to Core!", path: null };
  }

  // Verify no live enemy is currently standing on that cell or gets trapped
  for (const enemy of activeEnemies) {
    const ec = Math.round(enemy.col);
    const er = Math.round(enemy.row);
    if (ec === cell.col && er === cell.row) {
      return { valid: false, reason: "Enemy occupying tile!", path: null };
    }
    const enemyPath = findPath(testGrid, { col: ec, row: er }, core);
    if (!enemyPath) {
      return { valid: false, reason: "Would trap active squad!", path: null };
    }
  }

  return { valid: true, reason: null, path: mainPath };
}

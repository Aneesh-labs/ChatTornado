import test from "node:test";
import assert from "node:assert/strict";

import {
  GRID_COLS,
  GRID_ROWS,
  SPAWN_CELL,
  CORE_CELL,
  CELL_OBSTACLE,
  CELL_TOWER,
  createInitialGrid,
  findPath,
  previewTowerPlacement,
} from "../src/Components/games/vortexBastion/pathfinding.js";

test("Vortex Bastion C1: initial 9x13 grid computes valid A* route & respects obstacles", () => {
  const grid = createInitialGrid();
  assert.equal(grid.length, GRID_ROWS);
  assert.equal(grid[0].length, GRID_COLS);

  const path = findPath(grid, SPAWN_CELL, CORE_CELL);
  assert.ok(path && path.length >= 13);
  assert.deepEqual(path[0], SPAWN_CELL);
  assert.deepEqual(path[path.length - 1], CORE_CELL);

  // Path never steps onto any obstacle tile
  for (const step of path) {
    assert.notEqual(grid[step.row][step.col], CELL_OBSTACLE);
  }
});

test("Vortex Bastion C1: live reroute extends path and blocks sealing all corridors", () => {
  const grid = createInitialGrid();
  const basePath = findPath(grid);

  // Place tower directly on middle column (4,6) -> forces detour around it!
  const midPreview = previewTowerPlacement(grid, { col: 4, row: 6 });
  assert.equal(midPreview.valid, true);
  assert.ok(midPreview.path.length > basePath.length);

  // Cannot overwrite spawn or core
  assert.equal(previewTowerPlacement(grid, SPAWN_CELL).valid, false);
  assert.equal(previewTowerPlacement(grid, CORE_CELL).valid, false);

  // Build horizontal wall across row 5 except col 8
  for (let c = 0; c < GRID_COLS - 1; c++) {
    grid[5][c] = CELL_TOWER;
  }
  // Sealing final remaining col 8 MUST be rejected by anti-lockout!
  const blocked = previewTowerPlacement(grid, { col: 8, row: 5 });
  assert.equal(blocked.valid, false);
  assert.match(blocked.reason, /Blocks all routes/i);
});

test("Vortex Bastion C1: refuses placement that traps an active enemy squad", () => {
  const grid = createInitialGrid();
  // Surround (col=1, row=1) on 3 sides (up, left, down), leaving right (col=2, row=1) open
  grid[0][1] = CELL_TOWER;
  grid[1][0] = CELL_TOWER;
  grid[2][1] = CELL_TOWER;
  const enemy = { col: 1, row: 1 };

  // Closing (col=2, row=1) seals enemy inside (col=1, row=1)
  const res = previewTowerPlacement(grid, { col: 2, row: 1 }, [enemy]);
  assert.equal(res.valid, false);
  assert.match(res.reason, /trap active squad/i);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  TESSERACT_TOPOLOGY,
  createInitialAfterspaceState,
  project4Dto3D,
  computeHypercubeAlignment,
  isPathPassableAt,
  shiftTemporalState,
  updateHypercubeAngle,
  triggerExamineAction,
  stepAfterspaceState,
} from "../src/Components/games/afterspace/afterspaceEngine.js";

test("AFTERSPACE 4D Tesseract topology has 16 vertices & 32 edges and projects cleanly", () => {
  assert.equal(TESSERACT_TOPOLOGY.vertices.length, 16);
  assert.equal(TESSERACT_TOPOLOGY.edges.length, 32);

  const p = project4Dto3D(
    TESSERACT_TOPOLOGY.vertices[0],
    { XY: 15, XZ: 10, XW: 45, YZ: 0, YW: 35, ZW: 0 },
    2.4
  );
  assert.equal(Number.isFinite(p.x), true);
  assert.equal(Number.isFinite(p.y), true);
  assert.equal(Number.isFinite(p.z), true);
});

test("AFTERSPACE Temporal Shift controls Observatory causeway passability", () => {
  const s = createInitialAfterspaceState({ startInWorld: true });
  // PRESENT (index 1): bridge between Gateway (z=9) and Observatory (z=3.5) is broken
  assert.equal(s.temporalIndex, 1);
  assert.equal(isPathPassableAt(0, 6.0, s), false);

  // Shift to PAST (index 0): stone causeway intact
  assert.equal(shiftTemporalState(s, 0), true);
  assert.equal(isPathPassableAt(0, 6.0, s), true);

  // Shift to FUTURE (index 2): crystallized span passable
  assert.equal(shiftTemporalState(s, 2), true);
  assert.equal(isPathPassableAt(0, 6.0, s), true);
});

test("AFTERSPACE 4D Hypercube alignment & Dimensional Threshold completion", () => {
  const s = createInitialAfterspaceState({ startInWorld: true });

  // Examine Ancient Structure in Region 01
  s.player.x = 0;
  s.player.z = 12.6;
  const r1 = triggerExamineAction(s);
  assert.equal(r1.handled, true);
  assert.equal(s.journalDiscovered.entry_004, true);
  assert.equal(s.objectives.find((o) => o.id === "obj_structure").completed, true);

  // Scan Temporal Residue with Scanner active
  s.scannerActive = true;
  s.player.x = 4.2;
  s.player.z = 15.0;
  for (let i = 0; i < 45; i += 1) {
    stepAfterspaceState(s, { forward: false, backward: false, left: false, right: false }, 0.05);
  }
  assert.equal(s.journalDiscovered.entry_009, true);
  assert.equal(s.objectives.find((o) => o.id === "obj_residue").completed, true);

  // Unaligned Dimensional Gate must stay locked
  s.scannerActive = false;
  s.player.x = 0;
  s.player.z = -25.8;
  const blocked = triggerExamineAction(s);
  assert.equal(blocked.blocked, true);

  // Align XW -> 45 deg, YW -> 35 deg
  updateHypercubeAngle(s, "XW", 45);
  updateHypercubeAngle(s, "YW", 35);
  const align = computeHypercubeAlignment(s.hypercube.angles);
  assert.equal(align.aligned, true);
  assert.equal(s.objectives.find((o) => o.id === "obj_mechanism").completed, true);

  // Stabilizing gate now completes expedition
  const fin = triggerExamineAction(s);
  assert.equal(fin.completed, true);
  assert.equal(s.screen, "complete");
});

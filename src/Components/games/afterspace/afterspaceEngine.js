// Pure simulation, world data, and 4D mathematics for AFTERSPACE — Echoes of the Fourth Dimension.

export const ROTATION_PLANES = ["XY", "XZ", "XW", "YZ", "YW", "ZW"];

export const TEMPORAL_STATES = [
  { id: "PAST", label: "PAST", code: "T - 100", unstable: false, summary: "Basalt causeways stand intact before the fracture." },
  { id: "PRESENT", label: "PRESENT", code: "T + 000", unstable: false, summary: "Central span collapsed; temporal residue lingers." },
  { id: "FUTURE", label: "FUTURE", code: "T + 100", unstable: true, summary: "Crystallized lattice forms over the abyss; high flux." },
];

export const REGIONS = [
  {
    id: "gateway",
    indexLabel: "REGION 01",
    code: "EXPEDITION 01 / REGION 01",
    name: "The Forgotten Gateway",
    subtitle: "An arrival ridge overlooking suspended basalt monoliths.",
    biome: "monolith",
    bounds: { minZ: 9, maxZ: 30 },
    center: { x: 0, z: 19 },
  },
  {
    id: "observatory",
    indexLabel: "REGION 02",
    code: "EXPEDITION 01 / REGION 02",
    name: "The Fractured Observatory",
    subtitle: "A place where time ceased to advance.",
    biome: "observatory",
    bounds: { minZ: -9, maxZ: 9 },
    center: { x: 0, z: 0 },
  },
  {
    id: "singularity",
    indexLabel: "REGION 03",
    code: "EXPEDITION 01 / REGION 03",
    name: "The Silent Singularity",
    subtitle: "Sixteen vertices suspended outside linear duration.",
    biome: "desert",
    bounds: { minZ: -34, maxZ: -9 },
    center: { x: 0, z: -20 },
  },
];

export const INITIAL_OBJECTIVES = [
  {
    id: "obj_structure",
    title: "Locate the central structure.",
    region: "gateway",
    completed: false,
    hints: [
      "Follow the stone causeway north toward the monolith frame.",
      "Examine the Ancient Structure near the northern edge of Region 01.",
      "Stand close to the Ancient Structure (X 0.0, Z 12.5) and press [E].",
    ],
  },
  {
    id: "obj_residue",
    title: "Examine the temporal residue.",
    region: "gateway",
    completed: false,
    hints: [
      "Enable the observation scanner with [Q] to highlight temporal traces.",
      "Look toward the drifting residue pillar east of the Gateway ridge.",
      "Press [Q] near the Temporal Residue (X 4.2, Z 15.0) and hold focus until 100%.",
    ],
  },
  {
    id: "obj_coordinate",
    title: "Discover the missing coordinate.",
    region: "observatory",
    completed: false,
    hints: [
      "Switch the Temporal Instrument to PAST or FUTURE to reconstruct the broken span.",
      "Cross into The Fractured Observatory and inspect the Astrolabe Record.",
      "At Z = -1.5, examine the Missing Coordinate Slab [E] to record XW/YW phase offsets.",
    ],
  },
  {
    id: "obj_mechanism",
    title: "Activate the dimensional mechanism.",
    region: "singularity",
    completed: false,
    hints: [
      "Enter The Silent Singularity chamber at the northern platform.",
      "Open the 4D Tesseract interface [E] at the central hypercube.",
      "Align planes XW (~45°) and YW (~35°) until resonance locks above 90%.",
    ],
  },
  {
    id: "obj_gate",
    title: "Stabilize the gate.",
    region: "singularity",
    completed: false,
    hints: [
      "Approach the northern monumental arch beyond the aligned hypercube.",
      "Interact with the Dimensional Threshold while resonance is locked.",
      "Press [E] at the Dimensional Gate (X 0.0, Z -25.5) to complete the expedition.",
    ],
  },
];

export const JOURNAL_CATALOG = [
  {
    id: "entry_001",
    code: "ENTRY 001",
    category: "Overview",
    title: "Prelude to the Fourth Projection",
    quote: "Our instruments measure three orthogonal distances and one reluctant arrow of duration.",
    date: "Day 01 — 04:18",
    location: "The Forgotten Gateway",
    temporalState: "T + 000",
    classification: "Field Note",
    coords: { x: 0.0, y: 1.8, z: 24.0 },
    diagram: "horizon",
    related: ["ENTRY 014"],
    initiallyDiscovered: true,
    body: "Arrival at the outer basalt causeway. Atmospheric particulate remains suspended in near-zero wind. Distant geometry does not obey single-point perspective.",
  },
  {
    id: "entry_004",
    code: "ENTRY 004",
    category: "Locations",
    title: "The Ancient Structure",
    quote: "Carved not to house inhabitants, but to cast a shadow along four axes.",
    date: "Day 01 — 04:29",
    location: "The Forgotten Gateway",
    temporalState: "T + 000",
    classification: "Monumental Architecture",
    coords: { x: 0.0, y: 2.1, z: 12.5 },
    diagram: "arch",
    related: ["ENTRY 009", "ENTRY 014"],
    initiallyDiscovered: false,
    body: "A threshold frame lacking doors or inscription. Its shadow falls slightly inward toward noon regardless of solar elevation, suggesting higher-dimensional occlusion.",
  },
  {
    id: "entry_009",
    code: "ENTRY 009",
    category: "Anomalies",
    title: "Temporal Residue",
    quote: "Matter remembering where it stood a century ago.",
    date: "Day 01 — 04:36",
    location: "The Forgotten Gateway",
    temporalState: "T - 003.42",
    classification: "Unknown classification",
    coords: { x: 4.2, y: 1.4, z: 15.0 },
    diagram: "residue",
    related: ["ENTRY 004", "OBJECT 018"],
    initiallyDiscovered: false,
    body: "Spectral calibration reveals faint duplication along the T-axis. Scanning stabilizes the observer's temporal calibration window.",
  },
  {
    id: "entry_014",
    code: "ENTRY 014",
    category: "Locations",
    title: "A Structure Outside Time",
    quote: "Observation suggests that the structure exists in several distinct temporal configurations.",
    date: "Day 01 — 05:02",
    location: "The Fractured Observatory",
    temporalState: "T - 100 / T + 100",
    classification: "Observatory Wing",
    coords: { x: 0.0, y: 2.4, z: -1.5 },
    diagram: "observatory",
    related: ["ENTRY 004", "ENTRY 021"],
    initiallyDiscovered: false,
    body: "In Present T+000 the crossing fractures into impassable stone. Shifting to Past T-100 restores the masonry span; Future T+100 crystallizes a translucent bridge.",
  },
  {
    id: "entry_018",
    code: "ENTRY 018",
    category: "Scientific records",
    title: "The Missing Coordinate Slab",
    quote: "Rotations in XW and YW bring sixteen vertices into quiet symmetry.",
    date: "Day 01 — 05:19",
    location: "The Fractured Observatory",
    temporalState: "T - 100",
    classification: "Mathematical Inscription",
    coords: { x: -3.4, y: 1.9, z: -2.0 },
    diagram: "coordinates",
    related: ["ENTRY 021"],
    initiallyDiscovered: false,
    body: "Chiseled into oxidized sandstone: target resonance lies near XW 45° and YW 35°. Within five degrees of alignment, the gate awakens.",
  },
  {
    id: "entry_021",
    code: "ENTRY 021",
    category: "Discoveries",
    title: "The Sixteen-Vertex Core",
    quote: "Reality is only the projection of something greater.",
    date: "Day 01 — 05:44",
    location: "The Silent Singularity",
    temporalState: "T + 000",
    classification: "4D Projection",
    coords: { x: 0.0, y: 3.1, z: -19.0 },
    diagram: "tesseract",
    related: ["ENTRY 014", "ENTRY 018"],
    initiallyDiscovered: false,
    body: "Every edge inside the inner chamber connects two parallel 3D cubes displaced along W. Rotating through W exchanges inner and outer enclosures effortlessly.",
  },
];

export const ARTIFACT_CATALOG = [
  {
    id: "art_fragment_018",
    code: "OBJECT 018",
    category: "Temporal fragments",
    name: "Temporal Fragment",
    quantity: 1,
    origin: "The Forgotten Gateway",
    classification: "Unknown",
    temporalSignature: "T - 014.8",
    description: "A fragment of an event that appears to have occurred before its cause.",
    hiddenNote: "Under XW rotation it casts two distinct shadows across stone.",
    shape: "octa",
    color: "#B99A70",
    coords: { x: -4.2, z: 16.5 },
    initiallyOwned: false,
  },
  {
    id: "art_key_astrolabe",
    code: "OBJECT 024",
    category: "Dimensional keys",
    name: "Astrolabe Key",
    quantity: 1,
    origin: "The Fractured Observatory",
    classification: " Brass / Obsidian",
    temporalSignature: "T - 100.0",
    description: "Three concentric gimbals notched to index an invisible fourth ring.",
    hiddenNote: "Aligns naturally with XW 45° and YW 35° resonance harmonics.",
    shape: "rings",
    color: "#8496A1",
    coords: { x: 3.6, z: 0.2 },
    initiallyOwned: false,
  },
  {
    id: "art_core_singularity",
    code: "OBJECT 031",
    category: "Energy cores",
    name: "Resonant Vessel",
    quantity: 1,
    origin: "The Silent Singularity",
    classification: "Harmonic Core",
    temporalSignature: "T + 042.1",
    description: "A silent vessel holding steady illumination without emitting measurable heat.",
    hiddenNote: "Responds directly to stabilized hypercube symmetry.",
    shape: "cube",
    color: "#89988A",
    coords: { x: 4.5, z: -16.5 },
    initiallyOwned: false,
  },
  {
    id: "art_record_tablet",
    code: "OBJECT 009",
    category: "Ancient records",
    name: "Observatory Folio",
    quantity: 1,
    origin: "The Forgotten Gateway",
    classification: "Archival Plate",
    temporalSignature: "T + 000.0",
    description: "An etched metal plate mapping tidal motion beneath an unmoving moon.",
    hiddenNote: "References four simultaneous layers of observation.",
    shape: "prism",
    color: "#847A85",
    coords: { x: 2.2, z: 21.5 },
    initiallyOwned: true,
  },
];

export const INTERACTABLES = [
  {
    id: "int_ancient_structure",
    label: "ANCIENT STRUCTURE",
    action: "Examine",
    x: 0.0,
    y: 1.9,
    z: 12.5,
    radius: 3.6,
    region: "gateway",
    journalId: "entry_004",
    objectiveId: "obj_structure",
  },
  {
    id: "int_temporal_residue",
    label: "TEMPORAL RESIDUE",
    action: "Scan",
    requiresScanner: true,
    x: 4.2,
    y: 1.5,
    z: 15.0,
    radius: 3.8,
    region: "gateway",
    journalId: "entry_009",
    objectiveId: "obj_residue",
    signature: "T - 003.42",
  },
  {
    id: "int_coordinate_slab",
    label: "ASTROLOBE RECORD",
    action: "Examine",
    x: -3.4,
    y: 1.5,
    z: -2.0,
    radius: 3.6,
    region: "observatory",
    journalId: "entry_018",
    objectiveId: "obj_coordinate",
  },
  {
    id: "int_tesseract",
    label: "CENTRAL HYPERCUBE",
    action: "Align Geometry",
    x: 0.0,
    y: 2.4,
    z: -19.0,
    radius: 4.2,
    region: "singularity",
    journalId: "entry_021",
    objectiveId: "obj_mechanism",
    opensHypercube: true,
  },
  {
    id: "int_dimensional_gate",
    label: "DIMENSIONAL THRESHOLD",
    action: "Stabilize Gate",
    x: 0.0,
    y: 2.6,
    z: -25.8,
    radius: 3.8,
    region: "singularity",
    objectiveId: "obj_gate",
    completesExpedition: true,
  },
];

// Build exact 4D hypercube (16 vertices, 32 edges)
export function createTesseractTopology() {
  const vertices = [];
  for (let i = 0; i < 16; i += 1) {
    vertices.push([
      i & 1 ? 1 : -1,
      i & 2 ? 1 : -1,
      i & 4 ? 1 : -1,
      i & 8 ? 1 : -1,
    ]);
  }
  const edges = [];
  for (let i = 0; i < 16; i += 1) {
    for (let bit = 0; bit < 4; bit += 1) {
      const j = i ^ (1 << bit);
      if (i < j) edges.push([i, j]);
    }
  }
  return { vertices, edges };
}

export const TESSERACT_TOPOLOGY = createTesseractTopology();

export function rotate4DVertex(v, anglesDeg) {
  let [x, y, z, w] = v;
  const rad = Math.PI / 180;

  const rot = (a, b, deg) => {
    if (!deg) return [a, b];
    const t = deg * rad;
    const c = Math.cos(t);
    const s = Math.sin(t);
    return [a * c - b * s, a * s + b * c];
  };

  [x, y] = rot(x, y, anglesDeg.XY || 0);
  [x, z] = rot(x, z, anglesDeg.XZ || 0);
  [x, w] = rot(x, w, anglesDeg.XW || 0);
  [y, z] = rot(y, z, anglesDeg.YZ || 0);
  [y, w] = rot(y, w, anglesDeg.YW || 0);
  [z, w] = rot(z, w, anglesDeg.ZW || 0);

  return [x, y, z, w];
}

export function project4Dto3D(v4, anglesDeg, projDist = 2.4) {
  const [x, y, z, w] = rotate4DVertex(v4, anglesDeg);
  const denom = Math.max(0.45, projDist - w);
  const scale = projDist / denom;
  return {
    x: x * scale,
    y: y * scale,
    z: z * scale,
    w,
    scale,
  };
}

// Resonance alignment target: XW near 45 deg, YW near 35 deg (periodic modulo 180 deg)
export function computeHypercubeAlignment(anglesDeg) {
  const deltaAngle = (val, target) => {
    const diff = Math.abs((((val - target) % 180) + 270) % 180 - 90);
    return diff;
  };
  const errXW = deltaAngle(anglesDeg.XW || 0, 45);
  const errYW = deltaAngle(anglesDeg.YW || 0, 35);
  const errZW = deltaAngle(anglesDeg.ZW || 0, 0) * 0.35;
  const totalErr = errXW + errYW + errZW;
  const pct = Math.max(0, Math.min(100, Math.round(100 - totalErr * 1.15)));
  return {
    percent: pct,
    aligned: pct >= 90,
  };
}

export function getRegionAtZ(z) {
  return (
    REGIONS.find((r) => z <= r.bounds.maxZ && z >= r.bounds.minZ) ||
    (z > 9 ? REGIONS[0] : z < -9 ? REGIONS[2] : REGIONS[1])
  );
}

export const DEFAULT_SETTINGS = {
  resolutionScale: 1.0,
  graphicsPreset: "High",
  shadows: "Soft",
  ambientEffects: true,
  particleDensity: "Restrained",
  masterVolume: 70,
  musicVolume: 55,
  ambientVolume: 50,
  effectsVolume: 75,
  mouseSensitivity: 1.0,
  invertY: false,
  reducedMotion: false,
  subtitles: true,
  largeText: false,
  highContrast: false,
};

export function createInitialAfterspaceState(options = {}) {
  const journalDiscovered = {};
  JOURNAL_CATALOG.forEach((j) => {
    journalDiscovered[j.id] = Boolean(j.initiallyDiscovered);
  });

  const ownedArtifacts = {};
  ARTIFACT_CATALOG.forEach((a) => {
    ownedArtifacts[a.id] = Boolean(a.initiallyOwned);
  });

  const baseAngles =
    options.difficulty === "Guided"
      ? { XY: 15, XZ: 10, XW: 25, YZ: 0, YW: 18, ZW: 0 }
      : { XY: 12, XZ: 8, XW: 0, YZ: 0, YW: 0, ZW: 0 };

  return {
    screen: options.startInWorld ? "playing" : "menu", // menu | setup | playing | paused | complete
    activeOverlay: null, // null | journal | inventory | mission | map | hypercube | settings
    expeditionMode: options.expeditionMode || "Solo Exploration",
    difficulty: options.difficulty || "Standard", // Guided | Standard | Unassisted
    player: {
      x: 0,
      y: 0,
      z: 24.5,
      yaw: 0, // 0 faces north (-Z)
      pitch: -0.05,
    },
    temporalIndex: 1, // 0 PAST, 1 PRESENT, 2 FUTURE
    temporalTransition: 0,
    atFracturedSpan: false,
    scannerActive: false,
    scanTargetId: null,
    scanProgress: 0,
    suitEnergy: 96,
    stability: 92,
    regionId: "gateway",
    discoveredRegions: ["gateway"],
    regionBanner: {
      visible: true,
      title: REGIONS[0].name,
      subtitle: REGIONS[0].subtitle,
      code: REGIONS[0].indexLabel,
      timer: 4.8,
    },
    discoveryToast: null,
    coopNotice: null,
    journalDiscovered,
    ownedArtifacts,
    objectives: INITIAL_OBJECTIVES.map((o) => ({ ...o })),
    hintTier: {},
    hypercube: {
      angles: baseAngles,
      selectedPlane: "XW",
      projectionDistance: 2.4,
      showVertices: true,
      showEdges: true,
      showLabels: false,
      compareProjection: false,
      alignment: computeHypercubeAlignment(baseAngles),
    },
    coopMate: {
      name: "Vega-02",
      x: 2.1,
      z: 18.2,
      active: (options.expeditionMode || "Solo Exploration") === "Cooperative Exploration",
    },
  };
}

// Check if bridge at Z between 3.5 and 8.5 (Gateway -> Observatory) or -6.5 and -11.5 (Observatory -> Singularity) is passable
export function isPathPassableAt(x, z, state) {
  if (Math.abs(x) > 12) return false;
  if (z > 28 || z < -28.5) return false;

  // Gateway <-> Observatory chasm (z between 3.2 and 8.8)
  if (z >= 3.2 && z <= 8.8) {
    if (Math.abs(x) > 2.2) return false;
    // Broken in PRESENT (index 1); reconstructed in PAST (0) and FUTURE (2)
    return state.temporalIndex !== 1;
  }

  // Observatory <-> Singularity threshold (z between -11.8 and -6.2)
  if (z >= -11.8 && z <= -6.2) {
    if (Math.abs(x) > 2.2) return false;
    return true;
  }

  return true;
}

export function findNearestInteractable(player) {
  let best = null;
  let bestDist = Infinity;
  for (const item of INTERACTABLES) {
    const dx = item.x - player.x;
    const dz = item.z - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= item.radius && dist < bestDist) {
      best = { ...item, distance: dist };
      bestDist = dist;
    }
  }
  return best;
}

export function stepAfterspaceState(state, input, dt) {
  const safeDt = Math.min(0.05, Math.max(0, dt));
  const events = {
    enteredRegion: null,
    discovered: null,
    recoveredArtifact: null,
    scanCompleted: null,
    coopEvent: null,
  };

  if (state.screen !== "playing" || state.activeOverlay) {
    return events;
  }

  // Smooth camera yaw turning (e.g. keyboard arrows) alongside mouse look
  const turnDir = (input.turnLeft ? 1 : 0) - (input.turnRight ? 1 : 0);
  if (turnDir !== 0) {
    state.player.yaw += turnDir * 1.9 * safeDt;
  }

  // Movement relative to camera yaw (yaw=0 looks along -Z)
  const moveForward = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
  const moveRight = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const speed = input.sprint ? 8.6 : 6.2;

  if (moveForward !== 0 || moveRight !== 0) {
    const len = Math.hypot(moveForward, moveRight);
    const nf = moveForward / len;
    const nr = moveRight / len;
    const sinY = Math.sin(state.player.yaw);
    const cosY = Math.cos(state.player.yaw);
    const vx = (-sinY * nf + cosY * nr) * speed * safeDt;
    const vz = (-cosY * nf - sinY * nr) * speed * safeDt;

    const nextX = state.player.x + vx;
    const nextZ = state.player.z + vz;

    if (isPathPassableAt(nextX, state.player.z, state)) {
      state.player.x = nextX;
    }
    if (isPathPassableAt(state.player.x, nextZ, state)) {
      state.player.z = nextZ;
    }
  }

  state.atFracturedSpan =
    state.temporalIndex === 1 &&
    state.player.z >= 8.2 &&
    state.player.z <= 11.4 &&
    Math.abs(state.player.x) <= 3.6;

  // Check passive collectible artifacts pickup
  for (const art of ARTIFACT_CATALOG) {
    if (state.ownedArtifacts[art.id]) continue;
    const d = Math.hypot(art.coords.x - state.player.x, art.coords.z - state.player.z);
    if (d <= 2.2) {
      state.ownedArtifacts[art.id] = true;
      events.recoveredArtifact = art;
      state.discoveryToast = {
        kicker: "Artifact recovered.",
        title: art.name,
        sub: `${art.code} • ${art.temporalSignature}`,
        timer: 4.2,
      };
    }
  }

  // Update Region tracking & cinematic banner
  const currentRegion = getRegionAtZ(state.player.z);
  if (currentRegion.id !== state.regionId) {
    state.regionId = currentRegion.id;
    if (!state.discoveredRegions.includes(currentRegion.id)) {
      state.discoveredRegions.push(currentRegion.id);
    }
    if (currentRegion.id === "observatory" && !state.journalDiscovered.entry_014) {
      state.journalDiscovered.entry_014 = true;
    }
    state.regionBanner = {
      visible: true,
      title: currentRegion.name,
      subtitle: currentRegion.subtitle,
      code: currentRegion.indexLabel,
      timer: 4.8,
    };
    events.enteredRegion = currentRegion;
  }

  if (state.regionBanner && state.regionBanner.visible) {
    state.regionBanner.timer -= safeDt;
    if (state.regionBanner.timer <= 0) {
      state.regionBanner.visible = false;
    }
  }

  if (state.discoveryToast) {
    state.discoveryToast.timer -= safeDt;
    if (state.discoveryToast.timer <= 0) {
      state.discoveryToast = null;
    }
  }

  if (state.coopNotice) {
    state.coopNotice.timer -= safeDt;
    if (state.coopNotice.timer <= 0) {
      state.coopNotice = null;
    }
  }

  // Temporal instability slowly perturbs stability in FUTURE T+100
  if (state.temporalIndex === 2) {
    state.stability = Math.max(64, state.stability - safeDt * 1.4);
  } else {
    state.stability = Math.min(98, state.stability + safeDt * 2.2);
  }

  // Gentle energy trickle during active scan
  if (state.scannerActive) {
    state.suitEnergy = Math.max(40, state.suitEnergy - safeDt * 0.45);
    const nearest = findNearestInteractable(state.player);
    if (nearest && nearest.id === "int_temporal_residue") {
      state.scanTargetId = nearest.id;
      const prev = state.scanProgress;
      state.scanProgress = Math.min(100, prev + safeDt * 58);
      if (state.scanProgress >= 100 && prev < 100) {
        state.journalDiscovered[nearest.journalId] = true;
        const obj = state.objectives.find((o) => o.id === nearest.objectiveId);
        if (obj) obj.completed = true;
        events.scanCompleted = nearest;
        state.discoveryToast = {
          kicker: "OBSERVATION RECORDED",
          title: "Temporal residue",
          sub: "Added to field journal.",
          timer: 4.4,
        };
      }
    } else {
      state.scanTargetId = null;
      state.scanProgress = Math.max(0, state.scanProgress - safeDt * 75);
    }
  } else {
    state.suitEnergy = Math.min(100, state.suitEnergy + safeDt * 0.8);
    state.scanTargetId = null;
    state.scanProgress = 0;
  }

  // Gentle cooperative companion trail
  if (state.coopMate.active) {
    state.coopMate.x += (state.player.x + 2.2 - state.coopMate.x) * Math.min(1, safeDt * 1.6);
    state.coopMate.z += (state.player.z + 1.8 - state.coopMate.z) * Math.min(1, safeDt * 1.6);
  }

  return events;
}

export function triggerExamineAction(state) {
  const nearest = findNearestInteractable(state.player);
  if (!nearest) return { handled: false };

  if (nearest.opensHypercube) {
    state.journalDiscovered.entry_021 = true;
    state.activeOverlay = "hypercube";
    return { handled: true, opened: "hypercube" };
  }

  if (nearest.completesExpedition) {
    if (!state.hypercube.alignment.aligned) {
      return {
        handled: true,
        blocked: true,
        message: "Align the Central Hypercube geometry before stabilizing the threshold.",
      };
    }
    const obj = state.objectives.find((o) => o.id === "obj_gate");
    if (obj) obj.completed = true;
    state.screen = "complete";
    return { handled: true, completed: true };
  }

  if (nearest.requiresScanner && !state.scannerActive) {
    state.scannerActive = true;
    return { handled: true, startedScan: true };
  }

  if (nearest.journalId && !state.journalDiscovered[nearest.journalId]) {
    state.journalDiscovered[nearest.journalId] = true;
  }

  if (nearest.objectiveId) {
    const obj = state.objectives.find((o) => o.id === nearest.objectiveId);
    if (obj) obj.completed = true;
  }

  const entry = JOURNAL_CATALOG.find((j) => j.id === nearest.journalId);
  if (entry) {
    state.discoveryToast = {
      kicker: "NEW DISCOVERY",
      title: entry.title,
      sub: "Added to the field journal.",
      timer: 4.5,
    };
  }

  return { handled: true, entry };
}

export function shiftTemporalState(state, targetIndex) {
  if (targetIndex < 0 || targetIndex >= TEMPORAL_STATES.length) return false;
  if (state.temporalIndex === targetIndex) return false;
  state.temporalIndex = targetIndex;
  state.temporalTransition = 1.0;
  return true;
}

export function updateHypercubeAngle(state, plane, valueDeg) {
  state.hypercube.angles[plane] = ((valueDeg % 360) + 360) % 360;
  state.hypercube.alignment = computeHypercubeAlignment(state.hypercube.angles);
  if (state.hypercube.alignment.aligned) {
    const obj = state.objectives.find((o) => o.id === "obj_mechanism");
    if (obj && !obj.completed) {
      obj.completed = true;
      state.discoveryToast = {
        kicker: "OBSERVATION COMPLETE",
        title: "The dimensional structure is now accessible.",
        sub: "Proceed north to the Dimensional Threshold.",
        timer: 4.8,
      };
    }
  }
  return state.hypercube.alignment;
}

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
    code: "SECTOR 01 / CENTRAL",
    name: "The Forgotten Gateway",
    subtitle: "An arrival ridge overlooking suspended basalt monoliths.",
    biome: "monolith",
    bounds: { minX: -14, maxX: 14, minZ: 9, maxZ: 44 },
    center: { x: 0, z: 19 },
  },
  {
    id: "observatory",
    indexLabel: "REGION 02",
    code: "SECTOR 02 / CENTRAL",
    name: "The Fractured Observatory",
    subtitle: "A place where time ceased to advance.",
    biome: "observatory",
    bounds: { minX: -14, maxX: 14, minZ: -9, maxZ: 9 },
    center: { x: 0, z: 0 },
  },
  {
    id: "singularity",
    indexLabel: "REGION 03",
    code: "SECTOR 03 / NORTH",
    name: "The Silent Singularity",
    subtitle: "Sixteen vertices suspended outside linear duration.",
    biome: "desert",
    bounds: { minX: -16, maxX: 16, minZ: -54, maxZ: -9 },
    center: { x: 0, z: -20 },
  },
  {
    id: "sundial_basin",
    indexLabel: "REGION 04",
    code: "SECTOR 04 / WEST WILDS",
    name: "The Sunken Sundial Basin",
    subtitle: "Wind-carved dunes circling a helical solar gnomon.",
    biome: "desert",
    bounds: { minX: -58, maxX: -14, minZ: -54, maxZ: 24 },
    center: { x: -29, z: 2 },
  },
  {
    id: "echo_pillars",
    indexLabel: "REGION 05",
    code: "SECTOR 05 / EAST OVERLOOK",
    name: "The Echoing Pillars",
    subtitle: "Golden-ratio stone columns humming above the valley.",
    biome: "monolith",
    bounds: { minX: 14, maxX: 58, minZ: -54, maxZ: 24 },
    center: { x: 29, z: -4 },
  },
  {
    id: "horizon_ridge",
    indexLabel: "REGION 06",
    code: "SECTOR 06 / SOUTH RIM",
    name: "The Outer Horizon Dunes",
    subtitle: "Quiet sandstone ridges bordering an uncharted expanse.",
    biome: "desert",
    bounds: { minX: -58, maxX: 58, minZ: 24, maxZ: 48 },
    center: { x: -16, z: 32 },
  },
];

export const UPDRAFTS = [
  { id: "up_west", x: -15.5, z: 8.0, radius: 3.4, lift: 9.2 },
  { id: "up_east", x: 16.5, z: -2.0, radius: 3.4, lift: 9.2 },
  { id: "up_south", x: -14.0, z: 26.0, radius: 3.4, lift: 8.6 },
];

/**
 * Simple-math open-world ground elevation function shared between simulation & Three.js terrain.
 */
export function getWorldGroundY(x, z) {
  // Architectural terraces along the central sanctuary spine
  if (Math.abs(x) <= 13.5 && z >= -32 && z <= 28) {
    if (z > 23.2) return 0.48;
    if (z > 21.0) return 0.24;
    if (z >= -4.2 && z <= 1.2 && Math.hypot(x, z + 1.5) < 6.4) return -0.22;
    if (z <= -16.5 && z >= -22.2 && Math.hypot(x, z + 19.0) < 4.5) return 0.22;
    return 0.0;
  }

  // Smooth open-world dune & sandstone canyon harmonics (pure trig, zero mesh raycasts!)
  const distFromSpine = Math.max(0, Math.abs(x) - 13.5);
  const duneWave =
    Math.sin(x * 0.095) * Math.cos(z * 0.085) * 1.45 +
    Math.sin((x + z) * 0.05) * 0.75;
  const eastPlateau = x > 22 && Math.abs(z + 4) < 16 ? 1.15 : 0;
  const westBowl =
    x < -20 && Math.abs(z - 2) < 15
      ? -0.9 * Math.exp(-((x + 28) * (x + 28) + (z - 4) * (z - 4)) / 95)
      : 0;
  const outerRim = Math.max(0, Math.hypot(x * 0.72, z) - 44) * 0.18;
  return Math.max(-2.2, Math.min(5.5, duneWave * Math.min(1, distFromSpine * 0.14 + 0.35) + eastPlateau + westBowl + outerRim));
}

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
  {
    id: "entry_025",
    code: "ENTRY 025",
    category: "Locations",
    title: "The Sunken Sundial Basin",
    quote: "Eleven helical stones trace a shadow that bends at dusk.",
    date: "Day 01 — 06:10",
    location: "The Sunken Sundial Basin",
    temporalState: "T - 100",
    classification: "Solar Architecture",
    coords: { x: -28.0, y: 1.2, z: 4.0 },
    diagram: "horizon",
    related: ["ENTRY 001", "ENTRY 018"],
    initiallyDiscovered: false,
    body: "West of the central promenade, wind-sculpted dunes sink around a polar spiral of stepped limestone spires casting azimuth bearings across the sand.",
  },
  {
    id: "entry_030",
    code: "ENTRY 030",
    category: "Scientific records",
    title: "Harmonics of the Echoing Pillars",
    quote: "Golden-ratio spacing turns canyon gusts into sub-audible chords.",
    date: "Day 01 — 06:35",
    location: "The Echoing Pillars",
    temporalState: "T + 100",
    classification: "Acoustic Monograph",
    coords: { x: 29.0, y: 2.2, z: -6.0 },
    diagram: "arch",
    related: ["ENTRY 014", "ENTRY 021"],
    initiallyDiscovered: false,
    body: "Twenty-four basalt monoliths arranged along a phyllotaxis spiral generate standing pressure harmonics that recharge suit energy along the eastern ridge.",
  },
  {
    id: "entry_034",
    code: "ENTRY 034",
    category: "Overview",
    title: "Outer Horizon Updrafts",
    quote: "Thin thermal currents carry instruments effortlessly above fractured stone.",
    date: "Day 01 — 07:05",
    location: "The Outer Horizon Dunes",
    temporalState: "T + 000",
    classification: "Survey Telemetry",
    coords: { x: -18.0, y: 1.6, z: 32.0 },
    diagram: "horizon",
    related: ["ENTRY 025", "ENTRY 030"],
    initiallyDiscovered: false,
    body: "Vertical thermal vents rising along the outer rim allow gentle atmospheric gliding when holding Jump in mid-air.",
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
  {
    id: "art_prize_prism",
    code: "PRIZE 012",
    category: "Artifacts",
    name: "Celestial Astrolabe Prism",
    quantity: 1,
    origin: "The Forgotten Gateway",
    classification: "Refractive Award",
    temporalSignature: "T + 004.2",
    description: "A ground quartz prism splitting twilight into four quiet spatial planes.",
    hiddenNote: "Awarded along the western basalt colonnade.",
    shape: "octa",
    color: "#EDEAE1",
    coords: { x: -4.8, z: 20.0 },
    initiallyOwned: false,
  },
  {
    id: "art_prize_sundial",
    code: "PRIZE 028",
    category: "Unknown materials",
    name: "Sunken Sundial Needle",
    quantity: 1,
    origin: "The Fractured Observatory",
    classification: "Meridian Relic",
    temporalSignature: "T - 100.0",
    description: "Cast bronze gnomon tip balanced cleanly against true north.",
    hiddenNote: "Shadows lengthen along the W-axis prior to stabilization.",
    shape: "prism",
    color: "#B99A70",
    coords: { x: -4.6, z: 0.4 },
    initiallyOwned: false,
  },
  {
    id: "art_prize_signet",
    code: "PRIZE 039",
    category: "Dimensional keys",
    name: "Fourth-Axis Signet",
    quantity: 1,
    origin: "The Silent Singularity",
    classification: "Distinction Emblem",
    temporalSignature: "T + 100.0",
    description: "Sixteen-faceted ceremonial seal certifying hypercube calibration mastery.",
    hiddenNote: "Resonates at XW 45° and YW 35° alignment.",
    shape: "rings",
    color: "#A97C69",
    coords: { x: -4.5, z: -22.5 },
    initiallyOwned: false,
  },
  {
    id: "art_prize_helical",
    code: "PRIZE 044",
    category: "Artifacts",
    name: "Helical Gnomon Shard",
    quantity: 1,
    origin: "The Sunken Sundial Basin",
    classification: "Solar Relic",
    temporalSignature: "T - 048.0",
    description: "Curved travertine wedge tuned to the western helical spire.",
    hiddenNote: "Discovered amid the dunes west of the central chasm.",
    shape: "octa",
    color: "#B99A70",
    coords: { x: -31.5, z: -9.5 },
    initiallyOwned: false,
  },
  {
    id: "art_prize_resonance",
    code: "PRIZE 051",
    category: "Energy cores",
    name: "Fibonacci Chime",
    quantity: 1,
    origin: "The Echoing Pillars",
    classification: "Harmonic Instrument",
    temporalSignature: "T + 019.6",
    description: "Brushed brass acoustic rod vibrating cleanly in zero wind.",
    hiddenNote: "Restored along the eastern golden-ratio colonnade.",
    shape: "prism",
    color: "#89988A",
    coords: { x: 33.0, z: 7.5 },
    initiallyOwned: false,
  },
  {
    id: "art_prize_zenith",
    code: "PRIZE 062",
    category: "Dimensional keys",
    name: "Solstice Lens",
    quantity: 1,
    origin: "The Echoing Pillars",
    classification: "Optical Disk",
    temporalSignature: "T + 100.0",
    description: "A smoky quartz lens focusing starlight from outside linear duration.",
    hiddenNote: "Resting along the northern canyon ridge.",
    shape: "cube",
    color: "#8496A1",
    coords: { x: 21.0, z: -29.0 },
    initiallyOwned: false,
  },
];

export const EXPLORER_CHARACTERS = [
  {
    id: "aria",
    name: "Aria Vance",
    title: "Survey Cartographer",
    instrumentNote: "Prioritizes elevation contours & architectural alignments.",
    accentColor: "#B99A70",
  },
  {
    id: "kael",
    name: "Kaelen Orlov",
    title: "Observatory Astronomer",
    instrumentNote: "Calibrated for meridian bearings & temporal harmonic shifts.",
    accentColor: "#8496A1",
  },
  {
    id: "vega",
    name: "Vega-02",
    title: "Chrono-Archivist",
    instrumentNote: "Specializes in residual matter classification & artifact recovery.",
    accentColor: "#89988A",
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
  {
    id: "int_sundial_obelisk",
    label: "SUNDIAL GNOMON",
    action: "Read Azimuth",
    x: -28.0,
    y: 1.5,
    z: 4.0,
    radius: 4.2,
    region: "sundial_basin",
    journalId: "entry_025",
  },
  {
    id: "int_echo_pillars",
    label: "HARMONIC PILLARS",
    action: "Attune Resonance",
    x: 29.0,
    y: 2.2,
    z: -6.0,
    radius: 4.4,
    region: "echo_pillars",
    journalId: "entry_030",
  },
  {
    id: "int_southern_beacon",
    label: "HORIZON BEACON",
    action: "Calibrate Survey",
    x: -18.0,
    y: 1.8,
    z: 32.0,
    radius: 4.2,
    region: "horizon_ridge",
    journalId: "entry_034",
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

export function getRegionAtXZ(x, z) {
  if (z > 24 && Math.abs(x) > 13.5) return REGIONS[5]; // horizon_ridge
  if (x < -14) return REGIONS[3]; // sundial_basin
  if (x > 14) return REGIONS[4]; // echo_pillars
  return (
    REGIONS.slice(0, 3).find((r) => z <= r.bounds.maxZ && z >= r.bounds.minZ) ||
    (z > 9 ? REGIONS[0] : z < -9 ? REGIONS[2] : REGIONS[1])
  );
}

export function getRegionAtZ(z, x = 0) {
  return getRegionAtXZ(x, z);
}

export const DEFAULT_SETTINGS = {
  resolutionScale: 1.0,
  performanceMode: "Auto", // Auto | Low Power | Quality
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
      jumpY: 0,
      vy: 0,
      dashTimer: 0,
      dashCooldown: 0,
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
    waypoint: null,
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

// Open-world bounds [-54..54] x [-50..44] with central Observatory bridge puzzle preserved at |x| <= 11.5
export function isPathPassableAt(x, z, state) {
  if (Math.abs(x) > 54) return false;
  if (z > 44 || z < -50) return false;

  // Gateway <-> Observatory chasm (|x| <= 11.5, z between 3.2 and 8.8)
  if (Math.abs(x) <= 11.5 && z >= 3.2 && z <= 8.8) {
    if (Math.abs(x) > 2.2) return false;
    // Broken in PRESENT (index 1); reconstructed in PAST (0) and FUTURE (2)
    return state.temporalIndex !== 1;
  }

  // Observatory <-> Singularity threshold (|x| <= 11.5, z between -11.8 and -6.2)
  if (Math.abs(x) <= 11.5 && z >= -11.8 && z <= -6.2) {
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

  // v2.0 -> v3.0 Vertical vault, thermal updrafts & atmospheric glide
  state.player.dashCooldown = Math.max(0, (state.player.dashCooldown || 0) - safeDt);
  state.player.dashTimer = Math.max(0, (state.player.dashTimer || 0) - safeDt);
  for (const up of UPDRAFTS) {
    if (Math.hypot(state.player.x - up.x, state.player.z - up.z) <= up.radius && (state.player.jumpY || 0) < 4.5) {
      state.player.vy = Math.max(state.player.vy || 0, up.lift * 0.72);
      state.player.jumpY = Math.max(0.05, state.player.jumpY || 0);
    }
  }
  if ((state.player.jumpY || 0) > 0 || (state.player.vy || 0) !== 0) {
    const grav = state.temporalIndex === 2 ? 12.6 : 17.5;
    state.player.vy -= grav * safeDt;
    if (input.glide && state.player.vy < -1.8) {
      state.player.vy = -1.8;
    }
    state.player.jumpY = (state.player.jumpY || 0) + state.player.vy * safeDt;
    if (state.player.jumpY <= 0) {
      state.player.jumpY = 0;
      state.player.vy = 0;
    }
  }

  // Movement relative to camera yaw (yaw=0 looks along -Z)
  const moveForward = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
  const moveRight = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dashBoost = state.player.dashTimer > 0 ? 15.2 : 0;
  const speed = dashBoost || (input.sprint ? 9.2 : 6.4);

  if (moveForward !== 0 || moveRight !== 0 || dashBoost > 0) {
    const len = Math.hypot(moveForward, moveRight);
    const nf = len > 0 ? moveForward / len : 1;
    const nr = len > 0 ? moveRight / len : 0;
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

  // Track waypoint completion proximity
  if (state.waypoint && Math.hypot(state.waypoint.x - state.player.x, state.waypoint.z - state.player.z) < 4.0) {
    state.waypoint = null;
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
    if (d <= 2.4) {
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
  const currentRegion = getRegionAtXZ(state.player.x, state.player.z);
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

export function setWaypointTarget(state, targetId, label = null) {
  const inter = INTERACTABLES.find((i) => i.id === targetId);
  if (inter) {
    state.waypoint = { targetId: inter.id, x: inter.x, z: inter.z, label: label || inter.label };
    return state.waypoint;
  }
  const reg = REGIONS.find((r) => r.id === targetId);
  if (reg) {
    state.waypoint = { targetId: reg.id, x: reg.center.x, z: reg.center.z, label: label || reg.name };
    return state.waypoint;
  }
  return null;
}

export function triggerAfterspaceJump(state) {
  if (state.screen !== "playing" || state.activeOverlay) return false;
  if ((state.player.jumpY || 0) > 0.04) return false;
  state.player.vy = state.temporalIndex === 2 ? 6.6 : 5.8;
  state.player.jumpY = 0.01;
  return true;
}

export function triggerAfterspaceDash(state) {
  if (state.screen !== "playing" || state.activeOverlay) return false;
  if ((state.player.dashCooldown || 0) > 0) return false;
  state.player.dashTimer = 0.28;
  state.player.dashCooldown = 1.4;
  return true;
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

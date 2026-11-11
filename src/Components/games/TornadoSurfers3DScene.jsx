import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as THREE from "three";
import { createGlowHaloTexture } from "./vortexBastion/textures3D";
import { BASE_SPEED, PLAYER_HIT_Z, RUNNER_CHARACTERS, TRAIN_ROOF_Y } from "./tornadoSurfersEngine";

const WORLD_DEPTH = 46;
const LANE_WIDTH = 2.45;
const Y_SCALE = 2.6;

function toWorldZ(simZ) {
  return -(simZ - PLAYER_HIT_Z) * WORLD_DEPTH;
}

function makeSolidMat(opts) {
  const baseOpacity = opts.opacity ?? 1.0;
  const mat = new THREE.MeshStandardMaterial({
    ...opts,
    transparent: baseOpacity < 0.99,
    opacity: baseOpacity,
  });
  mat.userData.baseOpacity = baseOpacity;
  return mat;
}

function makeBasicMat(opts) {
  const baseOpacity = opts.opacity ?? 1.0;
  const mat = new THREE.MeshBasicMaterial({
    ...opts,
    transparent: baseOpacity < 0.99,
    opacity: baseOpacity,
  });
  mat.userData.baseOpacity = baseOpacity;
  return mat;
}

function applyMeshAlpha(group, alpha) {
  const a = Math.max(0, Math.min(1, alpha));
  group.traverse((obj) => {
    if (!obj.material) return;
    const base = obj.material.userData?.baseOpacity ?? 1;
    const effective = base * a;
    if (obj.isSprite) {
      obj.material.opacity = effective;
      return;
    }
    const needBlend = effective < 0.985;
    if (obj.material.transparent !== needBlend) {
      obj.material.transparent = needBlend;
      obj.material.needsUpdate = true;
    }
    obj.material.depthWrite = !needBlend;
    obj.material.opacity = effective;
  });
}

function disposeGroupMaterials(group) {
  group.traverse((obj) => {
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
}

function createSkyscraperTexture(hueHex) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#041612";
  ctx.fillRect(0, 0, 128, 256);

  ctx.fillStyle = hueHex;
  for (let y = 12; y < 240; y += 16) {
    for (let x = 12; x < 112; x += 22) {
      if ((x * y) % 5 !== 0) {
        ctx.globalAlpha = 0.28 + ((x + y) % 4) * 0.16;
        ctx.fillRect(x, y, 12, 8);
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = hueHex;
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 124, 252);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSharedGeos() {
  return {
    unitBox: new THREE.BoxGeometry(1, 1, 1),
    unitPlane: new THREE.PlaneGeometry(1, 1),
    lamp: new THREE.SphereGeometry(0.14, 8, 8),
    coin: new THREE.CylinderGeometry(0.32, 0.32, 0.1, 16),
    power: new THREE.OctahedronGeometry(0.42, 0),
    spark: new THREE.BoxGeometry(0.14, 0.14, 0.14),
    barrierBar: new THREE.BoxGeometry(1.74, 0.6, 0.22),
    barrierLeg: new THREE.BoxGeometry(0.14, 0.75, 0.24),
    gatePost: new THREE.BoxGeometry(0.16, 3.2, 0.24),
    gateSign: new THREE.BoxGeometry(1.82, 1.35, 0.24),
  };
}

function buildTrainMesh3D(variant = 0, moving = false, glowTex, lenZ = 0.28 * WORLD_DEPTH, geos) {
  const palettes = [
    { body: 0x064e3b, roof: 0x10b981, accent: 0x6ee7b7, glass: 0xa7f3d0 },
    { body: 0x052e23, roof: 0x059669, accent: 0x4ade80, glass: 0x86efac },
    { body: 0x042f2e, roof: 0x14b8a6, accent: 0xfbbf24, glass: 0xfde68a },
  ];
  const pal = palettes[variant % palettes.length];
  const group = new THREE.Group();

  const heightY = TRAIN_ROOF_Y * Y_SCALE;
  const widthX = 1.78;

  // Sculpted chassis body + lower bogie undercarriage
  const body = new THREE.Mesh(
    geos.unitBox,
    makeSolidMat({ color: pal.body, metalness: 0.58, roughness: 0.24, opacity: 1.0 })
  );
  body.scale.set(widthX, heightY - 0.26, lenZ);
  body.position.y = heightY * 0.5 + 0.13;
  group.add(body);

  const bogie = new THREE.Mesh(
    geos.unitBox,
    makeSolidMat({ color: 0x022c22, metalness: 0.7, roughness: 0.4, opacity: 1.0 })
  );
  bogie.scale.set(widthX * 0.84, 0.28, lenZ * 0.88);
  bogie.position.y = 0.14;
  group.add(bogie);

  // Sloped front bumper apron
  const apron = new THREE.Mesh(
    geos.unitBox,
    makeSolidMat({ color: pal.roof, metalness: 0.5, roughness: 0.3, opacity: 1.0 })
  );
  apron.scale.set(widthX * 0.96, 0.38, 0.42);
  apron.rotation.x = 0.32;
  apron.position.set(0, 0.35, lenZ * 0.5 + 0.08);
  group.add(apron);

  // Rooftop ribbed deck & vents (runnable roof surface!)
  const roof = new THREE.Mesh(
    geos.unitBox,
    makeSolidMat({
      color: pal.roof,
      emissive: pal.roof,
      emissiveIntensity: 0.28,
      metalness: 0.45,
      roughness: 0.28,
      opacity: 1.0,
    })
  );
  roof.scale.set(widthX * 0.94, 0.14, lenZ * 0.96);
  roof.position.y = heightY + 0.05;
  group.add(roof);

  const stripe = new THREE.Mesh(
    geos.unitBox,
    makeBasicMat({ color: moving ? 0xfbbf24 : pal.accent, opacity: 1.0 })
  );
  stripe.scale.set(widthX + 0.04, 0.11, lenZ * 0.98);
  stripe.position.y = heightY * 0.36;
  group.add(stripe);

  // Illuminated cabin side window belt
  const windowBelt = new THREE.Mesh(
    geos.unitBox,
    makeBasicMat({ color: pal.glass, opacity: 0.82 })
  );
  windowBelt.scale.set(widthX + 0.02, heightY * 0.2, lenZ * 0.84);
  windowBelt.position.y = heightY * 0.66;
  group.add(windowBelt);

  const wind = new THREE.Mesh(
    geos.unitPlane,
    makeBasicMat({ color: 0x022c22, opacity: 0.92 })
  );
  wind.scale.set(widthX * 0.74, heightY * 0.32, 1);
  wind.position.set(0, heightY * 0.68, lenZ * 0.5 + 0.015);
  group.add(wind);

  const hlColor = moving ? 0xfef08a : pal.accent;
  for (const sx of [-0.46, 0.46]) {
    const lamp = new THREE.Mesh(geos.lamp, makeBasicMat({ color: hlColor, opacity: 1.0 }));
    lamp.position.set(sx, heightY * 0.28, lenZ * 0.5 + 0.04);
    group.add(lamp);

    if (moving && glowTex) {
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xfef08a,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      halo.material.userData.baseOpacity = 0.85;
      halo.position.set(sx, heightY * 0.28, lenZ * 0.5 + 0.16);
      halo.scale.set(1.75, 1.75, 1);
      group.add(halo);
    }
  }

  return group;
}

function buildEntityMesh3D(ent, glowTex, geos) {
  if (ent.kind === "train") {
    const exactLenZ = Math.max(0.18, (ent.zEnd ?? ent.z + 0.28) - ent.z) * WORLD_DEPTH;
    return buildTrainMesh3D(ent.colorVariant || 0, Boolean(ent.moving), glowTex, exactLenZ, geos);
  }

  if (ent.kind === "ramp") {
    const group = new THREE.Group();
    const lenZ = ((ent.zEnd ?? ent.z + 0.14) - ent.z) * WORLD_DEPTH;
    const hY = TRAIN_ROOF_Y * Y_SCALE;
    const hyp = Math.hypot(lenZ, hY);
    const angle = Math.atan2(hY, lenZ);

    const plank = new THREE.Mesh(
      geos.unitBox,
      makeSolidMat({
        color: 0x34d399,
        emissive: 0x10b981,
        emissiveIntensity: 0.5,
        metalness: 0.4,
        roughness: 0.25,
        opacity: 1.0,
      })
    );
    plank.scale.set(1.7, 0.16, hyp);
    plank.rotation.x = angle;
    plank.position.set(0, hY * 0.5, 0);
    group.add(plank);
    return group;
  }

  if (ent.kind === "low_barrier") {
    const group = new THREE.Group();
    const bar = new THREE.Mesh(
      geos.barrierBar,
      makeSolidMat({
        color: 0x4ade80,
        emissive: 0x16a34a,
        emissiveIntensity: 0.72,
        roughness: 0.2,
        opacity: 1.0,
      })
    );
    bar.position.y = 0.75;
    group.add(bar);

    for (const sx of [-0.65, 0.65]) {
      const leg = new THREE.Mesh(geos.barrierLeg, makeSolidMat({ color: 0x065f46, opacity: 1.0 }));
      leg.position.set(sx, 0.38, 0);
      group.add(leg);
    }
    return group;
  }

  if (ent.kind === "high_gate") {
    const group = new THREE.Group();
    const beamY = 2.45;
    for (const sx of [-0.82, 0.82]) {
      const post = new THREE.Mesh(
        geos.gatePost,
        makeSolidMat({ color: 0x064e3b, metalness: 0.6, roughness: 0.3, opacity: 1.0 })
      );
      post.position.set(sx, 1.6, 0);
      group.add(post);
    }
    const sign = new THREE.Mesh(
      geos.gateSign,
      makeSolidMat({
        color: 0x10b981,
        emissive: 0x34d399,
        emissiveIntensity: 0.85,
        opacity: 0.88,
      })
    );
    sign.position.y = beamY;
    group.add(sign);
    return group;
  }

  if (ent.kind === "coin") {
    const coin = new THREE.Mesh(
      geos.coin,
      makeSolidMat({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.95,
        metalness: 0.8,
        roughness: 0.2,
        opacity: 1.0,
      })
    );
    coin.rotation.x = Math.PI / 2;
    return coin;
  }

  const pCols = {
    magnet: 0xf43f5e,
    multiplier: 0xfbbf24,
    jetpack: 0x38bdf8,
    board_pickup: 0x22d3ee,
    sneakers: 0x4ade80,
  };
  const col = pCols[ent.kind] || 0x34d399;
  const pGroup = new THREE.Group();
  const cube = new THREE.Mesh(
    geos.power,
    makeSolidMat({ color: col, emissive: col, emissiveIntensity: 1.35, opacity: 1.0 })
  );
  pGroup.add(cube);

  if (glowTex) {
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: col,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    halo.material.userData.baseOpacity = 0.8;
    halo.scale.setScalar(1.65);
    pGroup.add(halo);
  }
  return pGroup;
}

function buildArticulatedRunner3D(glowTex) {
  const root = new THREE.Group();
  const bodyTilt = new THREE.Group();
  root.add(bodyTilt);

  const torsoMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.55,
    metalness: 0.35,
    roughness: 0.32,
  });
  const limbMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, metalness: 0.45, roughness: 0.42 });
  const trimMat = new THREE.MeshBasicMaterial({ color: 0x6ee7b7 });
  const scarfMat = new THREE.MeshBasicMaterial({ color: 0xa7f3d0 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xf0fdf4, roughness: 0.26, metalness: 0.08 });

  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.2, 12), limbMat);
  pelvis.position.y = 0.78;
  bodyTilt.add(pelvis);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.34, 8, 14), torsoMat);
  torso.position.y = 1.15;
  torso.scale.set(1.12, 1.0, 0.72);
  bodyTilt.add(torso);

  const chestCore = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 12), trimMat);
  chestCore.rotation.x = Math.PI / 2;
  chestCore.position.set(0, 1.24, -0.17);
  bodyTilt.add(chestCore);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 16), headMat);
  head.position.y = 1.68;
  bodyTilt.add(head);

  const visor = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.22, 6, 10), trimMat);
  visor.rotation.z = Math.PI / 2;
  visor.position.set(0, 1.69, -0.19);
  bodyTilt.add(visor);

  // Flowing 3-link trailing surfer scarf
  const scarfA = new THREE.Group();
  scarfA.position.set(0, 1.44, 0.18);
  const sMeshA = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.34), scarfMat);
  sMeshA.position.z = 0.16;
  scarfA.add(sMeshA);
  const scarfB = new THREE.Group();
  scarfB.position.z = 0.32;
  const sMeshB = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.34), trimMat);
  sMeshB.position.z = 0.16;
  scarfB.add(sMeshB);
  scarfA.add(scarfB);
  bodyTilt.add(scarfA);

  // Articulated 2-joint Capsule Legs (Hip + Knee + Shin + Sneakers)
  const buildLeg = (sx) => {
    const hip = new THREE.Group();
    hip.position.set(sx, 0.76, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.24, 6, 10), limbMat);
    thigh.position.y = -0.18;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.36;
    const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.24, 6, 10), torsoMat);
    calf.position.y = -0.18;
    knee.add(calf);
    hip.add(knee);
    return { hip, knee };
  };
  const legLeft = buildLeg(-0.15);
  const legRight = buildLeg(0.15);
  bodyTilt.add(legLeft.hip, legRight.hip);

  // Articulated 2-joint Capsule Arms (Shoulder + Elbow + Forearm)
  const buildArm = (sx) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx, 1.38, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.2, 6, 10), torsoMat);
    upper.position.y = -0.14;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.28;
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.2, 6, 10), limbMat);
    fore.position.y = -0.14;
    elbow.add(fore);
    shoulder.add(elbow);
    return { shoulder, elbow };
  };
  const armLeft = buildArm(-0.36);
  const armRight = buildArm(0.36);
  bodyTilt.add(armLeft.shoulder, armRight.shoulder);

  const sneakerMat = new THREE.MeshBasicMaterial({ color: 0x86efac, visible: false });
  const shoeL = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.16, 6, 10), sneakerMat);
  shoeL.rotation.x = Math.PI / 2;
  shoeL.position.set(0, -0.34, -0.06);
  const shoeR = shoeL.clone();
  legLeft.knee.add(shoeL);
  legRight.knee.add(shoeR);

  const boardGroup = new THREE.Group();
  const deck = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 1.12, 8, 12),
    new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 1.35 })
  );
  deck.rotation.x = Math.PI / 2;
  deck.scale.set(1.0, 1.0, 0.2);
  deck.position.y = 0.12;
  boardGroup.add(deck);
  const shieldDome = new THREE.Mesh(
    new THREE.SphereGeometry(1.18, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x6ee7b7, transparent: true, opacity: 0.22, wireframe: true })
  );
  shieldDome.position.y = 1.0;
  boardGroup.add(shieldDome);
  boardGroup.visible = false;
  bodyTilt.add(boardGroup);

  const jetGroup = new THREE.Group();
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.72, roughness: 0.22 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x6ee7b7 });
  const flames = [];
  for (const sx of [-0.14, 0.14]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.52, 10), tankMat);
    tank.position.set(sx, 1.15, 0.24);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.72, 10), flameMat);
    flame.rotation.x = Math.PI;
    flame.position.set(sx, 0.54, 0.24);
    jetGroup.add(tank, flame);
    flames.push(flame);
  }
  jetGroup.visible = false;
  bodyTilt.add(jetGroup);

  const dropHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x34d399,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  dropHalo.position.set(0, 0.1, 0);
  dropHalo.scale.set(1.9, 1.9, 1);

  root.userData = {
    bodyTilt,
    legLeft,
    legRight,
    armLeft,
    armRight,
    scarfA,
    scarfB,
    sneakerMat,
    boardGroup,
    shieldDome,
    jetGroup,
    flames,
    dropHalo,
    mats: { torsoMat, limbMat, trimMat, scarfMat, headMat },
  };
  return root;
}

const TornadoSurfers3DScene = ({
  simRef,
  characterId = "vanguard",
  onStep,
  onSwipeMove,
  onSwipeJump,
  onSwipeSlide,
  onDoubleTap,
}) => {
  const mountRef = useRef(null);
  const pointerDragRef = useRef(null);
  const lastTapRef = useRef(0);
  const characterIdRef = useRef(characterId);

  useEffect(() => {
    characterIdRef.current = characterId;
  }, [characterId]);

  const callbacksRef = useRef({ onStep, onSwipeMove, onSwipeJump, onSwipeSlide, onDoubleTap });
  useEffect(() => {
    callbacksRef.current = { onStep, onSwipeMove, onSwipeJump, onSwipeSlide, onDoubleTap };
  }, [onStep, onSwipeMove, onSwipeJump, onSwipeSlide, onDoubleTap]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x031712);
    scene.fog = new THREE.FogExp2(0x04241b, 0.011);

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 560;
    const isLowEnd =
      width < 768 ||
      (typeof navigator !== "undefined" && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);

    const aspect = width / Math.max(1, height);
    const camera = new THREE.PerspectiveCamera(aspect < 0.75 ? 66 : 58, aspect, 0.1, isLowEnd ? 78 : 95);
    camera.position.set(0, 4.3, 6.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isLowEnd,
      powerPreference: isLowEnd ? "default" : "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isLowEnd ? 1.15 : 1.5));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = isLowEnd ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x6ee7b7, 0x052e23, 1.25));
    const dirLight = new THREE.DirectionalLight(0xecfdf5, 1.65);
    dirLight.position.set(6, 16, 10);
    scene.add(dirLight);

    const runnerLight = new THREE.PointLight(0x34d399, 2.2, 9);
    scene.add(runnerLight);

    const glowTex = createGlowHaloTexture();
    const bTexEmerald = createSkyscraperTexture("#10b981");
    const bTexMint = createSkyscraperTexture("#6ee7b7");
    const geos = createSharedGeos();

    const trackFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(10.5, 76),
      new THREE.MeshStandardMaterial({ color: 0x041d17, metalness: 0.4, roughness: 0.65 })
    );
    trackFloor.rotation.x = -Math.PI / 2;
    trackFloor.position.set(0, 0, -28);
    scene.add(trackFloor);

    // Clean raised side embankments grounding the skyline towers
    const bankMat = new THREE.MeshStandardMaterial({ color: 0x03221a, metalness: 0.3, roughness: 0.72 });
    for (const bx of [-6.8, 6.8]) {
      const bank = new THREE.Mesh(geos.unitBox, bankMat);
      bank.scale.set(4.6, 0.6, 76);
      bank.position.set(bx, 0.25, -28);
      scene.add(bank);
    }

    const railMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    for (const laneIdx of [-1, 0, 1]) {
      for (const offset of [-0.55, 0.55]) {
        const rail = new THREE.Mesh(geos.unitBox, railMat);
        rail.scale.set(0.08, 0.06, 76);
        rail.position.set(laneIdx * LANE_WIDTH + offset, 0.03, -28);
        scene.add(rail);
      }
    }
    const stripMatCenter = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const stripMatEdge = new THREE.MeshBasicMaterial({ color: 0x6ee7b7 });
    for (const edgeX of [-3.7, -1.22, 1.22, 3.7]) {
      const strip = new THREE.Mesh(geos.unitBox, Math.abs(edgeX) > 3 ? stripMatEdge : stripMatCenter);
      strip.scale.set(0.06, 0.04, 76);
      strip.position.set(edgeX, 0.04, -28);
      scene.add(strip);
    }

    const sunOrb = new THREE.Mesh(
      new THREE.CircleGeometry(7.8, 32),
      new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.42 })
    );
    sunOrb.position.set(0, 8.2, -55);
    scene.add(sunOrb);

    const sleeperCount = isLowEnd ? 12 : 20;
    const sleeperStep = isLowEnd ? 4.2 : 2.8;
    const sleeperGroup = new THREE.Group();
    const sleeperMeshes = [];
    const sleeperGeo = new THREE.BoxGeometry(8.2, 0.04, 0.28);
    const sleeperMat = new THREE.MeshBasicMaterial({ color: 0x064e3b });
    for (let i = 0; i < sleeperCount; i++) {
      const m = new THREE.Mesh(sleeperGeo, sleeperMat);
      m.position.set(0, 0.015, -i * sleeperStep + 4);
      sleeperGroup.add(m);
      sleeperMeshes.push(m);
    }
    scene.add(sleeperGroup);

    const sceneryGroup = new THREE.Group();
    const gantryArches = [];
    const buildings = [];
    const archCount = isLowEnd ? 4 : 6;
    const archSpacing = isLowEnd ? 13.5 : 9.5;
    const archPostMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, metalness: 0.6 });
    const bMatEmerald = new THREE.MeshBasicMaterial({ map: bTexEmerald });
    const bMatMint = new THREE.MeshBasicMaterial({ map: bTexMint });
    for (let i = 0; i < archCount; i++) {
      const gz = -i * archSpacing;
      const arch = new THREE.Group();
      const beamMat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x34d399 : 0x6ee7b7 });
      for (const sx of [-4.1, 4.1]) {
        const post = new THREE.Mesh(geos.unitBox, archPostMat);
        post.scale.set(0.24, 6.2, 0.3);
        post.position.set(sx, 3.1, 0);
        arch.add(post);
      }
      const top = new THREE.Mesh(geos.unitBox, beamMat);
      top.scale.set(8.4, 0.24, 0.35);
      top.position.set(0, 6.2, 0);
      arch.add(top);
      arch.position.z = gz;
      sceneryGroup.add(arch);
      gantryArches.push(arch);

      for (const side of [-1, 1]) {
        const h = 9 + ((i * 7 + (side > 0 ? 3 : 1)) % 8);
        const b = new THREE.Mesh(
          geos.unitBox,
          (i + (side > 0 ? 1 : 0)) % 2 === 0 ? bMatEmerald : bMatMint
        );
        b.scale.set(3.2, h, 4.0);
        b.position.set(side * 6.8, h * 0.5 - 0.5, gz - 2);
        sceneryGroup.add(b);
        buildings.push(b);
      }
    }
    scene.add(sceneryGroup);

    // High-speed emerald wind streaks streaming cleanly along track outer edges
    const windStreaks = [];
    const streakCount = isLowEnd ? 6 : 16;
    const streakSpacing = isLowEnd ? 8.0 : 4.2;
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0x6ee7b7,
      transparent: true,
      opacity: 0.42,
    });
    for (let i = 0; i < streakCount; i += 1) {
      const ws = new THREE.Mesh(geos.unitBox, streakMat);
      ws.scale.set(0.035, 0.035, 2.6 + (i % 3) * 1.4);
      ws.position.set((i % 2 === 0 ? -1 : 1) * (4.4 + (i % 4) * 0.65), 1.0 + (i % 5) * 0.9, -i * streakSpacing);
      scene.add(ws);
      windStreaks.push(ws);
    }

    const runnerMesh = buildArticulatedRunner3D(isLowEnd ? null : glowTex);
    scene.add(runnerMesh);
    scene.add(runnerMesh.userData.dropHalo);

    const chaserGroup = new THREE.Group();
    const droneBody = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42, 0),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 1.5 })
    );
    const droneRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.05, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xfb7185 })
    );
    chaserGroup.add(droneBody, droneRing);
    chaserGroup.visible = false;
    scene.add(chaserGroup);

    const entityLayer = new THREE.Group();
    scene.add(entityLayer);
    const entityMeshMap = new Map();
    const exitingMeshes = [];

    const sparksLayer = new THREE.Group();
    scene.add(sparksLayer);
    const activeSparks = [];

    const popupsLayer = new THREE.Group();
    scene.add(popupsLayer);
    const popupTexCache = new Map();
    const popupSpriteMap = new Map();

    const resizeObserver = new ResizeObserver(() => {
      const nw = container.clientWidth || 640;
      const nh = container.clientHeight || 560;
      const na = nw / Math.max(1, nh);
      camera.fov = na < 0.75 ? 66 : 58;
      camera.aspect = na;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    resizeObserver.observe(container);

    let rafId;
    let lastTime = performance.now();
    const clock = new THREE.Clock();
    let wasAirborne = false;
    let landSquash = 0;
    let appliedCharId = null;

    const animate = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const elapsed = clock.getElapsedTime();

      if (appliedCharId !== characterIdRef.current) {
        appliedCharId = characterIdRef.current;
        const spec = RUNNER_CHARACTERS.find((c) => c.id === appliedCharId) || RUNNER_CHARACTERS[0];
        const { torsoMat, limbMat, trimMat, scarfMat, headMat } = runnerMesh.userData.mats;
        torsoMat.color.setHex(spec.colors.torso);
        torsoMat.emissive.setHex(spec.colors.emissive);
        limbMat.color.setHex(spec.colors.limb);
        trimMat.color.setHex(spec.colors.trim);
        scarfMat.color.setHex(spec.colors.scarf);
        headMat.color.setHex(spec.colors.head);
      }

      callbacksRef.current.onStep?.(dt);
      const s = simRef.current;

      const scrollStep = s.phase === "playing" ? s.speed * WORLD_DEPTH * dt : 0;
      for (const m of sleeperMeshes) {
        m.position.z += scrollStep;
        if (m.position.z > 6) m.position.z -= sleeperCount * sleeperStep;
      }
      for (const a of gantryArches) {
        a.position.z += scrollStep;
        if (a.position.z > 8) a.position.z -= archCount * archSpacing;
      }
      for (const b of buildings) {
        b.position.z += scrollStep;
        if (b.position.z > 8) b.position.z -= archCount * archSpacing;
      }
      for (const ws of windStreaks) {
        ws.position.z += scrollStep * 1.45;
        if (ws.position.z > 8) ws.position.z -= streakCount * streakSpacing;
      }

      const rx = s.laneX * LANE_WIDTH;
      const ry = s.y * Y_SCALE;
      const floorY = s.groundY * Y_SCALE;

      const {
        bodyTilt,
        legLeft,
        legRight,
        armLeft,
        armRight,
        scarfA,
        scarfB,
        sneakerMat,
        boardGroup,
        shieldDome,
        jetGroup,
        flames,
        dropHalo,
      } = runnerMesh.userData;

      const sliding = s.slideTimer > 0;
      const jumping = s.y > s.groundY + 0.08 && s.jetpackTimer <= 0;
      const jetting = s.jetpackTimer > 0;
      const surfing = s.hoverboardTimer > 0;

      if (wasAirborne && !jumping && !jetting) {
        landSquash = 1.0;
      }
      wasAirborne = jumping || jetting;
      landSquash = Math.max(0, landSquash - dt * 6.5);

      const stride = Math.sin(s.stridePhase);
      const groundBob = !jumping && !sliding && !jetting && !surfing && s.phase === "playing" ? Math.abs(stride) * 0.1 : 0;

      runnerMesh.position.set(rx, ry + groundBob, 0);
      runnerLight.position.set(rx, ry + 1.4, 0.4);
      runnerMesh.visible = s.invulnTimer <= 0 || Math.floor(elapsed * 18) % 2 === 0;

      // Dynamic multi-stance body posture (Sprint, Slide, Jump, Hoverboard Carve, Jetpack Flight)
      const squashScale = 1 - landSquash * 0.18;
      bodyTilt.rotation.z = s.leanAngle;
      bodyTilt.rotation.y = surfing ? 0.52 : !jumping && !sliding ? stride * 0.14 : 0;
      bodyTilt.rotation.x = sliding ? -0.98 : jetting ? 0.34 : jumping ? 0.16 : 0.12;
      bodyTilt.scale.y = (sliding ? 0.64 : 1.0) * squashScale;

      if (sliding) {
        legLeft.hip.rotation.x = 0.65;
        legLeft.knee.rotation.x = -0.35;
        legRight.hip.rotation.x = -0.25;
        legRight.knee.rotation.x = -0.85;
        armLeft.shoulder.rotation.x = -0.5;
        armLeft.elbow.rotation.x = 0.7;
        armRight.shoulder.rotation.x = -0.3;
        armRight.elbow.rotation.x = 0.8;
      } else if (jetting) {
        legLeft.hip.rotation.x = -0.22;
        legLeft.knee.rotation.x = -0.45;
        legRight.hip.rotation.x = -0.1;
        legRight.knee.rotation.x = -0.25;
        armLeft.shoulder.rotation.x = 0.4;
        armLeft.elbow.rotation.x = 0.35;
        armRight.shoulder.rotation.x = 0.4;
        armRight.elbow.rotation.x = 0.35;
      } else if (surfing) {
        legLeft.hip.rotation.x = 0.35;
        legLeft.knee.rotation.x = -0.55;
        legRight.hip.rotation.x = -0.35;
        legRight.knee.rotation.x = -0.45;
        armLeft.shoulder.rotation.x = 0.15;
        armLeft.shoulder.rotation.z = -0.45;
        armLeft.elbow.rotation.x = 0.35;
        armRight.shoulder.rotation.x = -0.15;
        armRight.shoulder.rotation.z = 0.45;
        armRight.elbow.rotation.x = 0.35;
      } else if (jumping) {
        legLeft.hip.rotation.x = 0.75;
        legLeft.knee.rotation.x = -1.15;
        legRight.hip.rotation.x = -0.35;
        legRight.knee.rotation.x = -0.55;
        armLeft.shoulder.rotation.x = -0.65;
        armLeft.shoulder.rotation.z = -0.35;
        armLeft.elbow.rotation.x = 0.65;
        armRight.shoulder.rotation.x = 0.55;
        armRight.shoulder.rotation.z = 0.35;
        armRight.elbow.rotation.x = 0.65;
      } else {
        // Fluid 2-joint athletic sprint cycle
        const lSwing = stride * 0.85;
        const rSwing = -stride * 0.85;
        legLeft.hip.rotation.x = lSwing;
        legLeft.knee.rotation.x = -Math.max(0.08, -stride * 0.95);
        legRight.hip.rotation.x = rSwing;
        legRight.knee.rotation.x = -Math.max(0.08, stride * 0.95);
        armLeft.shoulder.rotation.x = -stride * 0.78;
        armLeft.shoulder.rotation.z = -0.08;
        armLeft.elbow.rotation.x = 0.75 + stride * 0.18;
        armRight.shoulder.rotation.x = stride * 0.78;
        armRight.shoulder.rotation.z = 0.08;
        armRight.elbow.rotation.x = 0.75 - stride * 0.18;
      }

      // Fluttering wind scarf trail
      const scarfSpeed = s.phase === "playing" ? 13 : 3.5;
      scarfA.rotation.x = 0.25 + Math.sin(elapsed * scarfSpeed) * 0.18;
      scarfA.rotation.y = -s.leanAngle * 0.7;
      scarfB.rotation.x = Math.sin(elapsed * scarfSpeed - 1.1) * 0.24;

      sneakerMat.visible = s.sneakersTimer > 0;
      boardGroup.visible = surfing;
      if (surfing) {
        boardGroup.rotation.z = -s.leanAngle * 1.15;
        shieldDome.rotation.y = elapsed * 2.0;
      }
      jetGroup.visible = jetting;
      if (jetting) {
        flames.forEach((f, idx) => {
          f.scale.y = 0.85 + Math.sin(elapsed * 42 + idx * 1.7) * 0.32;
        });
      }

      dropHalo.position.set(rx, floorY + 0.08, 0);
      const shadowShrink = Math.max(0.4, 1 - Math.max(0, s.y - s.groundY) * 0.25);
      dropHalo.scale.set(1.9 * shadowShrink, 1.9 * shadowShrink, 1);

      if (s.chaserTimer > 0 && s.phase === "playing") {
        chaserGroup.visible = true;
        chaserGroup.position.set(rx, ry + 1.6 + Math.sin(elapsed * 8) * 0.15, 2.3);
        droneRing.rotation.z = elapsed * 6;
      } else {
        chaserGroup.visible = false;
      }

      // Frame-rate independent smooth camera follow + speed-reactive FOV
      const camLerp = 1 - Math.exp(-12 * dt);
      const baseFov = container.clientWidth / Math.max(1, container.clientHeight) < 0.75 ? 66 : 58;
      const speedFovBoost = Math.min(6, (s.speed / BASE_SPEED - 1) * 4.5 + (jetting ? 3 : 0));
      const desiredFov = baseFov + speedFovBoost;
      if (Math.abs(camera.fov - desiredFov) > 0.05) {
        camera.fov += (desiredFov - camera.fov) * camLerp;
        camera.updateProjectionMatrix();
      }
      const shakeMag = s.shakeTimer > 0 ? s.shakeIntensity * (s.shakeTimer / 0.45) : 0;
      const sx = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;
      const sy = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;
      const targetCamZ = jetting ? 7.1 : 6.2;

      camera.position.x += (rx * 0.55 - camera.position.x) * camLerp + sx;
      camera.position.y += (4.35 + ry * 0.78 - camera.position.y) * camLerp + sy;
      camera.position.z += (targetCamZ - camera.position.z) * camLerp;
      camera.lookAt(rx * 0.35, ry * 0.55 + 1.35, -7.5);
      camera.rotation.z += (-s.leanAngle * 0.12 - camera.rotation.z) * camLerp;

      if (s.waveIndex === 0 && s.distance < 0.05 && exitingMeshes.length > 0) {
        while (exitingMeshes.length > 0) {
          const item = exitingMeshes.pop();
          entityLayer.remove(item.mesh);
          disposeGroupMaterials(item.mesh);
        }
      }

      // Track Entity Removal cleanly: only animate pickup/blasted exits; passed obstacles already faded out
      const activeIds = new Set(s.entities.map((e) => e.id));
      for (const [id, entry] of entityMeshMap.entries()) {
        if (!activeIds.has(id)) {
          entityMeshMap.delete(id);
          const shouldFloatExit =
            entry.kind === "coin" ||
            entry.kind === "magnet" ||
            entry.kind === "multiplier" ||
            entry.kind === "jetpack" ||
            entry.kind === "board_pickup" ||
            entry.kind === "sneakers" ||
            entry.lastEz < 3.5; // only if removed mid-track (Shield Blast), NOT passed behind camera!
          if (shouldFloatExit) {
            exitingMeshes.push({
              mesh: entry.mesh,
              kind: entry.kind,
              life: 0.28,
              maxLife: 0.28,
            });
          } else {
            entityLayer.remove(entry.mesh);
            disposeGroupMaterials(entry.mesh);
          }
        }
      }

      for (const ent of s.entities) {
        let entry = entityMeshMap.get(ent.id);
        if (!entry) {
          const mesh = buildEntityMesh3D(ent, isLowEnd ? null : glowTex, geos);
          entityLayer.add(mesh);
          entry = { mesh, kind: ent.kind, lastEz: -40 };
          entityMeshMap.set(ent.id, entry);
        }
        const mesh = entry.mesh;
        const ex = (ent.lane - 1) * LANE_WIDTH;
        const zCenter = ent.zEnd !== undefined ? (ent.z + ent.zEnd) * 0.5 : ent.z;
        const ez = toWorldZ(zCenter);
        entry.lastEz = ez;
        const ey = (ent.y ?? 0) * Y_SCALE;

        mesh.position.set(ex, ey, ez);

        // Smooth far horizon fade-in + near pass-away dissolve once behind camera threshold
        const zTailWorld = toWorldZ(ent.zEnd ?? ent.z);
        const fadeIn = Math.max(0, Math.min(1, (ez + 48) / 14));
        const fadeOutStart = ent.kind === "train" ? 1.0 : 2.2;
        const fadeOutSpan = ent.kind === "train" ? 5.5 : 3.6;
        const fadeOutRef = ent.kind === "train" ? zTailWorld : ez;
        const fadeOut =
          fadeOutRef > fadeOutStart
            ? Math.max(0, Math.min(1, 1 - (fadeOutRef - fadeOutStart) / fadeOutSpan))
            : 1;
        applyMeshAlpha(mesh, fadeIn * fadeOut);

        if (ent.kind === "coin") {
          mesh.rotation.y = elapsed * 5.2 + ent.z * 4;
        } else if (
          ent.kind === "magnet" ||
          ent.kind === "multiplier" ||
          ent.kind === "jetpack" ||
          ent.kind === "board_pickup" ||
          ent.kind === "sneakers"
        ) {
          mesh.rotation.y = elapsed * 3.2;
          mesh.position.y += Math.sin(elapsed * 5 + ent.lane) * 0.16;
        }
      }

      for (let i = exitingMeshes.length - 1; i >= 0; i--) {
        const exItem = exitingMeshes[i];
        exItem.life -= dt;
        if (exItem.life <= 0) {
          entityLayer.remove(exItem.mesh);
          disposeGroupMaterials(exItem.mesh);
          exitingMeshes.splice(i, 1);
          continue;
        }
        const frac = exItem.life / exItem.maxLife;
        exItem.mesh.position.y += dt * 3.2;
        exItem.mesh.scale.setScalar(0.5 + 0.5 * frac);
        applyMeshAlpha(exItem.mesh, frac);
      }

      if (s.burstQueue?.length) {
        const sparkCap = isLowEnd ? 24 : 80;
        while (s.burstQueue.length > 0) {
          const b = s.burstQueue.pop();
          const spawnCount = isLowEnd ? Math.min(4, b.count) : b.count;
          for (let k = 0; k < spawnCount; k++) {
            if (activeSparks.length >= sparkCap) {
              const evicted = activeSparks.shift();
              sparksLayer.remove(evicted.mesh);
              evicted.mesh.material.dispose();
            }
            const sp = new THREE.Mesh(
              geos.spark,
              new THREE.MeshBasicMaterial({ color: b.color, transparent: true, opacity: 1 })
            );
            sp.position.set(b.x * LANE_WIDTH, b.y * Y_SCALE, toWorldZ(b.z));
            sparksLayer.add(sp);
            activeSparks.push({
              mesh: sp,
              vx: (Math.random() - 0.5) * 7,
              vy: 2 + Math.random() * 5,
              vz: (Math.random() - 0.5) * 6,
              life: 0.48,
              maxLife: 0.48,
            });
          }
        }
      }
      for (let i = activeSparks.length - 1; i >= 0; i--) {
        const sp = activeSparks[i];
        sp.life -= dt;
        if (sp.life <= 0) {
          sparksLayer.remove(sp.mesh);
          sp.mesh.material.dispose();
          activeSparks.splice(i, 1);
          continue;
        }
        sp.vy -= 14 * dt;
        sp.mesh.position.x += sp.vx * dt;
        sp.mesh.position.y += sp.vy * dt;
        sp.mesh.position.z += sp.vz * dt;
        if (sp.mesh.position.y < 0.08) {
          sp.mesh.position.y = 0.08;
          sp.vy *= -0.45;
        }
        sp.mesh.rotation.x += dt * 10;
        sp.mesh.material.opacity = Math.max(0, sp.life / sp.maxLife);
      }

      // Pooled Sprites for Popups (zero per-frame allocations!)
      const activePopupIds = new Set(s.popups.map((p) => p.id));
      for (const [pid, sprite] of popupSpriteMap.entries()) {
        if (!activePopupIds.has(pid)) {
          popupsLayer.remove(sprite);
          sprite.material.dispose();
          popupSpriteMap.delete(pid);
        }
      }
      for (const p of s.popups) {
        let sprite = popupSpriteMap.get(p.id);
        if (!sprite) {
          const key = `${p.text}_${p.color}`;
          let tex = popupTexCache.get(key);
          if (!tex) {
            if (popupTexCache.size > 36) {
              const firstKey = popupTexCache.keys().next().value;
              popupTexCache.get(firstKey)?.dispose();
              popupTexCache.delete(firstKey);
            }
            const c = document.createElement("canvas");
            c.width = 256;
            c.height = 64;
            const pctx = c.getContext("2d");
            pctx.font = "900 34px system-ui, sans-serif";
            pctx.textAlign = "center";
            pctx.textBaseline = "middle";
            pctx.strokeStyle = "#022c22";
            pctx.lineWidth = 8;
            pctx.strokeText(p.text, 128, 32);
            pctx.fillStyle = p.color || "#6ee7b7";
            pctx.fillText(p.text, 128, 32);
            tex = new THREE.CanvasTexture(c);
            tex.colorSpace = THREE.SRGBColorSpace;
            popupTexCache.set(key, tex);
          }
          sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: tex,
              transparent: true,
              opacity: 1,
              depthWrite: false,
            })
          );
          sprite.scale.set(2.8, 0.7, 1);
          popupsLayer.add(sprite);
          popupSpriteMap.set(p.id, sprite);
        }
        sprite.position.set(p.x * LANE_WIDTH, p.y * Y_SCALE, 0);
        sprite.material.opacity = Math.max(0, Math.min(1, p.life * 1.4));
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();

      // Exhaustive Three.js heap & WebGL resource cleanup (/memory-leak-debugging)
      const disposedGeos = new Set();
      const disposedMats = new Set();
      scene.traverse((obj) => {
        if (obj.geometry && !disposedGeos.has(obj.geometry)) {
          disposedGeos.add(obj.geometry);
          obj.geometry.dispose();
        }
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m && !disposedMats.has(m)) {
              disposedMats.add(m);
              m.dispose();
            }
          });
        }
      });
      entityMeshMap.clear();
      exitingMeshes.length = 0;
      activeSparks.length = 0;
      popupSpriteMap.clear();
      glowTex.dispose();
      bTexEmerald.dispose();
      bTexMint.dispose();
      Object.values(geos).forEach((g) => g.dispose());
      sleeperGeo.dispose();
      for (const tex of popupTexCache.values()) tex.dispose();
      popupTexCache.clear();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [simRef]);

  const startGesture = (x, y) => {
    pointerDragRef.current = { x, y, didSwipe: false, lastActionAt: 0 };
  };

  const moveGesture = (x, y) => {
    if (!pointerDragRef.current) return;
    const now = performance.now();
    if (now - pointerDragRef.current.lastActionAt < 85) return;
    const dx = x - pointerDragRef.current.x;
    const dy = y - pointerDragRef.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 13) return;
    pointerDragRef.current.didSwipe = true;
    pointerDragRef.current.lastActionAt = now;
    pointerDragRef.current.x = x;
    pointerDragRef.current.y = y;
    if (Math.abs(dx) > Math.abs(dy)) {
      callbacksRef.current.onSwipeMove?.(dx > 0 ? 1 : -1);
    } else if (dy < 0) {
      callbacksRef.current.onSwipeJump?.();
    } else {
      callbacksRef.current.onSwipeSlide?.();
    }
  };

  const endGesture = () => {
    if (!pointerDragRef.current) return;
    if (!pointerDragRef.current.didSwipe) {
      const now = Date.now();
      if (now - lastTapRef.current < 260) {
        callbacksRef.current.onDoubleTap?.();
      }
      lastTapRef.current = now;
    }
    pointerDragRef.current = null;
  };

  return (
    <div
      ref={mountRef}
      onTouchStart={(e) => {
        if (e.touches?.length) startGesture(e.touches[0].clientX, e.touches[0].clientY);
      }}
      onTouchMove={(e) => {
        if (e.touches?.length) moveGesture(e.touches[0].clientX, e.touches[0].clientY);
      }}
      onTouchEnd={endGesture}
      onMouseDown={(e) => startGesture(e.clientX, e.clientY)}
      onMouseMove={(e) => {
        if (e.buttons === 1) moveGesture(e.clientX, e.clientY);
      }}
      onMouseUp={endGesture}
      className="w-full h-full touch-none select-none cursor-pointer"
    />
  );
};

TornadoSurfers3DScene.propTypes = {
  simRef: PropTypes.shape({ current: PropTypes.object }).isRequired,
  characterId: PropTypes.string,
  onStep: PropTypes.func,
  onSwipeMove: PropTypes.func,
  onSwipeJump: PropTypes.func,
  onSwipeSlide: PropTypes.func,
  onDoubleTap: PropTypes.func,
};

export default TornadoSurfers3DScene;

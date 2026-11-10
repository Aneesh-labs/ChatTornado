import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as THREE from "three";
import { createGlowHaloTexture } from "./vortexBastion/textures3D";
import {
  PLAYER_HIT_Z,
  TRAIN_ROOF_Y,
} from "./tornadoSurfersEngine";

const WORLD_DEPTH = 46;
const LANE_WIDTH = 2.45;
const Y_SCALE = 2.6;

function toWorldZ(simZ) {
  return -(simZ - PLAYER_HIT_Z) * WORLD_DEPTH;
}

function createSkyscraperTexture(hueHex) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#070b18";
  ctx.fillRect(0, 0, 128, 256);

  ctx.fillStyle = hueHex;
  for (let y = 12; y < 240; y += 16) {
    for (let x = 12; x < 112; x += 22) {
      if ((x * y) % 5 !== 0) {
        ctx.globalAlpha = 0.25 + ((x + y) % 4) * 0.18;
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

function buildTrainMesh3D(variant = 0, moving = false, glowTex) {
  const palettes = [
    { body: 0x1e293b, roof: 0x334155, accent: 0x06b6d4 },
    { body: 0x311042, roof: 0x4c1d95, accent: 0xf43f5e },
    { body: 0x064e3b, roof: 0x047857, accent: 0xfbbf24 },
  ];
  const pal = palettes[variant % palettes.length];
  const group = new THREE.Group();

  const lenZ = 0.28 * WORLD_DEPTH;
  const heightY = TRAIN_ROOF_Y * Y_SCALE;
  const widthX = 1.78;

  // Main subway car chassis
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(widthX, heightY, lenZ),
    new THREE.MeshStandardMaterial({ color: pal.body, metalness: 0.7, roughness: 0.3 })
  );
  body.position.y = heightY * 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Walkable Bevelled Roof Plate
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 0.94, 0.14, lenZ * 0.96),
    new THREE.MeshStandardMaterial({ color: pal.roof, metalness: 0.5, roughness: 0.4 })
  );
  roof.position.y = heightY + 0.05;
  group.add(roof);

  // Glowing side accent stripes
  const stripeMat = new THREE.MeshBasicMaterial({ color: moving ? 0xfbbf24 : pal.accent });
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(widthX + 0.03, 0.12, lenZ * 0.98), stripeMat);
  stripe.position.y = heightY * 0.35;
  group.add(stripe);

  // Front Windshield + Headlights (pointing +Z toward runner)
  const wind = new THREE.Mesh(
    new THREE.PlaneGeometry(widthX * 0.72, heightY * 0.34),
    new THREE.MeshBasicMaterial({ color: 0x020617 })
  );
  wind.position.set(0, heightY * 0.68, lenZ * 0.5 + 0.01);
  group.add(wind);

  const hlColor = moving ? 0xfef08a : pal.accent;
  for (const sx of [-0.46, 0.46]) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 8),
      new THREE.MeshBasicMaterial({ color: hlColor })
    );
    lamp.position.set(sx, heightY * 0.26, lenZ * 0.5 + 0.02);
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
      halo.position.set(sx, heightY * 0.26, lenZ * 0.5 + 0.15);
      halo.scale.set(1.6, 1.6, 1);
      group.add(halo);
    }
  }

  return group;
}

function buildEntityMesh3D(ent, glowTex) {
  if (ent.kind === "train") {
    return buildTrainMesh3D(ent.colorVariant || 0, Boolean(ent.moving), glowTex);
  }

  if (ent.kind === "ramp") {
    const group = new THREE.Group();
    const lenZ = ((ent.zEnd ?? ent.z + 0.14) - ent.z) * WORLD_DEPTH;
    const hY = TRAIN_ROOF_Y * Y_SCALE;
    const hyp = Math.hypot(lenZ, hY);
    const angle = Math.atan2(hY, lenZ);

    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.16, hyp),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.55,
        metalness: 0.5,
        roughness: 0.35,
      })
    );
    plank.rotation.x = angle;
    plank.position.set(0, hY * 0.5, 0);
    group.add(plank);
    return group;
  }

  if (ent.kind === "low_barrier") {
    const group = new THREE.Group();
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.72, 0.58, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.7 })
    );
    bar.position.y = 0.75;
    bar.castShadow = true;
    group.add(bar);

    for (const sx of [-0.65, 0.65]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.75, 0.24),
        new THREE.MeshStandardMaterial({ color: 0x334155 })
      );
      leg.position.set(sx, 0.38, 0);
      group.add(leg);
    }
    return group;
  }

  if (ent.kind === "high_gate") {
    const group = new THREE.Group();
    const beamY = 2.45;
    const postMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    for (const sx of [-0.82, 0.82]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.2, 0.24), postMat);
      post.position.set(sx, 1.6, 0);
      group.add(post);
    }
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.35, 0.26),
      new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.85,
      })
    );
    sign.position.y = beamY;
    group.add(sign);
    return group;
  }

  if (ent.kind === "coin") {
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.1, 16),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.9,
        metalness: 0.8,
        roughness: 0.2,
      })
    );
    coin.rotation.x = Math.PI / 2;
    return coin;
  }

  // Powerups (magnet, multiplier, jetpack, board_pickup, sneakers)
  const pCols = {
    magnet: 0xf43f5e,
    multiplier: 0xfbbf24,
    jetpack: 0x38bdf8,
    board_pickup: 0x22d3ee,
    sneakers: 0x4ade80,
  };
  const col = pCols[ent.kind] || 0x38bdf8;
  const pGroup = new THREE.Group();
  const cube = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.42, 0),
    new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.5 })
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
    color: 0x6366f1,
    emissive: 0x4f46e5,
    emissiveIntensity: 0.45,
    metalness: 0.3,
    roughness: 0.4,
  });
  const limbMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.5, roughness: 0.5 });

  // Torso jacket
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.72, 0.32), torsoMat);
  torso.position.y = 1.1;
  torso.castShadow = true;
  bodyTilt.add(torso);

  // Head + glowing cyan cyber-visor
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
  );
  head.position.y = 1.66;
  head.castShadow = true;
  bodyTilt.add(head);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.12, 0.14),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee })
  );
  visor.position.set(0, 1.67, -0.18);
  bodyTilt.add(visor);

  // Articulated Arms & Legs
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.2), limbMat);
  legL.position.set(-0.15, 0.42, 0);
  const legR = legL.clone();
  legR.position.x = 0.15;
  bodyTilt.add(legL, legR);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.16), torsoMat);
  armL.position.set(-0.37, 1.05, 0);
  const armR = armL.clone();
  armR.position.x = 0.37;
  bodyTilt.add(armL, armR);

  // Super Sneakers boots aura
  const sneakerMat = new THREE.MeshBasicMaterial({ color: 0x4ade80, visible: false });
  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.34), sneakerMat);
  shoeL.position.set(0, -0.32, -0.04);
  const shoeR = shoeL.clone();
  legL.add(shoeL);
  legR.add(shoeR);

  // Neon Hoverboard + Shield Sphere
  const boardGroup = new THREE.Group();
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.08, 1.45),
    new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x22d3ee, emissiveIntensity: 1.4 })
  );
  deck.position.y = 0.12;
  boardGroup.add(deck);
  const shieldDome = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.22, wireframe: true })
  );
  shieldDome.position.y = 1.0;
  boardGroup.add(shieldDome);
  boardGroup.visible = false;
  bodyTilt.add(boardGroup);

  // Dual-Thruster Jetpack on Back (+Z)
  const jetGroup = new THREE.Group();
  const tankMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, metalness: 0.7, roughness: 0.3 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  for (const sx of [-0.14, 0.14]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 8), tankMat);
    tank.position.set(sx, 1.12, 0.24);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.65, 8), flameMat);
    flame.rotation.x = Math.PI;
    flame.position.set(sx, 0.56, 0.24);
    jetGroup.add(tank, flame);
  }
  jetGroup.visible = false;
  bodyTilt.add(jetGroup);

  // Shadow halo on floor directly under character
  const dropHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  dropHalo.position.set(0, 0.1, 0);
  dropHalo.scale.set(1.8, 1.8, 1);

  root.userData = {
    bodyTilt,
    legL,
    legR,
    armL,
    armR,
    sneakerMat,
    boardGroup,
    shieldDome,
    jetGroup,
    dropHalo,
  };
  return root;
}

const TornadoSurfers3DScene = ({ simRef, onStep, onSwipeMove, onSwipeJump, onSwipeSlide, onDoubleTap }) => {
  const mountRef = useRef(null);
  const touchStartRef = useRef(null);
  const lastTapRef = useRef(0);

  const callbacksRef = useRef({ onStep, onSwipeMove, onSwipeJump, onSwipeSlide, onDoubleTap });
  useEffect(() => {
    callbacksRef.current = { onStep, onSwipeMove, onSwipeJump, onSwipeSlide, onDoubleTap };
  }, [onStep, onSwipeMove, onSwipeJump, onSwipeSlide, onDoubleTap]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050714);
    scene.fog = new THREE.FogExp2(0x110729, 0.021);

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 560;
    const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 90);
    camera.position.set(0, 4.3, 6.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.HemisphereLight(0x38bdf8, 0x1e1b4b, 1.05));
    const dirLight = new THREE.DirectionalLight(0xe0f2fe, 1.7);
    dirLight.position.set(6, 16, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const runnerLight = new THREE.PointLight(0x22d3ee, 2.5, 8);
    scene.add(runnerLight);

    const glowTex = createGlowHaloTexture();
    const bTexCyan = createSkyscraperTexture("#22d3ee");
    const bTexPink = createSkyscraperTexture("#f43f5e");

    // Track Bed & 3 Neon Rail Lanes
    const trackFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(10.5, 70),
      new THREE.MeshStandardMaterial({ color: 0x090f1d, metalness: 0.45, roughness: 0.65 })
    );
    trackFloor.rotation.x = -Math.PI / 2;
    trackFloor.position.set(0, 0, -25);
    trackFloor.receiveShadow = true;
    scene.add(trackFloor);

    // Longitudinal Steel Rails & Neon Lane Dividers
    const railMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
    for (const laneIdx of [-1, 0, 1]) {
      for (const offset of [-0.55, 0.55]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 70), railMat);
        rail.position.set(laneIdx * LANE_WIDTH + offset, 0.03, -25);
        scene.add(rail);
      }
    }
    for (const edgeX of [-3.7, -1.22, 1.22, 3.7]) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.04, 70),
        new THREE.MeshBasicMaterial({ color: Math.abs(edgeX) > 3 ? 0xec4899 : 0x06b6d4 })
      );
      strip.position.set(edgeX, 0.04, -25);
      scene.add(strip);
    }

    // Synth Horizon Sun / Vortex Orb
    const sunOrb = new THREE.Mesh(
      new THREE.CircleGeometry(7.5, 32),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.5 })
    );
    sunOrb.position.set(0, 8.2, -55);
    scene.add(sunOrb);

    // Scrolling Sleepers, Gantry Arches & Skyscrapers
    const sleeperGroup = new THREE.Group();
    const sleeperMeshes = [];
    const sleeperGeo = new THREE.BoxGeometry(8.2, 0.04, 0.28);
    const sleeperMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    for (let i = 0; i < 20; i++) {
      const m = new THREE.Mesh(sleeperGeo, sleeperMat);
      m.position.set(0, 0.015, -i * 2.8 + 4);
      sleeperGroup.add(m);
      sleeperMeshes.push(m);
    }
    scene.add(sleeperGroup);

    const sceneryGroup = new THREE.Group();
    const gantryArches = [];
    const buildings = [];
    for (let i = 0; i < 6; i++) {
      const gz = -i * 9.5;
      const arch = new THREE.Group();
      const postMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6 });
      const beamMat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x06b6d4 : 0xec4899 });
      for (const sx of [-4.1, 4.1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 6.2, 0.3), postMat);
        post.position.set(sx, 3.1, 0);
        arch.add(post);
      }
      const top = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.24, 0.35), beamMat);
      top.position.set(0, 6.2, 0);
      arch.add(top);
      arch.position.z = gz;
      sceneryGroup.add(arch);
      gantryArches.push(arch);

      for (const side of [-1, 1]) {
        const h = 9 + ((i * 7 + (side > 0 ? 3 : 1)) % 8);
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, h, 4.0),
          new THREE.MeshBasicMaterial({ map: (i + (side > 0 ? 1 : 0)) % 2 === 0 ? bTexCyan : bTexPink })
        );
        b.position.set(side * 6.8, h * 0.5 - 0.5, gz - 2);
        sceneryGroup.add(b);
        buildings.push(b);
      }
    }
    scene.add(sceneryGroup);

    // Runner, Shadow & Chaser Enforcer Drone
    const runnerMesh = buildArticulatedRunner3D(glowTex);
    scene.add(runnerMesh);
    scene.add(runnerMesh.userData.dropHalo);

    const chaserGroup = new THREE.Group();
    const droneBody = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42, 0),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 1.5 })
    );
    const droneRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.04, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    droneRing.rotation.x = Math.PI / 2;
    chaserGroup.add(droneBody, droneRing);
    chaserGroup.visible = false;
    scene.add(chaserGroup);

    // Dynamic Entity, Sparks & Sprite Popups Pools
    const entityLayer = new THREE.Group();
    const sparksLayer = new THREE.Group();
    const popupsLayer = new THREE.Group();
    scene.add(entityLayer, sparksLayer, popupsLayer);

    const entityMeshMap = new Map();
    const activeSparks = [];
    const sparkGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const popupTexCache = new Map();

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const nw = container.clientWidth || 380;
      const nh = container.clientHeight || 560;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    resizeObserver.observe(container);

    let rafId;
    let lastTime = performance.now();
    const clock = new THREE.Clock();

    const animate = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const elapsed = clock.getElapsedTime();

      callbacksRef.current.onStep?.(dt);
      const s = simRef.current;

      // Scroll Scenery & Rails seamlessly when playing
      const scrollStep = s.phase === "playing" ? s.speed * WORLD_DEPTH * dt : 0;
      for (const m of sleeperMeshes) {
        m.position.z += scrollStep;
        if (m.position.z > 6) m.position.z -= 20 * 2.8;
      }
      for (const a of gantryArches) {
        a.position.z += scrollStep;
        if (a.position.z > 8) a.position.z -= 6 * 9.5;
      }
      for (const b of buildings) {
        b.position.z += scrollStep;
        if (b.position.z > 8) b.position.z -= 6 * 9.5;
      }

      // Sync Articulated 3D Runner
      const rx = s.laneX * LANE_WIDTH;
      const ry = s.y * Y_SCALE;
      const floorY = s.groundY * Y_SCALE;

      runnerMesh.position.set(rx, ry, 0);
      runnerLight.position.set(rx, ry + 1.4, 0.4);
      runnerMesh.visible = s.invulnTimer <= 0 || Math.floor(elapsed * 18) % 2 === 0;

      const { bodyTilt, legL, legR, armL, armR, sneakerMat, boardGroup, shieldDome, jetGroup, dropHalo } =
        runnerMesh.userData;

      const sliding = s.slideTimer > 0;
      const jumping = s.y > s.groundY + 0.08 && s.jetpackTimer <= 0;
      bodyTilt.rotation.z = s.leanAngle;
      bodyTilt.rotation.x = sliding ? -0.95 : jumping ? 0.18 : 0;
      bodyTilt.scale.y = sliding ? 0.65 : 1.0;

      const stride = Math.sin(s.stridePhase);
      if (sliding || jumping) {
        legL.rotation.x = 0.45;
        legR.rotation.x = -0.35;
        armL.rotation.x = -0.5;
        armR.rotation.x = 0.5;
      } else {
        legL.rotation.x = stride * 0.75;
        legR.rotation.x = -stride * 0.75;
        armL.rotation.x = -stride * 0.65;
        armR.rotation.x = stride * 0.65;
      }

      sneakerMat.visible = s.sneakersTimer > 0;
      boardGroup.visible = s.hoverboardTimer > 0;
      if (s.hoverboardTimer > 0) {
        shieldDome.rotation.y = elapsed * 1.8;
      }
      jetGroup.visible = s.jetpackTimer > 0;

      dropHalo.position.set(rx, floorY + 0.08, 0);
      const shadowShrink = Math.max(0.4, 1 - Math.max(0, s.y - s.groundY) * 0.25);
      dropHalo.scale.set(1.8 * shadowShrink, 1.8 * shadowShrink, 1);

      // Chaser Enforcer Drone behind runner on stumble
      if (s.chaserTimer > 0 && s.phase === "playing") {
        chaserGroup.visible = true;
        chaserGroup.position.set(rx, ry + 1.6 + Math.sin(elapsed * 8) * 0.15, 2.3);
        droneRing.rotation.z = elapsed * 6;
      } else {
        chaserGroup.visible = false;
      }

      // Dynamic Camera Follow + Lane Lean + Screen Shake
      const shakeMag = s.shakeTimer > 0 ? s.shakeIntensity * (s.shakeTimer / 0.45) : 0;
      const sx = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;
      const sy = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;
      camera.position.x += (rx * 0.55 - camera.position.x) * 0.15 + sx;
      camera.position.y += (4.35 + ry * 0.78 - camera.position.y) * 0.12 + sy;
      camera.position.z = s.jetpackTimer > 0 ? 7.1 : 6.2;
      camera.lookAt(rx * 0.35, ry * 0.55 + 1.35, -7.5);

      // Sync Obstacles, Trains, Ramps, Coins & Powerups
      const activeIds = new Set(s.entities.map((e) => e.id));
      for (const [id, mesh] of entityMeshMap.entries()) {
        if (!activeIds.has(id)) {
          entityLayer.remove(mesh);
          entityMeshMap.delete(id);
        }
      }
      for (const ent of s.entities) {
        let mesh = entityMeshMap.get(ent.id);
        if (!mesh) {
          mesh = buildEntityMesh3D(ent, glowTex);
          entityLayer.add(mesh);
          entityMeshMap.set(ent.id, mesh);
        }
        const ex = (ent.lane - 1) * LANE_WIDTH;
        const zCenter = ent.zEnd !== undefined ? (ent.z + ent.zEnd) * 0.5 : ent.z;
        const ez = toWorldZ(zCenter);
        const ey = (ent.y ?? 0) * Y_SCALE;

        mesh.position.set(ex, ey, ez);
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

      // 3D Sparks Bursts
      if (s.burstQueue?.length) {
        while (s.burstQueue.length > 0) {
          const b = s.burstQueue.pop();
          for (let k = 0; k < b.count; k++) {
            const sp = new THREE.Mesh(
              sparkGeo,
              new THREE.MeshBasicMaterial({ color: b.color, transparent: true, opacity: 1 })
            );
            sp.position.set(b.x * LANE_WIDTH, b.y * Y_SCALE, toWorldZ(b.z));
            sparksLayer.add(sp);
            activeSparks.push({
              mesh: sp,
              vx: (Math.random() - 0.5) * 7,
              vy: 2 + Math.random() * 5,
              vz: (Math.random() - 0.5) * 6,
              life: 0.5,
              maxLife: 0.5,
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

      // Floating 3D Sprite Popups
      while (popupsLayer.children.length > 0) {
        const ch = popupsLayer.children.pop();
        ch.material?.dispose();
      }
      for (const p of s.popups) {
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
          pctx.strokeStyle = "#020617";
          pctx.lineWidth = 8;
          pctx.strokeText(p.text, 128, 32);
          pctx.fillStyle = p.color || "#fbbf24";
          pctx.fillText(p.text, 128, 32);
          tex = new THREE.CanvasTexture(c);
          tex.colorSpace = THREE.SRGBColorSpace;
          popupTexCache.set(key, tex);
        }
        const sp = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            opacity: Math.max(0, Math.min(1, p.life * 1.4)),
            depthWrite: false,
          })
        );
        sp.position.set(p.x * LANE_WIDTH, p.y * Y_SCALE, 0);
        sp.scale.set(2.8, 0.7, 1);
        popupsLayer.add(sp);
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.dispose();
      glowTex.dispose();
      bTexCyan.dispose();
      bTexPink.dispose();
      for (const tex of popupTexCache.values()) tex.dispose();
      popupTexCache.clear();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [simRef]);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    const now = Date.now();
    if (now - lastTapRef.current < 260) {
      callbacksRef.current.onDoubleTap?.();
    }
    lastTapRef.current = now;
  };

  const onTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      callbacksRef.current.onSwipeMove?.(dx > 0 ? 1 : -1);
    } else if (dy < 0) {
      callbacksRef.current.onSwipeJump?.();
    } else {
      callbacksRef.current.onSwipeSlide?.();
    }
  };

  return (
    <div
      ref={mountRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="w-full h-full touch-none select-none cursor-pointer"
    />
  );
};

TornadoSurfers3DScene.propTypes = {
  simRef: PropTypes.shape({ current: PropTypes.object }).isRequired,
  onStep: PropTypes.func,
  onSwipeMove: PropTypes.func,
  onSwipeJump: PropTypes.func,
  onSwipeSlide: PropTypes.func,
  onDoubleTap: PropTypes.func,
};

export default TornadoSurfers3DScene;

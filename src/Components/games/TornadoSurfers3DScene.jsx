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

function createTrackBedTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d");

  // Dark slate gravel bed
  ctx.fillStyle = "#031612";
  ctx.fillRect(0, 0, 512, 512);

  // Subtle ballast speckle texture
  for (let i = 0; i < 450; i++) {
    ctx.fillStyle = i % 3 === 0 ? "rgba(16, 185, 129, 0.08)" : "rgba(255, 255, 255, 0.035)";
    const x = (i * 97) % 512;
    const y = (i * 53) % 512;
    ctx.fillRect(x, y, 4 + (i % 5), 3 + (i % 4));
  }

  // Cross railway sleepers per tile (8 per tile)
  for (let row = 0; row < 8; row++) {
    const ry = row * 64 + 18;
    ctx.fillStyle = "#07261f";
    ctx.fillRect(28, ry, 456, 20);
    ctx.fillStyle = "#0b382d";
    ctx.fillRect(28, ry + 2, 456, 4);

    // Rail clip bolts for 3 tracks
    for (const laneCenter of [92, 256, 420]) {
      for (const ro of [-36, 36]) {
        ctx.fillStyle = "#34d399";
        ctx.fillRect(laneCenter + ro - 5, ry + 5, 10, 10);
      }
    }
  }

  // Polished steel rails + neon side channel strips
  for (const laneCenter of [92, 256, 420]) {
    for (const ro of [-36, 36]) {
      const rx = laneCenter + ro;
      ctx.fillStyle = "#042f2e";
      ctx.fillRect(rx - 7, 0, 14, 512);
      ctx.fillStyle = "#34d399";
      ctx.fillRect(rx - 2, 0, 4, 512);
      ctx.fillStyle = "#d1fae5";
      ctx.fillRect(rx - 1, 0, 2, 512);
    }
    // Subtle center energy guide ticks
    ctx.fillStyle = "rgba(16, 185, 129, 0.18)";
    for (let y = 0; y < 512; y += 64) {
      ctx.fillRect(laneCenter - 2, y + 6, 4, 24);
    }
  }

  // Outer glowing curb rails
  ctx.fillStyle = "#6ee7b7";
  ctx.fillRect(6, 0, 6, 512);
  ctx.fillRect(500, 0, 6, 512);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 7.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSkyscraperTexture(hueHex, accentHex = "#a7f3d0") {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#05221c");
  grad.addColorStop(1, "#020e0b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);

  // Horizontal floor ledges + curtain windows
  for (let y = 14; y < 244; y += 14) {
    ctx.fillStyle = "rgba(16, 185, 129, 0.14)";
    ctx.fillRect(6, y + 10, 116, 2);

    for (let x = 12; x < 112; x += 20) {
      const seed = (x * 7 + y * 13) % 11;
      if (seed !== 0 && seed !== 4) {
        ctx.fillStyle = seed % 5 === 0 ? accentHex : hueHex;
        ctx.globalAlpha = 0.28 + (seed % 5) * 0.14;
        ctx.fillRect(x, y, 13, 8);
      }
    }
  }
  ctx.globalAlpha = 1;
  // Side neon pinstripe mullions
  ctx.fillStyle = hueHex;
  ctx.fillRect(2, 0, 3, 256);
  ctx.fillRect(123, 0, 3, 256);
  // Roof crown neon collar
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 2, 128, 5);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSunDiscTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 126);
  grad.addColorStop(0, "rgba(236, 253, 245, 0.95)");
  grad.addColorStop(0.28, "rgba(110, 231, 183, 0.78)");
  grad.addColorStop(0.62, "rgba(16, 185, 129, 0.35)");
  grad.addColorStop(1, "rgba(4, 47, 46, 0.0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Retro scanline cuts in lower half
  ctx.globalCompositeOperation = "destination-out";
  for (let y = 136; y < 245; y += 16) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, y, 256, 4 + (y - 136) * 0.04);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTrainSideTexture(pal, moving) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d");

  ctx.fillStyle = pal.bodyCss;
  ctx.fillRect(0, 0, 256, 128);

  // Metallic lower skirt & upper trim
  ctx.fillStyle = "#021611";
  ctx.fillRect(0, 96, 256, 32);
  ctx.fillStyle = pal.roofCss;
  ctx.fillRect(0, 0, 256, 12);

  // Horizontal livery stripe
  ctx.fillStyle = moving ? "#fbbf24" : pal.accentCss;
  ctx.fillRect(0, 72, 256, 8);
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, 82, 256, 2);
  ctx.globalAlpha = 1;

  // Subway passenger doors & cabin glowing windows
  for (let bay = 0; bay < 4; bay++) {
    const bx = 10 + bay * 62;
    // Door frame
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, 18, 22, 86);
    // Door window
    ctx.fillStyle = pal.glassCss;
    ctx.fillRect(bx + 4, 24, 14, 28);
    // Passenger bay wide window
    ctx.fillStyle = "#04261f";
    ctx.fillRect(bx + 27, 22, 28, 30);
    ctx.fillStyle = pal.glassCss;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(bx + 29, 24, 24, 26);
    ctx.globalAlpha = 1;
    // Diaphragm diagonal shine
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(bx + 32, 26, 6, 22);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTrainFrontTexture(pal, moving) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 192;
  const ctx = c.getContext("2d");

  ctx.fillStyle = pal.bodyCss;
  ctx.fillRect(0, 0, 128, 192);

  // Destination LED board
  ctx.fillStyle = "#020b09";
  ctx.fillRect(22, 14, 84, 18);
  ctx.fillStyle = moving ? "#fbbf24" : "#34d399";
  ctx.font = "900 11px monospace";
  ctx.textAlign = "center";
  ctx.fillText(moving ? "EXPRESS 09" : "METROLINE", 64, 27);

  // Aerodynamic wrap windshield
  ctx.fillStyle = "#021814";
  ctx.fillRect(14, 38, 100, 56);
  ctx.fillStyle = "rgba(167, 243, 208, 0.25)";
  ctx.beginPath();
  ctx.moveTo(22, 42);
  ctx.lineTo(54, 42);
  ctx.lineTo(34, 90);
  ctx.lineTo(18, 90);
  ctx.closePath();
  ctx.fill();

  // Hazard warning chevron stripe on lower nose (especially dramatic on Express trains)
  ctx.fillStyle = "#031612";
  ctx.fillRect(8, 126, 112, 48);
  if (moving) {
    ctx.fillStyle = "#fbbf24";
    for (let x = -20; x < 140; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, 174);
      ctx.lineTo(x + 11, 174);
      ctx.lineTo(x + 25, 146);
      ctx.lineTo(x + 14, 146);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.fillStyle = pal.accentCss;
    ctx.fillRect(14, 152, 100, 8);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSharedGeos() {
  return {
    unitBox: new THREE.BoxGeometry(1, 1, 1),
    unitPlane: new THREE.PlaneGeometry(1, 1),
    lamp: new THREE.SphereGeometry(0.16, 10, 10),
    beamCone: new THREE.ConeGeometry(1.15, 7.2, 14, 1, true),
    coin: new THREE.CylinderGeometry(0.35, 0.35, 0.1, 20),
    coinCore: new THREE.CylinderGeometry(0.22, 0.22, 0.125, 14),
    power: new THREE.OctahedronGeometry(0.42, 0),
    powerRing: new THREE.TorusGeometry(0.62, 0.045, 8, 24),
    spark: new THREE.BoxGeometry(0.15, 0.15, 0.15),
    trailOrb: new THREE.SphereGeometry(0.16, 8, 8),
    shockRing: new THREE.RingGeometry(0.75, 1.05, 28),
    barrierBar: new THREE.BoxGeometry(1.82, 0.62, 0.24),
    barrierLeg: new THREE.BoxGeometry(0.15, 0.78, 0.26),
    gatePost: new THREE.BoxGeometry(0.18, 3.25, 0.26),
    gateSign: new THREE.BoxGeometry(1.88, 1.38, 0.26),
  };
}

const TRAIN_PALETTES = [
  { body: 0x064e3b, roof: 0x10b981, accent: 0x6ee7b7, glass: 0xa7f3d0, bodyCss: "#064e3b", roofCss: "#10b981", accentCss: "#6ee7b7", glassCss: "#a7f3d0" },
  { body: 0x052e23, roof: 0x059669, accent: 0x4ade80, glass: 0x86efac, bodyCss: "#052e23", roofCss: "#059669", accentCss: "#4ade80", glassCss: "#86efac" },
  { body: 0x042f2e, roof: 0x14b8a6, accent: 0xfbbf24, glass: 0xfde68a, bodyCss: "#042f2e", roofCss: "#14b8a6", accentCss: "#fbbf24", glassCss: "#fde68a" },
];

function createTrainTextures() {
  return TRAIN_PALETTES.map((pal) => ({
    staticSide: createTrainSideTexture(pal, false),
    staticFront: createTrainFrontTexture(pal, false),
    movingSide: createTrainSideTexture(pal, true),
    movingFront: createTrainFrontTexture(pal, true),
  }));
}

function buildTrainMesh3D(variant = 0, moving = false, glowTex, lenZ = 0.28 * WORLD_DEPTH, geos, trainTextures) {
  const pal = TRAIN_PALETTES[variant % TRAIN_PALETTES.length];
  const texPair = trainTextures[variant % trainTextures.length];
  const sideTex = moving ? texPair.movingSide : texPair.staticSide;
  const frontTex = moving ? texPair.movingFront : texPair.staticFront;

  const group = new THREE.Group();
  const heightY = TRAIN_ROOF_Y * Y_SCALE;
  const widthX = 1.82;

  // Sculpted chassis core
  const body = new THREE.Mesh(
    geos.unitBox,
    makeSolidMat({ color: pal.body, metalness: 0.62, roughness: 0.24, opacity: 1.0 })
  );
  body.scale.set(widthX, heightY - 0.24, lenZ);
  body.position.y = heightY * 0.5 + 0.12;
  group.add(body);

  // Detailed cabin livery panels on left & right sides
  for (const sx of [-1, 1]) {
    const sidePanel = new THREE.Mesh(
      geos.unitPlane,
      makeBasicMat({ map: sideTex, opacity: 0.96 })
    );
    sidePanel.scale.set(lenZ * 0.98, heightY - 0.28, 1);
    sidePanel.rotation.y = sx * (Math.PI / 2);
    sidePanel.position.set(sx * (widthX * 0.5 + 0.012), heightY * 0.5 + 0.12, 0);
    group.add(sidePanel);
  }

  // Detailed front face livery + destination LED display
  const frontPanel = new THREE.Mesh(
    geos.unitPlane,
    makeBasicMat({ map: frontTex, opacity: 0.98 })
  );
  frontPanel.scale.set(widthX * 0.94, heightY - 0.26, 1);
  frontPanel.position.set(0, heightY * 0.5 + 0.12, lenZ * 0.5 + 0.014);
  group.add(frontPanel);

  // Lower bogie undercarriage & rail wheels silhouette
  const bogie = new THREE.Mesh(
    geos.unitBox,
    makeSolidMat({ color: 0x022c22, metalness: 0.78, roughness: 0.36, opacity: 1.0 })
  );
  bogie.scale.set(widthX * 0.84, 0.28, lenZ * 0.88);
  bogie.position.y = 0.14;
  group.add(bogie);

  // Sloped front aerodynamic cowling / apron
  const apron = new THREE.Mesh(
    geos.unitBox,
    makeSolidMat({ color: moving ? 0xf59e0b : pal.roof, metalness: 0.55, roughness: 0.28, opacity: 1.0 })
  );
  apron.scale.set(widthX * 0.96, 0.36, 0.44);
  apron.rotation.x = 0.34;
  apron.position.set(0, 0.34, lenZ * 0.5 + 0.1);
  group.add(apron);

  // Runnable rooftop deck with glowing safety trim + raised AC units
  const roof = new THREE.Mesh(
    geos.unitBox,
    makeSolidMat({
      color: pal.roof,
      emissive: pal.roof,
      emissiveIntensity: 0.34,
      metalness: 0.5,
      roughness: 0.26,
      opacity: 1.0,
    })
  );
  roof.scale.set(widthX * 0.95, 0.14, lenZ * 0.96);
  roof.position.y = heightY + 0.05;
  group.add(roof);

  // Raised roof HVAC units for rooftop depth (low enough to never confuse player)
  const hvacCount = lenZ > 11 ? 3 : 2;
  for (let i = 0; i < hvacCount; i++) {
    const hvac = new THREE.Mesh(
      geos.unitBox,
      makeSolidMat({ color: 0x022c22, metalness: 0.65, roughness: 0.3, opacity: 1.0 })
    );
    hvac.scale.set(0.88, 0.1, 1.35);
    const offsetZ = ((i + 0.5) / hvacCount - 0.5) * (lenZ * 0.72);
    hvac.position.set(0, heightY + 0.14, offsetZ);
    group.add(hvac);
  }

  // Twin headlights + Express oncoming volumetric beam cones
  const hlColor = moving ? 0xfef08a : pal.accent;
  for (const sx of [-0.48, 0.48]) {
    const lamp = new THREE.Mesh(geos.lamp, makeBasicMat({ color: hlColor, opacity: 1.0 }));
    lamp.position.set(sx, heightY * 0.36, lenZ * 0.5 + 0.04);
    group.add(lamp);

    if (moving) {
      // Dramatic forward sweeping headlight cone on moving Express trains
      const cone = new THREE.Mesh(
        geos.beamCone,
        makeBasicMat({
          color: 0xfde047,
          opacity: 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      cone.rotation.x = Math.PI / 2;
      cone.position.set(sx, heightY * 0.32, lenZ * 0.5 + 3.6);
      group.add(cone);

      if (glowTex) {
        const halo = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTex,
            color: 0xfef08a,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        halo.material.userData.baseOpacity = 0.9;
        halo.position.set(sx, heightY * 0.36, lenZ * 0.5 + 0.18);
        halo.scale.set(2.1, 2.1, 1);
        group.add(halo);
      }
    }
  }

  // Twin crimson rear tail lamps
  for (const sx of [-0.52, 0.52]) {
    const tail = new THREE.Mesh(geos.lamp, makeBasicMat({ color: 0xf43f5e, opacity: 0.95 }));
    tail.scale.setScalar(0.75);
    tail.position.set(sx, heightY * 0.42, -lenZ * 0.5 - 0.03);
    group.add(tail);
  }

  return group;
}

function buildEntityMesh3D(ent, glowTex, geos, trainTextures) {
  if (ent.kind === "train") {
    const exactLenZ = Math.max(0.18, (ent.zEnd ?? ent.z + 0.28) - ent.z) * WORLD_DEPTH;
    return buildTrainMesh3D(ent.colorVariant || 0, Boolean(ent.moving), glowTex, exactLenZ, geos, trainTextures);
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
        emissiveIntensity: 0.65,
        metalness: 0.5,
        roughness: 0.22,
        opacity: 1.0,
      })
    );
    plank.scale.set(1.74, 0.16, hyp);
    plank.rotation.x = angle;
    plank.position.set(0, hY * 0.5, 0);
    group.add(plank);

    // Side boost arrow rails on ramp
    for (const sx of [-0.88, 0.88]) {
      const rail = new THREE.Mesh(
        geos.unitBox,
        makeBasicMat({ color: 0xa7f3d0, opacity: 0.95 })
      );
      rail.scale.set(0.08, 0.24, hyp);
      rail.rotation.x = angle;
      rail.position.set(sx, hY * 0.5 + 0.06, 0);
      group.add(rail);
    }
    return group;
  }

  if (ent.kind === "low_barrier") {
    const group = new THREE.Group();
    const bar = new THREE.Mesh(
      geos.barrierBar,
      makeSolidMat({
        color: 0x4ade80,
        emissive: 0x16a34a,
        emissiveIntensity: 0.85,
        metalness: 0.35,
        roughness: 0.2,
        opacity: 1.0,
      })
    );
    bar.position.y = 0.78;
    group.add(bar);

    // Top bright caution strip
    const rim = new THREE.Mesh(geos.unitBox, makeBasicMat({ color: 0xfef08a, opacity: 0.95 }));
    rim.scale.set(1.8, 0.09, 0.26);
    rim.position.y = 1.1;
    group.add(rim);

    for (const sx of [-0.68, 0.68]) {
      const leg = new THREE.Mesh(geos.barrierLeg, makeSolidMat({ color: 0x065f46, opacity: 1.0 }));
      leg.position.set(sx, 0.39, 0);
      group.add(leg);
    }
    return group;
  }

  if (ent.kind === "high_gate") {
    const group = new THREE.Group();
    const beamY = 2.48;
    for (const sx of [-0.85, 0.85]) {
      const post = new THREE.Mesh(
        geos.gatePost,
        makeSolidMat({ color: 0x064e3b, metalness: 0.65, roughness: 0.28, opacity: 1.0 })
      );
      post.position.set(sx, 1.62, 0);
      group.add(post);
    }
    const sign = new THREE.Mesh(
      geos.gateSign,
      makeSolidMat({
        color: 0x10b981,
        emissive: 0x34d399,
        emissiveIntensity: 0.95,
        opacity: 0.9,
      })
    );
    sign.position.y = beamY;
    group.add(sign);

    // Glowing slide-under bar edge
    const bottomEdge = new THREE.Mesh(geos.unitBox, makeBasicMat({ color: 0xfbbf24, opacity: 0.95 }));
    bottomEdge.scale.set(1.9, 0.1, 0.28);
    bottomEdge.position.y = beamY - 0.68;
    group.add(bottomEdge);
    return group;
  }

  if (ent.kind === "coin") {
    const coinGrp = new THREE.Group();
    const rim = new THREE.Mesh(
      geos.coin,
      makeSolidMat({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.85,
        metalness: 0.88,
        roughness: 0.16,
        opacity: 1.0,
      })
    );
    rim.rotation.x = Math.PI / 2;
    const core = new THREE.Mesh(
      geos.coinCore,
      makeBasicMat({ color: 0xfef08a, opacity: 0.95 })
    );
    core.rotation.x = Math.PI / 2;
    coinGrp.add(rim, core);
    return coinGrp;
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
    makeSolidMat({ color: col, emissive: col, emissiveIntensity: 1.45, opacity: 1.0 })
  );
  const orbitRing = new THREE.Mesh(
    geos.powerRing,
    makeBasicMat({ color: 0xffffff, opacity: 0.85 })
  );
  orbitRing.rotation.x = 0.65;
  pGroup.add(cube, orbitRing);

  if (glowTex) {
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: col,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    halo.material.userData.baseOpacity = 0.85;
    halo.scale.setScalar(1.9);
    pGroup.add(halo);
  }
  pGroup.userData.orbitRing = orbitRing;
  return pGroup;
}

function buildArticulatedRunner3D(glowTex) {
  const root = new THREE.Group();
  const bodyTilt = new THREE.Group();
  const spinPivot = new THREE.Group();
  spinPivot.position.y = 1.05;
  bodyTilt.add(spinPivot);
  root.add(bodyTilt);

  const rig = new THREE.Group();
  rig.position.y = -1.05;
  spinPivot.add(rig);

  const torsoMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.62,
    metalness: 0.42,
    roughness: 0.28,
  });
  const limbMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, metalness: 0.48, roughness: 0.38 });
  const trimMat = new THREE.MeshBasicMaterial({ color: 0x6ee7b7 });
  const scarfMat = new THREE.MeshBasicMaterial({ color: 0xa7f3d0 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xf0fdf4, roughness: 0.22, metalness: 0.14 });

  // Articulated Pelvis + Spine (supports twist counter-rotation)
  const pelvis = new THREE.Group();
  pelvis.position.y = 0.78;
  const pelvisMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.22, 12), limbMat);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.032, 6, 16), trimMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.06;
  pelvis.add(pelvisMesh, belt);
  rig.add(pelvis);

  const upperBody = new THREE.Group();
  upperBody.position.y = 0.86;
  rig.add(upperBody);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.36, 8, 14), torsoMat);
  torso.position.y = 0.3;
  torso.scale.set(1.16, 1.02, 0.72);
  upperBody.add(torso);

  // Cyber Jacket Collar & Reactor Core
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 6, 16), limbMat);
  collar.rotation.x = Math.PI / 2 - 0.18;
  collar.position.set(0, 0.55, 0.02);
  const chestCore = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 12), trimMat);
  chestCore.rotation.x = Math.PI / 2;
  chestCore.position.set(0, 0.38, -0.17);
  upperBody.add(collar, chestCore);

  // Articulated Head + Aero Crest + Wrap Visor
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.82;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 16), headMat);
  const visor = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.24, 6, 12), trimMat);
  visor.rotation.z = Math.PI / 2;
  visor.position.set(0, 0.01, -0.19);
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.32), torsoMat);
  crest.position.set(0, 0.22, 0.04);
  crest.rotation.x = 0.22;
  headGroup.add(head, visor, crest);
  upperBody.add(headGroup);

  // Flowing 3-link trailing surfer scarf / cyber-cape
  const scarfA = new THREE.Group();
  scarfA.position.set(0, 0.56, 0.18);
  const sMeshA = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.055, 0.36), scarfMat);
  sMeshA.position.z = 0.18;
  scarfA.add(sMeshA);
  const scarfB = new THREE.Group();
  scarfB.position.z = 0.34;
  const sMeshB = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.045, 0.38), trimMat);
  sMeshB.position.z = 0.19;
  scarfB.add(sMeshB);
  const scarfC = new THREE.Group();
  scarfC.position.z = 0.36;
  const sMeshC = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 0.34), scarfMat);
  sMeshC.position.z = 0.17;
  scarfC.add(sMeshC);
  scarfB.add(scarfC);
  scarfA.add(scarfB);
  upperBody.add(scarfA);

  // Articulated 2-joint Capsule Legs (Hip + Knee + KneePad + Shin + Glow Sneakers)
  const sneakerMat = new THREE.MeshBasicMaterial({ color: 0x86efac, visible: false });
  const soleMat = new THREE.MeshBasicMaterial({ color: 0x6ee7b7 });
  const buildLeg = (sx) => {
    const hip = new THREE.Group();
    hip.position.set(sx, 0.76, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.098, 0.24, 6, 10), limbMat);
    thigh.position.y = -0.18;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.36;
    const kneePad = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.16), torsoMat);
    kneePad.position.set(0, 0, -0.04);
    const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.24, 6, 10), torsoMat);
    calf.position.y = -0.18;
    const footSole = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.07, 0.28), soleMat);
    footSole.position.set(0, -0.35, -0.05);
    const turboShoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.18, 6, 10), sneakerMat);
    turboShoe.rotation.x = Math.PI / 2;
    turboShoe.position.set(0, -0.34, -0.06);
    knee.add(kneePad, calf, footSole, turboShoe);
    hip.add(knee);
    return { hip, knee };
  };
  const legLeft = buildLeg(-0.15);
  const legRight = buildLeg(0.15);
  rig.add(legLeft.hip, legRight.hip);

  // Articulated 2-joint Capsule Arms (Shoulder Pauldron + Elbow + Forearm + Gauntlet)
  const buildArm = (sx) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx, 0.52, 0);
    const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), torsoMat);
    pauldron.scale.set(1.1, 0.85, 1.1);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.074, 0.2, 6, 10), torsoMat);
    upper.position.y = -0.14;
    shoulder.add(pauldron, upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.28;
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.064, 0.2, 6, 10), limbMat);
    fore.position.y = -0.14;
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.068, 0.08, 10), trimMat);
    cuff.position.y = -0.22;
    elbow.add(fore, cuff);
    shoulder.add(elbow);
    return { shoulder, elbow };
  };
  const armLeft = buildArm(-0.37);
  const armRight = buildArm(0.37);
  upperBody.add(armLeft.shoulder, armRight.shoulder);

  // Antigrav Hoverboard + Thruster Fins + Energy Shield Dome
  const boardGroup = new THREE.Group();
  const deck = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.3, 1.24, 8, 14),
    new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 1.45, metalness: 0.55 })
  );
  deck.rotation.x = Math.PI / 2;
  deck.scale.set(1.05, 1.0, 0.18);
  deck.position.y = 0.11;
  boardGroup.add(deck);
  const boardGlowRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.45, 0.03, 6, 20),
    new THREE.MeshBasicMaterial({ color: 0x6ee7b7, transparent: true, opacity: 0.7 })
  );
  boardGlowRim.rotation.x = Math.PI / 2;
  boardGlowRim.scale.set(0.75, 1.5, 1);
  boardGlowRim.position.y = 0.09;
  boardGroup.add(boardGlowRim);
  const shieldDome = new THREE.Mesh(
    new THREE.SphereGeometry(1.24, 18, 12),
    new THREE.MeshBasicMaterial({ color: 0x6ee7b7, transparent: true, opacity: 0.24, wireframe: true })
  );
  shieldDome.position.y = 1.02;
  boardGroup.add(shieldDome);
  boardGroup.visible = false;
  rig.add(boardGroup);

  // Dual-Nozzle Turbo Jetpack
  const jetGroup = new THREE.Group();
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, metalness: 0.78, roughness: 0.2 });
  const flameOuterMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
  const flameInnerMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const flames = [];
  for (const sx of [-0.14, 0.14]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.54, 12), tankMat);
    tank.position.set(sx, 0.28, 0.25);
    const flameOuter = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.85, 10), flameOuterMat);
    flameOuter.rotation.x = Math.PI;
    flameOuter.position.set(sx, -0.35, 0.25);
    const flameInner = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.52, 10), flameInnerMat);
    flameInner.rotation.x = Math.PI;
    flameInner.position.set(sx, -0.22, 0.25);
    jetGroup.add(tank, flameOuter, flameInner);
    flames.push(flameOuter, flameInner);
  }
  jetGroup.visible = false;
  upperBody.add(jetGroup);

  const dropHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x34d399,
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  dropHalo.position.set(0, 0.1, 0);
  dropHalo.scale.set(2.0, 2.0, 1);

  // Aura ring at surfer feet for Fever / Active Powerup feedback
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const feverAura = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.15, 24), auraMat);
  feverAura.rotation.x = -Math.PI / 2;
  feverAura.position.y = 0.08;
  root.add(feverAura);

  root.userData = {
    bodyTilt,
    spinPivot,
    rig,
    pelvis,
    upperBody,
    headGroup,
    legLeft,
    legRight,
    armLeft,
    armRight,
    scarfA,
    scarfB,
    scarfC,
    sneakerMat,
    soleMat,
    boardGroup,
    shieldDome,
    jetGroup,
    flames,
    dropHalo,
    feverAura,
    auraMat,
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
    const baseBg = new THREE.Color(0x031712);
    const feverBg = new THREE.Color(0x161204);
    scene.background = baseBg.clone();
    scene.fog = new THREE.FogExp2(0x04241b, 0.0105);

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 560;
    const isLowEnd =
      width < 768 ||
      (typeof navigator !== "undefined" && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);

    const aspect = width / Math.max(1, height);
    const camera = new THREE.PerspectiveCamera(aspect < 0.75 ? 66 : 58, aspect, 0.1, isLowEnd ? 84 : 105);
    camera.position.set(0, 4.3, 6.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isLowEnd,
      powerPreference: isLowEnd ? "default" : "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isLowEnd ? 1.2 : 1.65));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = isLowEnd ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    container.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0x86efac, 0x052e23, 1.35);
    scene.add(hemiLight);
    const dirLight = new THREE.DirectionalLight(0xecfdf5, 1.75);
    dirLight.position.set(7, 17, 11);
    scene.add(dirLight);
    const rimLight = new THREE.DirectionalLight(0x34d399, 0.9);
    rimLight.position.set(-8, 8, -14);
    scene.add(rimLight);

    const runnerLight = new THREE.PointLight(0x34d399, 2.5, 11);
    scene.add(runnerLight);

    const glowTex = createGlowHaloTexture();
    const trackTex = createTrackBedTexture();
    const bTexEmerald = createSkyscraperTexture("#10b981", "#6ee7b7");
    const bTexMint = createSkyscraperTexture("#38bdf8", "#a7f3d0");
    const bTexGold = createSkyscraperTexture("#f59e0b", "#fef08a");
    const sunTex = createSunDiscTexture();
    const trainTextures = createTrainTextures();
    const geos = createSharedGeos();

    const disposableTextures = [
      glowTex,
      trackTex,
      bTexEmerald,
      bTexMint,
      bTexGold,
      sunTex,
    ];
    trainTextures.forEach((tt) => {
      disposableTextures.push(tt.staticSide, tt.staticFront, tt.movingSide, tt.movingFront);
    });

    // High-res GPU-scrolling track bed
    const TRACK_LENGTH = 76;
    const trackFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(10.5, TRACK_LENGTH),
      new THREE.MeshStandardMaterial({
        map: trackTex,
        metalness: 0.48,
        roughness: 0.42,
      })
    );
    trackFloor.rotation.x = -Math.PI / 2;
    trackFloor.position.set(0, 0, -28);
    scene.add(trackFloor);

    // Side concrete embankments & raised cable ducts
    const bankMat = new THREE.MeshStandardMaterial({ color: 0x03221a, metalness: 0.35, roughness: 0.65 });
    for (const bx of [-6.8, 6.8]) {
      const bank = new THREE.Mesh(geos.unitBox, bankMat);
      bank.scale.set(4.6, 0.65, TRACK_LENGTH);
      bank.position.set(bx, 0.25, -28);
      scene.add(bank);
    }

    const stripMatCenter = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const stripMatEdge = new THREE.MeshBasicMaterial({ color: 0x6ee7b7 });
    for (const edgeX of [-3.7, -1.22, 1.22, 3.7]) {
      const strip = new THREE.Mesh(geos.unitBox, Math.abs(edgeX) > 3 ? stripMatEdge : stripMatCenter);
      strip.scale.set(0.06, 0.045, TRACK_LENGTH);
      strip.position.set(edgeX, 0.04, -28);
      scene.add(strip);
    }

    // Layered Horizon Cyber-Sun + Distant Atmospheric Halo
    const sunOrb = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sunTex,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    );
    sunOrb.position.set(0, 9.6, -62);
    sunOrb.scale.set(24, 24, 1);
    scene.add(sunOrb);

    const sceneryGroup = new THREE.Group();
    const gantryArches = [];
    const signalPods = [];
    const buildings = [];
    const archCount = isLowEnd ? 5 : 7;
    const archSpacing = isLowEnd ? 11.5 : 8.5;
    const archPostMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, metalness: 0.65, roughness: 0.3 });
    const bMats = [
      new THREE.MeshBasicMaterial({ map: bTexEmerald }),
      new THREE.MeshBasicMaterial({ map: bTexMint }),
      new THREE.MeshBasicMaterial({ map: bTexGold }),
    ];

    for (let i = 0; i < archCount; i++) {
      const gz = -i * archSpacing;
      const arch = new THREE.Group();
      const beamMat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x34d399 : 0x6ee7b7 });
      for (const sx of [-4.15, 4.15]) {
        const post = new THREE.Mesh(geos.unitBox, archPostMat);
        post.scale.set(0.24, 6.4, 0.3);
        post.position.set(sx, 3.2, 0);
        arch.add(post);
      }
      const top = new THREE.Mesh(geos.unitBox, beamMat);
      top.scale.set(8.5, 0.24, 0.35);
      top.position.set(0, 6.3, 0);
      arch.add(top);

      // Signal light pod on each gantry arch
      const podMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
      const pod = new THREE.Mesh(geos.lamp, podMat);
      pod.position.set(i % 2 === 0 ? -3.4 : 3.4, 5.95, 0.22);
      arch.add(pod);
      signalPods.push(podMat);

      arch.position.z = gz;
      sceneryGroup.add(arch);
      gantryArches.push(arch);

      for (const side of [-1, 1]) {
        const h = 10 + ((i * 7 + (side > 0 ? 3 : 1)) % 11);
        const b = new THREE.Mesh(
          geos.unitBox,
          bMats[(i + (side > 0 ? 1 : 0)) % bMats.length]
        );
        b.scale.set(3.4, h, 4.2);
        b.position.set(side * 6.9, h * 0.5 - 0.5, gz - 2);
        sceneryGroup.add(b);
        buildings.push(b);

        if (!isLowEnd) {
          // Outer deep-skyline silhouette tier for parallax richness
          const hFar = h + 6 + ((i * 3) % 7);
          const bFar = new THREE.Mesh(
            geos.unitBox,
            bMats[(i + 2) % bMats.length]
          );
          bFar.scale.set(4.2, hFar, 5.2);
          bFar.position.set(side * 12.2, hFar * 0.5 - 0.5, gz - 4.5);
          sceneryGroup.add(bFar);
          buildings.push(bFar);
        }
      }
    }
    scene.add(sceneryGroup);

    // High-speed cyber wind streaks
    const windStreaks = [];
    const streakCount = isLowEnd ? 8 : 20;
    const streakSpacing = isLowEnd ? 7.2 : 3.8;
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0x6ee7b7,
      transparent: true,
      opacity: 0.45,
    });
    for (let i = 0; i < streakCount; i += 1) {
      const ws = new THREE.Mesh(geos.unitBox, streakMat);
      ws.scale.set(0.04, 0.04, 2.8 + (i % 3) * 1.5);
      ws.position.set((i % 2 === 0 ? -1 : 1) * (4.3 + (i % 4) * 0.7), 0.9 + (i % 5) * 0.95, -i * streakSpacing);
      scene.add(ws);
      windStreaks.push(ws);
    }

    const runnerMesh = buildArticulatedRunner3D(isLowEnd ? null : glowTex);
    scene.add(runnerMesh);
    scene.add(runnerMesh.userData.dropHalo);

    // Articulated Enforcer Chaser Drone with crimson searchlight cone
    const chaserGroup = new THREE.Group();
    const droneBody = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42, 0),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 1.65 })
    );
    const droneRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.055, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xfb7185 })
    );
    const scanCone = new THREE.Mesh(
      geos.beamCone,
      makeBasicMat({
        color: 0xf43f5e,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    scanCone.scale.set(0.75, 0.55, 0.75);
    scanCone.rotation.x = -Math.PI / 2 + 0.15;
    scanCone.position.set(0, -0.25, -2.0);
    chaserGroup.add(droneBody, droneRing, scanCone);
    chaserGroup.visible = false;
    scene.add(chaserGroup);

    const entityLayer = new THREE.Group();
    scene.add(entityLayer);
    const entityMeshMap = new Map();
    const exitingMeshes = [];

    const sparksLayer = new THREE.Group();
    scene.add(sparksLayer);
    const activeSparks = [];

    // Pre-allocated Pooled Trail Orbs (zero per-frame alloc!)
    const trailLayer = new THREE.Group();
    scene.add(trailLayer);
    const trailPoolSize = isLowEnd ? 14 : 28;
    const trailPool = [];
    for (let i = 0; i < trailPoolSize; i++) {
      const tMat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const tMesh = new THREE.Mesh(geos.trailOrb, tMat);
      tMesh.visible = false;
      trailLayer.add(tMesh);
      trailPool.push({ mesh: tMesh, mat: tMat, life: 0, maxLife: 0.35, vx: 0, vy: 0, vz: 0 });
    }
    let trailCursor = 0;
    let trailSpawnAccum = 0;

    // Pre-allocated Shockwave Ring Pool
    const shockwavePool = [];
    for (let i = 0; i < 4; i++) {
      const sMat = new THREE.MeshBasicMaterial({
        color: 0x6ee7b7,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const sMesh = new THREE.Mesh(geos.shockRing, sMat);
      sMesh.rotation.x = -Math.PI / 2;
      sMesh.visible = false;
      scene.add(sMesh);
      shockwavePool.push({ mesh: sMesh, mat: sMat, life: 0, maxLife: 0.42 });
    }
    let shockCursor = 0;
    const triggerShockwave = (x, y, colHex, maxScale = 4.2) => {
      const sw = shockwavePool[shockCursor];
      shockCursor = (shockCursor + 1) % shockwavePool.length;
      sw.mesh.position.set(x, y + 0.14, 0);
      sw.mesh.scale.setScalar(0.45);
      sw.mat.color.setHex(colHex);
      sw.mat.opacity = 0.9;
      sw.life = 0.42;
      sw.maxLife = 0.42;
      sw.maxScale = maxScale;
      sw.mesh.visible = true;
    };

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
    let wasFever = false;
    let wasHover = false;
    let landSquash = 0;
    let flipAngle = 0;
    let flipActive = false;
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

      const playing = s.phase === "playing";
      const scrollStep = playing ? s.speed * WORLD_DEPTH * dt : 0;

      // Silky-smooth GPU UV track bed scrolling (matched to WORLD_DEPTH & 7.5 repeats per TRACK_LENGTH)
      if (playing) {
        trackTex.offset.y -= (scrollStep * 7.5) / TRACK_LENGTH;
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
        ws.position.z += scrollStep * 1.65;
        if (ws.position.z > 8) ws.position.z -= streakCount * streakSpacing;
      }

      const rx = s.laneX * LANE_WIDTH;
      const ry = s.y * Y_SCALE;
      const floorY = s.groundY * Y_SCALE;

      const {
        bodyTilt,
        spinPivot,
        pelvis,
        upperBody,
        headGroup,
        legLeft,
        legRight,
        armLeft,
        armRight,
        scarfA,
        scarfB,
        scarfC,
        sneakerMat,
        soleMat,
        boardGroup,
        shieldDome,
        jetGroup,
        flames,
        dropHalo,
        feverAura,
        auraMat,
      } = runnerMesh.userData;

      const sliding = s.slideTimer > 0;
      const jumping = s.y > s.groundY + 0.08 && s.jetpackTimer <= 0;
      const jetting = s.jetpackTimer > 0;
      const surfing = s.hoverboardTimer > 0;
      const fever = (s.feverTimer || 0) > 0;
      const boots = s.sneakersTimer > 0;

      // Dynamic environment shifts for Fever Overdrive
      scene.background.lerpColors(baseBg, feverBg, fever ? 0.85 : 0.0);
      streakMat.color.setHex(fever ? 0xfbbf24 : jetting ? 0x38bdf8 : 0x6ee7b7);
      runnerLight.color.setHex(fever ? 0xfbbf24 : jetting ? 0x38bdf8 : 0x34d399);
      runnerLight.intensity = fever ? 4.0 : jetting ? 3.4 : 2.4;

      // Animate gantry signal pods
      const expressIncoming = s.entities?.some((e) => e.kind === "train" && e.moving && e.z < 0.7);
      for (let i = 0; i < signalPods.length; i++) {
        if (expressIncoming && Math.floor(elapsed * 8 + i) % 2 === 0) {
          signalPods[i].setHex(0xf43f5e);
        } else if (fever) {
          signalPods[i].setHex(0xfbbf24);
        } else {
          signalPods[i].setHex(i % 2 === 0 ? 0x34d399 : 0x6ee7b7);
        }
      }

      // Detect takeoff / flip / landing moments for fluid motion choreography
      if (!wasAirborne && jumping && !jetting) {
        if (boots || s.groundY > 0.45 || s.vy > 13.5) {
          flipActive = true;
          flipAngle = 0;
        }
      }
      if (wasAirborne && !jumping && !jetting) {
        landSquash = 1.0;
        flipActive = false;
        flipAngle = 0;
        if (s.slamPending || s.groundY > 0.5) {
          triggerShockwave(rx, floorY, fever ? 0xfbbf24 : 0x6ee7b7, 3.4);
        }
      }
      if (!wasFever && fever) {
        triggerShockwave(rx, ry, 0xfbbf24, 6.0);
      }
      if (!wasHover && surfing) {
        triggerShockwave(rx, ry, 0x34d399, 4.4);
      }
      wasAirborne = jumping || jetting;
      wasFever = fever;
      wasHover = surfing;
      landSquash = Math.max(0, landSquash - dt * 7.2);

      if (flipActive && jumping) {
        flipAngle += dt * 11.2;
        if (flipAngle >= Math.PI * 2) {
          flipAngle = 0;
          flipActive = false;
        }
      }

      const stride = Math.sin(s.stridePhase);
      const doubleStride = Math.cos(s.stridePhase * 2);
      const speedNorm = Math.max(0, (s.speed - BASE_SPEED) / BASE_SPEED);
      const groundBob = !jumping && !sliding && !jetting && !surfing && playing ? Math.abs(stride) * 0.13 : (!playing ? Math.sin(elapsed * 3) * 0.03 : 0);

      runnerMesh.position.set(rx, ry + groundBob, 0);
      runnerLight.position.set(rx, ry + 1.5, 0.45);
      runnerMesh.visible = s.invulnTimer <= 0 || Math.floor(elapsed * 20) % 2 === 0;

      // Panic stumble wobble if Chaser locked closely
      const stumbleRoll = s.stumbleTimer > 0 ? Math.sin(elapsed * 34) * 0.16 * (s.stumbleTimer / 0.45) : 0;

      const squashY = 1 - landSquash * 0.22;
      const stretchX = 1 + landSquash * 0.12;
      bodyTilt.rotation.z = s.leanAngle + stumbleRoll;
      bodyTilt.rotation.y = surfing ? 0.72 : !jumping && !sliding && playing ? stride * 0.08 : 0;
      bodyTilt.rotation.x = sliding ? -1.14 : jetting ? 0.58 : jumping ? 0.14 : playing ? 0.16 + speedNorm * 0.06 : 0.02;
      bodyTilt.position.y = sliding ? -0.34 : 0;
      bodyTilt.scale.set(stretchX, (sliding ? 0.72 : 1.0) * squashY, stretchX);

      // 360 Parkour Frontflip during super/rooftop jumps
      spinPivot.rotation.x = flipActive ? -flipAngle : 0;

      // Pelvis & Spine counter-twist + Head turn-lead
      if (playing && !sliding && !jetting && !surfing) {
        pelvis.rotation.y = stride * 0.16;
        upperBody.rotation.y = -stride * 0.24;
        upperBody.position.y = 0.86 + doubleStride * 0.015;
        headGroup.rotation.y = -s.leanAngle * 0.45 + stride * 0.06;
        headGroup.rotation.x = -0.12;
      } else {
        pelvis.rotation.y = 0;
        upperBody.rotation.y = surfing ? -0.52 : 0;
        headGroup.rotation.y = surfing ? -0.22 : -s.leanAngle * 0.4;
        headGroup.rotation.x = jetting ? -0.45 : sliding ? 0.72 : 0;
      }

      if (sliding) {
        // Pro baseball / cyber knee slide
        legLeft.hip.rotation.x = 1.05;
        legLeft.knee.rotation.x = -0.15;
        legRight.hip.rotation.x = -0.15;
        legRight.knee.rotation.x = -1.35;
        armLeft.shoulder.rotation.x = -0.65;
        armLeft.elbow.rotation.x = 0.85;
        armRight.shoulder.rotation.x = 0.9;
        armRight.elbow.rotation.x = 0.3;
      } else if (jetting) {
        // Aero jetpack flight dive
        legLeft.hip.rotation.x = -0.18 + Math.sin(elapsed * 9) * 0.06;
        legLeft.knee.rotation.x = -0.32;
        legRight.hip.rotation.x = -0.06 - Math.sin(elapsed * 9) * 0.06;
        legRight.knee.rotation.x = -0.22;
        armLeft.shoulder.rotation.x = -2.25;
        armLeft.shoulder.rotation.z = -0.28;
        armLeft.elbow.rotation.x = 0.25;
        armRight.shoulder.rotation.x = -2.25;
        armRight.shoulder.rotation.z = 0.28;
        armRight.elbow.rotation.x = 0.25;
      } else if (surfing) {
        // Balanced lateral hoverboard carve
        const carve = Math.sin(elapsed * 6) * 0.08;
        legLeft.hip.rotation.x = 0.42 + carve;
        legLeft.knee.rotation.x = -0.65;
        legRight.hip.rotation.x = -0.42 - carve;
        legRight.knee.rotation.x = -0.55;
        armLeft.shoulder.rotation.x = 0.2;
        armLeft.shoulder.rotation.z = -0.55;
        armLeft.elbow.rotation.x = 0.45;
        armRight.shoulder.rotation.x = -0.2;
        armRight.shoulder.rotation.z = 0.55;
        armRight.elbow.rotation.x = 0.45;
      } else if (jumping) {
        // Expressive parkour tuck
        legLeft.hip.rotation.x = flipActive ? 1.15 : 0.85;
        legLeft.knee.rotation.x = flipActive ? -1.65 : -1.25;
        legRight.hip.rotation.x = flipActive ? 0.85 : -0.38;
        legRight.knee.rotation.x = flipActive ? -1.45 : -0.65;
        armLeft.shoulder.rotation.x = -0.85;
        armLeft.shoulder.rotation.z = -0.42;
        armLeft.elbow.rotation.x = 0.78;
        armRight.shoulder.rotation.x = 0.65;
        armRight.shoulder.rotation.z = 0.42;
        armRight.elbow.rotation.x = 0.72;
      } else if (!playing) {
        // Ready / Hero idle stance
        legLeft.hip.rotation.x = 0.08;
        legLeft.knee.rotation.x = -0.12;
        legRight.hip.rotation.x = -0.08;
        legRight.knee.rotation.x = -0.12;
        armLeft.shoulder.rotation.x = 0.1;
        armLeft.shoulder.rotation.z = -0.14;
        armLeft.elbow.rotation.x = 0.45;
        armRight.shoulder.rotation.x = -0.1;
        armRight.shoulder.rotation.z = 0.14;
        armRight.elbow.rotation.x = 0.45;
      } else {
        // High-energy athletic sprint cycle
        const lSwing = stride * 0.92;
        const rSwing = -stride * 0.92;
        legLeft.hip.rotation.x = lSwing;
        legLeft.knee.rotation.x = -Math.max(0.06, -stride * 1.05);
        legRight.hip.rotation.x = rSwing;
        legRight.knee.rotation.x = -Math.max(0.06, stride * 1.05);
        armLeft.shoulder.rotation.x = -stride * 0.88;
        armLeft.shoulder.rotation.z = -0.1;
        armLeft.elbow.rotation.x = 0.88 + stride * 0.22;
        armRight.shoulder.rotation.x = stride * 0.88;
        armRight.shoulder.rotation.z = 0.1;
        armRight.elbow.rotation.x = 0.88 - stride * 0.22;
      }

      // 3-link fluttering whip scarf reacting to lane carves & airspeed
      const scarfSpeed = playing ? 15 + speedNorm * 6 : 3.8;
      scarfA.rotation.x = 0.28 + Math.sin(elapsed * scarfSpeed) * 0.2;
      scarfA.rotation.y = -s.leanAngle * 0.95;
      scarfB.rotation.x = Math.sin(elapsed * scarfSpeed - 1.1) * 0.28;
      scarfB.rotation.y = -s.leanAngle * 0.55;
      scarfC.rotation.x = Math.sin(elapsed * scarfSpeed - 2.2) * 0.34;

      sneakerMat.visible = boots;
      soleMat.color.setHex(fever ? 0xfbbf24 : boots ? 0x4ade80 : 0x6ee7b7);

      boardGroup.visible = surfing;
      if (surfing) {
        boardGroup.rotation.z = -s.leanAngle * 1.2;
        shieldDome.rotation.y = elapsed * 2.4;
      }
      jetGroup.visible = jetting;
      if (jetting) {
        flames.forEach((f, idx) => {
          f.scale.y = 0.85 + Math.sin(elapsed * 46 + idx * 1.9) * 0.35;
        });
      }

      // Fever ground aura ring
      if (fever || boots) {
        auraMat.color.setHex(fever ? 0xfbbf24 : 0x4ade80);
        auraMat.opacity = 0.42 + Math.sin(elapsed * 10) * 0.18;
        feverAura.scale.setScalar(1.0 + Math.sin(elapsed * 8) * 0.12);
        feverAura.position.y = Math.max(0.06, floorY - ry + 0.08);
      } else {
        auraMat.opacity = 0;
      }

      dropHalo.position.set(rx, floorY + 0.08, 0);
      dropHalo.material.color.setHex(fever ? 0xfbbf24 : 0x34d399);
      const shadowShrink = Math.max(0.4, 1 - Math.max(0, s.y - s.groundY) * 0.25);
      dropHalo.scale.set(2.0 * shadowShrink, 2.0 * shadowShrink, 1);

      if (s.chaserTimer > 0 && playing) {
        chaserGroup.visible = true;
        chaserGroup.position.set(
          rx * 0.85 + Math.sin(elapsed * 5) * 0.25,
          ry + 1.65 + Math.sin(elapsed * 9) * 0.16,
          2.25
        );
        chaserGroup.rotation.y = Math.sin(elapsed * 4) * 0.22;
        droneRing.rotation.z = elapsed * 6.5;
      } else {
        chaserGroup.visible = false;
      }

      // Continuous pooled trail emission behind boots / hoverboard / jetpack / scarf
      if (playing) {
        trailSpawnAccum += dt * (fever || jetting || surfing ? 52 : 24);
        while (trailSpawnAccum >= 1) {
          trailSpawnAccum -= 1;
          const node = trailPool[trailCursor];
          trailCursor = (trailCursor + 1) % trailPool.length;
          const originY = jetting ? ry + 1.05 : surfing ? ry + 0.25 : ry + 0.25;
          node.mesh.position.set(
            rx + (Math.random() - 0.5) * 0.36,
            originY + (Math.random() - 0.5) * 0.18,
            0.35
          );
          node.mat.color.setHex(
            fever ? 0xfbbf24 : jetting ? 0x38bdf8 : surfing ? 0x22d3ee : boots ? 0x4ade80 : 0x34d399
          );
          node.maxLife = jetting || fever ? 0.34 : 0.24;
          node.life = node.maxLife;
          node.vx = (Math.random() - 0.5) * 0.9;
          node.vy = (jetting ? -1.4 : 0.8) + Math.random() * 0.6;
          node.vz = scrollStep / Math.max(0.008, dt) * 0.55;
          node.mesh.scale.setScalar(fever || jetting ? 1.35 : 0.85);
          node.mesh.visible = true;
        }
      }
      for (const node of trailPool) {
        if (!node.mesh.visible) continue;
        node.life -= dt;
        if (node.life <= 0) {
          node.mesh.visible = false;
          continue;
        }
        const frac = node.life / node.maxLife;
        node.mesh.position.x += node.vx * dt;
        node.mesh.position.y += node.vy * dt;
        node.mesh.position.z += node.vz * dt;
        node.mesh.scale.setScalar(0.35 + frac * (fever || jetting ? 1.25 : 0.85));
        node.mat.opacity = frac * 0.65;
      }

      // Shockwave rings animation
      for (const sw of shockwavePool) {
        if (!sw.mesh.visible) continue;
        sw.life -= dt;
        if (sw.life <= 0) {
          sw.mesh.visible = false;
          continue;
        }
        const prog = 1 - sw.life / sw.maxLife;
        sw.mesh.scale.setScalar(0.45 + prog * (sw.maxScale || 4.0));
        sw.mat.opacity = (1 - prog) * 0.85;
      }

      // Dynamic Camera Choreography (speed FOV, turn banking, rooftop pull-back, shake)
      const camLerp = 1 - Math.exp(-12 * dt);
      const baseFov = container.clientWidth / Math.max(1, container.clientHeight) < 0.75 ? 66 : 58;
      const speedFovBoost = Math.min(9, (s.speed / BASE_SPEED - 1) * 5.2 + (jetting ? 4 : 0) + (fever ? 3.5 : 0));
      const desiredFov = baseFov + speedFovBoost;
      if (Math.abs(camera.fov - desiredFov) > 0.05) {
        camera.fov += (desiredFov - camera.fov) * camLerp;
        camera.updateProjectionMatrix();
      }
      const shakeMag = s.shakeTimer > 0 ? s.shakeIntensity * (s.shakeTimer / 0.45) : 0;
      const sx = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;
      const sy = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;
      const targetCamZ = jetting ? 7.35 : s.groundY > 0.45 ? 6.75 : sliding ? 5.85 : 6.2;
      const targetCamY = (sliding ? 3.85 : 4.38) + ry * 0.78;

      camera.position.x += (rx * 0.58 - camera.position.x) * camLerp + sx;
      camera.position.y += (targetCamY - camera.position.y) * camLerp + sy;
      camera.position.z += (targetCamZ - camera.position.z) * camLerp;
      camera.lookAt(rx * 0.36, ry * 0.58 + 1.38, -8.5);
      camera.rotation.z += (-s.leanAngle * 0.14 - camera.rotation.z) * camLerp;

      if (s.waveIndex === 0 && s.distance < 0.05 && exitingMeshes.length > 0) {
        while (exitingMeshes.length > 0) {
          const item = exitingMeshes.pop();
          entityLayer.remove(item.mesh);
          disposeGroupMaterials(item.mesh);
        }
      }

      // Sync Entity Meshes + Smooth Horizon Fade-In / Exit Animations
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
            entry.lastEz < 3.5;
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
          const mesh = buildEntityMesh3D(ent, isLowEnd ? null : glowTex, geos, trainTextures);
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
          mesh.rotation.y = elapsed * 5.6 + ent.z * 6;
          mesh.position.y += Math.sin(elapsed * 6 + ent.z * 12) * 0.08;
        } else if (
          ent.kind === "magnet" ||
          ent.kind === "multiplier" ||
          ent.kind === "jetpack" ||
          ent.kind === "board_pickup" ||
          ent.kind === "sneakers"
        ) {
          mesh.rotation.y = elapsed * 3.4;
          mesh.position.y += Math.sin(elapsed * 5 + ent.lane) * 0.16;
          if (mesh.userData.orbitRing) {
            mesh.userData.orbitRing.rotation.z = elapsed * 4.5;
            mesh.userData.orbitRing.rotation.x = 0.65 + Math.sin(elapsed * 2.5) * 0.4;
          }
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
        exItem.mesh.position.y += dt * 3.8;
        exItem.mesh.scale.setScalar(0.5 + 0.55 * frac);
        applyMeshAlpha(exItem.mesh, frac);
      }

      if (s.burstQueue?.length) {
        const sparkCap = isLowEnd ? 28 : 96;
        while (s.burstQueue.length > 0) {
          const b = s.burstQueue.pop();
          const spawnCount = isLowEnd ? Math.min(5, b.count) : b.count;
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
              vx: (Math.random() - 0.5) * 7.5,
              vy: 2.2 + Math.random() * 5.2,
              vz: (Math.random() - 0.5) * 6.5,
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
        sp.mesh.rotation.x += dt * 11;
        sp.mesh.material.opacity = Math.max(0, sp.life / sp.maxLife);
      }

      // Pooled Sprites for 3D Floating Score/Stunt Popups
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
      disposableTextures.forEach((t) => t.dispose());
      Object.values(geos).forEach((g) => g.dispose());
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

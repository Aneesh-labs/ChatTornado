import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as THREE from "three";
import {
  GRID_COLS,
  GRID_ROWS,
  TILE_SIZE,
  gridToWorld,
  SPAWN_CELL,
  CORE_CELL,
  CELL_OBSTACLE,
} from "./pathfinding";
import {
  createArenaTileTexture,
  createMonolithTexture,
  createVortexPortalTexture,
  createGlowHaloTexture,
  createSubGridTexture,
} from "./textures3D";
import { buildTurretMesh, buildEnemyMesh } from "./meshes3D";
import { TURRET_CATALOG } from "./turretsAndCombat";

const CAMERA_PRESETS = {
  iso: { pitch: 0.92, yaw: 0.0, distMult: 1.0 },
  top: { pitch: 1.44, yaw: 0.0, distMult: 0.94 },
  hero: { pitch: 0.68, yaw: 0.28, distMult: 0.96 },
};

const VortexBastionScene = ({
  simRef,
  activePath,
  previewCell,
  previewValid,
  previewPath,
  previewType = "pulse",
  selectedTowerId = null,
  cameraPreset = "iso",
  onTileTap,
  onTick,
}) => {
  const mountRef = useRef(null);

  const propsRef = useRef({
    activePath,
    previewCell,
    previewValid,
    previewPath,
    previewType,
    selectedTowerId,
    cameraPreset,
    onTileTap,
    onTick,
  });

  useEffect(() => {
    propsRef.current = {
      activePath,
      previewCell,
      previewValid,
      previewPath,
      previewType,
      selectedTowerId,
      cameraPreset,
      onTileTap,
      onTick,
    };
  }, [
    activePath,
    previewCell,
    previewValid,
    previewPath,
    previewType,
    selectedTowerId,
    cameraPreset,
    onTileTap,
    onTick,
  ]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040712);
    scene.fog = new THREE.FogExp2(0x040712, 0.026);

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 540;
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // ─── Lighting Rig ─────────────────────────────────────────────
    scene.add(new THREE.HemisphereLight(0x38bdf8, 0x090d16, 0.95));

    const dirLight = new THREE.DirectionalLight(0xe0f2fe, 1.9);
    dirLight.position.set(8, 18, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 2;
    dirLight.shadow.camera.far = 45;
    dirLight.shadow.camera.left = -9;
    dirLight.shadow.camera.right = 9;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    scene.add(dirLight);

    const spawnW = gridToWorld(SPAWN_CELL.col, SPAWN_CELL.row);
    const spawnLight = new THREE.PointLight(0xf43f5e, 3.2, 6);
    spawnLight.position.set(spawnW.x, 1.4, spawnW.z);
    scene.add(spawnLight);

    const coreW = gridToWorld(CORE_CELL.col, CORE_CELL.row);
    const coreLight = new THREE.PointLight(0x22d3ee, 3.5, 6.5);
    coreLight.position.set(coreW.x, 1.5, coreW.z);
    scene.add(coreLight);

    const flashLight = new THREE.PointLight(0xfbbf24, 0, 5.5);
    scene.add(flashLight);

    // ─── Arena Platform, Cyber Abyss Floor & Corner Pylons ────────
    const tileTex = createArenaTileTexture();
    const monolithTex = createMonolithTexture();
    const portalTex = createVortexPortalTexture();
    const glowTex = createGlowHaloTexture();
    const subGridTex = createSubGridTexture();

    // Recessed cyber abyss sub-floor
    const subFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(42, 42),
      new THREE.MeshBasicMaterial({ map: subGridTex })
    );
    subFloor.rotation.x = -Math.PI / 2;
    subFloor.position.y = -2.2;
    scene.add(subFloor);

    // 240 Deep-space ambient stars / energy motes
    const starCount = 240;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 32;
      starPositions[i * 3 + 1] = Math.random() * 11 - 2.0;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 36;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starPoints = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.1, transparent: true, opacity: 0.65 })
    );
    scene.add(starPoints);

    // 4 Corner Citadel Pylons anchoring the floating fortress
    const pylonCorners = [
      [-(GRID_COLS / 2 + 0.35), -(GRID_ROWS / 2 + 0.35)],
      [GRID_COLS / 2 + 0.35, -(GRID_ROWS / 2 + 0.35)],
      [-(GRID_COLS / 2 + 0.35), GRID_ROWS / 2 + 0.35],
      [GRID_COLS / 2 + 0.35, GRID_ROWS / 2 + 0.35],
    ];
    for (const [px, pz] of pylonCorners) {
      const pylon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.22, 1.35, 6),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.25 })
      );
      pylon.position.set(px, 0.3, pz);
      scene.add(pylon);
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 4.5, 6),
        new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.22 })
      );
      beacon.position.set(px, 2.4, pz);
      scene.add(beacon);
    }

    const deckMesh = new THREE.Mesh(
      new THREE.BoxGeometry(GRID_COLS + 0.7, 0.55, GRID_ROWS + 0.7),
      new THREE.MeshStandardMaterial({ color: 0x070b14, metalness: 0.7, roughness: 0.35 })
    );
    deckMesh.position.y = -0.32;
    deckMesh.receiveShadow = true;
    scene.add(deckMesh);

    const frameLines = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(GRID_COLS + 0.72, 0.56, GRID_ROWS + 0.72)),
      new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.55 })
    );
    frameLines.position.y = -0.32;
    scene.add(frameLines);

    const tileMeshes = [];
    const tileGeo = new THREE.BoxGeometry(TILE_SIZE * 0.94, 0.08, TILE_SIZE * 0.94);
    const initGrid = simRef.current.grid;

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const isSpawn = c === SPAWN_CELL.col && r === SPAWN_CELL.row;
        const isCore = c === CORE_CELL.col && r === CORE_CELL.row;
        const tile = new THREE.Mesh(
          tileGeo,
          new THREE.MeshStandardMaterial({
            map: tileTex,
            color: isSpawn ? 0x4c0519 : isCore ? 0x083344 : 0xffffff,
            metalness: 0.55,
            roughness: 0.42,
          })
        );
        const w = gridToWorld(c, r);
        tile.position.set(w.x, 0, w.z);
        tile.receiveShadow = true;
        tile.userData = { col: c, row: r, isSpawn, isCore };
        scene.add(tile);
        tileMeshes.push(tile);

        if (initGrid[r][c] === CELL_OBSTACLE) {
          const mono = new THREE.Mesh(
            new THREE.BoxGeometry(0.76, 0.85, 0.76),
            new THREE.MeshStandardMaterial({ map: monolithTex, metalness: 0.75, roughness: 0.25 })
          );
          mono.position.set(w.x, 0.46, w.z);
          mono.castShadow = true;
          mono.receiveShadow = true;
          scene.add(mono);

          const cap = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.16, 0),
            new THREE.MeshStandardMaterial({
              color: 0xf43f5e,
              emissive: 0xe11d48,
              emissiveIntensity: 1.6,
            })
          );
          cap.position.set(w.x, 1.0, w.z);
          scene.add(cap);
        }
      }
    }

    // ─── Spawn Wormhole & Bastion Core ────────────────────────────
    const spawnGroup = new THREE.Group();
    spawnGroup.position.set(spawnW.x, 0.48, spawnW.z);
    const portalDisc = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.95),
      new THREE.MeshBasicMaterial({ map: portalTex, transparent: true, side: THREE.DoubleSide, depthWrite: false })
    );
    portalDisc.rotation.x = -Math.PI / 2;
    portalDisc.position.y = -0.35;
    spawnGroup.add(portalDisc);

    const spawnRingOuter = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.045, 12, 32),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xf43f5e, emissiveIntensity: 1.8 })
    );
    spawnGroup.add(spawnRingOuter);

    const spawnRingInner = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.03, 10, 24),
      new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xa855f7, emissiveIntensity: 1.8 })
    );
    spawnGroup.add(spawnRingInner);
    scene.add(spawnGroup);

    const coreGroup = new THREE.Group();
    coreGroup.position.set(coreW.x, 0.65, coreW.z);
    const coreCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 0),
      new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x06b6d4,
        emissiveIntensity: 1.8,
        metalness: 0.2,
        roughness: 0.1,
      })
    );
    coreGroup.add(coreCrystal);
    const coreGyroA = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.03, 10, 32),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 1.3 })
    );
    coreGroup.add(coreGyroA);
    const coreGyroB = coreGyroA.clone();
    coreGyroB.rotation.y = Math.PI / 2;
    coreGroup.add(coreGyroB);
    scene.add(coreGroup);

    // Additive HDR-style Bloom Glow Halos under Spawn & Core
    const spawnHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    spawnHalo.position.set(spawnW.x, 0.25, spawnW.z);
    spawnHalo.scale.set(2.4, 2.4, 1);
    scene.add(spawnHalo);

    const coreHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    coreHalo.position.set(coreW.x, 0.45, coreW.z);
    coreHalo.scale.set(2.6, 2.6, 1);
    scene.add(coreHalo);

    // ─── Dynamic Combat Layers & Entity Pools ─────────────────────
    const towersLayer = new THREE.Group();
    const enemiesLayer = new THREE.Group();
    const projectilesLayer = new THREE.Group();
    const fxLayer = new THREE.Group();
    const activePathGroup = new THREE.Group();
    const previewPathGroup = new THREE.Group();
    scene.add(
      towersLayer,
      enemiesLayer,
      projectilesLayer,
      fxLayer,
      activePathGroup,
      previewPathGroup
    );

    const turretMeshMap = new Map();
    const enemyMeshMap = new Map();
    const projMeshMap = new Map();

    // Range indicator ring + filled subtle disc (shared for selected turret OR placement preview)
    const rangeMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.0, 48),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      })
    );
    rangeMesh.rotation.x = -Math.PI / 2;
    rangeMesh.position.y = 0.075;
    rangeMesh.visible = false;
    scene.add(rangeMesh);

    const rangeFillMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.96, 48),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      })
    );
    rangeFillMesh.rotation.x = -Math.PI / 2;
    rangeFillMesh.position.y = 0.065;
    rangeFillMesh.visible = false;
    scene.add(rangeFillMesh);

    // Real Hologram 3D Weapon Ghost Mesh (dynamically swaps per previewType)
    const ghostGroup = new THREE.Group();
    let currentGhostType = null;
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.55,
      wireframe: true,
    });
    const setGhostWeapon = (typeKey) => {
      if (currentGhostType === typeKey) return;
      currentGhostType = typeKey;
      while (ghostGroup.children.length > 0) ghostGroup.children.pop();
      const holo = buildTurretMesh(typeKey, 1, null);
      holo.traverse((obj) => {
        if (obj.isMesh) {
          obj.material = ghostMat;
          obj.castShadow = false;
        }
      });
      ghostGroup.add(holo);
    };
    setGhostWeapon("pulse");
    ghostGroup.visible = false;
    scene.add(ghostGroup);

    // Tactical Tile Selector Bracket (4 neon corners around tapped tile)
    const bracketMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, side: THREE.DoubleSide });
    const tileBracket = new THREE.Group();
    const cornerArmGeo = new THREE.PlaneGeometry(0.18, 0.045);
    [
      [-0.4, -0.45, 0],
      [-0.45, -0.4, Math.PI / 2],
      [0.4, -0.45, 0],
      [0.45, -0.4, Math.PI / 2],
      [-0.4, 0.45, 0],
      [-0.45, 0.4, Math.PI / 2],
      [0.4, 0.45, 0],
      [0.45, 0.4, Math.PI / 2],
    ].forEach(([cx, cz, rot]) => {
      const m = new THREE.Mesh(cornerArmGeo, bracketMat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = rot;
      m.position.set(cx, 0.09, cz);
      tileBracket.add(m);
    });
    tileBracket.visible = false;
    scene.add(tileBracket);

    // 3D Physics Shrapnel Sparks Layer
    const sparksLayer = new THREE.Group();
    scene.add(sparksLayer);
    const activeSparks = [];
    const sparkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);

    // Shared projectile geometry
    const projGeo = new THREE.SphereGeometry(0.095, 8, 8);

    // Path builders
    let lastActiveSig = "";
    let lastPreviewSig = "";
    const activeBeads = [];

    const rebuildPathGroup = (group, path, colorHex, recordBeads) => {
      while (group.children.length > 0) {
        const ch = group.children.pop();
        ch.geometry?.dispose();
        ch.material?.dispose();
      }
      if (recordBeads) activeBeads.length = 0;
      if (!path || path.length < 2) return;

      const points = path.map((cell) => {
        const w = gridToWorld(cell.col, cell.row);
        return new THREE.Vector3(w.x, 0.1, w.z);
      });
      const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.15);
      const tubeGeo = new THREE.TubeGeometry(curve, Math.max(16, path.length * 3), 0.036, 6, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: recordBeads ? 0.45 : 0.75,
      });
      group.add(new THREE.Mesh(tubeGeo, tubeMat));

      if (recordBeads) {
        const beadGeo = new THREE.SphereGeometry(0.075, 8, 8);
        const beadMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
        for (let i = 0; i < 8; i++) {
          const mesh = new THREE.Mesh(beadGeo, beadMat);
          group.add(mesh);
          activeBeads.push({ mesh, curve, offset: i / 8 });
        }
      }
    };

    // ─── Camera, Drag Orbit & Mobile Two-Finger Pinch Zoom ────────
    const orbit = { yaw: 0, pitch: 0.92, targetYaw: 0, targetPitch: 0.92, zoom: 1.0, targetZoom: 1.0 };
    let pointerDownPos = null;
    let isDragging = false;
    let lastPinchDist = null;
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();

    const onWheel = (e) => {
      e.preventDefault();
      orbit.targetZoom = Math.max(0.68, Math.min(1.38, orbit.targetZoom + e.deltaY * 0.0008));
    };
    const onTouchMovePinch = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (lastPinchDist != null) {
          const delta = (lastPinchDist - d) * 0.004;
          orbit.targetZoom = Math.max(0.68, Math.min(1.38, orbit.targetZoom + delta));
        }
        lastPinchDist = d;
        isDragging = true;
      }
    };
    const onTouchEndPinch = (e) => {
      if (e.touches.length < 2) lastPinchDist = null;
    };

    const onPointerDown = (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY };
      isDragging = false;
    };
    const onPointerMove = (e) => {
      if (!pointerDownPos || lastPinchDist !== null) return;
      const dx = e.clientX - pointerDownPos.lastX;
      const dy = e.clientY - pointerDownPos.lastY;
      if (Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) > 8) {
        isDragging = true;
        orbit.targetYaw = Math.max(-0.55, Math.min(0.55, orbit.targetYaw - dx * 0.005));
        orbit.targetPitch = Math.max(0.55, Math.min(1.48, orbit.targetPitch + dy * 0.005));
      }
      pointerDownPos.lastX = e.clientX;
      pointerDownPos.lastY = e.clientY;
    };
    const onPointerUp = (e) => {
      if (pointerDownPos && !isDragging) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNDC, camera);
        const hits = raycaster.intersectObjects(tileMeshes, false);
        if (hits.length > 0) {
          const { col, row } = hits[0].object.userData;
          propsRef.current.onTileTap?.({ col, row });
        }
      }
      pointerDownPos = null;
      isDragging = false;
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("touchmove", onTouchMovePinch, { passive: false });
    renderer.domElement.addEventListener("touchend", onTouchEndPinch);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    let lastPreset = propsRef.current.cameraPreset;
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const nw = container.clientWidth || 360;
      const nh = container.clientHeight || 540;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    resizeObserver.observe(container);

    // ─── Main 60fps Frame Loop ────────────────────────────────────
    let rafId;
    let lastTime = performance.now();
    const clock = new THREE.Clock();

    const animate = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const elapsed = clock.getElapsedTime();

      propsRef.current.onTick?.(dt);
      const sim = simRef.current;

      const {
        activePath: curPath,
        previewCell: pCell,
        previewValid: pValid,
        previewPath: pPath,
        previewType: pType,
        selectedTowerId: selId,
        cameraPreset: curPreset,
      } = propsRef.current;

      if (curPreset !== lastPreset) {
        lastPreset = curPreset;
        const preset = CAMERA_PRESETS[curPreset] || CAMERA_PRESETS.iso;
        orbit.targetYaw = preset.yaw;
        orbit.targetPitch = preset.pitch;
      }
      orbit.yaw += (orbit.targetYaw - orbit.yaw) * 0.12;
      orbit.pitch += (orbit.targetPitch - orbit.pitch) * 0.12;
      orbit.zoom += (orbit.targetZoom - orbit.zoom) * 0.14;

      const aspect = camera.aspect || 0.7;
      const baseDist = aspect < 0.85 ? 19.5 : 16.5;
      const dist = baseDist * (CAMERA_PRESETS[curPreset]?.distMult || 1) * orbit.zoom;
      const shakeMag = (sim.shakeTimer || 0) > 0 ? (sim.shakeIntensity || 0.15) * (sim.shakeTimer / 0.35) : 0;
      const sx = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;
      const sy = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;

      camera.position.x = Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * dist + sx;
      camera.position.y = Math.sin(orbit.pitch) * dist + sy;
      camera.position.z = Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * dist + 0.35;
      camera.lookAt(sx * 0.4, 0, 0.25);

      // Animate Spawn & Core
      portalDisc.rotation.z = -elapsed * 1.4;
      spawnRingOuter.rotation.x = elapsed * 1.2;
      spawnRingOuter.rotation.y = elapsed * 0.8;
      spawnRingInner.rotation.y = -elapsed * 1.6;
      coreCrystal.rotation.y = elapsed * 1.3;
      coreCrystal.position.y = Math.sin(elapsed * 2.5) * 0.08;
      coreGyroA.rotation.x = elapsed * 1.1;
      coreGyroB.rotation.z = -elapsed * 1.4;
      starPoints.rotation.y = elapsed * 0.025;

      // Dynamic Core Integrity Glow (Cyan -> Amber -> Crimson Pulse)
      const hpFrac = sim.coreHp / Math.max(1, sim.maxCoreHp || 20);
      const cHex = hpFrac > 0.5 ? 0x22d3ee : hpFrac > 0.25 ? 0xfbbf24 : 0xf43f5e;
      coreHalo.material.color.setHex(cHex);
      coreLight.color.setHex(cHex);
      coreCrystal.material.color.setHex(cHex);
      coreCrystal.material.emissive.setHex(cHex);
      coreHalo.scale.setScalar(2.4 + Math.sin(elapsed * 3.5) * 0.22);

      // Dynamic Muzzle / Impact PointLight Flash
      let brightestTower = null;
      for (const t of sim.towers) {
        if (t.recoil > 0.72) {
          brightestTower = t;
          break;
        }
      }
      if (brightestTower) {
        flashLight.position.set(brightestTower.wx, 0.9, brightestTower.wz);
        flashLight.color.setHex(TURRET_CATALOG[brightestTower.type]?.colorHex || 0xfbbf24);
        flashLight.intensity = 4.2;
      } else {
        flashLight.intensity *= 0.82;
      }

      // Path Holograms
      const sig = curPath ? curPath.map((p) => `${p.col},${p.row}`).join(";") : "";
      if (sig !== lastActiveSig) {
        lastActiveSig = sig;
        rebuildPathGroup(activePathGroup, curPath, 0x06b6d4, true);
      }
      for (const b of activeBeads) {
        const t = (elapsed * 0.2 + b.offset) % 1;
        b.curve.getPointAt(t, b.mesh.position);
      }

      const pSig = pCell ? `${pCell.col},${pCell.row}:${pValid}:${pPath?.length || 0}` : "";
      if (pSig !== lastPreviewSig) {
        lastPreviewSig = pSig;
        rebuildPathGroup(previewPathGroup, pCell && pValid ? pPath : null, 0xfbbf24, false);
      }

      // Sync Towers
      const activeTowerIds = new Set(sim.towers.map((t) => t.id));
      for (const [id, mesh] of turretMeshMap.entries()) {
        if (!activeTowerIds.has(id)) {
          towersLayer.remove(mesh);
          turretMeshMap.delete(id);
        }
      }
      for (const t of sim.towers) {
        let mesh = turretMeshMap.get(t.id);
        if (
          !mesh ||
          mesh.userData.tier !== t.tier ||
          mesh.userData.branch !== t.branch
        ) {
          if (mesh) towersLayer.remove(mesh);
          mesh = buildTurretMesh(t.type, t.tier, t.branch);
          if (t.tier >= 2) {
            const aura = new THREE.Sprite(
              new THREE.SpriteMaterial({
                map: glowTex,
                color: TURRET_CATALOG[t.type]?.colorHex || 0x38bdf8,
                transparent: true,
                opacity: t.tier === 3 ? 0.8 : 0.5,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
              })
            );
            aura.position.y = 0.08;
            aura.scale.setScalar(t.tier === 3 ? 1.55 : 1.15);
            mesh.add(aura);
          }
          mesh.position.set(t.wx, 0.04, t.wz);
          towersLayer.add(mesh);
          turretMeshMap.set(t.id, mesh);
        }
        const { head, barrelGroup } = mesh.userData;
        if (t.type === "cryo") {
          barrelGroup.rotation.y = elapsed * 2.4;
        } else if (head) {
          head.rotation.y = t.yaw;
          barrelGroup.position.z = -t.recoil * 0.1;
        }
      }

      // Range Dome Indicator & Real 3D Hologram Ghost (Preview OR Selected Turret)
      const selectedTower = selId ? sim.towers.find((t) => t.id === selId) : null;
      if (pCell) {
        const gw = gridToWorld(pCell.col, pCell.row);
        const cat = TURRET_CATALOG[pType];
        const rad = cat ? cat.range : 2.5;
        setGhostWeapon(pType);
        ghostGroup.visible = true;
        ghostGroup.position.set(gw.x, 0.06 + Math.sin(elapsed * 4) * 0.03, gw.z);
        ghostGroup.rotation.y = elapsed * 0.8;
        const gCol = pValid ? (cat?.colorHex || 0x22d3ee) : 0xf43f5e;
        ghostMat.color.setHex(gCol);

        rangeMesh.visible = true;
        rangeMesh.position.set(gw.x, 0.075, gw.z);
        rangeMesh.scale.set(rad, rad, 1);
        rangeMesh.material.color.setHex(gCol);

        rangeFillMesh.visible = true;
        rangeFillMesh.position.set(gw.x, 0.065, gw.z);
        rangeFillMesh.scale.set(rad, rad, 1);
        rangeFillMesh.material.color.setHex(gCol);

        tileBracket.visible = true;
        tileBracket.position.set(gw.x, 0, gw.z);
        const pulseScale = 1 + Math.sin(elapsed * 7) * 0.06;
        tileBracket.scale.set(pulseScale, 1, pulseScale);
        bracketMat.color.setHex(gCol);
      } else if (selectedTower) {
        const tCol = TURRET_CATALOG[selectedTower.type]?.colorHex || 0x38bdf8;
        ghostGroup.visible = false;
        rangeMesh.visible = true;
        rangeMesh.position.set(selectedTower.wx, 0.075, selectedTower.wz);
        rangeMesh.scale.set(selectedTower.stats.range, selectedTower.stats.range, 1);
        rangeMesh.material.color.setHex(tCol);

        rangeFillMesh.visible = true;
        rangeFillMesh.position.set(selectedTower.wx, 0.065, selectedTower.wz);
        rangeFillMesh.scale.set(selectedTower.stats.range, selectedTower.stats.range, 1);
        rangeFillMesh.material.color.setHex(tCol);

        tileBracket.visible = true;
        tileBracket.position.set(selectedTower.wx, 0, selectedTower.wz);
        tileBracket.scale.set(1.04, 1, 1.04);
        bracketMat.color.setHex(tCol);
      } else {
        ghostGroup.visible = false;
        rangeMesh.visible = false;
        rangeFillMesh.visible = false;
        tileBracket.visible = false;
      }

      // Sync Enemies
      const activeEnemyIds = new Set(sim.enemies.map((e) => e.id));
      for (const [id, mesh] of enemyMeshMap.entries()) {
        if (!activeEnemyIds.has(id)) {
          enemiesLayer.remove(mesh);
          enemyMeshMap.delete(id);
        }
      }
      for (const e of sim.enemies) {
        let mesh = enemyMeshMap.get(e.id);
        if (!mesh) {
          mesh = buildEnemyMesh(e.kind);
          enemiesLayer.add(mesh);
          enemyMeshMap.set(e.id, mesh);
        }
        const bob = Math.sin(elapsed * 6 + e.col) * 0.05;
        mesh.position.set(e.wx, 0.38 + bob, e.wz);
        mesh.rotation.y = e.yaw;

        const { hpBg, hpFill, coreMat, armorMat, shieldSphere, origHex } = mesh.userData;
        coreMat.color.setHex(e.slowTimer > 0 ? 0x22d3ee : e.burnTimer > 0 ? 0xf97316 : origHex);
        coreMat.emissive.setHex(e.slowTimer > 0 ? 0x06b6d4 : e.burnTimer > 0 ? 0xea580c : origHex);
        if (shieldSphere) {
          shieldSphere.visible = (e.shield || 0) > 0;
          shieldSphere.rotation.y = elapsed * 1.5;
        }
        if (e.stealthed) {
          const revealed = (e.revealTimer || 0) > 0;
          if (armorMat) armorMat.opacity = revealed ? 0.92 : 0.25;
          coreMat.opacity = revealed ? 0.95 : 0.35;
        }
        const hpRatio = Math.max(0.02, e.hp / Math.max(1, e.maxHp));
        const halfBar = e.kind === "boss" ? 0.43 : 0.24;
        hpFill.scale.x = hpRatio;
        hpFill.position.x = -(1 - hpRatio) * halfBar;
        hpFill.material.color.setHex(hpRatio > 0.5 ? 0x4ade80 : hpRatio > 0.25 ? 0xfbbf24 : 0xf43f5e);
        hpBg.quaternion.copy(camera.quaternion);
      }

      // Sync Projectiles
      const activeProjIds = new Set(sim.projectiles.map((p) => p.id));
      for (const [id, mesh] of projMeshMap.entries()) {
        if (!activeProjIds.has(id)) {
          projectilesLayer.remove(mesh);
          mesh.material.dispose();
          projMeshMap.delete(id);
        }
      }
      for (const p of sim.projectiles) {
        let mesh = projMeshMap.get(p.id);
        if (!mesh) {
          mesh = new THREE.Mesh(
            projGeo,
            new THREE.MeshBasicMaterial({ color: p.color || 0x38bdf8 })
          );
          const halo = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: glowTex,
              color: p.color || 0x38bdf8,
              transparent: true,
              opacity: 0.9,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            })
          );
          halo.scale.setScalar(0.42);
          mesh.add(halo);
          projectilesLayer.add(mesh);
          projMeshMap.set(p.id, mesh);
        }
        mesh.position.set(p.x, p.y, p.z);
      }

      // Drain queued 3D shrapnel bursts & update spark physics
      if (sim.burstQueue?.length) {
        while (sim.burstQueue.length > 0) {
          const b = sim.burstQueue.pop();
          for (let k = 0; k < b.count; k++) {
            const mat = new THREE.MeshBasicMaterial({ color: b.color, transparent: true, opacity: 1 });
            const sp = new THREE.Mesh(sparkGeo, mat);
            sp.position.set(b.x, b.y, b.z);
            sparksLayer.add(sp);
            activeSparks.push({
              mesh: sp,
              vx: (Math.random() - 0.5) * 4.2,
              vy: 1.8 + Math.random() * 2.8,
              vz: (Math.random() - 0.5) * 4.2,
              life: 0.55,
              maxLife: 0.55,
            });
          }
        }
      }
      for (let i = activeSparks.length - 1; i >= 0; i--) {
        const s = activeSparks[i];
        s.life -= dt;
        if (s.life <= 0) {
          sparksLayer.remove(s.mesh);
          s.mesh.material.dispose();
          activeSparks.splice(i, 1);
          continue;
        }
        s.vy -= 9.8 * dt;
        s.mesh.position.x += s.vx * dt;
        s.mesh.position.y += s.vy * dt;
        s.mesh.position.z += s.vz * dt;
        if (s.mesh.position.y < 0.08) {
          s.mesh.position.y = 0.08;
          s.vy *= -0.45;
        }
        s.mesh.rotation.x += dt * 8;
        s.mesh.rotation.y += dt * 6;
        s.mesh.material.opacity = Math.max(0, s.life / s.maxLife);
      }

      // Render transient VFX (cryo rings, lightning arcs, rail beams, explosions)
      while (fxLayer.children.length > 0) {
        const ch = fxLayer.children.pop();
        ch.geometry?.dispose();
        ch.material?.dispose();
      }
      for (const fx of sim.effects) {
        const tFrac = 1 - fx.life / Math.max(0.01, fx.maxLife);
        if (fx.kind === "cryo_ring" || fx.kind === "explosion" || fx.kind === "upgrade" || fx.kind === "shatter") {
          const rad = (fx.radius || 0.9) * Math.max(0.15, tFrac);
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(Math.max(0.02, rad - 0.14), rad, 24),
            new THREE.MeshBasicMaterial({
              color: fx.color,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: Math.max(0, 1 - tFrac),
            })
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.set(fx.x, fx.y, fx.z);
          fxLayer.add(ring);
        } else if (fx.kind === "lightning" && fx.points?.length >= 2) {
          const pts = fx.points.map((pt) => new THREE.Vector3(pt.x, pt.y, pt.z));
          // Subdivide midpoints with slight electric jitter
          const jagged = [pts[0]];
          for (let k = 0; k < pts.length - 1; k++) {
            const mid = new THREE.Vector3().lerpVectors(pts[k], pts[k + 1], 0.5);
            mid.x += (Math.random() - 0.5) * 0.25;
            mid.y += (Math.random() - 0.3) * 0.2;
            mid.z += (Math.random() - 0.5) * 0.25;
            jagged.push(mid, pts[k + 1]);
          }
          const lineGeo = new THREE.BufferGeometry().setFromPoints(jagged);
          const lineMat = new THREE.LineBasicMaterial({
            color: fx.color,
            transparent: true,
            opacity: Math.max(0, 1 - tFrac),
          });
          fxLayer.add(new THREE.Line(lineGeo, lineMat));
        } else if (fx.kind === "orbital_beam") {
          const beamRad = Math.max(0.08, (1 - tFrac) * 0.45);
          const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(beamRad, beamRad * 1.4, 14, 14),
            new THREE.MeshBasicMaterial({
              color: fx.color,
              transparent: true,
              opacity: Math.max(0, (1 - tFrac) * 0.85),
            })
          );
          pillar.position.set(fx.x, 7, fx.z);
          fxLayer.add(pillar);

          const impactRad = (fx.radius || 1.8) * Math.max(0.2, tFrac);
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(Math.max(0.05, impactRad - 0.22), impactRad, 28),
            new THREE.MeshBasicMaterial({
              color: fx.color,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: Math.max(0, 1 - tFrac),
            })
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.set(fx.x, 0.16, fx.z);
          fxLayer.add(ring);
        } else if (fx.kind === "beam") {
          const start = new THREE.Vector3(fx.x1, fx.y1, fx.z1);
          const end = new THREE.Vector3(fx.x2, fx.y2, fx.z2);
          const dist = start.distanceTo(end);
          const cylGeo = new THREE.CylinderGeometry(0.045, 0.045, dist, 6);
          const cylMat = new THREE.MeshBasicMaterial({
            color: fx.color,
            transparent: true,
            opacity: Math.max(0, 1 - tFrac),
          });
          const cyl = new THREE.Mesh(cylGeo, cylMat);
          cyl.position.copy(start).lerp(end, 0.5);
          cyl.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            end.clone().sub(start).normalize()
          );
          fxLayer.add(cyl);
        }
      }

      // Render 3D Floating Combat Popups (+credits⚡, SHATTER!, OVERCHARGE!)
      if (sim.popups?.length) {
        if (!scene.userData.popupCache) scene.userData.popupCache = new Map();
        const cache = scene.userData.popupCache;
        for (const pop of sim.popups) {
          const key = `${pop.text}_${pop.color}`;
          let tex = cache.get(key);
          if (!tex) {
            if (cache.size > 40) {
              const firstKey = cache.keys().next().value;
              cache.get(firstKey)?.dispose();
              cache.delete(firstKey);
            }
            const c = document.createElement("canvas");
            c.width = 256;
            c.height = 64;
            const pctx = c.getContext("2d");
            pctx.font = "900 32px system-ui, sans-serif";
            pctx.textAlign = "center";
            pctx.textBaseline = "middle";
            pctx.strokeStyle = "#020617";
            pctx.lineWidth = 7;
            pctx.strokeText(pop.text, 128, 32);
            pctx.fillStyle = pop.color || "#fbbf24";
            pctx.fillText(pop.text, 128, 32);
            tex = new THREE.CanvasTexture(c);
            tex.colorSpace = THREE.SRGBColorSpace;
            cache.set(key, tex);
          }
          const spMat = new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            opacity: Math.max(0, Math.min(1, pop.life / Math.max(0.01, pop.maxLife))),
            depthWrite: false,
          });
          const sprite = new THREE.Sprite(spMat);
          sprite.position.set(pop.x, pop.y, pop.z);
          sprite.scale.set(1.4, 0.35, 1);
          fxLayer.add(sprite);
        }
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("touchmove", onTouchMovePinch);
      renderer.domElement.removeEventListener("touchend", onTouchEndPinch);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.dispose();
      tileTex.dispose();
      monolithTex.dispose();
      portalTex.dispose();
      glowTex.dispose();
      subGridTex.dispose();
      if (scene.userData.popupCache) {
        for (const t of scene.userData.popupCache.values()) t.dispose();
        scene.userData.popupCache.clear();
      }
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [simRef]);

  return <div ref={mountRef} className="w-full h-full touch-none select-none cursor-pointer" />;
};

VortexBastionScene.propTypes = {
  simRef: PropTypes.shape({ current: PropTypes.object }).isRequired,
  activePath: PropTypes.array,
  previewCell: PropTypes.shape({ col: PropTypes.number, row: PropTypes.number }),
  previewValid: PropTypes.bool,
  previewPath: PropTypes.array,
  previewType: PropTypes.string,
  selectedTowerId: PropTypes.string,
  cameraPreset: PropTypes.oneOf(["iso", "top", "hero"]),
  onTileTap: PropTypes.func,
  onTick: PropTypes.func,
};

export default VortexBastionScene;

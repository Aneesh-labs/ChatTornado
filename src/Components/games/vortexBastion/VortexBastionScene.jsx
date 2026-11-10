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
} from "./textures3D";

const CAMERA_PRESETS = {
  iso: { pitch: 0.92, yaw: 0.0, distMult: 1.0 },
  top: { pitch: 1.44, yaw: 0.0, distMult: 0.94 },
  hero: { pitch: 0.68, yaw: 0.28, distMult: 0.96 },
};

const VortexBastionScene = ({
  grid,
  activePath,
  previewCell,
  previewValid,
  previewPath,
  cameraPreset = "iso",
  onTileTap,
}) => {
  const mountRef = useRef(null);

  // Live props refs read by Three.js animation loop & event handlers
  const propsRef = useRef({
    grid,
    activePath,
    previewCell,
    previewValid,
    previewPath,
    cameraPreset,
    onTileTap,
  });

  useEffect(() => {
    propsRef.current = {
      grid,
      activePath,
      previewCell,
      previewValid,
      previewPath,
      cameraPreset,
      onTileTap,
    };
  }, [grid, activePath, previewCell, previewValid, previewPath, cameraPreset, onTileTap]);

  const sceneDataRef = useRef(null);

  // Initialize Three.js WebGL scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040712);
    scene.fog = new THREE.FogExp2(0x040712, 0.028);

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
    renderer.toneMappingExposure = 1.18;
    container.appendChild(renderer.domElement);

    // ─── Lighting Rig ─────────────────────────────────────────────
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x090d16, 0.9);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xe0f2fe, 1.85);
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

    const spawnLight = new THREE.PointLight(0xf43f5e, 3.2, 6);
    const spawnW = gridToWorld(SPAWN_CELL.col, SPAWN_CELL.row);
    spawnLight.position.set(spawnW.x, 1.4, spawnW.z);
    scene.add(spawnLight);

    const coreLight = new THREE.PointLight(0x22d3ee, 3.5, 6.5);
    const coreW = gridToWorld(CORE_CELL.col, CORE_CELL.row);
    coreLight.position.set(coreW.x, 1.5, coreW.z);
    scene.add(coreLight);

    // ─── Textured Arena Base Deck & Interactive Tiles ─────────────
    const tileTex = createArenaTileTexture();
    const monolithTex = createMonolithTexture();
    const portalTex = createVortexPortalTexture();

    // Sub-platform deck slab
    const deckGeo = new THREE.BoxGeometry(GRID_COLS + 0.7, 0.55, GRID_ROWS + 0.7);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x070b14,
      metalness: 0.7,
      roughness: 0.35,
    });
    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    deckMesh.position.y = -0.32;
    deckMesh.receiveShadow = true;
    scene.add(deckMesh);

    // Neon perimeter frame
    const frameGeo = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(GRID_COLS + 0.72, 0.56, GRID_ROWS + 0.72)
    );
    const frameMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.55 });
    const frameLines = new THREE.LineSegments(frameGeo, frameMat);
    frameLines.position.y = -0.32;
    scene.add(frameLines);

    // Individual tile meshes for raycast picking & hover highlights
    const tileMeshes = [];
    const tileGeo = new THREE.BoxGeometry(TILE_SIZE * 0.94, 0.08, TILE_SIZE * 0.94);

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const isSpawn = c === SPAWN_CELL.col && r === SPAWN_CELL.row;
        const isCore = c === CORE_CELL.col && r === CORE_CELL.row;
        const mat = new THREE.MeshStandardMaterial({
          map: tileTex,
          color: isSpawn ? 0x4c0519 : isCore ? 0x083344 : 0xffffff,
          metalness: 0.55,
          roughness: 0.42,
        });
        const tile = new THREE.Mesh(tileGeo, mat);
        const w = gridToWorld(c, r);
        tile.position.set(w.x, 0, w.z);
        tile.receiveShadow = true;
        tile.userData = { col: c, row: r, isSpawn, isCore };
        scene.add(tile);
        tileMeshes.push(tile);

        // Obstacles
        if (propsRef.current.grid[r][c] === CELL_OBSTACLE) {
          const monoGeo = new THREE.BoxGeometry(0.76, 0.85, 0.76);
          const monoMat = new THREE.MeshStandardMaterial({
            map: monolithTex,
            metalness: 0.75,
            roughness: 0.25,
          });
          const mono = new THREE.Mesh(monoGeo, monoMat);
          mono.position.set(w.x, 0.46, w.z);
          mono.castShadow = true;
          mono.receiveShadow = true;
          scene.add(mono);

          // Glowing cap crystal
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

    // ─── Spawn Wormhole Portal ────────────────────────────────────
    const spawnGroup = new THREE.Group();
    spawnGroup.position.set(spawnW.x, 0.48, spawnW.z);

    const portalDisc = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.95),
      new THREE.MeshBasicMaterial({
        map: portalTex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    portalDisc.rotation.x = -Math.PI / 2;
    portalDisc.position.y = -0.35;
    spawnGroup.add(portalDisc);

    const spawnRingOuter = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.045, 12, 32),
      new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xf43f5e,
        emissiveIntensity: 1.8,
      })
    );
    spawnGroup.add(spawnRingOuter);

    const spawnRingInner = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.03, 10, 24),
      new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0xa855f7,
        emissiveIntensity: 1.8,
      })
    );
    spawnGroup.add(spawnRingInner);
    scene.add(spawnGroup);

    // ─── Bastion Core Reactor ─────────────────────────────────────
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
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.3,
      })
    );
    coreGroup.add(coreGyroA);

    const coreGyroB = coreGyroA.clone();
    coreGyroB.rotation.y = Math.PI / 2;
    coreGroup.add(coreGyroB);
    scene.add(coreGroup);

    // ─── Floating Ambient Cyber Motes ─────────────────────────────
    const moteCount = 90;
    const motePos = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      motePos[i * 3] = (Math.random() - 0.5) * 14;
      motePos[i * 3 + 1] = Math.random() * 5 + 0.3;
      motePos[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
    const moteMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.08,
      transparent: true,
      opacity: 0.55,
    });
    const motes = new THREE.Points(moteGeo, moteMat);
    scene.add(motes);

    // ─── Dynamic Hologram Path Groups & Placement Ghost ───────────
    const activePathGroup = new THREE.Group();
    const previewPathGroup = new THREE.Group();
    scene.add(activePathGroup);
    scene.add(previewPathGroup);

    const ghostGroup = new THREE.Group();
    const ghostRing = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.48, 32),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      })
    );
    ghostRing.rotation.x = -Math.PI / 2;
    ghostRing.position.y = 0.06;
    ghostGroup.add(ghostRing);

    const ghostBox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.36, 0.55, 8),
      new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x06b6d4,
        emissiveIntensity: 1.0,
        transparent: true,
        opacity: 0.55,
      })
    );
    ghostBox.position.y = 0.34;
    ghostGroup.add(ghostBox);
    ghostGroup.visible = false;
    scene.add(ghostGroup);

    // Helper to rebuild flowing path ribbon beads
    let lastActiveSignature = "";
    let lastPreviewSignature = "";
    const activeBeads = [];

    const rebuildPathGroup = (group, path, colorHex, recordBeads = false) => {
      while (group.children.length > 0) {
        const ch = group.children.pop();
        ch.geometry?.dispose();
        ch.material?.dispose();
      }
      if (recordBeads) activeBeads.length = 0;
      if (!path || path.length < 2) return;

      const points = path.map((cell) => {
        const w = gridToWorld(cell.col, cell.row);
        return new THREE.Vector3(w.x, 0.11, w.z);
      });
      const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.15);
      const tubeGeo = new THREE.TubeGeometry(curve, Math.max(16, path.length * 3), 0.04, 6, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: recordBeads ? 0.5 : 0.72,
      });
      group.add(new THREE.Mesh(tubeGeo, tubeMat));

      if (recordBeads) {
        const beadGeo = new THREE.SphereGeometry(0.085, 8, 8);
        const beadMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
        const count = 8;
        for (let i = 0; i < count; i++) {
          const mesh = new THREE.Mesh(beadGeo, beadMat);
          group.add(mesh);
          activeBeads.push({ mesh, curve, offset: i / count });
        }
      }
    };

    // ─── Camera Orbit State & Responsive Framing ──────────────────
    const orbit = { yaw: 0, pitch: 0.92, targetYaw: 0, targetPitch: 0.92 };
    let pointerDownPos = null;
    let isDragging = false;
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();

    const onPointerDown = (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY };
      isDragging = false;
    };

    const onPointerMove = (e) => {
      if (!pointerDownPos) return;
      const dx = e.clientX - pointerDownPos.lastX;
      const dy = e.clientY - pointerDownPos.lastY;
      const totalMoved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (totalMoved > 8) {
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
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // Track preset changes cleanly
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

    // ─── Main 60fps Animation Loop ────────────────────────────────
    let rafId;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const {
        activePath: curPath,
        previewCell: pCell,
        previewValid: pValid,
        previewPath: pPath,
        cameraPreset: curPreset,
      } = propsRef.current;

      if (curPreset !== lastPreset) {
        lastPreset = curPreset;
        const p = CAMERA_PRESETS[curPreset] || CAMERA_PRESETS.iso;
        orbit.targetYaw = p.yaw;
        orbit.targetPitch = p.pitch;
      }

      orbit.yaw += (orbit.targetYaw - orbit.yaw) * 0.12;
      orbit.pitch += (orbit.targetPitch - orbit.pitch) * 0.12;

      // Responsive distance fits full 9x13 grid cleanly on portrait phones & widescreens
      const aspect = camera.aspect || 0.7;
      const baseDist = aspect < 0.85 ? 19.5 : 16.5;
      const presetMult = (CAMERA_PRESETS[curPreset] || CAMERA_PRESETS.iso).distMult;
      const dist = baseDist * presetMult;

      camera.position.x = Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * dist;
      camera.position.y = Math.sin(orbit.pitch) * dist;
      camera.position.z = Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * dist + 0.35;
      camera.lookAt(0, 0, 0.25);

      // Animate Portal & Core
      portalDisc.rotation.z = -elapsed * 1.4;
      spawnRingOuter.rotation.x = elapsed * 1.2;
      spawnRingOuter.rotation.y = elapsed * 0.8;
      spawnRingInner.rotation.y = -elapsed * 1.6;
      coreCrystal.rotation.y = elapsed * 1.3;
      coreCrystal.position.y = Math.sin(elapsed * 2.5) * 0.08;
      coreGyroA.rotation.x = elapsed * 1.1;
      coreGyroB.rotation.z = -elapsed * 1.4;
      motes.rotation.y = elapsed * 0.04;

      // Rebuild active path ribbon when path changes
      const sig = curPath ? curPath.map((p) => `${p.col},${p.row}`).join(";") : "";
      if (sig !== lastActiveSignature) {
        lastActiveSignature = sig;
        rebuildPathGroup(activePathGroup, curPath, 0x06b6d4, true);
      }

      // Slide glowing path beads along curve toward Bastion Core
      for (const b of activeBeads) {
        const t = (elapsed * 0.18 + b.offset) % 1;
        b.curve.getPointAt(t, b.mesh.position);
      }

      // Rebuild preview reroute & ghost hologram
      const pSig = pCell
        ? `${pCell.col},${pCell.row}:${pValid}:${pPath ? pPath.length : 0}`
        : "";
      if (pSig !== lastPreviewSignature) {
        lastPreviewSignature = pSig;
        if (pCell && pValid && pPath) {
          rebuildPathGroup(previewPathGroup, pPath, 0xfbbf24, false);
        } else {
          rebuildPathGroup(previewPathGroup, null, 0xf43f5e, false);
        }
      }

      if (pCell) {
        const gw = gridToWorld(pCell.col, pCell.row);
        ghostGroup.visible = true;
        ghostGroup.position.set(gw.x, 0, gw.z);
        ghostBox.position.y = 0.34 + Math.sin(elapsed * 4) * 0.04;
        const gCol = pValid ? 0x22d3ee : 0xf43f5e;
        ghostRing.material.color.setHex(gCol);
        ghostBox.material.color.setHex(gCol);
        ghostBox.material.emissive.setHex(gCol);
      } else {
        ghostGroup.visible = false;
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    sceneDataRef.current = { scene, renderer, camera };

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.dispose();
      tileTex.dispose();
      monolithTex.dispose();
      portalTex.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full touch-none select-none cursor-pointer" />;
};

VortexBastionScene.propTypes = {
  grid: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  activePath: PropTypes.arrayOf(
    PropTypes.shape({ col: PropTypes.number.isRequired, row: PropTypes.number.isRequired })
  ),
  previewCell: PropTypes.shape({ col: PropTypes.number, row: PropTypes.number }),
  previewValid: PropTypes.bool,
  previewPath: PropTypes.arrayOf(
    PropTypes.shape({ col: PropTypes.number.isRequired, row: PropTypes.number.isRequired })
  ),
  cameraPreset: PropTypes.oneOf(["iso", "top", "hero"]),
  onTileTap: PropTypes.func,
};

export default VortexBastionScene;

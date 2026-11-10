import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as THREE from "three";
import {
  ARTIFACT_CATALOG,
  INTERACTABLES,
  TESSERACT_TOPOLOGY,
  project4Dto3D,
  stepAfterspaceState,
} from "./afterspaceEngine";

const AfterspaceWorld3D = ({
  simRef,
  inputRef,
  settingsRef,
  previewTemporalIndex = null,
  onSyncHud,
  onDiscoveryEvent,
}) => {
  const containerRef = useRef(null);
  const onSyncRef = useRef(onSyncHud);
  const onEventRef = useRef(onDiscoveryEvent);
  const previewTempRef = useRef(previewTemporalIndex);

  useEffect(() => {
    onSyncRef.current = onSyncHud;
  }, [onSyncHud]);

  useEffect(() => {
    onEventRef.current = onDiscoveryEvent;
  }, [onDiscoveryEvent]);

  useEffect(() => {
    previewTempRef.current = previewTemporalIndex;
  }, [previewTemporalIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x151a19);
    scene.fog = new THREE.FogExp2(0x151a19, 0.02);

    const camera = new THREE.PerspectiveCamera(56, width / height, 0.1, 160);
    camera.position.set(0, 3.2, 29);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    const dprCap = settingsRef.current?.graphicsPreset === "Medium" ? 1.25 : 1.75;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // Architectural daylight-dusk observatory lighting (no neon)
    const hemi = new THREE.HemisphereLight(0xedeae1, 0x151a19, 0.85);
    scene.add(hemi);

    const sunLight = new THREE.DirectionalLight(0xf5f3ed, 1.35);
    sunLight.position.set(18, 28, 12);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x8496a1, 0.55);
    rimLight.position.set(-20, 12, -24);
    scene.add(rimLight);

    // Distant celestial bodies
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(7.2, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xedeae1, transparent: true, opacity: 0.82 })
    );
    moonMesh.position.set(-16, 22, -78);
    scene.add(moonMesh);

    const eclipseRing = new THREE.Mesh(
      new THREE.RingGeometry(9.6, 10.1, 64),
      new THREE.MeshBasicMaterial({
        color: 0xb99a70,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
      })
    );
    eclipseRing.position.copy(moonMesh.position);
    eclipseRing.rotation.set(0.35, 0.4, 0.2);
    scene.add(eclipseRing);

    // Materials library (Matte Architectural Stone, Basalt, Sandstone, Aged Brass)
    const basaltMat = new THREE.MeshStandardMaterial({
      color: 0x202625,
      roughness: 0.92,
      metalness: 0.08,
    });
    const slateMat = new THREE.MeshStandardMaterial({
      color: 0x303735,
      roughness: 0.84,
      metalness: 0.14,
    });
    const limestoneMat = new THREE.MeshStandardMaterial({
      color: 0xd5d2c8,
      roughness: 0.88,
      metalness: 0.04,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xb99a70,
      roughness: 0.42,
      metalness: 0.68,
    });
    const sageMat = new THREE.MeshStandardMaterial({
      color: 0x89988a,
      roughness: 0.6,
      metalness: 0.2,
    });

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    // Region 01 — The Forgotten Gateway platform (z: 9 .. 30)
    const gatewayFloor = new THREE.Mesh(boxGeo, basaltMat);
    gatewayFloor.scale.set(24, 2, 21);
    gatewayFloor.position.set(0, -1, 19.5);
    scene.add(gatewayFloor);

    // Region 02 — The Fractured Observatory platform (z: -6.5 .. 3.5)
    const observatoryFloor = new THREE.Mesh(boxGeo, slateMat);
    observatoryFloor.scale.set(24, 2, 10);
    observatoryFloor.position.set(0, -1, -1.5);
    scene.add(observatoryFloor);

    // Permanent threshold bridge (z: -11.8 .. -6.2)
    const northBridge = new THREE.Mesh(boxGeo, slateMat);
    northBridge.scale.set(4.4, 0.5, 5.8);
    northBridge.position.set(0, -0.25, -9.0);
    scene.add(northBridge);

    // Region 03 — The Silent Singularity platform (z: -30 .. -11.5)
    const singularityFloor = new THREE.Mesh(boxGeo, basaltMat);
    singularityFloor.scale.set(26, 2, 18.5);
    singularityFloor.position.set(0, -1, -20.75);
    scene.add(singularityFloor);

    // Distant monolithic arches around the perimeter for monumental scale
    const monolithPositions = [
      [-16, 10, 8, 2.2, 24, 2.2],
      [16, 12, -4, 2.4, 28, 2.4],
      [-20, 14, -22, 3.0, 32, 3.0],
      [20, 14, -22, 3.0, 32, 3.0],
      [0, 18, -46, 22, 36, 3.2],
    ];
    monolithPositions.forEach(([x, y, z, sx, sy, sz]) => {
      const m = new THREE.Mesh(boxGeo, basaltMat);
      m.position.set(x, y - 6, z);
      m.scale.set(sx, sy, sz);
      scene.add(m);
    });

    // Temporal Chasm Bridge between Gateway (z=9) and Observatory (z=3.5)
    const temporalBridgeGroup = new THREE.Group();
    const bridgeSlabs = [];
    const pastBridgeMat = limestoneMat.clone();
    pastBridgeMat.transparent = true;
    const futureBridgeMat = new THREE.MeshStandardMaterial({
      color: 0x8496a1,
      roughness: 0.35,
      metalness: 0.3,
      transparent: true,
      opacity: 0.86,
    });
    for (let i = 0; i < 6; i += 1) {
      const slab = new THREE.Mesh(boxGeo, pastBridgeMat);
      slab.scale.set(4.1, 0.36, 0.85);
      slab.position.set(0, -0.18, 3.8 + i * 0.92);
      temporalBridgeGroup.add(slab);
      bridgeSlabs.push({ mesh: slab, restY: -0.18, offset: (i % 2 === 0 ? -1 : 1) * 0.45 });
    }
    scene.add(temporalBridgeGroup);

    // Suspended Observatory Astrolabe Rings above Region 02
    const astrolabeGroup = new THREE.Group();
    astrolabeGroup.position.set(0, 7.5, -1.5);
    const ringGeoA = new THREE.TorusGeometry(6.8, 0.08, 12, 72);
    const ringGeoB = new THREE.TorusGeometry(4.9, 0.06, 12, 64);
    const ringA = new THREE.Mesh(ringGeoA, brassMat);
    const ringB = new THREE.Mesh(ringGeoB, limestoneMat);
    astrolabeGroup.add(ringA, ringB);
    scene.add(astrolabeGroup);

    // Interactable Monuments in 3D space
    // 1. Ancient Structure (archway at z = 12.5)
    const ancientArch = new THREE.Group();
    ancientArch.position.set(0, 0, 12.5);
    const pillarL = new THREE.Mesh(boxGeo, limestoneMat);
    pillarL.scale.set(0.75, 5.4, 0.75);
    pillarL.position.set(-2.2, 2.7, 0);
    const pillarR = new THREE.Mesh(boxGeo, limestoneMat);
    pillarR.scale.set(0.75, 5.4, 0.75);
    pillarR.position.set(2.2, 2.7, 0);
    const lintel = new THREE.Mesh(boxGeo, limestoneMat);
    lintel.scale.set(5.4, 0.72, 0.85);
    lintel.position.set(0, 5.6, 0);
    ancientArch.add(pillarL, pillarR, lintel);
    scene.add(ancientArch);

    // 2. Temporal Residue Pillar (x=4.2, z=15)
    const residueGroup = new THREE.Group();
    residueGroup.position.set(4.2, 1.3, 15.0);
    const residueCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      new THREE.MeshStandardMaterial({ color: 0x847a85, roughness: 0.35, metalness: 0.45 })
    );
    const residueHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.025, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0xedeae1, transparent: true, opacity: 0.45 })
    );
    residueHalo.rotation.x = Math.PI / 2;
    residueGroup.add(residueCore, residueHalo);
    scene.add(residueGroup);

    // 3. Coordinate Slab in Observatory (x=-3.4, z=-2.0)
    const coordSlab = new THREE.Mesh(boxGeo, limestoneMat);
    coordSlab.scale.set(1.2, 2.1, 0.32);
    coordSlab.position.set(-3.4, 1.05, -2.0);
    coordSlab.rotation.y = 0.42;
    scene.add(coordSlab);

    // 4. Dimensional Gate at north end of Singularity (z=-25.8)
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, -25.8);
    const gateL = new THREE.Mesh(boxGeo, basaltMat);
    gateL.scale.set(1.2, 7.6, 1.4);
    gateL.position.set(-3.4, 3.8, 0);
    const gateR = new THREE.Mesh(boxGeo, basaltMat);
    gateR.scale.set(1.2, 7.6, 1.4);
    gateR.position.set(3.4, 3.8, 0);
    const gateTop = new THREE.Mesh(boxGeo, basaltMat);
    gateTop.scale.set(8.2, 1.1, 1.4);
    gateTop.position.set(0, 7.8, 0);
    const gateVeilMat = new THREE.MeshBasicMaterial({
      color: 0xb99a70,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    const gateVeil = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 6.8), gateVeilMat);
    gateVeil.position.set(0, 3.6, 0);
    gateGroup.add(gateL, gateR, gateTop, gateVeil);
    scene.add(gateGroup);

    // 5. Collectible Artifact pedestals
    const artifactMeshes = new Map();
    const artifactGeo = new THREE.OctahedronGeometry(0.32, 0);
    ARTIFACT_CATALOG.forEach((art) => {
      if (art.initiallyOwned) return;
      const g = new THREE.Group();
      g.position.set(art.coords.x, 1.05, art.coords.z);
      const ped = new THREE.Mesh(boxGeo, slateMat);
      ped.scale.set(0.65, 0.9, 0.65);
      ped.position.y = -0.6;
      const gem = new THREE.Mesh(
        artifactGeo,
        new THREE.MeshStandardMaterial({
          color: art.color,
          roughness: 0.35,
          metalness: 0.6,
        })
      );
      g.add(ped, gem);
      scene.add(g);
      artifactMeshes.set(art.id, { group: g, gem });
    });

    // 6. Live 4D Tesseract in Region 03 (z = -19.0)
    const tesseractGroup = new THREE.Group();
    tesseractGroup.position.set(0, 3.0, -19.0);
    scene.add(tesseractGroup);

    const edgePositions = new Float32Array(TESSERACT_TOPOLOGY.edges.length * 6);
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.BufferAttribute(edgePositions, 3));
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xedeae1,
      transparent: true,
      opacity: 0.78,
    });
    const tesseractLines = new THREE.LineSegments(edgeGeo, edgeMat);
    tesseractGroup.add(tesseractLines);

    const vertexMeshes = [];
    const vertexGeo = new THREE.SphereGeometry(0.085, 10, 10);
    for (let i = 0; i < TESSERACT_TOPOLOGY.vertices.length; i += 1) {
      const vm = new THREE.Mesh(vertexGeo, brassMat);
      tesseractGroup.add(vm);
      vertexMeshes.push(vm);
    }

    // Restrained cooperative partner silhouette (when Coop mode active)
    const coopGroup = new THREE.Group();
    const coopBody = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 1.45, 12), limestoneMat);
    coopBody.position.y = 0.75;
    const coopHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), sageMat);
    coopHead.position.y = 1.68;
    coopGroup.add(coopBody, coopHead);
    scene.add(coopGroup);

    // Sparse atmospheric dust motes
    const dustCount = 120;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i += 1) {
      dustPos[i * 3] = (Math.random() - 0.5) * 38;
      dustPos[i * 3 + 1] = 0.6 + Math.random() * 14;
      dustPos[i * 3 + 2] = 28 - Math.random() * 62;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xedeae1,
      size: 0.085,
      transparent: true,
      opacity: 0.38,
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(dustPoints);

    // Subtle Mouse Drag to Look Around
    let dragLook = null;
    const onPointerDown = (e) => {
      if (simRef.current.screen !== "playing" || simRef.current.activeOverlay) return;
      dragLook = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e) => {
      if (!dragLook) return;
      const sens = 0.0032 * (settingsRef.current?.mouseSensitivity ?? 1);
      const invert = settingsRef.current?.invertY ? -1 : 1;
      const dx = e.clientX - dragLook.x;
      const dy = e.clientY - dragLook.y;
      dragLook = { x: e.clientX, y: e.clientY };
      simRef.current.player.yaw -= dx * sens;
      simRef.current.player.pitch = Math.max(
        -0.75,
        Math.min(0.72, simRef.current.player.pitch - dy * sens * invert)
      );
    };
    const onPointerUp = () => {
      dragLook = null;
    };

    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let hudSyncAccum = 0;
    const projectedCache = new Array(16);

    const tick = (now) => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      const s = simRef.current;
      const reducedMotion = Boolean(settingsRef.current?.reducedMotion);
      const events = stepAfterspaceState(s, inputRef.current, dt);

      if (events.recoveredArtifact || events.scanCompleted || events.enteredRegion) {
        onEventRef.current?.(events);
        onSyncRef.current?.();
      }

      // Environmental slow rotation
      if (!reducedMotion) {
        ringA.rotation.x = Math.sin(elapsed * 0.09) * 0.35 + 0.5;
        ringA.rotation.y += dt * 0.04;
        ringB.rotation.z -= dt * 0.06;
        residueCore.rotation.y += dt * 0.35;
        residueGroup.position.y = 1.3 + Math.sin(elapsed * 1.1) * 0.08;
        dustPoints.rotation.y = Math.sin(elapsed * 0.025) * 0.06;
      }

      // Update Artifact pickups visibility
      artifactMeshes.forEach(({ group, gem }, id) => {
        const owned = Boolean(s.ownedArtifacts[id]);
        group.visible = !owned;
        if (!owned && !reducedMotion) {
          gem.rotation.y += dt * 0.55;
        }
      });

      // Update Temporal Chasm Bridge appearance based on active or previewed timeline state
      const effectiveTempIdx =
        previewTempRef.current !== null && previewTempRef.current !== undefined
          ? previewTempRef.current
          : s.temporalIndex;

      bridgeSlabs.forEach((slab) => {
        if (effectiveTempIdx === 1) {
          // PRESENT: fractured/recessed slabs
          slab.mesh.material = pastBridgeMat;
          pastBridgeMat.opacity = 0.45;
          slab.mesh.position.y += (-1.35 - slab.mesh.position.y) * Math.min(1, dt * 4);
          slab.mesh.rotation.z += (slab.offset * 0.35 - slab.mesh.rotation.z) * Math.min(1, dt * 4);
        } else if (effectiveTempIdx === 0) {
          // PAST: intact limestone causeway
          slab.mesh.material = pastBridgeMat;
          pastBridgeMat.opacity = 1.0;
          slab.mesh.position.y += (slab.restY - slab.mesh.position.y) * Math.min(1, dt * 4.5);
          slab.mesh.rotation.z += (0 - slab.mesh.rotation.z) * Math.min(1, dt * 4.5);
        } else {
          // FUTURE: crystallized dusty blue span
          slab.mesh.material = futureBridgeMat;
          slab.mesh.position.y += (slab.restY - slab.mesh.position.y) * Math.min(1, dt * 4.5);
          slab.mesh.rotation.z += (0 - slab.mesh.rotation.z) * Math.min(1, dt * 4.5);
        }
      });

      // Update live 4D Tesseract in Singularity chamber
      const tAngles = { ...s.hypercube.angles };
      if (!s.hypercube.alignment.aligned && s.activeOverlay !== "hypercube" && !reducedMotion) {
        tAngles.XW += elapsed * 6;
      }
      for (let i = 0; i < 16; i += 1) {
        const p3 = project4Dto3D(
          TESSERACT_TOPOLOGY.vertices[i],
          tAngles,
          s.hypercube.projectionDistance
        );
        projectedCache[i] = p3;
        vertexMeshes[i].position.set(p3.x * 1.15, p3.y * 1.15, p3.z * 1.15);
      }
      const posArr = edgeGeo.attributes.position.array;
      for (let eIdx = 0; eIdx < TESSERACT_TOPOLOGY.edges.length; eIdx += 1) {
        const [a, b] = TESSERACT_TOPOLOGY.edges[eIdx];
        const pa = projectedCache[a];
        const pb = projectedCache[b];
        const offset = eIdx * 6;
        posArr[offset] = pa.x * 1.15;
        posArr[offset + 1] = pa.y * 1.15;
        posArr[offset + 2] = pa.z * 1.15;
        posArr[offset + 3] = pb.x * 1.15;
        posArr[offset + 4] = pb.y * 1.15;
        posArr[offset + 5] = pb.z * 1.15;
      }
      edgeGeo.attributes.position.needsUpdate = true;

      // Dimensional Gate glow subtly shifts when hypercube aligned
      gateVeilMat.opacity = s.hypercube.alignment.aligned ? 0.34 : 0.08;
      residueHalo.visible = s.scannerActive || INTERACTABLES[1].radius > 0;

      // Cooperative explorer partner visibility
      coopGroup.visible = s.coopMate.active && s.screen === "playing";
      if (coopGroup.visible) {
        coopGroup.position.set(s.coopMate.x, 0, s.coopMate.z);
      }

      // Scanner mode subtle atmosphere tint & temporal warmth shift
      if (s.scannerActive) {
        scene.fog.color.setHex(0x1b2122);
        scene.background.setHex(0x1b2122);
      } else if (effectiveTempIdx === 0) {
        scene.fog.color.setHex(0x1b1a17);
        scene.background.setHex(0x1b1a17);
      } else if (effectiveTempIdx === 2) {
        scene.fog.color.setHex(0x171d20);
        scene.background.setHex(0x171d20);
      } else {
        scene.fog.color.setHex(0x151a19);
        scene.background.setHex(0x151a19);
      }

      // Camera framing per screen
      if (s.screen === "menu" || s.screen === "setup") {
        const driftX = Math.sin(elapsed * 0.07) * 3.2;
        const targetZ = s.screen === "setup" ? 19.5 : 27.5 - Math.sin(elapsed * 0.04) * 1.5;
        camera.position.lerp(new THREE.Vector3(driftX, 3.8, targetZ), Math.min(1, dt * 1.8));
        camera.lookAt(0, 2.8, -14);
      } else if (s.screen === "complete") {
        camera.position.lerp(new THREE.Vector3(2.8, 4.6, -15.5), Math.min(1, dt * 1.4));
        camera.lookAt(0, 3.2, -25.8);
      } else {
        const eyeY = 1.72;
        camera.position.set(s.player.x, eyeY, s.player.z);
        camera.rotation.order = "YXZ";
        camera.rotation.y = s.player.yaw;
        camera.rotation.x = s.player.pitch;
      }

      renderer.render(scene, camera);

      hudSyncAccum += dt;
      if (hudSyncAccum >= 0.12) {
        hudSyncAccum = 0;
        onSyncRef.current?.();
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", onResize);
      if (dom.parentNode === container) container.removeChild(dom);
      renderer.dispose();
    };
  }, [inputRef, settingsRef, simRef]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      aria-label="AFTERSPACE 3D Observatory Environment"
    />
  );
};

AfterspaceWorld3D.propTypes = {
  simRef: PropTypes.object.isRequired,
  inputRef: PropTypes.object.isRequired,
  settingsRef: PropTypes.object.isRequired,
  previewTemporalIndex: PropTypes.number,
  onSyncHud: PropTypes.func,
  onDiscoveryEvent: PropTypes.func,
};

export default AfterspaceWorld3D;

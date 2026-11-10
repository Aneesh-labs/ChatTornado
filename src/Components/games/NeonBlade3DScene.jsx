import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as THREE from "three";
import { createGlowHaloTexture } from "./vortexBastion/textures3D";
import {
  BLADE_SKINS,
  CORE_Y,
  TARGET_RADIUS,
  STANDBY_Y,
} from "./neonBladeEngine";

function getSkinSpec(skinId) {
  return BLADE_SKINS.find((sk) => sk.id === skinId) || BLADE_SKINS[0];
}

function buildBladeMesh3D(skinId = "cyber") {
  const isHazard = skinId === "hazard";
  const spec = getSkinSpec(skinId);
  const group = new THREE.Group();

  const mainColor = isHazard ? 0x94a3b8 : spec.hexNum;
  const accentColor = isHazard ? 0xf43f5e : spec.hexNum;

  // Metallic / plasma blade tip pointing +Y (length ~ 0.95, tip at y = +0.62, hilt at y = -0.32)
  let bladeGeo;
  if (skinId === "void") {
    bladeGeo = new THREE.ConeGeometry(0.13, 0.88, 5);
  } else if (skinId === "kunai") {
    bladeGeo = new THREE.OctahedronGeometry(0.14, 0);
  } else if (skinId === "solar") {
    bladeGeo = new THREE.BoxGeometry(0.1, 0.96, 0.045);
  } else {
    bladeGeo = new THREE.ConeGeometry(0.11, 0.88, 4);
  }

  const bladeMat = new THREE.MeshStandardMaterial({
    color: isHazard ? 0x64748b : 0xf8fafc,
    emissive: mainColor,
    emissiveIntensity: isHazard ? 0.35 : 0.72,
    metalness: 0.85,
    roughness: 0.18,
  });
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  if (skinId === "kunai") {
    blade.scale.set(0.9, 2.7, 0.45);
    blade.position.y = 0.24;
  } else if (skinId === "solar") {
    blade.position.y = 0.22;
  } else {
    blade.scale.set(1, 1, 0.45);
    blade.position.y = 0.22;
  }
  group.add(blade);

  // Crossguard / collar
  const guardGeo =
    skinId === "solar"
      ? new THREE.CylinderGeometry(0.19, 0.19, 0.05, 14)
      : new THREE.BoxGeometry(skinId === "void" ? 0.36 : 0.3, 0.06, 0.12);
  const guardMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: accentColor,
    emissiveIntensity: 0.45,
    metalness: 0.9,
    roughness: 0.25,
  });
  const guard = new THREE.Mesh(guardGeo, guardMat);
  guard.position.y = -0.22;
  group.add(guard);

  // Grip
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.05, 0.32, 8),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.4 })
  );
  grip.position.y = -0.4;
  group.add(grip);

  // Emissive pommel crystal
  const pommel = new THREE.Mesh(
    skinId === "kunai" ? new THREE.TorusGeometry(0.08, 0.022, 8, 16) : new THREE.OctahedronGeometry(0.068, 0),
    new THREE.MeshBasicMaterial({ color: accentColor })
  );
  pommel.position.y = -0.6;
  group.add(pommel);

  return group;
}

function buildTargetCoreMesh3D() {
  const group = new THREE.Group();

  // Dark metallic core rotor
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(TARGET_RADIUS, TARGET_RADIUS, 0.54, 28),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.25,
    })
  );
  drum.rotation.x = Math.PI / 2;
  group.add(drum);

  // Glowing neon outer rim torus (face toward camera +Z and -Z)
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xf43f5e,
    emissiveIntensity: 0.95,
    metalness: 0.5,
    roughness: 0.2,
  });
  const frontRim = new THREE.Mesh(new THREE.TorusGeometry(TARGET_RADIUS - 0.06, 0.085, 12, 40), rimMat);
  frontRim.position.z = 0.26;
  frontRim.name = "coreRim";
  group.add(frontRim);

  // Radial tech notches around rim for crisp rotation readability
  const studMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const notch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.6), studMat);
    notch.position.set(Math.sin(ang) * (TARGET_RADIUS - 0.1), -Math.cos(ang) * (TARGET_RADIUS - 0.1), 0);
    notch.rotation.z = ang;
    group.add(notch);
  }

  // Inner spinning crystal hub
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.85,
    metalness: 0.4,
    roughness: 0.15,
  });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), innerMat);
  crystal.position.z = 0.28;
  crystal.scale.set(1, 1, 0.55);
  crystal.name = "coreCrystal";
  group.add(crystal);

  return { group, rimMat, innerMat, crystal };
}

const NeonBlade3DScene = ({ simRef, onStep, onThrow }) => {
  const mountRef = useRef(null);
  const callbacksRef = useRef({ onStep, onThrow });

  useEffect(() => {
    callbacksRef.current = { onStep, onThrow };
  }, [onStep, onThrow]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040712);

    const camera = new THREE.PerspectiveCamera(
      46,
      Math.max(0.5, container.clientWidth / Math.max(1, container.clientHeight)),
      0.1,
      80
    );
    camera.position.set(0, -0.15, 11.8);
    camera.lookAt(0, -0.15, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    const updateCameraFit = () => {
      const w = container.clientWidth || 360;
      const h = container.clientHeight || 480;
      const aspect = Math.max(0.48, w / Math.max(1, h));
      camera.aspect = aspect;
      const neededZ = Math.max(11.4, 3.15 / (0.4245 * Math.min(1.0, aspect)));
      camera.userData.baseZ = neededZ;
      camera.position.z = neededZ;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    updateCameraFit();
    const resizeObserver = new ResizeObserver(updateCameraFit);
    resizeObserver.observe(container);

    // Lighting
    scene.add(new THREE.AmbientLight(0xdbeafe, 0.85));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(4, 7, 10);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 3.2, 22);
    rimLight.position.set(0, CORE_Y, 4.2);
    scene.add(rimLight);

    const lowerGlow = new THREE.PointLight(0xf43f5e, 1.8, 16);
    lowerGlow.position.set(0, STANDBY_Y, 3);
    scene.add(lowerGlow);

    const glowTex = createGlowHaloTexture();

    // Backdrop Holographic Forge Rings + Floating Embers
    const bgHalo1 = new THREE.Mesh(
      new THREE.TorusGeometry(4.4, 0.035, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.24 })
    );
    bgHalo1.position.set(0, CORE_Y, -3.5);
    scene.add(bgHalo1);

    const bgHalo2 = new THREE.Mesh(
      new THREE.TorusGeometry(3.3, 0.025, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.22 })
    );
    bgHalo2.position.set(0, CORE_Y, -2.5);
    scene.add(bgHalo2);

    const emberCount = 80;
    const emberPos = new Float32Array(emberCount * 3);
    for (let i = 0; i < emberCount; i++) {
      emberPos[i * 3] = (Math.random() - 0.5) * 10;
      emberPos[i * 3 + 1] = (Math.random() - 0.5) * 11;
      emberPos[i * 3 + 2] = -4 - Math.random() * 6;
    }
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
    const embers = new THREE.Points(
      emberGeo,
      new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.09, transparent: true, opacity: 0.5 })
    );
    scene.add(embers);

    // Core Wheel Assembly
    const { group: wheelGroup, rimMat, innerMat, crystal } = buildTargetCoreMesh3D();
    wheelGroup.position.set(0, CORE_Y, 0);
    scene.add(wheelGroup);

    const attachedLayer = new THREE.Group();
    wheelGroup.add(attachedLayer);

    // Dynamic Layers
    const flyingLayer = new THREE.Group();
    scene.add(flyingLayer);

    const debrisLayer = new THREE.Group();
    scene.add(debrisLayer);

    const standbyMount = new THREE.Group();
    standbyMount.position.set(0, STANDBY_Y, 0.15);
    scene.add(standbyMount);
    let cachedStandbySkin = null;

    // Blade template cache per skin to clone cheaply
    const bladeTemplates = new Map();
    const getBladeClone = (skinId) => {
      if (!bladeTemplates.has(skinId)) {
        bladeTemplates.set(skinId, buildBladeMesh3D(skinId));
      }
      return bladeTemplates.get(skinId).clone();
    };

    // Pooled / dynamic spark particles
    const sparks = [];
    const sparkGeo = new THREE.OctahedronGeometry(0.09, 0);
    const sparkLayer = new THREE.Group();
    scene.add(sparkLayer);

    const popupsLayer = new THREE.Group();
    scene.add(popupsLayer);
    const popupTexCache = new Map();

    // Sync stuck knives & orbs efficiently only when counts/skin change
    let lastStuckCount = -1;
    let lastLevel = -1;
    const orbNodes = [];
    const stuckNodes = [];

    let lastTime = performance.now();
    let rafId;

    const animate = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      callbacksRef.current.onStep?.(dt);
      const s = simRef.current;

      // Update ember drift
      const posAttr = emberGeo.attributes.position;
      for (let i = 0; i < emberCount; i++) {
        posAttr.array[i * 3 + 1] += dt * 0.65;
        if (posAttr.array[i * 3 + 1] > 5.5) posAttr.array[i * 3 + 1] = -5.5;
      }
      posAttr.needsUpdate = true;

      bgHalo1.rotation.z += dt * 0.25;
      bgHalo2.rotation.z -= dt * 0.35;

      // Camera shake + subtle Overdrive/Chrono zoom
      const baseZ = camera.userData.baseZ || 11.8;
      let cx = 0;
      let cy = -0.15;
      if (s.shakeTimer > 0) {
        cx += (Math.random() - 0.5) * s.shakeIntensity * 2;
        cy += (Math.random() - 0.5) * s.shakeIntensity * 2;
      }
      const zoomOffset = s.overdriveTimer > 0 ? -0.35 : s.chronoTimer > 0 ? 0.25 : 0;
      camera.position.set(cx, cy, baseZ + zoomOffset);

      // Update Wheel Visibility & Theme
      const showWheel = s.phase !== "shattering" && s.phase !== "levelclear";
      wheelGroup.visible = showWheel;
      wheelGroup.position.set(0, CORE_Y, -s.recoilZ);
      wheelGroup.rotation.z = s.targetAngle;

      if (showWheel) {
        crystal.rotation.z -= dt * 1.8;
        crystal.rotation.x += dt * 0.9;
        const pulse = 1 + s.recoilZ * 0.75 + Math.sin(now * 0.006) * 0.04;
        crystal.scale.set(pulse, pulse, 0.55 * pulse);

        if (s.chronoTimer > 0) {
          rimMat.color.setHex(0x38bdf8);
          rimMat.emissive.setHex(0x0ea5e9);
          innerMat.emissive.setHex(0x67e8f9);
          rimLight.color.setHex(0x38bdf8);
        } else if (s.overdriveTimer > 0) {
          rimMat.color.setHex(0xe879f9);
          rimMat.emissive.setHex(0xd946ef);
          innerMat.emissive.setHex(0xfbbf24);
          rimLight.color.setHex(0xe879f9);
        } else if (s.isBoss) {
          rimMat.color.setHex(0xfbbf24);
          rimMat.emissive.setHex(0xd97706);
          innerMat.emissive.setHex(0xf43f5e);
          rimLight.color.setHex(0xfbbf24);
        } else {
          rimMat.color.setHex(0xf43f5e);
          rimMat.emissive.setHex(0xe11d48);
          innerMat.emissive.setHex(0x06b6d4);
          rimLight.color.setHex(0x38bdf8);
        }
      }

      // Rebuild stuck knives & orb pivots if stage changed or new knife stuck
      if (lastLevel !== s.level || lastStuckCount !== s.stuckKnives.length) {
        while (attachedLayer.children.length > 0) {
          attachedLayer.remove(attachedLayer.children[0]);
        }
        stuckNodes.length = 0;
        orbNodes.length = 0;

        for (const k of s.stuckKnives) {
          const pivot = new THREE.Group();
          pivot.rotation.z = k.angle;
          const mesh = getBladeClone(k.skin);
          mesh.position.y = -TARGET_RADIUS - 0.16;
          pivot.add(mesh);
          attachedLayer.add(pivot);
          stuckNodes.push({ data: k, mesh });
        }

        for (const orb of s.orbs) {
          const pivot = new THREE.Group();
          pivot.rotation.z = orb.angle;
          const isChrono = orb.type === "chrono";
          const orbGroup = new THREE.Group();
          orbGroup.position.set(0, -(TARGET_RADIUS + 0.34), 0.1);

          const gem = new THREE.Mesh(
            isChrono ? new THREE.OctahedronGeometry(0.24, 0) : new THREE.DodecahedronGeometry(0.22, 0),
            new THREE.MeshStandardMaterial({
              color: isChrono ? 0x67e8f9 : 0xfde047,
              emissive: isChrono ? 0x06b6d4 : 0xf59e0b,
              emissiveIntensity: 0.9,
              metalness: 0.3,
              roughness: 0.1,
            })
          );
          orbGroup.add(gem);

          const halo = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: glowTex,
              color: isChrono ? 0x38bdf8 : 0xfbbf24,
              transparent: true,
              opacity: 0.72,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            })
          );
          halo.scale.set(0.95, 0.95, 1);
          orbGroup.add(halo);

          pivot.add(orbGroup);
          attachedLayer.add(pivot);
          orbNodes.push({ data: orb, pivot, orbGroup });
        }

        lastLevel = s.level;
        lastStuckCount = s.stuckKnives.length;
      }

      // Per-frame recoil on stuck knives & visibility of orbs
      for (const sn of stuckNodes) {
        sn.mesh.position.y = -TARGET_RADIUS - 0.16 + (sn.data.recoil || 0) * 0.45;
      }
      for (const on of orbNodes) {
        on.pivot.visible = !on.data.sliced;
        if (!on.data.sliced) {
          on.orbGroup.rotation.y += dt * 3.8;
        }
      }

      // Standby ready blade at bottom
      if (cachedStandbySkin !== s.skin) {
        while (standbyMount.children.length > 0) {
          standbyMount.remove(standbyMount.children[0]);
        }
        standbyMount.add(getBladeClone(s.skin));
        cachedStandbySkin = s.skin;
      }
      const hasStock = s.phase === "playing" && s.knivesLeft > 0;
      standbyMount.visible = hasStock;
      if (hasStock) {
        standbyMount.position.y = STANDBY_Y + Math.sin(now * 0.008) * 0.05;
        lowerGlow.color.setHex(getSkinSpec(s.skin).hexNum);
      }

      // Flying blades
      while (flyingLayer.children.length > 0) {
        flyingLayer.remove(flyingLayer.children[0]);
      }
      for (const fk of s.flyingKnives) {
        const mesh = getBladeClone(fk.skin);
        mesh.position.set(0, fk.y, 0.15);
        flyingLayer.add(mesh);

        // Energy speed streak behind flying blade
        const trail = new THREE.Mesh(
          new THREE.PlaneGeometry(0.16, 1.05),
          new THREE.MeshBasicMaterial({
            color: getSkinSpec(fk.skin).hexNum,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        trail.position.set(0, fk.y - 0.65, 0.1);
        flyingLayer.add(trail);
      }

      // Shatter Shards & Ricochet Blades
      while (debrisLayer.children.length > 0) {
        debrisLayer.remove(debrisLayer.children[0]);
      }
      for (const sh of s.shatterShards) {
        const chunk = new THREE.Mesh(
          new THREE.TetrahedronGeometry(0.45, 0),
          new THREE.MeshStandardMaterial({
            color: sh.isBoss ? 0xfbbf24 : 0xf43f5e,
            emissive: sh.isBoss ? 0xd97706 : 0xe11d48,
            emissiveIntensity: 0.65,
            metalness: 0.7,
            roughness: 0.25,
          })
        );
        chunk.position.set(sh.x, sh.y, sh.z);
        chunk.rotation.set(sh.rx, sh.ry, sh.rz);
        debrisLayer.add(chunk);
      }
      for (const rb of s.ricochetBlades) {
        const mesh = getBladeClone(rb.skin);
        mesh.position.set(rb.x, rb.y, rb.z);
        mesh.rotation.set(rb.rx, 0, rb.rz);
        debrisLayer.add(mesh);
      }

      // Consume Burst Queue -> 3D Sparks
      if (s.burstQueue.length > 0) {
        for (const b of s.burstQueue) {
          for (let i = 0; i < b.count; i++) {
            const spMesh = new THREE.Mesh(
              sparkGeo,
              new THREE.MeshBasicMaterial({ color: b.color, transparent: true, opacity: 1 })
            );
            spMesh.position.set(b.x, b.y, b.z);
            sparkLayer.add(spMesh);
            sparks.push({
              mesh: spMesh,
              vx: (Math.random() - 0.5) * 9,
              vy: (Math.random() - 0.35) * 9,
              vz: (Math.random() - 0.2) * 6,
              life: 0.45 + Math.random() * 0.25,
              maxLife: 0.7,
            });
          }
        }
        s.burstQueue.length = 0;
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.life -= dt;
        if (sp.life <= 0) {
          sparkLayer.remove(sp.mesh);
          sp.mesh.material.dispose();
          sparks.splice(i, 1);
          continue;
        }
        sp.mesh.position.x += sp.vx * dt;
        sp.mesh.position.y += sp.vy * dt;
        sp.mesh.position.z += sp.vz * dt;
        sp.vy -= 14 * dt;
        sp.mesh.scale.setScalar(Math.max(0.2, sp.life / sp.maxLife));
        sp.mesh.material.opacity = Math.max(0, sp.life / sp.maxLife);
      }

      // Floating Popups (cached CanvasTexture sprites)
      while (popupsLayer.children.length > 0) {
        const sp = popupsLayer.children[0];
        popupsLayer.remove(sp);
        sp.material.dispose();
      }
      for (const p of s.popups) {
        const key = `${p.text}|${p.color}`;
        let tex = popupTexCache.get(key);
        if (!tex) {
          const canvas = document.createElement("canvas");
          canvas.width = 320;
          canvas.height = 80;
          const ctx = canvas.getContext("2d");
          ctx.font = "900 32px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.lineWidth = 7;
          ctx.strokeStyle = "#020617";
          ctx.strokeText(p.text, 160, 40);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, 160, 40);
          tex = new THREE.CanvasTexture(canvas);
          tex.colorSpace = THREE.SRGBColorSpace;
          popupTexCache.set(key, tex);
        }
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            opacity: Math.max(0, Math.min(1, p.life * 1.4)),
            depthWrite: false,
          })
        );
        sprite.position.set(p.x, p.y, 1.2);
        sprite.scale.set(2.9, 0.72, 1);
        popupsLayer.add(sprite);
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
      emberGeo.dispose();
      sparkGeo.dispose();
      for (const tex of popupTexCache.values()) tex.dispose();
      popupTexCache.clear();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [simRef]);

  const handlePointerDown = (e) => {
    e.preventDefault();
    callbacksRef.current.onThrow?.();
  };

  return (
    <div
      ref={mountRef}
      onPointerDown={handlePointerDown}
      className="w-full h-full touch-none select-none cursor-crosshair"
    />
  );
};

NeonBlade3DScene.propTypes = {
  simRef: PropTypes.shape({ current: PropTypes.object }).isRequired,
  onStep: PropTypes.func,
  onThrow: PropTypes.func,
};

export default NeonBlade3DScene;

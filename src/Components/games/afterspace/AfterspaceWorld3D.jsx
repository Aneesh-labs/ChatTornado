import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as THREE from "three";
import {
  ARTIFACT_CATALOG,
  INTERACTABLES,
  TESSERACT_TOPOLOGY,
  findNearestInteractable,
  project4Dto3D,
  stepAfterspaceState,
} from "./afterspaceEngine";

const SKY_VERT = `
varying vec3 vWorldPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SKY_FRAG = `
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
varying vec3 vWorldPos;

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  vec3 dir = normalize(vWorldPos - vec3(0.0, 0.0, 10.0));
  float h = clamp(dir.y * 1.15 + 0.14, 0.0, 1.0);
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.28, h));
  col = mix(col, uZenith, smoothstep(0.28, 0.88, h));

  // Subtle observatory starfield high above horizon
  vec3 starGrid = floor(dir * 210.0);
  float starSeed = hash3(starGrid);
  if (starSeed > 0.9962) {
    float twinkle = (starSeed - 0.9962) / 0.0038;
    float skyMask = smoothstep(0.32, 0.82, h);
    col += vec3(0.92, 0.90, 0.84) * twinkle * skyMask * 0.55;
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

function computeTargetElevation(x, z) {
  if (z > 23.2) return 0.48;
  if (z > 21.0) return 0.24;
  if (z >= -4.2 && z <= 1.2 && Math.hypot(x, z + 1.5) < 6.4) return -0.22;
  if (z <= -16.5 && z >= -22.2 && Math.hypot(x, z + 19.0) < 4.5) return 0.22;
  return 0.0;
}

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
    scene.fog = new THREE.FogExp2(0x1f2324, 0.0145);

    const camera = new THREE.PerspectiveCamera(56, width / height, 0.1, 220);
    camera.position.set(-5.8, 5.4, 27.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    const dprCap = settingsRef.current?.graphicsPreset === "Medium" ? 1.25 : 1.75;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    // GLSL Atmospheric Twilight-Observatory Sky Dome
    const skyUniforms = {
      uZenith: { value: new THREE.Color(0x0f1416) },
      uMid: { value: new THREE.Color(0x23292b) },
      uHorizon: { value: new THREE.Color(0x5b4d42) },
    };
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(165, 32, 24),
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        uniforms: skyUniforms,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    scene.add(skyDome);

    // Sculptural Sunset / Dusk Lighting + Soft Cast Shadows
    const hemi = new THREE.HemisphereLight(0xedeae1, 0x161b1b, 0.65);
    scene.add(hemi);

    const sunLight = new THREE.DirectionalLight(0xf3eadc, 2.0);
    sunLight.position.set(22, 32, 16);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 4;
    sunLight.shadow.camera.far = 115;
    sunLight.shadow.camera.left = -36;
    sunLight.shadow.camera.right = 36;
    sunLight.shadow.camera.top = 36;
    sunLight.shadow.camera.bottom = -36;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const bounceLight = new THREE.DirectionalLight(0x8496a1, 0.55);
    bounceLight.position.set(-24, 14, -26);
    scene.add(bounceLight);

    // Distant Astronomical Bodies (Eclipsed Ivory Giant + Companion Moon)
    const celestialGroup = new THREE.Group();
    celestialGroup.position.set(-24, 34, -108);
    const planetMesh = new THREE.Mesh(
      new THREE.SphereGeometry(13.5, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xe6dfd3, transparent: true, opacity: 0.78 })
    );
    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(17.5, 19.6, 80),
      new THREE.MeshBasicMaterial({
        color: 0xb99a70,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.36,
      })
    );
    innerRing.rotation.set(1.18, 0.28, -0.18);
    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(21.2, 21.8, 80),
      new THREE.MeshBasicMaterial({
        color: 0xedeae1,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.22,
      })
    );
    outerRing.rotation.copy(innerRing.rotation);
    const smallMoon = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xd5d2c8, transparent: true, opacity: 0.65 })
    );
    smallMoon.position.set(32, -8, 12);
    celestialGroup.add(planetMesh, innerRing, outerRing, smallMoon);
    scene.add(celestialGroup);

    // Procedural Stone Masonry & Brushed Patina Textures
    const createStoneMaps = (baseHex, seamHex, grainAlpha = 0.08) => {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 256;
      const g = c.getContext("2d");
      g.fillStyle = baseHex;
      g.fillRect(0, 0, 256, 256);

      for (let i = 0; i < 1600; i += 1) {
        g.fillStyle = i % 2 === 0 ? `rgba(255,255,255,${grainAlpha})` : `rgba(0,0,0,${grainAlpha * 1.2})`;
        g.fillRect((i * 73) % 256, (i * 137) % 256, 2, 2);
      }

      g.strokeStyle = seamHex;
      g.lineWidth = 2;
      for (let y = 0; y < 256; y += 64) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(256, y);
        g.stroke();
        const offset = (y / 64) % 2 === 0 ? 0 : 64;
        for (let x = offset; x < 256; x += 128) {
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x, y + 64);
          g.stroke();
        }
      }

      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3, 3);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const basaltTex = createStoneMaps("#202625", "rgba(10,14,13,0.42)", 0.05);
    const slateTex = createStoneMaps("#2e3533", "rgba(12,16,15,0.36)", 0.06);
    const travTex = createStoneMaps("#d5d2c8", "rgba(110,104,92,0.28)", 0.07);

    // Architectural Materials (Travertine Limestone, Basalt, Obsidian Mirror, Aged Brass, Sage)
    const basaltMat = new THREE.MeshStandardMaterial({
      map: basaltTex,
      bumpMap: basaltTex,
      bumpScale: 0.04,
      roughness: 0.88,
      metalness: 0.08,
    });
    const slateMat = new THREE.MeshStandardMaterial({
      map: slateTex,
      bumpMap: slateTex,
      bumpScale: 0.035,
      roughness: 0.82,
      metalness: 0.14,
    });
    const travertineMat = new THREE.MeshStandardMaterial({
      map: travTex,
      bumpMap: travTex,
      bumpScale: 0.03,
      roughness: 0.84,
      metalness: 0.04,
    });
    const ivoryAccentMat = new THREE.MeshStandardMaterial({
      color: 0xedeae1,
      roughness: 0.72,
      metalness: 0.05,
    });
    const obsidianMirrorMat = new THREE.MeshStandardMaterial({
      color: 0x151b1c,
      roughness: 0.12,
      metalness: 0.88,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xb99a70,
      roughness: 0.32,
      metalness: 0.82,
    });
    const sageMat = new THREE.MeshStandardMaterial({
      color: 0x89988a,
      roughness: 0.55,
      metalness: 0.2,
    });

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 16);

    const addShadowBox = (parent, sx, sy, sz, x, y, z, mat, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(boxGeo, mat);
      m.scale.set(sx, sy, sz);
      m.position.set(x, y, z);
      if (rx || ry || rz) m.rotation.set(rx, ry, rz);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };

    // Sculpted Sandstone-Basalt Canyon Valley Terrain around the Sanctuary
    const terrainGeo = new THREE.PlaneGeometry(240, 240, 56, 56);
    terrainGeo.rotateX(-Math.PI / 2);
    const tPos = terrainGeo.attributes.position;
    for (let i = 0; i < tPos.count; i += 1) {
      const tx = tPos.getX(i);
      const tz = tPos.getZ(i);
      const canyonDist = Math.max(0, Math.abs(tx) - 14.5);
      const ridge =
        Math.pow(canyonDist * 0.11, 1.35) * 4.2 +
        Math.sin(tx * 0.09) * Math.cos(tz * 0.08) * 2.4;
      const chasmDip = tz > 1.5 && tz < 10.5 && Math.abs(tx) < 15 ? -3.5 : 0;
      tPos.setY(i, -6.2 + ridge + chasmDip);
    }
    terrainGeo.computeVertexNormals();
    const canyonTerrain = new THREE.Mesh(
      terrainGeo,
      new THREE.MeshStandardMaterial({
        color: 0x262422,
        roughness: 0.94,
        metalness: 0.04,
      })
    );
    canyonTerrain.receiveShadow = true;
    scene.add(canyonTerrain);

    // Subtle Volumetric Sunlight Shafts streaming through Ancient Gate Oculus & Observatory
    const shaftGeo = new THREE.CylinderGeometry(0.95, 3.8, 22, 18, 1, true);
    const shaftMat = new THREE.MeshBasicMaterial({
      color: 0xedeae1,
      transparent: true,
      opacity: 0.045,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const rayPositions = [
      [-1.5, 9.5, 11.5],
      [-2.0, 9.8, -1.8],
      [-2.2, 10.2, -19.2],
    ];
    rayPositions.forEach(([rx, ry, rz]) => {
      const ray = new THREE.Mesh(shaftGeo, shaftMat);
      ray.position.set(rx, ry, rz);
      ray.rotation.set(0.18, 0, -0.38);
      scene.add(ray);
    });

    // Subtle Smooth Step Rhythm & Eye-Elevation
    let walkBob = 0;

    // ─── REGION 01: THE FORGOTTEN GATEWAY ────────────────────────
    const gatewayGroup = new THREE.Group();
    scene.add(gatewayGroup);

    // Main monolithic foundation + stepped arrival terrace
    addShadowBox(gatewayGroup, 24, 6, 21, 0, -3.0, 19.5, basaltMat);
    addShadowBox(gatewayGroup, 16, 0.24, 6.2, 0, 0.12, 24.8, travertineMat);
    addShadowBox(gatewayGroup, 14, 0.24, 4.4, 0, 0.36, 26.2, slateMat);
    // Flanking shallow mirror pools
    addShadowBox(gatewayGroup, 4.2, 0.06, 12.0, -7.8, 0.02, 16.5, obsidianMirrorMat);
    addShadowBox(gatewayGroup, 4.2, 0.06, 12.0, 7.8, 0.02, 16.5, obsidianMirrorMat);

    // 10 Colonnade Pillars flanking the promenade
    for (let i = 0; i < 5; i += 1) {
      const pz = 22.0 - i * 2.4;
      for (const sx of [-5.0, 5.0]) {
        const col = new THREE.Mesh(cylGeo, slateMat);
        col.scale.set(0.32, 6.2, 0.32);
        col.position.set(sx, 3.1, pz);
        col.castShadow = true;
        col.receiveShadow = true;
        gatewayGroup.add(col);
        addShadowBox(gatewayGroup, 0.95, 0.28, 0.95, sx, 0.14, pz, travertineMat);
        addShadowBox(gatewayGroup, 1.05, 0.34, 1.05, sx, 6.2, pz, travertineMat);
      }
    }

    // Architrave beams atop colonnade + Stepped 5-riser Arrival Staircase
    addShadowBox(gatewayGroup, 0.85, 0.45, 11.4, -5.0, 6.58, 17.2, travertineMat);
    addShadowBox(gatewayGroup, 0.85, 0.45, 11.4, 5.0, 6.58, 17.2, travertineMat);

    for (let step = 0; step < 5; step += 1) {
      addShadowBox(
        gatewayGroup,
        12.4,
        0.09,
        0.55,
        0,
        0.045 + step * 0.09,
        21.6 + step * 0.52,
        step % 2 === 0 ? travertineMat : slateMat
      );
    }

    // Museum-style low travertine plinth lanterns along promenade edge
    const lanternCapMat = new THREE.MeshBasicMaterial({ color: 0xebd7b8 });
    [21.4, 15.8].forEach((lz) => {
      for (const lx of [-3.6, 3.6]) {
        addShadowBox(gatewayGroup, 0.42, 0.85, 0.42, lx, 0.42, lz, slateMat);
        const cap = new THREE.Mesh(boxGeo, lanternCapMat);
        cap.scale.set(0.32, 0.12, 0.32);
        cap.position.set(lx, 0.9, lz);
        gatewayGroup.add(cap);
      }
    });
    const promenadeGlow = new THREE.PointLight(0xe5c99f, 1.35, 18, 1.5);
    promenadeGlow.position.set(0, 2.8, 18.5);
    gatewayGroup.add(promenadeGlow);

    const chamberGlow = new THREE.PointLight(0xdcc29a, 1.8, 22, 1.4);
    chamberGlow.position.set(0, 5.2, -19.0);
    scene.add(chamberGlow);

    // Subtle ground highlight ring indicating current active interactable
    const focusRingMat = new THREE.MeshBasicMaterial({
      color: 0xb99a70,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    });
    const focusRing = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.24, 48), focusRingMat);
    focusRing.rotation.x = -Math.PI / 2;
    focusRing.visible = false;
    scene.add(focusRing);

    // Ancient Structure Gate at z = 12.5 with carved Circular Oculus
    const ancientArch = new THREE.Group();
    ancientArch.position.set(0, 0, 12.5);
    addShadowBox(ancientArch, 1.45, 6.8, 1.25, -2.55, 3.4, 0, travertineMat);
    addShadowBox(ancientArch, 1.45, 6.8, 1.25, 2.55, 3.4, 0, travertineMat);
    addShadowBox(ancientArch, 7.4, 1.15, 1.45, 0, 7.25, 0, slateMat);
    const oculusRing = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.14, 16, 48), brassMat);
    oculusRing.position.set(0, 5.3, 0);
    oculusRing.castShadow = true;
    ancientArch.add(oculusRing);
    gatewayGroup.add(ancientArch);

    // Temporal Residue Cantilevered Sanctuary (x = 4.2, z = 15.0)
    addShadowBox(gatewayGroup, 3.0, 0.28, 3.0, 4.2, 0.14, 15.0, travertineMat);
    const residueGroup = new THREE.Group();
    residueGroup.position.set(4.2, 1.65, 15.0);
    const residueCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.56, 0),
      new THREE.MeshStandardMaterial({ color: 0x847a85, roughness: 0.32, metalness: 0.45 })
    );
    residueCore.castShadow = true;
    const residueRing = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.03, 12, 48), brassMat);
    const residueRingB = new THREE.Mesh(
      new THREE.TorusGeometry(1.22, 0.02, 10, 48),
      ivoryAccentMat
    );
    residueRing.rotation.x = Math.PI / 2;
    residueGroup.add(residueCore, residueRing, residueRingB);
    scene.add(residueGroup);

    // ─── TEMPORAL CHASM BRIDGE (z = 3.2 .. 8.8) ───────────────────
    // Abyssal support piers
    for (const bz of [4.2, 7.8]) {
      addShadowBox(scene, 3.2, 8.0, 0.9, 0, -4.4, bz, basaltMat);
    }
    const bridgeSlabs = [];
    const pastBridgeMat = travertineMat.clone();
    pastBridgeMat.transparent = true;
    const futureBridgeMat = new THREE.MeshStandardMaterial({
      color: 0x8496a1,
      roughness: 0.25,
      metalness: 0.4,
      transparent: true,
      opacity: 0.88,
    });
    for (let i = 0; i < 6; i += 1) {
      const slab = new THREE.Mesh(boxGeo, pastBridgeMat);
      slab.scale.set(4.1, 0.42, 0.88);
      slab.position.set(0, -0.21, 3.8 + i * 0.92);
      slab.castShadow = true;
      slab.receiveShadow = true;
      scene.add(slab);
      bridgeSlabs.push({
        mesh: slab,
        restY: -0.21,
        tilt: (i % 2 === 0 ? -1 : 1) * 0.38,
      });
    }

    // ─── REGION 02: THE FRACTURED OBSERVATORY (z = -6.5 .. 3.5) ──
    const obsGroup = new THREE.Group();
    scene.add(obsGroup);
    addShadowBox(obsGroup, 24, 6, 10, 0, -3.0, -1.5, slateMat);
    // Obsidian sunken observatory bowl at z = -1.5
    const bowlDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(5.8, 5.8, 0.08, 48),
      obsidianMirrorMat
    );
    bowlDisc.position.set(0, 0.01, -1.5);
    bowlDisc.receiveShadow = true;
    obsGroup.add(bowlDisc);
    // Inlaid brass meridian circles on plaza floor
    [3.2, 5.6].forEach((r) => {
      const meridian = new THREE.Mesh(new THREE.RingGeometry(r - 0.05, r + 0.05, 64), brassMat);
      meridian.rotation.x = -Math.PI / 2;
      meridian.position.set(0, 0.06, -1.5);
      obsGroup.add(meridian);
    });
    // Tilted astronomical gnomon spire
    addShadowBox(obsGroup, 0.35, 5.6, 0.55, 4.6, 2.2, -3.6, ivoryAccentMat, -0.22, -0.35, 0.14);

    // Coordinate Slab Pedestal (x = -3.4, z = -2.0)
    const coordSlab = addShadowBox(obsGroup, 1.35, 2.25, 0.36, -3.4, 1.12, -2.0, travertineMat, 0, 0.46, 0);
    addShadowBox(coordSlab, 0.82, 0.06, 0.42, 0, 0.12, 0, brassMat);

    // Colossal Overhead Rotating Armillary Sphere Rings
    const astrolabeGroup = new THREE.Group();
    astrolabeGroup.position.set(0, 8.8, -1.5);
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(7.8, 0.12, 16, 80), brassMat);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(6.1, 0.09, 16, 72), travertineMat);
    const ringC = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.07, 16, 64), brassMat);
    [ringA, ringB, ringC].forEach((r) => {
      r.castShadow = true;
    });
    astrolabeGroup.add(ringA, ringB, ringC);
    scene.add(astrolabeGroup);

    // Connecting Bridge (Observatory -> Singularity, z = -11.8 .. -6.2)
    addShadowBox(scene, 4.4, 0.65, 5.8, 0, -0.32, -9.0, travertineMat);

    // ─── REGION 03: THE SILENT SINGULARITY (z = -30 .. -11.5) ─────
    const singGroup = new THREE.Group();
    scene.add(singGroup);
    addShadowBox(singGroup, 28, 6, 19, 0, -3.0, -21.0, basaltMat);

    // Central raised Reflective Altar beneath the 4D Tesseract
    const altarBase = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.8, 0.36, 36), obsidianMirrorMat);
    altarBase.position.set(0, 0.18, -19.0);
    altarBase.receiveShadow = true;
    singGroup.add(altarBase);
    const altarTrim = new THREE.Mesh(new THREE.RingGeometry(4.15, 4.28, 48), brassMat);
    altarTrim.rotation.x = -Math.PI / 2;
    altarTrim.position.set(0, 0.37, -19.0);
    singGroup.add(altarTrim);

    // Semicircular Monumental Wall Buttresses framing the Horizon Gate
    for (let i = 0; i < 8; i += 1) {
      const a = Math.PI * 0.18 + (i / 7) * Math.PI * 0.64;
      const bx = Math.cos(a) * 14.5;
      const bz = -19.0 - Math.sin(a) * 11.5;
      const wall = addShadowBox(singGroup, 1.35, 11.5, 2.2, bx, 5.5, bz, slateMat, 0, -a + Math.PI / 2, 0);
      addShadowBox(wall, 1.05, 0.08, 0.9, 0, 0.45, 0, travertineMat);
    }

    // Dimensional Threshold Split-Monolith Gate at z = -25.8
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, -25.8);
    const gateWingL = addShadowBox(gateGroup, 2.4, 8.8, 1.5, -2.5, 4.4, 0, basaltMat);
    const gateWingR = addShadowBox(gateGroup, 2.4, 8.8, 1.5, 2.5, 4.4, 0, basaltMat);
    addShadowBox(gateGroup, 11.0, 1.25, 1.75, 0, 9.3, 0, travertineMat);
    const gateVeilMat = new THREE.MeshBasicMaterial({
      color: 0xb99a70,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    });
    const gateVeil = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 8.2), gateVeilMat);
    gateVeil.position.set(0, 4.2, 0);
    gateGroup.add(gateVeil);
    scene.add(gateGroup);

    // Distant Layered Silhouette Monoliths on the Outer Horizon (scale & depth!)
    const silhouetteCoords = [
      [-32, 12, -2, 6, 36, 6],
      [34, 15, 6, 7, 42, 7],
      [-42, 18, -36, 9, 52, 8],
      [44, 16, -38, 8, 48, 8],
      [-18, 22, -62, 11, 58, 5],
      [24, 24, -66, 12, 62, 5],
    ];
    silhouetteCoords.forEach(([x, y, z, sx, sy, sz]) => {
      const m = new THREE.Mesh(boxGeo, basaltMat);
      m.position.set(x, y - 10, z);
      m.scale.set(sx, sy, sz);
      scene.add(m);
    });

    // Collectible Artifacts resting on Travertine Stele Plinths
    const artifactMeshes = new Map();
    const artifactGeo = new THREE.OctahedronGeometry(0.36, 0);
    ARTIFACT_CATALOG.forEach((art) => {
      if (art.initiallyOwned) return;
      const g = new THREE.Group();
      g.position.set(art.coords.x, 1.15, art.coords.z);
      addShadowBox(g, 0.68, 1.05, 0.68, 0, -0.62, 0, slateMat);
      const gem = new THREE.Mesh(
        artifactGeo,
        new THREE.MeshStandardMaterial({
          color: art.color,
          roughness: 0.3,
          metalness: 0.65,
        })
      );
      gem.castShadow = true;
      g.add(gem);
      scene.add(g);
      artifactMeshes.set(art.id, { group: g, gem });
    });

    // ─── LIVE 3D-EXTRUDED 4D TESSERACT IN SINGULARITY CHAMBER ────
    const tesseractGroup = new THREE.Group();
    tesseractGroup.position.set(0, 3.25, -19.0);
    scene.add(tesseractGroup);

    const strutGeo = new THREE.CylinderGeometry(0.032, 0.032, 1, 8);
    const strutMat = ivoryAccentMat.clone();
    const edgeMeshes = [];
    for (let i = 0; i < TESSERACT_TOPOLOGY.edges.length; i += 1) {
      const strut = new THREE.Mesh(strutGeo, strutMat);
      strut.castShadow = true;
      tesseractGroup.add(strut);
      edgeMeshes.push(strut);
    }
    const vertexMeshes = [];
    const vertexGeo = new THREE.OctahedronGeometry(0.11, 0);
    for (let i = 0; i < TESSERACT_TOPOLOGY.vertices.length; i += 1) {
      const vm = new THREE.Mesh(vertexGeo, brassMat);
      vm.castShadow = true;
      tesseractGroup.add(vm);
      vertexMeshes.push(vm);
    }

    // Cooperative Explorer Silhouette
    const coopGroup = new THREE.Group();
    const coopBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.48, 12), travertineMat);
    coopBody.position.y = 0.75;
    coopBody.castShadow = true;
    const coopHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), sageMat);
    coopHead.position.y = 1.68;
    coopGroup.add(coopBody, coopHead);
    scene.add(coopGroup);

    // Subtle Atmospheric Dust Motes
    const dustCount = 140;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i += 1) {
      dustPos[i * 3] = (Math.random() - 0.5) * 44;
      dustPos[i * 3 + 1] = 0.8 + Math.random() * 16;
      dustPos[i * 3 + 2] = 28 - Math.random() * 68;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xedeae1,
      size: 0.08,
      transparent: true,
      opacity: 0.36,
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(dustPoints);

    // Smooth Mouse-Look: PointerLock on double-click / click + fallback Mouse Drag anywhere
    let dragLook = null;
    const dom = renderer.domElement;

    const applyLookDelta = (dx, dy) => {
      const sens = 0.0028 * (settingsRef.current?.mouseSensitivity ?? 1);
      const invert = settingsRef.current?.invertY ? -1 : 1;
      simRef.current.player.yaw -= dx * sens;
      simRef.current.player.pitch = Math.max(
        -0.78,
        Math.min(0.74, simRef.current.player.pitch - dy * sens * invert)
      );
    };

    const onPointerDown = (e) => {
      if (simRef.current.screen !== "playing" || simRef.current.activeOverlay) return;
      dragLook = { x: e.clientX, y: e.clientY };
    };
    const onDoubleClick = () => {
      if (simRef.current.screen !== "playing" || simRef.current.activeOverlay) return;
      if (document.pointerLockElement !== dom && dom.requestPointerLock) {
        dom.requestPointerLock().catch?.(() => {});
      }
    };
    const onPointerMove = (e) => {
      if (document.pointerLockElement === dom) {
        applyLookDelta(e.movementX || 0, e.movementY || 0);
        return;
      }
      if (!dragLook) return;
      const dx = e.clientX - dragLook.x;
      const dy = e.clientY - dragLook.y;
      dragLook = { x: e.clientX, y: e.clientY };
      applyLookDelta(dx, dy);
    };
    const onPointerUp = () => {
      dragLook = null;
    };

    dom.addEventListener("pointerdown", onPointerDown);
    dom.addEventListener("dblclick", onDoubleClick);
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

    // Pre-allocated scratch vectors for strut orientation
    const vecA = new THREE.Vector3();
    const vecB = new THREE.Vector3();
    const vecMid = new THREE.Vector3();
    const vecDir = new THREE.Vector3();
    const upAxis = new THREE.Vector3(0, 1, 0);
    const camTarget = new THREE.Vector3();
    const projectedCache = new Array(16);

    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let hudSyncAccum = 0;

    const tick = (now) => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      const s = simRef.current;
      const reducedMotion = Boolean(settingsRef.current?.reducedMotion);
      const events = stepAfterspaceState(s, inputRef.current, dt);

      // Smooth stair/terrace elevation
      const targetElev = computeTargetElevation(s.player.x, s.player.z);
      s.player.y += (targetElev - s.player.y) * Math.min(1, dt * 8);

      if (events.recoveredArtifact || events.scanCompleted || events.enteredRegion) {
        onEventRef.current?.(events);
        onSyncRef.current?.();
      }

      // Atmospheric motion (decoupled from UI)
      if (!reducedMotion) {
        ringA.rotation.x = 0.55 + Math.sin(elapsed * 0.08) * 0.28;
        ringA.rotation.y += dt * 0.045;
        ringB.rotation.z -= dt * 0.065;
        ringB.rotation.x = 1.0 + Math.cos(elapsed * 0.06) * 0.2;
        ringC.rotation.y -= dt * 0.08;
        residueCore.rotation.y += dt * 0.38;
        residueGroup.position.y = 1.65 + Math.sin(elapsed * 1.1) * 0.09;
        dustPoints.rotation.y = Math.sin(elapsed * 0.02) * 0.05;
      }

      artifactMeshes.forEach(({ group, gem }, id) => {
        const owned = Boolean(s.ownedArtifacts[id]);
        group.visible = !owned;
        if (!owned && !reducedMotion) gem.rotation.y += dt * 0.55;
      });

      // Temporal Bridge Transition
      const effectiveTempIdx =
        previewTempRef.current !== null && previewTempRef.current !== undefined
          ? previewTempRef.current
          : s.temporalIndex;

      bridgeSlabs.forEach((slab) => {
        if (effectiveTempIdx === 1) {
          slab.mesh.material = pastBridgeMat;
          pastBridgeMat.opacity = 0.55;
          slab.mesh.position.y += (-1.55 - slab.mesh.position.y) * Math.min(1, dt * 4);
          slab.mesh.rotation.z += (slab.tilt - slab.mesh.rotation.z) * Math.min(1, dt * 4);
        } else if (effectiveTempIdx === 0) {
          slab.mesh.material = pastBridgeMat;
          pastBridgeMat.opacity = 1.0;
          slab.mesh.position.y += (slab.restY - slab.mesh.position.y) * Math.min(1, dt * 4.5);
          slab.mesh.rotation.z += (0 - slab.mesh.rotation.z) * Math.min(1, dt * 4.5);
        } else {
          slab.mesh.material = futureBridgeMat;
          slab.mesh.position.y += (slab.restY - slab.mesh.position.y) * Math.min(1, dt * 4.5);
          slab.mesh.rotation.z += (0 - slab.mesh.rotation.z) * Math.min(1, dt * 4.5);
        }
      });

      // Sky & fog atmosphere response
      if (s.scannerActive) {
        skyUniforms.uZenith.value.setHex(0x13191b);
        skyUniforms.uMid.value.setHex(0x283133);
        skyUniforms.uHorizon.value.setHex(0x4c585a);
        scene.fog.color.setHex(0x262e30);
      } else if (effectiveTempIdx === 0) {
        skyUniforms.uZenith.value.setHex(0x161412);
        skyUniforms.uMid.value.setHex(0x2e2822);
        skyUniforms.uHorizon.value.setHex(0x745c47);
        scene.fog.color.setHex(0x3a322b);
      } else if (effectiveTempIdx === 2) {
        skyUniforms.uZenith.value.setHex(0x0d1316);
        skyUniforms.uMid.value.setHex(0x1d282e);
        skyUniforms.uHorizon.value.setHex(0x52646f);
        scene.fog.color.setHex(0x243036);
      } else {
        skyUniforms.uZenith.value.setHex(0x0f1416);
        skyUniforms.uMid.value.setHex(0x23292b);
        skyUniforms.uHorizon.value.setHex(0x5b4d42);
        scene.fog.color.setHex(0x282929);
      }

      // Update live 3D-extruded 4D Tesseract in Singularity chamber
      const tAngles = { ...s.hypercube.angles };
      if (!s.hypercube.alignment.aligned && s.activeOverlay !== "hypercube" && !reducedMotion) {
        tAngles.XW += elapsed * 6.5;
        tAngles.YW += elapsed * 2.5;
      }
      for (let i = 0; i < 16; i += 1) {
        const p3 = project4Dto3D(
          TESSERACT_TOPOLOGY.vertices[i],
          tAngles,
          s.hypercube.projectionDistance
        );
        projectedCache[i] = p3;
        vertexMeshes[i].position.set(p3.x * 1.25, p3.y * 1.25, p3.z * 1.25);
      }
      for (let eIdx = 0; eIdx < TESSERACT_TOPOLOGY.edges.length; eIdx += 1) {
        const [a, b] = TESSERACT_TOPOLOGY.edges[eIdx];
        const pa = projectedCache[a];
        const pb = projectedCache[b];
        vecA.set(pa.x * 1.25, pa.y * 1.25, pa.z * 1.25);
        vecB.set(pb.x * 1.25, pb.y * 1.25, pb.z * 1.25);
        vecMid.addVectors(vecA, vecB).multiplyScalar(0.5);
        vecDir.subVectors(vecB, vecA);
        const len = vecDir.length();
        const mesh = edgeMeshes[eIdx];
        mesh.position.copy(vecMid);
        if (len > 0.0001) {
          vecDir.divideScalar(len);
          mesh.quaternion.setFromUnitVectors(upAxis, vecDir);
        }
        mesh.scale.set(1, len, 1);
      }

      // Split Dimensional Threshold Gate physically opens when Hypercube aligned
      const gateOpenOffset = s.hypercube.alignment.aligned ? 1.4 : 0;
      gateWingL.position.x += (-2.5 - gateOpenOffset - gateWingL.position.x) * Math.min(1, dt * 3);
      gateWingR.position.x += (2.5 + gateOpenOffset - gateWingR.position.x) * Math.min(1, dt * 3);
      gateVeilMat.opacity = s.hypercube.alignment.aligned ? 0.32 : 0.08;
      residueRing.visible = s.scannerActive || INTERACTABLES[1].radius > 0;

      coopGroup.visible = s.coopMate.active && s.screen === "playing";
      if (coopGroup.visible) coopGroup.position.set(s.coopMate.x, 0, s.coopMate.z);

      // Active Interactable subtle ground halo
      const activeNear =
        s.screen === "playing" && !s.activeOverlay ? findNearestInteractable(s.player) : null;
      if (activeNear) {
        focusRing.visible = true;
        focusRing.position.set(activeNear.x, 0.09, activeNear.z);
        focusRingMat.opacity = 0.34 + Math.sin(elapsed * 2.2) * 0.12;
      } else {
        focusRing.visible = false;
      }

      // Smooth Optical Lens FOV shift during Scanner Observation Mode
      const targetFov = s.scannerActive ? 60.5 : 56;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 6);
        camera.updateProjectionMatrix();
      }

      // Camera Framing per screen (smooth cross-threshold glide)
      if (s.screen === "menu" || s.screen === "setup") {
        const driftX = Math.sin(elapsed * 0.08) * 3.8 - 2.4;
        const targetZ = s.screen === "setup" ? 18.5 : 27.5 - Math.sin(elapsed * 0.04) * 1.2;
        camTarget.set(driftX, 5.2, targetZ);
        camera.position.lerp(camTarget, Math.min(1, dt * 1.8));
        camera.lookAt(-1.2, 4.4, -18);
      } else if (s.screen === "complete") {
        camTarget.set(3.4, 5.2, -13.5);
        camera.position.lerp(camTarget, Math.min(1, dt * 1.3));
        camera.lookAt(0, 3.6, -25.8);
      } else {
        const isWalking =
          inputRef.current.forward ||
          inputRef.current.backward ||
          inputRef.current.left ||
          inputRef.current.right;
        if (isWalking && !reducedMotion) {
          walkBob += dt * (inputRef.current.sprint ? 11.5 : 8.5);
        }
        const bobOffset = isWalking && !reducedMotion ? Math.sin(walkBob) * 0.032 : 0;
        const eyeY = 1.72 + s.player.y + bobOffset;
        camTarget.set(s.player.x, eyeY, s.player.z);
        camera.position.lerp(camTarget, Math.min(1, dt * 10));
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
      if (document.pointerLockElement === dom) document.exitPointerLock?.();
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("dblclick", onDoubleClick);
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

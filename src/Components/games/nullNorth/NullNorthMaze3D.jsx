import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as THREE from "three";

const ROOM_THEMES = {
  start: { base: 0x0369a1, rim: 0x38bdf8, glass: 0x0ea5e9 },
  extraction: { base: 0x047857, rim: 0x34d399, glass: 0x10b981 },
  cipher_vault: { base: 0xb45309, rim: 0xfbbf24, glass: 0xf59e0b },
  recharge: { base: 0x4d7c0f, rim: 0xa3e635, glass: 0x84cc16 },
  junction: { base: 0x7e22ce, rim: 0xe879f9, glass: 0xa855f7 },
  corridor: { base: 0x0f766e, rim: 0x2dd4bf, glass: 0x14b8a6 },
  unscanned: { base: 0x1e1b4b, rim: 0x6366f1, glass: 0x4f46e5 },
  adjacent: { base: 0x1e293b, rim: 0x38bdf8, glass: 0x0284c7 },
};

const HAZARD_COLORS = {
  distortion: 0xd946ef,
  instability: 0xf43f5e,
  false_passage: 0xf59e0b,
  lockdown: 0xf97316,
};

function makeLabelTexture(text, colorHex = "#e2e8f0") {
  const c = document.createElement("canvas");
  c.width = 160;
  c.height = 56;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(7, 11, 20, 0.72)";
  ctx.beginPath();
  ctx.roundRect(8, 8, 144, 40, 12);
  ctx.fill();
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = colorHex;
  ctx.font = "900 22px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 80, 29);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const NullNorthMaze3D = ({ gameState, onSelectRoom }) => {
  const mountRef = useRef(null);
  const stateRef = useRef(gameState);
  const onSelectRoomRef = useRef(onSelectRoom);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    onSelectRoomRef.current = onSelectRoom;
  }, [onSelectRoom]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050812);
    scene.fog = new THREE.FogExp2(0x050812, 0.022);

    const w = container.clientWidth || 560;
    const h = container.clientHeight || 480;
    const camera = new THREE.PerspectiveCamera(44, w / Math.max(1, h), 0.1, 120);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // Three-point architectural lighting for crisp 3D depth
    scene.add(new THREE.HemisphereLight(0xbae6fd, 0x1e1b4b, 0.95));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(10, 18, 12);
    scene.add(keyLight);

    const accentLight = new THREE.PointLight(0xa855f7, 2.4, 34);
    accentLight.position.set(-8, 8, -6);
    scene.add(accentLight);

    // Subtle spatial horizon floor grid below hovering monoliths
    const grid = new THREE.GridHelper(34, 34, 0x1e293b, 0x0b1220);
    grid.position.y = -1.35;
    scene.add(grid);

    const mazeLayer = new THREE.Group();
    scene.add(mazeLayer);

    const clickableMeshes = [];
    const labelTexCache = new Map();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // Smooth interactive orbit state
    let orbitYaw = 0.22;
    let targetYaw = 0.22;
    let isDragging = false;
    let dragStartX = 0;
    let dragMoved = false;

    const resizeObserver = new ResizeObserver(() => {
      const nw = container.clientWidth || 560;
      const nh = container.clientHeight || 480;
      camera.aspect = nw / Math.max(1, nh);
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    resizeObserver.observe(container);

    const handlePointerDown = (e) => {
      isDragging = true;
      dragMoved = false;
      dragStartX = e.clientX;
    };

    const handlePointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      if (Math.abs(dx) > 4) dragMoved = true;
      targetYaw -= dx * 0.0065;
      dragStartX = e.clientX;
    };

    const handlePointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      if (!dragMoved) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(clickableMeshes, false);
        if (hits.length > 0 && hits[0].object.userData?.roomId) {
          onSelectRoomRef.current?.(hits[0].object.userData.roomId);
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    let lastSig = "";
    let camRadius = 15.0;
    let camHeight = 11.2;
    const clock = new THREE.Clock();
    let rafId;

    const getCachedLabel = (txt, hex) => {
      const key = `${txt}_${hex}`;
      if (!labelTexCache.has(key)) {
        labelTexCache.set(key, makeLabelTexture(txt, hex));
      }
      return labelTexCache.get(key);
    };

    const rebuildSceneGeometry = (st) => {
      while (mazeLayer.children.length > 0) {
        mazeLayer.remove(mazeLayer.children[0]);
      }
      clickableMeshes.length = 0;

      if (!st || !st.current_room) return;

      const carto = st.layers?.cartographer;
      const seer = st.layers?.seer;
      const myRoom = st.current_room;
      const adjEdges = myRoom.adjacent_edges || [];

      const roomsList = carto ? carto.rooms : myRoom.adjacent_rooms || [myRoom];
      const edgesList = carto ? carto.edges : adjEdges;

      let avgX = 0;
      let avgY = 0;
      roomsList.forEach((r) => {
        avgX += r.gx;
        avgY += r.gy;
      });
      avgX /= Math.max(1, roomsList.length);
      avgY /= Math.max(1, roomsList.length);

      const SCALE = 2.7;
      const roomPos = new Map();
      roomsList.forEach((r) => {
        // Subtle 3D elevation variation by grid index for true multi-level depth
        const elev = r.id === "R_EXT" ? 0.35 : r.type === "cipher_vault" ? 0.2 : 0;
        roomPos.set(r.id, new THREE.Vector3((r.gx - avgX) * SCALE, elev, (r.gy - avgY) * SCALE));
      });

      const adjacentIds = new Set(adjEdges.map((e) => e.target_room_id));
      const pings = st.pings || {};
      const team = st.team || [];
      const selfId = st.self?.user_id;

      // Build True Architectural 3D Chambers
      for (const r of roomsList) {
        const pos = roomPos.get(r.id);
        const isCurrent = r.id === myRoom.id;
        const isAdjacent = adjacentIds.has(r.id);
        const theme = ROOM_THEMES[r.type] || ROOM_THEMES.corridor;

        // 1. Stepped Under-Plinth Column for true 3D hovering monolith silhouette
        const column = new THREE.Mesh(
          new THREE.BoxGeometry(1.12, 1.35, 1.12),
          new THREE.MeshStandardMaterial({
            color: theme.base,
            emissive: theme.base,
            emissiveIntensity: 0.18,
            metalness: 0.7,
            roughness: 0.35,
            transparent: true,
            opacity: 0.82,
          })
        );
        column.position.set(pos.x, pos.y - 0.72, pos.z);
        mazeLayer.add(column);

        // 2. Main Semi-Opaque Bevelled Chamber Deck
        const deck = new THREE.Mesh(
          new THREE.BoxGeometry(1.62, 0.32, 1.62),
          new THREE.MeshStandardMaterial({
            color: theme.base,
            emissive: isCurrent ? 0x38bdf8 : theme.glass,
            emissiveIntensity: isCurrent ? 0.6 : isAdjacent ? 0.42 : 0.25,
            metalness: 0.55,
            roughness: 0.2,
            transparent: true,
            opacity: 0.88,
          })
        );
        deck.position.copy(pos);
        deck.userData = { roomId: r.id };
        mazeLayer.add(deck);
        clickableMeshes.push(deck);

        // 3. 4 Semi-Opaque Architectural Corner Pillars + Glowing Rim Frame
        const pillarH = r.id === "R_EXT" ? 1.15 : isCurrent ? 0.85 : 0.6;
        const pillarMat = new THREE.MeshStandardMaterial({
          color: theme.rim,
          emissive: theme.rim,
          emissiveIntensity: isCurrent || isAdjacent ? 0.75 : 0.35,
          transparent: true,
          opacity: 0.78,
          metalness: 0.4,
          roughness: 0.15,
        });
        for (const [px, pz] of [[-0.68, -0.68], [0.68, -0.68], [-0.68, 0.68], [0.68, 0.68]]) {
          const pil = new THREE.Mesh(new THREE.BoxGeometry(0.14, pillarH, 0.14), pillarMat);
          pil.position.set(pos.x + px, pos.y + pillarH * 0.5 + 0.12, pos.z + pz);
          mazeLayer.add(pil);
        }

        // Translucent Neon Glass Perimeter Walls on active/vault/extraction chambers
        if (isCurrent || isAdjacent || r.id === "R_EXT" || r.type === "cipher_vault" || r.type === "recharge") {
          const railMat = new THREE.MeshBasicMaterial({
            color: theme.rim,
            transparent: true,
            opacity: isCurrent ? 0.55 : 0.3,
          });
          const frame = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.28, 1.52), railMat);
          frame.position.set(pos.x, pos.y + 0.3, pos.z);
          mazeLayer.add(frame);
        }

        // 4. Specialty Holo-Beacons per Chamber Type
        if (r.id === "R_EXT" || r.type === "extraction") {
          const spire = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.42, 0),
            new THREE.MeshStandardMaterial({
              color: 0x6ee7b7,
              emissive: 0x10b981,
              emissiveIntensity: 1.5,
              transparent: true,
              opacity: 0.9,
            })
          );
          spire.position.set(pos.x, pos.y + 1.05, pos.z);
          spire.userData.spin = true;
          mazeLayer.add(spire);
        } else if (r.type === "cipher_vault") {
          const relic = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.28, 0),
            new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.3 })
          );
          relic.position.set(pos.x, pos.y + 0.85, pos.z);
          relic.userData.spin = true;
          mazeLayer.add(relic);
        } else if (r.type === "recharge") {
          const cell = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.2, 0.58, 8),
            new THREE.MeshStandardMaterial({ color: 0xd9f99d, emissive: 0x84cc16, emissiveIntensity: 1.25 })
          );
          cell.position.set(pos.x, pos.y + 0.65, pos.z);
          cell.userData.spin = true;
          mazeLayer.add(cell);
        }

        // 5. Crisp Floating Label for Current / Adjacent / Exit Rooms
        if (isCurrent || isAdjacent || r.id === "R_EXT" || r.id === "R0") {
          const lblCol = isCurrent ? "#38bdf8" : r.id === "R_EXT" ? "#34d399" : isAdjacent ? "#67e8f9" : "#94a3b8";
          const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: getCachedLabel(r.id, lblCol),
              transparent: true,
              depthWrite: false,
            })
          );
          sprite.position.set(pos.x, pos.y + (r.id === "R_EXT" ? 1.65 : 1.18), pos.z);
          sprite.scale.set(1.15, 0.4, 1);
          mazeLayer.add(sprite);
        }

        // 6. Cartographer Ping Halo
        if (pings[r.id]) {
          const pCol = pings[r.id].label === "AVOID" ? 0xf43f5e : pings[r.id].label === "EXIT" ? 0x34d399 : 0xfbbf24;
          const pingRing = new THREE.Mesh(
            new THREE.TorusGeometry(1.05, 0.06, 8, 28),
            new THREE.MeshBasicMaterial({ color: pCol, transparent: true, opacity: 0.9 })
          );
          pingRing.rotation.x = Math.PI / 2;
          pingRing.position.set(pos.x, pos.y + 0.3, pos.z);
          mazeLayer.add(pingRing);
        }

        // 7. 3D Operative Tokens inside Chamber
        const hereOps = team.filter((op) => op.room_id === r.id);
        hereOps.forEach((op, idx) => {
          const isMe = op.user_id === selfId;
          const token = new THREE.Mesh(
            new THREE.ConeGeometry(0.24, 0.72, 6),
            new THREE.MeshStandardMaterial({
              color: isMe ? 0x38bdf8 : 0xe879f9,
              emissive: isMe ? 0x0ea5e9 : 0xc026d3,
              emissiveIntensity: 1.1,
            })
          );
          const off = (idx - (hereOps.length - 1) * 0.5) * 0.45;
          token.position.set(pos.x + off, pos.y + 0.62, pos.z);
          mazeLayer.add(token);
        });
      }

      // Build 3D Walkways, Glass Side Guardrails, Laser Gates & Hazard Fields
      const hazByEdgeId = new Map();
      if (seer?.hazards) {
        seer.hazards.forEach((h) => hazByEdgeId.set(h.edge_id, h));
      }
      adjEdges.forEach((e) => {
        if (e.hazard) hazByEdgeId.set(e.id, e);
      });

      for (const e of edgesList) {
        const pa = roomPos.get(e.a);
        const pb = roomPos.get(e.b);
        if (!pa || !pb) continue;

        const mid = new THREE.Vector3().addVectors(pa, pb).multiplyScalar(0.5);
        const len = Math.max(0.45, pa.distanceTo(pb) - 1.45);
        const angle = Math.atan2(pb.x - pa.x, pb.z - pa.z);

        const hInfo = hazByEdgeId.get(e.id);
        let edgeColor = 0x22d3ee;
        let opacity = 0.78;
        if (!e.active) {
          edgeColor = 0xf59e0b;
          opacity = 0.22;
        } else if (e.locked) {
          edgeColor = 0xd946ef;
          opacity = 0.85;
        } else if (hInfo && hInfo.hazard !== "none" && !hInfo.stabilized) {
          edgeColor = HAZARD_COLORS[hInfo.hazard] || 0xf43f5e;
          opacity = 0.88;
        }

        const spanGroup = new THREE.Group();
        spanGroup.position.set(mid.x, mid.y, mid.z);
        spanGroup.rotation.y = angle;
        spanGroup.rotation.x = -Math.atan2(pb.y - pa.y, pa.distanceTo(pb));

        const deck = new THREE.Mesh(
          new THREE.BoxGeometry(0.46, 0.14, len),
          new THREE.MeshStandardMaterial({
            color: edgeColor,
            emissive: edgeColor,
            emissiveIntensity: e.active ? 0.5 : 0.15,
            transparent: true,
            opacity,
          })
        );
        spanGroup.add(deck);

        // Translucent 3D side rails along active walkway
        if (e.active) {
          const railMat = new THREE.MeshBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.45 });
          for (const rx of [-0.25, 0.25]) {
            const rMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, len), railMat);
            rMesh.position.set(rx, 0.12, 0);
            spanGroup.add(rMesh);
          }
        }

        // Visible 3D Laser Barrier Gate when Locked!
        if (e.locked) {
          const gateMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.9 });
          for (const gy of [0.22, 0.42]) {
            const bar = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.06), gateMat);
            bar.position.set(0, gy, 0);
            spanGroup.add(bar);
          }
        }

        mazeLayer.add(spanGroup);
      }

      camRadius = carto ? 15.6 : 11.4;
      camHeight = carto ? 11.5 : 8.8;
    };

    const animate = () => {
      const dt = Math.min(0.05, clock.getDelta());
      const st = stateRef.current;

      const sig = st
        ? `${st.match?.current_tick}_${st.self?.current_room_id}_${st.self?.actions_taken || 0}_${JSON.stringify(st.pings || {})}_${st.layers?.cartographer?.edges?.filter((x) => !x.locked && x.active).length}_${st.layers?.seer?.hazards?.length}`
        : "";

      if (sig !== lastSig) {
        lastSig = sig;
        rebuildSceneGeometry(st);
      }

      orbitYaw += (targetYaw - orbitYaw) * Math.min(1, dt * 8);
      camera.position.set(
        Math.sin(orbitYaw) * camRadius,
        camHeight,
        Math.cos(orbitYaw) * camRadius
      );
      camera.lookAt(0, 0.15, 0);

      mazeLayer.children.forEach((ch) => {
        if (ch.userData?.spin) {
          ch.rotation.y += dt * 1.9;
        }
      });

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      renderer.dispose();
      for (const tex of labelTexCache.values()) tex.dispose();
      labelTexCache.clear();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-full min-h-[340px] cursor-grab active:cursor-grabbing touch-none select-none"
      aria-label="NULL//NORTH 3D Architectural Labyrinth View"
    />
  );
};

NullNorthMaze3D.propTypes = {
  gameState: PropTypes.object,
  onSelectRoom: PropTypes.func,
};

export default NullNorthMaze3D;

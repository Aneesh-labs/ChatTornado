import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as THREE from "three";

const ROOM_COLORS = {
  start: 0x38bdf8,
  extraction: 0x34d399,
  cipher_vault: 0xc084fc,
  recharge: 0xfbbf24,
  junction: 0x60a5fa,
  corridor: 0x1e293b,
  unscanned: 0x0f172a,
  adjacent: 0x1e293b,
};

const HAZARD_COLORS = {
  distortion: 0xc084fc,
  instability: 0xf43f5e,
  false_passage: 0xf59e0b,
  lockdown: 0xf97316,
};

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
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.032);

    const w = container.clientWidth || 500;
    const h = container.clientHeight || 380;
    const camera = new THREE.PerspectiveCamera(44, w / Math.max(1, h), 0.1, 100);
    camera.position.set(0, 12.5, 11.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Subtle cyberpunk ambient & cyan/violet key lighting
    scene.add(new THREE.AmbientLight(0xcbd5e1, 0.75));
    const keyLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    keyLight.position.set(8, 16, 10);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0xa855f7, 2.0, 28);
    fillLight.position.set(-6, 7, -4);
    scene.add(fillLight);

    // Subtle Isometric Base Grid
    const grid = new THREE.GridHelper(28, 28, 0x1e293b, 0x0f172a);
    grid.position.y = -0.35;
    scene.add(grid);

    const mazeLayer = new THREE.Group();
    scene.add(mazeLayer);

    const clickableMeshes = [];
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const resizeObserver = new ResizeObserver(() => {
      const nw = container.clientWidth || 500;
      const nh = container.clientHeight || 380;
      camera.aspect = nw / Math.max(1, nh);
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    resizeObserver.observe(container);

    const handlePointerDown = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length > 0 && hits[0].object.userData?.roomId) {
        onSelectRoomRef.current?.(hits[0].object.userData.roomId);
      }
    };
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);

    let lastSig = "";
    const clock = new THREE.Clock();
    let rafId;

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

      // Center camera target smoothly around rooms average
      let avgX = 0;
      let avgY = 0;
      roomsList.forEach((r) => {
        avgX += r.gx;
        avgY += r.gy;
      });
      avgX /= Math.max(1, roomsList.length);
      avgY /= Math.max(1, roomsList.length);

      const SCALE = 2.55;
      const roomPos = new Map();
      roomsList.forEach((r) => {
        roomPos.set(r.id, new THREE.Vector3((r.gx - avgX) * SCALE, 0, (r.gy - avgY) * SCALE));
      });

      const adjacentIds = new Set(adjEdges.map((e) => e.target_room_id));
      const pings = st.pings || {};
      const team = st.team || [];
      const selfId = st.self?.user_id;

      // Build Rooms
      for (const r of roomsList) {
        const pos = roomPos.get(r.id);
        const isCurrent = r.id === myRoom.id;
        const isAdjacent = adjacentIds.has(r.id);
        const col = ROOM_COLORS[r.type] || 0x1e293b;

        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, isCurrent ? 0.42 : 0.28, 1.5),
          new THREE.MeshStandardMaterial({
            color: col,
            emissive: isCurrent ? 0x0ea5e9 : col,
            emissiveIntensity: isCurrent ? 0.55 : isAdjacent ? 0.35 : 0.16,
            metalness: 0.65,
            roughness: 0.25,
          })
        );
        slab.position.copy(pos);
        slab.userData = { roomId: r.id };
        mazeLayer.add(slab);
        clickableMeshes.push(slab);

        // Glowing rim border
        const rimColor = isCurrent ? 0x38bdf8 : isAdjacent ? 0x22d3ee : r.id === "R_EXT" ? 0x34d399 : 0x334155;
        const rim = new THREE.Mesh(
          new THREE.BoxGeometry(1.58, 0.06, 1.58),
          new THREE.MeshBasicMaterial({ color: rimColor })
        );
        rim.position.set(pos.x, pos.y + (isCurrent ? 0.22 : 0.15), pos.z);
        mazeLayer.add(rim);

        // Extraction Pillar Beacon
        if (r.id === "R_EXT" || r.type === "extraction") {
          const pylon = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.36, 0),
            new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 1.3 })
          );
          pylon.position.set(pos.x, 0.85, pos.z);
          pylon.userData.spin = true;
          mazeLayer.add(pylon);
        }

        // Cartographer Ping Ring
        if (pings[r.id]) {
          const pCol = pings[r.id].label === "AVOID" ? 0xf43f5e : pings[r.id].label === "EXIT" ? 0x34d399 : 0xfbbf24;
          const pingRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.95, 0.045, 8, 24),
            new THREE.MeshBasicMaterial({ color: pCol })
          );
          pingRing.rotation.x = Math.PI / 2;
          pingRing.position.set(pos.x, 0.25, pos.z);
          mazeLayer.add(pingRing);
        }

        // Player / Operative Tokens inside Chamber
        const hereOps = team.filter((op) => op.room_id === r.id);
        hereOps.forEach((op, idx) => {
          const isMe = op.user_id === selfId;
          const token = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.22, 0.65, 10),
            new THREE.MeshStandardMaterial({
              color: isMe ? 0x22d3ee : 0xc084fc,
              emissive: isMe ? 0x06b6d4 : 0xa855f7,
              emissiveIntensity: 0.9,
            })
          );
          const off = (idx - (hereOps.length - 1) * 0.5) * 0.42;
          token.position.set(pos.x + off, 0.55, pos.z);
          mazeLayer.add(token);
        });
      }

      // Build Edges / Corridors
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
        const len = pa.distanceTo(pb) - 1.1;
        const angle = Math.atan2(pb.x - pa.x, pb.z - pa.z);

        const hInfo = hazByEdgeId.get(e.id);
        let edgeColor = 0x38bdf8;
        let opacity = 0.85;
        if (!e.active) {
          edgeColor = 0x475569;
          opacity = 0.28;
        } else if (e.locked) {
          edgeColor = 0xc084fc;
        } else if (hInfo && hInfo.hazard !== "none" && !hInfo.stabilized) {
          edgeColor = HAZARD_COLORS[hInfo.hazard] || 0xf43f5e;
        }

        const bridge = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.1, Math.max(0.4, len)),
          new THREE.MeshStandardMaterial({
            color: edgeColor,
            emissive: edgeColor,
            emissiveIntensity: e.active ? 0.65 : 0.1,
            transparent: true,
            opacity,
          })
        );
        bridge.position.set(mid.x, 0, mid.z);
        bridge.rotation.y = angle;
        mazeLayer.add(bridge);
      }

      camera.position.set(0, carto ? 12.8 : 9.2, carto ? 11.2 : 8.5);
      camera.lookAt(0, 0, 0);
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

      mazeLayer.children.forEach((ch) => {
        if (ch.userData?.spin) {
          ch.rotation.y += dt * 1.8;
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
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-full min-h-[280px] cursor-pointer touch-manipulation select-none"
      aria-label="NULL//NORTH 3D Architectural Labyrinth View"
    />
  );
};

NullNorthMaze3D.propTypes = {
  gameState: PropTypes.object,
  onSelectRoom: PropTypes.func,
};

export default NullNorthMaze3D;

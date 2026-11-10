import * as THREE from "three";

/**
 * Procedural 3D articulated mesh builders for turrets (Tier 1 -> Tier 2 -> Tier 3A/3B),
 * hover enemies, and combat VFX in Vortex Bastion.
 */

export function buildTurretMesh(type, tier = 1, branch = null) {
  const root = new THREE.Group();

  // Shared armored octagonal pedestal
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.78,
    roughness: 0.28,
  });
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.44, 0.22, 8),
    baseMat
  );
  plinth.position.y = 0.14;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  root.add(plinth);

  const accentHex =
    type === "pulse"
      ? branch === "B"
        ? 0xf97316
        : 0x38bdf8
      : type === "cryo"
      ? 0x22d3ee
      : type === "tesla"
      ? 0xfbbf24
      : 0xc084fc;

  const glowMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: tier === 3 ? 2.1 : tier === 2 ? 1.5 : 1.1,
    metalness: 0.2,
    roughness: 0.2,
  });

  // Glowing collar ring
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.33, 0.032, 8, 24),
    glowMat
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.25;
  root.add(collar);

  // Tier pips on pedestal corners
  for (let p = 0; p < tier; p++) {
    const pip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), glowMat);
    const a = (p * Math.PI * 2) / 3;
    pip.position.set(Math.sin(a) * 0.36, 0.28, Math.cos(a) * 0.36);
    root.add(pip);
  }

  // Articulated upper head (rotates toward target on Y axis)
  const head = new THREE.Group();
  head.position.y = 0.42;
  const barrelGroup = new THREE.Group();

  if (type === "pulse") {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.24, 0.44),
      baseMat
    );
    body.castShadow = true;
    head.add(body);

    const barrelOffsets =
      tier === 3 && branch === "A"
        ? [
            [-0.12, 0.06],
            [0.12, 0.06],
            [-0.12, -0.05],
            [0.12, -0.05],
          ]
        : [
            [-0.11, 0.02],
            [0.11, 0.02],
          ];
    const bRad = tier === 3 && branch === "B" ? 0.075 : 0.045;
    const bLen = tier >= 2 ? 0.46 : 0.36;

    for (const [bx, by] of barrelOffsets) {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(bRad, bRad * 1.1, bLen, 8),
        baseMat
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(bx, by, 0.26);
      barrel.castShadow = true;
      barrelGroup.add(barrel);

      const tip = new THREE.Mesh(
        new THREE.CylinderGeometry(bRad * 1.15, bRad * 1.15, 0.06, 8),
        glowMat
      );
      tip.rotation.x = Math.PI / 2;
      tip.position.set(bx, by, 0.26 + bLen / 2);
      barrelGroup.add(tip);
    }
    head.add(barrelGroup);
  } else if (type === "cryo") {
    const coreCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(tier >= 2 ? 0.24 : 0.19, 0),
      glowMat
    );
    coreCrystal.position.y = 0.16;
    barrelGroup.add(coreCrystal);

    const finCount = tier === 3 ? 6 : 4;
    for (let f = 0; f < finCount; f++) {
      const a = (f / finCount) * Math.PI * 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.36, 0.14), baseMat);
      fin.position.set(Math.sin(a) * 0.27, 0.12, Math.cos(a) * 0.27);
      fin.rotation.y = a;
      barrelGroup.add(fin);
    }
    head.add(barrelGroup);
  } else if (type === "tesla") {
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.16, tier >= 2 ? 0.58 : 0.46, 10),
      baseMat
    );
    spire.position.y = 0.16;
    spire.castShadow = true;
    head.add(spire);

    const ringCount = tier === 3 ? 4 : tier === 2 ? 3 : 2;
    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2,
    });
    for (let r = 0; r < ringCount; r++) {
      const coil = new THREE.Mesh(
        new THREE.TorusGeometry(0.22 - r * 0.025, 0.032, 8, 20),
        copperMat
      );
      coil.rotation.x = Math.PI / 2;
      coil.position.y = 0.06 + r * 0.11;
      head.add(coil);
    }

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(tier === 3 ? 0.15 : 0.12, 12, 12),
      glowMat
    );
    orb.position.y = tier >= 2 ? 0.5 : 0.42;
    barrelGroup.add(orb);
    head.add(barrelGroup);
  } else {
    // Rail Spire
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.22, 0.48),
      baseMat
    );
    chassis.castShadow = true;
    head.add(chassis);

    const railLen = tier === 3 ? 0.72 : tier === 2 ? 0.62 : 0.52;
    for (const side of [-0.12, 0.12]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.09, railLen),
        baseMat
      );
      rail.position.set(side, 0.05, railLen * 0.35);
      rail.castShadow = true;
      barrelGroup.add(rail);
    }
    const coreStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.05, railLen * 0.85),
      glowMat
    );
    coreStrip.position.set(0, 0.05, railLen * 0.35);
    barrelGroup.add(coreStrip);
    head.add(barrelGroup);
  }

  root.add(head);
  root.userData = { head, barrelGroup, type, tier, branch };
  return root;
}

export function buildEnemyMesh(kind) {
  const group = new THREE.Group();

  const bodyCol =
    kind === "juggernaut"
      ? 0xf97316
      : kind === "swarmer"
      ? 0xeab308
      : kind === "shielded"
      ? 0x38bdf8
      : kind === "cloaker"
      ? 0xc084fc
      : kind === "healer"
      ? 0x34d399
      : 0xf43f5e;

  const isCloak = kind === "cloaker";
  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.75,
    roughness: 0.3,
    transparent: isCloak,
    opacity: isCloak ? 0.35 : 1,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: bodyCol,
    emissive: bodyCol,
    emissiveIntensity: 1.4,
    transparent: isCloak,
    opacity: isCloak ? 0.45 : 1,
  });

  if (kind === "juggernaut") {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, 0.62), armorMat);
    hull.castShadow = true;
    group.add(hull);
    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), coreMat);
    crown.position.y = 0.24;
    group.add(crown);
  } else if (kind === "swarmer" || kind === "cloaker") {
    const dart = new THREE.Mesh(
      new THREE.ConeGeometry(kind === "cloaker" ? 0.25 : 0.22, 0.5, 6),
      coreMat
    );
    dart.rotation.x = Math.PI / 2;
    dart.castShadow = !isCloak;
    group.add(dart);
  } else if (kind === "healer") {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.24, 8), armorMat);
    group.add(pod);
    const medRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 20), coreMat);
    medRing.rotation.x = Math.PI / 2;
    group.add(medRing);
  } else {
    const sphere = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 1), armorMat);
    sphere.castShadow = true;
    group.add(sphere);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), coreMat);
    eye.position.z = 0.18;
    group.add(eye);
  }

  // Translucent Energy Shield Dome (shown whenever enemy.shield > 0)
  const shieldSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 12),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.26,
      wireframe: true,
    })
  );
  shieldSphere.visible = false;
  group.add(shieldSphere);

  // Overhead 3D HP bar
  const hpBg = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.075),
    new THREE.MeshBasicMaterial({ color: 0x020617, side: THREE.DoubleSide })
  );
  hpBg.position.y = kind === "juggernaut" ? 0.56 : 0.46;

  const hpFill = new THREE.Mesh(
    new THREE.PlaneGeometry(0.48, 0.05),
    new THREE.MeshBasicMaterial({ color: 0x4ade80, side: THREE.DoubleSide })
  );
  hpFill.position.z = 0.005;
  hpBg.add(hpFill);
  group.add(hpBg);

  group.userData = { hpBg, hpFill, coreMat, armorMat, shieldSphere, origHex: bodyCol };
  return group;
}

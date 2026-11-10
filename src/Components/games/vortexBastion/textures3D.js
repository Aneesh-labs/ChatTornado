import * as THREE from "three";

/**
 * Generates procedural high-resolution CanvasTextures for 3D materials so
 * Vortex Bastion renders rich sci-fi surfaces offline with zero external requests.
 */

export function createArenaTileTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Dark metallic carbon base
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, size, size);

  // Subtle diagonal micro-weave
  ctx.strokeStyle = "rgba(148, 163, 184, 0.06)";
  ctx.lineWidth = 2;
  for (let i = -size; i < size * 2; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }

  // Bevel inner plate
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, size - 16, size - 16);

  // Inner subtle cyan trace border
  ctx.strokeStyle = "rgba(34, 211, 238, 0.25)";
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, size - 36, size - 36);

  // Center node crosshair
  ctx.strokeStyle = "rgba(56, 189, 248, 0.16)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 24, 0, Math.PI * 2);
  ctx.stroke();

  // Corner tech bolts
  ctx.fillStyle = "#334155";
  const corners = [
    [28, 28],
    [size - 28, 28],
    [28, size - 28],
    [size - 28, size - 28],
  ];
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createMonolithTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, "#1e1b4b");
  grad.addColorStop(0.5, "#0f172a");
  grad.addColorStop(1, "#020617");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Glowing horizontal capacitor slits
  ctx.fillStyle = "rgba(244, 63, 94, 0.65)";
  for (let y = 40; y < size - 30; y += 44) {
    ctx.fillRect(36, y, size - 72, 6);
  }

  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createVortexPortalTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;

  const rad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 120);
  rad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  rad.addColorStop(0.25, "rgba(244, 63, 94, 0.85)");
  rad.addColorStop(0.6, "rgba(168, 85, 247, 0.45)");
  rad.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, size, size);

  // Spiral blades
  ctx.strokeStyle = "rgba(253, 164, 175, 0.75)";
  ctx.lineWidth = 4;
  for (let arm = 0; arm < 4; arm++) {
    ctx.beginPath();
    for (let t = 0; t < 40; t++) {
      const a = (arm * Math.PI) / 2 + t * 0.18;
      const r = t * 2.6;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

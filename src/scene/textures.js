// Every texture in the arcade is painted here with the browser's 2D canvas,
// so the site ships no image files for the 3D scene. Each function returns a Three.js texture.
import * as THREE from 'three';
import { COLORS } from '../constants.js';

const PIXEL_FONT = '"Press Start 2P"';
const rand = (min, max) => min + Math.random() * (max - min);

export function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext('2d')];
}

// Wrap a canvas as a texture. `tile` lets it repeat across a big surface.
export function toTexture(canvas, tile = false) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4; // keeps textures sharp when seen at a shallow angle
  if (tile) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Shrinks pixel-font text until it fits `maxWidth`, then draws it centered.
function drawFittedText(g, label, x, y, maxWidth, size) {
  do {
    g.font = `${size}px ${PIXEL_FONT}`;
    size -= 2;
  } while (g.measureText(label).width > maxWidth && size > 8);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, x, y);
}

// ---- Street ----

export function brickTexture() {
  const [canvas, g] = makeCanvas(512, 512);
  g.fillStyle = '#0b090e'; // mortar
  g.fillRect(0, 0, 512, 512);
  const w = 64;
  const h = 16;
  for (let row = 0; row < 32; row++) {
    for (let col = -1; col < 8; col++) {
      // every other row is shifted half a brick
      const x = col * w + (row % 2 ? w / 2 : 0);
      g.fillStyle = `hsl(${rand(8, 24)}, ${rand(16, 30)}%, ${rand(15, 26)}%)`;
      g.fillRect(x + 1, row * h + 1, w - 2, h - 2);
    }
  }
  return toTexture(canvas, true);
}

export function sidewalkTexture() {
  const [canvas, g] = makeCanvas(256, 256);
  g.fillStyle = '#34323a';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1500; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'}, ${rand(0.02, 0.08)})`;
    g.fillRect(rand(0, 256), rand(0, 256), 2, 2);
  }
  g.fillStyle = '#131217'; // the joints between slabs
  g.fillRect(0, 0, 256, 3);
  g.fillRect(0, 0, 3, 256);
  return toTexture(canvas, true);
}

// Dark asphalt with see-through patches. A mirror sits underneath, so the patches read as puddles.
export function wetAsphaltTexture() {
  const [canvas, g] = makeCanvas(1024, 1024);
  g.fillStyle = '#0d0c11';
  g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(255, 255, 255, ${rand(0.02, 0.07)})`;
    g.fillRect(rand(0, 1024), rand(0, 1024), 2, 2);
  }
  g.globalCompositeOperation = 'destination-out'; // from here on, drawing erases
  for (let i = 0; i < 46; i++) {
    const x = rand(0, 1024);
    const y = rand(0, 1024);
    const r = rand(40, 150);
    const puddle = g.createRadialGradient(0, 0, 0, 0, 0, r);
    puddle.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
    puddle.addColorStop(0.6, 'rgba(0, 0, 0, 0.7)');
    puddle.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.save();
    g.translate(x, y);
    g.scale(rand(1.2, 2.6), 1); // stretch into an oval
    g.fillStyle = puddle;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  return toTexture(canvas);
}

// A soft round glow (bright center fading to nothing). Used for the warm light behind the doors.
export function glowTexture(color) {
  const [canvas, g] = makeCanvas(256, 256);
  const glow = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 256, 256);
  return toTexture(canvas);
}

// ---- Interior ----

// Classic arcade carpet: dark base with confetti shapes in the site colors.
export function carpetTexture() {
  const [canvas, g] = makeCanvas(512, 512);
  g.fillStyle = '#0f0b1e';
  g.fillRect(0, 0, 512, 512);
  const colors = [COLORS.magenta, COLORS.cyan, COLORS.amber, '#7a4dff'];
  g.lineWidth = 5;
  g.lineCap = g.lineJoin = 'round';
  g.globalAlpha = 0.4;
  for (let i = 0; i < 36; i++) {
    const s = rand(10, 20);
    g.save();
    g.translate(rand(30, 482), rand(30, 482)); // stay off the edges so the tile repeats cleanly
    g.rotate(rand(0, Math.PI * 2));
    g.strokeStyle = g.fillStyle = colors[i % 4];
    g.beginPath();
    if (i % 3 === 0) {
      // squiggle
      g.moveTo(-s, 0);
      g.quadraticCurveTo(-s / 2, -s, 0, 0);
      g.quadraticCurveTo(s / 2, s, s, 0);
      g.stroke();
    } else if (i % 3 === 1) {
      // triangle outline
      g.moveTo(0, -s * 0.7);
      g.lineTo(s * 0.7, s * 0.5);
      g.lineTo(-s * 0.7, s * 0.5);
      g.closePath();
      g.stroke();
    } else {
      // dot
      g.arc(0, 0, s / 3, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  return toTexture(canvas, true);
}

// ---- Cabinets ----

// Stripes for the side panels, in the project's color.
export function sideArtTexture(accent) {
  const [canvas, g] = makeCanvas(256, 512);
  g.fillStyle = '#13111b';
  g.fillRect(0, 0, 256, 512);
  g.translate(128, 256);
  g.rotate(-0.5);
  g.fillStyle = accent;
  g.globalAlpha = 0.9;
  g.fillRect(-400, -44, 800, 48);
  g.globalAlpha = 0.45;
  g.fillRect(-400, 24, 800, 14);
  return toTexture(canvas);
}

// The lit name panel at the top of a cabinet.
export function marqueeTexture(project) {
  const [canvas, g] = makeCanvas(1024, 256);
  g.fillStyle = '#08070c';
  g.fillRect(0, 0, 1024, 256);
  g.fillStyle = g.strokeStyle = g.shadowColor = project.accent;
  g.globalAlpha = 0.14;
  g.fillRect(0, 0, 1024, 256);
  g.globalAlpha = 1;
  g.lineWidth = 8;
  g.strokeRect(14, 14, 996, 228);
  g.shadowBlur = 24;
  drawFittedText(g, (project.marquee || project.name).toUpperCase(), 512, 134, 900, 84);
  return toTexture(canvas);
}

// What a cabinet's screen shows: the project's image, or a branded placeholder until one exists.
export function screenTexture(project, image) {
  const [canvas, g] = makeCanvas(800, 600);
  if (image) {
    // scale the image to cover the whole screen, cropping the overflow
    const scale = Math.max(800 / image.width, 600 / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    g.drawImage(image, (800 - w) / 2, (600 - h) / 2, w, h);
  } else {
    const glow = g.createRadialGradient(400, 280, 0, 400, 280, 520);
    glow.addColorStop(0, project.accent);
    glow.addColorStop(1, '#050409');
    g.fillStyle = '#050409';
    g.fillRect(0, 0, 800, 600);
    g.globalAlpha = 0.5;
    g.fillStyle = glow;
    g.fillRect(0, 0, 800, 600);
    g.globalAlpha = 1;
    g.fillStyle = g.shadowColor = project.accent;
    g.shadowBlur = 28;
    drawFittedText(g, (project.marquee || project.name).toUpperCase(), 400, 260, 680, 72);
    g.shadowBlur = 0;
    g.fillStyle = '#edebf5';
    drawFittedText(g, 'PRESS START', 400, 400, 660, 30);
  }
  // faint scanlines so every screen looks like an old CRT
  g.fillStyle = 'rgba(0, 0, 0, 0.16)';
  for (let y = 0; y < 600; y += 4) g.fillRect(0, y, 800, 2);
  return toTexture(canvas);
}

// Loads an image file. Gives back null if it is missing, so a placeholder can be used instead.
export function loadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

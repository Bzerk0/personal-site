// Builds one arcade cabinet out of simple shapes. Nothing is modeled by hand:
// createCabinet(project) reads a project from projects.json and returns a finished cabinet.
import * as THREE from 'three';
import { marqueeTexture, screenTexture, sideArtTexture } from './textures.js';

const WIDTH = 0.9; // meters, left to right

// The cabinet seen from the side, as [z, y] points (z = toward the player, y = up).
// Change these numbers to reshape every cabinet at once.
const PROFILE = [
  [-0.45, 0], // back, bottom
  [0.3, 0], // front, bottom
  [0.3, 0.85],
  [0.45, 0.95], // control panel sticks out
  [0.45, 1.0],
  [0.12, 1.08], // bottom of the screen
  [0.02, 1.7], // top of the screen (it leans back a little)
  [0.3, 1.78], // underside of the marquee
  [0.3, 2.05], // top, front
  [-0.45, 2.05], // top, back
];

// Pushes the side outline sideways into a solid. `grow` makes the outline slightly bigger.
function profileGeometry(width, grow = 1) {
  const shape = new THREE.Shape(PROFILE.map(([z, y]) => new THREE.Vector2(z * grow, (y - 1) * grow + 1)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  geometry.rotateY(-Math.PI / 2); // the outline was drawn flat; turn it so the cabinet faces the player
  geometry.translate(width / 2, 0, 0);
  return geometry;
}

const bodyGeometry = profileGeometry(WIDTH);
const trimGeometry = profileGeometry(0.03, 1.012);
const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x45415a, roughness: 0.6, metalness: 0.1 });
const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x77748a, roughness: 0.45, metalness: 0.6 });

export function createCabinet(project, image) {
  const group = new THREE.Group();
  const accent = new THREE.Color(project.accent);
  const add = (mesh, x, y, z, parent = group) => {
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  // ---- Body: striped side panels (material 0) and a dark shell (material 1) ----
  const sideArt = sideArtTexture(project.accent);
  sideArt.repeat.set(1 / 0.9, 1 / 2.05); // stretch the art over the whole side panel
  sideArt.offset.set(0.5, 0);
  group.add(new THREE.Mesh(bodyGeometry, [new THREE.MeshStandardMaterial({ map: sideArt, roughness: 0.6 }), bodyMaterial]));

  // ---- Light-up trim: a thin, slightly larger copy of the outline at each side edge ----
  const trimMaterial = new THREE.MeshBasicMaterial({ color: accent });
  for (const side of [-1, 1]) add(new THREE.Mesh(trimGeometry, trimMaterial), side * (WIDTH / 2 - 0.02), 0, 0);

  // ---- Screen ----
  const screen = add(
    new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.555), new THREE.MeshBasicMaterial({ map: screenTexture(project, image) })),
    0,
    1.39,
    0.075,
  );
  screen.rotation.x = -0.16; // lean back to match the body

  // ---- Marquee (the lit name panel) ----
  const marquee = add(
    new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: marqueeTexture(project) })),
    0,
    1.915,
    0.302,
  );

  // ---- Control panel: joystick and three buttons ----
  const controls = add(new THREE.Group(), 0, 1.045, 0.285);
  controls.rotation.x = 0.238; // tilt to sit flat on the sloped panel
  const plastic = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.35, roughness: 0.4 });
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08), metalMaterial), -0.2, 0.04, 0, controls);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 12), plastic), -0.2, 0.085, 0, controls);
  for (let i = 0; i < 3; i++) {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.014, 20), plastic), 0.06 + i * 0.075, 0.007, i === 1 ? -0.03 : 0.01, controls);
  }

  // ---- Coin door ----
  add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.02), metalMaterial), 0, 0.46, 0.305);
  const slotMaterial = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  for (const side of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.07, 0.01), slotMaterial), side * 0.06, 0.5, 0.318);

  // ---- Invisible box used to detect clicks on this cabinet ----
  const hitBox = add(new THREE.Mesh(new THREE.BoxGeometry(WIDTH, 2.05, 0.9), new THREE.MeshBasicMaterial({ visible: false })), 0, 1.025, 0);

  // How lit-up the cabinet is: 0 = dim (not selected), 1 = glowing (selected).
  function setGlow(amount) {
    screen.material.color.setScalar(0.3 + amount * 0.7);
    marquee.material.color.setScalar(0.5 + amount * 0.85);
    trimMaterial.color.copy(accent).multiplyScalar(0.3 + amount * 0.45);
  }

  // If the project has a video, it is only downloaded the first time its cabinet is selected,
  // and it pauses again when you move away.
  let video;
  function setActive(active) {
    if (!project.video) return;
    if (active && !video) {
      video = Object.assign(document.createElement('video'), { src: project.video, muted: true, loop: true, playsInline: true });
      const texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.SRGBColorSpace;
      video.addEventListener('playing', () => (screen.material.map = texture), { once: true });
    }
    if (active) video.play().catch(() => {}); // if the browser blocks autoplay, the image stays up
    else video?.pause();
  }

  const cabinet = { group, project, hitBox, glow: 0, setGlow, setActive };
  setGlow(0);
  return cabinet;
}

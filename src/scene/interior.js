// Inside the arcade: a row of cabinets (one per project), carpet, dim lamps, neon strips.
// The cabinets stand along the back wall, facing the visitor (+z).
import * as THREE from 'three';
import gsap from 'gsap';
import { COLORS } from '../constants.js';
import { carpetTexture, loadImage } from './textures.js';
import { createCabinet } from './cabinet.js';

const SPACING = 2; // meters between cabinets
const ROOM_H = 3.4;
const WALL_Z = -0.55;

// `step` is called once per project when its image has loaded (it moves the loading counter).
export async function createInterior({ projects, lite, step }) {
  const group = new THREE.Group();
  const xOf = (i) => (i - (projects.length - 1) / 2) * SPACING; // where cabinet number i stands

  const cabinets = await Promise.all(
    projects.map(async (project, i) => {
      const image = project.image ? await loadImage(project.image) : null;
      step();
      const cabinet = createCabinet(project, image);
      cabinet.group.position.x = xOf(i);
      group.add(cabinet.group);
      return cabinet;
    }),
  );

  // ---- Room ----
  const halfW = xOf(projects.length - 1) + 6;
  const plane = (w, h, material) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3454, roughness: 0.9 });

  const carpet = carpetTexture();
  carpet.repeat.set(halfW, 4.5); // one carpet tile covers 2 x 2 meters
  const floor = plane(halfW * 2, 9, new THREE.MeshStandardMaterial({ map: carpet, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = WALL_Z + 4.5;

  const ceiling = plane(halfW * 2, 9, new THREE.MeshStandardMaterial({ color: 0x09080d, roughness: 1 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, ROOM_H, WALL_Z + 4.5);

  const backWall = plane(halfW * 2, ROOM_H, wallMaterial);
  backWall.position.set(0, ROOM_H / 2, WALL_Z);

  const sideWalls = [-1, 1].map((side) => {
    const wall = plane(9, ROOM_H, wallMaterial);
    wall.rotation.y = -side * (Math.PI / 2);
    wall.position.set(side * halfW, ROOM_H / 2, WALL_Z + 4.5);
    return wall;
  });
  group.add(floor, ceiling, backWall, ...sideWalls);

  // ---- Two neon strips running along the back wall ----
  // [color, height on the wall, brightness]. Magenta needs a bigger boost than cyan to glow equally.
  [
    [COLORS.magenta, 2.48, 2],
    [COLORS.cyan, 2.4, 0.85],
  ].forEach(([color, y, boost]) => {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 2, 0.025, 0.025),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(boost) }),
    );
    strip.position.set(0, y, WALL_Z + 0.04);
    group.add(strip);
  });

  // ---- Dim amber ceiling lamps, spread evenly over the row ----
  const lampCount = Math.max(2, Math.ceil(projects.length / 2));
  const lampDisc = new THREE.CircleGeometry(0.16, 24);
  const lampMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(COLORS.amber).multiplyScalar(1.3) });
  for (let i = 0; i < lampCount; i++) {
    const x = (i / (lampCount - 1) - 0.5) * (xOf(projects.length - 1) * 2 + 3);
    const disc = new THREE.Mesh(lampDisc, lampMaterial);
    disc.rotation.x = Math.PI / 2; // face down
    disc.position.set(x, ROOM_H - 0.01, 2);
    group.add(disc);
    // Real lights cost performance, so phones only get the glowing discs.
    if (!lite) {
      const lamp = new THREE.PointLight(COLORS.amber, 7, 10, 2);
      lamp.position.set(x, ROOM_H - 0.4, 2);
      group.add(lamp);
    }
  }
  group.add(new THREE.HemisphereLight(0x6a5aa8, 0x1a1016, lite ? 3.5 : 2.2)); // soft purple fill light

  // ---- One colored light that follows the selected cabinet ----
  const focusLight = new THREE.PointLight(0xffffff, 22, 7, 2);
  focusLight.position.set(0, 1.9, 1.9);
  group.add(focusLight);

  // Light up cabinet `index` and dim the others. `instant` skips the fade.
  function setFocus(index, instant = false) {
    const duration = instant ? 0 : 0.5;
    cabinets.forEach((cabinet, i) => {
      gsap.to(cabinet, { glow: i === index ? 1 : 0, duration, ease: 'power2.out', onUpdate: () => cabinet.setGlow(cabinet.glow) });
      cabinet.setActive(i === index);
    });
    // the project's color, softened toward white so the cabinet doesn't turn one flat color
    const accent = new THREE.Color(cabinets[index].project.accent).lerp(new THREE.Color(0xffffff), 0.55);
    gsap.to(focusLight.color, { r: accent.r, g: accent.g, b: accent.b, duration });
    gsap.to(focusLight.position, { x: xOf(index), duration, ease: 'power3.out' });
  }

  return { group, cabinets, xOf, setFocus };
}

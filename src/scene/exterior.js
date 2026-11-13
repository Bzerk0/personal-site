// The street outside the arcade at night: brick wall, glass doors, neon sign, wet pavement.
// Everything is placed in meters. x = left/right, y = up, z = toward the visitor. The wall is at z = 0.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { COLORS } from '../constants.js';
import { brickTexture, sidewalkTexture, wetAsphaltTexture, glowTexture } from './textures.js';
import { createNeonSign } from './neonSign.js';

const DOOR_W = 2.2;
const DOOR_H = 2.4;
const CURB_Z = 2.6; // where the sidewalk ends and the street begins
const STREET_Y = -0.12; // the street sits a little lower than the sidewalk

// `lite` = phones: fewer lights and no mirror under the street.
// `flicker` = false turns the sign flicker off (reduced motion).
export function createExterior({ lite, flicker }) {
  const group = new THREE.Group();
  const add = (mesh, x = 0, y = 0, z = 0) => {
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };

  // ---- Brick wall, drawn as one outline with a notch for the doorway ----
  const outline = new THREE.Shape()
    .moveTo(-30, 0)
    .lineTo(-DOOR_W / 2, 0)
    .lineTo(-DOOR_W / 2, DOOR_H)
    .lineTo(DOOR_W / 2, DOOR_H)
    .lineTo(DOOR_W / 2, 0)
    .lineTo(30, 0)
    .lineTo(30, 14)
    .lineTo(-30, 14)
    .closePath();
  const brick = brickTexture();
  brick.repeat.set(0.5, 0.5); // one brick tile covers 2 x 2 meters
  add(
    new THREE.Mesh(
      new THREE.ShapeGeometry(outline),
      new THREE.MeshStandardMaterial({ map: brick, bumpMap: brick, bumpScale: 4, roughness: 0.9 }),
    ),
  );

  // ---- Door frame and two glass doors ----
  const metal = new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.45, metalness: 0.7 });
  add(new THREE.Mesh(new THREE.BoxGeometry(0.1, DOOR_H, 0.2), metal), -DOOR_W / 2 + 0.05, DOOR_H / 2, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.1, DOOR_H, 0.2), metal), DOOR_W / 2 - 0.05, DOOR_H / 2, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, 0.1, 0.2), metal), 0, DOOR_H - 0.05, 0);

  const glass = new THREE.MeshStandardMaterial({
    color: 0x1a120a,
    transparent: true,
    opacity: 0.5,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
  // Each door hangs from a pivot at its outer edge, so rotating the pivot swings the door open.
  const doors = [-1, 1].map((side) => {
    const pivot = add(new THREE.Group(), side * (DOOR_W / 2 - 0.1), 0, 0);
    const h = DOOR_H - 0.1;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1, h), glass);
    panel.position.set(-side * 0.5, h / 2, 0);
    pivot.add(panel);
    // metal frame around the glass, plus a push bar: [width, height, x, y]
    for (const [w, bh, x, y] of [[0.07, h, 0.035, h / 2], [0.07, h, 0.965, h / 2], [1, 0.07, 0.5, h - 0.035], [1, 0.16, 0.5, 0.08], [0.86, 0.05, 0.5, 1.05]]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, bh, 0.05), metal);
      bar.position.set(-side * x, y, 0.01);
      pivot.add(bar);
    }
    pivot.userData.openAngle = -side * 1.35; // radians, swinging into the arcade
    return pivot;
  });

  // Warm light from inside, seen through the glass.
  add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(8, 5),
      new THREE.MeshBasicMaterial({ map: glowTexture(COLORS.amber), color: 0x9a9a9a, fog: false }),
    ),
    0,
    0.6,
    -3,
  );

  // ---- The sign, and the colored light it throws on the wall and street ----
  const sign = createNeonSign();
  add(sign.group, 0, 4.3, 0.12);

  // [color, strength, x, y, z]
  const lightSpecs = lite
    ? [[COLORS.magenta, 32, 0, 4.3, 1.6]]
    : [
        [COLORS.magenta, 26, -1.4, 4.7, 1.5],
        [COLORS.cyan, 12, 1.5, 3.5, 1.4],
      ];
  const signLights = lightSpecs.map(([color, strength, x, y, z]) => {
    const light = add(new THREE.PointLight(color, strength, 14, 2), x, y, z);
    light.userData.strength = strength;
    return light;
  });
  add(new THREE.PointLight(COLORS.amber, 7, 7, 2), 0, 1.3, 1.2); // light spilling out of the doors
  group.add(new THREE.HemisphereLight(0x25223d, 0x000000, 0.35)); // a touch of night sky so nothing is pure black

  // ---- Sidewalk, curb, street ----
  const concrete = sidewalkTexture();
  concrete.repeat.set(60 / 1.3, 2);
  const sidewalk = add(
    new THREE.Mesh(new THREE.PlaneGeometry(60, CURB_Z), new THREE.MeshStandardMaterial({ map: concrete, roughness: 0.85 })),
    0,
    0,
    CURB_Z / 2,
  );
  sidewalk.rotation.x = -Math.PI / 2;
  add(
    new THREE.Mesh(new THREE.BoxGeometry(60, 0.14, 0.16), new THREE.MeshStandardMaterial({ color: 0x2c2a31, roughness: 0.8 })),
    0,
    STREET_Y / 2 - 0.01,
    CURB_Z + 0.08,
  );

  const streetGeometry = new THREE.PlaneGeometry(60, 40);
  if (!lite) {
    // A mirror lying on the street. The asphalt on top hides most of it, leaving puddle reflections.
    const mirror = add(
      new Reflector(streetGeometry, { textureWidth: 1024, textureHeight: 1024, color: 0xb0b0b0 }),
      0,
      STREET_Y,
      CURB_Z + 20,
    );
    mirror.rotation.x = -Math.PI / 2;
  }
  const asphalt = add(
    new THREE.Mesh(
      streetGeometry,
      lite
        ? new THREE.MeshStandardMaterial({ color: 0x0d0c11, roughness: 0.6, metalness: 0.2 })
        : new THREE.MeshStandardMaterial({ map: wetAsphaltTexture(), transparent: true, opacity: 0.9, roughness: 0.6 }),
    ),
    0,
    STREET_Y + 0.005,
    CURB_Z + 20,
  );
  asphalt.rotation.x = -Math.PI / 2;

  // ---- Flicker ----
  // Every 5-12 seconds the sign dips twice, quickly. That is at most 2 flashes in any one second,
  // under the 3-per-second limit that keeps flashing content safe for people with photosensitive epilepsy.
  let nextFlicker = 6;
  function flickerAmount(time) {
    if (!flicker) return 1;
    const since = time - nextFlicker;
    if (since > 0.5) nextFlicker = time + 5 + Math.random() * 7;
    const dipping = (since > 0 && since < 0.07) || (since > 0.2 && since < 0.3);
    return dipping ? 0.4 : 1;
  }

  // Called every frame. `power` goes from 0 (sign off) to 1 (sign on).
  function update(time, power) {
    const brightness = power * flickerAmount(time);
    sign.setBrightness(brightness);
    for (const light of signLights) light.intensity = light.userData.strength * brightness;
  }

  return { group, doors, update };
}

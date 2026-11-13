// The "Hudson's Arcade" neon sign.
// The glowing tubes are text painted on a canvas, shown on a see-through panel just in front of the wall.
import * as THREE from 'three';
import { COLORS } from '../constants.js';
import { makeCanvas, toTexture } from './textures.js';

const WIDTH = 6.6; // size of the sign in meters
const HEIGHT = 3.3;

// Paints one line of neon: a wide soft glow in the tube color, then a hot, paler core on top.
function drawNeonLine(g, label, y, size, color, spacing = '0px') {
  g.font = `${size}px "Tilt Neon"`;
  g.letterSpacing = spacing;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.fillStyle = color;
  g.shadowBlur = 90;
  g.fillText(label, 1024, y);
  g.fillText(label, 1024, y);
  g.shadowBlur = 24;
  g.fillText(label, 1024, y);
  g.shadowBlur = 0;
  g.fillStyle = `#${new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.35).getHexString()}`;
  g.fillText(label, 1024, y);
}

export function createNeonSign() {
  const group = new THREE.Group();

  const [canvas, g] = makeCanvas(2048, 1024);
  drawNeonLine(g, 'Hudson’s', 350, 430, COLORS.magenta);
  drawNeonLine(g, 'ARCADE', 770, 240, COLORS.cyan, '56px');

  // MeshBasicMaterial ignores the scene lights: the tubes are a light source, they always glow.
  const tubes = new THREE.Mesh(
    new THREE.PlaneGeometry(WIDTH, HEIGHT),
    new THREE.MeshBasicMaterial({ map: toTexture(canvas), transparent: true, fog: false }),
  );
  tubes.position.z = 0.1;
  group.add(tubes);

  // brightness: 0 = off, 1 = fully on. Values above 1 in the color are what the bloom effect picks up.
  const setBrightness = (b) => tubes.material.color.setScalar(0.06 + b * 1.05);
  return { group, setBrightness };
}

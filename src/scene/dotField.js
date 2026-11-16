// The landing backdrop: a starry sky and a dithered floor, drawn as chunky pixels behind the 3D cabinet.
// It is one full-screen shader. Every pixel works out which 3×3 "cell" it belongs to and shades
// the cell's centre, so the whole backdrop looks low-resolution while the cabinet stays sharp.
//   Sky:   per-cell hashed stars (a few twinkle), fixed to the screen.
//   Floor: the camera's view ray is traced down to the ground (y = 0), so the floor lines up with
//          the cabinet and moves correctly when the camera flies in. Grid lines, the screen's glow
//          pool and a contact shadow give a brightness, which an 8×8 Bayer pattern dithers into
//          four flat tones.
// Animation steps at 12 frames a second for a retro feel.
// Technique studied from sadok.mx's background; the floor, palette and lighting are our own.
import * as THREE from 'three';

const CELL = 3; // CSS pixels per cell
const STEPS_PER_SECOND = 12;
const FLOOR = ['#07060b', '#100f24', '#1c2150', '#304394']; // bg, then three blues, darkest first
const STARS = ['#363a55', '#8a93c4']; // dim, bright

// The recursive 8×8 ordered-dither matrix (values 0..63).
function bayer(size = 8) {
  let m = [[0]];
  for (let n = 1; n < size; n *= 2) {
    const next = Array.from({ length: n * 2 }, () => Array(n * 2).fill(0));
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const v = 4 * m[y][x];
        next[y][x] = v;
        next[y][x + n] = v + 2;
        next[y + n][x] = v + 3;
        next[y + n][x + n] = v + 1;
      }
    m = next;
  }
  return m.flat();
}

const glsl = (n) => (Number.isInteger(n) ? `${n}.0` : `${n}`);

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uPower;     // the cabinet screen: 0 off, 1 on
uniform float uCell;      // cell size in drawing-buffer pixels
uniform vec2 uResolution; // drawing-buffer size
uniform mat4 uProjectionInverse;
uniform mat4 uCameraWorld;
uniform vec2 uGlow;       // where the screen's light pools on the floor (x, z)
uniform vec4 uFoot;       // the cabinet's footprint: min x, min z, max x, max z
uniform vec3 uFloor[4];
uniform vec3 uStars[2];

const float BAYER[64] = float[64](${bayer().map(glsl).join(', ')});
const float TAU = 6.283185307179586;

uint hash32(uint x) {
  x ^= x >> 16u; x *= 0x7feb352du;
  x ^= x >> 15u; x *= 0x846ca68bu;
  x ^= x >> 16u;
  return x;
}
float unit(uint h) { return float(h >> 8u) / 16777216.0; }

// 0 none, 1 dim, 2 bright. A quarter of the stars twinkle.
int star(vec2 cell, float t) {
  uint h1 = hash32(uint(cell.x) + uint(cell.y) * 65536u + 2654435769u);
  if (unit(h1) >= 0.004) return 0;
  uint h2 = hash32(h1);
  uint h3 = hash32(h2);
  if (unit(h3) >= 0.25) return unit(h2) < 0.35 ? 2 : 1;
  uint h4 = hash32(h3);
  float s = sin(TAU * t * (0.25 + 0.2 * unit(h4)) + TAU * unit(hash32(h4)));
  return s > 0.35 ? 2 : (s > -0.35 ? 1 : 0);
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy / uCell);
  vec2 ndc = (cell + 0.5) * uCell / uResolution * 2.0 - 1.0;

  // The view ray through this cell's centre.
  vec3 origin = uCameraWorld[3].xyz;
  vec4 view = uProjectionInverse * vec4(ndc, 1.0, 1.0);
  vec3 dir = normalize((uCameraWorld * vec4(view.xyz / view.w, 1.0)).xyz - origin);

  if (dir.y > -0.001) { // above the horizon: sky
    int s = star(cell, uTime);
    gl_FragColor = vec4(s == 0 ? uFloor[0] : uStars[s - 1], 1.0);
    return;
  }

  // Where the ray meets the floor, and how much floor one cell covers there (for anti-aliasing).
  float t = -origin.y / dir.y;
  vec2 p = origin.xz + dir.xz * t;
  float cellAngle = 2.0 * uCell / uResolution.y * uProjectionInverse[1][1];
  float footprint = t * cellAngle / max(-dir.y, 0.02);

  // Grid lines every metre (offset half a metre so the cabinet stands inside a tile),
  // thinning out before they turn to noise in the distance.
  vec2 g = abs(fract(p) - 0.5);
  float line = 1.0 - smoothstep(0.02, 0.02 + footprint, min(g.x, g.y));
  line *= 1.0 - smoothstep(0.15, 0.45, footprint);

  // The floor is a pool of light around the cabinet that fades into the dark.
  float reach = 1.0 - smoothstep(3.0, 16.0, length(p));
  float glow = uPower * exp(-dot(p - uGlow, p - uGlow) / 2.2);
  vec2 outside = max(max(uFoot.xy - p, p - uFoot.zw), 0.0);
  float shadow = mix(0.2, 1.0, smoothstep(0.0, 0.5, length(outside)));
  float level = (0.16 + 0.32 * line + 0.75 * glow) * reach * shadow;

  // Dither the brightness into one of the four floor tones.
  int bx = int(mod(cell.x, 8.0));
  int by = int(mod(cell.y, 8.0));
  float threshold = (BAYER[by * 8 + bx] + 0.5) / 64.0;
  float lv = clamp(level, 0.0, 1.0) * 3.0;
  float tone = min(floor(lv) + (fract(lv) > threshold ? 1.0 : 0.0), 3.0);
  gl_FragColor = vec4(uFloor[int(tone + 0.5)], 1.0);
}
`;

// `glow` = the floor point (x, z) the screen lights most. `footprint` = a THREE.Box3 around the cabinet.
// `still` = true holds the stars steady (reduced motion).
export function createDotField({ glow, footprint, still }) {
  const color = (hex) => new THREE.Color(hex);
  const material = new THREE.ShaderMaterial({
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uPower: { value: 0 },
      uCell: { value: CELL },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uProjectionInverse: { value: new THREE.Matrix4() },
      uCameraWorld: { value: new THREE.Matrix4() },
      uGlow: { value: new THREE.Vector2(glow.x, glow.z) },
      uFoot: { value: new THREE.Vector4(footprint.min.x, footprint.min.z, footprint.max.x, footprint.max.z) },
      uFloor: { value: FLOOR.map(color) },
      uStars: { value: STARS.map(color) },
    },
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1; // drawn first, behind everything
  mesh.raycast = () => {};

  const size = new THREE.Vector2();
  // Called every frame, after the camera has moved.
  function update(time, power, camera, renderer) {
    const u = material.uniforms;
    u.uTime.value = still ? 0 : Math.floor(time * STEPS_PER_SECOND) / STEPS_PER_SECOND;
    u.uPower.value = power;
    renderer.getDrawingBufferSize(size);
    u.uResolution.value.copy(size);
    u.uCell.value = CELL * renderer.getPixelRatio();
    camera.updateMatrixWorld();
    u.uProjectionInverse.value.copy(camera.projectionMatrixInverse);
    u.uCameraWorld.value.copy(camera.matrixWorld);
  }

  return { mesh, update };
}

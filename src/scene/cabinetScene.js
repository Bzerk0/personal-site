// The landing scene: one arcade cabinet alone in the dark, lit only by its own screen.
// Everything is placed in meters. x = left/right, y = up, z = toward the visitor. The cabinet stands at the origin.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createDotField } from './dotField.js';
import { createScreenDisplay } from './screenDisplay.js';

const GLOW = 0x5b8cff; // the blue-white light a CRT throws

// `blink` = false keeps the screen's prompts steady (reduced motion).
// `projects` and `touch` are passed on to the screen (see screenDisplay.js).
export async function createCabinetScene({ blink, projects, touch }) {
  const group = new THREE.Group();

  // ---- The cabinet: based on "Defender Arcade" by Delinx, CC BY 4.0 (credited on the page), repainted plain ----
  const gltf = await new GLTFLoader().loadAsync('/models/cabinet.glb');
  group.add(gltf.scene);

  // ---- Its screen: the model has a separate "Screen" piece; we paint our own picture on it ----
  const screenMesh = gltf.scene.getObjectByName('Screen');
  const display = createScreenDisplay({ projects, touch, blink });
  screenMesh.material = new THREE.MeshBasicMaterial({ map: display.texture, fog: false });

  // Where the screen is and which way it faces, measured from the mesh so the camera can fly straight at it.
  gltf.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(screenMesh);
  const corners = screenMesh.geometry.attributes.position;
  const p = (i) => new THREE.Vector3().fromBufferAttribute(corners, i).applyMatrix4(screenMesh.matrixWorld);
  const normal = new THREE.Vector3().fromBufferAttribute(screenMesh.geometry.attributes.normal, 0).transformDirection(screenMesh.matrixWorld);
  const screen = {
    center: box.getCenter(new THREE.Vector3()),
    normal,
    width: p(0).distanceTo(p(1)),
    height: p(1).distanceTo(p(2)),
  };

  // ---- Light: the glow from the screen, and almost nothing else ----
  const glow = new THREE.PointLight(GLOW, 0, 9, 2);
  glow.position.copy(screen.center).addScaledVector(normal, 0.45);
  group.add(glow);
  const GLOW_STRENGTH = 7;
  group.add(new THREE.HemisphereLight(0x1b2440, 0x000000, 0.12)); // just enough to hint at the silhouette

  // ---- Sky and floor: chunky dithered pixels behind the cabinet (see dotField.js) ----
  const glowOnFloor = screen.center.clone().addScaledVector(normal, 0.9);
  const field = createDotField({ glow: glowOnFloor, footprint: new THREE.Box3().setFromObject(gltf.scene), still: !blink });
  group.add(field.mesh);

  // Called every frame, after the camera has moved. `power` goes from 0 (screen off) to 1 (on).
  // `close` goes from 0 (across the room) to 1 (right up at the screen): up close the screen is turned
  // down so its text stays sharp instead of glowing.
  function update(time, power, camera, renderer, close = 0) {
    display.update();
    screenMesh.material.color.setScalar(0.04 + power * (1.7 - 0.75 * close)); // above 1 is what the bloom picks up
    glow.intensity = GLOW_STRENGTH * power;
    field.update(time, power, camera, renderer);
  }

  return { group, screen, display, update };
}

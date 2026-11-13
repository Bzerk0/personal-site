// The 3D experience: sets up Three.js, draws every frame, and reacts to input.
// It moves through a few states:
//   'waiting'  loading screen is still up
//   'outside'  on the street, looking at the sign
//   'inside'   in front of a cabinet
//   'busy'     a transition is playing (input is ignored)
import * as THREE from 'three';
import gsap from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { COLORS } from '../constants.js';
import { menuIsOpen } from '../ui/nav.js';
import { createExterior } from './exterior.js';
import { createInterior } from './interior.js';
import { enterTransition, openTransition } from './transitions.js';

const $ = (id) => document.getElementById(id);
const FOV = 50;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

export async function createArcade({ canvas, projects, step }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 700;

  // ---- Renderer, scene, camera ----
  const renderer = new THREE.WebGLRenderer({ canvas, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2)); // cap sharpness so phones stay smooth
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.bg);
  scene.fog = new THREE.FogExp2(COLORS.bg, 0.03); // things far away fade into the dark
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);

  const exterior = createExterior({ lite: mobile, flicker: !reduced });
  const interior = await createInterior({ projects, lite: mobile, step });
  scene.add(exterior.group, interior.group);

  // ---- Bloom: makes anything brighter than white glow (the neon). HTML text is never affected. ----
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 }));
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.4, 0.6)); // strength, radius, threshold
  composer.addPass(new OutputPass());
  let useBloom = true;

  // ---- Camera rig: where the camera stands and what it looks at ----
  const rig = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  let aspect = 1;
  // Each "pose" backs the camera up on narrow screens so the subject still fits.
  const outsidePose = () => ({ pos: { x: 0, y: 1.7, z: Math.min(17, Math.max(10.5, 3.4 / (TAN * aspect))) }, look: { x: 0, y: 2.45, z: 0 } });
  const cabinetPose = (i) => ({ pos: { x: interior.xOf(i), y: 1.35, z: Math.max(4, 0.9 / (TAN * aspect)) }, look: { x: interior.xOf(i), y: 0.85, z: 0 } });
  const screenPose = (i) => ({ pos: { x: interior.xOf(i), y: 1.45, z: 1.05 }, look: { x: interior.xOf(i), y: 1.39, z: 0.07 } });
  const setPose = (pose) => {
    rig.pos.copy(pose.pos);
    rig.look.copy(pose.look);
  };

  let state = 'waiting';
  // Also written to <body data-state="..."> so CSS and the test script can see it.
  const setState = (next) => (document.body.dataset.state = state = next);
  let index = 0; // which cabinet is selected
  let signPower = 0; // 0 = sign off, 1 = on
  let time = 0;

  function resize() {
    aspect = innerWidth / innerHeight;
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(innerWidth, innerHeight);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    if (state === 'inside') setPose(cabinetPose(index));
    else if (state !== 'busy') setPose(outsidePose());
  }
  addEventListener('resize', resize);
  resize();

  // ---- Draw loop ----
  const timer = new THREE.Timer();
  let frames = 0;
  let slowFrames = 0;
  function frame() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.1);
    time += dt;
    if (exterior.group.visible) exterior.update(time, signPower);

    camera.position.copy(rig.pos);
    if (state === 'outside' && !reduced) {
      // idle sway: a slow drift so the street feels alive
      camera.position.x += Math.sin(time * 0.3) * 0.2;
      camera.position.y += Math.sin(time * 0.23) * 0.06;
    }
    camera.lookAt(rig.look);

    if (useBloom) composer.render(dt);
    else renderer.render(scene, camera);

    // Phones: if the first couple of seconds run below ~30 frames a second, turn the bloom off.
    if (mobile && useBloom && state !== 'waiting' && frames < 90) {
      frames++;
      if (dt > 1 / 30) slowFrames++;
      if (frames === 90 && slowFrames > 45) useBloom = false;
    }
  }
  // Warm up: compile all the shaders now (part of the loading bar) so the first transition is smooth.
  // (Once per scene, because each one has its own set of lights.)
  exterior.group.visible = false;
  await renderer.compileAsync(scene, camera);
  exterior.group.visible = true;
  interior.group.visible = false;
  await renderer.compileAsync(scene, camera);
  step();
  renderer.setAnimationLoop(frame);
  // Stop drawing while the tab is in the background.
  document.addEventListener('visibilitychange', () => renderer.setAnimationLoop(document.hidden ? null : frame));

  // ---- On-screen text (plain HTML on top of the canvas) ----
  const flash = $('flash');
  const hud = { prompt: $('prompt'), skip: $('skip'), cabinet: $('cabinet-ui'), label: $('label'), prev: $('prev'), next: $('next'), counter: $('counter') };

  function showCabinetInfo() {
    const p = projects[index];
    hud.label.href = `/projects/${p.slug}/`;
    hud.label.style.setProperty('--accent', p.accent);
    hud.label.querySelector('.label__name').textContent = p.name;
    hud.label.querySelector('.label__tagline').textContent = p.tagline;
    hud.counter.textContent = `${index + 1} / ${projects.length}`;
    hud.prev.disabled = index === 0;
    hud.next.disabled = index === projects.length - 1;
    history.replaceState(null, '', `#${p.slug}`); // so Back / reload returns to this cabinet
  }

  function arriveInside() {
    exterior.group.visible = false;
    interior.group.visible = true;
    document.body.classList.remove('is-outside');
    hud.prompt.hidden = hud.skip.hidden = true;
    interior.setFocus(index, true);
    showCabinetInfo();
  }

  // ---- Actions ----
  function enter() {
    if (state !== 'outside') return;
    setState('busy');
    hud.prompt.hidden = true;
    enterTransition({ rig, doors: exterior.doors, flash, reduced, swap: arriveInside, inside: cabinetPose(index) }).eventCallback('onComplete', () => {
      setState('inside');
      hud.cabinet.hidden = false;
    });
  }

  function focus(i) {
    i = THREE.MathUtils.clamp(i, 0, projects.length - 1);
    if (state !== 'inside' || i === index) return;
    index = i;
    interior.setFocus(index);
    showCabinetInfo();
    const { pos } = cabinetPose(index);
    gsap.to([rig.pos, rig.look], { x: pos.x, duration: reduced ? 0 : 0.7, ease: 'power3.out', overwrite: true });
  }

  function open() {
    if (state !== 'inside') return;
    setState('busy');
    hud.cabinet.hidden = true;
    const p = projects[index];
    openTransition({ rig, flash, reduced, screen: screenPose(index), accent: p.accent, done: () => (location.href = `/projects/${p.slug}/`) });
  }

  // ---- Input ----
  addEventListener('keydown', (e) => {
    if (menuIsOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    const onControl = e.target.closest?.('a, button, input, textarea, select'); // let links and buttons handle their own keys
    const press = e.key === 'Enter' || e.key === ' ';
    if (state === 'outside' && press && !onControl) {
      e.preventDefault();
      enter();
    } else if (state === 'inside') {
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') focus(index + 1);
      else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') focus(index - 1);
      else if (e.key === 'Enter' && !onControl) open();
    }
  });

  // Scroll wheel: one cabinet per scroll gesture.
  let lastWheel = 0;
  addEventListener(
    'wheel',
    (e) => {
      if (menuIsOpen()) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (state === 'outside') {
        lastWheel = e.timeStamp;
        enter();
      } else if (Math.abs(delta) > 4 && e.timeStamp - lastWheel > 600) {
        lastWheel = e.timeStamp;
        focus(index + Math.sign(delta));
      }
    },
    { passive: true },
  );

  // Which cabinet is under the mouse / finger? (-1 = none)
  const raycaster = new THREE.Raycaster();
  function cabinetAt(e) {
    raycaster.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    const hit = raycaster.intersectObjects(interior.cabinets.map((c) => c.hitBox))[0];
    return hit ? interior.cabinets.findIndex((c) => c.hitBox === hit.object) : -1;
  }

  canvas.addEventListener('click', (e) => {
    if (state === 'outside') return enter();
    if (state !== 'inside') return;
    const hit = cabinetAt(e);
    if (hit === index) open();
    else if (hit >= 0) focus(hit);
  });
  canvas.addEventListener('pointermove', (e) => {
    canvas.style.cursor = state === 'outside' || (state === 'inside' && cabinetAt(e) >= 0) ? 'pointer' : '';
  });

  // Touch: swipe left/right to change cabinet; any swipe on the street walks in.
  let touchStart = null;
  canvas.addEventListener('touchstart', (e) => (touchStart = e.changedTouches[0]), { passive: true });
  canvas.addEventListener(
    'touchend',
    (e) => {
      const dx = e.changedTouches[0].clientX - touchStart.clientX;
      const dy = e.changedTouches[0].clientY - touchStart.clientY;
      if (state === 'outside' && Math.hypot(dx, dy) > 30) enter();
      else if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) focus(index + (dx < 0 ? 1 : -1));
    },
    { passive: true },
  );

  hud.prev.addEventListener('click', () => focus(index - 1));
  hud.next.addEventListener('click', () => focus(index + 1));
  hud.label.addEventListener('click', (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) return; // open-in-new-tab still works normally
    e.preventDefault();
    open();
  });

  // Coming back with the browser's Back button can restore this page mid-zoom. Put it back in front of the cabinet.
  addEventListener('pageshow', (e) => {
    if (!e.persisted || state !== 'busy') return;
    gsap.set(flash, { opacity: 0 });
    setPose(cabinetPose(index));
    hud.cabinet.hidden = false;
    setState('inside');
  });

  // ---- Start. Called by main.js once the loading screen is dismissed. ----
  // With a project slug (coming back from a project page) we go straight to that cabinet.
  function begin(slug) {
    const startIndex = projects.findIndex((p) => p.slug === slug);
    if (startIndex >= 0) {
      index = startIndex;
      arriveInside();
      setPose(cabinetPose(index));
      hud.cabinet.hidden = false;
      setState('inside');
      return;
    }
    document.body.classList.add('is-outside');
    hud.prompt.hidden = false;
    setPose(outsidePose());
    setState('busy');
    // The sign powers on: a quick stutter, then steady. Input unlocks once it is lit.
    const power = { value: 0 };
    const tl = gsap.timeline({ onUpdate: () => (signPower = power.value), onComplete: () => (setState('outside')) });
    if (reduced) tl.set(power, { value: 1 }).to({}, { duration: 0.4 });
    else tl.to(power, { value: 1, duration: 0.06 }, 0.3).to(power, { value: 0.2, duration: 0.06 }, 0.45).to(power, { value: 1, duration: 0.5, ease: 'power2.out' }, 0.62);
  }

  return { begin };
}

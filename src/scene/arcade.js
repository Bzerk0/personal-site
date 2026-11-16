// The 3D experience: sets up Three.js, draws every frame, and reacts to input.
// It moves through a few states:
//   'waiting'  still loading (the page is black)
//   'outside'  looking at the lone cabinet from across the dark room
//   'title'    zoomed into its screen, the title sequence is playing
//   'menu'     zoomed into its screen, browsing the project carousel
//   'busy'     a transition is playing (input is ignored)
import * as THREE from 'three';
import gsap from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { COLORS } from '../constants.js';
import { menuIsOpen } from '../ui/nav.js';
import { createCabinetScene } from './cabinetScene.js';
import { zoomTransition, openTransition } from './transitions.js';

const $ = (id) => document.getElementById(id);
const FOV = 50;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

export async function createArcade({ canvas, projects }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 700;

  // ---- Renderer, scene, camera ----
  const renderer = new THREE.WebGLRenderer({ canvas, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2)); // cap sharpness so phones stay smooth
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.bg);
  scene.fog = new THREE.FogExp2(COLORS.bg, 0.045); // the room fades into the dark
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 120);

  const room = await createCabinetScene({ blink: !reduced, projects, touch: matchMedia('(pointer: coarse)').matches });
  scene.add(room.group);

  // ---- Bloom: makes anything brighter than white glow (the screen). HTML text is never affected. ----
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 }));
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.55, 0.6); // strength, radius, threshold
  composer.addPass(bloom);
  // How close the camera is to the screen: 0 = across the room, 1 = at the screen. Up close the glow is
  // turned down so the text on the screen stays readable.
  const view = { close: 0 };
  const setClose = (close, duration = 0) =>
    gsap.to(view, { close, duration, ease: 'power2.inOut', onUpdate: () => (bloom.strength = 0.7 - 0.6 * view.close) });
  composer.addPass(new OutputPass());
  let useBloom = true;

  // ---- Camera rig: where the camera stands and what it looks at ----
  const rig = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  let aspect = 1;
  // The landing view: across the room, the cabinet small in the middle of the dark.
  const outsidePose = () => ({ pos: { x: 0, y: 1.5, z: 8 }, look: { x: 0, y: 1.05, z: 0 } });
  // Straight in front of the screen, close enough that it fills the window. `push` < 1 goes closer still.
  const screenPose = (push = 1) => {
    const { center, normal, width, height } = room.screen;
    const distance = Math.min(height / 2 / TAN, width / 2 / (TAN * aspect)) * 0.97 * push;
    const pos = center.clone().addScaledVector(normal, distance);
    return { pos: { x: pos.x, y: pos.y, z: pos.z }, look: { x: center.x, y: center.y, z: center.z } };
  };
  // The carousel view: the whole screen in view with room either side for the arrows, and a bit of cabinet around it.
  const carouselPose = () => {
    const { center, normal, width, height } = room.screen;
    const share = aspect < 1 ? 0.7 : 0.6; // how much of the window's width the screen may take
    const distance = Math.max(height / 2 / (TAN * 0.66), width / 2 / (TAN * aspect * share));
    const pos = center.clone().addScaledVector(normal, distance);
    return { pos: { x: pos.x, y: pos.y, z: pos.z }, look: { x: center.x, y: center.y, z: center.z } };
  };
  const setPose = (pose) => {
    rig.pos.copy(pose.pos);
    rig.look.copy(pose.look);
  };

  let state = 'waiting';
  // Also written to <body data-state="..."> so CSS and the test script can see it.
  const setState = (next) => (document.body.dataset.state = state = next);
  let index = 0; // which project is on the screen
  let power = 0; // the screen: 0 = off, 1 = on
  let time = 0;

  function resize() {
    aspect = innerWidth / innerHeight;
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(innerWidth, innerHeight);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    if (state === 'menu' || state === 'title') {
      setPose(carouselPose());
      placeControls();
    }
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
    camera.position.copy(rig.pos);
    if (state === 'outside' && !reduced) {
      // idle sway: a slow drift so the room feels alive
      camera.position.x += Math.sin(time * 0.3) * 0.15;
      camera.position.y += Math.sin(time * 0.23) * 0.05;
    }
    camera.lookAt(rig.look);
    room.update(time, power, camera, renderer, view.close);

    if (useBloom) composer.render(dt);
    else renderer.render(scene, camera);

    // Phones: if the first couple of seconds run below ~30 frames a second, turn the bloom off.
    if (mobile && useBloom && state !== 'waiting' && frames < 90) {
      frames++;
      if (dt > 1 / 30) slowFrames++;
      if (frames === 90 && slowFrames > 45) useBloom = false;
    }
  }
  // Warm up: compile the shaders now so the first frame is smooth.
  await renderer.compileAsync(scene, camera);
  renderer.setAnimationLoop(frame);
  // Stop drawing while the tab is in the background.
  document.addEventListener('visibilitychange', () => renderer.setAnimationLoop(document.hidden ? null : frame));

  // ---- The carousel: the projects are drawn on the 3D screen; these are the HTML controls over it ----
  const flash = $('flash');
  const display = room.display;
  const hud = { menu: $('menu'), link: $('screen-link'), prev: $('prev'), next: $('next'), status: $('menu-status') };

  // Lines the controls up with the screen as it appears in the window: the link covers the screen,
  // the arrows sit just outside its left and right edges. Called whenever the camera settles.
  function placeControls() {
    camera.position.copy(rig.pos);
    camera.lookAt(rig.look);
    camera.updateMatrixWorld();
    const { center, normal, width, height } = room.screen;
    const right = new THREE.Vector3(0, 1, 0).cross(normal).normalize();
    const up = normal.clone().cross(right).normalize();
    const xs = [];
    const ys = [];
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const corner = center.clone().addScaledVector(right, (sx * width) / 2).addScaledVector(up, (sy * height) / 2).project(camera);
      xs.push(((corner.x + 1) / 2) * innerWidth);
      ys.push(((1 - corner.y) / 2) * innerHeight);
    }
    const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    for (const [key, value] of Object.entries(box)) hud.menu.style.setProperty(`--s${key}`, `${Math.round(value)}px`);
  }

  // Shows project `i` (wrapping around at either end). `dir` +1 / -1 slides it in from the right / left.
  function select(i, dir = 0) {
    index = (i + projects.length) % projects.length;
    const p = projects[index];
    display.project(index, dir);
    hud.menu.style.setProperty('--accent', p.accent);
    hud.link.href = `/projects/${p.slug}/`;
    hud.link.setAttribute('aria-label', `Open ${p.name}: ${p.tagline}`);
    hud.status.textContent = `Project ${index + 1} of ${projects.length}: ${p.name}. ${p.tagline}`;
    history.replaceState(null, '', `#${p.slug}`); // so Back / reload returns to this project
  }

  function showCarousel() {
    placeControls();
    hud.menu.hidden = false;
    select(index);
    setState('menu');
    hud.link.focus({ preventScroll: true });
  }

  // ---- Actions ----
  // From across the room: zoom up to the screen, then play the title sequence on it.
  function enter() {
    if (state !== 'outside') return;
    setState('busy');
    setClose(1, reduced ? 0 : 2);
    zoomTransition({
      rig,
      flash,
      reduced,
      to: carouselPose(),
      done: () => {
        setState('title');
        display.title(index, showCarousel);
      },
    });
  }

  function leave() {
    if (state !== 'menu') return;
    setState('busy');
    hud.menu.hidden = true;
    display.attract();
    setClose(0, reduced ? 0 : 2);
    history.replaceState(null, '', location.pathname);
    zoomTransition({ rig, flash, reduced, to: outsidePose(), done: () => setState('outside') });
  }

  // A project was chosen: push on into the screen, then load its page.
  function open() {
    if (state !== 'menu') return;
    setState('busy');
    hud.menu.hidden = true;
    const p = projects[index];
    openTransition({ rig, flash, reduced, screen: screenPose(0.35), accent: p.accent, done: () => (location.href = `/projects/${p.slug}/`) });
  }

  hud.prev.addEventListener('click', () => select(index - 1, -1));
  hud.next.addEventListener('click', () => select(index + 1, 1));
  hud.link.addEventListener('click', (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) return; // open-in-new-tab still works normally
    e.preventDefault();
    open();
  });

  // ---- Input ----
  addEventListener('keydown', (e) => {
    if (menuIsOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    const onControl = e.target.closest?.('a, button, input, textarea, select'); // let links and buttons handle their own keys
    const press = e.key === 'Enter' || e.key === ' ';
    const key = e.key.toLowerCase();
    if (state === 'outside' && press && !onControl) {
      e.preventDefault();
      enter();
    } else if (state === 'title') {
      // Any key skips the title sequence.
      e.preventDefault();
      display.skipTitle();
    } else if (state === 'menu') {
      if (key === 'arrowright' || key === 'd') select(index + 1, 1);
      else if (key === 'arrowleft' || key === 'a') select(index - 1, -1);
      else if (key === 'escape') leave();
      else if (press && !e.target.closest?.('button')) open(); // on the arrow buttons, Enter/Space press the button instead
      else return;
      e.preventDefault();
    }
  });

  // Scroll wheel: on the landing it zooms in; on the screen, one project per scroll gesture.
  let lastWheel = 0;
  addEventListener(
    'wheel',
    (e) => {
      if (menuIsOpen()) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (state === 'outside') {
        lastWheel = e.timeStamp;
        enter();
      } else if (state === 'title' && e.timeStamp - lastWheel > 400) {
        display.skipTitle();
      } else if (state === 'menu' && Math.abs(delta) > 4 && e.timeStamp - lastWheel > 400) {
        lastWheel = e.timeStamp;
        select(index + Math.sign(delta), Math.sign(delta));
      }
    },
    { passive: true },
  );

  canvas.addEventListener('click', () => {
    if (state === 'outside') enter();
    else if (state === 'title') display.skipTitle();
  });
  canvas.addEventListener('pointermove', () => (canvas.style.cursor = state === 'outside' ? 'pointer' : ''));

  // Touch: any swipe in the room zooms in. On the screen, swipe left/right to change project; tap the screen to open it.
  let touchStart = null;
  addEventListener('touchstart', (e) => (touchStart = e.changedTouches[0]), { passive: true });
  addEventListener(
    'touchend',
    (e) => {
      if (!touchStart || menuIsOpen() || e.target.closest?.('button, .nav')) return;
      const dx = e.changedTouches[0].clientX - touchStart.clientX;
      const dy = e.changedTouches[0].clientY - touchStart.clientY;
      const swiped = Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy);
      if (state === 'outside' && Math.hypot(dx, dy) > 30) enter();
      else if (state === 'title' && Math.hypot(dx, dy) > 30) display.skipTitle();
      else if (state === 'menu' && swiped) {
        if (e.cancelable) e.preventDefault(); // a swipe across the screen must not also count as a tap on it
        select(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      }
    },
    { passive: false },
  );

  // Coming back with the browser's Back button can restore this page mid-zoom. Put it back on the screen.
  addEventListener('pageshow', (e) => {
    if (!e.persisted || state !== 'busy') return;
    gsap.set(flash, { opacity: 0 });
    setPose(carouselPose());
    setClose(1);
    showCarousel();
  });

  // ---- Start. Called by main.js once everything has loaded. ----
  // With a project slug (coming back from a project page) we go straight to that project on the screen.
  function begin(slug) {
    document.body.classList.add('is-outside');
    const startIndex = projects.findIndex((p) => p.slug === slug);
    if (startIndex >= 0) {
      index = startIndex;
      power = 1;
      setPose(carouselPose());
      setClose(1);
      showCarousel();
      return;
    }
    setPose(outsidePose());
    setState('busy');
    // The screen warms up: a quick stutter, then steady. Input unlocks once it is lit.
    const warm = { value: 0 };
    const tl = gsap.timeline({ onUpdate: () => (power = warm.value), onComplete: () => setState('outside') });
    if (reduced) tl.set(warm, { value: 1 }).to({}, { duration: 0.4 });
    else tl.to(warm, { value: 1, duration: 0.06 }, 0.3).to(warm, { value: 0.2, duration: 0.06 }, 0.45).to(warm, { value: 1, duration: 0.5, ease: 'power2.out' }, 0.62);
  }

  return { begin };
}

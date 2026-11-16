// Everything shown on the cabinet's screen, painted on one canvas that the 3D screen uses as its picture.
// The screen has three modes:
//   attract  "HUDSON'S ARCADE / PRESS START", what you see from across the room
//   title    a short title sequence, played once you have zoomed in
//   project  one project per slide; changing project slides the old one out and the new one in
import * as THREE from 'three';
import { makeCanvas, loadImage } from './textures.js';

const W = 640; // canvas size; the model's screen is about this shape
const H = 506;
const PIXEL = '"Press Start 2P"';
const LABEL = '"Micro 5"';
const BODY = '"Inter Variable", sans-serif';
export const TITLE_SECONDS = 2.4;
const SLIDE_SECONDS = 0.35;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - (1 - x) ** 3;
const pad = (n) => String(n).padStart(2, '0');

function background(g) {
  const bg = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 420);
  bg.addColorStop(0, '#0d1d52');
  bg.addColorStop(1, '#02040c');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
}

// One line of glowing text, centered on x. It shrinks until it fits `maxWidth`.
function glowText(g, text, x, y, size, color, { font = PIXEL, maxWidth = W - 80, glow = 18, align = 'center' } = {}) {
  do {
    g.font = `${size}px ${font}`;
    size -= 1;
  } while (g.measureText(text).width > maxWidth && size > 8);
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = glow;
  g.fillStyle = color;
  g.fillText(text, x, y);
  g.shadowBlur = 0;
}

// Splits text into lines no wider than `maxWidth` (at most `maxLines`; the last one gets "…").
function wrap(g, text, maxWidth, maxLines) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const test = lines.at(-1) ? `${lines.at(-1)} ${word}` : word;
    if (g.measureText(test).width <= maxWidth) lines[lines.length - 1] = test;
    else lines.push(word);
  }
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, '')}…`;
  }
  return lines;
}

// `touch` changes the on-screen hint ("tap the screen" instead of "press Enter").
// `blink` = false keeps the blinking prompts steady (reduced motion).
export function createScreenDisplay({ projects, touch, blink }) {
  // The picture is painted on a canvas kept in normal memory (willReadFrequently), then its raw pixels are
  // copied into the 3D texture. Handing the canvas itself to WebGL every frame was far slower
  // (about 20 frames a second during the title, against 50+ this way).
  const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const g = canvas.getContext('2d', { willReadFrequently: true });
  // Rows are stored top row first, which is what the model's screen (glTF texture coordinates) expects.
  const texture = new THREE.DataTexture(new Uint8Array(W * H * 4), W, H);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = texture.minFilter = THREE.LinearFilter; // no mipmaps: they would be rebuilt on every change
  texture.anisotropy = 4;

  // ---- Project slides: each one painted once onto its own canvas, then reused ----
  const images = projects.map(() => null);
  const slides = projects.map((_, i) => drawSlide(i));
  projects.forEach((p, i) => {
    if (!p.image) return;
    loadImage(p.image).then((image) => {
      images[i] = image;
      slides[i] = drawSlide(i);
      dirty = true;
    });
  });

  function drawSlide(i) {
    const p = projects[i];
    const [slide, s] = makeCanvas(W, H);
    background(s);

    // Top row: "PROJECT 01/03" on the left, one square per project on the right
    s.font = `30px ${LABEL}`;
    s.textAlign = 'left';
    s.textBaseline = 'middle';
    s.fillStyle = '#9aa6d6';
    s.fillText(`PROJECT ${pad(i + 1)}/${pad(projects.length)}`, 40, 40);
    projects.forEach((_, n) => {
      const x = W - 40 - (projects.length - 1 - n) * 22 - 12;
      s.fillStyle = n === i ? p.accent : 'rgba(154, 166, 214, 0.35)';
      s.fillRect(x, 34, 12, 12);
    });

    // The picture: the project's screenshot, or a title card until there is one
    const box = { x: 40, y: 66, w: W - 80, h: 250 };
    s.save();
    s.beginPath();
    s.rect(box.x, box.y, box.w, box.h);
    s.clip();
    if (images[i]) {
      const image = images[i];
      const scale = Math.max(box.w / image.width, box.h / image.height); // cover the box, crop the overflow
      s.drawImage(image, box.x + (box.w - image.width * scale) / 2, box.y + (box.h - image.height * scale) / 2, image.width * scale, image.height * scale);
    } else {
      const glow = s.createRadialGradient(W / 2, box.y + box.h / 2, 10, W / 2, box.y + box.h / 2, 300);
      glow.addColorStop(0, `${p.accent}66`);
      glow.addColorStop(1, '#000000');
      s.fillStyle = glow;
      s.fillRect(box.x, box.y, box.w, box.h);
      glowText(s, (p.marquee || p.name).toUpperCase(), W / 2, box.y + box.h / 2 - 14, 38, p.accent, { maxWidth: box.w - 60, glow: 22 });
      s.font = `26px ${LABEL}`;
      s.textAlign = 'center';
      s.fillStyle = '#9aa6d6';
      s.fillText('SCREENSHOT COMING SOON', W / 2, box.y + box.h / 2 + 40);
    }
    s.restore();
    s.strokeStyle = p.accent;
    s.lineWidth = 3;
    s.strokeRect(box.x + 1.5, box.y + 1.5, box.w - 3, box.h - 3);

    // Name and one-line description
    glowText(s, p.name, W / 2, 358, 26, p.accent, { maxWidth: W - 80, glow: 14 });
    s.font = `23px ${BODY}`;
    s.textAlign = 'center';
    s.fillStyle = '#e6e9f7';
    wrap(s, p.tagline, W - 100, 2).forEach((line, n) => s.fillText(line, W / 2, 400 + n * 30));
    return slide;
  }

  // ---- State ----
  let mode = 'attract';
  let index = 0; // the project on screen
  let previous = -1; // the project sliding out (-1 = none)
  let direction = 1; // +1 = new slide comes in from the right
  let startedAt = null; // when the current title or slide animation began (set on the next update)
  let onTitleDone = null;
  let dirty = true;
  let lastBlink = -1;
  let lastPaint = 0;

  function attract() {
    mode = 'attract';
    dirty = true;
  }

  // Plays the title sequence, then shows project `startIndex` and calls `done`.
  function title(startIndex, done) {
    mode = 'title';
    index = startIndex;
    previous = -1;
    startedAt = null;
    onTitleDone = done;
    dirty = true;
  }

  function skipTitle() {
    if (mode === 'title') finishTitle();
  }

  function finishTitle() {
    mode = 'project';
    previous = -1;
    dirty = true;
    const done = onTitleDone;
    onTitleDone = null;
    done?.();
  }

  // Shows project `i`. `dir` +1 / -1 slides it in from the right / left; 0 cuts straight to it.
  function project(i, dir = 0) {
    if (mode === 'project' && i === index) return;
    previous = mode === 'project' && dir ? index : -1;
    direction = dir || 1;
    index = i;
    mode = 'project';
    startedAt = null;
    dirty = true;
  }

  // ---- Painting ----
  // Glowing text is slow to draw, so each piece is painted once onto its own transparent layer
  // and the layers are stacked every frame.
  const layer = (paint) => {
    const [c, l] = makeCanvas(W, H);
    paint(l);
    return c;
  };
  const backdrop = layer(background);
  const scanlines = layer((l) => {
    l.fillStyle = 'rgba(0, 0, 0, 0.28)';
    for (let y = 0; y < H; y += 4) l.fillRect(0, y, W, 2);
  });
  const attractLayers = [
    layer((l) => {
      background(l);
      glowText(l, 'HUDSON’S', W / 2, 190, 56, '#7ff3ff');
      glowText(l, 'ARCADE', W / 2, 262, 34, '#ff7be6');
    }),
    layer((l) => glowText(l, 'PRESS START', W / 2, 380, 24, '#ffffff')),
  ];
  const WORD = 'HUDSON’S';
  const titleLayers = {
    word: layer((l) => glowText(l, WORD, W / 2, 170, 56, '#7ff3ff')),
    arcade: layer((l) => glowText(l, 'ARCADE', W / 2, 240, 34, '#ff7be6')),
    select: layer((l) => glowText(l, 'SELECT A PROJECT', W / 2, 340, 22, '#ffffff', { glow: 10 })),
    count: layer((l) => {
      l.font = `30px ${LABEL}`;
      l.textAlign = 'center';
      l.textBaseline = 'middle';
      l.fillStyle = '#9aa6d6';
      l.fillText(`${pad(projects.length)} ${projects.length === 1 ? 'PROJECT' : 'PROJECTS'}`, W / 2, 388);
    }),
  };
  // Where each letter of the typed word ends, for revealing it one letter at a time.
  g.font = `56px ${PIXEL}`;
  const wordLeft = W / 2 - g.measureText(WORD).width / 2;
  const letterEnds = [...WORD].map((_, n) => wordLeft + g.measureText(WORD.slice(0, n + 1)).width);

  function paintAttract(prompt) {
    g.drawImage(attractLayers[0], 0, 0);
    if (prompt) g.drawImage(attractLayers[1], 0, 0);
  }

  // t = seconds since the title began
  function paintTitle(t) {
    g.drawImage(backdrop, 0, 0);
    // 1. "HUDSON'S" types itself out, one letter at a time
    const letters = Math.min(WORD.length, Math.floor(t / 0.07));
    if (letters) {
      const right = letters === WORD.length ? W : letterEnds[letters - 1] + 6;
      g.drawImage(titleLayers.word, 0, 0, right, H, 0, 0, right, H);
    }
    // 2. "ARCADE" fades in
    g.globalAlpha = clamp01((t - 0.65) / 0.3);
    g.drawImage(titleLayers.arcade, 0, 0);
    // 3. a line draws across, then "SELECT A PROJECT" and the count appear
    const line = easeOut(clamp01((t - 1.0) / 0.35));
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(127, 243, 255, 0.6)';
    g.fillRect(W / 2 - 200 * line, 292, 400 * line, 3);
    g.globalAlpha = clamp01((t - 1.25) / 0.25);
    g.drawImage(titleLayers.select, 0, 0);
    g.globalAlpha = clamp01((t - 1.5) / 0.25);
    g.drawImage(titleLayers.count, 0, 0);
    g.globalAlpha = 1;
    // 4. the screen washes out to white just before the first project appears (one soft fade, not a flash)
    const wash = clamp01((t - (TITLE_SECONDS - 0.35)) / 0.35);
    if (wash) {
      g.fillStyle = `rgba(230, 240, 255, ${wash * 0.7})`;
      g.fillRect(0, 0, W, H);
    }
  }

  // t = seconds since the slide change began
  function paintProject(t, prompt) {
    const k = previous < 0 ? 1 : easeOut(clamp01(t / SLIDE_SECONDS));
    if (k >= 1) previous = -1;
    if (previous >= 0) {
      g.drawImage(slides[previous], -direction * W * k, 0);
      g.drawImage(slides[index], direction * W * (1 - k), 0);
    } else {
      g.drawImage(slides[index], 0, 0);
    }
    // The blinking prompt along the bottom
    if (prompt && previous < 0) {
      g.font = `32px ${LABEL}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#ffffff';
      g.fillText(touch ? 'TAP THE SCREEN TO PLAY' : 'PRESS ENTER TO PLAY', W / 2, 474);
    }
  }

  // Called every frame. Only repaints when something on the screen actually changed.
  // Uses the real clock, so the title runs at the same speed even if frames are dropped.
  function update() {
    const time = performance.now() / 1000;
    if (startedAt === null) startedAt = time;
    const t = time - startedAt;
    const blinkOn = !blink || Math.floor(time * 1.6) % 2 === 0; // about 1.6 times a second, under the 3/s safety limit
    const animating = mode === 'title' || previous >= 0;
    if (!dirty && !animating && blinkOn === lastBlink) return;
    // Animations repaint at most 30 times a second: plenty for a CRT, and half the copying.
    if (!dirty && animating && time - lastPaint < 1 / 30) return;
    lastPaint = time;
    lastBlink = blinkOn;
    dirty = false;

    if (mode === 'attract') paintAttract(blinkOn);
    else if (mode === 'title') {
      paintTitle(blink ? t : TITLE_SECONDS - 0.4); // reduced motion: one still frame of the finished title
      if (t >= (blink ? TITLE_SECONDS : 1.2)) {
        finishTitle();
        paintProject(0, blinkOn);
      }
    } else paintProject(t, blinkOn);

    g.drawImage(scanlines, 0, 0);
    texture.image.data.set(g.getImageData(0, 0, W, H).data);
    texture.needsUpdate = true;
  }

  return { texture, attract, title, skipTitle, project, update, get mode() { return mode; } };
}

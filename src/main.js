// Entry point for the home page ("/").
// Decides between the 3D arcade and the simple 2D landing, then runs the loading screen.
import './ui/nav.js';
import projects from './data/projects.json';
import { createLoader } from './scene/loader.js';

const root = document.documentElement;

// Use the 2D landing when 3D can't run well:
//   - no WebGL 2, or only slow software rendering (failIfMajorPerformanceCaveat)
//   - a clearly low-powered device (2 or fewer CPU cores, or 2 GB of memory or less)
//   - the visitor asked the browser to save data
//   - "?2d" in the address (handy for testing)
function canRun3D() {
  if (new URLSearchParams(location.search).has('2d')) return false;
  if (navigator.hardwareConcurrency <= 2 || navigator.deviceMemory <= 2) return false;
  if (matchMedia('(prefers-reduced-data: reduce)').matches) return false;
  try {
    return !!document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
  } catch {
    return false;
  }
}

// The 2D landing is plain HTML that is already on the page; this class makes it visible (see arcade.css).
const show2D = () => root.classList.add('no-webgl');

async function start3D() {
  // In 3D mode the HTML summary stays available to screen readers, but its links are
  // taken out of the Tab order so keyboard focus never lands on something invisible.
  const hiddenLinks = document.querySelectorAll('#main a');
  hiddenLinks.forEach((a) => (a.tabIndex = -1));

  // Loading jobs: the 3D code, 3 fonts, one image per project, and the shader warm-up.
  const loader = createLoader(1 + 3 + projects.length + 1);
  const track = (promise) => promise.finally(loader.step);

  try {
    // The fonts must be ready before the sign and marquees are painted.
    const fonts = Promise.all(['"Press Start 2P"', '"Tilt Neon"', '"Inter Variable"'].map((f) => track(document.fonts.load(`16px ${f}`))));
    // Three.js is big, so it is downloaded separately, after the loading screen is already visible.
    const { createArcade } = await track(import('./scene/arcade.js'));
    await fonts;
    const arcade = await createArcade({ canvas: document.getElementById('scene'), projects, step: loader.step });

    // "/#some-project" means we're coming back from a project page: skip the street.
    const slug = location.hash.slice(1);
    if (!projects.some((p) => p.slug === slug)) await loader.waitForStart();
    await loader.hide();
    arcade.begin(slug);
  } catch (error) {
    console.error('3D failed to start, showing the 2D site instead.', error);
    hiddenLinks.forEach((a) => a.removeAttribute('tabindex'));
    show2D();
  }
}

if (canRun3D()) start3D();
else show2D();

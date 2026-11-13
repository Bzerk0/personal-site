// The loading screen: a retro "LOADING 42%" counter that follows the real loading work,
// then a "PRESS ENTER / CLICK TO START" button.
const el = document.getElementById('loader');
const label = document.getElementById('loader-label');
const startButton = document.getElementById('start');

// `total` = how many loading jobs there are (code, fonts, images, shader warm-up).
// Call step() each time one finishes.
export function createLoader(total) {
  let done = 0;
  let shown = 0;
  const step = () => done++;

  // The number counts up smoothly toward the real progress instead of jumping.
  const finished = new Promise((resolve) => {
    (function tick() {
      shown = Math.min((done / total) * 100, shown + 2);
      label.textContent = `LOADING ${Math.round(shown)}%`;
      if (shown >= 100) resolve();
      else requestAnimationFrame(tick);
    })();
  });

  // Swap the counter for the start button and wait for Enter, Space, or a click.
  async function waitForStart() {
    await finished;
    label.hidden = true;
    startButton.hidden = false;
    startButton.focus({ preventScroll: true });
    await new Promise((resolve) => {
      const go = (e) => {
        if (e.target.closest('a, .nav')) return; // the skip link and the menu keep working
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        removeEventListener('keydown', go);
        removeEventListener('click', go);
        resolve();
      };
      addEventListener('keydown', go);
      addEventListener('click', go);
    });
  }

  // Fade the loading screen away.
  async function hide() {
    await finished;
    el.classList.add('is-done');
    el.addEventListener('transitionend', () => (el.hidden = true), { once: true });
  }

  return { step, waitForStart, hide };
}

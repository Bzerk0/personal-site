// The camera moves, built as GSAP timelines:
//   zoomTransition  from the dark room right up to the cabinet's screen (or back out again)
//   openTransition  push into the screen before a project page loads
// `rig` holds where the camera is (rig.pos) and what it looks at (rig.look).
// `flash` is a full-screen <div> used for the glow that covers a page change.
// With `reduced` (prefers-reduced-motion) both become a simple fade with no camera movement.
import gsap from 'gsap';

export function zoomTransition({ rig, flash, reduced, to, done }) {
  const tl = gsap.timeline({ onComplete: done });
  if (reduced) {
    flash.style.background = 'var(--bg)';
    return tl
      .to(flash, { opacity: 1, duration: 0.3 })
      .set(rig.pos, to.pos)
      .set(rig.look, to.look)
      .to(flash, { opacity: 0, duration: 0.3 });
  }
  return tl
    .to(rig.pos, { ...to.pos, duration: 2, ease: 'power2.inOut' }, 0)
    .to(rig.look, { ...to.look, duration: 2, ease: 'power2.inOut' }, 0);
}

export function openTransition({ rig, flash, reduced, screen, accent, done }) {
  const tl = gsap.timeline({ onComplete: done });
  flash.style.background = reduced ? 'var(--bg)' : `radial-gradient(circle, #fff 0%, ${accent} 100%)`;
  if (reduced) return tl.to(flash, { opacity: 1, duration: 0.3 });
  return tl
    .to(rig.pos, { ...screen.pos, duration: 0.9, ease: 'power2.inOut' }, 0)
    .to(rig.look, { ...screen.look, duration: 0.9, ease: 'power2.inOut' }, 0)
    .to(flash, { opacity: 1, duration: 0.45, ease: 'power2.in' }, 0.5);
}

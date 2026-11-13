// The two big camera moves, built as GSAP timelines:
//   enterTransition  street -> through the doors -> inside
//   openTransition   zoom into a cabinet's screen before its project page loads
// `rig` holds where the camera is (rig.pos) and what it looks at (rig.look).
// `flash` is a full-screen <div> used for the glow that covers the cut between scenes.
// With `reduced` (prefers-reduced-motion) both become a simple fade with no camera movement.
import gsap from 'gsap';

export function enterTransition({ rig, doors, flash, reduced, swap, inside }) {
  const tl = gsap.timeline();
  if (reduced) {
    flash.style.background = 'var(--bg)';
    return tl.to(flash, { opacity: 1, duration: 0.3 }).add(swap).to(flash, { opacity: 0, duration: 0.3 });
  }
  flash.style.background = 'radial-gradient(circle, #fff 0%, #ffc4f3 40%, #ff2bd6 100%)';
  return (
    tl
      // 1. walk up to the doors while they swing open (0 - 1.5s)
      .to(rig.pos, { x: 0, y: 1.55, z: 1.5, duration: 1.5, ease: 'power2.inOut' }, 0)
      .to(rig.look, { x: 0, y: 1.5, z: -3, duration: 1.5, ease: 'power2.inOut' }, 0)
      .to(doors.map((d) => d.rotation), { y: (i) => doors[i].userData.openAngle, duration: 1, ease: 'power2.out' }, 0.25)
      // 2. the neon glow washes over the screen (1.0 - 1.5s)
      .to(flash, { opacity: 1, duration: 0.5, ease: 'power2.in' }, 1)
      // 3. behind the glow: swap the street for the interior, a step back from the first cabinet
      .add(swap, 1.5)
      .set(rig.pos, { ...inside.pos, z: inside.pos.z + 1.6 }, 1.5)
      .set(rig.look, inside.look, 1.5)
      // 4. the glow clears while the camera settles in front of the cabinet (1.5 - 2.4s)
      .to(rig.pos, { z: inside.pos.z, duration: 0.9, ease: 'power3.out' }, 1.5)
      .to(flash, { opacity: 0, duration: 0.8, ease: 'power2.out' }, 1.55)
  );
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

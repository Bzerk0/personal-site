// Script for the flat (non-3D) pages. Deliberately tiny so these pages stay fast.
import './ui/nav.js';

// On a project page, Escape goes back to the arcade at that project's cabinet.
const slug = document.querySelector('[data-slug]')?.dataset.slug;
if (slug) {
  window.addEventListener('keydown', (e) => {
    const typing = e.target.closest?.('input, textarea, select');
    if (e.key === 'Escape' && !typing) location.href = `/#${slug}`;
  });
}

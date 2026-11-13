// The phone menu: the "Menu" button opens a full-screen overlay.
// (On wider screens the links are always visible and this does nothing.)
const nav = document.querySelector('.nav');
const toggle = nav?.querySelector('.nav__toggle');

function setOpen(open) {
  nav.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', open);
  toggle.textContent = open ? 'Close' : 'Menu';
  document.body.style.overflow = open ? 'hidden' : ''; // stop the page scrolling behind the overlay
}

if (toggle) {
  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  // Escape closes the overlay and puts focus back on the button.
  nav.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      e.stopPropagation();
      setOpen(false);
      toggle.focus();
    }
  });
}

// True while the phone menu covers the screen (the 3D scene ignores input then).
export const menuIsOpen = () => !!nav?.classList.contains('is-open');

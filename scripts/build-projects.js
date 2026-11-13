// Turns src/data/projects.json into real HTML:
//   - one page per project at projects/<slug>/index.html
//   - the cards used on the Portfolio page and the 2D landing
// Vite runs this automatically (see vite.config.js). You can also run it by hand:
//   node scripts/build-projects.js
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

export function loadProjects() {
  return JSON.parse(readFileSync(`${root}src/data/projects.json`, 'utf8'));
}

// Make text safe to drop into HTML.
export const esc = (s = '') =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Anything from "TODO:" onward gets a dashed outline so unfinished content is easy to spot.
const text = (s) => esc(s).replace(/TODO:.*$/, '<span class="todo">$&</span>');

// The picture for a project: its video, its image, or a styled placeholder when neither exists yet.
function media(p) {
  if (p.video) {
    return `<video src="${esc(p.video)}" ${p.image ? `poster="${esc(p.image)}"` : ''} controls muted loop playsinline preload="none" aria-label="${esc(p.imageAlt || `${p.name} video`)}"></video>`;
  }
  if (p.image) {
    return `<img src="${esc(p.image)}" alt="${esc(p.imageAlt || `${p.name} screenshot`)}" width="800" height="600" loading="lazy">`;
  }
  return `<div class="screen-placeholder" role="img" aria-label="Placeholder image for ${esc(p.name)}"><span>${esc(p.name)}</span><small>Screenshot coming soon</small></div>`;
}

export function projectCard(p) {
  return `<li><a class="card" href="/projects/${p.slug}/" style="--accent: ${esc(p.accent)}">
      <div class="screen">${media(p)}</div>
      <h2 class="card__name">${esc(p.name)}</h2>
      <p class="card__tagline">${esc(p.tagline)}</p>
      <span class="card__cta">View project <span aria-hidden="true">→</span></span>
    </a></li>`;
}

export const projectGrid = () => `<ul class="grid">${loadProjects().map(projectCard).join('\n')}</ul>`;

function projectPage(p) {
  const links = p.links?.length
    ? `<ul class="links">${p.links.map((l) => `<li><a class="button" href="${esc(l.url)}" rel="noopener">${esc(l.label)} <span aria-hidden="true">↗</span></a></li>`).join('')}</ul>`
    : `<p><span class="todo">TODO: add links (live site, repo, etc.).</span></p>`;
  return `<!doctype html>
<!-- GENERATED FILE. Do not edit: change src/data/projects.json or scripts/build-projects.js instead. -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${esc(p.name)} | Hudson Bjerkness</title>
  <meta name="description" content="${esc(p.tagline)}">
  <!--head-->
</head>
<body class="page" style="--accent: ${esc(p.accent)}">
  <!--nav-->
  <main id="main" class="wrap project" data-slug="${p.slug}">
    <a class="back" href="/#${p.slug}"><span aria-hidden="true">←</span> Back to the Arcade</a>
    <header>
      <p class="eyebrow">Project</p>
      <h1>${esc(p.name)}</h1>
      <p class="lede">${text(p.tagline)}</p>
    </header>
    <div class="screen screen--hero">${media(p)}</div>
    <dl class="spec">
      <div><dt>What it is</dt><dd>${text(p.whatItIs)}</dd></div>
      <div><dt>What I did</dt><dd>${text(p.whatIDid)}</dd></div>
      <div><dt>Tools used</dt><dd><ul class="tags">${p.tools.map((t) => `<li>${text(t)}</li>`).join('')}</ul></dd></div>
      <div><dt>Status</dt><dd>${text(p.status)}</dd></div>
      <div><dt>Links</dt><dd>${links}</dd></div>
    </dl>
    ${p.note ? `<p class="note">${esc(p.note)}</p>` : ''}
  </main>
  <!--footer-->
  <script type="module" src="/src/page.js"></script>
</body>
</html>
`;
}

// Rebuilds the whole projects/ folder from scratch so removed projects disappear too.
export function buildProjectPages() {
  const projects = loadProjects();
  rmSync(`${root}projects`, { recursive: true, force: true });
  for (const p of projects) {
    mkdirSync(`${root}projects/${p.slug}`, { recursive: true });
    writeFileSync(`${root}projects/${p.slug}/index.html`, projectPage(p));
  }
  return projects;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(`Built ${buildProjectPages().length} project pages.`);
}

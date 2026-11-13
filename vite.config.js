import { defineConfig } from 'vite';
import { buildProjectPages, projectGrid, esc } from './scripts/build-projects.js';
import { SITE } from './site.config.js';

// Every HTML page of the site. Project pages are generated from projects.json first.
const projects = buildProjectPages();
const pages = [
  'index.html',
  '404.html',
  'about/index.html',
  'portfolio/index.html',
  'contact/index.html',
  'contact/thanks/index.html',
  ...projects.map((p) => `projects/${p.slug}/index.html`),
];

// "/about/index.html" -> "/about/"
const toUrl = (path) => path.replace(/index\.html$/, '');

// The menu shown on every page. aria-current marks the page you are on.
const nav = (url) => `<header class="nav">
    <a class="nav__brand" href="/"${url === '/' ? ' aria-current="page"' : ''}>Hudson Bjerkness</a>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="nav-menu">Menu</button>
    <nav id="nav-menu" class="nav__menu" aria-label="Main">
      <ul>
        ${SITE.nav.map((l) => `<li><a href="${l.href}"${url.startsWith(l.href) ? ' aria-current="page"' : ''}>${l.label}</a></li>`).join('\n        ')}
      </ul>
    </nav>
  </header>`;

const footer = () => `<footer class="footer">
    <p>© ${new Date().getFullYear()} ${SITE.author}</p>
    <ul>
      <li><a href="/">Arcade</a></li>
      ${SITE.nav.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join('\n      ')}
    </ul>
  </footer>`;

// Tags every page needs: mobile viewport, favicon, sharing preview, and the shared stylesheets.
function head(html, url) {
  const title = html.match(/<title>(.*?)<\/title>/)?.[1] ?? SITE.name;
  const description = html.match(/<meta name="description" content="(.*?)"/)?.[1] ?? '';
  return `<meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#07060b">
  <meta name="author" content="${SITE.author}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="canonical" href="${SITE.url}${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(SITE.name)}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${SITE.url}${url}">
  <meta property="og:image" content="${SITE.url}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/src/styles/base.css">
  <link rel="stylesheet" href="/src/styles/nav.css">
  <link rel="stylesheet" href="/src/styles/pages.css">`;
}

// Small plugin: fills the <!--head-->, <!--nav-->, <!--footer--> and <!--project-grid--> markers
// in every HTML file, and writes sitemap.xml + robots.txt when building.
const sitePlugin = {
  name: 'hudsons-arcade',
  transformIndexHtml: {
    order: 'pre',
    handler(html, ctx) {
      const url = toUrl(ctx.path);
      return html
        .replace('<!--head-->', head(html, url))
        .replace('<!--nav-->', nav(url))
        .replace('<!--footer-->', footer())
        .replace('<!--project-grid-->', projectGrid());
    },
  },
  // While developing: editing projects.json rebuilds the project pages and reloads the browser.
  configureServer(server) {
    server.watcher.on('change', (file) => {
      if (file.replaceAll('\\', '/').endsWith('src/data/projects.json')) server.restart();
    });
  },
  generateBundle() {
    const urls = pages.filter((p) => !/404|thanks/.test(p)).map((p) => `${SITE.url}/${toUrl(p)}`);
    this.emitFile({
      type: 'asset',
      fileName: 'sitemap.xml',
      source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`,
    });
    this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n` });
  },
};

export default defineConfig({
  appType: 'mpa', // multi-page site: unknown URLs give a 404 instead of the home page
  plugins: [sitePlugin],
  build: {
    rolldownOptions: { input: pages },
    chunkSizeWarningLimit: 800, // Three.js is ~680 kB; it is already loaded separately, after the loading screen appears
  },
});

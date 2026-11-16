// Tests the built site in a real (headless) browser. Run with:  npm run check
// It builds the site, serves the built files, clicks through everything a visitor can do,
// and prints a pass/fail line per check. Exit code is 1 if anything failed.
import assert from 'node:assert/strict';
import { preview } from 'vite';
import { chromium } from 'playwright-core';
import { launch, newPage } from './shoot.js';
import { loadProjects } from './build-projects.js';

const projects = loadProjects();
const server = await preview({ preview: { port: 4199 } });
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await launch();
const flatPages = ['/about/', '/portfolio/', '/contact/', '/contact/thanks/', '/404.html', ...projects.map((p) => `/projects/${p.slug}/`)];

const consoleProblems = [];
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failed++;
    console.log(`  FAIL  ${name}\n        ${String(error.message).split('\n')[0]}`);
  }
}

// Opens a page and records any console errors or warnings it prints.
async function open(path, options = {}, fromBrowser = browser) {
  const page = await newPage(fromBrowser, options);
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && consoleProblems.push(`${path}: ${m.text()}`));
  page.on('pageerror', (e) => consoleProblems.push(`${path}: ${e.message}`));
  await page.goto(base + path);
  return page;
}

const state = (page, name) => page.waitForSelector(`body[data-state="${name}"]`, { timeout: 15000 });
const selected = (page) => page.$eval('#screen-link', (a) => new URL(a.href).pathname); // the URL of the project on the screen
const urlOf = (i) => `/projects/${projects[i].slug}/`;
const settle = (page) => page.waitForTimeout(450); // lets the scroll-wheel throttle pass
// The arrows gently bob, so Playwright never sees them "stable"; force skips that wait.
const press = (page, id) => page.click(id, { force: true });

async function toStreet(page) {
  await state(page, 'outside');
}
async function toMenu(page) {
  await toStreet(page);
  await page.keyboard.press('Enter');
  await state(page, 'menu');
}
async function swipe(page, fromX, toX, y = 400) {
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', fromX);
  await touch('touchMove', (fromX + toX) / 2);
  await touch('touchMove', toX);
  await touch('touchEnd');
}

console.log(`\nChecking ${base}\n`);

await test('the cabinet appears on its own: no loading text, no start button', async () => {
  const page = await open('/');
  await state(page, 'outside');
  assert(!(await page.$('#start, #loader-label')), 'the old loading screen is still on the page');
  await page.waitForSelector('#cover', { state: 'hidden' });
  await page.close();
});

for (const trigger of ['Enter', 'Space', 'click', 'scroll']) {
  await test(`${trigger} zooms into the screen and opens the menu`, async () => {
    const page = await open('/');
    await toStreet(page);
    if (trigger === 'click') await page.mouse.click(720, 300);
    else if (trigger === 'scroll') await page.mouse.wheel(0, 120);
    else await page.keyboard.press(trigger);
    await state(page, 'menu');
    assert.equal(await selected(page), urlOf(0));
    await page.close();
  });
}

await test('the title sequence plays on the screen before the first project, and a key skips it', async () => {
  const page = await open('/');
  await toStreet(page);
  await page.keyboard.press('Enter');
  await state(page, 'title');
  assert(await page.isHidden('#menu'), 'carousel controls wait for the title to finish');
  await page.keyboard.press('ArrowRight'); // any key skips
  await state(page, 'menu');
  assert.equal(await selected(page), urlOf(0), 'skipping lands on the first project');
  assert(await page.isVisible('#prev') && (await page.isVisible('#next')), 'arrows either side of the screen');
  await page.close();
});

await test('every project is reachable in the carousel by arrow keys, A/D, scroll and the on-screen arrows, and it wraps around', async () => {
  const page = await open('/');
  await toMenu(page);
  const n = projects.length;
  // each entry: [go to the next project, go to the previous project]
  const ways = {
    'arrow keys': [() => page.keyboard.press('ArrowRight'), () => page.keyboard.press('ArrowLeft')],
    'A/D': [() => page.keyboard.press('d'), () => page.keyboard.press('a')],
    scroll: [() => page.mouse.wheel(0, 120), () => page.mouse.wheel(0, -120)],
    'arrow buttons': [() => press(page, '#next'), () => press(page, '#prev')],
  };
  for (const [name, [next, prev]] of Object.entries(ways)) {
    for (let i = 1; i <= n; i++) {
      await next();
      await settle(page);
      assert.equal(await selected(page), urlOf(i % n), `${name}: forward to project ${(i % n) + 1}`);
    }
    for (let i = n - 1; i >= 0; i--) {
      await prev();
      await settle(page);
      assert.equal(await selected(page), urlOf(i), `${name}: back to project ${i + 1}`);
    }
  }
  await page.close();
});

await test('Escape in the menu zooms back out to the cabinet', async () => {
  const page = await open('/');
  await toMenu(page);
  await page.keyboard.press('Escape');
  await state(page, 'outside');
  assert.equal(new URL(page.url()).hash, '', 'no project left in the address');
  await page.close();
});

for (const [i, project] of projects.entries()) {
  await test(`menu item ${i + 1} opens "${project.name}"; Back link, Escape and browser Back return to it`, async () => {
    const page = await open('/');
    await toMenu(page);
    for (let n = 0; n < i; n++) await page.keyboard.press('ArrowRight');
    // 1. Enter opens the page, the Back link returns
    await page.keyboard.press('Enter');
    await page.waitForURL(`**${urlOf(i)}`);
    assert.equal(await page.textContent('h1'), project.name);
    await page.click('.back');
    await state(page, 'menu');
    assert.equal(await selected(page), urlOf(i), 'Back link');
    // 2. clicking the screen opens it, Escape returns
    await page.click('#screen-link');
    await page.waitForURL(`**${urlOf(i)}`);
    await page.keyboard.press('Escape');
    await state(page, 'menu');
    assert.equal(await selected(page), urlOf(i), 'Escape');
    // 3. Enter opens it again, the browser's Back button returns
    await page.keyboard.press('Enter');
    await page.waitForURL(`**${urlOf(i)}`);
    await page.goBack();
    await state(page, 'menu');
    assert.equal(await selected(page), urlOf(i), 'browser Back');
    assert.equal(await page.$eval('#flash', (el) => getComputedStyle(el).opacity), '0', 'glow overlay cleared');
    await page.close();
  });
}

await test('every project URL works when opened directly, with no 3D intro', async () => {
  for (const project of projects) {
    const page = await open(`/projects/${project.slug}/`);
    assert.equal(await page.textContent('h1'), project.name);
    assert.equal(await page.$('canvas'), null);
    await page.close();
  }
});

for (const mobile of [false, true]) {
  await test(`menu links work from every page (${mobile ? 'phone overlay' : 'desktop'})`, async () => {
    for (const path of ['/', ...flatPages]) {
      for (const target of ['/about/', '/portfolio/', '/contact/']) {
        const page = await open(path, { mobile });
        if (mobile) {
          await page.click('.nav__toggle');
          await page.waitForSelector('.nav.is-open');
        }
        await page.click(`.nav__menu a[href="${target}"]`);
        await page.waitForURL(`**${target}`);
        await page.close();
      }
    }
  });
}

await test('phone: swipe zooms in, swipe changes project, tap the screen opens it', async () => {
  const page = await open('/', { mobile: true });
  await state(page, 'outside');
  await swipe(page, 300, 100);
  await state(page, 'menu');
  await swipe(page, 330, 60);
  await settle(page);
  assert.equal(await selected(page), urlOf(1), 'swipe left shows the next project');
  await swipe(page, 60, 330);
  await settle(page);
  assert.equal(await selected(page), urlOf(0), 'swipe right goes back');
  await page.tap('#next', { force: true });
  await settle(page);
  assert.equal(await selected(page), urlOf(1), 'tapping the arrow');
  await page.tap('#screen-link');
  await page.waitForURL(`**${urlOf(1)}`);
  await page.close();
});

await test('with WebGL disabled the 2D landing appears and links to every page', async () => {
  const noGpu = await chromium.launch({ channel: 'chrome', args: ['--disable-3d-apis'] });
  const page = await open('/', {}, noGpu);
  await page.waitForSelector('html.no-webgl');
  assert(await page.isVisible('.neon-sign'), 'CSS neon sign visible');
  assert(await page.isVisible('.nav'), 'menu visible');
  const links = await page.$$eval('a', (as) => as.filter((a) => a.offsetParent).map((a) => new URL(a.href).pathname));
  for (const needed of ['/about/', '/portfolio/', '/contact/', ...projects.map((p) => `/projects/${p.slug}/`)]) {
    assert(links.includes(needed), `no visible link to ${needed}`);
  }
  await noGpu.close();
});

await test('reduced motion: entry is a short fade (no dolly), and everything still works', async () => {
  const page = await open('/', { reduced: true });
  await toStreet(page);
  const started = Date.now();
  await page.keyboard.press('Enter');
  await state(page, 'menu');
  // fade (0.6 s) + a still title frame (1.2 s), against 2 s of camera zoom + 2.4 s of title animation normally
  assert(Date.now() - started < 2600, `entry took ${Date.now() - started}ms`);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  assert.equal(await selected(page), urlOf(1));
  await page.keyboard.press('Enter');
  await page.waitForURL(`**${urlOf(1)}`);
  await page.close();
});

await test('keyboard only: Tab never lands on something invisible, and focus is always outlined', async () => {
  for (const path of ['/', '/about/', '/contact/']) {
    const page = await open(path);
    if (path === '/') await toMenu(page);
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return { what: el.outerHTML.slice(0, 80), visible: box.width > 4 && box.height > 4 && style.visibility !== 'hidden', outlined: style.outlineStyle !== 'none' };
      });
      if (info) assert(info.visible && info.outlined, `${path}: bad focus on ${info.what} ${JSON.stringify(info)}`);
    }
    await page.close();
  }
});

await test('Space and Enter type normally in the contact form', async () => {
  const page = await open('/contact/');
  await page.fill('textarea[name="message"]', '');
  await page.type('textarea[name="message"]', 'hello there\nline two');
  assert.equal(await page.inputValue('textarea[name="message"]'), 'hello there\nline two');
  await page.close();
});

await test('every page has a title, description, Open Graph image and alt text on images', async () => {
  for (const path of ['/', ...flatPages]) {
    const page = await open(path);
    const meta = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content,
      og: document.querySelector('meta[property="og:image"]')?.content,
      noAlt: [...document.images].filter((img) => !img.alt).length,
    }));
    assert(meta.title && meta.description && meta.og, `${path}: ${JSON.stringify(meta)}`);
    assert.equal(meta.noAlt, 0, `${path}: image without alt text`);
    await page.close();
  }
  for (const file of ['/sitemap.xml', '/robots.txt', '/favicon.svg', '/og-image.png']) {
    assert.equal((await fetch(base + file)).status, 200, `${file} missing`);
  }
});

await test('no console errors or warnings on any page', async () => {
  assert.equal(consoleProblems.length, 0, [...new Set(consoleProblems)].join(' | '));
});

await browser.close();
await new Promise((resolve) => server.httpServer.close(resolve));
console.log(failed ? `\n${failed} check(s) failed.\n` : '\nAll checks passed.\n');
process.exit(failed ? 1 : 0);

// Takes a screenshot of a page with a headless browser (uses the Chrome already installed on this PC).
//
//   node scripts/shoot.js <url> <output.png> [--mobile] [--full] [--wait=2000] [--keys=Enter,ArrowRight] [--reduced]
//
// --mobile   390x844 phone viewport (default is 1440x900 desktop)
// --full     capture the whole scrolling page, not just the first screen
// --wait     milliseconds to wait before the screenshot (and after each key)
// --keys     keys to press, in order, before the screenshot
// --reduced  turn on "prefers-reduced-motion"
// --size     custom desktop size, e.g. --size=1200x630 (used for public/og-image.png)
import { chromium } from 'playwright-core';

export async function launch() {
  // The extra args let headless Chrome use the real graphics card, so WebGL looks like it does for visitors.
  return chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'] });
}

export async function newPage(browser, { mobile = false, reduced = false, size = [1440, 900] } = {}) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: size[0], height: size[1] },
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  return context.newPage();
}

if (process.argv[1].endsWith('shoot.js')) {
  const [url, out, ...flags] = process.argv.slice(2);
  const flag = (name) => flags.find((f) => f.startsWith(`--${name}`));
  const value = (name, fallback) => flag(name)?.split('=')[1] ?? fallback;
  const wait = Number(value('wait', 2000));

  const browser = await launch();
  const page = await newPage(browser, { mobile: !!flag('mobile'), reduced: !!flag('reduced'), size: value('size', '1440x900').split('x').map(Number) });
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && console.log(`[${m.type()}]`, m.text()));
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(wait);
  for (const key of value('keys', '').split(',').filter(Boolean)) {
    await page.keyboard.press(key);
    await page.waitForTimeout(wait);
  }
  await page.screenshot({ path: out, fullPage: !!flag('full') });
  console.log('saved', out);
  await browser.close();
}

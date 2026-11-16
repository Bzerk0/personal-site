// Screenshots of the landing view, the zoom and the menu, for eyeballing changes: node scripts/shot.js [url]
import { chromium } from 'playwright-core';

const url = process.argv[2] || 'http://localhost:5173/';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.goto(url);
await page.waitForFunction(() => document.body.dataset.state === 'outside', null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'screenshots/landing.png' });
await page.keyboard.press('Enter');
await page.waitForTimeout(1000);
await page.screenshot({ path: 'screenshots/zoom.png' });
await page.waitForFunction(() => document.body.dataset.state === 'menu', null, { timeout: 10000 });
await page.waitForTimeout(600);
await page.screenshot({ path: 'screenshots/menu.png' });
await browser.close();

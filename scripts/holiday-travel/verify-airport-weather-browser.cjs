'use strict';
// Offline NWS fixtures in real Chromium at narrow and wide sizes; no live weather dependency.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch('http://127.0.0.1:8765/holiday-travel/')).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Local holiday-travel server did not start');
}
function sampleBoard() {
  const year = new Date(Date.now()).getUTCFullYear();
  const dates = Array.from({ length: 16 }, (_, i) => new Date(Date.UTC(year, 11, 18 + i)).toISOString().slice(0, 10));
  const roster = JSON.parse(fs.readFileSync('public/holiday-travel/data/national.json', 'utf8')).airports
    .slice().sort((a, b) => b.flights - a.flights || a.code.localeCompare(b.code)).slice(0, 30);
  const issued = new Date(Date.now() - 15 * 60000).toISOString();
  function airports(isOutage) {
    return roster.map((a, index) => ({
      code: a.code, city: a.city, flights: a.flights, issuedAt: isOutage ? null : issued,
      days: dates.map((date, i) => ({
        date,
        status: isOutage ? 'unknown' : index === 0 && i === 0 ? 'flagged' : i < 7 ? 'clear' : 'unknown',
        warnings: !isOutage && index === 0 && i === 0 ? ['Winter Storm Warning'] : [],
        forecast: !isOutage && i < 7 ? ['Snow showers'] : [],
        mentions: !isOutage && index === 0 && i === 0 ? ['Snow showers'] : []
      })),
      errors: isOutage ? ['NWS_ALERTS_UNAVAILABLE', 'NWS_FORECAST_UNAVAILABLE'] : []
    }));
  }
  return (down) => ({
    active: true, holiday: 'christmas', year, start: dates[0], end: dates.at(-1), dates,
    source: 'National Weather Service', airports: airports(down)
  });
}
async function assertNoPageOverflow(page, width) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  assert.equal(overflow, false, 'horizontal page overflow at ' + width);
}

async function main() {
  fs.mkdirSync('artifacts/holiday-airport-weather', { recursive: true });
  const server = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1', '--directory', 'public'], { stdio: 'ignore' });
  let browser;
  try {
    await waitForServer();
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
    const fixture = sampleBoard();
    for (const width of [360, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 850 } });
      const errors = [];
      let down = true;
      page.on('pageerror', (e) => errors.push(e.message));
      await page.route('https://api.weather.gov/**', (route) => route.abort('failed'));
      await page.route('**/api/holiday-airport-weather', (route) => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify(fixture(down))
      }));
      await page.goto('http://127.0.0.1:8765/holiday-travel/', { waitUntil: 'domcontentloaded' });
      await page.getByText('National Weather Service data is unavailable for the 30 airports right now').waitFor({ timeout: 15000 });
      await assertNoPageOverflow(page, width);
      assert.equal(await page.locator('#airport-weather-scroll').isVisible(), false, 'no empty grid on NWS outage');
      assert.equal(await page.getByRole('link', { name: 'See the complete comparison' }).isVisible(), true);
      await page.screenshot({ path: 'artifacts/holiday-airport-weather/nws-down-' + width + '.png', fullPage: true });

      down = false;
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('.aw-table tbody tr').first().waitFor({ timeout: 15000 });
      assert.equal(await page.locator('.aw-table tbody tr').count(), 30);
      assert.match(await page.locator('.aw-table tbody tr').first().locator('th').innerText(), /ATL/);
      assert.equal(await page.locator('.aw-table thead th').count(), 17, 'airport + 16 travel days');
      assert.equal(await page.locator('#airport-weather-scroll').isVisible(), true);
      assert.equal(await page.getByRole('link', { name: 'ATL flight plan' }).isVisible(), true);
      await assertNoPageOverflow(page, width);
      await page.screenshot({ path: 'artifacts/holiday-airport-weather/partial-nws-' + width + '.png', fullPage: true });
      await page.getByRole('link', { name: 'ATL flight plan' }).click();
      await page.waitForFunction(() => document.getElementById('home')?.value === 'ATL', { timeout: 15000 });
      assert.deepEqual(errors, [], 'JavaScript page errors at ' + width);
      await page.close();
    }
    console.log('Holiday airport NWS-down and partial-data browser QA passed at 360px and 1440px');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });

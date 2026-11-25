'use strict';
// Offline NWS fixtures in real Chromium at narrow and wide sizes; no live weather dependency.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const http = require('node:http');

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    // Drain the HTTP response before resolving. Avoid Node's undici Parser.finish
    // assertion when a fetch response body is abandoned during readiness probing.
    const ready = await new Promise(resolve => {
      const req = http.get('http://127.0.0.1:8765/holiday-travel/', res => {
        res.on('end', () => resolve(res.statusCode === 200));
        res.on('error', () => resolve(false));
        res.resume();
      });
      req.on('error', () => resolve(false));
      req.setTimeout(1000, () => req.destroy());
    });
    if (ready) return;
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
      await page.goto('http://127.0.0.1:8765/holiday-travel/?h=th&m=fly&d=there&from=ORD&to=LGA&via=nonstop&lay=60&dep=-1.17&due=-1.23&y=2026', { waitUntil: 'domcontentloaded' });

      // The existing select data model is now a visible, typed, keyboard-operated input.
      await page.locator('#home-search').waitFor({ timeout: 15000 });
      assert.equal(await page.locator('#home').isVisible(), false, 'native select stays nonvisual once enhanced');
      assert.equal(await page.locator('input[role="combobox"]').count(), 10);
      // Exercise the real calendar and itinerary A -> B -> A through native controls.
      await page.waitForFunction(() => Number.isFinite(Number(document.getElementById('third-stat').getAttribute('data-p'))));
      const originalRisk = Number(await page.locator('#third-stat').getAttribute('data-p'));
      assert.match(await page.locator('#dashboard-route').innerText(),/ORD.*LGA/);
      await page.route('**/api/holiday-airport-weather?view=faa',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'available',checkedAt:new Date().toISOString(),events:[{airport:'ORD',label:'Ground stop',reason:'Fixture snow',averageMinutes:null,minimumMinutes:null,maximumMinutes:null}]})}));
      await page.locator('#dashboard-refresh').click();
      await page.getByText('FAA notices: ORD',{exact:true}).waitFor();
      assert.equal(Number(await page.locator('#third-stat').getAttribute('data-p')),originalRisk);
      await assertNoPageOverflow(page,width);
      await page.locator('#departure-dashboard').screenshot({path:'artifacts/holiday-airport-weather/departure-dashboard-'+width+'.png'});
      const originalDay = await page.locator('#dep-day').inputValue();
      const originalDue = await page.locator('#due-day').inputValue();
      const originalDueHour = await page.locator('#due-time').inputValue();
      await page.locator('[data-calendar-offset="-4"]').click();
      await page.waitForFunction(() => document.getElementById('dep-day').value === '-4' && Number.isFinite(Number(document.getElementById('third-stat').getAttribute('data-p'))));
      assert.equal(await page.locator('#due-day').inputValue(), originalDue);
      await page.locator('[data-calendar-offset="'+originalDay+'"]').click();
      await page.waitForFunction(r => Number(document.getElementById('third-stat').getAttribute('data-p')) === r, originalRisk);
      await page.locator('[data-apply-fix="0"]').focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(r => {
        const p=Number(document.getElementById('third-stat').getAttribute('data-p'));
        return Number.isFinite(p)&&p<r;
      },originalRisk);
      assert.equal(await page.locator('#plan-compare').isVisible(),true);
      assert.equal(await page.locator('#due-day').inputValue(),originalDue);
      assert.equal(await page.locator('#due-time').inputValue(),originalDueHour);
      assert.match(await page.locator('#compare-content').innerText(),/Lower modeled risk/);
      await assertNoPageOverflow(page,width);
      await page.screenshot({path:'artifacts/holiday-airport-weather/compare-plans-'+width+'.png',fullPage:true});
      await page.locator('#restore-plan').click();
      await page.waitForFunction(r => Number(document.getElementById('third-stat').getAttribute('data-p')) === r,originalRisk);
      assert.equal(await page.locator('#plan-compare').isVisible(),false);
      assert.equal(await page.locator('#dep-day').inputValue(),originalDay);
      const homeSearch = page.locator('#home-search');
      await homeSearch.fill('ATL');
      await homeSearch.press('ArrowDown');
      await homeSearch.press('Enter');
      await page.waitForFunction(() => document.getElementById('home').value === 'ATL');
      assert.match(await homeSearch.inputValue(), /Atlanta.*ATL/);
      await page.screenshot({ path: 'artifacts/holiday-airport-weather/type-to-find-' + width + '.png', fullPage: true });
      await homeSearch.fill('DTW');
      await homeSearch.press('ArrowDown');
      await homeSearch.press('Enter');
      await page.waitForFunction(() => document.getElementById('home').value === 'DTW');
      await homeSearch.fill('this airport does not exist');
      assert.equal(await page.getByText('No match. Try a city, airport code or another date.').isVisible(), true);
      await homeSearch.press('Escape');
      assert.equal(await page.locator('#home').inputValue(), 'DTW', 'unrecognized entry must not change the route');
      await homeSearch.fill('New York');
      await page.getByRole('option', { name: /New York.*JFK/ }).waitFor();
      await page.getByRole('option', { name: /New York.*LGA/ }).waitFor();
      await homeSearch.press('Enter');
      assert.equal(await page.locator('#home').inputValue(), 'DTW', 'ambiguous city must not change the route without selection');
      await page.getByRole('option', { name: /New York.*LGA/ }).click();
      await page.waitForFunction(() => document.getElementById('home').value === 'LGA');
      assert.match(await homeSearch.inputValue(), /New York.*LGA/);
      await homeSearch.fill('DTW');
      await homeSearch.press('ArrowDown');
      await homeSearch.press('Enter');
      await page.waitForFunction(() => document.getElementById('home').value === 'DTW');
      await assertNoPageOverflow(page,width);

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
      await page.locator('#home-search').waitFor();
      assert.match(await page.locator('#home-search').inputValue(), /Atlanta.*ATL/, 'shared weather board link populates typed airport');

      assert.deepEqual(errors, [], 'JavaScript page errors at ' + width);
      await page.close();
    }
    const staticPage = await browser.newPage({ viewport: { width: 360, height: 800 }, javaScriptEnabled: false });
    await staticPage.goto('http://127.0.0.1:8765/holiday-travel/', { waitUntil: 'domcontentloaded' });
    assert.equal(await staticPage.locator('#home').isVisible(), true, 'native fallback when JavaScript is off');
    assert.equal(await staticPage.locator('#best-days').isVisible(), true, 'BTS history stays indexable without JavaScript');
    await staticPage.close();
    console.log('Holiday weather, type-to-find, keyboard, unknown-airport, deep link and no-JS QA passed at 360px and 1440px');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });

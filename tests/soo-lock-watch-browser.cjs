'use strict';
// Real-browser acceptance for the Soo Locks Lock Watch planner.
// Serves public/ locally, pins the browser clock, and answers /api/soo-ais with a
// dated fixture so every scenario is reproducible. External hosts are blocked
// except for Leaflet, which is served from public/vendor so the real map path runs.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
// axe-core is installed ephemerally in CI (see soo-lock-watch-browser.yml), never as a site dependency.
let AxeBuilder = null;
try { AxeBuilder = require('@axe-core/playwright').default; } catch (e) { if (process.env.CI) throw e; console.warn('axe-core not installed: WCAG scan NOT VERIFIED locally'); }

const root = path.resolve('public');
const out = 'artifacts/soo-lock-watch';
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]), f = path.resolve(root, '.' + u);
  if (!f.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try { if (fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); } catch {}
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); res.end(b); });
});

// 9:45 a.m. EST on Saturday, November 21, 2026: season open, Visitor Center closed,
// posted park hours 9 a.m. to 6 p.m., sunset just before 5 p.m.
const NOV = Date.parse('2026-11-21T14:45:00Z');
const iso = (base, min) => new Date(base + min * 60000).toISOString();
function fixture(now) {
  const ship = (o) => Object.assign({ state: 'approaching', ageMinutes: 2, seen: iso(now, -2), confidence: 0.7, lockCertain: true, lock: 'poe', flag: 'us' }, o);
  const gott = { id: '366971370', mmsi: '366971370', name: 'EDWIN H. GOTT', lat: 46.5029, lon: -84.352, seen: iso(now, -1), ageMinutes: 1, speedKnots: 0.3, course: 90, sizeLabel: '1,000-footer', lengthFeet: 1001, state: 'in-lock', chamber: 'poe', chamberName: 'Poe Lock', direction: 'downbound' };
  const burns = ship({ id: '366972000', mmsi: '366972000', name: 'BURNS HARBOR', lat: 46.12, lon: -84.0, speedKnots: 11, sizeLabel: '1,000-footer', lengthFeet: 997, direction: 'upbound', channelMilesToLocks: 34.6, window: { start: iso(now, 105), midpoint: iso(now, 160), end: iso(now, 235) } });
  const evening = ship({ id: '316001234', mmsi: '316001234', name: 'ALGOMA EQUINOX', lat: 46.8, lon: -84.97, speedKnots: 8, sizeLabel: 'laker', lengthFeet: 740, direction: 'downbound', lockCertain: false, lock: null, channelMilesToLocks: 48.1, window: { start: iso(now, 510), midpoint: iso(now, 560), end: iso(now, 610) } });
  return {
    ok: true, checkedAt: iso(now, 0), maxAgeMinutes: 30, bbox: [46.3, -84.6, 46.7, -84.1],
    vessels: [
      { mmsi: gott.mmsi, name: gott.name, lat: gott.lat, lon: gott.lon, seen: gott.seen, speedKnots: 0.3, course: 90, heading: 90, shipType: 70, source: 'fixture', lengthMeters: 305, destination: 'NANTICOKE' },
      { mmsi: '366009991', name: 'TEST TUG', lat: 46.501, lon: -84.368, seen: iso(now, -2), speedKnots: 4, course: 90, shipType: 31, source: 'fixture', lengthMeters: 27 },
      { mmsi: '366009992', name: 'TEST TANKER', lat: 46.505, lon: -84.375, seen: iso(now, -3), speedKnots: 5, course: 90, shipType: 80, source: 'fixture', lengthMeters: 119 },
      { mmsi: '366009993', name: 'TEST UNKNOWN', lat: 46.499, lon: -84.359, seen: iso(now, -4), speedKnots: null, course: null, shipType: null, source: 'fixture', lengthMeters: null }
    ],
    attribution: [{ source: 'fixture', credit: 'Test fixture' }],
    nextShip: { ok: true, inLock: [gott], candidates: [burns, evening], pick: burns, selection: { mode: 'deterministic', confidence: 0.7 }, caveats: [] }
  };
}

// NWS hourly forecast fixture: twelve hours from the top of the hour, 30 F rising 1 F per hour,
// wind NW "10 to 15 mph", snow-shower chance rising 5 points per hour from 20.
function weather(now) {
  const top = Math.floor(now / 3600000) * 3600000;
  return { properties: { updateTime: new Date(now - 3600000).toISOString(), periods: Array.from({ length: 12 }, (_, i) => ({
    startTime: new Date(top + i * 3600000).toISOString(), endTime: new Date(top + (i + 1) * 3600000).toISOString(),
    temperature: 30 + i, temperatureUnit: 'F', windSpeed: '10 to 15 mph', windDirection: 'NW',
    shortForecast: 'Chance Snow Showers', probabilityOfPrecipitation: { unitCode: 'wmoUnit:percent', value: 20 + 5 * i }
  })) } };
}

async function open(browser, { width, time, api = 'ok', js = true, wx = 'ok' }) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', javaScriptEnabled: js });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.setFixedTime(new Date(time));
  await context.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.pathname === '/api/soo-ais') {
      if (api === 'fail') return route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false}' });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture(time)) });
    }
    if (u.hostname === 'api.weather.gov') {
      if (wx === 'fail') return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
      return route.fulfill({ status: 200, contentType: 'application/geo+json', body: JSON.stringify(weather(time)) });
    }
    if (u.hostname === 'unpkg.com' && /\/leaflet\.(js|css)$/.test(u.pathname)) {
      return route.fulfill({ status: 200, contentType: u.pathname.endsWith('.js') ? 'text/javascript' : 'text/css', body: fs.readFileSync(path.join(root, 'vendor/leaflet', path.basename(u.pathname))) });
    }
    if (u.hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });
  await page.goto(base + '/soo-locks/', { waitUntil: 'domcontentloaded' });
  return { context, page, errors };
}
const verdict = page => page.locator('.lw-verdict-head').innerText();
const dossier = page => page.locator('[data-lw-dossier]').innerText();
async function choose(page, name, label) {
  await page.locator(`#soo-lock-watch fieldset:has(legend:text("${name}")) label:has-text("${label}")`).first().click();
}
let base;

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + server.address().port;
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome', headless: true, args: ['--no-sandbox'] });
  try {
    for (const width of [360, 390, 768, 1280, 1440]) {
      const { context, page, errors } = await open(browser, { width, time: NOV });
      await page.locator('.lw-row-btn').first().waitFor();
      if (width === 390 || width === 1280) {
        await page.locator('#sooVesselMap').scrollIntoViewIfNeeded();
        await page.locator('#sooVesselMap .soo-ais-symbol').first().waitFor();
        const marker = kind => page.locator('#sooVesselMap .soo-ais-symbol.type-' + kind);
        assert.equal(await page.locator('#sooVesselMap .soo-ais-symbol').count(), 4, 'each recent AIS report has one ship symbol');
        for (const [kind, w] of [['cargo', 63], ['tanker', 49], ['tug', 38], ['unknown', 46]]) {
          assert.equal(await marker(kind).count(), 1, kind + ' has a distinct ship shape');
          assert.equal(Math.round(await marker(kind).evaluate(e => e.getBoundingClientRect().width)), w, kind + ' follows reported length');
        }
        // The ship-name hover card must not compete with the single AIS detail popup.
        await marker('tug').hover();
        assert.equal(await page.locator('#sooVesselMap .leaflet-tooltip:visible').count(), 0, 'hovering a vessel does not create a second card');
        await page.locator('#sooVesselList button').filter({ hasText: 'TEST TUG' }).click();
        await page.locator('#sooVesselMap .leaflet-popup-content:visible').first().waitFor();
        assert.equal(await page.locator('#sooVesselMap .leaflet-popup:visible').count(), 1, 'one vessel detail popup');
        assert.equal(await page.locator('#sooVesselMap .leaflet-tooltip:visible').count(), 0, 'no hover tooltip beside the popup');
        assert.equal(await marker('tug').getAttribute('aria-label'), 'TEST TUG · Tug / towing', 'ship remains keyboard accessible');
        assert.ok((await page.locator('#sooVesselMap .leaflet-popup-content:visible').last().innerText()).includes('Reported AIS type: Tug / towing'));
        await page.locator('#sooVesselList button').filter({ hasText: 'TEST TANKER' }).click();
        assert.equal(await page.locator('#sooVesselMap .leaflet-popup:visible').count(), 1, 'switching vessels replaces the detail card');
        assert.ok((await page.locator('#sooVesselMap .leaflet-popup-content:visible').last().innerText()).includes('Reported AIS type: Tanker'));
        await page.locator('#sooVesselList button').filter({ hasText: 'TEST TUG' }).click();
        assert.ok((await page.locator('#sooVesselMap .leaflet-popup-content:visible').last().innerText()).includes('Reported AIS type: Tug / towing'));
        await page.locator('#sooVesselMap').screenshot({ path: out + '/vessel-map-' + width + '.png' });
      }
      // 1. Default "Now, 1½ hr": the ship already in a chamber is the answer.
      assert.match(await verdict(page), /EDWIN H\. GOTT is in the Poe Lock right now/);
      assert.match(await dossier(page), /EDWIN H\. GOTT[\s\S]*Poe Lock, now/);
      assert.equal(await page.locator('.lw-row-btn').count(), 3);
      assert.match(await page.locator('.lw-notes').innerText(), /hotline is not maintained now/);
      // The next-ship card no longer offers the seasonal hotline in November.
      assert.equal(await page.locator('#soo-next-ship a[href^="tel:"]').count(), 0);
      // Off season the card's second action keeps the visitor in the tool instead of sending them away.
      assert.equal(await page.locator('#soo-next-ship a[href*="boatnerd"]').count(), 0);
      assert.equal(await page.locator('#soo-next-ship a[href="#soo-lock-watch"]').count(), 1);
      // BoatNerd is a cross-check, never an early exit: none in the card, the verdict or the dossier,
      // one inside the collapsed sources note, and the schedule cards lead with this page's lineup.
      assert.equal(await page.locator('#soo-lock-watch a[href*="boatnerd"]').count(), 1);
      assert.equal(await page.locator('#soo-lock-watch details.lw-hours a[href*="boatnerd"]').count(), 1);
      assert.equal(await page.locator('#soo-schedule-answer .schedule-source a').first().getAttribute('href'), '#soo-lock-watch');
      // Weather for the visit comes from the NWS hourly forecast, quoted, with its update time.
      const wxText = await page.locator('[data-lw-weather]').innerText();
      assert.match(wxText, /^Platform weather, 9:45\s?AM.11:15\s?AM: 30.32°F, chance snow showers, wind NW up to 15 mph, precipitation chance up to 30%\. NWS hourly forecast, updated 8:45\s?AM EST\./, wxText);
      // 2. Arrive in 2 hr, stay 1½ hr: BURNS HARBOR becomes the best bet and the selection follows.
      await choose(page, 'How soon', '2 hr');
      assert.match(await verdict(page), /^Best bet: BURNS HARBOR/);
      assert.equal(await page.locator('.lw-row-btn[data-ship-id="366972000"]').getAttribute('aria-pressed'), 'true');
      const burnsA = await dossier(page);
      assert.match(burnsA, /Inside posted park hours \(9 a\.m\. to 6 p\.m\.\), in daylight/);
      // 3. A -> B -> A: the evening laker is outside park hours and after dark; reversal restores BURNS exactly.
      await page.locator('.lw-row-btn[data-ship-id="316001234"]').click();
      const b = await dossier(page);
      assert.match(b, /ALGOMA EQUINOX/);
      assert.match(b, /Outside posted park hours \(9 a\.m\. to 6 p\.m\.\), after dark/);
      assert.match(b, /Poe or MacArthur/);
      assert.match(await verdict(page), /^Best bet: BURNS HARBOR/, 'manual selection does not rewrite the verdict');
      await page.locator('.lw-row-btn[data-ship-id="366972000"]').click();
      assert.equal(await dossier(page), burnsA);
      assert.equal(await page.locator('.lw-row-btn[aria-pressed="true"]').count(), 1);
      // The visit weather follows the visit: 2 hr out, 1½ hr stay covers 11:45 a.m. to 1:15 p.m.
      assert.match(await page.locator('[data-lw-weather]').innerText(), /32.34°F[\s\S]*up to 40%/);
      // 4. A visit that misses every window offers a one-tap adjustment that covers the next one.
      await choose(page, 'How soon', '30 min');
      await choose(page, 'How long', '45 min');
      assert.match(await verdict(page), /No reported ship is due during that visit/);
      await page.locator('.lw-adjust').click();
      assert.match(await verdict(page), /^Best bet: BURNS HARBOR/);
      assert.equal(await page.locator('input[name="lw-start"]:checked').getAttribute('value'), '90');
      assert.equal(await page.locator('input[name="lw-stay"]:checked').getAttribute('value'), '180');
      // web-quality-accessibility: axe-core WCAG 2.0 to 2.2 A/AA over the whole page, after interaction.
      if (AxeBuilder && (width === 390 || width === 1280)) {
        const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        assert.deepEqual(scan.violations.map(v => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0].target.join(' ')}`), [], 'axe at ' + width);
      }
      // No page-wide horizontal scroll.
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'overflow at ' + width);
      await page.locator('#soo-lock-watch').screenshot({ path: `${out}/lock-watch-${width}.png` });
      if (width === 390 || width === 1280) await page.screenshot({ path: `${out}/first-screen-${width}.png` });
      assert.deepEqual(errors, []);
      await context.close();
    }

    // 5. Keyboard: arrow keys move the radio choice; Enter on a lineup row selects it.
    {
      const { context, page } = await open(browser, { width: 390, time: NOV });
      await page.locator('.lw-row-btn').first().waitFor();
      await page.locator('input[name="lw-start"][value="0"]').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('input[name="lw-start"]:checked').getAttribute('value'), '30');
      await page.locator('.lw-row-btn[data-ship-id="316001234"]').focus();
      await page.keyboard.press('Enter');
      assert.match(await dossier(page), /ALGOMA EQUINOX/);
      // "Show it on the live map" builds the real Leaflet map and opens the ship's popup.
      await page.locator('[data-lw-dossier] .lw-primary').click();
      await page.locator('.leaflet-popup-content').waitFor({ timeout: 5000 });
      assert.match(await page.locator('.leaflet-popup-content').innerText(), /ALGOMA EQUINOX/);
      // "Watch it lock through" hands the ship to the lock simulator: direction, stand-in hull and a note.
      await page.locator('[data-lw-dossier] .lw-secondary').click();
      assert.equal(await page.locator('#soo-lock-sim input[name="lock-dir"]:checked').getAttribute('value'), 'down');
      assert.equal(await page.locator('#soo-lock-sim input[name="lock-ship"]:checked').getAttribute('value'), 'anderson');
      const simNote = await page.locator('#soo-lock-sim [data-lock-live]').innerText();
      assert.match(simNote, /^Set up for ALGOMA EQUINOX\. Downbound, dropping 21 ft toward Lake Huron\. Shown with the Arthur M\. Anderson as a same-size stand-in for this 740 ft ship\. In real life the lockmaster may assign either chamber\./);
      assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.matches('[data-lock-play]')), true, 'focus lands on the play button');
      await page.locator('#soo-lock-sim').screenshot({ path: `${out}/lock-sim-handoff-390.png` });
      // BURNS HARBOR is upbound and a 1,000-footer: the Tregurtha stand-in, rising.
      await page.locator('.lw-row-btn[data-ship-id="366972000"]').click();
      await page.locator('[data-lw-dossier] .lw-secondary').click();
      assert.equal(await page.locator('#soo-lock-sim input[name="lock-dir"]:checked').getAttribute('value'), 'up');
      assert.equal(await page.locator('#soo-lock-sim input[name="lock-ship"]:checked').getAttribute('value'), 'tregurtha');
      assert.doesNotMatch(await page.locator('#soo-lock-sim [data-lock-live]').innerText(), /either chamber/);
      await context.close();
    }
    // 6. Feed failure: explicit unavailable state, no lineup.
    {
      const { context, page } = await open(browser, { width: 390, time: NOV, api: 'fail', wx: 'fail' });
      await page.getByText('Live ship reports are unavailable, so no visit can be lined up').waitFor();
      assert.equal(await page.locator('[data-lw-board]').isHidden(), true);
      // Its next step stays on the page; a failed forecast says so instead of guessing.
      assert.equal(await page.locator('[data-lw-verdict] a.lw-link').getAttribute('href'), '#soo-schedule-answer');
      await page.getByText('the NWS forecast is unavailable right now.').waitFor();
      await page.locator('#soo-lock-watch').screenshot({ path: `${out}/feed-failure-390.png` });
      await context.close();
    }
    // 7. Winter shutdown: the planner says so instead of lining up ships.
    {
      const { context, page } = await open(browser, { width: 390, time: Date.parse('2026-02-10T15:00:00Z') });
      await page.getByText('The locks are closed for the winter shutdown').waitFor();
      assert.match(await page.locator('[data-lw-verdict]').innerText(), /March 25, 2026/);
      await context.close();
    }
    // 8. Summer: the hotline is back in the card and the off-season note is gone.
    {
      const { context, page } = await open(browser, { width: 390, time: Date.parse('2026-07-04T15:00:00Z') });
      await page.locator('.lw-row-btn').first().waitFor();
      assert.equal(await page.locator('#soo-next-ship a[href^="tel:"]').count(), 1);
      assert.doesNotMatch(await page.locator('[data-lw-verdict]').innerText(), /hotline is not maintained/);
      await context.close();
    }
    // 9. No JavaScript: the static explanation, sources and posted hours remain; controls stay hidden.
    {
      const { context, page } = await open(browser, { width: 390, time: NOV, js: false });
      assert.match(await verdict(page), /Line up live ship windows with your visit/);
      assert.equal(await page.locator('[data-lw-controls]').isHidden(), true);
      assert.equal(await page.locator('#soo-lock-watch .lw-verdict a[href="#soo-schedule-answer"]').count(), 1);
      assert.equal(await page.locator('#soo-lock-watch a[href*="boatnerd"]').count(), 1, 'only the collapsed cross-check');
      assert.match(await page.locator('.lw-hours').textContent(), /November through April: 9 a\.m\. to 6 p\.m\./);
      await page.locator('#soo-lock-watch').screenshot({ path: `${out}/no-js-390.png` });
      await context.close();
    }
    console.log('soo-lock-watch browser acceptance passed');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; server.close(); });

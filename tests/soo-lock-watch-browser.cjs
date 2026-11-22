'use strict';
// Real-browser acceptance for the Soo Locks Lock Watch planner.
// Serves public/ locally, pins the browser clock, and answers /api/soo-ais with a
// dated fixture so every scenario is reproducible. External hosts are blocked
// except for Leaflet, which is served from public/vendor so the real map path runs.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');

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

async function open(browser, { width, time, api = 'ok', js = true }) {
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
        await page.locator('#sooVesselList button').filter({ hasText: 'TEST TUG' }).click();
        assert.ok((await page.locator('.leaflet-popup-content').innerText()).includes('Reported AIS type: Tug / towing'));
        await page.locator('#sooVesselList button').filter({ hasText: 'TEST TANKER' }).click();
        assert.ok((await page.locator('.leaflet-popup-content').innerText()).includes('Reported AIS type: Tanker'));
        await page.locator('#sooVesselList button').filter({ hasText: 'TEST TUG' }).click();
        assert.ok((await page.locator('.leaflet-popup-content').innerText()).includes('Reported AIS type: Tug / towing'));
        await page.locator('#sooVesselMap').screenshot({ path: out + '/vessel-map-' + width + '.png' });
      }
      // 1. Default "Now, 1½ hr": the ship already in a chamber is the answer.
      assert.match(await verdict(page), /EDWIN H\. GOTT is in the Poe Lock right now/);
      assert.match(await dossier(page), /EDWIN H\. GOTT[\s\S]*Poe Lock, now/);
      assert.equal(await page.locator('.lw-row-btn').count(), 3);
      assert.match(await page.locator('.lw-notes').innerText(), /hotline is not maintained now/);
      // The next-ship card no longer offers the seasonal hotline in November.
      assert.equal(await page.locator('#soo-next-ship a[href^="tel:"]').count(), 0);
      assert.equal(await page.locator('#soo-next-ship a[href*="boatnerd.com/passage"]').count(), 1);
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
      // 4. A visit that misses every window offers a one-tap adjustment that covers the next one.
      await choose(page, 'How soon', '30 min');
      await choose(page, 'How long', '45 min');
      assert.match(await verdict(page), /No reported ship is due during that visit/);
      await page.locator('.lw-adjust').click();
      assert.match(await verdict(page), /^Best bet: BURNS HARBOR/);
      assert.equal(await page.locator('input[name="lw-start"]:checked').getAttribute('value'), '90');
      assert.equal(await page.locator('input[name="lw-stay"]:checked').getAttribute('value'), '180');
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
      await context.close();
    }
    // 6. Feed failure: explicit unavailable state, no lineup.
    {
      const { context, page } = await open(browser, { width: 390, time: NOV, api: 'fail' });
      await page.getByText('Live ship reports are unavailable, so no visit can be lined up').waitFor();
      assert.equal(await page.locator('[data-lw-board]').isHidden(), true);
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
      assert.equal(await page.locator('#soo-lock-watch a[href*="boatnerd.com/passage"]').count(), 1);
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

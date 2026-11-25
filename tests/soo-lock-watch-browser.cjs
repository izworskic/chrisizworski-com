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
      // Two more boats moored on top of TEST TUG, as at the Coast Guard dock on 2026-11-22.
      { mmsi: '366009994', name: 'TEST FERRY', lat: 46.501, lon: -84.368, seen: iso(now, -2), speedKnots: 0, course: null, shipType: 60, source: 'fixture', lengthMeters: 30 },
      { mmsi: '366009995', name: 'TEST SLOOP', lat: 46.501, lon: -84.368, seen: iso(now, -2), speedKnots: 0, course: null, shipType: 36, source: 'fixture', lengthMeters: 12 },
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

async function open(browser, { width, time, api = 'ok', js = true, wx = 'ok', pin = true, blockStorage = false }) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', javaScriptEnabled: js });
  if(blockStorage)await context.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('storage blocked')}});});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // Leaflet ignores pointer clicks on markers while the page clock is frozen, so the
  // direct-tap scenario runs on the real clock with fixture times set to now.
  if (pin) await page.clock.setFixedTime(new Date(time));
  await context.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.pathname === '/api/field-camera') {
      if (u.searchParams.get('meta')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ available: true, fresh: true, label: 'St. Marys River at the Soo', age_minutes: 4, source: 'usgs', credit: 'USGS HIVIS', credit_url: 'https://apps.usgs.gov/hivis/', image_url: '/assets/soo-locks/hero.jpg', image_width: 720, image_height: 405 }) });
      return route.fulfill({ status: 404, body: '' });
    }
    if (u.pathname === '/api/soo-ais') {
      const mode = typeof api === 'function' ? api() : api;
      if (mode === 'fail') return route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false}' });
      const data = typeof mode === 'object' && mode ? mode : fixture(time);
      if (mode === 'slow' || mode === 'slow-stale' || mode === 'slow-mixed') {
        const ship = { id:'366009996', mmsi:'366009996', name:'TEST SLOW FREIGHTER', lat:46.5025, lon:-84.365, seen:iso(time,mode==='slow-stale'?-6:-2), speedKnots:0.6, distanceNm:0.5, state:'near-lock-low-motion' };
        data.nextShip.nearLockMotion = [ship];
        data.vessels.push({...ship,shipType:70,course:null,heading:null,lengthMeters:200,source:'fixture'});
        if (mode !== 'slow-mixed') Object.assign(data.nextShip,{inLock:[],candidates:[],pick:null});
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    }
    if (u.hostname === 'api.weather.gov') {
      if (wx === 'fail') return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
      return route.fulfill({ status: 200, contentType: 'application/geo+json', body: JSON.stringify(weather(time)) });
    }
    if (u.hostname === 'unpkg.com' && /\/leaflet\.(js|css)$/.test(u.pathname)) {
      // The page loads Leaflet cross-origin with SRI, so the stand-in must be byte-identical to
      // unpkg 1.9.4 (public/assets/leaflet-1.9.4.*) and carry a CORS header, or the browser drops it.
      const js = u.pathname.endsWith('.js');
      return route.fulfill({ status: 200, contentType: js ? 'text/javascript' : 'text/css', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(path.join(root, 'assets', js ? 'leaflet-1.9.4.js' : 'leaflet-1.9.4.css')) });
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
        assert.equal(await page.locator('#sooVesselMap .soo-ais-symbol').count(), 6, 'each recent AIS report has one ship symbol');
        // Equivalent control: every map symbol also has a full-size button in the vessel list.
        assert.equal(await page.locator('#sooVesselList button').count(), 6);
        for (const [kind, w] of [['cargo', 63], ['tanker', 49], ['tug', 38], ['unknown', 46]]) {
          assert.equal(await marker(kind).count(), 1, kind + ' has a distinct ship shape');
          assert.equal(Math.round(await marker(kind).evaluate(e => e.getBoundingClientRect().width)), w, kind + ' follows reported length');
        }
        // The ship-name hover card must not compete with the single AIS detail popup.
        await marker('tanker').hover(); // the tug is under the moored ferry and sloop now
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
      assert.match(await verdict(page), /EDWIN H\. GOTT last reported in the Poe Lock/);
      assert.match(await dossier(page), /EDWIN H\. GOTT[\s\S]*Poe Lock \(last report\)/);
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
      // 4. A missed window offers a feasible alternative without increasing the stay.
      await choose(page, 'How soon', '30 min');
      await choose(page, 'How long', '45 min');
      assert.match(await verdict(page), /No modeled arrival overlaps your available platform time/);
      await page.locator('.lw-adjust').click();
      assert.match(await verdict(page), /^Possible: BURNS HARBOR/);
      assert.equal(await page.locator('input[name="lw-start"]:checked').getAttribute('value'), '120');
      assert.equal(await page.locator('input[name="lw-stay"]:checked').getAttribute('value'), '45');
      // web-quality-accessibility: axe-core WCAG 2.0 to 2.2 A/AA over the whole page, after interaction.
      if (AxeBuilder && (width === 390 || width === 1280)) {
        // The camera credit is part of the scan: wait for the fixture camera to render it.
        await page.locator('.field-camera .camera-credit').waitFor();
        const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
        const scan = await new AxeBuilder({ page }).withTags(tags).disableRules(['target-size']).analyze();
        assert.deepEqual(scan.violations.map(v => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0].target.join(' ')}`), [], 'axe at ' + width);
        // WCAG 2.5.8 target size: map symbols at the same dock overlap by nature (the position is
        // essential) and each has an equivalent list button plus the overlap chooser asserted above,
        // so map markers are excluded from this one rule; every other target on the page is held to it.
        const targets = await new AxeBuilder({ page }).withRules(['target-size']).exclude('#sooVesselMap .leaflet-marker-icon').analyze();
        assert.deepEqual(targets.violations.map(v => `${v.id} x${v.nodes.length}: ${v.nodes[0].target.join(' ')}`), [], 'target size at ' + width);
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
    // 6b. A successful check followed by failure and recovery must not show stale ETA or lock-now claims.
    {
      let api = 'ok';
      const { context, page, errors } = await open(browser, { width: 390, time: NOV, api: () => api });
      await page.locator('.lw-row-btn').first().waitFor();
      assert.equal(await page.locator('#soo-next-ship .next-ship-window').count(), 1);
      api = 'fail';
      await page.locator('#vesselMapRefresh').click();
      await page.getByText('Live ship reports are unavailable, so no visit can be lined up').waitFor();
      assert.equal(await page.locator('#soo-next-ship .next-ship-window').count(), 0);
      assert.equal(await page.locator('#sooNextNow').isHidden(), true);
      assert.equal(await page.locator('[data-lw-board]').isHidden(), true);
      assert.equal(await page.locator('[data-lw-dossier]').isHidden(), true);
      assert.match(await page.locator('#vesselMapStatus').innerText(), /Refresh unavailable.*last-known/);
      assert.doesNotMatch(await page.locator('#sooVesselList').innerText(), /in the Poe Lock now/i);
      assert.equal(await page.locator('#sooVesselList button').count(), 6);
      await page.locator('#sooVesselList button').filter({hasText:'EDWIN H. GOTT'}).click();
      assert.doesNotMatch(await page.locator('#sooVesselMap .leaflet-popup-content').innerText(), /in the Poe Lock now/i);
      await page.locator('#soo-lock-watch').screenshot({path: `${out}/retained-feed-failure-390.png`});
      api = 'ok';
      await page.locator('#vesselMapRefresh').click();
      await page.locator('#soo-next-ship .next-ship-window').waitFor();
      await page.locator('.lw-row-btn').first().waitFor();
      assert.equal(await page.locator('#sooNextNow').isVisible(), true);
      assert.doesNotMatch(await page.locator('#vesselMapStatus').innerText(), /Refresh unavailable/);
      assert.deepEqual(errors, []);
      await context.close();
    }
    // Near-lock observations do not turn into forecast rows or survive failed/stale reports.
    for (const width of [390, 1280]) {
      let mode='slow';
      const {context,page,errors}=await open(browser,{width,time:NOV,api:()=>mode});
      await page.locator('#soo-next-ship-heading').filter({hasText:'TEST SLOW FREIGHTER reported moving slowly'}).waitFor();
      assert.match(await verdict(page),/TEST SLOW FREIGHTER reported moving slowly/);
      assert.match(await page.locator('#sooNextBody').innerText(),/Arrival timing is uncertain/);
      assert.equal(await page.locator('#soo-next-ship .next-ship-window').count(),0);
      assert.equal(await page.locator('[data-lw-board]').isHidden(),true);
      assert.equal(await page.locator('.lw-adjust').count(),0);
      await page.locator('#soo-next-ship').screenshot({path:out+'/near-lock-slow-card-'+width+'.png'});
      await page.locator('#soo-lock-watch').screenshot({path:out+'/near-lock-slow-planner-'+width+'.png'});
      await page.locator('#soo-next-ship button').filter({hasText:'Show this vessel on the live map'}).click();
      await page.locator('#sooVesselMap .leaflet-popup-content').filter({hasText:'TEST SLOW FREIGHTER'}).waitFor();
      mode='slow-stale'; await page.locator('#vesselMapRefresh').click();
      await page.locator('#soo-next-ship-heading').filter({hasText:'No ship is clearly heading'}).waitFor();
      assert.doesNotMatch(await verdict(page),/TEST SLOW FREIGHTER/);
      mode='slow-mixed'; await page.locator('#vesselMapRefresh').click();
      await page.locator('#soo-next-ship .next-ship-window').waitFor();
      assert.match(await page.locator('#sooNextBody').innerText(),/TEST SLOW FREIGHTER/);
      assert.doesNotMatch(await page.locator('[data-lw-rows]').innerText(),/TEST SLOW FREIGHTER/);
      mode='fail'; await page.locator('#vesselMapRefresh').click();
      await page.locator('#soo-next-ship-heading').filter({hasText:'Live ship reports are unavailable'}).waitFor();
      assert.doesNotMatch(await page.locator('#sooNextBody').innerText(),/TEST SLOW FREIGHTER/);
      assert.doesNotMatch(await verdict(page),/TEST SLOW FREIGHTER/);
      mode='slow'; await page.locator('#vesselMapRefresh').click();
      await page.locator('#soo-next-ship-heading').filter({hasText:'TEST SLOW FREIGHTER'}).waitFor();
      assert.deepEqual(errors,[]); await context.close();
    }
    // A closed park is not a recommended visit even if a forecast window overlaps.
    for (const width of [390,1280]) {
      const {context,page,errors}=await open(browser,{width,time:Date.parse('2026-11-21T22:30:00Z')});
      await page.locator('.lw-row-btn').first().waitFor();
      await choose(page,'How soon','2 hr');
      assert.match(await verdict(page),/Your visit falls outside posted park hours/);
      assert.equal(await page.locator('.lw-adjust').count(),0);
      await page.locator('#soo-lock-watch').screenshot({path:out+'/visitor-closed-park-'+width+'.png'});
      assert.deepEqual(errors,[]);await context.close();
    }
    // Session change comparisons use new check and observation times, not a control change or cache replay.
    for (const width of [390,1280]) {
      let mode=fixture(NOV);
      const {context,page,errors}=await open(browser,{width,time:NOV,api:()=>mode});
      await page.locator('.lw-row-btn').first().waitFor();
      const change=page.locator('[data-lw-changes]');
      assert.equal(await change.isHidden(),true);
      await choose(page,'How soon','2 hr');assert.equal(await change.isHidden(),true);
      const shifted=fixture(NOV+60000),burns=shifted.nextShip.candidates[0];
      for(const k of ['start','midpoint','end'])burns.window[k]=new Date(Date.parse(burns.window[k])+24*60000).toISOString();
      mode=shifted;await page.clock.setFixedTime(new Date(NOV+60000));await page.locator('#vesselMapRefresh').click();
      await change.filter({hasText:'BURNS HARBOR: the estimated arrival midpoint moved 25 min later'}).waitFor();
      await page.locator('#soo-lock-watch').screenshot({path:out+'/changing-conditions-'+width+'.png'});
      await choose(page,'How long','45 min');assert.match(await change.innerText(),/25 min later/);
      const lost=fixture(NOV+120000);lost.nextShip.candidates=lost.nextShip.candidates.slice(1);lost.nextShip.pick=lost.nextShip.candidates[0];
      mode=lost;await page.clock.setFixedTime(new Date(NOV+120000));await page.locator('#vesselMapRefresh').click();
      await change.filter({hasText:'the previous arrival estimate is no longer listed'}).waitFor();
      assert.match(await change.innerText(),/does not establish a departure or passage/);
      mode='fail';await page.locator('#vesselMapRefresh').click();await change.waitFor({state:'hidden'});
      mode=fixture(NOV+180000);await page.clock.setFixedTime(new Date(NOV+180000));await page.locator('#vesselMapRefresh').click();
      await change.filter({hasText:'Fresh check available after an unsuccessful refresh'}).waitFor();
      assert.deepEqual(errors,[]);await context.close();
    }
    // Regression: a sequence of older source fixes must not manufacture a change.
    {
      let mode=fixture(NOV);
      const {context,page,errors}=await open(browser,{width:390,time:NOV,api:()=>mode});
      await page.locator('.lw-row-btn').first().waitFor();
      const change=page.locator('[data-lw-changes]');
      for(const [minute,seen,shift] of [[1,-4,40],[2,-3,45],[3,1,20]]) {
        mode=fixture(NOV+minute*60000);
        const ship=mode.nextShip.candidates[0];ship.seen=iso(NOV,seen);
        for(const k of ['start','midpoint','end'])ship.window[k]=new Date(Date.parse(fixture(NOV).nextShip.candidates[0].window[k])+shift*60000).toISOString();
        await page.clock.setFixedTime(new Date(NOV+minute*60000));
        await page.locator('#vesselMapRefresh').click();
        await page.waitForFunction(()=>!document.getElementById('vesselMapRefresh').disabled);
        if(minute<3)assert.equal(await change.isHidden(),true);
        else await change.filter({hasText:'BURNS HARBOR: the estimated arrival midpoint moved 20 min later'}).waitFor();
      }
      assert.deepEqual(errors,[]);await context.close();
    }
    // Returning visitors: opt-in only; restored preferences, fresh comparison, expiry and clear.
    for(const width of [390,1280]) {
      let mode=fixture(NOV);
      const {context,page,errors}=await open(browser,{width,time:NOV,api:()=>mode});
      const key='ciz:soo-locks:spots:v1',button=page.locator('[data-lw-memory-button]'),note=page.locator('[data-lw-memory-note]');
      await page.locator('.lw-row-btn').first().waitFor();
      await choose(page,'How soon','2 hr');await choose(page,'How long','45 min');
      assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),null);
      await button.click();await button.filter({hasText:'Forget saved visit choices'}).waitFor();
      const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
      assert.deepEqual(saved.prefs,{startOffset:120,stay:45});assert.ok(saved.baseline);
      const shifted=fixture(NOV+60000),ship=shifted.nextShip.candidates[0];
      for(const k of ['start','midpoint','end'])ship.window[k]=new Date(Date.parse(ship.window[k])+24*60000).toISOString();
      mode=shifted;await page.clock.setFixedTime(new Date(NOV+60000));await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('[data-lw-changes]').filter({hasText:'BURNS HARBOR: the estimated arrival midpoint moved 25 min later'}).waitFor();
      assert.equal(await page.locator('input[name="lw-start"]:checked').getAttribute('value'),'120');
      assert.equal(await page.locator('input[name="lw-stay"]:checked').getAttribute('value'),'45');
      await note.filter({hasText:'Fresh check received'}).waitFor();
      await page.locator('#soo-lock-watch').screenshot({path:out+'/returning-visitor-'+width+'.png'});
      mode=fixture(NOV+20*60000);await page.clock.setFixedTime(new Date(NOV+20*60000));await page.reload({waitUntil:'domcontentloaded'});
      await note.filter({hasText:'Earlier vessel reports are too old to compare'}).waitFor();
      assert.equal(await page.locator('[data-lw-changes]').isHidden(),true);
      mode='fail';await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('.lw-verdict-head').filter({hasText:'Live ship reports are unavailable'}).waitFor();
      assert.equal(await page.locator('[data-lw-board]').isHidden(),true);assert.equal(await page.locator('[data-lw-changes]').isHidden(),true);
      await button.click();assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),null);
      await page.reload({waitUntil:'domcontentloaded'});
      await button.filter({hasText:'Remember my visit choices'}).waitFor();
      assert.equal(await page.locator('input[name="lw-start"]:checked').getAttribute('value'),'0');
      assert.equal(await page.locator('input[name="lw-stay"]:checked').getAttribute('value'),'90');
      assert.deepEqual(errors,[]);await context.close();
    }
    {
      const {context,page,errors}=await open(browser,{width:390,time:NOV,blockStorage:true});
      await page.locator('.lw-row-btn').first().waitFor();
      await page.locator('[data-lw-memory-button]').click();
      await page.locator('[data-lw-memory-note]').filter({hasText:'choices have not been saved'}).waitFor();
      assert.match(await verdict(page),/EDWIN H. GOTT/);assert.deepEqual(errors,[]);await context.close();
    }
    // A new opt-in and a completed return check must both recover their memory
    // note after an outage, without a reload or changes to the saved controls.
    for(const restored of [false,true]) {
      let mode=fixture(NOV),tick=0;
      const {context,page,errors}=await open(browser,{width:restored?1280:390,time:NOV,api:()=>mode});
      const key='ciz:soo-locks:spots:v1',button=page.locator('[data-lw-memory-button]'),note=page.locator('[data-lw-memory-note]');
      await page.locator('.lw-row-btn').first().waitFor();
      await choose(page,'How soon','2 hr');await choose(page,'How long','45 min');
      await button.click();await button.filter({hasText:'Forget saved visit choices'}).waitFor();
      if(restored) {
        mode=fixture(NOV+(++tick)*60000);
        await page.clock.setFixedTime(new Date(NOV+tick*60000));await page.reload({waitUntil:'domcontentloaded'});
        await note.filter({hasText:'Fresh check received'}).waitFor();
      }
      mode='fail';await page.locator('#vesselMapRefresh').click();
      await note.filter({hasText:'live reports are unavailable'}).waitFor();
      await page.locator('.lw-verdict-head').filter({hasText:'Live ship reports are unavailable'}).waitFor();
      assert.equal(await page.locator('[data-lw-board]').isHidden(),true);
      mode=fixture(NOV+(++tick)*60000);
      await page.clock.setFixedTime(new Date(NOV+tick*60000));await page.locator('#vesselMapRefresh').click();
      await note.filter({hasText:'Live reports are available again'}).waitFor();
      await page.locator('.lw-row-btn').first().waitFor();
      assert.doesNotMatch(await note.innerText(),/live reports are unavailable/i);
      assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).prefs,key),{startOffset:120,stay:45});
      assert.equal(await page.locator('input[name="lw-start"]:checked').getAttribute('value'),'120');
      assert.equal(await page.locator('input[name="lw-stay"]:checked').getAttribute('value'),'45');
      await page.locator('#soo-lock-watch').screenshot({path:out+'/saved-visit-recovered-'+(restored?1280:390)+'.png'});
      assert.deepEqual(errors,[]);await context.close();
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
    // 10. A crowded dock: overlapping symbols get a chooser on tap; keyboard opens one vessel directly.
    {
      const now = Date.now();
      const { context, page, errors } = await open(browser, { width: 390, time: now, pin: false });
      await page.locator('#sooVesselMap').scrollIntoViewIfNeeded();
      await page.locator('#sooVesselMap .soo-ais-symbol').first().waitFor();
      const marker = kind => page.locator('#sooVesselMap .soo-ais-symbol.type-' + kind);
      // Overlapping moored boats: a tap at that spot offers every vessel there, in the one popup.
      await marker('tug').scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const box = await marker('tug').boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      const crowd = page.locator('#sooVesselMap .soo-ais-crowd');
      await crowd.waitFor();
      assert.match(await crowd.innerText(), /^3 vessels are reported at this spot\. Choose one:/);
      assert.deepEqual((await crowd.locator('button').allInnerTexts()).sort(), ['TEST FERRY · Passenger', 'TEST SLOOP · Sailboat', 'TEST TUG · Tug / towing']);
      assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.closest('.soo-ais-crowd') !== null), true, 'focus moves into the chooser');
      // The chooser clears the zoom buttons (popup auto-pan padding; the pan animates briefly).
      await page.waitForTimeout(700);
      const zoom = await page.locator('#sooVesselMap .leaflet-control-zoom').boundingBox();
      const pop = await page.locator('#sooVesselMap .leaflet-popup-content-wrapper').boundingBox();
      assert.ok(pop.x >= zoom.x + zoom.width || pop.y >= zoom.y + zoom.height, 'popup not under the zoom control');
      const mapBox = await page.locator('#sooVesselMap').boundingBox();
      assert.ok(pop.x + pop.width <= mapBox.x + mapBox.width + 1, 'popup fits inside the map on a 390 px phone');
      await page.locator('#sooVesselMap').screenshot({ path: out + '/vessel-crowd-390.png' });
      await crowd.locator('button', { hasText: 'TEST SLOOP' }).click();
      assert.equal(await page.locator('#sooVesselMap .leaflet-popup:visible').count(), 1, 'the chooser and the detail share one popup');
      assert.ok((await page.locator('#sooVesselMap .leaflet-popup-content:visible').last().innerText()).includes('TEST SLOOP'));
      // A keyboard user who focused one marker goes straight to that vessel, not the chooser.
      await marker('tanker').focus();
      await page.keyboard.press('Enter');
      assert.ok((await page.locator('#sooVesselMap .leaflet-popup-content:visible').last().innerText()).includes('Reported AIS type: Tanker'));
      assert.equal(await page.locator('#sooVesselMap .soo-ais-crowd').count(), 0);
      // A list button opens the same detail, panned clear of the zoom buttons.
      await page.locator('#sooVesselList button').filter({ hasText: 'TEST TUG' }).click();
      await page.waitForTimeout(900);
      const zoom2 = await page.locator('#sooVesselMap .leaflet-control-zoom').boundingBox();
      const pop2 = await page.locator('#sooVesselMap .leaflet-popup-content-wrapper').boundingBox();
      assert.ok(pop2.x >= zoom2.x + zoom2.width || pop2.y >= zoom2.y + zoom2.height, 'list-opened detail is not under the zoom control');
      await page.locator('#sooVesselMap').screenshot({ path: out + '/vessel-detail-390.png' });
      // Space works too, as for any role="button".
      await marker('unknown').focus();
      await page.keyboard.press(' ');
      assert.ok((await page.locator('#sooVesselMap .leaflet-popup-content:visible').last().innerText()).includes('TEST UNKNOWN'));
      assert.deepEqual(errors, []);
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

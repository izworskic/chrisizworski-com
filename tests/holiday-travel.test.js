import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const page = fs.readFileSync('public/holiday-travel/index.html', 'utf8');
const script = page.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];

const engineSource = fs.readFileSync('public/assets/holiday-travel-engine.js', 'utf8');
const dataDir = 'public/holiday-travel/data/';

// Fake NWS responses keyed by URL fragment; anything else 404s.
function nwsFixture({ storm = false } = {}) {
  return url => {
    if (url.includes('/alerts/active')) {
      return { features: storm && url.includes('41.97') ? [{ properties: { event: 'Winter Storm Warning', headline: 'Winter Storm Warning', onset: '2026-11-24T12:00:00-06:00', ends: '2026-11-26T06:00:00-06:00' } }] : [] };
    }
    if (url.includes('/points/')) return { properties: { forecast: 'https://api.weather.gov/gridpoints/X/1,1/forecast?' + url.split('/points/')[1] } };
    if (url.includes('/forecast')) return { properties: { periods: [{ name: 'Wednesday', startTime: '2026-11-25T06:00:00-05:00', shortForecast: storm && url.includes('41.97') ? 'Heavy Snow' : 'Mostly Sunny' }] } };
    return null;
  };
}

async function launch(today = '2026-10-19', { failFetch = false, nws = nwsFixture() } = {}) {
  const SimulatedDate = class extends Date {
    constructor(...args) { super(...(args.length ? args : [today + 'T12:00:00Z'])); }
    static now() { return new Date(today + 'T12:00:00Z').getTime(); }
  };
  const nodes = new Map();
  const document = {
    getElementById(id) {
      if (!nodes.has(id)) {
        nodes.set(id, {
          value: { region: 'midwest', miles: '300', mpg: '28' }[id] ?? '',
          textContent: '', innerHTML: '', hidden: false, handlers: {}, classes: new Set(),
          addEventListener(event, fn) { this.handlers[event] = fn; },
          setAttribute(name, val) { this[name] = val; },
          classList: { toggle(cls, on) {} }
        });
      }
      return nodes.get(id);
    }
  };
  const fetchedUrls = [];
  const fetch = async url => {
    fetchedUrls.push(url);
    if (failFetch) return { ok: false, status: 500 };
    if (url.startsWith('/holiday-travel/data/')) {
      const file = dataDir + url.slice('/holiday-travel/data/'.length);
      if (!fs.existsSync(file)) return { ok: false, status: 404 };
      const body = fs.readFileSync(file, 'utf8');
      return { ok: true, json: async () => JSON.parse(body) };
    }
    const body = nws(url);
    return body ? { ok: true, json: async () => body } : { ok: false, status: 404 };
  };
  const context = { document, fetch, setTimeout, Date: SimulatedDate, Number, String, Math };
  vm.createContext(context);
  vm.runInContext(engineSource, context);
  vm.runInContext(script, context, { timeout: 2000 });
  await context.__holidayTravelReady;
  const settle = async () => { for (let i = 0; i < 4; i++) await context.__holidayTravelSettle(); };
  await settle();
  const app = {
    get: id => document.getElementById(id), fetchedUrls, settle,
    click: async id => { document.getElementById(id).handlers.click(); await settle(); },
    change: async (id, value) => { const n = document.getElementById(id); n.value = value; n.handlers.change(); await settle(); },
    pct: () => parseFloat(document.getElementById('third-stat').textContent)
  };
  return app;
}

test('source, authorship, canonical and honest uncertainty are explicit', () => {
  assert.ok(script, 'interactive script must exist');
  assert.match(page, /<link rel="canonical" href="https:\/\/chrisizworski.com\/holiday-travel\/"/);
  assert.match(page, /https:\/\/chrisizworski.com\/#person/);
  assert.match(page, /Built by <a href="\/chris-izworski\/">Chris Izworski/);
  for (const source of ['tsa.gov', 'newsroom.aaa.com', 'transtats.bts.gov', 'eia.gov']) assert.ok(page.includes(source), source + ' source link missing');
  assert.match(page, /no checkpoint wait is estimated/);
  assert.match(page, /Past patterns are not a forecast/);
  assert.doesNotMatch(page, /2026 planning outlook|This is a 2026 estimate/);
  assert.doesNotMatch(page, /booking widget|price comparison|buy flight|purchase flights/i);
});

// The flying side is a "will I make it?" stress test (route + departure + deadline). Earlier versions ranked
// national crowd days and then six-season airport odds; those assertions were replaced, not relaxed.
test('flying stress-tests a concrete plan against a deadline using route data', async () => {
  const app = await launch();
  assert.equal(app.fetchedUrls[0], '/holiday-travel/data/national.json');
  assert.ok(app.fetchedUrls.includes('/holiday-travel/data/routes/DTW.json'), 'origin shard loaded');
  assert.match(app.get('best-label').textContent, /chance you miss Thanksgiving dinner/);
  assert.match(app.get('rank-intro').textContent, /Detroit.*Orlando/);
  assert.match(app.get('rank-intro').textContent, /hours to spare/);
  const html = app.get('results').innerHTML;
  assert.match(html, /Where the risk comes from/);
  assert.match(html, /If it’s cancelled/);
  assert.match(html, /flights a day/);
  assert.match(html, /First flight of the day/);
  assert.match(html, /\/flight-tracker\//);
  assert.match(html, /class="strip"/);
  assert.doesNotMatch(html, /TSA|screened/);
});

test('deadline, departure time, route and connection all move the odds', async () => {
  const app = await launch();
  await app.change('dep-day', '-1'); await app.change('dep-time', '17');
  await app.change('due-day', '0'); await app.change('due-time', '14');
  const loose = app.pct();
  await app.change('due-day', '-1'); await app.change('due-time', '22');
  const tight = app.pct();
  assert.ok(tight > loose * 3, `tight ${tight} vs loose ${loose}`);
  await app.change('due-time', '18');
  assert.match(app.get('best-label').textContent, /lands after your deadline/);
  await app.change('due-time', '23');
  await app.change('away', 'ORD');
  const ord = app.pct();
  await app.change('away', 'SLC');
  assert.ok(ord > app.pct(), 'DTW->ORD riskier than DTW->SLC for the same evening');
  await app.change('home', 'MBS');
  await app.change('away', 'MCO');
  assert.match(app.get('routing').innerHTML, /Connect in/);
  assert.doesNotMatch(app.get('routing').innerHTML, /Nonstop/, 'no MBS-MCO nonstop in the data');
  assert.match(app.get('results').innerHTML, /Missed connection/);
});

test('getting home swaps the direction and defaults to the return deadline', async () => {
  const app = await launch();
  await app.click('dir-home');
  assert.match(app.get('best-label').textContent, /Monday morning/);
  assert.match(app.get('rank-intro').textContent, /Orlando.*→.*Detroit/);
  assert.equal(app.get('due-label').textContent, 'Must be home by');
});

test('Christmas plans use Christmas history and offer fixes for a fragile plan', async () => {
  const app = await launch();
  await app.click('christmas');
  await app.change('home', 'MBS');
  await app.change('dep-day', '-1'); await app.change('dep-time', '7');
  await app.change('due-day', '-1'); await app.change('due-time', '20');
  assert.match(app.get('best-label').textContent, /Christmas Eve/);
  assert.ok(app.pct() > 5);
  assert.match(app.get('results').innerHTML, /Ways to lower the odds/);
  assert.match(app.get('results').innerHTML, /<ol class="fixes">/);
});

test('live NWS panel stays off until the final week, then reports hazards on the route', async () => {
  const early = await launch('2026-10-19');
  assert.match(early.get('live-panel').innerHTML, /Starting .* this panel pulls National Weather Service/);
  assert.ok(!early.fetchedUrls.some(u => u.includes('weather.gov')), 'no NWS calls outside the window');

  const calm = await launch('2026-11-20');
  assert.match(calm.get('live-panel').innerHTML, /Live weather check/);
  assert.match(calm.get('live-panel').innerHTML, /Nothing notable/);
  assert.ok(calm.fetchedUrls.some(u => u.startsWith('https://api.weather.gov/alerts/active?point=')));

  const storm = await launch('2026-11-20', { nws: nwsFixture({ storm: true }) });
  await storm.change('away', 'ORD');
  assert.match(storm.get('live-panel').innerHTML, /Winter Storm Warning/);
  assert.match(storm.get('live-panel').innerHTML, /worst past season/);
});

test('a failed data load says so instead of inventing numbers, and driving still works', async () => {
  const app = await launch('2026-10-19', { failFetch: true });
  assert.match(app.get('results').innerHTML, /could not be loaded/);
  assert.equal(app.get('third-stat').textContent, 'Unavailable');
  await app.click('drive');
  assert.match(app.get('third-stat').textContent, /^\$/);
});

test('Christmas, driving, fuel arithmetic, invalid miles and toggles recalculate without reload', async () => {
  const app = await launch();
  await app.click('christmas');
  assert.match(app.get('holiday-stat').textContent, /Christmas/);
  assert.match(app.get('best-label').textContent, /Christmas Eve/);
  await app.click('drive');
  assert.match(app.get('rank-heading').textContent, /Driving/);
  assert.equal(app.get('third-stat').textContent, '$44.41');
  app.get('city').value = 'Los Angeles, CA';
  app.get('city').handlers.input();
  assert.equal(app.get('region').value, 'west');
  assert.match(app.get('rank-heading').textContent, /Los Angeles, CA/);
  assert.equal(app.get('third-stat').textContent, '$60.42');
  app.get('city').value = 'Bay City, MI';
  app.get('city').handlers.input();
  assert.equal(app.get('region').value, 'midwest');
  assert.equal(app.get('third-stat').textContent, '$44.41');
  app.get('miles').value = '600';
  app.get('miles').handlers.input();
  assert.equal(app.get('third-stat').textContent, '$88.82');
  app.get('mpg').value = '0';
  app.get('mpg').handlers.input();
  assert.match(app.get('third-stat').textContent, /Enter valid/);
  await app.click('fly');
  assert.match(app.get('rank-heading').textContent, /stress-tested/);
  assert.equal(app.get('fly')['aria-pressed'], 'true');
});


test('automatically rolls between 2026 and future holidays without editing page text', async () => {
  const app = await launch('2026-10-19');
  assert.equal(app.get('holiday-stat').textContent, 'Thanksgiving 2026');
  assert.match(app.get('date-stat').textContent, /Thursday, November 26, 2026/);
  assert.match(app.get('planning-banner').textContent, /2026 travel planning/);
  assert.match(app.get('yearly-source-note').textContent, /2018, 2019, 2022–2025/);

  const afterThanksgiving = await launch('2026-12-28');
  assert.equal(afterThanksgiving.get('holiday-stat').textContent, 'Thanksgiving 2027');
  assert.match(afterThanksgiving.get('date-stat').textContent, /Thursday, November 25, 2027/);
  await afterThanksgiving.click('christmas');
  assert.equal(afterThanksgiving.get('holiday-stat').textContent, 'Christmas 2026');
  assert.match(afterThanksgiving.get('date-stat').textContent, /Friday, December 25, 2026/);

  const nextJanuary = await launch('2027-01-02');
  await nextJanuary.click('christmas');
  assert.match(nextJanuary.get('date-stat').textContent, /Saturday, December 25, 2027/);

  const future = await launch('2029-10-19');
  assert.match(future.get('date-stat').textContent, /Thursday, November 22, 2029/);
  await future.click('christmas');
  assert.match(future.get('date-stat').textContent, /Tuesday, December 25, 2029/);
});

test('manual travel-year selection recalculates dates, road weekday guidance, and source labels', async () => {
  const app = await launch('2026-10-19');
  await app.click('christmas');
  await app.click('drive');
  const first = app.get('results').innerHTML;
  assert.match(app.get('date-stat').textContent, /Friday, December 25, 2026/);
  assert.match(first, /Christmas Eve estimate adjusted for its Thursday placement/);

  app.get('travel-year').value = '2027';
  app.get('travel-year').handlers.change();
  assert.equal(app.get('holiday-stat').textContent, 'Christmas 2027');
  assert.match(app.get('date-stat').textContent, /Saturday, December 25, 2027/);
  assert.match(app.get('results').innerHTML, /Christmas Eve estimate adjusted for its Friday placement/);
  assert.match(app.get('results').innerHTML, /2027 timing estimate using 2025 AAA\/INRIX/);
  assert.match(app.get('third-note').textContent, /Oct 12, 2026 \(historical price illustration\)/);
  assert.match(app.get('yearly-source-note').textContent, /Travel days are generated for 2027/);
  assert.notEqual(app.get('results').innerHTML, first, 'weekday-adaptive recommendations must differ');

  app.get('travel-year').value = '2028';
  app.get('travel-year').handlers.change();
  await app.click('thanksgiving');
  assert.match(app.get('date-stat').textContent, /Thursday, November 23, 2028/);
  assert.match(app.get('results').innerHTML, /Nov .*2028/);
  app.get('travel-year').value = 'auto';
  app.get('travel-year').handlers.change();
  assert.equal(app.get('holiday-stat').textContent, 'Thanksgiving 2026');
});

test('the method, limits and sources are disclosed and nothing implies a daily forecast', () => {
  assert.match(page, /What it does not know/);
  assert.match(page, /Your airline and fare\./);
  assert.match(page, /second one, not the first/);
  assert.match(page, /held out one season at a time/);
  assert.match(page, /security lines/i);
  assert.match(page, /2020 and 2021 are left out/);
  assert.match(page, /BTS Reporting Carrier On-Time Performance/);
  assert.match(page, /historical odds, not a promise/);
  assert.doesNotMatch(page, /ontimereport\.com|23\.11|34\.41|19\.40|26\.45/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const page = fs.readFileSync('public/holiday-travel/index.html', 'utf8');
const script = page.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];

const engineSource = fs.readFileSync('public/assets/holiday-travel-engine.js', 'utf8');
const nationalJson = fs.readFileSync('public/holiday-travel/data/national.json', 'utf8');

async function launch(today = '2026-10-19', { failFetch = false } = {}) {
  const SimulatedDate = class extends Date {
    constructor(...args) { super(...(args.length ? args : [today + 'T12:00:00Z'])); }
    static now() { return new Date(today + 'T12:00:00Z').getTime(); }
  };
  const nodes = new Map();
  const document = {
    getElementById(id) {
      if (!nodes.has(id)) {
        nodes.set(id, {
          value: { airport: 'DTW', region: 'midwest', miles: '300', mpg: '28' }[id] ?? '',
          textContent: '', innerHTML: '', handlers: {},
          addEventListener(event, fn) { this.handlers[event] = fn; },
          setAttribute(name, val) { this[name] = val; },
          classList: { toggle() {} }
        });
      }
      return nodes.get(id);
    }
  };
  const fetchedUrls = [];
  const fetch = async url => {
    fetchedUrls.push(url);
    if (failFetch) return { ok: false, status: 500 };
    return { ok: true, json: async () => JSON.parse(nationalJson) };
  };
  const context = { document, fetch, Date: SimulatedDate, Number, String, Math };
  vm.createContext(context);
  vm.runInContext(engineSource, context);
  vm.runInContext(script, context, { timeout: 2000 });
  await context.__holidayTravelReady;
  return { get: id => document.getElementById(id), click: id => document.getElementById(id).handlers.click(), fetchedUrls, change(id, value) { const n = document.getElementById(id); n.value = value; n.handlers.change(); } };
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

// REPLACED in the flight-odds rebuild: the old test asserted that airport selection could NOT change
// the date ranking and that the page showed 2025 monthly on-time percentages. Those assertions encoded the
// flaw (generic percentages, identical ranking for every airport) and are intentionally gone.
test('flying renders round-trip odds from BTS history, not national crowd counts', async () => {
  const app = await launch();
  assert.deepEqual(app.fetchedUrls, ['/holiday-travel/data/national.json']);
  assert.match(app.get('holiday-stat').textContent, /Thanksgiving/);
  assert.match(app.get('third-stat').textContent, /^\d+(\.\d)?%$/);
  assert.equal((app.get('results').innerHTML.match(/<article class="day /g) || []).length, 7, 'six ranked trips plus the conventional benchmark');
  assert.match(app.get('results').innerHTML, /conventional peak trip/);
  assert.match(app.get('results').innerHTML, /class="strip"/);
  assert.match(app.get('best-reason').textContent, /cancelled, diverted or left 60\+ minutes late/);
  assert.match(app.get('best-reason').textContent, /does not model your airline/);
  assert.doesNotMatch(app.get('results').innerHTML, /TSA|screened/);
});

test('flying odds respond to airport, return airport, trip length, and time of day', async () => {
  const app = await launch();
  const stat = () => parseFloat(app.get('third-stat').textContent);
  const base = stat();
  app.change('airport', 'ORD');
  assert.ok(stat() > base, 'ORD is riskier than DTW');
  app.change('airport', 'ATL');
  assert.ok(stat() < base, 'ATL is safer than DTW');
  assert.match(app.get('airport-context-title').textContent, /Atlanta/);
  app.change('airport', 'DTW');
  const morning = (app.change('out-band', '0'), app.change('ret-band', '0'), stat());
  const evening = (app.change('out-band', '4'), app.change('ret-band', '4'), stat());
  assert.ok(evening > morning * 1.5, 'evening departures are far riskier than morning ones');
  app.change('out-band', '1'); app.change('ret-band', '3');
  const rankedFor4 = [...app.get('results').innerHTML.matchAll(/#\d+ · ([^<]+)<\/div>/g)].map(x => x[1]);
  app.change('trip-len', '2');
  const rankedFor2 = [...app.get('results').innerHTML.matchAll(/#\d+ · ([^<]+)<\/div>/g)].map(x => x[1]);
  assert.notDeepEqual(rankedFor4, rankedFor2, 'trip length changes the candidate trips');
  app.change('airport-to', 'ORD');
  assert.match(app.get('airport-context-cancellation').textContent, /Chicago|ORD/);
});

test('Christmas flying uses Christmas history and unlisted airports fall back to the national baseline', async () => {
  const app = await launch();
  const th = app.get('results').innerHTML;
  app.click('christmas');
  assert.match(app.get('holiday-stat').textContent, /Christmas/);
  assert.notEqual(app.get('results').innerHTML, th);
  assert.equal((app.get('results').innerHTML.match(/<article class="day /g) || []).length, 7);
  app.change('airport', 'other');
  assert.match(app.get('airport-context-comparison').textContent, /U\.S\. average is used/);
  assert.match(app.get('best-reason').textContent, /typical U\.S\. airport/);
  app.click('drive');
  assert.equal(app.get('airport-context').hidden, true, 'do not show flight context while driving');
});

test('a failed data load says so instead of inventing numbers, and driving still works', async () => {
  const app = await launch('2026-10-19', { failFetch: true });
  assert.match(app.get('results').innerHTML, /could not be loaded/);
  assert.equal(app.get('third-stat').textContent, 'Unavailable');
  app.click('drive');
  assert.match(app.get('third-stat').textContent, /^\$/);
});

test('Christmas, driving, fuel arithmetic, invalid miles and toggles recalculate without reload', async () => {
  const app = await launch();
  app.click('christmas');
  assert.match(app.get('holiday-stat').textContent, /Christmas/);
  assert.equal((app.get('results').innerHTML.match(/<article class="day /g) || []).length, 7, 'Christmas flying: six ranked trips plus benchmark');
  app.click('drive');
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
  app.click('fly');
  assert.match(app.get('rank-heading').textContent, /Flying/);
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
  afterThanksgiving.click('christmas');
  assert.equal(afterThanksgiving.get('holiday-stat').textContent, 'Christmas 2026');
  assert.match(afterThanksgiving.get('date-stat').textContent, /Friday, December 25, 2026/);

  const nextJanuary = await launch('2027-01-02');
  nextJanuary.click('christmas');
  assert.match(nextJanuary.get('date-stat').textContent, /Saturday, December 25, 2027/);

  const future = await launch('2029-10-19');
  assert.match(future.get('date-stat').textContent, /Thursday, November 22, 2029/);
  future.click('christmas');
  assert.match(future.get('date-stat').textContent, /Tuesday, December 25, 2029/);
});

test('manual travel-year selection recalculates dates, road weekday guidance, and source labels', async () => {
  const app = await launch('2026-10-19');
  app.click('christmas');
  app.click('drive');
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
  app.click('thanksgiving');
  assert.match(app.get('date-stat').textContent, /Thursday, November 23, 2028/);
  assert.match(app.get('results').innerHTML, /Nov .*2028/);
  app.get('travel-year').value = 'auto';
  app.get('travel-year').handlers.change();
  assert.equal(app.get('holiday-stat').textContent, 'Thanksgiving 2026');
});

test('the method, limits and sources are disclosed and nothing implies a daily forecast', () => {
  assert.match(page, /What it does not know/);
  assert.match(page, /Your airline\./);
  assert.match(page, /security lines/i);
  assert.match(page, /2020–2021 are left out/);
  assert.match(page, /BTS Reporting Carrier On-Time Performance/);
  assert.match(page, /historical odds, not a promise/);
  assert.doesNotMatch(page, /ontimereport\.com|23\.11|34\.41|19\.40|26\.45/);
});

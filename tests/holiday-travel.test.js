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

async function launch(today = '2026-10-19', { failFetch = false, nws = nwsFixture(), search = '', faa = null } = {}) {
  const SimulatedDate = class extends Date {
    constructor(...args) { super(...(args.length ? args : [today + 'T12:00:00Z'])); }
    static now() { return new Date(today + 'T12:00:00Z').getTime(); }
  };
  const nodes = new Map();
  const document = {
    querySelectorAll(selector) {
      const hol = selector.match(/data-holiday="(th|xm)"/)?.[1];
      return [...page.matchAll(/data-holiday="(th|xm)" data-offset="(-?\d+)" data-avg="(\d+)"/g)]
        .filter(row => row[1] === hol)
        .map(row => ({ getAttribute(name) { return {'data-offset': row[2], 'data-avg': row[3]}[name]; } }));
    },
    getElementById(id) {
      if (!nodes.has(id)) {
        nodes.set(id, {
          value: { region: 'midwest', miles: '300', mpg: '28', layover: '60' }[id] ?? '',
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
    if (url === '/api/holiday-airport-weather?view=faa') return faa ? {ok:true,json:async()=>faa} : {ok:false,status:503};
    if (url.startsWith('/holiday-travel/data/')) {
      const file = dataDir + url.slice('/holiday-travel/data/'.length);
      if (!fs.existsSync(file)) return { ok: false, status: 404 };
      const body = fs.readFileSync(file, 'utf8');
      return { ok: true, json: async () => JSON.parse(body) };
    }
    const body = nws(url);
    return body ? { ok: true, json: async () => body } : { ok: false, status: 404 };
  };
  const location = { search, pathname: '/holiday-travel/', origin: 'https://chrisizworski.com' };
  const urls = [];
  const history = { replaceState(_s, _t, url) { urls.push(url); const i = url.indexOf('?'); location.search = i >= 0 ? url.slice(i) : ''; } };
  const copied = [];
  const navigator = { clipboard: { writeText: async text => { copied.push(text); } } };
  const context = { document, fetch, setTimeout, location, history, navigator, decodeURIComponent, Date: SimulatedDate, Number, String, Math };
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
    pct: () => Number(document.getElementById('third-stat')['data-p']),
    urls, copied, location
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
test('flying stress-tests an example plan against a deadline, in bands, using route data', async () => {
  const app = await launch();
  assert.equal(app.fetchedUrls[0], '/holiday-travel/data/national.json');
  assert.ok(app.fetchedUrls.includes('/holiday-travel/data/routes/ORD.json'), 'origin shard loaded');
  assert.match(app.get('best-label').textContent, /chance you miss your Wed 11 PM deadline/);
  assert.match(app.get('rank-intro').textContent, /Chicago.*\(ORD\) → New York.*\(LGA\)/, 'national example: nonstop when one exists');
  assert.match(app.get('rank-intro').textContent, /example plan/);
  assert.match(app.get('third-stat').textContent, /^(under 1%|over 75%|\d+–\d+%)$/, 'shown as a band, not a decimal');
  assert.doesNotMatch(app.get('best-reason').textContent, /\d\.\d%/, 'no false precision in the headline');
  assert.equal(app.urls.length, 0, 'example plan keeps the bare URL');
  const html = app.get('results').innerHTML;
  for (const part of ['Where the risk comes from', 'If it’s cancelled', 'flights a day', 'Ways to lower the odds', 'First flight of the day', '/flight-tracker/', 'class="strip"']) assert.ok(html.includes(part), part);
  assert.doesNotMatch(html, /Missed connection/, 'nonstop has no connection risk');
  assert.doesNotMatch(html, /TSA|screened|\d\.\d%/);
});

test('deadline, departure time, route and connection all move the odds', async () => {
  const app = await launch();
  await app.change('home', 'DTW'); await app.change('away', 'MCO');
  assert.match(app.get('rank-intro').textContent, /Detroit.*Orlando/);
  assert.doesNotMatch(app.get('rank-intro').textContent, /example plan/, 'any edit ends example mode');
  assert.ok(app.urls.at(-1).includes('from=DTW') && app.urls.at(-1).includes('via=nonstop'), 'plan written to the URL');
  await app.change('dep-day', '-1'); await app.change('dep-time', '17');
  await app.change('due-day', '0'); await app.change('due-time', '14');
  const loose = app.pct();
  await app.change('due-day', '-1'); await app.change('due-time', '22');
  const tight = app.pct();
  assert.ok(tight > loose * 3, `tight ${tight} vs loose ${loose}`);
  assert.ok(loose >= 0 && loose < 0.05 && tight > 0, 'numbers available for comparison');
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
  assert.match(app.get('best-label').textContent, /your Sun 11 PM deadline/);
  assert.match(app.get('rank-intro').textContent, /New York.*→.*Chicago/);
  assert.equal(app.get('due-label').textContent, 'Must be home by');
});

test('Christmas plans use Christmas history and offer fixes for a fragile plan', async () => {
  const app = await launch();
  await app.click('christmas');
  assert.match(app.get('best-label').textContent, /your Christmas Eve 12 PM deadline/);
  await app.change('home', 'MBS'); await app.change('away', 'MCO');
  await app.change('routing', 'ORD');
  await app.change('dep-day', '-1'); await app.change('dep-time', '7');
  await app.change('due-day', '-1'); await app.change('due-time', '20');
  assert.match(app.get('best-label').textContent, /your Christmas Eve 8 PM deadline/);
  assert.ok(app.pct() > 0.05);
  assert.match(app.get('results').innerHTML, /times as long<\/strong> in 2022/, 'meltdown-year rebooking is called out');
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
  // Keep the Chicago warning airport as origin, but use a distinct destination.
  await storm.change('away', 'DTW');
  assert.match(storm.get('live-panel').innerHTML, /Winter Storm Warning/);
  assert.match(storm.get('live-panel').innerHTML, /worst past season/);
});

test('a shared link restores the exact plan, and copying produces that link', async () => {
  const q = '?h=xm&m=fly&d=home&from=DTW&to=LGA&via=nonstop&lay=60&dep=2.18&due=3.8';
  const app = await launch('2026-10-19', { search: q });
  assert.match(app.get('holiday-stat').textContent, /Christmas/);
  assert.equal(app.get('due-label').textContent, 'Must be home by');
  assert.match(app.get('rank-intro').textContent, /New York.*LGA.*→.*Detroit/);
  assert.match(app.get('rank-intro').textContent, /6 PM/);
  assert.doesNotMatch(app.get('rank-intro').textContent, /example plan/);
  app.get('share-plan').handlers.click();
  await app.settle();
  assert.equal(app.copied.length, 1);
  assert.equal(app.copied[0], 'https://chrisizworski.com/holiday-travel/' + q);
  const bad = await launch('2026-10-19', { search: '?from=<script>&dep=x&h=zz' });
  assert.match(bad.get('rank-intro').textContent, /Chicago.*LGA/, 'junk parameters are ignored');
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


test('calendar reads published comparison, selects a departure without moving the deadline, and tracks reversals', async () => {
  const app = await launch();
  const grid = app.get('calendar-days');
  assert.match(grid.innerHTML, /Thu, Nov 26/);
  assert.match(grid.innerHTML, /3%/);
  assert.match(grid.innerHTML, /13%/);
  const due = [app.get('due-day').value, app.get('due-time').value];
  const original = app.pct();
  async function pick(offset) {
    grid.handlers.click({target:{closest: () => ({getAttribute: () => String(offset)})}});
    await app.settle();
  }
  await pick(-4);
  assert.equal(app.get('dep-day').value, '-4');
  assert.deepEqual([app.get('due-day').value, app.get('due-time').value], due);
  assert.notEqual(app.pct(), original);
  assert.match(grid.innerHTML, /data-calendar-offset="-4"[^>]*aria-pressed="true"/);
  assert.match(app.get('calendar-selection').textContent, /Sun, Nov 22/);
  await pick(-1);
  assert.equal(app.pct(), original);
  await app.click('christmas');
  assert.match(grid.innerHTML, /Sat, Dec 26/);
  assert.match(grid.innerHTML, /17%/);
  await app.change('travel-year','2027');
  assert.match(grid.innerHTML, /Sun, Dec 26/);
  await app.click('drive');
  assert.equal(app.get('flight-calendar').hidden,true);
  await app.click('fly');
  assert.equal(app.get('flight-calendar').hidden,false);
});

test('same-airport selection clears the previous probability and weather verdict', async () => {
  const app = await launch('2026-11-20');
  assert.ok(Number.isFinite(app.pct()));
  await app.change('away','ORD');
  assert.equal(app.get('best-label').textContent,'Choose two different airports');
  assert.ok(Number.isNaN(app.pct()));
  assert.equal(app.get('live-panel').innerHTML,'');
  assert.equal(app.get('third-stat').textContent,'Unavailable');
});


test('try a lower-risk itinerary and restore the original trip without changing its deadline', async () => {
  const app = await launch();
  const original = app.pct();
  const fields = ['dep-day','dep-time','routing','layover','due-day','due-time'];
  const saved = fields.map(id => app.get(id).value);
  const results = app.get('results');
  assert.match(results.innerHTML, /data-apply-fix="0"/);
  assert.equal(app.get('plan-compare').hidden, true);
  results.handlers.click({target:{closest: () => ({getAttribute: () => '0'})}});
  await app.settle();
  assert.ok(app.pct() < original, 'applying a modeled fix must actually lower risk');
  assert.deepEqual(fields.slice(-2).map(id => app.get(id).value), saved.slice(-2));
  assert.equal(app.get('plan-compare').hidden, false);
  assert.match(app.get('compare-content').innerHTML, /Original/);
  assert.match(app.get('compare-content').innerHTML, /Current/);
  assert.match(app.get('compare-content').innerHTML, /Lower modeled risk/);
  assert.ok(app.urls.at(-1).includes('due='+saved[4]+'.'+saved[5]));
  await app.click('restore-plan');
  assert.equal(app.pct(), original);
  assert.deepEqual(fields.map(id => app.get(id).value), saved);
  assert.equal(app.get('plan-compare').hidden, true);
  results.handlers.click({target:{closest: () => ({getAttribute: () => '0'})}});
  await app.settle();
  assert.equal(app.get('plan-compare').hidden, false);
  await app.change('due-time','22');
  assert.equal(app.get('plan-compare').hidden, true, 'manual edits start a fresh comparison');
});

test('late-by-schedule plan offers a recoverable alternative when history supports one', async () => {
  const app = await launch();
  await app.change('due-time','18');
  assert.equal(app.pct(),1);
  const results=app.get('results');
  assert.match(results.innerHTML,/data-apply-fix="0"/);
  results.handlers.click({target:{closest: () => ({getAttribute: () => '0'})}});
  await app.settle();
  assert.ok(app.pct()<1);
  assert.match(app.get('compare-content').innerHTML,/100%/);
  await app.click('restore-plan');
  assert.equal(app.pct(),1);
});


test('FAA check is on demand, scoped to the selected route and never changes BTS odds',async()=>{
  const faa={status:'available',checkedAt:'2026-11-24T12:00:00Z',events:[
    {airport:'ORD',label:'Ground stop',reason:'Snow',start:'2026-11-24T11:00:00Z',end:'2026-11-24T13:00:00Z',updatedAt:'2026-11-24T11:55:00Z',averageMinutes:null,maximumMinutes:null,minimumMinutes:null},
    {airport:'LGA',label:'Arrival delay',reason:'Volume',averageMinutes:30,maximumMinutes:null,minimumMinutes:null},
    {airport:'MCO',label:'Airport closure notice',reason:'OTHER AIRPORT',averageMinutes:null,maximumMinutes:null,minimumMinutes:null}
  ]};
  const app=await launch('2026-11-24',{faa});
  const before=app.pct();
  assert.ok(!app.fetchedUrls.some(u=>u.includes('view=faa')));
  await app.click('faa-refresh');
  assert.match(app.get('faa-status').innerHTML,/Ground stop/);
  assert.match(app.get('faa-status').innerHTML,/Arrival delay/);
  assert.doesNotMatch(app.get('faa-status').innerHTML,/OTHER AIRPORT/);
  assert.equal(app.pct(),before);
  await app.change('away','MCO');
  assert.match(app.get('faa-status').innerHTML,/OTHER AIRPORT/);
  assert.doesNotMatch(app.get('faa-status').innerHTML,/Arrival delay/);
  assert.equal(app.fetchedUrls.filter(u=>u.includes('view=faa')).length,1);
  await app.click('drive');
  assert.equal(app.get('faa-panel').hidden,true);
});

test('FAA outage and stale snapshot never imply clear airports',async()=>{
  const app=await launch('2026-11-24');
  await app.click('faa-refresh');
  assert.match(app.get('faa-status').innerHTML,/unavailable/);
  const stale=await launch('2026-11-24',{faa:{status:'available',checkedAt:'2026-11-24T11:30:00Z',events:[]}});
  await stale.click('faa-refresh');
  assert.match(stale.get('faa-status').innerHTML,/out of date/);
  assert.doesNotMatch(stale.get('faa-status').innerHTML,/No event listed/);
});


test('departure dashboard reflects trip date, route, historical recovery and independent source states',async()=>{
 const app=await launch('2026-11-24',{faa:{status:'available',checkedAt:'2026-11-24T12:00:00Z',events:[{airport:'ORD',label:'Ground stop',reason:'Snow',averageMinutes:null,minimumMinutes:null,maximumMinutes:null}]}});
 assert.match(app.get('dashboard-route').textContent,/ORD.*LGA/);
 assert.match(app.get('dashboard-stage').textContent,/Departure tomorrow/);
 assert.match(app.get('dashboard-timing').innerHTML,/Arrival deadline/);
 assert.match(app.get('dashboard-recovery').textContent,/hours late if cancelled/);
 assert.equal(app.get('dashboard-faa').textContent,'Not checked');
 const risk=app.pct();
 await app.click('dashboard-refresh');
 assert.match(app.get('dashboard-faa').textContent,/FAA notices: ORD/);
 assert.equal(app.pct(),risk);
 await app.click('dashboard-copy');
 assert.match(app.copied.at(-1),/y=2026#departure-dashboard$/);
 await app.change('away','ORD');
 assert.equal(app.get('dashboard-route').textContent,'Flight route');
 assert.equal(app.get('dashboard-recovery').textContent,'No estimate yet');
 assert.equal(app.get('dashboard-refresh').disabled,true);
 await app.click('drive');
 assert.equal(app.get('departure-dashboard')['data-mode'],'drive');
});
test('dashboard never calls missing weather data clear and can restore a pinned prior-year plan',async()=>{
 const outage=await launch('2026-11-24',{nws:()=>null});
 assert.equal(outage.get('dashboard-weather').textContent,'NWS unavailable');
 assert.doesNotMatch(outage.get('live-panel').innerHTML,/Nothing notable/);
 const reopened=await launch('2027-01-02',{search:'?h=th&m=fly&d=there&from=ORD&to=LGA&via=nonstop&lay=60&dep=-1.17&due=-1.23&y=2026'});
 assert.equal(reopened.get('holiday-stat').textContent,'Thanksgiving 2026');
 assert.equal(reopened.get('dashboard-weather').textContent,'Past departure date');
});

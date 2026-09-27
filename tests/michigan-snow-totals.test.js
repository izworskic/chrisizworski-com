const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const api = require('../api/michigan-snow-totals.js');
const { normalize, largestPerPlace, summarize, OFFICES } = api._test;
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/michigan-snow-totals/index.html'), 'utf8');

// Shapes copied from real IEM Local Storm Report properties (Michigan, January 2026).
const raw = (over) => ({ typetext: 'SNOW', magnitude: '17', unit: 'Inch', qualifier: 'M', city: 'Barron Lake', county: 'Cass', wfo: 'IWX',
  source: 'Cocorahs', remark: 'Cocorahs station MI-CS-5 Niles 3.5 E.', lat: 41.8, lon: -86.2, valid: '2026-01-15T14:00:00Z',
  product_id: '202601151410-KIWX-NWUS53-LSRIWX', ...over });

test('reports keep the observer figure, time, source and measured status', () => {
  const r = normalize(raw());
  assert.equal(r.inches, 17);
  assert.equal(r.measured, true);
  assert.equal(r.reportedAt, '2026-01-15T14:00:00.000Z');
  assert.match(r.productUrl, /mesonet\.agron\.iastate\.edu\/p\.php\?pid=202601151410/);
  assert.equal(normalize(raw({ qualifier: 'E' })).measured, false);
  // String magnitudes are parsed, bad rows are dropped rather than guessed.
  assert.equal(normalize(raw({ magnitude: '12.9' })).inches, 12.9);
  assert.equal(normalize(raw({ magnitude: 'T' })), null);
  assert.equal(normalize(raw({ lat: null })), null);
  assert.equal(normalize(raw({ valid: 'not a date' })), null);
});

test('each place ranks once, at its largest report', () => {
  const rows = [raw({ magnitude: '6', valid: '2026-01-15T02:00:00Z' }), raw(), raw({ magnitude: '16.4', city: 'Niles', county: 'Berrien' })].map(normalize);
  const ranked = largestPerPlace(rows);
  assert.deepEqual(ranked.map(r => `${r.place}:${r.inches}`), ['Barron Lake:17', 'Niles:16.4']);
});

test('windows filter by report time and never relabel a figure as a 24-hour total', () => {
  const now = Date.parse('2026-01-16T15:00:00Z');
  const rows = [raw(), raw({ city: 'Old', magnitude: '30', valid: '2026-01-10T12:00:00Z' })].map(normalize);
  const w = summarize(rows, now);
  assert.equal(w['24h'].placeCount, 0);
  assert.equal(w['48h'].largest.place, 'Barron Lake');
  assert.equal(w['168h'].largest.place, 'Old', '7-day window includes the older report');
  assert.equal(w['48h'].byOffice[0].office, 'IWX');
  assert.deepEqual(Object.keys(OFFICES).sort(), ['APX', 'DTX', 'GRR', 'IWX', 'MQT']);
});

test('page is a self-canonical, byline-bearing search surface', () => {
  const title = html.match(/<title>([^<]+)<\/title>/)[1];
  const desc = html.match(/name="description" content="([^"]+)"/)[1];
  assert.ok(title.length <= 60 && title.includes('Chris Izworski') && /Michigan Snow Totals Today/.test(title));
  assert.ok(desc.length <= 158);
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/michigan-snow-totals\/">/);
  assert.equal((html.match(/application\/ld\+json/g) || []).length, 1);
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  assert.ok(graph.some(n => n['@type'] === 'Person' && n['@id'] === 'https://chrisizworski.com/#person'), 'Person node is defined, not only referenced');
  assert.match(html, /© 2026 Chris Izworski/);
  assert.match(html, /leaflet\.css" integrity="sha256-p4NxAoJBhIIN\+hmNHrzRCf9tD\/miZyoHS5obTRR9BMY="/);
  assert.match(html, /leaflet\.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2\/Z9VM\+kNiyxNV1lvTlZBo="/);
  assert.doesNotMatch(html, /[–—]/);
  assert.doesNotMatch(html, /<ins class="adsbygoogle"/, 'ads come only from the in-article placer');
  // Every visible FAQ answer matches its structured-data copy.
  const faq = graph.find(n => n['@type'] === 'FAQPage').mainEntity;
  for (const q of faq) assert.ok(html.includes(`<p>${q.acceptedAnswer.text.replace(/'/g, "'")}</p>`), q.name);
});

test('registry owns the snowfall intent without competing with snowpack', () => {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'benchmarks/tool-network-registry.json'), 'utf8'));
  const node = registry.tools.find(t => t.id === 'michigan-snow-totals');
  assert.equal(node.canonical, 'https://chrisizworski.com/michigan-snow-totals/');
  const group = registry.cannibalizationGroups.find(g => g.owner === 'michigan-snow-totals');
  assert.ok(group.supports.includes('national-snow'));
  assert.match(group.rule, /doorway/);
});

// ---- Persona rebuild: shared core, season view, static tables ----
const core = require('../public/assets/snow-totals-core.js');
const places = require('../public/assets/michigan-places.json').places;
const climo = require('../data/michigan-snow-climatology.json');
const storm = require('./fixtures/snow-lsr-2025-11-30-storm.json');
const acisFixture = require('./fixtures/snow-acis-2025-07-01-to-2025-11-30.json');
const stormNow = Date.parse(storm.now);
const stormReports = storm.properties.map(normalize).filter(Boolean);

async function withRecordedNetwork(fn) {
  const realFetch = global.fetch, realNow = Date.now;
  Date.now = () => stormNow;
  global.fetch = async (url) => {
    const u = String(url), ok = body => ({ ok: true, status: 200, json: async () => body });
    if (u.includes('mesonet')) return ok({ features: storm.properties.map(properties => ({ properties })) });
    if (u.includes('weather.gov')) return ok({ features: [] });
    if (u.includes('rcc-acis')) return ok(acisFixture.response);
    throw new Error(u);
  };
  try { return await fn(); } finally { global.fetch = realFetch; Date.now = realNow; }
}
function call(query) {
  return withRecordedNetwork(async () => {
    let status, body;
    await api({ method: 'GET', query }, { setHeader() {}, status(c) { status = c; return this; }, json(b) { body = b; return this; } });
    return { status, body };
  });
}

test('every Michigan county sits in exactly one region, and snow-belt regions match the snowmobile tool', async () => {
  const counties = places.filter(p => p[3] === 'c').map(p => p[0]);
  assert.equal(counties.length, 83);
  for (const c of counties) assert.ok(core.regionOf(c), c);
  assert.equal(core.REGIONS.flatMap(r => r.counties).length, 83);
  const { REGIONS } = await import('../lib/snowmobile/regions.mjs');
  for (const [key, id] of [['keweenaw-copper-country', 'keweenaw'], ['central-western-up', 'central-western-up'], ['eastern-up', 'eastern-up']]) {
    assert.deepEqual(REGIONS.find(r => r.key === key).counties.map(core.normCounty).sort(), core.regionById(id).counties.map(core.normCounty).sort(), key);
  }
  for (const r of core.REGIONS) for (const t of r.trails) assert.ok(fs.existsSync(path.join(root, 'public', t.href)), t.href);
});

test('the API sends every reporting place with its region and a clean source name', async () => {
  const { status, body } = await call({});
  assert.equal(status, 200);
  const places = new Set(stormReports.map(r => `${r.place}|${r.county}`));
  assert.equal(new Set(body.reports.map(r => `${r.place}|${r.county}`)).size, places.size);
  assert.ok(places.size > 60, 'fixture is a real storm week');
  assert.equal(core.sourceLabel('Cocorahs'), 'CoCoRaHS observer');
  assert.ok(body.reports.every(r => r.region || !/^[A-Z][a-z]/.test(r.county) || r.county === 'Elkhart'));
});

test('town search: own report, nearest reports when a town has none, county, and unknown', () => {
  const rows = core.rowsFor(stormReports, '48h', stormNow);
  const rockford = core.findTown('rockford, mi', rows, places);
  assert.equal(rockford.kind, 'town');
  assert.equal(rockford.rows[0].inches, 12);
  const bay = core.findTown('Bay City', rows, places);
  assert.ok(['town', 'nearby'].includes(bay.kind));
  const tc = core.findTown('Traverse City', rows, places);
  assert.equal(tc.kind, 'nearby');
  assert.ok(tc.nearby.length && tc.nearby.every(n => n.miles <= 25));
  const kent = core.findTown('Kent County', rows, places);
  assert.equal(kent.kind, 'county');
  assert.ok(kent.rows.every(r => r.county === 'Kent'));
  assert.equal(core.findTown('Zzyzx', rows, places).kind, 'unknown');
  assert.equal(core.prettyPlace('4 WSW Bates'), '4 mi WSW of Bates');
  assert.equal(core.lookupPlace('paradise', places).name, 'Paradise Township, Grand Traverse County', 'ambiguous township names say which county they mean');
});

test('season view compares station totals with normal and never fakes a percentage', async () => {
  const { status, body } = await call({ view: 'season' });
  assert.equal(status, 200);
  assert.equal(body.season.label, '2025-26');
  assert.equal(body.season.through, '2025-11-30');
  assert.equal(body.season.stations.length, climo.stations.length);
  assert.ok(body.season.anySnow);
  assert.ok(body.season.firstOfSeason.date >= '2025-07-01');
  for (const s of body.season.stations) {
    if (s.pctOfNormal != null) assert.ok(s.complete && s.normal >= 2);
  }
  const gappy = core.seasonStation(Array.from({ length: 20 }, (_, i) => ['2026-01-' + String(i + 1).padStart(2, '0'), i < 6 ? 'M' : '2.0', '1.0']));
  assert.equal(gappy.complete, false);
  assert.equal(gappy.pctOfNormal, null);
  const summer = core.seasonStation([['2026-07-02', 'M', '0.0'], ['2026-07-03', '0.0', '0.0']]);
  assert.equal(summer.missing, 0, 'a missing July day cannot hide snow');
  assert.equal(body.lastSeason.stations.length, climo.stations.length);
});

test('static first-snow and last-season tables match the computed data, and the copy cites the right counts', async () => {
  const { tablesHtml } = await import('../scripts/build-snow-reference-data.mjs');
  const t = tablesHtml(climo);
  const between = key => html.split(`<!-- ${key}:start -->`)[1].split(`<!-- ${key}:end -->`)[0].trim();
  assert.equal(between('snow-first'), t.first);
  assert.equal(between('snow-last-season'), t.last);
  const n = climo.stations.length;
  assert.ok(html.includes(`at ${n} National Weather Service`) && html.includes(`final season totals at ${n} stations`));
  const herman = climo.stations.find(s => s.id === '203744');
  assert.ok(html.includes(`${herman.lastSeason.total} inches at Herman`) && html.includes(`${herman.lastSeason.pctOfNormal} percent of normal`));
  const long = md => md.replace(/^Sep/, 'September').replace(/^Oct/, 'October').replace(/^Nov/, 'November').replace(/^Dec/, 'December');
  assert.ok(html.includes(`around ${long(climo.stations.find(s => s.id === '205184').firstSnow.median)} at the Marquette NWS office`));
  assert.ok(html.includes(`${long(herman.firstSnow.median)} at Herman`) && html.includes(`${long(herman.firstSnow.earliest)}, at Herman`));
  assert.ok(html.indexOf('id="townSearch"') < html.indexOf('class="lede"'), 'town search sits under the H1');
});

test('persona benchmark holds at zero loss', () => {
  const { execFileSync } = require('node:child_process');
  execFileSync(process.execPath, [path.join(root, 'scripts/benchmark-snow-totals-personas.mjs'), '--check'], { stdio: 'pipe' });
});

test('review fixes: since-yesterday starts at Eastern midnight, same-name towns, partial names, trailing state only', () => {
  // 10 a.m. EST Tuesday Jan 13 2026 -> midnight Monday Jan 12 EST (05:00Z), not 10 a.m. Sunday.
  assert.equal(new Date(core.windowStart('48h', Date.parse('2026-01-13T15:00:00Z'))).toISOString(), '2026-01-12T05:00:00.000Z');
  // Across the fall-back change: 11:30 p.m. EST Nov 1 -> midnight Oct 31 EDT (04:00Z).
  assert.equal(new Date(core.windowStart('48h', Date.parse('2026-11-02T04:30:00Z'))).toISOString(), '2026-10-31T04:00:00.000Z');
  assert.equal(core.cleanQuery('Lake Michigan Beach'), 'lake michigan beach');
  assert.equal(core.cleanQuery('Grand Rapids, MI 49503'), 'grand rapids');
  const choose = core.findTown('Grand', [], places);
  assert.equal(choose.kind, 'choose');
  assert.ok(choose.choices.includes('Grand Rapids'));
  // A "Bear Lake" report 100+ miles from the Bear Lake the gazetteer resolves is not that town's own report.
  const far = { place: 'Bear Lake', county: 'Kalkaska', lat: 44.6, lon: -85.0, inches: 5, reportedAt: '2026-01-13T12:00:00Z' };
  const bear = core.lookupPlace('bear lake', places);
  assert.ok(core.milesBetween(bear.lat, bear.lon, far.lat, far.lon) > 15);
  assert.notEqual(core.findTown('Bear Lake', [far], places).kind, 'town');
  assert.equal(core.seasonStation([['2026-01-01', '1.0', '0.5']]).pctNote, 'too early');
});

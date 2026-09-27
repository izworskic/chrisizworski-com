#!/usr/bin/env node
// Persona benchmark for Michigan Snow Totals: the loss function the tool is
// built against. Each check is a task a real visitor brings to the page,
// weighted by how often that task shows up in search demand (Google
// autocomplete, Sep 26 2026: today 148, yesterday 123, this season 77, map 74,
// U.P. 44, first snow 32 of 894 Michigan snow suggestions). Checks run the real
// API handler and the shared browser logic against recorded official data
// (tests/fixtures), not against hand-made numbers.
//
//   node scripts/benchmark-snow-totals-personas.mjs            report
//   node scripts/benchmark-snow-totals-personas.mjs --check    fail if loss > target
//
// loss = 100 - score. The baseline row in benchmarks/snow-totals-personas.json
// is the first build of the tool, scored before this rebuild.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const read = rel => { try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch { return ''; } };
const tryRequire = rel => { try { return require(path.join(root, rel)); } catch { return null; } };
const exists = rel => fs.existsSync(path.join(root, rel));

const html = read('public/michigan-snow-totals/index.html');
const js = read('public/assets/michigan-snow-totals.js');
const core = tryRequire('public/assets/snow-totals-core.js');
const places = (tryRequire('public/assets/michigan-places.json') || {}).places || [];
const climo = tryRequire('data/michigan-snow-climatology.json');
const storm = JSON.parse(read('tests/fixtures/snow-lsr-2025-11-30-storm.json'));
const acisFixture = JSON.parse(read('tests/fixtures/snow-acis-2025-07-01-to-2025-11-30.json'));
const NOW = Date.parse(storm.now);

// Run the real handler with the network replaced by recorded responses.
async function callApi(query = {}, { failLsr = false, failAlerts = false, lsr = storm.properties } = {}) {
  const realFetch = globalThis.fetch, realNow = Date.now;
  Date.now = () => NOW;
  globalThis.fetch = async (url) => {
    const u = String(url);
    const ok = body => ({ ok: true, status: 200, json: async () => body });
    if (u.includes('mesonet.agron.iastate.edu')) {
      if (failLsr) return { ok: false, status: 502, json: async () => ({}) };
      const sts = Date.parse(new URL(u).searchParams.get('sts')), ets = Date.parse(new URL(u).searchParams.get('ets'));
      return ok({ features: lsr.filter(p => { const t = Date.parse(p.valid); return t >= sts && t <= ets; }).map(properties => ({ properties })) });
    }
    if (u.includes('api.weather.gov')) return failAlerts ? { ok: false, status: 500, json: async () => ({}) } : ok({ features: [] });
    if (u.includes('rcc-acis.org')) return ok(acisFixture.response);
    throw new Error('unexpected fetch ' + u);
  };
  try {
    delete require.cache[path.join(root, 'api/michigan-snow-totals.js')];
    const handler = require(path.join(root, 'api/michigan-snow-totals.js'));
    let status = 0, body = null;
    const res = { setHeader() {}, status(c) { status = c; return this; }, json(b) { body = b; return this; } };
    await handler({ method: 'GET', query, url: '/api/michigan-snow-totals?' + new URLSearchParams(query) }, res);
    return { status, body };
  } catch (e) { return { status: 0, body: null, error: e }; }
  finally { globalThis.fetch = realFetch; Date.now = realNow; }
}

const checks = [];
const add = (persona, points, label, fn) => checks.push({ persona, points, label, fn });
const safe = async fn => { try { return Boolean(await fn()); } catch { return false; } };

const live = await callApi();
const reports = live.body?.reports || [];
const rows24 = () => core.rowsFor(reports, '48h', NOW);
const idx = s => html.indexOf(s);

// A. Storm-morning resident: "how much snow did my town get?" (30)
add('resident', 5, 'API carries every place that reported this week, not a top-N slice', () => {
  const fixturePlaces = new Set(storm.properties.filter(p => Number.parseFloat(p.magnitude) >= 0).map(p => `${p.city}|${p.county}`.toLowerCase()));
  const apiPlaces = new Set(reports.map(r => `${r.place}|${r.county}`.toLowerCase()));
  return fixturePlaces.size > 60 && apiPlaces.size === fixturePlaces.size;
});
add('resident', 5, 'a town that reported is found by name, in any case, with inches and time', () => {
  const rows = rows24(); const top = rows.find(r => !/\d/.test(r.place));
  const hit = core.findTown(top.place.toUpperCase() + ', MI', rows, places);
  return hit.kind === 'town' && hit.rows[0].inches === top.inches && hit.rows[0].reportedAt;
});
add('resident', 8, 'a town with no report of its own gets the nearest reports with distance and direction', () => {
  const rows = rows24();
  const town = ['Bay City', 'Traverse City', 'Mount Pleasant', 'Midland', 'Lansing', 'Ann Arbor'].find(t => !rows.some(r => core.baseTown(r.place) === core.normName(t)));
  const hit = core.findTown(town, rows, places);
  return hit.kind === 'nearby' && hit.nearby.length >= 1 && hit.nearby.every(n => n.miles <= 25 && /^[NSEW]{1,2}$/.test(n.dir));
});
add('resident', 3, 'a county search returns that county\'s reports', () => {
  const rows = rows24(); const county = rows[0].county;
  const hit = core.findTown(county + ' County', rows, places);
  return hit.kind === 'county' && hit.rows.length && hit.rows.every(r => r.county === county);
});
add('resident', 3, '"near me" finds the closest reports from a location', () => {
  const rows = rows24(); const n = core.nearest(42.96, -85.67, rows, 3);
  return n.length === 3 && n[0].miles <= n[1].miles && n[1].miles <= n[2].miles && html.includes('id="nearMe"') && js.includes('geolocation');
});
// A phone shows about 800px: the box has to sit directly under the H1, ahead of the lede and the map.
// (First build of this check only required "before the map" and passed while the box sat at y=1007 on a 390x844 phone.)
add('resident', 4, 'the town box sits directly under the H1, so a phone sees it without scrolling', () =>
  idx('id="townSearch"') > idx('<h1>') && idx('id="townSearch"') < idx('class="lede"') && idx('id="townSearch"') < idx('id="snowMap"'));

// B. "Yesterday" searcher (10)
add('yesterday', 3, 'the 48-hour view says it covers yesterday', () => /data-window="48h"[^>]*>[^<]*yesterday/i.test(html));
add('yesterday', 3, 'every figure shows how long ago it was reported', () => core.relTime('2025-12-01T12:00:00Z', NOW) === '3 hr ago' && js.includes('relTime('));
add('yesterday', 3, 'a shared link reopens the same town and window', () => {
  const p = core.parseParams('?town=Marquette&window=48h&region=eastern-up');
  return p.town === 'Marquette' && p.window === '48h' && p.region === 'eastern-up' && js.includes('location.search');
});

// C. Snowmobiler or skier planning a weekend (25)
add('recreation', 5, 'all 83 Michigan counties belong to exactly one region', () => {
  const counties = places.filter(p => p[3] === 'c').map(p => p[0]);
  const hits = core.REGIONS.flatMap(r => r.counties);
  return counties.length === 83 && counties.every(c => core.regionOf(c)) && new Set(hits.map(core.normCounty)).size === 83 && hits.length === 83;
});
add('recreation', 4, 'every Michigan report carries its region', () => reports.length && reports.filter(r => /^[A-Z][a-z]/.test(r.county) && r.county !== 'Elkhart').every(r => r.region));
add('recreation', 4, 'snow-belt regions match the snowmobile tool county for county', async () => {
  const { REGIONS: sm } = await import(path.join(root, 'lib/snowmobile/regions.mjs'));
  const pairs = { 'keweenaw-copper-country': 'keweenaw', 'central-western-up': 'central-western-up', 'eastern-up': 'eastern-up' };
  return Object.entries(pairs).every(([smKey, id]) => {
    const a = sm.find(r => r.key === smKey).counties.map(core.normCounty).sort().join();
    const b = core.regionById(id).counties.map(core.normCounty).sort().join();
    return a === b;
  });
});
add('recreation', 5, 'the "fell is not on the ground" hand-off to depth, trails and XC sits above the map', () => {
  const block = html.slice(idx('id="headingOut"'), idx('id="snowMap"'));
  return idx('id="headingOut"') > 0 && ['/national-tools/snow/', '/snowmobile/', '/michigan-cross-country-skiing/'].every(h => block.includes(`href="${h}"`));
});
add('recreation', 4, 'every snow-belt region hands off to a snowmobile region page that exists', () =>
  core.REGIONS.slice(0, 6).every(r => r.trails.length && r.trails.every(t => exists('public' + t.href))));
add('recreation', 3, 'region filter is on the page and in shareable links', () => html.includes('id="regionChips"') && js.includes('byRegion(') && js.includes("'region'"));

// D. "Is this a lot? How much this season?" and "when is the first snow?" (20)
const season = await callApi({ view: 'season' });
add('season', 5, 'season view returns station totals against the 1991-2020 normal', () => {
  const s = season.body?.season?.stations || [];
  return season.status === 200 && s.length >= 40 && s.some(x => x.pctOfNormal != null) && s.every(x => typeof x.total === 'number' && 'normal' in x);
});
add('season', 3, 'stations with missing snow-season days never get a percent of normal', () => {
  const rows = []; for (let i = 0; i < 30; i++) rows.push([`2025-12-${String(i + 1).padStart(2, '0')}`, i < 8 ? 'M' : '1.0', '1.0']);
  const s = core.seasonStation(rows); return s.complete === false && s.pctOfNormal === null && s.missing === 8;
});
add('season', 3, 'season stations cover every region at least twice', () => climo && core.REGIONS.every(r => climo.stations.filter(s => s.region === r.id).length >= 2));
add('season', 4, 'first-snow dates are a static, crawlable table that matches the computed data', () => {
  if (!climo) return false;
  const body = html.slice(idx('<!-- snow-first:start -->'), idx('<!-- snow-first:end -->'));
  const withFirst = climo.stations.filter(s => s.firstSnow);
  return withFirst.length >= 12 && (body.match(/<tr>/g) || []).length === withFirst.length && withFirst.every(s => body.includes(s.firstSnow.median));
});
add('season', 3, 'before the first snow, the page says so and shows last winter instead', () => {
  const body = html.slice(idx('<!-- snow-last-season:start -->'), idx('<!-- snow-last-season:end -->'));
  return js.includes('anySnow') && climo && (body.match(/<tr /g) || []).length === climo.stations.length;
});
// Before the first storm (the launch weeks), "how much snow did Marquette get" has no report to
// return. The honest answer is the nearest station: nothing yet, when it usually starts, last winter.
add('season', 3, 'before the first snow, a town search still answers from the nearest climate station', () => {
  const s = season.body; if (!s?.season) return false;
  const quiet = { ...s, season: { ...s.season, anySnow: false, firstOfSeason: null, stations: s.season.stations.map(x => ({ ...x, total: 0, first: null, pctOfNormal: null })) } };
  const bay = core.lookupPlace('bay city', places);
  const x = core.stationContext(bay.lat, bay.lon, quiet);
  return x && x.miles < 25 && x.season && x.season.anySnow === false && /^[A-Z][a-z]{2} \d{1,2}$/.test(x.firstSnowNormal?.median || '') &&
    typeof x.lastSeason?.total === 'number' && js.includes('stationContext(');
});
add('season', 2, 'a tiny normal (early season) never produces a silly percentage', () => core.seasonStation([['2025-10-01', '0.5', '0.1']]).pctOfNormal === null);

// E. Sharer (8)
add('sharer', 4, 'share text names the place, inches, measured or estimated, source and time', () => {
  const r = rows24()[0]; const t = core.shareText(r); const u = core.shareUrl('https://chrisizworski.com/michigan-snow-totals/', { town: r.place, window: '48h' });
  return t.includes(core.prettyPlace(r.place)) && t.includes(core.inches(r.inches)) && /measured|estimated/.test(t) && t.includes(core.sourceLabel(r.source)) && /town=/.test(u) && /window=48h/.test(u);
});
add('sharer', 4, 'a share button is on the page and uses the phone share sheet or the clipboard', () => html.includes('id="shareBtn"') && js.includes('navigator.share') && js.includes('clipboard'));

// F. Trust guardrails (7)
add('trust', 2, 'NWS source names are cleaned up (CoCoRaHS, co-op)', () =>
  core.sourceLabel('Cocorahs') === 'CoCoRaHS observer' && core.sourceLabel('CO-OP Observer') === core.sourceLabel('Co-Op Observer'));
add('trust', 2, 'a quiet week labels old dots with the day they are from', () => js.includes('Showing the last day snow was reported'));
add('trust', 3, 'a dead report feed says so; a dead alert feed does not take the page down', async () => {
  const dead = await callApi({}, { failLsr: true }); const noAlerts = await callApi({}, { failAlerts: true });
  return dead.status === 503 && dead.body?.ok === false && noAlerts.status === 200 && noAlerts.body?.ok === true && noAlerts.body?.degraded === true;
});

const results = [];
for (const c of checks) results.push({ persona: c.persona, points: c.points, label: c.label, pass: await safe(c.fn) });
const score = results.reduce((s, r) => s + (r.pass ? r.points : 0), 0);
const total = results.reduce((s, r) => s + r.points, 0);
if (total !== 100) throw new Error(`weights must sum to 100, got ${total}`);
const byPersona = {};
for (const r of results) { const p = byPersona[r.persona] ||= { score: 0, max: 0 }; p.max += r.points; if (r.pass) p.score += r.points; }
const report = { score, loss: 100 - score, byPersona, failing: results.filter(r => !r.pass).map(r => `${r.persona}: ${r.label} (${r.points})`) };
console.log(JSON.stringify(report, null, 2));

if (process.argv.includes('--check')) {
  const bench = JSON.parse(read('benchmarks/snow-totals-personas.json') || '{}');
  const target = bench.target?.maxLoss ?? 0;
  if (report.loss > target) { console.error(`snow totals persona loss ${report.loss} exceeds target ${target}`); process.exit(1); }
}

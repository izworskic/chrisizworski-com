import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { michiganIceClock } from '../lib/michigan-ice/season.mjs';
import { seasonFor, evidenceFor } from '../lib/michigan-ice/caves.mjs';
import { SITES } from '../lib/michigan-ice/sites.mjs';
import nowHandler from '../api/ice-now.js';
import thermalHandler from '../api/ice.js';
import historyHandler from '../api/ice-history.js';

const site = 'https://chrisizworski.com';
const priorWinter = '2025 335 10 11 12 13 14 15 16\n2026 090 9 8 7 6 5 4 3\n';
const newWinter = '2026 304 99 99 99 99 99 99 99\n2026 305 0 0 1 0 0 0 0.2\n2026 307 90 90 90 90 90 90 90\n';

async function at(iso, currentRows, action) {
  const OriginalDate = globalThis.Date;
  const realFetch = globalThis.fetch;
  class FixedDate extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : [iso])); }
    static now() { return new OriginalDate(iso).getTime(); }
  }
  globalThis.Date = FixedDate;
  globalThis.fetch = async input => {
    const url = String(input);
    if (url.includes('g2025_2026_ice.dat')) return new Response(priorWinter, { status: 200 });
    if (url.includes('g2026_2027_ice.dat'))
      return new Response(currentRows, { status: currentRows ? 200 : 404 });
    if (url.includes('usnic_greatlakes_ice_chart'))
      return new Response(JSON.stringify({ features: [] }), { status: 200 });
    if (url.includes('glicd/daily/')) return new Response('Not ready', { status: 404 });
    throw Error('Deliberately unavailable upstream: ' + url);
  };
  try { return await action(); }
  finally { globalThis.Date = OriginalDate; globalThis.fetch = realFetch; }
}

test('all Michigan ice experiences use November 1 at Detroit local midnight, including DST transition', () => {
  const previous = michiganIceClock(new Date('2026-11-01T03:59:00Z'));
  const first = michiganIceClock(new Date('2026-11-01T04:01:00Z'));
  assert.equal(previous.today, '2026-10-31');
  assert.equal(previous.active, false);
  assert.equal(previous.seasonYear, 2026);
  assert.equal(first.today, '2026-11-01');
  assert.equal(first.active, true);
  assert.equal(first.seasonStart, '2026-11-01');
  assert.equal(first.rolloverWindow, true);
  assert.equal(seasonFor(new Date('2026-11-01T03:59:00Z')).preSeason, true);
  const caveFirst = seasonFor(new Date('2026-11-01T04:01:00Z'));
  assert.equal(caveFirst.preSeason, false);
  assert.equal(caveFirst.through, '2026-10-31');
});

test('Oct 31 and Nov 1 without 2026–27 NOAA data never promote 2025–26 to current', async () => {
  for (const instant of ['2026-11-01T03:59:00Z', '2026-11-01T04:01:00Z']) {
    await at(instant, '', async () => {
      const r = await nowHandler({ url: site + '/api/ice-now?region=saginaw-bay' });
      const v = await r.json();
      assert.equal(v.iceSeason, instant.endsWith('04:01:00Z'));
      assert.equal(v.observed.lakeWide, null);
      assert.equal(v.historical.seasonStartYear, 2025);
      assert.equal(v.historical.series.length, 2);
      assert.equal(v.observed.regions['saginaw-bay'].available, false);
      assert.equal(r.headers.get('cache-control'), 'no-store');
    });
  }
  await at('2026-11-01T04:01:00Z', '', async () => {
    const cold = await (await thermalHandler({ url: site + '/api/ice' })).json();
    assert.equal(cold.cover, null);
    assert.equal(cold.cold.length, 6);
    assert.ok(cold.cold.every(r => r.afdd === null && r.awaitingFirstObservation));
    assert.ok(cold.cold.every(r => r.seasonStart === '2026-11-01'));
    const empty = await historyHandler({ url: site + '/api/ice-history?season=2026' });
    assert.equal(empty.status, 503);
    const archived = await (await historyHandler({ url: site + '/api/ice-history?season=2025' })).json();
    assert.equal(archived.historical, true);
    assert.equal(archived.seasonLabel, '2025–26');
  });
});

test('Nov 2 accepts only dated November observations, rejects October and future rows', async () => {
  await at('2026-11-02T13:00:00Z', newWinter, async () => {
    const data = await (await nowHandler({ url: site + '/api/ice-now?region=saginaw-bay' })).json();
    assert.equal(data.iceSeason, true);
    assert.equal(data.observed.lakeWide.seasonStartYear, 2026);
    assert.deepEqual(data.observed.lakeWide.series.map(r => r.date), ['2026-11-01']);
    assert.equal(data.observed.lakeWide.current.huron, 1);
    assert.equal(data.historical, null);
  });
});

test('after ice season, the archive selects the winter just completed', async () => {
  await at('2027-04-10T15:00:00Z', '2026 305 0 0 1 0 0 0 0.2\n', async () => {
    const data = await (await nowHandler({ url: site + '/api/ice-now?region=saginaw-bay' })).json();
    assert.equal(data.iceSeason, false);
    assert.equal(data.observed.lakeWide, null);
    assert.equal(data.historical.seasonStartYear, 2026);
    assert.deepEqual(data.historical.series.map(r => r.date), ['2026-11-01']);
  });
});

test('caves cannot revive an old formation report on new season day', () => {
  const cave = SITES[0];
  const now = new Date('2026-11-01T13:00:00Z');
  const stale = {
    siteId: cave.id, observedOn: '2026-02-08', publishedOn: '2026-02-08',
    state: 'formed', prime: true, authority: cave.manager, viewingScope: cave.scope, source: cave.source
  };
  const result = evidenceFor(cave, { now, reports: [stale], reviews: [], history: null });
  assert.equal(result.state, 'unconfirmed');
  assert.equal(result.prime, false);
  assert.equal(result.report, null);
});

test('all five surfaces fail closed and retain an independently labeled prior winter inspector', () => {
  const freeze = fs.readFileSync('public/michigan-ice/freeze-up.js', 'utf8');
  const caves = fs.readFileSync('lib/michigan-ice/caves.mjs', 'utf8');
  const bridge = fs.readFileSync('public/assets/mackinac-ice-bridge.js', 'utf8');
  const index = fs.readFileSync('public/national-tools/ice-out/index.html', 'utf8');
  assert.match(freeze, /awaitingNewWinter/);
  assert.match(freeze, /historical NOAA observations, not current conditions/);
  assert.match(freeze, /'America\/Detroit'/);
  const greatLakesClient = fs.readFileSync('public/michigan-ice/ice.js', 'utf8');
  assert.match(greatLakesClient, /timeZone: 'America\\/Detroit', month: 'numeric'/);
  assert.match(caves, /through>=season.start/);
  assert.match(caves, /Keep the day-by-day prior winter inspector available/);
  assert.match(bridge, /seasonOpen && o && o.available/);
  assert.match(bridge, /Archived ice charts are not current Straits conditions/);
  assert.match(index, /lspp-ice-out\.vercel\.app\/north-america\/app\.js/);
  assert.match(index, /Outside that season, use the next spring outlook as planning context/);
});

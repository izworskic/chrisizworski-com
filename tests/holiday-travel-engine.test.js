import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Engine = require('../public/assets/holiday-travel-engine.js');
const dir = 'public/holiday-travel/data';
const nat = JSON.parse(fs.readFileSync(dir + '/national.json', 'utf8'));
const shard = code => JSON.parse(fs.readFileSync(`${dir}/routes/${code}.json`, 'utf8'));
const eng = Engine.create(nat);
for (const c of ['DTW', 'ORD', 'ATL', 'MBS', 'MCO', 'MSP', 'DEN', 'SLC', 'MDW']) eng.addShard(shard(c));
const at = (day, hour) => day * 1440 + hour * 60;

test('dataset: six seasons, route-level shards, coordinates for the live check', () => {
  assert.deepEqual(nat.meta.seasons, [2018, 2019, 2022, 2023, 2024, 2025]);
  assert.ok(nat.meta.windowFlights > 2_500_000);
  assert.ok(nat.meta.routes > 2000);
  assert.equal(nat.meta.xgrid[0], 0);
  const files = fs.readdirSync(dir + '/routes');
  assert.equal(files.length, Object.keys(nat.routes).length, 'one shard per origin in the adjacency list');
  for (const a of nat.airports) assert.ok(Number.isFinite(a.lat) && Number.isFinite(a.lon), a.code + ' needs coordinates');
  for (const [o, dests] of Object.entries(nat.routes)) {
    const s = shard(o);
    for (const d of dests) assert.ok(s.routes[d], `${o}->${d} listed but missing from shard`);
  }
});

test('route matters, not just the airport', () => {
  const p = to => eng.evaluate({ hol: 'xm', from: 'DTW', to, via: null, depart: at(-2, 17), deadline: at(-2, 23) }).p;
  assert.ok(p('ORD') > p('SLC') * 1.5, 'DTW->ORD is much riskier than DTW->SLC on the same evening');
});

test('a tight deadline is riskier than a loose one, and an impossible one says so', () => {
  const base = { hol: 'th', from: 'DTW', to: 'MCO', via: null, depart: at(-1, 17) };
  const tight = eng.evaluate({ ...base, deadline: at(-1, 21) });
  const loose = eng.evaluate({ ...base, deadline: at(0, 14) });
  assert.ok(tight.p > loose.p * 5);
  const late = eng.evaluate({ ...base, deadline: at(-1, 18) });
  assert.equal(late.tooLate, true);
  assert.equal(late.p, 1);
});

test('one-stop trips add misconnect risk and use the hub airport for leg two', () => {
  const r = eng.evaluate({ hol: 'xm', from: 'MBS', to: 'MCO', via: 'DTW', layover: 60, depart: at(-1, 7), deadline: at(-1, 20) });
  assert.equal(r.legs.length, 2);
  assert.equal(r.legs[1].from, 'DTW');
  assert.ok(r.parts.misconnect > 0 && r.misconnectChance > 0);
  const tighter = eng.evaluate({ ...r.plan, layover: 45 });
  assert.ok(tighter.misconnectChance > r.misconnectChance, 'shorter layover, more misconnects');
  assert.ok(Math.abs(r.p - (r.parts.cancel + r.parts.delay + r.parts.misconnect)) < 1e-9);
  const l2 = r.legs[1];
  for (const h of [2, 4, 8, 16]) assert.ok(l2.recOne(h) <= l2.rec(h) + 1e-12, 'one stranded passenger rebooks no slower than a cancelled planeload');
});

test('stranding: a rare regional route recovers far more slowly than a busy trunk route', () => {
  const regional = eng.evaluate({ hol: 'xm', from: 'MBS', to: 'DTW', via: null, depart: at(-1, 7), deadline: at(-1, 20) }).ifCancelled;
  const trunk = eng.evaluate({ hol: 'xm', from: 'ATL', to: 'MCO', via: null, depart: at(-1, 7), deadline: at(-1, 20) }).ifCancelled;
  assert.ok(regional.realisticHours > trunk.realisticHours * 2);
  assert.ok(regional.perDay < trunk.perDay);
  const evening = eng.evaluate({ hol: 'xm', from: 'ATL', to: 'MCO', via: null, depart: at(-1, 19), deadline: at(0, 12) }).ifCancelled;
  assert.ok(evening.overnight > trunk.overnight, 'a cancelled evening flight strands you overnight more often');
});

test('rebooking slows down in meltdown years (queue behind earlier cancellations)', () => {
  const plan = { hol: 'xm', from: 'MDW', to: 'DEN', via: null, depart: at(-2, 17), deadline: at(-1, 18) };
  const r = eng.evaluate(plan);
  assert.ok(r.ifCancelled.worstStretch >= 2, 'MDW rebooking around Dec 23, 2022 took 2x+ longer');
  assert.equal(r.ifCancelled.worstStretchSeason, 2022);
  assert.ok(r.worst > 0.2 && r.median < 0.02, 'calm most years, very bad in 2022');
  const mdw = shard('MDW');
  assert.equal(mdw.recScale.xm.length, 6);
  assert.ok(mdw.recScale.xm.every(row => row.length === 13 && row.every(v => v >= 0.5 && v <= 6)));
});

test('reports the spread across seasons, with 2022 as a bad Christmas', () => {
  const r = eng.evaluate({ hol: 'xm', from: 'MBS', to: 'MCO', via: 'ORD', layover: 60, depart: at(-1, 7), deadline: at(-1, 20) });
  assert.equal(r.perSeason.length, 6);
  assert.ok(r.worst > r.median && r.worst > r.p);
  assert.equal(r.worstSeason, 2022);
});

test('fixes only offer real improvements and never a plan that already misses', () => {
  const plan = { hol: 'xm', from: 'MBS', to: 'MCO', via: 'ORD', layover: 60, depart: at(-1, 7), deadline: at(-1, 20) };
  const base = eng.evaluate(plan);
  const fx = eng.fixes(plan, base);
  assert.ok(fx.length >= 2);
  for (const f of fx) { assert.ok(f.p < base.p); assert.equal(f.result.tooLate, false); }
  assert.ok(fx.some(f => f.kind === 'route' && f.plan.via === 'DTW'), 'suggests the safer hub');
  assert.ok(fx.some(f => f.kind === 'day'), 'suggests leaving earlier');
});

test('first flight of the day: early departures are first trips and the least disrupted', () => {
  const ff = eng.firstFlight('DTW', 6 * 60);
  assert.ok(ff.shareHere > 0.9);
  assert.ok(ff.troubleFirst < ff.troubleLater);
  assert.equal(ff.byBand.length, 6);
});

test('live layer: only travel-window hazards count, forecasts match the travel date', () => {
  const alerts = { features: [
    { properties: { event: 'Winter Storm Watch', headline: 'Winter Storm Watch from Tue evening', onset: '2026-11-24T18:00:00-05:00', ends: '2026-11-26T06:00:00-05:00' } },
    { properties: { event: 'Special Weather Statement', onset: '2026-11-24T18:00:00-05:00', ends: '2026-11-26T06:00:00-05:00' } },
    { properties: { event: 'Dense Fog Advisory', onset: '2026-11-20T00:00:00-05:00', ends: '2026-11-20T10:00:00-05:00' } }
  ] };
  const h = Engine.hazards(alerts, '2026-11-25T00:00:00-05:00', '2026-11-26T00:00:00-05:00');
  assert.deepEqual(h.map(x => x.event), ['Winter Storm Watch']);
  assert.equal(h[0].severe, true);
  const fc = { properties: { periods: [
    { name: 'Tuesday', startTime: '2026-11-24T06:00:00-05:00', shortForecast: 'Sunny' },
    { name: 'Wednesday', startTime: '2026-11-25T06:00:00-05:00', shortForecast: 'Heavy Snow' },
    { name: 'Wednesday Night', startTime: '2026-11-25T18:00:00-05:00', shortForecast: 'Mostly Cloudy' }
  ] } };
  const f = Engine.forecastFor(fc, '2026-11-25');
  assert.deepEqual(f.map(x => x.name), ['Wednesday', 'Wednesday Night']);
  assert.equal(f[0].flag, true);
  assert.equal(f[1].flag, false);
  assert.equal(Engine.liveState('2026-11-19', '2026-11-25').active, true);
  assert.equal(Engine.liveState('2026-10-19', '2026-11-25').active, false);
  assert.equal(Engine.liveState('2026-11-27', '2026-11-25').past, true);
});

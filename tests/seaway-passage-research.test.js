'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../lib/seaway-passage.js');

// Synthetic ships moving along the channel centreline at a known speed.
function pointAtKm(km) {
  const c = engine.CHANNEL;
  let acc = 0;
  for (let i = 1; i < c.length; i++) {
    const a = c[i - 1], b = c[i];
    const len = Math.hypot((b[1] - a[1]) * 111.32 * Math.cos(45 * Math.PI / 180), (b[0] - a[0]) * 111.32);
    if (acc + len >= km) { const f = (km - acc) / len; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; }
    acc += len;
  }
  return c.at(-1);
}
function ship(mmsi, startMs, fromKm, toKm, kmh, everyMin = 5) {
  const pts = [], dir = Math.sign(toKm - fromKm);
  for (let t = 0, km = fromKm; dir > 0 ? km <= toKm : km >= toKm; t += everyMin, km = fromKm + dir * kmh * t / 60) {
    const [lat, lon] = pointAtKm(km);
    pts.push({ mmsi, t: startMs + t * 60000, lat, lon, sog: kmh / 1.852, type: 70, len: 200 });
  }
  return pts;
}

test('viewpoints sit in channel order and positions project onto the channel', () => {
  const v = engine.VIEW_KM;
  assert.ok(v['st-lambert'] < v.snell && v.snell < v.eisenhower && v.eisenhower < v.iroquois && v.iroquois < v['alexandria-bay']);
  assert.ok(Math.abs(engine.project(44.9794, -74.85).km - v.eisenhower) < 0.01);
  assert.ok(engine.project(46.8, -71.2).offsetKm > engine.MAX_OFFSET_KM, 'Quebec City is not on this corridor');
});

test('passages carry direction and interpolate a viewpoint crossing time', () => {
  const start = Date.UTC(2025, 6, 1, 12);
  const ps = engine.passages(ship('316000001', start, 60, 200, 15));
  assert.equal(ps.length, 1);
  assert.equal(ps[0].dir, 1);
  const crossed = engine.crossingTime(ps[0], engine.VIEW_KM.eisenhower);
  const expected = start + (engine.VIEW_KM.eisenhower - 60) / 15 * 3600000;
  assert.ok(Math.abs(crossed - expected) < 5 * 60000);
  const down = engine.passages(ship('316000002', start, 200, 60, 15));
  assert.equal(down[0].dir, -1);
});

test('non-commercial and off-channel positions are ignored', () => {
  const start = Date.UTC(2025, 6, 1);
  const pleasure = ship('316000003', start, 60, 200, 15).map(p => ({ ...p, type: 37 }));
  assert.equal(engine.passages(pleasure).length, 0);
  const marina = [{ mmsi: '316000004', t: start, lat: 45.0, lon: -75.5, type: 70 }, { mmsi: '316000004', t: start + 600000, lat: 45.01, lon: -75.51, type: 70 }];
  assert.equal(engine.passages(marina).length, 0);
});

test('a crossing is not interpolated across a long receiver gap', () => {
  const start = Date.UTC(2025, 6, 1);
  const pts = ship('316000005', start, 100, 150, 15, 90); // 90-minute fixes
  const [p] = engine.passages(pts);
  assert.equal(engine.crossingTime(p, engine.VIEW_KM.eisenhower), null);
});

test('forecast windows come from observed passages and refuse thin evidence', () => {
  const ps = [];
  for (let n = 0; n < 20; n++) {
    const kmh = 12 + (n % 5); // 12-16 km/h
    ps.push(...engine.passages(ship(String(316100000 + n), Date.UTC(2025, 6, 1 + n), 30, 180, kmh)));
  }
  const model = engine.buildModel(ps);
  const obsKm = 60, t = Date.UTC(2025, 8, 1);
  const fc = engine.forecast(model, { km: obsKm, t, dir: 1 }, 'eisenhower');
  assert.ok(fc && fc.samples >= 8);
  const dist = engine.VIEW_KM.eisenhower - obsKm;
  assert.ok(fc.earliest >= t + dist / 16.5 * 3600000 && fc.latest <= t + dist / 11.5 * 3600000, 'window spans the observed speeds');
  assert.equal(engine.forecast(model, { km: 60, t, dir: -1 }, 'eisenhower'), null, 'wrong side for a downbound ship');
  const thin = engine.buildModel(ps.slice(0, 3));
  assert.equal(engine.forecast(thin, { km: obsKm, t, dir: 1 }, 'eisenhower'), null);
});

test('held-out evaluation reports calibrated hit rates on a stable synthetic river', () => {
  const ps = [];
  for (let n = 0; n < 60; n++) ps.push(...engine.passages(ship(String(316200000 + n), Date.UTC(2025, 5, 1 + n), 30, 250, 11 + (n * 7 % 9))));
  const train = ps.filter((_, i) => i % 2 === 0), testSet = ps.filter((_, i) => i % 2 === 1);
  const r = engine.evaluate(train, testSet);
  assert.ok(r.forecasts > 100);
  const rates = Object.values(r.summary).filter(s => s.n >= 20).map(s => s.hitRate);
  assert.ok(rates.length && rates.every(h => h >= 0.6), JSON.stringify(r.summary));
});

test('coverage logger normalizes regional responses and records errors', async () => {
  process.argv = [process.argv[0], 'x', '--out', '/tmp/unused.ndjson'];
  const { pollOnce } = await import('../scripts/seaway-coverage-log.mjs');
  const now = Date.UTC(2026, 10, 27, 14);
  let calls = 0;
  const fetcher = async url => {
    calls++;
    if (url.includes('44.91')) return { ok: false, status: 503 };
    const seen = new Date(now - 60000).toISOString();
    return { ok: true, json: async () => ({ type: 'FeatureCollection', features: url.includes('45.35') ? [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.55, 45.5] }, properties: { mmsi: '316013357', name: 'TEST SHIP', seen, sog: 0, kind: 'vessel', shipType: 70 } }
    ] : [] }) };
  };
  const row = await pollOnce(fetcher, () => now);
  assert.equal(calls, 5);
  const byId = Object.fromEntries(row.regions.map(r => [r.id, r]));
  assert.equal(byId.massena.state, 'error');
  assert.equal(byId.massena.http, 503);
  assert.equal(byId.montreal.count, 1);
  assert.equal(row.vessels[0].mmsi, '316013357');
});

test('coverage report counts share of polls with reports per region', async () => {
  const { coverage } = await import('../scripts/seaway-coverage-report.mjs');
  const polls = [
    { polledAt: '2026-11-27T00:00:00Z', regions: [{ id: 'massena', state: 'no-reports', count: 0 }, { id: 'montreal', state: 'recent', count: 3 }] },
    { polledAt: '2026-11-27T00:03:00Z', regions: [{ id: 'massena', state: 'recent', count: 1 }, { id: 'montreal', state: 'error' }] }
  ];
  const c = coverage(polls);
  assert.equal(c.byRegion.massena.shareWithReports, 0.5);
  assert.equal(c.byRegion.montreal.errors, 1);
});

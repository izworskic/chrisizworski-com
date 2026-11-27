'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { _test } = require('../lib/detroit-outdoors/engines.js');
const { create } = require('../lib/river-passage.js');
const model = JSON.parse(fs.readFileSync('data/detroit-river-freighters/passage-model.json', 'utf8'));
const g = model.geometry;
const corridor = create({ channel: g.channel, viewpoints: g.viewpoints, refLat: g.refLat, maxOffsetKm: g.maxOffsetKm });

function pointAt(km) {
  const ch = g.channel; let acc = 0; const k = 111.32 * Math.cos(g.refLat * Math.PI / 180);
  for (let i = 1; i < ch.length; i++) {
    const a = ch[i - 1], b = ch[i], len = Math.hypot((b[1] - a[1]) * k, (b[0] - a[0]) * 111.32);
    if (acc + len >= km) { const f = (km - acc) / len; return { lat: a[0] + (b[0] - a[0]) * f, lon: a[1] + (b[1] - a[1]) * f, bearing: (Math.atan2((b[1] - a[1]) * k, (b[0] - a[0]) * 111.32) * 180 / Math.PI + 360) % 360 }; }
    acc += len;
  }
}
const NOW = Date.UTC(2026, 6, 15, 16, 0);
const RW = corridor.VIEW_KM['detroit-riverwalk'];
function ship(name, kmFromRiverWalk, { upbound = false, speed = 10, ageMin = 3 } = {}) {
  const p = pointAt(RW + kmFromRiverWalk);
  return { mmsi: String(366000000 + name.length), name, lat: p.lat, lon: p.lon, speedKnots: speed, shipType: 70, lengthMeters: 200,
    course: upbound ? (p.bearing + 180) % 360 : p.bearing, seen: new Date(NOW - ageMin * 60000).toISOString() };
}
const placeState = { place: { id: 'belle-isle', name: 'Belle Isle Park', area: 'Detroit', setting: 'Detroit River island', drive: '15–25 min', driveClass: 'near', officialUrl: 'https://www.michigan.gov/recsearch/parks/belleisle' }, weather: { high: 60, low: 45, precipitationProbability: 10, windGust: 10, cloudCover: 20, aqi: 30 } };
const run = vessels => _test.freighterWatchingCandidate({ placeStates: [placeState], alertStates: [{ ok: true, alerts: [] }], aisState: { ok: true, data: { vessels } }, now: NOW })[0];

test('a ship already past the RiverWalk is labelled heading away, not "possible passage now"', () => {
  const row = run([ship('LEAVING LAKER', 14)]); // downbound, 14 km below the RiverWalk (toward Wyandotte)
  assert.equal(row.passage.state, 'departing');
  assert.equal(row.title, 'Detroit River freighter heading away');
  assert.match(row.timeWindow.label, /heading away/);
  assert.doesNotMatch(row.timeWindow.label, /Possible passage now/);
  assert.match(row.specialist.headline, /heading away/);
  assert.equal(row.standout, false);
  assert.equal(row.timeWindow.start, new Date(NOW - 3 * 60000).toISOString(), 'AIS freshness clock still starts at the report time');
});

test('a ship coming downriver gets direction and the tested RiverWalk window', () => {
  const row = run([ship('COMING LAKER', -8)]);
  assert.equal(row.passage.state, 'approaching');
  assert.ok(row.passage.window, 'window expected for a ship 8 km above the RiverWalk');
  assert.match(row.timeWindow.label, /^RiverWalk \d{1,2}:\d{2}.*\(tested window\)$/);
  assert.match(row.reasons.join(' | '), /heading toward the RiverWalk \(downbound, toward Lake Erie\); tested RiverWalk window/);
  assert.ok(row.verifiedEvidence.some(e => e.sourceLabel === 'Tested RiverWalk window' && /not a schedule/.test(e.text)));
});

test('an upbound ship below the RiverWalk is coming toward it', () => {
  const row = run([ship('UPBOUND LAKER', 6, { upbound: true })]);
  assert.equal(row.passage.state, 'approaching');
  assert.match(row.passage.direction, /Upbound/);
});

test('a coming ship is chosen over a nearer ship that is heading away', () => {
  const row = run([ship('LEAVING LAKER', 3), ship('COMING LAKER', -10)]);
  assert.equal(row.reasons[0].includes('COMING LAKER'), true);
  assert.equal(row.passage.state, 'approaching');
});

test('stopped ships keep the existing speed rule; off-channel positions stay direction-unknown', () => {
  const stopped = run([ship('ANCHORED', -3, { speed: 0.2 })]);
  assert.match(stopped.timeWindow.label, /movement not confirmed/);
  const off = run([{ ...ship('OFF CHANNEL', -3), lat: 42.41, lon: -83.12 }]);
  assert.equal(off.passage.state, 'unknown');
  assert.match(off.timeWindow.label, /Possible passage now/);
});

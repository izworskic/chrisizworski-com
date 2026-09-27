'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const next = require('../lib/soo-locks-next');
const jev = require('../lib/soo-locks-jev');
const handler = require('../api/soo-ais');

const fixture = require('./fixtures/soo-river-2026-09-27.json');
const islands = require('./fixtures/soo-river-islands.json');
const NOW = Date.parse(fixture.now);
const river = () => next.normalize(fixture.response, NOW).vessels;
const byName = name => river().find(v => v.name === name);

function insidePolygon([lat, lon], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i], [yj, xj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

test('no channel segment crosses Sugar Island or Neebish Island (OpenStreetMap outlines)', () => {
  for (const [name, route] of Object.entries(next.ROUTES)) {
    for (let i = 0; i < route.length - 1; i++) {
      for (let t = 0; t <= 1; t += 0.005) {
        const p = [route[i][0] + (route[i + 1][0] - route[i][0]) * t, route[i][1] + (route[i + 1][1] - route[i][1]) * t];
        for (const [island, ring] of Object.entries(islands)) {
          assert.equal(insidePolygon(p, ring), false, `${name} segment ${i} crosses ${island}`);
        }
      }
    }
  }
});

test('moving freighters in the recorded snapshot sit on the modeled channel', () => {
  for (const name of ['AMERICAN MARINER', 'PAUL R TREGURTHA', 'ROBERT S. PIERSON', 'WILFRED SYKES']) {
    const v = byName(name);
    const lateral = Math.min(...Object.values(next.ROUTES).map(r => next.project(r, [v.lat, v.lon]).lateralNm));
    assert.ok(lateral < 0.3, `${name} is ${lateral.toFixed(2)} NM off the channel`);
  }
});

test('upbound ships below Neebish Island use the Middle Neebish Channel, not the West', () => {
  const v = byName('ROBERT S. PIERSON');
  assert.ok(next.project(next.ROUTES.lowerUpbound, [v.lat, v.lon]).lateralNm < 0.2);
  assert.ok(next.project(next.ROUTES.lowerDownbound, [v.lat, v.lon]).lateralNm > 1);
});

test('a 1,000-footer reported inside the Poe chamber is shown as in the lock now, upbound', () => {
  const inLock = next.inLockList(river(), NOW);
  assert.equal(inLock.length, 1);
  assert.equal(inLock[0].name, 'MESABI MINER');
  assert.equal(inLock[0].chamber, 'poe');
  assert.equal(inLock[0].direction, 'upbound');
  assert.equal(inLock[0].sizeLabel, '1,000-footer');
});

test('the approaching upbound laker becomes the next ship; downbound ships, tugs and tour boats do not', () => {
  const candidates = next.buildCandidates(river(), NOW);
  assert.deepEqual(candidates.map(c => c.name), ['ROBERT S. PIERSON']);
  const c = candidates[0];
  assert.equal(c.direction, 'upbound');
  assert.ok(c.channelMilesToLocks > 10 && c.channelMilesToLocks < 20, String(c.channelMilesToLocks));
  assert.ok(Date.parse(c.window.start) < Date.parse(c.window.midpoint) && Date.parse(c.window.midpoint) < Date.parse(c.window.end));
  assert.equal(next.deterministicPick(candidates).name, 'ROBERT S. PIERSON');
});

test('along-channel distance, never shorter than straight-line, drives the estimate', () => {
  // Measured Sep 27: the channel adds 6-11% over a straight line for ships below the locks.
  for (const name of ['ROBERT S. PIERSON', 'PAUL R TREGURTHA', 'WILFRED SYKES']) {
    const v = byName(name);
    const straight = next.distNm([v.lat, v.lon], next.LOCK_POINT);
    const along = next.project(next.ROUTES.lowerUpbound, [v.lat, v.lon]).alongNm;
    assert.ok(along > straight * 1.03 && along < straight * 1.25, `${name}: along ${along.toFixed(1)} vs straight ${straight.toFixed(1)}`);
  }
});

test('a downbound freighter coming from Lake Superior past Brush Point is a candidate', () => {
  const v = { mmsi: '316001234', name: 'TEST DOWNBOUND', lat: 46.4735, lon: -84.459, seen: new Date(NOW - 120000).toISOString(),
    speedKnots: 9, course: 65, shipType: 70, lengthMeters: 225, destination: 'NANTICOKE' };
  const c = next.buildCandidate(v, NOW);
  assert.ok(c);
  assert.equal(c.direction, 'downbound');
  assert.ok(c.channelNmToLocks > 4 && c.channelNmToLocks < 7, String(c.channelNmToLocks));
});

test('a destination that contradicts the direction of travel drops the candidate', () => {
  const v = { ...byName('ROBERT S. PIERSON'), destination: 'DETROIT' };
  assert.equal(next.buildCandidate(v, NOW), null);
});

test('lock assignment is only claimed when size forces the Poe', () => {
  assert.equal(next.lockFor({ lengthMeters: 305 }).lock, 'poe');
  assert.equal(next.lockFor({ lengthMeters: 305 }).certain, true);
  assert.equal(next.lockFor({ lengthMeters: 192 }).lock, null);
  assert.equal(next.lockFor({ lengthMeters: 192, beamMeters: 24 }).lock, 'poe');
});

test('foreign-flagged freighters are labelled as likely salties; U.S. and Canadian are not', () => {
  assert.equal(next.sizeLabel({ mmsi: '538001234', shipType: 70, lengthMeters: 200 }), 'ocean-going saltie');
  assert.equal(next.sizeLabel({ mmsi: '316001234', shipType: 70, lengthMeters: 200 }), 'laker');
  assert.equal(next.sizeLabel({ mmsi: '366001234', shipType: 70, lengthMeters: 305 }), '1,000-footer');
});

test('slowing into the lock is modeled for the last mile', () => {
  assert.ok(Math.abs(next.minutesToLock(1, 10) - 24) < 0.01);
  assert.ok(Math.abs(next.minutesToLock(11, 10) - 84) < 0.01);
});

test('JEV without a credential falls back to the deterministic pick', async () => {
  const saved = process.env.HARNESS_ACCESS_KEY; delete process.env.HARNESS_ACCESS_KEY;
  try {
    const candidates = next.buildCandidates(river(), NOW);
    const r = await jev.chooseNextShip(candidates, fixture.now);
    assert.equal(r.mode, 'deterministic');
    assert.equal(r.pick.name, 'ROBERT S. PIERSON');
  } finally { if (saved !== undefined) process.env.HARNESS_ACCESS_KEY = saved; }
});

test('JEV can only choose from the supplied candidates', async t => {
  const candidates = next.buildCandidates(river(), NOW);
  t.mock.method(global, 'fetch', async () => ({ ok: true, status: 200, json: async () => ({ action: 'decide', result: { choice: { choice: '999999999', confidence: 0.9 } } }) }));
  const outside = await jev.chooseNextShip(candidates, fixture.now, 'test-token');
  assert.equal(outside.mode, 'deterministic');
  t.mock.method(global, 'fetch', async () => ({ ok: true, status: 200, json: async () => ({ action: 'decide', result: { choice: { choice: candidates[0].id, confidence: 0.8 }, injection_dependency: 0.1, model: 'jev-test' } }) }));
  const inside = await jev.chooseNextShip(candidates, fixture.now, 'test-token');
  assert.equal(inside.mode, 'shared-harness-jev');
  assert.equal(inside.pick.id, candidates[0].id);
});

test('the JEV payload carries every candidate fact unchanged and forbids inventing times', () => {
  const candidates = next.buildCandidates(river(), NOW);
  const p = jev.decisionPayload(candidates, fixture.now);
  assert.match(p.options[candidates[0].id], new RegExp(`window_start=${candidates[0].window.start}`));
  assert.ok(p.constraints.some(c => /Never invent another ship/.test(c)));
  assert.ok(p.constraints.some(c => /untrusted data/.test(c)));
});

test('the API keeps the local vessel list unchanged and adds the next-ship layer', async t => {
  const realNow = Date.now;
  Date.now = () => NOW;
  t.after(() => { Date.now = realNow; });
  t.mock.method(global, 'fetch', async url => {
    if (String(url).includes('ais.openwaters.io')) return { ok: true, status: 200, json: async () => fixture.response };
    throw new Error('harness offline');
  });
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.code = n; return this; }, json(v) { this.body = v; } };
  await handler({ method: 'GET' }, res);
  assert.equal(res.code, 200);
  assert.ok(res.body.vessels.every(v => next.inBox(v, next.LOCAL_BBOX)), 'map list stays local to the locks');
  assert.ok(!res.body.vessels.some(v => v.name === 'PAUL R TREGURTHA'), 'distant ships stay off the local list');
  assert.equal(res.body.nextShip.ok, true);
  assert.equal(res.body.nextShip.inLock[0].name, 'MESABI MINER');
  assert.equal(res.body.nextShip.pick.name, 'ROBERT S. PIERSON');
  assert.equal(res.body.nextShip.selection.mode, 'deterministic');
});

test('JEV callers get the harness credential from request-scoped OIDC, not process.env', () => {
  for (const f of ['lib/duluth-canal-jev.js', 'lib/soo-locks-jev.js', 'lib/harness-auth.js']) {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.doesNotMatch(src, /process\.env\.VERCEL_OIDC_TOKEN/, f);
  }
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'lib/harness-auth.js'), 'utf8'), /getVercelOidcToken/);
});

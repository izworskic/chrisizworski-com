'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  trustedSnapshot, selectTrustedMission, KEY, MAX_AGE_MS
} = require('../lib/space-coast-ksc-snapshot');
const { createHandler, CHECK_INTERVAL_SECONDS } =
  require('../api/space-coast-ksc')._test;

const NOW = Date.parse('2026-11-01T15:00:00Z');
const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function launch(id = ID) {
  return {
    id, name: 'Falcon 9 Block 5 | Starlink Group 10-54',
    rocket: 'Falcon 9', provider: 'SpaceX', net: '2026-11-05T15:00:00Z',
    netPrecision: 'minute', pad: 'Space Launch Complex 40',
    scheduleConfidence: { level: 'medium' }
  };
}
function response() {
  const headers = {};
  return {
    headers, statusCode: 200, body: null,
    setHeader(k, v) { headers[k.toLowerCase()] = v; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}
function request(id, method = 'GET') {
  return { method, query: { launchId: id } };
}

test('snapshot stores only bounded, trusted mission fields', () => {
  const source = launch();
  const snapshot = trustedSnapshot([source], NOW);
  assert.equal(snapshot.generatedAt, new Date(NOW).toISOString());
  assert.equal(snapshot.version, 1);
  assert.deepEqual(Object.keys(snapshot.launches[0]).sort(),
    ['id', 'name', 'net', 'rocket', 'pad', 'provider', 'netPrecision'].sort());
  assert.equal(snapshot.launches[0].scheduleConfidence, undefined);
  assert.match(KEY, /^space-coast:/);
  assert.equal(selectTrustedMission(snapshot, ID, NOW)?.pad, 'Space Launch Complex 40');
  assert.equal(selectTrustedMission(snapshot, OTHER, NOW), null);
});

test('a stale or invalid schedule snapshot cannot authorize a KSC check', () => {
  const good = trustedSnapshot([launch()], NOW);
  assert.equal(selectTrustedMission(good, ID, NOW + MAX_AGE_MS + 1), null);
  assert.equal(selectTrustedMission(good, ID, NOW - 60001), null);
  assert.equal(selectTrustedMission({ ...good, launches: new Array(9).fill(launch()) }, ID, NOW), null);
  assert.equal(selectTrustedMission({ ...good, version: 999 }, ID, NOW), null);
  assert.equal(selectTrustedMission(trustedSnapshot([launch()], NOW), 'not-a-uuid', NOW), null);
});

test('fast endpoint uses trusted schedule snapshot and KSC only, not LL2', async () => {
  const snapshot = trustedSnapshot([launch()], NOW - 60000);
  let checked = 0, selected;
  const handler = createHandler({
    now: () => NOW,
    readSnapshot: async () => snapshot,
    inspect: async l => {
      checked++; selected = l;
      return {
        state: 'matched', checkedAt: new Date(NOW).toISOString(),
        sourceUrl: 'https://www.kennedyspacecenter.com/event/starlink-10-54/',
        officialCalendar: { status: 'checked' },
        venues: [{ id: 'visitor', ticket: 'included-with-admission-listed' }]
      };
    }
  });
  const res = response();
  await handler(request(ID), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.selectedLaunchId, ID);
  assert.equal(res.body.scheduleSnapshotAt, snapshot.generatedAt);
  assert.equal(res.body.kscViewing.state, 'matched');
  assert.equal(res.headers['cache-control'], 'public, s-maxage=180, stale-while-revalidate=60');
  assert.equal(res.headers['x-robots-tag'], 'noindex, nofollow');
  assert.equal(res.body.refreshIntervalSeconds, 300);
  assert.equal(CHECK_INTERVAL_SECONDS, 300);
  assert.equal(checked, 1);
  assert.equal(selected.id, ID);
  assert.equal(selected.scheduleConfidence, undefined);
});

test('invalid IDs, missing snapshots, and wrong mission fail closed', async () => {
  let inspected = 0;
  const handler = createHandler({
    now: () => NOW,
    readSnapshot: async () => trustedSnapshot([launch()], NOW),
    inspect: async () => { inspected++; return {}; }
  });
  for (const bad of ['other', '', null, ['not', 'a', 'string']]) {
    const res = response();
    await handler(request(bad), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.headers['cache-control'], 'no-store');
  }
  const missing = response();
  await handler(request(OTHER), missing);
  assert.equal(missing.statusCode, 503);
  assert.equal(missing.body.code, 'schedule-snapshot-unavailable');
  assert.equal(inspected, 0);
  const wrongVerb = response();
  await handler(request(ID, 'POST'), wrongVerb);
  assert.equal(wrongVerb.statusCode, 405);
});

test('KSC outage never caches a negative result as an announcement', async () => {
  const snapshot = trustedSnapshot([launch()], NOW);
  const handler = createHandler({
    now: () => NOW, readSnapshot: async () => snapshot,
    inspect: async () => ({
      state: 'unverified', checkedAt: new Date(NOW).toISOString(),
      sourceUrl: null, officialCalendar: { status: 'unavailable' }, venues: []
    })
  });
  const res = response();
  await handler(request(ID), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.equal(res.body.kscViewing.state, 'unverified');
  assert.equal(res.body.kscViewing.sourceUrl, null);
  const broken = response();
  const failure = createHandler({
    now: () => NOW, readSnapshot: async () => snapshot,
    inspect: async () => { throw new Error('KSC timeout'); }
  });
  await failure(request(ID), broken);
  assert.equal(broken.statusCode, 503);
  assert.equal(broken.headers['cache-control'], 'no-store');
});

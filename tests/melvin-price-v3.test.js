const test = require('node:test');
const assert = require('node:assert/strict');
const v3 = require('../api/melvin-price-v3.js')._test;

function bodyWithStaleGage() {
  return {
    locks: {
      ok: true,
      freshness: 'STALE',
      melvin: {
        pendingArrivals: 3,
        lockingNow: 0,
        lockedUp24h: 4,
        lockedDown24h: 8,
        averageDelayMinutes24h: 112,
        observedAt: { raw: '090926:0400', label: '09/09/2026 04:00 CT', ageMinutes: 450 },
      },
    },
    traffic: {},
    weather: { ok: true, precipitationProbability: 15, windSpeed: '8 mph', shortForecast: 'Mostly Sunny' },
    tours: {
      museumOpen: true,
      nextTour: '1:00 PM',
      minutesUntilNextTour: 80,
      opportunity: { state: 'SOON', label: '1:00 PM tour window', guidance: 'Good tour window.' },
    },
    notices: { ok: true, count: 0 },
    visit: { score: null, label: 'DATA LIMITED' },
  };
}

test('older gage observation does not veto near-real-time LPMS traffic counters', () => {
  const now = new Date('2026-09-09T16:00:00Z');
  const body = v3.promoteTrafficSnapshot(bodyWithStaleGage(), now);

  assert.equal(body.locks.gageFreshness, 'STALE');
  assert.equal(body.locks.trafficFreshness, 'LIVE');
  assert.equal(body.locks.freshness, 'LIVE');
  assert.equal(body.locks.gageObservedAt.label, '09/09/2026 04:00 CT');
  assert.equal(body.locks.reportCadenceMinutes, 15);
  assert.equal(body.productVersion, 'decision-v3');
  assert.ok(Number.isFinite(body.visit.score));
  assert.notEqual(body.visit.label, 'DATA LIMITED');
  assert.equal(body.visit.persona.towWatching, 'PROMISING');
  assert.match(body.visit.headline, /tow-watching|window|traffic/i);
});

test('unavailable LPMS remains unavailable and is never promoted to live', () => {
  const body = { locks: { ok: false, freshness: 'UNAVAILABLE' }, visit: { score: null } };
  v3.promoteTrafficSnapshot(body, new Date('2026-09-09T16:00:00Z'));
  assert.equal(body.locks.freshness, 'UNAVAILABLE');
  assert.equal(body.locks.trafficFreshness, undefined);
  assert.equal(body.productVersion, 'decision-v3');
});

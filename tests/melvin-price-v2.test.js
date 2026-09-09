const test = require('node:test');
const assert = require('node:assert/strict');
const v2 = require('../api/melvin-price-v2.js')._test;

function baseBody(overrides = {}) {
  return {
    locks: {
      ok: true,
      freshness: 'LIVE',
      melvin: { pendingArrivals: 0, lockingNow: 0, lockedUp24h: 6, lockedDown24h: 6 },
    },
    weather: { ok: true, precipitationProbability: 10, windSpeed: '8 mph', shortForecast: 'Mostly Sunny' },
    tours: {
      museumOpen: true,
      nextTour: '1:00 PM',
      minutesUntilNextTour: 60,
      opportunity: { state: 'SOON', label: '1:00 PM tour window', guidance: 'Good tour window.' },
    },
    notices: { ok: true, count: 0 },
    ...overrides,
  };
}

test('stale LPMS is a hard veto on the go-now score', () => {
  const body = baseBody();
  body.locks.freshness = 'STALE';
  const visit = v2.buildVisit(body);
  assert.equal(visit.score, null);
  assert.equal(visit.label, 'DATA LIMITED');
  assert.equal(visit.confidence, 'Low');
  assert.match(visit.headline, /Tow timing unverified/i);
});

test('delayed LPMS cannot produce an excellent/high-confidence recommendation', () => {
  const body = baseBody();
  body.locks.freshness = 'DELAYED';
  body.locks.melvin.lockingNow = 1;
  const visit = v2.buildVisit(body);
  assert.ok(visit.score <= 74);
  assert.equal(visit.confidence, 'Moderate');
  assert.notEqual(visit.label, 'EXCELLENT');
  assert.match(visit.summary, /report is delayed/i);
});

test('museum holiday logic honors published fixed closures', () => {
  assert.equal(v2.museumHoliday(new Date('2026-12-24T18:00:00Z')), 'Christmas Eve');
  assert.equal(v2.museumHoliday(new Date('2027-01-01T18:00:00Z')), "New Year's Day");
});

test('museum holiday logic identifies Thanksgiving in local Central time', () => {
  assert.equal(v2.museumHoliday(new Date('2026-11-26T18:00:00Z')), 'Thanksgiving');
});

test('tour starting inside the 15-minute arrival window is marked tight, not ideal', () => {
  const enhanced = v2.enhanceTours({
    museumOpen: true,
    nextTour: '1:00 PM',
    minutesUntilNextTour: 9,
  }, new Date('2026-09-09T17:51:00Z'));
  assert.equal(enhanced.opportunity.state, 'TIGHT');
  assert.match(enhanced.opportunity.guidance, /sign-up may be tight/i);
  assert.equal(enhanced.publicTourCapacity, 25);
  assert.equal(enhanced.arriveEarlyMinutes, 15);
});

test('traffic comparison uses 2024 daily lockages as a broad benchmark', () => {
  const busy = v2.trafficComparison({ lockedUp24h: 10, lockedDown24h: 10 });
  const typical = v2.trafficComparison({ lockedUp24h: 6, lockedDown24h: 6 });
  const light = v2.trafficComparison({ lockedUp24h: 3, lockedDown24h: 3 });
  assert.equal(busy.state, 'BUSY');
  assert.equal(typical.state, 'NEAR_AVERAGE');
  assert.equal(light.state, 'LIGHT');
  assert.equal(busy.averageDaily2024, 13.1);
});

test('active lock plus a practical tour becomes a persona-oriented headline', () => {
  const body = baseBody();
  body.locks.melvin.lockingNow = 1;
  const visit = v2.buildVisit(body);
  assert.match(visit.headline, /active lock traffic \+ a tour opportunity/i);
  assert.match(visit.reasons.join(' '), /Tow watching: STRONG NOW/i);
  assert.match(visit.reasons.join(' '), /arrive ~15 min early/i);
});

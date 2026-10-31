'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const decision = require('../lib/space-coast-decision');
const handler = require('../api/space-coast-launch');

function launch(overrides = {}) {
  return {
    id: 'test-rocket-1', name: 'Falcon 9 | Test mission',
    net: new Date(Date.now() + 3 * 3600000).toISOString(),
    net_precision: { name: 'Minute' },
    status: { name: 'Go for Launch' },
    pad: {
      id: 94, name: 'Space Launch Complex 40', latitude: 28.5619, longitude: -80.5774,
      location: { id: 12, name: 'Cape Canaveral SFS, FL, USA' }
    },
    ...overrides
  };
}
function alert(overrides = {}) {
  return {
    id: 'nps-lots-8-13', site_code: 'cana', is_active: 1,
    category: 'Park Closure', title: 'Playalinda District: Parking Lot #8-13',
    description: 'The main road north of Eddy Creek and Parking Lots #8-13 are closed to all visitor use.',
    ...overrides
  };
}
function response(json, status = 200) {
  return { ok: status < 400, status, json: async () => json };
}
function mockRes() {
  return {
    headers: {}, statusCode: 200, body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(n) { this.statusCode = n; return this; },
    json(obj) { this.body = obj; return this; }
  };
}

test('LL2 2.3 recognizes Cape and Kennedy location IDs', () => {
  assert.equal(decision.isSpaceCoast(launch()), true);
  assert.equal(decision.isSpaceCoast(launch({ pad: { location: { id: 27 } } })), true);
  assert.equal(decision.isSpaceCoast(launch({ pad: { location: { id: 14 } } })), false);
});
test('completed launches never appear in upcoming schedule even if LL2 returns them', () => {
  assert.equal(decision.isFutureLaunch(launch({ status: { name: 'Launch Successful' } })), false);
  assert.equal(decision.isFutureLaunch(launch({ status: { name: 'Launch Failure' } })), false);
  assert.equal(decision.isFutureLaunch(launch()), true);
});
test('Go for Launch is high only with minute-level precision', () => {
  assert.equal(decision.scheduleConfidence(launch()).level, 'high');
  assert.equal(decision.scheduleConfidence(launch({ net_precision: { name: 'Hour' } })).level, 'medium');
  assert.equal(decision.scheduleConfidence(launch({ net_precision: { name: 'Day' } })).level, 'low');
  assert.equal(decision.scheduleConfidence(launch({ net_precision: { name: 'Month' } })).level, 'low');
  assert.equal(decision.scheduleConfidence(launch({ net_precision: { name: 'Year' } })).level, 'low');
  assert.equal(decision.scheduleConfidence(launch({ status: { name: 'Hold' } })).level, 'hold');
});
test('coarse timestamps never masquerade as exact local launch times', () => {
  const item = decision.normalizeLaunch(launch({
    net: '2026-11-13T00:00:00Z',
    net_precision: { name: 'Day' }
  }));
  assert.equal(item.netPrecision, 'day');
  assert.equal(item.tbdTime, true);
  assert.equal(item.scheduleConfidence.label, 'Day only / time TBD');
});
test('NPS current-closure handling ignores inactive records and preserves active warnings', () => {
  const items = decision.activeAlerts([
    alert(), alert({ id: 'old', is_active: 0 }), alert({ id: 'caution', category: 'Caution', title: 'Rough surf' })
  ]);
  assert.equal(items.length, 2);
  assert.equal(decision.playalindaNorthClosed(items), true);
});
test('NPS only reports Playalinda north lots as closed; other lots stay unverified', () => {
  const a = decision.activeAlerts([alert()]);
  const north = decision.viewAccess(decision.VIEWPOINTS.find(x => x.id === 'playalinda-north'),
    decision.normalizeLaunch(launch()), a, true);
  const south = decision.viewAccess(decision.VIEWPOINTS.find(x => x.id === 'playalinda-south'),
    decision.normalizeLaunch(launch()), a, true);
  assert.equal(north.level, 'closed');
  assert.notEqual(south.level, 'candidate');
  assert.notEqual(south.level, 'closed');
});
test('NPS unavailability must never be mistaken for open Playalinda access', () => {
  const north = decision.viewAccess(decision.VIEWPOINTS.find(x => x.id === 'playalinda-north'),
    decision.normalizeLaunch(launch()), [], false);
  assert.equal(north.level, 'unknown');
});
test('KSC Gantry excludes launches from pad LC-39A and 39B', () => {
  const gantry = decision.VIEWPOINTS.find(x => x.id === 'ksc-gantry');
  const a = decision.viewAccess(gantry, decision.normalizeLaunch(launch({
    pad: { name: 'Launch Complex 39A', location: { id: 27 } }
  })), [], true);
  const b = decision.viewAccess(gantry, decision.normalizeLaunch(launch({
    pad: { name: 'Space Launch Complex 40', location: { id: 12 } }
  })), [], true);
  assert.equal(a.level, 'ineligible');
  assert.equal(b.level, 'verify');
});
test('missing weather and incomplete forecast produce no positive visibility verdict', () => {
  assert.equal(decision.weatherGrade(null).level, 'unknown');
  assert.equal(decision.weatherGrade({ shortForecast: 'Sunny' }).level, 'unknown');
  assert.equal(decision.weatherGrade({ shortForecast: 'Thunderstorms', probabilityOfPrecipitation: { value: 40 } }).level, 'poor');
  assert.equal(decision.weatherGrade({ shortForecast: 'Mostly Cloudy', probabilityOfPrecipitation: { value: 15 } }).level, 'mixed');
  const good = decision.weatherGrade({ shortForecast: 'Sunny', probabilityOfPrecipitation: { value: 10 }, windSpeed: '8 mph' });
  assert.equal(good.level, 'good');
  assert.match(good.detail, /does not establish/);
});
test('live API preserves existing response contract while including NPS and site decisions', async () => {
  const original = global.fetch;
  let llUrl = '';
  const l = launch({ net: new Date(Date.now() + 2 * 86400000).toISOString(), net_precision: { name: 'Day' } });
  global.fetch = async url => {
    url = String(url);
    if (url.includes('ll.thespacedevs.com')) {
      llUrl = url;
      return response({ results: [launch({ status: { name: 'Launch Successful' } }), l] });
    }
    if (url.includes('park-alerts-cana.json')) return response([alert()]);
    throw new Error('Unexpected external URL ' + url);
  };
  try {
    const res = mockRes();
    await handler({ method: 'GET' }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.upcoming.length, 1);
    assert.equal(res.body.next.netPrecision, 'day');
    assert.equal(res.body.parkAlerts.length, 1);
    assert.equal(res.body.accessSource.verified, true);
    assert.equal(res.body.viewpoints.find(v => v.id === 'playalinda-north').level, 'closed');
    assert.equal(res.body.nextDecision.launchWeather.level, 'unknown');
    assert.equal(res.body.viewingWeatherByArea.length, 2);
    assert.match(llUrl, /2\.3\.0\/launches\/upcoming/);
    assert.match(llUrl, /location__ids=12%2C27/);
    assert.equal(res.headers['X-Robots-Tag'], 'noindex, nofollow');
  } finally {
    global.fetch = original;
  }
});
test('NPS developer API fallback uses server-only credential, never returns it to clients', async () => {
  const original = global.fetch;
  const key = process.env.NPS_API_KEY;
  process.env.NPS_API_KEY = 'unit-test-secret';
  let authHeader = null;
  global.fetch = async (url, options) => {
    url = String(url);
    if (url.includes('park-alerts-cana.json')) return response({}, 503);
    if (url.includes('developer.nps.gov')) {
      authHeader = options?.headers?.['X-Api-Key'];
      return response({ data: [alert()] });
    }
    throw new Error('Unexpected URL');
  };
  try {
    const nps = await handler._test.loadNpsAlerts(Date.now());
    assert.equal(nps.verified, true);
    assert.equal(nps.feed, 'developer-api');
    assert.equal(authHeader, 'unit-test-secret');
    assert.doesNotMatch(JSON.stringify(nps), /unit-test-secret/);
  } finally {
    global.fetch = original;
    if (key === undefined) delete process.env.NPS_API_KEY;
    else process.env.NPS_API_KEY = key;
  }
});
test('non-GET methods fail without using external APIs', async () => {
  const res = mockRes();
  await handler({ method: 'POST' }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'GET');
});

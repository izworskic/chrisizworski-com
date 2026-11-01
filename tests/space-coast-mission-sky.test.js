'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const decision = require('../lib/space-coast-decision');
const sky = require('../lib/space-coast-visibility');
const handler = require('../api/space-coast-launch');

const NPS_HOURS = {
  category: 'Information', title: 'Operating Hours',
  description: 'The seashore is currently operating on the hours of 6:00 AM - 6:00 PM. Last entry into the seashore is at 5:00 pm.'
};
const ALERT = {
  category: 'Park Closure', title: 'Playalinda District: Parking Lot #8-13',
  description: 'Parking Lots #8-13 and the main road north of Eddy Creek are closed.'
};
function oneAlert(description, title = 'Playalinda closure') {
  return { category: 'Park Closure', title, description };
}
function launch(id, iso, precision = 'Minute', pad = 'Space Launch Complex 40') {
  return {
    id, net: iso, net_precision: { name: precision },
    status: { name: 'Go for Launch' },
    name: 'Falcon 9 | Test flight ' + id.slice(0, 4), pad: {
      id: 94, name: pad, latitude: 28.5619, longitude: -80.5774,
      location: { id: 12, name: 'Cape Canaveral SFS, FL, USA' }
    }
  };
}
function response(json, status = 200) {
  return { ok: status >= 200 && status < 400, status, json: async () => json };
}
function mockRes() {
  return {
    headers: {}, statusCode: 200, body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(n) { this.statusCode = n; return this; },
    json(obj) { this.body = obj; return this; }
  };
}

test('active NPS operating hours are parsed, not hard-coded by season', () => {
  const hours = decision.npsOperatingHours([NPS_HOURS]);
  assert.deepEqual([hours.openMinutes, hours.closeMinutes, hours.lastEntryMinutes], [360, 1080, 1020]);
  assert.equal(decision.npsOperatingHours([]), null);
});
test('Playalinda range-specific closure never broadens to all parking lots', () => {
  assert.equal(decision.npsLotClosure([ALERT], 8, 13), true);
  assert.equal(decision.npsLotClosure([ALERT], 1, 3), false);
  assert.equal(decision.npsLotClosure([ALERT], 4, 7), false);
  const first = oneAlert('Parking areas 1, 2 and 3 are closed to public access');
  assert.equal(decision.npsLotClosure([first], 1, 3), true);
  assert.equal(decision.npsLotClosure([first], 4, 7), false);
  assert.equal(decision.npsParkWideClosure([ALERT]), false);
  assert.equal(decision.npsParkWideClosure([oneAlert('The entire Playalinda Beach District will be closed.')]), true);
});
test('current NPS lot closure controls individual access after normal hours and unrelated closures', () => {
  const l = decision.normalizeLaunch(launch('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-11-03T18:00:00Z'));
  const site = id => decision.VIEWPOINTS.find(v => v.id === id);
  const now = Date.parse('2026-11-01T18:00:00Z');
  const alerts = [NPS_HOURS, ALERT];
  assert.equal(decision.viewAccess(site('playalinda-north'), l, alerts, true, { now }).level, 'closed');
  assert.equal(decision.viewAccess(site('playalinda-first'), l, alerts, true, { now }).level, 'verify');
  assert.equal(decision.viewAccess(site('playalinda-south'), l, alerts, true, { now }).level, 'verify');
});
test('NPS road-entry rule computes policy-based T-minus thirty only for exact times', () => {
  const t = Date.parse('2026-11-03T18:00:00Z');
  const base = decision.normalizeLaunch(launch('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', new Date(t).toISOString()));
  const a = decision.launchArrivalGuidance(base, [NPS_HOURS], true, t - 2 * 3600000);
  assert.equal(a.level, 'planning');
  assert.equal(a.estimatedRoadRestrictionAt, '2026-11-03T17:30:00.000Z');
  assert.match(a.detail, /not a live gate-status confirmation/i);
  assert.equal(decision.launchArrivalGuidance(base, [NPS_HOURS], true, t).level, 'attention');
  assert.equal(decision.launchArrivalGuidance({ ...base, netPrecision: 'day' }, [NPS_HOURS], true, t).estimatedRoadRestrictionAt, null);
  assert.equal(decision.launchArrivalGuidance(base, [], false, t).level, 'unknown');
});
test('NWS grid validTime intervals cover hours, days and half-open boundaries', () => {
  const p = sky.validTimeInterval('2026-11-01T06:00:00+00:00/P1DT3H');
  assert.equal(p.end - p.start, 27 * 3600000);
  assert.equal(sky.validTimeInterval('invalid'), null);
  const grid = {
    properties: {
      updateTime: '2026-10-31T12:00:00Z',
      skyCover: { uom: 'wmoUnit:percent', values: [
        { validTime: '2026-11-01T06:00:00+00:00/PT3H', value: 22.5 },
        { validTime: '2026-11-01T09:00:00+00:00/PT2H', value: 67 }
      ] }
    }
  };
  const now = Date.parse('2026-10-31T15:00:00Z');
  assert.equal(sky.skyCoverAt(grid, '2026-11-01T08:59:59Z', now).percent, 23);
  assert.equal(sky.skyCoverAt(grid, '2026-11-01T09:00:00Z', now).percent, 67);
  assert.equal(sky.skyCoverAt(grid, '2026-11-01T11:00:00Z', now).percent, null);
  grid.properties.skyCover.values[0].value = null;
  assert.equal(sky.skyCoverAt(grid, '2026-11-01T08:00:00Z', now).status, 'missing-value');
  grid.properties.updateTime = '2026-10-29T09:00:00Z';
  assert.equal(sky.skyCoverAt(grid, '2026-11-01T10:00:00Z', now).status, 'stale-grid');
});
test('sky-cover cannot turn thunder or incomplete weather into a good viewing score', () => {
  const grade = decision.weatherGrade;
  const cloud = { percent: 10, status: 'ok', updatedAt: '2026-10-31T12:00:00Z' };
  const thunder = sky.surfaceSkyAssessment({ shortForecast: 'Thunderstorms' }, cloud, grade);
  assert.equal(thunder.level, 'poor');
  const incomplete = sky.surfaceSkyAssessment({ shortForecast: 'Sunny' }, cloud, grade);
  assert.equal(incomplete.level, 'unknown');
  const good = { shortForecast: 'Sunny', windSpeed: '7 mph', probabilityOfPrecipitation: { value: 10 } };
  assert.equal(sky.surfaceSkyAssessment(good, { percent: 80, status: 'ok' }, grade).level, 'mixed');
  assert.equal(sky.surfaceSkyAssessment(good, { status: 'missing-field' }, grade).cloudCoverPercent, null);
});
test('meaningful sky difference favors lower forecast cloud only when both sites have evidence', () => {
  const area = (id, name, percent, level = 'good') => ({
    id, name, cloudStatus: 'ok', cloudCoverPercent: percent,
    assessment: { level }
  });
  const a = area('titusville', 'Titusville', 23);
  const b = area('port-canaveral', 'Port Canaveral', 67, 'mixed');
  const better = sky.skyComparison([a, b]);
  assert.equal(better.level, 'contrast');
  assert.equal(better.winner, 'titusville');
  assert.equal(better.difference, 44);
  assert.match(better.detail, /not a verified rocket-viewing advantage/i);
  assert.equal(sky.skyComparison([a, area('port-canaveral', 'Port Canaveral', 32)]).level, 'comparable');
  assert.equal(sky.skyComparison([a, { ...b, cloudStatus: 'stale-grid' }]).level, 'unknown');
});

test('selecting a mission recalculates its own NPS access and dual-area NWS gridded sky', async () => {
  const orig = global.fetch;
  const originalNpsKey = process.env.NPS_API_KEY;
  delete process.env.NPS_API_KEY;
  const idDay = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const idExact = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const exactTime = new Date(Date.now() + 3 * 3600000).toISOString();
  const target = Date.parse(exactTime);
  const validTime = new Date(target - 3600000).toISOString() + '/PT4H';
  const hourly = { properties: { periods: [{
    startTime: new Date(target - 3600000).toISOString(),
    endTime: new Date(target + 3600000).toISOString(),
    shortForecast: 'Sunny', windSpeed: '8 mph', probabilityOfPrecipitation: { value: 10 }
  }] } };
  const point = (id) => ({
    properties: {
      forecastHourly: 'https://api.weather.gov/gridpoints/MLB/' + id + '/forecast/hourly',
      forecastGridData: 'https://api.weather.gov/gridpoints/MLB/' + id
    }
  });
  const grid = percent => ({ properties: {
    updateTime: new Date(Date.now() - 3600000).toISOString(),
    skyCover: { uom: 'wmoUnit:percent', values: [{ validTime, value: percent }] }
  } });
  global.fetch = async url => {
    url = String(url);
    if (url.includes('ll.thespacedevs.com')) return response({ results: [
      launch(idDay, new Date(Date.now() + 86400000).toISOString(), 'Day'),
      launch(idExact, exactTime)
    ] });
    if (url.includes('park-alerts-cana.json')) return response([
      { ...ALERT, is_active: 1 }, { ...NPS_HOURS, is_active: 1 }
    ]);
    if (url.includes('/points/28.6139')) return response(point('48,74'));
    if (url.includes('/points/28.5664')) return response(point('47,73'));
    if (url.includes('/points/28.6247')) return response(point('49,75'));
    if (url.includes('/points/28.6783')) return response(point('50,76'));
    if (url.includes('/points/28.4073')) return response(point('55,65'));
    if (/\/gridpoints\/MLB\/(48,74|55,65|47,73|49,75|50,76)\/forecast\/hourly$/.test(url)) return response(hourly);
    if (url.endsWith('/gridpoints/MLB/48,74')) return response(grid(20));
    if (url.endsWith('/gridpoints/MLB/55,65')) return response(grid(70));
    if (url.endsWith('/gridpoints/MLB/47,73')) return response(grid(35));
    if (url.endsWith('/gridpoints/MLB/49,75')) return response(grid(26));
    if (url.endsWith('/gridpoints/MLB/50,76')) return response(grid(45));
    throw new Error('Unmocked URL: ' + url);
  };
  try {
    const first = mockRes();
    await handler({ method: 'GET', query: {} }, first);
    assert.equal(first.statusCode, 200);
    assert.equal(first.body.next.id, idExact, 'earliest by net should be exact at +3h');
    assert.equal(first.body.skyComparison.winner, 'titusville');
    assert.equal(first.body.viewingWeatherByArea[0].cloudCoverPercent, 20);
    assert.equal(first.body.viewingWeatherByArea[1].cloudCoverPercent, 70);
    assert.equal(first.body.viewingWeatherByArea.length,5);
    assert.equal(first.body.geographicViewing.points.find(p=>p.id==='playalinda-lot-8').weather.cloudCoverPercent,45);
    assert.equal(first.body.geographicViewing.points.find(p=>p.id==='space-view').weather.cloudCoverPercent,20);
    assert.equal(first.body.arrivalGuidance.estimatedRoadRestrictionAt, new Date(target - 1800000).toISOString());
    assert.equal(first.body.viewpoints.find(v => v.id === 'playalinda-north').level, 'closed');
    const selected = mockRes();
    await handler({ method: 'GET', query: { launchId: idDay } }, selected);
    assert.equal(selected.statusCode, 200);
    assert.equal(selected.body.selectedLaunchId, idDay);
    assert.equal(selected.body.next.netPrecision, 'day');
    assert.equal(selected.body.skyComparison.level, 'unknown');
    assert.equal(selected.body.arrivalGuidance.estimatedRoadRestrictionAt, null);
    const notFound = mockRes();
    await handler({ method: 'GET', query: { launchId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' } }, notFound);
    assert.equal(notFound.statusCode, 404);
    const invalid = mockRes();
    await handler({ method: 'GET', query: { launchId: '../unsafe' } }, invalid);
    assert.equal(invalid.statusCode, 400);
  } finally {
    global.fetch = orig;
    if (originalNpsKey === undefined) delete process.env.NPS_API_KEY;
    else process.env.NPS_API_KEY = originalNpsKey;
  }
});

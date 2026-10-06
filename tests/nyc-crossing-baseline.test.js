'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  BASELINE_KIND,
  MIN_SAMPLES,
  buildBaselineUrl,
  normalizeBaselineRows,
  enrichNycdotBaselines,
  _internal,
} = require('../lib/nyc-crossing/baseline');

const now = new Date('2026-10-06T12:30:00Z');

function liveTraffic() {
  return {
    state: 'PARTIAL',
    routes: [{
      crossingId: 'queens-midtown',
      etaMinutes: 5,
      sourceName: 'NYC DOT Traffic Management Center',
      linkId: '4456510',
    }],
  };
}

test('NYC historical baseline query is tightly bounded to same weekday/hour and audited links', () => {
  const url = new URL(buildBaselineUrl(now));
  assert.equal(url.origin + url.pathname, 'https://data.cityofnewyork.us/resource/i4gi-tjb9.json');
  const where = url.searchParams.get('$where');
  const select = url.searchParams.get('$select');
  assert.match(select, /avg\(travel_time::number\)/);
  assert.match(select, /count\(travel_time\)/);
  assert.match(where, /status='0'/);
  assert.match(where, /date_extract_dow\(data_as_of\)=2/);
  assert.match(where, /date_extract_hh\(data_as_of\)=8/);
  assert.match(where, /travel_time::number>0/);
  assert.doesNotMatch(select + ' ' + where, /to_number\(/);
  assert.match(where, /4456510/);
  assert.match(where, /4763652/);
  assert.match(where, /2026-08-11T00:00:00\.000/);
  assert.match(where, /2026-10-05T23:59:59\.999/);
  assert.equal(url.searchParams.get('$group'), 'link_id');
  assert.equal(url.searchParams.get('$limit'), '100');
  assert.match(_internal.memoryCache instanceof Map ? 'ok' : '', /ok/);
  assert.match(require('../lib/nyc-crossing/baseline').baselineCacheKey(now), /baseline:v2:/);
});

test('historical baseline rows require enough valid observations', () => {
  const doc = normalizeBaselineRows([
    { link_id: '4456510', avg_travel_time: '180', samples: String(MIN_SAMPLES) },
    { link_id: '4456501', avg_travel_time: '240', samples: String(MIN_SAMPLES - 1) },
    { link_id: 'bogus', avg_travel_time: '120', samples: '100' },
  ], now);
  assert.deepEqual(doc.byLinkId['4456510'], { baselineMinutes: 3, samples: MIN_SAMPLES });
  assert.equal(doc.byLinkId['4456501'], undefined);
  assert.equal(doc.byLinkId.bogus, undefined);
});

test('NYC DOT live route receives an 8-week same-hour delay comparison and cache write', async () => {
  _internal.clearMemoryCache();
  let cacheWrite = null;
  const redisCommandImpl = async command => {
    if (command[0] === 'GET') return null;
    if (command[0] === 'SET') cacheWrite = command;
    return 'OK';
  };
  const fetchImpl = async url => {
    assert.match(String(url), /data\.cityofnewyork\.us/);
    return {
      ok: true,
      json: async () => [{ link_id: '4456510', avg_travel_time: '180', samples: '96' }],
    };
  };

  const traffic = liveTraffic();
  await enrichNycdotBaselines(traffic, { now, fetchImpl, redisCommandImpl, env: {} });
  const route = traffic.routes[0];
  assert.equal(route.baselineMinutes, 3);
  assert.equal(route.delayMinutes, 2);
  assert.equal(route.baselineKind, BASELINE_KIND);
  assert.equal(route.baselineSamples, 96);
  assert.match(route.baselineSource, /data\.cityofnewyork\.us/);
  assert.equal(traffic.baselineState, 'LIVE');
  assert.equal(traffic.baselineCount, 1);
  assert.match(traffic.baselineReason, /1 NYC DOT live route enriched/);
  assert.ok(cacheWrite);
  assert.equal(cacheWrite[0], 'SET');
});

test('cached NYC baseline avoids another historical data request', async () => {
  _internal.clearMemoryCache();
  const cached = JSON.stringify({
    kind: BASELINE_KIND,
    byLinkId: { '4456510': { baselineMinutes: 4, samples: 80 } },
  });
  const redisCommandImpl = async command => command[0] === 'GET' ? cached : 'OK';
  const fetchImpl = async () => { throw new Error('historical fetch should not run'); };

  const traffic = liveTraffic();
  await enrichNycdotBaselines(traffic, { now, fetchImpl, redisCommandImpl, env: {} });
  assert.equal(traffic.routes[0].baselineMinutes, 4);
  assert.equal(traffic.routes[0].delayMinutes, 1);
  assert.equal(traffic.routes[0].baselineSamples, 80);
  assert.equal(traffic.baselineState, 'LIVE');
  assert.equal(traffic.baselineCount, 1);
});

test('historical baseline outage never erases live authority traffic', async () => {
  _internal.clearMemoryCache();
  const traffic = liveTraffic();
  await enrichNycdotBaselines(traffic, {
    now,
    fetchImpl: async () => { throw new Error('open data unavailable'); },
    redisCommandImpl: async () => null,
    env: {},
  });
  assert.equal(traffic.routes[0].etaMinutes, 5);
  assert.equal(traffic.routes[0].baselineMinutes, undefined);
  assert.equal(traffic.routes[0].delayMinutes, undefined);
  assert.equal(traffic.baselineState, 'UNAVAILABLE');
  assert.equal(traffic.baselineCount, 0);
  assert.match(traffic.baselineReason, /unavailable/i);
});

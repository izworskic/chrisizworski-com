'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const traffic = require('../lib/nyc-crossing/traffic');
const { buildSnapshot } = require('../lib/nyc-crossing/engine');

const NOW = new Date('2026-10-07T14:15:00Z');
const CACHE_URL = 'https://cache.example.test';
const FIXED_COORDINATES = {
  queensboro: '-73.944306,40.752111;-73.9547,40.7569;-73.9638,40.7603',
  williamsburg: '-73.9586,40.7097;-73.972211,40.713747;-73.9853,40.7181',
};

function routeBody(id = 'queensboro') {
  return {
    code: 'Ok',
    waypoints: [{ distance: 4 }, { distance: 2 }, { distance: 5 }],
    routes: [{
      duration: id === 'queensboro' ? 480 : 240,
      duration_typical: 300,
      distance: id === 'queensboro' ? 2600 : 2400,
      legs: [],
    }],
  };
}

function response(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function harness(respond = id => response(200, routeBody(id))) {
  const h = {
    env: { MAPBOX_TOKEN: 'synthetic-secret-token', UPSTASH_REDIS_REST_URL: CACHE_URL, UPSTASH_REDIS_REST_TOKEN: 'synthetic-cache-token' },
    commands: [],
    requests: [],
    cached: null,
    respond,
  };
  h.fetchImpl = async (url, options) => {
    if (url === CACHE_URL) {
      const command = JSON.parse(options.body);
      h.commands.push(command);
      if (command[0] === 'GET') return response(200, { result: h.cached });
      assert.equal(command[0], 'SET');
      h.cached = command[2];
      return response(200, { result: 'OK' });
    }
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://api.mapbox.com');
    const coordinates = decodeURIComponent(parsed.pathname.split('/').pop());
    const id = Object.keys(FIXED_COORDINATES).find(key => FIXED_COORDINATES[key] === coordinates);
    assert.ok(id, 'request must retain the exact three fixed bridge coordinates');
    assert.equal(parsed.searchParams.get('radiuses'), '200;120;200');
    assert.equal(parsed.searchParams.get('alternatives'), 'false');
    assert.equal(parsed.searchParams.get('depart_at'), 'now');
    h.requests.push({ id, options });
    return h.respond(id, options);
  };
  h.fetch = () => traffic.fetchMapboxTraffic({ env: h.env, fetchImpl: h.fetchImpl, now: NOW });
  return h;
}

const drain = () => new Promise(resolve => setImmediate(resolve));
function assertNoCache(h) {
  assert.equal(traffic._internal.mapboxMemoryCache.value, null);
  assert.equal(traffic._internal.mapboxMemoryCache.expiresAt, 0);
  assert.equal(h.commands.filter(command => command[0] === 'SET').length, 0);
}

test.beforeEach(() => traffic._internal.clearMapboxCache());
test.afterEach(() => traffic._internal.clearMapboxCache());

test('real attempt signals allow eight seconds; two concurrent probes and one retry bound total routing time to sixteen seconds', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: NOW.getTime() });
  const budgets = [];
  t.mock.method(AbortSignal, 'timeout', ms => {
    budgets.push(ms);
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException('deadline', 'TimeoutError')), ms);
    return controller.signal;
  });
  const h = harness((_id, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  const started = Date.now();
  const pending = h.fetch();
  await drain();
  assert.equal(h.requests.length, 2, 'both probes start concurrently');
  t.mock.timers.tick(7999);
  await drain();
  assert.equal(h.requests.length, 2, 'no premature 2.5-second abort');
  t.mock.timers.tick(1);
  await drain();
  assert.equal(h.requests.length, 4, 'one retry per timed-out probe');
  t.mock.timers.tick(8000);
  const result = await pending;
  assert.equal(Date.now() - started, 16000);
  assert.equal(result.state, 'UNAVAILABLE');
  assert.match(result.reason, /timeout \(8000 ms, attempt 1\)/);
  assert.match(result.reason, /timeout \(8000 ms, attempt 2\)/);
  assert.deepEqual(budgets.filter(ms => ms !== traffic.MAPBOX_CACHE_TIMEOUT_MS), [8000, 8000, 8000, 8000]);
  assertNoCache(h);
});

test('a timeout is not cached and the very next request can recover immediately', async () => {
  const h = harness(() => { throw new DOMException('deadline', 'TimeoutError'); });
  assert.equal((await h.fetch()).state, 'UNAVAILABLE');
  assert.equal(h.requests.length, 4);
  assertNoCache(h);
  h.respond = id => response(200, routeBody(id));
  const result = await h.fetch();
  assert.equal(result.state, 'LIVE');
  assert.equal(h.requests.length, 6);
});

test('persistent HTTP 5xx is retried once, is not cached, and recovers on the next request', async () => {
  const h = harness(() => response(503, { message: 'Routing temporarily unavailable' }));
  const failed = await h.fetch();
  assert.equal(failed.state, 'UNAVAILABLE');
  assert.match(failed.reason, /HTTP 503 \(Routing temporarily unavailable\)/);
  assert.equal(h.requests.length, 4);
  assertNoCache(h);
  h.respond = id => response(200, routeBody(id));
  assert.equal((await h.fetch()).state, 'LIVE');
  assert.equal(h.requests.length, 6);
});

test('a transient HTTP 5xx recovers on the single retry and preserves attempt diagnostics', async () => {
  const counts = {};
  const h = harness(id => {
    counts[id] = (counts[id] || 0) + 1;
    return counts[id] === 1 ? response(502, { message: 'Bad Gateway' }) : response(200, routeBody(id));
  });
  const result = await h.fetch();
  assert.equal(result.state, 'LIVE');
  assert.deepEqual(counts, { queensboro: 2, williamsburg: 2 });
  assert.match(result.reason, /HTTP 502/);
  assert.match(result.reason, /LIVE \(\d+ ms, attempt 2\)/);
});

test('a transient timeout recovers on exactly one retry per probe', async () => {
  const counts = {};
  const h = harness(id => {
    counts[id] = (counts[id] || 0) + 1;
    if (counts[id] === 1) throw new DOMException('deadline', 'TimeoutError');
    return response(200, routeBody(id));
  });
  const result = await h.fetch();
  assert.equal(result.state, 'LIVE');
  assert.deepEqual(counts, { queensboro: 2, williamsburg: 2 });
  assert.match(result.reason, /timeout/);
  assert.match(result.reason, /LIVE \(\d+ ms, attempt 2\)/);
});

test('successful LIVE routes use normal memory and Redis TTLs and avoid another provider request', async () => {
  const h = harness();
  const result = await h.fetch();
  await drain();
  assert.equal(result.state, 'LIVE');
  assert.equal(traffic._internal.mapboxMemoryCache.value, result);
  assert.ok(traffic._internal.mapboxMemoryCache.expiresAt > Date.now() + 59000);
  const write = h.commands.find(command => command[0] === 'SET');
  assert.deepEqual(write.slice(3), ['EX', 90]);
  assert.equal(JSON.parse(write[2]).state, 'LIVE');
  assert.equal(await h.fetch(), result);
  assert.equal(h.requests.length, 2);
  assert.equal(h.commands.filter(command => command[0] === 'GET').length, 1);
  traffic._internal.clearMapboxCache();
  assert.equal((await h.fetch()).state, 'LIVE', 'successful Redis cache can warm memory');
  assert.equal(h.requests.length, 2);
});

test('PARTIAL results do not delay recovery of their failed probe', async () => {
  const h = harness(id => id === 'queensboro' ? response(200, routeBody(id)) : response(503, { message: 'Unavailable' }));
  assert.equal((await h.fetch()).state, 'PARTIAL');
  assert.equal(h.requests.length, 3);
  assertNoCache(h);
  h.respond = id => response(200, routeBody(id));
  assert.equal((await h.fetch()).state, 'LIVE');
  assert.equal(h.requests.length, 5);
});

test('NOT_CONFIGURED never fetches or populates either cache', async () => {
  const h = harness();
  h.env.MAPBOX_TOKEN = '';
  assert.equal((await h.fetch()).state, 'NOT_CONFIGURED');
  assert.equal(h.commands.length, 0);
  assert.equal(h.requests.length, 0);
  assertNoCache(h);
});

test('old UNAVAILABLE, PARTIAL, and NOT_CONFIGURED documents are ignored on cache reads', async () => {
  for (const state of ['UNAVAILABLE', 'PARTIAL', 'NOT_CONFIGURED']) {
    traffic._internal.clearMapboxCache();
    const old = { state, reason: 'old cached failure', routes: [] };
    traffic._internal.mapboxMemoryCache.value = old;
    traffic._internal.mapboxMemoryCache.expiresAt = Date.now() + 60000;
    const h = harness();
    h.cached = JSON.stringify(old);
    assert.equal((await h.fetch()).state, 'LIVE');
    assert.equal(h.requests.length, 2);
  }
});

test('401, 403, and all other tested 4xx responses never retry or cache', async () => {
  for (const status of [400, 401, 403, 404, 422, 429]) {
    const h = harness(() => response(status, { message: status === 401 ? 'Invalid Token' : 'Request rejected' }));
    const result = await h.fetch();
    assert.equal(result.state, 'UNAVAILABLE');
    assert.match(result.reason, new RegExp(`HTTP ${status}`));
    assert.equal(h.requests.length, 2);
    assertNoCache(h);
  }
});

test('a known 4xx with a timed-out error body still does not retry', async () => {
  const h = harness(() => ({ ok: false, status: 403, json: async () => { throw new DOMException('deadline', 'TimeoutError'); } }));
  const result = await h.fetch();
  assert.match(result.reason, /HTTP 403/);
  assert.equal(h.requests.length, 2);
  assertNoCache(h);
});

test('NoRoute, NoSegment, normalization, distance, and waypoint failures are distinct and never retry', async () => {
  const cases = [
    [{ code: 'NoRoute' }, /Mapbox NoRoute/],
    [{ code: 'NoSegment' }, /Mapbox NoSegment/],
    [{ code: 'Ok', routes: [] }, /response normalization failure/],
    [{ ...routeBody(), routes: [null] }, /response normalization failure/],
    [{ ...routeBody(), routes: [{ duration: 0, duration_typical: 300, distance: 2600 }] }, /duration\/duration_typical failed sanity checks/],
    [{ ...routeBody(), routes: [{ duration: 300, distance: 2600 }] }, /duration\/duration_typical failed sanity checks/],
    [{ ...routeBody(), routes: [{ duration: 300, duration_typical: 300, distance: 12000 }] }, /route-distance sanity failure/],
    [{ ...routeBody(), waypoints: [{ distance: 251 }] }, /waypoint snap failure/],
  ];
  for (const [body, reason] of cases) {
    const h = harness(() => response(200, body));
    const result = await h.fetch();
    assert.equal(result.state, 'UNAVAILABLE');
    assert.match(result.reason, reason);
    assert.equal(h.requests.length, 2);
    assertNoCache(h);
  }
});

test('malformed JSON does not retry; a body timeout does retry once', async () => {
  for (const [error, expectedRequests, reason] of [
    [new SyntaxError('Unexpected JSON'), 2, /response normalization failure/],
    [new DOMException('body deadline', 'TimeoutError'), 4, /timeout/],
  ]) {
    const h = harness(() => ({ ok: true, json: async () => { throw error; } }));
    const result = await h.fetch();
    assert.equal(result.state, 'UNAVAILABLE');
    assert.match(result.reason, reason);
    assert.equal(h.requests.length, expectedRequests);
    assertNoCache(h);
  }
});

test('network failures do not retry and diagnostics redact tokens in messages and URLs', async () => {
  const h = harness(() => { throw new Error(`fetch failed: https://api.mapbox.com?access_token=${h.env.MAPBOX_TOKEN}`); });
  const result = await h.fetch();
  assert.equal(h.requests.length, 2);
  assert.doesNotMatch(result.reason, /synthetic-secret-token/);
  assert.match(result.reason, /redacted/);
  assertNoCache(h);
  h.respond = () => response(403, { message: `Forbidden: ${h.env.MAPBOX_TOKEN}` });
  const forbidden = await h.fetch();
  assert.match(forbidden.reason, /HTTP 403 \(Forbidden: \[redacted\]\)/);
  assert.doesNotMatch(forbidden.reason, /synthetic-secret-token/);
});

test('both unchanged fixed bridge probes normalize to finite ETA, typical baseline, and valid distance', async () => {
  const result = await harness().fetch();
  assert.equal(result.state, 'LIVE');
  for (const id of Object.keys(FIXED_COORDINATES)) {
    const route = result.routes.find(item => item.crossingId === id);
    assert.equal(route.sourceName, 'Mapbox live traffic routing');
    assert.ok(Number.isFinite(route.etaMinutes));
    assert.ok(Number.isFinite(route.baselineMinutes));
    assert.equal(route.baselineKind, 'MAPBOX_TYPICAL_TRAFFIC');
    assert.equal(route.scope, 'CROSSING_APPROACH');
    assert.equal(route.mapboxDistanceMeters, routeBody(id).routes[0].distance);
  }
  assert.equal(buildSnapshot({ traffic: traffic.mergeTraffic([], [], result, NOW) }).fastest, null);
});

test('official PANYNJ and NYC DOT readings still outrank overlapping Mapbox results and unlike scopes never rank fastest', async () => {
  const pa = traffic.normalizePortAuthority([{
    crossingDisplayName: 'Lincoln Tunnel', travelDirection: 'ToNY', isDataAvailable: true,
    isCrossingClosed: false, timeStamp: '10:14 AM', routeTravelTime: 12, routeTravelTimeHist: 9,
  }], NOW);
  const dot = traffic.normalizeNycdotTraffic([
    'Id\tSpeed\tTravelTime\tStatus\tDataAsOf\tlinkId\tOwner\tTranscom_id\tBorough\tlinkName',
    '1\t23\t210\t0\t10/7/2026 10:14:00\t4456510\tMTA\t4456510\tManhattan\tQMT W Toll Plaza - Manhattan Side',
  ].join('\n'), NOW);
  assert.equal(pa.length, 1);
  assert.equal(dot.length, 1);
  const mapbox = await harness().fetch();
  mapbox.routes = [...mapbox.routes,
    { ...mapbox.routes[0], crossingId: 'lincoln', etaMinutes: 1 },
    { ...mapbox.routes[1], crossingId: 'queens-midtown', etaMinutes: 1 },
  ];
  const merged = traffic.mergeTraffic(pa, dot, mapbox, NOW);
  assert.equal(merged.routes.find(route => route.crossingId === 'lincoln'), pa[0]);
  assert.equal(merged.routes.find(route => route.crossingId === 'queens-midtown'), dot[0]);
  assert.equal(merged.mapboxCount, 2);
  assert.equal(merged.comparable, false);
  const snapshot = buildSnapshot({ traffic: merged });
  assert.equal(snapshot.fastest, null);
  assert.equal(snapshot.routes.find(route => route.id === 'lincoln').trafficSourceName, 'Port Authority');
  assert.equal(snapshot.routes.find(route => route.id === 'queens-midtown').trafficSourceName, 'NYC DOT Traffic Management Center');
});

test('API responses with failed, partial, or unconfigured Mapbox cannot poison the CDN; LIVE retains normal caching', async t => {
  const baseline = require('../lib/nyc-crossing/baseline');
  let state;
  t.mock.method(traffic, 'fetchTraffic', async () => traffic.mergeTraffic([], [], { state, reason: 'test', routes: [] }, NOW));
  t.mock.method(baseline, 'enrichNycdotBaselines', async value => value);
  const handlerPath = require.resolve('../api/nyc-crossing');
  delete require.cache[handlerPath];
  const handler = require(handlerPath);
  for (state of ['UNAVAILABLE', 'PARTIAL', 'NOT_CONFIGURED', 'LIVE']) {
    const headers = {};
    const res = { setHeader: (key, value) => { headers[key] = value; }, status: () => res, json: value => value };
    await handler({ query: {} }, res);
    assert.equal(headers['Cache-Control'], state === 'LIVE' ? 'public, max-age=0, s-maxage=45, stale-while-revalidate=15' : 'no-store');
    assert.equal(headers['X-Robots-Tag'], 'noindex, nofollow');
  }
  delete require.cache[handlerPath];
});

function smokeSnapshot(state, reason, ids = []) {
  const routes = ids.map(id => traffic.normalizeMapboxResponse(id, routeBody(id), NOW));
  return buildSnapshot({ traffic: traffic.mergeTraffic([], [], { state, reason, routes }, NOW) });
}

test('production smoke fails authorization/request errors even when another probe is LIVE', async () => {
  const { evaluateMapboxHealth, mapboxDiagnostics } = await import('../scripts/smoke-nyc-crossing-production.mjs');
  for (const reason of ['HTTP 401 (Invalid Token)', 'Invalid Token', 'Not Authorized', 'HTTP 403', 'Forbidden', 'HTTP 422']) {
    const data = smokeSnapshot('PARTIAL', reason, ['queensboro']);
    assert.throws(() => evaluateMapboxHealth(data), error => error.fatal === true && error.message.includes(reason));
    assert.match(mapboxDiagnostics(data), /queensboro=LIVE \(source=Mapbox live traffic routing\)/);
    assert.match(mapboxDiagnostics(data), /williamsburg=UNAVAILABLE \(source=none\)/);
  }
});

test('production smoke explicitly reports temporary outages as DEGRADED and only both healthy probes earn PASS', async () => {
  const { evaluateMapboxHealth } = await import('../scripts/smoke-nyc-crossing-production.mjs');
  assert.equal(evaluateMapboxHealth(smokeSnapshot('UNAVAILABLE', 'queensboro: timeout; williamsburg: HTTP 503')), 'DEGRADED');
  assert.equal(evaluateMapboxHealth(smokeSnapshot('PARTIAL', 'williamsburg: timeout', ['queensboro'])), 'DEGRADED');
  assert.equal(evaluateMapboxHealth(smokeSnapshot('LIVE', 'two live probes', ['queensboro', 'williamsburg'])), 'PASS');
  assert.throws(() => evaluateMapboxHealth(smokeSnapshot('UNAVAILABLE', 'NoRoute')), /not a temporary/);
  assert.throws(() => evaluateMapboxHealth(smokeSnapshot('UNAVAILABLE', 'timeout; waypoint snap failure')), /route validation failed/);
  assert.throws(() => evaluateMapboxHealth(smokeSnapshot('NOT_CONFIGURED', 'not configured')), /unexpected mapboxState/);
  assert.throws(() => evaluateMapboxHealth(smokeSnapshot('LIVE', 'live', ['queensboro'])), /unavailable despite Mapbox LIVE/);
});

test('production smoke checks each fixed probe distance limit and finite typical baseline', async () => {
  const { evaluateMapboxHealth } = await import('../scripts/smoke-nyc-crossing-production.mjs');
  for (const [id, distance] of [['queensboro', 5200], ['williamsburg', 1300]]) {
    const data = smokeSnapshot('LIVE', 'live', ['queensboro', 'williamsburg']);
    data.routes.find(route => route.id === id).probeDistanceMeters = distance;
    assert.throws(() => evaluateMapboxHealth(data), /probe distance invalid/);
  }
  const data = smokeSnapshot('LIVE', 'live', ['queensboro', 'williamsburg']);
  data.routes.find(route => route.id === 'williamsburg').baselineMinutes = null;
  assert.throws(() => evaluateMapboxHealth(data), /baseline invalid/);
});

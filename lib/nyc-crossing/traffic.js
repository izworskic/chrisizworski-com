'use strict';

const PA_SOURCE = 'https://www.panynj.gov/bin/portauthority/crossingtimesapi.json';
const NYCDOT_SOURCE = 'https://linkdata.nyctmc.org/data/LinkSpeedQuery.txt';
const MAPBOX_SOURCE = 'https://api.mapbox.com/directions/v5/mapbox/driving-traffic';
const MAPBOX_DOCS = 'https://docs.mapbox.com/api/navigation/directions/';
const MAPBOX_CACHE_KEY = 'nyc:crossing:mapbox:v3';
const MAPBOX_CACHE_TTL_SECONDS = 90;
const MAPBOX_MEMORY_TTL_MS = 60 * 1000;
const MAPBOX_CACHE_TIMEOUT_MS = 750;
const MAPBOX_ROUTE_TIMEOUT_MS = 8000;
// Each probe gets at most two attempts; the probes run concurrently (16s total,
// plus the bounded cache read). Response bodies share the attempt's timeout.
const MAPBOX_MAX_ATTEMPTS = 2;

// Fixed, inbound crossing probes. The middle coordinate pins the requested bridge so the
// traffic-aware router cannot silently choose another crossing. New probes follow audited
// NYC DOT link geometry; bearings keep their anchors on the inbound carriageway.
const MAPBOX_PROBES = Object.freeze({
  queensboro: {
    crossingId: 'queensboro',
    scope: 'CROSSING_APPROACH',
    direction: 'Queens to Manhattan',
    approach: 'Queens Plaza South → East 60th Street via Ed Koch Queensboro Bridge',
    coordinates: [
      [-73.944306, 40.752111],
      [-73.954700, 40.756900],
      [-73.963800, 40.760300],
    ],
    minDistanceMeters: 1200,
    maxDistanceMeters: 5000,
  },
  williamsburg: {
    crossingId: 'williamsburg',
    scope: 'CROSSING_APPROACH',
    direction: 'Brooklyn to Manhattan',
    approach: 'Williamsburg approach → Delancey Street via Williamsburg Bridge',
    coordinates: [
      [-73.958600, 40.709700],
      [-73.972211, 40.713747],
      [-73.985300, 40.718100],
    ],
    minDistanceMeters: 1400,
    maxDistanceMeters: 5500,
  },
  manhattan: {
    crossingId: 'manhattan',
    scope: 'CROSSING_APPROACH',
    direction: 'Brooklyn to Manhattan',
    approach: 'Flatbush Avenue Extension → Canal Street via Manhattan Bridge',
    coordinates: [
      [-73.987600, 40.702090],
      [-73.991030, 40.708350],
      [-73.994850, 40.715800],
    ],
    bearings: '340,45;340,45;',
    minDistanceMeters: 1200,
    maxDistanceMeters: 3500,
  },
  rfk: {
    crossingId: 'rfk',
    scope: 'APPROACH_SEGMENT',
    direction: 'Toward Manhattan via RFK Manhattan span',
    approach: 'RFK Manhattan span → FDR Drive at East 116th Street',
    coordinates: [
      [-73.928460, 40.801100],
      [-73.929560, 40.801305],
      [-73.931280, 40.794270],
    ],
    bearings: '280,45;280,45;210,60',
    minDistanceMeters: 900,
    maxDistanceMeters: 2500,
  },
  verrazzano: {
    crossingId: 'verrazzano',
    scope: 'CROSSING_ONLY',
    direction: 'Staten Island to Brooklyn',
    approach: 'Staten Island-side gantry → Brooklyn-side gantry via Verrazzano–Narrows Bridge',
    coordinates: [
      [-74.052270, 40.603950],
      [-74.044930, 40.606280],
      [-74.039160, 40.608180],
    ],
    bearings: '67,45;67,45;67,45',
    minDistanceMeters: 1000,
    maxDistanceMeters: 2500,
  },
});
const mapboxMemoryCache = { value: null, expiresAt: 0 };
const PA_IDS = {
  'George Washington Bridge': 'gwb',
  'Lincoln Tunnel': 'lincoln',
  'Holland Tunnel': 'holland',
};

// These IDs are stable TRANSCOM/NYC TMC link identifiers exposed in the NYC DOT live speed feed.
// Scope is deliberately explicit because these links do not all represent comparable origin/destination lengths.
const NYCDOT_LINKS = Object.freeze({
  '4456510': { crossingId: 'queens-midtown', scope: 'CROSSING_ONLY', direction: 'Toward Manhattan', expectedName: 'QMT W Toll Plaza - Manhattan Side' },
  '4456501': { crossingId: 'hugh-carey', scope: 'CROSSING_ONLY', direction: 'Toward Manhattan', expectedName: 'BBT W Toll Plaza - Manhattan Portal' },
  '4616339': { crossingId: 'brooklyn', scope: 'APPROACH_CORRIDOR', direction: 'Toward Manhattan', expectedName: 'BQE N Atlantic Ave - BKN Bridge Manhattan Side' },
  '4616340': { crossingId: 'manhattan', scope: 'APPROACH_CORRIDOR', direction: 'Toward Manhattan', expectedName: 'BQE N Atlantic Ave - MAN Bridge Manhattan Side' },
  '4456452': { crossingId: 'rfk', scope: 'APPROACH_SEGMENT', direction: 'Toward Manhattan', expectedName: 'TBB W - FDR S MANHATTAN TRUSS - E116TH STREET' },
  '4763652': { crossingId: 'verrazzano', scope: 'CROSSING_ONLY', direction: 'Staten Island to Brooklyn', expectedName: 'VNB E SI GANTRY UPPER LEVEL - BROOKLYN GANTRY UPPER LEVEL' },
});

function finiteNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function roundTenth(value) {
  return Math.round(value * 10) / 10;
}

async function mapboxRedisCommand(command, { env = process.env, fetchImpl = fetch } = {}) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || '';
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || '';
  if (!url || !token) return null;
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(MAPBOX_CACHE_TIMEOUT_MS) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) throw new Error('NYC Mapbox cache unavailable');
  return json.result;
}

function normalizeMapboxResponse(crossingId, json, now = new Date()) {
  const probe = MAPBOX_PROBES[crossingId];
  if (json && ['NoRoute', 'NoSegment'].includes(json.code)) {
    throw new Error(`Mapbox ${json.code}`);
  }
  if (!probe || !json || json.code !== 'Ok' || !Array.isArray(json.routes) || !json.routes.length) {
    throw new Error('Mapbox response normalization failure: invalid traffic response');
  }
  const route = json.routes[0];
  if (!route || typeof route !== 'object') {
    throw new Error('Mapbox response normalization failure: missing route');
  }
  const duration = finiteNumber(route.duration);
  const typical = finiteNumber(route.duration_typical);
  const distance = finiteNumber(route.distance);
  if (
    duration == null || duration <= 0 || duration > 3600 ||
    typical == null || typical <= 0 || typical > 3600
  ) {
    throw new Error('Mapbox response normalization failure: duration/duration_typical failed sanity checks');
  }
  if (distance == null || distance < probe.minDistanceMeters || distance > probe.maxDistanceMeters) {
    throw new Error('Mapbox route-distance sanity failure: crossing probe failed sanity checks');
  }

  const waypoints = Array.isArray(json.waypoints) ? json.waypoints : [];
  if (waypoints.length && waypoints.some(point => finiteNumber(point && point.distance) != null && finiteNumber(point.distance) > 250)) {
    throw new Error('Mapbox waypoint snap failure: crossing probe snapped too far from an anchor');
  }

  const incidents = (Array.isArray(route.legs) ? route.legs : [])
    .flatMap(leg => Array.isArray(leg && leg.incidents) ? leg.incidents : []);
  const incident = incidents.find(item => item && (item.description || item.long_description));

  return {
    crossingId: probe.crossingId,
    etaMinutes: roundTenth(duration / 60),
    baselineMinutes: roundTenth(typical / 60),
    delayMinutes: roundTenth((duration - typical) / 60),
    baselineKind: 'MAPBOX_TYPICAL_TRAFFIC',
    baselineSamples: null,
    baselineSource: MAPBOX_DOCS,
    speedMph: null,
    historicalSpeedMph: null,
    trafficClass: null,
    scope: probe.scope,
    source: MAPBOX_DOCS,
    sourceName: 'Mapbox live traffic routing',
    reportedAt: now.toISOString(),
    approach: probe.approach,
    lane: null,
    incident: incident ? (incident.description || incident.long_description) : null,
    direction: probe.direction,
    mapboxDistanceMeters: Math.round(distance),
  };
}

function isLiveMapboxResult(value) {
  return value && value.state === 'LIVE' && Array.isArray(value.routes) &&
    value.routes.length === Object.keys(MAPBOX_PROBES).length &&
    Object.keys(MAPBOX_PROBES).every(id => value.routes.some(route => route && route.crossingId === id));
}

function safeMapboxDetail(value, token) {
  let detail = String(value || 'request failed');
  for (const secret of [token, encodeURIComponent(token)]) {
    if (secret) detail = detail.split(secret).join('[redacted]');
  }
  return detail.replace(/access_token=[^\s)&]+/gi, 'access_token=[redacted]')
    .replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
}

async function fetchMapboxProbe(probe, { fetchImpl, token, now }) {
  const coordinates = probe.coordinates.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const params = new URLSearchParams({
    access_token: token,
    alternatives: 'false',
    overview: 'false',
    steps: 'false',
    depart_at: 'now',
    radiuses: '200;120;200',
  });
  if (probe.bearings) params.set('bearings', probe.bearings);
  const diagnostics = [];
  for (let attempt = 1; attempt <= MAPBOX_MAX_ATTEMPTS; attempt += 1) {
    const started = Date.now();
    const signal = AbortSignal.timeout(MAPBOX_ROUTE_TIMEOUT_MS);
    let retryable = false;
    let readingBody = false;
    let normalizing = false;
    let detail;
    try {
      const response = await fetchImpl(`${MAPBOX_SOURCE}/${coordinates}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        signal,
      });
      if (!response.ok) {
        // A known 4xx must never retry, even if reading its error body fails.
        retryable = response.status >= 500 && response.status <= 599;
        const body = await response.json().catch(() => ({}));
        const message = body && body.message ? safeMapboxDetail(body.message, token) : '';
        detail = `HTTP ${response.status}${message ? ` (${message})` : ''}`;
      } else {
        readingBody = true;
        const json = await response.json();
        readingBody = false;
        normalizing = true;
        const route = normalizeMapboxResponse(probe.crossingId, json, now);
        diagnostics.push(`LIVE (${Date.now() - started} ms, attempt ${attempt})`);
        return { route, failure: null, diagnostic: `${probe.crossingId}: ${diagnostics.join('; ')}` };
      }
    } catch (error) {
      retryable = !normalizing && !(error instanceof SyntaxError) &&
        (signal.aborted || ['TimeoutError', 'AbortError'].includes(error && error.name));
      detail = retryable ? 'timeout' : `${readingBody ? 'response normalization failure: ' : ''}${safeMapboxDetail(error && error.message, token)}`;
    }
    diagnostics.push(`${detail} (${Date.now() - started} ms, attempt ${attempt})`);
    if (!retryable) break;
  }
  const failure = `${probe.crossingId}: ${diagnostics.join('; ')}`;
  return { route: null, failure, diagnostic: failure };
}

async function fetchMapboxTraffic({ fetchImpl = fetch, env = process.env, now = new Date() } = {}) {
  const token = String(env.MAPBOX_ACCESS_TOKEN || env.MAPBOX_TOKEN || env.MAPBOX_KEY || '').trim();
  if (!token) {
    return { state: 'NOT_CONFIGURED', reason: 'Mapbox access token is not configured.', routes: [] };
  }

  if (isLiveMapboxResult(mapboxMemoryCache.value) && mapboxMemoryCache.expiresAt > Date.now()) {
    return mapboxMemoryCache.value;
  }
  mapboxMemoryCache.value = null;
  mapboxMemoryCache.expiresAt = 0;

  try {
    const cached = await mapboxRedisCommand(['GET', MAPBOX_CACHE_KEY], { env, fetchImpl });
    if (cached) {
      const value = typeof cached === 'string' ? JSON.parse(cached) : cached;
      // Ignore failure/partial documents left behind by older deployments too.
      if (isLiveMapboxResult(value)) {
        mapboxMemoryCache.value = value;
        mapboxMemoryCache.expiresAt = Date.now() + MAPBOX_MEMORY_TTL_MS;
        return value;
      }
    }
  } catch (_) {
    // Cache failure is non-fatal. A direct routing request is still allowed.
  }

  const results = await Promise.all(Object.values(MAPBOX_PROBES).map(probe =>
    fetchMapboxProbe(probe, { fetchImpl, token, now })
  ));

  const routes = results.map(entry => entry.route).filter(Boolean);
  const diagnostics = results.map(entry => entry.diagnostic).join('; ');
  const count = Object.keys(MAPBOX_PROBES).length;
  const value = {
    state: routes.length === count ? 'LIVE' : (routes.length ? 'PARTIAL' : 'UNAVAILABLE'),
    reason: routes.length === count
      ? `${routes.length} of ${count} fixed crossing probes returned usable live-traffic routes. ${diagnostics}`
      : routes.length
        ? `${routes.length} of ${count} fixed crossing probes returned usable live-traffic routes. ${diagnostics}`
        : `Mapbox live traffic routing returned no usable fixed crossing probes. ${diagnostics}`,
    routes,
    fetchedAt: now.toISOString(),
  };
  // Do not cache PARTIAL either: its failed probe must be able to recover on the
  // very next request. Only a complete, normalized LIVE result gets normal TTLs.
  if (isLiveMapboxResult(value)) {
    mapboxMemoryCache.value = value;
    mapboxMemoryCache.expiresAt = Date.now() + MAPBOX_MEMORY_TTL_MS;
    // Cache persistence is best-effort and stays off the critical response path.
    void mapboxRedisCommand(['SET', MAPBOX_CACHE_KEY, JSON.stringify(value), 'EX', MAPBOX_CACHE_TTL_SECONDS], { env, fetchImpl })
      .catch(() => {});
  }

  return value;
}

// The Port Authority feed publishes an Eastern clock time without a date.
// Only accept readings within the last 15 minutes.
function freshClock(clock, now) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(clock || '');
  if (!m || +m[1] < 1 || +m[1] > 12 || +m[2] > 59) return false;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hourCycle: 'h23',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(now);
  const current = +parts.find(p => p.type === 'hour').value * 60 + +parts.find(p => p.type === 'minute').value;
  const published = (+m[1] % 12 + (m[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + +m[2];
  const age = (current - published + 1440) % 1440;
  return age <= 15;
}

function easternWallClockMs(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = type => Number(parts.find(p => p.type === type).value);
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
}

function parseEasternWallClock(value) {
  const text = String(value || '').trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/.exec(text);
  if (m) return Date.UTC(+m[3], +m[1] - 1, +m[2], +m[4], +m[5], +m[6]);
  m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/.exec(text);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return null;
}

function freshNycdotTimestamp(value, now = new Date()) {
  const published = parseEasternWallClock(value);
  if (published == null) return false;
  const ageMs = easternWallClockMs(now) - published;
  return ageMs >= -2 * 60 * 1000 && ageMs <= 15 * 60 * 1000;
}

function normalizePortAuthority(rows, now = new Date()) {
  if (!Array.isArray(rows)) throw new Error('Invalid Port Authority traffic response');
  const routes = Object.entries(PA_IDS).flatMap(([name, crossingId]) => {
    const lanes = rows.filter(r =>
      r.crossingDisplayName === name &&
      r.travelDirection === 'ToNY' &&
      r.isDataAvailable === true &&
      r.isCrossingClosed === false &&
      freshClock(r.timeStamp, now) &&
      typeof r.routeTravelTime === 'number' &&
      r.routeTravelTime > 0 &&
      r.routeTravelTime <= 240
    );
    if (!lanes.length) return [];
    const fastest = lanes.reduce((a, b) => a.routeTravelTime <= b.routeTravelTime ? a : b);
    const baseline = finiteNumber(fastest.routeTravelTimeHist);
    const current = finiteNumber(fastest.routeTravelTime);
    return [{
      crossingId,
      etaMinutes: current,
      baselineMinutes: baseline && baseline > 0 ? baseline : null,
      delayMinutes: baseline && baseline > 0 ? current - baseline : null,
      baselineKind: baseline && baseline > 0 ? 'AUTHORITY_HISTORICAL' : null,
      baselineSamples: null,
      baselineSource: baseline && baseline > 0 ? PA_SOURCE : null,
      speedMph: finiteNumber(fastest.routeSpeed),
      historicalSpeedMph: finiteNumber(fastest.routeSpeedHist),
      trafficClass: fastest.infomationalText || null,
      scope: 'CROSSING_APPROACH',
      source: PA_SOURCE,
      sourceName: 'Port Authority',
      reportedAt: fastest.timeStamp + ' ET',
      approach: fastest.routeName,
      lane: fastest.facilityModifier || null,
      incident: fastest.infomationalText || null,
      direction: 'Toward New York',
    }];
  });
  return routes;
}

function cleanField(value) {
  const text = String(value ?? '').trim();
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) return text.slice(1, -1).replace(/""/g, '"');
  return text;
}

function normalizeHeader(value) {
  return cleanField(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseNycdotTsv(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  if (!lines.length) return [];
  const headers = lines.shift().split('\t').map(normalizeHeader);
  const required = ['linkid', 'traveltime', 'status', 'dataasof', 'speed', 'owner', 'transcomid', 'borough', 'linkname'];
  if (!required.every(key => headers.includes(key))) throw new Error('Unexpected NYC DOT traffic feed schema');

  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    let joined = lines[i];
    let fields = joined.split('\t');
    while (fields.length < headers.length && i + 1 < lines.length) {
      joined += lines[++i];
      fields = joined.split('\t');
    }
    if (fields.length < headers.length) continue;
    const row = {};
    for (let j = 0; j < headers.length; j++) row[headers[j]] = cleanField(fields[j]);
    rows.push(row);
  }
  return rows;
}

function normalizeNycdotTraffic(text, now = new Date()) {
  const rows = parseNycdotTsv(text);
  const routes = [];
  for (const row of rows) {
    const link = NYCDOT_LINKS[row.linkid];
    if (!link) continue;
    const travelSeconds = finiteNumber(row.traveltime);
    const speed = finiteNumber(row.speed);
    const status = finiteNumber(row.status);
    if (
      status !== 0 ||
      !freshNycdotTimestamp(row.dataasof, now) ||
      travelSeconds == null ||
      travelSeconds <= 0 ||
      travelSeconds > 3600 ||
      speed == null ||
      speed <= 0
    ) continue;
    if (row.linkname && row.linkname !== link.expectedName) continue;
    routes.push({
      crossingId: link.crossingId,
      etaMinutes: Math.round((travelSeconds / 60) * 10) / 10,
      baselineMinutes: null,
      delayMinutes: null,
      speedMph: speed,
      historicalSpeedMph: null,
      trafficClass: null,
      scope: link.scope,
      source: NYCDOT_SOURCE,
      sourceName: 'NYC DOT Traffic Management Center',
      reportedAt: row.dataasof + ' ET',
      approach: row.linkname || link.expectedName,
      lane: null,
      incident: null,
      direction: link.direction,
      linkId: row.linkid,
      transcomId: row.transcomid || row.linkid,
    });
  }
  return routes;
}

function mergeTraffic(paRoutes, nycdotRoutes, mapboxOrNow = [], nowArg = new Date()) {
  let mapbox = { state: 'NOT_CONFIGURED', reason: null, routes: [] };
  let now = nowArg;
  if (mapboxOrNow instanceof Date) {
    now = mapboxOrNow;
  } else if (Array.isArray(mapboxOrNow)) {
    mapbox = { state: mapboxOrNow.length ? 'PARTIAL' : 'NOT_CONFIGURED', reason: null, routes: mapboxOrNow };
  } else if (mapboxOrNow && typeof mapboxOrNow === 'object') {
    mapbox = { ...mapbox, ...mapboxOrNow, routes: Array.isArray(mapboxOrNow.routes) ? mapboxOrNow.routes : [] };
  }

  const official = [...paRoutes, ...nycdotRoutes];
  const officialIds = new Set(official.map(route => route.crossingId));
  const mapboxRoutes = mapbox.routes.filter(route => !officialIds.has(route.crossingId));
  const routes = [...official, ...mapboxRoutes];
  const sources = [];
  if (paRoutes.length) sources.push(PA_SOURCE);
  if (nycdotRoutes.length) sources.push(NYCDOT_SOURCE);
  if (mapboxRoutes.length) sources.push(MAPBOX_DOCS);

  return {
    state: routes.length ? 'PARTIAL' : 'UNAVAILABLE',
    reason: routes.length
      ? 'Live crossing and approach-segment times are available from official agencies where possible, with Mapbox live traffic routing filling selected crossing source gaps. Segment scopes differ, so these are not ranked as door-to-door routes.'
      : 'Live traffic sources are unavailable or stale. No travel times are estimated.',
    scope: 'MIXED_CROSSING_SEGMENTS',
    comparable: false,
    fetchedAt: now.toISOString(),
    source: sources.length ? sources : null,
    mapboxState: mapbox.state || 'UNAVAILABLE',
    mapboxReason: mapbox.reason || null,
    mapboxCount: mapboxRoutes.length,
    routes,
  };
}

// Backward-compatible name used by existing tests and callers.
function normalizeTraffic(rows, now = new Date()) {
  const routes = normalizePortAuthority(rows, now);
  return {
    state: routes.length ? 'PARTIAL' : 'UNAVAILABLE',
    reason: routes.length
      ? 'Port Authority crossing and approach times toward New York only. Not door-to-door ETAs.'
      : 'Port Authority times are unavailable or stale. No travel times are estimated.',
    scope: 'CROSSING_APPROACH',
    comparable: false,
    fetchedAt: now.toISOString(),
    source: PA_SOURCE,
    routes,
  };
}

async function fetchTraffic(fetchImpl = fetch, { env = process.env } = {}) {
  const now = new Date();
  const paPromise = (async () => {
    try {
      const response = await fetchImpl(PA_SOURCE, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Port Authority traffic source HTTP ' + response.status);
      return normalizePortAuthority(await response.json(), now);
    } catch (_) {
      return [];
    }
  })();

  const nycdotPromise = (async () => {
    try {
      const response = await fetchImpl(NYCDOT_SOURCE, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'text/plain, text/tab-separated-values;q=0.9, */*;q=0.1' },
      });
      if (!response.ok) throw new Error('NYC DOT traffic source HTTP ' + response.status);
      return normalizeNycdotTraffic(await response.text(), now);
    } catch (_) {
      return [];
    }
  })();

  const mapboxPromise = fetchMapboxTraffic({ fetchImpl, env, now });
  const [paRoutes, nycdotRoutes, mapbox] = await Promise.all([paPromise, nycdotPromise, mapboxPromise]);
  return mergeTraffic(paRoutes, nycdotRoutes, mapbox, now);
}

module.exports = {
  PA_SOURCE,
  NYCDOT_SOURCE,
  MAPBOX_SOURCE,
  MAPBOX_DOCS,
  MAPBOX_PROBES,
  MAPBOX_CACHE_TIMEOUT_MS,
  MAPBOX_ROUTE_TIMEOUT_MS,
  MAPBOX_MAX_ATTEMPTS,
  NYCDOT_LINKS,
  freshClock,
  freshNycdotTimestamp,
  parseNycdotTsv,
  normalizePortAuthority,
  normalizeNycdotTraffic,
  normalizeTraffic,
  normalizeMapboxResponse,
  fetchMapboxTraffic,
  mergeTraffic,
  fetchTraffic,
  _internal: {
    mapboxMemoryCache,
    clearMapboxCache() {
      mapboxMemoryCache.value = null;
      mapboxMemoryCache.expiresAt = 0;
    },
  },
};

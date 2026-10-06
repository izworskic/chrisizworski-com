'use strict';

const PA_SOURCE = 'https://www.panynj.gov/bin/portauthority/crossingtimesapi.json';
const NYCDOT_SOURCE = 'https://linkdata.nyctmc.org/data/LinkSpeedQuery.txt';
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

function mergeTraffic(paRoutes, nycdotRoutes, now = new Date()) {
  const routes = [...paRoutes, ...nycdotRoutes];
  return {
    state: routes.length ? 'PARTIAL' : 'UNAVAILABLE',
    reason: routes.length
      ? 'Live crossing and approach-segment times are available from Port Authority and NYC DOT. Segment scopes differ, so these are not ranked as door-to-door routes.'
      : 'Official live traffic sources are unavailable or stale. No travel times are estimated.',
    scope: 'MIXED_CROSSING_SEGMENTS',
    comparable: false,
    fetchedAt: now.toISOString(),
    source: routes.length ? [PA_SOURCE, NYCDOT_SOURCE] : null,
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

async function fetchTraffic(fetchImpl = fetch) {
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

  const [paRoutes, nycdotRoutes] = await Promise.all([paPromise, nycdotPromise]);
  return mergeTraffic(paRoutes, nycdotRoutes, now);
}

module.exports = {
  PA_SOURCE,
  NYCDOT_SOURCE,
  NYCDOT_LINKS,
  freshClock,
  freshNycdotTimestamp,
  parseNycdotTsv,
  normalizePortAuthority,
  normalizeNycdotTraffic,
  normalizeTraffic,
  mergeTraffic,
  fetchTraffic,
};

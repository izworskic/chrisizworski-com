const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  calculateToll,
  extractStatusSignal,
  freshnessState,
  inferTollClass,
  isPeakSeason,
  parseAdvisories,
  parseCbbtStatus,
  parseIncidents,
  resolveOfficialStatus,
  vehicleEligibility,
} = require('../lib/cbbt/core');
const { FRESHNESS, TOLL_CLASSES, URLS } = require('../lib/cbbt/constants');
const {
  buildDecisionSnapshot,
  clearCache,
  fetchWithCache,
  parseTollQuery,
  parseVehicleQuery,
} = require('../lib/cbbt/engine');
const {
  normalizeNoaaObservation,
  normalizeNwsAlerts,
  normalizeNwsGridForecast,
  normalizeNwsPoints,
} = require('../lib/cbbt/weather');
const cbbtHandler = require('../api/cbbt');

const fixtureDir = path.join(__dirname, 'fixtures', 'cbbt');
const textFixture = (name) => fs.readFileSync(path.join(fixtureDir, name), 'utf8');
const jsonFixture = (name) => JSON.parse(textFixture(name));
const NOW = Date.parse('2026-10-01T15:00:00Z');

const fixtures = {
  open: textFixture('status-open.html'),
  advisoryStatus: textFixture('status-advisory.html'),
  level1: textFixture('status-level1.html'),
  level2: textFixture('status-level2.html'),
  level3: textFixture('status-level3.html'),
  malformed: textFixture('status-malformed.html'),
  incidentActive: textFixture('incident-active.html'),
  incidentCleared: textFixture('incident-cleared.html'),
  advisory: textFixture('advisory.html'),
  noaaWind: jsonFixture('noaa-wind.json'),
  noaaAir: jsonFixture('noaa-air.json'),
  noaaPressure: jsonFixture('noaa-pressure.json'),
  noaaMetadata: jsonFixture('noaa-metadata.json'),
  nwsPoints: jsonFixture('nws-points.json'),
  nwsGrid: jsonFixture('nws-grid.json'),
  nwsAlerts: jsonFixture('nws-alerts.json'),
};

function response(value, status = 200, headers = {}) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  return new Response(body, { status, headers: { 'content-type': typeof value === 'string' ? 'text/html' : 'application/json', ...headers } });
}

function standardFetch({ statusHtml = fixtures.open, homepageHtml = '<p>Currently there are no traffic delays on the CBBT.</p>', alertsHtml = fixtures.incidentActive, advisoryHtml = fixtures.advisory, wpStatus = null, wpAlerts = null, wpAdvisory = null, noaaWind = fixtures.noaaWind, nwsGrid = fixtures.nwsGrid } = {}) {
  return async (url) => {
    const u = String(url);
    if (u === URLS.cbbtStatusWp) return wpStatus ? response(wpStatus) : response({ error: 'not found' }, 404);
    if (u === URLS.cbbtStatusHtml) return response(statusHtml);
    if (u === URLS.cbbtHomepage) return response(homepageHtml);
    if (u === URLS.cbbtAlertsWp) return wpAlerts ? response(wpAlerts) : response({ error: 'not found' }, 404);
    if (u === URLS.cbbtAlertsHtml) return response(alertsHtml);
    if (u === URLS.cbbtAdvisoryWp) return wpAdvisory ? response(wpAdvisory) : response({ error: 'not found' }, 404);
    if (u === URLS.cbbtAdvisoryHtml) return response(advisoryHtml);
    if (u === URLS.noaaWind) return response(noaaWind);
    if (u === URLS.noaaAirTemp) return response(fixtures.noaaAir);
    if (u === URLS.noaaPressure) return response(fixtures.noaaPressure);
    if (u === URLS.noaaMetadata) return response(fixtures.noaaMetadata);
    if (u === URLS.nwsPoints) return response(fixtures.nwsPoints);
    if (u === URLS.nwsAlerts) return response(fixtures.nwsAlerts);
    if (u === fixtures.nwsPoints.properties.forecastGridData) return response(nwsGrid);
    if (u === URLS.vdotIncidents || u === URLS.vdotConstruction) return response({ type: 'FeatureCollection', features: [] });
    throw new Error(`Unexpected URL: ${u}`);
  };
}

function makeOfficial(level) {
  const state = level === 'LEVEL_3' ? 'CLOSED' : level === 'NONE' ? 'OPEN' : 'OPEN_WITH_RESTRICTIONS';
  return { state, restrictionLevel: level };
}

function responseRecorder() {
  return {
    body: undefined,
    headers: {},
    statusCode: 200,
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return body; },
    end() { this.ended = true; return undefined; },
  };
}

// --- Official CBBT parser states -------------------------------------------------
for (const row of [
  ['normal operation', fixtures.open, 'OPEN', 'NONE'],
  ['wind advisory', fixtures.advisoryStatus, 'OPEN_WITH_RESTRICTIONS', 'ADVISORY'],
  ['Level 1', fixtures.level1, 'OPEN_WITH_RESTRICTIONS', 'LEVEL_1'],
  ['Level 2', fixtures.level2, 'OPEN_WITH_RESTRICTIONS', 'LEVEL_2'],
  ['Level 3 / closure', fixtures.level3, 'CLOSED', 'LEVEL_3'],
]) {
  test(`CBBT parser: ${row[0]}`, () => {
    const parsed = parseCbbtStatus(row[1], { retrievedAt: new Date(NOW).toISOString() });
    assert.equal(parsed.state, row[2]);
    assert.equal(parsed.restrictionLevel, row[3]);
    assert.equal(parsed.freshness.state, 'fresh');
    assert.equal(parsed.provenance.source_name, 'CBBT');
    assert.ok(parsed.provenance.checksum_hash);
  });
}

test('CBBT parser: malformed/missing/unexpected wording fails conservative', () => {
  assert.equal(parseCbbtStatus(fixtures.malformed).state, 'UNKNOWN');
  assert.equal(parseCbbtStatus('').state, 'UNKNOWN');
  assert.equal(extractStatusSignal('Drive carefully today.').state, 'UNKNOWN');
});

test('Homepage "no traffic delays" is supporting-only and never means OPEN', () => {
  const parsed = parseCbbtStatus('<p>Currently there are no traffic delays on the CBBT.</p>', { homepage: true });
  assert.equal(parsed.state, 'UNKNOWN');
  assert.equal(parsed.provenance.confidence_or_parse_state, 'supporting_only');
});

test('Structured CBBT WordPress payload retains source timestamp and ID', () => {
  const parsed = parseCbbtStatus([{ id: 99, modified_gmt: '2026-10-01T14:45:00', link: URLS.cbbtStatusHtml, content: { rendered: fixtures.level1 } }], { retrievedAt: new Date(NOW).toISOString() });
  assert.equal(parsed.restrictionLevel, 'LEVEL_1');
  assert.equal(parsed.sourceTimestamp, '2026-10-01T14:45:00.000Z');
  assert.equal(parsed.provenance.source_id, '99');
});

test('Conflicting official CBBT surfaces remain visible when timestamps cannot resolve them', () => {
  const open = parseCbbtStatus(fixtures.open, { sourceUrl: URLS.cbbtStatusHtml });
  const closed = parseCbbtStatus('<p>CBBT is closed to all traffic.</p>', { sourceUrl: URLS.cbbtHomepage, homepage: true });
  const resolved = resolveOfficialStatus([open, closed]);
  assert.equal(resolved.state, 'OFFICIAL_STATUS_CONFLICT');
  assert.equal(resolved.conflict, true);
  assert.equal(resolved.conflictingSources.length, 2);
});

test('Newest authoritative CBBT source resolves a conflict only when timestamps are explicit for all sources', () => {
  const old = parseCbbtStatus(fixtures.level1, { sourceTimestamp: '2026-10-01T14:00:00Z' });
  const fresh = parseCbbtStatus(fixtures.open, { sourceTimestamp: '2026-10-01T14:05:00Z', sourceUrl: URLS.cbbtHomepage });
  const resolved = resolveOfficialStatus([old, fresh]);
  assert.equal(resolved.state, 'OPEN');
  assert.equal(resolved.reason, 'NEWEST_AUTHORITATIVE_CBBT_SOURCE');
});

test('Incident parser separates active from cleared incidents', () => {
  const active = parseIncidents(fixtures.incidentActive);
  const cleared = parseIncidents(fixtures.incidentCleared);
  assert.equal(active[0].state, 'active');
  assert.equal(active[0].category, 'debris');
  assert.equal(cleared[0].state, 'cleared');
});

test('Planned advisories remain separate from active incidents', () => {
  const advisories = parseAdvisories(fixtures.advisory);
  assert.ok(advisories.length >= 2);
  assert.ok(advisories.some((item) => item.category === 'maintenance'));
  assert.ok(advisories.some((item) => item.category === 'expected_delay'));
});

// --- NOAA / NWS ------------------------------------------------------------------
test('NOAA CO-OPS wind knots are converted to mph with observation freshness and sensor health', () => {
  const observation = normalizeNoaaObservation({ windPayload: fixtures.noaaWind, airTempPayload: fixtures.noaaAir, pressurePayload: fixtures.noaaPressure, metadataPayload: fixtures.noaaMetadata }, { retrievedAt: new Date(NOW).toISOString(), now: NOW });
  assert.equal(observation.stationId, '8638901');
  assert.equal(observation.wind.sustainedMph, 23);
  assert.equal(observation.wind.gustMph, 34.5);
  assert.equal(observation.wind.directionCardinal, 'NE');
  assert.equal(observation.airTemperatureF, 72.5);
  assert.equal(observation.pressureMb, 1012.4);
  assert.equal(observation.freshness.state, 'fresh');
  assert.equal(observation.stationHealth.status, 'reporting');
  assert.equal(observation.operationalRestrictionInference, 'PROHIBITED');
});

test('NOAA observation becomes stale after the configured threshold', () => {
  const now = Date.parse('2026-10-01T15:25:00Z');
  const observation = normalizeNoaaObservation({ windPayload: fixtures.noaaWind, airTempPayload: null, pressurePayload: null, metadataPayload: null }, { retrievedAt: new Date(now).toISOString(), now });
  assert.equal(observation.freshness.state, 'stale');
});

test('NWS points metadata identifies the marine grid-data endpoint', () => {
  const points = normalizeNwsPoints(fixtures.nwsPoints);
  assert.equal(points.cwa, 'AKQ');
  assert.equal(points.forecastGridDataUrl, 'https://api.weather.gov/gridpoints/AKQ/88,52');
  assert.equal(points.radarStation, 'KAKQ');
});

test('NWS marine-grid forecast normalizes wind, gust, direction, temperature and precip without declaring restrictions', () => {
  const forecast = normalizeNwsGridForecast(fixtures.nwsGrid, { sourceUrl: fixtures.nwsPoints.properties.forecastGridData, retrievedAt: new Date(NOW).toISOString(), now: NOW });
  assert.equal(forecast.available, true);
  assert.equal(forecast.periods[0].windMph, 20);
  assert.equal(forecast.periods[0].gustMph, 30);
  assert.equal(forecast.periods[0].windDirectionDegrees, 45);
  assert.equal(forecast.periods[0].temperatureF, 71.6);
  assert.equal(forecast.periods[0].precipitationProbabilityPct, 30);
  assert.match(forecast.periods[0].weather, /rain_showers/);
  assert.equal(forecast.operationalRestrictionInference, 'PROHIBITED');
});

test('Expired NWS alerts are filtered even if an upstream response incorrectly retains them', () => {
  const payload = JSON.parse(JSON.stringify(fixtures.nwsAlerts));
  payload.features[0].properties.expires = '2026-10-01T09:00:00-04:00';
  assert.deepEqual(normalizeNwsAlerts(payload, { now: NOW }), []);
  assert.equal(normalizeNwsAlerts(fixtures.nwsAlerts, { now: NOW })[0].event, 'Small Craft Advisory');
});

for (const [name, thresholds] of Object.entries(FRESHNESS)) {
  test(`Freshness transition around stale threshold: ${name}`, () => {
    const source = Date.parse('2026-10-01T12:00:00Z');
    const before = freshnessState(new Date(source).toISOString(), thresholds, source + thresholds.staleMs - 1);
    const after = freshnessState(new Date(source).toISOString(), thresholds, source + thresholds.staleMs + 1);
    assert.notEqual(before.state, 'stale');
    assert.equal(after.state, 'stale');
  });
}

// --- Vehicle rules ---------------------------------------------------------------
const vehicleCases = [
  ['car', { type: 'car' }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'ALLOWED', LEVEL_2: 'ALLOWED', LEVEL_3: 'RESTRICTED' }],
  ['pickup 6-wheel', { type: 'pickup', sixWheel: true }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'ALLOWED', LEVEL_2: 'ALLOWED', LEVEL_3: 'RESTRICTED' }],
  ['motorcycle', { type: 'motorcycle' }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'RESTRICTED', LEVEL_2: 'RESTRICTED', LEVEL_3: 'RESTRICTED' }],
  ['RV', { type: 'rv' }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'RESTRICTED', LEVEL_2: 'RESTRICTED', LEVEL_3: 'RESTRICTED' }],
  ['camper trailer', { type: 'camper_trailer' }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'RESTRICTED', LEVEL_2: 'RESTRICTED', LEVEL_3: 'RESTRICTED' }],
  ['house trailer', { type: 'house_trailer' }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'RESTRICTED', LEVEL_2: 'RESTRICTED', LEVEL_3: 'RESTRICTED' }],
  ['car exterior cargo', { type: 'car', exteriorCargo: true }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'RESTRICTED', LEVEL_2: 'RESTRICTED', LEVEL_3: 'RESTRICTED' }],
  ['box truck', { type: 'box_truck', sixWheel: true }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'RESTRICTED', LEVEL_2: 'RESTRICTED', LEVEL_3: 'RESTRICTED' }],
  ['bus', { type: 'bus' }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'RESTRICTED', LEVEL_2: 'RESTRICTED', LEVEL_3: 'RESTRICTED' }],
  ['tractor no trailer', { type: 'tractor' }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'ALLOWED', LEVEL_2: 'RESTRICTED', LEVEL_3: 'RESTRICTED' }],
  ['empty flatbed', { type: 'tractor', towing: true, trailerSubtype: 'empty_flatbed' }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'ALLOWED', LEVEL_2: 'RESTRICTED', LEVEL_3: 'RESTRICTED' }],
  ['empty car carrier', { type: 'tractor', towing: true, trailerSubtype: 'empty_car_carrier' }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'ALLOWED', LEVEL_2: 'RESTRICTED', LEVEL_3: 'RESTRICTED' }],
  ['empty lowboy', { type: 'tractor', towing: true, trailerSubtype: 'empty_lowboy' }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'ALLOWED', LEVEL_2: 'RESTRICTED', LEVEL_3: 'RESTRICTED' }],
  ['empty logging trailer', { type: 'tractor', towing: true, trailerSubtype: 'empty_logging' }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'ALLOWED', LEVEL_2: 'RESTRICTED', LEVEL_3: 'RESTRICTED' }],
  ['loaded tractor trailer', { type: 'tractor_trailer', payloadLb: 15000 }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'ALLOWED', LEVEL_2: 'RESTRICTED', LEVEL_3: 'RESTRICTED' }],
  ['underweight tractor trailer', { type: 'tractor_trailer', payloadLb: 14999 }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'RESTRICTED', LEVEL_2: 'RESTRICTED', LEVEL_3: 'RESTRICTED' }],
  ['minivan', { type: 'minivan' }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'ALLOWED', LEVEL_2: 'ALLOWED', LEVEL_3: 'RESTRICTED' }],
  ['normal van', { type: 'van', highProfile: false }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'ALLOWED', LEVEL_2: 'ALLOWED', LEVEL_3: 'RESTRICTED' }],
  ['high-profile van', { type: 'van', highProfile: true }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'ALLOWED', LEVEL_2: 'RESTRICTED', LEVEL_3: 'RESTRICTED' }],
  ['SUV', { type: 'suv' }, { NONE: 'ALLOWED', ADVISORY: 'ALLOWED', LEVEL_1: 'ALLOWED', LEVEL_2: 'ALLOWED', LEVEL_3: 'RESTRICTED' }],
];

for (const [name, vehicle, expectations] of vehicleCases) {
  for (const [level, expected] of Object.entries(expectations)) {
    test(`Vehicle rule ${name} @ ${level} => ${expected}`, () => {
      assert.equal(vehicleEligibility(makeOfficial(level), vehicle).decision, expected);
    });
  }
}

test('Level 1 tractor-trailer without payload is uncertain, never guessed', () => {
  assert.equal(vehicleEligibility(makeOfficial('LEVEL_1'), { type: 'tractor_trailer' }).decision, 'UNKNOWN');
});

test('Level 2 generic van without profile information is uncertain', () => {
  assert.equal(vehicleEligibility(makeOfficial('LEVEL_2'), { type: 'van' }).decision, 'UNKNOWN');
});

test('Static clearance and propane rules remain enforceable even if live status is unavailable', () => {
  const unknown = { state: 'UNKNOWN', restrictionLevel: 'UNKNOWN' };
  assert.equal(vehicleEligibility(unknown, { type: 'rv', heightFt: 14 }).decision, 'RESTRICTED');
  assert.equal(vehicleEligibility(unknown, { type: 'rv', propaneCarried: true, propaneValveClosed: false }).decision, 'RESTRICTED');
  assert.equal(vehicleEligibility(unknown, { type: 'rv', propaneCarried: true }).decision, 'UNKNOWN');
});

// --- Toll rules ------------------------------------------------------------------
test('Toll class table contains all published classes used by the engine', () => {
  assert.deepEqual(Object.keys(TOLL_CLASSES).sort((a, b) => Number(a) - Number(b)), ['1', '2', '3', '4', '8', '9', '10', '11', '12', '13', '14', '15', '16', '75'].sort((a, b) => Number(a) - Number(b)));
});

test('Standard car off-peak and peak tolls are deterministic', () => {
  assert.equal(calculateToll({ vehicleType: 'car', travelAt: '2026-10-01T12:00:00-04:00' }).amount, 16);
  assert.equal(calculateToll({ vehicleType: 'car', travelAt: '2026-07-18T12:00:00-04:00' }).amount, 21);
});

test('Peak-season classification uses CBBT local time at the boundary', () => {
  assert.equal(isPeakSeason('2026-05-15T03:59:00Z'), false); // Thu 11:59 PM EDT
  assert.equal(isPeakSeason('2026-05-15T04:00:00Z'), true);  // Fri midnight EDT
});

test('Eligible E-ZPass return-trip discounts apply for Class 1 peak/off-peak', () => {
  assert.equal(calculateToll({ vehicleType: 'car', travelAt: '2026-10-01T12:00:00-04:00', ezPass: true, isReturnTrip: true, returnWithin24Hours: true }).amount, 6);
  assert.equal(calculateToll({ vehicleType: 'car', travelAt: '2026-07-18T12:00:00-04:00', ezPass: true, isReturnTrip: true, returnWithin24Hours: true }).amount, 1);
});

test('Noneligible return trip receives standard toll instead of a guessed discount', () => {
  const toll = calculateToll({ vehicleType: 'car', travelAt: '2026-10-01T12:00:00-04:00', ezPass: false, isReturnTrip: true, returnWithin24Hours: true });
  assert.equal(toll.amount, 16);
  assert.match(toll.assumptions.join(' '), /discount not applied/i);
});

test('Trailer classes and return discounts are deterministic', () => {
  assert.equal(inferTollClass({ vehicleType: 'car', trailerAxles: 1 }), 2);
  assert.equal(inferTollClass({ vehicleType: 'car', trailerAxles: 2 }), 3);
  assert.equal(inferTollClass({ vehicleType: 'car', trailerAxles: 3 }), 4);
  assert.equal(calculateToll({ vehicleType: 'car', trailerAxles: 1, ezPass: true, isReturnTrip: true, returnWithin24Hours: true }).amount, 12);
});

test('Commuter Class 75 starts with the 30th trip when 29 prior trips exist in the 720-hour lookback', () => {
  const eligible = calculateToll({ officialClass: 75, ezPass: true, priorOneWayTripsLast720Hours: 29 });
  const ineligible = calculateToll({ officialClass: 75, ezPass: true, priorOneWayTripsLast720Hours: 28 });
  assert.equal(eligible.amount, 7);
  assert.equal(ineligible.state, 'UNKNOWN');
});

test('Heavy/special toll class inference handles representative edge cases conservatively', () => {
  assert.equal(inferTollClass({ vehicleType: 'pickup', axles: 2, tires: 6, heightFt: 9, grossWeightLb: 30000 }), 9);
  assert.equal(inferTollClass({ vehicleType: 'truck', axles: 5, grossWeightLb: 80000 }), 12);
  assert.equal(inferTollClass({ vehicleType: 'truck', axles: 5, grossWeightLb: 84000 }), 16);
  assert.equal(calculateToll({ specialOverDimension: true }).state, 'ESTIMATE_REQUIRES_APPROVAL');
  assert.equal(inferTollClass({ vehicleType: 'rv' }), null);
});

// --- Cache / source failure / full engine ----------------------------------------
test('fetch cache reuses fresh data and exposes stale fallback explicitly', async () => {
  clearCache();
  let calls = 0;
  const okFetch = async () => { calls += 1; return response({ value: 1 }, 200, { etag: 'abc' }); };
  const first = await fetchWithCache('test:cache', 'https://example.invalid/data', { type: 'json', ttlMs: 1000, staleFallbackMs: 5000, fetchImpl: okFetch, now: 10000 });
  const cached = await fetchWithCache('test:cache', 'https://example.invalid/data', { type: 'json', ttlMs: 1000, staleFallbackMs: 5000, fetchImpl: okFetch, now: 10500 });
  const failingFetch = async () => { throw new Error('offline'); };
  const stale = await fetchWithCache('test:cache', 'https://example.invalid/data', { type: 'json', ttlMs: 1000, staleFallbackMs: 5000, fetchImpl: failingFetch, now: 12000 });
  const gone = await fetchWithCache('test:cache', 'https://example.invalid/data', { type: 'json', ttlMs: 1000, staleFallbackMs: 5000, fetchImpl: failingFetch, now: 16001 });
  assert.equal(first.cacheHit, false);
  assert.equal(cached.cacheHit, true);
  assert.equal(calls, 1);
  assert.equal(stale.staleFallback, true);
  assert.equal(stale.ok, true);
  assert.equal(gone.ok, false);
});

test('Full engine combines official status, incidents, advisories, NOAA, NWS, vehicle and toll data', async () => {
  clearCache();
  const snapshot = await buildDecisionSnapshot({
    fetchImpl: standardFetch(), now: NOW,
    query: { vehicleType: 'car', estimateToll: '1', travelAt: '2026-10-01T12:00:00-04:00' },
  });
  assert.equal(snapshot.officialStatus.state, 'OPEN');
  assert.equal(snapshot.activeIncidents.length, 1);
  assert.ok(snapshot.plannedAdvisories.length >= 2);
  assert.equal(snapshot.weatherNow.wind.gustMph, 34.5);
  assert.equal(snapshot.forecast.periods[0].gustMph, 30);
  assert.equal(snapshot.alerts[0].event, 'Small Craft Advisory');
  assert.equal(snapshot.vehicleEligibility.decision, 'ALLOWED');
  assert.equal(snapshot.tollEstimate.amount, 16);
  assert.equal(snapshot.engine.weatherMayDeclareRestriction, false);
  assert.ok(snapshot.provenance.length >= 8);
  assert.equal(snapshot.systemHealth.state, 'HEALTHY');
  assert.equal(snapshot.systemHealth.sources.officialStatus.structuredEndpointAvailable, false);
});

test('High NOAA winds never override an official CBBT OPEN state', async () => {
  clearCache();
  const highWind = JSON.parse(JSON.stringify(fixtures.noaaWind));
  highWind.data[0].s = '55';
  highWind.data[0].g = '65';
  const snapshot = await buildDecisionSnapshot({ fetchImpl: standardFetch({ noaaWind: highWind }), now: NOW });
  assert.equal(snapshot.officialStatus.state, 'OPEN');
  assert.ok(snapshot.weatherNow.wind.gustMph > 60);
  assert.equal(snapshot.weatherNow.operationalRestrictionInference, 'PROHIBITED');
});

test('Structured CBBT status endpoint is preferred when it is present and parseable', async () => {
  clearCache();
  const wpStatus = [{ id: 1439, modified_gmt: '2026-10-01T14:58:00', link: URLS.cbbtStatusHtml, content: { rendered: fixtures.level1 } }];
  const snapshot = await buildDecisionSnapshot({ fetchImpl: standardFetch({ statusHtml: fixtures.open, wpStatus }), now: NOW });
  assert.equal(snapshot.officialStatus.restrictionLevel, 'LEVEL_1');
  assert.equal(snapshot.systemHealth.sources.officialStatus.transport, 'wordpress_rest');
  assert.equal(snapshot.systemHealth.sources.officialStatus.structuredEndpointAvailable, true);
});

test('Official CBBT source failure returns UNKNOWN even while weather data remains available', async () => {
  clearCache();
  const fetchImpl = async (url) => {
    const u = String(url);
    if (u.startsWith('https://www.cbbt.com/')) throw new Error('CBBT outage');
    return standardFetch()(url);
  };
  const snapshot = await buildDecisionSnapshot({ fetchImpl, now: NOW });
  assert.equal(snapshot.officialStatus.state, 'UNKNOWN');
  assert.equal(snapshot.officialStatus.reason, 'CBBT_SOURCE_UNAVAILABLE_OR_UNPARSEABLE');
  assert.equal(snapshot.weatherNow.available, true);
  assert.equal(snapshot.systemHealth.state, 'DEGRADED_NO_OFFICIAL_STATUS');
});

test('NOAA failure does not invalidate official status', async () => {
  clearCache();
  const base = standardFetch();
  const fetchImpl = async (url) => String(url).includes('tidesandcurrents.noaa.gov') ? (() => { throw new Error('NOAA outage'); })() : base(url);
  const snapshot = await buildDecisionSnapshot({ fetchImpl, now: NOW });
  assert.equal(snapshot.officialStatus.state, 'OPEN');
  assert.equal(snapshot.weatherNow.available, false);
  assert.equal(snapshot.systemHealth.sources.noaaWind.state, 'unavailable');
});

test('NWS failure does not invalidate official status or NOAA observation', async () => {
  clearCache();
  const base = standardFetch();
  const fetchImpl = async (url) => String(url).includes('api.weather.gov') ? (() => { throw new Error('NWS outage'); })() : base(url);
  const snapshot = await buildDecisionSnapshot({ fetchImpl, now: NOW });
  assert.equal(snapshot.officialStatus.state, 'OPEN');
  assert.equal(snapshot.weatherNow.available, true);
  assert.equal(snapshot.forecast.available, false);
  assert.deepEqual(snapshot.alerts, []);
});

test('Virginia 511 failure is supplemental and cannot invalidate the core engine', async () => {
  clearCache();
  const base = standardFetch();
  const fetchImpl = async (url) => String(url).includes('511virginia.org') ? (() => { throw new Error('host_not_allowed'); })() : base(url);
  const snapshot = await buildDecisionSnapshot({ fetchImpl, now: NOW, includeVdot: true });
  assert.equal(snapshot.officialStatus.state, 'OPEN');
  assert.equal(snapshot.approachTraffic.available, false);
  assert.equal(snapshot.systemHealth.sources.vdotIncidents.state, 'unavailable');
});

test('Conflicting CBBT surfaces propagate OFFICIAL_STATUS_CONFLICT through vehicle eligibility', async () => {
  clearCache();
  const snapshot = await buildDecisionSnapshot({
    fetchImpl: standardFetch({ homepageHtml: '<p>CBBT is closed to all traffic.</p>' }), now: NOW,
    query: { vehicleType: 'car' },
  });
  assert.equal(snapshot.officialStatus.state, 'OFFICIAL_STATUS_CONFLICT');
  assert.equal(snapshot.vehicleEligibility.decision, 'UNKNOWN');
});

test('Cached official status ages visibly and eventually becomes unavailable rather than masquerading as live', async () => {
  clearCache();
  const base = standardFetch();
  const first = await buildDecisionSnapshot({ fetchImpl: base, now: NOW });
  assert.equal(first.officialStatus.state, 'OPEN');
  const fail = async () => { throw new Error('offline'); };
  const aging = await buildDecisionSnapshot({ fetchImpl: fail, now: NOW + 4 * 60_000 });
  assert.equal(aging.officialStatus.state, 'OPEN');
  assert.equal(aging.officialStatus.freshness.state, 'aging');
  assert.equal(aging.systemHealth.sources.officialStatus.staleFallback, true);
  const expired = await buildDecisionSnapshot({ fetchImpl: fail, now: NOW + 6 * 60_000 });
  assert.equal(expired.officialStatus.state, 'UNKNOWN');
});

test('Query parsers keep UI-independent API inputs deterministic', () => {
  assert.equal(parseVehicleQuery({ vehicleType: 'pickup', towing: 'true' }).towing, true);
  assert.equal(parseVehicleQuery({}), null);
  assert.equal(parseTollQuery({ estimateToll: '1', tollClass: '1', ezPass: 'yes' }).ezPass, true);
  assert.equal(parseTollQuery({}), null);
});

test('API route returns the consolidated backend contract', async () => {
  clearCache();
  const originalFetch = global.fetch;
  global.fetch = standardFetch();
  try {
    const res = responseRecorder();
    await cbbtHandler({ method: 'GET', query: { vehicleType: 'car' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.bridge.id, 'cbbt');
    assert.ok(res.body.officialStatus);
    assert.ok(Array.isArray(res.body.activeIncidents));
    assert.ok(res.body.weatherNow);
    assert.ok(res.body.forecast);
    assert.ok(Array.isArray(res.body.alerts));
    assert.ok(res.body.vehicleEligibility);
    assert.ok(res.body.tollEstimate);
    assert.ok(res.body.freshness);
    assert.ok(Array.isArray(res.body.provenance));
    assert.ok(res.body.systemHealth);
    assert.match(res.headers['cache-control'], /s-maxage=30/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('API rejects non-read methods', async () => {
  const res = responseRecorder();
  await cbbtHandler({ method: 'POST', query: {} }, res);
  assert.equal(res.statusCode, 405);
});

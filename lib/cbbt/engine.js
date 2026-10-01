const {
  CACHE_POLICY,
  CBBT_COORDINATES,
  FRESHNESS,
  PARSER_VERSION,
  URLS,
} = require('./constants');
const {
  calculateToll,
  htmlToText,
  parseAdvisories,
  parseCbbtStatus,
  parseIncidents,
  resolveOfficialStatus,
  stableHash,
  unwrapWpPayload,
  vehicleEligibility,
} = require('./core');
const {
  RADAR_METADATA,
  normalizeNoaaObservation,
  normalizeNwsAlerts,
  normalizeNwsGridForecast,
  normalizeNwsPoints,
} = require('./weather');

const cache = new Map();
const USER_AGENT = 'CBBTDecisionEngine/1.0 (+https://chrisizworski.com/)';

function clearCache() {
  cache.clear();
}

function cacheSnapshot() {
  return [...cache.entries()].map(([key, row]) => ({
    key,
    retrievedAt: row.retrievedAt,
    etag: row.etag || null,
    lastModified: row.lastModified || null,
  }));
}

function headerValue(headers, name) {
  try { return headers?.get?.(name) || null; } catch { return null; }
}

async function fetchWithCache(key, url, {
  type = 'json',
  ttlMs,
  staleFallbackMs,
  timeoutMs = 8_000,
  fetchImpl = global.fetch,
  now = Date.now(),
  accept = null,
} = {}) {
  const previous = cache.get(key);
  if (previous) {
    const ageMs = Math.max(0, now - Date.parse(previous.retrievedAt));
    if (ageMs <= ttlMs) {
      return { ...previous, ok: true, cacheHit: true, staleFallback: false, ageMs, status: 200, error: null };
    }
  }

  const headers = {
    'user-agent': USER_AGENT,
    accept: accept || (type === 'json' ? 'application/geo+json, application/json' : 'text/html, text/plain;q=0.9, */*;q=0.1'),
  };
  if (previous?.etag) headers['if-none-match'] = previous.etag;
  if (previous?.lastModified) headers['if-modified-since'] = previous.lastModified;

  try {
    const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    if (response.status === 304 && previous) {
      const refreshed = { ...previous, retrievedAt: new Date(now).toISOString() };
      cache.set(key, refreshed);
      return { ...refreshed, ok: true, cacheHit: true, revalidated: true, staleFallback: false, ageMs: 0, status: 304, error: null };
    }
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const value = type === 'json' ? await response.json() : await response.text();
    const row = {
      value,
      url,
      retrievedAt: new Date(now).toISOString(),
      etag: headerValue(response.headers, 'etag'),
      lastModified: headerValue(response.headers, 'last-modified'),
      cacheControl: headerValue(response.headers, 'cache-control'),
      contentType: headerValue(response.headers, 'content-type'),
    };
    cache.set(key, row);
    return { ...row, ok: true, cacheHit: false, staleFallback: false, ageMs: 0, status: response.status, error: null };
  } catch (error) {
    if (previous) {
      const ageMs = Math.max(0, now - Date.parse(previous.retrievedAt));
      if (ageMs <= staleFallbackMs) {
        return { ...previous, ok: true, cacheHit: true, staleFallback: true, ageMs, status: null, error: String(error?.message || error) };
      }
    }
    return {
      ok: false,
      value: null,
      url,
      retrievedAt: new Date(now).toISOString(),
      cacheHit: false,
      staleFallback: false,
      ageMs: null,
      status: null,
      error: String(error?.message || error),
      etag: null,
      lastModified: null,
      cacheControl: null,
      contentType: null,
    };
  }
}

function chooseWpOrHtml(wpResult, htmlResult) {
  if (wpResult?.ok && unwrapWpPayload(wpResult.value)) return { ...wpResult, transport: 'wordpress_rest' };
  if (htmlResult?.ok && typeof htmlResult.value === 'string' && htmlResult.value.trim()) return { ...htmlResult, transport: 'html' };
  return wpResult?.ok ? { ...wpResult, transport: 'wordpress_rest_unparseable' } : { ...(htmlResult || wpResult), transport: 'unavailable' };
}

function sourceHealth(name, result, extra = {}) {
  if (!result) return { name, state: 'unavailable', lastSuccessfulRetrieval: null, ...extra };
  return {
    name,
    state: result.ok ? (result.staleFallback ? 'degraded_cached' : 'ok') : 'unavailable',
    lastSuccessfulRetrieval: result.ok ? result.retrievedAt : null,
    ageMs: result.ageMs,
    cacheHit: Boolean(result.cacheHit),
    staleFallback: Boolean(result.staleFallback),
    httpStatus: result.status,
    error: result.error || null,
    etag: result.etag || null,
    lastModified: result.lastModified || null,
    upstreamCacheControl: result.cacheControl || null,
    ...extra,
  };
}

function haversineMiles(latA, lonA, latB, lonB) {
  const values = [latA, lonA, latB, lonB].map(Number);
  if (!values.every(Number.isFinite)) return null;
  const toRad = (v) => v * Math.PI / 180;
  const [aLat, aLon, bLat, bLon] = values;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function normalizeVdotGeoJson(incidentPayload, constructionPayload, { retrievedAt = new Date().toISOString(), radiusMiles = 35 } = {}) {
  const normalize = (payload, category) => (payload?.features || []).map((feature) => {
    const p = feature?.properties || {};
    const coords = feature?.geometry?.type === 'Point' ? feature.geometry.coordinates : null;
    const lon = Number(coords?.[0]);
    const lat = Number(coords?.[1]);
    const distance = haversineMiles(CBBT_COORDINATES.latitude, CBBT_COORDINATES.longitude, lat, lon);
    const raw = p.description || p.eventDescription || p.title || p.name || p.message || '';
    return {
      id: String(feature.id || p.id || stableHash(`${category}|${raw}|${lat}|${lon}`).slice(0, 16)),
      category,
      summary: htmlToText(raw).slice(0, 800),
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lon) ? lon : null,
      distanceMiles: distance == null ? null : Math.round(distance * 10) / 10,
      source: 'Virginia 511',
      retrievedAt,
    };
  }).filter((event) => event.distanceMiles != null && event.distanceMiles <= radiusMiles);

  return [
    ...normalize(incidentPayload, 'incident'),
    ...normalize(constructionPayload, 'construction'),
  ].sort((a, b) => a.distanceMiles - b.distanceMiles).slice(0, 20);
}

function notEvaluated(kind) {
  return { state: 'NOT_EVALUATED', reason: `${kind.toUpperCase()}_INPUT_NOT_PROVIDED` };
}

function boolParam(value) {
  if (value == null) return undefined;
  if (typeof value === 'boolean') return value;
  if (/^(1|true|yes)$/i.test(String(value))) return true;
  if (/^(0|false|no)$/i.test(String(value))) return false;
  return undefined;
}

function parseVehicleQuery(query = {}) {
  if (!query.vehicleType && !query.vehicle) return null;
  return {
    type: query.vehicleType || query.vehicle,
    exteriorCargo: boolParam(query.exteriorCargo),
    towing: boolParam(query.towing),
    trailerSubtype: query.trailerSubtype,
    sixWheel: boolParam(query.sixWheel),
    payloadLb: query.payloadLb,
    heightFt: query.heightFt,
    propaneCarried: boolParam(query.propaneCarried),
    propaneValveClosed: boolParam(query.propaneValveClosed),
    highProfile: boolParam(query.highProfile),
  };
}

function parseTollQuery(query = {}) {
  if (!query.estimateToll && query.tollClass == null && query.officialClass == null) return null;
  return {
    officialClass: query.tollClass ?? query.officialClass,
    vehicleType: query.tollVehicleType || query.vehicleType || query.vehicle,
    axles: query.axles,
    tires: query.tires,
    trailerAxles: query.trailerAxles,
    grossWeightLb: query.grossWeightLb,
    heightFt: query.heightFt,
    widthFt: query.widthFt,
    lengthFt: query.lengthFt,
    specialOverDimension: boolParam(query.specialOverDimension),
    cannotMaintain45Mph: boolParam(query.cannotMaintain45Mph),
    travelAt: query.travelAt,
    ezPass: boolParam(query.ezPass),
    isReturnTrip: boolParam(query.isReturnTrip),
    returnWithin24Hours: boolParam(query.returnWithin24Hours),
    priorOneWayTripsLast720Hours: query.priorOneWayTripsLast720Hours,
  };
}

async function buildDecisionSnapshot({ query = {}, fetchImpl = global.fetch, now = Date.now(), includeVdot = process.env.CBBT_VDOT_511_ENABLED === '1' } = {}) {
  const policies = CACHE_POLICY;
  const baseJobs = await Promise.all([
    fetchWithCache('cbbt:status:wp', URLS.cbbtStatusWp, { type: 'json', ...policies.cbbtStatus, fetchImpl, now }),
    fetchWithCache('cbbt:status:html', URLS.cbbtStatusHtml, { type: 'text', ...policies.cbbtStatus, fetchImpl, now }),
    fetchWithCache('cbbt:homepage', URLS.cbbtHomepage, { type: 'text', ...policies.cbbtStatus, fetchImpl, now }),
    fetchWithCache('cbbt:alerts:wp', URLS.cbbtAlertsWp, { type: 'json', ...policies.cbbtIncidents, fetchImpl, now }),
    fetchWithCache('cbbt:alerts:html', URLS.cbbtAlertsHtml, { type: 'text', ...policies.cbbtIncidents, fetchImpl, now }),
    fetchWithCache('cbbt:advisory:wp', URLS.cbbtAdvisoryWp, { type: 'json', ...policies.cbbtAdvisories, fetchImpl, now }),
    fetchWithCache('cbbt:advisory:html', URLS.cbbtAdvisoryHtml, { type: 'text', ...policies.cbbtAdvisories, fetchImpl, now }),
    fetchWithCache('noaa:wind', URLS.noaaWind, { type: 'json', ...policies.noaa, fetchImpl, now }),
    fetchWithCache('noaa:airtemp', URLS.noaaAirTemp, { type: 'json', ...policies.noaa, fetchImpl, now }),
    fetchWithCache('noaa:pressure', URLS.noaaPressure, { type: 'json', ...policies.noaa, fetchImpl, now }),
    fetchWithCache('noaa:metadata', URLS.noaaMetadata, { type: 'json', ...policies.nwsPoints, fetchImpl, now }),
    fetchWithCache('nws:points', URLS.nwsPoints, { type: 'json', ...policies.nwsPoints, fetchImpl, now }),
    fetchWithCache('nws:alerts', URLS.nwsAlerts, { type: 'json', ...policies.nwsAlerts, fetchImpl, now, accept: 'application/geo+json, application/json' }),
  ]);

  const [statusWp, statusHtml, homepage, alertsWp, alertsHtml, advisoryWp, advisoryHtml, noaaWind, noaaAir, noaaPressure, noaaMetadata, nwsPointsResult, nwsAlertsResult] = baseJobs;
  const statusSelected = chooseWpOrHtml(statusWp, statusHtml);
  const incidentsSelected = chooseWpOrHtml(alertsWp, alertsHtml);
  const advisoriesSelected = chooseWpOrHtml(advisoryWp, advisoryHtml);
  const retrievedAt = new Date(now).toISOString();

  const statusObjects = [];
  if (statusSelected?.ok) {
    statusObjects.push(parseCbbtStatus(statusSelected.value, {
      sourceUrl: URLS.cbbtStatusHtml,
      retrievedAt: statusSelected.retrievedAt,
      retrievalAgeMs: statusSelected.ageMs,
    }));
  }
  if (homepage?.ok) {
    statusObjects.push(parseCbbtStatus(homepage.value, {
      sourceUrl: URLS.cbbtHomepage,
      retrievedAt: homepage.retrievedAt,
      retrievalAgeMs: homepage.ageMs,
      homepage: true,
    }));
  }
  const officialStatus = resolveOfficialStatus(statusObjects);

  const allIncidents = incidentsSelected?.ok ? parseIncidents(incidentsSelected.value, { sourceUrl: URLS.cbbtAlertsHtml, retrievedAt: incidentsSelected.retrievedAt }) : [];
  const activeIncidents = allIncidents.filter((item) => item.state === 'active');
  const clearedIncidents = allIncidents.filter((item) => item.state === 'cleared');
  const plannedAdvisories = advisoriesSelected?.ok ? parseAdvisories(advisoriesSelected.value, { sourceUrl: URLS.cbbtAdvisoryHtml, retrievedAt: advisoriesSelected.retrievedAt }) : [];

  const weatherNow = normalizeNoaaObservation({
    windPayload: noaaWind.ok ? noaaWind.value : null,
    airTempPayload: noaaAir.ok ? noaaAir.value : null,
    pressurePayload: noaaPressure.ok ? noaaPressure.value : null,
    metadataPayload: noaaMetadata.ok ? noaaMetadata.value : null,
  }, { retrievedAt, now });

  const nwsPoints = nwsPointsResult.ok ? normalizeNwsPoints(nwsPointsResult.value, { retrievedAt: nwsPointsResult.retrievedAt }) : { available: false, forecastGridDataUrl: null };
  let nwsGridResult = null;
  if (nwsPoints.forecastGridDataUrl) {
    nwsGridResult = await fetchWithCache('nws:grid', nwsPoints.forecastGridDataUrl, { type: 'json', ...policies.nwsForecast, fetchImpl, now, accept: 'application/geo+json, application/json' });
  }
  const forecast = nwsGridResult?.ok
    ? normalizeNwsGridForecast(nwsGridResult.value, { sourceUrl: nwsPoints.forecastGridDataUrl, retrievedAt: nwsGridResult.retrievedAt, now })
    : { available: false, generatedAt: null, freshness: { state: 'unavailable', ageMs: null, ageMinutes: null }, periods: [], operationalRestrictionInference: 'PROHIBITED', note: 'NWS forecast unavailable; official CBBT status is unaffected.' };
  const alerts = nwsAlertsResult.ok ? normalizeNwsAlerts(nwsAlertsResult.value, { retrievedAt: nwsAlertsResult.retrievedAt, now }) : [];

  let vdotIncidents = null;
  let vdotConstruction = null;
  let approachTraffic = { enabled: includeVdot, available: false, events: [], note: 'Virginia 511 is supplemental and never required for CBBT operational status.' };
  if (includeVdot) {
    [vdotIncidents, vdotConstruction] = await Promise.all([
      fetchWithCache('vdot:incidents', URLS.vdotIncidents, { type: 'json', ...policies.vdot, fetchImpl, now, accept: 'application/geo+json, application/json' }),
      fetchWithCache('vdot:construction', URLS.vdotConstruction, { type: 'json', ...policies.vdot, fetchImpl, now, accept: 'application/geo+json, application/json' }),
    ]);
    approachTraffic = {
      enabled: true,
      available: Boolean(vdotIncidents.ok || vdotConstruction.ok),
      events: normalizeVdotGeoJson(vdotIncidents.ok ? vdotIncidents.value : null, vdotConstruction.ok ? vdotConstruction.value : null, { retrievedAt }),
      note: 'Supplemental approach-road context from Virginia 511. CBBT official information remains authoritative for the facility.',
    };
  }

  const vehicleInput = parseVehicleQuery(query);
  const tollInput = parseTollQuery(query);
  const vehicle = vehicleInput ? vehicleEligibility(officialStatus, vehicleInput) : notEvaluated('vehicle');
  const toll = tollInput ? calculateToll(tollInput) : notEvaluated('toll');

  const systemHealth = {
    officialStatus: sourceHealth('CBBT status', statusSelected, { transport: statusSelected?.transport || 'unavailable', structuredEndpointAvailable: Boolean(statusWp.ok && unwrapWpPayload(statusWp.value)) }),
    cbbtHomepage: sourceHealth('CBBT homepage', homepage),
    incidents: sourceHealth('CBBT alerts', incidentsSelected, { transport: incidentsSelected?.transport || 'unavailable' }),
    advisories: sourceHealth('CBBT travel advisory', advisoriesSelected, { transport: advisoriesSelected?.transport || 'unavailable' }),
    noaaWind: sourceHealth('NOAA CO-OPS wind', noaaWind),
    noaaAirTemperature: sourceHealth('NOAA CO-OPS air temperature', noaaAir),
    noaaPressure: sourceHealth('NOAA CO-OPS pressure', noaaPressure),
    nwsPoints: sourceHealth('NWS points metadata', nwsPointsResult),
    nwsForecast: sourceHealth('NWS marine grid forecast', nwsGridResult),
    nwsAlerts: sourceHealth('NWS active alerts', nwsAlertsResult),
    vdotIncidents: includeVdot ? sourceHealth('Virginia 511 incidents', vdotIncidents) : { name: 'Virginia 511 incidents', state: 'disabled' },
    vdotConstruction: includeVdot ? sourceHealth('Virginia 511 construction', vdotConstruction) : { name: 'Virginia 511 construction', state: 'disabled' },
  };

  const requiredFailures = ['officialStatus'].filter((key) => systemHealth[key].state === 'unavailable');
  const degradedSources = Object.entries(systemHealth).filter(([, value]) => ['unavailable', 'degraded_cached'].includes(value.state)).map(([key]) => key);

  const provenance = [
    ...statusObjects.map((item) => item.provenance).filter(Boolean),
    ...allIncidents.map((item) => item.provenance).filter(Boolean),
    ...plannedAdvisories.map((item) => item.provenance).filter(Boolean),
    ...(weatherNow.provenance || []),
    forecast.provenance,
    ...alerts.map((item) => item.provenance).filter(Boolean),
  ].filter(Boolean);

  return {
    engine: { name: 'CBBT Decision Engine', version: PARSER_VERSION, generatedAt: retrievedAt, authorityRule: 'CBBT_OFFICIAL_STATUS_ALWAYS_WINS', weatherMayDeclareRestriction: false },
    bridge: { id: 'cbbt', name: 'Chesapeake Bay Bridge-Tunnel', coordinates: CBBT_COORDINATES },
    officialStatus,
    activeIncidents,
    clearedIncidents,
    plannedAdvisories,
    weatherNow,
    forecast,
    alerts,
    radar: RADAR_METADATA,
    approachTraffic,
    vehicleEligibility: vehicle,
    tollEstimate: toll,
    freshness: {
      officialStatus: officialStatus.freshness || { state: officialStatus.state === 'UNKNOWN' ? 'unavailable' : 'unknown' },
      weatherObservation: weatherNow.freshness,
      forecast: forecast.freshness,
      alerts: { state: nwsAlertsResult.ok ? (nwsAlertsResult.staleFallback ? 'aging' : 'fresh') : 'unavailable', ageMs: nwsAlertsResult.ageMs },
    },
    provenance,
    systemHealth: {
      state: requiredFailures.length ? 'DEGRADED_NO_OFFICIAL_STATUS' : degradedSources.length ? 'DEGRADED' : 'HEALTHY',
      requiredFailures,
      degradedSources,
      sources: systemHealth,
      cache: cacheSnapshot(),
    },
  };
}

module.exports = {
  boolParam,
  buildDecisionSnapshot,
  cacheSnapshot,
  chooseWpOrHtml,
  clearCache,
  fetchWithCache,
  haversineMiles,
  normalizeVdotGeoJson,
  parseTollQuery,
  parseVehicleQuery,
  sourceHealth,
};

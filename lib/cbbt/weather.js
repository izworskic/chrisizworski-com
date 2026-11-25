const { FRESHNESS, PARSER_VERSION, URLS } = require('./constants');
const { freshnessState, provenance, stableHash } = require('./core');

function numberOrNull(value) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round(value, digits = 1) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function parseGmtTimestamp(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/.test(text)
    ? `${text.replace(' ', 'T')}Z`
    : text;
  const t = Date.parse(normalized);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function knotsToMph(value) {
  const n = numberOrNull(value);
  return n == null ? null : n * 1.150779448;
}

function normalizeNoaaObservation({ windPayload, airTempPayload, pressurePayload, metadataPayload }, { retrievedAt = new Date().toISOString(), now = Date.now() } = {}) {
  const wind = Array.isArray(windPayload?.data) ? windPayload.data[0] : null;
  const temp = Array.isArray(airTempPayload?.data) ? airTempPayload.data[0] : null;
  const pressure = Array.isArray(pressurePayload?.data) ? pressurePayload.data[0] : null;
  const observed = [wind, temp, pressure].map(row => parseGmtTimestamp(row?.t));
  const ages = observed.map(t => freshnessState(t, FRESHNESS.noaaObservation, now));
  const usable = ages.map(a => a.state === 'fresh' || a.state === 'aging');
  const speed = usable[0] ? round(knotsToMph(wind?.s)) : null;
  const gust = usable[0] ? round(knotsToMph(wind?.g)) : null;
  const direction = usable[0] ? numberOrNull(wind?.d) : null;
  const cardinal = usable[0] && /^(N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW)$/i.test(wind?.dr || '') ? wind.dr : null;
  const air = usable[1] ? numberOrNull(temp?.v) : null;
  const barometer = usable[2] ? numberOrNull(pressure?.v) : null;
  const validSpeed = speed != null && speed >= 0 ? speed : null;
  const validGust = gust != null && gust >= 0 ? gust : null;
  const validDirection = direction != null && direction >= 0 && direction <= 360 ? direction : null;
  const used = [validSpeed != null || validGust != null || validDirection != null || cardinal != null, air != null, barometer != null];
  // Aggregate timestamp is the oldest retained measurement, not whichever
  // independent source happens to be first. Preserve stale provenance.
  const retained = observed.filter((_, i) => used[i]).sort();
  const dated = observed.filter((_, i) => ages[i].state !== 'unknown').sort();
  const observedAt = retained[0] || dated[0] || null;
  const freshness = freshnessState(observedAt, FRESHNESS.noaaObservation, now);

  const stations = metadataPayload?.stations || metadataPayload?.stationList || [];
  const station = Array.isArray(stations) ? stations[0] : metadataPayload?.station || null;
  const sensors = station?.sensors?.sensorList || station?.sensors || metadataPayload?.sensors?.sensorList || metadataPayload?.sensors || [];
  const sensorList = Array.isArray(sensors) ? sensors : [];
  const relevantSensors = sensorList
    .filter((sensor) => /wind|air temp|barometric|pressure/i.test(`${sensor?.name || ''} ${sensor?.sensorID || ''}`))
    .map((sensor) => ({ id: sensor.sensorID || null, name: sensor.name || null, enabled: Number(sensor.status) === 1, message: sensor.message || null }));

  const available = used.some(Boolean);
  return {
    available,
    stationId: String(windPayload?.metadata?.id || tempPayloadId(airTempPayload) || pressurePayload?.metadata?.id || station?.id || '8638901'),
    stationName: windPayload?.metadata?.name || airTempPayload?.metadata?.name || pressurePayload?.metadata?.name || station?.name || 'CBBT Chesapeake Channel',
    latitude: numberOrNull(windPayload?.metadata?.lat || station?.lat),
    longitude: numberOrNull(windPayload?.metadata?.lon || station?.lng || station?.lon),
    observedAt,
    freshness,
    wind: {
      sustainedMph: validSpeed,
      gustMph: validGust,
      directionDegrees: validDirection,
      directionCardinal: cardinal,
      sourceUnits: 'knots',
    },
    airTemperatureF: air,
    pressureMb: barometer,
    observationTimes: { wind: observed[0], airTemperature: observed[1], pressure: observed[2] },
    stationHealth: {
      status: relevantSensors.length ? (relevantSensors.some((sensor) => sensor.enabled === false) ? 'degraded' : 'reporting') : (available ? 'unknown' : 'unavailable'),
      sensors: relevantSensors,
    },
    operationalRestrictionInference: 'PROHIBITED',
    note: 'NOAA observations are environmental context only and never establish a CBBT restriction level.',
    provenance: [
      provenance({
        rawSourceText: wind ? JSON.stringify(wind) : null,
        normalizedValue: wind ? { sustainedMph: round(knotsToMph(wind.s)), gustMph: round(knotsToMph(wind.g)), directionDegrees: numberOrNull(wind.d) } : null,
        sourceName: 'NOAA CO-OPS', sourceUrl: URLS.noaaWind, sourceTimestamp: parseGmtTimestamp(wind?.t), retrievedAt,
        sourceId: '8638901:wind', parseState: wind ? 'parsed' : 'missing',
      }),
      provenance({
        rawSourceText: temp ? JSON.stringify(temp) : null,
        normalizedValue: temp ? numberOrNull(temp.v) : null,
        sourceName: 'NOAA CO-OPS', sourceUrl: URLS.noaaAirTemp, sourceTimestamp: parseGmtTimestamp(temp?.t), retrievedAt,
        sourceId: '8638901:air_temperature', parseState: temp ? 'parsed' : 'missing',
      }),
      provenance({
        rawSourceText: pressure ? JSON.stringify(pressure) : null,
        normalizedValue: pressure ? numberOrNull(pressure.v) : null,
        sourceName: 'NOAA CO-OPS', sourceUrl: URLS.noaaPressure, sourceTimestamp: parseGmtTimestamp(pressure?.t), retrievedAt,
        sourceId: '8638901:air_pressure', parseState: pressure ? 'parsed' : 'missing',
      }),
    ],
  };
}

function tempPayloadId(payload) {
  return payload?.metadata?.id || null;
}

function parseDurationMs(value) {
  const match = String(value || '').match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!match) return 0;
  const [, days = 0, hours = 0, minutes = 0, seconds = 0] = match;
  return Number(days) * 86_400_000 + Number(hours) * 3_600_000 + Number(minutes) * 60_000 + Number(seconds) * 1_000;
}

function intervalBounds(validTime) {
  const [startText, durationText] = String(validTime || '').split('/');
  const start = Date.parse(startText);
  const duration = parseDurationMs(durationText);
  return {
    start: Number.isFinite(start) ? start : null,
    end: Number.isFinite(start) && duration > 0 ? start + duration : null,
  };
}

function gridValueAt(series, timestamp) {
  if (!Number.isFinite(timestamp)) return null;
  const target = timestamp;
  for (const row of Array.isArray(series?.values) ? series.values : []) {
    const { start, end } = intervalBounds(row.validTime);
    if (start != null && end != null && target >= start && target < end) return row.value;
  }
  return null;
}

function convertUnit(value, unitCode, kind) {
  const number = numberOrNull(value);
  if (number == null) return null;
  const unit = String(unitCode || '').toLowerCase();
  if (kind === 'wind') {
    if (unit.includes('km_h') || unit.includes('km/h')) return number * 0.621371192;
    if (unit.includes('m_s') || unit.includes('m/s')) return number * 2.23693629;
    if (unit.includes('knot') || unit.includes('kt')) return number * 1.150779448;
    return number;
  }
  if (kind === 'temperature') {
    if (unit.includes('degc') || unit.includes('celsius')) return number * 9 / 5 + 32;
    return number;
  }
  return number;
}

function weatherSummary(value) {
  const entries = Array.isArray(value) ? value : [];
  if (!entries.length) return null;
  const labels = entries.map((entry) => {
    const coverage = entry.coverage && entry.coverage !== 'none' ? entry.coverage : null;
    const intensity = entry.intensity && entry.intensity !== 'none' ? entry.intensity : null;
    const type = entry.weather && entry.weather !== 'none' ? entry.weather : null;
    return [coverage, intensity, type].filter(Boolean).join(' ');
  }).filter(Boolean);
  return labels.length ? [...new Set(labels)].join(', ') : null;
}

function normalizeNwsGridForecast(gridPayload, { sourceUrl = null, retrievedAt = new Date().toISOString(), now = Date.now(), limit = 36 } = {}) {
  const props = gridPayload?.properties || {};
  const windSpeed = props.windSpeed || {};
  const issued = props.updateTime || props.generatedAt || null;
  const generatedAt = parseGmtTimestamp(issued);
  const freshness = freshnessState(generatedAt, FRESHNESS.nwsForecast, now);
  const usable = freshness.state === 'fresh' || freshness.state === 'aging';
  const candidates = usable && Array.isArray(windSpeed.values) ? windSpeed.values : [];
  const rows = candidates.filter(row => {
    const { start, end } = intervalBounds(row?.validTime);
    return start != null && end != null && end > now;
  }).sort((a,b) => intervalBounds(a.validTime).start - intervalBounds(b.validTime).start).slice(0, limit).map((row) => {
    const { start, end } = intervalBounds(row.validTime);
    const gust = gridValueAt(props.windGust, start);
    const direction = gridValueAt(props.windDirection, start);
    const temperature = gridValueAt(props.temperature, start);
    const precip = gridValueAt(props.probabilityOfPrecipitation, start);
    const wx = gridValueAt(props.weather, start);
    return {
      startTime: start == null ? null : new Date(start).toISOString(),
      endTime: end == null ? null : new Date(end).toISOString(),
      windMph: round(convertUnit(row.value, windSpeed.uom, 'wind')),
      gustMph: round(convertUnit(gust, props.windGust?.uom, 'wind')),
      windDirectionDegrees: round(numberOrNull(direction), 0),
      temperatureF: round(convertUnit(temperature, props.temperature?.uom, 'temperature')),
      precipitationProbabilityPct: round(numberOrNull(precip), 0),
      weather: weatherSummary(wx),
    };
  });

  return {
    available: rows.length > 0,
    generatedAt,
    freshness,
    periods: rows,
    operationalRestrictionInference: 'PROHIBITED',
    note: 'NWS marine-grid forecast is context only. It does not predict or declare a CBBT restriction level.',
    provenance: provenance({
      rawSourceText: issued ? JSON.stringify({ updateTime: issued, validTimes: props.validTimes || null }) : null,
      normalizedValue: { periodCount: rows.length },
      sourceName: 'National Weather Service', sourceUrl: sourceUrl || 'https://api.weather.gov/', sourceTimestamp: generatedAt, retrievedAt,
      sourceId: props.gridId && props.gridX != null && props.gridY != null ? `${props.gridId}/${props.gridX},${props.gridY}` : null,
      parseState: rows.length ? 'parsed' : 'missing',
    }),
  };
}

function normalizeNwsAlerts(payload, { sourceUrl = URLS.nwsAlerts, retrievedAt = new Date().toISOString(), now = Date.now() } = {}) {
  const features = Array.isArray(payload?.features) ? payload.features : [];
  const alerts = [];
  for (const feature of features) {
    const p = feature?.properties || {};
    const expiresAt = p.expires || p.ends || null;
    const expires = Date.parse(expiresAt || '');
    if (Number.isFinite(expires) && expires < now) continue;
    const id = feature.id || p.id || stableHash(`${p.event}|${p.headline}|${p.onset}`).slice(0, 16);
    alerts.push({
      id,
      event: p.event || null,
      severity: p.severity || null,
      certainty: p.certainty || null,
      urgency: p.urgency || null,
      headline: p.headline || null,
      description: p.description || null,
      instruction: p.instruction || null,
      effective: p.effective || null,
      onset: p.onset || null,
      expires: expiresAt,
      senderName: p.senderName || null,
      areaDesc: p.areaDesc || null,
      provenance: provenance({
        rawSourceText: p.headline || p.event || JSON.stringify(p).slice(0, 1200),
        normalizedValue: { event: p.event || null, severity: p.severity || null, expires: expiresAt },
        sourceName: 'National Weather Service', sourceUrl, sourceTimestamp: p.sent || p.effective || null, retrievedAt,
        sourceId: id, effectiveStart: p.onset || p.effective || null, effectiveEnd: expiresAt, parseState: 'parsed',
      }),
    });
  }
  return alerts;
}

function normalizeNwsPoints(payload, { retrievedAt = new Date().toISOString() } = {}) {
  const p = payload?.properties || {};
  return {
    available: Boolean(p.forecastGridData),
    forecastGridDataUrl: p.forecastGridData || null,
    forecastUrl: p.forecast || null,
    forecastHourlyUrl: p.forecastHourly || null,
    cwa: p.cwa || null,
    gridId: p.gridId || null,
    gridX: p.gridX ?? null,
    gridY: p.gridY ?? null,
    forecastZone: p.forecastZone || null,
    county: p.county || null,
    fireWeatherZone: p.fireWeatherZone || null,
    timeZone: p.timeZone || null,
    radarStation: p.radarStation || null,
    retrievedAt,
  };
}

const RADAR_METADATA = Object.freeze({
  stationId: 'KAKQ',
  office: 'AKQ',
  name: 'NWS Wakefield Doppler Radar',
  viewerUrl: 'https://radar.weather.gov/station/KAKQ/standard',
  sourceName: 'National Weather Service',
  sourceUrl: 'https://www.weather.gov/akq/',
  role: 'VISUAL_CONTEXT_ONLY',
  operationalRestrictionInference: 'PROHIBITED',
  expectedUpdateCadenceMinutes: 10,
});

module.exports = {
  RADAR_METADATA,
  convertUnit,
  gridValueAt,
  intervalBounds,
  knotsToMph,
  normalizeNoaaObservation,
  normalizeNwsAlerts,
  normalizeNwsGridForecast,
  normalizeNwsPoints,
  parseDurationMs,
  parseGmtTimestamp,
  weatherSummary,
};

import { CURRENT_STATIONS, EASTPORT_TIDE_STATION, NOAA_APP, PUBLIC_SOURCES } from './config.js';
import { addDays, isoDate, parseUtc } from './time.js';
import { assertHttps } from './security.js';

const DATA_URL = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const META_BASE = 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations';
const metadataUrl = (stationId) => `${META_BASE}/${stationId}.json`;
const UA = 'OldSowLive/1.0 (+https://chrisizworski.com/old-sow-live/)';

function query(params) {
  const u = new URL(DATA_URL);
  for (const [k, v] of Object.entries(params)) if (v != null) u.searchParams.set(k, String(v));
  return u.href;
}

async function getJson(url, { timeoutMs = 7000 } = {}) {
  assertHttps(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'error',
      headers: { accept: 'application/json', 'user-agent': UA }
    });
    if (!res.ok) throw new Error(`NOAA HTTP ${res.status}`);
    const text = await res.text();
    if (text.length > 2_500_000) throw new Error('NOAA response too large');
    const data = JSON.parse(text);
    if (data?.error?.message) throw new Error(`NOAA: ${data.error.message}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function provenance({ id, product, url, fetchedAt, validTime = null, units = null, coordinates = null, age = null }) {
  return { provider: 'NOAA CO-OPS', sourceId: id, product, url, fetchedAt, validTime, units, coordinates, age };
}

export function normalizeTidePredictions(data) {
  const rows = Array.isArray(data?.predictions) ? data.predictions : [];
  return rows.map((r) => ({
    time: parseUtc(r.t)?.toISOString() ?? null,
    value: Number(r.v),
    type: r.type ? String(r.type).toUpperCase() : null
  })).filter((r) => r.time && Number.isFinite(r.value));
}

export function normalizeWaterLevel(data) {
  const rows = Array.isArray(data?.data) ? data.data : [];
  const r = rows.at(-1);
  if (!r) return null;
  const time = parseUtc(r.t);
  const value = Number(r.v);
  return time && Number.isFinite(value) ? { time: time.toISOString(), value } : null;
}

export function normalizeWind(data) {
  const rows = Array.isArray(data?.data) ? data.data : [];
  const r = rows.at(-1);
  if (!r) return null;
  const time = parseUtc(r.t);
  const speed = Number(r.s);
  const gust = Number(r.g);
  const direction = Number(r.d);
  if (!time) return null;
  return {
    time: time.toISOString(),
    speed: Number.isFinite(speed) ? speed : null,
    gust: Number.isFinite(gust) ? gust : null,
    direction: Number.isFinite(direction) ? direction : null
  };
}

function currentRows(data) {
  if (Array.isArray(data?.current_predictions?.cp)) return data.current_predictions.cp;
  if (Array.isArray(data?.current_predictions?.predictions)) return data.current_predictions.predictions;
  if (Array.isArray(data?.predictions)) return data.predictions;
  return [];
}

function normalizedType(raw) {
  const t = String(raw ?? '').toLowerCase().replaceAll(' ', '_').replaceAll('-', '_');
  if (!t) return null;
  if (t.includes('flood')) return t.includes('slack') ? 'slack' : 'flood';
  if (t.includes('ebb')) return t.includes('slack') ? 'slack' : 'ebb';
  if (t.includes('slack')) return 'slack';
  return t;
}

export function normalizeCurrentPredictions(data, stationId) {
  return currentRows(data).map((r) => {
    const time = parseUtc(r.Time ?? r.time ?? r.t);
    const rawVelocity = r.Velocity_Major ?? r.velocity_major ?? r.Speed ?? r.speed ?? r.v;
    const velocity = Number(rawVelocity);
    const direction = Number(r.Direction ?? r.direction ?? r.dir);
    const explicitType = normalizedType(r.Type ?? r.type);
    // NOAA's default currents_predictions Velocity_Major is signed along the
    // station's mean flood/ebb axis: positive=flood, negative=ebb. Max/slack
    // responses do not consistently expose a separate Type field, so use the
    // documented sign semantics only when Type is absent. speed_dir mode is
    // never requested by this adapter.
    const type = explicitType || (Number.isFinite(velocity)
      ? (Math.abs(velocity) <= 0.001 ? 'slack' : velocity > 0 ? 'flood' : 'ebb')
      : null);
    return {
      stationId,
      time: time?.toISOString() ?? null,
      velocity: Number.isFinite(velocity) ? velocity : null,
      direction: Number.isFinite(direction) ? direction : null,
      type,
      typeSource: explicitType ? 'upstream_type' : (Number.isFinite(velocity) ? 'velocity_major_sign' : null),
      rawType: r.Type ?? r.type ?? null
    };
  }).filter((r) => r.time && r.velocity != null);
}

function normalizeMetadata(data) {
  const rows = Array.isArray(data?.stationList)
    ? data.stationList
    : (Array.isArray(data?.stations) ? data.stations : (data?.id ? [data] : []));
  const wanted = new Set(CURRENT_STATIONS.map((s) => s.id));
  return rows.filter((r) => wanted.has(String(r.id))).map((r) => ({
    id: String(r.id),
    name: String(r.name || CURRENT_STATIONS.find((s) => s.id === String(r.id))?.name || r.id),
    lat: Number.isFinite(Number(r.lat)) ? Number(r.lat) : null,
    lon: Number.isFinite(Number(r.lng ?? r.lon)) ? Number(r.lng ?? r.lon) : null,
    type: r.type ?? null,
    bin: r.currbin ?? r.bin ?? null,
    depth: r.depth ?? null,
    timeZoneOffset: r.timezone_offset ?? r.tz_offset ?? null
  }));
}

function looksLikeDenseSeries(rows) {
  if (!Array.isArray(rows) || rows.length < 8) return false;
  const gaps = [];
  for (let i = 1; i < Math.min(rows.length, 80); i += 1) {
    const gap = (new Date(rows[i].time) - new Date(rows[i - 1].time)) / 60000;
    if (Number.isFinite(gap) && gap > 0) gaps.push(gap);
  }
  if (!gaps.length) return false;
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  return median <= 10;
}

async function fetchCurrentSeries(stationId, beginDate, endDate, metadata = null) {
  const common = {
    product: 'currents_predictions', application: NOAA_APP, begin_date: beginDate, end_date: endDate,
    station: stationId, bin: metadata?.bin ?? undefined, time_zone: 'gmt', units: 'english', format: 'json'
  };
  const eventUrl = query({ ...common, interval: 'max_slack' });
  const eventData = await getJson(eventUrl);
  const events = normalizeCurrentPredictions(eventData, stationId);

  // NOAA subordinate prediction stations are max/slack only. Some responses
  // may accept an interval parameter but still return event rows; do not
  // mislabel those as a six-minute time series.
  if (String(metadata?.type || '').toUpperCase() === 'S') {
    return { rows: events, events, interval: 'max_slack', url: eventUrl, eventUrl };
  }

  const shortUrl = query({ ...common, interval: '6' });
  try {
    const data = await getJson(shortUrl);
    const rows = normalizeCurrentPredictions(data, stationId);
    if (looksLikeDenseSeries(rows)) return { rows, events, interval: '6', url: shortUrl, eventUrl };
  } catch {
    // Harmonic/subordinate stations may only support max/slack.
  }
  return { rows: events, events, interval: 'max_slack', url: eventUrl, eventUrl };
}

export async function fetchNoaaBundle(now = new Date()) {
  const fetchedAt = new Date().toISOString();
  const begin = isoDate(addDays(now, -1));
  const end14 = isoDate(addDays(now, 14));
  const end2 = isoDate(addDays(now, 2));
  const sources = [];
  const failures = [];

  const tideHiLoUrl = query({
    product: 'predictions', application: NOAA_APP, begin_date: begin, end_date: end14,
    datum: 'MLLW', station: EASTPORT_TIDE_STATION.id, time_zone: 'gmt', units: 'english', interval: 'hilo', format: 'json'
  });
  const tideCurveUrl = query({
    product: 'predictions', application: NOAA_APP, begin_date: begin, end_date: end2,
    datum: 'MLLW', station: EASTPORT_TIDE_STATION.id, time_zone: 'gmt', units: 'english', interval: '6', format: 'json'
  });
  const levelUrl = query({
    product: 'water_level', application: NOAA_APP, date: 'latest', datum: 'MLLW', station: EASTPORT_TIDE_STATION.id,
    time_zone: 'gmt', units: 'english', format: 'json'
  });
  const windUrl = query({
    product: 'wind', application: NOAA_APP, date: 'latest', station: EASTPORT_TIDE_STATION.id,
    time_zone: 'gmt', units: 'english', format: 'json'
  });

  const baseSettled = await Promise.allSettled([
    getJson(tideHiLoUrl), getJson(tideCurveUrl), getJson(levelUrl), getJson(windUrl),
    ...CURRENT_STATIONS.map((s) => getJson(metadataUrl(s.id)))
  ]);

  const [hiLoR, curveR, levelR, windR, ...metadataR] = baseSettled;
  const tideHiLo = hiLoR.status === 'fulfilled' ? normalizeTidePredictions(hiLoR.value) : [];
  const tideCurve = curveR.status === 'fulfilled' ? normalizeTidePredictions(curveR.value) : [];
  const waterLevel = levelR.status === 'fulfilled' ? normalizeWaterLevel(levelR.value) : null;
  const wind = windR.status === 'fulfilled' ? normalizeWind(windR.value) : null;
  const metadata = metadataR.flatMap((r) => r.status === 'fulfilled' ? normalizeMetadata(r.value) : []);

  for (const [label, result] of [['tide hilo', hiLoR], ['tide curve', curveR], ['water level', levelR], ['wind', windR]]) {
    if (result.status === 'rejected') failures.push({ source: label, message: String(result.reason?.message || result.reason) });
  }
  metadataR.forEach((result, i) => {
    if (result.status === 'rejected') failures.push({ source: `${CURRENT_STATIONS[i].id} metadata`, message: String(result.reason?.message || result.reason) });
  });

  if (tideHiLo.length) sources.push(provenance({ id: EASTPORT_TIDE_STATION.id, product: 'predictions_hilo', url: tideHiLoUrl, fetchedAt, units: 'ft MLLW' }));
  if (tideCurve.length) sources.push(provenance({ id: EASTPORT_TIDE_STATION.id, product: 'predictions_6min', url: tideCurveUrl, fetchedAt, units: 'ft MLLW' }));
  if (waterLevel) sources.push(provenance({ id: EASTPORT_TIDE_STATION.id, product: 'water_level_observed', url: levelUrl, fetchedAt, validTime: waterLevel.time, units: 'ft MLLW' }));
  if (wind) sources.push(provenance({ id: EASTPORT_TIDE_STATION.id, product: 'wind_observed', url: windUrl, fetchedAt, validTime: wind.time, units: 'knots / degrees' }));
  metadata.forEach((m) => sources.push(provenance({
    id: m.id, product: 'station_metadata', url: metadataUrl(m.id), fetchedAt,
    coordinates: Number.isFinite(m.lat) && Number.isFinite(m.lon) ? { lat: m.lat, lon: m.lon } : null
  })));

  const currentR = await Promise.allSettled(CURRENT_STATIONS.map((station) => {
    const meta = metadata.find((m) => m.id === station.id) || null;
    return fetchCurrentSeries(station.id, begin, end14, meta);
  }));

  const currents = {};
  CURRENT_STATIONS.forEach((station, i) => {
    const r = currentR[i];
    if (r?.status === 'fulfilled' && r.value.rows.length) {
      currents[station.id] = { ...r.value, station };
      sources.push(provenance({ id: station.id, product: `currents_predictions_${r.value.interval}`, url: r.value.url, fetchedAt, units: 'knots' }));
      if (r.value.eventUrl !== r.value.url) sources.push(provenance({ id: station.id, product: 'currents_predictions_max_slack', url: r.value.eventUrl, fetchedAt, units: 'knots' }));
    } else {
      currents[station.id] = { rows: [], interval: null, station };
      failures.push({ source: station.id, message: String(r?.reason?.message || r?.reason || 'No current prediction rows') });
    }
  });

  return { fetchedAt, tideHiLo, tideCurve, waterLevel, wind, metadata, currents, sources, failures };
}

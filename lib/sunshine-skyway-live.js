const base = require('./sunshine-skyway');
const flow = require('./sunshine-skyway-flow');

const FL511_TRAFFIC_API = 'https://fl511.com/List/GetData/traffic';
const FL511_ALERTS_PAGE = base.URLS.fl511Alerts;
const FL511_CAMERAS_API = 'https://fl511.com/List/GetData/Cameras';
const USER_AGENT = 'SunshineSkywayDecision/1.0 (+https://chrisizworski.com/sunshine-skyway-bridge/)';

const liveCache = new Map();

function sourceState(result) {
  if (!result?.ok) return { state: 'unavailable', retrievedAt: result?.retrievedAt || null, url: result?.url || null, error: result?.error || null };
  return {
    state: result.staleFallback ? 'degraded_cached' : 'ok',
    retrievedAt: result.retrievedAt || null,
    ageMs: result.ageMs ?? null,
    url: result.url || null,
    error: result.error || null,
  };
}

async function fetchCached(key, url, {
  method = 'GET', body = null, ttlMs = 30_000, staleMs = 5 * 60_000,
  timeoutMs = 7_500, fetchImpl = global.fetch, now = Date.now(), type = 'json',
} = {}) {
  const previous = liveCache.get(key);
  if (previous) {
    const ageMs = Math.max(0, now - Date.parse(previous.retrievedAt));
    if (ageMs <= ttlMs) return { ...previous, ok: true, ageMs, cacheHit: true, staleFallback: false };
  }
  try {
    const headers = {
      'user-agent': USER_AGENT,
      accept: type === 'json' ? 'application/json, text/plain;q=0.8, */*;q=0.2' : 'text/html, text/plain;q=0.9, */*;q=0.2',
    };
    const init = { method, headers, signal: AbortSignal.timeout(timeoutMs) };
    if (body != null) {
      headers['content-type'] = 'application/json;charset=UTF-8';
      init.body = JSON.stringify(body);
    }
    const response = await fetchImpl(url, init);
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const value = type === 'json' ? await response.json() : await response.text();
    const row = { value, retrievedAt: new Date(now).toISOString(), url };
    liveCache.set(key, row);
    return { ...row, ok: true, ageMs: 0, cacheHit: false, staleFallback: false, status: response.status };
  } catch (error) {
    if (previous) {
      const ageMs = Math.max(0, now - Date.parse(previous.retrievedAt));
      if (ageMs <= staleMs) return { ...previous, ok: true, ageMs, cacheHit: true, staleFallback: true, error: String(error?.message || error) };
    }
    return { ok: false, value: null, url, retrievedAt: new Date(now).toISOString(), ageMs: null, staleFallback: false, error: String(error?.message || error) };
  }
}

function trafficRequestBody() {
  const col = (data, name, orderable = true) => ({
    data, name, searchable: false, orderable,
    search: { value: '', regex: false }, isUtcDate: false, isCollection: false,
  });
  return {
    draw: 1,
    columns: [
      { ...col(null, '', false), title: '', visible: true },
      col('region', 'region'), col('county', 'county'), col('roadwayName', 'roadwayName'),
      col('direction', 'direction'), col('type', 'type'), col('severity', 'severity'),
      col('description', 'description', false), col('startTime', 'startTime'), col('lastUpdated', 'lastUpdated'),
      col(10, '', false),
    ],
    order: [{ column: 9, dir: 'desc' }],
    start: 0,
    length: 500,
    search: { value: '', regex: false },
  };
}

function cameraQueryUrl() {
  const query = {
    columns: [
      { data: null, name: '' }, { name: 'sortId', s: true }, { name: 'region', s: true },
      { name: 'county', s: true }, { name: 'roadway', s: true },
      { data: 5, name: 'description2' }, { data: 6, name: '' },
    ],
    order: [{ column: 1, dir: 'asc' }, { column: 2, dir: 'asc' }],
    start: 0,
    length: 250,
    search: { value: 'Skyway' },
  };
  return `${FL511_CAMERAS_API}?query=${encodeURIComponent(JSON.stringify(query))}&lang=en`;
}

function isSkywayText(value) {
  return /\b(?:sunshine\s+skyway(?:\s+bridge)?|skyway\s+bridge)\b/i.test(base.cleanText(value));
}

function normalizeTrafficRows(payload) {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows.map(row => {
    const description = base.cleanText(row?.description || '');
    const roadway = base.cleanText(row?.roadwayName || row?.roadway || '');
    const direction = base.cleanText(row?.direction || '');
    const county = base.cleanText(row?.county || '');
    const type = base.cleanText(row?.type || '');
    const severity = base.cleanText(row?.severity || '');
    const text = [description, roadway, direction, county, type, severity].filter(Boolean).join(' · ');
    if (!isSkywayText(text)) return null;
    return {
      id: String(row?.id || row?.eventId || row?.sortId || `${description}|${row?.lastUpdated || ''}`),
      description: description || text,
      roadway,
      direction,
      county,
      type,
      severity,
      startTime: row?.startTime || null,
      lastUpdated: row?.lastUpdated || null,
      source: 'FL511 traffic API',
    };
  }).filter(Boolean);
}

function normalizeCameraRows(payload) {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows.map(row => {
    const name = base.cleanText(row?.description2 || row?.description || row?.name || '');
    const roadway = base.cleanText(row?.roadway || row?.roadwayName || '');
    const combined = `${name} ${roadway}`;
    if (!/\bskyway\b/i.test(combined)) return null;
    const id = String(row?.id || row?.cameraId || row?.sortId || '');
    const videoUrl = String(row?.videoUrl || row?.videoURL || '').trim();
    const imageUrl = String(row?.imageUrl || row?.imageURL || row?.image || '').trim();
    const tooltipId = /\d+/.test(id) ? id.match(/\d+/)[0] : null;
    const sourceUrl = tooltipId ? `https://fl511.com/tooltip/Cameras/${tooltipId}` : base.URLS.fl511Camera2553;
    return {
      id: tooltipId ? `fl511-skyway-${tooltipId}` : `fl511-skyway-${id || 'camera'}`,
      name: name || 'Sunshine Skyway FL511 camera',
      provider: 'FL511',
      embedUrl: videoUrl || imageUrl || sourceUrl,
      videoUrl: videoUrl || null,
      imageUrl: imageUrl || null,
      sourceUrl,
      official: true,
      note: videoUrl ? 'Live FL511 video feed.' : imageUrl ? 'Live FL511 camera image.' : 'Official FL511 camera surface.',
      latitude: Number.isFinite(Number(row?.latitude)) ? Number(row.latitude) : null,
      longitude: Number.isFinite(Number(row?.longitude)) ? Number(row.longitude) : null,
      roadway,
    };
  }).filter(Boolean);
}

function selectSkywayCameras(payload) {
  const rows = normalizeCameraRows(payload);
  const exact = rows.filter(camera => /skyway\s+bridge\s+view/i.test(camera.name));
  const preferred = exact.length ? exact : rows;
  const unique = [];
  const seen = new Set();
  for (const camera of preferred) {
    const key = camera.id || camera.sourceUrl;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(camera);
    if (unique.length >= 6) break;
  }
  return unique;
}

async function buildSnapshot({ query = {}, fetchImpl = global.fetch, now = Date.now() } = {}) {
  // Base snapshot owns NWS normalization, toll rules and all fail-soft weather behavior.
  // Live FL511 adapters below replace the brittle list-page HTML as operational evidence.
  const [baseSnapshot, trafficResult, alertsResult, cameraResult, flowResult] = await Promise.all([
    base.buildSnapshot({ query, fetchImpl, now }),
    fetchCached('fl511-traffic-api', FL511_TRAFFIC_API, {
      method: 'POST', body: trafficRequestBody(), type: 'json', fetchImpl, now,
      ttlMs: 30_000, staleMs: 5 * 60_000,
    }),
    fetchCached('fl511-alerts-page-live', FL511_ALERTS_PAGE, {
      type: 'text', fetchImpl, now, ttlMs: 30_000, staleMs: 5 * 60_000,
    }),
    fetchCached('fl511-skyway-cameras', cameraQueryUrl(), {
      type: 'json', fetchImpl, now, ttlMs: 60_000, staleMs: 10 * 60_000,
    }),
    flow.buildTrafficFlow({ direction: query.direction, fetchImpl, now }),
  ]);

  const trafficEvents = trafficResult.ok ? normalizeTrafficRows(trafficResult.value) : [];
  const trafficText = trafficEvents.map(event => event.description).join('\n');
  const sourceHealth = {
    ...baseSnapshot.sourceHealth,
    traffic: sourceState(trafficResult),
    alerts: sourceState(alertsResult),
    camera: sourceState(cameraResult),
    trafficSpeeds: flowResult.sourceHealth,
  };
  const officialStatus = base.resolveOperationalState({
    alertsText: alertsResult.value || '',
    trafficText,
    sourceHealth,
  });

  const officialMentions = [];
  for (const event of trafficEvents) {
    const signals = base.parseOperationalSignal(event.description);
    if (!signals.length) {
      officialMentions.push({ level: 'MENTION', text: event.description, event });
      continue;
    }
    for (const signal of signals) officialMentions.push({ ...signal, event });
  }
  const alertSignals = sourceHealth.alerts.state === 'ok' ? base.parseOperationalSignal(alertsResult.value || '') : [];
  for (const signal of alertSignals) officialMentions.push(signal);

  const cameras = sourceHealth.camera.state === 'ok' ? selectSkywayCameras(cameraResult.value) : [];
  const safeCameras = cameras.length ? cameras : base.STATIC_CAMERAS;
  const vehicleType = String(query.vehicle || 'car').toLowerCase();
  const vehicle = base.evaluateVehicleContext({ vehicle: vehicleType, officialState: officialStatus.state, windContext: baseSnapshot.windContext });

  return {
    ...baseSnapshot,
    generatedAt: new Date(now).toISOString(),
    officialStatus,
    vehicle: { ...vehicle, type: vehicleType },
    traffic: {
      state: officialStatus.state === 'CLOSED' ? 'CLOSED' : officialStatus.state === 'IMPACTED' ? 'ACTIVE_IMPACT' : officialMentions.length ? 'SKYWAY_MENTION' : 'NO_SPECIFIC_LIVE_EVENT_FOUND',
      officialMentions: officialMentions.slice(0, 8),
      events: trafficEvents.slice(0, 8),
      recordsTotal: Number.isFinite(Number(trafficResult?.value?.recordsTotal)) ? Number(trafficResult.value.recordsTotal) : null,
      source: 'FL511 live traffic data',
      flow: flowResult,
      note: 'FL511 event rows are filtered conservatively to explicit Sunshine Skyway references. The separate Traffic Speeds layer supplies categorical live flow without inventing mph or delay minutes.',
    },
    cameras: safeCameras,
    sourceHealth,
    runtime: {
      operationalAdapter: 'FL511_LIST_GETDATA_TRAFFIC',
      trafficFlowAdapter: 'FL511_IBI_TRAFFIC_SPEED_TILES',
      cameraAdapter: cameras.length ? 'FL511_LIST_GETDATA_CAMERAS' : 'FL511_OFFICIAL_TOOLTIP_FALLBACK',
    },
  };
}

module.exports = {
  ...base,
  FL511_TRAFFIC_API,
  FL511_CAMERAS_API,
  trafficRequestBody,
  cameraQueryUrl,
  normalizeTrafficRows,
  normalizeCameraRows,
  selectSkywayCameras,
  buildSnapshot,
  _liveCache: liveCache,
};

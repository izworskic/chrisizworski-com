const BRIDGE = Object.freeze({
  name: 'Bob Graham Sunshine Skyway Bridge',
  shortName: 'Sunshine Skyway Bridge',
  route: 'I-275',
  latitude: 27.625,
  longitude: -82.657,
});

const URLS = Object.freeze({
  fdotFl511: 'https://www.fdot.gov/traffic/its/fl511',
  fdotWindGuidance: 'https://www.fdot.gov/info/co/news/2024/08052024',
  fl511Traffic: 'https://fl511.com/list/events/traffic',
  fl511Alerts: 'https://fl511.com/list/alerts',
  fl511Map: 'https://fl511.com/',
  fl511Camera2553: 'https://fl511.com/tooltip/Cameras/2553',
  tollRates: 'https://floridasturnpike.com/wp-content/uploads/2026/04/West-Central-Florida-4-2026.pdf',
  nwsPoint: `https://api.weather.gov/points/${BRIDGE.latitude},${BRIDGE.longitude}`,
  nwsAlerts: `https://api.weather.gov/alerts/active?point=${BRIDGE.latitude},${BRIDGE.longitude}`,
  nwsMarine: 'https://marine.weather.gov/MapClick.php?lat=27.61&lon=-82.65',
});

const TOLL_POLICY = Object.freeze({
  effectiveDate: '2026-04-12',
  collection: 'ALL_ELECTRONIC',
  sunpass: Object.freeze({ label: 'SunPass', base2: 1.16, perAdditionalAxle: 1.16 }),
  toll_by_plate: Object.freeze({ label: 'Toll-By-Plate', base2: 1.62, perAdditionalAxle: 1.62 }),
  plazas: Object.freeze({
    northbound: 'South Plaza · northbound',
    southbound: 'North Plaza · southbound',
  }),
});

const STATIC_CAMERAS = Object.freeze([
  Object.freeze({
    id: 'fl511-skyway-2553',
    name: 'Skyway Bridge View · I-275 07.8 NB',
    provider: 'FL511',
    embedUrl: URLS.fl511Camera2553,
    sourceUrl: URLS.fl511Camera2553,
    official: true,
    note: 'FL511 camera surface with Show Video / Hide Video controls.',
  }),
]);

const WIND_SENSITIVE = new Set(['motorcycle', 'rv', 'trailer', 'high_profile']);
const cache = new Map();
const USER_AGENT = 'SunshineSkywayDecision/1.0 (+https://chrisizworski.com/sunshine-skyway-bridge/)';

function cleanText(value) {
  return String(value ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6]|tr|section|article|table)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n+\s*/g, '\n')
    .trim();
}

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

async function fetchCached(key, url, {
  type = 'text', ttlMs = 45_000, staleMs = 10 * 60_000, timeoutMs = 7_500,
  fetchImpl = global.fetch, now = Date.now(),
} = {}) {
  const previous = cache.get(key);
  if (previous) {
    const ageMs = Math.max(0, now - Date.parse(previous.retrievedAt));
    if (ageMs <= ttlMs) return { ...previous, ok: true, ageMs, cacheHit: true, staleFallback: false };
  }
  try {
    const response = await fetchImpl(url, {
      headers: {
        'user-agent': USER_AGENT,
        accept: type === 'json' ? 'application/geo+json, application/json;q=0.9, */*;q=0.2' : 'text/html, text/plain;q=0.9, */*;q=0.2',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const value = type === 'json' ? await response.json() : await response.text();
    const row = { value, retrievedAt: new Date(now).toISOString(), url };
    cache.set(key, row);
    return { ...row, ok: true, ageMs: 0, cacheHit: false, staleFallback: false, status: response.status };
  } catch (error) {
    if (previous) {
      const ageMs = Math.max(0, now - Date.parse(previous.retrievedAt));
      if (ageMs <= staleMs) {
        return { ...previous, ok: true, ageMs, cacheHit: true, staleFallback: true, error: String(error?.message || error) };
      }
    }
    return { ok: false, value: null, url, retrievedAt: new Date(now).toISOString(), ageMs: null, staleFallback: false, error: String(error?.message || error) };
  }
}

function extractSkywaySnippets(value) {
  const text = cleanText(value);
  if (!text) return [];
  const normalized = text.replace(/\r/g, ' ');
  const matches = [];
  const re = /(.{0,180}\b(?:sunshine\s+skyway(?:\s+bridge)?|skyway\s+bridge)\b.{0,260})/gi;
  let match;
  while ((match = re.exec(normalized))) {
    const snippet = match[1].replace(/\s+/g, ' ').trim();
    if (snippet && !matches.includes(snippet)) matches.push(snippet);
    if (matches.length >= 12) break;
  }
  return matches;
}

function parseOperationalSignal(value) {
  const snippets = extractSkywaySnippets(value);
  const signals = [];
  for (const snippet of snippets) {
    const lower = snippet.toLowerCase();
    const closure = /\b(?:all lanes? closed|bridge (?:is |remains )?closed|closed to (?:all )?traffic|traffic (?:is )?(?:stopped|halted)|complete closure|road closed)\b/i.test(snippet);
    const reopen = /\b(?:bridge (?:has )?reopened|reopened to traffic|all lanes? (?:are )?open|closure cleared)\b/i.test(snippet);
    const impact = /\b(?:major incident|crash|collision|lanes? blocked|lane blocking|congestion|delays?|construction|disabled vehicle|road conditions?)\b/i.test(snippet);
    if (closure) signals.push({ level: 'CLOSED', text: snippet });
    else if (reopen) signals.push({ level: 'REOPENED', text: snippet });
    else if (impact) signals.push({ level: 'IMPACTED', text: snippet });
    else if (lower.includes('sunshine skyway') || lower.includes('skyway bridge')) signals.push({ level: 'MENTION', text: snippet });
  }
  return signals;
}

function resolveOperationalState({ alertsText = '', trafficText = '', sourceHealth = {} } = {}) {
  const liveSources = [];
  const staleSources = [];
  if (sourceHealth.alerts?.state === 'ok') liveSources.push({ source: 'FL511 alerts', text: alertsText });
  else if (sourceHealth.alerts?.state === 'degraded_cached') staleSources.push({ source: 'FL511 alerts', text: alertsText });
  if (sourceHealth.traffic?.state === 'ok') liveSources.push({ source: 'FL511 traffic events', text: trafficText });
  else if (sourceHealth.traffic?.state === 'degraded_cached') staleSources.push({ source: 'FL511 traffic events', text: trafficText });

  const signals = liveSources.flatMap(row => parseOperationalSignal(row.text).map(signal => ({ ...signal, source: row.source })));
  const staleSignals = staleSources.flatMap(row => parseOperationalSignal(row.text).map(signal => ({ ...signal, source: row.source })));
  const closed = signals.find(signal => signal.level === 'CLOSED');
  if (closed) {
    return {
      state: 'CLOSED', label: 'Official Skyway closure signal found',
      officialText: closed.text, source: closed.source, reason: 'EXPLICIT_OFFICIAL_CLOSURE_SIGNAL', signals, staleSignals,
    };
  }
  const impact = signals.find(signal => signal.level === 'IMPACTED');
  if (impact) {
    return {
      state: 'IMPACTED', label: 'Official Skyway traffic impact found',
      officialText: impact.text, source: impact.source, reason: 'EXPLICIT_OFFICIAL_IMPACT_SIGNAL', signals, staleSignals,
    };
  }
  const reopened = signals.find(signal => signal.level === 'REOPENED');
  if (reopened) {
    return {
      state: 'NO_CLOSURE_SIGNAL_FOUND', label: 'Official source reports the prior closure cleared',
      officialText: reopened.text, source: reopened.source, reason: 'EXPLICIT_OFFICIAL_REOPEN_SIGNAL', signals, staleSignals,
    };
  }
  if (liveSources.length >= 2) {
    return {
      state: 'NO_CLOSURE_SIGNAL_FOUND', label: 'No explicit Skyway closure signal found', officialText: null,
      source: 'FL511 alerts + traffic events', reason: 'NO_EXPLICIT_SKYWAY_CLOSURE_IN_LIVE_SOURCES', signals, staleSignals,
    };
  }
  return {
    state: 'UNKNOWN', label: 'Official Skyway status unavailable', officialText: null, source: null,
    reason: liveSources.length ? 'INSUFFICIENT_LIVE_OPERATIONAL_SOURCES' : 'OFFICIAL_OPERATIONAL_SOURCES_UNAVAILABLE', signals, staleSignals,
  };
}

function parseWindMph(value) {
  const numbers = String(value ?? '').match(/\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  return numbers.length ? Math.max(...numbers) : null;
}

function normalizeAlerts(payload) {
  const features = Array.isArray(payload?.features) ? payload.features : [];
  return features.slice(0, 20).map(feature => ({
    event: cleanText(feature?.properties?.event || ''),
    headline: cleanText(feature?.properties?.headline || ''),
    severity: cleanText(feature?.properties?.severity || ''),
    urgency: cleanText(feature?.properties?.urgency || ''),
    effective: toIso(feature?.properties?.effective),
    expires: toIso(feature?.properties?.expires),
    web: String(feature?.properties?.web || ''),
  }));
}

function buildWindContext({ periods = [], alerts = [] } = {}) {
  const next = periods.slice(0, 8).map(period => ({
    name: cleanText(period?.name || ''),
    startTime: toIso(period?.startTime),
    temperature: Number(period?.temperature),
    temperatureUnit: cleanText(period?.temperatureUnit || ''),
    windSpeed: cleanText(period?.windSpeed || ''),
    windDirection: cleanText(period?.windDirection || ''),
    shortForecast: cleanText(period?.shortForecast || ''),
    windMph: parseWindMph(period?.windSpeed),
  }));
  const maxWindMph = next.reduce((max, period) => Number.isFinite(period.windMph) ? Math.max(max, period.windMph) : max, 0) || null;
  const highWindAlert = alerts.find(alert => /\b(?:hurricane|tropical storm|high wind|extreme wind)\b/i.test(`${alert.event} ${alert.headline}`));
  let level = 'UNAVAILABLE';
  if (maxWindMph != null || alerts.length) {
    if (highWindAlert || (maxWindMph != null && maxWindMph >= 40)) level = 'HIGH_WIND_CLOSURE_RISK_CONTEXT';
    else if (maxWindMph != null && maxWindMph >= 30) level = 'ELEVATED_WIND_CONTEXT';
    else level = 'ROUTINE_CONTEXT';
  }
  return {
    level,
    maxWindMph,
    closureDecisionMphContext: 40,
    authorityNote: 'FDOT says that once bridge-area winds increase beyond 40 mph, FHP may deem closure necessary. FHP/law enforcement makes the operational decision; this weather context never closes the bridge in this engine.',
    highWindAlert: highWindAlert || null,
    periods: next,
    alerts,
  };
}

function calculateToll({ direction = 'northbound', axles = 2, payment = 'sunpass' } = {}) {
  const normalizedDirection = direction === 'southbound' ? 'southbound' : 'northbound';
  const normalizedPayment = payment === 'toll_by_plate' ? 'toll_by_plate' : payment === 'sunpass' ? 'sunpass' : null;
  const axleCount = Math.max(2, Math.min(15, Number.parseInt(axles, 10) || 2));
  if (!normalizedPayment) {
    return { state: 'UNKNOWN_PAYMENT', direction: normalizedDirection, axles: axleCount, amount: null, note: 'Current Sunshine Skyway collection is all-electronic: choose SunPass or Toll-By-Plate.' };
  }
  const policy = TOLL_POLICY[normalizedPayment];
  const amount = Number((policy.base2 + Math.max(0, axleCount - 2) * policy.perAdditionalAxle).toFixed(2));
  return {
    state: 'RATE_AVAILABLE', direction: normalizedDirection, axles: axleCount, payment: normalizedPayment,
    paymentLabel: policy.label, amount, plaza: TOLL_POLICY.plazas[normalizedDirection], effectiveDate: TOLL_POLICY.effectiveDate,
    collection: TOLL_POLICY.collection,
    note: `One ${normalizedDirection} crossing uses the ${TOLL_POLICY.plazas[normalizedDirection]}. Rates effective April 12, 2026; cash collection is not offered.`,
    source: URLS.tollRates,
  };
}

function evaluateVehicleContext({ vehicle = 'car', officialState = 'UNKNOWN', windContext = {} } = {}) {
  const type = ['car', 'motorcycle', 'rv', 'trailer', 'high_profile'].includes(vehicle) ? vehicle : 'car';
  if (officialState === 'CLOSED') {
    return { state: 'PROHIBITED', label: 'Do not cross', reason: 'An explicit official Sunshine Skyway closure signal applies to all traffic.' };
  }
  if (officialState === 'UNKNOWN') {
    return { state: 'UNKNOWN', label: 'Official status unavailable', reason: 'Vehicle guidance cannot outrank an unavailable official bridge status.' };
  }
  if (WIND_SENSITIVE.has(type) && windContext.level === 'HIGH_WIND_CLOSURE_RISK_CONTEXT') {
    return { state: 'CAUTION', label: 'High-wind context', reason: 'This vehicle is wind-sensitive and the weather context has reached the range where FDOT says FHP may deem a bridge closure necessary. No class-specific prohibition is being invented.' };
  }
  if (WIND_SENSITIVE.has(type) && windContext.level === 'ELEVATED_WIND_CONTEXT') {
    return { state: 'CAUTION', label: 'Elevated wind context', reason: 'This vehicle is wind-sensitive. Use extra caution and follow FL511/FHP directions; the page is not creating a legal restriction.' };
  }
  return { state: 'NO_SPECIAL_RESTRICTION_FOUND', label: 'No class-specific restriction applied', reason: 'No validated Sunshine Skyway vehicle-class restriction rule is being inferred. Follow the official bridge state, posted signs and law-enforcement directions.' };
}

function sourceState(result) {
  if (!result?.ok) return { state: 'unavailable', retrievedAt: result?.retrievedAt || null, url: result?.url || null, error: result?.error || null };
  return {
    state: result.staleFallback ? 'degraded_cached' : 'ok', retrievedAt: result.retrievedAt || null,
    ageMs: result.ageMs ?? null, url: result.url || null, error: result.error || null,
  };
}

async function buildSnapshot({ query = {}, fetchImpl = global.fetch, now = Date.now() } = {}) {
  const options = { fetchImpl, now };
  const [alertsPage, trafficPage, nwsPoint, nwsAlerts] = await Promise.all([
    fetchCached('fl511-alerts', URLS.fl511Alerts, { ...options, type: 'text', ttlMs: 30_000, staleMs: 5 * 60_000 }),
    fetchCached('fl511-traffic', URLS.fl511Traffic, { ...options, type: 'text', ttlMs: 30_000, staleMs: 5 * 60_000 }),
    fetchCached('nws-point', URLS.nwsPoint, { ...options, type: 'json', ttlMs: 30 * 60_000, staleMs: 6 * 60 * 60_000 }),
    fetchCached('nws-alerts', URLS.nwsAlerts, { ...options, type: 'json', ttlMs: 60_000, staleMs: 10 * 60_000 }),
  ]);

  let nwsHourly = { ok: false, value: null, url: null, retrievedAt: new Date(now).toISOString(), error: 'NWS_POINT_UNAVAILABLE' };
  const hourlyUrl = nwsPoint?.value?.properties?.forecastHourly;
  if (nwsPoint.ok && hourlyUrl) {
    nwsHourly = await fetchCached('nws-hourly', hourlyUrl, { ...options, type: 'json', ttlMs: 15 * 60_000, staleMs: 2 * 60 * 60_000 });
  }

  const sourceHealth = {
    alerts: sourceState(alertsPage),
    traffic: sourceState(trafficPage),
    nwsPoint: sourceState(nwsPoint),
    nwsHourly: sourceState(nwsHourly),
    nwsAlerts: sourceState(nwsAlerts),
  };
  const officialStatus = resolveOperationalState({
    alertsText: alertsPage.value || '', trafficText: trafficPage.value || '', sourceHealth,
  });
  const weatherAlerts = normalizeAlerts(nwsAlerts.value);
  const windContext = buildWindContext({ periods: nwsHourly?.value?.properties?.periods || [], alerts: weatherAlerts });
  const vehicleType = String(query.vehicle || 'car').toLowerCase();
  const vehicle = evaluateVehicleContext({ vehicle: vehicleType, officialState: officialStatus.state, windContext });
  const toll = calculateToll({ direction: query.direction, axles: query.axles, payment: query.payment });

  const currentMentions = [
    ...(sourceHealth.alerts.state === 'ok' ? parseOperationalSignal(alertsPage.value) : []),
    ...(sourceHealth.traffic.state === 'ok' ? parseOperationalSignal(trafficPage.value) : []),
  ];

  return {
    generatedAt: new Date(now).toISOString(),
    bridge: BRIDGE,
    officialStatus,
    vehicle: { ...vehicle, type: vehicleType },
    traffic: {
      state: officialStatus.state === 'CLOSED' ? 'CLOSED' : officialStatus.state === 'IMPACTED' ? 'ACTIVE_IMPACT' : currentMentions.length ? 'SKYWAY_MENTION' : 'NO_SPECIFIC_LIVE_EVENT_FOUND',
      officialMentions: currentMentions.slice(0, 8),
      source: 'FL511',
      note: 'FL511 is the official traveler-information source. This engine does not manufacture speeds or delay minutes when the source does not provide a validated bridge-specific value.',
    },
    toll,
    windContext,
    cameras: STATIC_CAMERAS,
    sourceHealth,
    policy: {
      windClosureContext: {
        thresholdMph: 40,
        automaticClosure: false,
        text: 'Once wind speeds increase beyond 40 mph, FHP may deem closure necessary; law enforcement then stops bridge traffic.',
        source: URLS.fdotWindGuidance,
      },
      toll: { effectiveDate: TOLL_POLICY.effectiveDate, collection: TOLL_POLICY.collection, source: URLS.tollRates },
    },
    sources: URLS,
  };
}

module.exports = {
  BRIDGE,
  URLS,
  TOLL_POLICY,
  STATIC_CAMERAS,
  cleanText,
  extractSkywaySnippets,
  parseOperationalSignal,
  resolveOperationalState,
  parseWindMph,
  buildWindContext,
  calculateToll,
  evaluateVehicleContext,
  sourceState,
  buildSnapshot,
  _cache: cache,
};

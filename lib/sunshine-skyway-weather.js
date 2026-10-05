const live = require('./sunshine-skyway-live');

const NWS_TABULAR_URL = 'https://forecast.weather.gov/MapClick.php?FcstType=digital&lat=27.61&lon=-82.65&unit=0';
const NWS_MARINE_ZONE_URL = 'https://forecast.weather.gov/MapClick.php?TextType=2&zoneid=GMZ830';
const USER_AGENT = 'SunshineSkywayDecision/1.0 (+https://chrisizworski.com/sunshine-skyway-bridge/)';
const weatherCache = new Map();

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

async function fetchCached(key, url, { fetchImpl = global.fetch, now = Date.now(), ttlMs = 10 * 60_000, staleMs = 2 * 60 * 60_000, timeoutMs = 8_000 } = {}) {
  const previous = weatherCache.get(key);
  if (previous) {
    const ageMs = Math.max(0, now - Date.parse(previous.retrievedAt));
    if (ageMs <= ttlMs) return { ...previous, ok: true, ageMs, cacheHit: true, staleFallback: false };
  }
  try {
    const response = await fetchImpl(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html, text/plain;q=0.9, */*;q=0.2' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const value = await response.text();
    const row = { value, retrievedAt: new Date(now).toISOString(), url };
    weatherCache.set(key, row);
    return { ...row, ok: true, ageMs: 0, cacheHit: false, staleFallback: false, status: response.status };
  } catch (error) {
    if (previous) {
      const ageMs = Math.max(0, now - Date.parse(previous.retrievedAt));
      if (ageMs <= staleMs) return { ...previous, ok: true, ageMs, cacheHit: true, staleFallback: true, error: String(error?.message || error) };
    }
    return { ok: false, value: null, url, retrievedAt: new Date(now).toISOString(), ageMs: null, staleFallback: false, error: String(error?.message || error) };
  }
}

function cellsFromRow(html, rowMatcher) {
  const rows = String(html || '').match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
  for (const row of rows) {
    const rowText = live.cleanText(row);
    if (!rowMatcher.test(rowText)) continue;
    return [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map(match => live.cleanText(match[1]));
  }
  return [];
}

function numeric(value) {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseNwsTabularForecast(html) {
  const hours = cellsFromRow(html, /^Hour\s*\(/i);
  const temps = cellsFromRow(html, /^Temperature\s*\(/i);
  const winds = cellsFromRow(html, /^Surface Wind\s*\(/i);
  const dirs = cellsFromRow(html, /^Wind Dir\b/i);
  const gusts = cellsFromRow(html, /^Gust\b/i);
  if (hours.length < 2 || winds.length < 2) return [];

  const tz = hours[0].match(/\(([^)]+)\)/)?.[1] || '';
  const windUnit = winds[0].match(/\(([^)]+)\)/)?.[1] || 'mph';
  const tempUnit = temps[0]?.match(/\(([^)]+)\)/)?.[1]?.replace('°', '') || 'F';
  const count = Math.min(8, hours.length - 1, winds.length - 1);
  const periods = [];

  for (let index = 0; index < count; index += 1) {
    const speed = numeric(winds[index + 1]);
    if (!Number.isFinite(speed)) continue;
    const gust = numeric(gusts[index + 1]);
    const displayGust = Number.isFinite(gust) && gust > speed ? `, gusts ${gust} ${windUnit}` : '';
    const temperature = numeric(temps[index + 1]);
    periods.push({
      name: `${hours[index + 1]}:00${tz ? ` ${tz}` : ''}`,
      startTime: null,
      temperature: Number.isFinite(temperature) ? temperature : undefined,
      temperatureUnit: tempUnit,
      windSpeed: `${speed} ${windUnit}${displayGust}`,
      windDirection: dirs[index + 1] || '',
      shortForecast: 'NWS hourly tabular forecast',
    });
  }
  return periods;
}

const PERIOD_LABEL = '(?:Rest Of Tonight|Overnight|This Afternoon|Today|Tonight|Monday(?: Night)?|Tuesday(?: Night)?|Wednesday(?: Night)?|Thursday(?: Night)?|Friday(?: Night)?|Saturday(?: Night)?|Sunday(?: Night)?)';

function knotsToMph(knots) {
  return Math.round(Number(knots) * 1.15078);
}

function parseNwsMarineZoneForecast(html) {
  const text = live.cleanText(String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/tr>|<\/p>|<\/div>|<\/li>/gi, '\n'));
  const re = new RegExp(`\\b(${PERIOD_LABEL})\\s*:?\\s*([\\s\\S]*?)(?=\\b${PERIOD_LABEL}\\s*:?|winds and waves higher|Zone Forecast:|Visit your local NWS office|$)`, 'gi');
  const periods = [];
  let match;
  while ((match = re.exec(text))) {
    const name = live.cleanText(match[1]);
    const body = live.cleanText(match[2]).replace(/\s+/g, ' ').trim();
    if (!/\bwinds?\b/i.test(body) || !/\bknots?\b/i.test(body)) continue;
    const windSentence = body.match(/(?:north|northeast|east|southeast|south|southwest|west|northwest|variable)[^.]*?knots?(?:[^.]*gusts?[^.]*knots?)?/i)?.[0] || body.split('.')[0];
    const numbers = [...windSentence.matchAll(/(\d+(?:\.\d+)?)\s*knots?/gi)].map(item => Number(item[1])).filter(Number.isFinite);
    const range = windSentence.match(/(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+knots?/i);
    const around = windSentence.match(/(?:around\s+)?(\d+(?:\.\d+)?)\s+knots?/i);
    const gust = windSentence.match(/gusts?\s+(?:up\s+to\s+)?(\d+(?:\.\d+)?)\s+knots?/i);
    const lowKt = range ? Number(range[1]) : around ? Number(around[1]) : numbers[0];
    const highKt = range ? Number(range[2]) : Number.isFinite(lowKt) ? lowKt : numbers[0];
    if (!Number.isFinite(highKt)) continue;
    const gustKt = gust ? Number(gust[1]) : null;
    const maxKt = Number.isFinite(gustKt) ? Math.max(highKt, gustKt) : highKt;
    const direction = windSentence.match(/\b(north|northeast|east|southeast|south|southwest|west|northwest|variable)\b/i)?.[1] || '';
    const lowMph = knotsToMph(lowKt);
    const highMph = knotsToMph(highKt);
    const gustMph = Number.isFinite(gustKt) ? knotsToMph(gustKt) : null;
    const windSpeed = lowMph === highMph ? `${highMph} mph${gustMph && gustMph > highMph ? `, gusts ${gustMph} mph` : ''}` : `${lowMph}-${highMph} mph${gustMph && gustMph > highMph ? `, gusts ${gustMph} mph` : ''}`;
    periods.push({
      name,
      startTime: null,
      temperature: undefined,
      temperatureUnit: 'F',
      windSpeed,
      windDirection: direction,
      shortForecast: body,
      nwsMarineMaxKnots: maxKt,
    });
    if (periods.length >= 4) break;
  }
  return periods;
}

function withWeatherSource(context, { label, mode, url, fallbackUsed }) {
  return { ...context, sourceLabel: label, sourceMode: mode, sourceUrl: url, fallbackUsed: Boolean(fallbackUsed) };
}

async function buildSnapshot({ query = {}, fetchImpl = global.fetch, now = Date.now() } = {}) {
  const snapshot = await live.buildSnapshot({ query, fetchImpl, now });
  const existing = snapshot.windContext || {};
  if (existing.periods?.length && existing.maxWindMph != null) {
    return {
      ...snapshot,
      windContext: withWeatherSource(existing, {
        label: 'National Weather Service hourly point forecast',
        mode: 'nws-api-hourly',
        url: snapshot.sourceHealth?.nwsHourly?.url || live.URLS.nwsMarine,
        fallbackUsed: false,
      }),
      runtime: { ...(snapshot.runtime || {}), weatherAdapter: 'NWS_API_HOURLY' },
    };
  }

  const [tabularResult, marineResult] = await Promise.all([
    fetchCached('nws-skyway-tabular', NWS_TABULAR_URL, { fetchImpl, now, ttlMs: 10 * 60_000, staleMs: 90 * 60_000 }),
    fetchCached('nws-skyway-marine-zone', NWS_MARINE_ZONE_URL, { fetchImpl, now, ttlMs: 15 * 60_000, staleMs: 2 * 60 * 60_000 }),
  ]);

  let periods = tabularResult.ok ? parseNwsTabularForecast(tabularResult.value) : [];
  let result = tabularResult;
  let source = {
    label: 'National Weather Service Sunshine Skyway hourly tabular forecast',
    mode: 'nws-tabular-fallback',
    url: NWS_TABULAR_URL,
  };

  if (!periods.length && marineResult.ok) {
    periods = parseNwsMarineZoneForecast(marineResult.value);
    result = marineResult;
    source = {
      label: 'National Weather Service Tampa Bay marine forecast (GMZ830)',
      mode: 'nws-marine-zone-fallback',
      url: NWS_MARINE_ZONE_URL,
    };
  }

  const sourceHealth = {
    ...snapshot.sourceHealth,
    nwsTabular: sourceState(tabularResult),
    nwsMarineZone: sourceState(marineResult),
  };

  if (!periods.length) {
    return {
      ...snapshot,
      sourceHealth,
      windContext: withWeatherSource(existing, {
        label: 'National Weather Service forecast unavailable',
        mode: 'nws-unavailable',
        url: live.URLS.nwsMarine,
        fallbackUsed: true,
      }),
      runtime: { ...(snapshot.runtime || {}), weatherAdapter: 'NWS_UNAVAILABLE' },
    };
  }

  const windContext = withWeatherSource(live.buildWindContext({ periods, alerts: existing.alerts || [] }), {
    ...source,
    fallbackUsed: true,
  });
  const vehicleType = snapshot.vehicle?.type || String(query.vehicle || 'car').toLowerCase();
  const vehicle = live.evaluateVehicleContext({ vehicle: vehicleType, officialState: snapshot.officialStatus?.state || 'UNKNOWN', windContext });

  return {
    ...snapshot,
    windContext,
    vehicle: { ...vehicle, type: vehicleType },
    sourceHealth,
    runtime: { ...(snapshot.runtime || {}), weatherAdapter: source.mode.toUpperCase().replace(/-/g, '_'), weatherFallbackSourceState: sourceState(result).state },
  };
}

module.exports = {
  ...live,
  NWS_TABULAR_URL,
  NWS_MARINE_ZONE_URL,
  parseNwsTabularForecast,
  parseNwsMarineZoneForecast,
  knotsToMph,
  buildSnapshot,
  _weatherCache: weatherCache,
};

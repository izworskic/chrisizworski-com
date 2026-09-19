import { WEATHER_POINT } from './config.js';
import { safeText, injectionSignals, assertHttps } from './security.js';
import { parseUtc } from './time.js';

const UA = 'OldSowLive/1.0 (https://chrisizworski.com/old-sow-live/; contact: izworski@gmail.com)';

async function getJson(url, timeoutMs = 6000) {
  assertHttps(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'error', headers: { 'user-agent': UA, accept: 'application/geo+json, application/json' } });
    if (!res.ok) throw new Error(`NWS HTTP ${res.status}`);
    const text = await res.text();
    if (text.length > 1_500_000) throw new Error('NWS response too large');
    return JSON.parse(text);
  } finally { clearTimeout(timer); }
}

export function deterministicVisibility(text) {
  const raw = safeText(text, 1800);
  const s = raw.toLowerCase();
  if (!raw) return { classification: 'not_stated', reason: 'No forecast text available', signals: [] };
  const injection = injectionSignals(raw);
  if (/dense fog|visibility.*(?:quarter|1\/4)|heavy (?:rain|snow)/i.test(raw)) return { classification: 'impaired', reason: 'Forecast explicitly describes dense fog or heavy precipitation.', signals: injection };
  if (/fog|mist|drizzle|rain|snow|showers|thunderstorm/i.test(raw)) return { classification: 'possibly_impaired', reason: 'Forecast mentions a visibility-reducing weather type.', signals: injection };
  return { classification: 'not_stated', reason: 'No fog/precipitation visibility statement was found; absence is not treated as clear.', signals: injection };
}

function normalizePeriod(p) {
  return {
    number: p.number ?? null,
    startTime: parseUtc(p.startTime)?.toISOString() ?? p.startTime ?? null,
    endTime: parseUtc(p.endTime)?.toISOString() ?? p.endTime ?? null,
    temperature: Number.isFinite(Number(p.temperature)) ? Number(p.temperature) : null,
    temperatureUnit: p.temperatureUnit ?? null,
    windSpeed: safeText(p.windSpeed, 80),
    windDirection: safeText(p.windDirection, 20),
    shortForecast: safeText(p.shortForecast, 240),
    detailedForecast: safeText(p.detailedForecast, 1200),
    probabilityOfPrecipitation: Number.isFinite(Number(p.probabilityOfPrecipitation?.value)) ? Number(p.probabilityOfPrecipitation.value) : null
  };
}

export async function fetchWeather(now = new Date()) {
  const fetchedAt = new Date().toISOString();
  const pointsUrl = `https://api.weather.gov/points/${WEATHER_POINT.lat.toFixed(4)},${WEATHER_POINT.lon.toFixed(4)}`;
  const point = await getJson(pointsUrl);
  const hourlyUrl = point?.properties?.forecastHourly;
  const forecastUrl = point?.properties?.forecast;
  if (!hourlyUrl || !forecastUrl) throw new Error('NWS point response did not include forecast URLs');
  const [hourly, forecast] = await Promise.all([getJson(hourlyUrl), getJson(forecastUrl)]);
  const hours = (hourly?.properties?.periods || []).slice(0, 168).map(normalizePeriod);
  const periods = (forecast?.properties?.periods || []).slice(0, 14).map(normalizePeriod);
  return {
    fetchedAt,
    office: point?.properties?.gridId ?? null,
    gridX: point?.properties?.gridX ?? null,
    gridY: point?.properties?.gridY ?? null,
    sourceLocation: { lat: WEATHER_POINT.lat, lon: WEATHER_POINT.lon, label: WEATHER_POINT.label },
    hours,
    periods,
    sources: [
      { provider: 'National Weather Service', product: 'points', url: pointsUrl, fetchedAt },
      { provider: 'National Weather Service', product: 'hourly_forecast', url: hourlyUrl, fetchedAt, issuedTime: hourly?.properties?.generatedAt ?? hourly?.properties?.updateTime ?? null },
      { provider: 'National Weather Service', product: 'forecast', url: forecastUrl, fetchedAt, issuedTime: forecast?.properties?.generatedAt ?? forecast?.properties?.updateTime ?? null }
    ]
  };
}

export function weatherForTime(weather, timeInput) {
  if (!weather?.hours?.length) return null;
  const t = new Date(timeInput).getTime();
  const row = weather.hours.find((p) => {
    const a = new Date(p.startTime).getTime();
    const b = new Date(p.endTime).getTime();
    return Number.isFinite(a) && Number.isFinite(b) && t >= a && t < b;
  });
  if (!row) return null;
  const excerpt = [row.shortForecast, row.detailedForecast].filter(Boolean).join('. ');
  return { ...row, visibility: deterministicVisibility(excerpt), excerpt };
}

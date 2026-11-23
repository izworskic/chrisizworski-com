import Engine from '../../public/assets/holiday-travel-engine.js';
import { AIRPORTS } from './busiest-airports.mjs';

// Forecasts are qualitative signals. Nothing here changes the BTS flight odds.
const DAY = 86400000;
const KEYWORDS = /\b(?:snow\w*|ice|freezing rain|thunderstorms?)\b/i;
const NWS_HEADERS = { Accept: 'application/geo+json', 'User-Agent': 'chrisizworski.com/holiday-travel (holiday airport weather)' };
const stamp = (d) => new Date(d).toISOString().slice(0, 10);
const shift = (date, days) => stamp(Date.parse(date + 'T12:00:00Z') + days * DAY);

export function thanksgivingDate(year) {
  const first = new Date(Date.UTC(year, 10, 1));
  return stamp(Date.UTC(year, 10, 1 + (4 - first.getUTCDay() + 7) % 7 + 21));
}

export function windowsForYear(year) {
  const th = thanksgivingDate(year);
  return [
    { holiday: 'thanksgiving', year, start: shift(th, -6), end: shift(th, 5) },
    { holiday: 'christmas', year, start: year + '-12-18', end: (year + 1) + '-01-02' }
  ];
}

export function windowState(now = new Date()) {
  const today = stamp(now);
  const year = Number(today.slice(0, 4));
  const windows = [year - 1, year, year + 1, year + 2].flatMap(windowsForYear);
  const active = windows.find((w) => w.start <= today && today <= w.end) || null;
  const next = windows.filter((w) => w.start > today).sort((a, b) => a.start.localeCompare(b.start))[0] || null;
  return { today, active, next };
}

export function datesIn(window) {
  const dates = [];
  for (let d = window.start; d <= window.end; d = shift(d, 1)) dates.push(d);
  return dates;
}

function offsetAt(date, zone) {
  if (!zone) return '+00:00';
  try {
    const part = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, timeZoneName: 'shortOffset', hour: 'numeric'
    }).formatToParts(new Date(date + 'T12:00:00Z')).find((p) => p.type === 'timeZoneName');
    const m = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(part?.value || '');
    return m ? m[1] + m[2].padStart(2, '0') + ':' + (m[3] || '00') : '+00:00';
  } catch { return '+00:00'; }
}

export function summarizeDays(alerts, forecast, dates, timeZone) {
  return dates.map((date) => {
    const start = date + 'T00:00:00' + offsetAt(date, timeZone);
    const endDate = shift(date, 1);
    const end = endDate + 'T00:00:00' + offsetAt(endDate, timeZone);
    // Reuse the existing hazard parser and its SEVERE rules. Its fourth argument
    // includes other explicitly named NWS warnings without changing old callers.
    const warnings = alerts
      ? Engine.hazards(alerts, start, end, true).filter((h) => /Warning$/i.test(h.event)).map((h) => h.event)
      : [];
    // Reuse forecastFor and WX_WORDS. The second filter limits this board to
    // the four requested forecast topics, excluding fog or high wind alone.
    const periods = forecast ? Engine.forecastFor(forecast, date) : [];
    const mentioned = periods.filter((p) => p.flag && KEYWORDS.test(p.text + ' ' + p.detail)).map((p) => p.text);
    const flagged = warnings.length > 0 || mentioned.length > 0;
    return {
      date,
      status: flagged ? 'flagged' : (alerts && periods.length ? 'clear' : 'unknown'),
      warnings: [...new Set(warnings)],
      forecast: [...new Set(periods.map((p) => p.text))],
      mentions: [...new Set(mentioned)]
    };
  });
}

async function json(url, fetcher) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetcher(url, { headers: NWS_HEADERS, signal: controller.signal });
    if (!response.ok) throw new Error('NWS_HTTP_' + response.status);
    return await response.json();
  } finally { clearTimeout(timeout); }
}

export async function airportWeather(airport, dates, fetcher = fetch) {
  const point = airport.lat + ',' + airport.lon;
  const alertUrl = 'https://api.weather.gov/alerts/active?point=' + point;
  const pointUrl = 'https://api.weather.gov/points/' + point;
  const [ar, pr] = await Promise.allSettled([json(alertUrl, fetcher), json(pointUrl, fetcher)]);
  const errors = [];
  const alerts = ar.status === 'fulfilled' ? ar.value : null;
  if (!alerts) errors.push('NWS_ALERTS_UNAVAILABLE');
  let forecast = null;
  let zone = null;
  if (pr.status === 'fulfilled') {
    zone = pr.value?.properties?.timeZone || null;
    const url = pr.value?.properties?.forecast;
    if (typeof url === 'string' && url.startsWith('https://api.weather.gov/')) {
      try { forecast = await json(url, fetcher); } catch { /* per-airport failure */ }
    }
  }
  if (!forecast) errors.push('NWS_FORECAST_UNAVAILABLE');
  const p = forecast?.properties || {};
  const issued = p.updated || p.updateTime || p.generatedAt || null;
  return {
    code: airport.code, city: airport.city, flights: airport.flights,
    issuedAt: issued && !Number.isNaN(Date.parse(issued)) ? new Date(issued).toISOString() : null,
    days: summarizeDays(alerts, forecast, dates, zone),
    errors
  };
}

export async function collectBoard(now = new Date(), fetcher = fetch) {
  const { today, active, next } = windowState(now);
  const generatedAt = new Date(now).toISOString();
  // Outside both windows, this is a static response and makes zero NWS requests.
  if (!active) return { active: false, today, generatedAt, nextOpening: next, source: 'National Weather Service', airports: [] };
  const dates = datesIn(active);
  const airports = new Array(AIRPORTS.length);
  let index = 0;
  async function worker() {
    while (index < AIRPORTS.length) {
      const i = index++;
      try { airports[i] = await airportWeather(AIRPORTS[i], dates, fetcher); }
      catch {
        airports[i] = { code: AIRPORTS[i].code, city: AIRPORTS[i].city, flights: AIRPORTS[i].flights,
          issuedAt: null, days: dates.map((date) => ({ date, status: 'unknown', warnings: [], forecast: [], mentions: [] })),
          errors: ['NWS_AIRPORT_UNAVAILABLE'] };
      }
    }
  }
  await Promise.all(Array.from({ length: 12 }, worker));
  return {
    active: true, today, generatedAt, source: 'National Weather Service',
    holiday: active.holiday, year: active.year, start: active.start, end: active.end, dates,
    scope: 'Active NWS warnings or NWS forecast text naming snow, ice, freezing rain or thunderstorms',
    airports,
    health: {
      airports: airports.length,
      withFlags: airports.filter((a) => a.days.some((d) => d.status === 'flagged')).length,
      withErrors: airports.filter((a) => a.errors.length > 0).length
    }
  };
}

'use strict';
// Michigan Rockhounding conditions: three keyless upstream reads per refresh
// (Open-Meteo hourly wind for every beach in one request, NDBC latest observations,
// NWS active alerts for Michigan land and lake zones), cached at the edge.
const doc = require('../data/rockhounding/michigan-hunt-sites.json');
const {assessAll, parseLatestObs, RANK} = require('../lib/rockhounding/hunt-conditions.cjs');

const UA = 'ChrisIzworskiRockhounding/1.0 (+https://chrisizworski.com/michigan-rockhounding/)';
const NDBC = 'https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt';
const NWS = 'https://api.weather.gov/alerts/active?area=MI,LS,LM,LH';

function weatherUrl() {
  const pts = doc.sites.map(s => s.shore ? [s.shore.lat, s.shore.lon] : s.pin);
  const q = new URLSearchParams({
    latitude: pts.map(p => p[0].toFixed(4)).join(','),
    longitude: pts.map(p => p[1].toFixed(4)).join(','),
    hourly: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,temperature_2m',
    daily: 'sunrise,sunset',
    past_days: '3', forecast_days: '3',
    wind_speed_unit: 'mph', temperature_unit: 'fahrenheit', precipitation_unit: 'inch',
    timeformat: 'unixtime', timezone: 'GMT'
  });
  return 'https://api.open-meteo.com/v1/forecast?' + q.toString();
}

async function getJSON(fetchFn, url, accept, ms) {
  const res = await fetchFn(url, {headers: {'User-Agent': UA, Accept: accept}, signal: AbortSignal.timeout(ms)});
  if (!res?.ok) throw new Error('upstream ' + (res?.status || 'error'));
  return res.json();
}
async function getText(fetchFn, url, ms) {
  const res = await fetchFn(url, {headers: {'User-Agent': UA}, signal: AbortSignal.timeout(ms)});
  if (!res?.ok) throw new Error('upstream ' + (res?.status || 'error'));
  const body = await res.text();
  if (body.length > 3_000_000) throw new Error('oversized');
  return body;
}

async function report({fetchFn = fetch, now = Date.now()} = {}) {
  const nowS = Math.floor(now / 1000);
  const [w, b, a] = await Promise.allSettled([
    getJSON(fetchFn, weatherUrl(), 'application/json', 9000),
    getText(fetchFn, NDBC, 8000),
    getJSON(fetchFn, NWS, 'application/geo+json', 8000)
  ]);
  const weather = w.status === 'fulfilled' ? (Array.isArray(w.value) ? w.value : [w.value]) : null;
  const buoys = b.status === 'fulfilled' ? parseLatestObs(b.value) : {};
  const alerts = a.status === 'fulfilled' ? a.value : null;
  const sites = assessAll(doc, {weather, alerts, buoys, nowS});
  const ranked = sites.map(s => s.id).sort((x, y) => {
    const sx = sites.find(s => s.id === x), sy = sites.find(s => s.id === y);
    return (RANK[sx.verdict.code] - RANK[sy.verdict.code]) || ((sy.storm?.load72 || 0) - (sx.storm?.load72 || 0));
  });
  return {
    generatedAt: new Date(now).toISOString(),
    sources: {
      wind: {status: weather ? 'live' : 'unavailable', label: 'Open-Meteo hourly wind (past 3 days and next 3)', url: 'https://open-meteo.com/'},
      buoys: {status: b.status === 'fulfilled' ? 'live' : 'unavailable', label: 'NOAA NDBC latest observations', url: 'https://www.ndbc.noaa.gov/'},
      alerts: {status: alerts ? 'live' : 'unavailable', label: 'NWS active alerts for Michigan land and lake zones', url: 'https://www.weather.gov/'}
    },
    ranked,
    sites
  };
}

async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({error: 'GET or HEAD only'});
  }
  try {
    const body = await report();
    const live = body.sources.wind.status === 'live';
    res.setHeader('Cache-Control', live ? 'public, s-maxage=1800, stale-while-revalidate=3600' : 'public, s-maxage=120');
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).json(body);
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({error: 'Conditions temporarily unavailable'});
  }
}
module.exports = handler;
module.exports._test = {report, weatherUrl};

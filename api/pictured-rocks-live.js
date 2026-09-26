'use strict';

const NWS_HEADERS = {
  Accept: 'application/geo+json,application/json',
  'User-Agent': 'chrisizworski.com Pictured Rocks planner (https://chrisizworski.com/)'
};

async function fetchJson(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: NWS_HEADERS, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function compactPeriod(period) {
  if (!period) return null;
  return {
    name: period.name || null,
    startTime: period.startTime || null,
    endTime: period.endTime || null,
    temperature: Number.isFinite(period.temperature) ? period.temperature : null,
    temperatureUnit: period.temperatureUnit || 'F',
    windSpeed: period.windSpeed || null,
    windDirection: period.windDirection || null,
    shortForecast: period.shortForecast || null,
    precipProbability: period.probabilityOfPrecipitation && Number.isFinite(period.probabilityOfPrecipitation.value)
      ? period.probabilityOfPrecipitation.value
      : null
  };
}

async function pointForecast(name, lat, lon) {
  const point = await fetchJson(`https://api.weather.gov/points/${lat},${lon}`);
  const p = point && point.properties ? point.properties : {};
  const forecastUrl = p.forecastHourly || p.forecast;
  if (!forecastUrl) throw new Error('NWS point missing forecast URL');
  const forecast = await fetchJson(forecastUrl);
  const fp = forecast && forecast.properties ? forecast.properties : {};
  const periods = Array.isArray(fp.periods) ? fp.periods.slice(0, 12).map(compactPeriod).filter(Boolean) : [];
  return {
    name,
    lat,
    lon,
    updatedAt: fp.updateTime || fp.generatedAt || null,
    periods,
    source: forecastUrl
  };
}

function parseWindMph(windSpeed) {
  if (!windSpeed) return null;
  const nums = String(windSpeed).match(/\d+/g);
  if (!nums || !nums.length) return null;
  return Math.max(...nums.map(Number).filter(Number.isFinite));
}

function accessNotices(now) {
  const notices = [
    {
      id: 'munising-falls',
      level: 'closure',
      title: 'Munising Falls trail remains closed',
      detail: 'The visitor center remains accessible, but waterfall access is closed during the trail reconstruction project. NPS expects the project to run through 2027, weather permitting.',
      sourceDate: '2026-09-03',
      source: 'https://www.nps.gov/piro/learn/news/2026-09-03-munising-falls-contract-awarded.htm'
    }
  ];

  const start = new Date('2026-10-01T00:00:00-04:00');
  const end = new Date('2026-10-15T00:00:00-04:00');
  if (now < start) {
    notices.push({
      id: 'sand-point-upcoming',
      level: 'upcoming',
      title: 'Sand Point Road closes October 1–14',
      detail: 'NPS plans to close Sand Point Road to vehicle and pedestrian traffic east of the park boundary for culvert work. Sand Point Beach, the marsh trail, and headquarters will be inaccessible from the road during the closure.',
      sourceDate: '2026-09-22',
      source: 'https://www.nps.gov/piro/learn/news/2026-09-22-sand-point-closure.htm'
    });
  } else if (now >= start && now < end) {
    notices.push({
      id: 'sand-point-active',
      level: 'closure',
      title: 'Sand Point Road closure is active',
      detail: 'Sand Point Road is closed to vehicle and pedestrian traffic east of the park boundary through October 14 for culvert work. Sand Point Beach, the marsh trail, and headquarters are inaccessible from the road.',
      sourceDate: '2026-09-22',
      source: 'https://www.nps.gov/piro/learn/news/2026-09-22-sand-point-closure.htm'
    });
  }
  return notices;
}

function seasonalContext(now) {
  const month = now.getMonth() + 1;
  if (month >= 6 && month <= 8) return { id: 'summer', label: 'Peak visitor season', note: 'Parking and scheduled tours are the friction points. Start early and reserve paid water experiences ahead.' };
  if (month === 9) return { id: 'september', label: 'September shoulder season', note: 'Lower crowds and fewer biting insects make this one of the easiest months to build a flexible day.' };
  if (month === 10) return { id: 'fall', label: 'Fall transition', note: 'Color can be excellent, but daylight shortens and commercial water schedules begin winding down. Verify operators before building the day around a departure.' };
  if (month >= 11 || month <= 3) return { id: 'winter', label: 'Winter operating mode', note: 'The park remains open, but many roads are seasonal and the boat/kayak trip model no longer applies. Verify road and trail access before leaving town.' };
  return { id: 'spring', label: 'Spring transition', note: 'Roads and services reopen unevenly. Verify seasonal access and do not assume every summer stop is reachable yet.' };
}

function fieldRead(west, east, alerts) {
  const current = [west && west.periods && west.periods[0], east && east.periods && east.periods[0]].filter(Boolean);
  const wind = current.map(p => parseWindMph(p.windSpeed)).filter(Number.isFinite);
  const precip = current.map(p => p.precipProbability).filter(Number.isFinite);
  const maxWind = wind.length ? Math.max(...wind) : null;
  const maxPrecip = precip.length ? Math.max(...precip) : null;

  if (alerts && alerts.length) return {
    tone: 'watch',
    label: 'Weather alert in the area',
    detail: 'Read the active NWS alert before committing to exposed shoreline, water, or a long loop. The planner keeps water decisions behind a separate marine check.'
  };
  if (maxWind !== null && maxWind >= 20) return {
    tone: 'watch',
    label: 'Wind is the variable to watch',
    detail: 'A land-first plan is more resilient today. Shoreline wind alone is not enough to approve a cruise or kayak trip; check the marine forecast and operator status.'
  };
  if (maxPrecip !== null && maxPrecip >= 55) return {
    tone: 'mixed',
    label: 'Keep the day flexible',
    detail: 'Build around short land stops and preserve an easy exit. If the lake plan matters, check the marine forecast and operator status before leaving town.'
  };
  return {
    tone: 'good',
    label: 'A workable park day',
    detail: 'The land side looks straightforward from the current NWS read. Water activities still require a marine forecast and operator decision; shoreline weather does not certify Lake Superior conditions.'
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const now = new Date();
  let west = null, east = null, shoreline = null, alerts = [];
  const errors = [];

  const tasks = await Promise.allSettled([
    pointForecast('Munising / west end', 46.4237065, -86.6238331),
    pointForecast('Grand Marais / east end', 46.6576521, -86.0209877),
    pointForecast('Cliff shoreline weather point', 46.5196582, -86.5633392),
    fetchJson('https://api.weather.gov/alerts/active?point=46.5197,-86.5633')
  ]);

  if (tasks[0].status === 'fulfilled') west = tasks[0].value; else errors.push('west-weather');
  if (tasks[1].status === 'fulfilled') east = tasks[1].value; else errors.push('east-weather');
  if (tasks[2].status === 'fulfilled') shoreline = tasks[2].value; else errors.push('shoreline-weather');
  if (tasks[3].status === 'fulfilled') {
    const features = tasks[3].value && Array.isArray(tasks[3].value.features) ? tasks[3].value.features : [];
    alerts = features.slice(0, 5).map(f => ({
      event: f.properties && f.properties.event || 'Weather alert',
      headline: f.properties && f.properties.headline || null,
      severity: f.properties && f.properties.severity || null,
      urgency: f.properties && f.properties.urgency || null,
      ends: f.properties && (f.properties.ends || f.properties.expires) || null,
      source: f.id || 'https://www.weather.gov/'
    }));
  } else errors.push('alerts');

  const read = fieldRead(west, east, alerts);
  return res.status(200).json({
    ok: Boolean(west || east || shoreline),
    generatedAt: now.toISOString(),
    degraded: errors.length > 0,
    errors,
    season: seasonalContext(now),
    fieldRead: read,
    weather: { west, east, shoreline },
    alerts,
    accessNotices: accessNotices(now),
    sources: {
      nws: 'https://www.weather.gov/',
      npsConditions: 'https://www.nps.gov/piro/planyourvisit/conditions.htm',
      npsMaps: 'https://www.nps.gov/piro/planyourvisit/maps.htm'
    }
  });
};

'use strict';

const { REGIONS, normalizeUsLaunch, groupedSchedule, regionalAccess,
  isTrustedCode, parseStarbaseAccess } = require('../lib/rocket-launch-usa');
const { weatherGrade } = require('../lib/space-coast-decision');
const { skyCoverAt, surfaceSkyAssessment } = require('../lib/space-coast-visibility');
const { launchWeatherFor } = require('../lib/launch-weather-intelligence');
const { readWeatherState, missionForecast } = require('../lib/space-coast-official-weather');

const LL2 = 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/';
const LAUNCH_QUERIES = [
  { id: 'primary', ids: [11, 12, 27], limit: 36 },
  { id: 'specialist', ids: [1, 21, 25, 143], limit: 18 }
];
const NWS = 'https://api.weather.gov';
const STARBASE = 'https://www.starbase.texas.gov/beach-road-access';
const CONTACT = 'ChrisIzworskiRocketUSA/1.0 (+https://chrisizworski.com/)';

async function fetchJson(url, timeoutMs = 11000, headers = {}) {
  const response = await fetch(url, {
    headers: { 'User-Agent': CONTACT, Accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error('HTTP ' + response.status + ' from ' + new URL(url).hostname);
  return response.json();
}
async function fetchText(url, timeoutMs = 6000) {
  const response = await fetch(url, {
    headers: { 'User-Agent': CONTACT, Accept: 'text/html' },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error('HTTP ' + response.status + ' from ' + new URL(url).hostname);
  const length = Number(response.headers?.get?.('content-length') || 0);
  if (length > 250000) throw new Error('Access bulletin exceeds size limit');
  const body = await response.text();
  if (body.length > 250000) throw new Error('Access bulletin exceeds size limit');
  return body;
}
function queryUrl(query) {
  const u = new URL(LL2);
  u.searchParams.set('location__ids', query.ids.join(','));
  u.searchParams.set('limit', String(query.limit));
  u.searchParams.set('format', 'json');
  u.searchParams.set('ordering', 'net');
  u.searchParams.set('hide_recent_previous', 'true');
  return u.toString();
}
async function loadSchedule(now = Date.now()) {
  const results = await Promise.allSettled(LAUNCH_QUERIES.map(async group => {
    const response = await fetchJson(queryUrl(group), 12500);
    if (!Array.isArray(response.results)) throw new Error('Launch Library response lacks results array');
    return { id: group.id, items: response.results, count: Number(response.count) || null,
      limit: group.limit, checkedAt: new Date().toISOString() };
  }));
  const health = results.map((item, i) => item.status === 'fulfilled' ?
    { id: LAUNCH_QUERIES[i].id, status: 'ok', returned: item.value.items.length,
      providerCount: item.value.count, truncated: item.value.count > item.value.items.length } :
    { id: LAUNCH_QUERIES[i].id, status: 'unavailable', returned: 0,
      providerCount: null, truncated: null });
  if (results.every(x => x.status === 'rejected')) throw new Error('Launch schedule providers are temporarily unavailable');
  const raw = results.flatMap(item => item.status === 'fulfilled' ? item.value.items : []);
  const unique = new Map();
  for (const item of raw) {
    const normalized = normalizeUsLaunch(item, now);
    if (normalized?.id) unique.set(normalized.id, normalized);
  }
  return {
    launches: [...unique.values()].sort((a, b) => Date.parse(a.net) - Date.parse(b.net)),
    health, isPartial: health.some(x => x.status !== 'ok')
  };
}
async function loadTexasNotice() {
  const now = new Date().toISOString();
  try {
    const html = await fetchText(STARBASE, 6000);
    return parseStarbaseAccess(html, now);
  } catch (_err) {
    return { state: 'unknown', roadState: 'unknown', description: null,
      checkedAt: now, url: STARBASE };
  }
}
function emptyWeather(reason = 'Exact target or NWS forecast unavailable') {
  return { level: 'unknown', label: 'No launch-time sky comparison',
    detail: reason, places: [], comparison: null };
}
function skyCompare(places) {
  if (!Array.isArray(places) || places.length !== 2) return {
    state: 'unknown', winner: null, label: 'No reliable two-site comparison',
    detail: 'Both areas need current gridded sky-cover forecasts and sufficiently complete surface weather.'
  };
  const usable = x => x?.cloudStatus === 'ok' &&
    Number.isInteger(x?.cloudCoverPercent) &&
    !['unknown', 'poor'].includes(x?.assessment?.level);
  if (places.some(x => !usable(x))) return {
    state: 'unknown', winner: null, label: 'Cloud comparison not yet reliable',
    detail: 'At least one area lacks current cloud evidence or has an unsafe/incomplete surface forecast.'
  };
  const diff = Math.abs(places[0].cloudCoverPercent - places[1].cloudCoverPercent);
  if (diff < 20) return {
    state: 'similar', winner: null, difference: diff,
    label: 'Similar forecast sky cover',
    detail: 'The total cloud-cover difference is under 20 percentage points. No meaningful forecast advantage is indicated.'
  };
  const winner = places[0].cloudCoverPercent < places[1].cloudCoverPercent ? places[0] : places[1];
  return {
    state: 'relative', winner: winner.id, difference: diff,
    label: 'Less forecast sky cover near ' + winner.name,
    detail: 'The gridded forecast indicates ' + diff + ' percentage points less sky cover here. That does not predict rocket visibility along its path or launch weather approval.'
  };
}
async function weatherFor(region, launch, now = Date.now()) {
  const target = Date.parse(launch?.net || '');
  if (!launch || !['minute', 'second'].includes(launch.netPrecision)) {
    return emptyWeather('The launch has no exact announced time. A date-only or month-only mission cannot be assigned a useful viewing forecast.');
  }
  if (!Number.isFinite(target) || target < now - 15 * 60000 || target > now + 7 * 86400000) {
    return emptyWeather('The launch is outside the current seven-day hourly forecast window.');
  }
  if (!region.weatherPoints?.length) {
    return emptyWeather('This coast does not yet have a verified public launch-viewing point for safe weather-based travel planning.');
  }
  const places = await Promise.all(region.weatherPoints.map(async p => {
    try {
      const point = await fetchJson(NWS + '/points/' + p.lat.toFixed(4) + ',' + p.lon.toFixed(4),
        7000, { Accept: 'application/geo+json' });
      const hourlyUrl = point?.properties?.forecastHourly;
      const gridUrl = point?.properties?.forecastGridData;
      if (!hourlyUrl?.startsWith(NWS + '/gridpoints/')) throw new Error('NWS hourly point unavailable');
      const [hourly, grid] = await Promise.all([
        fetchJson(hourlyUrl, 7500, { Accept: 'application/geo+json' }),
        gridUrl?.startsWith(NWS + '/gridpoints/') ?
          fetchJson(gridUrl, 7500, { Accept: 'application/geo+json' }).catch(() => null) :
          Promise.resolve(null)
      ]);
      const period = (hourly?.properties?.periods || []).find(v =>
        target >= Date.parse(v.startTime) && target < Date.parse(v.endTime)) || null;
      const cloud = skyCoverAt(grid, launch.net, now);
      const assessment = surfaceSkyAssessment(period, cloud, weatherGrade);
      return { id: p.id, name: p.name, status: period ? 'ok' : 'hourly-unavailable',
        assessment, period: period ? {
          startTime: period.startTime, endTime: period.endTime,
          shortForecast: period.shortForecast, windSpeed: period.windSpeed,
          precipitationChance: period.probabilityOfPrecipitation?.value ?? null
        } : null,
        cloudStatus: assessment.cloudStatus, cloudCoverPercent: assessment.cloudCoverPercent,
        updatedAt: assessment.forecastUpdatedAt,
        source: 'https://www.weather.gov/' };
    } catch (_) {
      return { id: p.id, name: p.name, status: 'unavailable',
        assessment: weatherGrade(null), period: null, cloudStatus: 'unavailable',
        cloudCoverPercent: null, updatedAt: null, source: 'https://www.weather.gov/' };
    }
  }));
  return { level: places.every(x => x.status === 'ok') ? 'assessed' : 'partial',
    label: 'NWS surface and sky-cover forecast', detail: 'Cloud cover is local to the viewing point, not the rocket path.',
    places, comparison: skyCompare(places) };
}

module.exports = async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const regionId = req.query?.region;
  const requestedId = req.query?.launchId;
  if (regionId !== undefined && !isTrustedCode(regionId)) {
    return res.status(400).json({ ok: false, error: 'Unknown U.S. launch region.' });
  }
  if (requestedId !== undefined && (typeof requestedId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedId))) {
    return res.status(400).json({ ok: false, error: 'Invalid launch identifier.' });
  }
  try {
    const now = Date.now();
    const schedule = await loadSchedule(now);
    const regions = groupedSchedule(schedule.launches).map(x => ({
      ...x, launches: x.launches.slice(0, 14),
      feedState: x.id === 'florida' || x.id === 'california' ?
        schedule.health.find(h => h.id === 'primary')?.status :
        schedule.health.find(h => h.id === 'specialist')?.status,
      feedTruncated: x.id === 'florida' || x.id === 'california' ?
        schedule.health.find(h => h.id === 'primary')?.truncated :
        schedule.health.find(h => h.id === 'specialist')?.truncated
    }));
    const region = REGIONS.find(x => x.id === regionId) ||
      REGIONS.find(x => x.id === (requestedId ?
        schedule.launches.find(x => x.id === requestedId)?.region : schedule.launches[0]?.region)) ||
      REGIONS.find(x => x.id === 'california');
    const selected = requestedId ?
      schedule.launches.find(x => x.id === requestedId) :
      schedule.launches.find(x => x.region === region.id) || null;
    if (requestedId && !selected) return res.status(404).json({
      ok: false, error: 'This launch is no longer listed in the current coastal schedule.'
    });
    if (selected && selected.region !== region.id) return res.status(400).json({
      ok: false, error: 'This mission belongs to another launch region.'
    });
    const [weather, launchWeather, texas, officialState] = await Promise.all([
      weatherFor(region, selected, now),
      launchWeatherFor(region, selected, (url, headers, timeout) => fetchJson(url, timeout, headers), now),
      region.id === 'texas' ? loadTexasNotice() : Promise.resolve(null),
      region.id === 'florida' ? readWeatherState() : Promise.resolve(null)
    ]);
    const access = regionalAccess(region, selected, { starbase: texas });
    return res.status(200).json({
      ok: true, generatedAt: new Date().toISOString(),
      selectedRegion: region.id, selectedLaunchId: selected?.id || null,
      selectedLaunch: selected,
      nationalNext: schedule.launches[0] || null,
      region: {
        id: region.id, name: region.name, subtitle: region.subtitle, coast: region.coast,
        timezone: region.timezone, description: region.description,
        authority: region.authority, access: region.access, specialist: region.specialist || null,
        context: region.context
      },
      regions,
      access, weather, launchWeather,
      officialLaunchWeather: region.id === 'florida' ? missionForecast(selected, officialState, now) : null,
      coverage: {
        feed: 'Launch Library 2 v2.3 (third-party launch calendar, not range authority)',
        regions: 6, locationIds: [1, 11, 12, 21, 25, 27, 143],
        limitations: [
          'The engine covers scheduled launches in six coastal U.S. regions, not every test-range firing or unannounced mission.',
          'Some NASA Wallops sounding rockets, Pacific missile-range tests and short-notice operations may not appear in Launch Library.',
          'The forward calendar is a bounded sample of provider records. Dates far beyond the current window may not be included.',
          'No mission is guaranteed to launch and no public viewing spot is guaranteed available.',
          'Launch-time precision and official admission, closures and public-weather forecasts are separate evidence layers.',
          'NWS launch-range weather signals are not rocket-specific flight commit rules, a scrub prediction, or official weather approval.'
        ],
        feedHealth: schedule.health, partial: schedule.isPartial
      },
      sources: [
        { name: 'Launch Library 2', url: 'https://ll.thespacedevs.com/', checkedAt: new Date().toISOString() },
        { name: 'Official range / launch notices', url: region.authority },
        { name: 'Official visitor / access conditions', url: region.access },
        { name: 'NWS launch-range area forecast', url: launchWeather.sourceUrl || 'https://www.weather.gov/',
          checkedAt: launchWeather.checkedAt, note: 'Regional weather proxy, not official launch weather or flight approval.' },
        { name: 'Official range weather and mission notices', url: launchWeather.officialUrl || region.authority,
          note: 'Official flight-weather criteria and weather-rule violation probability must be verified separately.' },
        ...(region.id === 'virginia' ? [{ name: 'NASA Wallops sounding rocket schedule',
          url: 'https://www.nasa.gov/wallops-launch-schedule/' }] : []),
        ...(region.id === 'texas' ? [{ name: 'Starbase beach and road status', url: STARBASE,
          checkedAt: texas?.checkedAt || null }] : [])
      ]
    });
  } catch (err) {
    return res.status(502).json({
      ok: false, error: 'National launch data temporarily unavailable.',
      official: 'https://www.nasa.gov/event-type/launch-schedule/'
    });
  }
};
module.exports._test = { LAUNCH_QUERIES, queryUrl, loadSchedule, skyCompare,
  weatherFor, loadTexasNotice, emptyWeather };

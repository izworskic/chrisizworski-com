'use strict';

const {
  isSpaceCoast, isFutureLaunch, normalizeLaunch, activeAlerts,
  viewAccess, VIEWPOINTS, PUBLIC_NPS_ALERTS, weatherGrade
} = require('../lib/space-coast-decision');

const LAUNCHES = 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?location__ids=12%2C27&limit=20&format=json&ordering=net&hide_recent_previous=true';
const KSC = 'https://www.kennedyspacecenter.com/launches-and-events/';
const NASA_SCHEDULE = 'https://www.nasa.gov/event-type/launch-schedule/';
const NPS_API = 'https://developer.nps.gov/api/v1/alerts?parkCode=cana&limit=50';
const NWS = 'https://api.weather.gov';
const UA = 'ChrisIzworskiRocketLaunch/1.0 (https://chrisizworski.com/)';

async function fetchJson(url, headers = {}, timeout = 10000) {
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(timeout)
  });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' from ' + new URL(url).hostname);
  return r.json();
}

async function loadNpsAlerts(now) {
  const checkedAt = new Date().toISOString();
  const errors = [];
  try {
    const raw = await fetchJson(PUBLIC_NPS_ALERTS, {}, 7000);
    return {
      verified: true, checkedAt, feed: 'park-site',
      url: PUBLIC_NPS_ALERTS, alerts: activeAlerts(raw, now), errors
    };
  } catch (err) {
    errors.push('NPS park alerts: ' + err.message);
  }
  if (process.env.NPS_API_KEY) {
    try {
      const raw = await fetchJson(NPS_API, { 'X-Api-Key': process.env.NPS_API_KEY }, 7000);
      return {
        verified: true, checkedAt, feed: 'developer-api',
        url: NPS_API, alerts: activeAlerts(raw, now), errors
      };
    } catch (err) {
      errors.push('NPS developer alerts: ' + err.message);
    }
  }
  return { verified: false, checkedAt, feed: null, url: PUBLIC_NPS_ALERTS, alerts: [], errors };
}

async function nwsFor(lat, lon, iso) {
  const headers = { Accept: 'application/geo+json' };
  const point = await fetchJson(NWS + '/points/' + lat.toFixed(4) + ',' + lon.toFixed(4), headers, 8000);
  const hourlyUrl = point?.properties?.forecastHourly;
  if (!hourlyUrl || !hourlyUrl.startsWith(NWS + '/gridpoints/')) {
    throw new Error('NWS hourly forecast URL not available');
  }
  const data = await fetchJson(hourlyUrl, headers, 8000);
  const t = Date.parse(iso);
  const period = (data?.properties?.periods || []).find(
    x => t >= Date.parse(x.startTime) && t < Date.parse(x.endTime)
  );
  return period || null;
}

async function weatherForLocations(next, now) {
  const locations = [
    { id: 'titusville', name: 'Titusville waterfront', lat: 28.6100, lon: -80.8060 },
    { id: 'port-canaveral', name: 'Port Canaveral coast', lat: 28.4046, lon: -80.5984 }
  ];
  const exact = next && ['minute', 'second'].includes(next.netPrecision);
  const withinHorizon = exact && Date.parse(next.net) >= now &&
    Date.parse(next.net) - now <= 7 * 86400000;
  if (!withinHorizon) {
    return locations.map(({ id, name }) => ({
      id, name, period: null, assessment: weatherGrade(null),
      checkedAt: null, status: 'not-in-forecast-window'
    }));
  }
  const results = await Promise.all(locations.map(async ({ id, name, lat, lon }) => {
    try {
      const period = await nwsFor(lat, lon, next.net);
      return {
        id, name, period, assessment: weatherGrade(period),
        checkedAt: new Date().toISOString(), status: period ? 'ok' : 'outside-hourly-coverage'
      };
    } catch (_err) {
      return {
        id, name, period: null, assessment: weatherGrade(null),
        checkedAt: new Date().toISOString(), status: 'unavailable'
      };
    }
  }));
  return results;
}

module.exports = async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  // One server-side cached response: do not expose upstream API keys to clients.
  // A globally shared durable cache or paid LL2 allowance is required before
  // aggressively polling at scale from several CDN regions.
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  try {
    const now = Date.now();
    const [feed, nps] = await Promise.all([fetchJson(LAUNCHES, {}, 12000), loadNpsAlerts(now)]);
    if (!Array.isArray(feed?.results)) throw new Error('Launch Library results are missing');
    const launches = feed.results
      .filter(isSpaceCoast)
      .filter(l => isFutureLaunch(l, now))
      .sort((a, b) => Date.parse(a.net) - Date.parse(b.net))
      .slice(0, 8)
      .map(normalizeLaunch);
    const next = launches[0] || null;
    const forecasts = await weatherForLocations(next, now);
    const primary = forecasts[0] || null;
    const parkAlerts = nps.alerts.map(a => ({
      ...a, description: a.description.slice(0, 600)
    }));
    const viewpoints = VIEWPOINTS.map(v => viewAccess(v, next, nps.alerts, nps.verified));
    const schedule = next?.scheduleConfidence || {
      level: 'none', label: 'No future Florida launch in current feed',
      detail: 'Check official NASA and launch-operator schedules for new announcements.'
    };
    return res.status(200).json({
      ok: true, generatedAt: new Date().toISOString(),
      next, upcoming: launches,
      weather: primary ? { period: primary.period, assessment: primary.assessment } : null,
      viewingWeatherByArea: forecasts,
      nextDecision: {
        schedule,
        viewingWeather: primary?.assessment || weatherGrade(null),
        launchWeather: {
          level: 'unknown', label: 'Official launch-weather approval not verified',
          detail: 'A local spectator forecast cannot establish range approval or a weather launch commit.'
        }
      },
      viewpoints, parkAlerts,
      accessSource: {
        name: 'National Park Service, Canaveral National Seashore',
        url: nps.url, checkedAt: nps.checkedAt, verified: nps.verified,
        feed: nps.feed, lagNote: nps.feed === 'developer-api' ?
          'The NPS developer API may lag the park-hosted alerts by about two hours.' : null,
        errors: nps.errors
      },
      sources: [
        { name: 'Launch Library 2', url: 'https://ll.thespacedevs.com/', checkedAt: new Date().toISOString(), note: 'Florida launch schedule and stated timing precision; third-party, not final launch authority.' },
        { name: 'NPS Canaveral alerts', url: nps.url, checkedAt: nps.checkedAt, note: nps.verified ? 'Official park alerts checked.' : 'Current closure feed unavailable; Playalinda access unverified.' },
        { name: 'National Weather Service', url: 'https://www.weather.gov/mlb/', note: 'Surface conditions at spectator areas; not rocket trajectory visibility or launch go-weather.' },
        { name: 'Kennedy Space Center Visitor Complex', url: KSC, note: 'Check exact launch viewing venue, tickets and mission access.' },
        { name: 'NASA launch schedule', url: NASA_SCHEDULE, note: 'Official NASA missions only, not an exhaustive commercial launch calendar.' }
      ],
      limits: [
        'A time listed only to the day, month or year is not an exact local launch time.',
        'Public NPS park alerts do not establish NASA security or launch-specific Playalinda access.',
        'Viewpoint candidates are not guarantees of parking, admission or a clear line of sight.',
        'NWS surface forecasts do not predict orbital trajectory, upper-level cloud interception or launch approval.',
        'For a specific mission, follow official operator and site manager instructions before traveling.'
      ]
    });
  } catch (err) {
    return res.status(502).json({
      ok: false, error: 'Florida launch schedule temporarily unavailable.',
      detail: String(err?.message || err).slice(0, 160),
      official: KSC
    });
  }
};

module.exports._test = { loadNpsAlerts, weatherForLocations, nwsFor, fetchJson };

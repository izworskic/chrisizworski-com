'use strict';

const {
  isSpaceCoast, isFutureLaunch, normalizeLaunch, activeAlerts,
  viewAccess, VIEWPOINTS, PUBLIC_NPS_ALERTS, weatherGrade,
  scheduleConfidence, windMax, launchArrivalGuidance
} = require('../lib/space-coast-decision');
const {
  skyCoverAt, surfaceSkyAssessment, skyComparison
} = require('../lib/space-coast-visibility');
const { inspectKscLaunch, CALENDAR: KSC_CALENDAR } =
  require('../lib/space-coast-ksc-viewing');
const { storeTrustedLaunches } = require('../lib/space-coast-ksc-snapshot');
const { buildGeographicViewing } = require('../lib/space-coast-geo');

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

async function nwsSnapshot(lat, lon, iso) {
  const headers = { Accept: 'application/geo+json' };
  const point = await fetchJson(NWS + '/points/' + lat.toFixed(4) + ',' + lon.toFixed(4), headers, 8000);
  const hourlyUrl = point?.properties?.forecastHourly;
  const gridUrl = point?.properties?.forecastGridData;
  if (!hourlyUrl || !hourlyUrl.startsWith(NWS + '/gridpoints/')) {
    throw new Error('NWS hourly forecast URL unavailable');
  }
  const [hourly, grid] = await Promise.all([
    fetchJson(hourlyUrl, headers, 8000),
    gridUrl && gridUrl.startsWith(NWS + '/gridpoints/') ?
      fetchJson(gridUrl, headers, 8000).catch(() => null) : Promise.resolve(null)
  ]);
  const target = Date.parse(iso);
  const period = (hourly?.properties?.periods || []).find(
    x => target >= Date.parse(x.startTime) && target < Date.parse(x.endTime)
  ) || null;
  return {
    period,
    cloud: skyCoverAt(grid, iso),
    hourlySource: hourlyUrl, gridSource: gridUrl || null
  };
}

// Compatibility for prior internal NWS helper consumers.
async function nwsFor(lat, lon, iso) {
  return (await nwsSnapshot(lat, lon, iso)).period;
}

async function weatherForLocations(next, now) {
  // Bounded site-reference grids. A park's NWS forecast grid is NOT a view
  // toward the pad, rocket ascent cloud profile, or launch-weather approval.
  // All Playalinda lot cards share the Lot 8 representative NWS grid.
  const locations = [
    { id: 'titusville', name: 'Space View Park (Titusville)', lat: 28.6139417, lon: -80.8037278 },
    { id: 'port-canaveral', name: 'Jetty Park (Port Canaveral)', lat: 28.407304, lon: -80.591899 },
    { id: 'rotary', name: 'Rotary Riverfront Park', lat: 28.566364, lon: -80.798183 },
    { id: 'parrish', name: 'Parrish Park', lat: 28.624745, lon: -80.792944 },
    { id: 'playalinda', name: 'Playalinda Beach (Lot 8 reference)', lat: 28.678293, lon: -80.648803 }
  ];
  const exact = next && ['minute', 'second'].includes(next.netPrecision);
  const withinHorizon = exact && Date.parse(next.net) >= now &&
    Date.parse(next.net) - now <= 7 * 86400000;
  if (!withinHorizon) {
    return locations.map(({ id, name }) => ({
      id, name, period: null, assessment: weatherGrade(null),
      cloudCoverPercent: null, cloudStatus: 'no-exact-window', cloudEvidence: null,
      checkedAt: null, status: 'not-in-forecast-window'
    }));
  }
  return Promise.all(locations.map(async ({ id, name, lat, lon }) => {
    try {
      const result = await nwsSnapshot(lat, lon, next.net);
      const assessment = surfaceSkyAssessment(result.period, result.cloud, weatherGrade);
      return {
        id, name, period: result.period, assessment,
        cloudCoverPercent: assessment.cloudCoverPercent,
        cloudStatus: assessment.cloudStatus,
        cloudEvidence: assessment.cloudEvidence,
        forecastUpdatedAt: assessment.forecastUpdatedAt,
        sourceUrl: result.gridSource || result.hourlySource,
        checkedAt: new Date().toISOString(),
        status: result.period ? 'ok' : 'outside-hourly-coverage'
      };
    } catch (_err) {
      return {
        id, name, period: null, assessment: weatherGrade(null),
        cloudCoverPercent: null, cloudStatus: 'unavailable', cloudEvidence: null,
        checkedAt: new Date().toISOString(), status: 'unavailable'
      };
    }
  }));
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
  const requestedId = req?.query?.launchId;
  if (requestedId != null && (
    typeof requestedId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedId)
  )) return res.status(400).json({ ok: false, error: 'Invalid launch selection.' });
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
    const next = requestedId ? launches.find(x => x.id === requestedId) : launches[0] || null;
    if (requestedId && !next) return res.status(404).json({
      ok: false, error: 'This mission is no longer in the current Florida launch list.'
    });
    const [forecasts, kscViewing] = await Promise.all([
      weatherForLocations(next, now),
      inspectKscLaunch(next).catch(() => ({
        state: 'unverified', checkedAt: new Date().toISOString(),
        sourceUrl: null, venues: [], checked: 0,
        reason: 'source-unavailable', calendarUrl: KSC_CALENDAR,
        note: 'Official KSC mission-viewing details could not be verified. Check the operator calendar.'
      })),
      // Save a trusted LL2 snapshot once with the ordinary cached schedule.
      // The faster official KSC checker reads it without polling LL2 again.
      storeTrustedLaunches(launches, now)
    ]);
    const primary = forecasts[0] || null;
    const parkAlerts = nps.alerts.map(a => ({
      ...a, description: a.description.slice(0, 600)
    }));
    const viewpoints = VIEWPOINTS.map(v => viewAccess(v, next, nps.alerts, nps.verified, { now }));
    const geographicViewing = buildGeographicViewing(next, viewpoints, nps, now, forecasts);
    const arrivalGuidance = launchArrivalGuidance(next, nps.alerts, nps.verified, now);
    const skyComparisonDecision = skyComparison(forecasts);
    const schedule = next?.scheduleConfidence || {
      level: 'none', label: 'No future Florida launch in current feed',
      detail: 'Check official NASA and launch-operator schedules for new announcements.'
    };
    return res.status(200).json({
      ok: true, generatedAt: new Date().toISOString(),
      selectedLaunchId: next?.id || null,
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
      viewpoints, parkAlerts, geographicViewing,
      arrivalGuidance, skyComparison: skyComparisonDecision,
      kscViewing,
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
        { name: 'National Weather Service', url: 'https://www.weather.gov/mlb/', note: 'Hourly spectator conditions and gridded sky-cover percentage near the viewing areas; not trajectory visibility.' },
        { name: 'NPS launch entry policy', url: 'https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm', note: 'Playalinda Beach Road normally closes to incoming visitors beginning T–30; mission security can alter access.' },
        { name: 'Kennedy Space Center Visitor Complex', url: KSC, note: 'Check exact launch viewing venue, tickets and mission access.' },
        { name: 'KSC mission-specific viewing', url: kscViewing.sourceUrl || KSC_CALENDAR,
          checkedAt: kscViewing.checkedAt,
          note: kscViewing.state === 'matched' ? 'Verified official event listing for the selected mission; inventory may still change.' :
            'No current official event listing matched; no ticket-availability assertion is made.' },
        { name: 'NASA launch schedule', url: NASA_SCHEDULE, note: 'Official NASA missions only, not an exhaustive commercial launch calendar.' }
      ],
      limits: [
        'A time listed only to the day, month or year is not an exact local launch time.',
        'Public NPS park alerts do not establish NASA security or launch-specific Playalinda access.',
        'Viewpoint candidates are not guarantees of parking, admission or a clear line of sight.',
        'NWS surface forecasts do not predict orbital trajectory, upper-level cloud interception or launch approval.',
        'Published KSC ticket listings are not real-time inventory, and absent event pages do not imply that viewing is unavailable.',
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

module.exports._test = { isSpaceCoast, isFutureLaunch, scheduleConfidence, weatherGrade, windMax, loadNpsAlerts, weatherForLocations, nwsFor, nwsSnapshot, fetchJson };

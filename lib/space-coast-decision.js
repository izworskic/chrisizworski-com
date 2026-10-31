'use strict';

// Florida-only launch decisions. Never infer rocket trajectory or launch go-weather
// from pad bearings or a spectator's surface forecast.
const FLORIDA_LOCATION_IDS = new Set([12, 27]);
const TERMINAL = /launch successful|launch failure|partial failure|failed|success|in flight/i;
const EXACT_PRECISION = new Set(['second', 'minute']);
const PUBLIC_NPS_ALERTS = 'https://www.nps.gov/cana/park-alerts-cana.json';

const VIEWPOINTS = [
  {
    id: 'space-view', name: 'Space View Park', area: 'Titusville',
    address: '8 Broad Street, Titusville, FL 32796',
    source: 'https://www.brevardfl.gov/ParksAndRecreation/ParksByCity/ParksInTitusville/SpaceView',
    summary: 'A public Indian River waterfront vantage point with restrooms. The county says the park remains open for scheduled after-hours launches.',
    class: 'county-after-hours'
  },
  {
    id: 'parrish', name: 'Parrish Park', area: 'Titusville',
    address: '1 A. Max Brewer Memorial Parkway, Titusville, FL 32796',
    source: 'https://www.brevardfl.gov/ParksAndRecreation/ParksByCity/ParksInTitusville/ParrishPark',
    summary: 'Riverfront and bridge-area viewing. Confirm parking restrictions and nighttime entry before leaving.',
    class: 'verify'
  },
  {
    id: 'playalinda-south', name: 'Playalinda Beach, lots 1–7', area: 'Canaveral National Seashore',
    address: 'Playalinda Beach Road, Titusville, FL',
    source: 'https://www.nps.gov/cana/planyourvisit/conditions.htm',
    summary: 'National Park Service beach access. Admission, hours and launch-security closures can change.',
    class: 'nps-south'
  },
  {
    id: 'playalinda-north', name: 'Playalinda Beach, lots 8–13', area: 'Canaveral National Seashore',
    address: 'Playalinda Beach Road, Titusville, FL',
    source: PUBLIC_NPS_ALERTS,
    summary: 'Northern beach parking. Current NPS closure alerts control access, even when other lots remain available.',
    class: 'nps-north'
  },
  {
    id: 'ksc-visitor', name: 'Kennedy Space Center Visitor Complex', area: 'Merritt Island',
    address: 'Space Commerce Way, Merritt Island, FL 32953',
    source: 'https://www.kennedyspacecenter.com/launches-and-events/',
    summary: 'Ticketed viewing varies by mission, pad and venue. Admission does not guarantee a launch-specific viewing package.',
    class: 'ticketed'
  },
  {
    id: 'ksc-gantry', name: 'KSC Gantry viewing', area: 'Kennedy Space Center',
    address: 'Kennedy Space Center Visitor Complex, Merritt Island, FL',
    source: 'https://www.kennedyspacecenter.com/launches-and-events/',
    summary: 'Mission-specific premium viewing. Published safety restrictions exclude LC-39A and LC-39B launches.',
    class: 'gantry'
  },
  {
    id: 'jetty', name: 'Jetty Park', area: 'Port Canaveral',
    address: '9035 Campground Circle, Cape Canaveral, FL 32920',
    source: 'https://www.portcanaveral.com/recreation/jetty-park',
    summary: 'Pier and beach views; vehicle passes, operating hours and launch-specific park instructions must be checked.',
    class: 'verify'
  },
  {
    id: 'shepard', name: 'Alan Shepard Park', area: 'Cocoa Beach',
    address: '299 East Cocoa Beach Causeway, Cocoa Beach, FL 32931',
    source: 'https://www.cityofcocoabeach.com/Facilities/Facility/Details/Alan-Shepard-Park-1',
    summary: 'Daytime beach alternative with paid city parking; ordinary park hours do not cover late-night launches.',
    class: 'daytime-only'
  }
];

function precisionOf(launch) {
  const name = String(launch?.net_precision?.name || '').toLowerCase();
  if (['second', 'minute', 'hour', 'day', 'month', 'year'].includes(name)) return name;
  if (launch?.tbddate) return 'date-tbd';
  if (launch?.tbdtime) return 'time-tbd';
  return 'unknown';
}
function validTime(iso) {
  const n = Date.parse(iso || '');
  return Number.isFinite(n) ? n : null;
}
function isSpaceCoast(launch) {
  const id = Number(launch?.pad?.location?.id);
  if (FLORIDA_LOCATION_IDS.has(id)) return true;
  const lat = Number(launch?.pad?.latitude);
  const lon = Number(launch?.pad?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    lat > 27.9 && lat < 29 && lon > -81 && lon < -80.3;
}
function isFutureLaunch(launch, now = Date.now()) {
  if (TERMINAL.test(String(launch?.status?.name || ''))) return false;
  const net = validTime(launch?.net);
  if (net === null) return false;
  const precision = precisionOf(launch);
  // Coarse net dates are labels, not a scheduled T-0. Keep the period visible.
  const grace = precision === 'day' ? 48 * 3600000 :
    precision === 'hour' ? 3600000 : precision === 'month' ? 32 * 86400000 :
      precision === 'year' ? 366 * 86400000 : 20 * 60000;
  return net + grace >= now;
}
function scheduleConfidence(l) {
  const status = String(l?.status?.name || '');
  const lower = status.toLowerCase();
  const precision = precisionOf(l);
  if (TERMINAL.test(status)) return { level: 'none', label: status, detail: 'This is no longer an upcoming launch.' };
  if (lower.includes('hold')) return { level: 'hold', label: 'Launch on hold', detail: 'Do not plan from the previous target time.' };
  if (lower.includes('scrub')) return { level: 'hold', label: 'Scrubbed', detail: 'The previous launch opportunity is not available.' };
  if (['month', 'year', 'date-tbd'].includes(precision)) return { level: 'low', label: precision === 'month' ? 'Month only' : precision === 'year' ? 'Year only' : 'Date unconfirmed', detail: 'The calendar date is a placeholder, not a published launch time.' };
  if (precision === 'day' || precision === 'time-tbd') return { level: 'low', label: 'Day only / time TBD', detail: 'The displayed date does not establish an actual launch time. Do not plan a viewing arrival yet.' };
  if (precision === 'hour') return { level: 'medium', label: 'Approximate hour', detail: 'The launch time is only accurate to the hour; confirm before travelling.' };
  if (EXACT_PRECISION.has(precision) && /go for launch|^go$/i.test(lower)) return { level: 'high', label: 'Go / current target', detail: 'Launch Library lists Go and a minute-level or better target. Launches can still be delayed or scrubbed.' };
  if (EXACT_PRECISION.has(precision)) return { level: 'medium', label: status || 'Time subject to confirmation', detail: 'A specific target is published, but official timing and readiness still need confirmation.' };
  return { level: 'unknown', label: 'Timing unverified', detail: 'Launch-time precision is missing; do not interpret the timestamp as a confirmed hour.' };
}
function normalizeLaunch(l) {
  const precision = precisionOf(l);
  return {
    id: l.id, name: l.name, net: l.net,
    netPrecision: precision, launchPage: /^https:\/\/ll\.thespacedevs\.com\//.test(l.url || '') ? l.url : null,
    lastUpdated: l.last_updated || null, windowStart: l.window_start || null, windowEnd: l.window_end || null,
    status: l.status?.name || null,
    tbdTime: !EXACT_PRECISION.has(precision), tbdDate: ['month', 'year', 'date-tbd'].includes(precision),
    probability: l.probability ?? null,
    provider: l.launch_service_provider?.name || null,
    rocket: l.rocket?.configuration?.full_name || l.rocket?.configuration?.name || null,
    mission: l.mission?.name || null,
    pad: l.pad?.name || null, padId: l.pad?.id || null,
    location: l.pad?.location?.name || null,
    lat: Number.isFinite(Number(l.pad?.latitude)) ? Number(l.pad.latitude) : null,
    lon: Number.isFinite(Number(l.pad?.longitude)) ? Number(l.pad.longitude) : null,
    scheduleConfidence: scheduleConfidence(l)
  };
}
function activeAlerts(raw, now = Date.now()) {
  const items = Array.isArray(raw) ? raw : raw?.data;
  if (!Array.isArray(items)) throw new Error('NPS alert response lacks an array');
  return items.filter(alert => {
    if (alert?.is_active === 0 || alert?.is_active === false) return false;
    if (alert?.start_date) {
      const start = validTime(alert.start_date);
      if (start !== null && start > now) return false;
    }
    if (alert?.end_date) {
      const end = validTime(alert.end_date);
      // NPS records may specify date-only end dates. When ambiguous, keep
      // the warning rather than incorrectly declaring an area reopened.
      if (end !== null && end + 86400000 < now) return false;
    }
    return true;
  }).map(a => ({
    id: a.id || null, title: String(a.title || '').trim(),
    category: String(a.category || '').trim(),
    description: String(a.description || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 1200),
    start: a.start_date || null, end: a.end_date || null,
    url: /^https:\/\/www\.nps\.gov\//.test(a.url || '') ? a.url : PUBLIC_NPS_ALERTS
  }));
}
function playalindaNorthClosed(alerts) {
  return alerts.some(a => /closure/i.test(a.category) &&
    /(?:lots?|parking\s+lots?)\s*#?\s*8\s*[-–]\s*13/i.test(a.title + ' ' + a.description) &&
    /closed|closure|restricted/i.test(a.title + ' ' + a.description));
}
function localHour(iso) {
  const t = validTime(iso);
  if (t === null) return null;
  const h = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23'
  }).format(new Date(t));
  return Number(h);
}
function viewAccess(view, next, alerts, npsVerified) {
  const coarse = !next || !EXACT_PRECISION.has(next.netPrecision);
  const hour = !coarse ? localHour(next.net) : null;
  const outsideNps = hour !== null && (hour < 6 || hour >= 18);
  const outsideCity = hour !== null && (hour < 8 || hour >= 19);
  const upper = String(next?.pad || '').toUpperCase();
  const is39 = /\b39\s*[AB]\b|\bLC[\s-]?39[AB]\b/.test(upper);
  let level = 'verify', label = 'Check launch-day access';
  let reason = 'Venue hours and launch-specific restrictions have not been confirmed for this mission.';
  if (view.class === 'county-after-hours') {
    level = 'candidate'; label = 'Public viewing candidate';
    reason = 'Brevard County confirms after-hours launch access. Check for event-specific changes and parking availability.';
  } else if (view.class === 'nps-north') {
    if (!npsVerified) { level = 'unknown'; label = 'NPS alerts unavailable'; reason = 'No current NPS closure feed verified. Do not assume access.'; }
    else if (playalindaNorthClosed(alerts)) { level = 'closed'; label = 'Closed by NPS'; reason = 'Active Canaveral NPS closure covers Playalinda lots 8–13 and associated road/beach access.'; }
    else if (outsideNps) { level = 'unknown'; label = 'Outside ordinary park hours'; reason = 'NPS lists 6 a.m.–6 p.m. and last entry at 5 p.m.; no mission-specific extension verified.'; }
    else { label = 'Check NPS security restrictions'; reason = 'No active 8–13 closure was detected, but launch-specific NPS restrictions must still be checked.'; }
  } else if (view.class === 'nps-south') {
    if (!npsVerified) { level = 'unknown'; label = 'NPS alerts unavailable'; reason = 'No current NPS closure feed verified. Access is unconfirmed.'; }
    else if (outsideNps) { level = 'unknown'; label = 'Outside ordinary park hours'; reason = 'NPS lists 6 a.m.–6 p.m. and last entry at 5 p.m.; special launch hours have not been verified.'; }
    else { label = 'Mission restrictions unverified'; reason = 'The current closure of northern lots does not establish that lots 1–7 will be open for this launch.'; }
  } else if (view.class === 'gantry' && is39) {
    level = 'ineligible'; label = 'Not offered for this pad';
    reason = 'KSC published Gantry safety rules exclude LC-39A and LC-39B launches.';
  } else if (view.class === 'ticketed' || view.class === 'gantry') {
    label = 'Ticket and mission confirmation required';
    reason = 'KSC viewing tickets, opening times and the available venue are launch-specific.';
  } else if (view.class === 'daytime-only' && outsideCity) {
    level = 'unknown'; label = 'Outside ordinary park hours';
    reason = 'City park hours are 8 a.m.–7 p.m.; late-night access and parking are not verified.';
  }
  return { ...view, level, label, reason, evidenceCheckedAt: null };
}
function windMax(period) {
  const values = String(period?.windSpeed || '').match(/\d+/g)?.map(Number) || [];
  return values.length ? Math.max(...values) : null;
}
function weatherGrade(period) {
  if (!period) return { level: 'unknown', label: 'Viewing weather unavailable', detail: 'NWS hourly forecasts do not cover this launch time, or the forecast could not be verified.' };
  const summary = String(period.shortForecast || '').trim();
  const rain = Number(period?.probabilityOfPrecipitation?.value);
  const pop = period?.probabilityOfPrecipitation?.value == null ? null : rain;
  const wind = windMax(period);
  if (!summary || pop === null || !Number.isFinite(pop)) return { level: 'unknown', label: 'Weather evidence incomplete', detail: 'The hourly forecast lacks enough information to grade surface viewing conditions.' };
  if (/thunder|severe|heavy rain|dense fog/i.test(summary) || pop >= 60)
    return { level: 'poor', label: 'Poor surface viewing conditions', detail: summary + '; precipitation chance ' + pop + '%. This is not a launch go/no-go forecast.' };
  if (/overcast|mostly cloudy|cloudy|showers|fog|rain/i.test(summary) || pop >= 25 || (wind !== null && wind >= 20))
    return { level: 'mixed', label: 'Potential visibility obstructions', detail: summary + '; precipitation chance ' + pop + '%. Cloud layers aloft and rocket trajectory remain unverified.' };
  return { level: 'good', label: 'Surface forecast looks favorable', detail: summary + '; precipitation chance ' + pop + '%. This does not establish an unobstructed view of the rocket or launch approval.' };
}
module.exports = {
  FLORIDA_LOCATION_IDS, VIEWPOINTS, PUBLIC_NPS_ALERTS,
  isSpaceCoast, isFutureLaunch, precisionOf, scheduleConfidence,
  normalizeLaunch, activeAlerts, playalindaNorthClosed, viewAccess,
  weatherGrade, windMax
};

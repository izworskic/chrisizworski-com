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
    source: 'https://www.brevardfl.gov/ParksAndRecreation/ParkDirectory/SpaceView',
    summary: 'A public Indian River waterfront vantage point with restrooms. The county says the park remains open for scheduled after-hours launches.',
    class: 'county-after-hours'
  },
  {
    id: 'parrish', name: 'Parrish Park', area: 'Titusville',
    address: '1 A. Max Brewer Memorial Parkway, Titusville, FL 32796',
    source: 'https://www.brevardfl.gov/ParksAndRecreation/ParkDirectory/Parrish-Titusville',
    summary: 'Riverfront and bridge-area viewing. Confirm parking restrictions and nighttime entry before leaving.',
    class: 'verify'
  },
  {
    id: 'playalinda-first', name: 'Playalinda Beach, lots 1–3', area: 'Canaveral National Seashore',
    address: 'Playalinda Beach Road, Titusville, FL',
    source: 'https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm',
    summary: 'Close to Kennedy Space Center. Launch security can close these lots separately from the rest of Playalinda, even when the park is otherwise open.',
    class: 'nps-first', lotRange: [1, 3]
  },
  {
    id: 'playalinda-south', name: 'Playalinda Beach, lots 4–7', area: 'Canaveral National Seashore',
    address: 'Playalinda Beach Road, Titusville, FL',
    source: 'https://www.nps.gov/cana/planyourvisit/conditions.htm',
    summary: 'Central Playalinda access. Exact available parking and security closures depend on the mission; official park alerts take precedence.',
    class: 'nps-south', lotRange: [4, 7]
  },
  {
    id: 'playalinda-north', name: 'Playalinda Beach, lots 8–13', area: 'Canaveral National Seashore',
    address: 'Playalinda Beach Road, Titusville, FL',
    source: PUBLIC_NPS_ALERTS,
    summary: 'Northern beach parking. Current NPS closure alerts control access, even when other lots remain available.',
    class: 'nps-north', lotRange: [8, 13]
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
    source: 'https://www.cityofcocoabeach.com/facilities/facility/details/alanshepardpark-54',
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

function npsOperatingHours(alerts) {
  const item = (alerts || []).find(a => /operating\s+hours/i.test(a.title || '') &&
    /information/i.test(a.category || ''));
  if (!item) return null;
  const info = String(item.description || '');
  const window = info.match(/\b(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!window) return null;
  const minutes = (h, m, ap) => ((Number(h) % 12) + (/pm/i.test(ap) ? 12 : 0)) * 60 + Number(m);
  const openMinutes = minutes(window[1], window[2], window[3]);
  const closeMinutes = minutes(window[4], window[5], window[6]);
  if (openMinutes >= closeMinutes || closeMinutes > 1440) return null;
  const last = info.match(/last\s+entry[^0-9]{0,32}(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  const lastEntryMinutes = last ? minutes(last[1], last[2] || '00', last[3]) : null;
  return {
    openMinutes, closeMinutes,
    lastEntryMinutes: lastEntryMinutes != null && lastEntryMinutes < closeMinutes ? lastEntryMinutes : null,
    source: 'Current NPS Canaveral operating-hours alert'
  };
}

function npsParkWideClosure(alerts) {
  return (alerts || []).some(a => /closure/i.test(a.category || '') &&
    /\bentire\s+playalinda(?:\s+beach|\s+district)?\b|\ball\s+(?:of\s+)?playalinda(?:\s+beach|\s+district)?\s+(?:is|will\s+be)\s+closed\b|\bplayalinda\s+district\s+(?:is|will\s+be)\s+closed\b/i.test(
      String(a.title || '') + ' ' + String(a.description || '')
    ));
}

function npsLotClosure(alerts, start, end) {
  return (alerts || []).some(a => {
    if (!/closure/i.test(a.category || '')) return false;
    const title = String(a.title || '') + ' ' + String(a.description || '');
    if (!/closed|closure|restricted|off limits|no access/i.test(title)) return false;
    const intervals = [];
    const range = /(?:parking\s+)?(?:lots?|areas?)\s*#?\s*(\d{1,2})\s*(?:[-–]|to)\s*#?\s*(\d{1,2})/gi;
    for (const m of title.matchAll(range)) intervals.push([Number(m[1]), Number(m[2])]);
    const single = /(?:parking\s+)?(?:lots?|areas?)\s*#?\s*(\d{1,2})(?!\s*[-–]|\s*to)/gi;
    for (const m of title.matchAll(single)) intervals.push([Number(m[1]), Number(m[1])]);
    // "Parking areas 1, 2 and 3" is used in NPS mission-specific notices.
    const list = title.match(/parking\s+(?:areas?|lots?)\s*#?\s*((?:\d{1,2}\s*,\s*)+\d{1,2}(?:\s*(?:and|&)\s*\d{1,2})?)/i);
    if (list) for (const v of list[1].match(/\d{1,2}/g) || []) intervals.push([Number(v), Number(v)]);
    return intervals.some(([a, b]) => a <= b && a >= 1 && b <= 20 && a <= end && b >= start);
  });
}

function localMinutes(iso) {
  const t = validTime(iso);
  if (t === null) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(t));
  const hour = Number(parts.find(p => p.type === 'hour')?.value);
  const minute = Number(parts.find(p => p.type === 'minute')?.value);
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : null;
}

function launchArrivalGuidance(next, alerts, verified, now = Date.now()) {
  const hours = verified ? npsOperatingHours(alerts) : null;
  const exact = next && EXACT_PRECISION.has(next.netPrecision) &&
    !/hold|scrub|launch successful|failure/i.test(String(next.status || ''));
  const t = exact ? validTime(next.net) : null;
  const cutoff = t !== null ? t - 30 * 60000 : null;
  let level = 'unknown', label = 'No confirmed entry time', detail =
    'The next mission lacks a precise launch time. NPS says Playalinda Beach Road normally closes to incoming traffic approximately 30 minutes before liftoff.';
  if (!verified) {
    detail = 'Current NPS alerts were not verified. Confirm the gate and launch-specific restrictions with the National Park Service.';
  } else if (cutoff !== null) {
    level = now >= cutoff ? 'attention' : 'planning';
    label = now >= cutoff ? 'Normal road-entry cutoff may have passed' : 'Plan to enter well ahead of T–30';
    detail = 'The published NPS policy calls for closing Playalinda Beach Road between the entry station and lot 1 thirty minutes before launch. This calculation uses a third-party target time and is not a live gate-status confirmation.';
  }
  return {
    level, label, detail,
    estimatedRoadRestrictionAt: cutoff !== null ? new Date(cutoff).toISOString() : null,
    npsOperatingHours: hours,
    source: 'https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm',
    lastCheckedAt: null
  };
}

function viewAccess(view, next, alerts, npsVerified, options = {}) {
  const coarse = !next || !EXACT_PRECISION.has(next.netPrecision);
  const clock = coarse ? null : localMinutes(next.net);
  const hours = npsVerified ? npsOperatingHours(alerts) : null;
  const outsideNps = clock !== null && hours &&
    (clock < hours.openMinutes || clock >= hours.closeMinutes);
  const outsideCity = clock !== null && (clock < 8 * 60 || clock >= 19 * 60);
  const upper = String(next?.pad || '').toUpperCase();
  const is39 = /\b39\s*[AB]\b|\bLC[\s-]?39[AB]\b/.test(upper);
  let level = 'verify', label = 'Check launch-day access';
  let reason = 'Venue hours and launch-specific restrictions have not been confirmed for this mission.';
  if (view.class === 'county-after-hours') {
    level = 'candidate'; label = 'Public viewing candidate';
    reason = 'Brevard County confirms after-hours launch access. Check for event-specific changes and parking availability.';
  } else if (view.class.startsWith('nps-')) {
    const range = view.lotRange;
    if (!npsVerified) {
      level = 'unknown'; label = 'NPS alerts unavailable';
      reason = 'The current park closure feed was unavailable. Do not assume Playalinda access.';
    } else if (npsParkWideClosure(alerts) || (range && npsLotClosure(alerts, range[0], range[1]))) {
      level = 'closed'; label = 'Closed by NPS';
      reason = 'An active National Park Service closure affects this group of Playalinda lots. Follow the official current-conditions notice.';
    } else if (!hours) {
      level = 'unknown'; label = 'Park hours unverified';
      reason = 'Current NPS alerts did not provide parsable operating hours. Confirm entry and mission-specific launch security before travel.';
    } else if (outsideNps) {
      level = 'unknown'; label = 'Outside published NPS hours';
      reason = 'The target falls outside the park hours in the active NPS notice. Mission-specific exceptions are not verified.';
    } else {
      label = 'Security access not yet confirmed';
      reason = 'No closure affecting these particular lots was detected, but NASA can restrict them independently for a launch.';
      const cutoff = launchArrivalGuidance(next, alerts, npsVerified, options.now ?? Date.now()).estimatedRoadRestrictionAt;
      if (cutoff && (options.now ?? Date.now()) >= Date.parse(cutoff)) {
        level = 'unknown'; label = 'Potential road-entry restriction';
        reason = 'NPS normally restricts access on Playalinda Beach Road 30 minutes before liftoff. Actual gate status is unverified.';
      }
    }
  } else if (view.class === 'gantry' && is39) {
    level = 'ineligible'; label = 'Not offered for this pad';
    reason = 'KSC published Gantry safety rules exclude LC-39A and LC-39B launches.';
  } else if (view.class === 'ticketed' || view.class === 'gantry') {
    label = 'Ticket and mission confirmation required';
    reason = 'KSC viewing tickets, opening times and the available venue are launch-specific. Never assume admission includes this event.';
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
  if (/thunder|severe|heavy rain|dense fog/i.test(summary)) {
    return { level: 'poor', label: 'Poor surface viewing conditions', detail: summary + (pop === null || !Number.isFinite(pop) ? '.' : '; precipitation chance ' + pop + '%.') + ' This is not a launch go/no-go forecast.' };
  }
  if (!summary || pop === null || !Number.isFinite(pop) || wind === null) return { level: 'unknown', label: 'Weather evidence incomplete', detail: 'The hourly forecast lacks cloud, precipitation or wind evidence needed to grade surface viewing conditions.' };
  if (pop >= 60)
    return { level: 'poor', label: 'Poor surface viewing conditions', detail: summary + '; precipitation chance ' + pop + '%. This is not a launch go/no-go forecast.' };
  if (/overcast|mostly cloudy|cloudy|showers|fog|rain/i.test(summary) || pop >= 25 || (wind !== null && wind >= 20))
    return { level: 'mixed', label: 'Potential visibility obstructions', detail: summary + '; precipitation chance ' + pop + '%. Cloud layers aloft and rocket trajectory remain unverified.' };
  return { level: 'good', label: 'Surface forecast looks favorable', detail: summary + '; precipitation chance ' + pop + '%. This does not establish an unobstructed view of the rocket or launch approval.' };
}
module.exports = {
  FLORIDA_LOCATION_IDS, VIEWPOINTS, PUBLIC_NPS_ALERTS,
  isSpaceCoast, isFutureLaunch, precisionOf, scheduleConfidence,
  normalizeLaunch, activeAlerts, playalindaNorthClosed, npsOperatingHours, npsLotClosure, npsParkWideClosure, launchArrivalGuidance, viewAccess,
  weatherGrade, windMax
};

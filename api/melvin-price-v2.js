const legacy = require('./melvin-price.js')._test;

const TZ = 'America/Chicago';
const ANNUAL_LOCKAGES_2024 = 4797;
const DAILY_AVG_2024 = ANNUAL_LOCKAGES_2024 / 366;

function localParts(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date).map(part => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === '24' ? 0 : parts.hour),
    minute: Number(parts.minute),
  };
}

function parseLpmsStamp(value, now = new Date()) {
  const match = /^(\d{2})(\d{2})(\d{2}):(\d{2})(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  // LPMS publishes MMDDYY:HHMM. This is corroborated by same-record notes such as
  // "09/09/2026" alongside readingEntryDateTime "090926:0600".
  const mo = Number(match[1]);
  const day = Number(match[2]);
  const yy = 2000 + Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (mo < 1 || mo > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const label = `${String(mo).padStart(2, '0')}/${String(day).padStart(2, '0')}/${yy} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} CT`;
  const nowP = localParts(now);
  const roughMs = Date.UTC(yy, mo - 1, day, hour, minute) - Date.UTC(nowP.year, nowP.month - 1, nowP.day, nowP.hour, nowP.minute);
  return { raw: value, label, ageMinutes: Math.max(0, Math.round(-roughMs / 60000)) };
}

function repairLockFreshness(locks, now = new Date()) {
  if (!locks?.ok) return locks;
  for (const lock of [locks.melvin, locks.adjacent?.upstream, locks.adjacent?.downstream]) {
    const raw = lock?.observedAt?.raw;
    if (!raw) continue;
    const corrected = parseLpmsStamp(raw, now);
    if (corrected) lock.observedAt = corrected;
  }
  const age = locks.melvin?.observedAt?.ageMinutes ?? null;
  locks.freshness = age == null ? 'RECENT' : age <= 45 ? 'LIVE' : age <= 180 ? 'DELAYED' : 'STALE';
  return locks;
}

function museumHoliday(date = new Date()) {
  const p = localParts(date);
  const fixed = new Map([
    ['1-1', "New Year's Day"],
    ['12-24', 'Christmas Eve'],
    ['12-25', 'Christmas Day'],
    ['12-31', "New Year's Eve"],
  ]);
  const key = `${p.month}-${p.day}`;
  if (fixed.has(key)) return fixed.get(key);
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  if (p.month === 11 && p.day >= 22 && p.day <= 28 && weekday === 4) return 'Thanksgiving';
  return null;
}

function enhanceTours(baseTours, now = new Date()) {
  const holiday = museumHoliday(now);
  const tours = {
    ...baseTours,
    arriveEarlyMinutes: 15,
    publicTourCapacity: 25,
    signup: 'Museum information desk',
    closedToday: Boolean(holiday),
    closureReason: holiday ? `Closed for ${holiday}` : null,
  };

  if (holiday) {
    tours.museumOpen = false;
    tours.nextTour = null;
    tours.minutesUntilNextTour = null;
    tours.opportunity = {
      state: 'CLOSED',
      label: 'Closed today',
      guidance: `Museum and normal public tours are closed for ${holiday}.`,
    };
    return tours;
  }

  const mins = tours.minutesUntilNextTour;
  if (!tours.nextTour || mins == null) {
    tours.opportunity = {
      state: tours.museumOpen ? 'DONE_TODAY' : 'CLOSED_NOW',
      label: tours.museumOpen ? 'Tours finished today' : 'Museum closed',
      guidance: tours.museumOpen ? 'The museum remains open, but the regular public tours have finished for today.' : 'Check the next open-day schedule before making a tour-specific trip.',
    };
  } else if (mins < tours.arriveEarlyMinutes) {
    tours.opportunity = {
      state: 'TIGHT',
      label: `${tours.nextTour} starts soon`,
      guidance: `USACE asks visitors to arrive about ${tours.arriveEarlyMinutes} minutes early, so sign-up may be tight for this tour.`,
    };
  } else if (mins <= 90) {
    tours.opportunity = {
      state: 'SOON',
      label: `${tours.nextTour} tour window`,
      guidance: `Good tour window. Plan to arrive about ${tours.arriveEarlyMinutes} minutes early and sign up at the museum desk.`,
    };
  } else {
    tours.opportunity = {
      state: 'LATER',
      label: `${tours.nextTour} later today`,
      guidance: `The next normal public tour is ${tours.nextTour}.`,
    };
  }
  return tours;
}

function trafficComparison(lock) {
  if (!lock) return null;
  const total24h = Number(lock.lockedUp24h || 0) + Number(lock.lockedDown24h || 0);
  const ratio = DAILY_AVG_2024 > 0 ? total24h / DAILY_AVG_2024 : null;
  let state = 'NEAR_AVERAGE';
  let shortLabel = 'near 2024 avg';
  if (ratio != null && ratio >= 1.35) {
    state = 'BUSY';
    shortLabel = 'busy vs 2024 avg';
  } else if (ratio != null && ratio <= 0.65) {
    state = 'LIGHT';
    shortLabel = 'light vs 2024 avg';
  }
  return {
    state,
    shortLabel,
    total24h,
    averageDaily2024: Math.round(DAILY_AVG_2024 * 10) / 10,
    ratioTo2024DailyAverage: ratio == null ? null : Math.round(ratio * 100) / 100,
    benchmark: '2024 annual lockages divided by 366 days; useful as a broad daily benchmark, not a seasonal normal.',
  };
}

function weatherOutlook(wx) {
  if (!wx?.ok) return { state: 'UNKNOWN', label: 'Weather unavailable' };
  const rain = Number(wx.precipitationProbability ?? 0);
  const windNumbers = String(wx.windSpeed || '').match(/\d+(?:\.\d+)?/g) || [];
  const maxWind = windNumbers.length ? Math.max(...windNumbers.map(Number)) : 0;
  if (rain >= 70 || maxWind >= 30) return { state: 'POOR', label: 'Poor viewing weather', rain, maxWind };
  if (rain >= 40 || maxWind >= 20) return { state: 'MIXED', label: 'Mixed viewing weather', rain, maxWind };
  return { state: 'GOOD', label: 'Good viewing weather', rain, maxWind };
}

function towWatchingOutlook(locks, comparison) {
  if (!locks?.ok || locks.freshness === 'STALE') return { state: 'UNVERIFIED', label: 'Tow watching: UNVERIFIED' };
  const m = locks.melvin;
  if ((m.lockingNow || 0) > 0) return { state: 'STRONG_NOW', label: 'Tow watching: STRONG NOW' };
  if ((m.pendingArrivals || 0) > 0) return { state: 'PROMISING', label: 'Tow watching: PROMISING' };
  if (comparison?.state === 'BUSY') return { state: 'GOOD', label: 'Tow watching: GOOD' };
  if (comparison?.state === 'LIGHT') return { state: 'LOW', label: 'Tow watching: LOW' };
  return { state: 'FAIR', label: 'Tow watching: FAIR' };
}

function buildVisit(body) {
  const locks = body.locks || { ok: false };
  const m = locks.melvin || null;
  const tours = body.tours || {};
  const wx = body.weather || {};
  const nav = body.notices || {};
  const comparison = trafficComparison(m);
  const tow = towWatchingOutlook(locks, comparison);
  const weather = weatherOutlook(wx);

  if (!locks.ok || locks.freshness === 'STALE') {
    const freshnessText = locks.ok ? 'The latest USACE lock report is stale.' : 'Live USACE lock traffic is unavailable.';
    const tourText = tours.closedToday ? tours.closureReason : tours.museumOpen ? 'The museum schedule is still usable.' : 'Use the published museum schedule for planning.';
    return {
      score: null,
      label: 'DATA LIMITED',
      headline: 'Tow timing unverified — use the visitor plan, not a traffic score',
      summary: `${freshnessText} I’m withholding a go-now tow recommendation rather than scoring old traffic. ${tourText}`,
      confidence: 'Low',
      reasons: [
        tow.label,
        comparison ? `Traffic report: ${comparison.total24h}/24h · ${comparison.shortLabel}` : 'Traffic comparison unavailable',
        tours.opportunity?.state === 'SOON' ? `Tour: ${tours.nextTour} · arrive ~15 min early` : `Tour: ${tours.opportunity?.label || 'schedule available'}`,
        nav.ok && nav.count > 0 ? `Navigation: ${nav.count} active notice${nav.count === 1 ? '' : 's'}` : `Weather: ${weather.state}`,
      ],
      persona: { towWatching: tow.state, tour: tours.opportunity?.state || 'UNKNOWN', weather: weather.state },
      trafficComparison: comparison,
    };
  }

  let score = 35;
  const active = Number(m.lockingNow || 0) + Number(m.pendingArrivals || 0);

  if ((m.lockingNow || 0) > 0) score += 27;
  else if ((m.pendingArrivals || 0) > 0) score += Math.min(24, 12 + Number(m.pendingArrivals || 0) * 4);
  else if (comparison?.state === 'BUSY') score += 14;
  else if (comparison?.state === 'NEAR_AVERAGE') score += 8;
  else score += 2;

  if (tours.opportunity?.state === 'SOON') score += 14;
  else if (tours.opportunity?.state === 'TIGHT') score += 4;
  else if (tours.museumOpen) score += 7;

  if (weather.state === 'GOOD') score += 9;
  else if (weather.state === 'POOR') score -= 8;

  if (nav.ok && nav.count > 0) score -= Math.min(8, nav.count * 2);

  score = Math.max(0, Math.min(100, Math.round(score)));
  if (locks.freshness === 'DELAYED') score = Math.min(score, 74);

  const label = score >= 82 ? 'EXCELLENT' : score >= 68 ? 'GOOD' : score >= 50 ? 'FAIR' : active > 0 ? 'FAIR' : 'QUIET';
  const feedCount = [locks.ok, wx.ok, nav.ok].filter(Boolean).length;
  const confidence = locks.freshness === 'DELAYED' ? 'Moderate' : feedCount === 3 ? 'High' : feedCount === 2 ? 'Moderate' : 'Low';

  let headline;
  if ((m.lockingNow || 0) > 0 && tours.opportunity?.state === 'SOON') headline = 'Excellent window: active lock traffic + a tour opportunity';
  else if ((m.lockingNow || 0) > 0) headline = 'Go now for active lock traffic';
  else if ((m.pendingArrivals || 0) > 0 && tours.opportunity?.state === 'SOON') headline = 'Good window: pending tow traffic + a tour';
  else if ((m.pendingArrivals || 0) > 0) headline = 'Promising tow-watching window';
  else if (comparison?.state === 'BUSY') headline = 'Active river day — a good time to visit';
  else if (tours.museumOpen) headline = 'Museum is open; tow traffic looks light right now';
  else headline = 'Quiet right now — check again later';

  let summary;
  if ((m.lockingNow || 0) > 0) summary = `USACE reports ${m.lockingNow} vessel${m.lockingNow === 1 ? '' : 's'} locking now. ${tours.opportunity?.guidance || ''}`.trim();
  else if ((m.pendingArrivals || 0) > 0) summary = `USACE reports ${m.pendingArrivals} pending arrival${m.pendingArrivals === 1 ? '' : 's'} at Melvin Price. ${tours.opportunity?.guidance || ''}`.trim();
  else summary = `${comparison?.total24h ?? 0} lockages were reported in the last 24 hours, ${comparison?.shortLabel || 'with no broad benchmark available'}. ${tours.opportunity?.guidance || ''}`.trim();

  if (locks.freshness === 'DELAYED') summary = `The USACE traffic report is delayed, so the recommendation is capped at moderate confidence. ${summary}`;

  const reasons = [
    tow.label,
    comparison ? `Traffic: ${comparison.total24h}/24h · ${comparison.shortLabel}` : 'Traffic comparison unavailable',
    tours.opportunity?.state === 'SOON' ? `Tour: ${tours.nextTour} · arrive ~15 min early` : tours.opportunity?.state === 'TIGHT' ? `Tour: ${tours.nextTour} · sign-up may be tight` : `Tour: ${tours.opportunity?.label || 'schedule available'}`,
    nav.ok && nav.count > 0 ? `Navigation: ${nav.count} active notice${nav.count === 1 ? '' : 's'}` : `Weather: ${weather.state}`,
  ];

  return {
    score,
    label,
    headline,
    summary,
    confidence,
    reasons,
    persona: { towWatching: tow.state, tour: tours.opportunity?.state || 'UNKNOWN', weather: weather.state },
    trafficComparison: comparison,
  };
}

async function build(now = new Date()) {
  const body = await legacy.build(now);
  body.locks = repairLockFreshness(body.locks, now);
  body.tours = enhanceTours(body.tours, now);
  const comparison = body.locks?.ok ? trafficComparison(body.locks.melvin) : null;
  if (body.traffic) body.traffic.comparison = comparison;
  body.visit = buildVisit(body);
  body.productVersion = 'decision-v2';
  return body;
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }
  try {
    const body = await build();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.end(JSON.stringify(body));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Melvin Price live decision data unavailable', detail: error.message }));
  }
}

module.exports = handler;
module.exports._test = {
  localParts,
  parseLpmsStamp,
  repairLockFreshness,
  museumHoliday,
  enhanceTours,
  trafficComparison,
  weatherOutlook,
  towWatchingOutlook,
  buildVisit,
  build,
  DAILY_AVG_2024,
};

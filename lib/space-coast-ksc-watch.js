'use strict';

// KSC official-source watch. Independent of the LL2 mission schedule.
// A successful calendar record NOMINATES a page; only a checked, current,
// mission-specific official event page with viewing sections yields history.
const { createHash, randomUUID } = require('node:crypto');
const { ToolState, stateReady } = require('./tool-state');
const {
  CALENDAR, validatedEventUrl, calendarLaunchRecords, fetchText, parseEventPage,
  eventDateInHeader, exactIdentifier, missionMatch, padCode, dateMatches
} = require('./space-coast-ksc-viewing');

const KEY = 'space-coast:ksc-watch:v1';
const LEASE_KEY = 'space-coast:ksc-watch:lease:v1';
const TTL_SECONDS = 120 * 86400;
const MAX_PAGES = 4;
const MAX_HISTORY_PER_MISSION = 60;
const MAX_MISSIONS = 35;
const MAX_AGE_DAYS = 90;
const FRESH_MS = 45 * 60000;

const readTs = x => Number.isFinite(Date.parse(x || '')) ? Date.parse(x) : 0;
const ISO = x => new Date(x).toISOString();
function initialWatch() {
  return { version: 1, lastCalendarCheckedAt: null, lastRunAt: null,
    lastChangeAt: null, pagesAttempted: 0, verifiedPages: 0,
    officialCalendarUrl: CALENDAR, missions: {}, history: {} };
}
function cleanVenue(v) {
  return {
    id: String(v.id).slice(0, 40), name: String(v.name || '').slice(0, 120),
    ticket: String(v.ticket || 'details-not-verified').slice(0, 55),
    status: String(v.status || '').slice(0, 55),
    openingAt: v.openingAt || null, closesAt: v.closesAt || null,
    checkInAt: v.checkInAt || null, busBoardingAt: v.busBoardingAt || null,
    opensIfDelayedUntil: v.opensIfDelayedUntil || null,
    transport: v.transport || null
  };
}
function calendarDateCompatible(date, dates) {
  if (!Array.isArray(dates) || !dates.length) return true;
  const a = readTs(date + 'T12:00:00Z');
  return dates.some(d => Math.abs(readTs(d + 'T12:00:00Z') - a) <= 2 * 86400000);
}
function verifyOfficialListing(entry, html, now = Date.now()) {
  const url = validatedEventUrl(entry?.url);
  const marker = exactIdentifier(entry?.title);
  if (!url || !marker || entry.marker !== marker) return null;
  const eventDate = eventDateInHeader(html);
  if (!eventDate || !calendarDateCompatible(eventDate, entry.dates)) return null;
  const date = readTs(eventDate + 'T12:00:00Z');
  if (!date || date < now - 7 * 86400000 || date > now + 180 * 86400000) return null;

  // Synthetic comparison only verifies internal coherence of KSC's own event
  // record and page. It is NOT a separate LL2 operator/schedule confirmation.
  const sourceMission = {
    name: entry.title, net: eventDate + 'T16:00:00Z',
    netPrecision: 'day', pad: ''
  };
  const page = parseEventPage(html, sourceMission, url, now);
  if (page.state !== 'matched' || !page.venues?.length ||
      !missionMatch(sourceMission, page.eventTitle)) return null;
  const venues = page.venues.map(cleanVenue);
  if (['39A', '39B'].includes(page.sourcePad)) {
    venues.forEach(v => {
      if (v.id === 'gantry') v.status = 'safety-exclusion';
    });
  }
  return {
    marker, calendarTitle: entry.title.slice(0, 240),
    eventTitle: String(page.eventTitle).slice(0, 240),
    eventDate: page.eventDate, sourcePad: page.sourcePad,
    sourceUrl: url, officialTime: page.officialTiming?.sourceTime || null,
    verifiedAt: ISO(now), venues,
    // Retain only the official-page evidence, never raw operator HTML.
    evidenceLevel: 'ksc-official-page-verified',
    independentScheduleAgreement: 'not-evaluated'
  };
}
const FIELD_NAMES = {
  openingAt: 'viewing area opening', closesAt: 'viewing cutoff',
  checkInAt: 'check-in', busBoardingAt: 'bus boarding',
  opensIfDelayedUntil: 'conditional opening', transport: 'transport instructions'
};
function meaningfulChanges(old, next) {
  if (!old) return [{
    type: 'official-announcement-found',
    headline: 'KSC viewing announcement first verified',
    detail: 'An official KSC mission page now lists viewing details. This is not live ticket inventory.'
  }];
  const changes = [];
  if (old.sourceUrl !== next.sourceUrl) changes.push({
    type: 'official-listing-replaced', headline: 'Official KSC event page changed',
    detail: 'KSC now lists a different official event page for this mission.'
  });
  if (old.eventDate !== next.eventDate) changes.push({
    type: 'official-date-revised', headline: 'Official KSC event date revised',
    detail: 'KSC now publishes ' + next.eventDate + ' instead of ' + old.eventDate +
      '. Compare the operator schedule before making travel decisions.'
  });
  if (old.officialTime !== next.officialTime && next.officialTime) changes.push({
    type: 'official-clock-revised', headline: 'KSC event time changed',
    detail: 'The current KSC page lists ' + next.officialTime +
      (old.officialTime ? ' (previously ' + old.officialTime + ').' : '.')
  });

  const previous = new Map((old.venues || []).map(v => [v.id, v]));
  const current = new Map(next.venues.map(v => [v.id, v]));
  for (const v of next.venues) {
    const p = previous.get(v.id);
    if (!p) {
      changes.push({
        type: 'viewing-location-added', headline: v.name + ' now listed',
        detail: 'KSC now lists this location for mission viewing. Verify its access and ticket rules.'
      });
      continue;
    }
    if (p.ticket !== v.ticket) changes.push({
      type: 'ticket-information-changed', headline: v.name + ': ticket information changed',
      detail: v.ticket === 'sold-out-on-page' ?
        'The official page currently says sold out for this viewing option. Inventory may change.' :
        'The official page now lists ' + v.ticket.replace(/-/g, ' ') +
        ' (previously ' + String(p.ticket).replace(/-/g, ' ') + '). Check the operator.'
    });
    if (p.status !== v.status && v.status === 'safety-exclusion') changes.push({
      type: 'viewing-safety-exclusion', headline: v.name + ': launch-pad exclusion',
      detail: 'This location is not eligible for an LC-39A/B launch under KSC rules.'
    });
    for (const [field, label] of Object.entries(FIELD_NAMES)) {
      if (p[field] === v[field]) continue;
      changes.push({
        type: 'viewing-instructions-revised', headline: v.name + ': ' + label + ' updated',
        detail: v[field] ? 'The official page now lists ' + String(v[field]).slice(0, 80) +
          (p[field] ? ' (previously ' + String(p[field]).slice(0, 80) + ').' : '.') :
          'The previous ' + label + ' detail is no longer present on the checked KSC page.'
      });
    }
  }
  for (const v of old.venues || []) if (!current.has(v.id)) changes.push({
    type: 'viewing-location-no-longer-listed', headline: v.name + ' no longer listed',
    detail: 'This viewing location is absent from the newly verified KSC event page. That alone does not establish a cancellation.'
  });
  return changes.slice(0, 18);
}
function eventFromChange(marker, page, change, now) {
  const signature = [marker, page.sourceUrl, change.type, change.headline, change.detail].join('|');
  return {
    id: createHash('sha256').update(signature).digest('hex').slice(0, 24),
    missionMarker: marker, type: change.type,
    headline: change.headline.slice(0, 160),
    detail: change.detail.slice(0, 350),
    detectedAt: ISO(now), sourceCheckedAt: page.verifiedAt,
    officialUrl: page.sourceUrl, officialMissionDate: page.eventDate,
    evidenceLevel: 'ksc-official-page-verified'
  };
}
function candidateQueue(records, missions, now = Date.now()) {
  const byUrl = new Map();
  for (const r of records) byUrl.set(r.url, { ...r, listed: true });
  for (const old of Object.values(missions || {})) {
    if (!old || !validatedEventUrl(old.sourceUrl) || !old.marker ||
        readTs(old.eventDate + 'T12:00:00Z') < now - 86400000) continue;
    if (!byUrl.has(old.sourceUrl)) byUrl.set(old.sourceUrl, {
      marker: old.marker, title: old.calendarTitle,
      url: old.sourceUrl, dates: [], listed: false
    });
  }
  const values = [...byUrl.values()].filter(x => !!exactIdentifier(x.title));
  values.sort((a,b) => {
    const la=missions[a.marker], lb=missions[b.marker];
    // Prioritize a fresh official announcement, then least recently inspected
    // pages to ensure all active missions get another turn.
    const anew = !la || la.sourceUrl !== a.url ? 0 : 1;
    const bnew = !lb || lb.sourceUrl !== b.url ? 0 : 1;
    return anew-bnew ||
      (readTs(la?.verifiedAt) - readTs(lb?.verifiedAt)) ||
      a.url.localeCompare(b.url);
  });
  return values.slice(0, MAX_PAGES);
}
async function fetchCalendar(fetcher = fetch) {
  const r = await fetcher(CALENDAR, {
    headers: { Accept: 'text/html', 'User-Agent': 'ChrisIzworskiLaunchWatch/1.0 (chrisizworski.com)' },
    signal: AbortSignal.timeout(4500)
  });
  if (!r.ok) throw new Error('KSC calendar HTTP ' + r.status);
  if (Number(r.headers?.get?.('content-length') || 0) > 2500000)
    throw new Error('KSC calendar exceeds source limit');
  const html = await r.text();
  if (html.length > 2500000) throw new Error('KSC calendar exceeds source limit');
  return html;
}
function prune(state, now) {
  const cutoff = now - MAX_AGE_DAYS * 86400000;
  for (const [marker, report] of Object.entries(state.missions || {})) {
    if (readTs(report.eventDate + 'T12:00:00Z') < cutoff) {
      delete state.missions[marker]; delete state.history[marker];
    }
  }
  const latest = Object.entries(state.missions).sort((a,b) =>
    readTs(b[1].verifiedAt) - readTs(a[1].verifiedAt));
  for (const [marker] of latest.slice(MAX_MISSIONS)) {
    delete state.missions[marker]; delete state.history[marker];
  }
}
async function runKscWatch({
  state = new ToolState(), fetcher = fetch, now = Date.now()
} = {}) {
  if (!stateReady()) throw new Error('Private Postgres-backed watch state is unavailable');
  const when = now();
  const lease = randomUUID();
  const locked = await state.set(LEASE_KEY, lease, { ex: 120, nx: true });
  if (locked !== 'OK') return { ok: true, skipped: 'another-monitor-run-active' };
  try {
    const prior = await state.get(KEY);
    const next = prior?.version === 1 && prior.missions && prior.history
      ? prior : initialWatch();
    const html = await fetchCalendar(fetcher);
    const records = calendarLaunchRecords(html, when);
    const candidates = candidateQueue(records, next.missions, when);
    const results = await Promise.all(candidates.map(async entry => {
      try {
        const pageHtml = await fetchText(entry.url, 4500, fetcher);
        const report = verifyOfficialListing(entry, pageHtml, when);
        return { entry, report, failed: !report };
      } catch { return { entry, report: null, failed: true }; }
    }));
    let verified = 0, changes = 0, failures = 0;
    for (const {entry,report,failed} of results) {
      if (failed) { failures++; continue; }
      verified++;
      const older = next.missions[report.marker];
      const events = meaningfulChanges(older, report);
      const history = next.history[report.marker] || [];
      const seen = new Set(history.map(e => e.id));
      for (const change of events) {
        const e = eventFromChange(report.marker, report, change, when);
        if (seen.has(e.id)) continue;
        history.unshift(e); seen.add(e.id); changes++;
      }
      next.history[report.marker] = history.slice(0, MAX_HISTORY_PER_MISSION);
      next.missions[report.marker] = report;
    }
    next.version = 1;
    next.lastRunAt = ISO(when);
    next.lastCalendarCheckedAt = ISO(when);
    next.lastChangeAt = changes ? ISO(when) : next.lastChangeAt;
    next.pagesAttempted = candidates.length;
    next.verifiedPages = verified;
    next.failedPages = failures;
    next.calendarLaunchRecords = records.length;
    next.monitorStatus = failures ? 'partial' : 'checked';
    prune(next, when);
    await state.set(KEY, next, { ex: TTL_SECONDS });
    return { ok: true, checkedAt: next.lastRunAt, records: records.length,
      inspected: candidates.length, verified, changes, failed: failures,
      monitorStatus: next.monitorStatus };
  } finally {
    // Atomic compare-and-delete. A run that outlives the lease must not
    // release another run's newer lease.
    await state.command(['RELEASE', LEASE_KEY, lease]).catch(() => {});
  }
}
function missionTimeline(launch, state, now = Date.now()) {
  const marker = exactIdentifier(launch?.name);
  if (!marker || state?.version !== 1) return null;
  const page = state.missions?.[marker];
  if (!page || !validatedEventUrl(page.sourceUrl) ||
      !missionMatch(launch, page.eventTitle) ||
      !dateMatches(launch, page.eventDate, now)) return null;
  const selectedPad = padCode(launch?.pad);
  if (page.sourcePad && selectedPad && page.sourcePad !== selectedPad) return null;
  const history = (state.history?.[marker] || [])
    .filter(e => e.officialUrl === page.sourceUrl &&
      e.evidenceLevel === 'ksc-official-page-verified')
    .slice(0, 25);
  return {
    missionMarker: marker, officialSourceUrl: page.sourceUrl,
    officialEventDate: page.eventDate, officialPageLastVerifiedAt: page.verifiedAt,
    verifiedPageIsRecent: now - readTs(page.verifiedAt) <= FRESH_MS,
    sourceConfidence: 'verified-ksc-page; independent launch schedule not checked',
    events: history
  };
}
function publicWatchHealth(state, now = Date.now()) {
  const checked = readTs(state?.lastCalendarCheckedAt);
  return {
    status: !checked ? 'not-initialized' : now - checked > FRESH_MS ? 'overdue' :
      state.monitorStatus === 'partial' ? 'partial' : 'checked',
    lastCalendarCheckedAt: checked ? ISO(checked) : null,
    lastChangeAt: state?.lastChangeAt || null,
    checkedPages: state?.pagesAttempted || 0,
    verifiedPages: state?.verifiedPages || 0,
    calendarUrl: CALENDAR,
    monitoringNote: 'Scheduled checks target every 15 minutes; GitHub Actions jobs can be delayed or skipped.'
  };
}

module.exports = {
  KEY, LEASE_KEY, FRESH_MS, MAX_PAGES, initialWatch, calendarDateCompatible,
  verifyOfficialListing, meaningfulChanges, eventFromChange, candidateQueue,
  runKscWatch, missionTimeline, publicWatchHealth
};

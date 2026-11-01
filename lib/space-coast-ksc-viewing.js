'use strict';

// A current KSC event page is evidence. A page title, generic visitor admission,
// old event page, search snippet or predicted URL is NOT proof of launch-specific
// viewing or ticket inventory. All candidate URLs are generated or discovered
// strictly under the KSC official HTTPS origin and validated before display.

const ORIGIN = 'https://www.kennedyspacecenter.com';
const CALENDAR = ORIGIN + '/launches-and-events/events-calendar/';
const VIEWING_INFO = ORIGIN + '/launches-and-events/see-a-launch/launch-viewing';
const MAX_SOURCE_BYTES = 2500000;
const LIMIT_LOOKUPS = 5;

function plain(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/?(?:li|p|div|h[1-6]|br|section)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(Number(n), 0x10ffff)))
    .replace(/&(?:amp|nbsp|quot|apos|lt|gt);/gi, m =>
      ({ '&amp;': '&', '&nbsp;': ' ', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' })[m.toLowerCase()] || ' ')
    .replace(/\s+/g, ' ').trim();
}
function slug(text) {
  return String(text || '').toLowerCase().replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function exactIdentifier(name) {
  const text = String(name || '').toLowerCase().replace(/\bstarlink group\b/g, 'starlink');
  const patterns = [
    /\bstarlink[\s-]*(\d{1,2})[\s-]+(\d{1,3})\b/,
    /\b(?:ng|crew|nrol|ussf|mrv|lv|gps)[\s-]*[a-z]?\d{1,4}[a-z]?\b/,
    /\b(?:crs|bluebird|uscv)[\s-]*\d{1,4}\b/,
    /\bartemis[\s-]*(?:i{1,4}|v|vi|[2-9])\b/,
    /\b(?:transporter|bandwagon)[\s-]*\d+\b/
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return slug(m[0]);
  }
  return null;
}
function missionName(launch) {
  const text = String(launch?.name || '');
  return text.includes('|') ? text.split('|').slice(1).join('|').trim() : text.trim();
}
function normalizedMission(launch) {
  const m = missionName(launch);
  return m.replace(/\bStarlink Group\b/ig, 'Starlink')
    .replace(/\b(?:Block 2 #\d+)\b/ig, '').replace(/[()]/g, ' ').trim();
}
function candidateSlugs(launch) {
  const mission = normalizedMission(launch), marker = exactIdentifier(mission);
  if (!marker || mission.length > 120) return [];
  const rocket = String(launch?.rocket || launch?.name?.split('|')[0] || '').toLowerCase();
  let prefix = '';
  if (/falcon heavy/.test(rocket)) prefix = 'spacex-falcon-heavy';
  else if (/falcon 9/.test(rocket)) prefix = 'spacex-falcon-9';
  else if (/vulcan/.test(rocket)) prefix = 'ula-vulcan';
  else if (/atlas v/.test(rocket)) prefix = 'ula-atlas-v';
  else if (/new glenn/.test(rocket)) prefix = 'blue-origin-new-glenn';
  else if (/sls|space launch system/.test(rocket)) prefix = 'nasa';
  const m = slug(mission);
  const variants = [m, m.replace(/^starlink-group-/, 'starlink-')];
  if (m.startsWith('cygnus-')) variants.push(m.replace(/^cygnus-/, ''));
  if (/^starlink-/.test(m)) variants.push(m);
  if (/crew-/.test(m)) variants.push('nasas-spacex-' + m);
  const all = [];
  for (const v of variants) {
    if (prefix) all.push(prefix + '-' + v);
    all.push(v);
  }
  return [...new Set(all)].filter(x => x.length >= 12 && x.length <= 150).slice(0, 5);
}
function urlForSlug(s) {
  if (!/^[a-z0-9-]{12,150}$/.test(s)) return null;
  return ORIGIN + '/event/' + s + '/';
}
function validatedEventUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.origin !== ORIGIN || u.search || u.hash ||
        !/^\/event\/[a-z0-9-]{5,160}\/?$/.test(u.pathname)) return null;
    return u.origin + u.pathname.replace(/\/?$/, '/');
  } catch { return null; }
}
function missionMatch(launch, title) {
  const marker = exactIdentifier(missionName(launch));
  if (!marker) return false;
  const tokens = slug(String(title || ''));
  // A neighboring mission number must not match via substring:
  // Starlink 10-54 is not Starlink 10-540; Crew-13 is not Crew-130.
  if (!new RegExp('(?:^|-)' + marker + '(?:-|$)').test(tokens)) return false;
  // Distinguish mission family for short, frequently repeated identifiers.
  if (/^lv-\d+/.test(marker)) return /amazon-leo|vulcan/i.test(title) && /amazon leo|vulcan/i.test(launch.name);
  if (/^ng-\d+/.test(marker)) return /cygnus|northrop|falcon/i.test(title);
  return true;
}
function padCode(text) {
  const s = String(text || '').toLowerCase();
  if (/\b(?:launch complex|lc)\s*[- ]?39\s*a\b|\b39a\b/.test(s)) return '39A';
  if (/\b(?:launch complex|lc)\s*[- ]?39\s*b\b|\b39b\b/.test(s)) return '39B';
  const m = s.match(/\b(?:space launch complex|slc)\s*[- ]?(40|41|37|36)\b/);
  return m ? m[1] : null;
}
function eventDateInHeader(html) {
  const cleaned = plain(html);
  const m = cleaned.match(/\bNET\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i);
  if (!m) return null;
  const date = new Date(m[1] + ' ' + m[2] + ', ' + m[3] + ' 12:00:00 GMT');
  return Number.isNaN(+date) ? null : date.toISOString().slice(0, 10);
}
function dateMatches(launch, eventDate, now) {
  if (!eventDate) return false;
  const launchDate = Date.parse(launch?.net || '');
  const published = Date.parse(eventDate + 'T12:00:00Z');
  if (!Number.isFinite(launchDate) || !Number.isFinite(published)) return false;
  const days = Math.abs(published - launchDate) / 86400000;
  const precision = launch?.netPrecision;
  const maxDays = precision === 'year' ? 366 : precision === 'month' ? 42 : 5;
  // An old event from a previous launch attempt is not current, even if its
  // heading still matches the mission identifier.
  return days <= maxDays && published > now - 7 * 86400000;
}
function localTime(str) {
  const m = String(str || '').match(/\b(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)\b/i);
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h < 1 || h > 12 || min > 59) return null;
  return { minutes: (h % 12 + (/^p/i.test(m[3]) ? 12 : 0)) * 60 + min,
    label: h + ':' + m[2] + ' ' + (/^p/i.test(m[3]) ? 'PM' : 'AM') + ' ET' };
}
function officialClockComparison(launch, date, header) {
  const text = plain(header);
  const timeMatch = text.match(/\bNET\b[\s\S]{0,110}?\b\d{4}\b\s+(\d{1,2}:\d{2}\s*[ap]\.?m\.?)/i);
  const clock = timeMatch ? localTime(timeMatch[1]) : null;
  const sourceTime = clock?.label || null;
  const unknown = detail => ({
    state: 'not-comparable', label: 'Official clock comparison unavailable',
    sourceDate: date || null, sourceTime, detail
  });
  if (!date || !clock) return unknown('The official event header does not publish a date and an exact clock time.');
  if (!['second', 'minute'].includes(launch?.netPrecision)) {
    return unknown('The launch schedule does not provide minute-level precision, so no exact-time comparison is possible.');
  }
  const when = Date.parse(launch.net || '');
  if (!Number.isFinite(when)) return unknown('The launch time cannot be parsed.');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(when));
  const n = t => Number(parts.find(x => x.type === t)?.value);
  const ymd = [n('year'), String(n('month')).padStart(2, '0'), String(n('day')).padStart(2, '0')].join('-');
  if (ymd !== date) return {
    state: 'different-day', label: 'KSC event date differs from launch feed',
    sourceDate: date, sourceTime, detail:
      'The official KSC event listing and launch-schedule feed currently show different local dates. Do not commit to arrival times or ticket plans from either alone.'
  };
  const minutes = n('hour') * 60 + n('minute');
  const difference = Math.abs(minutes - clock.minutes);
  if (difference > 15) return {
    state: 'different-time', label: 'KSC event time differs from launch feed',
    sourceDate: date, sourceTime, differenceMinutes: difference,
    detail: 'The official KSC event page and the launch feed differ by more than 15 minutes. Confirm the current target with the operator before travel.'
  };
  return {
    state: 'consistent', label: 'Published times broadly agree',
    sourceDate: date, sourceTime,
    detail: 'This comparison does not confirm launch readiness or ticket inventory; both sources can change.'
  };
}

function venueId(title) {
  const s = String(title || '').toLowerCase();
  // Official KSC event pages sometimes call the Gantry experience simply
  // "LC-39 Launch Transportation Ticket" (CRS-34, NG-24), with no "Gantry"
  // in the heading. Never confuse LC-39A/B pads with this viewing location.
  if (/gantry|(?:^|\b)lc[\s-]?39\s+launch transportation ticket\b/.test(s)) return 'gantry';
  if (/apollo|saturn|banana creek/.test(s)) return 'apollo';
  if (/gateway rooftop/.test(s)) return 'gateway-rooftop';
  if (/visitor complex|atlantis north/.test(s)) return 'visitor';
  if (/feel the heat/.test(s)) return 'feel-the-heat';
  return null;
}
function parseVenue(section) {
  const h = section.match(/<h2\b[^>]*>([\s\S]{0,300}?)<\/h2>/i);
  if (!h) return null;
  const name = plain(h[1]), id = venueId(name);
  if (!id) return null;
  // Current KSC notices place arrival/bus details in <li> for LTTs, but
  // in <p> for packages. Read both and extract times after their own labels.
  const items = [...section.matchAll(/<(li|p)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map(m => plain(m[2])).filter(Boolean);
  const text = plain(section);
  const lower = text.toLowerCase();
  let ticket = 'details-not-verified';
  if (/\bsold\s+out\b/.test(lower)) ticket = 'sold-out-on-page';
  else if (/launch viewing package|feel the heat package/.test(lower)) ticket = 'package-listed';
  else if (/launch transportation ticket|\bltt\b|in addition to admission|\$\s*\d/.test(lower)) ticket = 'additional-ticket-listed';
  else if (/included with admission|included with visitor complex admission/.test(lower)) ticket = 'included-with-admission-listed';

  const CLOCK = String.raw`\d{1,2}:\d{2}\s*[ap]\.?m\.?`;
  const readAfter = (line, prefix) => {
    const m = line.match(new RegExp(prefix + '\\s+(' + CLOCK + ')', 'i'));
    return m ? localTime(m[1]) : null;
  };
  let openAt = null, opensIfDelayedTo = null, closesAt = null, checkInAt = null, busBoardingAt = null;
  for (const item of items) {
    if (/opens?\s+if\s+(?:the\s+)?launch\s+(?:is\s+)?pushed\s+to/i.test(item)) {
      opensIfDelayedTo ||= localTime(item);
    } else if (/viewing area (?:will )?opens?\s+at|viewing area opens?|accessible .* starting at|viewing area will open at|rooftop.*accessible.*starting at/i.test(item)) {
      openAt ||= localTime(item);
    }
    if (/viewing area (?:will )?clos|(?:area )?closes? after launch|if the launch has not occurred by/i.test(item)) {
      const by = item.match(/(?:or\s+at|not occurred by|close(?:s)?\s+(?:to all guests\s+)?at)\s+(\d{1,2}:\d{2}\s*[ap]\.?m\.?)/i)
        || item.match(/(?:by|at)\s+(\d{1,2}:\d{2}\s*[ap]\.?m\.?)(?![\s\S]*\b(?:at|by)\s+\d{1,2}:\d{2}\s*[ap]\.?m\.?)/i);
      if (by) closesAt ||= localTime(by[1]);
    }
    // The two times may appear in the SAME paragraph (Feel the Heat),
    // so do not run localTime(item) for either field: that returns
    // whichever unrelated time happens to appear first.
    checkInAt ||= readAfter(item, '\\bcheck-?in\\b.{0,100}?\\bbegins?\\s+at');
    busBoardingAt ||= readAfter(item, '\\bbus(?:es)?\\s+(?:(?:will\\s+)?begin\\s+boarding|boarding\\s+begins?)\\s+at');
  }
  const transport = /bus transportation through nasa|through nasa.s gates|launch transportation ticket|\bltt\b|bus(?:es)? (?:will )?(?:begin )?boarding/i.test(lower) ?
    'ksc-controlled-bus' :
    /accessible via the kennedy space center bus tour/i.test(lower) ? 'ksc-bus-tour' : 'not-verified';
  const soldOut = ticket === 'sold-out-on-page';
  return {
    id, name,
    ticket, openingAt: openAt?.label || null,
    opensIfDelayedUntil: opensIfDelayedTo?.label || null,
    closesAt: closesAt?.label || null,
    checkInAt: checkInAt?.label || null, busBoardingAt: busBoardingAt?.label || null,
    transport,
    status: soldOut ? 'sold-out-on-source' : opensIfDelayedTo ? 'conditional' : 'listed-on-source',
    note: soldOut ? 'The official mission page says sold out. Verify current inventory with the operator.' :
      opensIfDelayedTo ? 'This area opens only if the launch moves later into the window.' :
      'This area is listed for the mission. Entry, timing and remaining tickets still require confirmation.'
  };
}
function parseEventPage(html, launch, url, now = Date.now()) {
  const source = String(html || '');
  if (source.length < 200 || source.length > MAX_SOURCE_BYTES) return { state: 'unverified', reason: 'source-size' };
  const h1 = source.match(/<h1\b[^>]*class=["'][^"']*\bevent-header__title\b[^"']*["'][^>]*>([\s\S]{0,500}?)<\/h1>/i);
  if (!h1) return { state: 'unverified', reason: 'no-launch-heading' };
  const title = plain(h1[1]);
  if (!missionMatch(launch, title)) return { state: 'unverified', reason: 'wrong-mission' };
  const after = source.slice(source.indexOf(h1[0]) + h1[0].length, source.indexOf(h1[0]) + h1[0].length + 5000);
  const header = after.split(/<(?:section|article|h2)\b/i)[0].slice(0, 2600);
  const sourcePad = padCode(plain(header));
  const selectedPad = padCode(launch?.pad);
  if (sourcePad && selectedPad && sourcePad !== selectedPad)
    return { state: 'unverified', reason: 'pad-conflict' };
  const eventDate = eventDateInHeader(header);
  if (!dateMatches(launch, eventDate, now))
    return { state: 'unverified', reason: 'event-date-unconfirmed-or-stale', sourceTitle: title };
  const sections = [...source.matchAll(/<section\b[^>]*class=["'][^"']*\bwell-block\b[^"']*["'][^>]*>[\s\S]{0,20000}?<\/section>/gi)];
  const venues = sections.map(m => parseVenue(m[0])).filter(Boolean).slice(0, 8);
  if (!venues.length) return { state: 'unverified', reason: 'no-venue-details', sourceTitle: title };
  const upperPad = (selectedPad === '39A' || selectedPad === '39B');
  if (upperPad) {
    for (const v of venues) if (v.id === 'gantry') {
      v.status = 'safety-exclusion'; v.note = 'Gantry viewing is excluded for LC-39A and LC-39B launches under KSC safety rules.';
    }
  }
  return {
    state: 'matched', eventTitle: title, eventDate,
    sourceUrl: url, sourcePad: sourcePad || null,
    officialTiming: officialClockComparison(launch, eventDate, header),
    venues, checkedAt: new Date(now).toISOString(),
    note: 'Mission-specific KSC listing matched by mission name, schedule date and compatible pad. Viewing is subject to operator changes; ticket inventory is not checked in real time.'
  };
}
function resultUnverified(checkedAt, reason, checked = 0) {
  return {
    state: 'unverified', checkedAt, sourceUrl: null, venues: [], checked,
    reason: reason || 'no-current-mission-listing-verified',
    calendarUrl: CALENDAR,
    note: 'No current official mission-specific KSC viewing page could be verified. This does not mean the launch is cancelled, no viewing is offered or tickets are sold out.'
  };
}
async function fetchText(url, timeoutMs = 3500, fetcher = fetch) {
  const validated = validatedEventUrl(url);
  if (!validated) throw new Error('unapproved-origin');
  const resp = await fetcher(validated, {
    headers: { Accept: 'text/html', 'User-Agent': 'ChrisIzworskiLaunchViewer/1.0 (chrisizworski.com)' },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!resp.ok) throw new Error('event-status-' + resp.status);
  const size = Number(resp.headers?.get?.('content-length') || 0);
  if (size > MAX_SOURCE_BYTES) throw new Error('event-too-large');
  const body = await resp.text();
  if (body.length > MAX_SOURCE_BYTES) throw new Error('event-too-large');
  return body;
}
async function sitemapCandidates(launch, fetcher = fetch) {
  const marker = exactIdentifier(missionName(launch));
  if (!marker) return [];
  const response = await fetcher(ORIGIN + '/sitemap.xml', {
    headers: { Accept: 'application/xml', 'User-Agent': 'ChrisIzworskiLaunchViewer/1.0 (chrisizworski.com)' },
    signal: AbortSignal.timeout(3500)
  });
  if (!response.ok) throw new Error('sitemap-status-' + response.status);
  const length = Number(response.headers?.get?.('content-length') || 0);
  if (length > 2800000) throw new Error('sitemap-too-large');
  const xml = await response.text();
  if (xml.length > 2800000) throw new Error('sitemap-too-large');
  const matches = [];
  for (const m of xml.matchAll(/<loc>\s*(https:\/\/www\.kennedyspacecenter\.com\/event\/[a-z0-9-]+\/?)\s*<\/loc>/gi)) {
    const url = validatedEventUrl(m[1]); if (!url) continue;
    const pathSlug = url.split('/event/')[1].replace(/\//g, '');
    if (!pathSlug.includes(marker)) continue;
    matches.push(url);
    if (matches.length >= 15) break;
  }
  return [...new Set(matches)].slice(0, 5);
}
// KSC's official Events Calendar publishes event records as a double-encoded
// eventsDataString. Its public sitemap currently does not enumerate /event/
// pages, and the operator may choose a slug we cannot predict. Only trust the
// calendar for *discovery*: the linked mission page must still pass all the
// existing identity, pad, date, and actual viewing-details checks.
function calendarEventCandidates(launch, html) {
  const content = String(html || '');
  if (!content || content.length > MAX_SOURCE_BYTES) throw new Error('calendar-source-size');
  const embedded = content.match(/\beventsDataString\s*=\s*("(?:\\.|[^"\\])*")\s*;/);
  if (!embedded) throw new Error('calendar-event-records-missing');
  let events;
  try {
    events = JSON.parse(JSON.parse(embedded[1]));
  } catch {
    throw new Error('calendar-event-records-invalid');
  }
  if (!Array.isArray(events) || events.length > 3000) throw new Error('calendar-event-list-invalid');
  const marker = exactIdentifier(missionName(launch));
  if (!marker) return [];
  const matches = [];
  for (const event of events) {
    if (!event || typeof event.url !== 'string') continue;
    let url;
    try {
      url = validatedEventUrl(new URL(event.url, ORIGIN).href);
    } catch { continue; }
    if (!url) continue;
    const title = [event.prefix, event.title, event.suffix].filter(Boolean).join(' ');
    const pathSlug = url.split('/event/')[1].replace(/\//g, '');
    if (!missionMatch(launch, title) && !pathSlug.includes(marker)) continue;
    if (!matches.includes(url)) matches.push(url);
    if (matches.length >= LIMIT_LOOKUPS) break;
  }
  return matches;
}

async function calendarCandidates(launch, fetcher = fetch) {
  if (!exactIdentifier(missionName(launch))) return [];
  const response = await fetcher(CALENDAR, {
    headers: { Accept: 'text/html', 'User-Agent': 'ChrisIzworskiLaunchViewer/1.0 (chrisizworski.com)' },
    signal: AbortSignal.timeout(3500)
  });
  if (!response.ok) throw new Error('calendar-status-' + response.status);
  const length = Number(response.headers?.get?.('content-length') || 0);
  if (length > MAX_SOURCE_BYTES) throw new Error('calendar-too-large');
  const html = await response.text();
  if (html.length > MAX_SOURCE_BYTES) throw new Error('calendar-too-large');
  return calendarEventCandidates(launch, html);
}

async function inspectKscLaunch(launch, fetcher = fetch, now = Date.now()) {
  const checkedAt = new Date(now).toISOString();
  const net = Date.parse(launch?.net || '');
  if (!launch || !Number.isFinite(net) || net < now - 86400000 ||
      net > now + 180 * 86400000 || !exactIdentifier(missionName(launch))) {
    return resultUnverified(checkedAt, 'mission-not-ready-for-official-matching');
  }
  const inspected = new Set();
  let reason = 'no-current-mission-listing-verified';
  async function probe(url) {
    if (!url || inspected.has(url) || inspected.size >= LIMIT_LOOKUPS) return null;
    inspected.add(url);
    try {
      const html = await fetchText(url, 3500, fetcher);
      const result = parseEventPage(html, launch, url, now);
      if (result.state === 'matched') return { ...result, checked: inspected.size, calendarUrl: CALENDAR };
      reason = result.reason || reason;
    } catch (e) {
      reason = 'not-published-or-unavailable';
    }
    return null;
  }
  const slugs = candidateSlugs(launch);
  const direct = slugs.map(urlForSlug).filter(Boolean);
  // Check the operator's live calendar while probing two likely URLs. The
  // official calendar takes priority over sitemap and guessed slug fallbacks
  // for the remaining bounded lookups. None are linked without page proof.
  const [first, calendar, discovered] = await Promise.all([
    Promise.all(direct.slice(0, 2).map(probe)),
    calendarCandidates(launch, fetcher)
      .then(urls => ({ checked: true, urls }))
      .catch(() => ({ checked: false, urls: [] })),
    sitemapCandidates(launch, fetcher).catch(() => [])
  ]);
  const officialCalendar = {
    status: calendar.checked ? 'checked' : 'unavailable',
    checkedAt, sourceUrl: CALENDAR
  };
  const matched = first.find(Boolean);
  if (matched) return { ...matched, officialCalendar };
  const candidates = [...new Set([...calendar.urls, ...discovered, ...direct.slice(2)])]
    .filter(x => !inspected.has(x)).slice(0, Math.max(0, LIMIT_LOOKUPS - inspected.size));
  const second = await Promise.all(candidates.map(probe));
  const result = second.find(Boolean) || resultUnverified(checkedAt, reason, inspected.size);
  return { ...result, officialCalendar };
}

module.exports = {
  ORIGIN, CALENDAR, VIEWING_INFO, plain, slug, exactIdentifier,
  missionMatch, candidateSlugs, validatedEventUrl, eventDateInHeader,
  dateMatches, padCode, localTime, officialClockComparison, venueId, parseVenue, parseEventPage,
  sitemapCandidates, calendarEventCandidates, calendarCandidates, inspectKscLaunch
};

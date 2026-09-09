const LAT = 38.86917;
const LON = -90.15361;
const TZ = 'America/Chicago';

const LOCK_STATUS_URL = 'https://ndc.ops.usace.army.mil/ords/lpms/lock_status_report_json?in_river_code=MI';
const CORPS_LOCKS_URL = 'https://ndc.ops.usace.army.mil/ords/r/lpms/corps-locks/home';
const NTNI_URL = 'https://ndc.ops.usace.army.mil/ords/ntni/json_data/notices_by_district/MVS';
const NTNI_PAGE = 'https://ndc.ops.usace.army.mil/ords/r/ntni/notices';
const NGRM_URL = 'https://www.mvs.usace.army.mil/Missions/Recreation/Rivers-Project-Office/NGRM/';
const EDUCATION_URL = 'https://www.mvs.usace.army.mil/Missions/Recreation/Rivers-Project-Office/Education/';
const FACILITY_URL = 'https://www.mvs.usace.army.mil/Missions/Navigation/Locks-and-Dams/Melvin-Price/';
const WATER_PAGE = 'https://water.usace.army.mil/office/mvs/reports/chart?basin=Mississippi&tsid1=Mel+Price+TW-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev&type=macro';
const CWMS = 'https://cwms-data.usace.army.mil/cwms-data/timeseries';
const STAGE_TSID = 'Mel Price TW-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev';
const FLOW_TSID = 'Mel Price TW-Mississippi.Flow.Inst.30Minutes.0.RatingCOE';
const UA = 'MelvinPriceLive/1.2 (+https://chrisizworski.com/melvin-price/)';

async function get(url, type = 'json', timeout = 3500, extraHeaders = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': UA,
        accept: type === 'json' ? 'application/json' : '*/*',
        ...extraHeaders,
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
    return type === 'text' ? response.text() : response.json();
  } finally {
    clearTimeout(timer);
  }
}

function n(value) {
  if (value == null || value === '') return null;
  const out = Number(value);
  return Number.isFinite(out) ? out : null;
}

function sanitizeJsonControlChars(raw) {
  let out = '';
  let inString = false;
  let escaped = false;
  for (const ch of String(raw ?? '')) {
    const code = ch.charCodeAt(0);
    if (!inString) {
      out += ch;
      if (ch === '"') inString = true;
      continue;
    }
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      out += ch;
      inString = false;
      continue;
    }
    if (code >= 0 && code <= 0x1f) {
      if (ch === '\n') out += '\\n';
      else if (ch === '\r') out += '\\r';
      else if (ch === '\t') out += '\\t';
      else out += `\\u${code.toString(16).padStart(4, '0')}`;
      continue;
    }
    out += ch;
  }
  return out;
}

function parseLooseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch (firstError) {
    const cleaned = sanitizeJsonControlChars(raw);
    try {
      return JSON.parse(cleaned);
    } catch (secondError) {
      secondError.message = `USACE JSON parse failed after control-character repair: ${secondError.message}`;
      throw secondError;
    }
  }
}

function localParts(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(date).map(x => [x.type, x.value]));
  return {
    year: +parts.year,
    month: +parts.month,
    day: +parts.day,
    hour: +(parts.hour === '24' ? 0 : parts.hour),
    minute: +parts.minute,
    second: +parts.second,
  };
}

function localTime(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(date);
}

function parseLpmsStamp(value, now = new Date()) {
  const match = /^(\d{2})(\d{2})(\d{2}):(\d{2})(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const yy = 2000 + Number(match[1]);
  const mo = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const label = `${String(mo).padStart(2, '0')}/${String(day).padStart(2, '0')}/${yy} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} CT`;
  const nowP = localParts(now);
  const roughMs = Date.UTC(yy, mo - 1, day, hour, minute) - Date.UTC(nowP.year, nowP.month - 1, nowP.day, nowP.hour, nowP.minute);
  return { raw: value, label, ageMinutes: Math.max(0, Math.round(-roughMs / 60000)) };
}

function findRecords(root, predicate, out = []) {
  if (Array.isArray(root)) {
    for (const item of root) findRecords(item, predicate, out);
    return out;
  }
  if (!root || typeof root !== 'object') return out;
  if (predicate(root)) out.push(root);
  for (const value of Object.values(root)) findRecords(value, predicate, out);
  return out;
}

function normalizeLock(row, now) {
  if (!row) return null;
  return {
    lockNumber: String(row.lockNumber ?? ''),
    name: row.lockName || null,
    mile: n(row.lockMile),
    observedAt: parseLpmsStamp(row.readingEntryDateTime, now),
    upperElevationFt: n(row.gageUpperElevation),
    upperChangeFt: n(row.gageUpperElevationChange),
    lowerElevationFt: n(row.gageLowerElevation),
    lowerChangeFt: n(row.gageLowerElevationChange),
    pendingArrivals: n(row.totalPendingArrivals),
    lockingNow: n(row.totalLocking),
    lockedUp24h: n(row.totalLockedUp24Hours),
    lockedDown24h: n(row.totalLockedDown24Hours),
    averageDelayMinutes24h: n(row.average24HourDelay),
    damCondition: row.damCondition == null ? null : String(row.damCondition).trim(),
    airTemperatureF: n(row.airTemparture ?? row.airTemperature),
    waterTemperatureF: n(row.waterTemperature),
    precipitationIn: n(row.precipitation),
    weatherCode: row.weatherCode || null,
    notes: String(row.notes || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim(),
  };
}

function unavailableLocks(reason = 'USACE LPMS request exceeded the live-page deadline') {
  return {
    ok: false,
    freshness: 'UNAVAILABLE',
    source: 'USACE Lock Performance Monitoring System (LPMS)',
    url: CORPS_LOCKS_URL,
    error: reason,
  };
}

async function lockStatus(now = new Date()) {
  try {
    // The LPMS endpoint currently emits literal CR/LF control characters inside quoted notes.
    // Read as text and repair only control characters that occur inside JSON strings.
    const raw = await get(LOCK_STATUS_URL, 'text', 4500, { accept: 'application/json,text/plain,*/*' });
    const data = parseLooseJson(raw);
    const records = findRecords(data, x => x && x.lockNumber != null && x.lockName != null);
    const byNo = new Map(records.map(row => [String(row.lockNumber), normalizeLock(row, now)]));
    const melvin = byNo.get('26');
    if (!melvin) throw new Error('Mel Price lock record not found in Mississippi River response');
    const age = melvin.observedAt?.ageMinutes ?? null;
    return {
      ok: true,
      freshness: age == null ? 'RECENT' : age <= 45 ? 'LIVE' : age <= 180 ? 'DELAYED' : 'STALE',
      melvin,
      adjacent: { upstream: byNo.get('25') || null, downstream: byNo.get('27') || null },
      source: 'USACE Lock Performance Monitoring System (LPMS)',
      cadence: '15 minutes',
      url: CORPS_LOCKS_URL,
      dataUrl: LOCK_STATUS_URL,
      caveat: 'Counts and status are operational reports, not exact AIS positions. Pending arrivals do not identify an individual tow in this endpoint.',
    };
  } catch (error) {
    return unavailableLocks(error.message);
  }
}

function parseCwmsValues(data) {
  const candidates = findRecords(data, x => Array.isArray(x?.values));
  for (const candidate of candidates) {
    const rows = candidate.values.map(value => {
      if (Array.isArray(value)) {
        const at = typeof value[0] === 'number' ? new Date(value[0]).toISOString() : String(value[0] || '');
        return { at, value: n(value[1]) };
      }
      if (value && typeof value === 'object') {
        return { at: value.dateTime || value['date-time'] || value.time || null, value: n(value.value) };
      }
      return null;
    }).filter(x => x?.at && x.value != null && Number.isFinite(Date.parse(x.at)));
    if (rows.length) return rows.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  }
  if (Array.isArray(data?.values)) {
    return data.values.map(value => Array.isArray(value) ? { at: new Date(value[0]).toISOString(), value: n(value[1]) } : null).filter(Boolean);
  }
  return [];
}

async function cwmsSeries(name, unit, timeout = 3500) {
  const qs = new URLSearchParams({ name, office: 'MVS', unit, begin: 'PT-26H' });
  const data = await get(`${CWMS}?${qs}`, 'json', timeout, { accept: 'application/json;version=2' });
  const rows = parseCwmsValues(data);
  if (!rows.length) throw new Error(`No values returned for ${name}`);
  const latest = rows[rows.length - 1];
  const prior = rows.filter(x => Date.parse(x.at) <= Date.parse(latest.at) - 23 * 3600000).slice(-1)[0] || rows[0];
  return {
    latest,
    delta24h: Math.round((latest.value - prior.value) * 100) / 100,
    recent: rows.slice(-49),
  };
}

function discoverTsid(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`href=["']([^"']*tsid1=([^"'&]+)[^"']*)["'][^>]*>[^<]*${escaped}[^<]*<`, 'i');
  const match = re.exec(html);
  if (!match) return null;
  try { return decodeURIComponent(match[2].replace(/\+/g, ' ')); } catch { return match[2].replace(/\+/g, ' '); }
}

async function riverStage() {
  try {
    const series = await cwmsSeries(STAGE_TSID, 'ft', 3500);
    const delta = series.delta24h;
    return {
      ok: true,
      valueFt: series.latest.value,
      observedAt: series.latest.at,
      delta24hFt: delta,
      trend: delta > 0.08 ? 'rising' : delta < -0.08 ? 'falling' : 'steady',
      recent: series.recent,
      tsid: STAGE_TSID,
      label: 'Mel Price tailwater stage',
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function riverFlow() {
  try {
    // Exact current Corps-rated flow series discovered through the CWMS timeseries catalog.
    const series = await cwmsSeries(FLOW_TSID, 'cfs', 3500);
    return {
      ok: true,
      valueCfs: Math.round(series.latest.value),
      observedAt: series.latest.at,
      delta24hCfs: Math.round(series.delta24h),
      tsid: FLOW_TSID,
      label: 'Mel Price tailwater flow',
    };
  } catch (error) {
    return { ok: false, error: error.message, tsid: FLOW_TSID };
  }
}

async function river() {
  const [stage, flow] = await Promise.all([riverStage(), riverFlow()]);
  return {
    ok: Boolean(stage.ok || flow.ok),
    stage,
    flow,
    source: 'USACE St. Louis District / CWMS Data API',
    url: WATER_PAGE,
  };
}

async function weather() {
  try {
    const point = await get(`https://api.weather.gov/points/${LAT},${LON}`, 'json', 2500);
    const hourlyUrl = point?.properties?.forecastHourly;
    if (!hourlyUrl) throw new Error('NWS hourly forecast URL missing');
    const data = await get(hourlyUrl, 'json', 2500);
    const period = data?.properties?.periods?.[0];
    if (!period) throw new Error('NWS hourly period missing');
    return {
      ok: true,
      temperatureF: period.temperature,
      windSpeed: period.windSpeed,
      windDirection: period.windDirection,
      precipitationProbability: period.probabilityOfPrecipitation?.value ?? null,
      shortForecast: period.shortForecast || 'Current NWS conditions',
      validFrom: period.startTime,
      source: 'National Weather Service',
      url: `https://forecast.weather.gov/MapClick.php?lat=${LAT}&lon=${LON}`,
    };
  } catch (error) {
    return { ok: false, source: 'National Weather Service', error: error.message, url: `https://forecast.weather.gov/MapClick.php?lat=${LAT}&lon=${LON}` };
  }
}

function museumAndTours(now = new Date()) {
  const parts = localParts(now);
  const minutes = parts.hour * 60 + parts.minute;
  const museumOpen = minutes >= 9 * 60 && minutes < 17 * 60;
  const tourMinutes = [10 * 60, 13 * 60, 15 * 60];
  const next = tourMinutes.find(value => value > minutes);
  const nextTour = next == null ? null : new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(2020, 0, 1, Math.floor(next / 60), next % 60));
  return {
    museumOpen,
    museumHours: '9:00 AM–5:00 PM daily',
    admission: 'Free',
    scheduledTours: ['10:00 AM', '1:00 PM', '3:00 PM'],
    nextTour,
    minutesUntilNextTour: next == null ? null : next - minutes,
    source: 'U.S. Army Corps of Engineers — National Great Rivers Museum',
    url: NGRM_URL,
    tourSource: EDUCATION_URL,
    caveat: 'These are the normal published walk-in tour times. Operational, maintenance, weather or security conditions can change access; scheduled is not the same as confirmed.',
  };
}

function itemText(item) {
  return JSON.stringify(item || {}).toLowerCase();
}

function normalizeNotice(item) {
  const number = item.noticeno || item.noticeNumber || item.notice_number || null;
  const title = item.title || item.noticeTitle || item.notice_title || item.subject || item.description || item.nav_notice_title || (number ? `Notice ${number}` : 'USACE navigation notice');
  return {
    title: String(title).replace(/\s+/g, ' ').trim(),
    number,
    issuedAt: item.issuedate || item.issueDate || item.issue_date || null,
    beginsAt: item.begindate || item.beginDate || item.begin_date || null,
    waterways: item.waterways || null,
    url: item.noticelink || item.url || item.noticeUrl || item.notice_url || item.link || item.href || null,
  };
}

async function notices() {
  try {
    const data = await get(NTNI_URL, 'json', 2800);
    const items = Array.isArray(data) ? data : (data?.items || data?.notices || data?.results || []);
    if (!Array.isArray(items)) throw new Error('Unexpected NTNI response shape');
    const relevant = items.filter(item => {
      const text = itemText(item);
      return text.includes('mi26') || text.includes('mi 26') || text.includes('melvin price') || text.includes('mel price') || text.includes('pool_26') || text.includes('pool 26') || text.includes('200.5');
    }).slice(0, 6).map(normalizeNotice);
    return {
      ok: true,
      count: relevant.length,
      items: relevant,
      source: 'USACE Notices to Navigation Interests (St. Louis District)',
      url: NTNI_PAGE,
      dataUrl: NTNI_URL,
    };
  } catch (error) {
    return { ok: false, count: 0, items: [], source: 'USACE Notices to Navigation Interests (St. Louis District)', error: error.message, url: NTNI_PAGE };
  }
}

function trafficSnapshot(lock) {
  if (!lock) return null;
  const up = lock.lockedUp24h ?? 0;
  const down = lock.lockedDown24h ?? 0;
  return {
    pending: lock.pendingArrivals,
    locking: lock.lockingNow,
    up24h: up,
    down24h: down,
    total24h: up + down,
    averageDelayMinutes24h: lock.averageDelayMinutes24h,
  };
}

function scoreVisit({ locks, wx, tours, nav }) {
  if (!locks.ok) return { score: null, label: 'DATA LIMITED', confidence: 'Low', reasons: ['Live USACE lock traffic is temporarily unavailable.'] };
  const melvin = locks.melvin;
  let score = 35;
  const reasons = [];
  const active = (melvin.pendingArrivals || 0) + (melvin.lockingNow || 0);
  const total24 = (melvin.lockedUp24h || 0) + (melvin.lockedDown24h || 0);

  if (melvin.lockingNow > 0) {
    score += 27;
    reasons.push(`${melvin.lockingNow} vessel${melvin.lockingNow === 1 ? '' : 's'} reported locking now`);
  } else if (melvin.pendingArrivals > 0) {
    score += Math.min(24, 12 + melvin.pendingArrivals * 4);
    reasons.push(`${melvin.pendingArrivals} pending arrival${melvin.pendingArrivals === 1 ? '' : 's'} reported`);
  } else {
    score += Math.min(14, total24);
    reasons.push(`${total24} lockages reported in the last 24 hours`);
  }

  if (tours.museumOpen && tours.minutesUntilNextTour != null && tours.minutesUntilNextTour <= 90) {
    score += 14;
    reasons.push(`next scheduled free tour is ${tours.nextTour}`);
  } else if (tours.museumOpen) {
    score += 7;
    reasons.push('National Great Rivers Museum is open');
  }

  if (wx.ok) {
    const rain = wx.precipitationProbability ?? 0;
    if (rain <= 25) {
      score += 9;
      reasons.push(`${String(wx.shortForecast || 'favorable weather').toLowerCase()} for viewing`);
    } else if (rain >= 70) {
      score -= 8;
      reasons.push('rain is likely during the current hour');
    }
  }

  if (nav.ok && nav.count > 0) {
    score -= Math.min(8, nav.count * 2);
    reasons.push(`${nav.count} active navigation notice${nav.count === 1 ? '' : 's'} may affect operations`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = score >= 82 ? 'EXCELLENT' : score >= 68 ? 'GOOD' : score >= 50 ? 'FAIR' : active > 0 ? 'FAIR' : 'QUIET';
  const liveFeeds = [locks.ok, wx.ok, nav.ok].filter(Boolean).length;
  const confidence = locks.freshness === 'STALE' ? 'Low' : liveFeeds === 3 ? 'High' : liveFeeds === 2 ? 'Moderate' : 'Low';
  return { score, label, confidence, reasons: reasons.slice(0, 4) };
}

function within(promise, ms, fallback) {
  let timer;
  const deadline = new Promise(resolve => {
    timer = setTimeout(() => resolve(typeof fallback === 'function' ? fallback() : fallback), ms);
  });
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    deadline,
  ]);
}

async function build(now = new Date()) {
  const tours = museumAndTours(now);
  const [locks, wx, riverData, nav] = await Promise.all([
    within(lockStatus(now), 5600, () => unavailableLocks()),
    within(weather(), 5600, () => ({ ok: false, source: 'National Weather Service', error: 'NWS request exceeded the live-page deadline', url: `https://forecast.weather.gov/MapClick.php?lat=${LAT}&lon=${LON}` })),
    within(river(), 5600, () => ({ ok: false, stage: { ok: false, error: 'CWMS request exceeded the live-page deadline' }, flow: { ok: false, error: 'CWMS request exceeded the live-page deadline' }, source: 'USACE St. Louis District / CWMS Data API', url: WATER_PAGE })),
    within(notices(), 4200, () => ({ ok: false, count: 0, items: [], source: 'USACE Notices to Navigation Interests (St. Louis District)', error: 'NTNI request exceeded the live-page deadline', url: NTNI_PAGE })),
  ]);

  return {
    generatedAt: now.toISOString(),
    localTime: localTime(now),
    location: { name: 'Melvin Price Locks and Dam', city: 'East Alton', state: 'IL', lat: LAT, lon: LON, riverMile: 200.5 },
    facility: {
      mainChamber: { lengthFt: 1200, widthFt: 110 },
      auxiliaryChamber: { lengthFt: 600, widthFt: 110 },
      averageLiftFt: 15,
      tainterGates: 9,
      damLengthFt: 1160,
      annual2024: { tonnage: 45857531, lockages: 4797 },
      source: 'U.S. Army Corps of Engineers, St. Louis District',
      url: FACILITY_URL,
    },
    locks,
    traffic: locks.ok ? {
      melvin: trafficSnapshot(locks.melvin),
      pipeline: {
        upstreamLock25: trafficSnapshot(locks.adjacent?.upstream),
        melvinPrice: trafficSnapshot(locks.melvin),
        downstreamLock27: trafficSnapshot(locks.adjacent?.downstream),
        caveat: 'Pipeline cards show confirmed LPMS activity at each lock, not continuous vessel positions or a guarantee that a vessel at an adjacent lock is bound for Melvin Price.',
      },
    } : null,
    river: riverData,
    weather: wx,
    tours,
    notices: nav,
    visit: scoreVisit({ locks, wx, tours, nav }),
    vessels: {
      mode: 'AIS map + LPMS operational counts',
      exactTowIdentityAvailable: false,
      note: 'The embedded AIS map can show AIS-equipped vessel names and positions. The USACE status feed supplies authoritative operational counts but this endpoint does not expose the individual queued tow names, so Melvin Price Live does not manufacture them.',
    },
  };
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
    res.end(JSON.stringify({ error: 'Melvin Price live data unavailable', detail: error.message }));
  }
}

module.exports = handler;
module.exports._test = {
  n,
  sanitizeJsonControlChars,
  parseLooseJson,
  localParts,
  parseLpmsStamp,
  findRecords,
  normalizeLock,
  parseCwmsValues,
  discoverTsid,
  normalizeNotice,
  museumAndTours,
  trafficSnapshot,
  scoreVisit,
  within,
  build,
  STAGE_TSID,
  FLOW_TSID,
};
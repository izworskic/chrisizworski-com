const LAT = 38.86917;
const LON = -90.15361;
const TZ = 'America/Chicago';
const LOCK_STATUS_URL = 'https://ndc.ops.usace.army.mil/ords/lpms/lock_status_report_json?in_river_code=MI';
const CORPS_LOCKS_URL = 'https://ndc.ops.usace.army.mil/ords/r/lpms/corps-locks/home';
const NTNI_URL = 'https://ndc.ops.usace.army.mil/ords/ntni/json_data/notices_by_district/MVS';
const NGRM_URL = 'https://www.mvs.usace.army.mil/Missions/Recreation/Rivers-Project-Office/NGRM/';
const EDUCATION_URL = 'https://www.mvs.usace.army.mil/Missions/Recreation/Rivers-Project-Office/Education/';
const FACILITY_URL = 'https://www.mvs.usace.army.mil/Missions/Navigation/Locks-and-Dams/Melvin-Price/';
const WATER_PAGE = 'https://water.usace.army.mil/office/mvs/reports/chart?basin=Mississippi&tsid1=Mel+Price+TW-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev&type=macro';
const CWMS = 'https://cwms-data.usace.army.mil/cwms-data/timeseries';
const STAGE_TSID = 'Mel Price TW-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev';
const UA = 'MelvinPriceLive/1.0 (+https://chrisizworski.com/melvin-price/)';

async function get(url, type = 'json', timeout = 7000, extraHeaders = {}) {
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), timeout);
  try {
    const r = await fetch(url, {
      headers: { 'user-agent': UA, accept: type === 'json' ? 'application/json' : '*/*', ...extraHeaders },
      signal: c.signal,
    });
    if (!r.ok) throw new Error(`${new URL(url).hostname} returned ${r.status}`);
    return type === 'text' ? r.text() : r.json();
  } finally {
    clearTimeout(timer);
  }
}

function n(v) {
  if (v == null || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
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
  const m = /^(\d{2})(\d{2})(\d{2}):(\d{2})(\d{2})$/.exec(String(value || '').trim());
  if (!m) return null;
  const yy = 2000 + Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const min = Number(m[5]);
  // LPMS timestamps are operational-local. Return a human-readable local stamp and an age estimate
  // computed in the current Central offset rather than silently claiming UTC precision.
  const label = `${String(mo).padStart(2,'0')}/${String(d).padStart(2,'0')}/${yy} ${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')} CT`;
  const nowP = localParts(now);
  const roughMs = Date.UTC(yy, mo - 1, d, h, min) - Date.UTC(nowP.year, nowP.month - 1, nowP.day, nowP.hour, nowP.minute);
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
  const stamp = parseLpmsStamp(row.readingEntryDateTime, now);
  return {
    lockNumber: String(row.lockNumber ?? ''),
    name: row.lockName || null,
    mile: n(row.lockMile),
    observedAt: stamp,
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
    notes: row.notes || '',
  };
}

async function lockStatus(now = new Date()) {
  try {
    const data = await get(LOCK_STATUS_URL);
    const records = findRecords(data, x => x && x.lockNumber != null && x.lockName != null);
    const byNo = new Map(records.map(r => [String(r.lockNumber), normalizeLock(r, now)]));
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
  } catch (e) {
    return { ok: false, freshness: 'UNAVAILABLE', source: 'USACE Lock Performance Monitoring System (LPMS)', url: CORPS_LOCKS_URL, error: e.message };
  }
}

function parseCwmsValues(data) {
  const candidates = findRecords(data, x => Array.isArray(x?.values));
  for (const c of candidates) {
    const rows = c.values.map(v => {
      if (Array.isArray(v)) {
        const t = typeof v[0] === 'number' ? new Date(v[0]).toISOString() : String(v[0] || '');
        return { at: t, value: n(v[1]) };
      }
      if (v && typeof v === 'object') return { at: v.dateTime || v['date-time'] || v.time || null, value: n(v.value) };
      return null;
    }).filter(x => x?.at && x.value != null && Number.isFinite(Date.parse(x.at)));
    if (rows.length) return rows.sort((a,b) => Date.parse(a.at) - Date.parse(b.at));
  }
  if (Array.isArray(data?.values)) {
    return data.values.map(v => Array.isArray(v) ? { at: new Date(v[0]).toISOString(), value: n(v[1]) } : null).filter(Boolean);
  }
  return [];
}

async function cwmsSeries(name, unit) {
  const qs = new URLSearchParams({ name, office: 'MVS', unit, begin: 'PT-26H' });
  const data = await get(`${CWMS}?${qs}`, 'json', 8000, { accept: 'application/json;version=2' });
  const rows = parseCwmsValues(data);
  if (!rows.length) throw new Error(`No values returned for ${name}`);
  const latest = rows[rows.length - 1];
  const prior = rows.filter(x => Date.parse(x.at) <= Date.parse(latest.at) - 23 * 3600000).slice(-1)[0] || rows[0];
  const delta24h = Math.round((latest.value - prior.value) * 100) / 100;
  return { latest, delta24h, recent: rows.slice(-49) };
}

function discoverTsid(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`href=["']([^"']*tsid1=([^"'&]+)[^"']*)["'][^>]*>[^<]*${escaped}[^<]*<`, 'i');
  const m = re.exec(html);
  if (!m) return null;
  try { return decodeURIComponent(m[2].replace(/\+/g, ' ')); } catch { return m[2].replace(/\+/g, ' '); }
}

async function river() {
  const result = {
    ok: false,
    stage: null,
    flow: null,
    source: 'USACE St. Louis District / CWMS Data API',
    url: WATER_PAGE,
  };
  try {
    const s = await cwmsSeries(STAGE_TSID, 'ft');
    result.stage = { ok: true, valueFt: s.latest.value, observedAt: s.latest.at, delta24hFt: s.delta24h, trend: s.delta24h > 0.08 ? 'rising' : s.delta24h < -0.08 ? 'falling' : 'steady', recent: s.recent };
    result.ok = true;
  } catch (e) {
    result.stage = { ok: false, error: e.message };
  }

  try {
    const html = await get(WATER_PAGE, 'text', 7000);
    const flowTsid = discoverTsid(html, 'Mel Price TW - Flow');
    if (!flowTsid) throw new Error('Flow time-series identifier not discoverable from official water page');
    const f = await cwmsSeries(flowTsid, 'cfs');
    result.flow = { ok: true, valueCfs: Math.round(f.latest.value), observedAt: f.latest.at, delta24hCfs: Math.round(f.delta24h), tsid: flowTsid };
  } catch (e) {
    result.flow = { ok: false, error: e.message };
  }
  return result;
}

async function weather() {
  try {
    const point = await get(`https://api.weather.gov/points/${LAT},${LON}`);
    const hourlyUrl = point?.properties?.forecastHourly;
    if (!hourlyUrl) throw new Error('NWS hourly forecast URL missing');
    const data = await get(hourlyUrl);
    const p = data?.properties?.periods?.[0];
    if (!p) throw new Error('NWS hourly period missing');
    return {
      ok: true,
      temperatureF: p.temperature,
      windSpeed: p.windSpeed,
      windDirection: p.windDirection,
      precipitationProbability: p.probabilityOfPrecipitation?.value ?? null,
      shortForecast: p.shortForecast,
      validFrom: p.startTime,
      source: 'National Weather Service',
      url: `https://forecast.weather.gov/MapClick.php?lat=${LAT}&lon=${LON}`,
    };
  } catch (e) {
    return { ok: false, source: 'National Weather Service', error: e.message, url: `https://forecast.weather.gov/MapClick.php?lat=${LAT}&lon=${LON}` };
  }
}

function museumAndTours(now = new Date()) {
  const p = localParts(now);
  const minutes = p.hour * 60 + p.minute;
  const museumOpen = minutes >= 9 * 60 && minutes < 17 * 60;
  const tourMinutes = [10 * 60, 13 * 60, 15 * 60];
  const next = tourMinutes.find(x => x > minutes);
  const label = next == null ? null : new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(2020,0,1,Math.floor(next/60),next%60));
  return {
    museumOpen,
    museumHours: '9:00 AM–5:00 PM daily',
    admission: 'Free',
    scheduledTours: ['10:00 AM','1:00 PM','3:00 PM'],
    nextTour: label,
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

function noticeTitle(item) {
  return item.title || item.noticeTitle || item.notice_title || item.subject || item.description || item.nav_notice_title || `Navigation notice ${item.noticeNumber || item.notice_number || ''}`.trim();
}

function noticeUrl(item) {
  return item.url || item.noticeUrl || item.notice_url || item.link || item.href || null;
}

async function notices() {
  try {
    const data = await get(NTNI_URL);
    const items = Array.isArray(data) ? data : (data?.items || data?.notices || data?.results || []);
    const relevant = items.filter(item => {
      const t = itemText(item);
      return t.includes('mi26') || t.includes('mi 26') || t.includes('melvin price') || t.includes('mel price') || t.includes('pool_26') || t.includes('pool 26') || t.includes('200.5');
    }).slice(0, 6).map(item => ({ title: String(noticeTitle(item)).replace(/\s+/g,' ').trim(), url: noticeUrl(item), raw: item }));
    return { ok: true, count: relevant.length, items: relevant, source: 'USACE Notices to Navigation Interests (St. Louis District)', url: 'https://ndc.ops.usace.army.mil/ords/r/ntni/notices', dataUrl: NTNI_URL };
  } catch (e) {
    return { ok: false, count: 0, items: [], source: 'USACE Notices to Navigation Interests (St. Louis District)', error: e.message, url: 'https://ndc.ops.usace.army.mil/ords/r/ntni/notices' };
  }
}

function trafficSnapshot(lock) {
  if (!lock) return null;
  const up = lock.lockedUp24h ?? 0;
  const down = lock.lockedDown24h ?? 0;
  return { pending: lock.pendingArrivals, locking: lock.lockingNow, up24h: up, down24h: down, total24h: up + down, averageDelayMinutes24h: lock.averageDelayMinutes24h };
}

function scoreVisit({ locks, wx, tours, nav }) {
  if (!locks.ok) return { score: null, label: 'DATA LIMITED', confidence: 'Low', reasons: ['Live USACE lock traffic is temporarily unavailable.'] };
  const m = locks.melvin;
  let score = 35;
  const reasons = [];
  const active = (m.pendingArrivals || 0) + (m.lockingNow || 0);
  const total24 = (m.lockedUp24h || 0) + (m.lockedDown24h || 0);
  if (m.lockingNow > 0) { score += 27; reasons.push(`${m.lockingNow} vessel${m.lockingNow === 1 ? '' : 's'} reported locking now`); }
  else if (m.pendingArrivals > 0) { score += Math.min(24, 12 + m.pendingArrivals * 4); reasons.push(`${m.pendingArrivals} pending arrival${m.pendingArrivals === 1 ? '' : 's'} reported`); }
  else { score += Math.min(14, total24); reasons.push(`${total24} lockages reported in the last 24 hours`); }

  if (tours.museumOpen && tours.minutesUntilNextTour != null && tours.minutesUntilNextTour <= 90) {
    score += 14;
    reasons.push(`next scheduled free tour is ${tours.nextTour}`);
  } else if (tours.museumOpen) {
    score += 7;
    reasons.push('National Great Rivers Museum is open');
  }

  if (wx.ok) {
    const rain = wx.precipitationProbability ?? 0;
    if (rain <= 25) { score += 9; reasons.push(`${wx.shortForecast.toLowerCase()} for viewing`); }
    else if (rain >= 70) { score -= 8; reasons.push('rain is likely during the current hour'); }
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

async function build(now = new Date()) {
  const tours = museumAndTours(now);
  const [locks, wx, riverData, nav] = await Promise.all([lockStatus(now), weather(), river(), notices()]);
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
        upstreamLock25: trafficSnapshot(locks.adjacent.upstream),
        melvinPrice: trafficSnapshot(locks.melvin),
        downstreamLock27: trafficSnapshot(locks.adjacent.downstream),
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
  if (req.method !== 'GET') { res.statusCode = 405; return res.end('Method not allowed'); }
  try {
    const body = await build();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.end(JSON.stringify(body));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Melvin Price live data unavailable', detail: e.message }));
  }
}

module.exports = handler;
module.exports._test = { n, localParts, parseLpmsStamp, findRecords, normalizeLock, parseCwmsValues, discoverTsid, museumAndTours, trafficSnapshot, scoreVisit, build };

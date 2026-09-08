const LAT = 47.66556;
const LON = -122.39722;
const PACIFIC = 'America/Los_Angeles';
const WDFW_URL = 'https://wdfw.wa.gov/fishing/reports/counts/lake-washington';
const USACE_FISH_URL = 'https://www.nws.usace.army.mil/Missions/Civil-Works/Locks-and-Dams/Chittenden-Locks/Fish-Counts/';
const USACE_CLOSURES_URL = 'https://www.nws.usace.army.mil/Missions/Civil-Works/Locks-and-Dams/Chittenden-Locks/Closures/';
const USACE_LEVEL_URL = 'https://water.usace.army.mil/office/nws/data/lkw_lwsc_plot';
const NOAA_STATION = '9447130';

const HEADERS = {
  'User-Agent': 'chrisizworski.com Ballard Locks visitor intelligence (https://chrisizworski.com/ballard-locks/)',
  Accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
};

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(JSON.stringify(body));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function pacificParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    weekday: 'short',
  }).formatToParts(date).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  return {
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour: Number(parts.hour === '24' ? 0 : parts.hour), minute: Number(parts.minute),
    second: Number(parts.second), weekday: parts.weekday,
  };
}

function ymd({ year, month, day }) {
  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}

function pacificDisplay(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC,
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

function decodeHtml(s) {
  return String(s || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&mdash;|&#8212;/gi, '—')
    .replace(/&#x2F;/gi, '/');
}

function tableText(html) {
  return decodeHtml(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(?:tr|p|h[1-6]|div|section|article|table|li)>/gi, '\n')
    .replace(/<\/(?:td|th)>/gi, ' | ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n');
}

function parseCount(value) {
  if (!value) return null;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function extractDailySpecies(text, species) {
  const lower = text.toLowerCase();
  const candidates = [`daily ${species.toLowerCase()} counts`, `ballard locks ${species.toLowerCase()} counts`, `${species.toLowerCase()} counts`];
  let start = -1;
  for (const needle of candidates) {
    const idx = lower.indexOf(needle);
    if (idx >= 0) { start = idx; break; }
  }
  if (start < 0) return null;
  let slice = text.slice(start, start + 30000);
  const yearStart = slice.toLowerCase().indexOf('2026 daily counts');
  if (yearStart >= 0) {
    slice = slice.slice(yearStart);
    const nextYear = slice.toLowerCase().indexOf('2025 daily counts');
    if (nextYear > 0) slice = slice.slice(0, nextYear);
  }
  const rows = [];
  const rowRe = /(?:^|\n)\s*(\d{1,2}\/\d{1,2}(?:-\d{1,2}\/\d{1,2})?)\s*\|\s*([\d,]+|[-–—])\s*\|\s*([\d,]+|[-–—])/gm;
  let m;
  while ((m = rowRe.exec(slice))) {
    const daily = parseCount(m[2]);
    const total = parseCount(m[3]);
    if (daily !== null && total !== null) rows.push({ date: m[1], daily, total });
  }
  if (!rows.length) return null;
  const latest = rows[rows.length - 1];
  const recent = rows.slice(-7);
  const avg7 = recent.length ? recent.reduce((s, r) => s + r.daily, 0) / recent.length : null;
  return { species, latest, recent, avg7: avg7 == null ? null : Math.round(avg7 * 10) / 10, source: 'WDFW daily' };
}

function extractUsaceWeekly(text) {
  const rows = [];
  const rowRe = /(?:^|\n)\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*\|\s*([\d, ]+)\s*\|\s*([\d, ]+)\s*\|\s*([\d, ]+)\s*\|\s*([\d, ]+)\s*\|\s*([\d, ]+)\s*\|\s*([\d, ]+)/gm;
  let m;
  while ((m = rowRe.exec(text))) {
    const nums = m.slice(2, 8).map(parseCount);
    if (nums.every((n) => n !== null)) {
      rows.push({ date: m[1], chinookWeekly: nums[0], chinookTotal: nums[1], sockeyeWeekly: nums[2], sockeyeTotal: nums[3], cohoWeekly: nums[4], cohoTotal: nums[5] });
    }
  }
  if (!rows.length) return null;
  rows.sort((a, b) => new Date(a.date) - new Date(b.date));
  return rows[rows.length - 1];
}

function mdToDate(md, nowParts) {
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(md || '');
  if (!m) return null;
  return new Date(Date.UTC(nowParts.year, Number(m[1]) - 1, Number(m[2]), 12));
}

function dataAgeDays(md, nowParts) {
  const d = mdToDate(md, nowParts);
  if (!d) return null;
  const now = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day, 12));
  return Math.max(0, Math.round((now - d) / 86400000));
}

async function getFish(nowParts) {
  try {
    const r = await fetchWithTimeout(WDFW_URL, { headers: HEADERS });
    const text = tableText(await r.text());
    const species = ['Sockeye', 'Chinook', 'Coho'].map((s) => extractDailySpecies(text, s)).filter(Boolean);
    if (species.length) {
      for (const s of species) s.ageDays = dataAgeDays(s.latest.date, nowParts);
      return { ok: true, cadence: 'daily', species, source: 'Washington Department of Fish & Wildlife', url: WDFW_URL };
    }
    throw new Error('Daily table not found');
  } catch (primaryError) {
    try {
      const r = await fetchWithTimeout(USACE_FISH_URL, { headers: HEADERS });
      const weekly = extractUsaceWeekly(tableText(await r.text()));
      if (!weekly) throw new Error('Weekly table not found');
      return { ok: true, cadence: 'weekly', weekly, source: 'U.S. Army Corps of Engineers', url: USACE_FISH_URL, note: 'WDFW daily feed unavailable; showing the latest USACE weekly summary.' };
    } catch (fallbackError) {
      return { ok: false, source: 'WDFW / USACE', url: WDFW_URL, error: `${primaryError.message}; ${fallbackError.message}` };
    }
  }
}

async function getTides(now) {
  const pp = pacificParts(now);
  const begin = ymd(pp);
  const endDate = new Date(now.getTime() + 3 * 86400000);
  const end = ymd(pacificParts(endDate));
  const base = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
  const common = `application=chrisizworski.com&station=${NOAA_STATION}&datum=MLLW&time_zone=gmt&units=english&format=json`;
  const predictionsUrl = `${base}?product=predictions&begin_date=${begin}&end_date=${end}&interval=hilo&${common}`;
  const observedUrl = `${base}?product=water_level&date=latest&${common}`;
  try {
    const [pRes, oRes] = await Promise.all([
      fetchWithTimeout(predictionsUrl, { headers: HEADERS }),
      fetchWithTimeout(observedUrl, { headers: HEADERS }).catch(() => null),
    ]);
    const pJson = await pRes.json();
    const predictions = (pJson.predictions || []).map((p) => ({
      type: p.type === 'H' ? 'High' : 'Low',
      valueFt: Number(p.v),
      at: `${p.t.replace(' ', 'T')}:00Z`,
    })).filter((p) => Number.isFinite(p.valueFt));
    const upcoming = predictions.filter((p) => new Date(p.at).getTime() >= now.getTime() - 15 * 60000).slice(0, 4);
    let observed = null;
    if (oRes) {
      const oJson = await oRes.json();
      const row = oJson.data && oJson.data[0];
      if (row) observed = { valueFt: Number(row.v), at: `${row.t.replace(' ', 'T')}:00Z` };
    }
    return { ok: true, station: NOAA_STATION, stationName: 'Seattle, Elliott Bay', predictions: upcoming, observed, source: 'NOAA Tides & Currents', url: `https://tidesandcurrents.noaa.gov/stationhome.html?id=${NOAA_STATION}` };
  } catch (error) {
    return { ok: false, station: NOAA_STATION, source: 'NOAA Tides & Currents', url: `https://tidesandcurrents.noaa.gov/stationhome.html?id=${NOAA_STATION}`, error: error.message };
  }
}

async function getWeather() {
  try {
    const points = await fetchWithTimeout(`https://api.weather.gov/points/${LAT},${LON}`, { headers: HEADERS });
    const pointJson = await points.json();
    const hourlyUrl = pointJson?.properties?.forecastHourly;
    if (!hourlyUrl) throw new Error('NWS hourly forecast URL missing');
    const hourly = await fetchWithTimeout(hourlyUrl, { headers: HEADERS });
    const h = await hourly.json();
    const p = h?.properties?.periods?.[0];
    if (!p) throw new Error('NWS hourly period missing');
    return {
      ok: true,
      temperatureF: p.temperature,
      windSpeed: p.windSpeed,
      windDirection: p.windDirection,
      precipitationProbability: p.probabilityOfPrecipitation?.value,
      shortForecast: p.shortForecast,
      isDaytime: p.isDaytime,
      validFrom: p.startTime,
      source: 'National Weather Service',
      url: 'https://forecast.weather.gov/MapClick.php?lat=47.66556&lon=-122.39722',
    };
  } catch (error) {
    return { ok: false, source: 'National Weather Service', url: 'https://forecast.weather.gov/MapClick.php?lat=47.66556&lon=-122.39722', error: error.message };
  }
}

async function getLakeLevel() {
  try {
    const r = await fetchWithTimeout(USACE_LEVEL_URL, { headers: HEADERS });
    const html = await r.text();
    const text = tableText(html);
    const near = text.match(/LWSC[\s\S]{0,9000}?(?:Observed Elevation|Elevation)[^\d]{0,80}(2[01]\.\d{1,2})/i)
      || text.match(/(2[01]\.\d{1,2})\s*(?:ft|feet)/i);
    if (!near) throw new Error('Current elevation value not exposed in page HTML');
    const valueFt = Number(near[1]);
    if (!Number.isFinite(valueFt) || valueFt < 18 || valueFt > 24) throw new Error('Parsed elevation outside expected range');
    return { ok: true, valueFt, targetRangeFt: [20, 22], source: 'USACE Seattle Water Management', url: USACE_LEVEL_URL, provisional: true };
  } catch (error) {
    return { ok: false, targetRangeFt: [20, 22], source: 'USACE Seattle Water Management', url: USACE_LEVEL_URL, error: error.message };
  }
}

const maintenance = [
  { chamber: 'Large lock', start: '2026-11-02T00:00:00-08:00', end: '2026-11-21T00:00:00-08:00', label: '2026 annual maintenance' },
  { chamber: 'Small lock', start: '2026-12-07T00:00:00-08:00', end: '2027-01-19T00:00:00-08:00', label: '2026-27 maintenance' },
  { chamber: 'Small lock', start: '2027-03-01T00:00:00-08:00', end: '2027-03-31T00:00:00-07:00', label: '2027 annual maintenance' },
  { chamber: 'Large lock', start: '2027-11-01T00:00:00-07:00', end: '2027-11-13T00:00:00-08:00', label: '2027 annual maintenance' },
];

function lockStatus(now) {
  const active = maintenance.filter((m) => now >= new Date(m.start) && now < new Date(m.end));
  return {
    largeOpen: !active.some((m) => m.chamber === 'Large lock'),
    smallOpen: !active.some((m) => m.chamber === 'Small lock'),
    activeClosures: active,
    source: 'USACE published maintenance schedule',
    url: USACE_CLOSURES_URL,
    note: 'Unplanned outages can occur; confirm with USACE before relying on chamber availability for navigation.'
  };
}

function accessStatus(nowParts) {
  const mins = nowParts.hour * 60 + nowParts.minute;
  const groundsOpen = mins >= 7 * 60 && mins < 21 * 60;
  const fishLadderOpen = mins >= 7 * 60 && mins < 20 * 60 + 45;
  return {
    groundsOpen,
    fishLadderOpen,
    groundsHours: '7:00 AM–9:00 PM',
    fishLadderHours: '7:00 AM–8:45 PM',
    vesselTraffic: '24/7',
    timezone: 'Pacific Time',
    source: 'U.S. Army Corps of Engineers',
    url: 'https://www.nws.usace.army.mil/Missions/Civil-Works/Locks-and-Dams/Chittenden-Locks/'
  };
}

function salmonSignal(fish) {
  if (!fish?.ok) return { label: 'Unknown', points: 8, detail: 'Fish-count feed unavailable', best: null };
  if (fish.cadence === 'weekly' && fish.weekly) {
    const w = fish.weekly;
    const best = Math.max(w.chinookWeekly || 0, w.cohoWeekly || 0, w.sockeyeWeekly || 0);
    const label = best >= 2000 ? 'HIGH' : best >= 500 ? 'MODERATE' : best > 0 ? 'LOW' : 'QUIET';
    return { label, points: best >= 2000 ? 30 : best >= 500 ? 23 : best > 0 ? 15 : 6, detail: `Latest weekly count peaks at ${best.toLocaleString()} fish`, best };
  }
  const available = fish.species || [];
  if (!available.length) return { label: 'Unknown', points: 8, detail: 'No current species rows', best: null };
  const ranked = available.map((s) => ({ ...s, effective: (s.ageDays ?? 99) > 7 ? 0 : s.latest.daily }));
  ranked.sort((a, b) => b.effective - a.effective);
  const best = ranked[0];
  const n = best.effective;
  const freshnessFactor = (best.ageDays ?? 99) <= 3 ? 1 : (best.ageDays ?? 99) <= 7 ? 0.75 : 0.35;
  const raw = n >= 500 ? 35 : n >= 200 ? 30 : n >= 75 ? 24 : n >= 20 ? 18 : n > 0 ? 12 : 6;
  const label = n >= 200 ? 'HIGH' : n >= 50 ? 'MODERATE' : n > 0 ? 'LOW' : 'QUIET';
  return { label, points: Math.round(raw * freshnessFactor), detail: `${best.species}: ${best.latest.daily.toLocaleString()} on ${best.latest.date}`, best };
}

function windMph(value) {
  const m = String(value || '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function computeScore({ fish, tides, weather, access, locks }) {
  const reasons = [];
  const salmon = salmonSignal(fish);
  let score = salmon.points;
  reasons.push(`${salmon.label.toLowerCase()} salmon signal`);

  if (weather.ok) {
    const pop = weather.precipitationProbability ?? 0;
    const wind = windMph(weather.windSpeed);
    let w = pop <= 20 ? 10 : pop <= 40 ? 7 : pop <= 70 ? 3 : 0;
    w += wind == null ? 3 : wind <= 10 ? 6 : wind <= 18 ? 4 : wind <= 25 ? 2 : 0;
    w += weather.temperatureF >= 48 && weather.temperatureF <= 82 ? 4 : 2;
    score += w;
    reasons.push(pop <= 20 ? 'dry weather favored' : `${pop}% precipitation chance`);
  } else {
    score += 8;
    reasons.push('weather feed unavailable');
  }

  score += access.groundsOpen ? 10 : 1;
  if (access.fishLadderOpen) score += 5;
  reasons.push(access.groundsOpen ? 'grounds open now' : 'grounds currently closed');

  if (locks.largeOpen && locks.smallOpen) score += 15;
  else if (locks.largeOpen || locks.smallOpen) score += 8;
  reasons.push(locks.largeOpen && locks.smallOpen ? 'both chambers scheduled open' : 'maintenance affects a chamber');

  if (tides.ok && tides.predictions?.length) {
    const next = tides.predictions[0];
    const hours = (new Date(next.at).getTime() - Date.now()) / 3600000;
    const tidePts = hours >= 0 && hours <= 2 ? 15 : hours <= 4 ? 11 : 7;
    score += tidePts;
    reasons.push(`${next.type.toLowerCase()} tide ${hours <= 2 ? 'turning soon' : 'ahead'}`);
  } else {
    score += 5;
  }

  score = Math.max(0, Math.min(100, score));
  const feeds = [fish?.ok, tides?.ok, weather?.ok].filter(Boolean).length;
  const confidence = feeds === 3 ? 'High' : feeds === 2 ? 'Moderate' : 'Low';
  const label = score >= 85 ? 'Excellent time to visit' : score >= 75 ? 'Great time to visit' : score >= 60 ? 'Good time to visit' : score >= 45 ? 'Fair window' : 'Low-value window';
  return { score, label, confidence, reasons: reasons.slice(0, 4), salmon };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const now = new Date();
  const nowParts = pacificParts(now);
  const access = accessStatus(nowParts);
  const locks = lockStatus(now);
  const [fish, tides, weather, lakeLevel] = await Promise.all([
    getFish(nowParts), getTides(now), getWeather(), getLakeLevel(),
  ]);
  const visit = computeScore({ fish, tides, weather, access, locks });
  json(res, 200, {
    generatedAt: now.toISOString(),
    localTime: pacificDisplay(now),
    location: { name: 'Hiram M. Chittenden Locks (Ballard Locks)', city: 'Seattle', state: 'WA', lat: LAT, lon: LON },
    visit,
    fish,
    tides,
    weather,
    lakeLevel,
    access,
    locks,
    vessels: {
      mode: 'AIS map',
      coverage: 'AIS-equipped vessels only',
      note: 'AIS does not represent every recreational boat or every lockage. The live map is a traffic picture, not an official transit count or guaranteed schedule.'
    },
    sources: [WDFW_URL, USACE_FISH_URL, USACE_CLOSURES_URL, USACE_LEVEL_URL, `https://tidesandcurrents.noaa.gov/stationhome.html?id=${NOAA_STATION}`, 'https://api.weather.gov/']
  });
}

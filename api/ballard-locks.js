const LAT = 47.66556;
const LON = -122.39722;
const TZ = 'America/Los_Angeles';
const NOAA_STATION = '9447130';
const WDFW = 'https://wdfw.wa.gov/fishing/reports/counts/lake-washington';
const USACE = 'https://www.nws.usace.army.mil/Missions/Civil-Works/Locks-and-Dams/Chittenden-Locks/';
const CLOSURES = `${USACE}Closures/`;
const LEVEL_PAGE = 'https://water.usace.army.mil/overview/nws/locations/lwsc';
const LEVEL_FALLBACK = 'https://water.usace.army.mil/office/nws/data/lkw_lwsc_plot';
const A2W_LEVEL = 'https://water.usace.army.mil/cda/reporting/providers/nws/locations/lwsc';
const CWMS_TSID = 'LWSC.Elev-Lake.Ave.1Hour.1Hour.IRIDIUM-REV';
const UA = 'BallardLocksLive/1.0 (+https://chrisizworski.com/ballard-locks/)';

async function get(url, type = 'json', timeout = 5000, extraHeaders = {}) {
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), timeout);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*', ...extraHeaders }, signal: c.signal });
    if (!r.ok) throw new Error(`${new URL(url).hostname} returned ${r.status}`);
    return type === 'text' ? r.text() : r.json();
  } finally { clearTimeout(timer); }
}

function text(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(?:tr|p|h[1-6]|div|table|li)>/gi, '\n')
    .replace(/<\/(?:td|th)>/gi, ' | ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n');
}

function n(v) {
  if (v == null || !String(v).trim()) return null;
  const x = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(x) ? x : null;
}

function pacificParts(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date).map(x => [x.type, x.value]));
  return { year: +p.year, month: +p.month, day: +p.day, hour: +(p.hour === '24' ? 0 : p.hour), minute: +p.minute };
}

function ymd(p) { return `${p.year}${String(p.month).padStart(2,'0')}${String(p.day).padStart(2,'0')}`; }
function local(date) { return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short' }).format(date); }

function ageDays(md, nowParts) {
  const m = /^(\d{1,2})\/(\d{1,2})/.exec(md || '');
  if (!m) return null;
  const a = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day, 12);
  const b = Date.UTC(nowParts.year, +m[1] - 1, +m[2], 12);
  return Math.max(0, Math.round((a - b) / 86400000));
}

function speciesSection(page, species) {
  const wanted = String(species || '').toLowerCase();
  const heading = new RegExp(`(?:^|\\n)\\s*daily\\s+${wanted}\\s+counts\\s*(?:\\n|$)`, 'i');
  const hit = heading.exec(page);
  if (!hit) return null;

  const afterHeading = page.slice(hit.index + hit[0].length);
  const current = /(?:^|\n)\s*2026\s+daily\s+counts\s*(?:\n|$)/i.exec(afterHeading);
  if (!current) return null;

  const tail = afterHeading.slice(current.index);
  const boundaries = [];
  const afterYearOffset = current[0].length;

  const older = /(?:^|\n)\s*2025\s+daily\s+counts\s*(?:\n|$)/i.exec(tail.slice(afterYearOffset));
  if (older) boundaries.push(afterYearOffset + older.index);

  const nextSpecies = /(?:^|\n)\s*daily\s+(sockeye|chinook|coho)\s+counts\s*(?:\n|$)/ig;
  nextSpecies.lastIndex = afterYearOffset;
  let next;
  while ((next = nextSpecies.exec(tail))) {
    if (String(next[1]).toLowerCase() !== wanted) {
      boundaries.push(next.index);
      break;
    }
  }

  const annual = /(?:^|\n)\s*annual\s+(?:sockeye|chinook|coho)\s+counts\s*(?:\n|$)/i.exec(tail.slice(afterYearOffset));
  if (annual) boundaries.push(afterYearOffset + annual.index);

  const chart = new RegExp(`(?:^|\\n)\\s*ballard\\s+locks\\s+${wanted}\\s+counts\\s*(?:\\n|$)`, 'i').exec(tail.slice(afterYearOffset));
  if (chart) boundaries.push(afterYearOffset + chart.index);

  const validBoundaries = boundaries.filter(x => x > afterYearOffset);
  const end = validBoundaries.length ? Math.min(...validBoundaries) : Math.min(tail.length, 30000);
  return tail.slice(0, end);
}

function parseSpecies(page, species, nowParts) {
  const slice = speciesSection(page, species);
  if (!slice) return null;
  const rows = [];
  const re = /(?:^|\n)\s*(\d{1,2}\/\d{1,2}(?:-\d{1,2}\/\d{1,2})?)\s*\|\s*([\d,]+)\s*\|\s*([\d,]+)/gm;
  let m;
  while ((m = re.exec(slice))) {
    const daily = n(m[2]);
    const total = n(m[3]);
    if (daily !== null && total !== null) rows.push({ date: m[1], daily, total });
  }
  if (!rows.length) return null;
  const latest = rows[rows.length - 1];
  const recent = rows.slice(-7);
  return {
    species, latest, ageDays: ageDays(latest.date, nowParts),
    avg7: Math.round((recent.reduce((s,r)=>s+r.daily,0) / recent.length) * 10) / 10,
  };
}

async function fish(nowParts) {
  try {
    const page = text(await get(WDFW, 'text'));
    const species = ['Sockeye','Chinook','Coho'].map(s => parseSpecies(page, s, nowParts)).filter(Boolean);
    if (species.length !== 3) throw new Error(`Expected 3 WDFW species tables, parsed ${species.length}`);
    return { ok:true, cadence:'daily', species, source:'Washington Department of Fish & Wildlife', url:WDFW };
  } catch (e) {
    return { ok:false, source:'Washington Department of Fish & Wildlife', url:WDFW, error:e.message };
  }
}

async function tides(now) {
  const begin = ymd(pacificParts(now));
  const end = ymd(pacificParts(new Date(now.getTime() + 3 * 86400000)));
  const base = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
  const common = `application=ballard-locks-live&station=${NOAA_STATION}&datum=MLLW&time_zone=gmt&units=english&format=json`;
  try {
    const [pred, obs] = await Promise.all([
      get(`${base}?product=predictions&begin_date=${begin}&end_date=${end}&interval=hilo&${common}`),
      get(`${base}?product=water_level&date=latest&${common}`).catch(()=>null),
    ]);
    const predictions = (pred.predictions || []).map(p => ({ type:p.type === 'H' ? 'High' : 'Low', valueFt:+p.v, at:`${p.t.replace(' ','T')}:00Z` }))
      .filter(p => Number.isFinite(p.valueFt) && new Date(p.at) >= new Date(now.getTime() - 15 * 60000)).slice(0,4);
    const row = obs?.data?.[0];
    return { ok:true, station:NOAA_STATION, stationName:'Seattle, WA', predictions, observed:row ? {valueFt:+row.v, at:`${row.t.replace(' ','T')}:00Z`} : null, source:'NOAA Tides & Currents', url:`https://tidesandcurrents.noaa.gov/stationhome.html?id=${NOAA_STATION}` };
  } catch(e) { return { ok:false, station:NOAA_STATION, source:'NOAA Tides & Currents', error:e.message, url:`https://tidesandcurrents.noaa.gov/stationhome.html?id=${NOAA_STATION}` }; }
}

async function weather() {
  try {
    const point = await get(`https://api.weather.gov/points/${LAT},${LON}`);
    const url = point?.properties?.forecastHourly;
    if (!url) throw new Error('NWS hourly URL missing');
    const data = await get(url);
    const p = data?.properties?.periods?.[0];
    if (!p) throw new Error('NWS hourly period missing');
    return { ok:true, temperatureF:p.temperature, windSpeed:p.windSpeed, windDirection:p.windDirection, precipitationProbability:p.probabilityOfPrecipitation?.value ?? null, shortForecast:p.shortForecast, validFrom:p.startTime, source:'National Weather Service', url:'https://forecast.weather.gov/MapClick.php?lat=47.66556&lon=-122.39722' };
  } catch(e) { return { ok:false, source:'National Weather Service', error:e.message, url:'https://forecast.weather.gov/MapClick.php?lat=47.66556&lon=-122.39722' }; }
}

function parseA2wLatest(data) {
  const locations = Array.isArray(data) ? data : [data];
  for (const location of locations) {
    const rows = Array.isArray(location?.timeseries) ? location.timeseries : [];
    const row = rows.find(x => x?.tsid === CWMS_TSID) || rows.find(x => x?.label === 'Elevation' && x?.unit === 'ft');
    if (!row) continue;
    if (row.latest_value == null || !String(row.latest_value).trim()) continue;
    const valueFt = Number(row.latest_value);
    const timeMs = Date.parse(String(row.latest_time || ''));
    if (!Number.isFinite(valueFt) || !Number.isFinite(timeMs)) continue;
    return {
      valueFt,
      observedAt:new Date(timeMs).toISOString(),
      delta24hr:Number.isFinite(Number(row.delta24hr)) ? Number(row.delta24hr) : null,
      tsid:row.tsid || CWMS_TSID,
    };
  }
  return null;
}

async function lakeLevel() {
  const errors = [];
  try {
    const data = await get(A2W_LEVEL, 'json', 8000, { accept:'application/json' });
    const latest = parseA2wLatest(data);
    if (!latest) throw new Error('Access to Water response contained no usable elevation value');
    if (latest.valueFt < 18 || latest.valueFt > 24) throw new Error(`USACE elevation outside expected range: ${latest.valueFt}`);
    const ageHours = Math.max(0, Math.round(((Date.now() - Date.parse(latest.observedAt)) / 3600000) * 10) / 10);
    if (ageHours > 72) throw new Error(`USACE elevation is stale by ${ageHours} hours`);
    return {
      ok:true,
      valueFt:latest.valueFt,
      observedAt:latest.observedAt,
      ageHours,
      delta24hr:latest.delta24hr,
      targetRangeFt:[20,22],
      provisional:true,
      source:'USACE Access to Water',
      tsid:latest.tsid,
      url:LEVEL_PAGE,
      dataUrl:A2W_LEVEL,
    };
  } catch (e) {
    errors.push(`Access to Water: ${e.message}`);
  }

  try {
    const page = text(await get(LEVEL_FALLBACK, 'text'));
    const match = page.match(/(?:LWSC|Lake Washington Ship Canal)[\s\S]{0,8000}?(2[01]\.\d{1,2})\s*(?:ft|feet)?/i) || page.match(/(2[01]\.\d{1,2})\s*(?:ft|feet)/i);
    if (!match) throw new Error('Current elevation not safely machine-readable');
    const valueFt = +match[1];
    if (valueFt < 18 || valueFt > 24) throw new Error('Elevation outside expected range');
    return { ok:true, valueFt, targetRangeFt:[20,22], provisional:true, source:'USACE Seattle Water Management', url:LEVEL_PAGE, note:'Access to Water API unavailable; using official Seattle Water Management page fallback.' };
  } catch(e) {
    errors.push(`legacy page: ${e.message}`);
    return { ok:false, targetRangeFt:[20,22], source:'USACE Seattle Water Management', error:errors.join('; '), url:LEVEL_PAGE };
  }
}

const plannedClosures = [
  ['Large lock','2026-11-02T00:00:00-08:00','2026-11-21T00:00:00-08:00','2026 annual maintenance'],
  ['Small lock','2026-12-07T00:00:00-08:00','2027-01-19T00:00:00-08:00','2026–27 maintenance'],
  ['Small lock','2027-03-01T00:00:00-08:00','2027-03-31T00:00:00-07:00','2027 annual maintenance'],
  ['Large lock','2027-11-01T00:00:00-07:00','2027-11-13T00:00:00-08:00','2027 annual maintenance'],
].map(x => ({chamber:x[0],start:x[1],end:x[2],label:x[3]}));

function locks(now) {
  const active = plannedClosures.filter(x => now >= new Date(x.start) && now < new Date(x.end));
  return { largeOpen:!active.some(x=>x.chamber==='Large lock'), smallOpen:!active.some(x=>x.chamber==='Small lock'), activeClosures:active, source:'USACE published projected closures', url:CLOSURES, caveat:'Unplanned outages can occur; this reflects published maintenance windows, not a guarantee of chamber availability.' };
}

function access(p) {
  const mins = p.hour * 60 + p.minute;
  return { groundsOpen:mins >= 420 && mins < 1260, fishLadderOpen:mins >= 420 && mins < 1245, groundsHours:'7:00 AM–9:00 PM', fishLadderHours:'7:00 AM–8:45 PM', vesselTraffic:'24/7', source:'U.S. Army Corps of Engineers', url:USACE };
}

function windMph(s) { const m = String(s || '').match(/\d+/); return m ? +m[0] : null; }

function salmonSignal(f) {
  if (!f?.ok || !f.species?.length) return { label:'Unknown', points:8, detail:'Current fish-count feed unavailable' };
  const ranked = f.species.map(s => ({...s, usable:(s.ageDays ?? 99) <= 7 ? s.latest.daily : 0})).sort((a,b)=>b.usable-a.usable);
  const best = ranked[0], x = best.usable;
  const fresh = (best.ageDays ?? 99) <= 3 ? 1 : (best.ageDays ?? 99) <= 7 ? .72 : .35;
  const raw = x >= 500 ? 35 : x >= 200 ? 31 : x >= 75 ? 25 : x >= 20 ? 18 : x > 0 ? 12 : 6;
  return { label:x >= 200 ? 'HIGH' : x >= 50 ? 'MODERATE' : x > 0 ? 'LOW' : 'QUIET', points:Math.round(raw*fresh), detail:`${best.species}: ${best.latest.daily.toLocaleString()} on ${best.latest.date}` };
}

function score({f,t,w,a,l,now}) {
  const salmon = salmonSignal(f);
  let total = salmon.points;
  const reasons = [`${salmon.label.toLowerCase()} salmon signal`];
  if (w.ok) {
    const pop = w.precipitationProbability ?? 0, wind = windMph(w.windSpeed);
    total += pop <= 20 ? 10 : pop <= 40 ? 7 : pop <= 70 ? 3 : 0;
    total += wind == null ? 3 : wind <= 10 ? 6 : wind <= 18 ? 4 : wind <= 25 ? 2 : 0;
    total += w.temperatureF >= 48 && w.temperatureF <= 82 ? 4 : 2;
    reasons.push(pop <= 20 ? 'dry weather favored' : `${pop}% precipitation chance`);
  } else total += 8;
  total += a.groundsOpen ? 10 : 1;
  if (a.fishLadderOpen) total += 5;
  reasons.push(a.groundsOpen ? 'visitor grounds open' : 'visitor grounds closed');
  total += l.largeOpen && l.smallOpen ? 15 : (l.largeOpen || l.smallOpen ? 8 : 0);
  reasons.push(l.largeOpen && l.smallOpen ? 'both chambers scheduled open' : 'maintenance affects a chamber');
  if (t.ok && t.predictions?.length) {
    const hours = (new Date(t.predictions[0].at) - now) / 3600000;
    total += hours >= 0 && hours <= 2 ? 15 : hours <= 4 ? 11 : 7;
    reasons.push(`${t.predictions[0].type.toLowerCase()} tide ${hours <= 2 ? 'turning soon' : 'ahead'}`);
  } else total += 5;
  total = Math.max(0, Math.min(100,total));
  const feeds = [f.ok,t.ok,w.ok].filter(Boolean).length;
  return { score:total, label:total>=85?'Excellent time to visit':total>=75?'Great time to visit':total>=60?'Good time to visit':total>=45?'Fair window':'Low-value window', confidence:feeds===3?'High':feeds===2?'Moderate':'Low', reasons:reasons.slice(0,4), salmon };
}

async function build(now = new Date()) {
  const p = pacificParts(now), a = access(p), l = locks(now);
  const [f,t,w,level] = await Promise.all([fish(p), tides(now), weather(), lakeLevel()]);
  return {
    generatedAt:now.toISOString(), localTime:local(now),
    location:{name:'Hiram M. Chittenden Locks (Ballard Locks)',city:'Seattle',state:'WA',lat:LAT,lon:LON},
    visit:score({f,t,w,a,l,now}), fish:f, tides:t, weather:w, lakeLevel:level, access:a, locks:l,
    vessels:{mode:'AIS map',coverage:'AIS-equipped vessels only',note:'AIS does not represent every recreational boat or every lockage. It is a traffic picture, not an official transit count or guaranteed schedule.'},
  };
}

async function handler(req,res) {
  if (req.method !== 'GET') { res.statusCode=405; return res.end('Method not allowed'); }
  try {
    const body = await build();
    res.statusCode=200;
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    res.end(JSON.stringify(body));
  } catch(e) {
    res.statusCode=500; res.setHeader('Content-Type','application/json; charset=utf-8'); res.end(JSON.stringify({error:'Ballard Locks data unavailable',detail:e.message}));
  }
}

module.exports = handler;
module.exports._test = { text, speciesSection, parseSpecies, parseA2wLatest, pacificParts, access, locks, salmonSignal, score, build };
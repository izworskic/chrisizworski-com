import { michiganIceClock, winterObservationDate, belongsToWinter } from '../lib/michigan-ice/season.mjs';
// /api/ice-now — decision-layer data for the Michigan Ice Report.
//
// This endpoint deliberately keeps three things separate:
//   1. observed ice concentration from the daily NOAA/NWS/USNIC Great Lakes analysis,
//   2. lake-wide NOAA GLERL concentration trends,
//   3. forecast air-temperature and wind forcing from the National Weather Service.
//
// None of these products measures recreational ice thickness and none is a safety rating.

export const config = { runtime: 'edge' };

const UA = { 'User-Agent': 'michigan-ice-report (chrisizworski.com/michigan-ice/)' };
const USNIC = 'https://mapservices.weather.noaa.gov/vector/rest/services/obs/usnic_greatlakes_ice_chart/MapServer/0/query';

const REGIONS = {
  'mackinac-straits': {
    name: 'Straits of Mackinac · St. Ignace to Mackinac Island waters', lake: 'huron',
    // Broad water sampling region. These are not waypoints or a suggested crossing route.
    bbox: [-84.81, 45.76, -84.52, 45.96],
    forecast: [45.8668, -84.7311],
    samples: [
      [-84.719, 45.855], [-84.692, 45.837], [-84.666, 45.873],
      [-84.644, 45.837], [-84.607, 45.886]
    ]
  },
  // Lake-wide viewers use NOAA polygon dates sampled in a small, explicitly
  // identified reference sector. They NEVER claim the samples estimate the
  // ice coverage of an entire Great Lake; that belongs to GLERL lakeWide.
  'lake-superior': {
    name: 'Lake Superior — basin overview', lake: 'superior', scope: 'lake-overview',
    bbox: [-88.95, 47.10, -88.18, 47.68],
    forecast: [47.47, -87.94], // NWS forecast forcing, not sampled ice
    samples: [[-88.60,47.42],[-88.40,47.30],[-88.55,47.55]]
  },
  'lake-michigan': {
    name: 'Lake Michigan — basin overview', lake: 'michigan', scope: 'lake-overview',
    bbox: [-87.12, 44.16, -86.37, 44.90],
    forecast: [44.26,-86.32],
    samples: [[-86.90,44.44],[-86.72,44.64],[-86.55,44.48]]
  },
  'lake-huron': {
    name: 'Lake Huron — basin overview', lake: 'huron', scope: 'lake-overview',
    bbox: [-83.12, 44.67, -82.52, 45.30],
    forecast: [44.42,-83.36],
    samples: [[-82.98,44.88],[-82.80,45.02],[-82.69,44.83]]
  },
  'lake-erie': {
    name: 'Lake Erie — basin overview', lake: 'erie', scope: 'lake-overview',
    bbox: [-82.74, 41.35, -81.95, 42.00],
    forecast: [41.45,-82.71],
    samples: [[-82.54,41.65],[-82.35,41.55],[-82.18,41.74]]
  },
  'lake-ontario': {
    name: 'Lake Ontario — basin overview', lake: 'ontario', scope: 'lake-overview',
    bbox: [-77.81,43.46,-77.06,44.12],
    forecast: [43.45,-76.51],
    samples: [[-77.56,43.79],[-77.32,43.68],[-77.42,43.95]]
  },
  // Tawas Bay is a sheltered, localized view, not a Lake Huron average.
  // Samples are approximate water locations inside the sand-spit shelter.
  // Missing intersection => unavailable, not "ice-free".
  'tawas-bay': {
    name: 'Tawas Bay and Tawas Point', lake: 'huron', scope: 'local-bay',
    bbox: [-83.65,44.13,-83.37,44.33],
    forecast: [44.27,-83.50],
    samples: [[-83.54,44.218],[-83.52,44.230],[-83.50,44.211],[-83.48,44.219]]
  },
  'saginaw-bay': {
    name: 'Saginaw Bay', lake: 'huron',
    bbox: [-84.10, 43.52, -82.55, 44.55],
    forecast: [43.76, -83.86],
    samples: [
      [-83.91, 43.69], [-83.76, 43.76], [-83.62, 43.86], [-83.49, 43.98],
      [-83.35, 44.10], [-83.14, 44.16], [-83.25, 43.91], [-83.52, 43.72]
    ]
  },
  'lake-st-clair': {
    name: 'Lake St. Clair', lake: 'stclair',
    bbox: [-83.05, 42.30, -82.48, 42.78],
    forecast: [42.66, -82.78],
    samples: [
      [-82.79, 42.66], [-82.76, 42.58], [-82.73, 42.50],
      [-82.67, 42.43], [-82.62, 42.54], [-82.62, 42.66]
    ]
  },
  'little-bay-de-noc': {
    name: 'Little Bay de Noc', lake: 'michigan',
    bbox: [-87.25, 45.66, -86.72, 46.18],
    forecast: [45.78, -87.05],
    samples: [
      [-87.02, 45.75], [-86.98, 45.84], [-86.94, 45.93],
      [-86.91, 46.02], [-86.88, 46.10]
    ]
  },
  'grand-traverse-bay': {
    name: 'Grand Traverse Bay', lake: 'michigan',
    bbox: [-85.72, 44.67, -85.33, 45.22],
    forecast: [44.82, -85.60],
    samples: [
      [-85.62, 44.78], [-85.59, 44.91], [-85.57, 45.05],
      [-85.50, 44.80], [-85.47, 44.94], [-85.47, 45.08]
    ]
  },
  'houghton-lake': {
    name: 'Houghton Lake', lake: null, forecast: [44.30, -84.76], samples: []
  },
  'burt-mullett': {
    name: 'Burt and Mullett Lakes', lake: null, forecast: [45.44, -84.62], samples: []
  }
};

const CT = {
  '00': { rank: 0, label: 'ice-free water' },
  '55': { rank: 0, label: 'ice-free water' },
  '01': { rank: 1, label: 'less than 1/10 ice' },
  '10': { rank: 2, label: '1/10–3/10 ice' }, '12': { rank: 2, label: '1/10–3/10 ice' },
  '13': { rank: 2, label: '1/10–3/10 ice' }, '20': { rank: 2, label: '1/10–3/10 ice' },
  '23': { rank: 2, label: '1/10–3/10 ice' }, '24': { rank: 2, label: '1/10–3/10 ice' },
  '30': { rank: 2, label: '1/10–3/10 ice' },
  '34': { rank: 3, label: '4/10–6/10 ice' }, '35': { rank: 3, label: '4/10–6/10 ice' },
  '40': { rank: 3, label: '4/10–6/10 ice' }, '45': { rank: 3, label: '4/10–6/10 ice' },
  '46': { rank: 3, label: '4/10–6/10 ice' }, '50': { rank: 3, label: '4/10–6/10 ice' },
  '56': { rank: 3, label: '4/10–6/10 ice' }, '57': { rank: 3, label: '4/10–6/10 ice' },
  '60': { rank: 3, label: '4/10–6/10 ice' }, '67': { rank: 3, label: '4/10–6/10 ice' },
  '68': { rank: 4, label: '7/10–8/10 ice' }, '70': { rank: 4, label: '7/10–8/10 ice' },
  '78': { rank: 4, label: '7/10–8/10 ice' }, '79': { rank: 4, label: '7/10–8/10 ice' },
  '80': { rank: 4, label: '7/10–8/10 ice' },
  '81': { rank: 5, label: '9/10–10/10 ice' }, '89': { rank: 5, label: '9/10–10/10 ice' },
  '90': { rank: 5, label: '9/10–10/10 ice' }, '91': { rank: 5, label: '9/10–10/10 ice' },
  '92': { rank: 6, label: 'fast ice' },
  '99': { rank: null, label: 'concentration unknown' }
};

function seasonStartYear(d) { return michiganIceClock(d).seasonYear; }
function isIceSeason(d) { return michiganIceClock(d).active; }
function isoFromYearDay(year, doy) {
  const day = winterObservationDate(year, doy);
  return day ? day + 'T00:00:00.000Z' : null;
}
function toIso(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const n = Number(v);
  if (Number.isFinite(n) && String(v).length >= 10) {
    const d = new Date(n);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function ageHours(iso, now) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.round(((now.getTime() - t) / 3600000) * 10) / 10;
}
function round1(n) { return Math.round(n * 10) / 10; }
async function fetchJson(url, options) {
  const r = await fetch(url, options || { headers: UA });
  if (!r.ok) throw new Error('upstream ' + r.status);
  return r.json();
}

async function lakeTrends(now, previousCompleted = false) {
  const clock = michiganIceClock(now);
  const y = previousCompleted
    ? clock.seasonYear - (clock.preSeason || clock.active ? 1 : 0)
    : clock.seasonYear;
  const url = 'https://apps.glerl.noaa.gov/coastwatch/webdata/statistic/ice/dat/g' +
    y + '_' + (y + 1) + '_ice.dat';
  const r = await fetch(url, { headers: UA });
  if (!r.ok) return null;
  const dated = new Map();
  for (const line of (await r.text()).split('\n')) {
    const p = line.trim().split(/\s+/);
    if (p.length !== 9 || !/^\d{4}$/.test(p[0]) || !/^\d{1,3}$/.test(p[1])) continue;
    const year = Number(p[0]), dayOfYear = Number(p[1]);
    const date = winterObservationDate(year, dayOfYear);
    const values = p.slice(2).map(Number);
    if (!belongsToWinter(date, y, previousCompleted ? (y + 1) + '-05-31' : clock.today) ||
        values.some(n => !Number.isFinite(n) || n < 0 || n > 100)) continue;
    dated.set(date, {
      year, dayOfYear, superior: values[0], michigan: values[1], huron: values[2],
      erie: values[3], ontario: values[4], stclair: values[5], total: values[6]
    });
  }
  const rows = [...dated].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
  if (!rows.length) return null;
  const current = rows[rows.length - 1];
  const at = (days) => rows[Math.max(0, rows.length - 1 - days)];
  const delta = (prev) => {
    const out = {};
    for (const k of ['superior', 'michigan', 'huron', 'erie', 'ontario', 'stclair', 'total']) out[k] = round1(current[k] - prev[k]);
    return out;
  };
  const observedAt = isoFromYearDay(current.year, current.dayOfYear);
  const ah = ageHours(observedAt, now);
  return {
    source: previousCompleted ? 'NOAA GLERL completed-winter archive' : 'NOAA GLERL current-season daily Great Lakes ice concentration',
    observedAt, ageHours: ah, stale: ah === null || ah > 48 || ah < -2,
    current,
    seasonStartYear: y,
    // Chronological whole-lake observations, never geographically specific bay ice.
    series: rows.slice(-180).map(r => ({
      date: isoFromYearDay(r.year, r.dayOfYear).slice(0, 10),
      superior: r.superior, michigan: r.michigan, huron: r.huron,
      erie: r.erie, ontario: r.ontario, stclair: r.stclair, total: r.total
    })),
    change24h: delta(at(1)), change72h: delta(at(3)), change7d: delta(at(7))
  };
}

function pointInRing(pt, ring) {
  let inside = false;
  const x = pt[0], y = pt[1];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const hit = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi);
    if (hit) inside = !inside;
  }
  return inside;
}
function pointInGeometry(pt, geometry) {
  if (!geometry || !Array.isArray(geometry.rings)) return false;
  let inside = false;
  for (const ring of geometry.rings) if (pointInRing(pt, ring)) inside = !inside;
  return inside;
}
function concentration(code) {
  const key = String(code === null || code === undefined ? '99' : code).padStart(2, '0');
  return CT[key] || { rank: null, label: 'concentration unknown' };
}

async function regionalObservation(slug, region, now) {
  if (!region.lake || !region.samples.length) {
    return { slug, name: region.name, supported: false, reason: 'No comparable NOAA Great Lakes regional ice-analysis product exists for this inland water.' };
  }
  const q = new URLSearchParams({
    where: '1=1', geometry: region.bbox.join(','), geometryType: 'esriGeometryEnvelope', inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects', outFields: 'ct,idp_filedate,idp_ingestdate',
    returnGeometry: 'true', outSR: '4326', maxAllowableOffset: '0.01', geometryPrecision: '4', f: 'json'
  });
  const j = await fetchJson(USNIC + '?' + q.toString(), { headers: UA });
  const features = Array.isArray(j.features) ? j.features : [];
  const classifications = [], dates = [];
  for (const sample of region.samples) {
    let found = null;
    for (const f of features) {
      if (pointInGeometry(sample, f.geometry)) { found = f; break; }
    }
    if (!found) continue;
    const c = concentration(found.attributes && found.attributes.ct);
    classifications.push(c);
    const a = found.attributes || {};
    const dt = toIso(a.idp_filedate) || toIso(a.idp_ingestdate);
    if (dt) dates.push(dt);
  }
  const ranked = classifications.filter(c => c.rank !== null).sort((a, b) => a.rank - b.rank);
  const validAt = dates.length ? dates.sort().slice(-1)[0] : null;
  const ah = ageHours(validAt, now);
  const stale = ah === null || ah > 48 || ah < -2;
  const coverage = region.samples.length ? classifications.length / region.samples.length : 0;
  if (!ranked.length) {
    return {
      slug, name: region.name, scope: region.scope || 'local-bay', supported: true, available: false, validAt, ageHours: ah, stale,
      samplesMatched: classifications.length, samplesExpected: region.samples.length, confidence: 'low',
      method: 'Sample points intersected with NOAA/NWS USNIC daily ice-analysis polygons.',
      limitation: 'No usable concentration classification intersected the configured water samples. This is not evidence of ice-free water.'
    };
  }
  const counts = {};
  for (const c of ranked) counts[c.label] = (counts[c.label] || 0) + 1;
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const lo = ranked[0], hi = ranked[ranked.length - 1];
  const rangeLabel = lo.rank === hi.rank ? lo.label : lo.label + ' to ' + hi.label;
  const confidence = !stale && coverage >= 0.75 ? 'high' : (!stale && coverage >= 0.5 ? 'medium' : 'low');
  return {
    slug, name: region.name, scope: region.scope || 'local-bay', supported: true, available: true, validAt, ageHours: ah, stale,
    samplesMatched: classifications.length, samplesExpected: region.samples.length,
    confidence, dominantClass: dominant, rangeLabel,
    method: region.scope === 'lake-overview'
      ? 'Dates and classes from a limited NOAA/NWS USNIC reference sector. NOT a lake-wide geographic sample.'
      : 'Sample points intersected with NOAA/NWS USNIC daily Great Lakes ice-analysis polygons.',
    limitation: region.scope === 'lake-overview'
      ? 'This small reference sector validates the NOAA chart date only. GLERL is the separate whole-lake percent; this polygon sample cannot estimate ice coverage lake-wide or establish safety.'
      : 'Observed concentration is regional chart context, not measured ice thickness and not a safety rating.'
  };
}

function forecastDaily(periods) {
  const days = new Map();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Detroit', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  for (const hour of periods.slice(0, 168)) {
    if (!hour.startTime || !Number.isFinite(Date.parse(hour.startTime))) continue;
    const p = Object.fromEntries(fmt.formatToParts(new Date(hour.startTime)).map(item => [item.type,item.value]));
    const date = p.year + '-' + p.month + '-' + p.day;
    if (!days.has(date)) days.set(date, []);
    days.get(date).push(hour);
  }
  return Array.from(days, ([date, rows]) => ({ date, ...summarizePeriods(rows, rows.length) })).slice(0, 8);
}

function maxWindMph(text) {
  if (!text) return null;
  const nums = String(text).match(/\d+/g);
  if (!nums || !nums.length) return null;
  return Math.max(...nums.map(Number));
}
function summarizePeriods(periods, hours) {
  const p = periods.slice(0, hours);
  if (!p.length) return null;
  let minF = Infinity, maxF = -Infinity, freezeHours = 0, thawHours = 0;
  let freezingDegreeHours = 0, thawDegreeHours = 0, maxWind = 0, strongestDirection = null;
  for (const x of p) {
    let t = Number(x.temperature);
    if (x.temperatureUnit === 'C') t = t * 9 / 5 + 32;
    if (Number.isFinite(t)) {
      minF = Math.min(minF, t); maxF = Math.max(maxF, t);
      if (t <= 32) freezeHours += 1; else thawHours += 1;
      freezingDegreeHours += Math.max(0, 32 - t);
      thawDegreeHours += Math.max(0, t - 32);
    }
    const w = maxWindMph(x.windSpeed);
    if (w !== null && w >= maxWind) { maxWind = w; strongestDirection = x.windDirection || strongestDirection; }
  }
  let forcing = 'mixed freeze/thaw air-temperature signal';
  if (freezingDegreeHours > thawDegreeHours * 1.35 + 8) forcing = 'air temperatures favor additional freezing';
  else if (thawDegreeHours > freezingDegreeHours * 1.35 + 8) forcing = 'air temperatures favor thaw';
  return {
    hours: p.length,
    minTempF: Number.isFinite(minF) ? Math.round(minF) : null,
    maxTempF: Number.isFinite(maxF) ? Math.round(maxF) : null,
    freezeHours, thawHours,
    freezingDegreeHours: Math.round(freezingDegreeHours), thawDegreeHours: Math.round(thawDegreeHours),
    maxWindMph: Math.round(maxWind), strongestWindDirection: strongestDirection, forcing
  };
}
async function forecastFor(region, now) {
  const [lat, lon] = region.forecast;
  const point = await fetchJson('https://api.weather.gov/points/' + lat + ',' + lon,
    { headers: { ...UA, Accept: 'application/geo+json' } });
  const hourlyUrl = point && point.properties && point.properties.forecastHourly;
  if (!hourlyUrl) return null;
  const hourly = await fetchJson(hourlyUrl, { headers: { ...UA, Accept: 'application/geo+json' } });
  const periods = hourly && hourly.properties && Array.isArray(hourly.properties.periods) ? hourly.properties.periods : [];
  const first = periods[0] && periods[0].startTime ? periods[0].startTime : now.toISOString();
  return {
    source: 'National Weather Service hourly forecast',
    issuedAt: hourly && hourly.properties ? hourly.properties.generatedAt || hourly.properties.updateTime || null : null,
    startsAt: first,
    next24h: summarizePeriods(periods, 24), next72h: summarizePeriods(periods, 72),
    next7Days: forecastDaily(periods),
    limitation: 'This is forecast weather forcing, not a forecast of local ice thickness, cracks, movement, or safety.'
  };
}

export default async function handler(req) {
  const now = new Date();
  const url = new URL(req.url);
  const requested = url.searchParams.get('region');
  const regionSlugs = requested && REGIONS[requested]
    ? [requested]
    : ['saginaw-bay', 'lake-st-clair', 'little-bay-de-noc', 'grand-traverse-bay'];
  const out = {
    ok: true, generatedAt: now.toISOString(), iceSeason: isIceSeason(now),
    observed: {
      definition: 'Observed means an authoritative analysis or measured historical temperature record, with its valid time exposed.',
      lakeWide: null, regions: {}
    },
    forecast: null,
    // Prior completed winter is distinct from the live observation feed.
    historical: null,
    sources: {
      regionalIce: 'NOAA/NWS North American Ice Service / USNIC Great Lakes daily ice analysis',
      lakeWideIce: 'NOAA GLERL current-season daily Great Lakes ice concentration',
      forecast: 'National Weather Service hourly forecast'
    },
    safety: 'No remote product here measures the ice under a person. Nothing returned by this endpoint is a safety rating.'
  };
  const tasks = [];
  if (isIceSeason(now)) {
    tasks.push(lakeTrends(now).then(async v => {
      out.observed.lakeWide = v;
      // When the new NOAA winter file has not started, retain an explicitly
      // historical comparison; never copy it into observed.lakeWide.
      if (!v) out.historical = await lakeTrends(now, true);
    }).catch(() => { out.observed.lakeWide = null; }));
  } else {
    tasks.push(lakeTrends(now, true)
      .then(v => { out.historical = v; }).catch(() => { out.historical = null; }));
  }
  for (const slug of regionSlugs) {
    const r = REGIONS[slug];
    tasks.push(regionalObservation(slug, r, now)
      .then(v => { out.observed.regions[slug] = v; })
      .catch(() => { out.observed.regions[slug] = { slug, name: r.name, scope: r.scope || 'local-bay', supported: !!r.lake, available: false, stale: true, confidence: 'low' }; }));
  }
  const forecastSlug = requested && REGIONS[requested] ? requested : 'saginaw-bay';
  tasks.push(forecastFor(REGIONS[forecastSlug], now)
    .then(v => { out.forecast = v ? { region: forecastSlug, ...v } : null; })
    .catch(() => { out.forecast = null; }));
  await Promise.all(tasks);
  return new Response(JSON.stringify(out), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': michiganIceClock(now).rolloverWindow
        ? 'no-store'
        : 'public, max-age=1800, stale-while-revalidate=7200',
      'x-robots-tag': 'noindex, nofollow'
    }
  });
}

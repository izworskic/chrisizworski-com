import { michiganIceClock, winterObservationDate, belongsToWinter } from '../lib/michigan-ice/season.mjs';
import { acisRange, afddFrom } from '../lib/michigan-ice/thermal.mjs';
import { cavesResponse } from '../lib/michigan-ice/caves.mjs';
import { buildIceRecord, ICE_LAKES } from '../lib/michigan-ice/climatology.mjs';
// /api/ice — server-side aggregation for the Michigan Ice Report.
//
// Upstreams:
//   1. NOAA GLERL current-season daily lake-wide ice concentration
//   2. NOAA GLERL daily ice climatology
//   3. ACIS daily temperatures for accumulated freezing degree days (AFDD)
//
// Every section fails independently. This endpoint provides thermal-history and
// lake-wide context; /api/ice-now adds regional USNIC observations and NWS forecasts.

export const config = { runtime: 'edge' };

const UA = { 'User-Agent': 'michigan-ice-report (chrisizworski.com/michigan-ice/)' };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const REGIONS = [
  { slug: 'saginaw-bay', acis: 'KMBS', lake: 'huron' },
  { slug: 'houghton-lake', acis: 'KHTL', lake: null },
  { slug: 'lake-st-clair', acis: 'KDET', lake: 'stclair' },
  { slug: 'little-bay-de-noc', acis: 'KESC', lake: 'michigan' },
  { slug: 'grand-traverse-bay', acis: 'KTVC', lake: 'michigan' },
  { slug: 'burt-mullett', acis: 'KAPN', lake: null }
];

function seasonStartYear(d) { return michiganIceClock(d).seasonYear; }
function rowLabel(d) {
  return MON[d.getUTCMonth()] + '-' + String(d.getUTCDate()).padStart(2, '0');
}
function pad(n) { return String(n).padStart(2, '0'); }

export async function currentCover(now, fetcher = fetch) {
  const clock = michiganIceClock(now);
  const y = seasonStartYear(now);
  const url = 'https://apps.glerl.noaa.gov/coastwatch/webdata/statistic/ice/dat/' +
    'g' + y + '_' + (y + 1) + '_ice.dat';
  const state = (status, detail, extra = {}) => ({cover: null, status: {state: status, detail, sourceUrl: url, latestObservedAt: null, ...extra}});
  if (!clock.active) return state('off-season', 'Outside the current-cover monitoring window');
  let r, txt;
  try {
    r = await fetcher(url, {headers: UA, signal: AbortSignal.timeout(10000)});
    if (!r.ok) return state('source-unavailable', 'NOAA seasonal file returned HTTP ' + r.status, {httpStatus: r.status});
    txt = await r.text();
  } catch { return state('source-unavailable', 'NOAA seasonal file could not be retrieved'); }
  if (!txt.trim()) return state('no-observations', 'NOAA seasonal file contains no data');
  const lines = txt.split('\n');
  let latest = null, latestPartial = null, ambiguous = false;
  for (const line of lines) {
    const p = line.trim().split(/\s+/);
    if (p.length !== 9 || !/^\d{4}$/.test(p[0]) || !/^\d{1,3}$/.test(p[1])) continue;
    const date = winterObservationDate(Number(p[0]), Number(p[1]));
    if (!belongsToWinter(date, y, clock.today)) continue;
    const values = p.slice(2).map(v => /^\d+(?:\.\d+)?$/.test(v) && Number(v) <= 100 ? Number(v) : null);
    if (values.some(v => v !== null) && (!latestPartial || date > latestPartial)) latestPartial = date;
    if (values.some(v => v === null)) continue;
    if (!latest || date > latest.date) { latest = { date, p, values }; ambiguous = false; }
    else if (date === latest.date && values.some((v,i) => v !== latest.values[i])) ambiguous = true;
  }
  if (!latest) return state(latestPartial ? 'partial-observation' : 'no-valid-observations', 'No complete current-season observation row', {latestObservedAt: latestPartial});
  if (ambiguous) return state('invalid-observation', 'Conflicting values for the latest complete NOAA observation', {latestObservedAt: latest.date});
  const age = (now.getTime() - Date.parse(latest.date + 'T00:00:00Z')) / 3600000;
  if (!Number.isFinite(age) || age < -2 || age > 48) return state('stale', 'Last complete NOAA observation is outside the 48-hour window', {latestObservedAt: latest.date, ageHours: Math.round(age * 10) / 10});
  const values = latest.values;
  return {status: {state: 'observed', detail: 'Dated NOAA lake-wide observation', sourceUrl: url, latestObservedAt: latest.date, ageHours: Math.round(age * 10) / 10}, cover: {
    seasonFile: 'g' + y + '_' + (y + 1) + '_ice.dat', observedAt: latest.date,
    year: Number(latest.p[0]), dayOfYear: Number(latest.p[1]),
    superior: values[0], michigan: values[1], huron: values[2],
    erie: values[3], ontario: values[4], stclair: values[5], total: values[6]
  }};
}

function afddChange(rows, days, current) {
  if (!rows || current === null) return null;
  const previous = afddFrom(rows.slice(0, Math.max(0, rows.length - days)));
  return previous === null ? null : current - previous;
}

async function coldFor(region, now) {
  const sy = seasonStartYear(now);
  const clock = michiganIceClock(now), start = clock.seasonStart;
  // ACIS daily highs/lows are completed-day observations; never call Nov 1
  // "zero cold" before the first November day has actually ended.
  const through = new Date(Date.parse(clock.today + 'T12:00:00Z') - 86400000).toISOString().slice(0, 10);
  if (through < start) return { slug: region.slug, station: region.acis, seasonStart: start,
    afdd: null, normal: null, normalYears: 0, latestDate: null, change24h: null, change72h: null, change7d: null, preSeason: clock.preSeason, awaitingFirstObservation: !clock.preSeason };
  const currentRows = await acisRange(region.acis, start, through);
  const cur = afddFrom(currentRows);

  const md = through.slice(5);
  const norms = [];
  for (let k = 1; k <= 10; k++) {
    const s = (sy - k) + '-11-01';
    const e = (sy - k + (Number(md.slice(0,2)) >= 11 ? 0 : 1)) + '-' + md;
    const v = afddFrom(await acisRange(region.acis, s, e));
    if (v !== null) norms.push(v);
  }
  const normal = norms.length ? Math.round(norms.reduce((a, b) => a + b, 0) / norms.length) : null;

  return {
    slug: region.slug, station: region.acis, seasonStart: start,
    afdd: cur, normal, normalYears: norms.length,
    change24h: afddChange(currentRows, 1, cur),
    change72h: afddChange(currentRows, 3, cur),
    change7d: afddChange(currentRows, 7, cur),
    latestDate: currentRows && currentRows.length ? currentRows[currentRows.length - 1][0] : null
  };
}

export default async function handler(req) {
  if (req && new URL(req.url).searchParams.get('view') === 'caves') return cavesResponse(req);
  const now = new Date();
  const out = {
    ok: true,
    generatedAt: now.toISOString(),
    sources: {
      cover: 'NOAA GLERL current season daily ice concentration',
      climatology: 'NOAA GLERL daily ice climatology, ice years 1973 onward',
      cold: 'ACIS daily maximum and minimum temperature records'
    },
    cover: null,
    coverStatus: null,
    climatology: {},
    history: null,
    cold: []
  };

  const tasks = [
    currentCover(now).then(v => { out.cover = v.cover; out.coverStatus = v.status; }).catch(() => { out.coverStatus = {state: 'source-unavailable', detail: 'Unexpected cover processing failure', latestObservedAt: null}; }),
    buildIceRecord(now).then(history => {
      out.history = history;
      for (const lake of ICE_LAKES) out.climatology[lake.key] = history.lakes[lake.key] ?? null;
    }).catch(() => {
      for (const lake of ICE_LAKES) out.climatology[lake.key] = null;
    })
  ];
  for (const r of REGIONS) {
    tasks.push(coldFor(r, now).then(v => { out.cold.push(v); })
      .catch(() => { out.cold.push({ slug: r.slug, station: r.acis, afdd: null, normal: null, change24h: null, change72h: null, change7d: null }); }));
  }
  await Promise.all(tasks);

  return new Response(JSON.stringify(out), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': michiganIceClock(now).rolloverWindow
        ? 'no-store'
        : 'public, max-age=21600, stale-while-revalidate=86400',
      'x-robots-tag': 'noindex, nofollow'
    }
  });
}

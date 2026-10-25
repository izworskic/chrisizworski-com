import { michiganIceClock, winterObservationDate, belongsToWinter } from '../lib/michigan-ice/season.mjs';
import { acisRange, afddFrom } from '../lib/michigan-ice/thermal.mjs';
import { cavesResponse } from '../lib/michigan-ice/caves.mjs';
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

async function currentCover(now) {
  const clock = michiganIceClock(now);
  if (!clock.active) return null;
  const y = seasonStartYear(now);
  const url = 'https://apps.glerl.noaa.gov/coastwatch/webdata/statistic/ice/dat/' +
    'g' + y + '_' + (y + 1) + '_ice.dat';
  const r = await fetch(url, { headers: UA });
  if (!r.ok) return null;
  const txt = await r.text();
  const lines = txt.split('\n');
  let latest = null;
  for (const line of lines) {
    const p = line.trim().split(/\s+/);
    if (p.length !== 9 || !/^\d{4}$/.test(p[0]) || !/^\d{1,3}$/.test(p[1])) continue;
    const date = winterObservationDate(Number(p[0]), Number(p[1]));
    const values = p.slice(2).map(Number);
    if (!belongsToWinter(date, y, clock.today) ||
        values.some(v => !Number.isFinite(v) || v < 0 || v > 100)) continue;
    if (!latest || date > latest.date) latest = { date, p, values };
  }
  if (!latest) return null;
  const age = (now.getTime() - Date.parse(latest.date + 'T00:00:00Z')) / 3600000;
  if (!Number.isFinite(age) || age < -2 || age > 48) return null;
  const values = latest.values;
  return {
    seasonFile: 'g' + y + '_' + (y + 1) + '_ice.dat', observedAt: latest.date,
    year: Number(latest.p[0]), dayOfYear: Number(latest.p[1]),
    superior: values[0], michigan: values[1], huron: values[2],
    erie: values[3], ontario: values[4], stclair: values[5], total: values[6]
  };
}

async function climatology(lakeCode, now) {
  const file = { huron: 'hur', michigan: 'mic', superior: 'sup', erie: 'eri' }[lakeCode];
  if (!file) return null;
  const r = await fetch('https://www.glerl.noaa.gov/data/ice/glicd/daily/' + file + '.txt', { headers: UA });
  if (!r.ok) return null;
  const lines = (await r.text()).trim().split('\n');
  const years = lines[0].trim().split(/\s+/);
  const label = rowLabel(now);
  for (let i = 1; i < lines.length; i++) {
    const p = lines[i].trim().split(/\s+/);
    if (p[0] !== label) continue;
    const cells = p.slice(1);
    const vals = [];
    for (const c of cells) if (c !== 'NA') vals.push(Number(c));
    if (!vals.length) return null;
    const sorted = vals.slice().sort((a, b) => a - b);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const median = sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    const iceYear = String(now.getUTCMonth() + 1 >= 10 ? now.getUTCFullYear() + 1 : now.getUTCFullYear());
    const idx = years.indexOf(iceYear);
    const curRaw = idx >= 0 ? cells[idx] : 'NA';
    return {
      date: label, yearsOfRecord: vals.length,
      mean: Math.round(mean * 10) / 10,
      median: Math.round(median * 10) / 10,
      min: sorted[0], max: sorted[sorted.length - 1],
      current: curRaw === 'NA' ? null : Number(curRaw),
      firstYear: years[0], lastYear: years[years.length - 1]
    };
  }
  return null;
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
    afdd: null, normal: null, normalYears: 0, latestDate: null, change24h: null, change72h: null, change7d: null, preSeason: true };
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
    climatology: {},
    cold: []
  };

  const tasks = [
    currentCover(now).then(v => { out.cover = v; }).catch(() => { out.cover = null; }),
    climatology('huron', now).then(v => { out.climatology.huron = v; }).catch(() => { out.climatology.huron = null; }),
    climatology('michigan', now).then(v => { out.climatology.michigan = v; }).catch(() => { out.climatology.michigan = null; })
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

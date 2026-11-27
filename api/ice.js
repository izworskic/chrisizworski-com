import { michiganIceClock } from '../lib/michigan-ice/season.mjs';
import { acisRange, afddFrom } from '../lib/michigan-ice/thermal.mjs';
import { cavesResponse } from '../lib/michigan-ice/caves.mjs';
import { buildIceRecord, ICE_LAKES, fetchSeasonCover, seasonCoverStatus } from '../lib/michigan-ice/climatology.mjs';
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
    coverStatus: { state:'unavailable', reason:'not-checked', observedAt:null, httpStatus:null },
    climatology: {},
    history: null,
    cold: []
  };

  // Share the one season-file request across the headline and history sections.
  const season = fetchSeasonCover(now);
  const tasks = [
    season.then(source => { const result = seasonCoverStatus(source, now); out.cover = result.cover; out.coverStatus = result.status; }),
    buildIceRecord(now, fetch, season).then(history => {
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

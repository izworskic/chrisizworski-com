// /api/ice — server side aggregation for the Michigan Ice Report.
//
// Two upstreams, neither of which sends CORS headers or can be called from a
// browser, plus one that is heavy enough to belong on the server:
//   1. NOAA GLERL current season daily ice concentration (.dat)
//   2. NOAA GLERL 54 year daily ice climatology per lake (.txt)
//   3. ACIS daily temperature records, used to compute accumulated freezing
//      degree days for the current season and a 10 year normal for today.
//
// Every section fails independently and returns null rather than taking the
// whole response down. Cached at the edge for 6 hours because none of these
// sources update more than daily.

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

// Ice season starts in October. Before October we are still inside the season
// that began the previous calendar year.
function seasonStartYear(d) {
  return d.getUTCMonth() + 1 >= 10 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}

function rowLabel(d) {
  return MON[d.getUTCMonth()] + '-' + String(d.getUTCDate()).padStart(2, '0');
}

function pad(n) { return String(n).padStart(2, '0'); }

/* ---------------------------------------------- GLERL current season cover */
async function currentCover(now) {
  const y = seasonStartYear(now);
  const url = 'https://apps.glerl.noaa.gov/coastwatch/webdata/statistic/ice/dat/' +
    'g' + y + '_' + (y + 1) + '_ice.dat';
  const r = await fetch(url, { headers: UA });
  if (!r.ok) return null;
  const txt = await r.text();
  const lines = txt.split('\n');
  let last = null;
  for (const line of lines) {
    const p = line.trim().split(/\s+/);
    if (p.length === 9 && /^\d{4}$/.test(p[0]) && /^\d+$/.test(p[1])) last = p;
  }
  if (!last) return null;
  return {
    seasonFile: 'g' + y + '_' + (y + 1) + '_ice.dat',
    year: Number(last[0]),
    dayOfYear: Number(last[1]),
    superior: Number(last[2]),
    michigan: Number(last[3]),
    huron: Number(last[4]),
    erie: Number(last[5]),
    ontario: Number(last[6]),
    stclair: Number(last[7]),
    total: Number(last[8])
  };
}

/* ---------------------------------------------- GLERL climatology for today */
async function climatology(lakeCode, now) {
  const file = { huron: 'hur', michigan: 'mic', superior: 'sup', erie: 'eri' }[lakeCode];
  if (!file) return null;
  const r = await fetch('https://www.glerl.noaa.gov/data/ice/glicd/daily/' + file + '.txt',
    { headers: UA });
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
    // current ice year column, labeled by the January calendar year
    const iceYear = String(now.getUTCMonth() + 1 >= 10
      ? now.getUTCFullYear() + 1 : now.getUTCFullYear());
    const idx = years.indexOf(iceYear);
    const curRaw = idx >= 0 ? cells[idx] : 'NA';
    return {
      date: label,
      yearsOfRecord: vals.length,
      mean: Math.round(mean * 10) / 10,
      median: Math.round(median * 10) / 10,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      current: curRaw === 'NA' ? null : Number(curRaw),
      firstYear: years[0],
      lastYear: years[years.length - 1]
    };
  }
  return null;
}

/* ---------------------------------------------- ACIS accumulated cold */
async function acisRange(sid, sdate, edate) {
  const r = await fetch('https://data.rcc-acis.org/StnData', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sid, sdate, edate, elems: 'maxt,mint' })
  });
  if (!r.ok) return null;
  const j = await r.json();
  return (j && j.data) || null;
}

// Standard net AFDD: running sum of (32 - daily mean), floored at zero.
function afddFrom(rows) {
  if (!rows) return null;
  let a = 0;
  for (const [, mx, mn] of rows) {
    const hi = parseFloat(mx), lo = parseFloat(mn);
    if (!isFinite(hi) || !isFinite(lo)) continue;
    a = Math.max(0, a + (32 - (hi + lo) / 2));
  }
  return Math.round(a);
}

async function coldFor(region, now) {
  const sy = seasonStartYear(now);
  const start = sy + '-11-01';
  const today = now.getUTCFullYear() + '-' + pad(now.getUTCMonth() + 1) + '-' + pad(now.getUTCDate());
  const cur = afddFrom(await acisRange(region.acis, start, today));

  // 10 year normal for the same calendar window
  const md = pad(now.getUTCMonth() + 1) + '-' + pad(now.getUTCDate());
  const norms = [];
  for (let k = 1; k <= 10; k++) {
    const s = (sy - k) + '-11-01';
    const e = (sy - k + (now.getUTCMonth() + 1 >= 11 ? 0 : 1)) + '-' + md;
    const v = afddFrom(await acisRange(region.acis, s, e));
    if (v !== null) norms.push(v);
  }
  const normal = norms.length
    ? Math.round(norms.reduce((a, b) => a + b, 0) / norms.length) : null;

  return { slug: region.slug, station: region.acis, seasonStart: start, afdd: cur, normal, normalYears: norms.length };
}

export default async function handler() {
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
    currentCover(now).then((v) => { out.cover = v; }).catch(() => { out.cover = null; }),
    climatology('huron', now).then((v) => { out.climatology.huron = v; }).catch(() => { out.climatology.huron = null; }),
    climatology('michigan', now).then((v) => { out.climatology.michigan = v; }).catch(() => { out.climatology.michigan = null; })
  ];
  for (const r of REGIONS) {
    tasks.push(coldFor(r, now).then((v) => { out.cold.push(v); })
      .catch(() => { out.cold.push({ slug: r.slug, station: r.acis, afdd: null, normal: null }); }));
  }
  await Promise.all(tasks);

  return new Response(JSON.stringify(out), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=21600, stale-while-revalidate=86400',
      'x-robots-tag': 'noindex, nofollow'
    }
  });
}

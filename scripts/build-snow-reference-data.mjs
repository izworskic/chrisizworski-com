#!/usr/bin/env node
// Builds the reference data behind Michigan Snow Totals. Run it to refresh:
//   node scripts/build-snow-reference-data.mjs
// Every number comes from a public source fetched here, never typed by hand:
//   - public/assets/michigan-places.json: U.S. Census 2024 Gazetteer (Michigan
//     places and counties), plus bare town names from last season's NWS Local
//     Storm Reports so unincorporated snowbelt towns such as Herman resolve.
//   - data/michigan-snow-climatology.json: NOAA ACIS daily snowfall for the
//     curated climate stations: last season's final totals against the
//     1991-2020 normal, and each station's first measurable snow (0.1 in.) over
//     the 1991-2020 seasons.
// It also rewrites the two static tables in public/michigan-snow-totals/index.html
// between their <!-- snow-...:start/end --> markers so search engines and
// no-JavaScript readers get the same figures.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../public/assets/snow-totals-core.js');
const root = path.resolve(import.meta.dirname, '..');
const UA = { 'User-Agent': 'chrisizworski.com Michigan snow totals reference build' };

// Curated NWS cooperative and airport climate stations: each has a 1991-2020
// snowfall normal in ACIS and a near-complete record last season. Display names
// say where the gauge actually is when the ACIS name would mislead.
export const STATIONS = [
  ['203744', 'Herman'], ['208706', 'Watton'], ['200718', 'Bergland Dam'],
  ['205184', 'Marquette NWS office (Negaunee Twp.)'], ['205178', 'Marquette (city)'], ['200770', 'Big Bay'], ['201435', 'Clarksburg'],
  ['204104', 'Ironwood'], ['204090', 'Iron Mountain-Kingsford'], ['207812', 'Iron River (Stambaugh)'], ['202626', 'Escanaba'],
  ['201486', 'Chatham (near Munising)'], ['208043', 'Tahquamenon Falls State Park'], ['207366', 'Sault Ste. Marie (airport)'],
  ['206507', 'Petoskey'], ['201468', 'Charlevoix'], ['202381', 'East Jordan'], ['200925', 'Boyne Falls'], ['205097', 'Maple City (Leelanau)'],
  ['206012', 'Northwest Michigan Research Farm (Leelanau)'], ['204257', 'Kalkaska'], ['200758', 'Beulah'], ['204502', 'Lake City'],
  ['203099', 'Gaylord NWS office'], ['201492', 'Cheboygan'], ['203391', 'Grayling'], ['203936', 'Houghton Lake (airport)'],
  ['200164', 'Alpena (airport)'], ['205533', 'Mio'], ['208800', 'West Branch'], ['202423', 'East Tawas'],
  ['205712', 'Muskegon (airport)'], ['203632', 'Hart'], ['205567', 'Montague'], ['203333', 'Grand Rapids (airport)'], ['200779', 'Big Rapids'],
  ['200710', 'Benton Harbor (airport)'], ['205892', 'Niles'], ['200552', 'Battle Creek'], ['208184', 'Three Rivers'],
  ['207227', 'Saginaw-Bay City-Midland (MBS airport)'], ['202846', 'Flint'], ['204641', 'Lansing (airport)'], ['203170', 'Gladwin'],
  ['201361', 'Cass City'], ['203585', 'Harbor Beach'],
  ['202103', 'Detroit (DTW airport)'], ['200230', 'Ann Arbor'], ['206658', 'Pontiac'], ['206680', 'Port Huron'], ['208941', 'White Lake'], ['203823', 'Hillsdale']
];

const LAST_SEASON = { start: '2025-07-01', end: '2026-06-30' };

async function text(url) { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.text(); }
async function acis(endpoint, body) {
  const r = await fetch(`https://data.rcc-acis.org/${endpoint}`, { method: 'POST', headers: { ...UA, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`ACIS ${endpoint} ${r.status}`);
  return r.json();
}
function gazetteer(tsv) {
  const [head, ...lines] = tsv.trim().split('\n');
  const cols = head.split('\t').map(s => s.trim());
  return lines.map(l => Object.fromEntries(l.split('\t').map((v, i) => [cols[i], v.trim()])));
}
const r4 = n => Math.round(n * 1e4) / 1e4;

async function buildPlaces(countyNames) {
  const base = 'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer';
  const places = gazetteer(await text(`${base}/2024_gaz_place_26.txt`)).map(p => [
    p.NAME.replace(/ (city|village|CDP|charter township|township)$/i, ''), r4(+p.INTPTLAT), r4(+p.INTPTLONG), 'p']);
  const counties = [...countyNames.entries()].map(([, c]) => [c.name, c.lat, c.lon, 'c']);
  // Townships cover rural communities that are not Census places (Kawkawlin,
  // Whitefish). Names shared by several townships (Grant, Lake) are ambiguous and skipped.
  const placeNames = new Set(places.map(p => core.normName(p[0])));
  const twp = gazetteer(await text(`${base}/2024_gaz_cousubs_26.txt`))
    .filter(t => / township$/i.test(t.NAME))
    .map(t => [t.NAME.replace(/ (charter )?township$/i, ''), r4(+t.INTPTLAT), r4(+t.INTPTLONG), 't', countyNames.get(t.GEOID.slice(0, 5))?.name || '']);
  const twpCount = new Map();
  twp.forEach(t => twpCount.set(core.normName(t[0]), (twpCount.get(core.normName(t[0])) || 0) + 1));
  const townships = twp.filter(t => twpCount.get(core.normName(t[0])) === 1 && !placeNames.has(core.normName(t[0])));
  // Bare LSR town names (no "4 NE" offset) from last season fill unincorporated towns.
  const lsr = JSON.parse(await text(`https://mesonet.agron.iastate.edu/geojson/lsr.php?states=MI&sts=2025-10-01T00:00Z&ets=2026-05-01T00:00Z`));
  const known = new Set(places.map(p => core.normName(p[0])));
  const extra = new Map();
  for (const f of lsr.features) {
    const p = f.properties;
    if (p.typetext !== 'SNOW' || p.st !== 'MI' || !p.city || /\d/.test(p.city) || !core.regionOf(p.county)) continue;
    const k = core.normName(p.city);
    if (!known.has(k) && !extra.has(k)) extra.set(k, [p.city.trim(), r4(p.lat), r4(p.lon), 'r']);
  }
  // A town the NWS actually receives reports from beats a same-named township
  // elsewhere (Paradise in Chippewa County, not Paradise Township near Traverse City).
  const kept = townships.filter(t => !extra.has(core.normName(t[0])));
  const all = [...places, ...counties, ...kept, ...extra.values()].sort((a, b) => a[0].localeCompare(b[0]));
  const out = {
    sources: ['U.S. Census Bureau 2024 Gazetteer Files (Michigan places, counties and uniquely named townships)', 'NWS Local Storm Reports 2025-26 via Iowa Environmental Mesonet (unincorporated town names)'],
    fields: ['name', 'lat', 'lon', 'kind: p place, c county, t township, r NWS report town', 'county (townships only)'],
    places: all
  };
  fs.writeFileSync(path.join(root, 'public/assets/michigan-places.json'), JSON.stringify(out));
  return all.length;
}

async function countyTable() {
  const rows = gazetteer(await text('https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_gaz_counties_26.txt'));
  return new Map(rows.map(c => [c.GEOID, { name: c.NAME.replace(/ County$/, ''), lat: r4(+c.INTPTLAT), lon: r4(+c.INTPTLONG) }]));
}

function seasonOf(date) { const [y, m] = date.split('-').map(Number); return m >= 7 ? y : y - 1; }
function monthDay(dayIndex) { const d = new Date(Date.UTC(2001, 6, 1) + dayIndex * 864e5); return d.toLocaleString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }); }
function quantile(sorted, q) { const i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)); }

async function firstSnowClimatology(sid) {
  const d = await acis('StnData', { sid, sdate: '1991-07-01', edate: '2021-06-30', elems: [{ name: 'snow' }] });
  const seasons = new Map();
  for (const [day, v] of d.data) { const s = seasonOf(day); if (!seasons.has(s)) seasons.set(s, []); seasons.get(s).push([day, v]); }
  const firsts = [];
  for (const [s, rows] of seasons) {
    const fallMissing = rows.filter(([day, v]) => /-(09|10|11|12)-/.test(day) && v === 'M').length;
    const hit = rows.find(([, v]) => { const n = core.acisValue(v); return n != null && n >= 0.1; });
    if (!hit || fallMissing > 10) continue;
    firsts.push(Math.round((Date.parse(hit[0]) - Date.UTC(s, 6, 1)) / 864e5));
  }
  if (firsts.length < 24) return null;
  firsts.sort((a, b) => a - b);
  return { seasons: firsts.length, median: monthDay(quantile(firsts, 0.5)), early: monthDay(quantile(firsts, 0.1)), late: monthDay(quantile(firsts, 0.9)), earliest: monthDay(firsts[0]) };
}

async function main() {
  const counties = await countyTable();
  const placeCount = await buildPlaces(counties);

  const sids = STATIONS.map(s => s[0]).join(',');
  const season = await acis('MultiStnData', { sids, sdate: LAST_SEASON.start, edate: LAST_SEASON.end, elems: [{ name: 'snow' }, { name: 'snow', normal: '1' }], meta: ['name', 'sids', 'll', 'county'] });
  const byId = new Map(season.data.map(s => [s.meta.sids.find(x => x.endsWith(' 2')).split(' ')[0], s]));
  const dates = [];
  for (let t = Date.parse(LAST_SEASON.start); t <= Date.parse(LAST_SEASON.end); t += 864e5) dates.push(new Date(t).toISOString().slice(0, 10));

  const stations = [];
  for (const [id, name] of STATIONS) {
    const s = byId.get(id);
    if (!s) throw new Error(`ACIS returned no data for ${id} ${name}`);
    const county = counties.get(s.meta.county)?.name;
    const region = core.regionOf(county);
    if (!region) throw new Error(`No region for ${name} (${s.meta.county})`);
    const lastSeason = core.seasonStation(s.data.map((row, i) => [dates[i], row[0], row[1]]));
    const firstSnow = await firstSnowClimatology(id);
    stations.push({ id, name, county, region, lat: r4(s.meta.ll[1]), lon: r4(s.meta.ll[0]), lastSeason, firstSnow });
    process.stdout.write('.');
  }
  const out = {
    generatedAt: new Date().toISOString().slice(0, 10),
    sources: {
      snowfall: 'NOAA Regional Climate Centers ACIS (data.rcc-acis.org), NWS cooperative and airport climate stations, daily snowfall',
      normals: 'NOAA 1991-2020 daily snowfall normals via ACIS',
      firstSnow: 'First day with at least 0.1 in. of snowfall after July 1, seasons 1991-92 through 2020-21; seasons with more than 10 missing September-December days are skipped; stations need 24 usable seasons'
    },
    lastSeason: { label: core.seasonLabel(LAST_SEASON.start), ...LAST_SEASON },
    stations
  };
  fs.writeFileSync(path.join(root, 'data/michigan-snow-climatology.json'), JSON.stringify(out, null, 1) + '\n');
  writeTables(out);
  console.log(`\n${placeCount} places, ${stations.length} stations, ${stations.filter(s => s.firstSnow).length} with first-snow climatology`);
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
export function tablesHtml(data) {
  const regionLabel = id => core.regionById(id).label;
  const order = core.REGIONS.map(r => r.id);
  const first = data.stations.filter(s => s.firstSnow).sort((a, b) => order.indexOf(a.region) - order.indexOf(b.region));
  const firstRows = first.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(regionLabel(s.region))}</td><td><strong>${s.firstSnow.median}</strong></td><td>${s.firstSnow.early} to ${s.firstSnow.late}</td><td>${s.firstSnow.earliest}</td></tr>`).join('\n');
  const last = [...data.stations].sort((a, b) => order.indexOf(a.region) - order.indexOf(b.region) || b.lastSeason.total - a.lastSeason.total);
  const lastRows = last.map(s => {
    const l = s.lastSeason;
    const pct = l.pctOfNormal != null ? `${l.pctOfNormal}%${l.missing ? ` <small>(${l.missing} d missing)</small>` : ''}` : (l.complete ? 'n/a' : `<span title="${l.missing} snow-season days missing">incomplete</span>`);
    return `<tr data-region="${s.region}"><td>${esc(s.name)}</td><td>${esc(regionLabel(s.region))}</td><td><strong>${l.total.toFixed(1)}</strong></td><td>${l.normal == null ? 'n/a' : l.normal.toFixed(1)}</td><td>${pct}</td></tr>`;
  }).join('\n');
  return { first: firstRows, last: lastRows };
}
function writeTables(data) {
  const file = path.join(root, 'public/michigan-snow-totals/index.html');
  let html = fs.readFileSync(file, 'utf8');
  const t = tablesHtml(data);
  for (const [key, rows] of [['snow-first', t.first], ['snow-last-season', t.last]]) {
    const re = new RegExp(`(<!-- ${key}:start -->)[\\s\\S]*?(<!-- ${key}:end -->)`);
    if (!re.test(html)) { console.warn(`marker ${key} not in page yet`); continue; }
    html = html.replace(re, `$1\n${rows}\n$2`);
  }
  fs.writeFileSync(file, html);
}

if (process.argv[1] === import.meta.filename) await main();

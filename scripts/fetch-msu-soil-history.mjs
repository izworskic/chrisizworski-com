#!/usr/bin/env node
/**
 * One-time download of measured spring soil temperatures from MSU Enviroweather (MAWN), for the
 * history in /michigan-soil-temperature/. Not part of any build or gate: it needs the network and
 * makes about 1,100 requests, so run it by hand, rarely (once a year after June 30 is plenty).
 *
 *   node scripts/fetch-msu-soil-history.mjs [--from 2016] [--to 2026]
 *   node scripts/build-soil-history.mjs            # then rebuild the page data
 *
 * Source: the public Enviroweather API the enviroweather.msu.edu site itself uses, with the
 * unregistered-user session it hands every visitor. Requests go one at a time with a pause.
 * Output: data/garden/msu-soil-2in-daily.json, the 2-inch daily average soil temperature
 * ((daily low + daily high) / 2, in tenths of a degree F) for Mar 1 to Jun 30 of each year.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'data', 'garden', 'msu-soil-2in-daily.json');
const API = 'https://api.enviroweather.msu.edu';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const FROM = arg('--from', 2016), TO = arg('--to', 2026);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function token() { return (await (await fetch(API + '/ewx-api/api/session')).json()).token; }

let T = await token();
async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { Authorization: 'Bearer ' + T } });
      const j = await r.json();
      if (j && /token/i.test(String(j.error || ''))) { T = await token(); continue; }
      return j;
    } catch { await sleep(3000); T = await token(); }
  }
  return null;
}

const all = await get(API + '/ewx-api/api/stations');
const stations = all.filter(s => s.state === 'MI' && String(s.ed_date || '') >= String(TO) + '-07');
const tenth = v => (v === null || v === undefined || v === '' ? null : Number(v));
const out = {
  source: 'MSU Enviroweather (Michigan Automated Weather Network), soilconditions model, api.enviroweather.msu.edu',
  fetched: new Date().toISOString().slice(0, 10),
  note: '2-inch soil, daily average = (low + high) / 2, tenths of a degree F, 122 values from Mar 1 to Jun 30. null = missing.',
  years: [], stations: [], daily: {}
};
for (let y = FROM; y <= TO; y++) out.years.push(y);
for (const s of stations) {
  out.stations.push({ id: s.station_id, serial: s.serial_id, name: s.disp_name, county: s.county, lat: Number(s.latitude), lon: Number(s.longitude), since: s.begin_date });
  out.daily[s.station_id] = {};
  for (const y of out.years) {
    if (s.begin_date > `${y}-03-01`) { out.daily[s.station_id][y] = null; continue; }
    const j = await get(`${API}/rm-api/api/run?resultModelCode=soilconditions&stationId=${s.serial_id}&stationCode=${s.station_id}&stationType=1&selectDate=06/30/${y}&dateStart=03/01/${y}`);
    const rows = (j && j.data && j.data.Table) || [];
    const byDate = Object.fromEntries(rows.map(r => [r.date, r]));
    const vals = [];
    for (let d = new Date(Date.UTC(y, 2, 1)); d <= new Date(Date.UTC(y, 5, 30)); d.setUTCDate(d.getUTCDate() + 1)) {
      const r = byDate[d.toISOString().slice(0, 10)], lo = r && tenth(r.stmp_05cm_min), hi = r && tenth(r.stmp_05cm_max);
      vals.push(lo === null || hi === null || lo === undefined || hi === undefined || !(hi >= lo) ? null : Math.round((lo + hi) / 2 * 10));
    }
    out.daily[s.station_id][y] = vals;
    await sleep(500);
  }
  console.log(s.station_id, s.disp_name);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('wrote', path.relative(root, OUT), out.stations.length, 'stations');

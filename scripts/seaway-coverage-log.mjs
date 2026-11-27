#!/usr/bin/env node
// OFFLINE RESEARCH LOGGER. Polls the same Open Waters regional AIS queries the Seaway page
// uses and appends compact observations to NDJSON, so receiver coverage per region and
// real vessel movement between regions can be measured. Never published as live data.
//
// Usage: node scripts/seaway-coverage-log.mjs --out FILE [--minutes 345] [--interval 180]
//   Exits 0 without polling while the Seaway is closed for the season (seaway-season.js).
import { appendFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { regions, sourceUrl, assess } = require('../lib/seaway-ais.js');
const { seasonState } = require('../public/assets/seaway-season.js');
const seasonData = require('../data/seaway/season.json');

const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const out = arg('out', null);
const minutes = Number(arg('minutes', 345));
const intervalSec = Number(arg('interval', 180));
const once = process.argv.includes('--once');
if (!out) { console.error('--out FILE is required'); process.exit(2); }
if (!(minutes > 0 && minutes <= 350) || !(intervalSec >= 60 && intervalSec <= 3600)) {
  console.error('minutes must be 1-350 and interval 60-3600 seconds'); process.exit(2);
}

const season = seasonState(seasonData, new Date());
if (season.state === 'closed' && !process.argv.includes('--ignore-season')) {
  console.log(`Seaway closed for the season (${season.headline}); nothing to log.`);
  process.exit(0);
}

const headers = { Accept: 'application/geo+json,application/json', 'User-Agent': 'SeawayCoverageStudy/1.0 (+https://chrisizworski.com/st-lawrence-seaway/)' };
if (process.env.OPEN_WATERS_API_TOKEN) headers.Authorization = 'Bearer ' + process.env.OPEN_WATERS_API_TOKEN;
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function pollOnce(fetcher = fetch, now = () => Date.now()) {
  const polledAt = new Date(now()).toISOString();
  const regionRows = [], vessels = [];
  for (const r of regions) {
    const started = now();
    try {
      const res = await fetcher(sourceUrl(r.id), { headers, signal: AbortSignal.timeout(20000) });
      if (!res.ok) { regionRows.push({ id: r.id, state: 'error', http: res.status, ms: now() - started }); continue; }
      const result = assess(await res.json(), r.id, now());
      regionRows.push({ id: r.id, state: result.state, count: result.vessels.length, truncated: result.truncated, ms: now() - started });
      for (const v of result.vessels) {
        vessels.push({ r: r.id, mmsi: v.mmsi, name: v.name || null, lat: v.lat, lon: v.lon, sog: v.speedKnots ?? null,
          cog: v.course ?? null, hdg: v.heading ?? null, seen: v.seen, type: v.shipType ?? null, len: v.lengthMeters ?? null, dest: v.destination ?? null });
      }
    } catch (error) {
      regionRows.push({ id: r.id, state: 'error', error: error?.name === 'TimeoutError' ? 'timeout' : 'network', ms: now() - started });
    }
  }
  return { polledAt, season: season.state, regions: regionRows, vessels };
}

async function main() {
  await mkdir(path.dirname(path.resolve(out)), { recursive: true });
  const deadline = Date.now() + minutes * 60000;
  let polls = 0;
  do {
    const started = Date.now();
    const row = await pollOnce();
    await appendFile(out, JSON.stringify(row) + '\n');
    polls++;
    const summary = row.regions.map(r => `${r.id}:${r.state === 'error' ? 'ERR' : r.count}`).join(' ');
    console.log(`${row.polledAt} ${summary}`);
    if (once) break;
    const wait = intervalSec * 1000 - (Date.now() - started);
    if (Date.now() + wait >= deadline) break;
    await sleep(Math.max(0, wait));
  } while (Date.now() < deadline);
  console.log(`logged ${polls} polls to ${out}`);
}

if (import.meta.url === new URL('file://' + path.resolve(process.argv[1])).href) await main();

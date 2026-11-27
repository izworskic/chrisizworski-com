#!/usr/bin/env node
// OFFLINE RESEARCH ONLY. Extracts St. Lawrence corridor positions from a NOAA Marine Cadastre
// daily AIS file (public domain, US-received broadcasts) as compact NDJSON points for
// lib/seaway-passage.js. Keeps at most one fix per ship per minute. No live claims.
//
// Usage: node scripts/seaway-noaa-corridor.mjs --input ais-YYYY-MM-DD.csv.zst --out points.ndjson [--bbox latMin,lonMin,latMax,lonMax]
import { createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { parseCsvLine, noaaUtc } from './cuyahoga-noaa-points.mjs';

export const CORRIDOR = [44.05, -76.6, 45.6, -73.35]; // lat min, lon min, lat max, lon max
const key = s => String(s).trim().replace(/^﻿/, '').toLowerCase().replace(/[_\s-]/g, '');
const ALIASES = { mmsi: ['mmsi'], time: ['basedatetime'], lon: ['longitude', 'lon'], lat: ['latitude', 'lat'],
  sog: ['sog'], type: ['vesseltype'], len: ['length'] };
// Cheap prefilter on raw text: whole-degree longitude and latitude of the bbox, in either
// column order. For the Seaway corridor this is -76..-73 and 44..45 (the original filter).
export function prefilterFor(bbox) {
  const ints = (lo, hi) => { const out = []; for (let d = Math.trunc(lo); lo < 0 ? d >= Math.trunc(hi) : d <= Math.trunc(hi); d += lo < 0 ? -1 : 1) out.push(d); return out; };
  const lat = ints(Math.min(bbox[0], bbox[2]), Math.max(bbox[0], bbox[2])).join('|');
  const lonLo = Math.max(bbox[1], bbox[3]), lonHi = Math.min(bbox[1], bbox[3]); // e.g. -73.35 .. -76.6
  const lon = ints(lonLo, lonHi).join('|');
  return new RegExp(`,(?:${lon})\\.\\d+,(?:${lat})\\.\\d+|,(?:${lat})\\.\\d+,(?:${lon})\\.\\d+`);
}

export function columns(header) {
  const names = parseCsvLine(header).map(key), out = {};
  for (const [k, al] of Object.entries(ALIASES)) {
    const i = names.findIndex(n => al.includes(n));
    if (i < 0 && ['mmsi', 'time', 'lon', 'lat'].includes(k)) throw Error('NOAA AIS column missing: ' + k);
    out[k] = i;
  }
  return out;
}

export function createExtractor(bbox = CORRIDOR) {
  const PREFILTER = prefilterFor(bbox);
  const last = new Map();
  const stats = { lines: 0, prefiltered: 0, kept: 0, throttled: 0 };
  let cols = null;
  return {
    stats,
    line(text) {
      if (!cols) { cols = columns(text); return null; }
      stats.lines++;
      if (!PREFILTER.test(text)) return null;
      stats.prefiltered++;
      const c = parseCsvLine(text);
      const mmsi = (c[cols.mmsi] || '').trim();
      if (!/^\d{9}$/.test(mmsi)) return null;
      const lat = Number(c[cols.lat]), lon = Number(c[cols.lon]);
      if (!(lat >= bbox[0] && lat <= bbox[2] && lon >= bbox[1] && lon <= bbox[3])) return null;
      const iso = noaaUtc(c[cols.time]); if (!iso) return null;
      const t = Date.parse(iso);
      const prev = last.get(mmsi);
      if (prev !== undefined && Math.abs(t - prev) < 60000) { stats.throttled++; return null; }
      last.set(mmsi, t);
      const num = i => { if (i < 0) return null; const v = Number(c[i]); return c[i] !== '' && Number.isFinite(v) ? v : null; };
      stats.kept++;
      return { mmsi, t, lat, lon, sog: num(cols.sog), type: num(cols.type), len: num(cols.len) };
    }
  };
}

async function main() {
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
  const input = arg('input'), out = arg('out');
  const bbox = arg('bbox') ? arg('bbox').split(',').map(Number) : CORRIDOR;
  if (bbox.length !== 4 || bbox.some(n => !Number.isFinite(n))) { console.error('--bbox latMin,lonMin,latMax,lonMax'); process.exit(2); }
  if (!input || !out) { console.error('--input and --out are required'); process.exit(2); }
  const child = spawn('zstd', ['-dc', input], { stdio: ['ignore', 'pipe', 'inherit'] });
  const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
  const ex = createExtractor(bbox), sink = createWriteStream(out);
  for await (const line of rl) {
    const p = ex.line(line);
    if (p && !sink.write(JSON.stringify(p) + '\n')) await new Promise(r => sink.once('drain', r));
  }
  await new Promise(r => sink.end(r));
  const code = await new Promise(r => child.on('close', r));
  if (code !== 0) { console.error('zstd failed: ' + code); process.exit(1); }
  console.log(JSON.stringify({ input: path.basename(input), ...ex.stats }));
}

if (process.argv[1] && import.meta.url === new URL('file://' + path.resolve(process.argv[1])).href) await main();

#!/usr/bin/env node
// OFFLINE RESEARCH ONLY. Extracts St. Lawrence corridor positions from a NOAA Marine Cadastre
// daily AIS file (public domain, US-received broadcasts) as compact NDJSON points for
// lib/seaway-passage.js. Keeps at most one fix per ship per minute. No live claims.
//
// Usage: node scripts/seaway-noaa-corridor.mjs --input ais-YYYY-MM-DD.csv.zst --out points.ndjson
import { createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { parseCsvLine, noaaUtc } from './cuyahoga-noaa-points.mjs';

export const CORRIDOR = [44.05, -76.6, 45.6, -73.35]; // lat min, lon min, lat max, lon max
const key = s => String(s).trim().replace(/^﻿/, '').toLowerCase().replace(/[_\s-]/g, '');
const ALIASES = { mmsi: ['mmsi'], time: ['basedatetime'], lon: ['longitude', 'lon'], lat: ['latitude', 'lat'],
  sog: ['sog'], type: ['vesseltype'], len: ['length'] };
// Cheap prefilter on raw text: a longitude in -76.x .. -73.x and a latitude in 44.x/45.x.
const PREFILTER = /,-7[3-6]\.\d+,4[45]\.\d+|,4[45]\.\d+,-7[3-6]\.\d+/;

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
  if (!input || !out) { console.error('--input and --out are required'); process.exit(2); }
  const child = spawn('zstd', ['-dc', input], { stdio: ['ignore', 'pipe', 'inherit'] });
  const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
  const ex = createExtractor(), sink = createWriteStream(out);
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

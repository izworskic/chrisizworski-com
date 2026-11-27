#!/usr/bin/env node
// OFFLINE RESEARCH. Summarizes Seaway coverage logs (scripts/seaway-coverage-log.mjs) and,
// optionally, NOAA corridor extracts: receiver coverage per region, observed passages and a
// held-out evaluation of passage windows (lib/seaway-passage.js). Prints no live claims.
//
// Usage: node scripts/seaway-coverage-report.mjs --dir DIR [--noaa FILE.ndjson ...] [--summary] [--out FILE.json]
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const engine = require('../lib/seaway-passage.js');

const args = process.argv.slice(2);
const many = name => args.flatMap((a, i) => a === '--' + name && args[i + 1] ? [args[i + 1]] : []);
const dir = many('dir')[0];
const outFile = many('out')[0];
const markdown = args.includes('--summary');

export function readLiveLogs(directory) {
  const polls = [], points = [];
  if (!directory || !existsSync(directory)) return { polls, points };
  const files = readdirSync(directory, { recursive: true }).map(String).filter(f => f.endsWith('.ndjson'));
  for (const f of files) {
    for (const line of readFileSync(path.join(directory, f), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let row; try { row = JSON.parse(line); } catch { continue; }
      if (!row.polledAt || !Array.isArray(row.regions)) continue;
      polls.push(row);
      for (const v of row.vessels || []) {
        const t = Date.parse(v.seen);
        if (Number.isFinite(t)) points.push({ mmsi: v.mmsi, t, lat: v.lat, lon: v.lon, sog: v.sog, type: v.type, len: v.len, source: 'live' });
      }
    }
  }
  return { polls, points };
}

export function readNoaa(files) {
  const points = [];
  for (const f of files) {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { const p = JSON.parse(line); if (Number.isFinite(p.t)) points.push({ ...p, source: 'noaa' }); } catch { /* skip */ }
    }
  }
  return points;
}

export function coverage(polls) {
  const byRegion = {};
  for (const p of polls) for (const r of p.regions) {
    const s = byRegion[r.id] ||= { polls: 0, withReports: 0, errors: 0, reports: 0 };
    s.polls++;
    if (r.state === 'error') s.errors++;
    else if (r.count > 0) { s.withReports++; s.reports += r.count; }
  }
  for (const s of Object.values(byRegion)) s.shareWithReports = s.polls ? s.withReports / s.polls : 0;
  const times = polls.map(p => Date.parse(p.polledAt)).filter(Number.isFinite).sort((a, b) => a - b);
  return { polls: polls.length, from: times[0] ? new Date(times[0]).toISOString() : null, to: times.length ? new Date(times.at(-1)).toISOString() : null, byRegion };
}

// Split by calendar day: even UTC day-of-year trains, odd tests (no shared passage).
export function holdout(passages) {
  const train = [], test = [];
  for (const p of passages) {
    const day = Math.floor(p.fixes[0].t / 86400000);
    (day % 2 === 0 ? train : test).push(p);
  }
  return { train, test };
}

function main() {
  const live = readLiveLogs(dir);
  const noaa = readNoaa(many('noaa'));
  const cov = coverage(live.polls);
  const report = { generatedAt: new Date().toISOString(), purpose: 'OFFLINE_SEAWAY_COVERAGE_AND_PASSAGE_RESEARCH', liveCoverage: cov, sources: {} };
  for (const [name, pts] of [['live', live.points], ['noaa', noaa], ['combined', [...live.points, ...noaa]]]) {
    if (!pts.length) continue;
    const ps = engine.passages(pts);
    const crossings = {};
    for (const p of ps) for (const [vid, km] of Object.entries(engine.VIEW_KM)) if (engine.crossingTime(p, km) !== null) crossings[vid] = (crossings[vid] || 0) + 1;
    const { train, test } = holdout(ps);
    report.sources[name] = { points: pts.length, ships: new Set(pts.map(p => p.mmsi)).size, passages: ps.length,
      upbound: ps.filter(p => p.dir > 0).length, downbound: ps.filter(p => p.dir < 0).length, viewpointCrossings: crossings,
      heldOut: train.length && test.length ? engine.evaluate(train, test) : null };
  }
  if (outFile) writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n');
  if (markdown) {
    const lines = ['## Seaway coverage and passage research', '', `Live polls: ${cov.polls} (${cov.from || '-'} to ${cov.to || '-'})`, '',
      '| Region | Polls | Share with reports | Errors |', '| --- | ---: | ---: | ---: |'];
    for (const [id, s] of Object.entries(cov.byRegion)) lines.push(`| ${id} | ${s.polls} | ${(s.shareWithReports * 100).toFixed(0)}% | ${s.errors} |`);
    for (const [name, s] of Object.entries(report.sources)) {
      lines.push('', `### ${name}: ${s.points} points, ${s.ships} ships, ${s.passages} passages (${s.upbound} up / ${s.downbound} down)`);
      lines.push('Viewpoint crossings: ' + (Object.entries(s.viewpointCrossings).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'));
      if (s.heldOut) {
        lines.push('', `Held-out windows (nominal ${(s.heldOut.nominal * 100).toFixed(0)}%), ${s.heldOut.forecasts} forecasts:`, '', '| Viewpoint, lead | n | Hit rate | Median abs error | Median width |', '| --- | ---: | ---: | ---: | ---: |');
        for (const [k, v] of Object.entries(s.heldOut.summary).sort()) lines.push(`| ${k} | ${v.n} | ${(v.hitRate * 100).toFixed(0)}% | ${v.medianAbsErrMin.toFixed(0)} min | ${v.medianWidthMin.toFixed(0)} min |`);
      }
    }
    lines.push('', 'Research only: no window here is published or validated for visitors.');
    console.log(lines.join('\n'));
  } else console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === new URL('file://' + path.resolve(process.argv[1])).href) main();

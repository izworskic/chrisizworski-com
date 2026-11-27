#!/usr/bin/env node
// OFFLINE RESEARCH. Corridor-agnostic passage study: NOAA corridor points + a corridor config
// (data/passage-corridors/*.json) -> passages, viewpoint crossings and a split-conformal
// held-out evaluation, with each (viewpoint, lead) graded against the release bar.
//
// Usage: node scripts/passage-study.mjs --corridor data/passage-corridors/X.json --points a.ndjson [...]
//          [--out study.json] [--summary]
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { create } = require('../lib/river-passage.js');
export const BAR = { minTestPassages: 50, minHitRate: 0.75, maxWindowMin: 180 };

export function study(corridorConfig, points, coverage = 0.8) {
  const c = create(corridorConfig);
  const passages = c.passages(points);
  const crossings = {};
  for (const p of passages) for (const [vid, km] of Object.entries(c.VIEW_KM)) if (c.crossingTime(p, km) !== null) crossings[vid] = (crossings[vid] || 0) + 1;
  const day = p => Math.floor(p.fixes[0].t / 86400000) % 3;
  const train = passages.filter(p => day(p) === 0), calib = passages.filter(p => day(p) === 1), test = passages.filter(p => day(p) === 2);
  const ev = c.evaluateCalibrated(train, calib, test, coverage);
  const graded = {};
  for (const [k, s] of Object.entries(ev.summary)) graded[k] = { ...s, meetsBar: s.n >= BAR.minTestPassages && s.hitRate >= BAR.minHitRate && s.windowMin <= BAR.maxWindowMin };
  return { corridor: corridorConfig.id, points: points.length, ships: new Set(points.map(p => p.mmsi)).size, passages: passages.length,
    positive: passages.filter(p => p.dir > 0).length, negative: passages.filter(p => p.dir < 0).length, crossings,
    split: { train: train.length, calibrate: calib.length, test: test.length }, coverage, bar: BAR, results: graded };
}

function main() {
  const args = process.argv.slice(2);
  const many = n => args.flatMap((a, i) => a === '--' + n && args[i + 1] ? [args[i + 1]] : []);
  const cfgFile = many('corridor')[0], files = many('points');
  if (!cfgFile || !files.length) { console.error('--corridor FILE and --points FILE (repeatable) are required'); process.exit(2); }
  const cfg = JSON.parse(readFileSync(cfgFile, 'utf8'));
  const points = [];
  for (const f of files) for (const line of readFileSync(f, 'utf8').split('\n')) if (line) points.push(JSON.parse(line));
  const r = study(cfg, points);
  if (many('out')[0]) writeFileSync(many('out')[0], JSON.stringify(r, null, 2) + '\n');
  if (!args.includes('--summary')) { console.log(JSON.stringify(r, null, 2)); return; }
  const lines = [`## ${cfg.name}: ${r.points} points, ${r.ships} ships, ${r.passages} passages (${r.positive} ${cfg.positiveDirection || 'positive'} / ${r.negative} other)`,
    'Crossings: ' + Object.entries(r.crossings).map(([k, v]) => `${k} ${v}`).join(', '), '',
    `Calibrated windows (target ${r.coverage * 100}%; passages train ${r.split.train} / calibrate ${r.split.calibrate} / test ${r.split.test})`, '',
    '| Viewpoint, lead | Test passages | Hit rate | Window | Median abs error | Meets bar |', '| --- | ---: | ---: | ---: | ---: | --- |'];
  for (const [k, v] of Object.entries(r.results).sort()) lines.push(`| ${k} | ${v.n} | ${(v.hitRate * 100).toFixed(0)}% | ${v.windowMin.toFixed(0)} min | ${v.medianAbsErrMin.toFixed(0)} min | ${v.meetsBar ? 'yes' : 'no'} |`);
  console.log(lines.join('\n'));
}

if (process.argv[1] && import.meta.url === new URL('file://' + path.resolve(process.argv[1])).href) main();

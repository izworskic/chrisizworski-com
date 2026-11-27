#!/usr/bin/env node
// Builds the published Thousand Islands passage model from NOAA corridor extracts
// (scripts/seaway-noaa-corridor.mjs). Same split and calibration as the research report:
// day-of-year mod 3 = train / calibrate / test. Only (viewpoint, lead) windows that meet the
// documented release bar are published; everything else is omitted, not guessed.
//
// Usage: node scripts/build-thousand-islands-model.mjs --noaa a.ndjson [--noaa b.ndjson ...] \
//          --source "NOAA ... run 46020845579" --out data/thousand-islands/passage-model.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const engine = require('../lib/seaway-passage.js');

export const PUBLISHED_VIEWPOINTS = ['alexandria-bay', 'clayton'];
export const BAR = { minTestPassages: 50, minHitRate: 0.75, maxWindowMin: 180 };
const COVERAGE = 0.8;

export function buildPublishedModel(points, { source = '', generatedAt = new Date().toISOString() } = {}) {
  const passages = engine.passages(points);
  const day = p => Math.floor(p.fixes[0].t / 86400000) % 3;
  const train = passages.filter(p => day(p) === 0), calib = passages.filter(p => day(p) === 1), test = passages.filter(p => day(p) === 2);
  const evaluation = engine.evaluateCalibrated(train, calib, test, COVERAGE);
  const full = engine.buildModel(train);
  const windows = {};
  for (const [key, s] of Object.entries(evaluation.summary)) {
    const [vid, bucket] = key.split(' ');
    if (!PUBLISHED_VIEWPOINTS.includes(vid)) continue;
    const ok = s.n >= BAR.minTestPassages && s.hitRate >= BAR.minHitRate && s.windowMin <= BAR.maxWindowMin;
    if (!ok) continue;
    (windows[vid] ||= {})[bucket] = { halfWidthMin: Math.round(s.halfWidthMin * 10) / 10, testPassages: s.n,
      hitRate: Math.round(s.hitRate * 1000) / 1000, medianAbsErrMin: Math.round(s.medianAbsErrMin * 10) / 10 };
  }
  // Median minutes from each checkpoint to each published viewpoint (train split only).
  const medians = {};
  for (const [key, samples] of Object.entries(full.samples)) {
    const [dir, cp, vid] = key.split('|');
    if (!windows[vid] || samples.length < 8) continue;
    medians[key] = { m: Math.round(engine.quantile(samples, 0.5) * 10) / 10, n: samples.length };
  }
  return {
    schema: 'thousand-islands-passage-model-v1',
    generatedAt, source, coverage: COVERAGE, bar: BAR, checkpointKm: full.checkpointKm,
    split: { train: train.length, calibrate: calib.length, test: test.length },
    viewpoints: Object.fromEntries(PUBLISHED_VIEWPOINTS.filter(v => windows[v]).map(v => [v, { km: Math.round(engine.VIEW_KM[v] * 100) / 100, name: engine.VIEWPOINTS[v].name }])),
    windows, medians
  };
}

function main() {
  const args = process.argv.slice(2);
  const many = n => args.flatMap((a, i) => a === '--' + n && args[i + 1] ? [args[i + 1]] : []);
  const files = many('noaa'), out = many('out')[0], source = many('source')[0] || '';
  if (!files.length || !out) { console.error('--noaa FILE (repeatable) and --out FILE are required'); process.exit(2); }
  const points = [];
  for (const f of files) for (const line of readFileSync(f, 'utf8').split('\n')) if (line) points.push(JSON.parse(line));
  const model = buildPublishedModel(points, { source });
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(model, null, 1) + '\n');
  console.log(JSON.stringify({ out, split: model.split, windows: model.windows, medians: Object.keys(model.medians).length }, null, 1));
}

if (process.argv[1] && import.meta.url === new URL('file://' + path.resolve(process.argv[1])).href) main();

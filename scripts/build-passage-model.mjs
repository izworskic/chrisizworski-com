#!/usr/bin/env node
// Builds a published passage model for one page from a corridor config and NOAA corridor points.
// Same split, calibration and release bar as scripts/passage-study.mjs. Only (viewpoint, lead)
// windows that meet the bar are written; the corridor geometry is embedded so the browser can
// project live AIS positions with lib/river-passage.js.
//
// Usage: node scripts/build-passage-model.mjs --corridor data/passage-corridors/X.json \
//          --viewpoints a,b,c --points a.ndjson [...] --source "..." --out data/<page>/passage-model.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { create } = require('../lib/river-passage.js');
export const BAR = { minTestPassages: 50, minHitRate: 0.75, maxWindowMin: 180 };
const COVERAGE = 0.8;

export function buildModel(cfg, points, viewpointIds, { source = '', generatedAt = new Date().toISOString() } = {}) {
  const c = create(cfg);
  const passages = c.passages(points);
  const day = p => Math.floor(p.fixes[0].t / 86400000) % 3;
  const train = passages.filter(p => day(p) === 0), calib = passages.filter(p => day(p) === 1), test = passages.filter(p => day(p) === 2);
  const ev = c.evaluateCalibrated(train, calib, test, COVERAGE);
  const windows = {};
  for (const [key, s] of Object.entries(ev.summary)) {
    const [vid, bucket] = key.split(' ');
    if (!viewpointIds.includes(vid)) continue;
    if (!(s.n >= BAR.minTestPassages && s.hitRate >= BAR.minHitRate && s.windowMin <= BAR.maxWindowMin)) continue;
    (windows[vid] ||= {})[bucket] = { halfWidthMin: Math.round(s.halfWidthMin * 10) / 10, testPassages: s.n,
      hitRate: Math.round(s.hitRate * 1000) / 1000, medianAbsErrMin: Math.round(s.medianAbsErrMin * 10) / 10 };
  }
  const trained = c.buildModel(train);
  const medians = {};
  for (const [key, samples] of Object.entries(trained.samples)) {
    const vid = key.split('|')[2];
    if (!windows[vid] || samples.length < 8) continue;
    medians[key] = { m: Math.round(c.quantile(samples, 0.5) * 10) / 10, n: samples.length };
  }
  const published = viewpointIds.filter(v => windows[v]);
  return {
    schema: 'river-passage-model-v1', corridor: cfg.id, generatedAt, source, coverage: COVERAGE, bar: BAR,
    checkpointKm: trained.checkpointKm, split: { train: train.length, calibrate: calib.length, test: test.length },
    geometry: { channel: cfg.channel, refLat: cfg.refLat, maxOffsetKm: cfg.maxOffsetKm,
      positiveLabel: cfg.positiveDirectionLabel, negativeLabel: cfg.negativeDirectionLabel,
      viewpoints: Object.fromEntries(published.map(v => [v, cfg.viewpoints[v]])) },
    viewpoints: Object.fromEntries(published.map(v => [v, { km: Math.round(c.VIEW_KM[v] * 100) / 100, name: cfg.viewpoints[v].name }])),
    windows, medians
  };
}

function main() {
  const args = process.argv.slice(2);
  const many = n => args.flatMap((a, i) => a === '--' + n && args[i + 1] ? [args[i + 1]] : []);
  const cfgFile = many('corridor')[0], out = many('out')[0], files = many('points');
  const ids = (many('viewpoints')[0] || '').split(',').filter(Boolean);
  if (!cfgFile || !out || !files.length || !ids.length) { console.error('--corridor, --viewpoints, --points and --out are required'); process.exit(2); }
  const cfg = JSON.parse(readFileSync(cfgFile, 'utf8'));
  const points = [];
  for (const f of files) for (const line of readFileSync(f, 'utf8').split('\n')) if (line) points.push(JSON.parse(line));
  const model = buildModel(cfg, points, ids, { source: many('source')[0] || '' });
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(model) + '\n');
  console.log(JSON.stringify({ out, split: model.split, windows: model.windows, medians: Object.keys(model.medians).length }, null, 1));
}

if (process.argv[1] && import.meta.url === new URL('file://' + path.resolve(process.argv[1])).href) main();

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Engine = require('../public/assets/holiday-travel-engine.js');
const data = JSON.parse(fs.readFileSync('public/holiday-travel/data/national.json', 'utf8'));
const eng = Engine.create(data);
const base = { hol: 'th', len: 4, outBand: 1, retBand: 1 };

test('dataset is complete and covers the documented seasons', () => {
  assert.deepEqual(data.meta.seasons, [2018, 2019, 2022, 2023, 2024, 2025]);
  assert.ok(data.airports.length >= 60);
  assert.ok(data.meta.windowDepartures > 2_500_000);
  for (const hol of ['th', 'xm']) for (const m of ['major', 'late', 'cancel']) {
    assert.equal(data.holidays[hol].nat[m].length, 13);
    assert.ok(data.holidays[hol].nat[m].every(r => r.length === 6 && r.every(Number.isFinite)));
  }
});

test('ranking depends on the airport (the old page ranked identically for all airports)', () => {
  const a = eng.rank({ ...base, from: 'ATL', to: 'ATL' })[0];
  const o = eng.rank({ ...base, from: 'ORD', to: 'ORD' })[0];
  assert.ok(o.mean > a.mean * 1.5, 'ORD should be materially riskier than ATL');
  const none = eng.rank({ ...base, from: 'ZZZ', to: 'ZZZ' })[0].mean;
  assert.ok(a.mean < none && none < o.mean, 'unknown-airport national baseline sits between ATL and ORD');
});

test('time of day changes the odds a lot', () => {
  const morning = eng.trip({ hol: 'th', from: 'DTW', to: 'DTW', outOffset: 3, retOffset: 3, outBand: 0, retBand: 0 }).out.major;
  const evening = eng.trip({ hol: 'th', from: 'DTW', to: 'DTW', outOffset: 3, retOffset: 3, outBand: 4, retBand: 4 }).out.major;
  assert.ok(evening > morning * 2);
});

test('Thanksgiving Sunday evening is rough and the holiday morning is calm', () => {
  const sun = eng.leg('th', 3, 4, null).major, thu = eng.leg('th', 0, 0, null).major;
  assert.ok(sun > 0.15 && thu < 0.04);
});

test('trip risk combines legs and respects trip length', () => {
  const t = eng.trip({ hol: 'xm', from: 'ORD', to: 'DEN', outOffset: -3, retOffset: 2, outBand: 1, retBand: 2 });
  const expect = 1 - (1 - t.out.major) * (1 - t.ret.major);
  assert.ok(Math.abs(t.mean - expect) < 1e-12);
  assert.ok(t.mean > t.out.major && t.mean > t.ret.major);
  const r = eng.rank({ hol: 'xm', len: 5, from: 'ORD', to: 'DEN', outBand: 1, retBand: 1 });
  assert.ok(r.every(x => x.retOffset - x.outOffset === 5 && x.retOffset <= 6));
  assert.equal(r.length, 8);
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].mean <= r[i].mean);
});

test('reports spread and worst season, not just an average', () => {
  const t = eng.trip({ hol: 'xm', from: 'ORD', to: 'ORD', outOffset: -2, retOffset: 2, outBand: 4, retBand: 4 });
  assert.equal(t.perSeason.length, 6);
  assert.ok(t.worst >= t.median && t.median > 0);
  assert.ok(t.worst > t.mean, 'Dec 2022 storm should make the worst season exceed the average');
  assert.ok(t.rough >= 1);
});

test('unknown airport falls back to the national rate without throwing', () => {
  const a = eng.leg('th', 1, 2, 'ZZZ'), b = eng.leg('th', 1, 2, null);
  assert.equal(a.major, b.major);
  assert.equal(a.factor, 1);
  assert.throws(() => eng.leg('th', 9, 0, null), RangeError);
});

test('the conventional trip is a benchmark the best choice should beat or equal', () => {
  const best = eng.rank({ ...base, from: 'DTW', to: 'DTW', len: 4 })[0];
  const conv = eng.conventional({ ...base, from: 'DTW', to: 'DTW' });
  assert.ok(best.mean <= conv.mean);
});

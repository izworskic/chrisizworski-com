'use strict';
// Compare the browser's local airport matching with a separately written Rust oracle.
// The Rust binary is produced in CI only. No WASM or model ships to visitors.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { rankChoices } = require('../../public/assets/holiday-travel-choices.js');

const binary = process.argv[2];
if (!binary || !fs.existsSync(binary)) {
  console.error('Usage: node scripts/holiday-travel/compare-choice-ranking.cjs /path/to/rust-binary');
  process.exit(2);
}
const airports = JSON.parse(fs.readFileSync('public/holiday-travel/data/national.json', 'utf8')).airports;
const choices = airports.map(a => ({ value: a.code, label: a.city + ' (' + a.code + ')' }));
const queries = ['', 'ATL', 'dtw', 'Detroit', 'dallas', 'fort worth', 'San Diego', 'new york',
  'York New', 'Seattle', 'miami', 'D.C.', 'Chicago', 'fl', 'not a real airport', 'LAX'];
const input = queries.flatMap(q => choices.map(o => q + '\t' + o.value + '\t' + o.label)).join('\n') + '\n';
const r = spawnSync(binary, [], { input, encoding: 'utf8', maxBuffer: 3 * 1024 * 1024 });
assert.equal(r.status, 0, r.stderr || 'Rust oracle failed');
const scores = r.stdout.trim().split('\n').map(Number);
assert.equal(scores.length, queries.length * choices.length);
queries.forEach((q, ix) => {
  const expected = choices.map((o, i) => ({ code: o.value, i, score: scores[ix * choices.length + i] }))
    .filter(o => o.score >= 0)
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .slice(0, 9)
    .map(o => o.code);
  const actual = rankChoices(choices, q, 9).map(o => o.value);
  assert.deepEqual(actual, expected, 'Rust/JS ranking mismatch for query: ' + q);
});
console.log('Rust/JS airport search parity: ' + queries.length + ' queries across ' + choices.length + ' BTS airports passed');

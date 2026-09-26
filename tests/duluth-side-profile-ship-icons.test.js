const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const js = fs.readFileSync(path.join(__dirname, '../public/assets/duluth-canal.js'), 'utf8');

test('Duluth ship icon is an unmistakable side-profile freighter, not a pointed map pin', () => {
  assert.match(js, /viewBox=\"0 0 72 32\"/);
  assert.match(js, /class=\"ship-house\"/);
  assert.match(js, /class=\"ship-stack\"/);
  assert.match(js, /class=\"ship-hatch\"/);
  assert.match(js, /M3 19 L8 19 L11 24 L58 24 L67 18 L70 14 L62 14 L55 18 Z/);
  assert.doesNotMatch(js, /viewBox=\"0 0 36 48\"/);
});

test('selected ship remains larger and rust while other ship states remain differentiated', () => {
  assert.match(js, /const width = selected \? 64 : local \|\| stopped \? 38 : 50/);
  assert.match(js, /\.ship-map-marker\.is-selected \.ship-hull\{fill:#b9572a\}/);
  assert.match(js, /\.ship-map-marker\.is-local \.ship-hull\{fill:#567d8b\}/);
  assert.match(js, /\.ship-map-marker\.is-stopped \.ship-hull\{fill:#8a6a42\}/);
});

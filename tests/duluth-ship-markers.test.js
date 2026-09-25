const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const js = fs.readFileSync(path.join(__dirname, '../public/assets/duluth-canal.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../public/duluth-canal-park/index.html'), 'utf8');

test('Duluth monitor JavaScript still parses', () => {
  assert.doesNotThrow(() => new vm.Script(js));
});

test('selected and anticipated vessels use side-profile ship silhouettes instead of NEXT/AIS text pins', () => {
  assert.match(js, /function shipIcon\(vessel, state = 'candidate'\)/);
  assert.match(js, /class=\"ship-glyph\"/);
  assert.match(js, /viewBox=\"0 0 72 32\"/);
  assert.match(js, /class=\"ship-house\"/);
  assert.match(js, /class=\"ship-stack\"/);
  assert.match(js, /class=\"ship-hatch\"/);
  assert.doesNotMatch(js, /html: `<span><b>\$\{selected \? 'NEXT' : 'AIS'\}<\/b><\/span>`/);
  assert.doesNotMatch(js, /viewBox=\"0 0 36 48\"/);
  assert.match(js, /icon: shipIcon\(c, selected \? 'selected' : 'candidate'\)/);
});

test('nearby AIS vessels also render as ship silhouettes', () => {
  assert.match(js, /icon: shipIcon\(v, state\)/);
  assert.doesNotMatch(js, /L\.circleMarker\(\[v\.lat, v\.lon\]/);
});

test('ship marker semantics remain color-based', () => {
  assert.match(js, /\.ship-map-marker\.is-selected \.ship-hull\{fill:#b9572a\}/);
  assert.match(js, /\.ship-map-marker\.is-local \.ship-hull\{fill:#567d8b\}/);
  assert.match(js, /\.ship-map-marker\.is-stopped \.ship-hull\{fill:#8a6a42\}/);
  assert.match(js, /Rust freighter = selected next watch/);
  assert.match(html, /duluth-canal\.js\?v=20260925-ships1/);
});

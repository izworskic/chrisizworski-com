'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Icons = require('../public/assets/seaway-vessel-icons.js');
const js = fs.readFileSync(path.join(__dirname, '../public/assets/duluth-canal.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../public/duluth-canal-park/index.html'), 'utf8');

function adapter(factory = Icons) {
  const start = js.indexOf('  function localShipState(');
  const end = js.indexOf('  function watchSpotPopup(', start);
  assert.ok(start >= 0 && end > start);
  return vm.runInNewContext(js.slice(start, end) + '\n({shipIcon, shipTypeLabel, localShipState})', {
    window: { SeawayVesselIcons: factory }, map: { getZoom: () => 12 }, L: { divIcon: options => options }
  });
}

test('Duluth client parses and loads existing shared AIS assets before the renderer', () => {
  assert.doesNotThrow(() => new vm.Script(js));
  const factory = html.indexOf('/assets/seaway-vessel-icons.js?v=20261108a');
  const renderer = html.search(/\/assets\/duluth-canal\.js\?v=[^"\s]+/);
  assert.ok(factory >= 0 && renderer > factory);
  assert.match(html, /href="\/assets\/soo-vessel-icons.css"/);
});

test('all nine real AIS categories use the exact shared side-profile SVG, never cargo by length', () => {
  const api = adapter();
  const samples = [[70,'cargo'],[80,'tanker'],[60,'passenger'],[52,'tug'],[37,'pleasure'],[36,'sail'],[30,'fishing'],[50,'service'],[null,'unknown']];
  const glyphs = new Set();
  for (const [shipType,kind] of samples) {
    const vessel = {shipType, lengthMeters: 220, speedKnots: 4, course: 180};
    const marker = api.shipIcon(vessel);
    assert.ok(marker.className.includes('type-' + kind));
    assert.ok(marker.html.includes(Icons.svg(kind)));
    assert.equal(api.shipTypeLabel(vessel), Icons.KINDS.find(item => item.kind === kind).label);
    assert.doesNotMatch(marker.html, /rotate\(/);
    glyphs.add(marker.html);
  }
  assert.equal(glyphs.size, 9);
  for (const shipType of ['70', 70.5, 0, 99, undefined]) {
    assert.match(adapter().shipIcon({shipType,lengthMeters:300}).className, /type-unknown/);
  }
});

test('validated length controls scale, selected vessel gets an emphasis boost and valid anchors', () => {
  const api = adapter();
  const small = api.shipIcon({shipType:37,lengthMeters:8});
  const large = api.shipIcon({shipType:70,lengthMeters:300});
  const selected = api.shipIcon({shipType:70,lengthMeters:300}, 'selected');
  assert.ok(small.iconSize[0] < large.iconSize[0]);
  assert.ok(selected.iconSize[0] > large.iconSize[0]);
  assert.match(selected.className, /is-selected/);
  assert.deepEqual(Array.from(selected.iconAnchor), Array.from(selected.iconSize, n => Math.round(n / 2)));
  assert.match(api.shipIcon({shipType:70,lengthMeters:null}).className, /size-unknown/);
});

test('watch-state color is distinct from vessel kind and missing speed is not stopped', () => {
  const api = adapter();
  for (const speedKnots of [null, undefined, NaN, -1, '0']) assert.equal(api.localShipState({speedKnots}), 'motion-unknown');
  assert.equal(api.localShipState({speedKnots:0}), 'stopped');
  assert.equal(api.localShipState({speedKnots:0.5}), 'stopped');
  assert.equal(api.localShipState({speedKnots:4}), 'local');
  for (const state of ['candidate','selected','local','stopped','motion-unknown']) {
    const marker = api.shipIcon({shipType:80,lengthMeters:200}, state);
    assert.ok(marker.className.includes('type-tanker'));
    assert.ok(marker.className.includes('is-' + state));
  }
  assert.match(js, /\.ship-map-marker\.is-selected \.ship-hull\{fill:#b9572a\}/);
  assert.match(js, /\.ship-map-marker\.is-local \.ship-hull\{fill:#567d8b\}/);
  assert.match(js, /\.ship-map-marker\.is-stopped \.ship-hull\{fill:#8a6a42\}/);
});

test('missing shared module retains a neutral selectable report symbol, never an invented cargo type', () => {
  const api = adapter(null);
  const marker = api.shipIcon({shipType:70,lengthMeters:300}, 'selected');
  assert.match(marker.className,/type-unknown/);
  assert.match(marker.className,/is-selected/);
  assert.match(marker.html,/ship-fallback/);
  assert.doesNotMatch(marker.html, /<svg/);
  assert.equal(api.shipTypeLabel({shipType:70}), 'Type display unavailable');
});

test('nearby and anticipated markers retain existing popups, camera actions and map caption', () => {
  assert.match(js, /icon: shipIcon\(c, selected \? 'selected' : 'candidate'\)/);
  assert.match(js, /icon: shipIcon\(v, state\)/);
  assert.match(js, /bindPopup\(vesselPopup\(v, failed\), vesselPopupOptions\(\)\)/);
  assert.match(js, /bindPopup\(candidatePopup\(c, selected\), vesselPopupOptions\(\)\)/);
  assert.match(js, /AIS type: \$\{shipTypeLabel\(v\)\}/);
  assert.match(js, /AIS type: \$\{shipTypeLabel\(c\)\}/);
  assert.match(js, /Open live camera monitor/);
  assert.match(js, /not map scale/);
  assert.doesNotMatch(js, /L\.circleMarker\(\[v\.lat, v\.lon\]/);
});

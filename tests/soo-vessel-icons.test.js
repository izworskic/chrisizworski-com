'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const Icons = require('../public/assets/seaway-vessel-icons.js');
const js = fs.readFileSync('public/assets/soo-ais.js', 'utf8');
const css = fs.readFileSync('public/assets/soo-vessel-icons.css', 'utf8');
const page = fs.readFileSync('public/soo-locks/index.html', 'utf8');
const next = fs.readFileSync('lib/soo-locks-next.js', 'utf8');

test('Soo map uses the shared AIS silhouettes rather than circles for normal ship markers', () => {
  assert.match(js, /const Icons = window\.SeawayVesselIcons/);
  assert.match(js, /Icons\.icon\(v, \{ zoom: map \? map\.getZoom\(\) : 13, selected \}\)/);
  assert.match(js, /L\.divIcon\(\{/);
  assert.match(js, /L\.marker\(\[v\.lat, v\.lon\]/);
  assert.match(js, /marker = addShipMarker\(v, layer\)/);
  assert.match(js, /visibleMarkers\.set\(String\(v\.mmsi\)/);
  assert.match(js, /marker\.bindTooltip[\s\S]*\.bindPopup\(content\)/);
  assert.match(js, /map\.on\('zoomend'/);
  assert.match(js, /selectedMarker = m/);
  assert.doesNotMatch(js, /marker = L\.circleMarker\(\[v\.lat, v\.lon\]/);
  assert.match(js, /if \(!Icons\) return null/);
});

test('reported AIS type and length drive distinct, proportionate outlines; unknown data stays unknown', () => {
  const cases = [
    [70, 'cargo', 310, 'large', 63],
    [80, 'tanker', 120, 'medium', 49],
    [60, 'passenger', 180, 'large', 63],
    [31, 'tug', 25, 'small', 38],
    [30, 'fishing', 38, 'small', 38],
    [36, 'sail', 15, 'small', 38],
    [37, 'pleasure', 12, 'small', 38],
    [33, 'service', 49, 'medium', 49],
    [null, 'unknown', null, 'unknown', 46]
  ];
  for (const [shipType, kind, lengthMeters, band, width] of cases) {
    const glyph = Icons.icon({ shipType, lengthMeters, speedKnots: 5 }, { zoom: 13 });
    assert.equal(glyph.kind, kind);
    assert.equal(glyph.band, band);
    assert.equal(glyph.size[0], width);
    assert.match(glyph.html, /<svg viewBox="0 0 72 36"/);
  }
  assert.notEqual(Icons.svg('cargo'), Icons.svg('tanker'));
  assert.notEqual(Icons.svg('tug'), Icons.svg('passenger'));
  assert.equal(Icons.icon({ shipType: null, lengthMeters: 305 }).kind, 'unknown');
  assert.match(js, /'Reported AIS type: ' \+ typeLabel\(v\)/);
  assert.match(js, /'Reported length: ' \+ feet\(v\.lengthMeters\)/);
  assert.match(next, /course: v\.course, shipType: v\.shipType/);
});

test('Soo page loads icon module before renderer; legend and accessible interactions remain', () => {
  const icon = page.indexOf('/assets/seaway-vessel-icons.js?v=20261108a');
  const map = page.indexOf('/assets/soo-ais.js?v=20261122');
  assert.ok(icon > -1 && map > icon);
  assert.match(page, /\/assets\/soo-vessel-icons\.css\?v=20261122/);
  assert.match(page, /id="sooVesselMap"/);
  assert.match(page, /id="sooVesselLegend"/);
  assert.match(page, /Reported speed and observation age/);
  assert.doesNotMatch(page, /Blue markers indicate reported movement/);
  assert.match(js, /keyboard: true, title:/);
  assert.match(js, /renderLegend\(\)/);
  assert.match(css, /\.soo-ais-symbol\.type-cargo/);
  assert.match(css, /\.soo-ais-symbol\.type-tanker/);
  assert.match(css, /\.soo-ais-symbol\.is-selected/);
  assert.match(css, /:focus-visible/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  trafficRequestBody,
  cameraQueryUrl,
  normalizeTrafficRows,
  normalizeCameraRows,
  selectSkywayCameras,
} = require('../lib/sunshine-skyway-live');

test('FL511 traffic request uses the official live table endpoint contract', () => {
  const body = trafficRequestBody();
  assert.equal(body.start, 0);
  assert.equal(body.length, 500);
  assert.equal(body.columns.some(column => column.name === 'description'), true);
  assert.equal(body.columns.some(column => column.name === 'lastUpdated'), true);
});

test('traffic adapter keeps explicit Skyway evidence and rejects unrelated I-275 noise', () => {
  const rows = normalizeTrafficRows({ data: [
    { id: 'a', roadwayName: 'I-275', county: 'Pinellas', description: 'Crash on I-275 north near downtown St. Petersburg.' },
    { id: 'b', roadwayName: 'I-275', county: 'Manatee', description: 'Sunshine Skyway Bridge: all lanes closed due to high winds.', lastUpdated: 'now' },
  ] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'b');
  assert.match(rows[0].description, /Sunshine Skyway Bridge/i);
});

test('camera query asks FL511 for Skyway cameras rather than hard-coding a third-party feed', () => {
  const url = cameraQueryUrl();
  assert.match(url, /^https:\/\/fl511\.com\/List\/GetData\/Cameras\?/);
  assert.match(decodeURIComponent(url), /Skyway/);
});

test('camera adapter prefers the FL511 videoUrl for the embedded viewer', () => {
  const rows = normalizeCameraRows({ data: [{
    id: '2553', description2: 'Skyway Bridge View', roadway: 'I-275',
    latitude: 27.59, longitude: -82.62,
    videoUrl: 'https://example.test/fl511-skyway-video',
  }] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].official, true);
  assert.equal(rows[0].embedUrl, 'https://example.test/fl511-skyway-video');
  assert.equal(rows[0].sourceUrl, 'https://fl511.com/tooltip/Cameras/2553');
});

test('Skyway Bridge View wins over generic nearby Skyway cameras', () => {
  const selected = selectSkywayCameras({ data: [
    { id: '2500', description2: 'I-275 South of Skyway', videoUrl: 'https://example.test/nearby' },
    { id: '2553', description2: 'Skyway Bridge View', videoUrl: 'https://example.test/bridge' },
  ] });
  assert.equal(selected.length, 1);
  assert.match(selected[0].name, /Skyway Bridge View/i);
  assert.equal(selected[0].embedUrl, 'https://example.test/bridge');
});

test('public API is wired to the live FL511 adapter', () => {
  const api = fs.readFileSync(path.join(__dirname, '..', 'api', 'sunshine-skyway.js'), 'utf8');
  assert.match(api, /sunshine-skyway-live/);
});

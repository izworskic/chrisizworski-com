import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const map = fs.readFileSync('public/assets/niagara-camera-map-leaflet.20261004.js', 'utf8');

const expectedCameraIds = [
  'peace-qew',
  'peace-canadian-plaza',
  'peace-ca',
  'peace-us',
  'peace-us-plaza',
  'rainbow-ca',
  'rainbow-us',
  'lewiston-us',
  'queenston-ca',
];

test('Leaflet Niagara camera map exposes all nine official bridge cameras', () => {
  for (const id of expectedCameraIds) assert.match(map, new RegExp(`id: ["']${id}["']`));
  assert.match(map, /CAMERAS\.forEach/);
  assert.match(map, /L\.marker/);
  assert.match(map, /9 official cameras/);
  assert.doesNotMatch(map, /id: ["']whirlpool["']/);
});

test('Leaflet map uses the proven OpenStreetMap tile pattern and no API-key tile path', () => {
  assert.match(map, /https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
  assert.match(map, /https:\/\/www\.openstreetmap\.org\/copyright/);
  assert.doesNotMatch(map, /cartocdn\.com/);
  assert.doesNotMatch(map, /CARTO_BASEMAP_KEY/);
  assert.doesNotMatch(map, /\?key=/);
});

test('Niagara camera map supports native Leaflet phone interaction', () => {
  assert.match(map, /leaflet@1\.9\.4/);
  assert.match(map, /L\.map\(container/);
  assert.match(map, /scrollWheelZoom: false/);
  assert.match(map, /touchZoom: true/);
  assert.match(map, /dragging: true/);
  assert.match(map, /doubleClickZoom: true/);
  assert.match(map, /map\.fitBounds/);
});

test('regional camera chips fan only for collision avoidance and snap back at detail zoom', () => {
  assert.match(map, /const DETAIL_ZOOM = 13/);
  assert.match(map, /const fanned = zoom < DETAIL_ZOOM/);
  assert.match(map, /const dx = fanned \? camera\.dx : 0/);
  assert.match(map, /const dy = fanned \? camera\.dy : 0/);
  assert.match(map, /map\.on\("zoomend", refreshCameraIcons\)/);
});

test('camera click opens the feed in place', () => {
  assert.match(map, /openCameraModal/);
  assert.match(map, /showModal/);
  assert.match(map, /map-modal-open/);
  assert.doesNotMatch(map, /scrollIntoView/);
  assert.doesNotMatch(map, /tab\.click\(\)/);
});

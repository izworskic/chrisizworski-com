import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const map = fs.readFileSync('public/assets/niagara-camera-map-leaflet.20261004.js', 'utf8');
const live = fs.readFileSync('public/assets/niagara-live-cameras.20261003.js', 'utf8');

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
  assert.match(map, /9 bridge cameras/);
  assert.doesNotMatch(map, /id: ["']whirlpool["']/);
});

test('Leaflet camera map uses keyed CARTO Voyager tiles and required attribution', () => {
  assert.equal(map.includes('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='), true);
  assert.match(map, /CARTO_BASEMAP_KEY/);
  assert.match(map, /encodeURIComponent\(CARTO_BASEMAP_KEY\)/);
  assert.match(map, /© CARTO/);
  assert.match(map, /© <a href=["']https:\/\/www\.openstreetmap\.org\/copyright/);
  assert.match(live, /niagara-camera-map-leaflet\.20261004\.js/);
});

test('Niagara camera map mirrors Duluth Leaflet interaction including pinch zoom', () => {
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
  assert.match(map, /map\.on\(["']zoomend["'], refreshMarkerIcons\)/);
});

test('map camera popup hands off to the existing embedded camera viewer', () => {
  assert.match(map, /data-niagara-camera/);
  assert.match(map, /tab\.click\(\)/);
  assert.match(map, /niagaraCameraViewer/);
  assert.match(map, /leaflet-map-select/);
});

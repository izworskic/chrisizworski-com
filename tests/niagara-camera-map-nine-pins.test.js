import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const map = fs.readFileSync('public/assets/niagara-camera-map-canonical.20261004c.js', 'utf8');
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

test('regional Niagara camera map exposes all nine camera pins immediately', () => {
  for (const id of expectedCameraIds) assert.match(map, new RegExp(`id: ["']${id}["']`));
  assert.match(map, /CAMERAS\.forEach/);
  assert.match(map, /niagara-canonical-map__pin/);
  assert.match(map, /9 bridge cameras/);
  assert.doesNotMatch(map, /data-camera-group/);
});

test('canonical map keeps CARTO Voyager as the visible base layer', () => {
  assert.match(map, /basemaps\.cartocdn\.com\/rastertiles\/voyager/);
  assert.match(map, /© CARTO/);
  assert.match(map, /© OpenStreetMap/);
  assert.match(live, /niagara-camera-map-canonical\.20261004c\.js/);
});

test('regional camera pins fan only for collision avoidance and snap to exact locations at detail zoom', () => {
  assert.match(map, /const DETAIL_ZOOM = 13/);
  assert.match(map, /state\.zoom < DETAIL_ZOOM \? \{ x: camera\.dx, y: camera\.dy \} : \{ x: 0, y: 0 \}/);
});

test('map camera pins hand off to the existing embedded camera viewer', () => {
  assert.match(map, /data-niagara-camera/);
  assert.match(map, /niagaraCameraViewer/);
  assert.match(map, /canonical-map-select/);
});

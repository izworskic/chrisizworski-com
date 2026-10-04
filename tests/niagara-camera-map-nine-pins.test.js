import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const pins = fs.readFileSync('public/assets/niagara-camera-map-pins.20261004b.js', 'utf8');
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

test('regional Niagara camera map exposes all nine bridge cameras instead of three bridge clusters', () => {
  for (const id of expectedCameraIds) assert.match(pins, new RegExp(`id: ["']${id}["']`));
  assert.match(pins, /\.niagara-camera-map__cluster\[data-camera-group\]/);
  assert.match(pins, /cluster\.replaceWith\(fragment\)/);
  assert.match(pins, /dataset\.regionalCameraPin = ["']true["']/);
  assert.match(pins, /9 bridge cameras/);
});

test('nine-pin map keeps CARTO base layer and exact-coordinate map as the owner', () => {
  assert.match(live, /niagara-bridge-camera-map\.20261004\.js/);
  assert.match(live, /niagara-camera-map-pins\.20261004b\.js/);
  assert.match(pins, /zoom in and they return to their exact NITTEC coordinates/);
});

test('map camera pins hand off to the existing embedded camera viewer', () => {
  assert.match(pins, /data-niagara-camera/);
  assert.match(pins, /niagaraCameraViewer/);
  assert.match(pins, /regional-map-select/);
});

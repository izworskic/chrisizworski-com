import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mapJs = fs.readFileSync('public/assets/niagara-camera-map-canonical.20261004c.js', 'utf8');
const liveJs = fs.readFileSync('public/assets/niagara-live-cameras.20261003.js', 'utf8');

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

test('canonical Niagara CARTO map contains exactly the nine official international-bridge camera ids', () => {
  for (const id of expectedCameraIds) assert.match(mapJs, new RegExp(`id: ["']${id}["']`));
  assert.equal((mapJs.match(/id: ["'](?:peace-|rainbow-|lewiston-|queenston-)/g) || []).length, 9);
});

test('canonical camera map uses exact NITTEC camera coordinates and no Whirlpool camera', () => {
  assert.match(mapJs, /42\.90774, lng: -78\.91968/);
  assert.match(mapJs, /43\.08906, lng: -79\.06638/);
  assert.match(mapJs, /43\.09151, lng: -79\.06948/);
  assert.match(mapJs, /43\.15271, lng: -79\.04287/);
  assert.match(mapJs, /43\.15391, lng: -79\.04839/);
  assert.doesNotMatch(mapJs, /id: ["']whirlpool["']/);
  assert.match(mapJs, /Whirlpool Rapids has no dedicated camera/);
});

test('canonical map physically removes the legacy fallback and replaces the old map shell', () => {
  assert.match(mapJs, /querySelectorAll\(["']\.niagara-visual-map__fallback["']\).*\.remove\(\)/s);
  assert.match(mapJs, /container\.replaceChildren\(\)/);
  assert.match(mapJs, /dataset\.canonicalCameraMap = ["']true["']/);
});

test('canonical map supports touch or mouse panning plus explicit zoom controls', () => {
  assert.match(mapJs, /touch-action:none/);
  assert.match(mapJs, /pointerdown/);
  assert.match(mapJs, /pointermove/);
  assert.doesNotMatch(mapJs, /pointerType !== ["']mouse["']/);
  assert.match(mapJs, /data-canonical-map-zoom/);
  assert.match(mapJs, /setZoom\(state\.zoom \+ 1\)/);
  assert.match(mapJs, /setZoom\(state\.zoom - 1\)/);
});

test('canonical map camera selection reuses the existing embedded camera viewer', () => {
  assert.match(mapJs, /\[data-niagara-camera=/);
  assert.match(mapJs, /tab\.click\(\)/);
  assert.match(mapJs, /niagaraCameraViewer/);
  assert.match(mapJs, /canonical-map-select/);
});

test('live camera enhancement loads only the new canonical map after the legacy visual layer settles', () => {
  assert.match(liveJs, /\/assets\/niagara-camera-map-canonical\.20261004c\.js/);
  assert.match(liveJs, /data-niagara-canonical-camera-map/);
  assert.match(liveJs, /scheduleBridgeCameraMap\(\)/);
  assert.match(liveJs, /window\.addEventListener\("load", loadCanonicalCameraMap, \{ once: true \}\)/);
  assert.doesNotMatch(liveJs, /niagara-bridge-camera-map\.20261004\.js/);
  assert.doesNotMatch(liveJs, /niagara-camera-map-pins\.20261004b\.js/);
});

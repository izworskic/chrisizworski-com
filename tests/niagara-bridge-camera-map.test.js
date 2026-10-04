import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mapJs = fs.readFileSync('public/assets/niagara-camera-map-leaflet.20261004.js', 'utf8');
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

test('Leaflet Niagara CARTO map contains exactly the nine official international-bridge camera ids', () => {
  for (const id of expectedCameraIds) assert.match(mapJs, new RegExp(`id: ["']${id}["']`));
  assert.equal((mapJs.match(/id: ["'](?:peace-|rainbow-|lewiston-|queenston-)/g) || []).length, 9);
});

test('Leaflet camera map uses exact NITTEC camera coordinates and no Whirlpool camera', () => {
  assert.match(mapJs, /lat: 42\.90774, lng: -78\.91968/);
  assert.match(mapJs, /lat: 43\.08906, lng: -79\.06638/);
  assert.match(mapJs, /lat: 43\.09151, lng: -79\.06948/);
  assert.match(mapJs, /lat: 43\.15271, lng: -79\.04287/);
  assert.match(mapJs, /lat: 43\.15391, lng: -79\.04839/);
  assert.doesNotMatch(mapJs, /id: ["']whirlpool["']/);
  assert.match(mapJs, /Whirlpool Rapids has no dedicated official road camera/);
});

test('Leaflet map physically replaces the legacy custom map shell', () => {
  assert.match(mapJs, /querySelectorAll\(["']\.niagara-visual-map__fallback["']\).*\.remove\(\)/s);
  assert.match(mapJs, /container\.replaceChildren\(\)/);
  assert.match(mapJs, /dataset\.leafletCameraMap = ["']true["']/);
  assert.match(mapJs, /dataset\.mapRuntime = ["']leaflet-1\.9\.4-carto["']/);
});

test('Leaflet map supports native touch pinch, drag and zoom controls', () => {
  assert.match(mapJs, /L\.map\(container/);
  assert.match(mapJs, /touchZoom: true/);
  assert.match(mapJs, /dragging: true/);
  assert.match(mapJs, /zoomControl: true/);
  assert.match(mapJs, /doubleClickZoom: true/);
  assert.doesNotMatch(mapJs, /pointerdown/);
  assert.doesNotMatch(mapJs, /pointermove/);
});

test('Leaflet map uses keyed CARTO Voyager rather than watermarked anonymous tiles', () => {
  assert.match(mapJs, /CARTO_BASEMAP_KEY/);
  assert.equal(mapJs.includes('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='), true);
  assert.match(mapJs, /encodeURIComponent\(CARTO_BASEMAP_KEY\)/);
  assert.match(mapJs, /© CARTO/);
});

test('Leaflet camera selection reuses the existing embedded camera viewer', () => {
  assert.match(mapJs, /\[data-niagara-camera=/);
  assert.match(mapJs, /tab\.click\(\)/);
  assert.match(mapJs, /niagaraCameraViewer/);
  assert.match(mapJs, /leaflet-map-select/);
});

test('live camera enhancement loads only the final Leaflet map after legacy visual layers settle', () => {
  assert.match(liveJs, /\/assets\/niagara-camera-map-leaflet\.20261004\.js/);
  assert.match(liveJs, /data-niagara-leaflet-camera-map/);
  assert.match(liveJs, /scheduleBridgeCameraMap\(\)/);
  assert.match(liveJs, /window\.addEventListener\(["']load["'], loadLeafletCameraMap, \{ once: true \}\)/);
  assert.doesNotMatch(liveJs, /niagara-camera-map-canonical\.20261004c\.js/);
  assert.doesNotMatch(liveJs, /niagara-camera-map-pins\.20261004b\.js/);
});

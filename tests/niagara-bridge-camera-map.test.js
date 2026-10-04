import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mapJs = fs.readFileSync('public/assets/niagara-camera-map-leaflet.20261004.js', 'utf8');
const ownerJs = fs.readFileSync('public/assets/niagara-bridge-camera-map.20261004c.js', 'utf8');
const legacyJs = fs.readFileSync('public/assets/niagara-visual-layer.20261003.js', 'utf8');

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

test('Leaflet Niagara map contains exactly the nine official international-bridge camera ids', () => {
  for (const id of expectedCameraIds) assert.match(mapJs, new RegExp(`id: ["']${id}["']`));
  assert.equal((mapJs.match(/id: ["'](?:peace-|rainbow-|lewiston-|queenston-)/g) || []).length, 9);
  assert.doesNotMatch(mapJs, /id: ["']whirlpool["']/);
});

test('Leaflet map contains all four bridge locations including camera-less Whirlpool', () => {
  assert.equal((mapJs.match(/key: "(?:peace|rainbow|whirlpool|lewiston-queenston)"/g) || []).length, 4);
  assert.match(mapJs, /key: "whirlpool"[\s\S]*cameraCount: 0/);
  assert.match(mapJs, /lat: 43\.1092611, lng: -79\.0583722/);
});

test('final Niagara map uses normal OpenStreetMap tiles with no blocked API key path', () => {
  assert.match(mapJs, /https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
  assert.match(mapJs, /OpenStreetMap/);
  assert.doesNotMatch(mapJs, /CARTO_BASEMAP_KEY/);
  assert.doesNotMatch(mapJs, /cartocdn\.com/);
  assert.doesNotMatch(mapJs, /\?key=/);
});

test('legacy visual layer is disabled and cannot compete for map ownership', () => {
  assert.match(legacyJs, /__NIAGARA_LEGACY_VISUAL_LAYER_DISABLED__/);
  assert.match(legacyJs, /dataset\.niagaraMapOwner = "none"/);
  assert.doesNotMatch(legacyJs, /CARTO_BASEMAP_KEY|cartocdn\.com|function\s+initMap\s*\(|function\s+buildCameraViewer\s*\(/);
  assert.doesNotMatch(ownerJs, /suppressLegacyMap|restoreFinalMapId|niagaraBridgeMapLegacySuppressed/);
  assert.match(ownerJs, /dataset\.niagaraMapOwner = "leaflet-osm-v3"/);
});

test('Leaflet map supports native touch pinch, drag and zoom controls', () => {
  assert.match(mapJs, /L\.map\(container/);
  assert.match(mapJs, /touchZoom: true/);
  assert.match(mapJs, /dragging: true/);
  assert.match(mapJs, /zoomControl: true/);
  assert.match(mapJs, /doubleClickZoom: true/);
  assert.match(mapJs, /dataset\.mapRuntime = "leaflet-1\.9\.4-osm-v2"/);
});

test('camera marker opens an in-place modal instead of scrolling to another section', () => {
  assert.match(mapJs, /niagaraMapCameraDialog/);
  assert.match(mapJs, /showModal/);
  assert.match(mapJs, /marker\.on\("click", \(\) => openCameraModal\(camera\)\)/);
  assert.match(mapJs, /youtube\.com\/embed/);
  assert.match(mapJs, /nyssnapshot\.com/);
  assert.doesNotMatch(mapJs, /scrollIntoView/);
  assert.doesNotMatch(mapJs, /niagaraCameraViewer/);
});

test('single map owner cache-busts the map and loads the value-first UX layer', () => {
  assert.match(ownerJs, /niagara-camera-map-leaflet\.20261004\.js\?v=20261004singleowner1/);
  assert.match(ownerJs, /niagara-product-v2\.20261004\.css\?v=20261004singleowner1/);
  assert.match(ownerJs, /niagara-product-v2\.20261004\.js\?v=20261004singleowner1/);
  assert.match(ownerJs, /clearLegacyMapSurface/);
});

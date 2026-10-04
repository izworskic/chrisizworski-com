import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync('public/niagara-border-crossing/index.html', 'utf8');
const legacy = fs.readFileSync('public/assets/niagara-visual-layer.20261003.js', 'utf8');
const owner = fs.readFileSync('public/assets/niagara-bridge-camera-map.20261004c.js', 'utf8');
const leaflet = fs.readFileSync('public/assets/niagara-camera-map-leaflet.20261004.js', 'utf8');
const productCss = fs.readFileSync('public/assets/niagara-product-v2.20261004.css', 'utf8');
const productJs = fs.readFileSync('public/assets/niagara-product-v2.20261004.js', 'utf8');

test('Niagara has one executable map owner', () => {
  assert.match(html, /\/assets\/niagara-visual-layer\.20261003\.js/);
  assert.match(html, /\/assets\/niagara-bridge-camera-map\.20261004c\.js/);
  assert.match(legacy, /__NIAGARA_LEGACY_VISUAL_LAYER_DISABLED__/);
  assert.doesNotMatch(legacy, /CARTO_BASEMAP_KEY|cartocdn\.com|function\s+initMap\s*\(|function\s+buildCameraViewer\s*\(/);
  assert.match(owner, /dataset\.niagaraMapOwner = "leaflet-osm-v3"/);
  assert.doesNotMatch(owner, /suppressLegacyMap|restoreFinalMapId|niagaraBridgeMapLegacySuppressed/);
});

test('final map owner cache-busts map plus value-first product layer', () => {
  assert.match(owner, /niagara-camera-map-leaflet\.20261004\.js\?v=20261004singleowner1/);
  assert.match(owner, /niagara-product-v2\.20261004\.css\?v=20261004singleowner1/);
  assert.match(owner, /niagara-product-v2\.20261004\.js\?v=20261004singleowner1/);
  assert.match(owner, /currentScript\.dataset\.niagaraBridgeCameraMap = "true"/);
  assert.match(owner, /clearLegacyMapSurface/);
});

test('Leaflet implementation maps all four crossings and nine official camera pins without keyed tiles', () => {
  assert.match(leaflet, /L\.map\(container/);
  assert.match(leaflet, /tile\.openstreetmap\.org/);
  assert.doesNotMatch(leaflet, /cartocdn\.com|CARTO_BASEMAP_KEY|\?key=/);
  assert.equal((leaflet.match(/key: "(?:peace|rainbow|whirlpool|lewiston-queenston)"/g) || []).length, 4);
  assert.equal((leaflet.match(/id: ["'](?:peace-|rainbow-|lewiston-|queenston-)/g) || []).length, 9);
  assert.match(leaflet, /key: "whirlpool"[\s\S]*cameraCount: 0/);
  assert.match(leaflet, /touchZoom: true/);
  assert.match(leaflet, /dragging: true/);
  assert.match(leaflet, /zoomControl: true/);
  assert.match(leaflet, /dataset\.mapRuntime = "leaflet-1\.9\.4-osm-v2"/);
});

test('mobile product layer forces readable text and a two-step passenger flow', () => {
  assert.match(owner, /color:#072f49!important/);
  assert.match(productCss, /\.niagara-v2-active \.trip-answer p[^{]*\{[^}]*color:#fff!important/);
  assert.match(productCss, /\.mobile-decision-label[^}]*color:#fff!important/);
  assert.doesNotMatch(productCss, /#9ed8ea|#d7eef3/);
  assert.match(productJs, /1\. Which way are you crossing\?/);
  assert.match(productJs, /2\. Which corridor are you already near\?/);
  assert.match(productJs, /Car \/ SUV/);
});

test('camera pins open the in-context modal instead of a second viewer', () => {
  assert.match(leaflet, /niagaraMapCameraDialog/);
  assert.match(leaflet, /showModal/);
  assert.match(leaflet, /marker\.on\("click", \(\) => openCameraModal\(camera\)\)/);
  assert.doesNotMatch(leaflet, /scrollIntoView/);
  assert.doesNotMatch(legacy, /niagaraCameraViewer|selectCamera|activateCameraViewer/);
});

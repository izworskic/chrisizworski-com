import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync('public/niagara-border-crossing/index.html', 'utf8');
const owner = fs.readFileSync('public/assets/niagara-bridge-camera-map.20261004c.js', 'utf8');
const leaflet = fs.readFileSync('public/assets/niagara-camera-map-leaflet.20261004.js', 'utf8');
const productCss = fs.readFileSync('public/assets/niagara-product-v2.20261004.css', 'utf8');
const productJs = fs.readFileSync('public/assets/niagara-product-v2.20261004.js', 'utf8');

test('Niagara page loads the final map owner after the legacy visual layer', () => {
  const legacy = html.indexOf('/assets/niagara-visual-layer.20261003.js');
  const finalOwner = html.indexOf('/assets/niagara-bridge-camera-map.20261004c.js');
  assert.ok(legacy >= 0);
  assert.ok(finalOwner > legacy);
});

test('final map owner cache-busts map plus value-first product layer', () => {
  assert.match(owner, /niagara-camera-map-leaflet\.20261004\.js\?v=20261004v2/);
  assert.match(owner, /niagara-product-v2\.20261004\.css\?v=20261004v2/);
  assert.match(owner, /niagara-product-v2\.20261004\.js\?v=20261004v2/);
  assert.match(owner, /currentScript\.dataset\.niagaraBridgeCameraMap = "true"/);
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

test('camera click stays in context on mobile', () => {
  assert.match(leaflet, /niagaraMapCameraDialog/);
  assert.match(leaflet, /showModal/);
  assert.doesNotMatch(leaflet, /scrollIntoView/);
});

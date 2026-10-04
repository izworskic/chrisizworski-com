import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync('public/niagara-border-crossing/index.html', 'utf8');
const owner = fs.readFileSync('public/assets/niagara-bridge-camera-map.20261004c.js', 'utf8');
const leaflet = fs.readFileSync('public/assets/niagara-camera-map-leaflet.20261004.js', 'utf8');

test('Niagara page loads the final map owner after the legacy visual layer', () => {
  const legacy = html.indexOf('/assets/niagara-visual-layer.20261003.js');
  const finalOwner = html.indexOf('/assets/niagara-bridge-camera-map.20261004c.js');
  assert.ok(legacy >= 0);
  assert.ok(finalOwner > legacy);
});

test('final map owner directly cache-busts and loads the Leaflet implementation', () => {
  assert.match(owner, /niagara-camera-map-leaflet\.20261004\.js\?v=20261004b/);
  assert.match(owner, /data\.niagaraLeafletCameraMap|dataset\.niagaraLeafletCameraMap/);
  assert.match(owner, /data-niagara-leaflet-camera-map/);
  assert.match(owner, /currentScript\.dataset\.niagaraBridgeCameraMap = "true"/);
});

test('Leaflet implementation is the visible CARTO map and exposes nine official camera pins', () => {
  assert.match(leaflet, /L\.map\(container/);
  assert.match(leaflet, /basemaps\.cartocdn\.com\/rastertiles\/voyager/);
  assert.equal((leaflet.match(/id: ["'](?:peace-|rainbow-|lewiston-|queenston-)/g) || []).length, 9);
  assert.match(leaflet, /touchZoom: true/);
  assert.match(leaflet, /dragging: true/);
  assert.match(leaflet, /zoomControl: true/);
  assert.match(leaflet, /dataset\.mapRuntime = "leaflet-1\.9\.4-carto"/);
});

test('final map owner carries a critical high-contrast fallback for the complained-about hero question', () => {
  assert.match(owner, /\.niagara-page \.niagara-hero \.hero-question/);
  assert.match(owner, /color:#072336!important/);
  assert.match(owner, /font-weight:800!important/);
  assert.match(owner, /font-size:18px!important/);
});

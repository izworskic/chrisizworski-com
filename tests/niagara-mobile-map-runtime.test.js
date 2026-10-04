import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync('public/niagara-border-crossing/index.html', 'utf8');
const map = fs.readFileSync('public/assets/niagara-bridge-camera-map.20261004c.js', 'utf8');

test('Niagara page loads a fresh physical touch-map asset after the legacy visual layer', () => {
  const legacy = html.indexOf('/assets/niagara-visual-layer.20261003.js');
  const fresh = html.indexOf('/assets/niagara-bridge-camera-map.20261004c.js');
  assert.ok(legacy >= 0);
  assert.ok(fresh > legacy);
});

test('touch map owns the visible CARTO surface and exposes nine camera pins', () => {
  assert.match(map, /basemaps\.cartocdn\.com\/rastertiles\/voyager/);
  assert.equal((map.match(/sourceId:\s*\d+/g) || []).length, 9);
  assert.match(map, /Nine Niagara border cameras on the map/);
  assert.doesNotMatch(map, /Whirlpool Rapids.*sourceId/);
});

test('touch map accepts touch pointers and provides zoom controls', () => {
  assert.match(map, /touch-action:none/);
  assert.match(map, /event\.pointerType === "mouse" && event\.button !== 0/);
  assert.doesNotMatch(map, /event\.pointerType !== "mouse"/);
  assert.match(map, /data-touch-map-zoom="in"/);
  assert.match(map, /data-touch-map-zoom="out"/);
  assert.match(map, /addEventListener\("wheel"/);
});

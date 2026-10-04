const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/niagara-border-crossing/index.html'), 'utf8');
const map = fs.readFileSync(path.join(root, 'public/assets/niagara-camera-map-leaflet.20261004.js'), 'utf8');
const owner = fs.readFileSync(path.join(root, 'public/assets/niagara-bridge-camera-map.20261004c.js'), 'utf8');
const legacy = fs.readFileSync(path.join(root, 'public/assets/niagara-visual-layer.20261003.js'), 'utf8');

test('Niagara camera runtime is owned by the Leaflet map, not the legacy viewer', () => {
  assert.match(owner, /dataset\.niagaraMapOwner = "leaflet-osm-v3"/);
  assert.match(legacy, /__NIAGARA_LEGACY_VISUAL_LAYER_DISABLED__/);
  assert.doesNotMatch(legacy, /niagaraCameraViewer|selectCamera|activateCameraViewer|buildCameraViewer/);
  assert.doesNotMatch(owner, /suppressLegacyMap|restoreFinalMapId|niagaraBridgeMapLegacySuppressed/);
});

test('Peace Bridge camera pins open actual embedded video in the map dialog', () => {
  assert.match(map, /videoId: "SETJ79HmwI0"/);
  assert.match(map, /videoId: "WPMgP2C3_co"/);
  assert.match(map, /videoId: "DnUFAShZKus"/);
  assert.match(map, /videoId: "9En2186vo5g"/);
  assert.match(map, /videoId: "yygTuX5JaKg"/);
  assert.match(map, /youtube\.com\/embed/);
  assert.match(map, /allowfullscreen/);
  assert.match(map, /marker\.on\("click", \(\) => openCameraModal\(camera\)\)/);
});

test('Rainbow and Lewiston camera pins use the four official NITTEC still-image sources', () => {
  assert.match(map, /nyssnapshot\.com\/R5_102\.png/);
  assert.match(map, /nyssnapshot\.com\/R5_103\.png/);
  assert.match(map, /nyssnapshot\.com\/R5_101\.png/);
  assert.match(map, /nyssnapshot\.com\/R5_100\.png/);
  assert.equal((map.match(/imageUrl: "https:\/\/nyssnapshot\.com\/R5_\d+\.png"/g) || []).length, 4);
});

test('camera media failure degrades to a useful official-source fallback', () => {
  assert.match(map, /renderMediaFallback/);
  assert.match(map, /This camera feed did not load here/);
  assert.match(map, /Official camera source/);
  assert.match(map, /image\.addEventListener\("error", \(\) => renderMediaFallback\(media, camera\)/);
  assert.match(map, /sourceLink\.href = camera\.sourceUrl \|\| NITTEC_URL/);
});

test('camera interaction remains local on mobile instead of jumping to another section', () => {
  assert.match(map, /niagaraMapCameraDialog/);
  assert.match(map, /showModal/);
  assert.doesNotMatch(map, /scrollIntoView/);
  assert.doesNotMatch(map, /niagaraCameraViewer/);
});

test('Whirlpool is mapped but never invents an official road camera', () => {
  assert.match(map, /key: "whirlpool"[\s\S]*cameraCount: 0/);
  assert.match(map, /No dedicated official road camera/);
  assert.doesNotMatch(map, /id: ["']whirlpool["']/);
});

test('production HTML keeps the single final Niagara map owner', () => {
  assert.match(html, /niagara-bridge-camera-map\.20261004c\.js\?v=20261004value3/);
  assert.equal((html.match(/niagara-bridge-camera-map\.20261004c\.js/g) || []).length, 1);
});

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'public/assets/niagara-live-cameras.20261003.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/assets/niagara-live-cameras.20261003.css'), 'utf8');
const legacy = fs.readFileSync(path.join(root, 'public/assets/niagara-visual-layer.20261003.js'), 'utf8');
const build = fs.readFileSync(path.join(root, 'scripts/add-niagara-border-discovery.mjs'), 'utf8');

test('Niagara upgrades Peace Bridge views to actual embedded live video', () => {
  assert.match(js, /youtube\.com\/embed/);
  assert.match(js, /DnUFAShZKus/);
  assert.match(js, /9En2186vo5g/);
  assert.match(js, /LIVE VIDEO/);
  assert.match(js, /allowfullscreen/);
});

test('Niagara preserves the existing camera selector and map integration', () => {
  assert.match(js, /data-niagara-camera/);
  assert.match(js, /niagaraCameraFrame/);
  assert.match(js, /niagaraCameraImage/);
  assert.match(js, /MutationObserver/);
  assert.match(js, /waitForViewer/);
});

test('Niagara moves live cameras directly after current crossing conditions', () => {
  assert.match(js, /document\.querySelector\("\.reality-card"\)/);
  assert.match(js, /insertAdjacentElement\("afterend", section\)/);
  assert.match(js, /See it before you commit/);
  assert.match(js, /Live bridge cameras/);
});

test('Niagara camera assets are injected and style the existing viewer', () => {
  assert.match(build, /niagara-live-cameras\.20261003\.css/);
  assert.match(build, /niagara-live-cameras\.20261003\.js/);
  assert.match(build, /patchLiveCameras\(\);/);
  assert.match(css, /niagara-camera-frame iframe/);
  assert.match(css, /niagara-camera-video\[hidden\]/);
});

test('Rainbow and Lewiston remain official auto-refresh still cameras', () => {
  assert.match(legacy, /nyssnapshot\.com\/R5_102\.png/);
  assert.match(legacy, /nyssnapshot\.com\/R5_103\.png/);
  assert.match(legacy, /nyssnapshot\.com\/R5_101\.png/);
  assert.match(legacy, /nyssnapshot\.com\/R5_100\.png/);
  assert.match(legacy, /CAMERA_REFRESH_MS = 30000/);
});

test('Whirlpool still explicitly reports no dedicated official road camera', () => {
  assert.match(legacy, /No dedicated official road camera/);
  assert.match(legacy, /Whirlpool Rapids does not have a dedicated official road camera/);
});

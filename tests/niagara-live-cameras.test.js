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

test('Peace live video cannot be covered by the legacy still refresher', () => {
  assert.match(js, /bindFrameObserver/);
  assert.match(js, /attributeFilter: \["src", "hidden"\]/);
  assert.match(js, /image\.hasAttribute\("src"\)/);
  assert.match(js, /image\.removeAttribute\("src"\)/);
  assert.match(js, /image\.hidden = true/);
});

test('Niagara enhances the existing camera selector and preserves map integration', () => {
  assert.match(js, /data-niagara-camera/);
  assert.match(js, /niagaraCameraFrame/);
  assert.match(js, /niagaraCameraImage/);
  assert.match(js, /MutationObserver/);
  assert.match(js, /waitForViewer/);
  assert.doesNotMatch(js, /section\.innerHTML\s*=/);
  assert.match(legacy, /sourceGrid\.before\(host\)/);
  assert.match(legacy, /selectCamera\(camera\.id, true\)/);
});

test('Niagara preserves lazy loading and legacy still error fallback', () => {
  assert.match(legacy, /loading="lazy"/);
  assert.match(legacy, /image\?\.addEventListener\("error"/);
  assert.match(legacy, /official source link remains available below/);
  assert.doesNotMatch(js, /loading="eager"/);
  assert.doesNotMatch(js, /nyssnapshot\.com/);
});

test('Niagara moves live cameras directly after current crossing conditions', () => {
  assert.match(js, /document\.querySelector\("\.reality-card"\)/);
  assert.match(js, /insertAdjacentElement\("afterend", section\)/);
  assert.match(js, /See it before you commit/);
  assert.match(js, /Live bridge cameras/);
});

test('Niagara camera assets are injected with a bumped cache version', () => {
  assert.match(build, /niagara-live-cameras\.20261003\.css/);
  assert.match(build, /niagara-live-cameras\.20261003\.js/);
  assert.match(build, /LIVE_CAMERA_ASSET_VERSION = '20261003b'/);
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

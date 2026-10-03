const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'public/assets/niagara-live-cameras.20261003.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/assets/niagara-live-cameras.20261003.css'), 'utf8');
const build = fs.readFileSync(path.join(root, 'scripts/add-niagara-border-discovery.mjs'), 'utf8');

test('Niagara embeds actual Peace Bridge live video players', () => {
  assert.match(js, /youtube\.com\/embed/);
  assert.match(js, /DnUFAShZKus/);
  assert.match(js, /9En2186vo5g/);
  assert.match(js, /LIVE VIDEO/);
  assert.match(js, /allowfullscreen/);
});

test('Niagara keeps official live-refresh still cameras for Rainbow and Lewiston-Queenston', () => {
  assert.match(js, /nyssnapshot\.com\/R5_102\.png/);
  assert.match(js, /nyssnapshot\.com\/R5_103\.png/);
  assert.match(js, /nyssnapshot\.com\/R5_101\.png/);
  assert.match(js, /nyssnapshot\.com\/R5_100\.png/);
  assert.match(js, /REFRESH_MS = 30000/);
  assert.match(js, /LIVE STILL · 30s/);
});

test('Niagara moves live cameras directly after current crossing conditions', () => {
  assert.match(js, /document\.querySelector\("\.reality-card"\)/);
  assert.match(js, /insertAdjacentElement\("afterend", section\)/);
  assert.match(js, /See it before you commit/);
  assert.match(js, /Live bridge cameras/);
});

test('Niagara live camera assets load before the legacy visual layer', () => {
  assert.match(build, /niagara-live-cameras\.20261003\.css/);
  assert.match(build, /niagara-live-cameras\.20261003\.js/);
  assert.match(build, /patchLiveCameras\(\);[\s\S]*patchVisualAssets\(\);/);
  assert.match(css, /niagara-live-camera-media iframe/);
});

test('Whirlpool explicitly explains lack of a dedicated official camera', () => {
  assert.match(js, /No dedicated official Whirlpool road camera/);
  assert.match(js, /Niagara Falls Bridge Commission/);
});

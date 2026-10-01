const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const viewSource = fs.readFileSync(path.join(ROOT, 'public/assets/cbbt-view.js'), 'utf8');

test('CBBT camera experience stays in-page instead of link-only', () => {
  assert.match(viewSource, /id=\"cbbtCameraLaunch\"/);
  assert.match(viewSource, /View CBBT approach cameras/);
  assert.match(viewSource, /id='cbbtCameraDrawer'/);
  assert.match(viewSource, /role=\"dialog\" aria-modal=\"true\"/);
  assert.match(viewSource, /role=\"tablist\"/);
  assert.match(viewSource, /South approach/);
  assert.match(viewSource, /CBBT area/);
  assert.match(viewSource, /North approach/);
});

test('camera metadata is requested client-side from Virginia 511 without reviving the server scraper', () => {
  assert.match(viewSource, /VDOT_CAMERA_SOURCES=/);
  assert.match(viewSource, /511\.vdot\.virginia\.gov\/services\/map\/layers\/map\/cams/);
  assert.match(viewSource, /mode:'cors'/);
  assert.doesNotMatch(viewSource, /CAMERA_API='\/api\/cbbt-cameras'/);
  assert.doesNotMatch(viewSource, /fetch\('\/api\/cbbt-cameras/);
});

test('camera images refresh in place and have an embedded official fallback', () => {
  assert.match(viewSource, /CAMERA_REFRESH_MS=30000/);
  assert.match(viewSource, /cacheBust\(camera\.imageUrl\)/);
  assert.match(viewSource, /<iframe src=\"'\+VDOT_511_URL\+'\"/);
  assert.match(viewSource, /official Virginia 511 map is embedded below/i);
  assert.match(viewSource, /Camera images do not determine whether CBBT is open, restricted or closed/);
});

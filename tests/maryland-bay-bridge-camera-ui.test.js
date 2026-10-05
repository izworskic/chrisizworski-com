const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const viewJs = fs.readFileSync(path.join(ROOT, 'public/assets/maryland-bay-bridge.js'), 'utf8');

test('Maryland Bay Bridge cameras use a Mackinac-style persistent embedded viewer', () => {
  assert.match(viewJs, /let selectedCameraId=null/);
  assert.match(viewJs, /id="bayBridgeCameraFrame"/);
  assert.match(viewJs, /<iframe/);
  assert.match(viewJs, /role="tablist"/);
  assert.match(viewJs, /role="tab"/);
  assert.match(viewJs, /OFFICIAL CHART LIVE VIEW/);
  assert.match(viewJs, /allowfullscreen/);
  assert.match(viewJs, /Open in CHART/);
  assert.match(viewJs, /data-camera-id/);
});

test('camera switching stays on-page and tracks the selected CHART camera', () => {
  assert.match(viewJs, /selectedCameraId=button\.dataset\.cameraId/);
  assert.match(viewJs, /renderCameras\(usable\)/);
  assert.match(viewJs, /bay_bridge_camera_select/);
  assert.doesNotMatch(viewJs, /View live camera/);
});

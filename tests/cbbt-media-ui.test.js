const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const viewJs = fs.readFileSync(path.join(ROOT, 'public/assets/cbbt-view.js'), 'utf8');
const mediaJs = fs.readFileSync(path.join(ROOT, 'api/cbbt-media.js'), 'utf8');

test('CBBT camera UI follows the Mackinac persistent image-stage pattern', () => {
  assert.match(viewJs, /Current visual check/);
  assert.match(viewJs, /id="cbbtCameraImage"/);
  assert.match(viewJs, /Latest still image/);
  assert.match(viewJs, /data-camera="greenwell"/);
  assert.match(viewJs, /data-camera="stratford"/);
  assert.match(viewJs, /setInterval\(refreshCamera,CAMERA_REFRESH_MS\)/);
  assert.doesNotMatch(viewJs, /camera-drawer/);
  assert.doesNotMatch(viewJs, /cbbtCameraLaunch/);
});

test('CBBT camera delivery proxies like Mackinac and has a deterministic direct fallback', () => {
  assert.match(mediaJs, /await fetchImage\(camera\.url, camera\.contentType\)/);
  assert.match(mediaJs, /X-CBBT-Camera-Delivery', 'server-proxy/);
  assert.match(mediaJs, /X-CBBT-Camera-Delivery', 'client-redirect/);
  assert.match(mediaJs, /vabeachcam014/);
  assert.match(mediaJs, /vabeachcam013/);
  assert.match(viewJs, /snapshot\.vdotcameras\.com\/thumbs\/vabeachcam014\.flv\.png/);
  assert.match(viewJs, /snapshot\.vdotcameras\.com\/thumbs\/vabeachcam013\.flv\.png/);
});

test('CBBT radar keeps the first-party path with a direct NWS fallback', () => {
  assert.match(viewJs, /RADAR_IMAGE='\/api\/cbbt-media\?asset=radar'/);
  assert.match(viewJs, /RADAR_DIRECT='https:\/\/radar\.weather\.gov\/ridge\/standard\/KAKQ_loop\.gif'/);
  assert.match(viewJs, /refreshRadar\(true\)/);
});

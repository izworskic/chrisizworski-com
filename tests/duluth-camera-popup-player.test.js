const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const networkPath = path.join(__dirname, '../public/assets/duluth-camera-network.js');
const network = fs.readFileSync(networkPath, 'utf8');
const cameraApi = require('../api/duluth-camera');

test('camera popup player module parses and keeps all 18 Duluth Harbor Cam feeds', () => {
  assert.doesNotThrow(() => new vm.Script(network));
  const feedBlock = network.slice(network.indexOf('const FEEDS = ['), network.indexOf('const SITES = ['));
  const feeds = [...feedBlock.matchAll(/\{ id: '([^']+)', name: '([^']+)', siteId: '([^']+)'/g)];
  assert.equal(feeds.length, 18);
  assert.equal(Object.keys(cameraApi.FEEDS).length, 18);
});

test('clicking a camera popup creates an autoplay player and pop-out action', () => {
  assert.match(network, /function liveCameraPopup\(title, note, feeds\)/);
  assert.match(network, /frame\.src = autoplayUrl\(embedUrl\)/);
  assert.match(network, /url\.searchParams\.set\('autoplay', '1'\)/);
  assert.match(network, /url\.searchParams\.set\('mute', '1'\)/);
  assert.match(network, /pop\.textContent = 'Pop out'/);
  assert.match(network, /window\.open\(autoplayUrl\(url\), 'duluthCameraPopout'/);
  assert.match(network, /bindPopup\(\(\) => sitePopup\(site\)/);
  assert.match(network, /bindPopup\(\(\) => independentPopup\(\)/);
});

test('grouped camera sites can switch feeds inside the same popup', () => {
  assert.match(network, /tabs\.className = 'camera-live-tabs'/);
  assert.match(network, /tab\.addEventListener\('click'/);
  assert.match(network, /activate\(feed\)/);
  assert.match(network, /activeId = feed\.id/);
});

test('resolver extracts only approved CamStreamer or YouTube embed URLs', () => {
  const html = '<div><iframe src="https://camstreamer.com/embed/example123?rel=0"></iframe></div>';
  assert.equal(cameraApi.extractEmbedUrl(html), 'https://camstreamer.com/embed/example123?rel=0');
  assert.equal(cameraApi.extractEmbedUrl('<iframe src="https://evil.example/embed/x"></iframe>'), null);
  assert.equal(cameraApi.safeEmbedUrl('https://www.youtube.com/embed/abc123'), 'https://www.youtube.com/embed/abc123');
});

test('popup player retains source links and does not add tracking parameters', () => {
  assert.match(network, /a\.textContent = 'Open source'/);
  assert.match(network, /a\.rel = 'noopener'/);
  assert.doesNotMatch(network, /utm_source=chatgpt/i);
});

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

test('one camera-marker click creates the player and only Pop out remains as the follow-up action', () => {
  assert.match(network, /function liveCameraPopup\(title, note, feeds\)/);
  assert.match(network, /frame\.src = autoplayUrl\(embedUrl\)/);
  assert.match(network, /url\.searchParams\.set\('autoplay', '1'\)/);
  assert.match(network, /url\.searchParams\.set\('mute', '1'\)/);
  assert.match(network, /url\.searchParams\.set\('playsinline', '1'\)/);
  assert.match(network, /pop\.textContent = 'Pop out'/);
  assert.match(network, /window\.open\(autoplayUrl\(url\), 'duluthCameraPopout'/);
  assert.match(network, /bindCameraPopup\(marker, \(\) => sitePopup\(site\)\)/);
  assert.match(network, /bindCameraPopup\(marker, \(\) => independentPopup\(\)\)/);
  assert.doesNotMatch(network, /camera-popup-source/);
  assert.doesNotMatch(network, /Open source/);
});

test('Duluth Harbor Cam popup path always asks the same-origin resolver for a direct embed', () => {
  const feedBlock = network.slice(network.indexOf('const FEEDS = ['), network.indexOf('const SITES = ['));
  assert.doesNotMatch(feedBlock, /camstreamer\.com\/embed/);
  assert.match(network, /fetch\(`\$\{CAMERA_API\}\?feed=\$\{encodeURIComponent\(feed\.id\)\}`/);
  assert.match(network, /resolveEmbed\(feed\)/);
});

test('grouped camera sites can switch feeds inside the same popup', () => {
  assert.match(network, /tabs\.className = 'camera-live-tabs'/);
  assert.match(network, /if \(feeds\.length > 1\) wrap\.append\(tabs\)/);
  assert.match(network, /tab\.addEventListener\('click'/);
  assert.match(network, /activate\(feed\)/);
});

test('resolver turns an approved CamStreamer redirect into a direct privacy-enhanced YouTube embed', async () => {
  const wrapper = 'https://camstreamer.com/embed/example123';
  const mockFetch = async () => ({
    ok: true,
    status: 200,
    url: 'https://www.youtube.com/embed/abc123?autoplay=1&mute=1'
  });
  const direct = await cameraApi.resolveDirectEmbed(wrapper, mockFetch);
  assert.match(direct, /^https:\/\/www\.youtube-nocookie\.com\/embed\/abc123/);
  assert.match(direct, /autoplay=1/);
  assert.match(direct, /mute=1/);
  assert.equal(cameraApi.safeWrapperUrl('https://evil.example/embed/x'), null);
  assert.equal(cameraApi.directYouTubeEmbed('https://evil.example/embed/x'), null);
});

test('camera markers are raised above NEXT vessel pins so camera clicks win at overlapping locations', () => {
  assert.match(network, /setZIndexOffset\(1800\)/);
  assert.match(network, /zIndexOffset: site\.scope === 'north-shore' \? 1700 : 1800/);
});

test('no ChatGPT tracking parameters are added', () => {
  assert.doesNotMatch(network, /utm_source=chatgpt/i);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const networkPath = path.join(__dirname, '../public/assets/duluth-camera-network.js');
const corePath = path.join(__dirname, '../public/assets/duluth-canal.js');
const network = fs.readFileSync(networkPath, 'utf8');
const core = fs.readFileSync(corePath, 'utf8');

test('expanded camera module parses and reuses the primary Canal Cam marker', () => {
  assert.doesNotThrow(() => new vm.Script(network));
  assert.match(core, /Canal Cam — Maritime Visitor Center/);
  assert.match(network, /PRIMARY_CANAL_CAMERA_TITLE = 'Canal Cam — Maritime Visitor Center'/);
  assert.match(network, /function findMarkerByTitle\(title\)/);
  assert.match(network, /function adoptPrimaryCanalMarker\(site\)/);
  assert.match(network, /findMarkerByTitle\(PRIMARY_CANAL_CAMERA_TITLE\)/);
  assert.match(network, /site\.id === 'visitor-center' && adoptPrimaryCanalMarker\(site\)/);
  assert.match(network, /siteMarkers\.set\(site\.id, marker\)/);
});

test('camera network explains site-level placement instead of claiming surveyed mount coordinates', () => {
  assert.match(network, /Markers identify the named host site or landmark, not a surveyed camera mount point/);
  assert.match(network, /Hillside and Cargo Connect are explicitly approximate facility\/site positions/);
  assert.match(network, /Map position is approximate at the published facility\/site level/);
});

test('fallback copy describes both primary video views and the wider camera network', () => {
  assert.match(network, /document\.getElementById\('watchPick'\)/);
  assert.match(network, /both primary live camera views, the wider mapped camera network/);
  assert.match(network, /document\.getElementById\('watchPick'\)\]\.filter\(Boolean\)/);
});

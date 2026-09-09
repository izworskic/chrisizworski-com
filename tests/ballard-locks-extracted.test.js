const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pkg = require('../package.json');
const pagePath = path.join(root, 'public', 'ballard-locks', 'index.html');
const tourPath = path.join(root, 'public', 'ballard-locks', 'tour', 'index.html');
const apiPath = path.join(root, 'api', 'ballard-locks.js');
const aisApiPath = path.join(root, 'api', 'ballard-ais.js');
const syncPath = path.join(root, 'scripts', 'sync-ballard-locks.mjs');

test('Ballard Locks implementation is pinned to its authoritative repository', () => {
  assert.equal(pkg.dependencies['national-ballard-locks'], 'github:izworskic/national-ballard-locks#e742334d61e9856be77fc613c642e845a4f3227a');
});

test('committed Ballard deployment mirror preserves canonical and traffic truth', () => {
  const page = fs.readFileSync(pagePath, 'utf8');
  assert.match(page, /https:\/\/chrisizworski\.com\/ballard-locks\//);
  assert.match(page, /AIS map does not represent every pleasure boat/i);
  assert.match(page, /not an official lockage count/i);
  assert.match(page, /Ballard Locks salmon activity/);
  assert.match(page, /NOAA Tides &amp; Currents/);
});

test('Ballard APIs preserve public-source boundaries and live AIS proxy', () => {
  const source = fs.readFileSync(apiPath, 'utf8');
  const ais = fs.readFileSync(aisApiPath, 'utf8');
  assert.match(source, /Washington Department of Fish & Wildlife|WDFW/);
  assert.match(source, /NOAA Tides & Currents/);
  assert.match(source, /National Weather Service/);
  assert.match(source, /USACE|U\.S\. Army Corps of Engineers/);
  assert.match(source, /ageDays|dataAgeDays/);
  assert.match(ais, /ais\.openwaters\.io\/v1\/vessels/);
  assert.match(ais, /FeatureCollection/);
  assert.match(ais, /X-Robots-Tag/);
});

test('main-site build sync installs both Ballard APIs and tour', () => {
  const sync = fs.readFileSync(syncPath, 'utf8');
  assert.match(sync, /node_modules\/national-ballard-locks/);
  assert.match(sync, /api\/ballard-locks\.js/);
  assert.match(sync, /api\/ballard-ais\.js/);
  assert.match(sync, /public\/ballard-locks/);
  assert.match(sync, /public\/sitemap\.xml/);
});

test('committed tour uses one MapLibre map for basemap, AIS, routes and stops', () => {
  const page = fs.readFileSync(pagePath, 'utf8');
  const tour = fs.readFileSync(tourPath, 'utf8');
  assert.ok(page.includes('https://chrisizworski.com/ballard-locks/tour/'));
  for (const phrase of ['20 min · Essentials','45 min · Full Locks','75 min · + Ballard']) assert.ok(tour.includes(phrase));
  assert.ok(tour.includes('id="tour-map" class="map map-overlay"'));
  assert.ok(tour.includes('https://tiles.openfreemap.org/styles/liberty'));
  assert.ok(tour.includes('/api/ballard-ais'));
  assert.ok(tour.includes("map.addSource('ais-vessels'"));
  assert.ok(tour.includes("id:'ais-vessels'"));
  assert.ok(tour.includes('setInterval(loadAis,15000)'));
  assert.ok(tour.includes('interactive:true'));
  assert.ok(tour.includes('data-live-panel="fish"'));
  assert.ok(tour.includes('data-live-panel="camera"'));
  assert.ok(tour.includes('https://g1.ipcamlive.com/player/player.php?alias=5ababb8154afe'));
  assert.ok(tour.includes("closeOnClick:false"));
  assert.ok(tour.includes("map.panBy([shiftX,shiftY]"));
  assert.ok(tour.includes('map.jumpTo({center:v.center,zoom:v.zoom})'));
  assert.ok(!tour.includes('id="tour-ais-underlay"'));
  assert.ok(!tour.includes('embed.myshiptracking.com'));
  assert.ok(!tour.includes('syncAisToMap'));
  assert.ok(!tour.includes('data-live-panel="ais"'));
  assert.ok(!tour.includes('What this map adds'));
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pkg = require('../package.json');
const pagePath = path.join(root, 'public', 'ballard-locks', 'index.html');
const tourPath = path.join(root, 'public', 'ballard-locks', 'tour', 'index.html');
const apiPath = path.join(root, 'api', 'ballard-locks.js');
const syncPath = path.join(root, 'scripts', 'sync-ballard-locks.mjs');

test('Ballard Locks implementation is pinned to its authoritative repository', () => {
  assert.equal(
    pkg.dependencies['national-ballard-locks'],
    'github:izworskic/national-ballard-locks#be4bfe2cd3a1a35339049e7c4faa74b62c4a8e80'
  );
});

test('committed Ballard deployment mirror preserves the canonical and traffic truth', () => {
  const page = fs.readFileSync(pagePath, 'utf8');
  assert.match(page, /https:\/\/chrisizworski\.com\/ballard-locks\//);
  assert.match(page, /AIS map does not represent every pleasure boat/i);
  assert.match(page, /not an official lockage count/i);
  assert.match(page, /Ballard Locks salmon activity/);
  assert.match(page, /NOAA Tides &amp; Currents/);
});

test('committed Ballard API keeps dated fish-count and source-boundary logic', () => {
  const source = fs.readFileSync(apiPath, 'utf8');
  assert.match(source, /Washington Department of Fish & Wildlife|WDFW/);
  assert.match(source, /NOAA Tides & Currents/);
  assert.match(source, /National Weather Service/);
  assert.match(source, /USACE|U\.S\. Army Corps of Engineers/);
  assert.match(source, /ageDays|dataAgeDays/);
  assert.match(source, /AIS does not represent every recreational boat|AIS-equipped vessels only/);
});

test('main-site build sync installs the authoritative mirror and sitemap entry', () => {
  const sync = fs.readFileSync(syncPath, 'utf8');
  assert.match(sync, /node_modules\/national-ballard-locks/);
  assert.match(sync, /api\/ballard-locks\.js/);
  assert.match(sync, /public\/ballard-locks/);
  assert.match(sync, /public\/sitemap\.xml/);
  assert.match(sync, /https:\/\/chrisizworski\.com\/ballard-locks\//);
});


test('committed Ballard mirror includes the interactive self-guided tour', () => {
  const page = fs.readFileSync(pagePath, 'utf8');
  const tour = fs.readFileSync(tourPath, 'utf8');
  assert.ok(page.includes('https://chrisizworski.com/ballard-locks/tour/'));
  assert.ok(tour.includes('Ballard Locks Self-Guided Tour Map'));
  assert.ok(tour.includes('20 min · Essentials'));
  assert.ok(tour.includes('45 min · Full Locks'));
  assert.ok(tour.includes('75 min · + Ballard'));
  assert.ok(tour.includes('id="tour-ais-underlay"'));
  assert.ok(tour.includes('style:{version:8,sources:{},layers:[]}'));
  assert.ok(tour.includes('/api/ballard-locks'));
  assert.ok(tour.includes('id="map-live-dock"'));
  assert.ok(tour.includes('data-live-panel="fish"'));
  assert.ok(!tour.includes('data-live-panel="ais"'));
  assert.ok(tour.includes('data-live-panel="camera"'));
  assert.ok(tour.includes('https://embed.myshiptracking.com/embed?myst'));
  assert.ok(tour.includes('LIVE AIS · positions update automatically'));
  assert.ok(tour.includes('id="tour-map" class="map map-overlay"'));
  assert.ok(tour.indexOf('id="tour-ais-underlay"') < tour.indexOf('id="tour-map"'));
  assert.ok(tour.includes('const routeViews='));
  assert.ok(tour.includes('function setAisView(key)'));
  assert.ok(tour.includes('function syncAisToMap()'));
  assert.ok(tour.includes("map.on('moveend',syncAisToMap)"));
  assert.ok(tour.includes('interactive:true'));
  assert.ok(tour.includes('class="ais-clip"'));
  assert.ok(tour.includes('left:-42px'));
  assert.ok(tour.includes('width:calc(100% + 84px)'));
  assert.ok(tour.includes("closeOnClick:false"));
  assert.ok(tour.includes("map.panBy([shiftX,shiftY]"));
  assert.ok(tour.includes('map.jumpTo({center:v.center,zoom:v.zoom})'));
  assert.ok(!tour.includes('id="map-live-panel-ais"'));
  assert.ok(tour.includes('https://g1.ipcamlive.com/player/player.php?alias=5ababb8154afe'));
  assert.ok(!tour.includes('What this map adds'));
});

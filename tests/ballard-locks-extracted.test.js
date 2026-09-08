const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pkg = require('../package.json');
const pagePath = path.join(root, 'public', 'ballard-locks', 'index.html');
const apiPath = path.join(root, 'api', 'ballard-locks.js');
const syncPath = path.join(root, 'scripts', 'sync-ballard-locks.mjs');

test('Ballard Locks implementation is pinned to its authoritative repository', () => {
  assert.equal(
    pkg.dependencies['national-ballard-locks'],
    'github:izworskic/national-ballard-locks#2822faf4adfb4eeb7ac7c96decca37f4ca55a377'
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

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pkg = require('../package.json');
const dependencyRoot = path.join(root, 'node_modules', 'national-ballard-locks');
const pagePath = path.join(dependencyRoot, 'public', 'ballard-locks', 'index.html');
const apiPath = path.join(dependencyRoot, 'api', 'ballard-locks.js');
const syncPath = path.join(root, 'scripts', 'sync-ballard-locks.mjs');

test('Ballard Locks implementation is pinned to its authoritative repository', () => {
  assert.equal(
    pkg.dependencies['national-ballard-locks'],
    'github:izworskic/national-ballard-locks#07dd6d5ab0149a4ee5ddb9e7832aff805e508e90'
  );
  assert.ok(fs.existsSync(pagePath), 'authoritative Ballard page missing from installed package');
  assert.ok(fs.existsSync(apiPath), 'authoritative Ballard API missing from installed package');
});

test('authoritative Ballard page preserves canonical, analytics, ads and traffic truth', () => {
  const page = fs.readFileSync(pagePath, 'utf8');
  assert.match(page, /https:\/\/chrisizworski\.com\/ballard-locks\//);
  assert.match(page, /G-Y5D2V2W7HN/);
  assert.match(page, /ca-pub-8222782620788075/);
  assert.match(page, /AIS map does not represent every pleasure boat/i);
  assert.match(page, /not an official lockage count/i);
  assert.match(page, /Ballard Locks salmon activity/);
  assert.match(page, /NOAA Tides &amp; Currents/);
});

test('authoritative Ballard parser dates fish counts instead of calling stale rows today', () => {
  const api = require(apiPath)._test;
  const fixture = `Daily Coho Counts\n2026 daily counts\nDate | Daily Count | Running Total\n9/1 | 13 | 433\n9/2 | 76 | 509\n9/3 | 463 | 972\n9/4 |  | 972\n2025 daily counts`;
  const parsed = api.parseSpecies(fixture, 'Coho', { year: 2026, month: 9, day: 8 });
  assert.equal(parsed.latest.date, '9/3');
  assert.equal(parsed.latest.daily, 463);
  assert.equal(parsed.ageDays, 5);
});

test('main-site sync mirrors Ballard and adds the canonical to production sitemap', () => {
  const sync = fs.readFileSync(syncPath, 'utf8');
  assert.match(sync, /node_modules\/national-ballard-locks/);
  assert.match(sync, /api\/ballard-locks\.js/);
  assert.match(sync, /public\/ballard-locks/);
  assert.match(sync, /public\/sitemap\.xml/);
  assert.match(sync, /https:\/\/chrisizworski\.com\/ballard-locks\//);
});

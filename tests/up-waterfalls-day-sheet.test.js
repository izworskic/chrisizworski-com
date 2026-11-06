// Waterfall day sheet: check share behavior and the separate visitor-PARKING route gate.
// Run with: node --test tests/up-waterfalls-day-sheet.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const page = fs.readFileSync(path.join(__dirname, '../public/upper-peninsula-waterfalls/index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../public/assets/up-waterfalls.css'), 'utf8');
const { parkingDirections, shareUrl, allowedSharedStop, validDate } =
  require('../public/assets/up-waterfalls-day-sheet.js');

const site = 'https://chrisizworski.com/upper-peninsula-waterfalls/';
const card = overrides => ({
  dataset: {
    id: 'bond-falls', status: 'seasonal', arrivalVerified: 'verified',
    lat: '46.399', lng: '-89.126',
    parkingLat: '46.405', parkingLng: '-89.134',
    parkingSource: 'https://www.michigan.gov/dnr/some-source',
    ...overrides
  }
});

test('share has six-stop bound, deduplicates, omits unsafe IDs and preserves optional date', () => {
  const url = new URL(shareUrl(site, ['bond-falls', 'wagner-falls', 'bond-falls', '../bad',
    'munising-falls', 'scott-falls', 'agate-falls', 'tioga-park-falls', 'extra-falls'], '2026-11-28'));
  assert.equal(url.origin + url.pathname, site);
  assert.deepEqual(url.searchParams.get('falls').split(','), [
    'bond-falls', 'wagner-falls', 'munising-falls', 'scott-falls', 'agate-falls', 'tioga-park-falls'
  ]);
  assert.equal(url.searchParams.get('day'), '2026-11-28');
  assert.equal(url.hash, '');
});

test('invalid calendar dates cannot turn into an unintended visit date', () => {
  assert.equal(validDate('2026-02-31'), false);
  assert.equal(validDate('2026-11-05'), true);
  assert.equal(validDate('Nov 5'), false);
  assert.equal(new URL(shareUrl(site, ['wagner-falls'], '2026-02-31')).searchParams.has('day'), false);
});

test('import gates research-only, closed and unverified arrival regardless of URL', () => {
  assert.equal(allowedSharedStop(card()), true);
  for (const status of ['closed', 'research']) assert.equal(allowedSharedStop(card({ status })), false);
  assert.equal(allowedSharedStop(card({ arrivalVerified: 'pending' })), false);
  assert.equal(allowedSharedStop(card({ id: '../../bad' })), false);
});

test('directions require separate verified visitor parking coordinates and HTTPS evidence', () => {
  const good = parkingDirections(card());
  assert.match(good, /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/);
  assert.match(good, /travelmode=driving/);
  for (const changes of [
    { status: 'closed' }, { status: 'research' }, { arrivalVerified: 'pending' },
    { parkingSource: '' }, { parkingSource: 'http://example.com/park' },
    { parkingLat: '0' }, { parkingLng: '0' }, { parkingLat: 'NaN' },
    { parkingLng: '-120.0' }
  ]) assert.equal(parkingDirections(card(changes)), '', JSON.stringify(changes));
});

test('public page loads sheet only after map/planner, preserves canonical and existing script', () => {
  assert.match(page, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/upper-peninsula-waterfalls\/"/);
  assert.match(page, /id="shortlist"/);
  assert.match(page, /id="visit-date"/);
  assert.match(page, /\/assets\/up-waterfalls-nearby\.js/);
  assert.match(page, /\/assets\/up-waterfalls-day-sheet\.js/);
  assert.ok(page.indexOf('/assets/up-waterfalls-day-sheet.js') > page.indexOf('/assets/up-waterfalls.js'));
  assert.match(css, /\.upfall-day-sheet\[hidden\]\{display:none\}/);
  assert.match(css, /@media print[\s\S]*body\.upfall-print-mode/);
});

test('day sheet honors existing six-stop shortlist and does not calculate driving times', () => {
  const js = fs.readFileSync(path.join(__dirname, '../public/assets/up-waterfalls-day-sheet.js'), 'utf8');
  assert.match(js, /upfall:shortlist-updated/);
  assert.match(js, /source-linked day sheet/);
  assert.match(js, /No driving time, current opening or safe road connection has been calculated/);
  assert.doesNotMatch(js, /maps\/dir\/\?api=1&destination=['"]?\s*\+\s*encodeURIComponent\(c\.dataset\.lat/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../api/melvin-price.js')._test;

const page = fs.readFileSync(path.join(__dirname, '..', 'public', 'melvin-price', 'index.html'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const sitemapScript = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'add-melvin-price-to-sitemap.mjs'), 'utf8');

test('Melvin Price page preserves core live-data integrity language', () => {
  assert.match(page, /Melvin Price Live/);
  assert.match(page, /does not invent a tow name, cargo or exact position/i);
  assert.match(page, /AIS positions are informational, may be delayed or incomplete/i);
  assert.match(page, /1,200 × 110 ft/);
  assert.match(page, /10:00 AM, 1:00 PM and 3:00 PM/);
  assert.doesNotMatch(page, /DEMO DATA/i);
});

test('Melvin Price canonical is added to the deployed sitemap', () => {
  assert.match(pkg.scripts['vercel-build'], /add-melvin-price-to-sitemap\.mjs/);
  assert.match(sitemapScript, /https:\/\/chrisizworski\.com\/melvin-price\//);
  assert.match(sitemapScript, /<changefreq>daily<\/changefreq>/);
});

test('LPMS Mel Price record normalizes operational fields', () => {
  const row = {
    lockNumber: '26', lockName: 'Mel Price L/D', lockMile: 201,
    readingEntryDateTime: '090826:0400', gageUpperElevation: 419.2,
    gageUpperElevationChange: 0, gageLowerElevation: 398.2,
    gageLowerElevationChange: -0.1, totalPendingArrivals: 1,
    totalLocking: 0, totalLockedUp24Hours: 5, totalLockedDown24Hours: 7,
    average24HourDelay: 17,
  };
  const out = api.normalizeLock(row, new Date('2026-09-08T12:00:00Z'));
  assert.equal(out.lockNumber, '26');
  assert.equal(out.pendingArrivals, 1);
  assert.equal(out.lockingNow, 0);
  assert.equal(out.lockedUp24h, 5);
  assert.equal(out.lockedDown24h, 7);
  assert.equal(out.averageDelayMinutes24h, 17);
  assert.equal(out.upperElevationFt, 419.2);
  assert.equal(out.lowerElevationFt, 398.2);
});

test('LPMS parser repairs literal control characters inside USACE note strings', () => {
  const malformed = '{"items":[{"lockNumber":"25","notes":"26FEB2024\r FLOW: 23600\r OUT DRAFT SIGNS"},{"lockNumber":"26","lockName":"Mel Price L/D","totalPendingArrivals":1}]}';
  const parsed = api.parseLooseJson(malformed);
  assert.equal(parsed.items[0].notes, '26FEB2024\r FLOW: 23600\r OUT DRAFT SIGNS');
  assert.equal(parsed.items[1].lockNumber, '26');
});

test('LPMS sanitizer preserves legal structural whitespace outside strings', () => {
  const raw = '{\n  "ok": true,\n  "notes": "a\tb"\n}';
  const sanitized = api.sanitizeJsonControlChars(raw);
  assert.match(sanitized, /^\{\n/);
  const parsed = JSON.parse(sanitized);
  assert.equal(parsed.notes, 'a\tb');
});

test('CWMS values parse common version-2 shape', () => {
  const values = api.parseCwmsValues({ values: [[1788861600000, 398.1, 0], [1788863400000, 398.2, 0]] });
  assert.equal(values.length, 2);
  assert.equal(values[1].value, 398.2);
});

test('Mel Price flow uses the current Corps-rated CWMS series', () => {
  assert.equal(api.FLOW_TSID, 'Mel Price TW-Mississippi.Flow.Inst.30Minutes.0.RatingCOE');
});

test('NTNI normalization exposes current notice number and official link', () => {
  const out = api.normalizeNotice({
    noticeno: '212499-7',
    issuedate: '2026-07-31T19:10:30Z',
    begindate: '2025-11-14T21:00:00Z',
    waterways: 'POOL_25_UPPER_MISSISSIPPI, POOL_26_UPPER_MISSISSIPPI',
    noticelink: 'https://ndc.ops.usace.army.mil/ords/ntni/print_nav_notice?in_nav_notice_number=214814',
  });
  assert.equal(out.title, 'Notice 212499-7');
  assert.equal(out.number, '212499-7');
  assert.match(out.url, /214814/);
  assert.match(out.waterways, /POOL_26/);
});

test('tour schedule returns the next normal walk-in tour', () => {
  const tours = api.museumAndTours(new Date('2026-09-09T16:30:00Z'));
  assert.equal(tours.museumOpen, true);
  assert.equal(tours.nextTour, '1:00 PM');
  assert.equal(tours.minutesUntilNextTour, 90);
});

test('visitor score cannot claim a high-confidence live recommendation without LPMS', () => {
  const score = api.scoreVisit({ locks: { ok: false }, wx: { ok: true }, tours: {}, nav: { ok: true, count: 0 } });
  assert.equal(score.label, 'DATA LIMITED');
  assert.equal(score.confidence, 'Low');
  assert.equal(score.score, null);
});

test('visitor score rewards confirmed current lock activity', () => {
  const score = api.scoreVisit({
    locks: { ok: true, freshness: 'LIVE', melvin: { pendingArrivals: 2, lockingNow: 1, lockedUp24h: 5, lockedDown24h: 7 } },
    wx: { ok: true, precipitationProbability: 10, shortForecast: 'Mostly Sunny' },
    tours: { museumOpen: true, minutesUntilNextTour: 60, nextTour: '1:00 PM' },
    nav: { ok: true, count: 0 },
  });
  assert.ok(score.score >= 80);
  assert.equal(score.confidence, 'High');
  assert.match(score.reasons.join(' '), /locking now/i);
});

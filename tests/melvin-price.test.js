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

test('CWMS values parse common version-2 shape', () => {
  const values = api.parseCwmsValues({ values: [[1788861600000, 398.1, 0], [1788863400000, 398.2, 0]] });
  assert.equal(values.length, 2);
  assert.equal(values[1].value, 398.2);
});

test('tour schedule returns the next normal walk-in tour', () => {
  // 2026-09-09 16:30Z is 11:30 AM CDT.
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

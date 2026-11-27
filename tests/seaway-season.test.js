'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { seasonState, easternInstant } = require('../public/assets/seaway-season.js');

const data = JSON.parse(fs.readFileSync('data/seaway/season.json', 'utf8'));
const at = (iso, d = data) => seasonState(d, new Date(iso));
const typicalOnly = { ...data, seasons: {} };

test('official 2026 data is ordered and sourced', () => {
  const s = data.seasons['2026'];
  assert.match(s.source.url, /^https:\/\/greatlakes-seaway\.com\/.+notice20261022_en\.pdf$/);
  assert.ok(Date.parse(s.opening) < Date.parse(s.regularEntryEnds));
  assert.ok(Date.parse(s.regularEntryEnds) < Date.parse(s.allClearBy));
  assert.ok(Date.parse(s.allClearBy) < Date.parse(data.seasons['2027'].opening));
  assert.match(data.noticesIndex, /^https:\/\/greatlakes-seaway\.com\//);
});

test('Eastern wall-clock conversion handles standard and daylight time', () => {
  assert.equal(new Date(easternInstant(2027, 1, 5, 12, 0)).toISOString(), '2027-01-05T17:00:00.000Z');
  assert.equal(new Date(easternInstant(2027, 3, 22, 8, 0)).toISOString(), '2027-03-22T12:00:00.000Z');
});

test('late November 2026 counts official regular-transit days through December 24 inclusive', () => {
  const s = at('2026-11-27T08:00:00-05:00');
  assert.equal(s.state, 'final-weeks');
  assert.equal(s.daysLeft, 28);
  assert.match(s.headline, /^28 days left/);
  assert.match(s.detail, /11:59 p\.m\. on December 24/);
  assert.match(s.detail, /noon on January 5, 2027/);
  assert.match(s.source.url, /notice20261022/);
});

test('official cutoff and clearance boundaries use Eastern time', () => {
  assert.equal(at('2026-12-24T23:58:00-05:00').state, 'last-day');
  assert.equal(at('2026-12-25T00:01:00-05:00').state, 'clearing');
  assert.equal(at('2027-01-05T11:59:00-05:00').state, 'clearing');
  assert.equal(at('2027-01-05T12:01:00-05:00').state, 'closed');
});

test('winter counts down to the official reopening target with the harbour caveat', () => {
  const s = at('2027-01-20T10:00:00-05:00');
  assert.equal(s.state, 'closed');
  assert.equal(s.daysUntilOpening, 61);
  assert.ok(s.official);
  assert.match(s.detail, /Target reopening: March 22, 2027/);
  assert.match(s.detail, /St\. Lambert/);
});

test('reopening day turns into an opening-week state, then a normal open season', () => {
  const opening = at('2027-03-22T09:00:00-04:00');
  assert.equal(opening.state, 'opening-week');
  assert.match(opening.headline, /2027 season was scheduled to open March 22/);
  assert.match(opening.detail, /ice/);
  const later = at('2027-04-15T09:00:00-04:00');
  assert.equal(later.state, 'open');
  assert.match(later.headline, /2027 season is open/);
});

test('a season without official closing dates uses the typical schedule and says so', () => {
  const s = at('2027-12-01T09:00:00-05:00');
  assert.equal(s.state, 'final-weeks');
  assert.equal(s.official, false);
  assert.match(s.headline, /^About 24 days left/);
  assert.match(s.detail, /around December 24/);
  assert.match(s.detail, /typical dates/);
  assert.doesNotMatch(s.detail, /11:59 p\.m\./);
  assert.equal(s.source.url, data.noticesIndex);
});

test('never dead-ends: every day for five years with no official dates yields a usable state', () => {
  const allowed = new Set(['open', 'final-weeks', 'last-day', 'clearing', 'closed', 'opening-week']);
  let t = Date.parse('2027-01-01T12:00:00Z');
  const end = Date.parse('2032-01-01T12:00:00Z');
  const seen = new Set();
  for (; t < end; t += 86400000) {
    const s = seasonState(typicalOnly, new Date(t));
    assert.ok(allowed.has(s.state), s.state);
    assert.ok(s.headline.length > 10 && s.detail.length > 20);
    assert.doesNotMatch(s.headline + s.detail, /undefined|NaN|out of date/);
    seen.add(s.state);
  }
  assert.deepEqual([...seen].sort(), [...allowed].sort());
});

test('typical winter wait points at the next opening, not a past one', () => {
  const s = at('2029-02-01T09:00:00-05:00', typicalOnly);
  assert.equal(s.state, 'closed');
  assert.equal(s.season, 2029);
  assert.match(s.detail, /usually open around March 22/);
});

for (const slug of ['st-lawrence-seaway', 'eisenhower-lock']) {
  test(slug + ' renders an evergreen no-JS band, the ship-watch line and inline data', () => {
    const html = fs.readFileSync('public/' + slug + '/index.html', 'utf8');
    const heroStart = html.indexOf('<div class="hero wrap">');
    const hero = html.slice(heroStart, html.indexOf('<figure>', heroStart));
    assert.match(hero, /<aside class="season-band" id="seawaySeason" data-seaway-season/);
    assert.match(hero, /usually open from late March to early January/);
    assert.doesNotMatch(hero, /20\d\d/, 'static fallback must not carry a year that can expire');
    assert.match(hero, /data-track-tool="seaway-season-notice"/);
    assert.equal(html.split('class="season-inline" data-seaway-season').length - 1, 1);
    const json = html.match(/<script type="application\/json" id="seawaySeasonData">(.*?)<\/script>/);
    assert.ok(json, 'inline season data');
    assert.deepEqual(JSON.parse(json[1]), data);
    assert.ok(html.indexOf('id="seawaySeasonData"') < html.indexOf('/assets/seaway-season.js'));
  });
}

'use strict';
// Soo Locks Lock Watch planner core: posted hours, daylight, season and the
// visit-versus-window verdicts. Browser behaviour is covered separately by
// tests/soo-lock-watch-browser.cjs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../public/assets/soo-lock-watch.js');

const NOV = Date.parse('2026-11-21T14:45:00Z'); // 9:45 a.m. EST
const iso = (base, min) => new Date(base + min * 60000).toISOString();
const minutesApart = (a, b) => Math.abs(a - b) / 60000;

function data(now, extra = {}) {
  const gott = { id: '366971370', mmsi: '366971370', name: 'EDWIN H. GOTT', state: 'in-lock', chamber: 'poe', chamberName: 'Poe Lock', direction: 'downbound', seen: iso(now, -1), ageMinutes: 1, lat: 46.5029, lon: -84.352 };
  const burns = { id: '366972000', mmsi: '366972000', name: 'BURNS HARBOR', state: 'approaching', direction: 'upbound', lockCertain: true, ageMinutes: 2, window: { start: iso(now, 105), midpoint: iso(now, 160), end: iso(now, 235) } };
  const late = { id: '316001234', mmsi: '316001234', name: 'ALGOMA EQUINOX', state: 'approaching', direction: 'downbound', lockCertain: false, ageMinutes: 2, window: { start: iso(now, 510), midpoint: iso(now, 560), end: iso(now, 610) } };
  return { ok: true, checkedAt: iso(now, 0), vessels: [], nextShip: Object.assign({ ok: true, inLock: [gott], candidates: [burns, late], pick: burns }, extra) };
}

test('sunrise and sunset for Sault Ste. Marie match published tables within three minutes', () => {
  // weather-us.com: November 30 sunrise 8:00 a.m., sunset 4:52 p.m. EST.
  const nov30 = core.sunTimes(Date.parse('2026-11-30T17:00:00Z'));
  assert.ok(minutesApart(nov30.sunrise, Date.parse('2026-11-30T13:00:00Z')) <= 3);
  assert.ok(minutesApart(nov30.sunset, Date.parse('2026-11-30T21:52:00Z')) <= 3);
  // quartertotwelve.com: June 19, 2026 sunrise 5:43 a.m., sunset 9:34 p.m. EDT.
  const jun19 = core.sunTimes(Date.parse('2026-06-19T17:00:00Z'));
  assert.ok(minutesApart(jun19.sunrise, Date.parse('2026-06-19T09:43:00Z')) <= 3);
  assert.ok(minutesApart(jun19.sunset, Date.parse('2026-06-20T01:34:00Z')) <= 3, 'summer sunset falls on the next UTC day');
});

test('posted USACE park hours follow the month in Sault Ste. Marie time', () => {
  assert.equal(core.parkHours(Date.parse('2026-07-04T15:00:00Z')).label, '9 a.m. to 10 p.m.');
  assert.equal(core.parkHours(Date.parse('2026-09-12T15:00:00Z')).label, '9 a.m. to 9 p.m.');
  assert.equal(core.parkHours(NOV).label, '9 a.m. to 6 p.m.');
  const h = core.parkHours(NOV);
  assert.equal(h.open, Date.parse('2026-11-21T14:00:00Z'));
  assert.equal(h.close, Date.parse('2026-11-21T23:00:00Z'));
  // 9:30 p.m. EDT on October 31 is still October locally, though it is November in UTC.
  assert.equal(core.parkHours(Date.parse('2026-11-01T01:30:00Z')).months, 'May, September and October');
  assert.equal(core.visitorCenterOpen(Date.parse('2026-05-01T14:00:00Z')), true);
  assert.equal(core.visitorCenterOpen(NOV), false);
});

test('the navigation season matches the calendar the page strip uses', () => {
  assert.equal(core.navigationSeason(Date.parse('2026-01-14T15:00:00Z')).open, true);
  const shut = core.navigationSeason(Date.parse('2026-01-15T15:00:00Z'));
  assert.equal(shut.open, false);
  assert.equal(shut.reopens, Date.parse('2026-03-25T04:00:00Z'));
  assert.equal(core.navigationSeason(Date.parse('2026-03-25T15:00:00Z')).open, true);
  const p = core.plan({ data: data(NOV), now: Date.parse('2026-02-10T15:00:00Z') });
  assert.equal(p.status, 'season-closed');
  assert.equal(p.ships.length, 0, 'no ships are lined up during the shutdown');
});

test('a visit starting now leads with the ship already in a chamber', () => {
  const p = core.plan({ data: data(NOV), now: NOV, startOffset: 0, stay: 90 });
  assert.equal(p.status, 'in-lock-now');
  assert.match(p.headline, /EDWIN H\. GOTT is in the Poe Lock right now/);
  assert.equal(p.suggestion.id, '366972000', 'offers to plan around the next window');
});

test('changing the visit changes the answer, and partial overlap offers the covering times', () => {
  const later = core.plan({ data: data(NOV), now: NOV, startOffset: 120, stay: 90 });
  assert.equal(later.status, 'match');
  assert.match(later.headline, /^Best bet: BURNS HARBOR/);
  assert.equal(later.ships.find(s => s.id === '366971370').fit, 'gone', 'the in-lock ship is not promised to a later visit');
  const early = core.plan({ data: data(NOV), now: NOV, startOffset: 60, stay: 90 });
  assert.equal(early.status, 'partial');
  assert.match(early.detail.join(' '), /covers all of it/);
  assert.equal(early.suggestion.id, '366972000');
  const miss = core.plan({ data: data(NOV), now: NOV, startOffset: 30, stay: 45 });
  assert.equal(miss.status, 'none');
  assert.match(miss.detail.join(' '), /next estimated window is BURNS HARBOR/);
  assert.match(miss.detail.join(' '), /beyond this view/, 'says the view is limited rather than implying no later ships');
});

test('windows after closing and after sunset are flagged, never hidden', () => {
  const p = core.plan({ data: data(NOV), now: NOV, startOffset: 240, stay: 240 });
  const late = p.ships.find(s => s.id === '316001234');
  assert.equal(late.afterClose, true);
  assert.equal(late.dark, true);
  assert.equal(p.ships.find(s => s.id === '366972000').afterClose, false);
  // A 3 p.m. check planning a 5 p.m. arrival for three hours runs past 6 p.m. and past sunset.
  const afternoon = Date.parse('2026-11-21T20:00:00Z');
  const evening = core.plan({ data: data(afternoon), now: afternoon, startOffset: 120, stay: 180 });
  assert.ok(evening.notes.some(n => /2 hr of this visit falls outside them/.test(n)), evening.notes.join(' | '));
  assert.ok(evening.notes.some(n => /^Sunset is 4:5\d PM/.test(n)), evening.notes.join(' | '));
});

test('missing, failed and empty feeds are explicit and never read as an empty river', () => {
  const loading = core.plan({ data: null, loading: true, now: NOV });
  assert.equal(loading.status, 'loading');
  const failed = core.plan({ data: null, failed: true, now: NOV });
  assert.equal(failed.status, 'unavailable');
  assert.match(failed.detail[0], /not a report of an empty river/);
  assert.equal(failed.link.href, core.BOATNERD);
  const broken = core.plan({ data: { ok: true, nextShip: { ok: false } }, now: NOV });
  assert.equal(broken.status, 'unavailable');
  const empty = core.plan({ data: data(NOV, { inLock: [], candidates: [], pick: null }), now: NOV });
  assert.equal(empty.status, 'no-ships');
  assert.match(empty.detail[0], /not proof of an empty river/);
  const retained = core.plan({ data: data(NOV), failed: true, now: NOV, startOffset: 120 });
  assert.equal(retained.status, 'match');
  assert.match(retained.notes[0], /latest refresh failed/);
});

test('the hotline is described only as seasonal outside May through October', () => {
  assert.ok(core.plan({ data: data(NOV), now: NOV }).notes.some(n => /hotline is not maintained now/.test(n)));
  const july = Date.parse('2026-07-04T15:00:00Z');
  assert.ok(!core.plan({ data: data(july), now: july }).notes.some(n => /hotline/.test(n)));
});

test('the planner states no probability, score or confidence number', () => {
  for (const [o, s] of [[0, 90], [60, 90], [120, 90], [30, 45], [240, 240]]) {
    const p = core.plan({ data: data(NOV), now: NOV, startOffset: o, stay: s });
    const text = [p.headline, ...p.detail, ...p.notes].join(' ');
    assert.doesNotMatch(text, /%|\bchance\b|\bconfidence\b|\bguarantee/i, text);
  }
});

test('one ship appears once even if a report lands in both lists', () => {
  const d = data(NOV);
  d.nextShip.inLock.push({ ...d.nextShip.inLock[0] });
  const p = core.plan({ data: d, now: NOV, startOffset: 120 });
  assert.equal(p.ships.filter(s => s.id === '366971370').length, 1);
});

test('the page wires the planner in after the next-ship answer without touching search identity', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public/soo-locks/index.html'), 'utf8');
  const at = id => html.indexOf(`id="${id}"`);
  assert.ok(at('soo-next-ship') > 0 && at('soo-next-ship') < at('soo-lock-watch'));
  assert.ok(at('soo-lock-watch') < at('soo-schedule-answer'));
  assert.match(html, /<section class="lock-watch" id="soo-lock-watch"[^>]*data-no-ads/);
  assert.match(html, /<title>Soo Locks Schedule Today: Ships &amp; Map \| Chris Izworski<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski.com\/soo-locks\/">/);
  assert.ok(html.indexOf('/assets/soo-ais.js') < html.indexOf('/assets/soo-lock-watch.js'), 'the AIS client loads first');
  assert.match(html, /November through April: 9 a\.m\. to 6 p\.m\./, 'posted hours are readable without JavaScript');
  assert.equal((html.match(/data-in-article-ad-break/g) || []).length, 1, 'the existing ad break marker is unchanged');
});

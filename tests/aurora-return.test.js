'use strict';
// Northern Lights Michigan return features: since-last-check line, share link, calendar file.
// Contract: docs/return-contracts/northern-lights-michigan.md
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/northern-lights-michigan/index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'public/assets/aurora-return.js'), 'utf8');

function api() {
  const window = {};
  vm.runInContext(source, vm.createContext({ window, Date, JSON, isFinite, encodeURIComponent }));
  return window.AuroraReturn;
}

const HOUR = 3600 * 1000;
const now = Date.parse('2026-11-24T23:00:00Z');
const decision = { regionId: 'marquette', regionLabel: 'Marquette', state: 'monitor', headline: 'Aurora signal worth monitoring tonight', kp: 5.33, threshold: 4, bestTime: '2026-11-25T04:00:00Z' };

test('since-last-check compares with the previous visit only when it is meaningfully older', () => {
  const { describeChange } = api();
  const prior = { state: 'low', kp: 2.3, at: now - 26 * HOUR };
  const line = describeChange(prior, decision, now);
  assert.match(line, /^Since your last check \((Monday|Tuesday) [0-9]{1,2}:[0-9]{2} (AM|PM)\): /);
  assert.match(line, /Signal was low \(Kp 2\.3\), now worth monitoring \(Kp 5\.3\)\.$/);
  assert.match(describeChange({ state: 'monitor', kp: 5.3, at: now - 3 * HOUR }, decision, now), /still worth monitoring/);
  assert.equal(describeChange({ state: 'low', kp: 2, at: now - 5 * 60 * 1000 }, decision, now), null, 'a quick reload is not a last visit');
  assert.equal(describeChange({ state: 'low', kp: 2, at: now - 30 * 24 * HOUR }, decision, now), null, 'too old to compare');
  assert.equal(describeChange(undefined, decision, now), null, 'first visit shows nothing');
  assert.equal(describeChange({ state: 'bogus', at: now - 2 * HOUR }, decision, now), null, 'unknown stored state is ignored');
  assert.equal(describeChange(prior, { ...decision, state: 'unavailable' }, now), null, 'never report the pre-data placeholder');
});

test('calendar file is a valid single event in UTC with no alarm', () => {
  const { buildIcs } = api();
  const ics = buildIcs(decision, new Date(now));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.match(ics, /\r\nUID:aurora-marquette-2026-11-25@chrisizworski\.com\r\n/);
  assert.match(ics, /\r\nDTSTART:20261125T040000Z\r\nDTEND:20261125T050000Z\r\n/);
  assert.match(ics, /\r\nSUMMARY:Look for the northern lights near Marquette\r\n/);
  assert.doesNotMatch(ics, /VALARM/, 'no reminders pushed by the site');
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 1);
});

test('calendar is offered only for a worthwhile, upcoming best time', () => {
  const { calendarWorthOffering } = api();
  assert.equal(calendarWorthOffering(decision, now), true);
  assert.equal(calendarWorthOffering({ ...decision, state: 'low' }, now), false);
  assert.equal(calendarWorthOffering({ ...decision, bestTime: '2026-11-24T20:00:00Z' }, now), false, 'past');
  assert.equal(calendarWorthOffering({ ...decision, bestTime: '2026-11-27T04:00:00Z' }, now), false, 'too far out');
});

test('share text states only computed values and links back with the region', () => {
  const { shareText, shareUrl } = api();
  const text = shareText(decision);
  assert.match(text, /^Northern lights near Marquette tonight: Aurora signal worth monitoring tonight\./);
  assert.match(text, /NOAA forecast Kp 5\.3 against a local threshold of Kp 4\. No forecast guarantees visibility\.$/);
  assert.equal(shareUrl('marquette'), 'https://chrisizworski.com/northern-lights-michigan/?region=marquette&utm_source=share&utm_medium=aurora');
  for (const value of [source, text]) assert.ok(!/[–—]/.test(value), 'no en or em dashes');
});

test('page wires the controls as progressive enhancement and never asks for notifications', () => {
  assert.match(html, /<script defer src="\/assets\/aurora-return\.js\?v=\d+"><\/script>/);
  assert.match(html, /<p class="since-last-check" id="sinceLastCheck" hidden><\/p>/);
  assert.match(html, /<button class="hero-btn" id="shareRegionBtn" type="button" hidden>/);
  assert.match(html, /<button class="hero-btn" id="calendarBestBtn" type="button" hidden>/);
  assert.match(html, /announceAuroraDecision\(\{regionId: selectedRegionId/);
  assert.match(html, /new URLSearchParams\(window\.location\.search\)\.get\('region'\)/);
  assert.doesNotMatch(source, /Notification|PushManager|serviceWorker/);
  assert.doesNotMatch(source, /fetch\(/, 'no new network requests');
});

test('manual and geolocation selection update the same region URL and preserve other parameters', () => {
  const start = html.indexOf('function setSelectedRegion(');
  const end = html.indexOf('// === Kp threshold', start);
  assert.ok(start >= 0 && end > start);
  const code = html.slice(start, end);
  const select = { options: [{ value: 'marquette' }, { value: 'bay-city' }, { value: 'mackinaw-city' }], value: 'marquette' };
  const window = { location: { href: 'https://chrisizworski.com/northern-lights-michigan/?region=marquette&utm_source=share#viewing-locations' },
    history: { state: { retained: true }, replaceState(state, title, url) {
      assert.equal(state.retained, true);
      window.location.href = new URL(url, window.location.href).href;
    } } };
  const saved = {};
  const context = vm.createContext({ window, URL, document: { getElementById: id => id === 'regionSelect' ? select : null },
    selectedRegionId: 'marquette', REGION_GUIDE_LINKS: {}, REGION_PREF_KEY: 'region',
    localStorage: { setItem(key, value) { saved[key] = value; } },
    trackAuroraEvent() {}, latestAuroraData: {}, renderDecisionData() {} });
  vm.runInContext(code, context);
  context.setSelectedRegion('bay-city', 'geolocation', false);
  assert.equal(select.value, 'bay-city');
  assert.equal(saved.region, 'bay-city');
  assert.equal(new URL(window.location.href).searchParams.get('region'), 'bay-city');
  assert.equal(new URL(window.location.href).searchParams.get('utm_source'), 'share');
  assert.equal(new URL(window.location.href).hash, '#viewing-locations');
  context.setSelectedRegion('marquette', 'selector', true);
  assert.equal(new URL(window.location.href).searchParams.get('region'), 'marquette');
  context.setSelectedRegion('invalid', 'saved', false);
  assert.equal(new URL(window.location.href).searchParams.get('region'), 'mackinaw-city');
});

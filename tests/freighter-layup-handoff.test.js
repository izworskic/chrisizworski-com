const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => readFileSync(path.join(root, file), 'utf8');
const tracker = read('public/great-lakes-freighter-tracking/index.html');
const winter = read('public/great-lakes-freighter-winter-layup/index.html');
const css = read('public/assets/freighter-tracker.css');
const sitemap = read('public/sitemap.xml');

test('live AIS tracker keeps distinct canonical, search identity, and functional map inputs', () => {
  assert.match(tracker, /<title>Great Lakes Ship Tracker Live Now \| Chris Izworski<\/title>/);
  assert.match(tracker, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/great-lakes-freighter-tracking\/">/);
  assert.match(tracker, /<h1>Track Great Lakes Freighters Live<\/h1>/);
  assert.match(tracker, /id="freighterMap"/);
  assert.match(tracker, /id="freighterNameSearch"/);
  assert.match(tracker, /data-freighter-view="overview"/);
  assert.match(tracker, /id="freighterVessels"/);
  assert.match(tracker, /"dateModified": "2026-10-25"/);
  assert.match(sitemap, /<loc>https:\/\/chrisizworski\.com\/great-lakes-freighter-tracking\/<\/loc>\s*<lastmod>2026-10-25<\/lastmod>/);
});

test('contextual winter handoff remains crawlable, accurate, and two-way', () => {
  const anchor = '<a class="layup-handoff-link" href="/great-lakes-freighter-winter-layup/"';
  assert.ok(tracker.includes(anchor), 'Native link to existing layup canonical');
  assert.match(tracker, /Live AIS shows recent vessel reports, not proof that a ship has entered winter layup/);
  assert.match(tracker, /dated harbor confirmations, changing winter status, and each freighter's story/);
  assert.match(winter, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/great-lakes-freighter-winter-layup\/">/);
  assert.ok(winter.includes('href="/great-lakes-freighter-tracking/"'), 'Winter guide links back to live AIS');
  assert.ok(tracker.indexOf('id="live-map"') < tracker.indexOf('class="layup-handoff"'), 'AIS map remains first');
  assert.ok(tracker.indexOf('class="layup-handoff"') < tracker.indexOf('id="how-to-track"'), 'Handoff after map, before guide');
});

test('winter handoff is readable on mobile without changing tracker controls', () => {
  assert.match(css, /\.layup-handoff\s*\{\s*display:grid;grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(css, /@media\(max-width:700px\)\{\.layup-handoff\{grid-template-columns:1fr/);
  assert.match(css, /\.layup-handoff-link:focus-visible\{outline:/);
  assert.match(css, /\.layup-handoff-link\{[^}]*min-height:46px/);
});

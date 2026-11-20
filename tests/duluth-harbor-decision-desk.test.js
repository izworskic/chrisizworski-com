'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/duluth-canal-park/index.html'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public/assets/duluth-canal.js'), 'utf8');
const tuner = fs.readFileSync(path.join(root, 'scripts/tune-duluth-discovery.mjs'), 'utf8');
const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8');

test('live and published evidence share the first decision desk without merging their meanings', () => {
  assert.equal((html.match(/class="harbor-horizons"/g) || []).length, 1);
  const start = html.indexOf('class="harbor-horizons"');
  const live = html.indexOf('id="watchPick"', start);
  const published = html.indexOf('id="published-arrivals"', live);
  const deskEnd = html.indexOf('class="hero-actions"', published);
  const map = html.indexOf('id="live-map"', deskEnd);
  assert.ok(start > 0 && start < live && live < published && published < deskEnd && deskEnd < map);
  assert.match(html.slice(start, deskEnd), /No supported next passage does not mean no ships are scheduled today/);
  assert.match(html.slice(start, deskEnd), /https:\/\/harborlookout\.com\//);
  assert.match(html.slice(start, deskEnd), /href="#cameraMonitor"/);
  assert.match(html, /The page only publishes a passage window when fresh vessel position, motion and route evidence support it/);
});

test('mobile, map failure and no-script visitors retain a working next action', () => {
  assert.match(html, /@media\(max-width:700px\)\{\.harbor-horizons\{grid-template-columns:minmax\(0,1fr\)/);
  assert.match(html, /\.harbor-horizons>\.watch-card\{min-width:0/);
  assert.match(html, /<noscript><p class="harbor-noscript">/);
  assert.match(html, /https:\/\/www\.duluthharborcam\.com\/p\/canal-park-cams\.html/);
  assert.match(client, /button\('Choose a shore view', 'button secondary compact'/);
  assert.match(client, /if \(map && spotMarkers\.size\) focusAllWatchSpots\(\)/);
  assert.match(client, /else \$\('where-watch'\)\.scrollIntoView/);
  assert.match(html, /id="where-watch"/);
});

test('CTR-facing search promise is accurate and preserves canonical, Person and search freshness', () => {
  assert.match(tuner, /const TITLE = 'Duluth Ship Schedule Today & Live Cams \| Chris Izworski'/);
  assert.match(tuner, /const DESCRIPTION = 'Duluth ship schedule today: see the next AIS-supported passage window, check later published arrivals and departures, and watch Canal Park live cams\.'/);
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/duluth-canal-park\/"/);
  assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  assert.match(html, /"dateModified":"2026-11-20"/);
  const index = sitemap.indexOf('<loc>https://chrisizworski.com/duluth-canal-park/</loc>');
  assert.ok(index > 0);
  assert.match(sitemap.slice(index, index + 130), /<lastmod>2026-11-20<\/lastmod>/);
  assert.doesNotMatch(html, /noindex/i);
});

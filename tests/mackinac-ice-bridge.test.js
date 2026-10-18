'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const page = read('public/mackinac-ice-bridge/index.html');
const ui = read('public/assets/mackinac-ice-bridge.js');
const api = read('api/ice-now.js');

test('Mackinac Ice Bridge page is a distinct indexable, authored seasonal tool', () => {
  const title = page.match(/<title>([^<]+)<\/title>/)?.[1];
  const desc = page.match(/<meta name="description" content="([^"]+)"/)?.[1];
  assert.ok(title && title.length <= 60, 'title must be <= 60 characters');
  assert.ok(desc && desc.length <= 158, 'meta description must be <= 158 characters');
  assert.match(page, /rel="canonical" href="https:\/\/chrisizworski.com\/mackinac-ice-bridge\/"/);
  assert.match(page, /https:\/\/chrisizworski.com\/#person/);
  assert.match(page, /dateModified":"2026-10-18"/);
  assert.match(page, /Mackinac Island Christmas Tree Ice Bridge Watch/);
});
test('No travel safety promise or route appears in map and content', () => {
  assert.match(page, /tool cannot tell anyone when the ice bridge is safe or open/);
  assert.match(page, /no crossing line/);
  assert.match(page, /Christmas-tree markers are not safety certification/);
  assert.doesNotMatch(page, /(?:safe to cross|open for snowmobiles|crossing is safe)/i);
  assert.match(ui, /No usable recent NOAA concentration classification/);
  assert.match(ui, /iceReady = !!\(o && o.available && !o.stale && o.validAt\)/);
  assert.doesNotMatch(ui, /(?:polyline|routingControl|drawRoute)\s*\(/);
});
test('Map uses keyless CARTO and the official NOAA chart, with failure state', () => {
  assert.match(ui, /basemaps\.cartocdn\.com/);
  assert.match(ui, /mapservices\.weather\.noaa\.gov/);
  assert.match(ui, /L\.imageOverlay\(/);
  assert.match(ui, /map-fail/);
  assert.match(page, /id="toggleIce"/);
  assert.match(page, /id="fitMap"/);
});
test('Forecast separates NWS hourly forcing and daily freeze/thaw exploration', () => {
  assert.match(api, /'mackinac-straits'/);
  assert.match(api, /function forecastDaily\(/);
  assert.match(api, /next7Days: forecastDaily\(periods\)/);
  assert.match(ui, /day\.freezeHours/);
  assert.match(ui, /day\.thawHours/);
  assert.match(ui, /function selectDay\(/);
  assert.match(ui, /St\. Ignace hourly grid/);
});
test('Discovery, sitemap and registry connect with Michigan Ice Report', () => {
  const tools = read('public/tools/index.html');
  const sitemap = read('public/sitemap.xml');
  const registry = JSON.parse(read('benchmarks/tool-network-registry.json'));
  assert.match(tools, /data-tool-id="mackinac-ice-bridge"/);
  assert.match(sitemap, /https:\/\/chrisizworski.com\/mackinac-ice-bridge\//);
  assert.ok(registry.tools.some(t => t.id === 'mackinac-ice-bridge' && t.canonical === 'https://chrisizworski.com/mackinac-ice-bridge/'));
  assert.ok(registry.relationships.some(r => r.from === 'mackinac-ice-bridge' && r.to === 'michigan-ice'));
  assert.ok(registry.relationships.some(r => r.from === 'mackinac-ice-bridge' && r.to === 'mackinac-island'));
});
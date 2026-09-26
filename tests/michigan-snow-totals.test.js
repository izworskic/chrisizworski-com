const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const api = require('../api/michigan-snow-totals.js');
const { normalize, largestPerPlace, summarize, OFFICES } = api._test;
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/michigan-snow-totals/index.html'), 'utf8');

// Shapes copied from real IEM Local Storm Report properties (Michigan, January 2026).
const raw = (over) => ({ typetext: 'SNOW', magnitude: '17', unit: 'Inch', qualifier: 'M', city: 'Barron Lake', county: 'Cass', wfo: 'IWX',
  source: 'Cocorahs', remark: 'Cocorahs station MI-CS-5 Niles 3.5 E.', lat: 41.8, lon: -86.2, valid: '2026-01-15T14:00:00Z',
  product_id: '202601151410-KIWX-NWUS53-LSRIWX', ...over });

test('reports keep the observer figure, time, source and measured status', () => {
  const r = normalize(raw());
  assert.equal(r.inches, 17);
  assert.equal(r.measured, true);
  assert.equal(r.reportedAt, '2026-01-15T14:00:00.000Z');
  assert.match(r.productUrl, /mesonet\.agron\.iastate\.edu\/p\.php\?pid=202601151410/);
  assert.equal(normalize(raw({ qualifier: 'E' })).measured, false);
  // String magnitudes are parsed, bad rows are dropped rather than guessed.
  assert.equal(normalize(raw({ magnitude: '12.9' })).inches, 12.9);
  assert.equal(normalize(raw({ magnitude: 'T' })), null);
  assert.equal(normalize(raw({ lat: null })), null);
  assert.equal(normalize(raw({ valid: 'not a date' })), null);
});

test('each place ranks once, at its largest report', () => {
  const rows = [raw({ magnitude: '6', valid: '2026-01-15T02:00:00Z' }), raw(), raw({ magnitude: '16.4', city: 'Niles', county: 'Berrien' })].map(normalize);
  const ranked = largestPerPlace(rows);
  assert.deepEqual(ranked.map(r => `${r.place}:${r.inches}`), ['Barron Lake:17', 'Niles:16.4']);
});

test('windows filter by report time and never relabel a figure as a 24-hour total', () => {
  const now = Date.parse('2026-01-16T15:00:00Z');
  const rows = [raw(), raw({ city: 'Old', magnitude: '30', valid: '2026-01-10T12:00:00Z' })].map(normalize);
  const w = summarize(rows, now);
  assert.equal(w['24h'].placeCount, 0);
  assert.equal(w['48h'].largest.place, 'Barron Lake');
  assert.equal(w['168h'].largest.place, 'Old', '7-day window includes the older report');
  assert.equal(w['48h'].byOffice[0].office, 'IWX');
  assert.deepEqual(Object.keys(OFFICES).sort(), ['APX', 'DTX', 'GRR', 'IWX', 'MQT']);
});

test('page is a self-canonical, byline-bearing search surface', () => {
  const title = html.match(/<title>([^<]+)<\/title>/)[1];
  const desc = html.match(/name="description" content="([^"]+)"/)[1];
  assert.ok(title.length <= 60 && title.includes('Chris Izworski') && /Michigan Snow Totals Today/.test(title));
  assert.ok(desc.length <= 158);
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/michigan-snow-totals\/">/);
  assert.equal((html.match(/application\/ld\+json/g) || []).length, 1);
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  assert.ok(graph.some(n => n['@type'] === 'Person' && n['@id'] === 'https://chrisizworski.com/#person'), 'Person node is defined, not only referenced');
  assert.match(html, /© 2026 Chris Izworski/);
  assert.match(html, /leaflet\.css" integrity="sha256-p4NxAoJBhIIN\+hmNHrzRCf9tD\/miZyoHS5obTRR9BMY="/);
  assert.match(html, /leaflet\.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2\/Z9VM\+kNiyxNV1lvTlZBo="/);
  assert.doesNotMatch(html, /[–—]/);
  assert.doesNotMatch(html, /<ins class="adsbygoogle"/, 'ads come only from the in-article placer');
  // Every visible FAQ answer matches its structured-data copy.
  const faq = graph.find(n => n['@type'] === 'FAQPage').mainEntity;
  for (const q of faq) assert.ok(html.includes(`<p>${q.acceptedAnswer.text.replace(/'/g, "'")}</p>`), q.name);
});

test('registry owns the snowfall intent without competing with snowpack', () => {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'benchmarks/tool-network-registry.json'), 'utf8'));
  const node = registry.tools.find(t => t.id === 'michigan-snow-totals');
  assert.equal(node.canonical, 'https://chrisizworski.com/michigan-snow-totals/');
  const group = registry.cannibalizationGroups.find(g => g.owner === 'michigan-snow-totals');
  assert.ok(group.supports.includes('national-snow'));
  assert.match(group.rule, /doorway/);
});

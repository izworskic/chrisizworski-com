const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const build = read('scripts/add-niagara-border-discovery.mjs');
const growthCss = read('public/assets/niagara-search-growth.20261003.css');

const routes = [
  ['peace-bridge-wait-times', 'Peace Bridge Wait Times Live'],
  ['rainbow-bridge-wait-times', 'Rainbow Bridge Wait Times Live'],
  ['lewiston-queenston-bridge-wait-times', 'Lewiston–Queenston Bridge Wait Times Live'],
  ['whirlpool-rapids-bridge-crossing', 'Whirlpool Rapids Bridge Crossing'],
];

test('Niagara flagship build owns broad live wait intent', () => {
  assert.match(build, /Niagara Border Wait Times Live \| Peace, Rainbow &amp; Lewiston/);
  assert.match(build, /<h1>Niagara Border Wait Times Live<\/h1>/);
  assert.match(build, /Which Niagara bridge should you take right now\?/);
  assert.match(build, /Peace Bridge wait times/);
  assert.match(build, /Rainbow Bridge wait times/);
  assert.match(build, /Lewiston–Queenston wait times/);
  assert.match(build, /Whirlpool Rapids rules & wait/);
  assert.match(build, /patchSearchGrowth\(\);/);
});

test('Niagara mobile hero does not delay the live decision with a scenic photo', () => {
  assert.match(growthCss, /@media\(max-width:620px\)[\s\S]*\.niagara-hero \.hero-photo\{display:none\}/);
  assert.match(growthCss, /\.niagara-search-intents/);
});

test('Niagara has four substantial search-intent bridge pages', () => {
  for (const [route, heading] of routes) {
    const html = read(`public/${route}/index.html`);
    assert.match(html, new RegExp(`<h1>${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/h1>`));
    assert.match(html, /id="detailWait"/);
    assert.match(html, /data-live-api="\/api\/niagara-border-crossings"/);
    assert.match(html, /\/niagara-border-crossing\//);
    assert.match(html, /rel="canonical"/);
    assert.ok(html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length > 450, `${route} is too thin`);
  }
});

test('Niagara bridge pages preserve direction and trusted-traveler authority without inventing total trip time', () => {
  const js = read('public/assets/niagara-bridge-detail.20261003.js');
  assert.match(js, /state\.direction === "to_canada"/);
  assert.match(js, /Canada Border Services Agency/);
  assert.match(js, /U\.S\. Customs and Border Protection/);
  assert.match(js, /crossing\?\.waits\?\.\[state\.direction\]/);
  assert.match(js, /state\.traveler === "nexus"/);
  assert.match(js, /operator_source\?\.available/);
  assert.doesNotMatch(js, /fastestTotalTrip|predictWait|bestWindow/);
});

test('Niagara build publishes the bridge search cluster to sitemap and llms inventory', () => {
  assert.match(build, /upsertSitemapEntry/);
  assert.match(build, /Niagara llms\.txt search cluster refreshed/);
  for (const [route] of routes) {
    const url = `https://chrisizworski.com/${route}/`;
    assert.ok(build.includes(url), `${route} missing from build inventory`);
  }
});

test('Niagara flagship adds crawlable bridge links, visible query answers and honest structured data', () => {
  assert.match(build, /data-niagara-search-intents/);
  assert.match(build, /Niagara border wait time questions/);
  assert.match(build, /data-niagara-search-schema/);
  assert.match(build, /'@type': 'BreadcrumbList'/);
  assert.match(build, /'@type': 'ItemList'/);
  assert.doesNotMatch(build, /FAQPage/);
});

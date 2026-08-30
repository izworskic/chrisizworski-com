const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/isle-royale-map/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/assets/isle-royale-map.js'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/isle-royale-map/catalog.json'), 'utf8'));

function rendered(s) { return s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'); }

test('canonical and Chris Izworski entity are present', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/isle-royale-map\/">/);
  assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  assert.match(html, /"dateModified":"2026-08-30"/);
});

test('SERP strings fit repository limits', () => {
  const title = rendered(html.match(/<title>([^<]+)<\/title>/)[1]);
  const desc = rendered(html.match(/<meta name="description" content="([^"]+)">/)[1]);
  assert.ok(title.length <= 60, `title ${title.length}`);
  assert.ok(desc.length <= 158, `description ${desc.length}`);
});

test('public basemap is keyless and not restricted NPS map tiles', () => {
  assert.match(js, /tile\.openstreetmap\.org/);
  assert.doesNotMatch((html + js).toLowerCase(), /nps\.gov\/maps\/pmtiles/);
});

test('runtime supports source-backed web-map ingestion and fail-soft fallback', () => {
  assert.match(js, /75e3ceba038a45f7b4d5a9d7c6a46ccf/);
  assert.match(js, /57a5a514a8cd40f098b2f99029d118cf/);
  assert.match(js, /services1\.arcgis\.com\/XBhYkoXKJCRHbe7M\/arcgis\/rest\/services\/Isle_Royale_WFL1\/FeatureServer/);
  assert.match(js, /MAPLABEL/);
  assert.match(js, /TRLALTNAME/);
  assert.match(js, /loadFallbackAnchors/);
  assert.match(js, /loadArcGISService/);
});

test('catalog covers the NPMaps source families and deep layers', () => {
  const cats = catalog.items.map(x => x.npmapsCategory.toLowerCase()).join(' ');
  for (const term of ['current park map','regional map','rock harbor','windigo','camping','transportation','shipwreck','relief','lighthouse','geologic','vegetation','historical']) {
    assert.ok(cats.includes(term), `missing ${term}`);
  }
  assert.ok(catalog.items.some(x => x.id === 'geology' && x.state === 'etl-ready'));
  assert.ok(catalog.items.some(x => x.id === 'vegetation-detailed' && x.vintage));
});

test('planning, provenance, accessibility and safety hooks exist', () => {
  for (const id of ['feature-search','layer-filters','feature-list','map-status','source-catalog']) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /not a navigation chart/i);
  assert.match(html, /National Park Service/i);
  assert.match(js, /sourceStatus/);
  assert.match(html, /aria-live/);
});

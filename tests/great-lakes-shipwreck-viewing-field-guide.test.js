const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

const html = read('public/great-lakes-shipwreck-viewing-field-guide/index.html');
const js = read('public/assets/great-lakes-shipwreck-viewing-field-guide.js');
const css = read('public/assets/great-lakes-shipwreck-viewing-field-guide.css');
const registry = JSON.parse(read('public/assets/field-guides-registry.json'));

test('Crawlable shipwreck viewing field guide with 12 source-backed shallow wreck destinations', () => {
  assert.match(html, /<h1[^>]*>[\s\S]*?Ghost ships,\s*40-foot water clarity/i);
  assert.match(html, /rel="canonical" href="https:\/\/chrisizworski\.com\/great-lakes-shipwreck-viewing-field-guide\/"/);

  const stories = html.match(/<article class="wf-story"/g) || [];
  assert.equal(stories.length, 12, 'expected exactly 12 .wf-story cards');

  // Verify zero placeholders
  assert.doesNotMatch(html, /class="wf-story-index"/, 'must not contain placeholder .wf-story-index boxes');

  // Verify persona voice & schema
  assert.match(html, /Maritime Historian &amp; Underwater Preserve Ranger Field Guide/);
  assert.match(html, /"numberOfItems":12/);
  assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  assert.match(html, /"author":\{"@id":"https:\/\/chrisizworski\.com\/#person"\}/);
});

test('Exact 12 shallow shipwreck destinations are present with correct IDs and tags', () => {
  const wreckIds = [
    'bermuda-schooner',
    'herman-hettler',
    'au-sable-point-shipwrecks',
    'francisco-morazan',
    'three-brothers',
    'joseph-s-fay',
    'portland-schooner',
    'monohansett-steam-barge',
    'shamrock-steamer',
    'lb-coates-schooner',
    'troy-silver-spray',
    'whitefish-point-shallows'
  ];

  for (const id of wreckIds) {
    assert.ok(html.includes(`id="${id}"`), `missing wreck id ${id}`);
    assert.ok(html.includes(`data-wreck-id="${id}"`), `missing data-wreck-id for ${id}`);
  }
});

test('Viewing Method filters, clarity science, and wave viewing windows are present', () => {
  // Viewing method filters
  assert.match(html, /Filter 12 Shallow Shipwreck Stops by Viewing Method/);
  assert.match(html, /data-viewing-filter="shore"/);
  assert.match(html, /data-viewing-filter="kayak"/);
  assert.match(html, /data-viewing-filter="glass-bottom"/);
  assert.match(html, /data-viewing-filter="snorkel"/);

  // Clarity science
  assert.match(html, /The Dreissena Clarity Shift/);
  assert.match(html, /Cold-Water Timber Mummification/);
  assert.match(html, /The Brewster's Angle Secret/);

  // Wave viewing windows
  assert.match(html, /The Wave Viewing Window/);
  assert.match(html, /Prime Viewing Window/);
  assert.match(html, /Polarized Lenses Essential/);
  assert.match(html, /Overhead Viewing Blocked/);

  // Ranger golden rules
  assert.match(html, /Michigan Part 761 Law/);
  assert.match(html, /Cold Water Shock/);
  assert.match(html, /Never Anchor Directly into Shipwreck Timbers/);
  assert.match(html, /The 1-Foot Wave Rule for Kayaks/);
});

test('Viewing method filters and map hooks are wired in client JS with CARTO basemap and fallback', () => {
  assert.match(js, /WRECKS_DATA/);
  assert.match(js, /initFilters/);
  assert.match(js, /applyFilters/);
  assert.match(js, /initMap/);
  assert.match(js, /\/api\/carto-basemap-config/);
  assert.match(js, /rastertiles\/voyager/);
  assert.match(js, /encodeURIComponent/);
  assert.match(js, /tile\.openstreetmap\.org/);
  assert.match(js, /sw-visible-count/);
});

test('View-only Google Maps links use area coordinates without directions API', () => {
  const blocks = [...html.matchAll(/<article class="wf-story"[\s\S]*?<\/article>/g)];
  assert.equal(blocks.length, 12);
  for (const [b] of blocks) {
    assert.match(b, /https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=[0-9.]+%2C-[0-9.]+/);
    assert.match(b, /View [^<]+ on Google Maps · area only, not verified parking ↗/);
    assert.match(b, /target="_blank" rel="noopener noreferrer"/);
  }
  assert.doesNotMatch(html, /maps\/dir\/|directions\?api=1/);
});

test('All destination photos have source attribution and valid license metadata', () => {
  const photos = [...html.matchAll(/<figure class="wf-photo[^]*?<\/figure>/g)];
  assert.ok(photos.length >= 15, `expected at least 15 figures, found ${photos.length}`);
  for (const [photo] of photos) {
    assert.match(photo, /Photo: <a/);
    assert.match(photo, /(CC BY|CC0|Public [Dd]omain|NOAA|US Coast Guard)/i);
    assert.match(photo, /<figcaption>/);
    assert.match(photo, /alt="[^"]+"/);
  }
});

test('Field guide is registered in registry, guides hub, tools hub, sitemap, and companions', () => {
  const liveEntry = registry.guides.find((g) => g.slug === 'great-lakes-shipwreck-viewing-field-guide');
  assert.ok(liveEntry, 'registry must contain great-lakes-shipwreck-viewing-field-guide');
  assert.equal(liveEntry.status, 'live');
  assert.equal(liveEntry.stopCount, 12);

  const guidesHub = read('public/guides/index.html');
  assert.ok(guidesHub.includes('data-field-guide="great-lakes-shipwreck-viewing-field-guide"'));
  assert.ok(guidesHub.includes('href="/great-lakes-shipwreck-viewing-field-guide/"'));

  const toolsHub = read('public/tools/index.html');
  assert.ok(toolsHub.includes('href="/great-lakes-shipwreck-viewing-field-guide/"'));

  const sitemap = read('public/sitemap-winter.xml');
  assert.ok(sitemap.includes('https://chrisizworski.com/great-lakes-shipwreck-viewing-field-guide/'));

  const shipwrecksHub = read('public/great-lakes-shipwrecks/index.html');
  assert.ok(shipwrecksHub.includes('href="/great-lakes-shipwreck-viewing-field-guide/"'));

  // Hero CTAs are styled as prominent buttons
  assert.match(html, /class="[^"]*sw-hero-ctas[^"]*"/);
  assert.match(html, /href="\/great-lakes-shipwrecks\/"[^>]*>Explore Shipwrecks Database/);
  assert.match(html, /href="\/great-lakes-buoys\/"[^>]*>Open Great Lakes Wave Buoys/);
  assert.match(css, /\.sw-secondary-cta/);
});

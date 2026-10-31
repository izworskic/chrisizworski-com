const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

const html = read('public/great-lakes-island-hopping-field-guide/index.html');
const js = read('public/assets/great-lakes-island-hopping-field-guide.js');
const css = read('public/assets/great-lakes-island-hopping-field-guide.css');
const registry = JSON.parse(read('public/assets/field-guides-registry.json'));

test('Crawlable island-hopper field guide with 12 source-backed archipelago destinations', () => {
  assert.match(html, /<h1[^>]*>[\s\S]*?Cross the open water/i);
  assert.match(html, /rel="canonical" href="https:\/\/chrisizworski\.com\/great-lakes-island-hopping-field-guide\/"/);

  const stories = html.match(/<article class="wf-story"/g) || [];
  assert.equal(stories.length, 12, 'expected exactly 12 .wf-story cards');

  // Verify zero placeholders
  assert.doesNotMatch(html, /class="wf-story-index"/, 'must not contain placeholder .wf-story-index boxes');

  // Verify persona voice & schema
  assert.match(html, /Open-Water Ferry Captain &amp; Island Ranger Field Guide/);
  assert.match(html, /"numberOfItems":12/);
  assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  assert.match(html, /"author":\{"@id":"https:\/\/chrisizworski\.com\/#person"\}/);
});

test('Exact 12 archipelago destinations are present with correct IDs and personality tags', () => {
  const islandIds = [
    'mackinac-island',
    'isle-royale-national-park',
    'beaver-island',
    'south-manitou-island',
    'north-manitou-island',
    'madeline-island',
    'washington-island',
    'put-in-bay-south-bass',
    'kelleys-island',
    'pelee-island',
    'drummond-island',
    'manitoulin-island'
  ];

  for (const id of islandIds) {
    assert.ok(html.includes(`id="${id}"`), `missing island id ${id}`);
    assert.ok(html.includes(`data-island-id="${id}"`), `missing data-island-id for ${id}`);
  }
});

test('Island Personality Matrix, open-water physics, and ranger rules are present', () => {
  // Personality matrix filters
  assert.match(html, /The Island Personality Matrix/);
  assert.match(html, /data-personality-filter="car-free-historic"/);
  assert.match(html, /data-personality-filter="backcountry-wilderness"/);
  assert.match(html, /data-personality-filter="bring-car-camp"/);
  assert.match(html, /data-personality-filter="day-trip-bike"/);

  // Open-water physics
  assert.match(html, /Steep, Punching Freshwater Chop/);
  assert.match(html, /Current Acceleration at the Straits/);
  assert.match(html, /Cold-Water Marine Fog/);

  // Ranger golden rules
  assert.match(html, /The Last Boat Leaves Without You/);
  assert.match(html, /Ferry Hazardous Materials Limits/);
  assert.match(html, /Glacial Fragility &amp; Alvar Flora/);
  assert.match(html, /Canine Biosecurity Bans/);
});

test('Personality matrix and map hooks are wired in client JS with CARTO API basemap and fallback', () => {
  assert.match(js, /ISLANDS_DATA/);
  assert.match(js, /initFilters/);
  assert.match(js, /applyFilters/);
  assert.match(js, /initMap/);
  assert.match(js, /\/api\/carto-basemap-config/);
  assert.match(js, /rastertiles\/voyager/);
  assert.match(js, /encodeURIComponent/);
  assert.match(js, /tile\.openstreetmap\.org/);
  assert.match(js, /ig-visible-count/);
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
    assert.match(photo, /(CC BY|CC0|Public [Dd]omain|NPS)/i);
    assert.match(photo, /<figcaption>/);
    assert.match(photo, /alt="[^"]+"/);
  }
});

test('Field guide is registered in registry, guides hub, tools hub, sitemap, homepage, and companions', () => {
  const liveEntry = registry.guides.find((g) => g.slug === 'great-lakes-island-hopping-field-guide');
  assert.ok(liveEntry, 'registry must contain great-lakes-island-hopping-field-guide');
  assert.equal(liveEntry.status, 'live');
  assert.equal(liveEntry.stopCount, 12);

  const guidesHub = read('public/guides/index.html');
  assert.ok(guidesHub.includes('data-field-guide="great-lakes-island-hopping-field-guide"'));
  assert.ok(guidesHub.includes('href="/great-lakes-island-hopping-field-guide/"'));

  const toolsHub = read('public/tools/index.html');
  assert.ok(toolsHub.includes('href="/great-lakes-island-hopping-field-guide/"'));

  const sitemap = read('public/sitemap-winter.xml');
  assert.ok(sitemap.includes('https://chrisizworski.com/great-lakes-island-hopping-field-guide/'));

  const home = read('public/index.html');
  assert.ok(home.includes('href="/great-lakes-island-hopping-field-guide/"'));

  const ferriesHub = read('public/great-lakes-ferries/index.html');
  assert.ok(ferriesHub.includes('href="/great-lakes-island-hopping-field-guide/"'));

  // Hero CTAs are styled as prominent buttons
  assert.match(html, /class="[^"]*ig-hero-ctas[^"]*"/);
  assert.match(html, /href="\/great-lakes-ferries\/"[^>]*>Compare All Ferry Planners/);
  assert.match(html, /href="\/great-lakes-buoys\/"[^>]*>Open Great Lakes Wave Buoys/);
  assert.match(css, /\.ig-secondary-cta/);
});

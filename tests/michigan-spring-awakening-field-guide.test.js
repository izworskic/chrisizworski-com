const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

const html = read('public/michigan-spring-awakening-field-guide/index.html');
const js = read('public/assets/michigan-spring-awakening-field-guide.js');
const css = read('public/assets/michigan-spring-awakening-field-guide.css');
const registry = JSON.parse(read('public/assets/field-guides-registry.json'));

test('Crawlable spring awakening field guide with 12 source-backed phenology milestones', () => {
  assert.match(html, /<h1[^>]*>[\s\S]*?Track the thaw/i);
  assert.match(html, /rel="canonical" href="https:\/\/chrisizworski\.com\/michigan-spring-awakening-field-guide\/"/);

  const stories = html.match(/<article class="wf-story"/g) || [];
  assert.equal(stories.length, 12, 'expected exactly 12 .wf-story cards');

  // Verify zero placeholders
  assert.doesNotMatch(html, /class="wf-story-index"/, 'must not contain placeholder .wf-story-index boxes');

  // Verify persona voice & schema
  assert.match(html, /Northwoods Field Naturalist &amp; Phenologist Field Guide/);
  assert.match(html, /"numberOfItems":12/);
  assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  assert.match(html, /"author":\{"@id":"https:\/\/chrisizworski\.com\/#person"\}/);
});

test('Exact 12 phenological chapters are present with correct IDs and category attributes', () => {
  const chapterIds = [
    'sugar-maple-sap-run',
    'vernal-pool-wood-frog',
    'spotted-salamander-big-night',
    'american-woodcock-sky-dance',
    'wild-leek-ramps-emergence',
    'bloodroot-and-hepatica',
    'dutchmans-breeches-and-squirrel-corn',
    'white-trillium-blankets',
    'black-morel-flushes',
    'yellow-and-white-morels',
    'ostrich-fern-fiddleheads',
    'spring-wildflower-canopy-closing'
  ];

  for (const id of chapterIds) {
    assert.ok(html.includes(`id="${id}"`), `missing chapter id ${id}`);
    assert.ok(html.includes(`data-pheno-cat=`), `missing data-pheno-cat attribute for ${id}`);
  }
});

test('Latitudinal Wave Scrubber, bioclimatic mechanics, and forager code are present', () => {
  // Scrubber controls
  assert.match(html, /The Michigan Latitudinal Wave Scrubber/);
  assert.match(html, /id="sp-lat-slider"/);
  assert.match(html, /id="sp-zone-card"/);

  // Category filters
  assert.match(html, /data-pheno-filter="all"/);
  assert.match(html, /data-pheno-filter="maple"/);
  assert.match(html, /data-pheno-filter="vernal"/);
  assert.match(html, /data-pheno-filter="wildflower"/);
  assert.match(html, /data-pheno-filter="forage"/);
  assert.match(html, /data-pheno-filter="avian"/);

  // Bioclimatic mechanics
  assert.match(html, /The Freeze\/Thaw Sap Engine/);
  assert.match(html, /The 50°F Morel Soil Trigger/);
  assert.match(html, /The Amphibian "Big Night" Setup/);

  // Forager golden rules
  assert.match(html, /Trillium Conservation/);
  assert.match(html, /True Morel vs\. False Morel/);
  assert.match(html, /One-Third Ramp Rule/);
  assert.match(html, /Mesh Bags &amp; Spore Dispersal/);
});

test('Scrubber slider and category filter hooks are wired in client JS', () => {
  assert.match(js, /LAT_ZONES/);
  assert.match(js, /initScrubber/);
  assert.match(js, /updateScrubberDisplay/);
  assert.match(js, /initCategoryFilters/);
  assert.match(js, /sp-visible-count/);
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
  const liveEntry = registry.guides.find((g) => g.slug === 'michigan-spring-awakening-field-guide');
  assert.ok(liveEntry, 'registry must contain michigan-spring-awakening-field-guide');
  assert.equal(liveEntry.status, 'live');
  assert.equal(liveEntry.stopCount, 12);

  const guidesHub = read('public/guides/index.html');
  assert.ok(guidesHub.includes('data-field-guide="michigan-spring-awakening-field-guide"'));
  assert.ok(guidesHub.includes('href="/michigan-spring-awakening-field-guide/"'));

  const toolsHub = read('public/tools/index.html');
  assert.ok(toolsHub.includes('href="/michigan-spring-awakening-field-guide/"'));

  const sitemap = read('public/sitemap-winter.xml');
  assert.ok(sitemap.includes('https://chrisizworski.com/michigan-spring-awakening-field-guide/'));

  const home = read('public/index.html');
  assert.ok(home.includes('href="/michigan-spring-awakening-field-guide/"'));

  const mapleHub = read('public/michigan-maple-sap-run/index.html');
  assert.ok(mapleHub.includes('href="/michigan-spring-awakening-field-guide/"'));

  // Hero CTAs are styled as prominent buttons
  assert.match(html, /class="[^"]*sp-hero-ctas[^"]*"/);
  assert.match(html, /href="\/michigan-maple-sap-run\/"[^>]*>Check Maple Sap Weather/);
  assert.match(html, /href="\/michigan-soil-temperature\/"[^>]*>Check Soil Temperature/);
  assert.match(css, /\.sp-secondary-cta/);
});

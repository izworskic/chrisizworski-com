const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');

test('Crawlable Michigan dark sky field guide with 12 source-backed destinations', () => {
  const file = 'public/michigan-dark-sky-field-guide/index.html';
  assert.ok(existsSync(path.join(root, file)), `${file} must exist`);
  const html = read(file);

  assert.ok(html.includes('Michigan After Dark'), 'Includes page title brand');
  assert.ok(html.includes('The Northern Lights, Dark-Sky Preserves &amp; Meteor Shower Field Guide') || html.includes('Dark-Sky Preserves'), 'Includes page title subtitle');

  // Verify exactly 12 .wf-story cards
  const storyCount = (html.match(/<article class="wf-story"/g) || []).length;
  assert.equal(storyCount, 12, 'Must feature exactly 12 audited dark-sky stops');

  // Must contain 0 placeholder story boxes
  assert.ok(!html.includes('class="wf-story-index"'), 'Must contain zero placeholder story index boxes');

  // Verify valid Schema.org graph
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(jsonLdMatch, 'Must contain JSON-LD block');
  const graph = JSON.parse(jsonLdMatch[1])['@graph'];
  assert.ok(Array.isArray(graph), 'Graph must be an array');

  const collection = graph.find((node) => node['@type'] === 'CollectionPage');
  assert.ok(collection, 'Must have CollectionPage');
  assert.equal(collection.url, 'https://chrisizworski.com/michigan-dark-sky-field-guide/');

  const itemList = graph.find((node) => node['@type'] === 'ItemList');
  assert.ok(itemList, 'Must have ItemList schema');
  assert.equal(itemList.numberOfItems, 12, 'ItemList must list all 12 items');
  assert.equal(itemList.itemListElement.length, 12, 'ItemList elements must be 12');

  const faq = graph.find((node) => node['@type'] === 'FAQPage');
  assert.ok(faq, 'Must have FAQPage');
  assert.ok(faq.mainEntity.length >= 5, 'FAQPage must have at least 5 FAQs');
});

test('Exact 12 dark sky stops are present with correct IDs, compass azimuths and Bortle tags', () => {
  const html = read('public/michigan-dark-sky-field-guide/index.html');
  const expectedStops = [
    { id: 'headlands-dark-sky-park', azimuth: 340, bortle: 2 },
    { id: 'brockway-mountain-keweenaw', azimuth: 0, bortle: 1 },
    { id: 'great-sand-bay-eagle-harbor', azimuth: 330, bortle: 1 },
    { id: 'pictured-rocks-miners-beach', azimuth: 10, bortle: 2 },
    { id: 'whitefish-point-beach', azimuth: 350, bortle: 2 },
    { id: 'porcupine-mountains-union-bay', azimuth: 355, bortle: 1 },
    { id: 'sleeping-bear-dune-climb', azimuth: 300, bortle: 3 },
    { id: 'wilderness-state-park-preserve', azimuth: 325, bortle: 2 },
    { id: 'port-crescent-state-park-preserve', azimuth: 335, bortle: 3 },
    { id: 'negwegon-state-park-preserve', azimuth: 160, bortle: 2 },
    { id: 'thompsons-harbor-state-park-preserve', azimuth: 30, bortle: 2 },
    { id: 'rockport-recreation-area-preserve', azimuth: 45, bortle: 2 }
  ];

  for (const stop of expectedStops) {
    assert.ok(html.includes(`id="${stop.id}"`), `Missing stop element #${stop.id}`);
    assert.ok(html.includes(`data-azimuth="${stop.azimuth}"`), `Missing azimuth ${stop.azimuth} for ${stop.id}`);
    assert.ok(html.includes(`data-bortle="${stop.bortle}"`), `Missing bortle ${stop.bortle} for ${stop.id}`);
  }
});

test('Smartphone Astrophotography Cheat Sheet, Red-Light Rules, and Gate Access are present', () => {
  const html = read('public/michigan-dark-sky-field-guide/index.html');
  assert.ok(html.includes('Smartphone Night-Mode Astrophotography Cheat Sheet'), 'Must contain smartphone cheat sheet');
  assert.ok(html.includes('Apple iPhone'), 'Must cover iPhone Night Mode');
  assert.ok(html.includes('Google Pixel'), 'Must cover Pixel Astrophotography Mode');
  assert.ok(html.includes('Samsung Galaxy'), 'Must cover Samsung Pro Mode');
  assert.ok(html.includes('rhodopsin'), 'Must explain rhodopsin night adaptation chemistry');
  assert.ok(html.includes('24-Hour Gate Access'), 'Must explain 24-hr DNR dark sky preserve rules');
  assert.ok(html.includes('Recreation Passport'), 'Must mention Recreation Passport');
});

test('Client JS has CARTO basemap, OSM fallback, and compass needle integration', () => {
  const js = read('public/assets/michigan-dark-sky-field-guide.js');
  assert.ok(js.includes('/api/carto-basemap-config'), 'Must query CARTO basemap config API');
  assert.ok(js.includes('encodeURIComponent'), 'Must URL-encode the API key');
  assert.ok(js.includes("subdomains: 'abcd'"), 'Must include subdomains abcd');
  assert.ok(js.includes('openstreetmap.org'), 'Must fall back to OpenStreetMap');
  assert.ok(js.includes('initCompassNeedles'), 'Must contain compass needle rotation logic');
  assert.ok(js.includes('STOPS'), 'Must embed 12 stop coordinates');
});

test('View-only Google Maps links use area coordinates without directions API', () => {
  const html = read('public/michigan-dark-sky-field-guide/index.html');
  const gmapsLinks = html.match(/href="https:\/\/maps\.google\.com\/\?q=[^"]+"/g) || [];
  assert.equal(gmapsLinks.length, 12, 'Must have 12 Google Maps coordinates links');
  for (const link of gmapsLinks) {
    assert.ok(!link.includes('/dir/'), 'Must not link to directions API');
  }
});

test('All destination photos have source attribution and valid license metadata', () => {
  const html = read('public/michigan-dark-sky-field-guide/index.html');
  const figcaptions = html.match(/<figcaption>[\s\S]*?<\/figcaption>/g) || [];
  assert.equal(figcaptions.length, 12, 'Each of the 12 stops must have a photo figcaption');
  for (const cap of figcaptions) {
    assert.ok(
      cap.includes('Photo:') || cap.includes('National Park Service'),
      `Missing photo attribution in caption: ${cap}`
    );
  }
});

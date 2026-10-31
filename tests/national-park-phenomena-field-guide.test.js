const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync, statSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');

test('Crawlable National Park Phenomenon Atlas with 12 source-backed events', () => {
  const file = 'public/national-park-phenomena-field-guide/index.html';
  assert.ok(existsSync(path.join(root, file)), `${file} must exist`);
  const html = read(file);

  assert.ok(html.includes('The National Park Phenomenon Atlas'), 'Includes title brand');
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/national-park-phenomena-field-guide\/"/);

  // SERP length constraints
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  assert.ok(titleMatch, 'Must have <title>');
  assert.ok(titleMatch[1].length <= 60, `Title "${titleMatch[1]}" exceeds 60 chars (${titleMatch[1].length})`);

  const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
  assert.ok(descMatch, 'Must have description');
  assert.ok(descMatch[1].length <= 158, `Description exceeds 158 chars (${descMatch[1].length})`);

  // Exactly 12 .wf-story cards
  const storyCount = (html.match(/<article class="wf-story"/g) || []).length;
  assert.equal(storyCount, 12, 'Must feature exactly 12 audited phenomena');

  // Verify persona voice & schema
  assert.match(html, /Chief National Park Service Interpretive Ranger/);

  // Verify valid Schema.org graph
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(jsonLdMatch, 'Must contain JSON-LD block');
  const graph = JSON.parse(jsonLdMatch[1])['@graph'];
  assert.ok(Array.isArray(graph), 'Graph must be an array');

  const collection = graph.find((node) => node['@type'] === 'CollectionPage');
  assert.ok(collection, 'Must have CollectionPage');
  assert.equal(collection.url, 'https://chrisizworski.com/national-park-phenomena-field-guide/');

  const itemList = graph.find((node) => node['@type'] === 'ItemList');
  assert.ok(itemList, 'Must have ItemList schema');
  assert.equal(itemList.numberOfItems, 12, 'ItemList must list all 12 items');
  assert.equal(itemList.itemListElement.length, 12, 'ItemList elements must be 12');

  const faq = graph.find((node) => node['@type'] === 'FAQPage');
  assert.ok(faq, 'Must have FAQPage');
  assert.ok(faq.mainEntity.length >= 6, 'FAQPage must have at least 6 FAQs');

  const person = graph.find((node) => node['@type'] === 'Person' && node['@id'] === 'https://chrisizworski.com/#person');
  assert.ok(person, 'Must have Person schema');
});

test('Exact 12 national park phenomena are present with correct IDs, parks, and data attributes', () => {
  const html = read('public/national-park-phenomena-field-guide/index.html');
  const expectedPhenomena = [
    { id: 'yosemite-horsetail-firefall', months: '2', permit: 'lottery' },
    { id: 'blue-spring-manatees', months: '11,12,1,2,3', permit: 'open' },
    { id: 'death-valley-superbloom', months: '2,3,4', permit: 'open' },
    { id: 'elkmont-synchronous-fireflies', months: '5,6', permit: 'lottery' },
    { id: 'zion-narrows-flash-window', months: '5,6,7,8,9,10', permit: 'lottery' },
    { id: 'glacier-going-to-the-sun-opening', months: '6,7,8,9,10', permit: 'lottery' },
    { id: 'katmai-brooks-falls-bears', months: '7', permit: 'lottery' },
    { id: 'columbia-salmon-leap', months: '6,7,8,9,10', permit: 'open' },
    { id: 'yellowstone-geysers', months: '5,6,7,8,9,10', permit: 'open' },
    { id: 'rocky-mountain-elk-rut', months: '9,10', permit: 'lottery' },
    { id: 'acadia-cadillac-first-sunrise', months: '10,11,12,1,2,3', permit: 'lottery' },
    { id: 'haleakala-summit-inversion', months: '4,5,6,7,8,9,10', permit: 'lottery' }
  ];

  for (const p of expectedPhenomena) {
    assert.ok(html.includes(`id="${p.id}"`), `Missing element #${p.id}`);
    assert.ok(html.includes(`data-phenomenon-id="${p.id}"`), `Missing data-phenomenon-id="${p.id}"`);
    assert.ok(html.includes(`data-months="${p.months}"`), `Missing data-months="${p.months}" for ${p.id}`);
    assert.ok(html.includes(`data-permit="${p.permit}"`), `Missing data-permit="${p.permit}" for ${p.id}`);
  }
});

test('12-Month Phenomenon Timeline Bar hook and category filters are present', () => {
  const html = read('public/national-park-phenomena-field-guide/index.html');
  assert.ok(html.includes('12-Month Phenomenon Calendar'), 'Must feature 12-Month calendar heading');
  assert.ok(html.includes('id="np-month-intel"'), 'Must feature dynamic intelligence banner');

  // Verify month scrubber buttons 0 through 12
  for (let m = 0; m <= 12; m++) {
    assert.ok(html.includes(`data-month="${m}"`), `Must include button for data-month="${m}"`);
  }

  // Category filter pills
  assert.ok(html.includes('data-filter="all"'), 'Must have all filter');
  assert.ok(html.includes('data-filter="lottery"'), 'Must have lottery filter');
  assert.ok(html.includes('data-filter="open"'), 'Must have open filter');
  assert.ok(html.includes('data-filter="wildlife"'), 'Must have wildlife filter');
  assert.ok(html.includes('data-filter="optical"'), 'Must have optical filter');
});

test('Connected live national tools are linked in cards and footer', () => {
  const html = read('public/national-park-phenomena-field-guide/index.html');
  const requiredTools = [
    '/yosemite-firefall-live/',
    '/national-tools/blue-spring-live/',
    '/national-tools/elk-rut/',
    '/synced-national-tools/zion-narrows-conditions/',
    '/synced-national-tools/going-to-the-sun-road-status/',
    '/synced-national-tools/columbia-salmon-run/',
    '/synced-national-tools/yellowstone-geysers/',
    '/synced-national-tools/cadillac-mountain-sunrise/',
    '/synced-national-tools/haleakala-sunrise/',
    '/synced-national-tools/'
  ];

  for (const tool of requiredTools) {
    assert.ok(html.includes(tool), `Must link to connected tool: ${tool}`);
  }
});

test('View-only Google Maps links use area coordinates without directions API', () => {
  const html = read('public/national-park-phenomena-field-guide/index.html');
  const blocks = [...html.matchAll(/<article class="wf-story"[\s\S]*?<\/article>/g)];
  assert.equal(blocks.length, 12, 'Must have 12 articles');

  for (const [b] of blocks) {
    assert.match(b, /https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=[0-9.]+%2C-[0-9.]+/);
    assert.match(b, /View [^<]+ on Google Maps · area only, not verified parking ↗/);
    assert.match(b, /target="_blank" rel="noopener noreferrer"/);
  }
  assert.doesNotMatch(html, /maps\/dir\/|directions\?api=1/);
});

test('All 12 local image files exist and are optimized', () => {
  const imageNames = [
    'yosemite-horsetail-firefall.jpg',
    'blue-spring-manatees.jpg',
    'death-valley-superbloom.jpg',
    'elkmont-synchronous-fireflies.jpg',
    'zion-narrows-flash-window.jpg',
    'glacier-going-to-the-sun-opening.jpg',
    'katmai-brooks-falls-bears.jpg',
    'columbia-salmon-leap.jpg',
    'yellowstone-geysers.jpg',
    'rocky-mountain-elk-rut.jpg',
    'acadia-cadillac-first-sunrise.jpg',
    'haleakala-summit-inversion.jpg'
  ];

  for (const img of imageNames) {
    const p = path.join(root, 'public', 'assets', 'national-park-phenomena', img);
    assert.ok(existsSync(p), `Image missing: ${img}`);
    const sz = statSync(p).size;
    assert.ok(sz > 10000, `Image ${img} too small (${sz} bytes)`);
    assert.ok(sz < 1500000, `Image ${img} too large (${sz} bytes)`);
  }
});

test('Client JS parses cleanly and embeds PHENOMENA data and Leaflet map hooks', () => {
  const js = read('public/assets/national-park-phenomena-field-guide.js');
  assert.doesNotThrow(() => new vm.Script(js, { filename: 'national-park-phenomena-field-guide.js' }));
  assert.ok(js.includes('PHENOMENA = ['), 'Must define PHENOMENA array');
  assert.ok(js.includes('yosemite-horsetail-firefall'), 'Must contain Yosemite');
  assert.ok(js.includes('/api/carto-basemap-config'), 'Must query CARTO basemap config API');
  assert.ok(js.includes('rastertiles/voyager'), 'Must use CARTO voyager rastertiles');
  assert.ok(js.includes('tile.openstreetmap.org'), 'Must fall back to OpenStreetMap');
  assert.ok(js.includes('MONTH_INTEL'), 'Must include MONTH_INTEL data');
});

test('Atlas is registered in guides index and registry', () => {
  const guidesHtml = read('public/guides/index.html');
  assert.ok(guidesHtml.includes('/national-park-phenomena-field-guide/'), 'Must be in public/guides/index.html');
  assert.ok(guidesHtml.includes('The National Park Phenomenon Atlas'), 'Guides index has guide title');

  const registry = JSON.parse(read('public/assets/field-guides-registry.json'));
  const entry = registry.guides.find((g) => g.slug === 'national-park-phenomena-field-guide');
  assert.ok(entry, 'Must be registered in field-guides-registry.json');
  assert.equal(entry.stopCount, 12);
  assert.equal(entry.status, 'live');

  const sitemapWinter = read('public/sitemap-winter.xml');
  assert.ok(sitemapWinter.includes('https://chrisizworski.com/national-park-phenomena-field-guide/'), 'Must be in sitemap-winter.xml');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync, statSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');

test('Crawlable Michigan rivers field guide with 14 source-backed floats', () => {
  const file = 'public/michigan-rivers-field-guide/index.html';
  assert.ok(existsSync(path.join(root, file)), `${file} must exist`);
  const html = read(file);

  assert.ok(html.includes('Holy Waters &amp; Cedar Bottoms') || html.includes('Holy Waters & Cedar Bottoms'), 'Includes page title brand');
  assert.ok(html.includes('Michigan’s Blue-Ribbon River Paddling') || html.includes('Blue-Ribbon River'), 'Includes page subtitle');
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/michigan-rivers-field-guide\/"/);

  // Exactly 14 .wf-story cards
  const storyCount = (html.match(/<article class="wf-story"/g) || []).length;
  assert.equal(storyCount, 14, 'Must feature exactly 14 audited river floats');

  // Verify valid Schema.org graph
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(jsonLdMatch, 'Must contain JSON-LD block');
  const graph = JSON.parse(jsonLdMatch[1])['@graph'];
  assert.ok(Array.isArray(graph), 'Graph must be an array');

  const collection = graph.find((node) => node['@type'] === 'CollectionPage');
  assert.ok(collection, 'Must have CollectionPage');
  assert.equal(collection.url, 'https://chrisizworski.com/michigan-rivers-field-guide/');

  const itemList = graph.find((node) => node['@type'] === 'ItemList');
  assert.ok(itemList, 'Must have ItemList schema');
  assert.equal(itemList.numberOfItems, 14, 'ItemList must list all 14 items');
  assert.equal(itemList.itemListElement.length, 14, 'ItemList elements must be 14');

  const faq = graph.find((node) => node['@type'] === 'FAQPage');
  assert.ok(faq, 'Must have FAQPage');
  assert.ok(faq.mainEntity.length >= 6, 'FAQPage must have at least 6 FAQs');

  const person = graph.find((node) => node['@type'] === 'Person' && node['@id'] === 'https://chrisizworski.com/#person');
  assert.ok(person, 'Must have Person schema');
});

test('Exact 14 river floats are present with correct IDs, USGS gauges, and flow badges', () => {
  const html = read('public/michigan-rivers-field-guide/index.html');
  const expectedFloats = [
    { id: 'au-sable-holy-water', gauge: '04135700', type: 'fly-water' },
    { id: 'au-sable-mason-tract', gauge: '04136500', type: 'fly-water' },
    { id: 'au-sable-lower-river', gauge: '04137500', type: 'beginner-family' },
    { id: 'manistee-upper-deward', gauge: '04123500', type: 'fly-water' },
    { id: 'manistee-middle-ccc-sharon', gauge: '04124000', type: 'beginner-family' },
    { id: 'manistee-lower-tippy-bear-creek', gauge: '04125550', type: 'overnight-camp' },
    { id: 'pine-river-elm-flats', gauge: '04125000', type: 'fly-water' },
    { id: 'pere-marquette-holy-water', gauge: '04122500', type: 'fly-water' },
    { id: 'pere-marquette-gleasons-walhalla', gauge: '04122500', type: 'overnight-camp' },
    { id: 'jordan-river-graves-crossing', gauge: '04127800', type: 'beginner-family' },
    { id: 'pigeon-river-elk-country', gauge: '04128900', type: 'fly-water' },
    { id: 'two-hearted-river-mouth', gauge: '04044700', type: 'overnight-camp' },
    { id: 'fox-river-seney', gauge: '04059000', type: 'fly-water' },
    { id: 'platte-river-sleeping-bear', gauge: '04127200', type: 'beginner-family' }
  ];

  for (const float of expectedFloats) {
    assert.ok(html.includes(`id="${float.id}"`), `Missing float element #${float.id}`);
    assert.ok(html.includes(`data-gauge="${float.gauge}"`), `Missing gauge ${float.gauge} for ${float.id}`);
    assert.ok(html.includes(`data-type="${float.type}"`), `Missing type ${float.type} for ${float.id}`);
  }
});

test('USFS Permit rules, hatch calendar, and sweeper safety are present', () => {
  const html = read('public/michigan-rivers-field-guide/index.html');
  assert.ok(html.includes('Pine River USFS Permits'), 'Must explain Pine River permits');
  assert.ok(html.includes('Pere Marquette Scenic Permits') || html.includes('Pere Marquette River'), 'Must explain PM permits');
  assert.ok(html.includes('Hexagenia limbata'), 'Must cover Hex hatch');
  assert.ok(html.includes('Hendrickson'), 'Must cover Hendrickson hatch');
  assert.ok(html.includes('Cedar Sweeper &amp; Strainer Survival') || html.includes('Cedar Sweeper'), 'Must cover sweeper safety');
  assert.ok(html.includes('Recreation.gov'), 'Must reference Recreation.gov');
});

test('Client JS has CARTO basemap, OSM fallback, and RIVERS array', () => {
  const js = read('public/assets/michigan-rivers-field-guide.js');
  assert.doesNotThrow(() => new vm.Script(js, { filename: 'michigan-rivers-field-guide.js' }));
  assert.ok(js.includes('/api/carto-basemap-config'), 'Must query CARTO basemap config API');
  assert.ok(js.includes('rastertiles/voyager'), 'Must use CARTO voyager rastertiles');
  assert.ok(js.includes('tile.openstreetmap.org'), 'Must fall back to OpenStreetMap');
  assert.ok(js.includes('RIVERS'), 'Must embed 14 river records in RIVERS array');
  assert.ok(js.includes('04135700'), 'Must include Grayling gauge ID');
});

test('Google Maps links use coordinates without directions API', () => {
  const html = read('public/michigan-rivers-field-guide/index.html');
  const gmapsLinks = html.match(/href="https:\/\/(?:maps\.google\.com\/\?q=|www\.google\.com\/maps\/search\/\?api=1&amp;query=|www\.google\.com\/maps\/search\/\?api=1&query=)[^"]+"/g) || [];
  assert.equal(gmapsLinks.length, 28, 'Must have 28 Google Maps coordinates links (14 put-in and 14 take-out)');
  for (const link of gmapsLinks) {
    assert.ok(!link.includes('/dir/'), 'Must not link to directions API');
  }
});

test('All destination photos have valid figcaption attributions', () => {
  const html = read('public/michigan-rivers-field-guide/index.html');
  const figcaptions = html.match(/<figcaption>[\s\S]*?<\/figcaption>/g) || [];
  assert.equal(figcaptions.length, 14, 'Must have exactly 14 figcaption attributions');
  for (const cap of figcaptions) {
    assert.ok(cap.includes('Photo:') || cap.includes('Photo'), 'Must credit photographer');
    assert.ok(
      cap.includes('CC BY') ||
      cap.toLowerCase().includes('public domain') ||
      cap.includes('CC0') ||
      cap.includes('Wikimedia'),
      'Must cite license or source'
    );
  }
});

test('All 14 river float images are locally hosted web-optimized assets', () => {
  const html = read('public/michigan-rivers-field-guide/index.html');
  const imgMatches = [...html.matchAll(/<img[^>]+src="(\/assets\/michigan-rivers\/[^"]+\.jpg)"/g)];
  assert.equal(imgMatches.length, 14, 'Must link 14 local river images');
  for (const m of imgMatches) {
    const relPath = 'public' + m[1];
    const absPath = path.join(root, relPath);
    assert.ok(existsSync(absPath), `Local image must exist: ${relPath}`);
    const stat = statSync(absPath);
    assert.ok(stat.size > 20000, `Image ${relPath} should be high quality (>20KB), got ${stat.size} bytes`);
    assert.ok(stat.size < 500000, `Image ${relPath} should be web-optimized (<500KB), got ${stat.size} bytes`);
  }
});

test('10-Persona value function benchmark passes 100%', () => {
  const scriptPath = path.join(root, 'scripts/benchmark-michigan-rivers-personas.mjs');
  assert.ok(existsSync(scriptPath), 'Benchmark script must exist');
  const out = execSync(`node "${scriptPath}"`, { encoding: 'utf8' });
  assert.ok(out.includes('ALL 10 PERSONAS AND ARCHITECTURAL REQUIREMENTS PASS 100%!'), 'Persona benchmark must pass 100%');
});

test('Connected river tools are linked', () => {
  const html = read('public/michigan-rivers-field-guide/index.html');
  assert.ok(html.includes('href="/au-sable-river/"'), 'Must link Au Sable River tool');
  assert.ok(html.includes('href="/manistee-river-map/"'), 'Must link Manistee River tool');
  assert.ok(html.includes('href="/michigan-paddling/"'), 'Must link Michigan Paddling');
  assert.ok(html.includes('href="/michigan-trout-streams/"'), 'Must link Michigan Trout Streams');
});

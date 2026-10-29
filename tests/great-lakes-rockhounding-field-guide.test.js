const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

const html = read('public/great-lakes-rockhounding-field-guide/index.html');
const js = read('public/assets/great-lakes-rockhounding-field-guide.js');
const css = read('public/assets/great-lakes-rockhounding-field-guide.css');
const registry = JSON.parse(read('public/assets/field-guides-registry.json'));

test('Crawlable rockhound field guide with 15 source-backed beach destinations', () => {
  assert.match(html, /<h1[^>]*>[\s\S]*?Read the gravel bars/i);
  assert.match(html, /rel="canonical" href="https:\/\/chrisizworski\.com\/great-lakes-rockhounding-field-guide\/"/);
  
  const stories = html.match(/<article class="wf-story"/g) || [];
  assert.equal(stories.length, 15, 'expected exactly 15 .wf-story cards');
  
  // Verify zero placeholders
  assert.doesNotMatch(html, /class="wf-story-index"/, 'must not contain placeholder .wf-story-index boxes');

  // Verify persona voice & schema
  assert.match(html, /Shoreline Geologist &amp; Veteran Beachcomber Field Guide/);
  assert.match(html, /"numberOfItems":15/);
  assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  assert.match(html, /"author":\{"@id":"https:\/\/chrisizworski\.com\/#person"\}/);
});

test('Exact 15 rockhounding engine beach sites are present with correct IDs and coordinates', () => {
  const engineSites = [
    'agate-beach-grand-marais',
    'muskallonge-lake-state-park',
    'crisp-point',
    'mclain-state-park',
    'presque-isle-park',
    'black-river-harbor',
    'miners-beach',
    'petoskey-state-park',
    'fishermans-island-state-park',
    'vans-beach-leland',
    'glen-haven',
    'frankfort-beach',
    'wilderness-state-park',
    'hoeft-state-park',
    'rockport-state-recreation-area'
  ];

  for (const siteId of engineSites) {
    assert.ok(html.includes(`id="${siteId}"`), `missing site id ${siteId}`);
    assert.ok(html.includes(`data-beach-badge="${siteId}"`), `missing live wave badge for ${siteId}`);
  }
});

test('Stone ID diagnostics, gravel-bar anatomy, and 365nm UV technical specs are present', () => {
  // Stone ID section
  assert.match(html, /Lake Superior Agate/);
  assert.match(html, /Hexagonaria percarinata/);
  assert.match(html, /Charlevoix Stone/);
  assert.match(html, /Favosites/);
  assert.match(html, /Yooperlite/);
  assert.match(html, /Puddingstone/);
  assert.match(html, /Lorrain Quartzite/);

  // Gravel-bar anatomy
  assert.match(html, /Zone 1 · The Active Swash/);
  assert.match(html, /Zone 2 · The Storm Berm/);
  assert.match(html, /Zone 3 · The Submerged Runnel/);

  // 365nm UV specs
  assert.match(html, /365nm/);
  assert.match(html, /ZWB2/i);
  assert.match(html, /Wood's glass/i);
  assert.match(html, /395nm/);
  assert.match(html, /580–620nm/);
  assert.match(html, /UV400/);
});

test('Legal collecting boundaries distinguish Michigan 25-lb rule from National Lakeshore bans', () => {
  assert.match(html, /25 pounds per calendar year/i);
  assert.match(html, /Part 325/);
  assert.match(html, /NPS BAN · LOOK ONLY/);
  assert.match(html, /36 CFR § 2\.1/);
  assert.match(html, /Miners Beach, Pictured Rocks/);
  assert.match(html, /Glen Haven Beach, Sleeping Bear Dunes/);
  assert.match(html, /Glass v\. Goeckel/);
  assert.match(html, /Ordinary High Water Mark/);
});

test('Live wave badge hooks and progressive target stone filters are wired in client JS', () => {
  assert.match(js, /\/api\/michigan-rockhounding/);
  assert.match(js, /loadLiveWaveConditions/);
  assert.match(js, /data-beach-badge/);
  assert.match(js, /data-beach-metrics/);
  assert.match(js, /PRIME/);
  assert.match(js, /GOOD/);
  assert.match(js, /STORM/);
  assert.match(js, /QUIET/);
  assert.match(js, /applyFilters/);
  assert.match(js, /activeStone/);
  assert.match(js, /carto-basemap-config/);
});

test('View-only Google Maps links use area coordinates without directions API', () => {
  const blocks = [...html.matchAll(/<article class="wf-story"[\s\S]*?<\/article>/g)];
  assert.equal(blocks.length, 15);
  for (const [b] of blocks) {
    assert.match(b, /https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=[0-9.]+%2C-[0-9.]+/);
    assert.match(b, /View [^<]+ on Google Maps · area only, not verified parking/);
    assert.match(b, /target="_blank" rel="noopener noreferrer"/);
  }
  assert.doesNotMatch(html, /maps\/dir\/|directions\?api=1/);
});

test('All destination photos have source attribution and valid license metadata', () => {
  const photos = [...html.matchAll(/<figure class="wf-photo[^]*?<\/figure>/g)];
  assert.ok(photos.length >= 18, `expected at least 18 figures, found ${photos.length}`);
  for (const [photo] of photos) {
    assert.match(photo, /Photo: <a/);
    assert.match(photo, /(CC BY|CC0|Public [Dd]omain)/i);
    assert.match(photo, /<figcaption>/);
    assert.match(photo, /alt="[^"]+"/);
  }
});

test('Field guide is registered in registry, guides hub, tools hub, sitemap, and companions', () => {
  const liveEntry = registry.guides.find((g) => g.slug === 'great-lakes-rockhounding-field-guide');
  assert.ok(liveEntry, 'registry must contain great-lakes-rockhounding-field-guide');
  assert.equal(liveEntry.status, 'live');
  assert.equal(liveEntry.stopCount, 15);

  const guidesHub = read('public/guides/index.html');
  assert.ok(guidesHub.includes('data-field-guide="great-lakes-rockhounding-field-guide"'));
  assert.ok(guidesHub.includes('href="/great-lakes-rockhounding-field-guide/"'));

  const toolsHub = read('public/tools/index.html');
  assert.ok(toolsHub.includes('href="/great-lakes-rockhounding-field-guide/"'));

  const sitemap = read('public/sitemap-winter.xml');
  assert.ok(sitemap.includes('https://chrisizworski.com/great-lakes-rockhounding-field-guide/'));

  const rockConditions = read('public/michigan-rockhounding/index.html');
  assert.ok(rockConditions.includes('href="/great-lakes-rockhounding-field-guide/"'));
});

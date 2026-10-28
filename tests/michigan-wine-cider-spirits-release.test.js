import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const read = relative => readFile(new URL('../' + relative, import.meta.url), 'utf8');

const [
  html,
  css,
  js,
  wfgCss,
  specText,
  toolsHtml,
  destHtml,
  winterActivitiesHtml,
  winterTrailsHtml,
  frozenHtml,
  petoskeyHome,
  sitemapWinter,
  sitemapPetoskey,
  registryText
] = await Promise.all([
  read('public/michigan-wine-cider-spirits/index.html'),
  read('public/assets/michigan-wine-cider-spirits.css'),
  read('public/assets/michigan-wine-cider-spirits.js'),
  read('public/assets/winter-field-guide.css'),
  read('benchmarks/northern-michigan-wine-cider-spirits-benchmark.json'),
  read('public/tools/index.html'),
  read('public/michigan-destinations/index.html'),
  read('public/michigan-winter-activities/index.html'),
  read('public/michigan-winter-trails/index.html'),
  read('public/frozen-michigan/index.html'),
  read('public/petoskey-wine/index.html'),
  read('public/sitemap-winter.xml'),
  read('public/sitemap-petoskey-wine.xml'),
  read('benchmarks/tool-network-registry.json')
]);

const spec = JSON.parse(specText);
const registry = JSON.parse(registryText);

test('18 anchor wineries, cideries, and distilleries are statically rendered with 102-venue 4-corridor crosswalk ledger', () => {
  const stories = [...html.matchAll(/<article class="wf-story" id="(stop-\d+)" data-tag="([^"]+)" data-feature="([^"]+)" data-access="([^"]+)" data-region="([^"]+)" data-seasons="([^"]+)" data-lat="([^"]+)" data-lng="([^"]+)" data-evidence="([^"]+)" data-record="([^"]+)">([\s\S]*?)<\/article>/g)];
  assert.equal(stories.length, 18, 'expected 18 static anchor tasting stops');
  assert.equal(spec.anchorCount, 18, 'benchmark spec must declare 18 anchors');

  const ids = new Set();
  const tagTokens = new Set();
  const regions = new Set();
  const seasonTokens = new Set();
  for (const [, id, tagAttr, features, access, region, seasonsAttr, lat, lng, evidence, record, body] of stories) {
    ids.add(id);
    for (const token of tagAttr.split(/\s+/)) tagTokens.add(token);
    for (const sToken of seasonsAttr.split(/\s+/)) seasonTokens.add(sToken);
    regions.add(region);
    assert.ok(['walkin', 'reserve', 'evening'].includes(access), `valid access for ${id}`);
    assert.ok(['old-mission', 'leelanau', 'tc-urban', 'petoskey-walloon', 'harbor-charlevoix'].includes(region), `valid region for ${id}`);
    assert.ok(features.length > 2, `features present on ${id}`);
    assert.ok(Number(lat) > 44.5 && Number(lat) < 45.6, `valid latitude on ${id}`);
    assert.ok(Number(lng) < -84.6 && Number(lng) > -86.0, `valid longitude on ${id}`);
    assert.ok(evidence.startsWith('https://'), `official HTTPS evidence on ${id}`);
    assert.ok(record.length > 2, `record slug on ${id}`);
    assert.match(body, /class="wcs-status wcs-status-(walkin|reserve|evening)"/, `status badge on ${id}`);
    assert.match(body, /class="wcs-why"/, `varietal/sensory note on ${id}`);
    assert.match(body, /class="wf-move"/, `move guidance on ${id}`);
    assert.match(body, /class="wf-access"/, `before-you-go logistics on ${id}`);
    assert.match(body, /class="wcs-google-map-link" href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=/, `Google Maps landmark link on ${id}`);
  }
  assert.equal(ids.size, 18);
  assert.deepEqual([...tagTokens].sort(), ['cider', 'multicraft', 'spirits', 'wine']);
  assert.deepEqual([...seasonTokens].sort(), ['fall', 'spring', 'summer', 'winter']);
  assert.deepEqual([...regions].sort(), ['harbor-charlevoix', 'leelanau', 'old-mission', 'petoskey-walloon', 'tc-urban']);

  const ledgerCards = [...html.matchAll(/<div class="wcs-ledger-card">([\s\S]*?)<\/div>\s*<\/div>/g)];
  assert.equal(ledgerCards.length, 4, 'expected 4 corridor crosswalk cards');
  assert.match(html, /Complete 102-venue regional crosswalk/);
  assert.match(html, /https:\/\/tcwine\.chrisizworski\.com\/old-mission-peninsula-wineries/);
  assert.match(html, /https:\/\/tcwine\.chrisizworski\.com\/leelanau-peninsula-wine-trail/);
  assert.match(html, /https:\/\/tcwine\.chrisizworski\.com\/venues/);
  assert.match(html, /\/petoskey-wine\//);
  assert.match(html, /\/petoskey-wine\/petoskey-distilleries\//);
});

test('winter igloos, snowshoe trails, 5:00 PM distillery handoff, and reservation/dog rules are explicit in static HTML', () => {
  assert.match(html, /heated igloos/i);
  assert.match(html, /snowshoe/i);
  assert.match(html, /5:00 PM/);
  assert.match(html, /Brys Estate/);
  assert.match(html, /Black Star Farms/);
  assert.match(html, /Pond Hill Farm/);
  assert.match(html, /Boyne Valley Vineyards/);
  assert.match(html, /Mammoth Distilling/);
  assert.match(html, /High Five Spirits/);
  assert.match(html, /Grand Traverse Distillery/);
  assert.match(html, /Tandem Ciders/);
  assert.match(html, /Two K Farms/);
  assert.match(html, /1\. Never try two peninsulas or two far clusters in one afternoon/);
  assert.doesNotMatch(html, /\b(OPEN RIGHT NOW|GUARANTEED WALK-IN|LIVE SEAT COUNT)\b/i);
  assert.ok(!html.includes('\u2014'), 'no em dashes in HTML');
  assert.ok(!css.includes('\u2014'), 'no em dashes in CSS');
  assert.ok(!js.includes('\u2014'), 'no em dashes in JS');
});

test('photographs have verified Wikimedia Commons credits, licenses, and honest seasonal disclosures across all 18 breakout cards', () => {
  const photos = [...html.matchAll(/<figure class="wf-photo[^"]*" data-photo-provenance="([^"]+)">([\s\S]*?)<\/figure>/g)];
  const indices = [...html.matchAll(/<div class="wf-story-index"[\s\S]*?<\/div>/g)];
  assert.equal(photos.length, 21, '3 hero photos + 18 breakout card photos');
  assert.equal(indices.length, 0, 'zero number-only placeholder cards remain');

  for (const [, prov, body] of photos) {
    assert.equal(prov, 'source-checked');
    assert.match(body, /https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.match(body, /<span class="wf-scene">/);
    assert.match(body, /alt="[^"]{15,}"/);
  }
  assert.match(js, /function revealPhotoFallback/);
});

test('interactive 4-season auto-calendar engine, 4-mode decoder, 5-way filters, and local Leaflet 1.9.4 work cleanly', () => {
  assert.doesNotThrow(() => new vm.Script(js));
  assert.ok(wfgCss.length > 3000);
  assert.ok(css.length > 3000);
  assert.match(html, /href="\/assets\/vendor\/leaflet-1\.9\.4\.css"/);
  assert.doesNotMatch(html, /unpkg\.com\/leaflet/);
  assert.ok(html.indexOf('<h1') < html.indexOf('id="wf-map"'), 'H1 must appear above the map container');

  for (const mode of ['winter', 'wine', 'cider', 'spirits']) {
    assert.match(html, new RegExp(`data-mode="${mode}"`));
    assert.match(js, new RegExp(`${mode}:\\s*\\{`));
  }
  for (const season of ['winter', 'spring', 'summer', 'fall']) {
    assert.match(html, new RegExp(`data-season-card="${season}"`));
    assert.match(html, new RegExp(`href="/michigan-wine-cider-spirits/${season}/"`));
    assert.match(js, new RegExp(`${season}:\\s*\\{`));
    assert.ok(fs.existsSync(path.join(rootDir, 'public', 'michigan-wine-cider-spirits', season, 'index.html')), `missing ${season} edition`);
  }
  for (const id of ['wcs-season-bar', 'wf-region', 'wf-feature', 'wcs-access', 'wf-reset', 'wf-map', 'wf-count', 'wcs-mode-stage']) {
    assert.match(html, new RegExp(`id="${id}"`), `missing #${id}`);
  }
  assert.match(js, /function detectCurrentSeason/);
  assert.match(js, /America\/Detroit/);
  assert.match(js, /\/api\/carto-basemap-config/);
  assert.match(js, /tile\.openstreetmap\.org/);
  assert.match(js, /wf-pin-multi/);
  assert.match(petoskeyHome, /min-height:360px;padding:28px/);
});

test('SEO metadata, JSON-LD graph, Petoskey repairs, and sitewide discovery links are verified', () => {
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || '';
  const desc = html.match(/<meta name="description" content="([^"]+)"/)?.[1] || '';
  assert.ok(title.length > 20 && title.length <= 60, `title length ${title.length}`);
  assert.ok(desc.length > 80 && desc.length <= 158, `description length ${desc.length}`);
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/michigan-wine-cider-spirits\/">/);

  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const graph = schema['@graph'];
  const person = graph.find(n => n['@type'] === 'Person');
  const page = graph.find(n => n['@type'] === 'CollectionPage');
  const list = graph.find(n => n['@type'] === 'ItemList');
  const faq = graph.find(n => n['@type'] === 'FAQPage');
  assert.equal(person['@id'], 'https://chrisizworski.com/#person');
  assert.equal(person.url, 'https://chrisizworski.com/');
  assert.equal(page.dateModified, '2026-10-28');
  assert.equal(list.numberOfItems, 18);
  assert.equal(faq.mainEntity.length, 5);

  assert.match(toolsHtml, /href="\/michigan-wine-cider-spirits\/"/);
  assert.match(destHtml, /href="\/michigan-wine-cider-spirits\/"/);
  assert.match(winterActivitiesHtml, /href="\/michigan-wine-cider-spirits\/"/);
  assert.match(winterTrailsHtml, /href="\/michigan-wine-cider-spirits\/"/);
  assert.match(frozenHtml, /href="\/michigan-wine-cider-spirits\/"/);
  assert.match(petoskeyHome, /href="\/michigan-wine-cider-spirits\/"/);
  assert.match(sitemapWinter, /<loc>https:\/\/chrisizworski\.com\/michigan-wine-cider-spirits\/<\/loc><lastmod>2026-10-28<\/lastmod>/);
  assert.match(sitemapPetoskey, /<lastmod>2026-10-28<\/lastmod>/);

  const node = registry.tools.find(t => t.id === 'michigan-wine-cider-spirits');
  assert.ok(node, 'registry node exists');
  assert.equal(node.canonical, 'https://chrisizworski.com/michigan-wine-cider-spirits/');
  assert.ok(registry.relationships.filter(r => r.from === 'michigan-wine-cider-spirits').length >= 4);

  // Verify Petoskey double-escaped apostrophe repair across all exported pages
  function walk(dir) {
    const out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '_next') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) out.push(...walk(p));
      else if (e.name.endsWith('.html')) out.push(p);
    }
    return out;
  }
  const petoskeyFiles = walk(path.join(rootDir, 'public', 'petoskey-wine'));
  for (const f of petoskeyFiles) {
    const txt = fs.readFileSync(f, 'utf8');
    assert.ok(!txt.includes('&amp;apos;'), `no double-escaped &amp;apos; in ${f}`);
  }
});

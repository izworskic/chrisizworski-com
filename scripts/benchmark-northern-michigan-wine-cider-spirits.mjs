#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

const spec = JSON.parse(read('benchmarks', 'northern-michigan-wine-cider-spirits-benchmark.json'));
const html = read('public', 'michigan-wine-cider-spirits', 'index.html');
const css = read('public', 'assets', 'michigan-wine-cider-spirits.css');
const js = read('public', 'assets', 'michigan-wine-cider-spirits.js');
const toolsHtml = read('public', 'tools', 'index.html');
const destHtml = read('public', 'michigan-destinations', 'index.html');
const winterActHtml = read('public', 'michigan-winter-activities', 'index.html');
const winterTrailsHtml = read('public', 'michigan-winter-trails', 'index.html');
const frozenHtml = read('public', 'frozen-michigan', 'index.html');
const petoskeyHome = read('public', 'petoskey-wine', 'index.html');
const sitemapWinter = read('public', 'sitemap-winter.xml');
const sitemapPetoskey = read('public', 'sitemap-petoskey-wine.xml');
const registry = JSON.parse(read('benchmarks', 'tool-network-registry.json'));

const hardStops = [];

// Hard-stop checks
const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || '';
const desc = html.match(/<meta name="description" content="([^"]+)"/)?.[1] || '';
if (!title || title.length > 60) hardStops.push(`Title length ${title.length} exceeds 60 chars`);
if (!desc || desc.length > 158) hardStops.push(`Meta description length ${desc.length} exceeds 158 chars`);
if (/\b(OPEN RIGHT NOW|GUARANTEED WALK-IN|LIVE SEAT COUNT)\b/i.test(html)) {
  hardStops.push('Fabricated live tasting-room status claim found in HTML');
}
if (html.includes('\u2014') || css.includes('\u2014') || js.includes('\u2014')) {
  hardStops.push('Em dash found in wine/cider/spirits release files');
}
const h1Pos = html.indexOf('<h1');
const mapPos = html.indexOf('id="wf-map"');
if (h1Pos < 0 || mapPos < 0 || mapPos < h1Pos) {
  hardStops.push('Map container rendered before <h1>');
}

// Check Petoskey double-escaped entities
function walkPetoskey(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '_next') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkPetoskey(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const petoskeyPages = walkPetoskey(path.join(root, 'public', 'petoskey-wine'));
for (const p of petoskeyPages) {
  const txt = fs.readFileSync(p, 'utf8');
  if (txt.includes('&amp;apos;')) {
    hardStops.push(`Double-escaped &amp;apos; remains in ${path.relative(root, p)}`);
  }
}

// Dimension 1: First-Screen Editorial & Visual Desire (20 pts)
let d1 = 0;
if (title.length > 20 && title.length <= 60) d1 += 5;
if (desc.length > 80 && desc.length <= 158) d1 += 5;
if (html.includes('class="wf-hero wf-shell"') && html.includes('class="wf-shell wcs-signpost"') && h1Pos < mapPos) d1 += 5;
const schemaJson = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
if (schemaJson) {
  const schema = JSON.parse(schemaJson);
  const graph = schema['@graph'] || [];
  const hasPerson = graph.some(n => n['@type'] === 'Person' && n['@id'] === 'https://chrisizworski.com/#person' && n.url === 'https://chrisizworski.com/');
  const hasCollection = graph.some(n => n['@type'] === 'CollectionPage' && n.dateModified === '2026-10-28');
  const hasList = graph.some(n => n['@type'] === 'ItemList' && n.numberOfItems === 18);
  const hasFaq = graph.some(n => n['@type'] === 'FAQPage' && (n.mainEntity || []).length >= 5);
  if (hasPerson && hasCollection && hasList && hasFaq) d1 += 5;
}

// Dimension 2: Four-Corridor & Three-Beverage Completeness (20 pts)
let d2 = 0;
const stories = [...html.matchAll(/<article class="wf-story"[\s\S]*?<\/article>/g)];
if (stories.length === 18) d2 += 6;
const tagTokens = new Set(stories.flatMap(s => (s[0].match(/data-tag="([^"]+)"/)?.[1] || '').split(/\s+/)));
if (tagTokens.has('wine') && tagTokens.has('cider') && tagTokens.has('spirits') && tagTokens.has('multicraft')) d2 += 5;
const regions = new Set(stories.map(s => s[0].match(/data-region="([^"]+)"/)?.[1]));
if (regions.has('old-mission') && regions.has('leelanau') && regions.has('tc-urban') && regions.has('petoskey-walloon') && regions.has('harbor-charlevoix')) d2 += 5;
const ledgerCards = [...html.matchAll(/<div class="wcs-ledger-card">/g)];
if (ledgerCards.length === 4 && html.includes('102-venue regional crosswalk') && html.includes('https://tcwine.chrisizworski.com/') && html.includes('/petoskey-wine/')) {
  d2 += 4;
}

// Dimension 3: Winter Igloo, Snowshoe & Apres-Ski Differentiation (20 pts)
let d3 = 0;
if (html.includes('data-mode="winter"') && html.includes('data-mode="wine"') && html.includes('data-mode="cider"') && html.includes('data-mode="spirits"')) d3 += 6;
if (html.includes('heated igloos') && html.includes('snowshoe') && html.includes('Brys Estate') && html.includes('Black Star Farms') && html.includes('Pond Hill Farm') && html.includes('Boyne Valley Vineyards')) d3 += 7;
if (html.includes('5:00 PM') && html.includes('Mammoth Distilling') && html.includes('High Five Spirits') && html.includes('Grand Traverse Distillery')) d3 += 7;

// Dimension 4: Real-World Friction Resolution (15 pts)
let d4 = 0;
const statusBadges = [...html.matchAll(/class="wcs-status wcs-status-(walkin|reserve|evening)"/g)];
if (statusBadges.length === 18) d4 += 5;
if (html.includes('1. Never try two peninsulas or two far clusters in one afternoon') && html.includes('2. Respect the 5:00 PM vineyard cutoff') && html.includes('3. Reservations &amp; group caps') && html.includes('4. Winter dog rules')) d4 += 5;
const gmapLinks = [...html.matchAll(/class="wcs-google-map-link" href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=[^"]+"/g)];
if (gmapLinks.length === 18) d4 += 5;

// Dimension 5: Editorial Visuals, Provenance & Map Architecture (15 pts)
let d5 = 0;
const photos = [...html.matchAll(/<figure class="wf-photo[^"]*"[\s\S]*?<\/figure>/g)];
const indices = [...html.matchAll(/<div class="wf-story-index"[\s\S]*?<\/div>/g)];
if (photos.length === 14 && indices.length === 7) d5 += 5;
const allPhotosValid = photos.every(p => p[0].includes('https://commons.wikimedia.org/wiki/File:') && p[0].includes('class="wf-scene"'));
if (allPhotosValid) d5 += 5;
let jsValid = false;
try {
  new vm.Script(js);
  jsValid = true;
} catch {
  jsValid = false;
}
if (jsValid && html.includes('/assets/vendor/leaflet-1.9.4.css') && js.includes('/api/carto-basemap-config') && js.includes('wf-pin-multi')) {
  d5 += 5;
}

// Dimension 6: Network Authority & Existing Surface Repairs (10 pts)
let d6 = 0;
if (
  toolsHtml.includes('href="/michigan-wine-cider-spirits/"') &&
  destHtml.includes('href="/michigan-wine-cider-spirits/"') &&
  winterActHtml.includes('href="/michigan-wine-cider-spirits/"') &&
  winterTrailsHtml.includes('href="/michigan-wine-cider-spirits/"') &&
  frozenHtml.includes('href="/michigan-wine-cider-spirits/"') &&
  petoskeyHome.includes('href="/michigan-wine-cider-spirits/"')
) {
  d6 += 4;
}
if (
  sitemapWinter.includes('<loc>https://chrisizworski.com/michigan-wine-cider-spirits/</loc>') &&
  sitemapPetoskey.includes('<lastmod>2026-10-28</lastmod>') &&
  registry.tools.some(t => t.id === 'michigan-wine-cider-spirits')
) {
  d6 += 3;
}
const petoskeyContentPages = petoskeyPages.filter(p => !p.replace(/\\/g, '/').endsWith('/404/index.html') && !p.endsWith('404.html'));
const allPetoskeyDated = petoskeyContentPages.every(p => fs.readFileSync(p, 'utf8').includes('"dateModified":"2026-10-28"'));
if (allPetoskeyDated && petoskeyContentPages.length === 33) {
  d6 += 3;
}

const totalScore = d1 + d2 + d3 + d4 + d5 + d6;
const report = {
  id: spec.id,
  canonicalHub: spec.canonicalHub,
  releaseTarget: spec.valueFunction.releaseTarget,
  totalScore,
  dimensions: {
    firstScreenEditorialAndVisualDesire: { score: d1, max: 20 },
    fourCorridorAndThreeBeverageCompleteness: { score: d2, max: 20 },
    winterIglooSnowshoeAndApresSkiDifferentiation: { score: d3, max: 20 },
    realWorldFrictionResolution: { score: d4, max: 15 },
    editorialVisualsProvenanceAndMapArchitecture: { score: d5, max: 15 },
    networkAuthorityAndExistingSurfaceRepairs: { score: d6, max: 10 }
  },
  hardStops
};

console.log(JSON.stringify(report, null, 2));

if (process.argv.includes('--check')) {
  if (hardStops.length > 0 || totalScore < spec.valueFunction.releaseTarget) {
    process.exit(1);
  }
}

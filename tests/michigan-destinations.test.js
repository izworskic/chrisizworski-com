import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = relative => readFile(new URL('../' + relative, import.meta.url), 'utf8');
const [html, css, js, tools, home, sitemap, registryText] = await Promise.all([
  read('public/michigan-destinations/index.html'),
  read('public/assets/michigan-destinations.css'),
  read('public/assets/michigan-destinations.js'),
  read('public/tools/index.html'),
  read('public/index.html'),
  read('public/sitemap.xml'),
  read('benchmarks/tool-network-registry.json')
]);
const registry = JSON.parse(registryText);

test('20 unique Michigan destinations have complete crawlable summaries and coordinates', () => {
  const cards = [...html.matchAll(/<article class="destination" id="([^"]+)" data-name="([^"]+)" data-region="([^"]+)" data-tags="([^"]+)" data-months="([^"]+)" data-lat="([^"]+)" data-lng="([^"]+)">([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length, 20, 'all destination cards must appear in HTML, independent of JavaScript');
  assert.equal(new Set(cards.map(card => card[1])).size, 20);
  for (const [, id, name, region, tags, months, lat, lng, body] of cards) {
    assert.ok(name.length > 5, id);
    assert.ok(region.length > 3, id);
    assert.ok(tags.split(',').length >= 3, id);
    assert.ok(months.split(',').map(Number).every(m => m >= 1 && m <= 12), id);
    assert.ok(Number(lat) > 41 && Number(lat) < 49, id);
    assert.ok(Number(lng) < -82 && Number(lng) > -91, id);
    assert.match(body, /class="trip-note"/, id);
    assert.match(body, /class="primary-link"/, id);
    assert.match(body, /Official visitor info/, id);
  }
});

test('indexing, creator identity, navigation, and search intent are protected', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski.com\/michigan-destinations\/"/);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  assert.ok(title && title.length <= 60);
  assert.ok(description && description.length <= 158);
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  const schema = JSON.parse(json);
  const nodes = schema['@graph'];
  assert.equal(nodes.find(x => x['@type'] === 'Person')?.['@id'], 'https://chrisizworski.com/#person');
  assert.equal(nodes.find(x => x['@type'] === 'CollectionPage')?.author?.['@id'], 'https://chrisizworski.com/#person');
  assert.equal(nodes.find(x => x['@type'] === 'ItemList')?.numberOfItems, 20);
  assert.match(sitemap, /<loc>https:\/\/chrisizworski.com\/michigan-destinations\/<\/loc>\s*<lastmod>2026-10-26<\/lastmod>/);
  assert.match(tools, /href="\/michigan-destinations\/"/);
  const node = registry.tools.find(x => x.id === 'michigan-adventure-finder');
  assert.equal(node.canonical, 'https://chrisizworski.com/michigan-destinations/');
  assert.ok(registry.relationships.filter(x => x.from === node.id).length >= 3);
});

test('filters, CARTO map and graceful accessibility fallbacks are present', () => {
  assert.doesNotThrow(() => new vm.Script(js));
  assert.ok(css.length > 5000);
  for (const id of ['when', 'activity', 'region', 'finder-form', 'destination-map', 'reset', 'clear-empty', 'result-context']) {
    assert.match(html, new RegExp('id="' + id + '"'), id);
  }
  assert.match(html, /<noscript>/);
  assert.match(html, /aria-live="polite"/);
  assert.match(js, /basemaps\.cartocdn\.com\/rastertiles\/voyager/);
  assert.match(js, /\/api\/carto-basemap-config/);
  assert.match(js, /DOMContentLoaded/);
  assert.doesNotMatch(js, /window\.addEventListener\('load'/);
  assert.ok(html.indexOf('id="quick-find"') < html.indexOf('id="finder"'), 'planning controls must appear on the first screen');
  assert.match(js, /encodeURIComponent\(cfg\.key\.trim\(\)\)/);
  assert.match(js, /tile\.openstreetmap\.org/);
  assert.match(js, /scrollWheelZoom:false/);
  assert.match(js, /America\/Detroit/);
  assert.match(js, /navigator\.geolocation\.getCurrentPosition/);
  assert.doesNotMatch(html, /\b(OPEN NOW|LIVE TRIP RATING)\b/i);
  assert.match(html, /Seasonality is typical/);
  assert.match(html, /class="hero-gallery"/);
  assert.match(html, /class="mood-bar"/);
  assert.match(html, /id="map-status"/);
  assert.equal((html.match(/class="destination-photo card"/g) || []).length, 20);
  assert.equal((html.match(/class="experience"/g) || []).length, 20);
  assert.ok(html.indexOf('id="map-section"') < html.indexOf('id="destinations"'), 'map must be alongside the browse feed, before the destination cards');
  assert.doesNotMatch(html, /destination-art art-/);
  assert.doesNotMatch(html, /michigan-paddling\/hero\.jpg/);
});

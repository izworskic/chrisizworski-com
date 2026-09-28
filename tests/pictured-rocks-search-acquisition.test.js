import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const middleware = fs.readFileSync('middleware.ts', 'utf8');
const lab = fs.readFileSync('public/labs/pictured-rocks-planner/index.html', 'utf8');
const sitemap = fs.readFileSync('public/sitemap-pictured-rocks.xml', 'utf8');
const benchmark = JSON.parse(fs.readFileSync('benchmarks/pictured-rocks-search-acquisition.json', 'utf8'));

const title = 'Pictured Rocks Trip Planner: Map, Weather & 1-Day Itinerary';
const description = 'Plan Pictured Rocks National Lakeshore with a live map, current weather and access, boat vs. hike choices, and realistic 1-day or 2-day itineraries.';
const h1 = 'Pictured Rocks National Lakeshore Trip Planner';

test('canonical search title is query-first and compact', () => {
  assert.equal(title.length, 59);
  assert.match(middleware, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(title, /^Pictured Rocks Trip Planner:/);
  assert.match(title, /Map/);
  assert.match(title, /Weather/);
  assert.match(title, /1-Day Itinerary/);
});

test('meta description covers the core decision intents without stuffing', () => {
  assert.ok(description.length >= 140 && description.length <= 160);
  assert.match(middleware, /PICTURED_ROCKS_DESCRIPTION/);
  assert.match(description, /Pictured Rocks National Lakeshore/);
  assert.match(description, /live map/);
  assert.match(description, /current weather and access/);
  assert.match(description, /boat vs\. hike/);
  assert.match(description, /1-day or 2-day itineraries/);
});

test('canonical H1 names the entity and product directly', () => {
  assert.match(middleware, new RegExp(h1));
  assert.match(middleware, /optimizePicturedRocksSearchSurface/);
  assert.match(middleware, /<h1>\$\{PICTURED_ROCKS_H1\}<\/h1>/);
});

test('social metadata uses the same search promise', () => {
  assert.match(middleware, /property="og:title" content="\$\{PICTURED_ROCKS_TITLE\}"/);
  assert.match(middleware, /property="og:description" content="\$\{PICTURED_ROCKS_DESCRIPTION\}"/);
  assert.match(middleware, /name="twitter:title" content="\$\{PICTURED_ROCKS_TITLE\}"/);
  assert.match(middleware, /name="twitter:description" content="\$\{PICTURED_ROCKS_DESCRIPTION\}"/);
  assert.match(middleware, /summary_large_image/);
});

test('canonical response adds entity and page schema', () => {
  assert.match(middleware, /PICTURED_ROCKS_SEARCH_SCHEMA/);
  assert.match(middleware, /TouristDestination/);
  assert.match(middleware, /BreadcrumbList/);
  assert.match(middleware, /ItemList/);
  assert.match(middleware, /WebPage/);
});

test('indexing safety contract remains intact', () => {
  assert.match(lab, /name="robots" content="noindex,nofollow"/);
  assert.match(lab, /rel="canonical" href="https:\/\/picturedrocks\.chrisizworski\.com\/"/);
  assert.match(middleware, /PICTURED_ROCKS_INDEXABLE_ROBOTS/);
  assert.match(middleware, /X-Robots-Tag', 'index, follow, max-image-preview:large'/);
  assert.match(sitemap, /<loc>https:\/\/picturedrocks\.chrisizworski\.com\/<\/loc>/);
  assert.doesNotMatch(sitemap, /\/labs\/pictured-rocks-planner/);
});

test('loss function preserves hard vetoes and target threshold', () => {
  assert.equal(benchmark.lossFunction.formula, 'loss = 100 - weighted_score; target loss <= 8');
  assert.ok(benchmark.lossFunction.hardVetoes.length >= 6);
  assert.equal(Object.values(benchmark.lossFunction.weights).reduce((a, b) => a + b, 0), 100);
  assert.equal(benchmark.metadataTarget.title, title);
  assert.equal(benchmark.metadataTarget.description, description);
  assert.equal(benchmark.metadataTarget.h1, h1);
});

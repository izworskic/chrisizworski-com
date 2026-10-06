import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const middleware = fs.readFileSync('middleware.ts', 'utf8');
const planner = fs.readFileSync('public/labs/pictured-rocks-planner/index.html', 'utf8');
const benchmark = JSON.parse(fs.readFileSync('benchmarks/pictured-rocks-metadata-ranking.json', 'utf8'));

const canonical = 'https://picturedrocks.chrisizworski.com/';
const title = 'Pictured Rocks Trip Planner 2026: Map, Itinerary & Weather';

test('metadata loss function totals 100 and has a <=5 target', () => {
  const weights = Object.values(benchmark.lossFunction.weights);
  assert.equal(weights.reduce((sum, value) => sum + value, 0), 100);
  assert.match(benchmark.lossFunction.formula, /target loss <= 5/);
  assert.ok(benchmark.lossFunction.hardVetoes.length >= 6);
});

test('Pictured Rocks subdomain declares a distinct site identity', () => {
  assert.match(middleware, /PICTURED_ROCKS_SITE_NAME = 'Pictured Rocks Trip Planner'/);
  assert.match(middleware, /'@type': 'WebSite'/);
  assert.match(middleware, /alternateName: \['Pictured Rocks Planner', 'picturedrocks\.chrisizworski\.com'\]/);
  assert.match(middleware, /property=\"og:site_name\" content=\"\$\{PICTURED_ROCKS_SITE_NAME\}\"/);
});

test('page, app, place, author and image form a linked entity graph', () => {
  assert.match(middleware, /mainEntity: \{ '@id': 'https:\/\/picturedrocks\.chrisizworski\.com\/#app' \}/);
  assert.match(middleware, /isPartOf: \{ '@id': 'https:\/\/picturedrocks\.chrisizworski\.com\/#website' \}/);
  assert.match(middleware, /primaryImageOfPage: \{ '@id': 'https:\/\/picturedrocks\.chrisizworski\.com\/#primaryimage' \}/);
  assert.match(planner, /\"@id\":\"https:\/\/picturedrocks\.chrisizworski\.com\/#app\"/);
  assert.match(planner, /\"featureList\"/);
  assert.match(planner, /\"TouristDestination\"/);
});

test('title experiment remains frozen while entity metadata changes', () => {
  assert.match(middleware, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(planner, new RegExp(`<title>${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</title>`));
  assert.equal(benchmark.currentMetadataVariant.title, title);
  assert.match(benchmark.currentMetadataVariant.freezeRule, /Do not alter the title or description again/);
});

test('canonical ownership and lab noindex safety remain intact', () => {
  assert.ok(middleware.includes("url: 'https://chrisizworski.com/',"), 'Person url is the canonical homepage');
  assert.ok(middleware.includes("author: { '@id': 'https://chrisizworski.com/#person' }"));
  assert.ok(middleware.includes("PICTURED_ROCKS_AUTHOR_URL = 'https://chrisizworski.com/chris-izworski/'"));
  assert.match(planner, /name=\"robots\" content=\"noindex,nofollow\"/);
  assert.match(planner, new RegExp(`rel=\"canonical\" href=\"${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\"`));
  assert.match(middleware, /PICTURED_ROCKS_INDEXABLE_ROBOTS/);
  assert.match(middleware, /X-Robots-Tag', 'index, follow, max-image-preview:large'/);
});

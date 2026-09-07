const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const middleware = fs.readFileSync(path.join(__dirname, '..', 'middleware.ts'), 'utf8');
const legacy = '/national-tools/waterfalls/niagara-falls-live';
const duplicatePlanner = '/national-tools/niagara-falls-rainbow-planner';
const livePredictor = '/national-tools/niagara-rainbow/';

test('legacy Niagara hub URLs permanently redirect to the live rainbow predictor', () => {
  assert.ok(middleware.includes(`'${legacy}'`), 'missing legacy root matcher');
  assert.ok(middleware.includes(`'${legacy}/'`), 'missing legacy slash matcher');
  assert.ok(middleware.includes(`'${legacy}/:path*'`), 'missing legacy wildcard matcher');
  assert.ok(middleware.includes(`const LIVE_RAINBOW_PREDICTOR = '${livePredictor}'`));
  assert.match(middleware, /url\.pathname\s*=\s*LIVE_RAINBOW_PREDICTOR/);
  assert.match(middleware, /Response\.redirect\(url,\s*308\)/);
});

test('duplicate standalone rainbow planner is fully retired into the live predictor', () => {
  assert.ok(middleware.includes(`'${duplicatePlanner}'`));
  assert.ok(middleware.includes(`'${duplicatePlanner}/:path*'`));
  assert.ok(middleware.includes(`const DUPLICATE_RAINBOW_PLANNER = '${duplicatePlanner}'`));
  assert.match(middleware, /url\.pathname\s*===\s*DUPLICATE_RAINBOW_PLANNER/);
  assert.match(middleware, /url\.pathname\.startsWith\(`\$\{DUPLICATE_RAINBOW_PLANNER\}\/`\)/);
  assert.doesNotMatch(middleware, /aqua-sharp-digits\.replit\.app/);
  assert.doesNotMatch(middleware, /RAINBOW_ORIGIN/);
  assert.doesNotMatch(middleware, /return fetch\(upstream/);
});

test('retired Niagara routes remain narrowly scoped', () => {
  assert.doesNotMatch(middleware, /matcher:\s*['"]\/:path\*/);
  assert.doesNotMatch(middleware, /jubilant-lost-bloatware\.replit\.app/);
});

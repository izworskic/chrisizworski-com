const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const middleware = fs.readFileSync(path.join(__dirname, '..', 'middleware.ts'), 'utf8');
const legacy = '/national-tools/waterfalls/niagara-falls-live';
const planner = '/national-tools/niagara-falls-rainbow-planner/';

test('legacy Niagara hub middleware is narrowly scoped to retiring the old URL tree', () => {
  assert.ok(middleware.includes(`'${legacy}'`), 'missing legacy root matcher');
  assert.ok(middleware.includes(`'${legacy}/'`), 'missing legacy slash matcher');
  assert.ok(middleware.includes(`'${legacy}/:path*'`), 'missing legacy wildcard matcher');
  assert.doesNotMatch(middleware, /matcher:\s*['"]\/:path\*/);
  assert.doesNotMatch(middleware, /trailingSlash/);
});

test('every legacy Niagara hub URL permanently redirects to the standalone rainbow planner', () => {
  assert.ok(middleware.includes(`const RAINBOW_PLANNER = '${planner}'`));
  assert.match(middleware, /url\.pathname\s*=\s*RAINBOW_PLANNER/);
  assert.match(middleware, /url\.search\s*=\s*''/);
  assert.match(middleware, /Response\.redirect\(url,\s*308\)/);
});

test('retired child tools are covered by the legacy wildcard instead of separate route behavior', () => {
  for (const route of ['border', 'water-flow', 'maid', 'best-time', 'visibility', 'tonight', 'cameras', 'map', 'rainbow']) {
    assert.ok(middleware.includes(`'${legacy}/:path*'`), `${route} is not covered by the retirement wildcard`);
    assert.ok(!middleware.includes(`'${legacy}/${route}/'`), `${route} still has a dedicated legacy matcher`);
  }
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const middleware = fs.readFileSync(path.join(__dirname, '..', 'middleware.ts'), 'utf8');
const legacy = '/national-tools/waterfalls/niagara-falls-live';
const planner = '/national-tools/niagara-falls-rainbow-planner/';

test('legacy Niagara hub URLs are narrowly retired into the standalone rainbow planner', () => {
  assert.ok(middleware.includes(`'${legacy}'`), 'missing legacy root matcher');
  assert.ok(middleware.includes(`'${legacy}/'`), 'missing legacy slash matcher');
  assert.ok(middleware.includes(`'${legacy}/:path*'`), 'missing legacy wildcard matcher');
  assert.match(middleware, /url\.pathname\s*=\s*RAINBOW_PLANNER/);
  assert.match(middleware, /url\.search\s*=\s*''/);
  assert.match(middleware, /Response\.redirect\(url,\s*308\)/);
});

test('standalone rainbow planner canonical and all prefixed assets/API are handled on the main domain', () => {
  assert.ok(middleware.includes("'/national-tools/niagara-falls-rainbow-planner'"));
  assert.ok(middleware.includes("'/national-tools/niagara-falls-rainbow-planner/:path*'"));
  assert.ok(middleware.includes(`const RAINBOW_PLANNER = '${planner}'`));
  assert.ok(middleware.includes("const RAINBOW_ORIGIN = 'https://aqua-sharp-digits.replit.app'"));
  assert.match(middleware, /url\.pathname\s*===\s*RAINBOW_PLANNER\.slice\(0,\s*-1\)/);
  assert.match(middleware, /url\.pathname\.startsWith\(RAINBOW_PLANNER\)/);
  assert.match(middleware, /return fetch\(upstream,/);
});

test('retired child tools do not keep dedicated hub behavior', () => {
  for (const route of ['border', 'water-flow', 'maid', 'best-time', 'visibility', 'tonight', 'cameras', 'map', 'rainbow']) {
    assert.ok(!middleware.includes(`'${legacy}/${route}/'`), `${route} still has a dedicated legacy matcher`);
  }
  assert.doesNotMatch(middleware, /matcher:\s*['"]\/:path\*/);
});

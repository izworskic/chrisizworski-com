const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const middleware = fs.readFileSync(path.join(__dirname, '..', 'middleware.ts'), 'utf8');
const prefix = '/national-tools/waterfalls/niagara-falls-live';
const canonicalChildren = [
  'border',
  'water-flow',
  'maid',
  'best-time',
  'visibility',
  'tonight',
  'cameras',
  'map',
  'rainbow',
];

test('Niagara child trailing-slash middleware is narrowly scoped', () => {
  for (const route of canonicalChildren) {
    assert.ok(middleware.includes(`'${prefix}/${route}/'`), `missing ${route} slash matcher`);
  }
  assert.doesNotMatch(middleware, /matcher:\s*['"]\/:path\*/);
  assert.doesNotMatch(middleware, /trailingSlash/);
});

test('Niagara slash URLs permanently redirect to the same URL without the final slash', () => {
  assert.match(middleware, /url\.pathname\s*=\s*url\.pathname\.slice\(0,\s*-1\)/);
  assert.match(middleware, /Response\.redirect\(url,\s*308\)/);
});

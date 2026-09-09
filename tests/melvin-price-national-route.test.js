const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const rewrites = config.rewrites || [];

test('Melvin Price National Tools route wins before the hub catch-all', () => {
  const exact = rewrites.findIndex(r => r.source === '/national-tools/melvin-price-live');
  const exactSlash = rewrites.findIndex(r => r.source === '/national-tools/melvin-price-live/');
  const catchAll = rewrites.findIndex(r => r.source === '/national-tools/:path*');

  assert.ok(exact >= 0, 'missing Melvin Price route without trailing slash');
  assert.ok(exactSlash >= 0, 'missing Melvin Price route with trailing slash');
  assert.ok(catchAll >= 0, 'missing National Tools catch-all');
  assert.ok(exact < catchAll && exactSlash < catchAll, 'Melvin Price routes must precede National Tools catch-all');
  assert.equal(rewrites[exact].destination, '/melvin-price/index.html');
  assert.equal(rewrites[exactSlash].destination, '/melvin-price/index.html');
});

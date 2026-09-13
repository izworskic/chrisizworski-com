const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../vercel.json');

const destination = 'https://national-fall-color.vercel.app/national-tools/fall-color/blue-ridge-parkway/index.html';
const prettyRoutes = [
  '/national-tools/fall-color/blue-ridge-parkway',
  '/national-tools/fall-color/blue-ridge-parkway/',
];

test('Blue Ridge pretty URLs resolve to the known-good upstream index document before the fall-color wildcard', () => {
  const rewrites = config.rewrites || [];
  const wildcardIndex = rewrites.findIndex((entry) => entry.source === '/national-tools/fall-color/:path*');
  assert.notEqual(wildcardIndex, -1, 'fall-color wildcard must exist');

  for (const source of prettyRoutes) {
    const index = rewrites.findIndex((entry) => entry.source === source);
    assert.notEqual(index, -1, `${source} must have an explicit rewrite`);
    assert.equal(rewrites[index].destination, destination, `${source} must target the upstream index.html`);
    assert.ok(index < wildcardIndex, `${source} must precede the generic fall-color wildcard`);
  }
});

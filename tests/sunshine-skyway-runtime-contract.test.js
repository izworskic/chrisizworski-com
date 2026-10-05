const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../api/sunshine-skyway');

test('Sunshine Skyway API exports a Vercel handler', () => {
  assert.equal(typeof api, 'function');
});

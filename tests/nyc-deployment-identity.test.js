'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/nyc-crossing');

test('release HEAD checks expose only the real commit and never fetch traffic providers', async () => {
 const previous = process.env.VERCEL_GIT_COMMIT_SHA;
 const originalFetch = global.fetch;
 global.fetch = async () => { throw new Error('Release identity must not poll external providers'); };
 try {
  for (const sha of ['0123456789abcdef0123456789abcdef01234567', null]) {
   if (sha) process.env.VERCEL_GIT_COMMIT_SHA = sha;
   else delete process.env.VERCEL_GIT_COMMIT_SHA;
   const headers = {};
   const res = { setHeader(key, value) { headers[key.toLowerCase()] = value; }, status(value) { this.code = value; return this; }, end() { this.ended = true; } };
   await handler({ method: 'HEAD', query: {} }, res);
   assert.equal(res.code, 204);
   assert.equal(res.ended, true);
   assert.equal(headers['x-deployment-sha'], sha || undefined);
   assert.match(headers['x-robots-tag'], /noindex/);
   assert.equal(headers['cache-control'], 'no-store');
  }
 } finally {
  global.fetch = originalFetch;
  if (previous === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
  else process.env.VERCEL_GIT_COMMIT_SHA = previous;
 }
});

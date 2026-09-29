const assert = require('node:assert/strict');
const fs = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');

async function canonicalResponse(t) {
  const source = stripTypeScriptTypes(fs.readFileSync('middleware.ts', 'utf8'));
  const middleware = (await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))).default;
  const preview = fs.readFileSync('public/labs/pictured-rocks-planner/index.html', 'utf8');
  t.mock.method(globalThis, 'fetch', async () => new Response(preview, {headers: {'content-type': 'text/html'}}));
  const response = await middleware(new Request('https://picturedrocks.chrisizworski.com/'));
  assert.equal(response.status, 200);
  return {html: await response.text(), headers: response.headers};
}

function assertIndexableRobots(html) {
  const values = [...html.matchAll(/<meta name="robots" content="([^"]+)"/gi)];
  assert.equal(values.length, 1, 'canonical document must have exactly one robots directive');
  const directives = new Set(values[0][1].split(',').map(value => value.trim()));
  for (const required of ['index', 'follow', 'max-image-preview:large']) assert.ok(directives.has(required), required);
  for (const forbidden of ['noindex', 'nofollow']) assert.ok(!directives.has(forbidden), forbidden);
}

module.exports = {canonicalResponse, assertIndexableRobots};

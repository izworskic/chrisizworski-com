const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
let middleware;
test.before(async () => {
  const source = stripTypeScriptTypes(fs.readFileSync('middleware.ts', 'utf8'));
  middleware = (await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))).default;
});
test('proxied HTML gains one network integration and drops stale byte headers', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html><head><title>Owner page</title></head><body>Owner content</body></html>', {
    headers: {'content-type':'text/html', 'content-length':'90', etag:'"old"'}
  }));
  for (const path of ['/national-tools/fort-madison-live/', '/national-tools/platte-crane-live/']) {
    const response = await middleware(new Request('https://chrisizworski.com' + path));
    const html = await response.text();
    assert.equal((html.match(/network-ads-v1\.js/g) || []).length, 1);
    assert.ok(html.includes('<body>Owner content</body>'));
    assert.equal(response.headers.get('content-length'), null);
    assert.equal(response.headers.get('etag'), null);
  }
});
test('Next flight and JSON responses are not rewritten as documents', async t => {
  for (const type of ['text/x-component', 'application/json']) {
    t.mock.method(globalThis, 'fetch', async () => new Response('original', {headers:{'content-type':type}}));
    const response = await middleware(new Request('https://chrisizworski.com/national-tools/platte-crane-live/api/data'));
    assert.equal(await response.text(), 'original');
  }
});
test('only promoted Pictured Rocks document receives the integration', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html><head><meta name="robots" content="noindex,nofollow"></head><body>Planner</body></html>', {headers:{'content-type':'text/html'}}));
  const response = await middleware(new Request('https://picturedrocks.chrisizworski.com/'));
  const html = await response.text();
  assert.ok(html.includes('index,follow,max-image-preview:large'));
  assert.ok(html.includes('network-ads-v1.js'));
});

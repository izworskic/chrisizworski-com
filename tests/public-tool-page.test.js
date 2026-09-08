const test = require('node:test');
const assert = require('node:assert/strict');
const publicToolPage = require('../lib/public-tool-page.js');
function response() {
  return {headers: {}, setHeader(k,v) {this.headers[k.toLowerCase()] = v;}, status(s) {this.code=s;return this;}, send(b) {this.body=b;return this;}};
}
test('public HTML preserves built tags without forwarding preview robots or cookies', async t => {
  const html='<html><head><script src="https://www.googletagmanager.com/gtag/js?id=G-Y5D2V2W7HN"></script></head><body>Garden</body></html>';
  t.mock.method(globalThis, 'fetch', async () => new Response(html, {headers:{'content-type':'text/html','x-robots-tag':'noindex, nofollow, noarchive','set-cookie':'preview=1'}}));
  const res=response(); await publicToolPage('https://owner.example/tool/')({method:'GET'},res);
  assert.equal(res.code,200);assert.ok(res.body.includes('G-Y5D2V2W7HN'));assert.equal((res.body.match(/googletagmanager.com/g)||[]).length,1);assert.ok(res.body.includes('pagead/js/adsbygoogle.js'));
  assert.equal(res.headers['x-robots-tag'],undefined);assert.equal(res.headers['set-cookie'],undefined);
});
test('owner errors and non-HTML responses cannot be cached as successful pages', async t => {
  for (const upstream of [new Response('fail',{status:500}),new Response('{}',{headers:{'content-type':'application/json'}})]) {
    t.mock.method(globalThis,'fetch',async()=>upstream);
    const res=response();await publicToolPage('https://owner.example/')({method:'GET'},res);
    assert.equal(res.code,502);assert.equal(res.headers['cache-control'],'no-store');
  }
});
test('HEAD is bodyless and unsupported methods do not fetch',async t=>{
  const fetchMock=t.mock.method(globalThis,'fetch',async()=>new Response('<head></head>',{headers:{'content-type':'text/html'}}));
  const handler=publicToolPage('https://owner.example/');
  const head=response();await handler({method:'HEAD'},head);assert.equal(head.body,'');assert.equal(head.code,200);
  const post=response();await handler({method:'POST'},post);assert.equal(post.code,405);assert.equal(fetchMock.mock.callCount(),1);
});

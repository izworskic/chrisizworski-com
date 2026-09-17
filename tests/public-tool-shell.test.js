const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const handler = require('../api/public-tool-shell');
const sources = require('../lib/public-tool-sources');
const rewrites = require('../vercel.json').rewrites;
function response() {
  return {headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},status(s){this.code=s;return this;},send(body){this.body=body;return this;}};
}
test('each composed tool keeps owner HTML, identity and a single ad loader while gaining policy links', async t => {
  for(const [tool,url] of Object.entries(sources)) {
    const routes=rewrites.filter(r=>r.destination===`/api/public-tool-shell?tool=${tool}`);
    assert.equal(routes.length,2,tool);
    const canonical=`https://chrisizworski.com${routes.find(r=>r.source.endsWith('/')).source}`;
    const original=`<html><head><title>Chris Izworski tool</title><link rel="canonical" href="${canonical}"><script src="/engine.js"></script><script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8222782620788075"></script></head><body><h1>Original tool</h1><p>Owner content</p><a href="/chris-izworski/">Profile</a></body></html>`;
    t.mock.method(globalThis,'fetch',async received=>{assert.equal(received,url);return new Response(original,{headers:{'content-type':'text/html'}});});
    const res=response();await handler({method:'GET',query:{tool}},res);
    assert.equal(res.code,200);assert.equal(res.headers['x-robots-tag'],undefined);
    for(const value of [canonical,'<h1>Original tool</h1>','<p>Owner content</p>','src="/engine.js"','href="/chris-izworski/"'])assert.ok(res.body.includes(value));
    for(const route of ['about','connect','privacy','terms'])assert.ok(res.body.includes(`href="/${route}/"`));
    assert.equal((res.body.match(/pagead\/js\/adsbygoogle.js/g)||[]).length,1);
  }
});
test('unknown and hostile source parameters never fetch arbitrary URLs',async t=>{
  const fetch=t.mock.method(globalThis,'fetch',async()=>{throw Error('must not fetch');});
  for(const tool of [undefined,'https://private.example/','__proto__',['aurora']]){
    const res=response();await handler({method:'GET',query:{tool}},res);
    assert.equal(res.code,404);assert.equal(res.headers['x-robots-tag'],'noindex');
  }
  assert.equal(fetch.mock.callCount(),0);
});
test('all listed state aurora destinations route to their state owner before the generic fallback',()=>{
  const xml=fs.readFileSync('public/sitemap-aurora-states.xml','utf8');
  let checked=0;
  for(const m of xml.matchAll(/<loc>https:\/\/chrisizworski.com\/national-tools\/aurora\/([^/]+)\/([^/]+)\/<\/loc>/g)){
    const [,state,place]=m;
    for(const slash of ['', '/']) {
      const source=`/national-tools/aurora/${state}/${place}${slash}`;
      const exactIndex=rewrites.findIndex(r=>r.source===source);
      assert.ok(exactIndex>=0 && exactIndex<rewrites.findIndex(r=>r.source===`/national-tools/aurora/${state}/:path*`));
      assert.equal(rewrites[exactIndex].destination,`https://${state}-aurora-live.vercel.app/${place}/index.html`);
    }
    const index=rewrites.findIndex(r=>r.source===`/national-tools/aurora/${state}/:path*`);
    assert.ok(index>=0 && index<rewrites.findIndex(r=>r.source==='/national-tools/aurora/:path*'));
    assert.equal(rewrites[index].destination,`https://${state}-aurora-live.vercel.app/:path*`);checked++;
  }
  assert.equal(checked,16);
});

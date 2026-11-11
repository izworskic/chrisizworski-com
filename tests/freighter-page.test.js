'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createPageHandler, renderReports } = require('../lib/freighter-page');
const { loadFreighterFeed } = require('../lib/freighter-feed');
const html = fs.readFileSync('public/great-lakes-freighter-tracking/index.html','utf8');
const now = Date.parse('2026-11-09T18:00:00Z');
const vessel = (overrides={}) => ({mmsi:'366904950',name:'LEE A. TREGURTHA',lat:46.5,lon:-84.36,seen:new Date(now-60000).toISOString(),speedKnots:12,source:'fixture',destination:'DULUTH',...overrides});
const feed = vessels => ({ok:true,checkedAt:new Date(now).toISOString(),vessels,attribution:[{credit:'Fixture AIS'}]});
function recorder(){return {headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},status(n){this.code=n;return this;},send(body){this.body=body;}};}

test('first HTML answers ship name, position, destination, timestamp and source without JS',()=>{
 const rendered=renderReports(html,feed([vessel()]),now);
 const list=rendered.match(/<ul id="freighterVessels">([\s\S]*?)<\/ul>/)[1];
 for(const value of ['LEE A. TREGURTHA','46.5000, -84.3600','AIS destination: DULUTH','2026-11-09T17:59:00.000Z','12.0 kn','fixture'])assert.ok(list.includes(value),value);
 assert.ok(rendered.includes('not confirmed arrivals'));
 assert.ok(rendered.includes('Source credits: Fixture AIS'));
 assert.ok(!list.includes('<button'));
 // The canonical, identity, all existing anchors, and ad loader survive composition.
 for(const re of [/<title>[\s\S]*?<\/title>/,/<link rel="canonical"[^>]+>/,/<script type="application\/ld\+json">[\s\S]*?<\/script>/])assert.equal(rendered.match(re)?.[0],html.match(re)?.[0]);
 assert.deepEqual([...rendered.matchAll(/href="([^"]+)"/g)].map(x=>x[1]),[...html.matchAll(/href="([^"]+)"/g)].map(x=>x[1]));
 assert.equal((rendered.match(/pagead2.googlesyndication.com\/pagead\/js\/adsbygoogle.js/g)||[]).length,(html.match(/pagead2.googlesyndication.com\/pagead\/js\/adsbygoogle.js/g)||[]).length);
});

test('reports expire before the cache can push them beyond 30 minutes; empty is not no ships',()=>{
 const rendered=renderReports(html,feed([vessel({name:'OLD',seen:new Date(now-1800000).toISOString()}),vessel({name:'FUTURE',seen:new Date(now+61000).toISOString()}),vessel({name:'INVALID',seen:'bad'})]),now);
 const seed=JSON.parse(rendered.match(/id="freighter-initial-reports">([\s\S]*?)<\/script>/)[1]);
 assert.deepEqual(seed.vessels,[]);
 assert.match(rendered,/No recent reports returned. This does not mean there are no ships/);
});

test('untrusted AIS strings cannot escape HTML or bootstrap JSON',()=>{
 const attack='</script><img src=x onerror=alert(1)> & "';
 const data=feed([vessel({name:attack,destination:attack,source:attack})]);data.attribution[0].credit=attack;
 const rendered=renderReports(html,data,now);
 assert.ok(!rendered.includes(attack));
 assert.ok(rendered.includes('&lt;/script&gt;'));
 const seed=JSON.parse(rendered.match(/id="freighter-initial-reports">([\s\S]*?)<\/script>/)[1]);
 assert.equal(seed.vessels[0].name,attack);
});

test('HTML handler falls back to the complete working page on feed failure with no cached live assertion',async()=>{
 const res=recorder();let budget;
 await createPageHandler(()=>html,async ms=>{budget=ms;throw Error('outage');})({method:'GET'},res);
 assert.equal(budget,2000);assert.equal(res.code,200);assert.equal(res.headers['cache-control'],'no-store');
 assert.match(res.body,/This is not a zero-traffic report/);
 assert.ok(res.body.includes('id="freighterMap"'));
 assert.ok(!res.body.includes('id="freighter-initial-reports"'));
 assert.equal(res.headers['x-robots-tag'],undefined);
});

test('GET and HEAD are equivalent; write methods never fetch; cache has hard expiry',async()=>{
 let calls=0;const handler=createPageHandler(()=>html,async()=>{calls++;return feed([vessel({seen:new Date().toISOString()})]);});
 const get=recorder(),head=recorder(),post=recorder();
 await handler({method:'GET'},get);await handler({method:'HEAD'},head);await handler({method:'POST'},post);
 assert.equal(get.code,200);assert.equal(head.code,200);assert.equal(head.body,'');assert.equal(post.code,405);assert.equal(calls,2);
 assert.equal(get.headers['cache-control'],'public, max-age=0, s-maxage=30, must-revalidate');
 assert.deepEqual(head.headers,get.headers);assert.equal(post.headers.allow,'GET, HEAD');
});

test('shared loader enforces request deadline and still uses normalized bounded AIS data',async t=>{
 let signal;
 t.mock.method(global,'fetch',async(u,opts)=>{signal=opts.signal;return {ok:true,json:async()=>({type:'FeatureCollection',features:[]})};});
 const result=await loadFreighterFeed(5);
 assert.equal(result.ok,true);assert.deepEqual(result.bbox,[41,-93,49,-76]);
 await new Promise(resolve=>setTimeout(resolve,15));assert.equal(signal.aborted,true);
});

test('public route bundles its built HTML and API/preview routes remain noindex',()=>{
 const config=require('../vercel.json');
 for(const source of ['/great-lakes-freighter-tracking','/great-lakes-freighter-tracking/'])assert.equal(config.rewrites.find(r=>r.source===source).destination,'/api/freighter-page');
 assert.equal(config.functions['api/freighter-page.js'].includeFiles,'public/great-lakes-freighter-tracking/index.html');
 assert.ok(config.headers.find(h=>h.source==='/api/(.*)').headers.some(h=>h.key==='X-Robots-Tag'&&h.value.includes('noindex')));
 assert.ok(config.headers.find(h=>h.has?.some(x=>x.type==='host'&&x.value.includes('vercel'))).headers.some(h=>h.key==='X-Robots-Tag'&&h.value.includes('noindex')));
});


test('AIS replacement tokens stay literal in reports, credits and bootstrap JSON',()=>{
 for(const token of ['$&', '$`', "$'", '$$', '$1']){
  const value='TEST '+token+' VESSEL';
  const data=feed([vessel({name:value,destination:value,source:value})]);
  data.attribution[0].credit=value;
  const rendered=renderReports(html,data,now);
  const seed=JSON.parse(rendered.match(/id="freighter-initial-reports">([\s\S]*?)<\/script>/)[1]);
  for(const field of ['name','destination','source'])assert.equal(seed.vessels[0][field],value);
  assert.equal(seed.attribution[0].credit,value);
  assert.equal((rendered.match(/<ul id="freighterVessels">/g)||[]).length,1);
  assert.equal((rendered.match(/<html\b/g)||[]).length,1);
  assert.ok(rendered.includes('<strong>'+value.replace(/&/g,'&amp;').replace(/'/g,'&#39;')+'</strong>'));
  assert.ok(rendered.includes('Source credits: '+value.replace(/&/g,'&amp;').replace(/'/g,'&#39;')));
 }
});

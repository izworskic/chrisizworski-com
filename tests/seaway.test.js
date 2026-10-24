'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {assess,combine,sourceUrl}=require('../lib/seaway-ais');
const handler=require('../api/st-lawrence-seaway');
const C=require('../public/assets/seaway-core');
const now=Date.parse('2026-10-23T13:00:00Z');
const feature=(id,patch={},coords=[-74.85,44.98])=>({type:'Feature',geometry:{type:'Point',coordinates:coords},properties:{mmsi:id,name:'TEST SHIP',seen:'2026-10-23T12:59:00Z',kind:'vessel',sog:4,source:'test',...patch}});
const collection=features=>({type:'FeatureCollection',features,attribution:{test:'Test fixture only'}});
function response(){return {headers:{},code:200,setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(value){this.body=value;return this;}};}
test('regional AIS rejects wrong areas, stale, future, invalid identities and explicit non-vessels',()=>{
  const raw=collection([feature(316000001,{beam:24,length:200}),feature(316000002,{seen:'2026-10-23T12:00:00Z'}),feature(316000003,{seen:'2026-10-23T13:10:00Z'}),feature(316000004,{kind:'station'}),feature(316000005,{},[-73.5,45.5]),feature('bad')]);
  const r=assess(raw,'massena',now);assert.equal(r.vessels.length,1);assert.equal(r.vessels[0].beamMeters,24);assert.equal(r.vessels[0].lengthMeters,200);assert.deepEqual(r.vessels[0].regionIds,['massena']);
  assert.match(sourceUrl('massena'),/kind=vessel&max_age=30m/);assert.throws(()=>assess(raw,'bad',now));
});
test('optional kind remains accepted and non-vessel duplicates do not erase a valid ship',()=>{
  const a=feature(316000001);delete a.properties.kind;
  const r=assess(collection([a,feature(316000001,{kind:'station'})]),'massena',now);assert.equal(r.vessels.length,1);
});
test('reported dimensions follow the newest duplicate position, not array order',()=>{
  const r=assess(collection([feature(316000001,{beam:24,length:200}),feature(316000001,{beam:5,length:40,seen:'2026-10-23T12:50:00Z'})]),'massena',now);
  assert.equal(r.vessels[0].lengthMeters,200);assert.equal(r.vessels[0].beamMeters,24);
});
test('rejected future and out-of-region duplicates cannot supply selected ship dimensions',()=>{
  const r=assess(collection([feature(316000001,{beam:24,length:200}),feature(316000001,{beam:5,length:40,seen:'2026-10-23T13:10:00Z'}),feature(316000001,{beam:7,length:60,seen:'2026-10-23T13:00:00Z'},[-73.5,45.5])]),'massena',now);
  assert.equal(r.vessels.length,1);assert.equal(r.vessels[0].lengthMeters,200);assert.equal(r.vessels[0].beamMeters,24);
});
test('a provider limit is disclosed and incomplete regional success survives an outage',()=>{
  const raw=collection(Array.from({length:51},(_,i)=>feature(316000000+i)));
  const good=assess(raw,'massena',now);assert.equal(good.vessels.length,50);assert.equal(good.truncated,true);
  const r=combine([good,{id:'iroquois',state:'unavailable',vessels:[]}],now);assert.equal(r.ok,true);assert.equal(r.state,'partial');assert.equal(r.isSchedule,false);assert.equal(r.lockQueue,'unknown');assert.equal(r.lockStatus,'unknown');assert.equal('eta' in r,false);
  const unavailable=combine([{id:'massena',state:'unavailable',vessels:[]}],now);assert.equal(unavailable.ok,false);assert.equal(unavailable.state,'unavailable');
});
test('cross-region duplicates keep the newest observation and union their regional membership',()=>{
  const a=assess(collection([feature(316000001)]),'massena',now);
  const b={id:'iroquois',state:'recent',vessels:[{...a.vessels[0],seen:'2026-10-23T12:58:00Z',regionIds:['iroquois']}],attribution:[]};
  const r=combine([a,b],now);assert.equal(r.vessels.length,1);assert.equal(r.vessels[0].seen,'2026-10-23T12:59:00.000Z');assert.deepEqual(r.vessels[0].regionIds,['massena','iroquois']);
});
test('endpoint validates scope and method before any network request',async()=>{
  const original=global.fetch;global.fetch=()=>{throw new Error('Must not fetch');};
  try{const bad=response();await handler({method:'GET',query:{region:'unknown'}},bad);assert.equal(bad.code,400);assert.equal(bad.headers['X-Robots-Tag'],'noindex, nofollow');const method=response();await handler({method:'POST'},method);assert.equal(method.code,405);}finally{global.fetch=original;}
});
test('endpoint preserves a regional source failure without claiming zero traffic',async()=>{
  const original=global.fetch;global.fetch=async url=>{if(String(url).includes('44.91'))throw new Error('Massena unavailable');return {ok:true,json:async()=>collection([])};};
  try{const r=response();await handler({method:'GET',query:{region:'all'}},r);assert.equal(r.code,200);assert.equal(r.body.state,'partial');assert.equal(r.body.regions.find(x=>x.id==='massena').state,'unavailable');assert.equal(r.body.isSchedule,false);assert.match(r.headers['Cache-Control'],/s-maxage=90/);}finally{global.fetch=original;}
});
test('all-source failure is an unavailable 502, never an empty success',async()=>{
  const original=global.fetch;global.fetch=async()=>{throw new Error('offline');};
  try{const r=response();await handler({method:'GET'},r);assert.equal(r.code,502);assert.equal(r.body.state,'unavailable');assert.equal(r.headers['Cache-Control'],'no-store');}finally{global.fetch=original;}
});
test('stale display filtering, region matching and cargo filters retain their meanings',()=>{
  const v=assess(collection([feature(316000001,{type:70}),feature(316000002,{type:60})]),'massena',now).vessels;
  assert.equal(C.visible(v,'massena','', 'cargo',now).length,1);assert.equal(C.visible(v,'iroquois','', 'all',now).length,0);assert.equal(C.visible(v,'all','', 'all',now+1800000).length,0);
  assert.equal(C.direction({speedKnots:0,course:90,heading:null}),'Heading unreported');assert.equal(C.direction({speedKnots:4,course:90}),'E reported heading');
});
test('lock sequence closes both gates during water change and reverses the downbound journey',()=>{
  for(const down of [false,true])for(let p=35;p<70;p++){
    const f=C.lockFrame(p,11.6,down);assert.equal(f.lowerOpen,false);assert.equal(f.upperOpen,false);assert.equal(f.changing,true);
  }
  assert.ok(C.lockFrame(65,11.6,false).water<C.lockFrame(40,11.6,false).water);
  assert.ok(C.lockFrame(65,11.6,true).water>C.lockFrame(40,11.6,true).water);
  assert.ok(C.lockFrame(0,1.2).high>C.lockFrame(0,11.6).high);
  assert.equal(C.lockFrame(100,11.6,false).upperOpen,true);assert.equal(C.lockFrame(100,11.6,true).lowerOpen,true);
});
test('ship fit requires both known dimensions and never converts a missing value into clearance',()=>{
  assert.equal(C.fit(null,24),null);assert.equal(C.fit(200,NaN),null);assert.equal(C.fit(-1,5),null);
  const fit=C.fit(225.5,23.8);assert.equal(fit.remainingLength,8);assert.ok(Math.abs(fit.remainingBeam-.6)<1e-9);assert.equal(C.fit(300,30).withinReference,false);
});
test('monthly history preserves missing values and rejects non-month-start reporting dates',()=>{
  const h=JSON.parse(fs.readFileSync('data/seaway/history.json','utf8'));const r=C.monthly(h.rows,2024);
  assert.equal(r.length,12);assert.equal(r[0].value,null);assert.equal(r[9].value,279);assert.equal(r[11].value,290);
  assert.equal(C.monthly([{month:'2026-07-06T00:00:00.000',vessel_transits:'99'}],2026)[6].value,null);
});
test('both canonical pages carry working asset references, differentiated static value and a defined creator',()=>{
  for(const slug of ['st-lawrence-seaway','eisenhower-lock']){
    const html=fs.readFileSync('public/'+slug+'/index.html','utf8');assert.match(html,new RegExp('https://chrisizworski.com/'+slug+'/'));
    const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];assert.ok(graph.some(x=>x['@type']==='Person'&&x['@id']==='https://chrisizworski.com/#person'));
    assert.match(html,/not live telemetry/);assert.match(html,/not a water-surface elevation profile/);assert.match(html,/not counts at this selected lock/);assert.match(html,/Not reported/);
    for(const name of ['seaway.css','seaway-reference.js','seaway-core.js','seaway.js'])assert.ok(html.includes('/assets/'+name));
    const title=html.match(/<title>(.*?)<\/title>/)[1].replace(/&amp;/g,'&');assert.ok(title.length<=60,title);assert.ok(html.match(/<meta name="description" content="([^"]+)/)[1].length<=158);
  }
});

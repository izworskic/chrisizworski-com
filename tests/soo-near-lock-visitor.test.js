'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../public/assets/soo-near-lock-motion'),engine=require('../lib/soo-locks-next'),handler=require('../api/soo-ais');
const NOW=Date.parse('2026-11-21T14:45:00Z'),iso=m=>new Date(NOW+m*60000).toISOString();
const v={mmsi:'366123456',name:'TEST FREIGHTER',shipType:70,lat:46.5025,lon:-84.365,seen:iso(-2),speedKnots:.6};
const observed=()=>core.observe(v,NOW,engine);
const data=(ships=[observed()],extra={})=>({ok:true,nextShip:{ok:true,inLock:[],candidates:[],pick:null,nearLockMotion:ships,...extra}});
test('real reviewed Soo geometry yields observation only and excludes chamber and far positions',()=>{
 const s=observed();assert.ok(s);assert.equal(s.state,'near-lock-low-motion');
 assert.ok(s.distanceNm<=1);assert.ok(core.observe({...v,shipType:80},NOW,engine));
 for(const k of ['window','direction','lock','eta','queue','waitingMinutes'])assert.equal(k in s,false);
 for(const x of [{lat:46.503,lon:-84.352},{lon:-84.40},{speedKnots:null},{speedKnots:1.5},{speedKnots:-1},{shipType:31},{shipType:null},{mmsi:'bad'}])assert.equal(core.observe({...v,...x},NOW,engine),null);
});
test('reject invalid or future timestamps and expire using vessel seen, not checkedAt',()=>{
 for(const seen of [iso(-5.01),iso(.01),'invalid','2026-11-31T14:00:00Z'])assert.equal(core.observe({...v,seen},NOW,engine),null);
 assert.ok(core.observe({...v,seen:iso(-5)},NOW,engine));
 assert.equal(core.nextExpiry(data(),false,NOW),Date.parse(v.seen)+core.MAX_AGE_MS+1);
 assert.equal(core.visitorState({...data(),checkedAt:iso(4)},false,NOW+4*60000),null);
 assert.equal(core.nextExpiry(data(),true,NOW),null);
});
test('guard failure, duplicate or malformed observations, and timed state precedence',()=>{
 for(const d of [null,{ok:false},data([]),data([observed()],{ok:false}),{ok:true,nextShip:{ok:true}}])assert.deepEqual(core.freshNearLock(d,false,NOW),[]);
 assert.deepEqual(core.freshNearLock(data(),true,NOW),[]);
 for(const extra of [{pick:{id:v.mmsi}},{inLock:[{mmsi:v.mmsi}]},{candidates:[{mmsi:v.mmsi}]}])assert.deepEqual(core.freshNearLock(data([observed()],extra),false,NOW),[]);
 assert.equal(core.freshNearLock(data([observed(),observed()]),false,NOW).length,1);
 for(const x of [{speedKnots:null},{distanceNm:2},{seen:iso(1)},{state:'approaching'},{id:'different'},{lat:NaN},{name:null}])assert.deepEqual(core.freshNearLock(data([{...observed(),...x}]),false,NOW),[]);
});
test('plain observation wording distinguishes zero and very small nonzero speed',()=>{
 const s=core.visitorState(data(),false,NOW);assert.match(s.headline,/TEST FREIGHTER/);assert.match(s.detail,/2 min ago/);assert.match(s.detail,/Arrival timing is uncertain/);
 assert.match(core.visitorState(data([{...observed(),speedKnots:0}]),false,NOW).headline,/zero speed/);
 assert.match(core.visitorState(data([{...observed(),speedKnots:.01}]),false,NOW).detail,/less than 0.1 knots/);
});
test('actual API returns separate near-lock state and preserves normal candidate selection',async t=>{
 t.mock.method(Date,'now',()=>NOW);
 const feature={type:'Feature',geometry:{type:'Point',coordinates:[v.lon,v.lat]},properties:{mmsi:v.mmsi,name:v.name,seen:v.seen,sog:v.speedKnots,cog:90,heading:90,type:70,length:200,source:'fixture'}};
 const raw={type:'FeatureCollection',features:[feature,{...feature,properties:{...feature.properties,mmsi:'366123457',seen:iso(-6)}}],attribution:{fixture:'Fixture'}};
 t.mock.method(global,'fetch',async url=>{if(String(url).includes('ais.openwaters.io'))return {ok:true,json:async()=>raw};throw Error('harness offline');});
 const res={setHeader(){},status(n){this.code=n;return this;},json(v){this.body=v;}};
 await handler({method:'GET'},res);
 assert.equal(res.code,200);assert.equal(res.body.nextShip.ok,true);
 assert.deepEqual(res.body.nextShip.nearLockMotion.map(s=>s.mmsi),[v.mmsi]);
 assert.equal(res.body.nextShip.pick,null);assert.equal(res.body.nextShip.candidates.length,0);
 assert.equal(res.body.vessels.length,2);
});

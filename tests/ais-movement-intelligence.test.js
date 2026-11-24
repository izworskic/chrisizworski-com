'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const common=require('../lib/soo-ais'),duluth=require('../lib/duluth-canal'),soo=require('../lib/soo-locks-next');
const now=Date.parse('2026-09-25T01:30:00Z');
const feature=(p={},coords=[-84.35,46.5])=>({type:'Feature',id:366904910,geometry:{type:'Point',coordinates:coords},properties:{mmsi:366904910,name:'TEST SHIP',seen:'2026-09-25T01:25:00Z',sog:12,cog:270,heading:271,type:70,length:230,source:'aishub',destination:'DULUTH',...p}});
const raw=features=>({type:'FeatureCollection',features,attribution:{aishub:'source credit'}});
const normalize=(engine,features)=>engine.normalize(raw(features),now,[40,-93,49,-76]).vessels;
const engines=[common,duluth,soo];
test('all three AIS engines distinguish missing motion from actual zero and reject AIS sentinels',()=>{
 for(const e of engines){
  for(const x of [null,undefined,'',false,102.2,102.3]){
   const v=normalize(e,[feature({sog:x,cog:360,heading:511})])[0];
   assert.equal(v.speedKnots,null);assert.equal(v.course,null);assert.equal(v.heading,null);
   assert.equal(v.motion.state,'unknown');
  }
  const v=normalize(e,[feature({sog:0,cog:0,heading:0})])[0];
  assert.equal(v.speedKnots,0);assert.equal(v.heading,0);assert.equal(v.motion.state,'low-reported-speed');
  assert.equal(v.motion.courseOverGround,null);
 }
});
test('position evidence is separate from motion; local and malformed timestamps are rejected',()=>{
 for(const e of engines){
  const v=normalize(e,[feature({seen:'2026-09-25T01:10:00Z'})])[0];
  assert.equal(v.motion.state,'unknown');assert.equal(v.motion.approachEligible,false);
  assert.equal(normalize(e,[feature({seen:'2026-09-25T01:25:00'})]).length,0);
  assert.equal(normalize(e,[feature({seen:'2026-09-24T24:00:00Z'})]).length,0);
  assert.equal(normalize(e,[feature({seen:'2026-09-25T01:30:30Z'})])[0].motion.approachEligible,false);
  assert.equal(normalize(e,[feature({heading:90,cog:null})])[0].motion.approachEligible,false);
 }
});
test('contradictory same-time latest positions or motion cannot win by feed order',()=>{
 for(const e of engines){
  const older=feature({seen:'2026-09-25T01:24:00Z'}),a=feature(),b=feature({sog:2},[-84.34,46.51]);
  for(const order of [[older,a,b],[b,older,a],[a,b,older]])assert.equal(normalize(e,order).length,0);
  assert.equal(normalize(e,[a,a]).length,1);
  const newer=feature({seen:'2026-09-25T01:26:00Z'});
  assert.equal(normalize(e,[a,b,newer]).length,1);
 }
});
test('existing Soo and Duluth estimates reject aged or future reports and unknown course',()=>{
 const v={mmsi:'316001234',name:'SHIP',lat:46.4735,lon:-84.459,seen:'2026-09-25T01:25:00Z',speedKnots:9,course:65,shipType:70,lengthMeters:225,destination:'NANTICOKE'};
 const d={...v,lat:46.8,lon:-91.8,course:270,destination:'DULUTH'};
 for(const [e,ship] of [[soo,v],[duluth,d]]){
  assert.ok(e.buildCandidate(ship,now));
  for(const patch of [{seen:'2026-09-25T01:10:00Z'},{seen:'2026-09-25T01:30:30Z'},{speedKnots:102.2},{course:null},{speedKnots:0}]){
   assert.equal(e.buildCandidate({...ship,...patch},now),null);
  }
 }
});
test('256 seeded replays keep newest independent report or abstain on conflict',()=>{
 let seed=0x4125abc0;
 const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<256;i++){
  const conflict=i%2===0;
  const latest=feature({sog:Math.floor(rand()*20),seen:'2026-09-25T01:26:00Z'});
  const rows=[feature(),latest,conflict?{...latest,geometry:{type:'Point',coordinates:[-84.34,46.51]}}:latest];
  for(let j=rows.length-1;j>0;j--){const k=Math.floor(rand()*(j+1));[rows[j],rows[k]]=[rows[k],rows[j]];}
  for(const e of engines){
   const result=normalize(e,rows);
   assert.equal(result.length,conflict?0:1);
   if(!conflict){assert.equal(result[0].speedKnots,latest.properties.sog);assert.equal(result[0].seen,'2026-09-25T01:26:00.000Z');}
  }
 }
});

test('browser and server use one AIS evidence policy, with exact expiry boundaries',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const source=fs.readFileSync('public/assets/ais-movement.js','utf8');
 const context={window:{}};vm.runInNewContext(source,context);
 const browser=context.window.GreatLakesAisEvidence,server=require('../lib/ais-movement');
 assert.equal(server,require('../public/assets/ais-movement'));
 for(const age of [-1,0,899999,900000,900001,1799999,1800000,1800001])
 for(const speedKnots of [null,0,0.5,1.49,1.5,12,102.2])
 for(const course of [null,0,270,360]){
  const v={mmsi:'316001234',lat:46.5,lon:-84.35,seen:new Date(now-age).toISOString(),speedKnots,course};
  assert.equal(browser.positionFresh(v,now),age>=0&&age<=1800000);
  assert.equal(browser.positionFresh(v,now),server.positionFresh(v,now));
  assert.equal(JSON.stringify(browser.motion(v,now)),JSON.stringify(server.motion(v,now)));
  assert.equal(browser.eligibleApproach(v,now),age>=0&&age<=900000&&speedKnots>=1.5&&speedKnots<102.2&&course!==null&&course<360);
 }
 for(const [page,asset] of [['great-lakes-freighter-tracking','freighter-tracker'],['welland-canal','welland-canal']]){
  const html=fs.readFileSync('public/'+page+'/index.html','utf8');
  const common=html.indexOf('/assets/ais-movement.js?v='),consumer=html.indexOf('/assets/'+asset+'.js?v=');
  assert.ok(common>=0&&consumer>common);
  const js=fs.readFileSync('public/assets/'+asset+'.js','utf8');
  assert.match(js,/GreatLakesAisEvidence\?\.positionFresh/);
  assert.match(js,/GreatLakesAisEvidence\?\.motion/);
 }
});

test('shared passage alignment handles circular bearings, boundary tolerance and missing evidence',()=>{
 const e=require('../lib/ais-movement');
 const v={mmsi:'316001234',lat:46.5,lon:-84.35,seen:new Date(now-1000).toISOString(),speedKnots:9,course:0};
 for(const bearing of [0,1,45,90,135,180,225,270,315,359,360])
 for(const course of [0,1,44,45,46,89,90,134,135,136,180,224,225,226,269,270,314,315,316,359])
 for(const tolerance of [0,30,45,60,70]){
  const result=e.passageRelation({...v,course},now,bearing,tolerance);
  const difference=Math.min(Math.abs(course-bearing),360-Math.abs(course-bearing));
  assert.equal(result.alignmentDegrees,difference);
  assert.equal(result.state,difference<=tolerance?'aligned':difference>=180-tolerance?'opposed':'crosswise');
 }
 for(const patch of [{course:null},{course:360},{speedKnots:1.49},{speedKnots:102.2},{lat:null},{seen:new Date(now-900001).toISOString()},{seen:new Date(now+1).toISOString()}]){
  const result=e.passageRelation({...v,...patch},now,0,45);
  assert.equal(result.state,'unknown');assert.equal(result.alignmentDegrees,null);
 }
 for(const [bearing,tolerance] of [[null,45],[NaN,45],[361,45],[0,-1],[0,90]]){
  assert.equal(e.passageRelation(v,now,bearing,tolerance).state,'unknown');
 }
});
test('Soo and Duluth retain their local approach models and use shared passage evidence',()=>{
 const fs=require('node:fs');
 for(const file of ['lib/soo-locks-next.js','lib/duluth-canal.js','public/assets/welland-canal.js'])
  assert.match(fs.readFileSync(file,'utf8'),/passageRelation\(/);
 const snapshot=require('./fixtures/soo-river-2026-09-27.json'),t=Date.parse(snapshot.now);
 const rows=soo.normalize(snapshot.response,t).vessels;
 assert.deepEqual(soo.buildCandidates(rows,t).map(v=>v.name),['ROBERT S. PIERSON']);
 assert.deepEqual(soo.inLockList(rows,t).map(v=>v.name),['MESABI MINER']);
});

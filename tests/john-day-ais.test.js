'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assess,BBOX,AIS_URL}=require('../lib/john-day-ais');
const handler=require('../api/john-day-ais');
function response(){return {headers:{},code:200,body:null,
 setHeader(k,v){this.headers[k]=v;return this},status(v){this.code=v;return this},json(v){this.body=v;return this}}}
const NOW=Date.parse('2026-10-22T20:00:00Z');
const item=(mmsi,lon,lat,ageMins,kind='vessel',seen=true)=>({
 type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{
  mmsi,kind,name:'TEST TUG '+mmsi,seen:seen?new Date(NOW-ageMins*60000).toISOString():null,
  source:'example-receiver',sog:3.2,cog:90
 }});
test('query box uses Open Waters lat lon order and <=30 minutes',()=>{
 assert.deepEqual(BBOX,[45.45,-121.3,45.95,-120]);assert.equal(AIS_URL,'https://ais.openwaters.io/v1/vessels?bbox='+BBOX.join(',')+'&max_age=30m&kind=vessel');
});
test('fresh AIS is reported as observation only; stale and out-of-area excluded',()=>{
 const data={type:'FeatureCollection',features:[
  item(367111111,-120.7,45.73,4),item(367222222,-120.72,45.72,35),
  item(367333333,-119.12,45.90,3),item(367444444,-120.8,45.7,4,'aton')
 ],attribution:{'example-receiver':'Receiver attribution test'}};
 const result=assess(data,NOW);
 assert.equal(result.observationState,'recent-reports');assert.equal(result.vesselCount,1);
 assert.equal(result.vessels[0].mmsi,'367111111');assert.equal(result.coverageState,'unverified');
 assert.equal(result.lockStatus,'unknown');assert.equal(result.lockQueue,'unknown');
 assert.ok(!('eta' in result));assert.ok(!('estimatedArrival' in result));
});
test('empty response is unknown coverage and not a proof of empty river',()=>{
 const result=assess({type:'FeatureCollection',features:[],attribution:{}},NOW);
 assert.equal(result.observationState,'no-recent-reports');assert.equal(result.vesselCount,0);
 assert.equal(result.coverageState,'unverified');assert.match(result.caveat,/silence/i);
});
test('no stale or future report may be shown',()=>{
 const data={type:'FeatureCollection',features:[
  item(367111111,-120.7,45.73,-8),item(367222222,-120.72,45.72,32)
 ]};
 assert.equal(assess(data,NOW).vesselCount,0);
});
test('unrecognized JSON and technical failure fail closed',async()=>{
 assert.throws(()=>assess({vessels:[]},NOW),/Invalid AIS/);
 const old=global.fetch;global.fetch=async()=>{throw Error('provider down')};
 try{const res=response();await handler({method:'GET'},res);
  assert.equal(res.code,502);assert.equal(res.body.observationState,'unavailable');
  assert.equal(res.headers['Cache-Control'],'no-store');assert.equal(res.body.lockStatus,'unknown');
 }finally{global.fetch=old}
});
test('endpoint exposes source attribution and cache without navigation claims',async()=>{
 const old=global.fetch;global.fetch=async()=>({ok:true,json:async()=>({type:'FeatureCollection',features:[],attribution:{}})});
 try{const res=response();await handler({method:'GET'},res);
  assert.equal(res.code,200);assert.equal(res.body.observationState,'no-recent-reports');
  assert.equal(res.body.coverageState,'unverified');assert.match(res.headers['Cache-Control'],/s-maxage=90/);
 }finally{global.fetch=old}
});
test('unsafe HTTP methods do not fetch the upstream',async()=>{
 const res=response();await handler({method:'POST'},res);assert.equal(res.code,405);
});

test('Soo-compatible reports without optional kind reach John Day cards',()=>{
 const feature=item(367111111,-120.7,45.73,4);delete feature.properties.kind;
 const raw={type:'FeatureCollection',features:[feature]};
 const shared=require('../lib/soo-ais').normalize(raw,NOW,BBOX);
 assert.deepEqual(assess(raw,NOW).vessels,shared.vessels);
});

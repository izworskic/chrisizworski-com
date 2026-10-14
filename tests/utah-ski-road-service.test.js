'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createService,summarize,safeContext}=require('../lib/utah-ski/road-service');
const at=Date.parse('2027-01-09T16:00:00Z');
const row={RoadwayName:'SR-210 Little Cottonwood Canyon',RoadCondition:'Snow Packed',WeatherCondition:'Snow',Restriction:'Chains Required',LastUpdated:at/1000-60};
function source(){
 const make=r=>({route:r,canyon:r==='SR190'?'Big Cottonwood Canyon':'Little Cottonwood Canyon',status:'NO_CONFIRMED_BLOCKER',reason:'NO_BLOCKER_IN_RECEIVED_FEEDS',signals:[],observedAt:new Date(at).toISOString()});
 return {health:{events:'RECEIVED',roadconditions:'RECEIVED',messagesigns:'RECEIVED'},canyons:{SR190:make('SR190'),SR210:make('SR210')},roadconditions:{rows:[row]}};
}
test('public cache single-flight shares one 3-feed snapshot across concurrent callers',async()=>{
 let n=0,now=at;
 const service=createService({clock:()=>now,load:async()=>{n++;return source()}});
 const values=await Promise.all(Array.from({length:35},()=>service.get('test-key')));
 assert.equal(n,1);assert.ok(values.every(x=>x.observedAt===values[0].observedAt));
 now+=8*60*1000;await service.get('test-key');assert.equal(n,1);
 now+=3*60*1000;await service.get('test-key');assert.equal(n,2);
});
test('provider rejection and missing key remain unknown and back off',async()=>{
 let count=0;
 const svc=createService({clock:()=>at,load:async()=>{count++;return {health:{events:'RATE_LIMITED',roadconditions:'RATE_LIMITED',messagesigns:'RATE_LIMITED'}}}});
 let x=await svc.get('bad');assert.equal(x.sourceHealth,'UNAVAILABLE');
 assert.ok(Object.values(x.canyons).every(v=>v.status==='UNKNOWN'));
 await svc.get('bad');assert.equal(count,1);
 const blank=await createService({clock:()=>at}).get('');
 assert.ok(Object.values(blank.canyons).every(v=>v.status==='UNKNOWN'));
 assert.doesNotMatch(JSON.stringify(blank),/secret|test-key/);
});
test('partial feeds never imply no blocker or open road',()=>{
 const d=source();d.health.messagesigns='HTTP_ERROR';const x=summarize(d,at);
 assert.equal(x.sourceHealth,'PARTIAL');
 assert.equal(x.canyons.SR210.status,'UNKNOWN');assert.equal(x.canyons.SR210.openConfirmed,false);
});
test('source details are route-specific and freshness-gated',()=>{
 const reports=safeContext([row,{...row,RoadwayName:'SR-190 Big Cottonwood Canyon'}],'SR210',at/1000);
 assert.equal(reports.length,1);assert.equal(reports[0].surface,'Snow Packed');
 assert.equal(safeContext([row],'SR210',at/1000+3600).length,0);
});
test('no response includes UDOT developer URL or upstream key',()=>{
 const x=summarize(source(),at);
 assert.ok(Object.keys(x.apiCoverage).length===3);
 assert.equal(x.canyons.SR210.surfaceReports.length,1);
 assert.doesNotMatch(JSON.stringify(x),/api\/v2\/get\/|\?key=/);
});

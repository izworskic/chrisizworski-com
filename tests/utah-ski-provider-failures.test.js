'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {diagnostic}=require('../lib/utah-ski/udot-fetch');
const N=Math.floor(Date.parse('2027-01-09T16:00:00Z')/1000);
const empty=()=>[];
const sampleClosure=[{ID:'E1',RoadwayName:'SR-210 Little Cottonwood Canyon',Location:'Little Cottonwood Canyon',
 Description:'Little Cottonwood Canyon closed to all traffic',IsFullClosure:true,StartDate:N-300,PlannedEndDate:N+3000,LastUpdated:N-60}];
const run=fetchImpl=>diagnostic({key:'FAKE_TEST_KEY',fetchImpl,now:N});
test('provider: unauthorized key does not become clear conditions',async()=>{
 const result=await run(async()=>({ok:false,status:401}));
 assert.deepEqual(new Set(Object.values(result.health)),new Set(['AUTH_REJECTED']));
 assert.equal(result.canyons.SR210.status,'UNKNOWN');
 assert.equal(result.canyons.SR210.openConfirmed,false);
});
test('provider: 429 rate limiting is distinguished from other upstream errors',async()=>{
 const result=await run(async()=>({ok:false,status:429}));
 assert.deepEqual(new Set(Object.values(result.health)),new Set(['RATE_LIMITED']));
 assert.notEqual(result.canyons.SR210.status,'NO_CONFIRMED_BLOCKER');
});
test('provider: server errors cannot create an open-road statement',async()=>{
 const result=await run(async()=>({ok:false,status:503}));
 assert.deepEqual(new Set(Object.values(result.health)),new Set(['HTTP_ERROR']));
 assert.equal(result.canyons.SR190.status,'UNKNOWN');
});
test('provider: malformed JSON cannot be interpreted as road open',async()=>{
 const result=await run(async()=>({ok:true,json:async()=>({items:[]})}));
 assert.deepEqual(new Set(Object.values(result.health)),new Set(['INVALID_SCHEMA']));
 assert.equal(result.canyons.SR210.status,'UNKNOWN');
});
test('provider: invalid JSON and transport rejection both remain unknown',async()=>{
 const result=await run(async()=>({ok:true,json:async()=>{throw new SyntaxError('HTML instead of JSON');}}));
 assert.deepEqual(new Set(Object.values(result.health)),new Set(['REQUEST_FAILED']));
 assert.equal(result.canyons.SR190.status,'UNKNOWN');
 const thrown=await run(async()=>{throw new Error('offline');});
 assert.equal(thrown.canyons.SR210.status,'UNKNOWN');
});
test('provider: partial data loss does not hide explicit active closure from surviving event feed',async()=>{
 const result=await run(async url=>url.includes('/event?')?{ok:true,json:async()=>sampleClosure}:{ok:false,status:503});
 assert.equal(result.canyons.SR210.status,'CLOSED');
 assert.equal(result.canyons.SR190.status,'UNKNOWN');
 assert.equal(result.health.events,'RECEIVED');
});
test('provider: healthy but empty JSON arrays do not prove open road',async()=>{
 const result=await run(async()=>({ok:true,json:empty}));
 assert.deepEqual(new Set(Object.values(result.health)),new Set(['RECEIVED']));
 assert.equal(result.canyons.SR210.status,'UNKNOWN');
 assert.equal(result.canyons.SR210.openConfirmed,false);
});

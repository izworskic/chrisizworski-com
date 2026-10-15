'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {URLS,assessAlerts,loadGrandMaraisHazards}=require('../lib/rockhounding/nws-shore-hazards.cjs');
const now='2026-10-15T12:00:00.000Z';
const ok=(features=[])=>({ok:true,data:{features:features.map(properties=>({properties}))}});
test('both nearshore marine zones and local shoreline point are covered',()=>{
 assert.equal(URLS.length,3);assert.ok(URLS.some(u=>u.includes('LSZ250')));
 assert.ok(URLS.some(u=>u.includes('LSZ251')));assert.ok(URLS.some(u=>u.includes('?point=')));
});
test('high surf and gale warnings veto despite other clean zones',()=>{
 const state=assessAlerts([ok([{event:'Gale Warning',expires:'2026-10-16T12:00:00Z'}]),ok(),ok()],now);
 assert.equal(state.status,'ACTIVE');assert.equal(state.alerts.length,1);
});
test('small craft advisory remains a conservative veto',()=>{
 const s=assessAlerts([ok(),ok([{event:'Small Craft Advisory',expires:'2026-10-16T12:00:00Z'}]),ok()],now);
 assert.equal(s.status,'ACTIVE');
});
test('partial feed outage is UNKNOWN unless a positive alert already exists',()=>{
 assert.equal(assessAlerts([ok(),{ok:false},ok()],now).status,'UNKNOWN');
 assert.equal(assessAlerts([ok([{event:'Beach Hazards Statement'}]),{ok:false},ok()],now).status,'ACTIVE');
});
test('historically expired alerts are not active but a good response does not mean safe',()=>{
 const s=assessAlerts([ok([{event:'Gale Warning',expires:'2026-10-14T12:00:00Z'}]),ok(),ok()],now);
 assert.equal(s.status,'CLEAR');assert.match(s.caveat,/NOT proof/);
});
test('adapter fails closed on HTTP error and handles positive NWS result',async()=>{
 let n=0;
 const fetchFn=async()=>{
  n++;if(n===2)return {ok:false};
  return {ok:true,json:async()=>({features:n===1?[{properties:{event:'High Surf Advisory'}}]:[]})};
 };
 const r=await loadGrandMaraisHazards({fetchFn,nowISO:now});
 assert.equal(r.status,'ACTIVE');assert.equal(r.partialSourceFailure,true);assert.equal(r.sources.length,3);
});
test('empty NWS responses are UNKNOWN rather than safe clearance',async()=>{
 const r=await loadGrandMaraisHazards({fetchFn:async()=>({ok:true,json:async()=>({})}),nowISO:now});
 assert.equal(r.status,'UNKNOWN');
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),w=require('../public/assets/welland-viewing-intelligence');
const T=Date.parse('2026-11-25T15:00:00Z'),M=60000,iso=n=>new Date(T+n*M).toISOString();
const locks=[{id:'3',lat:43.155230,lon:-79.193058},{id:'7',lat:43.123446,lon:-79.193895},{id:'8',lat:42.899122,lon:-79.246166}];
const vessel=(id,place=locks[0],extra={})=>({mmsi:String(366000000+id),shipType:70,seen:iso(-2),speedKnots:3,course:180,...place,...extra});
const data=(vessels,checkedAt=iso(0))=>({ok:true,checkedAt,vessels});
const run=(vessels,now=T)=>w.compare(data(vessels),now,locks);
test('only one public area has recent nearby cargo or tanker reports',()=>{
  const r=run([vessel(1,locks[1]),vessel(2,locks[2],{shipType:37})]);
  assert.equal(r.status,'single');assert.deepEqual(r.supported,['7']);assert.equal(r.areas[1].count,1);assert.equal(r.areas[1].latest,T-2*M);
});
test('multiple areas are not ranked by report counts',()=>{
  const r=run([vessel(1),vessel(2),vessel(3,locks[2],{shipType:89})]);
  assert.equal(r.status,'multiple');assert.deepEqual(r.supported,['3','8']);
});
test('overlapping areas share one vessel instead of independent evidence',()=>{
  const point={lat:(locks[0].lat+locks[1].lat)/2,lon:(locks[0].lon+locks[1].lon)/2};
  const r=run([vessel(1,point)]);assert.equal(r.status,'multiple');assert.equal(r.shared,1);assert.deepEqual(r.supported,['3','7']);assert.equal(r.areas[0].shared,1);
});
test('freshness uses check and observation times, exact inclusive boundaries',()=>{
  assert.equal(run([vessel(1,locks[0],{seen:iso(-15)})]).status,'single');
  assert.equal(run([vessel(1,locks[0],{seen:new Date(T-15*M-1).toISOString()})]).status,'none');
  assert.equal(run([vessel(1)],T+5*M).status,'single');assert.equal(run([vessel(1)],T+5*M+1).status,'unavailable');
  assert.equal(run([vessel(1,locks[0],{seen:iso(1)})]).status,'none');assert.equal(w.compare(data([],iso(1)),T,locks).status,'unavailable');
});
test('duplicates, out-of-order and contradictory newest reports never inflate evidence',()=>{
  const first=vessel(1);assert.equal(run([first,first]).areas[0].count,1);
  assert.deepEqual(run([first,vessel(1,locks[2],{seen:iso(-1)})]).supported,['8']);
  assert.equal(run([first,vessel(1,locks[2])]).status,'none');
  assert.equal(run([first,vessel(1,locks[2],{seen:iso(-1),shipType:37})]).status,'none');
});
test('invalid inputs, no reports, other vessel types and remote coordinates fail closed',()=>{
  assert.equal(w.compare({ok:false},T,locks).status,'unavailable');assert.equal(w.compare(data([]),T,[]).status,'unavailable');
  assert.equal(run([]).status,'none');assert.equal(run([vessel(1,locks[0],{shipType:null}),vessel(2,{lat:43.25,lon:-79.15}),vessel(3,{lat:999,lon:-79.19})]).status,'none');
  assert.equal(run([vessel(1,locks[0],{shipType:70.5})]).status,'none');
});
test('distance is geographic kilometers and comparisons never imply occupancy or arrival',()=>{
  assert.equal(w.distanceKm(locks[0],locks[0]),0);assert.ok(w.distanceKm(locks[0],locks[1])>3.4&&w.distanceKm(locks[0],locks[1])<3.6);
  const r=run([vessel(1)]);assert.equal('eta' in r,false);assert.equal('occupancy' in r,false);
});

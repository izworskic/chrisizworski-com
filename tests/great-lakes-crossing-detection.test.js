'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {detect,gate,provisionalGates,coordinates}=require('../scripts/detect-great-lakes-crossings.cjs');
const {replay}=require('../scripts/benchmark-great-lakes-passage.cjs');
const g=gate('fixture','soo',{lat:46,lon:-84},90,60,'downbound','upbound','synthetic finite segment');
const t0=Date.parse('2024-09-04T12:00:00Z'),M=111195,scale=M*Math.cos(46*Math.PI/180);
function p(min,x,y=0,id='366123456',type=70){return {mmsi:id,seen:new Date(t0+min*60000).toISOString(),lat:46+y/M,lon:-84+x/scale,shipType:type};}
const good=[p(0,-80),p(1,-35),p(2,35),p(3,80)];
const doc=observations=>({schemaVersion:1,kind:'synthetic',source:{url:'https://example.invalid/fixture',receiptSha256:'a'.repeat(64),review:'constructed test'},start:'2024-09-04T00:00:00Z',end:'2024-09-05T00:00:00Z',observations});
const run=rows=>detect(doc(rows),[g]);
test('finite crossing produces only an unreviewed bracket; input order irrelevant',()=>{
 const a=run(good),b=run([...good].reverse());assert.deepEqual(a,b);
 assert.equal(a.report.candidates,1);assert.equal(a.review[0].direction,'downbound');
 assert.equal(a.review[0].start,good[1].seen);assert.equal(a.review[0].end,good[2].seen);
 assert.equal(a.review[0].bracketSeconds,60);assert.equal(a.review[0].eligibleForReplay,false);
 assert.equal(a.report.independentlyReviewedCrossings,0);assert.equal(a.report.fieldAccuracyVerified,false);
 assert.equal(JSON.stringify(a.report).includes('366123456'),false);
 assert.equal(run(good.map((v,i)=>({...v,lon:good[3-i].lon}))).review[0].direction,'upbound');
});
test('exact-on-axis point is bracketed by observed stable sides, not invented time',()=>{
 const a=run([p(0,-80),p(1,-35),p(2,0),p(3,35),p(4,80)]);
 assert.equal(a.report.candidates,1);assert.equal(a.review[0].bracketSeconds,120);
 assert.equal(run([p(0,-80),p(1,-35),p(2,0),p(3,0),p(4,35),p(5,80)]).report.candidates,0);
});
test('withhold long gaps, missing context, and crossing outside finite segment',()=>{
 const a=run([p(0,-80),p(1,-35),p(7,35),p(8,80)]);
 assert.equal(a.report.candidates,0);assert.equal(a.report.byGate.fixture.withheld.crossing_gap,1);
 assert.equal(run(good.slice(1,3)).report.byGate.fixture.withheld.missing_context,1);
 const edge=run(good.map((v,i)=>p(i,[-80,-35,35,80][i],58)));
 assert.equal(edge.report.byGate.fixture.withheld.outside_finite_gate,1);
 assert.equal(run(good.map((v,i)=>p(i,[-80,-35,35,80][i],300))).report.candidates,0);
 assert.equal(run([p(0,-80),p(7,-35),p(8,35),p(9,80)]).report.byGate.fixture.withheld.context_gap,1);
});
test('duplicate observations collapse; conflicting or missing observations break the track',()=>{
 const a=run([...good,good[1]]);assert.equal(a.report.counts.duplicates,1);assert.equal(a.report.candidates,1);
 const b=run([...good,p(1,-40)]);assert.equal(b.report.counts.conflicts,1);assert.equal(b.report.candidates,0);
 assert.equal(run([...good,{...p(1.5,0),lat:null}]).report.candidates,0);
 assert.equal(run([...good,p(1.5,0,0,'366123456',60)]).report.candidates,0);
});
test('reject impossible displacement, reversals and repeated candidates; no proximity or stationary labels',()=>{
 const fast=run([p(0,-1300),p(.1,-500),p(.2,500),p(.3,1300)]);
 assert.equal(fast.report.byGate.fixture.withheld.implausible_displacement,1);
 const reversal=run([p(0,-80),p(1,-35),p(2,-2),p(3,-15),p(4,35),p(5,80)]);
 assert.equal(reversal.report.candidates,0);
 assert.equal(run([p(0,-35),p(1,-35),p(2,-35),p(3,-35)]).report.candidates,0);
 const repeated=run([...good,p(5,80),p(6,35),p(7,-35),p(8,-80)]);
 assert.equal(repeated.report.candidates,0);assert.equal(repeated.report.byGate.fixture.withheld.repeated_or_competing_gate,2);
});
test('strict provenance, UTC and scope; candidates cannot satisfy replay outcome contract',()=>{
 assert.throws(()=>run([{...good[0],seen:'2024-09-04T12:00:00'}]));
 assert.throws(()=>run([{...good[0],seen:'2024-09-31T12:00:00Z'}]));
 assert.throws(()=>run([{...good[0],seen:'2024-09-05T00:00:00Z'}]));
 assert.throws(()=>detect({...doc(good),source:{url:'https://example.invalid'}},[g]));
 const candidate=run(good).review[0];
 assert.throws(()=>replay({schemaVersion:1,kind:'historical-review',source:{url:'https://example.invalid',review:'fixture'},holdoutStartsAt:'2024-09-21T00:00:00Z',issues:[{id:'x',site:'soo',issuedAt:good[0].seen,availableAt:good[0].seen,vessel:good[0],outcome:candidate}]}),/Missing outcome status/);
});
test('three site references remain provisional, finite and distinct from model outcome labels',()=>{
 const gates=provisionalGates();assert.equal(gates.length,3);
 for(const g of gates){assert.equal(g.geometryStatus,'PROVISIONAL_REFERENCE_NOT_SURVEYED');assert.ok(g.halfWidth>=15);assert.equal(coordinates(g,g.center).normal,0);}
 assert.notEqual(gates[2].center.lon,require('../lib/duluth-canal').CANAL.lon);
});

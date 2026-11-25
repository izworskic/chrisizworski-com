'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {leadBin,motionSpans,describe,aggregate}=require('../scripts/great-lakes-decision-time-delay-diagnostics.cjs');
const M=60000;
test('fixed predicted lead strata and bounds',()=>{
 assert.equal(leadBin(15),'15_to_under_30');assert.equal(leadBin(30),'30_to_under_45');assert.equal(leadBin(45),'45_to_60');assert.equal(leadBin(60),'45_to_60');assert.throws(()=>leadBin(61));
});
test('motion spans clip at issue and earliest crossing, never bridge gaps or unknown speed',()=>{
 const p=speedKnots=>({speedKnots});
 const track=[[0,p(.2)],[3*M,p(.3)],[6*M,p(1)],[9*M,p(1)],[12*M,p(null)],[20*M,p(0)],[23*M,p(0)]];
 assert.deepEqual(motionSpans(track,1*M,22*M),{coveredMinutes:13,knownSpeedMinutes:10,lowEndpointMinutes:4,slowEndpointMinutes:10});
});
test('matched diagnostics do not erase unresolved denominators or invent queue causality',()=>{
 const issue={issuedAt:0,midpoint:30*M,direction:'upbound'};
 const track=[[0,{speedKnots:.2}],[3*M,{speedKnots:.3}],[6*M,{speedKnots:.2}]];
 const a=describe(issue,{status:'matched',evidence:{lo:40*M,hi:42*M}},track,{old:{contained:0},next:{contained:1}});
 const b=describe({...issue,direction:'downbound'},{status:'no_detected_crossing_incomplete'},track,null);
 const q=aggregate([a,b]);
 assert.equal(q.overall.issued,2);assert.equal(q.overall.matched,1);assert.equal(q.overall.unresolved,1);
 assert.deepEqual(q.overall.meanSignedResidualBoundsMinutes,[10,12]);assert.equal(q.overall.matchedWithAtLeastFiveLowEndpointMinutes,1);
 assert.equal(q.byDirection.downbound.meanObservedLeadBoundsMinutes,null);assert.equal(q.byPredictedLead['30_to_under_45'].issued,2);
 assert.equal(q.productionCalibrationAuthorized,false);
});

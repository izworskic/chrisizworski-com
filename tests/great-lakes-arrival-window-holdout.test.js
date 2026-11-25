'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {freeze,scorePair,summarize,criteria}=require('../scripts/great-lakes-arrival-window-holdout.cjs');
const plan=require('../docs/research/great-lakes-arrival-window-study-plan.json');
const MIN=60000;
const frozen={margins:{earlyMinutes:10,lateMinutes:24},holdoutDates:plan.reservedHoldoutDates,freezeSha256:'a'.repeat(64)};
test('freeze requires full sufficient development cohort',()=>{assert.throws(()=>freeze([]),/Complete and sufficient/);});
test('paired width penalty and miss penalty use one uncertain outcome',()=>{
 const q=scorePair({issuedAt:0,midpoint:30*MIN,start:20*MIN,end:40*MIN,lo:48*MIN,hi:50*MIN},frozen);
 assert.deepEqual(q.old,{contained:0,overlap:0,width:20});assert.deepEqual(q.next,{contained:1,overlap:1,width:34});
 assert.equal(q.lossDeltaLower,-26);assert.equal(q.lossDeltaUpper,-18);
 const on=scorePair({issuedAt:0,midpoint:30*MIN,start:20*MIN,end:40*MIN,lo:28*MIN,hi:32*MIN},frozen);assert.equal(on.lossDeltaUpper,14);
 assert.throws(()=>scorePair({issuedAt:0,midpoint:30*MIN,start:20*MIN,end:40*MIN,lo:32*MIN,hi:40*MIN},frozen));
});
const day=(date,i,n=4)=>({kind:'FROZEN_WINDOW_HOLDOUT_DAY',date,freezeSha256:frozen.freezeSha256,sourceReceiptSha256:(i+1).toString(16).padStart(64,'0'),candidates:n+1,counts:{scored:n,model_abstained:1},scored:n,oldContained:n/2,nextContained:n,oldOverlap:n/2,nextOverlap:n,oldWidthSum:n*20,nextWidthSum:n*30,lossDeltaLowerSum:-n*5,lossDeltaUpperSum:-n,productionCalibrationAuthorized:false});
test('all dates and explicit coverage, width and paired cost gates are required',()=>{
 const days=plan.reservedHoldoutDates.map((d,i)=>day(d,i));
 assert.equal(summarize(days.slice(0,2),frozen).status,'HOLDOUT_INCOMPLETE');
 const q=summarize(days,frozen);assert.equal(q.status,'EXPLORATORY_CRITERIA_MET');assert.equal(q.metrics.scored,12);assert.equal(q.metrics.proposedContainment,1);assert.equal(q.productionCalibrationAuthorized,false);
 assert.equal(summarize(days.map(d=>({...d,nextWidthSum:50*d.scored})),frozen).status,'EXPLORATORY_CRITERIA_NOT_MET');
 assert.equal(summarize(days.map(d=>({...d,lossDeltaUpperSum:1})),frozen).status,'EXPLORATORY_CRITERIA_NOT_MET');
 assert.equal(summarize(plan.reservedHoldoutDates.map((d,i)=>day(d,i,2)),frozen).status,'INSUFFICIENT_HOLDOUT_EVIDENCE');
 assert.throws(()=>summarize([days[0],days[0]],frozen));
 assert.throws(()=>summarize([{...days[0],freezeSha256:'b'.repeat(64)}],frozen));
 assert.equal(criteria.minimumScoredEvents,10);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {freeze,verify,scorePair,summarize}=require('../scripts/great-lakes-bias-corrected-window.cjs');
const records=require('../docs/research/great-lakes-existing-model-development-evidence.json');
const prior=require('../docs/research/great-lakes-arrival-window-frozen.json');
const frozen=freeze(records,prior),M=60000;
test('actual development freeze produces 14 minute correction, disjoint ten dates',()=>{
 assert.equal(frozen.developmentMedianMinutes,14.3137);assert.equal(frozen.shiftMinutes,14);
 assert.equal(frozen.holdoutDates.length,10);assert.ok(frozen.holdoutDates.every(d=>d>'2024-09-29'));
 assert.deepEqual(verify(records,prior,frozen),frozen);
 assert.throws(()=>verify(records,prior,{...frozen,shiftMinutes:15}));
});
test('shift corrects a late bracket with bounded width; early loss remains visible',()=>{
 const late=scorePair({issuedAt:0,start:20*M,midpoint:30*M,end:40*M,lo:49*M,hi:51*M},frozen);
 assert.deepEqual(late.old,{contained:0,overlap:0,width:20});assert.deepEqual(late.next,{contained:1,overlap:1,width:32});assert.deepEqual(late.maeDelta,[-14,-14]);assert.ok(late.lossDelta[1]<0);
 const early=scorePair({issuedAt:0,start:20*M,midpoint:30*M,end:40*M,lo:20*M,hi:22*M},frozen);
 assert.equal(early.next.contained,0);assert.ok(early.maeDelta[0]>0);assert.ok(early.lossDelta[0]>0);
});
const day=(date,i)=>({kind:'BIAS_CORRECTED_WINDOW_HOLDOUT_DAY',date,freezeSha256:frozen.freezeSha256,sourceReceiptSha256:(i+1).toString(16).padStart(64,'0'),candidates:4,counts:{scored:2,model_abstained:2},scored:2,oldContained:0,nextContained:2,oldOverlap:1,nextOverlap:2,oldWidthSum:40,nextWidthSum:64,lossDeltaLowerSum:-20,lossDeltaUpperSum:-10,maeDeltaLowerSum:-20,maeDeltaUpperSum:-10,productionCalibrationAuthorized:false});
test('fixed cohort, sample, width, midpoint and cost gates must all pass',()=>{
 const days=frozen.holdoutDates.map(day);
 assert.equal(summarize(days.slice(0,9),frozen).status,'HOLDOUT_INCOMPLETE');
 const q=summarize(days,frozen);assert.equal(q.status,'EXPLORATORY_CRITERIA_MET');assert.equal(q.metrics.scored,20);assert.equal(q.metrics.proposedMeanWidthMinutes,32);assert.equal(q.productionCalibrationAuthorized,false);
 assert.equal(summarize(days.map(d=>({...d,maeDeltaUpperSum:1})),frozen).status,'EXPLORATORY_CRITERIA_NOT_MET');
 assert.throws(()=>summarize(days.map(d=>({...d,nextWidthSum:70})),frozen));
 assert.throws(()=>summarize([days[0],days[0]],frozen));
 assert.throws(()=>summarize([{...days[0],date:'2024-09-21'}],frozen));
});

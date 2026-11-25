'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {fit,rankMargin,researchWindow}=require('../scripts/great-lakes-arrival-window-research.cjs');
const {retrospect,evaluateCandidate,prepare}=require('../scripts/retrospect-great-lakes-reference.cjs');
const actual=require('../docs/research/great-lakes-window-development-residuals-2024-09.json');
const synthetic=()=>({...actual,days:Array.from({length:20},(_,i)=>({date:'2024-09-'+String(i+1).padStart(2,'0'),site:'soo',model:'existing-reference-v1',sourceReceiptSha256:(i+1).toString(16).padStart(64,'0'),inputSha256:(i+101).toString(16).padStart(64,'0'),candidateEvents:3,eligibleEstimates:2,residuals:[[-i,-i+1],[i,i+1]]}))});
test('real six-event development sample identifies late asymmetry but cannot fit margins',()=>{
 const a=fit(actual);assert.equal(a.scoredEvents,6);assert.equal(a.nonemptyDates,3);assert.equal(a.eligibleEstimates,9);assert.equal(a.candidateEvents,28);
 assert.deepEqual(a.diagnosticObservedEnvelope,{earlyMinutes:1,lateMinutes:24,entirelyLater:5,entirelyEarlier:0,bracketsContainingMidpoint:1});
 assert.equal(a.proposedMargins,null);assert.equal(a.status,'INSUFFICIENT_DEVELOPMENT_EVIDENCE');assert.equal(a.probabilityCalibrated,false);
 assert.throws(()=>researchWindow({},a));
});
test('finite order rank fails closed with insufficient blocks, uses maximum at twenty',()=>{
 assert.equal(rankMargin([1,2,3]),null);assert.equal(rankMargin(Array.from({length:20},(_,i)=>i+.1)),20);
 const a=fit(synthetic());assert.equal(a.nonemptyDates,20);assert.equal(a.scoredEvents,40);assert.deepEqual(a.proposedMargins,{earlyMinutes:19,lateMinutes:20});
 assert.equal(a.productionCalibrationAuthorized,false);assert.equal(a.probabilityCalibrated,false);
 const b=synthetic();b.days[0].residuals=[];assert.equal(fit(b).proposedMargins,null);
});
test('reject holdout, duplicated dates and receipts, mixed models, malformed residuals',()=>{
 for(const change of [d=>d.days[0].date='2024-09-21',d=>d.days[0].date='2024-09-31',d=>d.days[0].date=d.days[1].date,d=>d.days[0].sourceReceiptSha256=d.days[1].sourceReceiptSha256,d=>d.days[0].model='route-progress-v1',d=>d.days[0].residuals=[[2,1]],d=>d.days[0].residuals=[[0,6]],d=>d.days[0].eligibleEstimates=1]){const d=synthetic();change(d);assert.throws(()=>fit(d));}
});
test('research margin only extends window, preserves midpoint and issue floor',()=>{
 const m=60000,fitReport=fit(synthetic());const x=researchWindow({issuedAt:0,start:5*m,midpoint:10*m,end:40*m},fitReport);assert.deepEqual(x,{start:0,midpoint:10*m,end:40*m,productionCalibrationAuthorized:false});
 const y=researchWindow({issuedAt:0,start:20*m,midpoint:30*m,end:40*m},fitReport);assert.equal(y.start,11*m);assert.equal(y.end,50*m);
});
test('opt-in exports existing model residuals, default and holdout guard remain intact',()=>{
 const doc={schemaVersion:1,kind:'synthetic',source:{url:'https://example.invalid/fixture',receiptSha256:'a'.repeat(64),review:'constructed'},start:'2024-09-04T00:00:00Z',end:'2024-09-05T00:00:00Z',observations:[]};
 const old=retrospect(doc),next=retrospect(doc,{arrivalResiduals:true});assert.equal(old.arrivalResiduals,undefined);assert.deepEqual(old.overall,next.overall);assert.deepEqual(next.arrivalResiduals.residuals,[]);assert.equal(next.arrivalResiduals.model,'existing-reference-v1');
 assert.throws(()=>retrospect({...doc,start:'2024-09-21T00:00:00Z',end:'2024-09-22T00:00:00Z'},{arrivalResiduals:true}));
 const t=Date.parse('2024-09-04T12:00:00Z'),m=60000,iso=i=>new Date(t+i*m).toISOString(),rows=Array.from({length:32},(_,i)=>({mmsi:'366123456',seen:iso(i),lat:46.5,lon:-84.4,shipType:70,sog:8,cog:90}));
 const c={site:'soo',mmsi:'366123456',direction:'downbound',start:iso(30),end:iso(31)};
 const e={buildCandidate:()=>({direction:'downbound',channelNmToLocks:4,window:{start:iso(15),midpoint:iso(25),end:iso(35)}})};
 assert.deepEqual(evaluateCandidate(c,prepare({observations:rows}),e,{arrivalResiduals:true}).signedResidual,[5,6]);
});

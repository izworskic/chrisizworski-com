'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const plan=require('../docs/research/great-lakes-arrival-window-study-plan.json');
const {assemble}=require('../scripts/great-lakes-arrival-window-study.cjs');
const {retrospect}=require('../scripts/retrospect-great-lakes-reference.cjs');
const hash=i=>i.toString(16).padStart(64,'0'),runRef='https://github.com/izworskic/chrisizworski-com/actions/runs/123';
function record(date,i){
 const receipt=hash(i+1),input=hash(i+101),start=date+'T00:00:00Z',end=new Date(Date.parse(start)+86400000).toISOString();
 return {date,status:'COMPLETE',runRef,coverage:{kind:'NOAA_ORIGINAL_ARCHIVE_ONE_DAY_COVERAGE',status:'COVERAGE_ONLY',scanComplete:true,date,source:'https://ocmgeodatastor1.blob.core.windows.net/marinecadastre/ais2024/ais-'+date+'.parquet',etag:'fixture',rowsScanned:100,objectRows:100,rangeBytesRead:1000,rangeRequests:1,rangeReceiptSha256:receipt,selectedGeographicRows:10},report:{kind:'RETROSPECTIVE_AIS_MODEL_REFERENCE_PROXY_NOT_FIELD_VALIDATION',datasetKind:'historical-research',fieldAccuracyVerified:false,productionCalibrationAuthorized:false,receiptTimesAvailable:false,independentlyReviewedCrossings:0,scope:{start,end},issueRule:plan.issueRule,sourceReceiptSha256:receipt,inputSha256:input,detector:{counts:{inputRows:10}},bySite:{soo:{candidateEvents:3,pairedScored:2}},arrivalResiduals:{date,site:'soo',model:plan.model,sourceReceiptSha256:receipt,inputSha256:input,candidateEvents:3,eligibleEstimates:2,residuals:[[-i,-i+1],[i,i+1]]}}};
}
test('fixed dates and batches are disjoint, complete and before holdout',()=>{
 assert.equal(plan.dates.length,27);assert.deepEqual([...plan.batches.flat()].sort(),plan.dates);assert.equal(new Set(plan.dates).size,27);
 assert.ok(plan.dates.every(d=>d<plan.holdoutStartsOn));
});
test('no early fitting even when sample gates are met',()=>{
 const records=plan.dates.map(record);const partial=assemble(records.slice(0,20));assert.equal(partial.diagnostic.scoredEvents,40);assert.equal(partial.status,'COHORT_INCOMPLETE');assert.equal(partial.proposedMargins,null);assert.equal(partial.diagnostic.proposedMargins,null);
 const full=assemble(records);assert.equal(full.status,'RESEARCH_MARGINS_AVAILABLE_UNVALIDATED');assert.ok(full.proposedMargins);assert.equal(full.productionCalibrationAuthorized,false);assert.equal(full.probabilityCalibrated,false);
});
test('failed days stay unavailable rather than zero errors or replacement dates',()=>{
 const records=plan.dates.map((d,i)=>i<19?record(d,i):{date:d,status:'UNAVAILABLE',runRef,reason:'bounded source failure'});
 const a=assemble(records);assert.equal(a.completedDates,19);assert.equal(a.unavailableDates,8);assert.equal(a.pendingDates.length,0);assert.equal(a.proposedMargins,null);
});
test('reject inconsistent provenance, duplicates, scope and counts',()=>{
 for(const mutate of [x=>x.date='2024-09-21',x=>x.coverage.rowsScanned=99,x=>x.report.inputSha256=hash(900),x=>x.report.arrivalResiduals.residuals=[],x=>x.report.fieldAccuracyVerified=true,x=>x.report.scope.end=x.report.scope.start,x=>x.coverage.rangeRequests=181]){
  const x=record(plan.dates[0],0);mutate(x);assert.throws(()=>assemble([x]));
 }
 const x=record(plan.dates[0],0);assert.throws(()=>assemble([x,x]));
});
test('expanded dates require opt-in existing-model residual extraction; holdout stays blocked',()=>{
 const doc={schemaVersion:1,kind:'synthetic',source:{url:'https://example.invalid/fixture',receiptSha256:'a'.repeat(64),review:'constructed'},start:'2024-08-19T00:00:00Z',end:'2024-08-20T00:00:00Z',observations:[]};
 assert.throws(()=>retrospect(doc));assert.throws(()=>retrospect(doc,{arrivalResiduals:true,routeProgress:true}));
 assert.equal(retrospect(doc,{arrivalResiduals:true}).arrivalResiduals.date,'2024-08-19');
 assert.throws(()=>retrospect({...doc,start:'2024-09-21T00:00:00Z',end:'2024-09-22T00:00:00Z'},{arrivalResiduals:true}));
});

#!/usr/bin/env node
'use strict';
// Assemble fixed-cohort daily aggregate evidence, never raw AIS tracks.
const fs=require('node:fs'),crypto=require('node:crypto');
const plan=require('../docs/research/great-lakes-arrival-window-study-plan.json');
const {fit}=require('./great-lakes-arrival-window-research.cjs');
const expect=(ok,msg)=>{if(!ok)throw Error(msg);};
const hash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
function assemble(records){
 expect(Array.isArray(records)&&records.length<=plan.dates.length,'Unexpected report count');
 const days=[],ledger=[],seen=new Set(),inputs=new Set();
 for(const x of records){
  expect(x&&plan.dates.includes(x.date)&&!seen.has(x.date),'Unexpected or duplicate development date');seen.add(x.date);
  expect(typeof x.runRef==='string'&&/^https:\/\/github\.com\/izworskic\/chrisizworski-com\/actions\/runs\/\d+$/.test(x.runRef),'Run provenance required');
  if(x.status==='UNAVAILABLE'){
   expect(typeof x.reason==='string'&&x.reason.length>0&&x.reason.length<=300&&!x.report&&!x.coverage,'Unavailable date needs explicit reason and no substitute data');
   ledger.push({date:x.date,status:x.status,runRef:x.runRef,reason:x.reason});continue;
  }
  expect(x.status==='COMPLETE','Unrecognized execution status');
  const r=x.report,c=x.coverage,d=r?.arrivalResiduals;
  expect(r?.kind==='RETROSPECTIVE_AIS_MODEL_REFERENCE_PROXY_NOT_FIELD_VALIDATION'&&r.datasetKind==='historical-research'&&r.fieldAccuracyVerified===false&&r.productionCalibrationAuthorized===false&&r.receiptTimesAvailable===false&&r.independentlyReviewedCrossings===0,'Not a retrospective research report');
  expect(r.scope?.start===x.date+'T00:00:00Z'&&Date.parse(r.scope.end)-Date.parse(r.scope.start)===86400000&&r.issueRule===plan.issueRule,'Scope or issue rule mismatch');
  expect(c?.kind==='NOAA_ORIGINAL_ARCHIVE_ONE_DAY_COVERAGE'&&c.status==='COVERAGE_ONLY'&&c.scanComplete===true&&c.date===x.date&&c.source==='https://ocmgeodatastor1.blob.core.windows.net/marinecadastre/ais2024/ais-'+x.date+'.parquet'&&typeof c.etag==='string'&&c.etag.length>0,'Archive coverage missing');
  expect(Number.isInteger(c.rowsScanned)&&c.rowsScanned>0&&c.rowsScanned===c.objectRows&&Number.isInteger(c.rangeBytesRead)&&c.rangeBytesRead>0&&c.rangeBytesRead<=plan.maximumBytesPerDate&&Number.isInteger(c.rangeRequests)&&c.rangeRequests>0&&c.rangeRequests<=plan.maximumRequestsPerDate,'Incomplete or out-of-budget archive scan');
  expect(hash(c.rangeReceiptSha256)&&c.rangeReceiptSha256===r.sourceReceiptSha256&&d?.sourceReceiptSha256===r.sourceReceiptSha256&&hash(r.inputSha256)&&r.inputSha256===d.inputSha256&&!inputs.has(r.inputSha256),'Source/input receipt mismatch or duplicate');inputs.add(r.inputSha256);
  expect(r.detector?.counts?.inputRows===c.selectedGeographicRows&&d.date===x.date&&d.site===plan.site&&d.model===plan.model&&d.candidateEvents===r.bySite?.soo?.candidateEvents&&d.eligibleEstimates===r.bySite?.soo?.pairedScored&&d.residuals?.length===d.eligibleEstimates,'Event count or model mismatch');
  days.push(d);ledger.push({date:x.date,status:x.status,runRef:x.runRef,etag:c.etag,sourceReceiptSha256:c.rangeReceiptSha256,inputSha256:r.inputSha256,rowsScanned:c.rowsScanned,selectedRows:c.selectedGeographicRows,rangeBytes:c.rangeBytesRead,rangeRequests:c.rangeRequests,candidateEvents:d.candidateEvents,scoredEvents:d.residuals.length});
 }
 days.sort((a,b)=>a.date.localeCompare(b.date));ledger.sort((a,b)=>a.date.localeCompare(b.date));
 const pending=plan.dates.filter(d=>!seen.has(d)),dataset={schemaVersion:1,kind:'RETROSPECTIVE_WINDOW_DEVELOPMENT_RESIDUALS',modelRevision:plan.modelRevision,holdoutStartsOn:plan.holdoutStartsOn,days};
 const diagnostic=days.length?fit(dataset):null;
 // No selection by favorable outcome or stopping early when margins first become available.
 const ready=pending.length===0&&diagnostic?.status==='RESEARCH_MARGINS_AVAILABLE_UNVALIDATED';
 return {schemaVersion:1,kind:'FIXED_COHORT_ARRIVAL_WINDOW_STUDY',model:plan.model,modelRevision:plan.modelRevision,plannedDates:plan.dates.length,completedDates:days.length,unavailableDates:ledger.filter(d=>d.status==='UNAVAILABLE').length,pendingDates:pending,ledger,dataset,
  status:pending.length?'COHORT_INCOMPLETE':ready?'RESEARCH_MARGINS_AVAILABLE_UNVALIDATED':'INSUFFICIENT_DEVELOPMENT_EVIDENCE',
  diagnostic:diagnostic?{...diagnostic,proposedMargins:null,status:pending.length?'COHORT_INCOMPLETE':diagnostic.status}:null,
  proposedMargins:ready?diagnostic.proposedMargins:null,productionCalibrationAuthorized:false,fieldAccuracyVerified:false,probabilityCalibrated:false};
}
module.exports={assemble};
if(require.main===module){
 const [input,output,...extra]=process.argv.slice(2);expect(input&&output&&!extra.length,'Usage: node scripts/great-lakes-arrival-window-study.cjs reports.json study.json');
 expect(fs.statSync(input).size<=8*1024*1024,'Input exceeds research cap');
 const raw=fs.readFileSync(input,'utf8'),report=assemble(JSON.parse(raw));report.inputSha256=crypto.createHash('sha256').update(raw).digest('hex');
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
}

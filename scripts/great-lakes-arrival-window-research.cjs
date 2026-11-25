#!/usr/bin/env node
'use strict';
// Research-only arrival windows. Never authorize production or assert coverage probability.
const fs=require('node:fs'),crypto=require('node:crypto');
const MIN_DATES=20,MIN_EVENTS=40,TAIL_LEVEL=.95,MAX_DAYS=366,MAX_EVENTS=20000;
const expect=(ok,msg)=>{if(!ok)throw Error(msg);};
function date(s){expect(typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s),'UTC date required');const t=Date.parse(s+'T00:00:00Z');expect(Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===s,'Invalid calendar date');return t;}
const hash=s=>/^[a-f0-9]{64}$/.test(s||'');
function validate(doc){
 expect(doc?.schemaVersion===1&&doc.kind==='RETROSPECTIVE_WINDOW_DEVELOPMENT_RESIDUALS','Unsupported research dataset');
 expect(typeof doc.modelRevision==='string'&&/^[a-f0-9]{40}$/.test(doc.modelRevision),'Exact model revision required');
 expect(doc.holdoutStartsOn==='2024-09-21','Preserve reserved holdout boundary');
 const cutoff=date(doc.holdoutStartsOn),seen=new Set(),receipts=new Set(),days=doc.days;
 expect(Array.isArray(days)&&days.length>0&&days.length<=MAX_DAYS,'Invalid day count');
 let total=0,site,model;
 for(const d of days){
  expect(d&&date(d.date)<cutoff&&!seen.has(d.date),'Duplicate date or holdout leakage');seen.add(d.date);
  expect(d.site==='soo'&&['existing-reference-v1','route-progress-v1'].includes(d.model),'Unvalidated site/model');
  site??=d.site;model??=d.model;expect(d.site===site&&d.model===model,'Do not pool models or sites');
  expect(hash(d.sourceReceiptSha256)&&hash(d.inputSha256)&&!receipts.has(d.sourceReceiptSha256),'Missing or duplicate source receipt');receipts.add(d.sourceReceiptSha256);
  expect(Number.isInteger(d.candidateEvents)&&Number.isInteger(d.eligibleEstimates)&&d.candidateEvents>=d.eligibleEstimates&&d.eligibleEstimates>=0,'Invalid event accounting');
  expect(Array.isArray(d.residuals)&&d.residuals.length<=d.eligibleEstimates,'Residual accounting mismatch');
  total+=d.residuals.length;expect(total<=MAX_EVENTS,'Residual count exceeds cap');
  for(const a of d.residuals)expect(Array.isArray(a)&&a.length===2&&a.every(Number.isFinite)&&a[0]<=a[1]&&a[1]-a[0]<=5.000001&&Math.max(Math.abs(a[0]),Math.abs(a[1]))<=1440,'Invalid signed residual bracket');
 }
 return {site,model,days,total};
}
const maxOrNull=a=>a.length?Math.max(...a):null;
const ceilMargin=x=>Math.ceil(Math.max(0,x));
// A whole date is one block, avoiding treating correlated events as independent.
function rankMargin(values,level=TAIL_LEVEL){
 expect(Array.isArray(values)&&values.length>0&&values.every(x=>Number.isFinite(x)&&x>=0)&&level>0&&level<1,'Invalid nonnegative block scores');
 const sorted=[...values].sort((a,b)=>a-b),rank=Math.ceil((sorted.length+1)*level);
 return rank>sorted.length?null:ceilMargin(sorted[rank-1]);
}
function fit(doc){
 const {site,model,days,total}=validate(doc);
 const nonempty=days.filter(d=>d.residuals.length>0),all=nonempty.flatMap(d=>d.residuals);
 const blockEarly=nonempty.map(d=>Math.max(0,...d.residuals.map(x=>-x[0])));
 const blockLate=nonempty.map(d=>Math.max(0,...d.residuals.map(x=>x[1])));
 const enough=nonempty.length>=MIN_DATES&&total>=MIN_EVENTS;
 const early=enough?rankMargin(blockEarly):null,late=enough?rankMargin(blockLate):null;
 const ready=early!==null&&late!==null;
 const diagnostic=all.length?{earlyMinutes:ceilMargin(maxOrNull(blockEarly)),lateMinutes:ceilMargin(maxOrNull(blockLate)),entirelyLater:all.filter(x=>x[0]>0).length,entirelyEarlier:all.filter(x=>x[1]<0).length,bracketsContainingMidpoint:all.filter(x=>x[0]<=0&&x[1]>=0).length}:null;
 return {schemaVersion:1,kind:'RESEARCH_ARRIVAL_WINDOW_ASYMMETRY_NOT_CALIBRATED_PROBABILITY',site,model,modelRevision:doc.modelRevision,holdoutStartsOn:doc.holdoutStartsOn,
  sourceDates:days.map(d=>d.date).sort(),nonemptyDates:nonempty.length,scoredEvents:total,candidateEvents:days.reduce((a,d)=>a+d.candidateEvents,0),eligibleEstimates:days.reduce((a,d)=>a+d.eligibleEstimates,0),
  minimumDates:MIN_DATES,minimumEvents:MIN_EVENTS,tailRankLevel:TAIL_LEVEL,diagnosticObservedEnvelope:diagnostic,
  status:ready?'RESEARCH_MARGINS_AVAILABLE_UNVALIDATED':'INSUFFICIENT_DEVELOPMENT_EVIDENCE',
  proposedMargins:ready?{earlyMinutes:early,lateMinutes:late}:null,
  productionCalibrationAuthorized:false,fieldAccuracyVerified:false,probabilityCalibrated:false,
  note:'Daily block extrema, conservative signed bracket tails. No exchangeability established, no nominal coverage claim. Diagnostic envelope fits observed sample and is not an arrival window. Zero-outcome dates are counted but not treated as zero errors.'};
}
// Explicitly non-shrinking research window. Existing midpoint stays fixed.
// No use without a fitted research artifact; no production call sites.
function researchWindow(existing,fitReport){
 expect(fitReport?.kind==='RESEARCH_ARRIVAL_WINDOW_ASYMMETRY_NOT_CALIBRATED_PROBABILITY'&&fitReport.productionCalibrationAuthorized===false&&fitReport.status==='RESEARCH_MARGINS_AVAILABLE_UNVALIDATED','Insufficient research evidence');
 const m=fitReport.proposedMargins;
 expect(m&&[m.earlyMinutes,m.lateMinutes].every(x=>Number.isFinite(x)&&x>=0&&x<=1440),'Invalid research margins');
 expect(existing&&[existing.issuedAt,existing.midpoint,existing.start,existing.end].every(Number.isFinite)&&existing.issuedAt<=existing.start&&existing.start<=existing.midpoint&&existing.midpoint<=existing.end,'Invalid existing forecast');
 return {start:Math.max(existing.issuedAt,Math.min(existing.start,existing.midpoint-m.earlyMinutes*60000)),midpoint:existing.midpoint,end:Math.max(existing.end,existing.midpoint+m.lateMinutes*60000),productionCalibrationAuthorized:false};
}
module.exports={fit,rankMargin,researchWindow};
if(require.main===module){
 const [input,output,...extra]=process.argv.slice(2);expect(input&&output&&!extra.length,'Usage: node scripts/great-lakes-arrival-window-research.cjs residuals.json report.json');
 expect(fs.statSync(input).size<=4*1024*1024,'Input exceeds research cap');
 const raw=fs.readFileSync(input,'utf8'),report=fit(JSON.parse(raw));report.inputSha256=crypto.createHash('sha256').update(raw).digest('hex');
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
}

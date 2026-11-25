#!/usr/bin/env node
'use strict';
// A frozen, research-only evaluation. No public forecast calls or holdout tuning.
const fs=require('node:fs'),crypto=require('node:crypto');
const plan=require('../docs/research/great-lakes-arrival-window-study-plan.json');
const {assemble}=require('./great-lakes-arrival-window-study.cjs');
const {researchWindow}=require('./great-lakes-arrival-window-research.cjs');
const {detect}=require('./detect-great-lakes-crossings.cjs');
const {proxyGates,prepare,evaluateCandidate}=require('./retrospect-great-lakes-reference.cjs');
const soo=require('../lib/soo-locks-next');
const MIN=60000,MAX_BYTES=48*1024*1024;
const expect=(ok,msg)=>{if(!ok)throw Error(msg);};
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
// Freeze the selection and acceptance criteria before opening holdout outcomes.
// These are exploratory decision-cost thresholds, not probability guarantees.
const criteria=Object.freeze({minimumScoredEvents:10,minimumContainment:.8,minimumContainmentGain:.15,maximumMeanExtraWidthMinutes:15,maximumMeanWidthMinutes:45,missPenalty:4});
function freeze(records){
 const study=assemble(records);
 expect(study.pendingDates.length===0&&study.status==='RESEARCH_MARGINS_AVAILABLE_UNVALIDATED'&&study.proposedMargins,'Complete and sufficient development evidence required');
 const body={schemaVersion:1,kind:'FROZEN_RESEARCH_ARRIVAL_WINDOW',model:plan.model,modelRevision:plan.modelRevision,site:plan.site,
  developmentDigest:digest({ledger:study.ledger,dataset:study.dataset}),developmentDates:study.completedDates,
  scoredEvents:study.diagnostic.scoredEvents,nonemptyDates:study.diagnostic.nonemptyDates,holdoutDates:plan.reservedHoldoutDates,
  margins:study.proposedMargins,criteria,productionCalibrationAuthorized:false,probabilityCalibrated:false,fieldAccuracyVerified:false};
 return {...body,freezeSha256:digest(body)};
}
function checkFrozen(records,frozen){
 const expected=freeze(records);
 expect(frozen&&digest(frozen)===digest(expected),'Frozen parameters or development evidence changed');
 return expected;
}
function scorePair(e,frozen){
 const {issuedAt,midpoint,start,end,lo,hi}=e;
 expect([issuedAt,midpoint,start,end,lo,hi].every(Number.isFinite)&&issuedAt<=start&&start<=midpoint&&midpoint<=end&&issuedAt<=lo&&lo<=hi&&hi-lo<=5*MIN+1,'Invalid matched forecast/bracket');
 const next=researchWindow({issuedAt,midpoint,start,end},{kind:'RESEARCH_ARRIVAL_WINDOW_ASYMMETRY_NOT_CALIBRATED_PROBABILITY',status:'RESEARCH_MARGINS_AVAILABLE_UNVALIDATED',productionCalibrationAuthorized:false,proposedMargins:frozen.margins});
 const metrics=(s,t)=>({contained:Number(s<=lo&&t>=hi),overlap:Number(s<=hi&&t>=lo),width:(t-s)/MIN});
 const loss=(s,t,x)=>(t-s+criteria.missPenalty*Math.max(0,s-x,x-t))/MIN;
 // Paired decision-loss difference extrema over the SAME uncertain crossing.
 const points=[lo,hi,...[start,end,next.start,next.end].filter(x=>x>lo&&x<hi)];
 const delta=points.map(x=>loss(next.start,next.end,x)-loss(start,end,x));
 return {old:metrics(start,end),next:metrics(next.start,next.end),lossDeltaLower:Math.min(...delta),lossDeltaUpper:Math.max(...delta)};
}
function evaluate(doc,records,frozen){
 checkFrozen(records,frozen);
 const date=typeof doc?.start==='string'?doc.start.slice(0,10):null;
 expect(doc?.kind==='historical-research'&&frozen.holdoutDates.includes(date)&&doc.start===date+'T00:00:00Z'&&Date.parse(doc.end)-Date.parse(doc.start)===86400000,'Reserved UTC holdout day only');
 expect(!records.some(x=>x.report?.sourceReceiptSha256===doc.source?.receiptSha256),'Development source reused as holdout');
 const candidates=detect(doc,proxyGates().filter(g=>g.site==='soo')),tracks=prepare(doc);
 const counts={},pairs=[];
 for(const c of candidates.review){
  const row=evaluateCandidate(c,tracks,soo,{windowEvidence:true});
  counts[row.status]=(counts[row.status]||0)+1;
  if(row.status==='scored')pairs.push(scorePair(row.windowEvidence,frozen));
 }
 const sum=f=>pairs.reduce((n,p)=>n+f(p),0);
 return {schemaVersion:1,kind:'FROZEN_WINDOW_HOLDOUT_DAY',date,freezeSha256:frozen.freezeSha256,sourceReceiptSha256:doc.source.receiptSha256,
  candidates:candidates.review.length,counts,scored:pairs.length,oldContained:sum(p=>p.old.contained),nextContained:sum(p=>p.next.contained),
  oldOverlap:sum(p=>p.old.overlap),nextOverlap:sum(p=>p.next.overlap),oldWidthSum:sum(p=>p.old.width),nextWidthSum:sum(p=>p.next.width),
  lossDeltaLowerSum:sum(p=>p.lossDeltaLower),lossDeltaUpperSum:sum(p=>p.lossDeltaUpper),productionCalibrationAuthorized:false};
}
function summarize(days,frozen){
 expect(Array.isArray(days)&&days.length<=frozen.holdoutDates.length,'Unexpected holdout report count');
 const seen=new Set(),receipts=new Set();
 for(const d of days){
  expect(d?.kind==='FROZEN_WINDOW_HOLDOUT_DAY'&&frozen.holdoutDates.includes(d.date)&&!seen.has(d.date)&&d.freezeSha256===frozen.freezeSha256&&d.productionCalibrationAuthorized===false,'Invalid or duplicate holdout day');
  seen.add(d.date);expect(typeof d.sourceReceiptSha256==='string'&&/^[a-f0-9]{64}$/.test(d.sourceReceiptSha256)&&!receipts.has(d.sourceReceiptSha256),'Missing or duplicate holdout receipt');receipts.add(d.sourceReceiptSha256);
  expect(Number.isInteger(d.scored)&&Number.isInteger(d.candidates)&&d.scored>=0&&d.candidates>=d.scored&&d.counts&&Object.values(d.counts).every(x=>Number.isInteger(x)&&x>=0)&&Object.values(d.counts).reduce((a,b)=>a+b,0)===d.candidates&&(d.counts.scored||0)===d.scored,'Invalid outcome accounting');
  expect([d.oldContained,d.nextContained,d.oldOverlap,d.nextOverlap].every(x=>Number.isInteger(x)&&x>=0&&x<=d.scored)&&d.oldContained<=d.oldOverlap&&d.nextContained<=d.nextOverlap&&d.nextContained>=d.oldContained&&d.nextOverlap>=d.oldOverlap,'Invalid coverage accounting');
  expect([d.oldWidthSum,d.nextWidthSum,d.lossDeltaLowerSum,d.lossDeltaUpperSum].every(Number.isFinite)&&d.oldWidthSum>=0&&d.nextWidthSum>=d.oldWidthSum&&d.lossDeltaLowerSum<=d.lossDeltaUpperSum,'Invalid loss or width accounting');
 }
 const sum=k=>days.reduce((n,d)=>n+d[k],0),n=sum('scored'),avg=k=>n?sum(k)/n:null;
 const pending=frozen.holdoutDates.filter(d=>!seen.has(d));
 const metrics={scored:n,candidates:sum('candidates'),existingContainment:avg('oldContained'),proposedContainment:avg('nextContained'),existingOverlap:avg('oldOverlap'),proposedOverlap:avg('nextOverlap'),existingMeanWidthMinutes:avg('oldWidthSum'),proposedMeanWidthMinutes:avg('nextWidthSum'),pairedDecisionLossLowerMinutes:avg('lossDeltaLowerSum'),pairedDecisionLossUpperMinutes:avg('lossDeltaUpperSum')};
 const passes=pending.length===0&&days.every(d=>d.scored>0)&&n>=criteria.minimumScoredEvents&&metrics.proposedContainment>=criteria.minimumContainment&&metrics.proposedContainment-metrics.existingContainment>=criteria.minimumContainmentGain&&metrics.proposedMeanWidthMinutes-metrics.existingMeanWidthMinutes<=criteria.maximumMeanExtraWidthMinutes&&metrics.proposedMeanWidthMinutes<=criteria.maximumMeanWidthMinutes&&metrics.pairedDecisionLossUpperMinutes<0;
 return {schemaVersion:1,kind:'FROZEN_WINDOW_HOLDOUT_SUMMARY',freezeSha256:frozen.freezeSha256,pendingDates:pending,metrics,
  status:pending.length?'HOLDOUT_INCOMPLETE':n<criteria.minimumScoredEvents||days.some(d=>d.scored===0)?'INSUFFICIENT_HOLDOUT_EVIDENCE':passes?'EXPLORATORY_CRITERIA_MET':'EXPLORATORY_CRITERIA_NOT_MET',
  productionCalibrationAuthorized:false,fieldAccuracyVerified:false,probabilityCalibrated:false};
}
module.exports={freeze,checkFrozen,scorePair,evaluate,summarize,criteria};
if(require.main===module){
 const [mode,recordsPath,a,b,c,...extra]=process.argv.slice(2);
 expect(!extra.length&&recordsPath&&['freeze','evaluate','summarize'].includes(mode),'Usage: freeze records output | evaluate records frozen observations output | summarize records frozen daily-reports output');
 const read=p=>{expect(p&&fs.statSync(p).size<=MAX_BYTES,'Missing or oversized research input');return JSON.parse(fs.readFileSync(p,'utf8'));};
 const records=read(recordsPath);
 let output,result;
 if(mode==='freeze'){expect(a&&!b&&!c,'Invalid freeze arguments');output=a;result=freeze(records);}
 else {expect(a&&b&&c,'Missing frozen evaluation arguments');const frozen=checkFrozen(records,read(a));output=c;result=mode==='evaluate'?evaluate(read(b),records,frozen):summarize(read(b),frozen);}
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
}

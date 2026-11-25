#!/usr/bin/env node
'use strict';
// Offline challenger; not independent passage validation or operational calibration.
const fs=require('node:fs'),crypto=require('node:crypto');
const plan=require('../docs/research/great-lakes-bias-corrected-study-plan.json');
const {checkFrozen}=require('./great-lakes-arrival-window-holdout.cjs');
const {detect}=require('./detect-great-lakes-crossings.cjs');
const {proxyGates,prepare,evaluateCandidate}=require('./retrospect-great-lakes-reference.cjs');
const {deltaBounds}=require('./great-lakes-route-progress-challenger.cjs');
const soo=require('../lib/soo-locks-next');
const MIN=60000,expect=(ok,msg)=>{if(!ok)throw Error(msg);};
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function freeze(records,prior){
 const verified=checkFrozen(records,prior);
 expect(verified.freezeSha256===plan.developmentFreezeSha256&&verified.modelRevision===plan.modelRevision,'Development freeze changed');
 const values=records.flatMap(x=>x.status==='COMPLETE'?x.report.arrivalResiduals.residuals.map(p=>(p[0]+p[1])/2):[]).sort((a,b)=>a-b);
 expect(values.length===verified.scoredEvents,'Residual accounting changed');
 const i=Math.floor(values.length/2),median=values.length%2?values[i]:(values[i-1]+values[i])/2;
 expect(Math.round(median)===plan.shiftMinutes,'Prespecified midpoint correction changed');
 expect(plan.holdoutDates.every(d=>d>='2024-10-01'&&!verified.holdoutDates.includes(d)),'Holdout leakage');
 const body={...plan,developmentScoredEvents:values.length,developmentMedianMinutes:median};
 return {...body,freezeSha256:digest(body)};
}
function verify(records,prior,frozen){const expected=freeze(records,prior);expect(digest(expected)===digest(frozen),'Frozen challenger changed');return expected;}
function scorePair(e,frozen){
 const {issuedAt,midpoint,start,end,lo,hi}=e;
 expect([issuedAt,midpoint,start,end,lo,hi].every(Number.isFinite)&&issuedAt<=start&&start<=midpoint&&midpoint<=end&&issuedAt<=lo&&lo<=hi&&hi-lo<=5*MIN+1,'Invalid matched forecast');
 const shift=frozen.shiftMinutes*MIN,mid=midpoint+shift,s=Math.max(issuedAt,start+shift-frozen.extraEarlyMinutes*MIN),t=end+shift+frozen.extraLateMinutes*MIN;
 expect(s<=mid&&mid<=t,'Invalid shifted window');
 const metric=(a,b)=>({contained:Number(a<=lo&&b>=hi),overlap:Number(a<=hi&&b>=lo),width:(b-a)/MIN});
 const loss=(a,b,x)=>(b-a+frozen.criteria.missPenalty*Math.max(0,a-x,x-b))/MIN;
 const points=[lo,hi,...[start,end,s,t].filter(x=>x>lo&&x<hi)],ds=points.map(x=>loss(s,t,x)-loss(start,end,x));
 return {old:metric(start,end),next:metric(s,t),lossDelta:[Math.min(...ds),Math.max(...ds)],maeDelta:deltaBounds(mid,midpoint,lo,hi)};
}
function evaluate(doc,records,prior,frozen){
 verify(records,prior,frozen);
 const date=doc?.start?.slice(0,10);
 expect(doc?.kind==='historical-research'&&frozen.holdoutDates.includes(date)&&doc.start===date+'T00:00:00Z'&&Date.parse(doc.end)-Date.parse(doc.start)===86400000,'Fresh reserved UTC date only');
 expect(!records.some(x=>x.report?.sourceReceiptSha256===doc.source?.receiptSha256),'Development source reused');
 const candidates=detect(doc,proxyGates().filter(g=>g.site==='soo')),tracks=prepare(doc),counts={},pairs=[];
 for(const c of candidates.review){const row=evaluateCandidate(c,tracks,soo,{windowEvidence:true});counts[row.status]=(counts[row.status]||0)+1;if(row.status==='scored')pairs.push(scorePair(row.windowEvidence,frozen));}
 const sum=f=>pairs.reduce((n,p)=>n+f(p),0);
 return {schemaVersion:1,kind:'BIAS_CORRECTED_WINDOW_HOLDOUT_DAY',date,freezeSha256:frozen.freezeSha256,sourceReceiptSha256:doc.source.receiptSha256,candidates:candidates.review.length,counts,scored:pairs.length,
 oldContained:sum(p=>p.old.contained),nextContained:sum(p=>p.next.contained),oldOverlap:sum(p=>p.old.overlap),nextOverlap:sum(p=>p.next.overlap),oldWidthSum:sum(p=>p.old.width),nextWidthSum:sum(p=>p.next.width),
 lossDeltaLowerSum:sum(p=>p.lossDelta[0]),lossDeltaUpperSum:sum(p=>p.lossDelta[1]),maeDeltaLowerSum:sum(p=>p.maeDelta[0]),maeDeltaUpperSum:sum(p=>p.maeDelta[1]),productionCalibrationAuthorized:false};
}
function summarize(days,frozen){
 expect(Array.isArray(days)&&days.length<=frozen.holdoutDates.length,'Unexpected report count');
 const seen=new Set(),receipts=new Set();
 for(const d of days){
  expect(d?.kind==='BIAS_CORRECTED_WINDOW_HOLDOUT_DAY'&&frozen.holdoutDates.includes(d.date)&&!seen.has(d.date)&&d.freezeSha256===frozen.freezeSha256&&d.productionCalibrationAuthorized===false,'Invalid or duplicate holdout day');seen.add(d.date);
  expect(/^[a-f0-9]{64}$/.test(d.sourceReceiptSha256||'')&&!receipts.has(d.sourceReceiptSha256),'Missing or duplicate source receipt');receipts.add(d.sourceReceiptSha256);
  expect(Number.isInteger(d.scored)&&Number.isInteger(d.candidates)&&d.scored>=0&&d.candidates>=d.scored&&d.counts&&Object.values(d.counts).every(x=>Number.isInteger(x)&&x>=0)&&Object.values(d.counts).reduce((a,b)=>a+b,0)===d.candidates&&(d.counts.scored||0)===d.scored,'Invalid outcome accounting');
  expect([d.oldContained,d.nextContained,d.oldOverlap,d.nextOverlap].every(x=>Number.isInteger(x)&&x>=0&&x<=d.scored)&&d.oldContained<=d.oldOverlap&&d.nextContained<=d.nextOverlap,'Invalid coverage accounting');
  expect([d.oldWidthSum,d.nextWidthSum,d.lossDeltaLowerSum,d.lossDeltaUpperSum,d.maeDeltaLowerSum,d.maeDeltaUpperSum].every(Number.isFinite)&&d.oldWidthSum>=0&&d.nextWidthSum>=0&&d.lossDeltaLowerSum<=d.lossDeltaUpperSum&&d.maeDeltaLowerSum<=d.maeDeltaUpperSum&&d.nextWidthSum-d.oldWidthSum<=(frozen.extraEarlyMinutes+frozen.extraLateMinutes)*d.scored+1e-6,'Invalid width or loss accounting');
 }
 const sum=k=>days.reduce((n,d)=>n+d[k],0),n=sum('scored'),avg=k=>n?sum(k)/n:null,pending=frozen.holdoutDates.filter(d=>!seen.has(d)),nonempty=days.filter(d=>d.scored>0).length;
 const metrics={scored:n,candidates:sum('candidates'),scoredDates:nonempty,existingContainment:avg('oldContained'),proposedContainment:avg('nextContained'),existingOverlap:avg('oldOverlap'),proposedOverlap:avg('nextOverlap'),existingMeanWidthMinutes:avg('oldWidthSum'),proposedMeanWidthMinutes:avg('nextWidthSum'),pairedDecisionLossLowerMinutes:avg('lossDeltaLowerSum'),pairedDecisionLossUpperMinutes:avg('lossDeltaUpperSum'),pairedMaeDeltaLowerMinutes:avg('maeDeltaLowerSum'),pairedMaeDeltaUpperMinutes:avg('maeDeltaUpperSum')};
 const c=frozen.criteria,enough=n>=c.minimumScoredEvents&&nonempty>=c.minimumScoredDates;
 const gates={containment:n>0&&metrics.proposedContainment>=c.minimumContainment,gain:n>0&&metrics.proposedContainment-metrics.existingContainment>=c.minimumContainmentGain,extraWidth:n>0&&metrics.proposedMeanWidthMinutes-metrics.existingMeanWidthMinutes<=c.maximumMeanExtraWidthMinutes,totalWidth:n>0&&metrics.proposedMeanWidthMinutes<=c.maximumMeanWidthMinutes,decisionCost:n>0&&metrics.pairedDecisionLossUpperMinutes<0,midpointError:n>0&&metrics.pairedMaeDeltaUpperMinutes<0};
 return {schemaVersion:1,kind:'BIAS_CORRECTED_WINDOW_HOLDOUT_SUMMARY',freezeSha256:frozen.freezeSha256,pendingDates:pending,metrics,gates,status:pending.length?'HOLDOUT_INCOMPLETE':!enough?'INSUFFICIENT_HOLDOUT_EVIDENCE':Object.values(gates).every(Boolean)?'EXPLORATORY_CRITERIA_MET':'EXPLORATORY_CRITERIA_NOT_MET',productionCalibrationAuthorized:false,fieldAccuracyVerified:false,probabilityCalibrated:false};
}
module.exports={freeze,verify,scorePair,evaluate,summarize};
if(require.main===module){
 const [mode,recordsPath,priorPath,a,b,c,...extra]=process.argv.slice(2);
 expect(!extra.length&&recordsPath&&priorPath&&['freeze','evaluate','summarize'].includes(mode),'Usage: freeze records prior output | evaluate records prior frozen observations output | summarize records prior frozen reports output');
 const read=p=>{expect(p&&fs.statSync(p).size<=48*1024*1024,'Missing or oversized research input');return JSON.parse(fs.readFileSync(p,'utf8'));};
 const records=read(recordsPath),prior=read(priorPath);let result,output;
 if(mode==='freeze'){expect(a&&!b&&!c,'Invalid freeze arguments');result=freeze(records,prior);output=a;}else{expect(a&&b&&c,'Missing evaluation arguments');const frozen=verify(records,prior,read(a));result=mode==='evaluate'?evaluate(read(b),records,prior,frozen):summarize(read(b),frozen);output=c;}
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
}

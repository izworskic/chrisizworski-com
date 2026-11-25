'use strict';
// Research candidate only. Never installs a production interval or probability.
const fs=require('node:fs');
const {evaluate}=require('./shorefeel-predictive-validation.cjs');
const H=3600000,BLOCK=72*H,ALPHA=.10,MIN_CAL=20,MIN_TEST=10,MIN_FRACTION=.8;
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const round=n=>n===null?null:Math.round(n*1000)/1000;
function blockMax(rows,anchor){
 const map=new Map();
 for(const r of rows){
  const id=Math.floor((r.issue-anchor)/BLOCK);
  const error=Math.abs(r.predictionF-r.actualF);
  map.set(id,Math.max(map.get(id)??0,error));
 }
 return [...map.values()];
}
function calibrate(input){
 if(input?.schemaVersion!==1||!input.calibration||!input.evaluation)throw Error('Two frozen cohorts required');
 const c=input.calibration,e=input.evaluation;
 const split=Date.parse(e.holdoutStartsAt),calEnd=Date.parse(c.holdoutEndsAt),calAsOf=Date.parse(c.asOf);
 if(!Number.isFinite(split)||!Number.isFinite(calEnd)||!Number.isFinite(calAsOf)||calEnd+48*H>split||calAsOf>split)
  throw Error('Calibration outcomes must mature before evaluation begins; 48-hour embargo required');
 if(c.kind!==e.kind)throw Error('Evidence kinds cannot be mixed');
 const cal=evaluate(c,{includePairs:true}),ev=evaluate(e,{includePairs:true});
 const leads={};
 for(const h of [24,48]){
  const a=cal.paired[h],b=ev.paired[h];
  const ac=blockMax(a,Date.parse(c.holdoutStartsAt)),bc=blockMax(b,split);
  const rank=Math.ceil((ac.length+1)*(1-ALPHA));
  const reasons=[];
  if(ac.length<MIN_CAL||rank>ac.length)reasons.push('INSUFFICIENT_CALIBRATION_BLOCKS');
  if(bc.length<MIN_TEST)reasons.push('INSUFFICIENT_EVALUATION_BLOCKS');
  if(a.length/cal.expectedSlots<MIN_FRACTION||b.length/ev.expectedSlots<MIN_FRACTION)reasons.push('INSUFFICIENT_MATCHED_COHORT');
  if(new Set(a.map(x=>x.station)).size<3||new Set(b.map(x=>x.station)).size<3)reasons.push('INSUFFICIENT_STATION_DIVERSITY');
  if(a.some(x=>x.outcomeAvailableAt>split))reasons.push('OUTCOME_LEAKAGE');
  const halfWidth=reasons.length?null:Math.ceil(ac.slice().sort((x,y)=>x-y)[rank-1]*10)/10;
  const candidateCoverage=halfWidth===null?null:avg(b.map(x=>Number(Math.abs(x.predictionF-x.actualF)<=halfWidth)));
  const candidateBlockCoverage=halfWidth===null?null:avg(bc.map(x=>Number(x<=halfWidth)));
  leads[h]={status:reasons.length?'INSUFFICIENT_EVIDENCE':'CANDIDATE_RESEARCH_ONLY',reasons,calibrationPairs:a.length,evaluationPairs:b.length,calibrationBlocks:ac.length,evaluationBlocks:bc.length,
   nominalResearchTarget:1-ALPHA,rank,candidateHalfWidthF:halfWidth,existingRangeCoverage:ev.leads[h].empiricalRangeCoverage,existingMeanWidthF:ev.leads[h].meanRangeWidthF,
   candidateRowCoverage:round(candidateCoverage),candidateBlockCoverage:round(candidateBlockCoverage),candidateMeanWidthF:halfWidth===null?null:2*halfWidth,
   reachesResearchTarget:candidateBlockCoverage===null?null:candidateBlockCoverage>=1-ALPHA};
 }
 return {status:c.kind==='synthetic'?'SYNTHETIC_NOT_CALIBRATION':'SOURCE_REVIEW_REQUIRED',calibrationCohortSha256:cal.cohortSha256,evaluationCohortSha256:ev.cohortSha256,blockHours:72,minCalibrationBlocks:MIN_CAL,minEvaluationBlocks:MIN_TEST,minMatchedFraction:MIN_FRACTION,leads,canPromoteModel:false,
 limits:['Block maxima reduce overlapping-lead and cross-station duplication; blocks can still be dependent and nonexchangeable. The nominal target is not a guaranteed coverage probability.','Thresholds are predeclared research eligibility criteria, not validated operational policy.','Archive authenticity, spatial equivalence, frozen cohort and independent review remain mandatory. Offshore buoy residuals cannot validate nearshore conditions.']};
}
if(require.main===module){try{console.log(JSON.stringify(calibrate(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={calibrate};

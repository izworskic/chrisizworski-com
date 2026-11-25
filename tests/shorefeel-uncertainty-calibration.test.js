'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {calibrate}=require('../scripts/shorefeel-uncertainty-calibration.cjs');
const H=3600000,T=Date.parse('2026-11-01T00:00:00Z'),at=h=>new Date(T+h*H).toISOString();
const hash='a'.repeat(64),forecastUrl='https://opendap.co-ops.nos.noaa.gov/thredds/dodsC/NOAA/LMHOFS/test.nc',baselineUrl='https://www.ndbc.noaa.gov/data/test.txt';
// Explicit synthetic arithmetic, not real future observations or archive bytes.
function cohort(start,blocks,error=()=>1){
 const end=start+blocks*72;
 const d={schemaVersion:1,kind:'synthetic',holdoutStartsAt:at(start),holdoutEndsAt:at(end),asOf:at(end+49),cohort:[],forecasts:[],observations:[]};
 for(let i=0;i<blocks;i++)for(const station of ['45029','45161','45183']){
  const h=start+i*72;
  d.cohort.push({station,issuedAt:at(h)});
  for(const lead of [24,48]){
   d.forecasts.push({station,issuedAt:at(h),availableAt:at(h-1),modelCycleAt:at(h-6),validAt:at(h+lead),leadHours:lead,baselineObservedAt:at(h),baselineAvailableAt:at(h),baselineF:60,modelChangeF:0,modelChangeEstimateF:60,lowF:58,highF:62,forecastSha256:hash,baselineSha256:hash,forecastUrl,baselineUrl});
   d.observations.push({station,observedAt:at(h+lead),availableAt:at(h+lead+1),tempF:60+error(i,lead),quality:'accepted',kind:'ndbc-buoy-observation',sha256:hash,sourceUrl:baselineUrl});
  }
 }
 return d;
}
const fixture=()=>({schemaVersion:1,calibration:cohort(0,20,i=>i===19?10:3),evaluation:cohort(20*72+72,10,i=>i===9?8:2)});
test('calibration quantile is frozen before independent evaluation and measured by horizon',()=>{
 const d=fixture(),r=calibrate(d);
 assert.equal(r.status,'SYNTHETIC_NOT_CALIBRATION');
 for(const h of [24,48]){
  const l=r.leads[h];assert.equal(l.status,'CANDIDATE_RESEARCH_ONLY');
  assert.equal(l.calibrationBlocks,20);assert.equal(l.evaluationBlocks,10);assert.equal(l.rank,19);
  assert.equal(l.candidateHalfWidthF,3);assert.equal(l.candidateBlockCoverage,.9);assert.equal(l.candidateRowCoverage,.9);
  assert.equal(l.candidateMeanWidthF,6);assert.equal(l.existingMeanWidthF,4);
 }
 d.evaluation.observations.forEach(o=>o.tempF=70);
 const worse=calibrate(d);assert.equal(worse.leads[24].candidateHalfWidthF,3);assert.equal(worse.leads[24].candidateBlockCoverage,0);
 assert.equal(worse.canPromoteModel,false);
});
test('thin, sparse or geographically narrow cohorts abstain',()=>{
 let d=fixture();d.calibration=cohort(0,19);
 assert.equal(calibrate(d).leads[24].candidateHalfWidthF,null);
 d=fixture();d.evaluation.observations=d.evaluation.observations.filter(o=>o.station==='45029');
 const l=calibrate(d).leads[48];assert.equal(l.candidateHalfWidthF,null);assert.ok(l.reasons.includes('INSUFFICIENT_STATION_DIVERSITY'));assert.ok(l.reasons.includes('INSUFFICIENT_MATCHED_COHORT'));
});
test('time overlap and mixing evidence kinds are rejected',()=>{
 let d=fixture();d.evaluation=cohort(20*72+24,10);assert.throws(()=>calibrate(d),/embargo/);
 d=fixture();d.evaluation.kind='historical-review';assert.throws(()=>calibrate(d),/Evidence kinds/);
});

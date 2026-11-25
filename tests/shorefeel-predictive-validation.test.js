'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {evaluate,summaryAudit}=require('../scripts/shorefeel-predictive-validation.cjs');
const report=require('../data/shorefeel/backtest-2026-10.json');
const H=3600000,T=Date.parse('2026-11-01T00:00:00Z'),at=h=>new Date(T+h*H).toISOString(),hash='a'.repeat(64);
const forecastUrl='https://opendap.co-ops.nos.noaa.gov/thredds/dodsC/NOAA/LMHOFS/test.nc',baselineUrl='https://www.ndbc.noaa.gov/data/test.txt';
function issue(site,offset,lead,baseline,change){
 return {station:site,issuedAt:at(offset),availableAt:at(offset-1),modelCycleAt:at(offset-6),validAt:at(offset+lead),leadHours:lead,baselineObservedAt:at(offset),baselineAvailableAt:at(offset),baselineF:baseline,modelChangeF:change,modelChangeEstimateF:baseline+change,lowF:baseline+change-2,highF:baseline+change+2,forecastSha256:hash,baselineSha256:hash,forecastUrl,baselineUrl};
}
function obs(site,h,tempF){return {station:site,observedAt:at(h),availableAt:at(h+1),tempF,quality:'accepted',kind:'ndbc-buoy-observation',sha256:hash,sourceUrl:baselineUrl};}
function fixture(){
 return {schemaVersion:1,kind:'synthetic',holdoutStartsAt:at(0),holdoutEndsAt:at(24),asOf:at(80),cohort:[{station:'45029',issuedAt:at(0)},{station:'45161',issuedAt:at(0)},{station:'45183',issuedAt:at(0)}],
 forecasts:[issue('45029',0,24,60,-2),issue('45161',0,24,60,-2),issue('45029',0,48,60,-4),issue('45161',0,48,60,0)],
 observations:[obs('45029',24,57),obs('45161',24,61),obs('45029',48,55)]};
}
test('historical summary is descriptive, cannot establish interval coverage or reproduced skill',()=>{
 const r=summaryAudit(report);
 assert.equal(r.status,'AGGREGATE_ONLY_NOT_REPRODUCED');
 assert.equal(r.leads[24].reportedN,115);
 assert.equal(r.leads[24].reportedRelativeMAEReductionPct,9.655);
 assert.equal(r.leads[48].reportedRelativeMAEReductionPct,14.612);
 assert.equal(r.leads[24].empiricalCoverage,null);
 assert.deepEqual(r.cooling,{reportedTP:7,reportedFP:15,reportedFN:0,reportedTN:93,reportedPrecision:.318,reportedRecall:1});
 assert.equal(r.canPromoteModel,false);
});
test('paired errors use identical outcome cohort and report missing expected slots',()=>{
 const r=evaluate(fixture()),a=r.leads[24],b=r.leads[48];
 assert.equal(r.status,'SYNTHETIC_NOT_SKILL');
 assert.equal(r.expectedSlots,3);
 assert.equal(a.n,2);assert.deepEqual(a.missing,{forecast:1,outcome:0});
 assert.equal(a.persistenceMAE_F,2);assert.equal(a.modelChangeMAE_F,2);assert.equal(a.biasF,-1);
 assert.equal(a.empiricalRangeCoverage,.5);assert.equal(a.meanRangeWidthF,4);
 assert.equal(b.n,1);assert.deepEqual(b.missing,{forecast:1,outcome:1});
 assert.equal(b.persistenceMAE_F,5);assert.equal(b.modelChangeMAE_F,1);
 assert.deepEqual(r.cooling,{tp:1,fp:1,fn:0,tn:0,excludedNonExactBaseline:0,precision:.5,recall:1});
 assert.equal(r.canPromoteModel,false);
});
test('future knowledge, missing provenance, and source substitutions cannot score',()=>{
 for(const changes of [{availableAt:at(1)},{baselineAvailableAt:at(1)},{modelCycleAt:at(1)},{validAt:at(25)},{baselineObservedAt:at(-7)},{baselineF:null},{forecastSha256:null},{modelChangeEstimateF:65},{forecastUrl:'https://example.com/file'}]){
  const d=fixture();Object.assign(d.forecasts[0],changes);
  const r=evaluate(d);assert.equal(r.invalidForecasts,1);assert.equal(r.leads[24].n,1);
 }
 const d=fixture();d.observations[0].kind='gridded-analysis';
 assert.equal(evaluate(d).leads[24].n,1);
});
test('identical duplicates deduplicate; conflicting revisions quarantine both orders',()=>{
 const d=fixture();d.forecasts.push({...d.forecasts[0]});d.observations.push({...d.observations[0]});
 assert.equal(evaluate(d).leads[24].n,2);
 d.forecasts.push({...d.forecasts[0],lowF:55});
 assert.equal(evaluate(d).conflictingForecastKeys,1);assert.equal(evaluate(d).leads[24].n,1);
 const e=fixture();e.observations.push({...e.observations[0],tempF:59});
 assert.equal(evaluate(e).conflictingObservationKeys,1);assert.equal(evaluate(e).leads[24].n,1);
 e.observations.reverse();assert.equal(evaluate(e).leads[24].n,1);
});
test('cohort hash order invariant; no retrospective expansion or immature holdout',()=>{
 const d=fixture(),a=evaluate(d);
 d.cohort.reverse();assert.equal(evaluate(d).cohortSha256,a.cohortSha256);
 d.forecasts.push(issue('45002',0,24,60,-2));assert.equal(evaluate(d).offCohort,1);
 d.cohort.push(d.cohort[0]);assert.throws(()=>evaluate(d),/Duplicate cohort/);
 const e=fixture();e.asOf=at(60);assert.throws(()=>evaluate(e),/fully mature/);
});
test('nonexact baseline remains usable for MAE but is not a 24-hour cooling outcome',()=>{
 const d=fixture();d.forecasts[0].baselineObservedAt=at(-1);
 const r=evaluate(d);assert.equal(r.leads[24].n,2);assert.equal(r.cooling.excludedNonExactBaseline,1);assert.equal(r.cooling.tp,0);
});
test('no matches abstains on metrics and reviewed label cannot authorize promotion',()=>{
 const d=fixture();d.kind='historical-review';d.observations=[];
 const r=evaluate(d);
 assert.equal(r.leads[24].modelChangeMAE_F,null);assert.equal(r.leads[24].empiricalRangeCoverage,null);assert.equal(r.cooling.recall,null);assert.equal(r.canPromoteModel,false);
});

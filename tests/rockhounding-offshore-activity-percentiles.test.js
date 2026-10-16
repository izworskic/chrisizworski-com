'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {compareToBaseline,SCHEMA,METRIC}=require('../lib/rockhounding/offshore-activity-percentiles.cjs');
const baseline=()=>({
 schemaVersion:SCHEMA,stationId:'SPOT-1361',source:'GLOS_SEAGULL_OBS_140',
 sourceOriginalObservationCount:5243,metric:METRIC,periodHours:24,stepHours:6,
 originalNoInterpolation:true,minimumCoveragePct:90,gapCutoffHours:1.5,
 baselineSeason:'PARTIAL_SUMMER_FALL_2026_ONLY_NOT_LONG_TERM_CLIMATOLOGY',
 windowsAccepted:100,orderedMeasuredValues:Array.from({length:100},(_,i)=>i+1),
 canPredictNewAgates:false,canClaimBeachSafe:false
});
function current(amount=75){
 return {schemaVersion:'rockhounding-photo-free-48h-wave-tendency-v1',
  source:'ORIGINAL_GLOS_SPOT1361_OFFSHORE_OBSERVATIONS',
  status:'OBSERVED_WAVE_ACTIVITY_LOWER_VS_PRIOR_24H',
  current24hActivity:amount,latestAgeHours:.5,
  observedPast48h:{latestWaveM:1.1},
  comparedWindowCoveragePct:[100,100],
  canForecastNewStones:false,canClaimBeachSafe:false};
}
test('historical sampled-wave percentile is relative frequency of measured offshore activity, not rock-finding odds',()=>{
 const r=compareToBaseline(current(75),{baseline:baseline(),hazardStatus:'CLEAR'});
 assert.equal(r.historicalPercentileOf24hActivity,74.5);
 assert.equal(r.windowsInReference,100);
 assert.equal(r.comparisonStatus,'OBSERVED_OFFSHORE_ACTIVITY_VS_2026_ARCHIVE_ONLY');
 assert.equal(r.photoEvidenceRequired,false);
 assert.equal(r.percentileIsFrequencyOfMeasuredActivityNotRockFinds,true);
 assert.equal(r.calibratedNewAgateProbability,null);
 assert.equal(r.canPredictNewAgates,false);
 assert.equal(r.canClaimBeachSafe,false);
 assert.equal(r.physicalWavePowerKWPerM,null);
});
test('active NWS warnings veto any safe-visit interpretation even during high offshore activity',()=>{
 const r=compareToBaseline(current(95),{baseline:baseline(),hazardStatus:'ACTIVE'});
 assert.equal(r.historicalPercentileOf24hActivity,94.5);
 assert.equal(r.comparisonStatus,'OBSERVED_ACTIVITY_CONTEXT_ACTIVE_NWS_HAZARDS');
 assert.equal(r.hazardNotCleared,true);
 assert.equal(r.canPublishCollectingWindow,false);
});
test('stale or missing GLOS and gappy 24h windows suppress all percentiles',()=>{
 for(const change of [
  x=>{x.latestAgeHours=6},
  x=>{x.comparedWindowCoveragePct[0]=86},
  x=>{x.status='SOURCE_GAPPY_NO_48H_COMPARISON'},
  x=>{x.status='SOURCE_STALE'},
  x=>{x.current24hActivity=null},
  x=>{x.canForecastNewStones=true}
 ]){
  const t=current();change(t);
  const r=compareToBaseline(t,{baseline:baseline(),hazardStatus:'UNKNOWN'});
  assert.equal(r.historicalPercentileOf24hActivity,null);
  assert.equal(r.comparisonStatus,'NO_RECENT_SOURCE_COVERED_WINDOW');
  assert.equal(r.canClaimBeachSafe,false);
 }
});
test('percentile handles equal values using midpoint ranking and out-of-range measurements',()=>{
 assert.equal(compareToBaseline(current(1),{baseline:baseline()}).historicalPercentileOf24hActivity,.5);
 assert.equal(compareToBaseline(current(101),{baseline:baseline()}).historicalPercentileOf24hActivity,100);
 assert.equal(compareToBaseline(current(0),{baseline:baseline()}).historicalPercentileOf24hActivity,0);
});
test('untrusted 2026 source, synthetic seasonal climate claims and fake permission cannot leak through',()=>{
 const mutations=[
  x=>x.stationId='SPOT-1753',
  x=>x.canClaimBeachSafe=true,
  x=>x.baselineSeason='ALL_YEAR_CLIMATOLOGY',
  x=>x.orderedMeasuredValues[20]=0,
  x=>x.windowsAccepted=300,
  x=>x.sourceOriginalObservationCount=14,
 ];
 for(const mutate of mutations){
  const x=baseline();mutate(x);
  assert.throws(()=>compareToBaseline(current(),{baseline:x}),/source|distribution/i);
 }
});

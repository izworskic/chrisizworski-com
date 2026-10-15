'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {buildOffshoreSkillSlices,errorSummary,continuousHighWaveEpisodes}=
 require('../lib/rockhounding/offshore-skill-slices.cjs');
const at=(d,h)=>new Date(Date.UTC(2026,9,d,h)).toISOString();
function row(day,h,{observed=1.2,predicted=1.3,lead=6}={}){
 return {issueAt:at(day,h-lead),forecastValidAt:at(day,h),buoyObservedAt:new Date(Date.parse(at(day,h))-10*60000).toISOString(),
 buoyStation:'45004',modelGrid:'2p5km',modelCell:'47.578791,-86.573970',
 modelCellDistanceKm:1.016,leadHours:lead,modelHeightM:predicted,
 observedHeightM:observed,modelMinusObservedM:+(predicted-observed).toFixed(4),timeOffsetMinutes:-10};
}
test('real NOAA wave-error bands keep small samples hidden rather than claiming precision',()=>{
 const x=buildOffshoreSkillSlices([row(15,6),row(15,7),row(15,8)]);
 assert.equal(x.evidence.matchedPairs,3);
 assert.equal(x.leadTime['1-6h'].pairs,3);
 assert.equal(x.leadTime['1-6h'].maeM,null);
 assert.equal(x.leadTime['1-6h'].status,'INSUFFICIENT_PAIRS');
 assert.equal(x.observedHeight['at-least-1m'].pairs,3);
 assert.equal(x.evidence.separatedElevatedWaveEpisodes,1);
 assert.equal(x.evidence.readyForScientificEventLevelValidation,false);
});
test('lead and actual observed height bins split without assigning winds or model peaks to real waves',()=>{
 const samples=[
  row(15,6,{observed:.3,lead:1}),
  row(15,7,{observed:.6,lead:4}),
  row(15,8,{observed:1.5,lead:8}),
  row(15,9,{observed:1.2,lead:11}),
  row(15,10,{observed:.2,lead:18}),
  row(15,11,{observed:0,lead:24})
 ];
 const x=buildOffshoreSkillSlices(samples);
 assert.equal(x.leadTime['1-6h'].pairs,2);
 assert.equal(x.leadTime['7-12h'].pairs,2);
 assert.equal(x.leadTime['13-24h'].pairs,2);
 assert.equal(x.observedHeight['below-0.5m'].pairs,3);
 assert.equal(x.observedHeight['0.5-to-1m'].pairs,1);
 assert.equal(x.observedHeight['at-least-1m'].pairs,2);
 assert.equal(x.elevationIsNotNwsHazardThreshold,true);
});
test('three high-wave days separated more than 48h become three descriptive episodes only',()=>{
 const sample=[1,5,9].flatMap(day=>Array.from({length:6},(_,i)=>row(day,5+i,{observed:1.2+.1*(i%2),predicted:1.1,lead:6})));
 const result=buildOffshoreSkillSlices(sample);
 assert.equal(result.evidence.distinctObservedDays,3);
 assert.equal(result.evidence.separatedElevatedWaveEpisodes,3);
 assert.equal(result.evidence.independentlySampledHighWaveEpisodes,3);
 assert.equal(result.evidence.sufficientSeparatedElevatedEvents,true);
 assert.equal(result.evidence.sufficientPairs,false);
 assert.equal(result.evidence.readyForScientificEventLevelValidation,false);
 assert.equal(result.observedHeight['at-least-1m'].maeM,.15);
 assert.equal(Object.keys(result.observedUtcDay).length,3);
});
test('continuous hours across two calendar dates remain ONE elevated-wave event',()=>{
 const samples=[row(15,22),row(15,23),row(16,0),row(16,1)];
 assert.equal(continuousHighWaveEpisodes(samples).length,1);
});
test('invalid wave evidence and repeated buoy samples fail closed',()=>{
 const r=row(15,10);
 assert.throws(()=>buildOffshoreSkillSlices([r,r]),/double counted/);
 assert.throws(()=>buildOffshoreSkillSlices([{...r,buoyStation:'GRMM4'}]),/unaligned/);
 assert.throws(()=>buildOffshoreSkillSlices([{...r,observedHeightM:9999}]),/unaligned/);
 assert.throws(()=>buildOffshoreSkillSlices([{...r,modelHeightM:9}]),/unaligned/);
 assert.throws(()=>buildOffshoreSkillSlices([{...r,buoyObservedAt:at(15,12)}]),/unaligned/);
});
test('threshold .5 and 1m are descriptive bin edges and not shoreline safety thresholds',()=>{
 const rows=[row(15,6,{observed:.499,predicted:.5}),row(15,7,{observed:.5,predicted:.5}),row(15,8,{observed:.999,predicted:1}),row(15,9,{observed:1,predicted:1})];
 const s=buildOffshoreSkillSlices(rows);
 assert.equal(s.observedHeight['below-0.5m'].pairs,1);
 assert.equal(s.observedHeight['0.5-to-1m'].pairs,2);
 assert.equal(s.observedHeight['at-least-1m'].pairs,1);
 assert.equal(s.canPublishRockhoundingOpportunity,false);
 assert.equal(s.canPublishBeachSkill,false);
});
test('per-bucket MAE RMSE and bias are calculated from distinct observed waves only',()=>{
 const rows=[0,1,2,3,4].map((i)=>row(15,6+i,{observed:.5,predicted:.5+(i%2===0?.1:-.1)}));
 const s=buildOffshoreSkillSlices(rows);
 assert.equal(s.leadTime['1-6h'].maeM,.1);
 assert.equal(s.leadTime['1-6h'].rmseM,.1);
 assert.equal(s.leadTime['1-6h'].meanBiasM,.02);
 assert.equal(s.leadTime['1-6h'].distinctDays.length,1);
 assert.equal(s.evidence.sufficientDistinctDays,false);
});

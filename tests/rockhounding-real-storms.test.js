'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const data=require('../data/rockhounding/ndbc-45004-offshore-events-2026.json');
const {analyzeAll,analyzeEvent}=require('../lib/rockhounding/observed-storm-studies.cjs');
test('historical cases are genuine NOAA 45004 sample timestamps and heights',()=>{
 assert.equal(data.station.id,'45004');
 assert.equal(data.source.observedVariable,'wave_height');
 assert.equal(data.events.length,3);
 for(const e of data.events){
  const actual=data.samples.find(x=>x.t===e.peakAt);
  assert.ok(actual,e.id+' not found in observed sample');
  assert.equal(actual.hM,e.peakSignificantWaveHeightM);
 }
});
test('source provenance and imperfect coverage cannot silently be discarded',()=>{
 assert.equal(data.source.sampleStride,18);
 assert.ok(data.sourceRowsVisited>=500);
 assert.ok(data.sourceRowsWithValidHeight<data.sourceRowsVisited);
 assert.ok(data.samples.every(x=>Number.isFinite(x.hM)&&x.hM>=0&&x.hM<20));
});
test('three independent storm windows are separated in time',()=>{
 const epochs=data.events.map(e=>Date.parse(e.peakAt));
 for(let i=0;i<epochs.length;i++)for(let k=0;k<i;k++)assert.ok(Math.abs(epochs[i]-epochs[k])>=72*3600000);
});
test('all observed cases remain offshore-only and never validate rock exposure',()=>{
 const report=analyzeAll();
 assert.equal(report.studies.length,3);
 assert.equal(report.analysisNotRockExposureValidation,true);
 for(const row of report.studies){
  assert.equal(row.observedDisturbance,true);
  assert.equal(row.validForDirectionalExposureBacktest,false);
  assert.equal(row.validForStoneExposureValidation,false);
  assert.equal(row.validForBeachSafetyAssessment,false);
  assert.equal(row.outputClass,'OFFSHORE_BUOY_CASE_STUDY_ONLY');
  assert.ok(row.issues.includes('NO_MEASURED_BEACH_STONE_OUTCOME'));
 }
});
test('case peak cannot be forged by changing the NOAA event summary',()=>{
 const edited={...data.events[0],peakSignificantWaveHeightM:9.9};
 assert.throws(()=>analyzeEvent(edited),/Peak is not backed/);
});
test('subsampled high-water cases have observed subsequent lower waves, without unsafe advice',()=>{
 const r=analyzeAll();
 assert.ok(r.studies.every(x=>x.relativeHeightDropPct!==null&&x.relativeHeightDropPct>0));
 assert.ok(r.studies.every(x=>x.coverage.pre72h>=4&&x.coverage.post72h>=4));
});
test('no direction or local validation is implied by numeric buoy decline',()=>{
 const r=analyzeAll();
 assert.ok(r.studies.every(x=>x.issues.includes('NO_WAVE_DIRECTION_IN_ARCHIVED_SUBSET')));
 assert.ok(r.studies.every(x=>x.issues.includes('BUOY_DISTANT_FROM_GRAND_MARAIS')));
});

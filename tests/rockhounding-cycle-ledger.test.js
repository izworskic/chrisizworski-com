'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const evidence=require('../data/rockhounding/grand-marais-glwu-model-cycle-20261015T18Z.json');
const {normalizeCycle,mergeCycleLedger,verifyModelRevisions}=require('../lib/rockhounding/glwu-cycle-ledger.cjs');
const {createCycleReport}=require('../scripts/rockhounding/rolling-cycle-ledger.cjs');
const NOW='2026-10-15T21:30:00.000Z';
function olderLedger(){return mergeCycleLedger(null,evidence,{nowISO:NOW})}
test('actual NOAA cycle is immutable issue-time evidence with valid same-cell fields',()=>{
 const v=normalizeCycle(evidence);
 assert.equal(v.length,97);
 assert.equal(v.filter(x=>x.phase==='MODEL_ANALYSIS').length,2);
 assert.ok(v.every(x=>x.modelCycleAt==='2026-10-15T18:00:00.000Z'));
});
test('real 18Z NOAA data persists forecasts even when forecast valid times have passed',()=>{
 const first=olderLedger();
 const later=mergeCycleLedger(first,evidence,{nowISO:'2026-10-18T00:00:00.000Z'});
 assert.equal(first.records.length,97);
 assert.equal(later.records.length,97);
 assert.ok(later.records.some(x=>x.phase==='MODEL_FORECAST'&&Date.parse(x.validAt)<Date.parse(later.generatedAt)));
});
test('reprocessing the same original model issue does not duplicate rows',()=>{
 const first=olderLedger(),second=mergeCycleLedger(first,evidence,{nowISO:NOW});
 assert.equal(first.records.length,97);
 assert.equal(second.records.length,97);
 assert.equal(second.coverage['500m-greatlakes'].cycles,1);
 assert.equal(second.coverage['500m-greatlakes'].analysis,1);
 assert.equal(second.coverage['500m-greatlakes'].issuedForecasts,47);
});
test('later model initial compares against previously issued same-cell forecast, never calls it observed skill',()=>{
 const first=olderLedger();
 const original=evidence.datasets.find(x=>x.grid==='500m-greatlakes');
 const prev=original.records.find(x=>x.phase==='MODEL_FORECAST'&&Date.parse(x.validAt)<=Date.parse(NOW)+6*3600000);
 assert.ok(prev);
 const nextAt=prev.validAt,init={...prev,phase:'MODEL_ANALYSIS',modelCycleAt:nextAt,
  htsgwM:+(prev.htsgwM+0.03).toFixed(3)};
 const incoming={...evidence,datasets:[{...original,modelCycleAt:nextAt,records:[init]}]};
 const later=mergeCycleLedger(first,incoming,{nowISO:'2026-10-16T06:00:00.000Z'});
 const check=verifyModelRevisions(later,{grid:'500m-greatlakes'});
 assert.ok(check.matchedPairs>=1);
 assert.equal(check.isIndependentBuoyVerification,false);
 assert.equal(check.isBeachForecastSkill,false);
 assert.equal(check.status,'MODEL_REVISION_SAMPLE_NOT_OBSERVATIONAL_SKILL');
 assert.ok(check.matches.some(x=>x.validAt===nextAt));
 assert.equal(check.canPublishRockhoundingWindow,false);
});
test('changing location across model issues prevents false matched comparisons',()=>{
 const first=olderLedger();
 const original=evidence.datasets.find(x=>x.grid==='500m-greatlakes');
 const prev=original.records.find(x=>x.phase==='MODEL_FORECAST'&&Date.parse(x.validAt)<=Date.parse(NOW)+6*3600000);
 const shifted={...original,modelCycleAt:prev.validAt,
  cell:{...original.cell,lat:original.cell.lat+.0035},
  records:[{...prev,phase:'MODEL_ANALYSIS',modelCycleAt:prev.validAt,
  cellId:'glwu:500m-greatlakes:'+(original.cell.lat+.0035).toFixed(5)+':'+original.cell.lon.toFixed(5)}]};
 const merged=mergeCycleLedger(first,{...evidence,datasets:[shifted]},{nowISO:'2026-10-16T06:00:00.000Z'});
 const check=verifyModelRevisions(merged);
 assert.equal(check.matchedPairs,0);
 assert.equal(check.status,'INSUFFICIENT_MATCHED_CYCLES');
});
test('rejects invented shoreline validation or mismatched wave location and issue time',()=>{
 const fake={...evidence,beachWaterConnectivityValidated:true};
 assert.throws(()=>normalizeCycle(fake),/Invalid research-only/);
 const d=structuredClone(evidence);d.datasets[1].records[0].validAt='2026-10-18T20:00:00.000Z';
 assert.throws(()=>normalizeCycle(d),/Invalid, duplicate or mismatched/);
});
test('rollup never claims real buoy accuracy, safety, fresh stones or a visit window',()=>{
 const {ledger,report}=createCycleReport(evidence,null,NOW);
 assert.equal(ledger.canPublishPostStormWindow,false);
 assert.equal(report.independentBuoyObservationsIncluded,false);
 assert.equal(report.siteSpecificWaveConditionsValidated,false);
 assert.equal(report.canPublishRockhoundingOpportunity,false);
 assert.equal(report.comparisons['500m-greatlakes'].matchedPairs,0);
});
test('expired issued cycles disappear after retention window, even when forecasts reached future times',()=>{
 const old=olderLedger();
 const later=mergeCycleLedger(old,evidence,{nowISO:'2026-11-18T00:00:00.000Z'});
 assert.equal(later.records.length,0);
});

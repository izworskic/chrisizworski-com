'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const record=require('../data/rockhounding/grand-marais-glwu-model-cycle-20261015T18Z.json');
const {validateWave}=require('../lib/rockhounding/poststorm-engine.cjs');
const {mergeArchive}=require('../lib/rockhounding/glwu-archive.cjs');
const pilot=require('../data/rockhounding/grand-marais-wave-pilot.json');
test('actual NOAA 18Z model outputs contain two fixed and distinct north-open-lake directional cells',()=>{
 assert.deepEqual(record.datasets.map(x=>x.grid),['2p5km','500m-greatlakes']);
 assert.deepEqual(record.datasets.map(x=>x.validFourFieldTimestamps),[49,48]);
 assert.notEqual(record.datasets[0].cell.lat,record.datasets[1].cell.lat);
 assert.equal(record.datasets[1].cell.distanceKm,.445);
 assert.equal(record.beachWaterConnectivityValidated,false);
});
test('all persisted NOAA records pass the same engine provenance and valid-field checks',()=>{
 for(const set of record.datasets){
  assert.equal(new Set(set.records.map(x=>x.cellId)).size,1);
  assert.ok(set.records.every(validateWave));
  assert.ok(set.records.every(x=>x.sampleTargetId==='grand-marais-agate'));
  assert.equal(set.records.filter(x=>x.phase==='MODEL_ANALYSIS').length,1);
  assert.equal(set.records.filter(x=>x.phase==='MODEL_FORECAST').length,set.records.length-1);
  assert.ok(set.records.every(x=>x.windWaveFromDeg>=0&&x.windWaveFromDeg<360));
 }
});
test('500m missing timestamp remains missing rather than fabricated by interpolation',()=>{
 const fine=record.datasets[1].records;
 const stamps=new Set(fine.map(x=>Date.parse(x.validAt)));
 const first=Date.parse(fine[0].validAt),last=Date.parse(fine.at(-1).validAt);
 let missing=0;
 for(let t=first;t<=last;t+=3600000)if(!stamps.has(t))missing++;
 assert.equal(missing,1);
});
test('archival model cycle can be retained without pretending 72h of back-history exists',()=>{
 const fine=record.datasets[1];
 const archive=mergeArchive(null,{source:'NOAA_GLWU',records:fine.records},{nowISO:fine.modelCycleAt});
 assert.equal(archive.records.length,48);
 assert.equal(archive.records.filter(x=>x.phase==='MODEL_ANALYSIS').length,1);
 assert.equal(record.initialConditionIsNotIndependentBuoyObservation,true);
});
test('NOAA model data cannot be wired directly into visitor or protected-harbor recommendations',()=>{
 assert.equal(record.canPublishBeachWaveForecast,false);
 assert.equal(record.canClaimSafeShore,false);
 assert.equal(record.canClaimFreshExposedStones,false);
 assert.equal(record.harbor,'NOT_RESOLVED');
 assert.equal(pilot.pilotSites[0].modelCell,null);
 assert.equal(pilot.pilotSites[0].shore.reviewStatus,'UNVERIFIED_WATERLINE');
});

'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {compareSpotterToHistoricShore}=
 require('../lib/rockhounding/glos-spotter-facing.cjs');
const actual={
 time:'2026-10-14T23:46:01Z',
 source:'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE',
 phase:'OBSERVATION',
 waveHeightM:.95,waveFromDeg:329.11
};
test('authentic Grand Marais GLOS direction matches historic NOAA bearing in research, not beach surf',()=>{
 const r=compareSpotterToHistoricShore({observation:actual,sourceFreshness:'STALE_OBSERVATIONS'});
 assert.equal(r.status,'GLOS_OBSERVED_WAVE_DIRECTION_VS_HISTORIC_COASTLINE_ONLY');
 assert.equal(r.offshoreMeasuredSignificantWaveHeightM,.95);
 assert.equal(r.observedWaveFromDeg,329.11);
 assert.equal(r.historicalNoaaChartLakewardBearingDeg,336.74);
 assert.equal(r.relativeWaveFromAngleDeg,7.63);
 assert.ok(r.relativeResearchDirectionalAlignment>.98);
 assert.equal(r.sourceFreshness,'STALE_OBSERVATIONS');
 assert.equal(r.historicalNotPresentWetline,true);
 assert.equal(r.observedBuoyOffshoreNotBeach,true);
 assert.equal(r.waveRefractionOrBreakwaterTransmissionModeled,false);
 assert.equal(r.measuredBeachBreakingWavesM,null);
 assert.equal(r.canPredictStones,false);
 assert.equal(r.canPublishVisitWindow,false);
 assert.equal(r.canClaimSafeConditions,false);
});
test('opposite-direction observed waves do not prove the shoreline is calm',()=>{
 const r=compareSpotterToHistoricShore({observation:{...actual,waveFromDeg:170}});
 assert.equal(r.relativeResearchDirectionalAlignment,0);
 assert.equal(r.measuredBeachBreakingWavesM,null);
 assert.equal(r.canClaimSafeConditions,false);
});
test('sheltered Bayshore cannot inherit Agate facing angle or observed buoy surf',()=>{
 const r=compareSpotterToHistoricShore({siteId:'grand-marais-harbor',observation:actual});
 assert.equal(r.status,'NO_HARBOR_TRANSMISSION_MODEL');
 assert.equal(r.comparedHistoricCoastline,false);
 assert.equal(r.measuredBeachBreakingWavesM,null);
 assert.equal(r.canPublishSiteSurf,false);
});
test('missing and mislabelled wave observation does not become geophysical result',()=>{
 for(const obs of [null,{...actual,phase:'FORECAST'},{...actual,source:'NWS_WIND'},
    {...actual,waveFromDeg:400},{...actual,waveHeightM:-1}]){
  const r=compareSpotterToHistoricShore({observation:obs});
  assert.equal(r.status,'INVALID_OR_MISSING_GLOS_OPEN_LAKE_OBSERVATION');
  assert.equal(r.canPredictStones,false);
  assert.equal(r.comparedHistoricCoastline,false);
 }
});

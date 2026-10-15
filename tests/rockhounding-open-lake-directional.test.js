'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const data=require('../data/rockhounding/grand-marais-directional-wave-2026-10-15.json');
const pilot=require('../data/rockhounding/grand-marais-wave-pilot.json');
test('real NOAA run supports complete same-cell directional input at exposed Agate location',()=>{
 assert.equal(data.results.length,2);
 assert.equal(data.sourceSystem,'NOAA_NOMADS_GLWU_GRIB2_ECCODES');
 assert.equal(data.results[0].fourFieldUtcCoverage.complete,49);
 assert.equal(data.results[1].fourFieldUtcCoverage.complete,48);
 assert.equal(data.results[1].recommendedResearchCell.distanceKm,.445);
});
test('the open-water directional cell is never assigned to sheltered Bayshore Park',()=>{
 assert.equal(data.harbor.status,'UNRESOLVED_SHELTERED_BREAKWATER_BATHYMETRY');
 assert.equal(data.harbor.canUseOpenLakeAgateCell,false);
 assert.equal(data.harbor.canPublishHarborWaveHeight,false);
});
test('new directional evidence does not upgrade legal safety or rock-finding gates',()=>{
 assert.equal(data.provenanceAndLimits.canPublishRockhoundingWindow,false);
 assert.equal(data.provenanceAndLimits.canClaimSafeBeach,false);
 assert.equal(data.provenanceAndLimits.newStoneExposureOutcomeLabels,0);
 assert.equal(pilot.pilotSites[0].shore.reviewStatus,'UNVERIFIED_WATERLINE');
 assert.equal(pilot.pilotSites[0].modelCell,null);
});
test('NOAA forecast issue is distinct from model analysis and buoy observations',()=>{
 assert.equal(data.provenanceAndLimits.modelForecastNotObservedSurf,true);
 assert.equal(data.provenanceAndLimits.matchedBuoyBacktestSampleCount,0);
 assert.equal(data.provenanceAndLimits.archived72hModelAnalysisAvailable,false);
 assert.equal(data.modelCycleUTC,'2026-10-15T18:00:00.000Z');
});

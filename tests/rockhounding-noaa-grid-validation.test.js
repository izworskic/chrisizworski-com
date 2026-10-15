'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const snapshot=require('../data/rockhounding/grand-marais-noaa-grid-snapshot-2026-10-15.json');
test('NOAA Great Lakes product is 500m not Lake Champlain 500m-lc',()=>{
 assert.equal(snapshot.models.length,2);
 assert.equal(snapshot.models[1].file,'glwu.grlr_500m.t18z.grib2');
 assert.ok(snapshot.models.every(g=>!g.file.includes('500m_lc')));
 assert.equal(snapshot.modelCycleUTC,'2026-10-15T18:00:00.000Z');
});
test('2.5km naive geographic nearest assigns both research sites same cell',()=>{
 const g=snapshot.models[0];
 assert.equal(g.nearestFourMethod.sitesShareSingleCell,true);
 assert.ok(g.nearestFourMethod.distancesKm.agate>1);
 assert.equal(g.nearestFourMethod.modelHtsgwMAtFirstAnalysis,0.03);
 assert.match(g.nearestFourMethod.warning,/wrong side of shore/);
});
test('500m nearest four masked fields are missing data, not calm',()=>{
 const g=snapshot.models[1];
 assert.equal(g.nearestFourMethod.completeWaveRows,0);
 assert.equal(g.nearestFourMethod.allFourNearestCellsMaskedBy9999AtEachPoint,true);
 assert.match(g.nearestFourMethod.warning,/not a calm reading/);
});
test('500m contains real wet height cells at modest distance, but not complete directional wave records',()=>{
 const cells=snapshot.models[1].firstAnalysisHeightCandidates;
 assert.equal(cells.length,2);
 assert.ok(cells.every(c=>c.validHeightCellsWithin7Km>0));
 assert.ok(cells.every(c=>c.nearestValidHtSgwOnly.distanceKm<1));
 assert.equal(snapshot.models[1].canDeriveDirectionalNearshoreStormSignal,false);
 assert.equal(cells[1].shorelineConnection,'HARBOR_WATER_CONNECTION_UNVERIFIED_DO_NOT_TREAT_AS_CALM_SURF');
});
test('three offshore historical cases cannot be matched to October 15 operational model cycle',()=>{
 assert.equal(snapshot.historicalComparison.historicalDates.length,3);
 assert.equal(snapshot.historicalComparison.historicalGLWUAnalysesAvailableFromThisNOMADSQuery,false);
 assert.equal(snapshot.historicalComparison.matchedModelVersusBuoySkillScore,null);
 assert.equal(snapshot.validForRockExposureOutcome,false);
});
test('model point sampling and real buoy observations never imply a publishable visit window',()=>{
 assert.equal(snapshot.validForVisitorForecast,false);
 assert.equal(snapshot.analysisNotBuoyObservation,true);
 assert.ok(snapshot.models.every(g=>g.sourceVariables.includes('WVDIR')));
});

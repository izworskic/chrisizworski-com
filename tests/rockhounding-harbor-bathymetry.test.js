'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const snapshot=require('../data/rockhounding/grand-marais-noaa-enc-harbor-depth-2026-10-15.json');
const original=require('../data/rockhounding/grand-marais-noaa-enc-geometry-2026-10-15.json');
const {validateHarborDepth,harborStudyGate,depthCoverageSummary}=
 require('../lib/rockhounding/harbor-bathymetry.cjs');
test('NOAA harbor chart study recognizes overlapping coverage without summing soundings',()=>{
 assert.equal(validateHarborDepth(),true);
 const s=depthCoverageSummary();
 assert.deepEqual(s.zones.map(x=>[x.chartedSoundingCount,x.chartedContourCount]),
   [[17,6],[41,12],[38,12],[42,2]]);
 assert.equal(s.overlaps,true);
 assert.equal(s.totalDistinctSoundingsAcrossZones,null);
 assert.equal(s.minNavigableDepth,null);
 assert.equal(s.canPublishHarborSurf,false);
});
test('survey-source date provenance is 2004–2020 and depth units/datum are not independently reconciled',()=>{
 assert.equal(snapshot.historicCoverage.latestSoundingSourceDate,'20200806');
 assert.equal(snapshot.source.datumAndUnitReconciliationStatus,'NOT_INDEPENDENTLY_VERIFIED');
 assert.equal(snapshot.zones['pier-north'].soundings.sourceDates.at(-1),'20200806');
 assert.equal(snapshot.zones['harbor-center'].contours.individualSurveyDateKnown,false);
 assert.equal(snapshot.zones['inner-southwest'].soundings.chartedZIsCurrentNavigationDepth,false);
});
test('Bayshore harbor research reports real chart data, no numerical attenuation or safe-water claim',()=>{
 const out=harborStudyGate();
 assert.equal(out.chartedPierCount,2);
 assert.equal(out.recentUSACESurveyPlotStatus,'JULY_2026_USACE_PLOT_DATUM_VERIFIED_DEPTH_GRID_UNREVIEWED');
 assert.equal(out.recentUSACEPlotDepthDatum,'IGLD85');
 assert.equal(out.recentUSACEPlotSoundingUnits,'feet');
 assert.equal(out.recentUSACEXYZGridParsed,false);
 assert.equal(out.chartedSpotSoundingPresence,true);
 assert.equal(out.chartedDepthContourPresence,true);
 assert.equal(out.waveTransmissionFactor,null);
 assert.equal(out.predictedHarborWaveHeightM,null);
 assert.equal(out.observedHarborWaveHeightM,null);
 assert.equal(out.currentDredgingState,'NOT_INDEPENDENTLY_VERIFIED');
 assert.equal(out.canClaimShelteredSafeConditions,false);
 assert.equal(out.canPublishSiteWaves,false);
 assert.equal(out.canClaimNewStones,false);
 assert.equal(out.canPublishVisitWindow,false);
});
test('Agate surf research cannot inherit harbor charted depth and sheltered harbor cannot inherit Agate wave cell',()=>{
 const agate=harborStudyGate({siteId:'grand-marais-agate'});
 assert.equal(agate.harborTransferModelApplicable,false);
 assert.equal(agate.siteWaveHeightM,null);
 const harbor=harborStudyGate({siteId:'grand-marais-harbor'});
 assert.equal(harbor.doesNotSubstituteOffshoreModelCell,true);
 assert.equal(original.agate.approvedToPopulateReviewedWaterlineBearing,false);
});
test('the four zones are not a complete new bathymetric survey or measured wave calibration',()=>{
 assert.equal(snapshot.historicCoverage.doNotSumZoneCounts,true);
 assert.equal(snapshot.historicCoverage.modelHydrodynamicTransmissionNotCalibrated,true);
 assert.equal(snapshot.harborStructureEvidence.entranceOpeningWidthMeters,null);
 assert.equal(snapshot.operationalRelevance.dredgingCompletionVerified,false);
 assert.equal(snapshot.safety.canClaimCalmWater,false);
 assert.equal(snapshot.safety.canPredictFreshAgates,false);
});
test('source chart, missing zone, artificial depth clearance and invented shelter invalidate research gate',()=>{
 const edits=[
  s=>{s.source.dataset='UNKNOWN';},
  s=>{s.zones['harbor-center'].soundings.count=0;},
  s=>{s.zones['pier-north'].contours.individualSurveyDateKnown=true;},
  s=>{s.historicCoverage.chartDatumNotReconciled=false;},
  s=>{s.harborStructureEvidence.breakwaterTransmissionFactor=.1;},
  s=>{s.harborStructureEvidence.entranceOpeningWidthMeters=240;},
  s=>{s.safety.canPublishHarborWaveHeight=true;},
  s=>{s.zones['lake-approach'].soundings.chartedZIsCurrentNavigationDepth=true;}
 ];
 for(const f of edits){const fake=structuredClone(snapshot);f(fake);assert.throws(()=>validateHarborDepth(fake));}
});
test('unknown place never obtains unverified harbor conditions',()=>{
 const unknown=harborStudyGate({siteId:'not-in-pilot'});
 assert.equal(unknown.status,'UNKNOWN_PLACE');
 assert.equal(unknown.canPublishVisitWindow,false);
});

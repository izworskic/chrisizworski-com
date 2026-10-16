#!/usr/bin/env node
'use strict';
// Deterministic derived research digest from independently documented photos
// and frozen authentic GLOS offshore events. No scraping per visitor.
const fs=require('node:fs');
const path=require('node:path');
const {assessSeason}=require('../../lib/rockhounding/shoreline-photo-evidence.cjs');
const registry=require('../../data/rockhounding/grand-marais-dated-shoreline-evidence-2026.json');
function createAudit(){
 const a=assessSeason();
 return {
  schemaVersion:'rockhounding-shoreline-visual-crosscheck-2026-v1',
  reviewedOnUTC:registry.reviewedOnUTC,
  siteId:'grand-marais-agate',
  independentDatedBeachMediaSources:a.independentPublishedBeachSceneSources,
  geolocatedSingleScenes:a.gpsGeolocatedSingleSceneSources,
  independentlyMeasuredOffshoreWaveRecords:a.seasonOriginalGLOSWaveRows,
  sourceGroupedWaveEpisodes:a.seasonSourceBackedOffshoreEpisodes,
  qualifyingSampledWaveEpisodes:a.qualifiedOffshoreEpisodes,
  episodesWithApproximatePostSceneCandidate:a.eventsWithTentativePostBeachScene,
  reviewedSameVantageBeforeAfterPairs:a.comparableValidatedBeforeAfterPairs,
  observedBeachShorelineChanges:a.confirmedStormLinkedShorelineChanges,
  newlyExposedAgateRecords:a.measuredNewAgateExposures,
  status:a.evidenceStatus,
  photoSources:a.sourceRows,
  candidateConnections:a.eventAudits.filter(e=>e.postSceneCount>0).map(e=>({
   offshoreWavePeakAtUTC:e.peakObservedAt,
   offshoreWavePeakHeightM:e.offshoreWavePeakM,
   sourceQualifiedOffshoreEpisode:e.qualified,
   postEventMediaCandidates:e.possibleAfterSceneEvidence.map(x=>({
    photoId:x.id,sourceUrl:x.source,temporalStatus:x.role
   })),
   noConfirmedStormLinkedShorelineChange:e.verifiedShorelineChanges===0
  })),
  reviewedShorelineChangeImagePairs:0,
  nWSAlertsNotReconstructedForHistory:true,
  cameraLocationsDoNotDefineLegalAccess:true,
  sourcePhotoAloneNotBeachMaterialRearrangement:true,
  calibratedRockExposureScoreAvailable:false,
  canPredictNewAgates:false,
  canClaimRecentlyExposedRocks:false,
  canClaimBeachSafety:false,
  canPublishVisitWindow:false
 };
}
function run(argv=process.argv.slice(2)){
 if(argv.length!==2||!['--check','--write'].includes(argv[0])||!argv[1])
  throw Error('Usage: node audit-shoreline-photo-evidence.cjs --check|--write PATH');
 const file=path.resolve(argv[1]),actual=createAudit();
 if(argv[0]==='--check'){
  const expected=JSON.parse(fs.readFileSync(file,'utf8'));
  require('node:assert/strict').deepStrictEqual(expected,actual,
    'Independent shoreline source digest drifted; review before altering site claims');
 }else{
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(actual,null,2)+'\n');
 }
 console.log('ROCKHOUNDING_INDEPENDENT_SHORE_SCENES '+JSON.stringify({
  independentScenes:actual.independentDatedBeachMediaSources,
  provisionalPostSceneEpisodes:actual.episodesWithApproximatePostSceneCandidate,
  independentlyVerifiedPrePostPairs:actual.reviewedSameVantageBeforeAfterPairs,
  measuredAgatesExposed:actual.newlyExposedAgateRecords,
  safeShore:false,siteWaveClaims:false}));
 return actual;
}
if(require.main===module){try{run()}catch(e){console.error('ROCKHOUNDING_SHORE_MEDIA_AUDIT_FAILED '+e.message);process.exitCode=1}}
module.exports={createAudit,run};

'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const source=require('../data/rockhounding/grand-marais-dated-shoreline-evidence-2026.json');
const history=require('../public/rockhounding-lab/glos-season-2026-research.json');
const {validateRegistry,pointInPolygon,sitePolygon,classifySourcePhoto,
 assessEpisode,assessSeason,reviewPairGate}=require('../lib/rockhounding/shoreline-photo-evidence.cjs');
test('independent actual July 5 2026 Commons original Agate photo has real coordinate in research polygon, not waterline',()=>{
 assert.equal(validateRegistry(),true);
 const x=classifySourcePhoto(source.observations[0]);
 assert.equal(x.cameraInsideUnsureOSMResearchPolygon,true);
 assert.equal(x.status,'GEOLOCATED_DATED_SINGLE_SCENE_BASELINE');
 assert.equal(x.captureTimeExactToUTC,false);
 assert.equal(x.verifiedStableViewForComparison,false);
 assert.equal(x.canPredictNewAgates,false);
 assert.equal(x.actualSedimentChangeAssessed,false);
 assert.equal(pointInPolygon([-85.987480,46.675190],sitePolygon()),true);
 assert.equal(pointInPolygon([-84,45],sitePolygon()),false);
});
test('dated Flickr scene is link-only, not a geolocated GPS image or licensed for copying',()=>{
 const x=classifySourcePhoto(source.observations[1]);
 assert.equal(x.cameraInsideUnsureOSMResearchPolygon,null);
 assert.equal(x.status,'DATED_SITE_MEDIA_NO_GPS');
 assert.match(source.observations[1].rights,/All rights reserved/);
 assert.equal(source.observations[1].imagePairManuallyReviewed,false);
});
test('July 26 source statement about two days earlier creates only uncertain possible July 21 post-storm evidence',()=>{
 const event=history.rows.find(x=>x.peakObservedAt==='2026-07-21T23:46:01Z');
 assert.ok(event);
 const out=assessEpisode(event);
 assert.equal(out.peakOffshoreSignificantWaveHeightM,1.62);
 assert.equal(out.offshoreEventEligibleForReview,true);
 assert.equal(out.precedingSceneCandidates,0);
 assert.equal(out.followingSceneCandidates,1);
 assert.equal(out.possibleAfterSceneEvidence[0].role,'POST_EVENT_POSSIBLE_TIME_OVERLAP_UNCERTAIN');
 assert.equal(out.status,'POST_EVENT_SCENE_CANDIDATE_BUT_NO_COMPARABLE_SHORELINE_PAIR');
 assert.equal(out.confirmedShorelineMorphologyChanges,0);
 assert.equal(out.documentedNewlyExposedAgates,0);
 assert.equal(out.canPublishVisitWindow,false);
});
test('the actual 11 events and published photos cannot create a phantom before/after pair',()=>{
 const report=assessSeason();
 assert.equal(report.seasonOriginalGLOSWaveRows,5243);
 assert.equal(report.seasonSourceBackedOffshoreEpisodes,11);
 assert.equal(report.qualifiedOffshoreEpisodes,8);
 assert.equal(report.independentPublishedBeachSceneSources,3);
 assert.equal(report.gpsGeolocatedSingleSceneSources,1);
 assert.equal(report.eventsWithTentativePostBeachScene,1);
 assert.equal(report.comparableValidatedBeforeAfterPairs,0);
 assert.equal(report.confirmedStormLinkedShorelineChanges,0);
 assert.equal(report.measuredNewAgateExposures,0);
 assert.equal(report.noHistoricalAlertsBackfilled,true);
 assert.equal(report.canPredictNewAgates,false);
 assert.equal(report.evidenceStatus,'INDEPENDENT_MEDIA_EXISTS_BUT_NO_VALID_BEFORE_AFTER_CHANGE_PAIR');
 assert.equal(report.eventAudits.find(x=>x.peakObservedAt==='2026-10-12T14:46:01Z').postSceneCount,0);
});
test('dated media and OSM pilot zone cannot drift into unsourced shoreline-change claims',()=>{
 const corruptions=[
  e=>{e.observations[0].photoGeo.lat=44},
  e=>{e.observations[1].imagePairManuallyReviewed=true},
  e=>{e.observations[2].reportedVisibleRockExposure='MORE_STONES'},
  e=>{e.observations[2].captureWindowStartUTC='2026-10-12T00:00:00Z'},
  e=>{e.acquisitionConstraints.verifiedNewAgateExposures=2},
  e=>{e.publicClaims.canClaimRecentlyExposedRocks=true},
  e=>{e.observations[0].rights='All rights reserved'},
  e=>{e.observations[0].cameraViewDirectionDeg=340}
 ];
 for(const corruption of corruptions){
  const fake=structuredClone(source);corruption(fake);
  assert.throws(()=>validateRegistry(fake));
 }
});
test('even rigorously reviewed synthetic shoreline change cannot claim a new agate or safe trip',()=>{
 const paired={
  siteId:'grand-marais-agate',
  outcomeSourceType:'INDEPENDENT_SHORELINE_VISUAL',
  beforeUTC:'2026-09-08T17:00:00Z',afterUTC:'2026-09-10T18:00:00Z',
  sameGeoreferencedLandmarks:true,reviewedCameraGeometry:true,
  reviewedWaterLevelAndWaveConfounding:true,
  reviewedLightingAndObstruction:true,
  independentlyDatedTwoFrames:true,
  reviewedOutcome:'VISIBLE_SEDIMENT_SHIFT'
 };
 const measured=reviewPairGate(paired);
 assert.equal(measured.status,'REVIEWED_VISIBLE_SHORE_CHANGE_UNATTRIBUTED');
 assert.equal(measured.verifiedShorelineChange,true);
 assert.equal(measured.stormCausedChangeConfirmed,false);
 assert.equal(measured.newAgateExposureConfirmed,false);
 assert.equal(measured.canTrainRockhoundingForecast,false);
 assert.equal(measured.canClaimBeachSafety,false);
 assert.equal(measured.canPublishVisitWindow,false);
 assert.equal(reviewPairGate({...paired,reviewedWaterLevelAndWaveConfounding:false}).verifiedShorelineChange,false);
 assert.equal(reviewPairGate({...paired,independentlyDatedTwoFrames:false}).verifiedShorelineChange,false);
});
test('a post claiming stones with no beach GPS or matching pre-event image does not count as rock exposure',()=>{
 const p=source.observations[2];
 const result=classifySourcePhoto(p);
 assert.equal(result.status,'APPROXIMATE_DATED_SITE_MEDIA_NO_GPS');
 assert.equal(result.imageGeoReference,'SITE_NAME_ONLY_NO_CAMERA_GPS');
 assert.equal(result.canClaimRecentlyExposedRocks,false);
 assert.equal(result.canClaimBeachSafety,false);
 assert.equal(result.isAgateStoneExposureCalibration,false);
});

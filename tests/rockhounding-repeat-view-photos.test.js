'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const reg=require('../data/rockhounding/grand-marais-repeat-view-source-candidates-2026.json');
const {validateRegistry,haversineMeters,angularSeparation,auditedPair,
 validateComparableRetakePair,auditAll}=require('../lib/rockhounding/repeat-view-photos.cjs');
test('original 2014 photo clocks and actual July 2026 Agate GPS are sourced and none is a geolocated repeat pair',()=>{
 assert.equal(validateRegistry(),true);
 assert.equal(reg.sources[0].captureDate,'2014-05-31');
 assert.equal(reg.sources[0].localCameraClock,'10:30');
 assert.equal(reg.sources[1].localCameraClock,'10:36');
 assert.equal(reg.sources[0].cameraGPS,null);
 assert.equal(reg.sources[1].cameraGPS,null);
 assert.equal(reg.sources[2].captureDate,'2026-07-05');
 assert.equal(reg.sources[2].cameraGPS.lat,46.67519);
 assert.equal(reg.sources[2].cameraGPS.lon,-85.98748);
 assert.equal(reg.sources[2].cameraTimezoneConfirmed,false);
 assert.equal(reg.sources[0].lensFocalLengthMm,55);
 assert.equal(reg.sources[1].lensFocalLengthMm,18);
 assert.equal(reg.sources[2].lensFocalLengthMm,78);
});
test('apparent coastline/dune similarity is candidate only, not registered view or verified beach-change',()=>{
 const p=auditedPair(reg.pairs[0]);
 assert.equal(p.eligibility,'POSSIBLE_LANDSCAPE_LANDMARK_FAMILY_NO_COMMON_CAMERA_STATION');
 assert.equal(p.cameraSeparationMeters,null);
 assert.equal(p.cameraHeadingDifferenceDegrees,null);
 assert.equal(p.matchingStableLandmarkGeometryReviewed,false);
 assert.equal(p.visibleBeachSedimentChangeMeasured,false);
 assert.equal(p.reproduciblePixelShorelineTransectM,null);
 assert.equal(p.interveningDocumented2026OffshoreEpisodes,0);
 assert.equal(p.canPredictNewAgates,false);
 assert.equal(p.canClaimShorelineChange,false);
 assert.equal(p.canClaimSafeConditions,false);
});
test('2014 open horizon negative control cannot be a match with 2026 dunes',()=>{
 const p=auditedPair(reg.pairs[1]);
 assert.equal(p.eligibility,'NO_REPEAT_VIEW_OPEN_HORIZON_CONTROL');
 assert.equal(p.cameraSeparationMeters,null);
 assert.equal(p.single2026OffshoreEventBracketedByCameraDates,false);
});
test('photo register drift and false camera GPS are blocked',()=>{
 const edits=[
  r=>{r.sources[0].cameraGPS={lat:46.67519,lon:-85.98748}},
  r=>{r.sources[2].cameraGPS.lat=45.67519},
  r=>{r.sources[1].fixedLandmarksCoRegistered=true},
  r=>{r.sources[0].documentedWaterlineChange=true},
  r=>{r.sources[0].cameraTimezoneConfirmed=true},
  r=>{r.sources[0].license='CC_BY_4_0'},
  r=>{r.pairs[0].eligibleForShorelineChangeMeasurement=true},
  r=>{r.pairs[0].sameCameraStationConfirmed=true},
  r=>{r.claims.canClaimAgateFindProbability=true}
 ];
 for(const edit of edits){
  const fake=structuredClone(reg);edit(fake);
  assert.throws(()=>validateRegistry(fake));
 }
});
test('research audit counts no actual same-view 2026 storm pre/post pairs',()=>{
 const a=auditAll();
 assert.equal(a.availableOriginalPubliclyReusableHistoricalPhotos,2);
 assert.equal(a.gpsAnchoredLicensed2026AgateBaseline,1);
 assert.equal(a.archivalLandmarkPatternCandidates,1);
 assert.equal(a.historicalOpenHorizonNegativeControls,1);
 assert.equal(a.cameraMatchedBeforeAfterPairs,0);
 assert.equal(a.dateMatchedPrePost2026WavePairs,0);
 assert.equal(a.empiricallyVerifiedNewAgates,0);
 assert.equal(a.outcomes.length,2);
 assert.equal(a.canPublishVisitWindow,false);
 assert.equal(a.canClaimShorelineChange,false);
});
function retake(overrides={}){
 const pos={lat:46.67519,lon:-85.98748};
 return {siteId:'grand-marais-agate',sourceCategory:'WIKIMEDIA_COMMONS',
  frames:[
   {exifCaptureUTC:'2026-09-08T13:00:00Z',timeProvenance:'ORIGINAL_EXIF_VERIFIED',timezoneVerified:true,
    cameraGPS:pos,headingDeg:335,focalLengthMm:78,originalSourceUrl:'https://commons.wikimedia.org/wiki/File:Before.jpg',imageRightsVerified:true},
   {exifCaptureUTC:'2026-09-12T13:00:00Z',timeProvenance:'ORIGINAL_EXIF_VERIFIED',timezoneVerified:true,
    cameraGPS:{lat:46.67519,lon:-85.987475},headingDeg:337,focalLengthMm:82,
    originalSourceUrl:'https://commons.wikimedia.org/wiki/File:After.jpg',imageRightsVerified:true}
  ],
  sameStaticLandmarksHumanVerified:true,referencePointsReviewedCount:4,
  geometricRegistrationHumanVerified:true,
  waterLevelAndTemporaryRunupControlled:true,snowIceAndSeasonalObstructionControlled:true,
  lightingAndPerspectiveConfoundersReviewed:true,
  ...overrides};
}
test('hypothetical truly sourced same-station photographs unlock only camera alignment; never stone/safety forecast',()=>{
 const x=validateComparableRetakePair(retake());
 assert.equal(x.status,'CAMERA_AND_LANDMARK_REPEATABILITY_REVIEWED_NOT_SHORE_CHANGE');
 assert.equal(x.matchedViewpoint,true);
 assert.ok(x.cameraDistanceMeters<20);
 assert.equal(x.reviewedShorelineChange,false);
 assert.equal(x.stormCausalityEstablished,false);
 assert.equal(x.canPredictNewAgates,false);
 assert.equal(x.canPublishVisitWindow,false);
});
test('no GPS, bad date timezone, 21m camera displacement, 20 degree view or unverified water stage fail',()=>{
 const variants=[
  x=>{x.frames[0].cameraGPS=null},
  x=>{x.frames[1].timezoneVerified=false},
  x=>{x.frames[1].headingDeg=359},
  x=>{x.frames[1].cameraGPS.lon+=.001},
  x=>{x.frames[1].originalSourceUrl='javascript:alert(0)'},
  x=>{x.waterLevelAndTemporaryRunupControlled=false},
  x=>{x.referencePointsReviewedCount=2},
  x=>{x.frames[1].exifCaptureUTC='2026-09-08T13:10:00Z'},
  x=>{x.sameStaticLandmarksHumanVerified=false}
 ];
 for(const edit of variants){
  const x=retake();edit(x);
  const gate=validateComparableRetakePair(x);
  assert.equal(gate.matchedViewpoint,false);
  assert.equal(gate.canClaimSafeConditions,false);
  assert.equal(gate.canClaimShorelineChange,false);
 }
});
test('haversine and compass wraparound behave correctly with unknown inputs',()=>{
 assert.equal(haversineMeters(null,{lat:46,lon:-85}),null);
 assert.equal(haversineMeters({lat:46,lon:-85},{lat:46,lon:-85}),0);
 assert.equal(angularSeparation(359,1),2);
 assert.equal(angularSeparation(23,300),83);
 assert.equal(angularSeparation(null,300),null);
});

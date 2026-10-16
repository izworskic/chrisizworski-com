'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const archive=require('../public/rockhounding-lab/glos-season-2026-research.json');
const photos=require('../data/rockhounding/grand-marais-dated-shoreline-evidence-2026.json');
const {scopeName,sourceBounds,sourceScenes,relation,eventQueue,pairProof,NOT_SAME_BEACH}=
 require('../lib/rockhounding/storm-photo-review-queue.cjs');
test('distinguish the two different Agate Beaches in Michigan, including a real misleading July 2026 Reddit photo',()=>{
 assert.equal(scopeName('Agate Beach in Stanton Township outside Toivola'),'WRONG_AGATE_BEACH_STANTON_TOWNSHIP');
 assert.equal(scopeName('Agate Beach Grand Marais Michigan'),'GRAND_MARAIS_TEXT_CONTEXT_ONLY');
 assert.equal(scopeName('Agate Beach Upper Peninsula'),'UNRESOLVED_AGATE_BEACH_NAME');
 assert.equal(NOT_SAME_BEACH.siteId,'stanton-township-toivola-agate-beach');
 assert.equal(NOT_SAME_BEACH.originalPhotoDay,'2026-07-07');
 assert.equal(NOT_SAME_BEACH.useAsGrandMaraisObservation,false);
});
test('the 2026 local camera days are timezone uncertain, and upload date never substitutes capture',()=>{
 const july=sourceBounds(photos.observations[0]);
 assert.equal(new Date(july.begin).toISOString(),'2026-07-04T12:00:00.000Z');
 assert.equal(new Date(july.end).toISOString(),'2026-07-06T12:00:00.000Z');
 const reddit=sourceBounds(photos.observations[2]);
 assert.equal(new Date(reddit.begin).toISOString(),'2026-07-23T00:00:00.000Z');
 assert.equal(new Date(reddit.end).toISOString(),'2026-07-26T00:00:00.000Z');
 const scenes=sourceScenes();
 assert.equal(scenes.length,7); // 3 dated site scenes + 4 parseable nearby geotag dates; one free-text date is not invented
 assert.equal(scenes.filter(s=>s.sourceType==='WIKIMEDIA_NEARBY_GPS_ONLY').length,4);
 assert.equal(scenes.filter(s=>s.siteIdentity==='SOURCE_NAMED_GRAND_MARAIS').length,3);
 assert.ok(scenes.every(s=>s.originalUploadOnly===false));
});
test('eight real qualified GLOS wave episodes yield one uncertain July 21 post candidate, zero true matched pre/post',()=>{
 const q=eventQueue();
 assert.equal(q.eligibleIndependentMeasuredOffshoreEpisodes,8);
 assert.equal(q.originalWaveRows,5243);
 assert.equal(q.eventsWithDatedNamedSiteMedia,1);
 assert.equal(q.eventsWithUncertainPostScene,1);
 assert.equal(q.sourceNamedGrandMaraisMedia,3);
 assert.equal(q.nearbyCommonsGeotaggedFileCount,6);
 assert.equal(q.matchedSameVantageBeforeAfterStormPairs,0);
 assert.equal(q.measuredWaveAttributedSedimentChanges,0);
 assert.equal(q.verifiedNewAgates,0);
 assert.equal(q.canPredictNewAgates,false);
 assert.equal(q.canPublishVisitWindow,false);
 const e=q.stormCandidateWindows.find(x=>x.observedOffshorePeakAtUTC==='2026-07-21T23:46:01Z');
 assert.ok(e);
 assert.equal(e.observedOffshorePeakM,1.62);
 assert.equal(e.namedSitePreCandidates,0);
 assert.equal(e.namedSitePostCandidates,1);
 assert.equal(e.blocker,'LACKS_CLOSE_PRE_STORM_BEACH_SCENE');
 assert.equal(e.sourceCandidates[0].id,'reddit-agate-beach-july-24-2026-approx');
 assert.equal(e.sourceCandidates[0].timeRole,'POSSIBLE_POST_WINDOW_OVERLAP_UNCERTAIN');
 assert.equal(q.stormCandidateWindows[0].observedOffshorePeakM,2.57);
 assert.equal(q.stormCandidateWindows[1].observedOffshorePeakM,2.51);
 assert.equal(q.stormCandidateWindows[0].namedSitePostCandidates,0);
});
test('real 2016 shore-tagged photograph is not a 2026 storm-bridging photo',()=>{
 const q=eventQueue();
 assert.ok(q.stormCandidateWindows.every(e=>e.nearbyGeoOnlyNeedsSceneReview===0));
 const match=relation(sourceScenes()[3],archive.rows.find(r=>r.peakObservedAt==='2026-10-12T14:46:01Z'));
 assert.equal(match,'OUTSIDE_EVENT_RESEARCH_WINDOWS');
});
test('newly discovered photo GPS plus matching Oct 12 date must remain unreviewed until original site and viewpoint evidence exists',()=>{
 const candidate={pageId:400000000,title:'File:Agate Beach possible view.jpg',
  descriptionURL:'https://commons.wikimedia.org/wiki/File:Agate_Beach_possible_view.jpg',
  originalUploadUTC:'2026-10-16T00:00:00Z',
  capture:{day:'2026-10-16',quality:'PUBLISHED_ORIGINAL_DATE_LOCAL_ZONE_UNVERIFIED'},
  lat:46.67520,lon:-85.98747};
 const q=eventQueue({additionalGeoRows:[candidate]});
 assert.equal(q.extraNewNearbyGeoPhotosNeedingSiteReview,1);
 const oct=q.stormCandidateWindows.find(e=>e.observedOffshorePeakAtUTC==='2026-10-12T14:46:01Z');
 assert.equal(oct.nearbyGeoOnlyNeedsSceneReview,1);
 assert.equal(oct.namedSitePreCandidates,0);
 assert.equal(oct.namedSitePostCandidates,0);
 assert.equal(oct.blocker,'UNREVIEWED_GPS_MEDIA_NOT_PROVEN_AGATE_VIEW');
 assert.equal(oct.sourceCandidates[0].agateSceneConfirmed,false);
 assert.equal(oct.sourceCandidates[0].confirmsSedimentChange,false);
 assert.equal(q.verifiedNewAgates,0);
});
function frame(at,lon=-85.98748,heading=336){
 return {exifCaptureUTC:at,timeProvenance:'ORIGINAL_EXIF_VERIFIED',timezoneVerified:true,
  cameraGPS:{lat:46.67519,lon},headingDeg:heading,
  focalLengthMm:78,originalSourceUrl:'https://commons.wikimedia.org/wiki/File:Verified_photo.jpg',
  imageRightsVerified:true};
}
function packet(){
 const id='SPOT1361-2026-07-21T23:46:01Z';
 return {eventId:id,sourceCategory:'WIKIMEDIA_COMMONS',
  before:frame('2026-07-20T11:00:00Z'),after:frame('2026-07-23T11:00:00Z',-85.987475,339),
  sameStaticLandmarksHumanVerified:true,referencePointsReviewedCount:4,
  geometricRegistrationHumanVerified:true,waterLevelAndTemporaryRunupControlled:true,
  snowIceAndSeasonalObstructionControlled:true,lightingAndPerspectiveConfoundersReviewed:true};
}
test('even hypothetical exact same camera storm-bracketed photos only unlock candidate image registration',()=>{
 const p=packet();
 const r=pairProof(p,p.eventId);
 assert.equal(r.status,'STORM_BRACKETED_COMMON_CAMERA_CANDIDATE_NOT_MEASURED_SHORE_CHANGE');
 assert.equal(r.matchedViewpoint,true);
 assert.equal(r.measuredBeachMorphologyChange,false);
 assert.equal(r.stormCausalLinkVerified,false);
 assert.equal(r.canTrainRockExposure,false);
 assert.equal(r.canPublishVisitWindow,false);
});
test('an exact looking after photo outside event or camera mismatch cannot authorize a paired event',()=>{
 let p=packet();
 p.after.exifCaptureUTC='2026-07-31T11:00:00Z';
 assert.equal(pairProof(p,p.eventId).status,'ORIGINAL_PHOTO_TIMESTAMPS_DO_NOT_BRACKET_SOURCE_STORM');
 p=packet();p.after.cameraGPS.lon=-85.98848;
 assert.equal(pairProof(p,p.eventId).matchedViewpoint,false);
 p=packet();p.sameStaticLandmarksHumanVerified=false;
 assert.equal(pairProof(p,p.eventId).matchedViewpoint,false);
 p=packet();
 assert.equal(pairProof(p,'SPOT1361-2026-10-12T14:46:01Z').status,'PAIR_NOT_SOURCE_VERIFIED');
});
test('suspicious new geotag or malformed provenance fails closed',()=>{
 assert.throws(()=>eventQueue({additionalGeoRows:[{pageId:1,title:'X',descriptionURL:'https://wrong.example/a',
   capture:{day:'2026-10-13'},lat:46.675,lon:-85.987}]}),/Untrusted/);
 assert.throws(()=>eventQueue({additionalGeoRows:[{pageId:1,title:'X',descriptionURL:'https://commons.wikimedia.org/wiki/File:X',
   capture:{day:'2026-10-13'},lat:44,lon:-85.987}]}),/outside source/);
});

'use strict';
// Event-specific image review queue, NOT a shoreline exposure forecast.
// Independent capture dates can be approximate; upload times cannot fill in
// original time. A repeated name ("Agate Beach") can refer to Toivola, MI.
const beaches=require('../../data/rockhounding/grand-marais-dated-shoreline-evidence-2026.json');
const commons=require('../../data/rockhounding/grand-marais-commons-geosearch-2026-10-16.json');
const history=require('../../public/rockhounding-lab/glos-season-2026-research.json');
const {distanceMeters}=require('./commons-camera-discovery.cjs');
const {pointInPolygon,sitePolygon}=require('./shoreline-photo-evidence.cjs');
const {validateComparableRetakePair}=require('./repeat-view-photos.cjs');
const H=3600000;
const NO_CLAIMS=Object.freeze({
 canPredictNewAgates:false,canClaimExposedStones:false,
 canPublishVisitWindow:false,canClaimSafeShore:false,
 calibratedToRockOutcomes:false
});
const CONFIRMED_SITE='grand-marais-agate';
const NOT_SAME_BEACH={
 source:'https://www.reddit.com/r/Michigan/comments/1uuwj6n/agate_beach_upper_peninsula_just_before_sunset/',
 label:'Agate Beach, Stanton Township / Toivola, Houghton County, Michigan',
 originalPhotoDay:'2026-07-07',
 postedOn:'2026-07-13',
 siteId:'stanton-township-toivola-agate-beach',
 proof:'Poster clarified that this Agate Beach is in Stanton Township outside Toivola, Keweenaw region—not Grand Marais.',
 useAsGrandMaraisObservation:false
};
function epoch(s){const t=Date.parse(s);return Number.isFinite(t)?t:NaN}
function sourceBounds(s){
 if(!s||!s.captureWindowStartUTC||!s.captureWindowEndUTC)
  return null;
 const begin=epoch(s.captureWindowStartUTC),end=epoch(s.captureWindowEndUTC);
 if(!Number.isFinite(begin)||!Number.isFinite(end)||begin>=end)return null;
 // The two published July photos have original local camera date but no
 // verified timezone. Expand the date at both ends, NEVER assign exact UTC.
 const unknownZone=s.captureDateEvidence!=='APPROXIMATE_DAY_FROM_JULY_26_RELATIVE_STATEMENT';
 return {begin:begin-(unknownZone?12*H:0),end:end+(unknownZone?12*H:0),
  provenance:s.captureDateEvidence};
}
function sourceScenes({additionalGeoRows=[]}={}){
 if(beaches.schemaVersion!=='rockhounding-grand-marais-shoreline-evidence-register-v1'||
    beaches.observations.length!==3||
    commons.schemaVersion!=='rockhounding-commons-grand-marais-geotagged-source-v1'||
    commons.results.length!==6||!Array.isArray(additionalGeoRows)||additionalGeoRows.length>50)
  throw Error('Dated-photo or original Wikimedia camera-source register drift');
 const scenes=beaches.observations.map(s=>{
  const b=sourceBounds(s);
  return {id:s.evidenceId,sourceUrl:s.sourceUrl,
   fromMs:b.begin,toMs:b.end,originalDateQuality:b.provenance,
   sourceType:s.sourceClass,
   siteIdentity:s.siteId===CONFIRMED_SITE?'SOURCE_NAMED_GRAND_MARAIS':'UNKNOWN_SITE',
   insideSiteResearchPolygon:s.photoGeo?
    pointInPolygon([s.photoGeo.lon,s.photoGeo.lat],sitePolygon()):null,
   camera:s.photoGeo?{lat:s.photoGeo.lat,lon:s.photoGeo.lon}:null,
   sourceReviewed:true,timeZoneVerified:false,headingVerified:false,
   humanSameLandmarksReviewed:false,reusedOriginalImage:false,
   originalUploadOnly:false};
 });
 // Geosearch is a CAMERA-NEARBY discovery source. Except the specifically
 // reviewed 2026 baseline, its images are not known to depict Agate Beach.
 const known=commons.results.filter(r=>r.pageId!==195534341).map(r=>({
  pageId:r.pageId,title:r.title,capture:{day:
   /^\d{4}-\d\d-\d\d/.test(r.sourceCaptureDateText)?
   r.sourceCaptureDateText.slice(0,10):null,
   quality:'PUBLISHED_ORIGINAL_DATE_LOCAL_ZONE_UNVERIFIED'},
  lat:r.lat,lon:r.lon,descriptionURL:r.descriptionURL,
  originalUploadUTC:r.originalUploadUTC
 }));
 const geo=[...known,...additionalGeoRows];
 const seen=new Set();
 for(const row of geo){
  if(!Number.isInteger(row.pageId)||seen.has(row.pageId))
   throw Error('Duplicate or unknown public-image source identifier');
  seen.add(row.pageId);
  const t=row.capture?.day;
  if(!t||!/^\d{4}-\d\d-\d\d$/.test(t))continue;
  const start=epoch(t+'T00:00:00Z');
  if(!Number.isFinite(start))continue;
  const camera={lat:row.lat,lon:row.lon};
  if(![camera.lat,camera.lon].every(Number.isFinite)||
    distanceMeters(camera,{lat:46.67519,lon:-85.98748})>2020)
   throw Error('Wikimedia geotag outside source research radius');
  if(!/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(row.descriptionURL))
   throw Error('Untrusted source photo link');
  scenes.push({
   id:'wikimedia-geotag-'+row.pageId,sourceUrl:row.descriptionURL,
   fromMs:start-12*H,toMs:start+36*H,
   originalDateQuality:row.capture.quality,sourceType:'WIKIMEDIA_NEARBY_GPS_ONLY',
   siteIdentity:'NEARBY_GPS_NOT_REVIEWED_AS_AGATE_BEACH',
   insideSiteResearchPolygon:pointInPolygon([camera.lon,camera.lat],sitePolygon()),
   camera,sourceReviewed:false,timeZoneVerified:false,headingVerified:false,
   humanSameLandmarksReviewed:false,reusedOriginalImage:false,originalUploadOnly:false
  });
 }
 return scenes;
}
function scopeName(s){
 const str=String(s||'').toLowerCase();
 if(/stanton township|toivola|houghton county/.test(str))
  return 'WRONG_AGATE_BEACH_STANTON_TOWNSHIP';
 if(/grand marais/.test(str)&&/michigan|agate/.test(str))
  return 'GRAND_MARAIS_TEXT_CONTEXT_ONLY';
 return 'UNRESOLVED_AGATE_BEACH_NAME';
}
function relation(scene,event){
 const from=epoch(event.firstElevatedAt),end=epoch(event.lastElevatedAt);
 if(!Number.isFinite(from)||!Number.isFinite(end)||end<from)
  throw Error('Bad original GLOS offshore source event');
 const preStart=from-48*H,afterEnd=end+72*H;
 // Photos captured during an elevated offshore event are NOT 'after' views.
 if(scene.fromMs<end&&scene.toMs>from)
  return 'CAPTURE_INTERVAL_OVERLAPS_ACTIVE_OFFSHORE_EPISODE_NOT_POST';
 const before=scene.fromMs<from&&scene.toMs>preStart;
 const after=scene.fromMs<afterEnd&&scene.toMs>end;
 if(before&&after)return 'WINDOW_CROSSES_STORM_NOT_VALID_PRE_OR_POST';
 if(before)return scene.fromMs>=preStart&&scene.toMs<=from?
  'FULL_PRE_WINDOW_BUT_CAMERA_UNVERIFIED':'POSSIBLE_PRE_WINDOW_OVERLAP_UNCERTAIN';
 if(after)return scene.fromMs>=end&&scene.toMs<=afterEnd?
  'FULL_POST_WINDOW_BUT_CAMERA_UNVERIFIED':'POSSIBLE_POST_WINDOW_OVERLAP_UNCERTAIN';
 return 'OUTSIDE_EVENT_RESEARCH_WINDOWS';
}
function eventQueue({additionalGeoRows=[]}={}){
 if(history.schemaVersion!=='rockhounding-glos-season-2026-archived-storms-v1'||
   history.actualObservedWaveRecords!==5243||
   history.qualifyingMeasuredOffshoreEpisodes!==8||
   history.rows.length!==11||history.canPublishRockhoundingWindow!==false)
  throw Error('Original 2026 GLOS event provenance drift');
 const scenes=sourceScenes({additionalGeoRows});
 const events=history.rows.filter(r=>r.qualifyingOffshoreEpisode).map(evt=>{
  const matches=scenes.map(scene=>({scene,role:relation(scene,evt)}))
   .filter(m=>m.role!=='OUTSIDE_EVENT_RESEARCH_WINDOWS');
  const validSite=matches.filter(m=>m.scene.siteIdentity==='SOURCE_NAMED_GRAND_MARAIS');
  const before=validSite.filter(m=>m.role.includes('PRE_WINDOW'));
  const after=validSite.filter(m=>m.role.includes('POST_WINDOW'));
  const geoOnly=matches.filter(m=>m.scene.siteIdentity==='NEARBY_GPS_NOT_REVIEWED_AS_AGATE_BEACH');
  // Relative priority based on actual SOURCE wave peak, not rock probability.
  return {eventId:'SPOT1361-'+evt.peakObservedAt,firstElevatedUTC:evt.firstElevatedAt,
   lastElevatedUTC:evt.lastElevatedAt,observedOffshorePeakAtUTC:evt.peakObservedAt,
   observedOffshorePeakM:evt.peakWaveHeightM,
   windowBefore:{startUTC:new Date(epoch(evt.firstElevatedAt)-48*H).toISOString(),
     endUTC:evt.firstElevatedAt},
   windowAfter:{startUTC:evt.lastElevatedAt,
     endUTC:new Date(epoch(evt.lastElevatedAt)+72*H).toISOString()},
   namedSitePreCandidates:before.length,namedSitePostCandidates:after.length,
   nearbyGeoOnlyNeedsSceneReview:geoOnly.length,
   sourceCandidates:[...before,...after,...geoOnly].map(m=>({
    id:m.scene.id,source:m.scene.sourceUrl,
    timeRole:m.role,sourceDatePrecision:m.scene.originalDateQuality,
    agateSceneConfirmed:m.scene.siteIdentity==='SOURCE_NAMED_GRAND_MARAIS',
    sameCameraAndLandmarksVerified:false,
    confirmsSedimentChange:false
   })),
   blocker:before.length&&after.length?
    'BOTH_DATED_SIDES_EXIST_BUT_GEOMETRY_AND_ORIGINAL_CAPTURE_REVIEW_MISSING':
    after.length?'LACKS_CLOSE_PRE_STORM_BEACH_SCENE':
    before.length?'LACKS_CLOSE_POST_STORM_BEACH_SCENE':
    geoOnly.length?'UNREVIEWED_GPS_MEDIA_NOT_PROVEN_AGATE_VIEW':
    'NO_DATED_GRAND_MARAIS_SHORE_MEDIA_NEAR_THIS_EPISODE',
   independentlyVerifiedBeforeAfterPairs:0,
   measuredShorelineChange:false,actualFreshAgatesObserved:false,...NO_CLAIMS
  };
 }).sort((a,b)=>b.observedOffshorePeakM-a.observedOffshorePeakM);
 const possible=events.filter(x=>x.namedSitePostCandidates||x.namedSitePreCandidates);
 const queue={
  schemaVersion:'rockhounding-grand-marais-storm-photo-triage-v1',
  referenceDateUTC:'2026-10-16',
  site:'grand-marais-agate',
  waveInput:'ORIGINAL_GLOS_SPOT1361_OFFSHORE_EPISODES',
  originalWaveRows:history.actualObservedWaveRecords,
  eligibleIndependentMeasuredOffshoreEpisodes:events.length,
  sourceNamedGrandMaraisMedia:beaches.observations.length,
  nearbyCommonsGeotaggedFileCount:commons.results.length,
  extraNewNearbyGeoPhotosNeedingSiteReview:additionalGeoRows.length,
  eventsWithDatedNamedSiteMedia:possible.length,
  eventsWithUncertainPostScene:events.filter(e=>
    e.sourceCandidates.some(c=>c.timeRole==='POSSIBLE_POST_WINDOW_OVERLAP_UNCERTAIN'&&c.agateSceneConfirmed)).length,
  matchedSameVantageBeforeAfterStormPairs:0,
  measuredWaveAttributedSedimentChanges:0,
  verifiedNewAgates:0,
  wrongPlaceNameExample:{...NOT_SAME_BEACH,validForEventPairing:false},
  outputIsResearchQueueNotFindProbability:true,
  stormCandidateWindows:events,
  ...NO_CLAIMS
 };
 return queue;
}
function pairProof(packet,eventId){
 const baseline={status:'PAIR_NOT_SOURCE_VERIFIED',
  stormEventId:eventId,canTrainRockExposure:false,...NO_CLAIMS};
 if(!packet?.eventId||packet.eventId!==eventId||!packet.before||!packet.after)return baseline;
 const event=eventQueue().stormCandidateWindows.find(e=>e.eventId===eventId);
 if(!event)return baseline;
 const f0=epoch(packet.before.exifCaptureUTC),f1=epoch(packet.after.exifCaptureUTC);
 if(!Number.isFinite(f0)||!Number.isFinite(f1)||
   f0<epoch(event.windowBefore.startUTC)||f0>=epoch(event.windowBefore.endUTC)||
   f1<=epoch(event.windowAfter.startUTC)||f1>epoch(event.windowAfter.endUTC))
  return {...baseline,status:'ORIGINAL_PHOTO_TIMESTAMPS_DO_NOT_BRACKET_SOURCE_STORM'};
 const view=validateComparableRetakePair({
  siteId:CONFIRMED_SITE,sourceCategory:packet.sourceCategory,
  frames:[packet.before,packet.after],
  sameStaticLandmarksHumanVerified:packet.sameStaticLandmarksHumanVerified,
  referencePointsReviewedCount:packet.referencePointsReviewedCount,
  geometricRegistrationHumanVerified:packet.geometricRegistrationHumanVerified,
  waterLevelAndTemporaryRunupControlled:packet.waterLevelAndTemporaryRunupControlled,
  snowIceAndSeasonalObstructionControlled:packet.snowIceAndSeasonalObstructionControlled,
  lightingAndPerspectiveConfoundersReviewed:packet.lightingAndPerspectiveConfoundersReviewed
 });
 return {...baseline,status:view.matchedViewpoint?
  'STORM_BRACKETED_COMMON_CAMERA_CANDIDATE_NOT_MEASURED_SHORE_CHANGE':
  'PRE_AND_POST_TIMES_MATCH_BUT_CAMERA_GEOMETRY_UNVERIFIED',
  matchedViewpoint:view.matchedViewpoint,
  measuredBeachMorphologyChange:false,stormCausalLinkVerified:false};
}
module.exports={scopeName,sourceBounds,sourceScenes,relation,eventQueue,pairProof,NOT_SAME_BEACH};

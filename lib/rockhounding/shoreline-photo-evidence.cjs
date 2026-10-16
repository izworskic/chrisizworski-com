'use strict';
// Independent shore-scene evidence is NOT an offshore-wave measurement, a
// measured beach waterline, a new-stone count, or proof storm causality.
const fs=require('node:fs');
const path=require('node:path');
const source=require('../../data/rockhounding/grand-marais-dated-shoreline-evidence-2026.json');
const siteGeo=JSON.parse(fs.readFileSync(path.join(__dirname,'../../data/rockhounding/grand-marais-research-footprints.geojson'),'utf8'));
const historic=require('../../public/rockhounding-lab/glos-season-2026-research.json');
const HOUR=3600000,DAY=24*HOUR;
const SITE='grand-marais-agate';
const EXPECTED_IDS=[
 'commons-agate-beach-july-5-2026',
 'flickr-agate-beach-july-4-2026',
 'reddit-agate-beach-july-24-2026-approx'
];
const DENIAL=Object.freeze({
 canClaimRecentlyExposedRocks:false,canPredictNewAgates:false,
 canPublishVisitWindow:false,canClaimBeachSafety:false,
 isAgateStoneExposureCalibration:false
});
function validUTC(s){
 return typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(s)&&
  Number.isFinite(Date.parse(s))&&new Date(s).toISOString().startsWith(s.slice(0,19));
}
function validateRegistry(reg=source){
 if(reg?.schemaVersion!=='rockhounding-grand-marais-shoreline-evidence-register-v1'||
  reg.studySite!==SITE||reg.siteGeometry!=='data/rockhounding/grand-marais-research-footprints.geojson'||
  reg.observations?.length!==3||JSON.stringify(reg.observations.map(x=>x.evidenceId))!==JSON.stringify(EXPECTED_IDS)||
  reg.acquisitionConstraints?.knownStableVantagePairs!==0||
  reg.acquisitionConstraints?.vettedBeforeAfterMorphologyChanges!==0||
  reg.acquisitionConstraints?.verifiedNewAgateExposures!==0||
  Object.values(reg.publicClaims||{}).length!==5||
  Object.values(reg.publicClaims).some(v=>v!==false))
  throw Error('Independent shoreline evidence provenance/claim gate has changed');
 const expectedDate=['2026-07-05','2026-07-04','2026-07-23'];
 const expectedHosts=['commons.wikimedia.org','www.flickr.com','www.reddit.com'];
 for(let i=0;i<reg.observations.length;i++){
  const p=reg.observations[i];
  if(p.siteId!==SITE||!validUTC(p.captureWindowStartUTC)||!validUTC(p.captureWindowEndUTC)||
     Date.parse(p.captureWindowEndUTC)<=Date.parse(p.captureWindowStartUTC)||
     p.captureWindowStartUTC.slice(0,10)!==expectedDate[i]||
     !/^\d{4}-\d\d-\d\d$/.test(p.publishedDateUTC)||
     new URL(p.sourceUrl).hostname!==expectedHosts[i]||
     p.shorelineEdgeMeasured!==false||
     p.fixedLandmarksAligned!==false||p.imagePairManuallyReviewed!==false||
     p.reportedVisibleRockExposure!==null||p.observedNewAgates!==false||
     p.sameFrameSceneKey!==null||p.cameraViewDirectionDeg!==null)
    throw Error('Unreviewed photograph illegally promoted to measured shoreline change');
 }
 const commons=reg.observations[0],flickr=reg.observations[1],reddit=reg.observations[2];
 if(commons.captureDateEvidence!=='EXIF_DAY_WITH_UNKNOWN_LOCAL_TIMEZONE'||
    commons.publishedDateUTC!=='2026-07-12'||commons.photoGeo?.provenance!=='WIKIMEDIA_CAMERA_POSITION'||
    Math.abs(commons.photoGeo?.lat-46.675190)>.0000001||
    Math.abs(commons.photoGeo?.lon+85.987480)>.0000001||
    commons.rights?.includes('CC-BY-4.0')!==true||
    flickr.photoGeo!==null||flickr.rights?.includes('All rights reserved')!==true||
    reddit.photoGeo!==null||reddit.captureDateEvidence!=='APPROXIMATE_DAY_FROM_JULY_26_RELATIVE_STATEMENT'||
    reddit.captureWindowEndUTC!=='2026-07-26T00:00:00Z'||
    reddit.rights?.includes('do not copy or embed')!==true)
  throw Error('Dated Agate Beach primary-source metadata drift');
 return true;
}
function pointInPolygon([x,y],ring){
 if(!Array.isArray(ring)||ring.length<4)throw Error('Invalid OSM site polygon');
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if(!Array.isArray(a)||!Array.isArray(b)||!a.every(Number.isFinite)||!b.every(Number.isFinite))
   throw Error('Invalid geo coordinate');
  if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))
   inside=!inside;
 }
 return inside;
}
function sitePolygon(){
 const f=siteGeo.features?.find(x=>x.properties?.siteId===SITE);
 if(f?.properties?.featureStatus!=='OSM_RESEARCH_GEOMETRY_ONLY'||
    f.properties.shorelineWaterwardNormalDeg!==null||
    f.geometry?.type!=='Polygon'||f.geometry.coordinates.length!==1)
  throw Error('An OSM research boundary cannot be promoted to an actual surveyed waterline');
 return f.geometry.coordinates[0];
}
function classifySourcePhoto(photo){
 validateRegistry();
 if(!source.observations.some(x=>x.evidenceId===photo?.evidenceId))
  throw Error('Unregistered, unverifiable beach media');
 const sourcePhoto=source.observations.find(x=>x.evidenceId===photo.evidenceId);
 if(photo!==sourcePhoto && JSON.stringify(photo)!==JSON.stringify(sourcePhoto))
  throw Error('Media source fields have been modified after registration');
 const geo=photo.photoGeo;
 const inside=geo?pointInPolygon([geo.lon,geo.lat],sitePolygon()):null;
 return {
  evidenceId:photo.evidenceId,sourceUrl:photo.sourceUrl,
  captureWindowStartUTC:photo.captureWindowStartUTC,
  captureWindowEndUTC:photo.captureWindowEndUTC,
  captureTimeExactToUTC:false,
  sourceSiteNamed:true,
  cameraInsideUnsureOSMResearchPolygon:inside,
  verifiedStableViewForComparison:false,
  imageGeoReference:geo?'PUBLISHED_CAMERA_GPS_ON_OSM_RESEARCH_POLYGON':'SITE_NAME_ONLY_NO_CAMERA_GPS',
  status:inside===true?'GEOLOCATED_DATED_SINGLE_SCENE_BASELINE':
   inside===false?'PHOTO_GPS_OUTSIDE_PILOT_RESEARCH_FOOTPRINT':
   photo.captureDateEvidence.startsWith('APPROXIMATE')?
    'APPROXIMATE_DATED_SITE_MEDIA_NO_GPS':'DATED_SITE_MEDIA_NO_GPS',
  actualSedimentChangeAssessed:false,
  ...DENIAL
 };
}
function timeOverlap(a,b,c,d){
 return Math.max(a,c)<Math.min(b,d);
}
function assessEpisode(event,{register=source}={}){
 validateRegistry(register);
 const first=Date.parse(event?.firstElevatedAt),last=Date.parse(event?.lastElevatedAt),
   peak=Date.parse(event?.peakObservedAt);
 if(!Number.isFinite(first)||!Number.isFinite(last)||!Number.isFinite(peak)||
    first>last||peak<first||peak>last||
    event.qualifyingOffshoreEpisode===undefined||
    !Number.isFinite(event.peakWaveHeightM)||event.peakWaveHeightM<0||
    event.measuredBeachStoneOutcomes!==0)
  throw Error('Not an original source-backed, uncalibrated offshore event');
 const before={start:first-48*HOUR,end:first};
 const after={start:last,end:last+72*HOUR};
 const candidates=register.observations.map(obs=>{
  const parsed=classifySourcePhoto(obs);
  const s=Date.parse(obs.captureWindowStartUTC),e=Date.parse(obs.captureWindowEndUTC);
  let role='NOT_TEMPORALLY_RELATED';
  if(s>=before.start&&e<=before.end)role='PRE_EVENT_DATED_SCENE_NO_FIXED_FRAME_REVIEW';
  else if(s>=after.start&&e<=after.end)role='POST_EVENT_DATED_SCENE_NO_FIXED_FRAME_REVIEW';
  else if(timeOverlap(s,e,after.start,after.end))role='POST_EVENT_POSSIBLE_TIME_OVERLAP_UNCERTAIN';
  else if(timeOverlap(s,e,before.start,before.end))role='PRE_EVENT_POSSIBLE_TIME_OVERLAP_UNCERTAIN';
  return {evidenceId:obs.evidenceId,url:obs.sourceUrl,
    siteEvidenceStatus:parsed.status,timeRole:role,
    timePrecision:obs.captureDateEvidence,
    hasSiteGpsInsideOSM:parsed.cameraInsideUnsureOSMResearchPolygon===true,
    hasComparableReviewedVantage:false,
    ...DENIAL};
 });
 const pre=candidates.filter(x=>x.timeRole.startsWith('PRE_EVENT'));
 const post=candidates.filter(x=>x.timeRole.startsWith('POST_EVENT'));
 return {
  siteId:SITE,peakObservedAt:event.peakObservedAt,
  peakOffshoreSignificantWaveHeightM:event.peakWaveHeightM,
  offshoreEventEligibleForReview:event.qualifyingOffshoreEpisode===true,
  precedingSceneCandidates:pre.length,followingSceneCandidates:post.length,
  possibleAfterSceneEvidence:post.map(x=>({id:x.evidenceId,role:x.timeRole,source:x.url})),
  comparableValidatedBeforeAfterPairs:0,
  confirmedShorelineMorphologyChanges:0,
  documentedNewlyExposedAgates:0,
  status:post.length?'POST_EVENT_SCENE_CANDIDATE_BUT_NO_COMPARABLE_SHORELINE_PAIR':
   'NO_DATED_COMPARABLE_PRE_POST_BEACH_SCENES',
  capturePrecisionCanProveStormCausality:false,
  seasonalSatelliteOnlyConfirmsBeachScaleRocks:false,
  imagesAreNotIndependentBuoyWaveMeasurements:true,
  media:candidates,
  ...DENIAL
 };
}
function assessSeason({register=source,season=historic}={}){
 validateRegistry(register);
 if(season.schemaVersion!=='rockhounding-glos-season-2026-archived-storms-v1'||
  season.source!=='GLOS_SEAGULL_OBS_140_SPOT_1361'||
  season.actualObservedWaveRecords!==5243||
  season.measuredElevatedEpisodeGroups!==11||
  !Array.isArray(season.rows)||season.rows.length!==11||
  season.actualRockExposureFieldObservations!==0||
  season.canClaimSafeShore!==false||
  season.canPredictNewAgates!==false)
  throw Error('Original GLOS historical season/source evidence changed');
 const events=season.rows.map(x=>assessEpisode(x,{register}));
 const postCandidates=events.filter(x=>x.followingSceneCandidates>0);
 return {
  schemaVersion:'rockhounding-shoreline-independent-evidence-audit-v1',
  studySite:SITE,
  source:'INDEPENDENT_DATE_STAMPED_PUBLIC_BEACH_MEDIA_VS_OBSERVED_GLOS_OFFSHORE_EPISODES',
  seasonOriginalGLOSWaveRows:season.actualObservedWaveRecords,
  seasonSourceBackedOffshoreEpisodes:events.length,
  qualifiedOffshoreEpisodes:events.filter(x=>x.offshoreEventEligibleForReview).length,
  independentPublishedBeachSceneSources:register.observations.length,
  gpsGeolocatedSingleSceneSources:register.observations.filter(x=>classifySourcePhoto(x).cameraInsideUnsureOSMResearchPolygon===true).length,
  eventsWithTentativePostBeachScene:postCandidates.length,
  comparableValidatedBeforeAfterPairs:0,
  confirmedStormLinkedShorelineChanges:0,
  measuredNewAgateExposures:0,
  noHistoricalAlertsBackfilled:true,
  noCurrentBeachSafetyConclusions:true,
  evidenceStatus:'INDEPENDENT_MEDIA_EXISTS_BUT_NO_VALID_BEFORE_AFTER_CHANGE_PAIR',
  eventAudits:events.map(e=>({
   peakObservedAt:e.peakObservedAt,offshoreWavePeakM:e.peakOffshoreSignificantWaveHeightM,
   qualified:e.offshoreEventEligibleForReview,status:e.status,
   preSceneCount:e.precedingSceneCandidates,postSceneCount:e.followingSceneCandidates,
   possibleAfterSceneEvidence:e.possibleAfterSceneEvidence,
   verifiedShorelineChanges:e.confirmedShorelineMorphologyChanges
  })),
  sourceRows:register.observations.map(x=>({
   id:x.evidenceId,sourceUrl:x.sourceUrl,sourceClass:x.sourceClass,
   dateStartUTC:x.captureWindowStartUTC,dateEndUTC:x.captureWindowEndUTC,
   dateQuality:x.captureDateEvidence,sourceStatus:classifySourcePhoto(x).status,
   rights:x.rights
  })),
  ...DENIAL
 };
}
// For future reviewed paired scenes. Even a verified change is *not* verified
// new agates and cannot ever override the site safety/access veto.
function reviewPairGate(pair){
 if(!pair||pair.siteId!==SITE||pair.outcomeSourceType!=='INDEPENDENT_SHORELINE_VISUAL'||
  !validUTC(pair.beforeUTC)||!validUTC(pair.afterUTC)||
  Date.parse(pair.beforeUTC)>=Date.parse(pair.afterUTC)||
  pair.sameGeoreferencedLandmarks!==true||
  pair.reviewedCameraGeometry!==true||
  pair.reviewedWaterLevelAndWaveConfounding!==true||
  pair.reviewedLightingAndObstruction!==true||
  pair.independentlyDatedTwoFrames!==true||
  !['VISIBLE_SEDIMENT_SHIFT','NO_VISIBLE_CHANGE','INCONCLUSIVE'].includes(pair.reviewedOutcome))
  return {status:'UNVERIFIED_BEFORE_AFTER_GEOMETRY_OR_CONFOUNDERS',verifiedShorelineChange:false,...DENIAL};
 return {
  status:pair.reviewedOutcome==='VISIBLE_SEDIMENT_SHIFT'?'REVIEWED_VISIBLE_SHORE_CHANGE_UNATTRIBUTED':
    pair.reviewedOutcome==='NO_VISIBLE_CHANGE'?'REVIEWED_NO_VISIBLE_CHANGE':'REVIEWED_INCONCLUSIVE',
  verifiedShorelineChange:pair.reviewedOutcome==='VISIBLE_SEDIMENT_SHIFT',
  stormCausedChangeConfirmed:false,newAgateExposureConfirmed:false,
  canTrainRockhoundingForecast:false,...DENIAL
 };
}
module.exports={
 validateRegistry,pointInPolygon,sitePolygon,classifySourcePhoto,
 assessEpisode,assessSeason,reviewPairGate
};

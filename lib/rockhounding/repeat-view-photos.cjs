'use strict';
// Repeat-photography *candidate* gate, not a pixel-difference, storm
// attribution, rock exposure or shoreline-safety model.
// Source-verified historical photos can be visually similar but not
// geographically equivalent. A model MUST NOT fill in missing camera GPS.
const reg=require('../../data/rockhounding/grand-marais-repeat-view-source-candidates-2026.json');
const events=require('../../public/rockhounding-lab/glos-season-2026-research.json');
const {pointInPolygon,sitePolygon}=require('./shoreline-photo-evidence.cjs');
const SOURCE_IDS=['2014-05-31-grand-marais-cliff-shore','2014-05-31-grand-marais-horizon','2026-07-05-agate-beach-gps'];
const PAIR_IDS=['2014-cliff-to-2026-gps-beach','2014-horizon-to-2026-gps-beach'];
const NO_CLAIMS=Object.freeze({
 canClaimShorelineChange:false,canClaimStormCausedChange:false,
 canPredictNewAgates:false,canPublishVisitWindow:false,
 canClaimSafeConditions:false,canInferRockExposureProbability:false
});
function validateRegistry(r=reg){
 if(r?.schemaVersion!=='rockhounding-grand-marais-repeat-view-candidates-v1'||
    r.reviewedUTC!=='2026-10-16'||r.site!=='grand-marais-agate'||
    JSON.stringify(r.sources?.map(s=>s.id))!==JSON.stringify(SOURCE_IDS)||
    JSON.stringify(r.pairs?.map(p=>p.id))!==JSON.stringify(PAIR_IDS)||
    r.sourceDiscovery?.verifiedWithinStormBeforeAfterSameStationPairs!==0||
    r.sourceDiscovery?.usable2014HistoricalCandidateCount!==2||
    r.sourceDiscovery?.verified2026AgateCameraGPSCount!==1||
    !r.sourceDiscovery?.sourceDatesNotCurrentConditions||
    !r.sourceDiscovery?.freeSourceLicensesNotSameViewProof||
    Object.keys(r.claims||{}).length!==8||
    Object.values(r.claims).some(v=>v!==false))
  throw Error('Repeat-view source identity or independent safety guard changed');
 const allowed=[
  ['Gfp-michigan-grand-marais-superior-shoreline.jpg','2014-05-31',55,null,'Yinan Chen','PUBLIC_DOMAIN_DEDICATION'],
  ['Gfp-michigan-lake-superior-shoreline-to-the-horizon.jpg','2014-05-31',18,null,'Yinan Chen','PUBLIC_DOMAIN_DEDICATION'],
  ['Grand Marais Agate Beach.jpg','2026-07-05',78,46.67519,'TCP04','CC_BY_4_0']
 ];
 for(let i=0;i<3;i++){
  const s=r.sources[i],[file,date,lens,lat,author,license]=allowed[i];
  if(s.fileName!==file||s.captureDate!==date||
     s.lensFocalLengthMm!==lens||s.photographer!==author||
     s.license!==license||new URL(s.url).hostname!=='commons.wikimedia.org'||
     !s.previewUrl.startsWith('https://')||
     !['thumb.wikimedia.org','upload.wikimedia.org'].includes(new URL(s.previewUrl).hostname)||
     s.cameraTimezoneConfirmed!==false||
     s.dateProvenance!=='SOURCE_DESCRIPTION_AND_EXIF_CLOCK_TIME'||
     s.fixedLandmarksCoRegistered!==false||
     s.pixelCorrespondencesReviewed!==false||
     s.viewDirectionDegrees!==null||
     s.documentedWaterlineChange!==false||
     s.documentedAgatesExposed!==false||
     s.uploadDate<date||s.cameraGPS?.lat!==lat&&
      !(lat===null&&s.cameraGPS===null))
   throw Error('Original Commons photograph date, license or camera provenance changed');
 }
 const gps=r.sources[2].cameraGPS;
 if(Math.abs(gps.lon+85.98748)>1e-7||
   gps.source!=='WIKIMEDIA_CAMERA_POSITION_EXIF'||
   !pointInPolygon([gps.lon,gps.lat],sitePolygon())||
   r.sources[0].preciseSiteSegmentVerified!==false||
   r.sources[1].preciseSiteSegmentVerified!==false||
   r.sources[2].preciseSiteSegmentVerified!==true)
  throw Error('Only the independently GPS verified Agate photo can be positioned at the research beach');
 for(const p of r.pairs){
  if(!SOURCE_IDS.includes(p.beforeId)||!SOURCE_IDS.includes(p.afterId)||
     p.bracketedObserved2026Storm!==false||
     p.sameCameraStationConfirmed!==false||p.sameReachConfirmed!==false||
     p.stableLandmarkRegistrationConfirmed!==false||
     p.imagesNormalizedForLensAndPerspective!==false||
     p.eligibleForShorelineChangeMeasurement!==false||
     p.eligibleForPostStormStonePrediction!==false)
   throw Error('Archival landscape photo comparison has been misrepresented as shore change');
 }
 return true;
}
function haversineMeters(a,b){
 if(!a||!b||![a.lat,a.lon,b.lat,b.lon].every(Number.isFinite))return null;
 const rad=Math.PI/180,dl=(b.lon-a.lon)*rad,dp=(b.lat-a.lat)*rad;
 const h=Math.sin(dp/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dl/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
}
function angularSeparation(a,b){
 if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||a>=360||b<0||b>=360)return null;
 const d=Math.abs(a-b);
 return Math.min(d,360-d);
}
function auditedPair(pair,{register=reg,season=events}={}){
 validateRegistry(register);
 if(!register.pairs.some(p=>p.id===pair?.id)||
   !Number.isFinite(Date.parse(register.reviewedUTC+'T00:00:00Z')))
   throw Error('Unknown repeat-photo pair');
 const frozen=register.pairs.find(p=>p.id===pair.id);
 if(pair!==frozen&&JSON.stringify(pair)!==JSON.stringify(frozen))
   throw Error('Unreviewed repeat-photo comparison fields changed');
 const before=register.sources.find(s=>s.id===pair.beforeId);
 const after=register.sources.find(s=>s.id===pair.afterId);
 if(!before||!after)throw Error('Missing original photo');
 if(season.schemaVersion!=='rockhounding-glos-season-2026-archived-storms-v1'||
    season.actualObservedWaveRecords!==5243||season.rows.length!==11||
    season.qualifyingMeasuredOffshoreEpisodes!==8||
    season.canPublishRockhoundingWindow!==false)
   throw Error('Historical offshore sensor provenance drift');
 const b=Date.parse(before.captureDate+'T00:00:00Z');
 const a=Date.parse(after.captureDate+'T00:00:00Z');
 const bracket=season.rows.filter(e=>e.qualifyingOffshoreEpisode&&
    Date.parse(e.firstElevatedAt)>b+86400000&&Date.parse(e.lastElevatedAt)<a);
 // Count possible intervening 2026 storm events ONLY for date context:
 // not enough to causally attribute a year-to-year landscape difference.
 const status=pair.comparability==='NO_SHARED_STABLE_SHORE_LANDMARK_NEGATIVE_CONTROL'?
   'NO_REPEAT_VIEW_OPEN_HORIZON_CONTROL':
   'POSSIBLE_LANDSCAPE_LANDMARK_FAMILY_NO_COMMON_CAMERA_STATION';
 return {
  pairId:pair.id,sourceBefore:before.url,sourceAfter:after.url,
  beforeDay:before.captureDate,afterDay:after.captureDate,
  sourcePlaceClaim:'GRAND_MARAIS_MI_BOTH;_AGATE_GPS_ONLY_2026',
  cameraSeparationMeters:haversineMeters(before.cameraGPS,after.cameraGPS),
  cameraHeadingDifferenceDegrees:angularSeparation(before.viewDirectionDegrees,after.viewDirectionDegrees),
  beforeCameraGpsAbsent:before.cameraGPS===null,
  afterCameraGpsWithinOSMResearchSite:after.cameraGPS!==null,
  matchingStableLandmarkGeometryReviewed:false,
  focalLengthMm:[before.lensFocalLengthMm,after.lensFocalLengthMm],
  single2026OffshoreEventBracketedByCameraDates:bracket.length===1,
  interveningDocumented2026OffshoreEpisodes:bracket.length,
  visibleBeachSedimentChangeMeasured:false,
  reproduciblePixelShorelineTransectM:null,
  knownCameraPositionForRetake:after.cameraGPS?{...after.cameraGPS}:null,
  eligibility:status,
  historicalLandscapeContextOnly:true,
  sourcePhotoDatesAreNotCurrentBeachConditions:true,
  ...NO_CLAIMS
 };
}
// Strict independent two-frame review for future recent data. Evaluating
// imaging geometry never entails safe shore, agates or storm causality.
function validateComparableRetakePair(p){
 const common={status:'UNVERIFIED_COMMON_CAMERA_VIEW',matchedViewpoint:false,
  reviewedShorelineChange:false, ...NO_CLAIMS};
 if(!p||p.siteId!=='grand-marais-agate'||
    !['WIKIMEDIA_COMMONS','INDEPENDENT_LICENSED_RESEARCH_MEDIA'].includes(p.sourceCategory)||
    !Array.isArray(p.frames)||p.frames.length!==2)return common;
 const [before,after]=p.frames;
 const fields=[before,after];
 if(fields.some(f=>!f||!Number.isFinite(Date.parse(f.exifCaptureUTC))||
   f.timezoneVerified!==true||!['VERIFIED_SOURCE','ORIGINAL_EXIF_VERIFIED'].includes(f.timeProvenance)||
   !f.cameraGPS||!Number.isFinite(f.cameraGPS.lat)||!Number.isFinite(f.cameraGPS.lon)||
   !pointInPolygon([f.cameraGPS.lon,f.cameraGPS.lat],sitePolygon())||
   !Number.isFinite(f.headingDeg)||f.headingDeg<0||f.headingDeg>=360||
   !Number.isFinite(f.focalLengthMm)||f.focalLengthMm<10||f.focalLengthMm>400||
   !f.originalSourceUrl?.startsWith('https://')||f.imageRightsVerified!==true))
    return common;
 const separation=haversineMeters(before.cameraGPS,after.cameraGPS);
 const angle=angularSeparation(before.headingDeg,after.headingDeg);
 const gapMs=Date.parse(after.exifCaptureUTC)-Date.parse(before.exifCaptureUTC);
 if(separation>20||angle>12||gapMs<3600000||
    p.sameStaticLandmarksHumanVerified!==true||
    p.referencePointsReviewedCount<4||
    p.geometricRegistrationHumanVerified!==true||
    p.waterLevelAndTemporaryRunupControlled!==true||
    p.snowIceAndSeasonalObstructionControlled!==true||
    p.lightingAndPerspectiveConfoundersReviewed!==true)
   return {...common,cameraDistanceMeters:separation,headingGapDegrees:angle,
     photoSpanHours:Number.isFinite(gapMs)?+(gapMs/3600000).toFixed(2):null};
 return {
  status:'CAMERA_AND_LANDMARK_REPEATABILITY_REVIEWED_NOT_SHORE_CHANGE',
  matchedViewpoint:true,
  cameraDistanceMeters:Math.round(separation*10)/10,
  headingGapDegrees:+angle.toFixed(2),
  photoSpanHours:+(gapMs/3600000).toFixed(2),
  reviewedShorelineChange:false,
  stormCausalityEstablished:false,
  pixelChangeOrRockExposureInferred:false,
  ...NO_CLAIMS
 };
}
function auditAll(){
 validateRegistry();
 const outcomes=reg.pairs.map(p=>auditedPair(p));
 return {
  schemaVersion:'rockhounding-repeat-photo-audit-v1',
  reviewedUTC:reg.reviewedUTC,
  siteId:reg.site,availableOriginalPubliclyReusableHistoricalPhotos:2,
  gpsAnchoredLicensed2026AgateBaseline:1,
  archivalLandmarkPatternCandidates:1,
  historicalOpenHorizonNegativeControls:1,
  cameraMatchedBeforeAfterPairs:outcomes.filter(x=>x.cameraSeparationMeters!==null&&
    x.matchingStableLandmarkGeometryReviewed).length,
  dateMatchedPrePost2026WavePairs:0,
  empiricallyVerifiedNewAgates:0,
  outcomes:outcomes.map(x=>({
   pairId:x.pairId,eligibility:x.eligibility,
   sourceBefore:x.sourceBefore,sourceAfter:x.sourceAfter,
   cameraSeparationMeters:x.cameraSeparationMeters,
   beforeDay:x.beforeDay,afterDay:x.afterDay,
   matchedStableGeometry:x.matchingStableLandmarkGeometryReviewed,
   stormBracketingConfirmed:x.single2026OffshoreEventBracketedByCameraDates,
   verifiedShorelineChange:x.visibleBeachSedimentChangeMeasured,
   canPublishVisitWindow:x.canPublishVisitWindow
  })),
  sourceImages:reg.sources.map(s=>({id:s.id,source:s.url,
   thumbnail:s.previewUrl,creator:s.photographer,license:s.license,
   captureDay:s.captureDate,siteGpsAvailable:s.cameraGPS!==null,
   lensMm:s.lensFocalLengthMm,rights:s.attribution})),
  ...NO_CLAIMS
 };
}
module.exports={validateRegistry,haversineMeters,angularSeparation,auditedPair,
 validateComparableRetakePair,auditAll};
